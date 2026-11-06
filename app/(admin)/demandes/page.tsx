"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, CircleCheck, CircleMinus, CircleX, Clock, Download, FileText, Funnel, Inbox, Search, X } from "lucide-react";
import { ActionMenu, AnimalCell, CategoryChip, ErrorState, PageHeader, PersonCell, RequestStatusBadge, stepLabel } from "@/components/admin-ui";
import { useRequestActions } from "@/components/RequestActions";
import { Button, Card, EmptyState, Input, PageLoader, Pagination, Select, cn } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { DAY, REQUEST_LIST_SELECT, categoryLabel, downloadCsv, normalize, toDateInput } from "@/lib/admin";
import { REQUEST_STATUS, REQUEST_STEPS, formatDate, formatTime } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Category, PublicationRequest, RequestStatus, RequestStep } from "@/lib/types";

type Tab = "all" | RequestStatus;
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Toutes", icon: <FileText className="text-primary" /> },
  { value: "en_cours", label: "En cours", icon: <Clock className="text-amber-500" /> },
  { value: "approuvee", label: "Approuvées", icon: <CircleCheck className="text-emerald-500" /> },
  { value: "refusee", label: "Refusées", icon: <CircleX className="text-red-500" /> },
  { value: "annulee", label: "Annulées", icon: <CircleMinus className="text-slate-400" /> },
];

