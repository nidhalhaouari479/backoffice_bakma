"use client";

import { useRef, useState } from "react";
import { Camera, KeyRound, Lock, Mail, MapPin, Phone, Save, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/admin-ui";
import { Alert, Avatar, Button, Card, CardHeader, Field, Input, PageLoader, Select, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useAsync } from "@/hooks/useAsync";
import { uploadPublicFile } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { City } from "@/lib/types";

export default function ProfilPage() {
  const { user, profile, contact } = useAuth();
  if (!user || !profile) return <PageLoader />;
  // `key` réinitialise le formulaire si le profil change
  return <ProfilForm key={`${profile.updated_at}-${contact?.phone ?? ""}`} />;
}

function ProfilForm() {
  const { user, profile, contact, refreshProfile } = useAuth();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const cities = useAsync(async () => {
    const { data } = await getSupabase().from("cities").select("*").order("name");
    return (data as City[]) ?? [];
  });

  async function onAvatar(f: File | undefined) {
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) return toast("Choisissez une image.", "error");
    if (f.size > 5 * 1024 * 1024) return toast("L'image dépasse 5 Mo.", "error");
    setUploading(true);
    try {
      setAvatar(await uploadPublicFile("avatars", user.id, f));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) return setError("Le nom est obligatoire.");
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const p = await supabase.from("profiles").update({ full_name: name.trim(), city: city || null, avatar_url: avatar }).eq("id", user.id);
      if (p.error) throw p.error;
      const c = await supabase.from("profile_contacts").update({ phone: phone.trim() || null }).eq("id", user.id);
      if (c.error) throw c.error;
      await refreshProfile();
      toast("Profil mis à jour");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwd.length < 8) return setPwdError("Le mot de passe doit contenir au moins 8 caractères.");
    if (pwd !== pwd2) return setPwdError("Les deux mots de passe ne correspondent pas.");
    setPwdBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password: pwd });
      if (err) throw err;
      setPwd("");
      setPwd2("");
      toast("Mot de passe modifié");
    } catch (err) {
      setPwdError(errorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles et la sécurité de votre compte." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Informations personnelles" icon={<User />} />
          <form onSubmit={save} className="space-y-5 px-6 pb-6">
            <div className="flex flex-wrap items-center gap-5">
              <Avatar src={avatar} name={name} size={88} />
              <div className="flex flex-wrap gap-2">
                <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
                <Button type="button" variant="soft" size="sm" icon={<Camera className="size-4" />} loading={uploading} onClick={() => file.current?.click()}>
                  Changer la photo
                </Button>
                {avatar && (
                  <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setAvatar(null)}>
                    Retirer
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nom complet">
                <Input icon={<User />} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email" hint="L'adresse de connexion ne peut pas être modifiée ici.">
                <Input icon={<Mail />} value={user?.email ?? ""} disabled />
              </Field>
              <Field label="Téléphone">
                <Input icon={<Phone />} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 00 000 000" />
              </Field>
              <Field label="Ville">
                <Select icon={<MapPin />} value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">—</option>
                  {city && !(cities.data ?? []).some((c) => c.name === city) && <option value={city}>{city}</option>}
                  {(cities.data ?? []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Alert>{error}</Alert>
            <div className="flex justify-end">
              <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Mot de passe" subtitle="8 caractères minimum" icon={<KeyRound />} />
          <form onSubmit={changePassword} className="space-y-5 px-6 pb-6">
            <Field label="Nouveau mot de passe">
              <Input type="password" icon={<Lock />} autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </Field>
            <Field label="Confirmer le mot de passe">
              <Input type="password" icon={<Lock />} autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </Field>
            <Alert>{pwdError}</Alert>
            <Button type="submit" className="w-full" loading={pwdBusy}>
              Modifier le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
