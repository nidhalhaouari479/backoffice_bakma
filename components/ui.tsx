"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, PawPrint, X } from "lucide-react";
import { initials, type Tone } from "@/lib/labels";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ Button
type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success" | "soft";
const BTN: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-b from-primary to-primary-dark text-white shadow-sm hover:brightness-110",
  outline: "border border-line bg-white text-navy hover:border-primary hover:text-primary",
  ghost: "text-body hover:bg-primary-soft hover:text-primary",
  danger: "bg-red-500 text-white hover:bg-red-600",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  soft: "bg-primary-soft text-primary hover:brightness-95",
};
const SIZE = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base" };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, href, icon, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn)] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap",
    BTN[variant],
    SIZE[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

// ------------------------------------------------------------------ Form fields
export function Field({ label, error, hint, children, className }: { label?: string; error?: string | null; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && <span className="text-sm font-semibold text-navy">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-input)] border border-line bg-white text-sm text-navy placeholder:text-muted outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-page";

export function Input({ icon, right, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&>svg]:size-[18px]">{icon}</span>}
      <input className={cn(inputBase, "h-12", icon ? "pl-11" : "pl-4", right ? "pr-11" : "pr-4", className)} {...rest} />
      {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-28 px-4 py-3", className)} {...rest} />;
}

export function Select({ icon, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&>svg]:size-[18px]">{icon}</span>}
      <select className={cn(inputBase, "h-12 appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", icon ? "pl-11" : "pl-4", "select-chevron", className)} {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm text-body", className)}>
      <input type="checkbox" className="size-4 rounded accent-[var(--color-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

// ------------------------------------------------------------------ Card / Badge
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[0_4px_24px_rgba(15,40,90,0.06)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
      <div className="flex items-center gap-3">
        {icon && <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-5">{icon}</span>}
        <div>
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  grey: "bg-slate-100 text-slate-600",
  purple: "bg-violet-50 text-violet-700",
  teal: "bg-cyan-50 text-cyan-700",
};
const DOTS: Record<Tone, string> = {
  blue: "bg-blue-500",
  orange: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  grey: "bg-slate-400",
  purple: "bg-violet-500",
  teal: "bg-cyan-500",
};

export function Badge({ tone = "grey", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

/** Badge à partir d'une table de méta (ex: REQUEST_STATUS[status]) */
export function MetaBadge({ meta }: { meta: { label: string; tone: Tone } | undefined }) {
  if (!meta) return null;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ------------------------------------------------------------------ Avatar / images
export function Avatar({ src, name, size = 40, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name ?? ""} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
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
      <PawPrint className="size-1/3 max-h-12 max-w-12" />
    </div>
  );
}

// ------------------------------------------------------------------ Feedback
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-primary", className)} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-7">{icon ?? <PawPrint />}</span>
      <h4 className="text-base font-bold text-navy">{title}</h4>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: Tone; children: React.ReactNode }) {
  if (!children) return null;
  return <div className={cn("rounded-xl px-4 py-3 text-sm font-medium", TONES[tone])}>{children}</div>;
}

// ------------------------------------------------------------------ Modal
export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl" }[size];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("w-full rounded-[var(--radius-card)] bg-white shadow-2xl", w)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-page" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tabs / Pagination
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition [&>svg]:size-4",
            value === it.value ? "border-primary bg-primary-soft/60 text-primary" : "border-transparent text-muted hover:text-navy",
          )}
        >
          {it.icon}
          {it.label}
          {it.count != null && <span className="text-xs opacity-80">({it.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const btn = "grid size-9 place-items-center rounded-[10px] text-sm font-semibold transition";
  return (
    <div className="flex items-center gap-1.5">
      <button className={cn(btn, "border border-line text-muted hover:text-primary disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Précédent">
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)} className={cn(btn, p === page ? "bg-primary text-white" : "text-body hover:bg-primary-soft")}>
            {p}
          </button>
        ),
      )}
      <button className={cn(btn, "border border-line text-muted hover:text-primary disabled:opacity-40")} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Suivant">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Toasts
type Toast = { id: number; text: string; tone: "success" | "error" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg",
              t.tone === "success" && "bg-emerald-600",
              t.tone === "error" && "bg-red-600",
              t.tone === "info" && "bg-navy",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ------------------------------------------------------------------ KPI
export function KpiCard({ icon, value, label, tone = "blue", foot }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone?: Tone; foot?: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl [&>svg]:size-6", TONES[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className="text-3xl font-extrabold leading-none text-navy">{value}</div>
        <div className="mt-1 text-sm font-medium text-body">{label}</div>
        {foot && <div className="mt-1 text-xs text-muted">{foot}</div>}
      </div>
    </Card>
  );
}
