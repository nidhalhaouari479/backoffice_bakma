"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, Mail, Phone, Save } from "lucide-react";
import { Alert, Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { City } from "@/lib/types";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  city: "",
  clinic_name: "",
  license_number: "",
  specialty: "",
  address: "",
  bio: "",
};
type Form = typeof EMPTY;

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Création d'un compte vétérinaire complet par l'admin (via /api/veterinaires). */
export function CreateVetModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: cities } = useAsync(async () => must<City[]>(await getSupabase().from("cities").select("*").order("name")));

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim()) return setErr("Le prénom et le nom sont obligatoires.");
    if (!form.email.trim()) return setErr("L'email est obligatoire.");
    if (form.password.length < 8) return setErr("Le mot de passe doit contenir au moins 8 caractères.");
    setBusy(true);
    setErr(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const res = await fetch("/api/veterinaires", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Création impossible.");
      toast(`Compte vétérinaire créé pour Dr. ${form.first_name} ${form.last_name}`);
      onCreated();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Ajouter un vétérinaire"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />}>
            Créer le compte
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom *">
            <Input value={form.first_name} onChange={set("first_name")} autoComplete="off" />
          </Field>
          <Field label="Nom *">
            <Input value={form.last_name} onChange={set("last_name")} autoComplete="off" />
          </Field>
          <Field label="Email *" hint="Identifiant de connexion à l'espace vétérinaire.">
            <Input type="email" icon={<Mail />} value={form.email} onChange={set("email")} autoComplete="off" />
          </Field>
          <Field label="Mot de passe *" hint="8 caractères minimum. Le vétérinaire pourra le changer dans son profil.">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type={showPwd ? "text" : "password"}
                  icon={<Lock />}
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  right={
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-muted hover:text-primary" aria-label={showPwd ? "Masquer" : "Afficher"}>
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </div>
              <Button
                type="button"
                variant="soft"
                className="h-12"
                icon={<KeyRound className="size-4" />}
                onClick={() => {
                  setForm((f) => ({ ...f, password: generatePassword() }));
                  setShowPwd(true);
                }}
              >
                Générer
              </Button>
            </div>
          </Field>
          <Field label="Téléphone">
            <Input type="tel" icon={<Phone />} value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Ville">
            <Select value={form.city} onChange={set("city")}>
              <option value="">—</option>
              {(cities ?? []).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label="Clinique / cabinet">
            <Input value={form.clinic_name} onChange={set("clinic_name")} />
          </Field>
          <Field label="N° d'Ordre">
            <Input value={form.license_number} onChange={set("license_number")} />
          </Field>
          <Field label="Spécialité">
            <Input value={form.specialty} onChange={set("specialty")} placeholder="Ex. : Animaux de compagnie" />
          </Field>
          <Field label="Adresse">
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Présentation" className="sm:col-span-2">
            <Textarea rows={3} value={form.bio} onChange={set("bio")} />
          </Field>
        </section>

        <p className="text-xs text-muted">Le compte est créé validé : le vétérinaire peut se connecter immédiatement et modifier ses informations depuis son profil.</p>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}
