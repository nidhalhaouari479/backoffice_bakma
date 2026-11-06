"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleMinus,
  CircleX,
  ClipboardCheck,
  Clock,
  FileText,
  Inbox,
  RotateCcw,
  Stethoscope,
} from "lucide-react";
import { AnimalCell, CategoryChip, DeltaChip, Donut, ErrorState, PersonCell, PageHeader, RequestStatusBadge, ActionMenu } from "@/components/admin-ui";
import { useRequestActions } from "@/components/RequestActions";
import { AnimalThumb, Button, Card, EmptyState, PageLoader, cn } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import {
  ACTIVITY_SELECT,
  DAY,
  REQUEST_LIST_SELECT,
  REQUEST_STATUS_COLOR,
  endOfDay,
  formatRange,
  fromDateInput,
  pct,
  pctChange,
  startOfDay,
} from "@/lib/admin";
import { REQUEST_STATUS, formatDate, formatTime, timeAgo } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { ActivityLog, PublicationRequest, RequestStatus } from "@/lib/types";

type Period = "7" | "30" | "90" | "custom";
type Lite = Pick<PublicationRequest, "id" | "status" | "step" | "submitted_at">;

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("7");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [showAllActivity, setShowAllActivity] = useState(false);
  const key = period === "custom" ? `c|${custom.from}|${custom.to}` : period;

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const now = new Date();
    let from: Date;
    let to: Date;
    const cf = fromDateInput(custom.from);
    const ct = fromDateInput(custom.to);
    if (period === "custom" && cf && ct) {
      from = startOfDay(cf < ct ? cf : ct);
      to = endOfDay(cf < ct ? ct : cf);
    } else {
      const days = period === "custom" ? 7 : Number(period);
      to = endOfDay(now);
      from = startOfDay(new Date(now.getTime() - (days - 1) * DAY));
    }
    const len = to.getTime() - from.getTime() + 1;
    const prevFrom = new Date(from.getTime() - len);

    const [reqs, latest, activity] = await Promise.all([
      supabase.from("publication_requests").select("id,status,step,submitted_at").gte("submitted_at", prevFrom.toISOString()).lte("submitted_at", to.toISOString()).limit(5000),
      supabase.from("publication_requests").select(REQUEST_LIST_SELECT).order("submitted_at", { ascending: false }).limit(5),
      supabase.from("activity_log").select(ACTIVITY_SELECT).order("created_at", { ascending: false }).limit(20),
    ]);
    const all = must<Lite[]>(reqs);
    const cur = all.filter((r) => new Date(r.submitted_at) >= from);
    const prev = all.filter((r) => new Date(r.submitted_at) < from);
    return {
      from,
      to,
      days: Math.round(len / DAY),
      cur,
      prev,
      latest: must<PublicationRequest[]>(latest),
      activity: must<ActivityLog[]>(activity),
    };
  }, key);

  const actions = useRequestActions(reload);

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const count = (list: Lite[], s?: RequestStatus) => (s ? list.filter((r) => r.status === s).length : list.length);
  const caption = data.days === 7 ? "vs semaine précédente" : "vs période précédente";
  const total = count(data.cur);

  const kpis = [
    { label: "Demandes totales", value: total, delta: pctChange(total, count(data.prev)), mode: "pct" as const, icon: <FileText />, tile: "bg-blue-50 text-primary" },
    { label: "En cours", value: count(data.cur, "en_cours"), delta: count(data.cur, "en_cours") - count(data.prev, "en_cours"), mode: "abs" as const, icon: <Clock />, tile: "bg-amber-50 text-amber-500" },
    { label: "Approuvées", value: count(data.cur, "approuvee"), delta: pctChange(count(data.cur, "approuvee"), count(data.prev, "approuvee")), mode: "pct" as const, icon: <CircleCheck />, tile: "bg-emerald-50 text-emerald-500" },
    { label: "Refusées", value: count(data.cur, "refusee"), delta: pctChange(count(data.cur, "refusee"), count(data.prev, "refusee")), mode: "pct" as const, icon: <CircleX />, tile: "bg-red-50 text-red-500", invert: true },
  ];

  const workflow = [
    { label: "Demande soumise", value: total, icon: FileText, color: "text-primary", bg: "bg-blue-50" },
    { label: "Vérification vétérinaire", value: data.cur.filter((r) => r.status === "en_cours" && (r.step === "verification_veterinaire" || r.step === "soumise")).length, icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "En attente d'approbation", value: data.cur.filter((r) => r.status === "en_cours" && r.step === "attente_approbation").length, icon: CircleCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Publiée", value: data.cur.filter((r) => r.step === "publiee").length, icon: CircleCheck, color: "text-slate-400", bg: "bg-slate-100" },
  ];

  const donut = (Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
    label: REQUEST_STATUS[s].label === "Approuvée" ? "Approuvées" : REQUEST_STATUS[s].label === "Refusée" ? "Refusées" : REQUEST_STATUS[s].label === "Annulée" ? "Annulées" : REQUEST_STATUS[s].label,
    value: count(data.cur, s),
    color: REQUEST_STATUS_COLOR[s],
  }));

  const activity = showAllActivity ? data.activity : data.activity.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble des demandes de publication et de leur état d'avancement."
        action={<PeriodPicker period={period} custom={custom} label={formatRange(data.from, data.to)} onChange={(p, c) => { setPeriod(p); if (c) setCustom(c); }} />}
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-4 p-5">
            <span className={cn("grid size-16 shrink-0 place-items-center rounded-2xl [&>svg]:size-7", k.tile)}>{k.icon}</span>
            <div className="min-w-0">
              <div className="text-3xl font-extrabold leading-none text-navy">{k.value}</div>
              <div className="mt-1 text-[15px] font-medium text-body">{k.label}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <DeltaChip value={k.delta} mode={k.mode} invert={k.invert} />
              </div>
              <div className="mt-1 text-xs text-muted">{caption}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Workflow + répartition */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <Card className="p-6">
          <h2 className="text-lg font-bold">Workflow des demandes</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:flex sm:items-start sm:justify-between sm:gap-2">
            {workflow.map((w, i) => (
              <div key={w.label} className="flex flex-1 items-start">
                <Link href="/demandes" className="flex flex-1 flex-col items-center text-center">
                  <span className={cn("grid size-16 place-items-center rounded-full", w.bg, w.color)}>
                    <w.icon className="size-7" />
                  </span>
                  <span className="mt-3 text-sm font-medium text-body">{w.label}</span>
                  <span className={cn("mt-1 text-2xl font-extrabold", w.color)}>{w.value}</span>
                </Link>
                {i < workflow.length - 1 && <ArrowRight className="mt-6 hidden size-6 shrink-0 text-primary/40 sm:block lg:mx-2" />}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold">Répartition des demandes</h2>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
            <Donut
              data={donut}
              size={170}
              thickness={28}
              center={
                <div>
                  <div className="text-3xl font-extrabold text-navy">{total}</div>
                  <div className="text-sm text-body">Demandes</div>
                </div>
              }
            />
            <ul className="w-full flex-1 space-y-3">
              {donut.map((d) => (
                <li key={d.label} className="flex items-center gap-3 text-sm">
                  <span className="size-3 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1 text-body">{d.label}</span>
                  <span className="font-bold text-navy">
                    {d.value} <span className="font-medium text-body">({pct(d.value, total)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Dernières demandes + activité */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <h2 className="text-lg font-bold">Dernières demandes</h2>
            <Link href="/demandes" className="text-sm font-semibold text-primary hover:underline">
              Voir toutes
            </Link>
          </div>
          {data.latest.length === 0 ? (
            <EmptyState icon={<Inbox />} title="Aucune demande pour le moment" text="Les demandes de publication soumises par les propriétaires apparaîtront ici." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3">
                  <tr>
                    <th className="pl-6">Animal</th>
                    <th>Propriétaire</th>
                    <th>Type</th>
                    <th>Date de soumission</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                  {data.latest.map((r) => (
                    <tr key={r.id} className="hover:bg-page/40">
                      <td className="pl-6">
                        <AnimalCell animal={r.animal} href={`/demandes/${r.id}`} />
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
                      <td>
                        <RequestStatusBadge status={r.status} />
                      </td>
                      <td>
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
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Activité récente</h2>
            {data.activity.length > 5 && (
              <button onClick={() => setShowAllActivity(!showAllActivity)} className="text-sm font-semibold text-primary hover:underline">
                {showAllActivity ? "Réduire" : "Voir toutes"}
              </button>
            )}
          </div>
          {activity.length === 0 ? (
            <EmptyState icon={<Clock />} title="Aucune activité" text="Les événements du workflow s'afficheront ici." />
          ) : (
            <ol className="relative mt-5 space-y-5">
              <span className="absolute bottom-4 left-[11px] top-4 w-px bg-line" />
              {activity.map((a) => {
                const meta = activityMeta(a);
                return (
                  <li key={a.id} className="relative flex items-center gap-3">
                    <span className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-white", meta.color)}>
                      <meta.icon className="size-6" />
                    </span>
                    <AnimalThumb src={a.animal?.cover_url} alt={a.animal?.name} className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {a.request_id ? (
                          <Link href={`/demandes/${a.request_id}`} className="truncate text-sm font-bold text-navy hover:text-primary">
                            {meta.title}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-bold text-navy">{meta.title}</span>
                        )}
                        <span className="shrink-0 text-[11px] text-muted">{timeAgo(a.created_at)}</span>
                      </div>
                      <div className="truncate text-xs text-body">
                        {a.animal?.name ?? "Annonce supprimée"}
                        {a.actor?.full_name ? ` par ${a.actor.full_name}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
      {actions.dialogs}
    </div>
  );
}

// ------------------------------------------------------------------ activité : icône + couleur par type
function activityMeta(a: ActivityLog): { title: string; icon: React.ComponentType<{ className?: string }>; color: string } {
  switch (a.type) {
    case "nouvelle_demande":
      return { title: "Nouvelle demande", icon: FileText, color: "text-primary" };
    case "consultation_prise":
      return { title: "Consultation prise en charge", icon: Stethoscope, color: "text-violet-600" };
    case "consultation_terminee":
      return { title: a.message || "Consultation terminée", icon: ClipboardCheck, color: "text-violet-600" };
    case "a_revoir":
      return { title: "Consultation à revoir", icon: RotateCcw, color: "text-amber-500" };
    case "approuvee":
      return { title: "Demande approuvée", icon: CircleCheck, color: "text-emerald-500" };
    case "refusee":
      return { title: "Demande refusée", icon: CircleX, color: "text-red-500" };
    case "annulee":
      return { title: "Demande annulée", icon: CircleMinus, color: "text-slate-400" };
    default:
      return { title: a.message || "Activité", icon: Clock, color: "text-amber-500" };
  }
}

// ------------------------------------------------------------------ sélecteur de période
function PeriodPicker({
  period,
  custom,
  label,
  onChange,
}: {
  period: Period;
  custom: { from: string; to: string };
  label: string;
  onChange: (p: Period, c?: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(custom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const opts: { value: Period; label: string }[] = [
    { value: "7", label: "7 derniers jours" },
    { value: "30", label: "30 derniers jours" },
    { value: "90", label: "90 derniers jours" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-navy shadow-sm hover:border-primary">
        <CalendarDays className="size-5 text-navy" />
        {label}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-2xl">
          {opts.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn("flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium", period === o.value ? "bg-primary-soft text-primary" : "text-navy hover:bg-page")}
            >
              {o.label}
            </button>
          ))}
          <div className="mt-2 space-y-2 border-t border-line px-1 pt-3">
            <div className={cn("px-2 text-sm font-semibold", period === "custom" ? "text-primary" : "text-navy")}>Personnalisé</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-muted">
                Du
                <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-navy" />
              </label>
              <label className="text-xs font-semibold text-muted">
                Au
                <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-navy" />
              </label>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!draft.from || !draft.to}
              onClick={() => {
                onChange("custom", draft);
                setOpen(false);
              }}
            >
              Appliquer la période
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
