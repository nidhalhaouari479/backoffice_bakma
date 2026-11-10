"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, ChevronRight, CircleCheck, ShoppingCart, Truck } from "lucide-react";
import { DataTable, ErrorState, PageHeader } from "@/components/admin-ui";
import { Alert, Button, Card, EmptyState, KpiCard, MetaBadge, PageLoader, Pagination, SearchInput, Tabs } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { normalize } from "@/lib/admin";
import { formatDate, formatTime, formatTnd, ORDER_STATUS } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = OrderStatus | "all";
type OrderRow = Omit<Order, "items"> & { items: { quantity: number }[] };
const PER_PAGE = 15;
const STATUSES: OrderStatus[] = ["nouvelle", "confirmee", "expediee", "livree", "annulee"];
const TAB_LABEL: Record<OrderStatus, string> = {
  nouvelle: "Nouvelles",
  confirmee: "Confirmées",
  expediee: "En livraison",
  livree: "Livrées",
  annulee: "Annulées",
};

const articles = (o: OrderRow) => o.items.reduce((s, i) => s + i.quantity, 0);

export default function CommandesPage() {
  const [tab, setTab] = useState<Tab>("nouvelle");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsync(async () => {
    const res = await getSupabase().from("orders").select("*, items:order_items(quantity)").order("created_at", { ascending: false }).limit(2000);
    const now = new Date();
    // début du mois courant (heure locale) : calculé au chargement, jamais pendant le rendu
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return { orders: must<OrderRow[]>(res), monthStart };
  });

  const all = data?.orders ?? [];
  const nq = normalize(q.trim());
  const base = all.filter((o) => !nq || normalize(`${o.ref} ${o.customer_name} ${o.phone} ${o.city}`).includes(nq));
  const filtered = tab === "all" ? base : base.filter((o) => o.status === tab);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (t: Tab) => (t === "all" ? base.length : base.filter((o) => o.status === t).length);

  const deliveredThisMonth = all.filter((o) => o.status === "livree" && o.delivered_at && new Date(o.delivered_at).getTime() >= (data?.monthStart ?? 0));
  const revenue = deliveredThisMonth.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div>
      <PageHeader title="Commandes" subtitle="Commandes de la boutique en ligne, payées en espèces à la livraison." />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<ShoppingCart />}
              tone="orange"
              value={all.filter((o) => o.status === "nouvelle").length}
              label="Nouvelles (à confirmer)"
              onClick={() => {
                setTab("nouvelle");
                setPage(1);
              }}
              active={tab === "nouvelle"}
            />
            <KpiCard icon={<Truck />} tone="blue" value={all.filter((o) => o.status === "confirmee" || o.status === "expediee").length} label="À livrer" foot="Confirmées + en livraison" />
            <KpiCard icon={<CircleCheck />} tone="green" value={deliveredThisMonth.length} label="Livrées ce mois" />
            <KpiCard icon={<Banknote />} tone="teal" value={formatTnd(revenue)} label="CA livré ce mois" foot="Total encaissé à la livraison" />
          </div>

          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              items={[...STATUSES.map((s) => ({ value: s as Tab, label: TAB_LABEL[s], count: count(s) })), { value: "all" as Tab, label: "Toutes", count: count("all") }]}
            />
            <SearchInput
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Réf., client, téléphone, ville…"
              className="sm:w-80"
            />
          </div>

          <Card className="overflow-hidden">
            {error && <Alert>{error}</Alert>}
            {filtered.length === 0 ? (
              <EmptyState icon={<ShoppingCart />} title="Aucune commande" text={nq ? "Aucune commande ne correspond à cette recherche." : "Aucune commande dans cet onglet."} />
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable
                    head={
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Ville</th>
                        <th>Articles</th>
                        <th>Total</th>
                        <th>Statut</th>
                        <th className="w-24" />
                      </tr>
                    }
                  >
                    {rows.map((o) => (
                      <tr key={o.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/boutique/commandes/${o.id}`} className="font-semibold text-primary hover:underline">
                            {o.ref}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap">
                          {formatDate(o.created_at)}
                          <div className="text-xs text-slate-500">{formatTime(o.created_at)}</div>
                        </td>
                        <td>
                          <div className="font-medium text-navy">{o.customer_name}</div>
                          <div className="text-xs tabular-nums text-slate-500">{o.phone}</div>
                        </td>
                        <td className="whitespace-nowrap">{o.city}</td>
                        <td className="tabular-nums">{articles(o)}</td>
                        <td className="whitespace-nowrap font-semibold tabular-nums text-navy">{formatTnd(o.total)}</td>
                        <td>
                          <MetaBadge meta={ORDER_STATUS[o.status]} />
                        </td>
                        <td className="text-right">
                          <Button size="sm" variant={o.status === "nouvelle" ? "soft" : "outline"} href={`/boutique/commandes/${o.id}`}>
                            {o.status === "nouvelle" ? "Traiter" : "Voir"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
                <ul className="divide-y divide-slate-100 md:hidden">
                  {rows.map((o) => (
                    <li key={o.id}>
                      <Link href={`/boutique/commandes/${o.id}`} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-primary">{o.ref}</span>
                            <MetaBadge meta={ORDER_STATUS[o.status]} />
                          </div>
                          <div className="truncate text-sm font-medium text-navy">
                            {o.customer_name} · <span className="tabular-nums text-slate-500">{o.phone}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              {o.city} · {articles(o)} article{articles(o) > 1 ? "s" : ""} · {formatDate(o.created_at)}
                            </span>
                            <span className="text-[13px] font-semibold tabular-nums text-navy">{formatTnd(o.total)}</span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[13px] text-slate-500">
                    {filtered.length} commande{filtered.length > 1 ? "s" : ""}
                  </span>
                  <Pagination page={current} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
