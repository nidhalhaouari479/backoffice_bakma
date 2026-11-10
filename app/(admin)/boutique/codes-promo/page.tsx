"use client";

import { useMemo, useState } from "react";
import { BadgePercent, CalendarClock, Copy, Infinity as InfinityIcon, Package, Pencil, Plus, Power, Save, Search, Shuffle, Ticket, Trash2, Users } from "lucide-react";
import { ActionMenu, ConfirmDialog, DataTable, ErrorState, PageHeader, type MenuItem } from "@/components/admin-ui";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, KpiCard, Modal, PageLoader, Textarea, cn, useToast } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatTnd, type Tone } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { PromoCode } from "@/lib/types";

type ProductLite = { id: string; name: string; price: number; images: string[] | null; is_active: boolean };
type Usage = { uses: number; users: number; discount: number };

/** État d'un code à l'instant t. */
function codeState(c: PromoCode, u: Usage | undefined, now: number): { label: string; tone: Tone } {
  if (!c.is_active) return { label: "Désactivé", tone: "grey" };
  if (new Date(c.starts_at).getTime() > now) return { label: "Programmé", tone: "blue" };
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return { label: "Expiré", tone: "red" };
  if (c.max_users != null && (u?.users ?? 0) >= c.max_users) return { label: "Épuisé", tone: "orange" };
  return { label: "Actif", tone: "green" };
}

const limit = (n: number | null) => (n == null ? "∞" : String(n));

