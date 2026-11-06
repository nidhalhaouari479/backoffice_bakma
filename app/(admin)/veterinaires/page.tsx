"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Clock, Hash, Mail, MapPin, Phone, Search, ShieldCheck, ShieldOff, Stethoscope, UserPlus } from "lucide-react";
import { ConfirmDialog, ErrorState, InfoRow, PageHeader } from "@/components/admin-ui";
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, PageLoader, Tabs, useToast } from "@/components/ui";
import { useAdminCounts } from "@/components/AdminShell";
import { CreateVetModal } from "@/components/CreateVetModal";
import { must, useAsync } from "@/hooks/useAsync";
import { normalize } from "@/lib/admin";
import { formatDate } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Profile, Veterinarian } from "@/lib/types";

type VetRow = Veterinarian & { profile: Profile | null };

export default function VeterinairesPage() {
  const toast = useToast();
  const { refresh } = useAdminCounts();
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<VetRow | null>(null);
  const [confirm, setConfirm] = useState<VetRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [vets, consults] = await Promise.all([
      supabase
        .from("veterinarians")
        .select("*, profile:profiles!veterinarians_profile_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*))")
        .order("created_at", { ascending: false }),
      supabase.from("consultations").select("vet_id").eq("status", "terminee").not("vet_id", "is", null).limit(20000),
    ]);
    const done: Record<string, number> = {};
    for (const c of must<{ vet_id: string }[]>(consults)) done[c.vet_id] = (done[c.vet_id] ?? 0) + 1;
    return { vets: must<VetRow[]>(vets), done };
  });

  const lists = useMemo(() => {
    const nq = normalize(q.trim());
    const all = (data?.vets ?? []).filter(
      (v) => !nq || normalize([v.profile?.full_name, v.clinic_name, v.license_number, v.city, v.profile?.contact?.email].join(" ")).includes(nq),
    );
    return { pending: all.filter((v) => !v.is_verified), verified: all.filter((v) => v.is_verified) };
  }, [data, q]);

  async function toggle(v: VetRow) {
    const verify = !v.is_verified;
    const { error: err } = await getSupabase()
      .from("veterinarians")
      .update({ is_verified: verify, verified_at: verify ? new Date().toISOString() : null })
      .eq("profile_id", v.profile_id);
    if (err) throw err;
    toast(verify ? "Vétérinaire validé" : "Validation retirée");
    setDetail(null);
    reload();
    refresh();
  }

  const list = lists[tab];

  return (
    <div>
      <PageHeader
        title="Vétérinaires"
        subtitle="Créez les comptes vétérinaires, validez les inscriptions et suivez leur activité."
        action={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>
            Ajouter un vétérinaire
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
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: "pending", label: "À valider", count: lists.pending.length, icon: <Clock /> },
                { value: "verified", label: "Validés", count: lists.verified.length, icon: <BadgeCheck /> },
              ]}
            />
            <div className="lg:w-96">
              <Input icon={<Search />} placeholder="Nom, clinique, n° d'Ordre, ville…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-2xl" />
            </div>
          </div>

          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Stethoscope />}
                title={tab === "pending" ? "Aucune inscription en attente" : "Aucun vétérinaire validé"}
                text={tab === "pending" ? "Les nouveaux vétérinaires inscrits apparaîtront ici pour validation." : "Validez des vétérinaires depuis l'onglet « À valider »."}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {list.map((v) => (
                <Card key={v.profile_id} className="flex flex-col p-5">
                  <div className="flex items-start gap-4">
                    <Avatar src={v.profile?.avatar_url} name={v.profile?.full_name} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-navy">Dr. {v.profile?.full_name || "Sans nom"}</div>
                      <div className="truncate text-sm text-body">{v.clinic_name || "Clinique non renseignée"}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {v.is_verified ? <Badge tone="green">Validé</Badge> : <Badge tone="orange">À valider</Badge>}
                        {v.profile?.status === "suspendu" && <Badge tone="red">Suspendu</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-body">
                    <Row icon={<Hash />} value={v.license_number ? `N° Ordre ${v.license_number}` : "N° d'Ordre non renseigné"} />
                    <Row icon={<MapPin />} value={v.city || v.profile?.city || "Ville non renseignée"} />
                    <Row icon={<Mail />} value={v.profile?.contact?.email} />
                    <Row icon={<Phone />} value={v.profile?.contact?.phone} />
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-page px-4 py-2.5 text-sm">
                    <span className="text-body">Consultations terminées</span>
                    <span className="text-lg font-extrabold text-navy">{data?.done[v.profile_id] ?? 0}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetail(v)}>
                      Détails
                    </Button>
                    {v.is_verified ? (
                      <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:border-red-400 hover:text-red-600" icon={<ShieldOff className="size-4" />} onClick={() => setConfirm(v)}>
                        Retirer
                      </Button>
                    ) : (
                      <Button variant="success" size="sm" className="flex-1" icon={<ShieldCheck className="size-4" />} onClick={() => setConfirm(v)}>
                        Valider
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Fiche vétérinaire"
        footer={
          detail && (
            <>
              <Button href={`/utilisateurs/${detail.profile_id}`} variant="outline">
                Voir le profil complet
              </Button>
              <Button variant={detail.is_verified ? "danger" : "success"} onClick={() => setConfirm(detail)}>
                {detail.is_verified ? "Retirer la validation" : "Valider"}
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Avatar src={detail.profile?.avatar_url} name={detail.profile?.full_name} size={64} />
              <div>
                <div className="text-lg font-bold text-navy">Dr. {detail.profile?.full_name}</div>
                <div className="flex items-center gap-1.5 text-sm text-body">
                  <Building2 className="size-4" /> {detail.clinic_name || "—"}
                </div>
              </div>
            </div>
            <dl>
              <InfoRow label="N° d'Ordre">{detail.license_number || "—"}</InfoRow>
              <InfoRow label="Spécialité">{detail.specialty || "—"}</InfoRow>
              <InfoRow label="Adresse">{detail.address || "—"}</InfoRow>
              <InfoRow label="Ville">{detail.city || detail.profile?.city || "—"}</InfoRow>
              <InfoRow label="Email">{detail.profile?.contact?.email || "—"}</InfoRow>
              <InfoRow label="Téléphone">{detail.profile?.contact?.phone || "—"}</InfoRow>
              <InfoRow label="Inscrit le">{formatDate(detail.created_at)}</InfoRow>
              <InfoRow label="Statut">{detail.is_verified ? `Validé le ${formatDate(detail.verified_at)}` : "En attente de validation"}</InfoRow>
              <InfoRow label="Consultations">{data?.done[detail.profile_id] ?? 0} terminée(s)</InfoRow>
            </dl>
            {detail.profile?.role !== "veterinaire" && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Attention : le rôle de ce compte n&apos;est pas « Vétérinaire ». Modifiez-le depuis la fiche utilisateur.</p>
            )}
          </div>
        )}
      </Modal>

      {creating && (
        <CreateVetModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setTab("verified");
            reload();
            refresh();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={() => toggle(confirm)}
          variant={confirm.is_verified ? "danger" : "success"}
          title={confirm.is_verified ? "Retirer la validation" : "Valider le vétérinaire"}
          confirmLabel={confirm.is_verified ? "Retirer" : "Valider"}
          message={
            confirm.is_verified
              ? `Dr. ${confirm.profile?.full_name} ne pourra plus prendre en charge de consultations.`
              : `Dr. ${confirm.profile?.full_name} pourra prendre en charge les consultations de vérification. Vérifiez son n° d'Ordre (${confirm.license_number || "non renseigné"}) avant de valider.`
          }
        />
      )}
    </div>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-navy/60">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  );
}
