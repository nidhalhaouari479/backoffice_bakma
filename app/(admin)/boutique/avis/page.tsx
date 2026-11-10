"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, MessageSquareText, Star, Trash2 } from "lucide-react";
import { ActionMenu, ConfirmDialog, ErrorState, FilterBar, PageHeader, type MenuItem } from "@/components/admin-ui";
import { Alert, AnimalThumb, Avatar, Badge, Card, cn, EmptyState, KpiCard, PageLoader, Pagination, SearchInput, Select, Tabs, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { normalize } from "@/lib/admin";
import { formatDate } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ProductReview } from "@/lib/types";

type Tab = "all" | "visibles" | "masques";
const PER_PAGE = 15;
const SELECT = "*, author:profiles!product_reviews_user_id_fkey(full_name, avatar_url), product:products!product_reviews_product_id_fkey(id, name, images)";

function StarsRow({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
      ))}
    </span>
  );
}

export default function AvisPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [del, setDel] = useState<ProductReview | null>(null);

  const { data, error, loading, reload, mutate } = useAsync(async () =>
    must<ProductReview[]>(await getSupabase().from("product_reviews").select(SELECT).order("created_at", { ascending: false }).limit(2000)),
  );

  const all = data ?? [];
  const nq = normalize(q.trim());
  const base = all.filter(
    (r) => (!nq || normalize(`${r.product?.name ?? ""} ${r.author?.full_name ?? ""} ${r.comment ?? ""}`).includes(nq)) && (!rating || String(r.rating) === rating),
  );
  const filters: Record<Tab, (r: ProductReview) => boolean> = { all: () => true, visibles: (r) => r.is_visible, masques: (r) => !r.is_visible };
  const filtered = base.filter(filters[tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const visible = all.filter((r) => r.is_visible);
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;

  async function toggle(r: ProductReview) {
    const { error: err } = await getSupabase().from("product_reviews").update({ is_visible: !r.is_visible }).eq("id", r.id);
    if (err) return toast(errorMessage(err), "error");
    mutate((d) => d?.map((x) => (x.id === r.id ? { ...x, is_visible: !r.is_visible } : x)));
    toast(r.is_visible ? "Avis masqué du site" : "Avis de nouveau visible");
  }

  const menu = (r: ProductReview): MenuItem[] => [
    { label: r.is_visible ? "Masquer du site" : "Afficher sur le site", icon: r.is_visible ? <EyeOff /> : <Eye />, onClick: () => toggle(r) },
    { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setDel(r) },
  ];

  return (
    <div>
      <PageHeader title="Avis clients" subtitle="Notes et commentaires laissés sur les produits par les clients ayant reçu leur commande." />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <KpiCard icon={<MessageSquareText />} tone="blue" value={all.length} label="Avis reçus" />
            <KpiCard icon={<Star />} tone="orange" value={visible.length ? avg.toFixed(1).replace(".", ",") : "–"} label="Note moyenne (avis visibles)" />
            <KpiCard icon={<EyeOff />} tone="grey" value={all.length - visible.length} label="Masqués" />
          </div>

          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              items={[
                { value: "all", label: "Tous", count: base.length },
                { value: "visibles", label: "Visibles", count: base.filter(filters.visibles).length },
                { value: "masques", label: "Masqués", count: base.filter(filters.masques).length },
              ]}
            />
            <FilterBar>
              <SearchInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="Produit, client, commentaire…"
              />
              <Select
                aria-label="Note"
                value={rating}
                onChange={(e) => {
                  setRating(e.target.value);
                  setPage(1);
                }}
                className="sm:w-44"
              >
                <option value="">Toutes les notes</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} étoile{n > 1 ? "s" : ""}
                  </option>
                ))}
              </Select>
            </FilterBar>
          </div>

          <Card className="overflow-hidden">
            {error && <Alert>{error}</Alert>}
            {filtered.length === 0 ? (
              <EmptyState
                icon={<MessageSquareText />}
                title={all.length === 0 ? "Aucun avis" : "Aucun résultat"}
                text={all.length === 0 ? "Les clients peuvent noter un produit une fois leur commande livrée." : "Aucun avis ne correspond à ces filtres."}
              />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <li key={r.id} className={cn("flex items-start gap-4 px-5 py-4", !r.is_visible && "bg-slate-50/70")}>
                      <AnimalThumb src={r.product?.images?.[0]} alt={r.product?.name} className="size-12 shrink-0 rounded-lg border border-slate-200/80" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {r.product ? (
                            <Link href="/boutique/produits" className="truncate font-semibold text-navy hover:text-primary">
                              {r.product.name}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Produit supprimé</span>
                          )}
                          <StarsRow value={r.rating} />
                          {!r.is_visible && <Badge tone="grey">Masqué</Badge>}
                        </div>
                        {r.comment ? <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 [overflow-wrap:anywhere]">{r.comment}</p> : <p className="mt-1.5 text-sm italic text-slate-400">Sans commentaire</p>}
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Avatar src={r.author?.avatar_url} name={r.author?.full_name} size={20} />
                          <Link href={`/utilisateurs/${r.user_id}`} className="font-medium hover:text-primary">
                            {r.author?.full_name || "Client"}
                          </Link>
                          <span>· {formatDate(r.created_at)}</span>
                          {r.updated_at !== r.created_at && <span>· modifié</span>}
                        </div>
                      </div>
                      <ActionMenu items={menu(r)} label="Actions sur l'avis" />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[13px] text-slate-500">
                    {filtered.length} avis
                  </span>
                  <Pagination page={current} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {del && (
        <ConfirmDialog
          open
          onClose={() => setDel(null)}
          variant="danger"
          title="Supprimer l'avis"
          confirmLabel="Supprimer"
          message="L'avis sera supprimé définitivement et la note du produit recalculée. Pour le retirer temporairement, masquez-le plutôt."
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("product_reviews").delete().eq("id", del.id);
            if (err) throw new Error(errorMessage(err));
            toast("Avis supprimé");
            reload();
          }}
        />
      )}
    </div>
  );
}
