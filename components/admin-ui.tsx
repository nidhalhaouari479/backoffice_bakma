"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  EllipsisVertical,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import { categoryChipClass, categoryLabel } from "@/lib/admin";
import { ANIMAL_GROUPS, ANIMALS, AppIcon, ICONS } from "@/lib/icons";
import { REQUEST_STATUS, REQUEST_STEPS, formatAge, SEX_LABEL } from "@/lib/labels";
import type { Animal, Category, Profile, ProfileContact, RequestStatus, RequestStep } from "@/lib/types";
import { AnimalThumb, Avatar, Button, Modal, Textarea, cn } from "./ui";

// ------------------------------------------------------------------ Titre de page
/** Début de chaque page : (retour / fil d'Ariane) → titre + description → actions à droite (une seule primaire). */
export function PageHeader({
  title,
  subtitle,
  action,
  back,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-navy">
          <ArrowLeft className="size-3.5" aria-hidden /> {back.label}
        </Link>
      ) : (
        eyebrow && <p className="mb-1 text-xs font-medium text-slate-500">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-navy sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13.5px] text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Erreur avec bouton « Réessayer »
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-rose-50 text-rose-600" aria-hidden>
        <CircleAlert className="size-5" />
      </span>
      <p role="alert" className="max-w-md text-sm font-medium text-navy">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Catégories
export function CategoryIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  return <AppIcon icon={icon} className={className} />;
}

