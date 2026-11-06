"use client";

import { useState } from "react";
import { CircleCheck, CircleMinus, CircleX, Eye, TriangleAlert } from "lucide-react";
import { getSupabase, errorMessage } from "@/lib/supabase";
import type { Consultation, PublicationRequest } from "@/lib/types";
import { ConfirmDialog, type MenuItem } from "./admin-ui";
import { useToast } from "./ui";

type Kind = "approve" | "refuse" | "cancel";

/** Vrai si la dernière consultation est terminée avec un avis favorable. */
export function hasFavorableOpinion(consultations: Pick<Consultation, "status" | "decision" | "created_at">[] | undefined | null): boolean {
  const last = [...(consultations ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return !!last && last.status === "terminee" && last.decision === "approuve";
}

async function runRpc(kind: Kind, id: string, text: string) {
  const supabase = getSupabase();
  const res =
    kind === "approve"
      ? await supabase.rpc("approve_request", { p_request_id: id, p_note: text || null })
      : kind === "refuse"
        ? await supabase.rpc("refuse_request", { p_request_id: id, p_reason: text })
        : await supabase.rpc("cancel_request", { p_request_id: id });
  if (res.error) throw res.error;
}

/**
 * Actions de décision admin sur une ou plusieurs demandes (Approuver / Refuser / Annuler),
 * avec les boîtes de dialogue associées. `onDone` est appelé après exécution.
 */
export function useRequestActions(onDone: () => void) {
  const toast = useToast();
  const [target, setTarget] = useState<{ kind: Kind; reqs: PublicationRequest[] } | null>(null);

  const ask = (kind: Kind, reqs: PublicationRequest[]) => {
    const pending = reqs.filter((r) => r.status === "en_cours");
    if (!pending.length) {
      toast("Aucune demande en cours dans la sélection.", "info");
      return;
    }
    setTarget({ kind, reqs: pending });
  };

  const menuItems = (r: PublicationRequest): MenuItem[] => {
    const open = r.status === "en_cours";
    return [
      { label: "Voir", icon: <Eye />, href: `/demandes/${r.id}` },
      { label: "Approuver", icon: <CircleCheck />, onClick: () => ask("approve", [r]), disabled: !open },
      { label: "Refuser", icon: <CircleX />, onClick: () => ask("refuse", [r]), disabled: !open, danger: true },
      { label: "Annuler", icon: <CircleMinus />, onClick: () => ask("cancel", [r]), disabled: !open },
    ];
  };

  async function confirm(text: string) {
    if (!target) return;
    let ok = 0;
    const errors: string[] = [];
    for (const r of target.reqs) {
      try {
        await runRpc(target.kind, r.id, text);
        ok++;
      } catch (e) {
        errors.push(`${r.ref} : ${errorMessage(e)}`);
      }
    }
    const verb = target.kind === "approve" ? "approuvée" : target.kind === "refuse" ? "refusée" : "annulée";
    if (ok) toast(ok > 1 ? `${ok} demandes ${verb}s` : `Demande ${verb}`, "success");
    onDone();
    if (errors.length) throw new Error(errors.join("\n"));
  }

  const n = target?.reqs.length ?? 0;
  const many = n > 1;
  const withoutOpinion = target?.kind === "approve" ? target.reqs.filter((r) => !hasFavorableOpinion(r.consultations)).length : 0;

  const dialogs = target && (
    <ConfirmDialog
      open
      onClose={() => setTarget(null)}
      onConfirm={confirm}
      title={
        target.kind === "approve"
          ? many ? `Approuver ${n} demandes` : "Approuver la demande"
          : target.kind === "refuse"
            ? many ? `Refuser ${n} demandes` : "Refuser la demande"
            : "Annuler la demande"
      }
      variant={target.kind === "approve" ? "success" : target.kind === "refuse" ? "danger" : "primary"}
      confirmLabel={target.kind === "approve" ? "Approuver et publier" : target.kind === "refuse" ? "Refuser" : "Annuler la demande"}
      message={
        target.kind === "approve"
          ? many
            ? `Les ${n} annonces seront publiées et visibles sur Bakma Store.`
            : `L'annonce « ${target.reqs[0]!.animal?.name ?? target.reqs[0]!.ref} » sera publiée et visible sur Bakma Store.`
          : target.kind === "refuse"
            ? "Le propriétaire sera notifié avec le motif indiqué."
            : `La demande ${target.reqs[0]!.ref} sera annulée et l'annonce retirée du circuit de validation.`
      }
      input={
        target.kind === "approve"
          ? { label: "Note interne (optionnelle)", placeholder: "Ex. : vérifié par téléphone avec le propriétaire" }
          : target.kind === "refuse"
            ? { label: "Motif du refus", placeholder: "Expliquez au propriétaire pourquoi l'annonce est refusée", required: true }
            : undefined
      }
    >
      {withoutOpinion > 0 && (
        <div className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {many
              ? `${withoutOpinion} demande(s) n'ont pas d'avis vétérinaire favorable.`
              : "Cette demande n'a pas encore reçu d'avis vétérinaire favorable."}{" "}
            Vous pouvez tout de même la publier, mais vérifiez l&apos;état de santé de l&apos;animal.
          </span>
        </div>
      )}
    </ConfirmDialog>
  );

  return { ask, menuItems, dialogs };
}
