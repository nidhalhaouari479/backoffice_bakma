"use client";

import { useState } from "react";
import {
  Bone,
  CircleCheck,
  CircleX,
  Ear,
  Eye,
  FileText,
  PawPrint,
  Plus,
  RotateCcw,
  Stethoscope,
  Syringe,
  Thermometer,
  Weight,
} from "lucide-react";
import { signedDocumentUrl } from "@/lib/storage";
import { EXAM_RESULT, VACCINATION_STATUS, VET_DECISION, formatDate, formatDateTime } from "@/lib/labels";
import type { AnimalPhoto, Consultation, ConsultationDocument, ConsultationPhoto } from "@/lib/types";
import { AnimalThumb, Badge, Button, Card, EmptyState, MetaBadge, Modal, cn, useToast } from "./ui";

// ------------------------------------------------------------------ Galerie (photo principale + vignettes)
export function Gallery({ photos, cover, alt }: { photos: Pick<AnimalPhoto, "id" | "url" | "position">[] | undefined; cover?: string | null; alt: string }) {
  const sorted = [...(photos ?? [])].sort((a, b) => a.position - b.position);
  const urls = sorted.length ? sorted.map((p) => p.url) : cover ? [cover] : [];
  const [idx, setIdx] = useState(0);
  const main = urls[Math.min(idx, Math.max(0, urls.length - 1))];
  return (
    <div className="w-full">
      <AnimalThumb src={main} alt={alt} className="aspect-[4/3] w-full rounded-2xl" />
      {urls.length > 1 && (
        <div className="mt-2.5 grid grid-cols-4 gap-2.5">
          {urls.slice(0, 8).map((u, i) => (
            <button key={u + i} onClick={() => setIdx(i)} className={cn("overflow-hidden rounded-xl ring-2 transition", i === idx ? "ring-primary" : "ring-transparent hover:ring-primary/40")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Rapport vétérinaire
function examIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("temp")) return Thermometer;
  if (n.includes("poids")) return Weight;
  if (n.includes("pelage") || n.includes("peau")) return PawPrint;
  if (n.includes("dent")) return Bone;
  if (n.includes("oreille")) return Ear;
  if (n.includes("œil") || n.includes("yeux") || n.includes("oeil")) return Eye;
  return Stethoscope;
}

export function VetReportCard({ consultation }: { consultation: Consultation | null | undefined }) {
  const c = consultation;
  const hasReport = !!c && (c.status === "terminee" || c.status === "a_revoir" || !!c.summary || (c.exams?.length ?? 0) > 0);
  const exams = [...(c?.exams ?? [])].sort((a, b) => a.position - b.position);
  const vaccinations = c?.vaccinations ?? [];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Rapport vétérinaire</h2>
        {c?.decision ? <MetaBadge meta={VET_DECISION[c.decision]} /> : null}
        {c?.consulted_at && <span className="ml-auto text-sm text-body">Date de consultation : {formatDateTime(c.consulted_at)}</span>}
      </div>

      {!hasReport ? (
        <EmptyState
          icon={<Stethoscope />}
          title={c ? "Rapport en attente" : "Aucune consultation"}
          text={
            !c
              ? "Aucune consultation vétérinaire n'est associée à cette demande."
              : c.status === "annulee"
                ? "La consultation a été annulée."
                : c.vet_id
                  ? "Le vétérinaire n'a pas encore rendu son rapport."
                  : "La consultation n'est pas encore prise en charge par un vétérinaire."
          }
        />
      ) : (
        <div className="mt-5 space-y-6">
          <div className="flex gap-4 rounded-2xl bg-primary-soft/60 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-primary">
              <Stethoscope className="size-6" />
            </span>
            <div>
              <h3 className="font-bold text-navy">Résumé du rapport</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-body">{c?.summary || "Aucun résumé rédigé."}</p>
              {(c?.weight_kg != null || c?.temperature != null) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c?.weight_kg != null && (
                    <Badge tone="blue" dot={false}>
                      <Weight className="size-3.5" /> {String(c.weight_kg).replace(".", ",")} kg
                    </Badge>
                  )}
                  {c?.temperature != null && (
                    <Badge tone="blue" dot={false}>
                      <Thermometer className="size-3.5" /> {String(c.temperature).replace(".", ",")} °C
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 font-bold text-navy">Examens effectués</h3>
              {exams.length === 0 ? (
                <p className="text-sm text-muted">Aucun examen renseigné.</p>
              ) : (
                <ul className="space-y-2.5">
                  {exams.map((e) => {
                    const I = examIcon(e.name);
                    return (
                      <li key={e.id} className="flex items-start gap-3 text-sm">
                        <I className="mt-0.5 size-5 shrink-0 text-navy/70" />
                        <div className="min-w-0 flex-1">
                          <div className="text-navy">{e.name}</div>
                          {e.note && <div className="text-xs text-muted">{e.note}</div>}
                        </div>
                        <Badge tone={EXAM_RESULT[e.result].tone} dot={false}>
                          {EXAM_RESULT[e.result].label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="space-y-6 lg:border-l lg:border-line lg:pl-8">
              <div>
                <h3 className="mb-3 font-bold text-navy">Vaccinations</h3>
                {vaccinations.length === 0 ? (
                  <p className="text-sm text-muted">Aucune vaccination renseignée.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {vaccinations.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <Syringe className="size-5 shrink-0 text-navy/70" />
                        <span className="min-w-24 flex-1 text-navy">{v.name}</span>
                        <Badge tone={VACCINATION_STATUS[v.status].tone} dot={false}>
                          {VACCINATION_STATUS[v.status].label}
                        </Badge>
                        <span className="w-24 text-right text-body">{v.vaccinated_on ? formatDate(v.vaccinated_on) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-bold text-navy">Observations</h3>
                <div className="flex gap-3 text-sm text-body">
                  <FileText className="mt-0.5 size-5 shrink-0 text-navy/70" />
                  <p className="whitespace-pre-line">{c?.observations || "Aucune observation."}</p>
                </div>
              </div>
            </div>
          </div>

          {c?.decision === "approuve" || c?.certified ? (
            <div className="flex gap-3 rounded-2xl bg-emerald-50 px-5 py-4">
              <CircleCheck className="mt-0.5 size-6 shrink-0 text-emerald-500" />
              <div>
                <div className="font-bold text-emerald-800">Avis du vétérinaire</div>
                <p className="text-sm text-emerald-800/90">Je certifie que cet animal est en bonne santé et apte à être publié sur la plateforme.</p>
              </div>
            </div>
          ) : c?.decision === "refuse" ? (
            <div className="flex gap-3 rounded-2xl bg-red-50 px-5 py-4">
              <CircleX className="mt-0.5 size-6 shrink-0 text-red-500" />
              <div>
                <div className="font-bold text-red-700">Avis défavorable du vétérinaire</div>
                <p className="text-sm text-red-700/90">Le vétérinaire ne recommande pas la publication de cette annonce.</p>
              </div>
            </div>
          ) : c?.decision === "a_revoir" ? (
            <div className="flex gap-3 rounded-2xl bg-amber-50 px-5 py-4">
              <RotateCcw className="mt-0.5 size-6 shrink-0 text-amber-500" />
              <div>
                <div className="font-bold text-amber-800">Compléments demandés au propriétaire</div>
                <p className="text-sm text-amber-800/90">{c.review_reason || "Le vétérinaire a demandé des informations complémentaires."}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-page px-5 py-4 text-sm text-body">Le vétérinaire n&apos;a pas encore rendu son avis final.</div>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ Documents
const DOC_TONE: Record<string, string> = {
  rapport: "bg-violet-50 text-violet-600",
  vaccination: "bg-blue-50 text-primary",
  certificat: "bg-red-50 text-red-500",
  autre: "bg-slate-100 text-slate-600",
};

export function DocumentsCard({ documents }: { documents: ConsultationDocument[] | undefined }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function open(d: ConsultationDocument) {
    setBusy(d.id);
    const w = window.open("", "_blank");
    try {
      const url = await signedDocumentUrl(d.file_path);
      if (!url) throw new Error("Document inaccessible");
      if (w) w.location.href = url;
      else window.location.assign(url);
    } catch {
      w?.close();
      toast("Impossible d'ouvrir ce document.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Documents du vétérinaire</h2>
      {!documents?.length ? (
        <p className="mt-3 text-sm text-muted">Aucun document déposé.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", DOC_TONE[d.kind ?? "autre"] ?? DOC_TONE.autre)}>
                <FileText className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-navy">{d.title}</div>
                <div className="truncate text-xs text-muted">{d.file_name ?? d.file_path.split("/").pop()}</div>
              </div>
              <Button variant="outline" size="sm" className="px-5 text-primary" loading={busy === d.id} onClick={() => open(d)}>
                Voir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ Photos de consultation
export function ConsultationPhotosCard({ photos }: { photos: ConsultationPhoto[] | undefined }) {
  const [all, setAll] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const list = photos ?? [];
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Photos de la consultation</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucune photo de consultation.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {list.slice(0, 3).map((p) => (
            <button key={p.id} onClick={() => setZoom(p.url)} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Photo de consultation" className="aspect-square w-full object-cover transition hover:scale-105" />
            </button>
          ))}
          {list.length > 3 && (
            <button onClick={() => setAll(true)} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/30 text-sm font-semibold text-navy hover:bg-primary-soft">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-white">
                <Plus className="size-4" />
              </span>
              Voir toutes
              <span className="text-xs text-body">({list.length} photos)</span>
            </button>
          )}
        </div>
      )}
      <Modal open={all} onClose={() => setAll(false)} title={`Photos de la consultation (${list.length})`} size="lg">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-square w-full object-cover" />
            </a>
          ))}
        </div>
      </Modal>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Photo de consultation" size="lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={zoom} alt="" className="mx-auto max-h-[60vh] rounded-xl object-contain" />}
      </Modal>
    </Card>
  );
}
