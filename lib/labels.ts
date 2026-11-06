import type {
  AgeUnit,
  AnimalSex,
  AnimalStatus,
  ConsultationStatus,
  ExamResult,
  ListingType,
  ReportStatus,
  RequestStatus,
  RequestStep,
  UserRole,
  VaccinationStatus,
  VetDecision,
} from "./types";

/** Tonalités utilisées par <Badge tone="..."> */
export type Tone = "blue" | "orange" | "green" | "red" | "grey" | "purple" | "teal";

type Meta = { label: string; tone: Tone };

export const ANIMAL_STATUS: Record<AnimalStatus, Meta> = {
  brouillon: { label: "Brouillon", tone: "grey" },
  en_verification: { label: "En vérification", tone: "orange" },
  en_attente_approbation: { label: "En attente d'approbation", tone: "purple" },
  publiee: { label: "Publiée", tone: "green" },
  refusee: { label: "Refusée", tone: "red" },
  annulee: { label: "Annulée", tone: "grey" },
  adoptee: { label: "Adoptée", tone: "teal" },
  vendue: { label: "Vendue", tone: "teal" },
};

export const REQUEST_STATUS: Record<RequestStatus, Meta> = {
  en_cours: { label: "En cours", tone: "orange" },
  approuvee: { label: "Approuvée", tone: "green" },
  refusee: { label: "Refusée", tone: "red" },
  annulee: { label: "Annulée", tone: "grey" },
};

export const REQUEST_STEPS: { key: RequestStep; label: string }[] = [
  { key: "soumise", label: "Demande soumise" },
  { key: "verification_veterinaire", label: "Vérification vétérinaire" },
  { key: "attente_approbation", label: "En attente d'approbation" },
  { key: "publiee", label: "Publiée" },
];

export const CONSULTATION_STATUS: Record<ConsultationStatus, Meta> = {
  nouvelle: { label: "Nouvelle", tone: "blue" },
  en_cours: { label: "En cours", tone: "orange" },
  terminee: { label: "Terminée", tone: "green" },
  a_revoir: { label: "À revoir", tone: "red" },
  annulee: { label: "Annulée", tone: "grey" },
};

export const VET_DECISION: Record<VetDecision, Meta> = {
  approuve: { label: "Approuvé", tone: "green" },
  refuse: { label: "Défavorable", tone: "red" },
  a_revoir: { label: "À revoir", tone: "orange" },
};

export const EXAM_RESULT: Record<ExamResult, Meta> = {
  normal: { label: "Normal", tone: "green" },
  a_surveiller: { label: "À surveiller", tone: "orange" },
  anormal: { label: "Anormal", tone: "red" },
};

export const VACCINATION_STATUS: Record<VaccinationStatus, Meta> = {
  a_jour: { label: "À jour", tone: "green" },
  a_faire: { label: "À faire", tone: "orange" },
  en_retard: { label: "En retard", tone: "red" },
};

export const REPORT_STATUS: Record<ReportStatus, Meta> = {
  ouvert: { label: "Ouvert", tone: "red" },
  en_cours: { label: "En cours", tone: "orange" },
  resolu: { label: "Résolu", tone: "green" },
  rejete: { label: "Rejeté", tone: "grey" },
};

export const LISTING_TYPE: Record<ListingType, Meta> = {
  adoption: { label: "À adopter", tone: "orange" },
  vente: { label: "À vendre", tone: "green" },
};

export const ROLE_LABEL: Record<UserRole, string> = {
  particulier: "Particulier",
  veterinaire: "Vétérinaire",
  admin: "Administrateur",
};

export const SEX_LABEL: Record<AnimalSex, string> = { male: "Mâle", femelle: "Femelle" };

export const AGE_UNIT_LABEL: Record<AgeUnit, string> = {
  jours: "jours",
  semaines: "semaines",
  mois: "mois",
  ans: "ans",
};

/** Examens proposés par défaut dans le rapport vétérinaire */
export const DEFAULT_EXAMS = [
  "Examen clinique général",
  "Température",
  "Poids",
  "État du pelage",
  "État dentaire",
  "État des oreilles",
];

export const DEFAULT_VACCINES = ["CHPPiL", "Rage", "Vermifuge", "Typhus", "Coryza", "Leucose"];

export const TRAIT_OPTIONS = ["Sociable", "Calme", "Joueur", "Affectueux", "Énergique", "Propre", "Bon avec les enfants", "Bon avec les autres animaux"];
export const NEED_OPTIONS = ["Espace extérieur", "Promenades régulières", "Alimentation adaptée", "Beaucoup d'attention", "Toilettage régulier", "Cage / aquarium"];

// ---------------------------------------------------------------- formatage

export function formatAge(value: number | null | undefined, unit: AgeUnit | null | undefined): string {
  if (value == null) return "Âge inconnu";
  const u = unit ?? "mois";
  if (u === "ans") return `${value} ${value > 1 ? "ans" : "an"}`;
  return `${value} ${AGE_UNIT_LABEL[u]}`;
}

export function formatPrice(price: number | null | undefined, type?: ListingType): string {
  if (type === "adoption" || !price) return "Gratuit";
  return `${new Intl.NumberFormat("fr-FR").format(price)} TND`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");
export const formatTime = (d: string | Date | null | undefined) => (d ? timeFmt.format(new Date(d)) : "");
export const formatDateTime = (d: string | Date | null | undefined) =>
  d ? `${formatDate(d)} à ${formatTime(d)}` : "—";
export const formatLongDate = (d: string | Date) => {
  const s = longDateFmt.format(new Date(d));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function timeAgo(d: string | Date): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `Il y a ${Math.floor(diff / 86400)} j`;
  return formatDate(d);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
