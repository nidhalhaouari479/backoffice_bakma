"use client";

import { useState } from "react";
import { FolderTree, ListChecks, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { CategoryIcon, ConfirmDialog, ErrorState, IconPicker, PageHeader } from "@/components/admin-ui";
import { Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, Input, Modal, PageLoader, Tabs, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { ANIMALS, AppIcon } from "@/lib/icons";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Category, CharacteristicGroup, CharacteristicOption, Characteristics } from "@/lib/types";

type TabKey = "categories" | "caracteristiques";

export default function CataloguePage() {
  const [tab, setTab] = useState<TabKey>("categories");
  return (
    <div>
      <PageHeader title="Catalogue" subtitle="Catégories d'animaux et caractéristiques proposées dans le formulaire d'annonce." />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "categories", label: "Catégories", icon: <FolderTree /> },
            { value: "caracteristiques", label: "Caractéristiques", icon: <ListChecks /> },
          ]}
        />
      </div>
      {tab === "categories" && <Categories />}
      {tab === "caracteristiques" && <CharacteristicsManager />}
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function IconButton({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        danger
          ? "grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
          : "grid size-8 place-items-center rounded-lg text-muted hover:bg-page hover:text-primary"
      }
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ catégories
function Categories() {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [cats, counts] = await Promise.all([supabase.from("categories").select("*").order("sort_order"), supabase.from("animals").select("category_id").limit(20000)]);
    const n: Record<number, number> = {};
    for (const a of must<{ category_id: number | null }[]>(counts)) if (a.category_id != null) n[a.category_id] = (n[a.category_id] ?? 0) + 1;
    return { cats: must<Category[]>(cats), n };
  });

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const cats = data?.cats ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Catégories d'animaux"
        subtitle="Utilisées pour classer les annonces et dans les filtres du site."
        icon={<FolderTree />}
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ name: "", slug: "", icon: "e-paws", sort_order: (cats.at(-1)?.sort_order ?? 0) + 1 })}>
            Ajouter
          </Button>
        }
      />
      {cats.length === 0 ? (
        <EmptyState icon={<FolderTree />} title="Aucune catégorie" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3">
              <tr>
                <th className="pl-6">Ordre</th>
                <th>Icône</th>
                <th>Nom</th>
                <th>Slug</th>
                <th>Annonces</th>
                <th className="pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="pl-6 font-semibold text-navy">{c.sort_order}</td>
                  <td>
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                      <CategoryIcon icon={c.icon} className="size-5" />
                    </span>
                  </td>
                  <td className="font-bold text-navy">{c.name}</td>
                  <td className="font-mono text-xs text-body">{c.slug}</td>
                  <td className="text-body">{data?.n[c.id] ?? 0}</td>
                  <td className="pr-6">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Modifier" onClick={() => setEdit(c)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label="Supprimer" danger onClick={() => setDel(c)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <CategoryModal
          value={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
      {del && (
        <ConfirmDialog
          open
          onClose={() => setDel(null)}
          variant="danger"
          title="Supprimer la catégorie"
          confirmLabel="Supprimer"
          message={
            (data?.n[del.id] ?? 0) > 0
              ? `La catégorie « ${del.name} » est utilisée par ${data?.n[del.id]} annonce(s) : réaffectez-les avant de la supprimer.`
              : `La catégorie « ${del.name} » sera supprimée définitivement.`
          }
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("categories").delete().eq("id", del.id);
            if (err) throw new Error(err.code === "23503" ? "Cette catégorie est encore utilisée par des annonces." : errorMessage(err));
            toast("Catégorie supprimée");
            reload();
          }}
        />
      )}
    </Card>
  );
}

/** Icône d'animal correspondant au nom saisi (« Chevaux » → cheval), sinon null. */
function suggestAnimal(name: string): string | null {
  const n = slugify(name).replace(/-/g, " ");
  if (n.length < 3) return null;
  const words = n.split(" ").map((w) => w.replace(/(aux|x|s)$/, ""));
  const hit = ANIMALS.find((a) => {
    const label = slugify(a.label.replace(/\s*\(.*\)/, "")).replace(/-/g, " ");
    return words.some((w) => w.length >= 3 && (label === w || label.startsWith(w) || w.startsWith(label)));
  });
  return hit?.key ?? null;
}

