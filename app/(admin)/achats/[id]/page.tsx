"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileSearch,
  FileText,
  Landmark,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { AnimalCell, ConfirmDialog, ErrorState, InfoRow, PageHeader } from "@/components/admin-ui";
import { Alert, Avatar, Button, Card, EmptyState, Input, MetaBadge, PageLoader, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCounts } from "@/components/AdminShell";
import { ACTIVITY_SELECT, PURCHASE_SELECT, siteUrl } from "@/lib/admin";
import { formatDate, formatDateTime, formatPrice, formatRib, PURCHASE_STATUS } from "@/lib/labels";
import { signedDocumentUrl } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ActivityLog, PayoutAccount, Profile, ProfileContact, Purchase } from "@/lib/types";

type Action = "verify" | "reject" | "release" | "refund" | null;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export default function AchatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAdminCounts();
  const [action, setAction] = useState<Action>(null);
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [contacting, setContacting] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const sb = getSupabase();
    const purchase = must<Purchase | null>(await sb.from("purchases").select(PURCHASE_SELECT).eq("id", id).maybeSingle());
    if (!purchase) return { purchase: null, payout: null, activity: [] as ActivityLog[] };
    const [payout, act] = await Promise.all([
      sb.from("payout_accounts").select("*").eq("profile_id", purchase.seller_id).maybeSingle(),
      sb.from("activity_log").select(ACTIVITY_SELECT).eq("animal_id", purchase.animal_id).like("type", "achat_%").gte("created_at", purchase.created_at).order("created_at"),
    ]);
    return { purchase, payout: (payout.data ?? null) as PayoutAccount | null, activity: (act.data ?? []) as ActivityLog[] };
  }, id);

  const p = data?.purchase ?? null;

  // Reçu : URL signée (aperçu si c'est une image)
  useEffect(() => {
    let on = true;
    if (p?.receipt_path) signedDocumentUrl(p.receipt_path).then((u) => on && setReceiptUrl(u));
    return () => {
      on = false;
    };
  }, [p?.receipt_path]);

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!p) {
    return (
      <Card>
        <EmptyState icon={<FileSearch />} title="Achat introuvable" text="Cet achat n'existe pas ou a été supprimé." action={<Button href="/achats">Retour aux achats</Button>} />
      </Card>
    );
  }

  const due = p.status === "garantie" && !!p.release_at && new Date(p.release_at) <= new Date();
  // versement anticipé : pendant la garantie, l'admin peut verser sans attendre la date de fin
  const early = p.status === "garantie" && !due;
  const canRelease = p.status === "garantie" || p.status === "litige";
  const canRefund = p.status === "garantie" || p.status === "litige";

  async function rpc(fn: string, args: Record<string, unknown>, done: string) {
    const { error: err } = await getSupabase().rpc(fn, args);
    if (err) throw new Error(errorMessage(err));
    toast(done);
    setReference("");
    reload();
    refresh();
  }

  async function contact(person: Profile | null | undefined) {
    if (!person || !p) return;
    setContacting(person.id);
    try {
      const { data: convId, error: err } = await getSupabase().rpc("start_conversation", { p_other: person.id, p_animal_id: p.animal_id });
      if (err) throw err;
      router.push(`/messages?c=${convId}`);
    } catch (e) {
      toast(errorMessage(e), "error");
      setContacting(null);
    }
  }

  const isImage = IMAGE_EXT.test(p.receipt_name ?? p.receipt_path);

  return (
    <div>
      <PageHeader
        back={{ href: "/achats", label: "Achats" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Achat {p.ref} <MetaBadge meta={due ? { label: "Garantie terminée — à verser", tone: "green" } : PURCHASE_STATUS[p.status]} />
          </span>
        }
        subtitle={`Créé le ${formatDateTime(p.created_at)} · ${formatPrice(p.amount, "vente")}`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-bold">Action requise</h2>
            {p.status === "paiement_a_verifier" && (
              <>
                <p className="mt-2 text-sm text-body">
                  Vérifiez sur le relevé bancaire de Bakma que <strong>{formatPrice(p.amount, "vente")}</strong> ont bien été reçus. En validant, l&apos;animal
                  passe en « Vendu » et la garantie de {p.hold_days} jours commence.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="success" icon={<CircleCheck className="size-4" />} onClick={() => setAction("verify")}>
                    Valider le paiement
                  </Button>
                  <Button variant="outline" className="text-red-600" icon={<CircleX className="size-4" />} onClick={() => setAction("reject")}>
                    Refuser le reçu
                  </Button>
                </div>
              </>
            )}
            {p.status === "garantie" && !due && (
              <Alert tone="blue">
                Garantie en cours jusqu&apos;au {formatDateTime(p.release_at)}. Organisez la remise de l&apos;animal avec l&apos;acheteur et le vendeur. Le versement
                au vendeur est prévu à cette date si aucun problème n&apos;est signalé. Si la remise s&apos;est bien passée, vous pouvez aussi verser dès
                maintenant.
              </Alert>
            )}
            {due && <Alert tone="green">Garantie terminée sans litige : versez {formatPrice(p.amount, "vente")} au vendeur.</Alert>}
            {p.status === "litige" && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4" /> Litige ouvert le {formatDateTime(p.disputed_at)}
                </p>
                <p className="mt-1 whitespace-pre-line">{p.dispute_reason}</p>
                <p className="mt-2 text-xs">Tranchez : versez au vendeur ou remboursez l&apos;acheteur.</p>
              </div>
            )}
            {p.status === "versee" && (
              <Alert tone="green">
                Versé au vendeur le {formatDateTime(p.paid_out_at)}
                {p.payout_reference ? ` · réf. ${p.payout_reference}` : ""}.
              </Alert>
            )}
            {p.status === "remboursee" && (
              <Alert tone="purple">
                Acheteur remboursé le {formatDateTime(p.refunded_at)}
                {p.refund_reference ? ` · réf. ${p.refund_reference}` : ""}. Pensez à remettre l&apos;annonce en ligne si l&apos;animal est de nouveau disponible.
              </Alert>
            )}
            {p.status === "paiement_refuse" && <Alert tone="red">Reçu refusé : {p.refusal_reason}</Alert>}
            {p.status === "annulee" && <Alert tone="grey">Achat annulé par l&apos;acheteur avant vérification.</Alert>}
            {(canRelease || canRefund) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {canRelease && (
                  <Button variant={early ? "outline" : "success"} icon={<Banknote className="size-4" />} onClick={() => setAction("release")}>
                    {early ? "Verser maintenant (avant la fin de la garantie)" : "Verser au vendeur"}
                  </Button>
                )}
                {canRefund && (
                  <Button variant="outline" className="text-red-600" icon={<RotateCcw className="size-4" />} onClick={() => setAction("refund")}>
                    Rembourser l&apos;acheteur
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Reçu */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Reçu de virement</h2>
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="size-4" /> Ouvrir
                </a>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{p.receipt_name ?? "reçu"}</p>
            <dl className="mt-3 rounded-xl bg-page px-4 py-2">
              <InfoRow label="Titulaire du compte">{p.payer_name || "Non renseigné"}</InfoRow>
              <InfoRow label="Numéro de compte (RIB)">
                {p.payer_account ? <span className="font-mono">{p.payer_account.length === 20 ? formatRib(p.payer_account) : p.payer_account}</span> : "Non renseigné"}
              </InfoRow>
            </dl>
            {receiptUrl && isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receiptUrl} alt="Reçu de virement" className="mt-4 max-h-[520px] w-full rounded-xl border border-line object-contain" />
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-page p-4 text-sm text-body">
                <FileText className="size-5 text-primary" /> {receiptUrl ? "Document PDF : cliquez sur « Ouvrir »." : "Chargement du reçu…"}
              </div>
            )}
            {p.buyer_note && (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold text-navy">Message de l&apos;acheteur</div>
                <p className="whitespace-pre-line rounded-xl bg-page p-3 text-sm text-body">{p.buyer_note}</p>
              </div>
            )}
          </Card>

          {/* Historique */}
          <Card className="p-6">
            <h2 className="text-lg font-bold">Historique</h2>
            <dl className="mt-3">
              <InfoRow label="Reçu envoyé">{formatDateTime(p.created_at)}</InfoRow>
              {p.verified_at && <InfoRow label="Paiement validé">{formatDateTime(p.verified_at)}</InfoRow>}
              {p.release_at && <InfoRow label="Fin de garantie">{formatDateTime(p.release_at)}</InfoRow>}
              {p.disputed_at && <InfoRow label="Litige ouvert">{formatDateTime(p.disputed_at)}</InfoRow>}
              {p.paid_out_at && <InfoRow label="Versé au vendeur">{formatDateTime(p.paid_out_at)}</InfoRow>}
              {p.refunded_at && <InfoRow label="Remboursé">{formatDateTime(p.refunded_at)}</InfoRow>}
              {p.admin_note && <InfoRow label="Note admin">{p.admin_note}</InfoRow>}
            </dl>
            {data!.activity.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                {data!.activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span className="text-body">
                      {a.message}
                      {a.actor ? <span className="text-muted"> — {a.actor.full_name}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Animal</h2>
              <Button size="sm" variant="outline" className="text-primary" href={`/animaux/${p.animal_id}`}>
                Fiche
              </Button>
            </div>
            <div className="mt-4">
              <AnimalCell animal={p.animal} />
            </div>
            <a href={siteUrl(`/animaux/${p.animal_id}`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Voir sur le site <ExternalLink className="size-3.5" />
            </a>
          </Card>

          <PartyCard title="Acheteur" person={p.buyer} onContact={() => contact(p.buyer)} contacting={contacting === p.buyer_id} />

          <PartyCard title="Vendeur" person={p.seller} onContact={() => contact(p.seller)} contacting={contacting === p.seller_id}>
            <div className="mt-4 rounded-xl border border-line p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-navy">
                <Landmark className="size-4 text-primary" /> Compte de versement
              </p>
              {data!.payout ? (
                <dl className="mt-2">
                  <InfoRow label="Titulaire">{data!.payout.account_holder}</InfoRow>
                  <InfoRow label="Banque">{data!.payout.bank_name || "—"}</InfoRow>
                  <InfoRow label="RIB">
                    <span className="font-mono tracking-wide">{formatRib(data!.payout.rib)}</span>
                  </InfoRow>
                </dl>
              ) : (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Le vendeur n&apos;a pas encore renseigné son RIB (Espace client → Achats &amp; ventes → Mes ventes).
                </p>
              )}
            </div>
          </PartyCard>

          <p className="flex items-start gap-2 px-1 text-xs text-muted">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" /> L&apos;acheteur et le vendeur ne voient jamais les coordonnées l&apos;un de l&apos;autre : toute
            communication passe par Bakma.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={action === "verify"}
        onClose={() => setAction(null)}
        title="Valider le paiement"
        message={`Confirmez la réception de ${formatPrice(p.amount, "vente")} sur le compte Bakma. L'animal sera marqué « Vendu » et la garantie de ${p.hold_days} jours commencera.`}
        confirmLabel="Valider le paiement"
        variant="success"
        input={{ label: "Note interne (facultatif)" }}
        onConfirm={(note) => rpc("verify_purchase_payment", { p_purchase_id: p.id, p_note: note || null }, "Paiement validé : garantie démarrée")}
      />
      <ConfirmDialog
        open={action === "reject"}
        onClose={() => setAction(null)}
        title="Refuser le reçu"
        message="L'acheteur sera notifié avec le motif et l'annonce redevient disponible."
        confirmLabel="Refuser"
        variant="danger"
        input={{ label: "Motif (envoyé à l'acheteur)", placeholder: "Ex. virement non reçu, montant incorrect…", required: true }}
        onConfirm={(reason) => rpc("reject_purchase_payment", { p_purchase_id: p.id, p_reason: reason }, "Reçu refusé")}
      />
      <ConfirmDialog
        open={action === "release"}
        onClose={() => setAction(null)}
        title={early ? "Verser avant la fin de la garantie" : "Verser au vendeur"}
        message={
          (early
            ? `La garantie court jusqu'au ${formatDateTime(p.release_at)}. En versant maintenant, la garantie est clôturée : l'acheteur ne pourra plus signaler de problème et sera prévenu. `
            : "") +
          (data!.payout
            ? `Faites le virement de ${formatPrice(p.amount, "vente")} sur le RIB ${formatRib(data!.payout.rib)} (${data!.payout.account_holder}), puis confirmez.`
            : "Attention : le vendeur n'a pas renseigné de RIB. Confirmez seulement si vous l'avez payé par un autre moyen.")
        }
        confirmLabel={early ? "Verser maintenant" : "Confirmer le versement"}
        variant="success"
        onConfirm={() =>
          rpc("release_purchase_payout", { p_purchase_id: p.id, p_reference: reference || null, p_early: early }, early ? "Versement anticipé enregistré" : "Versement enregistré")
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-navy">Référence du virement (facultatif)</span>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. VIR-2026-1104" />
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={action === "refund"}
        onClose={() => setAction(null)}
        title="Rembourser l'acheteur"
        message={`Remboursez ${formatPrice(p.amount, "vente")} à l'acheteur, puis confirmez. Le vendeur ne sera pas payé.`}
        confirmLabel="Confirmer le remboursement"
        variant="danger"
        input={{ label: "Motif (envoyé au vendeur)", required: true }}
        onConfirm={(note) => rpc("refund_purchase", { p_purchase_id: p.id, p_reference: reference || null, p_note: note }, "Remboursement enregistré")}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-navy">Référence du remboursement (facultatif)</span>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
      </ConfirmDialog>
    </div>
  );
}

function PartyCard({
  title,
  person,
  onContact,
  contacting,
  children,
}: {
  title: string;
  person: (Profile & { contact?: ProfileContact | null }) | null | undefined;
  onContact: () => void;
  contacting: boolean;
  children?: React.ReactNode;
}) {
  const { user } = useAuth();
  const self = !!person && person.id === user?.id;
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {person && (
          <Button href={`/utilisateurs/${person.id}`} variant="outline" size="sm" className="text-primary">
            Profil
          </Button>
        )}
      </div>
      {person ? (
        <div className="mt-4 flex gap-4">
          <Avatar src={person.avatar_url} name={person.full_name} size={56} />
          <div className="min-w-0 space-y-1 text-sm">
            <div className="text-base font-bold text-navy">{person.full_name}</div>
            {person.contact?.email && (
              <a href={`mailto:${person.contact.email}`} className="flex items-center gap-2 text-body hover:text-primary">
                <Mail className="size-4 text-muted" /> {person.contact.email}
              </a>
            )}
            {person.contact?.phone && (
              <a href={`tel:${person.contact.phone}`} className="flex items-center gap-2 text-body hover:text-primary">
                <Phone className="size-4 text-muted" /> {person.contact.phone}
              </a>
            )}
            {person.city && <p className="text-muted">{person.city} · membre depuis {formatDate(person.created_at)}</p>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Utilisateur introuvable.</p>
      )}
      {children}
      {self ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">C&apos;est votre propre compte : la messagerie ne permet pas de s&apos;écrire à soi-même.</p>
      ) : (
        <Button className="mt-4 w-full" variant="soft" icon={<MessageCircle className="size-4" />} loading={contacting} onClick={onContact} disabled={!person}>
          Écrire {title === "Acheteur" ? "à l'acheteur" : "au vendeur"}
        </Button>
      )}
    </Card>
  );
}
