// Utilitaires spécifiques au back-office administrateur (requêtes, couleurs, export).
import type { Tone } from "./labels";
import type { Category, RequestStatus, UserRole } from "./types";

// ------------------------------------------------------------------ sélections PostgREST (FK toujours nommées)
export const OWNER_EMBED =
  "owner:profiles!publication_requests_owner_id_fkey(id,full_name,avatar_url,city,status, contact:profile_contacts!profile_contacts_id_fkey(id,email,phone))";

export const REQUEST_LIST_SELECT =
  "*, animal:animals!publication_requests_animal_id_fkey(id,name,breed,age_value,age_unit,sex,cover_url,category_id,city,listing_type,status, category:categories!animals_category_id_fkey(*)), " +
  OWNER_EMBED +
  ", consultations!consultations_request_id_fkey(id,status,decision,vet_id,created_at)";

export const REQUEST_DETAIL_SELECT =
  "*, animal:animals!publication_requests_animal_id_fkey(*, category:categories!animals_category_id_fkey(*), photos:animal_photos!animal_photos_animal_id_fkey(*)), " +
  "owner:profiles!publication_requests_owner_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*)), " +
  "consultations!consultations_request_id_fkey(*, vet:profiles!consultations_vet_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*), veterinarian:veterinarians!veterinarians_profile_id_fkey(*)), " +
  "exams:consultation_exams!consultation_exams_consultation_id_fkey(*), vaccinations!vaccinations_consultation_id_fkey(*), " +
  "documents:consultation_documents!consultation_documents_consultation_id_fkey(*), photos:consultation_photos!consultation_photos_consultation_id_fkey(*))";

export const ANIMAL_LIST_SELECT =
  "*, category:categories!animals_category_id_fkey(*), owner:profiles!animals_owner_id_fkey(id,full_name,avatar_url,city)";

export const ANIMAL_FULL_SELECT =
  "*, category:categories!animals_category_id_fkey(*), owner:profiles!animals_owner_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*)), photos:animal_photos!animal_photos_animal_id_fkey(*)";

export const PROFILE_FULL_SELECT =
  "*, contact:profile_contacts!profile_contacts_id_fkey(*), veterinarian:veterinarians!veterinarians_profile_id_fkey(*)";

export const ACTIVITY_SELECT =
  "*, animal:animals!activity_log_animal_id_fkey(id,name,cover_url), actor:profiles!activity_log_actor_id_fkey(id,full_name)";

export const REPORT_SELECT =
  "*, reporter:profiles!reports_reporter_id_fkey(id,full_name,avatar_url), animal:animals!reports_animal_id_fkey(id,name,cover_url,status), reported_user:profiles!reports_reported_user_id_fkey(id,full_name,avatar_url)";

export const PURCHASE_SELECT =
  "*, animal:animals!purchases_animal_id_fkey(id,name,breed,age_value,age_unit,sex,cover_url,status,listing_type,price), " +
  "buyer:profiles!purchases_buyer_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*)), " +
  "seller:profiles!purchases_seller_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*))";

/** Achats demandant une action de l'admin : reçu à vérifier, litige, ou garantie échue (à verser). */
export function purchasesToHandleFilter(now = new Date()): string {
  return `status.in.(paiement_a_verifier,litige),and(status.eq.garantie,release_at.lte."${now.toISOString()}")`;
}

export const CONVERSATION_SELECT =
  "*, animal:animals!conversations_animal_id_fkey(id,name,cover_url), a:profiles!conversations_participant_a_fkey(*), b:profiles!conversations_participant_b_fkey(*)";

// ------------------------------------------------------------------ couleurs par catégorie (chips « Type »)
const CATEGORY_CHIP: Record<string, string> = {
  chiens: "bg-orange-50 text-orange-700",
  chats: "bg-violet-50 text-violet-700",
  rongeurs: "bg-emerald-50 text-emerald-700",
  oiseaux: "bg-blue-50 text-blue-700",
  poissons: "bg-cyan-50 text-cyan-700",
  reptiles: "bg-lime-50 text-lime-700",
  "animaux-de-ferme": "bg-amber-50 text-amber-800",
  autres: "bg-slate-100 text-slate-600",
};
const FALLBACK_CHIPS = Object.values(CATEGORY_CHIP);

export function categoryChipClass(cat: Pick<Category, "slug" | "id"> | null | undefined): string {
  if (!cat) return "bg-slate-100 text-slate-600";
  return CATEGORY_CHIP[cat.slug] ?? FALLBACK_CHIPS[cat.id % FALLBACK_CHIPS.length]!;
}

/** Libellé singulier d'une catégorie (« Chiens » → « Chien »), comme sur la maquette. */
export function categoryLabel(cat: Pick<Category, "name"> | null | undefined): string {
  if (!cat) return "—";
  const n = cat.name;
  if (n.includes(" ")) return n;
  return n.endsWith("s") || n.endsWith("x") ? n.slice(0, -1) : n;
}

/** Couleurs « hex » des statuts de demande (graphes SVG). */
export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  en_cours: "#f59e0b",
  approuvee: "#16b364",
  refusee: "#ef4444",
  annulee: "#94a3c4",
};

// ------------------------------------------------------------------ dates
export const DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** "2026-10-12" (valeur d'un <input type="date">) */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Lit la valeur d'un <input type="date"> en date locale. */
export function fromDateInput(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const yearFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export function formatRange(from: Date, to: Date): string {
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} – ${yearFmt.format(to)}`;
  }
  return `${shortFmt.format(from)} – ${yearFmt.format(to)}`;
}

export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0).replace(".", ",")} h`;
  return `${(h / 24).toFixed(1).replace(".", ",")} j`;
}

// ------------------------------------------------------------------ divers
/** Échappe une saisie utilisateur pour un filtre PostgREST `.or()` / `.ilike()`. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function siteUrl(path = ""): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

/** Télécharge un CSV (séparateur « ; » + BOM pour Excel FR). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

/** Variation en % entre deux valeurs. */
export function pctChange(cur: number, prev: number): number {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export const ROLE_TONE: Record<UserRole, Tone> = { particulier: "blue", veterinaire: "purple", admin: "orange" };
