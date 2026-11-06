"use client";

import { useState } from "react";
import { EyeOff, ExternalLink, FileText, Send, Trash2 } from "lucide-react";
import { siteUrl } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase";
import type { Animal } from "@/lib/types";
import { ConfirmDialog, type MenuItem } from "./admin-ui";
import { useToast } from "./ui";

type Kind = "unpublish" | "republish" | "delete";
type A = Pick<Animal, "id" | "name" | "status"> & Partial<Pick<Animal, "published_at">>;

/** Actions de modération sur une annonce : dépublier / republier / supprimer. */
export function useAnimalActions(onDone: (kind: Kind, animal: A) => void) {
  const toast = useToast();
  const [target, setTarget] = useState<{ kind: Kind; animal: A } | null>(null);

  const ask = (kind: Kind, animal: A) => setTarget({ kind, animal });

  const menuItems = (a: A, opts: { detail?: boolean } = {}): MenuItem[] => [
    { label: "Fiche détaillée", icon: <FileText />, href: `/animaux/${a.id}`, hidden: opts.detail },
    { label: "Voir sur le site", icon: <ExternalLink />, href: siteUrl(`/animaux/${a.id}`), external: true, hidden: !["publiee", "adoptee", "vendue"].includes(a.status) },
    { label: "Dépublier", icon: <EyeOff />, onClick: () => ask("unpublish", a), hidden: a.status !== "publiee" },
    { label: "Republier", icon: <Send />, onClick: () => ask("republish", a), hidden: a.status !== "annulee" },
    { label: "Supprimer", icon: <Trash2 />, onClick: () => ask("delete", a), danger: true },
  ];

  async function confirm() {
    if (!target) return;
    const { kind, animal } = target;
    const supabase = getSupabase();
    const res =
      kind === "delete"
        ? await supabase.from("animals").delete().eq("id", animal.id)
        : kind === "unpublish"
          ? await supabase.from("animals").update({ status: "annulee" }).eq("id", animal.id)
          : await supabase
              .from("animals")
              .update({ status: "publiee", published_at: animal.published_at ?? new Date().toISOString() })
              .eq("id", animal.id);
    if (res.error) throw res.error;
    toast(kind === "delete" ? "Annonce supprimée" : kind === "unpublish" ? "Annonce dépubliée" : "Annonce republiée");
    onDone(kind, animal);
  }

  const dialogs = target && (
    <ConfirmDialog
      open
      onClose={() => setTarget(null)}
      onConfirm={confirm}
      variant={target.kind === "delete" ? "danger" : "primary"}
      title={target.kind === "delete" ? "Supprimer l'annonce" : target.kind === "unpublish" ? "Dépublier l'annonce" : "Republier l'annonce"}
      confirmLabel={target.kind === "delete" ? "Supprimer définitivement" : target.kind === "unpublish" ? "Dépublier" : "Republier"}
      message={
        target.kind === "delete"
          ? `L'annonce « ${target.animal.name} », ses photos, demandes et consultations associées seront supprimées. Cette action est irréversible.`
          : target.kind === "unpublish"
            ? `« ${target.animal.name} » ne sera plus visible sur le site public (statut « Annulée »).`
            : `« ${target.animal.name} » sera de nouveau visible sur le site public.`
      }
    />
  );

  return { ask, menuItems, dialogs };
}
