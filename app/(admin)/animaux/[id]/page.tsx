"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, EyeOff, FileSearch, Flag, Mail, MapPin, Phone, Send, Trash2 } from "lucide-react";
import { useAnimalActions } from "@/components/AnimalActions";
import { CategoryChip, ErrorState, InfoRow, PageHeader, RequestStatusBadge, stepLabel } from "@/components/admin-ui";
import { Gallery } from "@/components/VetReport";
import { Avatar, Badge, Button, Card, EmptyState, MetaBadge, PageLoader } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { ANIMAL_FULL_SELECT, REPORT_SELECT, siteUrl } from "@/lib/admin";
import {
  ANIMAL_STATUS,
  LISTING_TYPE,
  REPORT_STATUS,
  SEX_LABEL,
  VACCINATION_STATUS,
  VET_DECISION,
  formatAge,
  formatDate,
  formatDateTime,
  formatPrice,
} from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Animal, CharacteristicGroup, PublicationRequest, Report, Vaccination } from "@/lib/types";

export default function AnimalDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimalDetail />
    </Suspense>
  );
}

function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [animal, reqs, reports, vacc, groups] = await Promise.all([
      supabase.from("animals").select(ANIMAL_FULL_SELECT).eq("id", id).maybeSingle(),
      supabase
        .from("publication_requests")
        .select("*, consultations!consultations_request_id_fkey(id,status,decision,created_at, vet:profiles!consultations_vet_id_fkey(id,full_name))")
        .eq("animal_id", id)
        .order("submitted_at", { ascending: false }),
      supabase.from("reports").select(REPORT_SELECT).eq("animal_id", id).order("created_at", { ascending: false }),
      supabase.from("vaccinations").select("*").eq("animal_id", id).order("vaccinated_on", { ascending: false }),
      supabase.from("characteristic_groups").select("*").order("sort_order"),
    ]);
    return {
      animal: must<Animal | null>(animal),
      requests: must<PublicationRequest[]>(reqs),
      reports: must<Report[]>(reports),
      vaccinations: must<Vaccination[]>(vacc),
      groups: groups.error ? [] : (groups.data as CharacteristicGroup[]),
    };
  }, id);

  const actions = useAnimalActions((kind) => {
    if (kind === "delete") router.replace("/animaux");
    else reload();
  });

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const a = data?.animal;
  if (!a) {
    return (
      <Card>
        <EmptyState icon={<FileSearch />} title="Annonce introuvable" text="Cette annonce n'existe pas ou a été supprimée." action={<Button href="/animaux">Retour aux animaux</Button>} />
      </Card>
    );
  }
  const owner = a.owner;
  const visible = ["publiee", "adoptee", "vendue"].includes(a.status);
  // Rubriques renseignées hors santé (affichée en badges plus haut) ; repli sur les anciennes colonnes
  const chars = a.characteristics && Object.keys(a.characteristics).length ? a.characteristics : { caractere: a.traits ?? [], besoins: a.needs ?? [] };
  const traitGroups = (data?.groups ?? [])
    .filter((g) => g.slug !== "sante")
    .map((group) => ({ group, values: chars[group.slug] ?? [] }))
    .filter((t) => t.values.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/animaux", label: "Retour aux animaux" }}
        title={a.name}
        subtitle={[a.breed, a.city].filter(Boolean).join(" · ") || "Fiche détaillée de l'annonce"}
        action={
          <>
            {visible && (
              <a href={siteUrl(`/animaux/${a.id}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-white px-4 text-sm font-semibold text-navy hover:border-primary hover:text-primary">
                <ExternalLink className="size-4" /> Voir sur le site
              </a>
            )}
            {a.status === "publiee" && (
              <Button variant="outline" icon={<EyeOff className="size-4" />} onClick={() => actions.ask("unpublish", a)}>
                Dépublier
              </Button>
            )}
            {a.status === "annulee" && (
              <Button icon={<Send className="size-4" />} onClick={() => actions.ask("republish", a)}>
                Republier
              </Button>
            )}
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => actions.ask("delete", a)}>
              Supprimer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
              <Gallery photos={a.photos} cover={a.cover_url} alt={a.name} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <MetaBadge meta={ANIMAL_STATUS[a.status]} />
                  <CategoryChip category={a.category} plural />
                  <MetaBadge meta={LISTING_TYPE[a.listing_type]} />
                </div>
                <dl className="mt-4">
                  <InfoRow label="Race">{a.breed || "—"}</InfoRow>
                  <InfoRow label="Âge">{formatAge(a.age_value, a.age_unit)}</InfoRow>
                  <InfoRow label="Sexe">{a.sex ? SEX_LABEL[a.sex] : "—"}</InfoRow>
                  <InfoRow label="Taille">{a.size || "—"}</InfoRow>
                  <InfoRow label="Poids">{a.weight_kg != null ? `${String(a.weight_kg).replace(".", ",")} kg` : "—"}</InfoRow>
                  <InfoRow label="Couleur">{a.color || "—"}</InfoRow>
                  <InfoRow label="Ville">{a.city || "—"}</InfoRow>
                  <InfoRow label="Prix">{formatPrice(a.price, a.listing_type)}</InfoRow>
                  <InfoRow label="Vues">{a.views_count}</InfoRow>
                  <InfoRow label="Créée le">{formatDateTime(a.created_at)}</InfoRow>
                  <InfoRow label="Publiée le">{a.published_at ? formatDateTime(a.published_at) : "—"}</InfoRow>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["Vacciné", a.vaccinated],
                      ["Vermifugé", a.dewormed],
                      ["En bonne santé", a.healthy],
                      ["Stérilisé", a.sterilized],
                    ] as const
                  ).map(([l, v]) => (
                    <Badge key={l} tone={v ? "green" : "grey"}>
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="text-lg font-bold">Description</h2>
            {!a.short_description && !a.description && !a.why_adopt && !a.adoption_conditions && !traitGroups.length && (
              <p className="text-sm text-muted">Aucune description renseignée.</p>
            )}
            <TextBlock title="Résumé" text={a.short_description} />
            <TextBlock title="Description complète" text={a.description} />
            <TextBlock title="Pourquoi l'adopter ?" text={a.why_adopt} />
            <TextBlock title="Conditions d'adoption" text={a.adoption_conditions} />
            {traitGroups.map(({ group, values }) => (
              <div key={group.id}>
                <h3 className="mb-2 text-sm font-bold text-navy">{group.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {values.map((t) => (
                    <Badge key={t} tone={group.slug === "besoins" ? "purple" : "blue"} dot={false}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-6 pb-3 pt-5">
              <h2 className="text-lg font-bold">Historique des demandes</h2>
            </div>
            {data.requests.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">Aucune demande de publication pour cette annonce.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3">
                    <tr>
                      <th className="pl-6">Référence</th>
                      <th>Soumise le</th>
                      <th>Étape</th>
                      <th>Vétérinaire</th>
                      <th>Statut</th>
                      <th className="pr-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {data.requests.map((r) => {
                      const c = [...(r.consultations ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
                      return (
                        <tr key={r.id}>
                          <td className="pl-6 font-semibold text-navy">{r.ref}</td>
                          <td className="whitespace-nowrap text-body">{formatDateTime(r.submitted_at)}</td>
                          <td className="text-xs text-body">{stepLabel(r.step)}</td>
                          <td className="text-body">
                            {c?.vet ? `Dr. ${c.vet.full_name}` : "Non attribuée"}
                            {c?.decision && (
                              <div className="mt-1">
                                <MetaBadge meta={VET_DECISION[c.decision]} />
                              </div>
                            )}
                          </td>
                          <td>
                            <RequestStatusBadge status={r.status} />
                          </td>
                          <td className="pr-6 text-right">
                            <Button href={`/demandes/${r.id}`} variant="outline" size="sm" className="text-primary">
                              Voir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Propriétaire</h2>
              <Button href={`/utilisateurs/${a.owner_id}`} variant="outline" size="sm" className="text-primary">
                Voir le profil
              </Button>
            </div>
            {owner ? (
              <div className="mt-4 flex gap-4">
                <Avatar src={owner.avatar_url} name={owner.full_name} size={64} />
                <div className="min-w-0 space-y-1.5 text-sm text-body">
                  <div className="text-base font-bold text-navy">{owner.full_name}</div>
                  {owner.contact?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-navy/60" /> <span className="truncate">{owner.contact.email}</span>
                    </div>
                  )}
                  {owner.contact?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-navy/60" /> {owner.contact.phone}
                    </div>
                  )}
                  {owner.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-navy/60" /> {owner.city}, Tunisie
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Propriétaire introuvable.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Vaccinations</h2>
            {data.vaccinations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucune vaccination enregistrée.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {data.vaccinations.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 font-medium text-navy">{v.name}</span>
                    <MetaBadge meta={VACCINATION_STATUS[v.status]} />
                    <span className="w-24 text-right text-xs text-body">{v.vaccinated_on ? formatDate(v.vaccinated_on) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Flag className="size-5 text-red-500" />
              <h2 className="text-lg font-bold">Signalements</h2>
            </div>
            {data.reports.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun signalement pour cette annonce.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.reports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-navy">{r.reason}</span>
                      <MetaBadge meta={REPORT_STATUS[r.status]} />
                    </div>
                    {r.details && <p className="mt-1 line-clamp-3 text-xs text-body">{r.details}</p>}
                    <div className="mt-1 text-[11px] text-muted">
                      {formatDate(r.created_at)} · par {r.reporter?.full_name ?? "Utilisateur supprimé"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {data.reports.length > 0 && (
              <Link href="/signalements" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Gérer les signalements
              </Link>
            )}
          </Card>
        </div>
      </div>
      {actions.dialogs}
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-bold text-navy">{title}</h3>
      <p className="whitespace-pre-line text-sm text-body">{text}</p>
    </div>
  );
}
