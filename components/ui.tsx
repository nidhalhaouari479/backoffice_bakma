"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, Loader2, PawPrint, TriangleAlert, X } from "lucide-react";
import { initials, type Tone } from "@/lib/labels";

/*
 * Briques du design system back-office Bakma.
 * Une page n'écrit presque jamais de classes de style à la main : elle assemble ces composants.
 * Règles : une seule action primaire par zone, couleurs d'état réservées aux états,
 * pas d'effet de survol sur les données, aucune taille de texte sous 12 px.
 */

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-1";

// ------------------------------------------------------------------ Button
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSolid" | "success" | "soft";
const BTN: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-b from-primary-light to-primary text-white shadow-[var(--shadow-brand)] hover:from-primary hover:to-primary-dark",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-[var(--shadow-card)] hover:bg-slate-50 hover:text-navy",
  outline: "border border-slate-200 bg-white text-slate-700 shadow-[var(--shadow-card)] hover:bg-slate-50 hover:text-navy",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-navy",
  danger: "border border-rose-200 bg-white text-rose-600 shadow-[var(--shadow-card)] hover:border-rose-300 hover:bg-rose-50",
  dangerSolid: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
};
const SIZE = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-[13.5px]", lg: "h-10 px-4 text-sm" };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
};

/** Classes d'un bouton (pour un <Link> ou un <a> stylé comme un bouton). */
export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof SIZE = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    FOCUS,
    BTN[variant],
    SIZE[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", loading, href, icon, className, children, disabled, ...rest }: ButtonProps) {
  const cls = buttonClass(variant, size, className);
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}

/** Bouton carré avec icône seule : `label` obligatoire (aria-label + infobulle). */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = 36,
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label: string; icon: React.ReactNode; variant?: ButtonVariant; size?: 32 | 36 | 40 | 44 }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-lg transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]",
        FOCUS,
        BTN[variant],
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {icon}
    </button>
  );
}

// ------------------------------------------------------------------ Form fields
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && (
        <span className="block text-[12.5px] font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="block text-xs text-slate-500">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs font-medium text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[10px] border border-slate-300 bg-white text-[13.5px] text-navy shadow-[var(--shadow-card)] placeholder:text-slate-400 outline-none transition hover:border-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function Input({ icon, right, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:size-4">{icon}</span>}
      <input className={cn(inputClass, "h-[38px]", icon ? "pl-9" : "pl-3", right ? "pr-11" : "pr-3", className)} {...rest} />
      {right && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">{right}</span>}
    </div>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24 px-3 py-2", className)} {...rest} />;
}

export function Select({ icon, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:size-4">{icon}</span>}
      <select
        className={cn(inputClass, "select-chevron h-[38px] appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", icon ? "pl-9" : "pl-3", className)}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm text-slate-700", className)}>
      <input type="checkbox" className="size-4 rounded accent-[var(--color-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Champ de recherche avec loupe. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  label = "Rechercher",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputClass, "h-[38px] pl-9 pr-3")} />
    </div>
  );
}

// ------------------------------------------------------------------ Card / Badge
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-[18px]">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-navy">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  orange: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  grey: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-primary-soft text-primary-dark ring-primary/20",
};
const DOTS: Record<Tone, string> = {
  blue: "bg-sky-500",
  orange: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  grey: "bg-slate-400",
  purple: "bg-violet-500",
  teal: "bg-primary",
};
/** Tuile d'icône (36 px) d'une StatCard selon le ton. */
const TILES: Record<Tone, string> = {
  blue: "bg-sky-50 text-sky-600",
  orange: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-rose-50 text-rose-600",
  grey: "bg-slate-100 text-slate-500",
  purple: "bg-violet-50 text-violet-600",
  teal: "bg-primary-soft text-primary",
};

