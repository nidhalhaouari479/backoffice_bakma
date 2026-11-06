"use client";

import { useMemo, useState } from "react";
import { Eye, Funnel, PawPrint, Search } from "lucide-react";
import { useAnimalActions } from "@/components/AnimalActions";
import { ActionMenu, AnimalCell, CategoryChip, ErrorState, PageHeader, PersonCell } from "@/components/admin-ui";
import { Button, Card, EmptyState, Input, MetaBadge, PageLoader, Pagination, Select } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { ANIMAL_LIST_SELECT, normalize } from "@/lib/admin";
import { ANIMAL_STATUS, LISTING_TYPE, formatDate, formatPrice } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Animal, AnimalStatus, Category, City, ListingType } from "@/lib/types";

const PER_PAGE = 10;

export default function AnimauxPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | AnimalStatus>("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState<"" | ListingType>("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload, mutate } = useAsync(async () => {
    const supabase = getSupabase();
    const [animals, cats, cities] = await Promise.all([
      supabase.from("animals").select(ANIMAL_LIST_SELECT).order("created_at", { ascending: false }).limit(3000),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("cities").select("*").order("name"),
    ]);
    return { animals: must<Animal[]>(animals), categories: must<Category[]>(cats), cities: must<City[]>(cities) };
  });

  const actions = useAnimalActions((kind, a) => {
    if (kind === "delete") mutate((d) => d && { ...d, animals: d.animals.filter((x) => x.id !== a.id) });
    reload();
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const nq = normalize(q.trim());
    return data.animals.filter((a) => {
      if (status && a.status !== status) return false;
      if (cat && String(a.category_id ?? "") !== cat) return false;
      if (type && a.listing_type !== type) return false;
      if (city && a.city !== city) return false;
      if (nq && !normalize([a.name, a.breed, a.owner?.full_name, a.city].join(" ")).includes(nq)) return false;
      return true;
    });
  }, [data, q, status, cat, type, city]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  function reset() {
    setQ("");
    setStatus("");
    setCat("");
    setType("");
    setCity("");
    setPage(1);
  }

  const set = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Animaux" subtitle="Toutes les annonces de la plateforme : modération, publication et suppression." />

      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_1fr_auto]">
            <Input icon={<Search />} placeholder="Rechercher un animal, une race, un propriétaire…" value={q} onChange={(e) => set(setQ)(e.target.value)} className="rounded-2xl" />
            <Select value={status} onChange={(e) => set(setStatus)(e.target.value as AnimalStatus | "")} className="rounded-2xl" aria-label="Statut">
              <option value="">Tous les statuts</option>
              {(Object.keys(ANIMAL_STATUS) as AnimalStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ANIMAL_STATUS[s].label}
                </option>
              ))}
            </Select>
            <Select value={cat} onChange={(e) => set(setCat)(e.target.value)} className="rounded-2xl" aria-label="Catégorie">
              <option value="">Toutes catégories</option>
              {data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => set(setType)(e.target.value as ListingType | "")} className="rounded-2xl" aria-label="Type d'annonce">
              <option value="">Adoption et vente</option>
              <option value="adoption">Adoption</option>
              <option value="vente">Vente</option>
            </Select>
            <Select value={city} onChange={(e) => set(setCity)(e.target.value)} className="rounded-2xl" aria-label="Ville">
              <option value="">Toutes les villes</option>
              {data?.cities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button variant="outline" icon={<Funnel className="size-4" />} onClick={reset} className="h-12 rounded-2xl text-primary">
              Réinitialiser
            </Button>
          </div>

          <Card className="overflow-hidden">
            {error && <div className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>}
            {filtered.length === 0 ? (
              <EmptyState icon={<PawPrint />} title="Aucune annonce" text="Aucune annonce ne correspond à ces critères." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3.5">
                    <tr>
                      <th className="pl-6">Animal</th>
                      <th>Propriétaire</th>
                      <th>Catégorie</th>
                      <th>Annonce</th>
                      <th>Ville</th>
                      <th>Statut</th>
                      <th>Créée le</th>
                      <th className="pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {rows.map((a) => (
                      <tr key={a.id} className="hover:bg-page/40">
                        <td className="pl-6">
                          <AnimalCell animal={a} href={`/animaux/${a.id}`} />
                        </td>
                        <td>
                          <PersonCell person={a.owner} href={`/utilisateurs/${a.owner_id}`} sub={a.owner?.city ?? ""} />
                        </td>
                        <td>
                          <CategoryChip category={a.category} />
                        </td>
                        <td>
                          <MetaBadge meta={LISTING_TYPE[a.listing_type]} />
                          <div className="mt-1 text-xs font-semibold text-navy">{formatPrice(a.price, a.listing_type)}</div>
                        </td>
                        <td className="text-body">{a.city || "—"}</td>
                        <td>
                          <MetaBadge meta={ANIMAL_STATUS[a.status]} />
                        </td>
                        <td className="whitespace-nowrap text-body">
                          {formatDate(a.created_at)}
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Eye className="size-3" /> {a.views_count} vues
                          </div>
                        </td>
                        <td className="pr-6">
                          <div className="flex items-center gap-1">
                            <Button href={`/animaux/${a.id}`} variant="outline" size="sm" className="px-5 text-primary">
                              Voir
                            </Button>
                            <ActionMenu items={actions.menuItems(a)} />
                          </div>
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
                  Affichage de {(current - 1) * PER_PAGE + 1} à {Math.min(current * PER_PAGE, filtered.length)} sur {filtered.length} annonces
                </span>
                <Pagination page={current} pageCount={pageCount} onChange={setPage} />
              </div>
            )}
          </Card>
        </>
      )}
      {actions.dialogs}
    </div>
  );
}