function CategoryModal({ value, onClose, onSaved }: { value: Partial<Category>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(value.name ?? "");
  const [slug, setSlug] = useState(value.slug ?? "");
  const [icon, setIcon] = useState(value.icon ?? "e-paws");
  const [iconTouched, setIconTouched] = useState(!!value.id);
  const [order, setOrder] = useState(value.sort_order ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = !value.id;

  async function save() {
    if (!name.trim()) return setErr("Le nom est obligatoire.");
    const s = slugify(slug || name);
    if (!s) return setErr("Slug invalide.");
    setBusy(true);
    setErr(null);
    try {
      const payload = { name: name.trim(), slug: s, icon: icon || null, sort_order: Number(order) || 0 };
      const supabase = getSupabase();
      const { error } = isNew ? await supabase.from("categories").insert(payload) : await supabase.from("categories").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? "Ce slug est déjà utilisé." : errorMessage(error));
      toast(isNew ? "Catégorie ajoutée" : "Catégorie modifiée");
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Nouvelle catégorie" : "Modifier la catégorie"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (isNew) setSlug(slugify(e.target.value));
              if (!iconTouched) {
                const match = suggestAnimal(e.target.value);
                if (match) setIcon(match);
              }
            }}
            placeholder="Ex. : Chiens"
          />
        </Field>
        <div className="grid grid-cols-[1fr_140px] gap-4">
          <Field label="Slug" hint="Utilisé dans les URL du site (minuscules, tirets).">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="chiens" />
          </Field>
          <Field label="Ordre">
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Icône">
          <IconPicker
            animals
            value={icon}
            onChange={(k) => {
              setIcon(k);
              setIconTouched(true);
            }}
          />
        </Field>
        <div className="flex items-center gap-3 rounded-xl bg-page px-4 py-3 text-sm text-body">
          <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            <CategoryIcon icon={icon} className="size-7" />
          </span>
          Aperçu : <strong className="text-navy">{name || "Nom"}</strong>
        </div>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ caractéristiques
const CODE_LABEL: Record<string, string> = {
  vaccinated: "Vacciné",
  dewormed: "Vermifugé",
  healthy: "En bonne santé",
  sterilized: "Stérilisé",
};

function CharacteristicsManager() {
  const toast = useToast();
  const [editGroup, setEditGroup] = useState<Partial<CharacteristicGroup> | null>(null);
  const [delGroup, setDelGroup] = useState<CharacteristicGroup | null>(null);
  const [editOption, setEditOption] = useState<{ group: CharacteristicGroup; option: Partial<CharacteristicOption> } | null>(null);
  const [delOption, setDelOption] = useState<{ group: CharacteristicGroup; option: CharacteristicOption } | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [groups, animals] = await Promise.all([
      supabase.from("characteristic_groups").select("*, options:characteristic_options!characteristic_options_group_id_fkey(*)").order("sort_order"),
      supabase.from("animals").select("characteristics").limit(20000),
    ]);
    // nombre d'annonces par rubrique et par valeur
    const used: Record<string, Record<string, number>> = {};
    for (const a of must<{ characteristics: Characteristics | null }[]>(animals)) {
      for (const [slug, values] of Object.entries(a.characteristics ?? {})) {
        if (!Array.isArray(values)) continue;
        used[slug] ??= {};
        for (const v of values) used[slug][v] = (used[slug][v] ?? 0) + 1;
      }
    }
    const list = must<CharacteristicGroup[]>(groups).map((g) => ({
      ...g,
      options: [...(g.options ?? [])].sort((x, y) => x.sort_order - y.sort_order || x.id - y.id),
    }));
    return { groups: list, used };
  });

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const groups = data?.groups ?? [];
  const usage = (slug: string) => Object.values(data?.used[slug] ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Caractéristiques des animaux"
          subtitle="Chaque rubrique (Santé, Caractère, Besoins…) apparaît dans le formulaire d'annonce avec ses choix."
          icon={<ListChecks />}
          action={
            <Button
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setEditGroup({ name: "", slug: "", icon: "sparkles", multiple: true, allow_custom: false, sort_order: (groups.at(-1)?.sort_order ?? 0) + 1 })}
            >
              Nouvelle rubrique
            </Button>
          }
        />
        <div className="h-3" />
      </Card>

      {groups.length === 0 ? (
        <Card>
          <EmptyState icon={<ListChecks />} title="Aucune rubrique" text="Créez une rubrique (ex. « Santé ») puis ajoutez-lui des choix." />
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <AppIcon icon={g.icon} className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-navy">
                    {g.name} <span className="ml-1 font-mono text-xs font-normal text-muted">{g.slug}</span>
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={g.multiple ? "blue" : "orange"}>{g.multiple ? "Choix multiple" : "Choix unique"}</Badge>
                    {g.allow_custom && <Badge tone="teal">Saisie libre autorisée</Badge>}
                    <Badge tone="grey">Ordre {g.sort_order}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <IconButton label="Modifier la rubrique" onClick={() => setEditGroup(g)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton label="Supprimer la rubrique" danger onClick={() => setDelGroup(g)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {g.options!.map((o) => (
                <span key={o.id} className="group/opt flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-3 pr-1 text-sm font-semibold text-navy">
                  <AppIcon icon={o.icon ?? g.icon} className="size-4 text-primary" />
                  {o.label}
                  <span className="text-xs font-normal text-muted">({data?.used[g.slug]?.[o.label] ?? 0})</span>
                  {o.code && (
                    <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold uppercase text-emerald-700" title="Lié à l'indicateur santé utilisé par les vétérinaires">
                      santé
                    </span>
                  )}
                  <IconButton label={`Modifier « ${o.label} »`} onClick={() => setEditOption({ group: g, option: o })}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label={`Supprimer « ${o.label} »`} danger onClick={() => setDelOption({ group: g, option: o })}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setEditOption({ group: g, option: { label: "", icon: null, sort_order: (g.options!.at(-1)?.sort_order ?? 0) + 1 } })}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft"
              >
                <Plus className="size-4" /> Ajouter un choix
              </button>
            </div>
            {g.options!.length === 0 && <p className="mt-2 text-xs text-muted">Aucun choix : ajoutez-en au moins un{g.allow_custom ? " (ou laissez les propriétaires saisir librement)" : ""}.</p>}
          </Card>
        ))
      )}

      {editGroup && (
        <GroupModal
          value={editGroup}
          onClose={() => setEditGroup(null)}
          onSaved={() => {
            setEditGroup(null);
            reload();
          }}
        />
      )}
      {editOption && (
        <OptionModal
          group={editOption.group}
          value={editOption.option}
          onClose={() => setEditOption(null)}
          onSaved={() => {
            setEditOption(null);
            reload();
          }}
        />
      )}
      {delGroup && (
        <ConfirmDialog
          open
          onClose={() => setDelGroup(null)}
          variant="danger"
          title="Supprimer la rubrique"
          confirmLabel="Supprimer"
          message={`La rubrique « ${delGroup.name} » et ses ${delGroup.options?.length ?? 0} choix seront supprimés.${
            usage(delGroup.slug) > 0 ? " Les valeurs déjà saisies dans les annonces ne seront plus affichées." : ""
          }${delGroup.slug === "sante" ? " Attention : les indicateurs santé (vacciné, vermifugé…) vus par les vétérinaires ne seront plus renseignés." : ""}`}
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("characteristic_groups").delete().eq("id", delGroup.id);
            if (err) throw err;
            toast("Rubrique supprimée");
            reload();
          }}
        />
      )}
      {delOption && (
        <ConfirmDialog
          open
          onClose={() => setDelOption(null)}
          variant="danger"
          title="Supprimer le choix"
          confirmLabel="Supprimer"
          message={`« ${delOption.option.label} » ne sera plus proposé.${
            (data?.used[delOption.group.slug]?.[delOption.option.label] ?? 0) > 0
              ? ` Les ${data?.used[delOption.group.slug]?.[delOption.option.label]} annonce(s) qui l'utilisent le conservent.`
              : ""
          }${delOption.option.code ? ` L'indicateur santé « ${CODE_LABEL[delOption.option.code] ?? delOption.option.code} » ne sera plus renseigné.` : ""}`}
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("characteristic_options").delete().eq("id", delOption.option.id);
            if (err) throw err;
            toast("Choix supprimé");
            reload();
          }}
        />
      )}
    </div>
  );
}

function GroupModal({ value, onClose, onSaved }: { value: Partial<CharacteristicGroup>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = !value.id;
  const [name, setName] = useState(value.name ?? "");
  const [slug, setSlug] = useState(value.slug ?? "");
  const [icon, setIcon] = useState(value.icon ?? "sparkles");
  const [multiple, setMultiple] = useState(value.multiple ?? true);
  const [allowCustom, setAllowCustom] = useState(value.allow_custom ?? false);
  const [order, setOrder] = useState(value.sort_order ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setErr("Le nom est obligatoire.");
    const s = isNew ? slugify(slug || name).replace(/-/g, "_") : value.slug!;
    if (!s) return setErr("Identifiant invalide.");
    setBusy(true);
    setErr(null);
    try {
      const payload = { name: name.trim(), icon, multiple, allow_custom: allowCustom, sort_order: Number(order) || 0 };
      const supabase = getSupabase();
      const { error } = isNew
        ? await supabase.from("characteristic_groups").insert({ ...payload, slug: s })
        : await supabase.from("characteristic_groups").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? "Cet identifiant est déjà utilisé." : errorMessage(error));
      toast(isNew ? "Rubrique ajoutée" : "Rubrique modifiée");
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Nouvelle rubrique" : "Modifier la rubrique"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (isNew) setSlug(slugify(e.target.value).replace(/-/g, "_"));
            }}
            placeholder="Ex. : Entente avec les autres animaux"
          />
        </Field>
        <div className="grid grid-cols-[1fr_140px] gap-4">
          <Field label="Identifiant" hint={isNew ? "Clé technique, non modifiable ensuite." : "Non modifiable."}>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!isNew} placeholder="entente" />
          </Field>
          <Field label="Ordre">
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </Field>
        </div>
        <div className="space-y-2 rounded-xl bg-page px-4 py-3">
          <Checkbox label="Plusieurs choix possibles (sinon un seul)" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
          <Checkbox label="Le propriétaire peut ajouter un choix libre" checked={allowCustom} onChange={(e) => setAllowCustom(e.target.checked)} />
        </div>
        <Field label="Icône">
          <IconPicker value={icon} onChange={setIcon} />
        </Field>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}

function OptionModal({ group, value, onClose, onSaved }: { group: CharacteristicGroup; value: Partial<CharacteristicOption>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = !value.id;
  const [label, setLabel] = useState(value.label ?? "");
  const [icon, setIcon] = useState<string | null>(value.icon ?? null);
  const [order, setOrder] = useState(value.sort_order ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!label.trim()) return setErr("Le libellé est obligatoire.");
    setBusy(true);
    setErr(null);
    try {
      const payload = { label: label.trim(), icon, sort_order: Number(order) || 0 };
      const supabase = getSupabase();
      const { error } = isNew
        ? await supabase.from("characteristic_options").insert({ ...payload, group_id: group.id })
        : await supabase.from("characteristic_options").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? "Ce choix existe déjà dans la rubrique." : errorMessage(error));
      toast(isNew ? "Choix ajouté" : "Choix modifié");
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? `Nouveau choix — ${group.name}` : `Modifier le choix — ${group.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_140px] gap-4">
          <Field label="Libellé" hint={isNew ? undefined : "Renommer met aussi à jour les annonces existantes."}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. : Bon avec les chats" />
          </Field>
          <Field label="Ordre">
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Icône" hint="Sans icône, celle de la rubrique est utilisée.">
          <IconPicker value={icon} onChange={setIcon} />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-page px-4 py-3 text-sm text-body">
          <span className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 font-semibold text-navy">
            <AppIcon icon={icon ?? group.icon} className="size-4 text-primary" /> {label || "Libellé"}
          </span>
          {icon && (
            <button type="button" onClick={() => setIcon(null)} className="text-xs font-semibold text-primary hover:underline">
              Utiliser l&apos;icône de la rubrique
            </button>
          )}
        </div>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}
