"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, ShieldCheck, UserCheck, UserCog, UserRound, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";
import { ConfirmDialog, type MenuItem } from "./admin-ui";
import { Select, useToast } from "./ui";

type P = Pick<Profile, "id" | "full_name" | "role" | "status">;

/** Actions admin sur un compte : suspendre / réactiver, changer le rôle, contacter. */
export function useUserActions(onDone: () => void) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState<{ kind: "status" | "role"; p: P } | null>(null);
  const [role, setRole] = useState<UserRole>("particulier");

  async function contact(p: P) {
    try {
      const { data, error } = await getSupabase().rpc("start_conversation", { p_other: p.id, p_animal_id: null });
      if (error) throw error;
      router.push(`/messages?c=${data}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  const askStatus = (p: P) => setTarget({ kind: "status", p });
  const askRole = (p: P) => {
    setRole(p.role);
    setTarget({ kind: "role", p });
  };

  const menuItems = (p: P, opts: { detail?: boolean } = {}): MenuItem[] => {
    const self = p.id === user?.id;
    return [
      { label: "Voir la fiche", icon: <UserRound />, href: `/utilisateurs/${p.id}`, hidden: opts.detail },
      { label: "Contacter", icon: <MessageCircle />, onClick: () => contact(p), hidden: self },
      { label: "Changer le rôle", icon: <UserCog />, onClick: () => askRole(p), disabled: self },
      p.status === "actif"
        ? { label: "Suspendre", icon: <UserX />, onClick: () => askStatus(p), danger: true, disabled: self }
        : { label: "Réactiver", icon: <UserCheck />, onClick: () => askStatus(p) },
    ];
  };

  async function confirm() {
    if (!target) return;
    const supabase = getSupabase();
    const { p } = target;
    if (target.kind === "status") {
      const status = p.status === "actif" ? "suspendu" : "actif";
      const { error } = await supabase.from("profiles").update({ status }).eq("id", p.id);
      if (error) throw error;
      toast(status === "suspendu" ? "Compte suspendu" : "Compte réactivé");
    } else {
      if (role === p.role) return;
      const { error } = await supabase.from("profiles").update({ role }).eq("id", p.id);
      if (error) throw error;
      if (role === "veterinaire") {
        // fiche vétérinaire (à valider) si elle n'existe pas encore
        await supabase.from("veterinarians").upsert({ profile_id: p.id }, { onConflict: "profile_id", ignoreDuplicates: true });
      }
      toast(`Rôle modifié : ${ROLE_LABEL[role]}`);
    }
    onDone();
  }

  const dialogs = target && (
    <ConfirmDialog
      open
      onClose={() => setTarget(null)}
      onConfirm={confirm}
      variant={target.kind === "status" && target.p.status === "actif" ? "danger" : "primary"}
      title={target.kind === "role" ? "Changer le rôle" : target.p.status === "actif" ? "Suspendre le compte" : "Réactiver le compte"}
      confirmLabel={target.kind === "role" ? "Confirmer le changement" : target.p.status === "actif" ? "Suspendre" : "Réactiver"}
      message={
        target.kind === "role"
          ? `Choisissez le nouveau rôle de ${target.p.full_name || "cet utilisateur"}.`
          : target.p.status === "actif"
            ? `${target.p.full_name || "Cet utilisateur"} ne pourra plus utiliser les fonctionnalités réservées aux membres tant que son compte est suspendu.`
            : `${target.p.full_name || "Cet utilisateur"} retrouvera l'accès complet à son compte.`
      }
    >
      {target.kind === "role" && (
        <div className="space-y-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} aria-label="Rôle">
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
          {role === "admin" && role !== target.p.role && (
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <ShieldCheck className="size-4 shrink-0" /> Ce compte aura un accès complet au panneau d&apos;administration.
            </p>
          )}
          {role === "veterinaire" && role !== target.p.role && (
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">Le compte devra ensuite être validé depuis la page Vétérinaires.</p>
          )}
        </div>
      )}
    </ConfirmDialog>
  );

  return { menuItems, askStatus, askRole, contact, dialogs };
}
