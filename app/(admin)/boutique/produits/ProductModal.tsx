"use client";

import { useMemo, useState } from "react";
import { FileText, ImageOff, Layers, ListPlus, Package, Plus, Save, Trash2, X } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { Alert, AnimalThumb, Button, Checkbox, cn, Field, Input, Modal, Select, Tabs, Textarea, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Product, ProductOption, ProductSpec, ProductVariant, ShopBrand, ShopCategory } from "@/lib/types";

type Section = "general" | "details" | "variantes";
type Errors = Partial<Record<"name" | "price" | "compare" | "stock" | "options" | "variants", string>>;

/** Ligne de déclinaison en cours d'édition (champs texte). */
interface VariantRow {
  id: string | null;
  price: string;
  compare: string;
  stock: string;
  sku: string;
  image: string | null;
  active: boolean;
}

const MAX_OPTIONS = 3;
const OPTION_PRESETS = ["Taille", "Couleur", "Poids", "Contenance", "Goût"];
const SPEC_PRESETS = ["Composition", "Constituants analytiques", "Poids net", "Dimensions", "Matière", "Âge recommandé", "Espèce", "Pays d'origine", "Conseils d'utilisation"];
const SEP = "\u0001";

function toNumber(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Toutes les combinaisons de valeurs, dans l'ordre des options. */
function combinations(options: ProductOption[]): string[][] {
  const opts = options.filter((o) => o.name.trim() && o.values.length);
  if (!opts.length) return [];
  return opts.reduce<string[][]>((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]]);
}

const emptyRow = (): VariantRow => ({ id: null, price: "", compare: "", stock: "0", sku: "", image: null, active: true });

