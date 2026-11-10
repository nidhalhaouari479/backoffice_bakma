"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Tag, Trash2 } from "lucide-react";
import { ActionMenu, ConfirmDialog, DataTable, ErrorState, PageHeader, type MenuItem } from "@/components/admin-ui";
import { ImageUploader } from "@/components/ImageUploader";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageLoader, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ShopBrand } from "@/lib/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const plural = (n: number) => `${n} produit${n > 1 ? "s" : ""}`;

export default function BoutiqueMarquesPage() {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<ShopBrand> | null>(null);
  const [del, setDel] = useState<ShopBrand | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const sb = getSupabase();
    const [brands, products] = await Promise.all([sb.from("shop_brands").select("*").order("sort_order").order("name"), sb.from("products").select("brand_id").limit(20000)]);
    const n: Record<number, number> = {};
    for (const p of must<{ brand_id: number | null }[]>(products)) if (p.brand_id != null) n[p.brand_id] = (n[p.brand_id] ?? 0) + 1;
    return { brands: must<ShopBrand[]>(brands), n };
  });

  const brands = data?.brands ?? [];
  const nb = (b: ShopBrand) => data?.n[b.id] ?? 0;
  const menu = (b: ShopBrand): MenuItem[] => [
    { label: "Modifier", icon: <Pencil />, onClick: () => setEdit(b) },
    { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setDel(b) },
  ];
  const newBrand = () => setEdit({ name: "", slug: "", logo_url: null, is_active: true, sort_order: (brands.at(-1)?.sort_order ?? 0) + 1 });

  return (
    <div>
      <PageHeader
        title="Marques"
        subtitle="Marques des produits de la boutique : elles alimentent le filtre « Marque » du site."
        action={
          <Button icon={<Plus className="size-4" />} onClick={newBrand} disabled={loading}>
            Nouvelle marque
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
          {brands.length === 0 ? (
            <EmptyState
              icon={<Tag />}
              title="Aucune marque"
              text="Créez vos marques puis associez-les à vos produits."
              action={
                <Button icon={<Plus className="size-4" />} onClick={newBrand}>
                  Nouvelle marque
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  head={
                    <tr>
                      <th className="w-20">Ordre</th>
                      <th>Marque</th>
                      <th>Slug</th>
                      <th>Produits</th>
                      <th>Statut</th>
                      <th className="w-12" />
                    </tr>
                  }
                >
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold tabular-nums text-navy">{b.sort_order}</td>
                      <td>
                        <BrandName brand={b} />
                      </td>
                      <td className="font-mono text-xs text-slate-500">{b.slug}</td>
                      <td className="tabular-nums">{nb(b)}</td>
                      <td>{b.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}</td>
                      <td>
                        <ActionMenu items={menu(b)} label={`Actions pour ${b.name}`} />
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {brands.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <BrandName brand={b} />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {b.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}
                        <span>
                          {plural(nb(b))} · ordre {b.sort_order}
                        </span>
                      </div>
                    </div>
                    <ActionMenu items={menu(b)} label={`Actions pour ${b.name}`} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {edit && (
        <BrandModal
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
          title={`Supprimer la marque « ${del.name} » ?`}
          confirmLabel="Supprimer la marque"
          message={
            nb(del) > 0
              ? `Ses ${plural(nb(del))} resteront en vente mais n'auront plus de marque. Pour la retirer du site sans toucher aux produits, rendez-la plutôt inactive.`
              : "La marque sera supprimée définitivement."
          }
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("shop_brands").delete().eq("id", del.id);
            if (err) throw new Error(errorMessage(err));
            toast(`Marque « ${del.name} » supprimée`);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BrandLogo({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-xl bg-primary-soft font-semibold text-primary" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function BrandName({ brand: b }: { brand: ShopBrand }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandLogo src={b.logo_url} name={b.name} />
      <span className="truncate font-semibold text-navy">{b.name}</span>
    </span>
  );
}

function BrandModal({ value, onClose, onSaved }: { value: Partial<ShopBrand>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isNew = !value.id;
  const [name, setName] = useState(value.name ?? "");
  const [slug, setSlug] = useState(value.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [logo, setLogo] = useState<string[]>(value.logo_url ? [value.logo_url] : []);
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
      const payload = { name: name.trim(), slug: s, logo_url: logo[0] ?? null, sort_order: Math.trunc(Number(order)) || 0, is_active: active };
      const sb = getSupabase();
      const { error } = isNew ? await sb.from("shop_brands").insert(payload) : await sb.from("shop_brands").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? "Ce nom ou ce slug est déjà utilisé par une autre marque." : errorMessage(error));
      toast(isNew ? `Marque « ${payload.name} » ajoutée` : `Marque « ${payload.name} » modifiée`);
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
      title={isNew ? "Nouvelle marque" : "Modifier la marque"}
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
            placeholder="Ex. Royal Canin"
          />
        </Field>
        <div className="grid grid-cols-[1fr_120px] gap-4">
          <Field label="Slug" hint="Utilisé dans l'adresse du filtre (minuscules, tirets).">
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="royal-canin"
              className="font-mono"
            />
          </Field>
          <Field label="Ordre">
            <Input type="number" step={1} value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
        </div>
        {/* pas de <Field> (label) : un clic sur le libellé déclencherait le bouton de l'uploader */}
        <div className="space-y-1.5">
          <span className="block text-[12.5px] font-medium text-slate-700">Logo (facultatif)</span>
          {user && <ImageUploader bucket="shop-images" userId={user.id} folder="brands" value={logo} onChange={setLogo} max={1} />}
        </div>
        <Checkbox label="Marque active (visible dans le filtre du site)" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}