export default function CodesPromoPage() {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<PromoCode> | null>(null);
  const [del, setDel] = useState<PromoCode | null>(null);
  const [q, setQ] = useState("");

  const { data, error, loading, reload } = useAsync(async () => {
    const sb = getSupabase();
    const [codes, orders, products] = await Promise.all([
      sb.from("promo_codes").select("*").order("created_at", { ascending: false }),
      sb.from("orders").select("promo_code_id,user_id,discount,status").not("promo_code_id", "is", null).neq("status", "annulee").limit(20000),
      sb.from("products").select("id,name,price,images,is_active").order("name").limit(5000),
    ]);
    const usage: Record<string, Usage> = {};
    const seen: Record<string, Set<string>> = {};
    for (const o of must<{ promo_code_id: string; user_id: string; discount: number }[]>(orders)) {
      const u = (usage[o.promo_code_id] ??= { uses: 0, users: 0, discount: 0 });
      u.uses++;
      u.discount += Number(o.discount) || 0;
      (seen[o.promo_code_id] ??= new Set()).add(o.user_id);
      u.users = seen[o.promo_code_id].size;
    }
    return { codes: must<PromoCode[]>(codes), usage, products: must<ProductLite[]>(products), loadedAt: Date.now() };
  });

  const codes = useMemo(() => data?.codes ?? [], [data]);
  const now = data?.loadedAt ?? 0;
  const productName = useMemo(() => new Map((data?.products ?? []).map((p) => [p.id, p.name])), [data]);
  const shown = codes.filter((c) => !q.trim() || c.code.includes(q.trim().toUpperCase()) || (c.description ?? "").toLowerCase().includes(q.trim().toLowerCase()));

  const kpi = useMemo(() => {
    const u = Object.values(data?.usage ?? {});
    return {
      active: codes.filter((c) => codeState(c, data?.usage[c.id], now).label === "Actif").length,
      uses: u.reduce((s, x) => s + x.uses, 0),
      discount: u.reduce((s, x) => s + x.discount, 0),
    };
  }, [codes, data, now]);

  async function toggle(c: PromoCode) {
    const { error: err } = await getSupabase().from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (err) return toast(errorMessage(err), "error");
    toast(c.is_active ? `Code ${c.code} désactivé` : `Code ${c.code} activé`);
    reload();
  }

  const menu = (c: PromoCode): MenuItem[] => [
    { label: "Modifier", icon: <Pencil />, onClick: () => setEdit(c) },
    {
      label: "Copier le code",
      icon: <Copy />,
      onClick: () => {
        void navigator.clipboard?.writeText(c.code);
        toast(`« ${c.code} » copié`);
      },
    },
    { label: c.is_active ? "Désactiver" : "Activer", icon: <Power />, onClick: () => void toggle(c) },
    { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setDel(c) },
  ];

  const newCode = () => setEdit({ code: "", percent: 10, max_uses_per_user: 1, max_users: null, ends_at: null, product_ids: null, is_active: true });

  return (
    <div>
      <PageHeader
        title="Codes promo"
        subtitle="Réductions en % sur les produits de la boutique, saisies par le client au moment de commander."
        action={
          <Button icon={<Plus className="size-4" />} onClick={newCode} disabled={loading}>
            Nouveau code
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard icon={<Ticket />} label="Codes actifs" value={kpi.active} foot={`${codes.length} code${codes.length > 1 ? "s" : ""} au total`} />
            <KpiCard icon={<Users />} label="Utilisations" value={kpi.uses} tone="blue" foot="commandes non annulées" />
            <KpiCard icon={<BadgePercent />} label="Réductions accordées" value={formatTnd(kpi.discount)} tone="green" />
          </div>

          <Card className="overflow-hidden">
            {codes.length === 0 ? (
              <EmptyState
                icon={<Ticket />}
                title="Aucun code promo"
                text="Créez un code (ex. BIENVENUE10) : le client le saisit dans sa commande et obtient la réduction."
                action={
                  <Button icon={<Plus className="size-4" />} onClick={newCode}>
                    Nouveau code
                  </Button>
                }
              />
            ) : (
              <>
                <div className="border-b border-slate-100 p-4">
                  <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un code…" className="max-w-sm" />
                </div>
                <div className="hidden lg:block">
                  <DataTable
                    head={
                      <tr>
                        <th>Code</th>
                        <th>Réduction</th>
                        <th>Produits</th>
                        <th>Validité</th>
                        <th>Par client</th>
                        <th>Clients</th>
                        <th>Statut</th>
                        <th className="w-12" />
                      </tr>
                    }
                  >
                    {shown.map((c) => {
                      const u = data?.usage[c.id];
                      return (
                        <tr key={c.id}>
                          <td>
                            <CodeName c={c} />
                          </td>
                          <td className="font-semibold text-navy">−{Number(c.percent)} %</td>
                          <td className="text-sm">{scopeLabel(c, productName)}</td>
                          <td className="text-sm">{periodLabel(c)}</td>
                          <td className="tabular-nums">{limit(c.max_uses_per_user)} fois</td>
                          <td className="tabular-nums">
                            <span className="font-semibold text-navy">{u?.users ?? 0}</span> / {limit(c.max_users)}
                            <div className="text-xs text-slate-500">{u?.uses ?? 0} utilisation{(u?.uses ?? 0) > 1 ? "s" : ""}</div>
                          </td>
                          <td>
                            <StateBadge s={codeState(c, u, now)} />
                          </td>
                          <td>
                            <ActionMenu items={menu(c)} label={`Actions pour ${c.code}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </DataTable>
                </div>
                <ul className="divide-y divide-slate-100 lg:hidden">
                  {shown.map((c) => {
                    const u = data?.usage[c.id];
                    return (
                      <li key={c.id} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <CodeName c={c} />
                            <span className="font-semibold text-navy">−{Number(c.percent)} %</span>
                            <StateBadge s={codeState(c, u, now)} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {periodLabel(c)} · {scopeLabel(c, productName)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {limit(c.max_uses_per_user)} fois par client · {u?.users ?? 0} / {limit(c.max_users)} clients · {u?.uses ?? 0} utilisation
                            {(u?.uses ?? 0) > 1 ? "s" : ""}
                          </div>
                        </div>
                        <ActionMenu items={menu(c)} label={`Actions pour ${c.code}`} />
                      </li>
                    );
                  })}
                </ul>
                {shown.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Aucun code ne correspond à « {q} ».</p>}
              </>
            )}
          </Card>
        </div>
      )}

      {edit && (
        <PromoModal
          value={edit}
          products={data?.products ?? []}
          used={edit.id ? (data?.usage[edit.id]?.uses ?? 0) : 0}
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
          title={`Supprimer le code « ${del.code} » ?`}
          confirmLabel="Supprimer le code"
          message={
            (data?.usage[del.id]?.uses ?? 0) > 0
              ? "Ce code a déjà été utilisé : les commandes concernées gardent leur réduction. Pour simplement l'arrêter, désactivez-le plutôt."
              : "Le code sera supprimé définitivement."
          }
          onConfirm={async () => {
            const { error: err } = await getSupabase().from("promo_codes").delete().eq("id", del.id);
            if (err) throw new Error(errorMessage(err));
            toast(`Code ${del.code} supprimé`);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CodeName({ c }: { c: PromoCode }) {
  return (
    <span className="min-w-0">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 bg-primary-soft px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-primary">
        <Ticket className="size-3.5" />
        {c.code}
      </span>
      {c.description && <span className="mt-1 block truncate text-xs text-slate-500">{c.description}</span>}
    </span>
  );
}

function StateBadge({ s }: { s: { label: string; tone: Tone } }) {
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function periodLabel(c: PromoCode) {
  const from = formatDate(c.starts_at);
  return c.ends_at ? `Du ${from} au ${formatDate(new Date(new Date(c.ends_at).getTime() - 1).toISOString())}` : `Dès le ${from} · sans fin`;
}

function scopeLabel(c: PromoCode, names: Map<string, string>) {
  const ids = c.product_ids ?? [];
  if (!ids.length) return "Tous les produits";
  if (ids.length === 1) return names.get(ids[0]) ?? "1 produit";
  return `${ids.length} produits`;
}

// ------------------------------------------------------------------ formulaire
/** yyyy-mm-dd (heure locale) */
const toDay = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const randomCode = () => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "BAKMA" + Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
};

function PromoModal({
  value,
  products,
  used,
  onClose,
  onSaved,
}: {
  value: Partial<PromoCode>;
  products: ProductLite[];
  used: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const isNew = !value.id;
  const [code, setCode] = useState(value.code ?? "");
  const [description, setDescription] = useState(value.description ?? "");
  const [percent, setPercent] = useState(String(value.percent ?? 10));
  const [perUser, setPerUser] = useState<string>(value.max_uses_per_user == null ? "" : String(value.max_uses_per_user));
  const [perUserInf, setPerUserInf] = useState(!isNew && value.max_uses_per_user == null);
  const [maxUsers, setMaxUsers] = useState<string>(value.max_users == null ? "" : String(value.max_users));
  const [maxUsersInf, setMaxUsersInf] = useState(value.max_users == null);
  // début : « maintenant » ou une date
  const [startNow, setStartNow] = useState(isNew);
  const [startDay, setStartDay] = useState(toDay(value.starts_at ?? new Date().toISOString()));
  // fin : sans fin ou une date (incluse : le code reste valable toute la journée)
  const [noEnd, setNoEnd] = useState(!value.ends_at);
  const [endDay, setEndDay] = useState(value.ends_at ? toDay(new Date(new Date(value.ends_at).getTime() - 1).toISOString()) : "");
  const [allProducts, setAllProducts] = useState(!(value.product_ids?.length));
  const [picked, setPicked] = useState<Set<string>>(new Set(value.product_ids ?? []));
  const [pq, setPq] = useState("");
  const [active, setActive] = useState(value.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = products.filter((p) => !pq.trim() || p.name.toLowerCase().includes(pq.trim().toLowerCase()));

  async function save() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(c)) return setErr("Code : 3 à 30 caractères, lettres, chiffres, « - » ou « _ » (sans espace).");
    const pct = Number(percent.replace(",", "."));
    if (!(pct > 0 && pct <= 100)) return setErr("Le pourcentage doit être compris entre 1 et 100.");
    const pu = perUserInf ? null : Math.trunc(Number(perUser));
    if (!perUserInf && !(pu! >= 1)) return setErr("Nombre d'utilisations par client : au moins 1, ou cochez « Illimité ».");
    const mu = maxUsersInf ? null : Math.trunc(Number(maxUsers));
    if (!maxUsersInf && !(mu! >= 1)) return setErr("Nombre maximum de clients : au moins 1, ou cochez « Illimité ».");
    if (!startNow && !startDay) return setErr("Choisissez la date de début.");
    if (!noEnd && !endDay) return setErr("Choisissez la date de fin, ou cochez « Sans fin ».");
    if (!allProducts && picked.size === 0) return setErr("Choisissez au moins un produit, ou « Tous les produits ».");

    const startsAt = startNow ? (isNew ? new Date() : new Date(Math.min(Date.now(), new Date(value.starts_at!).getTime()))) : new Date(`${startDay}T00:00:00`);
    const endsAt = noEnd ? null : new Date(new Date(`${endDay}T00:00:00`).getTime() + 86_400_000); // fin de la journée choisie
    if (endsAt && endsAt <= startsAt) return setErr("La date de fin doit être après la date de début.");

    setBusy(true);
    setErr(null);
    try {
      const payload = {
        code: c,
        description: description.trim() || null,
        percent: pct,
        max_uses_per_user: pu,
        max_users: mu,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() ?? null,
        product_ids: allProducts ? null : [...picked],
        is_active: active,
      };
      const sb = getSupabase();
      const { error } = isNew ? await sb.from("promo_codes").insert({ ...payload, created_by: user?.id ?? null }) : await sb.from("promo_codes").update(payload).eq("id", value.id!);
      if (error) throw new Error(error.code === "23505" ? `Le code « ${c} » existe déjà.` : errorMessage(error));
      toast(isNew ? `Code ${c} créé` : `Code ${c} modifié`);
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
      size="lg"
      onClose={onClose}
      title={isNew ? "Nouveau code promo" : `Modifier le code ${value.code}`}
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
      <div className="space-y-5">
        {used > 0 && <Alert tone="blue">Ce code a déjà été utilisé {used} fois : les commandes passées gardent leur réduction, les changements valent pour les prochaines.</Alert>}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <Field label="Code" required hint="Ce que le client tape (majuscules, sans espace).">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="Ex. BIENVENUE10"
                maxLength={30}
                className="font-mono font-semibold tracking-wide"
              />
              <Button type="button" variant="outline" icon={<Shuffle className="size-4" />} onClick={() => setCode(randomCode())} aria-label="Générer un code">
                <span className="hidden sm:inline">Générer</span>
              </Button>
            </div>
          </Field>
          <Field label="Réduction" required>
            <Input type="number" min={1} max={100} step="0.5" value={percent} onChange={(e) => setPercent(e.target.value)} right="%" />
          </Field>
        </div>
        <Field label="Description interne (facultatif)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Ex. offre de lancement, partenariat Instagram…" className="min-h-16" />
        </Field>

        {/* limites */}
        <div className="grid gap-4 sm:grid-cols-2">
          <LimitField
            label="Utilisations par client"
            icon={<Users />}
            value={perUser}
            onChange={setPerUser}
            infinite={perUserInf}
            onInfinite={setPerUserInf}
            hint={perUserInf ? "Un client peut l'utiliser à chaque commande." : "Nombre de commandes par client avec ce code."}
          />
          <LimitField
            label="Nombre maximum de clients"
            icon={<Users />}
            value={maxUsers}
            onChange={setMaxUsers}
            infinite={maxUsersInf}
            onInfinite={setMaxUsersInf}
            hint={maxUsersInf ? "Aucune limite de clients." : "Ex. 100 : réservé aux 100 premiers clients."}
          />
        </div>

        {/* période */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
              <CalendarClock className="size-4 text-slate-400" /> Date de début
            </div>
            <Checkbox label="Dès aujourd'hui (maintenant)" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
            {!startNow && <Input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} />}
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
              <CalendarClock className="size-4 text-slate-400" /> Date de fin
            </div>
            <Checkbox label="Sans fin" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} />
            {!noEnd && <Input type="date" value={endDay} min={startNow ? toDay(new Date().toISOString()) : startDay} onChange={(e) => setEndDay(e.target.value)} />}
            {!noEnd && <p className="text-xs text-slate-500">Valable jusqu&apos;à la fin de cette journée.</p>}
          </div>
        </div>

        {/* produits */}
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
            <Package className="size-4 text-slate-400" /> Produits concernés
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { v: true, label: "Tous les produits" },
              { v: false, label: "Produits choisis" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setAllProducts(o.v)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  allProducts === o.v ? "border-primary bg-primary-soft text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                {o.label}
                {!o.v && picked.size > 0 && ` (${picked.size})`}
              </button>
            ))}
          </div>
          {!allProducts && (
            <div className="rounded-lg border border-slate-100">
              <div className="border-b border-slate-100 p-2">
                <Input icon={<Search />} value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Rechercher un produit…" />
              </div>
              <ul className="max-h-56 divide-y divide-slate-50 overflow-y-auto">
                {list.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <li key={p.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", on && "bg-primary-soft/50")}>
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-primary)]"
                          checked={on}
                          onChange={() =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            })
                          }
                        />
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="size-8 shrink-0 rounded-md border border-slate-100 object-cover" />
                        ) : (
                          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400">
                            <Package className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium text-navy">{p.name}</span>
                        {!p.is_active && <Badge tone="grey">Inactif</Badge>}
                        <span className="shrink-0 tabular-nums text-slate-500">{formatTnd(p.price)}</span>
                      </label>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="p-4 text-center text-xs text-slate-500">Aucun produit trouvé.</li>}
              </ul>
            </div>
          )}
        </div>

        <Checkbox label="Code actif (utilisable par les clients)" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}

function LimitField({
  label,
  icon,
  value,
  onChange,
  infinite,
  onInfinite,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  infinite: boolean;
  onInfinite: (v: boolean) => void;
  hint: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-700 [&>svg]:size-4 [&>svg]:text-slate-400">
        {icon} {label}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} step={1} value={infinite ? "" : value} onChange={(e) => onChange(e.target.value)} disabled={infinite} placeholder={infinite ? "∞" : "Ex. 1"} className="w-28" />
        <button
          type="button"
          onClick={() => onInfinite(!infinite)}
          aria-pressed={infinite}
          className={cn(
            "inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3 text-sm font-semibold transition",
            infinite ? "border-primary bg-primary-soft text-primary" : "border-slate-300 text-slate-600 hover:border-slate-400",
          )}
        >
          <InfinityIcon className="size-4" /> Illimité
        </button>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}