export function ProductModal({ value, cats, brands, onClose, onSaved }: { value: Partial<Product>; cats: ShopCategory[]; brands: ShopBrand[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isNew = !value.id;
  const [section, setSection] = useState<Section>("general");

  // Général
  const [name, setName] = useState(value.name ?? "");
  const [brandId, setBrandId] = useState(value.brand_id != null ? String(value.brand_id) : "");
  const [categoryId, setCategoryId] = useState(value.category_id != null ? String(value.category_id) : "");
  const [shortDesc, setShortDesc] = useState(value.short_description ?? "");
  const [description, setDescription] = useState(value.description ?? "");
  const [price, setPrice] = useState(value.price != null ? String(value.price) : "");
  const [compare, setCompare] = useState(value.compare_at_price != null ? String(value.compare_at_price) : "");
  const [stock, setStock] = useState(value.stock != null ? String(value.stock) : "0");
  const [images, setImages] = useState<string[]>(value.images ?? []);
  const [active, setActive] = useState(value.is_active ?? true);
  const [featured, setFeatured] = useState(value.is_featured ?? false);

  // Détails
  const [specs, setSpecs] = useState<ProductSpec[]>(value.specs?.length ? value.specs : []);
  const [details, setDetails] = useState(value.details ?? "");
  const [detailImages, setDetailImages] = useState<string[]>(value.detail_images ?? []);

  // Déclinaisons
  const [options, setOptions] = useState<ProductOption[]>(value.options ?? []);
  const [rows, setRows] = useState<Record<string, VariantRow> | null>(isNew ? {} : null);

  const existing = useAsync(async () => {
    const list = must<ProductVariant[]>(await getSupabase().from("product_variants").select("*").eq("product_id", value.id!).order("sort_order"));
    const map: Record<string, VariantRow> = {};
    for (const v of list) {
      const key = (value.options ?? []).map((o) => v.options?.[o.name] ?? "").join(SEP);
      map[key] = {
        id: v.id,
        price: v.price != null ? String(v.price) : "",
        compare: v.compare_at_price != null ? String(v.compare_at_price) : "",
        stock: String(v.stock),
        sku: v.sku ?? "",
        image: v.image,
        active: v.is_active,
      };
    }
    setRows((r) => r ?? map);
    return list;
  }, isNew ? null : `variants:${value.id}`);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const combos = useMemo(() => combinations(options), [options]);
  const hasVariants = combos.length > 0;
  const variantsLoading = !isNew && rows === null;
  const rowOf = (combo: string[]) => rows?.[combo.join(SEP)] ?? emptyRow();
  const setRow = (combo: string[], patch: Partial<VariantRow>) => setRows((r) => ({ ...(r ?? {}), [combo.join(SEP)]: { ...((r ?? {})[combo.join(SEP)] ?? emptyRow()), ...patch } }));
  const totalStock = combos.reduce((n, c) => {
    const r = rowOf(c);
    return n + (r.active ? Math.max(0, Number(r.stock) || 0) : 0);
  }, 0);

  async function save() {
    const e: Errors = {};
    const p = toNumber(price);
    const c = toNumber(compare);
    const s = toNumber(stock);
    if (!name.trim()) e.name = "Le nom est obligatoire.";
    if (p == null || Number.isNaN(p) || p <= 0) e.price = "Indiquez un prix supérieur à 0.";
    if (c != null && (Number.isNaN(c) || (p != null && !Number.isNaN(p) && c <= p))) e.compare = "L'ancien prix doit être supérieur au prix de vente.";
    if (!hasVariants && (s == null || Number.isNaN(s) || s < 0 || !Number.isInteger(s))) e.stock = "Le stock doit être un nombre entier positif ou nul.";

    const cleanOptions = options.map((o) => ({ name: o.name.trim(), values: o.values })).filter((o) => o.name || o.values.length);
    if (cleanOptions.some((o) => !o.name)) e.options = "Donnez un nom à chaque option.";
    else if (cleanOptions.some((o) => !o.values.length)) e.options = "Ajoutez au moins une valeur à chaque option.";
    else if (new Set(cleanOptions.map((o) => o.name.toLowerCase())).size !== cleanOptions.length) e.options = "Deux options portent le même nom.";

    const variants = combos.map((combo, i) => {
      const r = rowOf(combo);
      const vp = toNumber(r.price);
      const vc = toNumber(r.compare);
      const vs = toNumber(r.stock);
      const effective = vp ?? p ?? 0;
      if (vp != null && (Number.isNaN(vp) || vp <= 0)) e.variants = `Prix invalide pour « ${combo.join(" / ")} ».`;
      if (vc != null && (Number.isNaN(vc) || vc <= effective)) e.variants = `L'ancien prix de « ${combo.join(" / ")} » doit être supérieur à son prix.`;
      if (vs == null || Number.isNaN(vs) || vs < 0 || !Number.isInteger(vs)) e.variants = `Stock invalide pour « ${combo.join(" / ")} ».`;
      return {
        id: r.id,
        options: Object.fromEntries(cleanOptions.map((o, k) => [o.name, combo[k]])),
        label: combo.join(" / "),
        sku: r.sku.trim() || null,
        price: vp == null || Number.isNaN(vp) ? null : round2(vp),
        compare_at_price: vc == null || Number.isNaN(vc) ? null : round2(vc),
        stock: vs ?? 0,
        image: r.image,
        is_active: r.active,
        sort_order: i,
      };
    });
    if (hasVariants && !variants.some((v) => v.is_active)) e.variants = "Activez au moins une déclinaison.";

    setErrors(e);
    if (Object.keys(e).length) {
      setSection(e.options || e.variants ? "variantes" : "general");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: name.trim(),
        brand_id: brandId ? Number(brandId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        short_description: shortDesc.trim() || null,
        description: description.trim() || null,
        price: round2(p!),
        compare_at_price: c == null ? null : round2(c),
        // produit à déclinaisons : stock recalculé en base (somme des déclinaisons)
        stock: hasVariants ? 0 : s!,
        images,
        is_active: active,
        is_featured: featured,
        details: details.trim() || null,
        specs: specs.map((x) => ({ label: x.label.trim(), value: x.value.trim() })).filter((x) => x.label && x.value),
        detail_images: detailImages,
        options: hasVariants ? cleanOptions : [],
      };
      const sb = getSupabase();
      let productId = value.id;
      if (isNew) {
        const { data, error } = await sb.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id as string;
      } else {
        const { error } = await sb.from("products").update(payload).eq("id", productId!);
        if (error) throw error;
      }
      if (hasVariants || (existing.data?.length ?? 0) > 0) {
        const { error } = await sb.rpc("set_product_variants", { p_product_id: productId, p_variants: hasVariants ? variants : [] });
        if (error) throw error;
      }
      toast(isNew ? `« ${payload.name} » ajouté au catalogue` : `« ${payload.name} » enregistré`);
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const detailCount = specs.filter((x) => x.label.trim() && x.value.trim()).length + (details.trim() ? 1 : 0) + detailImages.length;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? "Nouveau produit" : "Modifier le produit"}
      description={isNew ? "Le produit apparaît sur le site dès qu'il est visible et en stock." : value.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button loading={busy} onClick={save} icon={<Save className="size-4" />} disabled={variantsLoading}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="mb-5">
        <Tabs
          value={section}
          onChange={setSection}
          items={[
            { value: "general", label: "Général", icon: <Package /> },
            { value: "details", label: "Détails du produit", icon: <FileText />, count: detailCount || undefined },
            { value: "variantes", label: "Déclinaisons", icon: <Layers />, count: combos.length || undefined },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------ Général */}
      <div className={cn("space-y-4", section !== "general" && "hidden")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Croquettes chat adulte 2 kg" />
          </Field>
          <Field label="Marque" hint={brands.length ? undefined : "Créez d'abord vos marques dans Boutique > Marques."}>
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Sans marque</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Catégorie">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sans catégorie</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description courte" hint="Une ligne affichée sous le nom dans la liste des produits.">
          <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} maxLength={160} />
        </Field>
        <Field label="Description" hint="Onglet « Description » de la fiche produit.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Présentation du produit, bénéfices…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prix" required error={errors.price} hint={hasVariants ? "Prix par défaut des déclinaisons." : undefined}>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} right="TND" placeholder="0" />
          </Field>
          <Field label="Ancien prix (barré)" error={errors.compare} hint="Facultatif : affiché barré.">
            <Input inputMode="decimal" value={compare} onChange={(e) => setCompare(e.target.value)} right="TND" />
          </Field>
          <Field label="Stock" required={!hasVariants} error={errors.stock} hint={hasVariants ? "Somme des déclinaisons." : undefined}>
            <Input type="number" min={0} step={1} value={hasVariants ? String(totalStock) : stock} onChange={(e) => setStock(e.target.value)} disabled={hasVariants} />
          </Field>
        </div>
        {/* pas de <Field> (label) ici : un clic sur le libellé déclencherait le premier bouton de l'uploader */}
        <div className="space-y-1.5">
          <span className="block text-[12.5px] font-medium text-slate-700">Photos</span>
          {user && <ImageUploader bucket="shop-images" userId={user.id} folder="products" value={images} onChange={setImages} max={8} />}
        </div>
        <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3">
          <Checkbox label="Visible sur le site" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <Checkbox label="Mettre en avant (page d'accueil de la boutique)" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        </div>
      </div>

      {/* ------------------------------------------------------------ Détails */}
      <div className={cn("space-y-5", section !== "details" && "hidden")}>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-slate-700">Caractéristiques</span>
            <Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => setSpecs((l) => [...l, { label: "", value: "" }])}>
              Ajouter une ligne
            </Button>
          </div>
          {specs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
              Tableau affiché dans l&apos;onglet « Détails du produit » : composition, poids, dimensions…
            </p>
          ) : (
            <ul className="space-y-2">
              {specs.map((sp, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
                  <Input list="spec-presets" value={sp.label} placeholder="Libellé" onChange={(e) => setSpecs((l) => l.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                  <Input value={sp.value} placeholder="Valeur" onChange={(e) => setSpecs((l) => l.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" onClick={() => setSpecs((l) => l.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la ligne">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <datalist id="spec-presets">
            {SPEC_PRESETS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <Field label="Informations complémentaires" hint="Texte libre : conseils d'utilisation, ration journalière, précautions…">
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} />
        </Field>
        <div className="space-y-1.5">
          <span className="block text-[12.5px] font-medium text-slate-700">Visuels détaillés</span>
          <p className="text-xs text-slate-500">Étiquette, tableau nutritionnel, guide des tailles… affichés en grand dans l&apos;onglet.</p>
          {user && <ImageUploader bucket="shop-images" userId={user.id} folder="product-details" value={detailImages} onChange={setDetailImages} max={6} />}
        </div>
      </div>

      {/* ------------------------------------------------------------ Déclinaisons */}
      <div className={cn("space-y-5", section !== "variantes" && "hidden")}>
        <div>
          <p className="text-sm text-slate-600">
            Ajoutez des options (taille, couleur…) si le produit existe en plusieurs versions. Chaque combinaison a son propre stock et, si besoin, son prix et sa photo.
          </p>
          <div className="mt-3 space-y-3">
            {options.map((o, i) => (
              <OptionEditor
                key={i}
                option={o}
                onChange={(next) => setOptions((l) => l.map((x, k) => (k === i ? next : x)))}
                onRemove={() => setOptions((l) => l.filter((_, k) => k !== i))}
              />
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Ajouter une option :</span>
              {OPTION_PRESETS.filter((n) => !options.some((o) => o.name.toLowerCase() === n.toLowerCase())).map((n) => (
                <Button key={n} size="sm" variant="outline" onClick={() => setOptions((l) => [...l, { name: n, values: [] }])}>
                  {n}
                </Button>
              ))}
              <Button size="sm" variant="ghost" icon={<ListPlus className="size-4" />} onClick={() => setOptions((l) => [...l, { name: "", values: [] }])}>
                Autre
              </Button>
            </div>
          )}
          {errors.options && (
            <div className="mt-3">
              <Alert>{errors.options}</Alert>
            </div>
          )}
        </div>

        {variantsLoading ? (
          <p className="text-sm text-slate-500">Chargement des déclinaisons…</p>
        ) : (
          hasVariants && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-slate-700">
                  {combos.length} déclinaison{combos.length > 1 ? "s" : ""} · stock total {totalStock}
                </span>
                <BulkFill
                  onApply={(field, v) =>
                    setRows((r) => {
                      const next = { ...(r ?? {}) };
                      for (const c of combos) next[c.join(SEP)] = { ...(next[c.join(SEP)] ?? emptyRow()), [field]: v };
                      return next;
                    })
                  }
                />
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Déclinaison</th>
                      <th className="px-2 py-2">Photo</th>
                      <th className="px-2 py-2">Prix</th>
                      <th className="px-2 py-2">Ancien prix</th>
                      <th className="px-2 py-2">Stock</th>
                      <th className="px-2 py-2">Réf. (SKU)</th>
                      <th className="px-2 py-2 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {combos.map((combo) => {
                      const r = rowOf(combo);
                      return (
                        <tr key={combo.join(SEP)} className={cn(!r.active && "bg-slate-50/70 text-slate-400")}>
                          <td className="px-3 py-2 font-semibold text-navy">{combo.join(" / ")}</td>
                          <td className="px-2 py-2">
                            <VariantImagePicker images={images} value={r.image} onChange={(img) => setRow(combo, { image: img })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input inputMode="decimal" className="h-9 w-24" placeholder={price || "—"} value={r.price} onChange={(e) => setRow(combo, { price: e.target.value })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input inputMode="decimal" className="h-9 w-24" value={r.compare} onChange={(e) => setRow(combo, { compare: e.target.value })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min={0} step={1} className="h-9 w-20" value={r.stock} onChange={(e) => setRow(combo, { stock: e.target.value })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 w-28" value={r.sku} onChange={(e) => setRow(combo, { sku: e.target.value })} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={r.active} onChange={(e) => setRow(combo, { active: e.target.checked })} aria-label={`Activer ${combo.join(" / ")}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">Prix vide = prix du produit. Une déclinaison désactivée n&apos;est pas proposée sur le site.</p>
            </div>
          )
        )}
        {errors.variants && <Alert>{errors.variants}</Alert>}
        {existing.error && <Alert>{existing.error}</Alert>}
      </div>

      {err && (
        <div className="mt-4">
          <Alert>{err}</Alert>
        </div>
      )}
    </Modal>
  );
}

/** Option (nom + valeurs saisies comme des étiquettes : Entrée ou virgule pour ajouter). */
function OptionEditor({ option, onChange, onRemove }: { option: ProductOption; onChange: (o: ProductOption) => void; onRemove: () => void }) {
  const [draft, setDraft] = useState("");
  function addValues(raw: string) {
    const vals = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const next = [...option.values];
    for (const v of vals) if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
    onChange({ ...option, values: next });
    setDraft("");
  }
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <Input className="h-9 max-w-48 font-semibold" value={option.name} placeholder="Nom de l'option" onChange={(e) => onChange({ ...option, name: e.target.value })} />
        <button type="button" onClick={onRemove} className="ml-auto grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer l'option">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {option.values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 py-1 pl-2.5 pr-1 text-sm font-medium text-navy">
            {v}
            <button type="button" onClick={() => onChange({ ...option, values: option.values.filter((x) => x !== v) })} className="grid size-5 place-items-center rounded text-slate-400 hover:text-red-600" aria-label={`Retirer ${v}`}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (e.target.value.includes(",") ? addValues(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValues(draft);
            } else if (e.key === "Backspace" && !draft && option.values.length) {
              onChange({ ...option, values: option.values.slice(0, -1) });
            }
          }}
          onBlur={() => draft.trim() && addValues(draft)}
          placeholder={option.values.length ? "Ajouter…" : option.name.toLowerCase() === "taille" ? "S, M, L, XL…" : "Valeurs, séparées par Entrée ou virgule"}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

/** Choix de la photo d'une déclinaison parmi les photos du produit. */
function VariantImagePicker({ images, value, onChange }: { images: string[]; value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-300 hover:border-primary"
        aria-label="Choisir la photo de la déclinaison"
        title={images.length ? "Choisir une photo" : "Ajoutez d'abord des photos dans l'onglet Général"}
      >
        {value ? <AnimalThumb src={value} alt="" className="size-full" /> : <ImageOff className="size-4" />}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 flex w-56 flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn("grid size-12 place-items-center rounded-lg border-2 text-slate-400", !value ? "border-primary" : "border-slate-100")}
              aria-label="Aucune photo"
            >
              <ImageOff className="size-4" />
            </button>
            {images.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => {
                  onChange(src);
                  setOpen(false);
                }}
                className={cn("size-12 overflow-hidden rounded-lg border-2", value === src ? "border-primary" : "border-transparent")}
              >
                <AnimalThumb src={src} alt="" className="size-full" />
              </button>
            ))}
            {!images.length && <p className="w-full px-1 text-xs text-slate-500">Ajoutez des photos dans l&apos;onglet Général.</p>}
          </div>
        </>
      )}
    </div>
  );
}

/** Remplir le même prix ou stock sur toutes les déclinaisons. */
function BulkFill({ onApply }: { onApply: (field: "price" | "stock", v: string) => void }) {
  const [field, setField] = useState<"price" | "stock">("stock");
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <Select value={field} onChange={(e) => setField(e.target.value as "price" | "stock")} className="h-9 w-28 text-xs" aria-label="Champ à remplir">
        <option value="stock">Stock</option>
        <option value="price">Prix</option>
      </Select>
      <Input className="h-9 w-20" value={v} onChange={(e) => setV(e.target.value)} inputMode="decimal" aria-label="Valeur pour toutes les déclinaisons" />
      <Button size="sm" variant="outline" disabled={!v.trim()} onClick={() => onApply(field, v.trim())}>
        Appliquer à tout
      </Button>
    </div>
  );
}