// ------------------------------------------------------------------ Choix d'une icône (catégories, caractéristiques)
const PICTO_TAB = "Pictogrammes";
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** `animals` : ouvre sur la bibliothèque d'animaux (catégories) plutôt que sur les pictogrammes. */
export function IconPicker({ value, onChange, animals = false }: { value: string | null | undefined; onChange: (key: string) => void; animals?: boolean }) {
  const [tab, setTab] = useState<string>(() => {
    const current = ANIMALS.find((a) => a.key === value);
    if (current) return current.group;
    if (value && ICONS.some((i) => i.key === value)) return PICTO_TAB;
    return animals ? "Tous les animaux" : PICTO_TAB;
  });
  const [q, setQ] = useState("");
  const query = normalize(q.trim());

  const items: { key: string; label: string }[] = query
    ? [...ANIMALS, ...ICONS].filter((i) => normalize(`${i.label} ${"tags" in i ? (i.tags ?? "") : ""}`).includes(query))
    : tab === PICTO_TAB
      ? ICONS
      : tab === "Tous les animaux"
        ? ANIMALS
        : ANIMALS.filter((a) => a.group === tab);

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="space-y-2 border-b border-line bg-page/60 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un animal (cheval, chèvre, serpent…)"
            className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-navy outline-none focus:border-primary"
          />
        </div>
        {!query && (
          <div className="scrollbar-none -mx-0.5 flex gap-1 overflow-x-auto px-0.5">
            {["Tous les animaux", ...ANIMAL_GROUPS, PICTO_TAB].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setTab(g)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition",
                  tab === g ? "bg-primary text-white" : "bg-white text-body ring-1 ring-line hover:text-primary",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Aucune icône ne correspond à « {q} ».</p>
      ) : (
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto p-2 sm:grid-cols-8">
          {items.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={value === key}
              onClick={() => onChange(key)}
              className={cn(
                "grid aspect-square place-items-center rounded-lg transition",
                value === key ? "bg-primary text-white ring-2 ring-primary ring-offset-2" : "text-navy/70 hover:bg-primary-soft hover:text-primary",
              )}
            >
              <AppIcon icon={key} className="size-6" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryChip({ category, plural }: { category: Category | null | undefined; plural?: boolean }) {
  if (!category) return <span className="text-sm text-muted">—</span>;
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", categoryChipClass(category))}>
      {plural ? category.name : categoryLabel(category)}
    </span>
  );
}

// ------------------------------------------------------------------ Statuts de demande (avec icône comme la maquette)
const REQ_ICON: Record<RequestStatus, React.ComponentType<{ className?: string }>> = {
  en_cours: Clock,
  approuvee: CircleCheck,
  refusee: CircleX,
  annulee: CircleMinus,
};
const REQ_CLASS: Record<RequestStatus, string> = {
  en_cours: "bg-amber-50 text-amber-700",
  approuvee: "bg-emerald-50 text-emerald-700",
  refusee: "bg-red-50 text-red-600",
  annulee: "bg-slate-100 text-slate-600",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const I = REQ_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", REQ_CLASS[status])}>
      <I className="size-4" />
      {REQUEST_STATUS[status].label}
    </span>
  );
}

export function RequestStatusIcon({ status, className }: { status: RequestStatus; className?: string }) {
  const I = REQ_ICON[status];
  return <I className={className} />;
}

export function stepLabel(step: RequestStep): string {
  return REQUEST_STEPS.find((s) => s.key === step)?.label ?? step;
}

/** Stepper horizontal des 4 étapes du workflow. */
export function RequestStepper({ step, status }: { step: RequestStep; status: RequestStatus }) {
  const idx = REQUEST_STEPS.findIndex((s) => s.key === step);
  const stopped = status === "refusee" || status === "annulee";
  return (
    <ol className="flex w-full items-start">
      {REQUEST_STEPS.map((s, i) => {
        const done = i < idx || (i === idx && step === "publiee");
        const current = i === idx && !done;
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", i <= idx ? "bg-primary" : "bg-line")} />}
            <span
              className={cn(
                "relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-bold",
                done && "border-primary bg-primary text-white",
                current && !stopped && "border-primary bg-white text-primary",
                current && stopped && "border-red-400 bg-red-50 text-red-500",
                !done && !current && "border-line bg-white text-muted",
              )}
            >
              {done ? <Check className="size-4" /> : current && stopped ? <CircleX className="size-4" /> : i + 1}
            </span>
            <span className={cn("mt-2 px-1 text-[11px] font-semibold leading-tight sm:text-xs", done || current ? "text-navy" : "text-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ Cellules de table
type AnimalLite = Pick<Animal, "id" | "name" | "cover_url"> & Partial<Pick<Animal, "age_value" | "age_unit" | "sex" | "breed">>;

export function AnimalCell({ animal, href, thumbClass = "size-14" }: { animal: AnimalLite | null | undefined; href?: string; thumbClass?: string }) {
  if (!animal) return <span className="text-sm text-muted">Animal supprimé</span>;
  const meta = [animal.age_value != null ? formatAge(animal.age_value, animal.age_unit) : null, animal.sex ? SEX_LABEL[animal.sex] : null]
    .filter(Boolean)
    .join(" • ");
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <AnimalThumb src={animal.cover_url} alt={animal.name} className={cn("shrink-0 rounded-xl", thumbClass)} />
      <div className="min-w-0">
        <div className="truncate font-bold text-navy">{animal.name}</div>
        <div className="truncate text-xs text-muted">{meta || animal.breed || "—"}</div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
  );
}

type PersonLite = Pick<Profile, "id" | "full_name" | "avatar_url"> & { contact?: Pick<ProfileContact, "email" | "phone"> | null };

export function PersonCell({ person, href, sub }: { person: PersonLite | null | undefined; href?: string; sub?: React.ReactNode }) {
  if (!person) return <span className="text-sm text-muted">—</span>;
  const inner = (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar src={person.avatar_url} name={person.full_name} size={36} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-navy">{person.full_name || "Sans nom"}</div>
        <div className="truncate text-xs text-muted">{sub ?? person.contact?.email ?? person.contact?.phone ?? ""}</div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ------------------------------------------------------------------ Variation (KPI)
export function DeltaChip({ value, mode = "pct", invert }: { value: number; mode?: "pct" | "abs"; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const txt = `${value > 0 ? "+" : ""}${value}${mode === "pct" ? "%" : ""}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
        positive && "bg-emerald-50 text-emerald-700",
        negative && "bg-red-50 text-red-600",
        !positive && !negative && "bg-slate-100 text-slate-600",
      )}
    >
      {value > 0 && <ArrowUp className="size-3" />}
      {value < 0 && <ArrowDown className="size-3" />}
      {txt}
    </span>
  );
}

// ------------------------------------------------------------------ Donut SVG
export function Donut({ data, size = 180, thickness = 30, center }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f8" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d) => {
            if (!d.value) return null;
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label} : ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ Menu « ⋮ » (positionné en fixed pour ne pas être coupé par les tables)
export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

export function ActionMenu({ items, label = "Plus d'actions", trigger }: { items: MenuItem[]; label?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = visible.length * 40 + 12;
    const up = r.bottom + h > window.innerHeight - 8;
    setPos({ top: up ? r.top - h - 4 : r.bottom + 4, left: Math.max(8, r.right - 208), up });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "mousedown" && (panel.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!visible.length) return null;
  const itemCls = (it: MenuItem) =>
    cn(
      "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium transition [&>svg]:size-4",
      it.disabled ? "cursor-not-allowed opacity-40" : it.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100 hover:text-navy",
    );

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-navy focus-visible:ring-2 focus-visible:ring-focus/50"
      >
        {trigger ?? <EllipsisVertical className="size-5" />}
      </button>
      {open && pos && (
        <div ref={panel} role="menu" className="bo-fade-in fixed z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-pop)]" style={{ top: pos.top, left: pos.left }}>
          {visible.map((it) =>
            it.href && !it.disabled ? (
              it.external ? (
                <a key={it.label} href={it.href} target="_blank" rel="noreferrer" className={itemCls(it)} onClick={() => setOpen(false)}>
                  {it.icon}
                  {it.label}
                </a>
              ) : (
                <Link key={it.label} href={it.href} className={itemCls(it)} onClick={() => setOpen(false)}>
                  {it.icon}
                  {it.label}
                </Link>
              )
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={itemCls(it)}
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Confirmation (avec saisie optionnelle)
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  variant = "primary",
  input,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (text: string) => Promise<void> | void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "success";
  input?: { label: string; placeholder?: string; required?: boolean };
  children?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setText("");
    setErr(null);
    onClose();
  }

  async function confirm() {
    if (input?.required && !text.trim()) {
      setErr("Ce champ est obligatoire.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(text.trim());
      setText("");
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button variant={variant === "danger" ? "dangerSolid" : variant} onClick={confirm} loading={busy} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {message && (
          <div className="flex gap-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5",
                variant === "danger" ? "bg-rose-50 text-rose-600" : variant === "success" ? "bg-emerald-50 text-emerald-600" : "bg-primary-soft text-primary",
              )}
              aria-hidden
            >
              {variant === "danger" ? <CircleAlert /> : variant === "success" ? <CircleCheck /> : <Info />}
            </span>
            <div className="pt-1 text-sm text-slate-600">{message}</div>
          </div>
        )}
        {children}
        {input && (
          <label className="block space-y-1.5">
            <span className="block text-[12.5px] font-medium text-slate-700">
              {input.label}
              {input.required && <span className="text-rose-500"> *</span>}
            </span>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={input.placeholder} />
          </label>
        )}
        {err && <p role="alert" className="whitespace-pre-line text-[13px] font-medium text-rose-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Ligne clé / valeur
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-navy">{children ?? "—"}</dd>
    </div>
  );
}

// ------------------------------------------------------------------ Barre d'outils (recherche + filtres) au-dessus d'un tableau
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">{children}</div>;
}

export const Toolbar = FilterBar;

/** Tableau : en-tête collant 11,5 px en majuscules, cellules 13 px, lignes séparées, survol discret. */
export function DataTable({ head, children, className }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("custom-scrollbar overflow-x-auto", className)}>
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/95 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-slate-500 backdrop-blur [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
          {head}
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/80">
          {children}
        </tbody>
      </table>
    </div>
  );
}