export function Badge({ tone = "grey", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Badge à partir d'une table de méta (ex: REQUEST_STATUS[status]) */
export function MetaBadge({ meta }: { meta: { label: string; tone: Tone } | undefined }) {
  if (!meta) return null;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Barre de progression 6 px : bleue, puis verte quand elle est complète. */
export function ProgressBar({ value, max = 100, label, className }: { value: number; max?: number; label?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ Avatar / images
export function Avatar({ src, name, size = 40, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name ?? ""} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary", className)}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden={!name}
    >
      {initials(name)}
    </span>
  );
}

export function AnimalThumb({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} className={cn("object-cover", className)} />
  ) : (
    <div className={cn("grid place-items-center bg-gradient-to-br from-primary-soft to-white text-primary/50", className)}>
      <PawPrint className="size-1/3 max-h-12 max-w-12" aria-hidden />
    </div>
  );
}

// ------------------------------------------------------------------ Chargement / états vides
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

/** Cinq lignes squelettes (avatar + deux barres + pilule) : jamais de grand spinner au centre. */
export function LoadingState({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn("divide-y divide-slate-100", className)}>
      <span className="sr-only">Chargement…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 py-2">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <Card>
        <LoadingState />
      </Card>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 [&>svg]:size-5" aria-hidden>
        {icon ?? <PawPrint />}
      </span>
      <h4 className="mt-1 text-sm font-semibold text-navy">{title}</h4>
      {text && <p className="max-w-sm text-[13px] text-slate-500">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: Tone; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-[13px] font-medium ring-1 ring-inset", TONES[tone])}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ Modal (feuille du bas sur mobile)
const MODAL_W = { sm: "md:max-w-md", md: "md:max-w-lg", lg: "md:max-w-2xl", xl: "md:max-w-4xl", "2xl": "md:max-w-6xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_W;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="bo-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-[3px] md:items-center md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "bo-modal-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[var(--shadow-pop)] md:max-h-[90vh] md:rounded-2xl",
          MODAL_W[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-[15px] font-semibold tracking-tight text-navy">
              {title}
            </h3>
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
          <IconButton label="Fermer" icon={<X />} onClick={onClose} size={32} className="-mr-1.5 -mt-1" />
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200/80 bg-slate-50/70 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Onglets segmentés / Pagination
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[] }) {
  return (
    <div className="scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#e9eff3] p-1">
      {items.map((it) => {
        const on = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.value)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition [&>svg]:size-4",
              FOCUS,
              on ? "bg-white text-navy shadow-[var(--shadow-card)]" : "text-slate-500 hover:text-navy",
            )}
          >
            {it.icon}
            {it.label}
            {it.count != null && (
              <span className={cn("rounded-full px-1.5 text-xs font-semibold tabular-nums leading-5", on ? "bg-primary-soft text-primary" : "bg-slate-200/70 text-slate-500")}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Alias explicite (nom du design system). */
export const FilterTabs = Tabs;

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const btn = cn("grid size-8 place-items-center rounded-lg text-[13px] font-semibold tabular-nums transition", FOCUS);
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button className={cn(btn, "border border-slate-200 bg-white text-slate-500 shadow-[var(--shadow-card)] hover:text-navy disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button key={p} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={cn(btn, p === page ? "bg-primary text-white shadow-[var(--shadow-brand)]" : "text-slate-600 hover:bg-slate-100")}>
            {p}
          </button>
        ),
      )}
      <button className={cn(btn, "border border-slate-200 bg-white text-slate-500 shadow-[var(--shadow-card)] hover:text-navy disabled:opacity-40")} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Page suivante">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

// ------------------------------------------------------------------ Toasts (jamais de alert() du navigateur)
type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; text: string; tone: ToastTone };
const ToastCtx = createContext<(text: string, tone?: ToastTone) => void>(() => {});

const TOAST_STYLE: Record<ToastTone, { bar: string; icon: React.ReactNode; ms: number }> = {
  success: { bar: "border-l-emerald-500", icon: <CircleCheck className="size-[18px] text-emerald-600" />, ms: 4500 },
  error: { bar: "border-l-rose-500", icon: <CircleAlert className="size-[18px] text-rose-600" />, ms: 7000 },
  info: { bar: "border-l-slate-400", icon: <Info className="size-[18px] text-slate-500" />, ms: 4500 },
  warning: { bar: "border-l-amber-500", icon: <TriangleAlert className="size-[18px] text-amber-600" />, ms: 4500 },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (text: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, text, tone }].slice(-4));
      setTimeout(() => dismiss(id), TOAST_STYLE[tone].ms);
    },
    [dismiss],
  );
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-5 md:top-5 md:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn("bo-page-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-l-4 border-slate-200 bg-white py-3 pl-3 pr-2 shadow-[var(--shadow-pop)]", TOAST_STYLE[t.tone].bar)}
          >
            <span className="mt-px shrink-0">{TOAST_STYLE[t.tone].icon}</span>
            <p className="min-w-0 flex-1 whitespace-pre-line text-[13px] font-medium text-slate-700">{t.text}</p>
            <button onClick={() => dismiss(t.id)} className="grid size-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fermer la notification">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ------------------------------------------------------------------ Indicateurs chiffrés
/** StatCard : libellé en haut à gauche, tuile d'icône 36 px à droite, valeur 24 px. Seule carte qui bouge (si cliquable). */
export function KpiCard({
  icon,
  value,
  label,
  tone = "teal",
  foot,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tone?: Tone;
  foot?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const valueTone: Partial<Record<Tone, string>> = { green: "text-emerald-700", red: "text-rose-600", orange: "text-amber-700" };
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl [&>svg]:size-[18px]", TILES[tone])} aria-hidden>
          {icon}
        </span>
      </div>
      <div className={cn("mt-1 text-2xl font-semibold leading-none tabular-nums text-navy", valueTone[tone])}>{value}</div>
      {foot && <div className="mt-2 text-xs text-slate-500">{foot}</div>}
    </>
  );
  const cls = cn("rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[var(--shadow-card)]", active && "ring-2 ring-primary/60");
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cn(cls, FOCUS, "w-full transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]")}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export const StatCard = KpiCard;

/** Le KPI vedette (un seul par écran) : fond navy, halos bleu-vert et vert. */
export function HeroStat({ icon, value, label, hint, footer }: { icon?: React.ReactNode; value: React.ReactNode; label: string; hint?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0b1e2c] p-5 text-white shadow-[var(--shadow-lift)]">
      <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-primary/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-sale/25 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-white/70">{label}</span>
          {icon && <span className="grid size-9 place-items-center rounded-xl bg-white/10 [&>svg]:size-[18px]">{icon}</span>}
        </div>
        <div className="mt-2 text-[34px] font-semibold leading-none tabular-nums">{value}</div>
        {hint && <div className="mt-2 text-xs text-white/60">{hint}</div>}
        {footer && <div className="mt-4 border-t border-white/10 pt-3 text-[13px] text-white/80">{footer}</div>}
      </div>
    </div>
  );
}
