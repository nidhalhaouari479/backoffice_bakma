"use client";

import { useState } from "react";
import { Building2, Check, Mail, MapPin, Pencil, Phone, Plus, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { ConfirmDialog, ErrorState, PageHeader } from "@/components/admin-ui";
import { Alert, Button, Card, CardHeader, Checkbox, Field, Input, PageLoader, Spinner, Tabs, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { City } from "@/lib/types";

type TabKey = "platform" | "moderation" | "cities";

export default function ParametresPage() {
  const [tab, setTab] = useState<TabKey>("platform");
  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configurez la plateforme, la modération et les villes. Catégories et caractéristiques : menu Catalogue." />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "platform", label: "Plateforme", icon: <Building2 /> },
            { value: "moderation", label: "Modération", icon: <ShieldCheck /> },
            { value: "cities", label: "Villes", icon: <MapPin /> },
          ]}
        />
      </div>
      {tab === "platform" && <SettingsForm key="platform" settingKey="platform" />}
      {tab === "moderation" && <SettingsForm key="moderation" settingKey="moderation" />}
      {tab === "cities" && <Cities />}
    </div>
  );
}

// ------------------------------------------------------------------ settings (jsonb)
type Json = Record<string, unknown>;

function SettingsForm({ settingKey }: { settingKey: "platform" | "moderation" }) {
  const { data, error, loading, reload } = useAsync(async () => {
    const res = await getSupabase().from("settings").select("value").eq("key", settingKey).maybeSingle();
    return (must<{ value: Json } | null>(res)?.value ?? {}) as Json;
  }, settingKey);
  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  return settingKey === "platform" ? <PlatformForm initial={data ?? {}} /> : <ModerationForm initial={data ?? {}} />;
}

function useSaveSetting(key: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(value: Json) {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await getSupabase().from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast("Paramètres enregistrés");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { save, busy, err };
}

function PlatformForm({ initial }: { initial: Json }) {
  const [name, setName] = useState(String(initial.name ?? "Bakma Store"));
  const [email, setEmail] = useState(String(initial.contact_email ?? ""));
  const [phone, setPhone] = useState(String(initial.contact_phone ?? ""));
  const { save, busy, err } = useSaveSetting("platform");
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Informations de la plateforme" subtitle="Affichées sur le site public (pied de page, contact)." icon={<Building2 />} />
      <form
        className="space-y-5 px-6 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          save({ ...initial, name: name.trim(), contact_email: email.trim(), contact_phone: phone.trim() });
        }}
      >
        <Field label="Nom de la plateforme">
          <Input icon={<Building2 />} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Email de contact">
            <Input type="email" icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Téléphone de contact">
            <Input icon={<Phone />} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Devise" hint="La devise de la plateforme est fixée au dinar tunisien.">
          <Input value={String(initial.currency ?? "TND")} disabled />
        </Field>
        <Alert>{err}</Alert>
        <div className="flex justify-end">
          <Button type="submit" loading={busy} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ModerationForm({ initial }: { initial: Json }) {
  const [maxPhotos, setMaxPhotos] = useState(Number(initial.max_photos ?? 6));
  const [vetCheck, setVetCheck] = useState(initial.require_vet_check !== false);
  const [notify, setNotify] = useState(initial.auto_notify_vets !== false);
  const { save, busy, err } = useSaveSetting("moderation");
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Règles de modération" subtitle="Paramètres appliqués aux nouvelles annonces." icon={<ShieldCheck />} />
      <form
        className="space-y-5 px-6 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          save({ ...initial, max_photos: Math.min(20, Math.max(1, maxPhotos || 1)), require_vet_check: vetCheck, auto_notify_vets: notify });
        }}
      >
        <Field label="Nombre maximum de photos par annonce" hint="Entre 1 et 20.">
          <Input type="number" min={1} max={20} value={maxPhotos} onChange={(e) => setMaxPhotos(Number(e.target.value))} className="max-w-40" />
        </Field>
        <Checkbox label="Vérification vétérinaire obligatoire avant publication" checked={vetCheck} onChange={(e) => setVetCheck(e.target.checked)} />
        <Checkbox label="Notifier automatiquement les vétérinaires validés des nouvelles demandes" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        <Alert>{err}</Alert>
        <div className="flex justify-end">
          <Button type="submit" loading={busy} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------ villes
function Cities() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [del, setDel] = useState<City | null>(null);
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAsync(async () => must<City[]>(await getSupabase().from("cities").select("*").order("name")));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const { error: err } = await getSupabase().from("cities").insert({ name: name.trim() });
    setAdding(false);
    if (err) return toast(err.code === "23505" ? "Cette ville existe déjà." : errorMessage(err), "error");
    setName("");
    toast("Ville ajoutée");
    reload();
  }

  async function rename() {
    if (!editing?.name.trim()) return;
    const { error: err } = await getSupabase().from("cities").update({ name: editing.name.trim() }).eq("id", editing.id);
    if (err) return toast(err.code === "23505" ? "Cette ville existe déjà." : errorMessage(err), "error");
    setEditing(null);
    toast("Ville modifiée");
    reload();
  }

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const list = (data ?? []).filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Card className="max-w-3xl">
      <CardHeader title={`Villes (${data?.length ?? 0})`} subtitle="Proposées lors de la création d'une annonce et dans les filtres." icon={<MapPin />} />
      <div className="space-y-4 px-6 pb-6">
        <form onSubmit={add} className="flex gap-2">
          <div className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle ville…" />
          </div>
          <Button type="submit" loading={adding} icon={<Plus className="size-4" />} className="h-12">
            Ajouter
          </Button>
        </form>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="h-10" />
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucune ville.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-4 py-2">
                {editing?.id === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="h-9 flex-1 rounded-lg border border-primary px-3 text-sm text-navy outline-none"
                    />
                    <button onClick={rename} className="grid size-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50" aria-label="Valider">
                      <Check className="size-4" />
                    </button>
                    <button onClick={() => setEditing(null)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-page" aria-label="Annuler">
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-navy">{c.name}</span>
                    <button onClick={() => setEditing({ id: c.id, name: c.name })} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-page hover:text-primary" aria-label="Modifier">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => setDel(c)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {adding && <Spinner className="size-4" />}
      </div>
      {del && (
        <ConfirmDialog
          open
          onClose={() => setDel(null)}
          variant="danger"
          title="Supprimer la ville"
          confirmLabel="Supprimer"
          message={`« ${del.name} » ne sera plus proposée. Les annonces existantes conservent leur ville.`}
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("cities").delete().eq("id", del.id);
            if (err) throw err;
            toast("Ville supprimée");
            reload();
          }}
        />
      )}
    </Card>
  );
}
