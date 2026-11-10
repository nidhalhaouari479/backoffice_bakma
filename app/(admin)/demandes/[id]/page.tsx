"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  ExternalLink,
  FileSearch,
  FileText,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Star,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { CategoryChip, ErrorState, InfoRow, PageHeader, RequestStatusBadge, RequestStepper } from "@/components/admin-ui";
import { hasFavorableOpinion, useRequestActions } from "@/components/RequestActions";
import { ConsultationPhotosCard, DocumentsCard, Gallery, VetReportCard } from "@/components/VetReport";
import { Avatar, Badge, Button, Card, EmptyState, MetaBadge, Modal, PageLoader, Spinner, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVITY_SELECT, REQUEST_DETAIL_SELECT, siteUrl } from "@/lib/admin";
import { CONSULTATION_STATUS, LISTING_TYPE, SEX_LABEL, formatAge, formatDate, formatDateTime, formatPrice } from "@/lib/labels";
import { signedDocumentUrl } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ActivityLog, AnimalDocument, Consultation, OwnerIdentity, Profile, PublicationRequest, Veterinarian } from "@/lib/types";

export default function DemandeDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DemandeDetail />
    </Suspense>
  );
}

function DemandeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [contacting, setContacting] = useState(false);
  const { user } = useAuth();

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [req, act] = await Promise.all([
      supabase.from("publication_requests").select(REQUEST_DETAIL_SELECT).eq("id", id).maybeSingle(),
      supabase.from("activity_log").select(ACTIVITY_SELECT).eq("request_id", id).order("created_at", { ascending: true }),
    ]);
    const request = must<PublicationRequest | null>(req);
    // Pièce d'identité du propriétaire + documents fournis à la soumission
    const [identity, docs] = request
      ? await Promise.all([
          supabase.from("owner_identities").select("*").eq("profile_id", request.owner_id).maybeSingle(),
          supabase.from("animal_documents").select("*").eq("animal_id", request.animal_id).order("created_at"),
        ])
      : [null, null];
    return {
      request,
      activity: must<ActivityLog[]>(act),
      identity: (identity?.data ?? null) as OwnerIdentity | null,
      documents: (docs?.data ?? []) as AnimalDocument[],
    };
  }, id);

  const actions = useRequestActions(reload);

  async function openPrivate(path: string) {
    const w = window.open("", "_blank");
    const url = await signedDocumentUrl(path);
    if (!url) {
      w?.close();
      toast("Impossible d'ouvrir ce document.", "error");
      return;
    }
    if (w) w.location.href = url;
    else window.location.assign(url);
  }

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const r = data?.request;
  if (!r) {
    return (
      <Card>
        <EmptyState icon={<FileSearch />} title="Demande introuvable" text="Cette demande n'existe pas ou a été supprimée." action={<Button href="/demandes">Retour aux demandes</Button>} />
      </Card>
    );
  }

  const consultation = [...(r.consultations ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] as
    | (Consultation & { vet?: Profile | null })
    | undefined;
  const vet = consultation?.vet ?? null;
  const animal = r.animal;
  const owner = r.owner;
  const open = r.status === "en_cours";
  const consultOpen = !!consultation && ["nouvelle", "en_cours", "a_revoir"].includes(consultation.status);
  const favorable = hasFavorableOpinion(r.consultations);

  async function contactOwner() {
    if (!r) return;
    setContacting(true);
    try {
      const { data: convId, error: err } = await getSupabase().rpc("start_conversation", { p_other: r.owner_id, p_animal_id: r.animal_id });
      if (err) throw err;
      router.push(`/messages?c=${convId}`);
    } catch (e) {
      toast(errorMessage(e), "error");
      setContacting(false);
    }
  }

  const decisionPill =
    consultation?.decision === "approuve" ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        <CircleCheck className="size-5 text-emerald-500" /> Validée par le vétérinaire
      </span>
    ) : consultation?.decision === "refuse" ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
        <CircleX className="size-5" /> Avis vétérinaire défavorable
      </span>
    ) : consultation?.decision === "a_revoir" ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
        <RotateCcw className="size-5" /> À revoir
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
        <Clock className="size-5" /> En attente de l&apos;avis vétérinaire
      </span>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/demandes", label: "Retour aux demandes" }}
        title="Demande de publication"
        subtitle="Consultez le dossier de l'animal, le rapport du vétérinaire et prenez votre décision."
        action={
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            {decisionPill}
            {consultation?.consulted_at && <span className="text-sm text-body">Consultation le {formatDateTime(consultation.consulted_at)}</span>}
            <span className="text-sm font-semibold text-body">#{r.ref}</span>
          </div>
        }
      />
      {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* Statut + décision */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className="flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <RequestStatusBadge status={r.status} />
              <span className="text-sm text-body">Soumise le {formatDateTime(r.submitted_at)}</span>
              {r.decided_at && <span className="text-sm text-body">· Décision le {formatDateTime(r.decided_at)}</span>}
            </div>
            <RequestStepper step={r.step} status={r.status} />
          </div>
          <div className="flex flex-wrap gap-2.5 xl:w-[360px] xl:justify-end">
            <Button variant="success" icon={<CircleCheck className="size-4" />} disabled={!open} onClick={() => actions.ask("approve", [r])}>
              Approuver
            </Button>
            <Button variant="danger" icon={<CircleX className="size-4" />} disabled={!open} onClick={() => actions.ask("refuse", [r])}>
              Refuser
            </Button>
            <Button variant="outline" icon={<CircleMinus className="size-4" />} disabled={!open} onClick={() => actions.ask("cancel", [r])}>
              Annuler
            </Button>
          </div>
        </div>
        {open && !favorable && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Aucun avis vétérinaire favorable n&apos;a encore été rendu pour cette demande. Une approbation reste possible mais elle sera signalée.
          </div>
        )}
        {r.status === "approuvee" && r.admin_note && (
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <strong>Note de l&apos;administrateur :</strong> {r.admin_note}
          </div>
        )}
        {r.status === "refusee" && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Motif du refus :</strong> {r.refusal_reason || "Non précisé"}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          {/* Animal */}
          <Card className="p-6">
            {!animal ? (
              <EmptyState title="Annonce supprimée" />
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
                <Gallery photos={animal.photos} cover={animal.cover_url} alt={animal.name} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-extrabold">{animal.name}</h2>
                    <CategoryChip category={animal.category} />
                    <MetaBadge meta={LISTING_TYPE[animal.listing_type]} />
                  </div>
                  <dl className="mt-4">
                    <InfoRow label="Race">{animal.breed || "—"}</InfoRow>
                    <InfoRow label="Âge">{formatAge(animal.age_value, animal.age_unit)}</InfoRow>
                    <InfoRow label="Sexe">{animal.sex ? SEX_LABEL[animal.sex] : "—"}</InfoRow>
                    <InfoRow label="Couleur">{animal.color || "—"}</InfoRow>
                    <InfoRow label="Poids">{animal.weight_kg != null ? `${String(animal.weight_kg).replace(".", ",")} kg` : "—"}</InfoRow>
                    <InfoRow label="Ville">{animal.city || "—"}</InfoRow>
                    <InfoRow label="Prix">{formatPrice(animal.price, animal.listing_type)}</InfoRow>
                    <InfoRow label="Propriétaire">{owner?.full_name || "—"}</InfoRow>
                    <InfoRow label="Date de soumission">{formatDate(r.submitted_at)}</InfoRow>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["Vacciné", animal.vaccinated],
                      ["Vermifugé", animal.dewormed],
                      ["En bonne santé", animal.healthy],
                      ["Stérilisé", animal.sterilized],
                    ].map(([l, v]) => (
                      <Badge key={l as string} tone={v ? "green" : "grey"}>
                        {l as string}
                      </Badge>
                    ))}
                  </div>
                  {(animal.short_description || animal.description) && <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm text-body">{animal.description || animal.short_description}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button href={`/animaux/${animal.id}`} variant="soft" size="sm">
                      Fiche complète de l&apos;animal
                    </Button>
                    {animal.status === "publiee" && (
                      <a href={siteUrl(`/animaux/${animal.id}`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-btn)] px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
                        <ExternalLink className="size-4" /> Voir sur le site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <VetReportCard consultation={consultation} />
        </div>

        <div className="min-w-0 space-y-6">
          {/* Propriétaire */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Informations du propriétaire</h2>
              <Button href={`/utilisateurs/${r.owner_id}`} variant="outline" size="sm" className="text-primary">
                Voir le profil
              </Button>
            </div>
            {owner ? (
              <div className="mt-4 flex gap-4">
                <Avatar src={owner.avatar_url} name={owner.full_name} size={72} />
                <div className="min-w-0 space-y-1.5 text-sm">
                  <div className="text-base font-bold text-navy">{owner.full_name}</div>
                  <ContactLine icon={<Mail />} value={owner.contact?.email} href={owner.contact?.email ? `mailto:${owner.contact.email}` : undefined} />
                  <ContactLine icon={<Phone />} value={owner.contact?.phone} href={owner.contact?.phone ? `tel:${owner.contact.phone}` : undefined} />
                  <ContactLine icon={<MapPin />} value={owner.city ? `${owner.city}, Tunisie` : null} />
                  <ContactLine icon={<IdCard />} value={data.identity ? `CIN ${data.identity.cin_number}` : null} />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Propriétaire introuvable.</p>
            )}
            {data.identity ? (
              <Button className="mt-4 w-full" variant="outline" icon={<IdCard className="size-4" />} onClick={() => openPrivate(data.identity!.cin_photo_path)}>
                Voir la photo de la CIN
              </Button>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">CIN non fournie (demande antérieure à l&apos;obligation).</p>
            )}
            {user?.id === r.owner_id ? (
              <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">C&apos;est votre propre compte : la messagerie ne permet pas de s&apos;écrire à soi-même.</p>
            ) : (
              <Button className="mt-5 w-full" variant="soft" icon={<MessageCircle className="size-4" />} loading={contacting} onClick={contactOwner}>
                Contacter le propriétaire
              </Button>
            )}
          </Card>

          {/* Vétérinaire */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Vétérinaire</h2>
              {vet && (
                <Button href={`/utilisateurs/${vet.id}`} variant="outline" size="sm" className="text-primary">
                  Voir le profil
                </Button>
              )}
            </div>
            {consultation && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-body">
                Consultation : <MetaBadge meta={CONSULTATION_STATUS[consultation.status]} />
              </div>
            )}
            {vet ? (
              <div className="mt-4 flex gap-4">
                <Avatar src={vet.avatar_url} name={vet.full_name} size={72} />
                <div className="min-w-0 space-y-1.5 text-sm">
                  <div className="text-base font-bold text-navy">Dr. {vet.full_name}</div>
                  {vet.veterinarian?.clinic_name && <div className="text-body">{vet.veterinarian.clinic_name}</div>}
                  <ContactLine icon={<Phone />} value={vet.contact?.phone} href={vet.contact?.phone ? `tel:${vet.contact.phone}` : undefined} />
                  <ContactLine icon={<Mail />} value={vet.contact?.email} href={vet.contact?.email ? `mailto:${vet.contact.email}` : undefined} />
                  <ContactLine icon={<MapPin />} value={(vet.veterinarian?.city || vet.city) ? `${vet.veterinarian?.city || vet.city}, Tunisie` : null} />
                  {consultation?.scheduled_at && <ContactLine icon={<CalendarClock />} value={`RDV le ${formatDateTime(consultation.scheduled_at)}`} />}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-page px-4 py-3">
                <Stethoscope className="size-5 text-muted" />
                <span className="text-sm font-semibold text-body">Non attribuée</span>
              </div>
            )}
            {consultation && consultation.proposed_slots?.length > 0 && !consultation.scheduled_at && (
              <div className="mt-4 rounded-xl bg-page px-4 py-3 text-sm">
                <p className="font-semibold text-navy">Dates proposées par le propriétaire</p>
                <ul className="mt-1.5 space-y-1 text-body">
                  {consultation.proposed_slots.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-primary" /> {formatDateTime(d)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-muted">Le vétérinaire en choisit une pour accepter la demande.</p>
              </div>
            )}
            {consultOpen && open && (
              <Button className="mt-5 w-full" variant={vet ? "outline" : "primary"} icon={<UserPlus className="size-4" />} onClick={() => setAssignOpen(true)}>
                {vet ? "Réattribuer la consultation" : "Attribuer un vétérinaire"}
              </Button>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Documents du propriétaire</h2>
            {!data.documents.length ? (
              <p className="mt-3 text-sm text-muted">Aucun document fourni.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <FileText className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-navy">{d.title}</div>
                      <div className="truncate text-xs text-muted">{d.file_name}</div>
                    </div>
                    <Button variant="outline" size="sm" className="px-5 text-primary" onClick={() => openPrivate(d.file_path)}>
                      Voir
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <DocumentsCard documents={consultation?.documents} />
          <ConsultationPhotosCard photos={consultation?.photos} />

          {/* Historique */}
          <Card className="p-6">
            <h2 className="text-lg font-bold">Historique</h2>
            {data.activity.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun événement enregistré.</p>
            ) : (
              <ol className="relative mt-4 space-y-4 border-l-2 border-line pl-5">
                {data.activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-primary ring-2 ring-primary/20" />
                    <div className="text-sm font-semibold text-navy">{a.message || a.type}</div>
                    <div className="text-xs text-muted">
                      {formatDateTime(a.created_at)}
                      {a.actor?.full_name ? ` · ${a.actor.full_name}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {consultation && (
        <AssignVetModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          consultationId={consultation.id}
          currentVet={consultation.vet_id}
          preferredCity={owner?.city || animal?.city || null}
          onDone={() => {
            setAssignOpen(false);
            reload();
          }}
        />
      )}
      {actions.dialogs}
    </div>
  );
}

function ContactLine({ icon, value, href }: { icon: React.ReactNode; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-body [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-navy/60">
      {icon}
      {href ? (
        <a href={href} className="truncate hover:text-primary">
          {value}
        </a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ attribution d'un vétérinaire
type VetRow = Veterinarian & { profile: Profile | null };
type CityItem = { key: string; label: string; n: number };

/** Compare deux noms de ville sans tenir compte de la casse ni des accents. */
const cityKey = (c: string | null | undefined) =>
  (c ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function AssignVetModal({
  open,
  onClose,
  consultationId,
  currentVet,
  preferredCity,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  consultationId: string;
  currentVet: string | null;
  preferredCity: string | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const prefKey = cityKey(preferredCity);
  const [city, setCity] = useState<string>(prefKey);
  const [choice, setChoice] = useState<string | null>(null);
  const [panel, setPanel] = useState<"city" | "vet" | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const data = useAsync(async () => {
    const sb = getSupabase();
    const [vetsRes, citiesRes] = await Promise.all([
      sb.from("veterinarians").select("*, profile:profiles!veterinarians_profile_id_fkey(*)").eq("is_verified", true),
      sb.from("cities").select("name").order("name"),
    ]);
    const vets = must<VetRow[]>(vetsRes).filter((v) => v.profile?.status === "actif" && v.profile.role === "veterinaire");
    const cities = must<{ name: string }[]>(citiesRes).map((c) => c.name);
    return { vets, cities };
  }, open ? "open" : null);

  const vets = data.data?.vets ?? [];
  const vetCity = (v: VetRow) => v.city || v.profile?.city || null;

  // toutes les villes (table cities + villes des vétérinaires + ville du propriétaire) avec leur nombre de vétérinaires
  const cities: CityItem[] = (() => {
    const map = new Map<string, { label: string; n: number }>();
    const add = (label: string | null | undefined) => {
      const k = cityKey(label);
      if (k && !map.has(k)) map.set(k, { label: label!.trim(), n: 0 });
      return k;
    };
    for (const c of data.data?.cities ?? []) add(c);
    if (preferredCity) add(preferredCity);
    for (const v of vets) {
      const k = add(vetCity(v));
      if (k) map.get(k)!.n++;
    }
    return [...map.entries()].map(([key, x]) => ({ key, ...x })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  })();
  const qKey = cityKey(q);
  const prefCity = cities.find((c) => c.key === prefKey) ?? null;
  const otherCities = cities.filter((c) => c.key !== prefKey && c.key.includes(qKey));
  const current = city ? (cities.find((c) => c.key === city) ?? null) : null;

  const cityVets = vets
    .filter((v) => !city || cityKey(vetCity(v)) === city)
    .sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "", "fr"));
  const selected = vets.find((v) => v.profile_id === choice) ?? null;

  function pickCity(k: string) {
    setCity(k);
    setChoice(null);
    setErr(null);
    setQ("");
    setPanel("vet");
  }

  async function submit() {
    if (!choice) {
      setErr("Choisissez un vétérinaire.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { error } = await getSupabase().rpc("assign_vet", {
        p_consultation_id: consultationId,
        p_vet_id: choice,
      });
      if (error) throw error;
      toast("Consultation attribuée");
      onDone();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Attribuer un vétérinaire"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={submit} loading={busy} disabled={!choice}>
            Attribuer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {data.loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : data.error ? (
          <p className="text-sm text-red-600">{data.error}</p>
        ) : (
          <>
            {/* 1. Ville */}
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-slate-700">1. Ville</div>
              <PickerTrigger open={panel === "city"} onClick={() => setPanel(panel === "city" ? null : "city")} icon={<MapPin />}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-navy">{current?.label ?? "Toutes les villes"}</span>
                  {current && current.key === prefKey && <OwnerTag />}
                </span>
                <CountPill n={current ? current.n : vets.length} />
              </PickerTrigger>

              {panel === "city" && (
                <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
                  <div className="border-b border-line p-2">
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Rechercher une ville…"
                      className="h-9 w-full rounded-lg bg-slate-50 px-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:bg-slate-100"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {prefCity && prefCity.key.includes(qKey) && (
                      <>
                        <GroupLabel>Ville du propriétaire</GroupLabel>
                        <CityOption c={prefCity} active={city === prefCity.key} owner onClick={() => pickCity(prefCity.key)} />
                        <div className="my-1.5 border-t border-line" />
                      </>
                    )}
                    <GroupLabel>Toutes les villes</GroupLabel>
                    {!qKey && <CityOption c={{ key: "", label: "Toutes les villes", n: vets.length }} active={city === ""} onClick={() => pickCity("")} />}
                    {otherCities.map((c) => (
                      <CityOption key={c.key} c={c} active={city === c.key} onClick={() => pickCity(c.key)} />
                    ))}
                    {!otherCities.length && qKey && <p className="px-3 py-3 text-center text-xs text-muted">Aucune ville trouvée.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Vétérinaire */}
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-slate-700">2. Vétérinaire</div>
              <PickerTrigger
                open={panel === "vet"}
                onClick={() => setPanel(panel === "vet" ? null : "vet")}
                icon={selected ? <Avatar src={selected.profile?.avatar_url} name={selected.profile?.full_name} size={28} /> : <Stethoscope />}
              >
                {selected ? (
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">Dr. {selected.profile?.full_name}</span>
                    <span className="block truncate text-xs text-muted">{[selected.clinic_name, vetCity(selected)].filter(Boolean).join(" · ") || "—"}</span>
                  </span>
                ) : (
                  <span className="truncate text-slate-400">
                    {cityVets.length ? `Choisir parmi ${cityVets.length} vétérinaire${cityVets.length > 1 ? "s" : ""}…` : "Aucun vétérinaire dans cette ville"}
                  </span>
                )}
              </PickerTrigger>

              {panel === "vet" && (
                <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
                  {cityVets.length ? (
                    <ul className="max-h-64 space-y-1 overflow-y-auto p-1.5">
                      {cityVets.map((v) => {
                        const active = choice === v.profile_id;
                        return (
                          <li key={v.profile_id}>
                            <button
                              type="button"
                              onClick={() => {
                                setChoice(v.profile_id);
                                setErr(null);
                                setPanel(null);
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${active ? "bg-primary-soft" : "hover:bg-slate-50"}`}
                            >
                              <Avatar src={v.profile?.avatar_url} name={v.profile?.full_name} size={36} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-navy">Dr. {v.profile?.full_name}</span>
                                <span className="flex items-center gap-1 truncate text-xs text-muted">
                                  <MapPin className="size-3 shrink-0" />
                                  {[v.clinic_name, vetCity(v)].filter(Boolean).join(" · ") || "—"}
                                </span>
                              </span>
                              {currentVet === v.profile_id && (
                                <Badge tone="blue" dot={false}>
                                  Actuel
                                </Badge>
                              )}
                              {active && <Check className="size-4 shrink-0 text-primary" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="px-4 py-5 text-center">
                      <p className="text-sm text-muted">Aucun vétérinaire validé à {current?.label ?? "cette ville"}.</p>
                      <button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => setPanel("city")}>
                        Choisir une autre ville
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <p className="text-xs text-muted">Le vétérinaire sera notifié et devra choisir une des 3 dates proposées par le propriétaire pour accepter.</p>
      </div>
    </Modal>
  );
}

function PickerTrigger({ open, onClick, icon, children }: { open: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border bg-white px-3 py-2 text-left text-sm transition ${
        open ? "border-primary ring-2 ring-primary/15" : "border-slate-300 hover:border-slate-400"
      }`}
    >
      <span className="flex shrink-0 text-slate-400 [&>svg]:size-4">{icon}</span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">{children}</span>
      <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function CityOption({ c, active, owner, onClick }: { c: CityItem; active: boolean; owner?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${active ? "bg-primary-soft" : "hover:bg-slate-50"}`}
    >
      <MapPin className={`size-4 shrink-0 ${owner ? "text-amber-500" : c.n || !c.key ? "text-primary" : "text-slate-300"}`} />
      <span className={`min-w-0 flex-1 truncate ${c.n || !c.key ? "font-medium text-navy" : "text-slate-400"}`}>{c.label}</span>
      {owner && <OwnerTag />}
      <CountPill n={c.n} />
      <Check className={`size-4 shrink-0 text-primary ${active ? "" : "invisible"}`} />
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</div>;
}

function OwnerTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      <Star className="size-3 fill-current" /> Propriétaire
    </span>
  );
}

function CountPill({ n }: { n: number }) {
  return (
    <span
      title={`${n} vétérinaire${n > 1 ? "s" : ""}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${n ? "bg-primary-soft text-primary" : "bg-slate-100 text-slate-400"}`}
    >
      <Stethoscope className="size-3" />
      {n}
    </span>
  );
}
