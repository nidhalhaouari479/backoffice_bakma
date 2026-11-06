"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, Clock, ExternalLink, Eye, EyeOff, FileText, Flag, Search, UserRound, XCircle } from "lucide-react";
import { useAdminCounts } from "@/components/AdminShell";
import { useAnimalActions } from "@/components/AnimalActions";
import { ActionMenu, ErrorState, InfoRow, PageHeader, type MenuItem } from "@/components/admin-ui";
import { AnimalThumb, Avatar, Button, Card, EmptyState, Input, MetaBadge, Modal, PageLoader, Pagination, Tabs, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { must, useAsync } from "@/hooks/useAsync";
import { REPORT_SELECT, normalize, siteUrl } from "@/lib/admin";
import { ANIMAL_STATUS, REPORT_STATUS, formatDate, formatDateTime, formatTime } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Report, ReportStatus } from "@/lib/types";

type Tab = "all" | ReportStatus;
const PER_PAGE = 10;

export default function SignalementsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { refresh } = useAdminCounts();
  const [tab, setTab] = useState<Tab>("ouvert");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Report | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const res = await getSupabase().from("reports").select(REPORT_SELECT).order("created_at", { ascending: false }).limit(2000);
    return must<Report[]>(res);
  });

  const animalActions = useAnimalActions(() => reload());

  async function setStatus(r: Report, status: ReportStatus) {
    const { error: err } = await getSupabase()
      .from("reports")
      .update({ status, handled_by: user?.id ?? null, handled_at: new Date().toISOString() })
      .eq("id", r.id);
    if (err) return toast(errorMessage(err), "error");
    toast(`Signalement : ${REPORT_STATUS[status].label.toLowerCase()}`);
    setDetail(null);
    reload();
    refresh();
  }

  const nq = normalize(q.trim());
  const base = (data ?? []).filter(
    (r) => !nq || normalize([r.reason, r.details, r.reporter?.full_name, r.animal?.name, r.reported_user?.full_name].join(" ")).includes(nq),
  );
  const filtered = tab === "all" ? base : base.filter((r) => r.status === tab);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (t: Tab) => (t === "all" ? base.length : base.filter((r) => r.status === t).length);

  const items = (r: Report): MenuItem[] => [
    { label: "Voir les détails", icon: <Eye />, onClick: () => setDetail(r) },
    { label: "Passer en cours", icon: <Clock />, onClick: () => setStatus(r, "en_cours"), hidden: r.status !== "ouvert" },
    { label: "Résoudre", icon: <CircleCheck />, onClick: () => setStatus(r, "resolu"), hidden: r.status === "resolu" },
    { label: "Rejeter", icon: <XCircle />, onClick: () => setStatus(r, "rejete"), hidden: r.status === "rejete" },
    { label: "Fiche de l'annonce", icon: <FileText />, href: r.animal ? `/animaux/${r.animal.id}` : undefined, hidden: !r.animal },
    { label: "Voir l'annonce sur le site", icon: <ExternalLink />, href: r.animal ? siteUrl(`/animaux/${r.animal.id}`) : undefined, external: true, hidden: r.animal?.status !== "publiee" },
    { label: "Dépublier l'annonce", icon: <EyeOff />, danger: true, onClick: () => r.animal && animalActions.ask("unpublish", r.animal), hidden: r.animal?.status !== "publiee" },
    { label: "Voir l'utilisateur", icon: <UserRound />, href: r.reported_user ? `/utilisateurs/${r.reported_user.id}` : undefined, hidden: !r.reported_user },
  ];

  return (
    <div>
      <PageHeader title="Signalements" subtitle="Traitez les signalements d'annonces et d'utilisateurs remontés par la communauté." />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <Tabs
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(1);
              }}
              items={[
                { value: "all", label: "Tous", count: count("all") },
                ...(Object.keys(REPORT_STATUS) as ReportStatus[]).map((s) => ({
                  value: s as Tab,
                  label: s === "ouvert" ? "Ouverts" : s === "en_cours" ? "En cours" : s === "resolu" ? "Résolus" : "Rejetés",
                  count: count(s),
                })),
              ]}
            />
            <div className="lg:w-80">
              <Input icon={<Search />} placeholder="Rechercher un motif, un nom…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-2xl" />
            </div>
          </div>

          <Card className="overflow-hidden">
            {error && <div className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>}
            {filtered.length === 0 ? (
              <EmptyState icon={<Flag />} title="Aucun signalement" text={tab === "ouvert" ? "Aucun signalement en attente de traitement." : "Aucun signalement dans cette catégorie."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3.5">
                    <tr>
                      <th className="pl-6">Date</th>
                      <th>Signalé par</th>
                      <th>Cible</th>
                      <th>Motif</th>
                      <th>Détails</th>
                      <th>Statut</th>
                      <th className="pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-page/40">
                        <td className="whitespace-nowrap pl-6 text-navy">
                          {formatDate(r.created_at)}
                          <div className="text-xs text-muted">{formatTime(r.created_at)}</div>
                        </td>
                        <td>
                          {r.reporter ? (
                            <Link href={`/utilisateurs/${r.reporter.id}`} className="flex items-center gap-2 hover:opacity-90">
                              <Avatar src={r.reporter.avatar_url} name={r.reporter.full_name} size={32} />
                              <span className="font-semibold text-navy">{r.reporter.full_name}</span>
                            </Link>
                          ) : (
                            <span className="text-muted">Utilisateur supprimé</span>
                          )}
                        </td>
                        <td>
                          <Target r={r} />
                        </td>
                        <td className="font-semibold text-navy">{r.reason}</td>
                        <td className="max-w-[240px]">
                          <button onClick={() => setDetail(r)} className="line-clamp-2 text-left text-body hover:text-primary">
                            {r.details || "—"}
                          </button>
                        </td>
                        <td>
                          <MetaBadge meta={REPORT_STATUS[r.status]} />
                        </td>
                        <td className="pr-6">
                          <div className="flex items-center gap-1">
                            {r.status === "ouvert" && (
                              <Button size="sm" variant="outline" className="text-primary" onClick={() => setStatus(r, "en_cours")}>
                                Traiter
                              </Button>
                            )}
                            <ActionMenu items={items(r)} />
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
                  {filtered.length} signalement{filtered.length > 1 ? "s" : ""}
                </span>
                <Pagination page={current} pageCount={pageCount} onChange={setPage} />
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Détail du signalement"
        footer={
          detail && (
            <>
              {detail.status !== "rejete" && (
                <Button variant="outline" onClick={() => setStatus(detail, "rejete")}>
                  Rejeter
                </Button>
              )}
              {detail.status === "ouvert" && (
                <Button variant="soft" onClick={() => setStatus(detail, "en_cours")}>
                  Passer en cours
                </Button>
              )}
              {detail.status !== "resolu" && (
                <Button variant="success" onClick={() => setStatus(detail, "resolu")}>
                  Résoudre
                </Button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <dl>
              <InfoRow label="Date">{formatDateTime(detail.created_at)}</InfoRow>
              <InfoRow label="Statut">
                <MetaBadge meta={REPORT_STATUS[detail.status]} />
              </InfoRow>
              <InfoRow label="Signalé par">{detail.reporter?.full_name ?? "Utilisateur supprimé"}</InfoRow>
              <InfoRow label="Motif">{detail.reason}</InfoRow>
              {detail.handled_at && <InfoRow label="Traité le">{formatDateTime(detail.handled_at)}</InfoRow>}
            </dl>
            <div>
              <div className="mb-1 text-sm font-semibold text-navy">Détails</div>
              <p className="whitespace-pre-line rounded-xl bg-page p-3 text-sm text-body">{detail.details || "Aucun détail fourni."}</p>
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold text-navy">Cible</div>
              <Target r={detail} />
              {detail.animal?.status === "publiee" && (
                <Button className="mt-3" size="sm" variant="danger" icon={<EyeOff className="size-4" />} onClick={() => detail.animal && animalActions.ask("unpublish", detail.animal)}>
                  Dépublier l&apos;annonce
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
      {animalActions.dialogs}
    </div>
  );
}

function Target({ r }: { r: Report }) {
  if (r.animal) {
    return (
      <Link href={`/animaux/${r.animal.id}`} className="flex items-center gap-2.5 hover:opacity-90">
        <AnimalThumb src={r.animal.cover_url} alt={r.animal.name} className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-navy">{r.animal.name}</div>
          <div className="text-[11px] text-muted">Annonce · {ANIMAL_STATUS[r.animal.status]?.label}</div>
        </div>
      </Link>
    );
  }
  if (r.reported_user) {
    return (
      <Link href={`/utilisateurs/${r.reported_user.id}`} className="flex items-center gap-2.5 hover:opacity-90">
        <Avatar src={r.reported_user.avatar_url} name={r.reported_user.full_name} size={36} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-navy">{r.reported_user.full_name}</div>
          <div className="text-[11px] text-muted">Utilisateur</div>
        </div>
      </Link>
    );
  }
  return <span className="text-muted">Cible supprimée</span>;
}
