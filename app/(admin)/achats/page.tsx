"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Wallet } from "lucide-react";
import { AnimalCell, ErrorState, PageHeader, PersonCell } from "@/components/admin-ui";
import { Button, Card, EmptyState, Input, KpiCard, MetaBadge, PageLoader, Pagination, Tabs } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { normalize, PURCHASE_SELECT } from "@/lib/admin";
import { formatDate, formatPrice, formatTime, PURCHASE_STATUS } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Purchase } from "@/lib/types";

type Tab = "verifier" | "garantie" | "verser" | "litige" | "termines" | "all";
const PER_PAGE = 10;

const isDue = (p: Purchase) => p.status === "garantie" && !!p.release_at && new Date(p.release_at) <= new Date();

const TAB_FILTER: Record<Tab, (p: Purchase) => boolean> = {
  verifier: (p) => p.status === "paiement_a_verifier",
  garantie: (p) => p.status === "garantie" && !isDue(p),
  verser: isDue,
  litige: (p) => p.status === "litige",
  termines: (p) => ["versee", "remboursee", "paiement_refuse", "annulee"].includes(p.status),
  all: () => true,
};

export default function AchatsPage() {
  const [tab, setTab] = useState<Tab>("verifier");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsync(async () =>
    must<Purchase[]>(await getSupabase().from("purchases").select(PURCHASE_SELECT).order("created_at", { ascending: false }).limit(2000)),
  );

  const nq = normalize(q.trim());
  const base = (data ?? []).filter((p) => !nq || normalize([p.ref, p.animal?.name, p.buyer?.full_name, p.seller?.full_name].join(" ")).includes(nq));
  const filtered = base.filter(TAB_FILTER[tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (t: Tab) => base.filter(TAB_FILTER[t]).length;
  const held = (data ?? []).filter((p) => p.status === "garantie" || p.status === "litige").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader title="Achats" subtitle="Vérifiez les reçus de virement, suivez les garanties et versez les vendeurs une fois la garantie terminée." />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<Wallet />} tone="orange" value={count("verifier")} label="Reçus à vérifier" />
            <KpiCard icon={<Wallet />} tone="green" value={count("verser")} label="Garanties terminées (à verser)" />
            <KpiCard icon={<Wallet />} tone="red" value={count("litige")} label="Litiges" />
            <KpiCard icon={<Wallet />} tone="blue" value={formatPrice(held, "vente")} label="Montant conservé par Bakma" />
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <Tabs
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              items={[
                { value: "verifier", label: "À vérifier", count: count("verifier") },
                { value: "garantie", label: "En garantie", count: count("garantie") },
                { value: "verser", label: "À verser", count: count("verser") },
                { value: "litige", label: "Litiges", count: count("litige") },
                { value: "termines", label: "Terminés", count: count("termines") },
                { value: "all", label: "Tous", count: count("all") },
              ]}
            />
            <div className="lg:w-80">
              <Input icon={<Search />} placeholder="Référence, animal, nom…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-2xl" />
            </div>
          </div>

          <Card className="overflow-hidden">
            {error && <div className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>}
            {filtered.length === 0 ? (
              <EmptyState icon={<Wallet />} title="Aucun achat" text="Aucun achat dans cette catégorie." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3.5">
                    <tr>
                      <th className="pl-6">Référence</th>
                      <th>Animal</th>
                      <th>Acheteur</th>
                      <th>Vendeur</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Échéance</th>
                      <th className="pr-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {rows.map((p) => (
                      <tr key={p.id} className="hover:bg-page/40">
                        <td className="whitespace-nowrap pl-6">
                          <Link href={`/achats/${p.id}`} className="font-bold text-primary hover:underline">
                            {p.ref}
                          </Link>
                          <div className="text-xs text-muted">
                            {formatDate(p.created_at)} · {formatTime(p.created_at)}
                          </div>
                        </td>
                        <td>
                          <AnimalCell animal={p.animal} thumbClass="size-11" />
                        </td>
                        <td>
                          <PersonCell person={p.buyer} href={p.buyer ? `/utilisateurs/${p.buyer.id}` : undefined} />
                        </td>
                        <td>
                          <PersonCell person={p.seller} href={p.seller ? `/utilisateurs/${p.seller.id}` : undefined} />
                        </td>
                        <td className="whitespace-nowrap font-bold text-navy">{formatPrice(p.amount, "vente")}</td>
                        <td>
                          <MetaBadge meta={isDue(p) ? { label: "À verser", tone: "green" } : PURCHASE_STATUS[p.status]} />
                        </td>
                        <td className="whitespace-nowrap text-body">
                          {p.status === "garantie" || p.status === "litige" ? `Fin garantie ${formatDate(p.release_at)}` : p.paid_out_at ? `Versé ${formatDate(p.paid_out_at)}` : "—"}
                        </td>
                        <td className="pr-6">
                          <Button size="sm" variant={["paiement_a_verifier", "litige"].includes(p.status) || isDue(p) ? "primary" : "outline"} href={`/achats/${p.id}`}>
                            {p.status === "paiement_a_verifier" ? "Vérifier" : isDue(p) ? "Verser" : p.status === "litige" ? "Traiter" : "Voir"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-body">
                  {filtered.length} achat{filtered.length > 1 ? "s" : ""}
                </span>
                <Pagination page={current} pageCount={pageCount} onChange={setPage} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
