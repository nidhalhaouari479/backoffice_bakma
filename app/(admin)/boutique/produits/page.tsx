"use client";

import { useState } from "react";
import { Eye, EyeOff, Package, PackageX, Pencil, Plus, Star, Tag, Trash2, TriangleAlert } from "lucide-react";
import { ActionMenu, ConfirmDialog, DataTable, ErrorState, FilterBar, PageHeader, type MenuItem } from "@/components/admin-ui";
import {
  Alert,
  AnimalThumb,
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  PageLoader,
  Pagination,
  SearchInput,
  Select,
  Tabs,
  useToast,
} from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { normalize } from "@/lib/admin";
import { formatTnd } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Product, ShopBrand, ShopCategory } from "@/lib/types";
import { ProductModal } from "./ProductModal";

type Tab = "all" | "actifs" | "rupture" | "masques";
const PER_PAGE = 12;
const LOW_STOCK = 5;
const PRODUCT_SELECT = "*, category:shop_categories(id, name, icon)";

const TAB_FILTER: Record<Tab, (p: Product) => boolean> = {
  all: () => true,
  actifs: (p) => p.is_active,
  rupture: (p) => p.stock === 0,
  masques: (p) => !p.is_active,
};

export default function ProduitsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [brandF, setBrandF] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const [del, setDel] = useState<Product | null>(null);

  const { data, error, loading, reload, mutate } = useAsync(async () => {
    const sb = getSupabase();
    const [products, cats, brands] = await Promise.all([
      sb.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false }).limit(2000),
      sb.from("shop_categories").select("*").order("sort_order"),
      sb.from("shop_brands").select("*").order("sort_order").order("name"),
    ]);
    return { products: must<Product[]>(products), cats: must<ShopCategory[]>(cats), brands: must<ShopBrand[]>(brands) };
  });

  const all = data?.products ?? [];
  const cats = data?.cats ?? [];
  const brands = data?.brands ?? [];
  const nq = normalize(q.trim());
  const base = all.filter((p) => (!nq || normalize(`${p.name} ${p.brand ?? ""}`).includes(nq)) && (!cat || String(p.category_id ?? "") === cat) && (!brandF || String(p.brand_id ?? "") === brandF));
  const filtered = base.filter(TAB_FILTER[tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (t: Tab) => base.filter(TAB_FILTER[t]).length;

  async function toggleActive(p: Product) {
    const { error: err } = await getSupabase().from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (err) return toast(errorMessage(err), "error");
    mutate((d) => d && { ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)) });
    toast(p.is_active ? `« ${p.name} » est masqué du site` : `« ${p.name} » est de nouveau visible`);
  }

  const menu = (p: Product): MenuItem[] => [
    { label: "Modifier", icon: <Pencil />, onClick: () => setEdit(p) },
    { label: p.is_active ? "Masquer du site" : "Afficher sur le site", icon: p.is_active ? <EyeOff /> : <Eye />, onClick: () => toggleActive(p) },
    { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setDel(p) },
  ];

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle="Catalogue de la boutique : prix, stock, photos et visibilité sur le site."
        action={
          <Button icon={<Plus className="size-4" />} onClick={() => setEdit({ is_active: true, is_featured: false, images: [], stock: 0 })} disabled={loading}>
            Nouveau produit
          </Button>
        }
      />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<Package />} tone="green" value={all.filter((p) => p.is_active).length} label="Produits actifs" />
            <KpiCard icon={<PackageX />} tone="red" value={all.filter((p) => p.stock === 0).length} label="En rupture" />
            <KpiCard icon={<TriangleAlert />} tone="orange" value={all.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length} label={`Stock faible (≤ ${LOW_STOCK})`} />
            <KpiCard icon={<EyeOff />} tone="grey" value={all.filter((p) => !p.is_active).length} label="Masqués" />
          </div>

          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              items={[
                { value: "all", label: "Tous", count: count("all") },
                { value: "actifs", label: "Actifs", count: count("actifs") },
                { value: "rupture", label: "Rupture", count: count("rupture") },
                { value: "masques", label: "Masqués", count: count("masques") },
              ]}
            />
            <FilterBar>
              <SearchInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="Nom ou marque…"
              />
              <Select
                aria-label="Catégorie"
                icon={<Tag />}
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setPage(1);
                }}
                className="sm:w-56"
              >
                <option value="">Toutes les catégories</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Marque"
                value={brandF}
                onChange={(e) => {
                  setBrandF(e.target.value);
                  setPage(1);
                }}
                className="sm:w-56"
              >
                <option value="">Toutes les marques</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FilterBar>
          </div>

          <Card className="overflow-hidden">
            {error && <Alert>{error}</Alert>}
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Package />}
                title={all.length === 0 ? "Aucun produit" : "Aucun résultat"}
                text={all.length === 0 ? "Ajoutez votre premier produit pour ouvrir la boutique." : "Aucun produit ne correspond à ces filtres."}
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable
                    head={
                      <tr>
                        <th>Produit</th>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Vendus</th>
                        <th>Statut</th>
                        <th className="w-12" />
                      </tr>
                    }
                  >
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <ProductCell product={p} onClick={() => setEdit(p)} />
                        </td>
                        <td className="whitespace-nowrap">{p.category?.name ?? <span className="text-slate-400">—</span>}</td>
                        <td className="whitespace-nowrap">
                          <PriceCell product={p} />
                        </td>
                        <td>
                          <StockBadge stock={p.stock} />
                        </td>
                        <td className="tabular-nums">{p.sold_count}</td>
                        <td>
                          <StatusBadge product={p} />
                        </td>
                        <td>
                          <ActionMenu items={menu(p)} label={`Actions pour ${p.name}`} />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
                <ul className="divide-y divide-slate-100 md:hidden">
                  {rows.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1 space-y-2">
                        <ProductCell product={p} onClick={() => setEdit(p)} />
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <PriceCell product={p} />
                          <StockBadge stock={p.stock} />
                          <StatusBadge product={p} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {p.category?.name ?? "Sans catégorie"} · {p.sold_count} vendu{p.sold_count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <ActionMenu items={menu(p)} label={`Actions pour ${p.name}`} />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[13px] text-slate-500">
                    {filtered.length} produit{filtered.length > 1 ? "s" : ""}
                  </span>
                  <Pagination page={current} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {edit && (
        <ProductModal brands={brands}
          value={edit}
          cats={cats}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
      {del && (
        <ConfirmDialog
          open
          onClose={() => setDel(null)}
          variant="danger"
          title="Supprimer le produit"
          confirmLabel="Supprimer"
          message={`« ${del.name} » sera supprimé définitivement. Les commandes passées conservent son nom et son prix. Pour le retirer temporairement du site, masquez-le plutôt.`}
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("products").delete().eq("id", del.id);
            if (err) {
              throw new Error(
                err.code === "23503" ? "Ce produit est lié à des données existantes et ne peut pas être supprimé : masquez-le plutôt (menu « Masquer du site »)." : errorMessage(err),
              );
            }
            toast(`« ${del.name} » supprimé`);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ cellules
function ProductCell({ product: p, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-3 text-left">
      <AnimalThumb src={p.images[0]} alt={p.name} className="size-11 shrink-0 rounded-lg border border-slate-200/80" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-navy">
          <span className="truncate">{p.name}</span>
          {p.is_featured && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Mis en avant" />}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {p.brand || "Sans marque"}
          {p.options?.length > 0 && ` · ${p.options.map((o) => o.name).join(", ")}`}
          {p.rating_count > 0 && ` · ★ ${Number(p.rating_avg).toFixed(1)} (${p.rating_count})`}
        </span>
      </span>
    </button>
  );
}

function PriceCell({ product: p }: { product: Product }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-semibold tabular-nums text-navy">{formatTnd(p.price)}</span>
      {p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price) && (
        <span className="text-xs tabular-nums text-slate-400 line-through">{formatTnd(p.compare_at_price)}</span>
      )}
    </span>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge tone="red">Rupture</Badge>;
  if (stock <= LOW_STOCK) return <Badge tone="orange">{stock} en stock</Badge>;
  return <span className="tabular-nums text-slate-700">{stock}</span>;
}

function StatusBadge({ product: p }: { product: Product }) {
  return p.is_active ? <Badge tone="green">Actif</Badge> : <Badge tone="grey">Masqué</Badge>;
}
