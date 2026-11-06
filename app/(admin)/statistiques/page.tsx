"use client";

import { useState } from "react";
import { CircleCheck, FileText, PawPrint, Table2, Timer, Users } from "lucide-react";
import { CategoryIcon, Donut, ErrorState, PageHeader } from "@/components/admin-ui";
import { Avatar, Card, PageLoader, cn } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { DAY, REQUEST_STATUS_COLOR, formatDuration, pct, startOfDay } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase";
import type { CategoryCount, ListingType, Profile, RequestStatus } from "@/lib/types";

// ordre d'empilement : évite de juxtaposer vert et rouge (lisibilité daltonisme)
const STACK: RequestStatus[] = ["approuvee", "en_cours", "annulee", "refusee"];
const PLURAL: Record<RequestStatus, string> = { en_cours: "En cours", approuvee: "Approuvées", refusee: "Refusées", annulee: "Annulées" };
const weekFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

type Req = { id: string; status: RequestStatus; submitted_at: string; decided_at: string | null };
type AnimalLite = { listing_type: ListingType; status: string; city: string | null };
type Consult = { vet_id: string; vet: Pick<Profile, "id" | "full_name" | "avatar_url"> | null };

export default function StatistiquesPage() {
  const [table, setTable] = useState(false);
  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [reqs, cats, animals, consults, users] = await Promise.all([
      supabase.from("publication_requests").select("id,status,submitted_at,decided_at").limit(20000),
      supabase.from("category_counts").select("*").order("sort_order"),
      supabase.from("animals").select("listing_type,status,city").limit(20000),
      supabase.from("consultations").select("vet_id, vet:profiles!consultations_vet_id_fkey(id,full_name,avatar_url)").eq("status", "terminee").not("vet_id", "is", null).limit(20000),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    return {
      requests: must<Req[]>(reqs),
      categories: must<CategoryCount[]>(cats),
      animals: must<AnimalLite[]>(animals),
      consultations: must<Consult[]>(consults),
      users: users.count ?? 0,
      now: Date.now(),
    };
  });

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  // --- demandes par semaine (12 dernières semaines, lundi → dimanche)
  const today = startOfDay(new Date(data.now));
  const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (11 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const counts = { en_cours: 0, approuvee: 0, refusee: 0, annulee: 0 } as Record<RequestStatus, number>;
    for (const r of data.requests) {
      const t = new Date(r.submitted_at);
      if (t >= start && t < end) counts[r.status]++;
    }
    return { start, counts, total: STACK.reduce((s, k) => s + counts[k], 0) };
  });
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));

  // --- délai moyen soumission → décision
  const decided = data.requests.filter((r) => r.decided_at && (r.status === "approuvee" || r.status === "refusee"));
  const avg = (list: Req[]) => (list.length ? list.reduce((s, r) => s + (new Date(r.decided_at!).getTime() - new Date(r.submitted_at).getTime()), 0) / list.length : NaN);
  const avgAll = avg(decided);
  const avgOk = avg(decided.filter((r) => r.status === "approuvee"));
  const avgKo = avg(decided.filter((r) => r.status === "refusee"));

  // --- annonces publiées
  const published = data.animals.filter((a) => a.status === "publiee");
  const adoption = published.filter((a) => a.listing_type === "adoption").length;
  const vente = published.length - adoption;
  const cats = [...data.categories].sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...cats.map((c) => c.total));

  const cityMap: Record<string, number> = {};
  for (const a of published) if (a.city) cityMap[a.city] = (cityMap[a.city] ?? 0) + 1;
  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCity = Math.max(1, ...cities.map((c) => c[1]));

  const vetMap: Record<string, { vet: Consult["vet"]; n: number }> = {};
  for (const c of data.consultations) {
    vetMap[c.vet_id] ??= { vet: c.vet, n: 0 };
    vetMap[c.vet_id]!.n++;
  }
  const vets = Object.values(vetMap).sort((a, b) => b.n - a.n).slice(0, 10);
  const maxVet = Math.max(1, ...vets.map((v) => v.n));

  const approvalRate = pct(data.requests.filter((r) => r.status === "approuvee").length, decided.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Indicateurs d'activité de la plateforme : demandes, annonces et vétérinaires." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<FileText />} tone="bg-blue-50 text-primary" value={data.requests.length} label="Demandes au total" />
        <Kpi icon={<PawPrint />} tone="bg-orange-50 text-orange-500" value={published.length} label="Annonces en ligne" />
        <Kpi icon={<CircleCheck />} tone="bg-emerald-50 text-emerald-600" value={`${approvalRate}%`} label="Taux d'approbation" />
        <Kpi icon={<Users />} tone="bg-violet-50 text-violet-600" value={data.users} label="Utilisateurs inscrits" />
      </div>

      {/* Demandes par semaine */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Demandes par semaine</h2>
            <p className="text-sm text-muted">12 dernières semaines, par statut actuel</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ul className="flex flex-wrap gap-4 text-sm text-body">
              {STACK.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ background: REQUEST_STATUS_COLOR[s] }} />
                  {PLURAL[s]}
                </li>
              ))}
            </ul>
            <button onClick={() => setTable(!table)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-primary hover:text-primary">
              <Table2 className="size-4" /> {table ? "Graphique" : "Tableau"}
            </button>
          </div>
        </div>
        {table ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs font-bold text-navy [&_th]:px-3 [&_th]:py-2">
                <tr>
                  <th>Semaine du</th>
                  {STACK.map((s) => (
                    <th key={s} className="text-right">{PLURAL[s]}</th>
                  ))}
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line [&_td]:px-3 [&_td]:py-2">
                {weeks.map((w) => (
                  <tr key={w.start.toISOString()}>
                    <td className="text-body">{weekFmt.format(w.start)}</td>
                    {STACK.map((s) => (
                      <td key={s} className="text-right text-navy">{w.counts[s]}</td>
                    ))}
                    <td className="text-right font-bold text-navy">{w.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="relative min-w-[560px]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-56">
                {[0, 0.5, 1].map((f) => (
                  <div key={f} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: `${(1 - f) * 100}%` }}>
                    <span className="absolute -top-2 left-0 bg-white pr-1 text-[10px] text-muted">{Math.round(maxWeek * f)}</span>
                  </div>
                ))}
              </div>
              <div className="flex h-56 items-end gap-2 pl-8">
                {weeks.map((w) => (
                  <div key={w.start.toISOString()} className="group relative flex h-full flex-1 flex-col justify-end">
                    {w.total > 0 && <div className="mb-1 text-center text-[11px] font-bold text-navy">{w.total}</div>}
                    <div className="mx-auto flex w-full max-w-9 flex-col-reverse gap-[2px]" style={{ height: `${(w.total / maxWeek) * 85}%` }}>
                      {STACK.map((s, i) =>
                        w.counts[s] ? (
                          <div
                            key={s}
                            className={cn(STACK.slice(i + 1).every((k) => !w.counts[k]) && "rounded-t")}
                            style={{ flexGrow: w.counts[s], flexBasis: 0, background: REQUEST_STATUS_COLOR[s], minHeight: 3 }}
                          />
                        ) : null,
                      )}
                    </div>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-40 -translate-x-1/2 rounded-xl border border-line bg-white p-3 text-xs shadow-xl group-hover:block">
                      <div className="mb-1 font-bold text-navy">Semaine du {weekFmt.format(w.start)}</div>
                      {STACK.map((s) => (
                        <div key={s} className="flex items-center justify-between gap-2 text-body">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-sm" style={{ background: REQUEST_STATUS_COLOR[s] }} />
                            {PLURAL[s]}
                          </span>
                          <span className="font-semibold text-navy">{w.counts[s]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2 pl-8">
                {weeks.map((w) => (
                  <div key={w.start.toISOString()} className="flex-1 text-center text-[10px] text-muted">
                    {weekFmt.format(w.start)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Catégories */}
        <Card className="p-6">
          <h2 className="text-lg font-bold">Annonces publiées par catégorie</h2>
          {cats.every((c) => !c.total) ? (
            <p className="mt-4 text-sm text-muted">Aucune annonce publiée pour le moment.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {cats.map((c) => (
                <HBar key={c.id} label={c.name} value={c.total} max={maxCat} icon={<CategoryIcon icon={c.icon} className="size-4" />} />
              ))}
            </ul>
          )}
        </Card>

        {/* Adoption / vente */}
        <Card className="p-6">
          <h2 className="text-lg font-bold">Répartition adoption / vente</h2>
          <p className="text-sm text-muted">Annonces actuellement en ligne</p>
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <Donut
              size={170}
              thickness={28}
              data={[
                { label: "Adoption", value: adoption, color: "#f97316" },
                { label: "Vente", value: vente, color: "#22a55b" },
              ]}
              center={
                <div>
                  <div className="text-3xl font-extrabold text-navy">{published.length}</div>
                  <div className="text-sm text-body">Annonces</div>
                </div>
              }
            />
            <ul className="w-full flex-1 space-y-3 text-sm">
              {[
                ["Adoption", adoption, "#f97316"],
                ["Vente", vente, "#22a55b"],
              ].map(([l, v, c]) => (
                <li key={l as string} className="flex items-center gap-3">
                  <span className="size-3 rounded-full" style={{ background: c as string }} />
                  <span className="flex-1 text-body">{l}</span>
                  <span className="font-bold text-navy">
                    {v} <span className="font-medium text-body">({pct(v as number, published.length)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Délai */}
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Délai moyen soumission → décision</h2>
          </div>
          <div className="mt-5 text-5xl font-extrabold text-navy">{formatDuration(avgAll)}</div>
          <p className="mt-1 text-sm text-muted">sur {decided.length} demande(s) traitée(s)</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-xs font-semibold text-emerald-700">Approuvées</div>
              <div className="mt-1 text-xl font-extrabold text-navy">{formatDuration(avgOk)}</div>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <div className="text-xs font-semibold text-red-600">Refusées</div>
              <div className="mt-1 text-xl font-extrabold text-navy">{formatDuration(avgKo)}</div>
            </div>
          </div>
        </Card>

        {/* Villes */}
        <Card className="p-6">
          <h2 className="text-lg font-bold">Top villes</h2>
          <p className="text-sm text-muted">Annonces en ligne par ville</p>
          {cities.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Pas encore de données.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {cities.map(([name, n]) => (
                <HBar key={name} label={name} value={n} max={maxCity} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Vétérinaires */}
      <Card className="p-6">
        <h2 className="text-lg font-bold">Activité des vétérinaires</h2>
        <p className="text-sm text-muted">Consultations terminées par vétérinaire</p>
        {vets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune consultation terminée pour le moment.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {vets.map((v) => (
              <HBar
                key={v.vet?.id ?? v.n}
                label={`Dr. ${v.vet?.full_name ?? "—"}`}
                value={v.n}
                max={maxVet}
                icon={<Avatar src={v.vet?.avatar_url} name={v.vet?.full_name} size={24} />}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl [&>svg]:size-6", tone)}>{icon}</span>
      <div>
        <div className="text-3xl font-extrabold leading-none text-navy">{value}</div>
        <div className="mt-1 text-sm font-medium text-body">{label}</div>
      </div>
    </Card>
  );
}

function HBar({ label, value, max, icon }: { label: string; value: number; max: number; icon?: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[minmax(110px,180px)_1fr_40px] items-center gap-3 text-sm" title={`${label} : ${value}`}>
      <span className="flex min-w-0 items-center gap-2 text-body">
        {icon && <span className="shrink-0 text-primary">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      <span className="h-3 overflow-hidden rounded-full bg-page">
        <span className="block h-full rounded-r bg-primary" style={{ width: `${Math.max(value ? 3 : 0, (value / max) * 100)}%` }} />
      </span>
      <span className="text-right font-bold text-navy">{value}</span>
    </li>
  );
}
