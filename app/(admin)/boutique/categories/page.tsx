"use client";

import { useState } from "react";
import { FolderTree, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { ActionMenu, CategoryIcon, ConfirmDialog, DataTable, ErrorState, IconPicker, PageHeader, type MenuItem } from "@/components/admin-ui";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageLoader, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ShopCategory } from "@/lib/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const plural = (n: number) => `${n} produit${n > 1 ? "s" : ""}`;

export default function BoutiqueCategoriesPage() {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<ShopCategory> | null>(null);
  const [del, setDel] = useState<ShopCategory | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const sb = getSupabase();
    const [cats, products] = await Promise.all([sb.from("shop_categories").select("*").order("sort_order").order("name"), sb.from("products").select("category_id").limit(20000)]);
    const n: Record<number, number> = {};
    for (const p of must<{ category_id: number | null }[]>(products)) if (p.category_id != null) n[p.category_id] = (n[p.category_id] ?? 0) + 1;
    return { cats: must<ShopCategory[]>(cats), n };
  });

  const cats = data?.cats ?? [];
  const nb = (c: ShopCategory) => data?.n[c.id] ?? 0;
  const menu = (c: ShopCategory): MenuItem[] => [
    { label: "Modifier", icon: <Pencil />, onClick: () => setEdit(c) },
    { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setDel(c) },
  ];
  const newCategory = () => setEdit({ name: "", slug: "", icon: "sparkles", is_active: true, sort_order: (cats.at(-1)?.sort_order ?? 0) + 1 });

  return (
    <div>
      <PageHeader
        title="Catégories de la boutique"
        subtitle="Rayons affichés sur la boutique en ligne (alimentation, accessoires…)."
        action={
          <Button icon={<Plus className="size-4" />} onClick={newCategory} disabled={loading}>
            Nouvelle catégorie
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
        <Card className="overflow-hidden">
          {cats.length === 0 ? (
            <EmptyState icon={<FolderTree />} title="Aucune catégorie" text="Créez une première catégorie pour classer vos produits." />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  head={
                    <tr>
                      <th className="w-20">Ordre</th>
                      <th>Catégorie</th>
                      <th>Slug</th>
                      <th>Produits</th>
                      <th>Statut</th>
                      <th className="w-12" />
                    </tr>
                  }
                >
                  {cats.map((c) => (
                    <tr key={c.id}>
                      <td className="tabular-nums font-semibold text-navy">{c.sort_order}</td>
                      <td>
                        <CatName category={c} />
                      </td>
                      <td className="font-mono text-xs text-slate-500">{c.slug}</td>
                      <td className="tabular-nums">{nb(c)}</td>
                      <td>{c.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}</td>
                      <td>
                        <ActionMenu items={menu(c)} label={`Actions pour ${c.name}`} />
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {cats.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <CatName category={c} />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {c.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}
                        <span>
                          {plural(nb(c))} · ordre {c.sort_order}
                        </span>
                      </div>
                    </div>
                    <ActionMenu items={menu(c)} label={`Actions pour ${c.name}`} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
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
            nb(del) > 0
              ? `La catégorie « ${del.name} » sera supprimée. Ses ${plural(nb(del))} resteront en vente mais n'auront plus de catégorie : pensez à les reclasser.`
              : `La catégorie « ${del.name} » sera supprimée définitivement.`
          }
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("shop_categories").delete().eq("id", del.id);
            if (err) throw new Error(errorMessage(err));
            toast(`Catégorie « ${del.name} » supprimée`);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CatName({ category: c }: { category: ShopCategory }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <CategoryIcon icon={c.icon} className="size-5" />
      </span>
      <span className="truncate font-semibold text-navy">{c.name}</span>
    </span>
  );
}

function CategoryModal({ value, onClose, onSaved }: { value: Partial<ShopCategory>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = !value.id;
  const [name, setName] = useState(value.name ?? "");
  const [slug, setSlug] = useState(value.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [icon, setIcon] = useState(value.icon ?? "sparkles");
  const [order, setOrder] = useState(String(value.sort_order ?? 0));
  const [active, setActive] = useState(value.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setErr("Le nom est obligatoire.");
    const s = slugify(slug || name);
    if (!s) return setErr("Slug invalide : utilisez des lettres, chiffres et tirets.");
    setBusy(true);
    setErr(null);
    try {
      const payload = { name: name.trim(), slug: s, icon: icon || null, sort_order: Math.trunc(Number(order)) || 0, is_active: active };
      const sb = getSupabase();
      const { error } = isNew ? await sb.from("shop_categories").insert(payload) : await sb.from("shop_categories").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? "Ce slug est déjà utilisé par une autre catégorie." : errorMessage(error));
      toast(isNew ? `Catégorie « ${payload.name} » ajoutée` : `Catégorie « ${payload.name} » modifiée`);
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
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom" required>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Ex. Alimentation"
          />
        </Field>
        <div className="grid grid-cols-[1fr_120px] gap-4">
          <Field label="Slug" hint="Utilisé dans les adresses du site (minuscules, tirets).">
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="alimentation"
              className="font-mono"
            />
          </Field>
          <Field label="Ordre">
            <Input type="number" step={1} value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-1.5">
          <span className="block text-[12.5px] font-medium text-slate-700">Icône</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <CategoryIcon icon={icon} className="size-6" />
          </span>
          <span>
            Aperçu : <strong className="text-navy">{name || "Nom"}</strong>
          </span>
        </div>
        <Checkbox label="Catégorie active (visible sur le site)" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}
