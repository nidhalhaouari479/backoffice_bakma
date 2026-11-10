"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Banknote, CircleCheck, CircleX, FileSearch, MapPin, MessageSquareText, Phone, Save, ShoppingCart, StickyNote, Truck, User } from "lucide-react";
import { useAdminCounts } from "@/components/AdminShell";
import { ConfirmDialog, ErrorState, InfoRow, PageHeader } from "@/components/admin-ui";
import { Alert, AnimalThumb, Button, Card, CardHeader, EmptyState, MetaBadge, PageLoader, Textarea, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { formatDateTime, formatTnd, ORDER_STATUS } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

type Action = Exclude<OrderStatus, "nouvelle"> | null;

const NEXT: Partial<Record<OrderStatus, { to: Exclude<OrderStatus, "nouvelle" | "annulee">; label: string; variant: "primary" | "success"; icon: React.ReactNode }>> = {
  nouvelle: { to: "confirmee", label: "Confirmer la commande", variant: "primary", icon: <CircleCheck className="size-4" /> },
  confirmee: { to: "expediee", label: "Marquer comme expédiée", variant: "primary", icon: <Truck className="size-4" /> },
  expediee: { to: "livree", label: "Marquer comme livrée", variant: "success", icon: <CircleCheck className="size-4" /> },
};

const CONFIRM_TEXT: Record<Exclude<OrderStatus, "nouvelle" | "annulee">, (o: Order) => { title: string; message: string; done: string }> = {
  confirmee: (o) => ({
    title: "Confirmer la commande",
    message: `Confirmez ${o.ref} après avoir appelé ${o.customer_name} au ${o.phone}. Le client est prévenu que son colis est en préparation.`,
    done: `Commande ${o.ref} confirmée`,
  }),
  expediee: (o) => ({
    title: "Marquer comme expédiée",
    message: `Le colis de ${o.ref} est remis au livreur. Le client est prévenu de préparer ${formatTnd(o.total)} en espèces.`,
    done: `Commande ${o.ref} en livraison`,
  }),
  livree: (o) => ({
    title: "Marquer comme livrée",
    message: `Confirmez que ${o.ref} a été livrée et que ${formatTnd(o.total)} ont été encaissés. La commande sera clôturée.`,
    done: `Commande ${o.ref} livrée`,
  }),
};

export default function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { refresh } = useAdminCounts();
  const [action, setAction] = useState<Action>(null);

  const { data, error, loading, reload } = useAsync(
    async () => must<Order | null>(await getSupabase().from("orders").select("*, items:order_items(*)").eq("id", id).maybeSingle()),
    id,
  );

  if (loading) return <PageLoader />;
  if (error && data === undefined) return <ErrorState message={error} onRetry={reload} />;
  const o = data ?? null;
  if (!o) {
    return (
      <Card>
        <EmptyState
          icon={<FileSearch />}
          title="Commande introuvable"
          text="Cette commande n'existe pas ou a été supprimée."
          action={<Button href="/boutique/commandes">Retour aux commandes</Button>}
        />
      </Card>
    );
  }

  const items: OrderItem[] = o.items ?? [];
  const next = NEXT[o.status];
  const canCancel = o.status !== "livree" && o.status !== "annulee";

  async function setStatus(status: Exclude<OrderStatus, "nouvelle">, note: string | null, done: string) {
    const { error: err } = await getSupabase().rpc("set_order_status", { p_order_id: o!.id, p_status: status, p_note: note });
    if (err) throw new Error(errorMessage(err));
    toast(done);
    reload();
    refresh();
  }

  const confirm = action && action !== "annulee" ? CONFIRM_TEXT[action](o) : null;

  return (
    <div>
      <PageHeader
        back={{ href: "/boutique/commandes", label: "Commandes" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Commande {o.ref} <MetaBadge meta={ORDER_STATUS[o.status]} />
          </span>
        }
        subtitle={`Passée le ${formatDateTime(o.created_at)} · ${formatTnd(o.total)}`}
        action={
          <>
            {canCancel && (
              <Button variant="danger" icon={<CircleX className="size-4" />} onClick={() => setAction("annulee")}>
                Annuler la commande
              </Button>
            )}
            {next && (
              <Button variant={next.variant} icon={next.icon} onClick={() => setAction(next.to)}>
                {next.label}
              </Button>
            )}
          </>
        }
      />

      {o.status === "annulee" && (
        <div className="mb-6">
          <Alert tone="grey">
            Commande annulée le {formatDateTime(o.cancelled_at)}
            {o.cancel_reason ? ` : ${o.cancel_reason}` : "."} Le stock des produits a été rendu.
          </Alert>
        </div>
      )}
      {o.status === "nouvelle" && (
        <div className="mb-6">
          <Alert tone="orange">Appelez le client pour vérifier l&apos;adresse et la disponibilité avant de confirmer la commande.</Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Articles" subtitle={`${items.reduce((s, i) => s + i.quantity, 0)} article(s)`} icon={<ShoppingCart />} />
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <AnimalThumb src={i.image} alt={i.product_name} className="size-12 shrink-0 rounded-lg border border-slate-200/80" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-navy">{i.product_name}</div>
                    {i.variant_label && <div className="text-xs font-semibold text-slate-700">{i.variant_label}</div>}
                    <div className="text-xs tabular-nums text-slate-500">
                      {i.quantity} × {formatTnd(i.unit_price)}
                      {!i.product_id && " · produit supprimé du catalogue"}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-navy">{formatTnd(i.line_total)}</div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Sous-total</dt>
                <dd className="tabular-nums text-navy">{formatTnd(o.subtotal)}</dd>
              </div>
              {Number(o.discount) > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-emerald-700">
                    Code promo <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold">{o.promo_code}</span>
                    {o.promo_percent ? ` (−${Number(o.promo_percent)} %)` : ""}
                  </dt>
                  <dd className="tabular-nums text-emerald-700">−{formatTnd(o.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Livraison</dt>
                <dd className="tabular-nums text-navy">{Number(o.delivery_fee) > 0 ? formatTnd(o.delivery_fee) : "Offerte"}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold">
                <dt className="text-navy">Total</dt>
                <dd className="tabular-nums text-navy">{formatTnd(o.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Historique" icon={<StickyNote />} />
            <dl className="px-5 pb-4">
              <InfoRow label="Créée">{formatDateTime(o.created_at)}</InfoRow>
              <InfoRow label="Confirmée">{o.confirmed_at ? formatDateTime(o.confirmed_at) : "—"}</InfoRow>
              <InfoRow label="Expédiée">{o.shipped_at ? formatDateTime(o.shipped_at) : "—"}</InfoRow>
              <InfoRow label="Livrée">{o.delivered_at ? formatDateTime(o.delivered_at) : "—"}</InfoRow>
              {o.cancelled_at && <InfoRow label="Annulée">{formatDateTime(o.cancelled_at)}</InfoRow>}
              {o.cancelled_at && <InfoRow label="Motif d'annulation">{o.cancel_reason || "—"}</InfoRow>}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Client" icon={<User />} />
            <div className="space-y-3 px-5 pb-5 text-sm">
              <div className="text-base font-semibold text-navy">{o.customer_name}</div>
              <a href={`tel:${o.phone}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
                <Phone className="size-4" aria-hidden /> <span className="tabular-nums">{o.phone}</span>
              </a>
              <p className="flex items-start gap-2 text-slate-700">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="whitespace-pre-line">
                  <strong className="font-semibold text-navy">{o.city}</strong>
                  <br />
                  {o.address}
                </span>
              </p>
              {o.note && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <MessageSquareText className="size-3.5" aria-hidden /> Note du client
                  </p>
                  <p className="whitespace-pre-line text-slate-700">{o.note}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Paiement" icon={<Banknote />} />
            <dl className="px-5 pb-4">
              <InfoRow label="Mode">Paiement à la livraison</InfoRow>
              <InfoRow label="À encaisser">{formatTnd(o.total)}</InfoRow>
            </dl>
          </Card>

          <AdminNote key={o.updated_at} order={o} onSaved={reload} />
        </div>
      </div>

      {confirm && action && action !== "annulee" && (
        <ConfirmDialog
          open
          onClose={() => setAction(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.title}
          variant={action === "livree" ? "success" : "primary"}
          onConfirm={() => setStatus(action, null, confirm.done)}
        />
      )}
      <ConfirmDialog
        open={action === "annulee"}
        onClose={() => setAction(null)}
        title="Annuler la commande"
        message={`${o.ref} sera annulée, le stock des produits sera rendu et le client recevra le motif ci-dessous.`}
        confirmLabel="Annuler la commande"
        variant="danger"
        input={{ label: "Motif (envoyé au client)", placeholder: "Ex. client injoignable, produit indisponible…", required: true }}
        onConfirm={(reason) => setStatus("annulee", reason, `Commande ${o.ref} annulée`)}
      />
    </div>
  );
}

function AdminNote({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState(order.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = note.trim() !== (order.admin_note ?? "").trim();

  async function save() {
    setBusy(true);
    setErr(null);
    const { error } = await getSupabase()
      .from("orders")
      .update({ admin_note: note.trim() || null })
      .eq("id", order.id);
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    toast("Note interne enregistrée");
    onSaved();
  }

  return (
    <Card>
      <CardHeader title="Note interne" subtitle="Visible uniquement par l'équipe Bakma." icon={<StickyNote />} />
      <div className="space-y-3 px-5 pb-5">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. livrer après 17 h, rappeler la veille…" aria-label="Note interne" />
        <Alert>{err}</Alert>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" icon={<Save className="size-4" />} loading={busy} disabled={!dirty} onClick={save}>
            Enregistrer la note
          </Button>
        </div>
      </div>
    </Card>
  );
}