export default function DemandesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [step, setStep] = useState<"" | RequestStep>("");
  const [dateF, setDateF] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [reqs, cats] = await Promise.all([
      supabase.from("publication_requests").select(REQUEST_LIST_SELECT).order("submitted_at", { ascending: false }).limit(2000),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    return { requests: must<PublicationRequest[]>(reqs), categories: must<Category[]>(cats), loadedAt: Date.now() };
  });

  const actions = useRequestActions(() => {
    setSelected(new Set());
    reload();
  });

  // filtres hors onglet (pour les compteurs des onglets)
  const base = useMemo(() => {
    if (!data) return [];
    const nq = normalize(q.trim());
    const minDate = dateF === "today" ? new Date(new Date(data.loadedAt).setHours(0, 0, 0, 0)).getTime() : dateF ? data.loadedAt - Number(dateF) * DAY : 0;
    return data.requests.filter((r) => {
      if (cat && String(r.animal?.category_id ?? "") !== cat) return false;
      if (step && r.step !== step) return false;
      if (minDate && new Date(r.submitted_at).getTime() < minDate) return false;
      if (nq) {
        const hay = normalize([r.ref, r.animal?.name, r.animal?.breed, r.owner?.full_name, r.owner?.contact?.email].join(" "));
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [data, q, cat, step, dateF]);

  const filtered = useMemo(() => {
    const list = tab === "all" ? base : base.filter((r) => r.status === tab);
    return [...list].sort((a, b) => (sortAsc ? 1 : -1) * a.submitted_at.localeCompare(b.submitted_at));
  }, [base, tab, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  const selectedRows = (data?.requests ?? []).filter((r) => selected.has(r.id));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function reset() {
    setQ("");
    setCat("");
    setStep("");
    setDateF("");
    setTab("all");
    setPage(1);
  }

  function exportCsv() {
    downloadCsv(
      `demandes-${toDateInput(new Date())}.csv`,
      ["Référence", "Animal", "Race", "Type", "Propriétaire", "Email", "Date de soumission", "Étape", "Statut", "Motif du refus"],
      filtered.map((r) => [
        r.ref,
        r.animal?.name,
        r.animal?.breed,
        categoryLabel(r.animal?.category),
        r.owner?.full_name,
        r.owner?.contact?.email,
        `${formatDate(r.submitted_at)} ${formatTime(r.submitted_at)}`,
        stepLabel(r.step),
        REQUEST_STATUS[r.status].label,
        r.refusal_reason,
      ]),
    );
  }

  const counts = (t: Tab) => (t === "all" ? base.length : base.filter((r) => r.status === t).length);

  return (
    <div>
      <PageHeader
        title="Demandes de publication"
        subtitle="Consultez et gérez toutes les demandes de publication d'animaux soumises par les utilisateurs."
        action={
          <Button size="lg" icon={<Download className="size-5" />} onClick={exportCsv} disabled={!filtered.length} className="h-12 rounded-2xl">
            Exporter CSV
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
          {/* Onglets */}
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_4px_24px_rgba(15,40,90,0.05)] scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl border-b-2 px-5 py-3 text-sm font-semibold transition [&>svg]:size-5",
                  tab === t.value ? "border-primary bg-primary-soft text-primary" : "border-transparent text-navy hover:bg-page",
                )}
              >
                {t.icon}
                {t.label} ({counts(t.value)})
              </button>
            ))}
          </div>

          {/* Filtres */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr_auto]">
            <Input icon={<Search />} placeholder="Rechercher par nom, race, propriétaire, réf…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-2xl" />
            <Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="rounded-2xl" aria-label="Type d'animal">
              <option value="">Type d&apos;animal</option>
              {data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={step} onChange={(e) => { setStep(e.target.value as RequestStep | ""); setPage(1); }} className="rounded-2xl" aria-label="Étape">
              <option value="">Étape</option>
              {REQUEST_STEPS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select icon={<CalendarDays />} value={dateF} onChange={(e) => { setDateF(e.target.value); setPage(1); }} className="rounded-2xl" aria-label="Date de soumission">
              <option value="">Date de soumission</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
            </Select>
            <Button variant="outline" icon={<Funnel className="size-4" />} onClick={reset} className="h-12 rounded-2xl text-primary">
              Réinitialiser
            </Button>
          </div>

          {/* Actions groupées */}
          {selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3">
              <span className="text-sm font-bold text-primary">{selected.size} demande(s) sélectionnée(s)</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="success" icon={<CircleCheck className="size-4" />} onClick={() => actions.ask("approve", selectedRows)}>
                  Approuver
                </Button>
                <Button size="sm" variant="danger" icon={<CircleX className="size-4" />} onClick={() => actions.ask("refuse", selectedRows)}>
                  Refuser
                </Button>
                <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => setSelected(new Set())}>
                  Désélectionner
                </Button>
              </div>
            </div>
          )}

          <Card className="overflow-hidden">
            {error && <div className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>}
            {filtered.length === 0 ? (
              <EmptyState icon={<Inbox />} title="Aucune demande" text="Aucune demande ne correspond à ces critères." action={<Button variant="outline" size="sm" onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3.5">
                    <tr>
                      <th className="w-12 pl-6">
                        <input
                          type="checkbox"
                          aria-label="Tout sélectionner"
                          className="size-4 accent-[var(--color-primary)]"
                          checked={allOnPage}
                          onChange={() =>
                            setSelected((s) => {
                              const n = new Set(s);
                              rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
                              return n;
                            })
                          }
                        />
                      </th>
                      <th>Animal</th>
                      <th>Propriétaire</th>
                      <th>Type</th>
                      <th>
                        <button onClick={() => setSortAsc(!sortAsc)} className="inline-flex items-center gap-1 hover:text-primary">
                          Date de soumission {sortAsc ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                        </button>
                      </th>
                      <th>Étape</th>
                      <th>Statut</th>
                      <th className="pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {rows.map((r) => (
                      <tr key={r.id} className={cn("transition hover:bg-page/40", selected.has(r.id) && "bg-primary-soft/40")}>
                        <td className="pl-6">
                          <input type="checkbox" aria-label={`Sélectionner ${r.ref}`} className="size-4 accent-[var(--color-primary)]" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                        </td>
                        <td>
                          <AnimalCell animal={r.animal} href={`/demandes/${r.id}`} thumbClass="size-16" />
                          <div className="mt-1 text-[11px] font-semibold text-muted">{r.ref}</div>
                        </td>
                        <td>
                          <PersonCell person={r.owner} href={`/utilisateurs/${r.owner_id}`} />
                        </td>
                        <td>
                          <CategoryChip category={r.animal?.category} />
                        </td>
                        <td className="whitespace-nowrap text-navy">
                          {formatDate(r.submitted_at)}
                          <div className="text-xs text-muted">{formatTime(r.submitted_at)}</div>
                        </td>
                        <td className="text-xs font-medium text-body">{stepLabel(r.step)}</td>
                        <td>
                          <RequestStatusBadge status={r.status} />
                        </td>
                        <td className="pr-6">
                          <div className="flex items-center gap-1">
                            <Button href={`/demandes/${r.id}`} variant="outline" size="sm" className="px-5 text-primary">
                              Voir
                            </Button>
                            <ActionMenu items={actions.menuItems(r)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-body">
                  Affichage de {(current - 1) * perPage + 1} à {Math.min(current * perPage, filtered.length)} sur {filtered.length} demandes
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-body">
                    Éléments par page
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="select-chevron h-10 appearance-none rounded-xl border border-line bg-white bg-[length:14px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 font-semibold text-navy"
                    >
                      {[8, 10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Pagination page={current} pageCount={pageCount} onChange={setPage} />
                </div>
              </div>
            )}
          </Card>
        </>
      )}
      {actions.dialogs}
    </div>
  );
}
