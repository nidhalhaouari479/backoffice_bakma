"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, Calendar, FileSearch, Flag, Mail, MapPin, MessageCircle, Phone, Stethoscope, UserCheck, UserCog, UserX } from "lucide-react";
import { AnimalCell, CategoryChip, ErrorState, InfoRow, PageHeader } from "@/components/admin-ui";
import { useUserActions } from "@/components/UserActions";
import { Avatar, Badge, Button, Card, EmptyState, MetaBadge, PageLoader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { must, useAsync } from "@/hooks/useAsync";
import { PROFILE_FULL_SELECT, REPORT_SELECT, ROLE_TONE } from "@/lib/admin";
import { ANIMAL_STATUS, LISTING_TYPE, REPORT_STATUS, ROLE_LABEL, formatDate, formatDateTime } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Animal, Profile, Report } from "@/lib/types";

export default function UserDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <UserDetail />
    </Suspense>
  );
}

function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [p, animals, reports, consults] = await Promise.all([
      supabase.from("profiles").select(PROFILE_FULL_SELECT).eq("id", id).maybeSingle(),
      supabase.from("animals").select("*, category:categories!animals_category_id_fkey(*)").eq("owner_id", id).order("created_at", { ascending: false }),
      supabase.from("reports").select(REPORT_SELECT).or(`reported_user_id.eq.${id},reporter_id.eq.${id}`).order("created_at", { ascending: false }),
      supabase.from("consultations").select("id,status").eq("vet_id", id),
    ]);
    return {
      profile: must<Profile | null>(p),
      animals: must<Animal[]>(animals),
      reports: must<Report[]>(reports),
      consultations: must<{ id: string; status: string }[]>(consults),
    };
  }, id);

  const actions = useUserActions(reload);

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const p = data?.profile;
  if (!p) {
    return (
      <Card>
        <EmptyState icon={<FileSearch />} title="Utilisateur introuvable" action={<Button href="/utilisateurs">Retour aux utilisateurs</Button>} />
      </Card>
    );
  }
  const self = p.id === user?.id;
  const vet = p.veterinarian;
  const received = data.reports.filter((r) => r.reported_user_id === p.id);
  const sent = data.reports.filter((r) => r.reporter_id === p.id);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/utilisateurs", label: "Retour aux utilisateurs" }}
        title={p.full_name || "Sans nom"}
        subtitle={`${ROLE_LABEL[p.role]} · inscrit le ${formatDate(p.created_at)}`}
        action={
          <>
            {!self && (
              <Button variant="soft" icon={<MessageCircle className="size-4" />} onClick={() => actions.contact(p)}>
                Contacter
              </Button>
            )}
            <Button variant="outline" icon={<UserCog className="size-4" />} disabled={self} onClick={() => actions.askRole(p)}>
              Changer le rôle
            </Button>
            {p.status === "actif" ? (
              <Button variant="danger" icon={<UserX className="size-4" />} disabled={self} onClick={() => actions.askStatus(p)}>
                Suspendre
              </Button>
            ) : (
              <Button variant="success" icon={<UserCheck className="size-4" />} onClick={() => actions.askStatus(p)}>
                Réactiver
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <Avatar src={p.avatar_url} name={p.full_name} size={96} className="mx-auto" />
            <h2 className="mt-3 text-xl font-extrabold">{p.full_name || "Sans nom"}</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABEL[p.role]}</Badge>
              <Badge tone={p.status === "actif" ? "green" : "red"}>{p.status === "actif" ? "Actif" : "Suspendu"}</Badge>
            </div>
            <div className="mt-5 space-y-2 text-left text-sm text-body">
              <Line icon={<Mail />} value={p.contact?.email} />
              <Line icon={<Phone />} value={p.contact?.phone} />
              <Line icon={<MapPin />} value={p.city ? `${p.city}, Tunisie` : null} />
              <Line icon={<Calendar />} value={`Inscrit le ${formatDate(p.created_at)}`} />
            </div>
            {p.bio && <p className="mt-4 rounded-xl bg-page p-3 text-left text-sm text-body">{p.bio}</p>}
          </Card>

          {vet && (
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-5 text-primary" />
                <h2 className="text-lg font-bold">Informations vétérinaire</h2>
              </div>
              <dl className="mt-3">
                <InfoRow label="Validation">
                  {vet.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <BadgeCheck className="size-4" /> Validé {vet.verified_at ? `le ${formatDate(vet.verified_at)}` : ""}
                    </span>
                  ) : (
                    <span className="text-amber-600">À valider</span>
                  )}
                </InfoRow>
                <InfoRow label="Clinique">{vet.clinic_name || "—"}</InfoRow>
                <InfoRow label="N° Ordre">{vet.license_number || "—"}</InfoRow>
                <InfoRow label="Spécialité">{vet.specialty || "—"}</InfoRow>
                <InfoRow label="Adresse">{[vet.address, vet.city].filter(Boolean).join(", ") || "—"}</InfoRow>
                <InfoRow label="Consultations">
                  {data.consultations.filter((c) => c.status === "terminee").length} terminée(s) / {data.consultations.length}
                </InfoRow>
              </dl>
              <Button href="/veterinaires" variant="outline" size="sm" className="mt-3 text-primary">
                Gérer la validation
              </Button>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-6 pb-3 pt-5">
              <h2 className="text-lg font-bold">Annonces ({data.animals.length})</h2>
            </div>
            {data.animals.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">Aucune annonce publiée par cet utilisateur.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3">
                    <tr>
                      <th className="pl-6">Animal</th>
                      <th>Catégorie</th>
                      <th>Annonce</th>
                      <th>Statut</th>
                      <th className="pr-6">Créée le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {data.animals.map((a) => (
                      <tr key={a.id} className="hover:bg-page/40">
                        <td className="pl-6">
                          <AnimalCell animal={a} href={`/animaux/${a.id}`} thumbClass="size-12" />
                        </td>
                        <td>
                          <CategoryChip category={a.category} />
                        </td>
                        <td>
                          <MetaBadge meta={LISTING_TYPE[a.listing_type]} />
                        </td>
                        <td>
                          <MetaBadge meta={ANIMAL_STATUS[a.status]} />
                        </td>
                        <td className="pr-6 text-body">{formatDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Flag className="size-5 text-red-500" />
              <h2 className="text-lg font-bold">Signalements</h2>
            </div>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <ReportList title={`Visant cet utilisateur (${received.length})`} reports={received} />
              <ReportList title={`Émis par cet utilisateur (${sent.length})`} reports={sent} />
            </div>
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

function Line({ icon, value }: { icon: React.ReactNode; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-navy/60">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  );
}

function ReportList({ title, reports }: { title: string; reports: Report[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-navy">{title}</h3>
      {reports.length === 0 ? (
        <p className="text-sm text-muted">Aucun.</p>
      ) : (
        <ul className="space-y-2.5">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{r.reason}</span>
                <MetaBadge meta={REPORT_STATUS[r.status]} />
              </div>
              {r.animal && (
                <Link href={`/animaux/${r.animal.id}`} className="text-xs font-medium text-primary hover:underline">
                  Annonce : {r.animal.name}
                </Link>
              )}
              <div className="text-[11px] text-muted">{formatDateTime(r.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
