// Types alignés sur supabase/schema.sql

export type UserRole = "particulier" | "veterinaire" | "admin";
export type AccountStatus = "actif" | "suspendu";
export type AnimalSex = "male" | "femelle";
export type AgeUnit = "jours" | "semaines" | "mois" | "ans";
export type ListingType = "adoption" | "vente";
export type AnimalStatus =
  | "brouillon"
  | "en_verification"
  | "en_attente_approbation"
  | "publiee"
  | "refusee"
  | "annulee"
  | "adoptee"
  | "vendue";
export type RequestStatus = "en_cours" | "approuvee" | "refusee" | "annulee";
export type RequestStep = "soumise" | "verification_veterinaire" | "attente_approbation" | "publiee";
export type ConsultationStatus = "nouvelle" | "en_cours" | "terminee" | "a_revoir" | "annulee";
export type VetDecision = "approuve" | "refuse" | "a_revoir";
export type ExamResult = "normal" | "a_surveiller" | "anormal";
export type VaccinationStatus = "a_jour" | "a_faire" | "en_retard";
export type ReportStatus = "ouvert" | "en_cours" | "resolu" | "rejete";

export interface Profile {
  id: string;
  role: UserRole;
  status: AccountStatus;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  response_time: string | null;
  created_at: string;
  updated_at: string;
  // relations fréquentes (select avec jointures)
  contact?: ProfileContact | null;
  veterinarian?: Veterinarian | null;
}

/** Table privée : visible par soi-même, l'admin, et les parties d'une consultation. */
export interface ProfileContact {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface Veterinarian {
  profile_id: string;
  clinic_name: string | null;
  license_number: string | null;
  specialty: string | null;
  address: string | null;
  city: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

/** Rubrique de caractéristiques (Santé, Caractère, Besoins…) gérée par l'admin. */
export interface CharacteristicGroup {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  multiple: boolean;
  allow_custom: boolean;
  sort_order: number;
  options?: CharacteristicOption[];
}

export interface CharacteristicOption {
  id: number;
  group_id: number;
  label: string;
  icon: string | null;
  code: string | null;
  sort_order: number;
}

/** Valeurs choisies par rubrique : { "<slug>": ["libellé", …] } */
export type Characteristics = Record<string, string[]>;

export interface CategoryCount extends Category {
  total: number;
}

export interface City {
  id: number;
  name: string;
}

export interface Animal {
  id: string;
  owner_id: string;
  category_id: number | null;
  name: string;
  breed: string | null;
  age_value: number | null;
  age_unit: AgeUnit | null;
  sex: AnimalSex | null;
  size: string | null;
  weight_kg: number | null;
  color: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  short_description: string | null;
  description: string | null;
  why_adopt: string | null;
  vaccinated: boolean;
  dewormed: boolean;
  healthy: boolean;
  sterilized: boolean;
  traits: string[];
  needs: string[];
  characteristics: Characteristics;
  adoption_conditions: string | null;
  listing_type: ListingType;
  price: number;
  status: AnimalStatus;
  cover_url: string | null;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // relations fréquentes (select avec jointures)
  category?: Category | null;
  owner?: Profile | null;
  photos?: AnimalPhoto[];
}

export interface AnimalPhoto {
  id: string;
  animal_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface PublicationRequest {
  id: string;
  ref: string;
  animal_id: string;
  owner_id: string;
  status: RequestStatus;
  step: RequestStep;
  admin_note: string | null;
  refusal_reason: string | null;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  updated_at: string;
  animal?: Animal | null;
  owner?: Profile | null;
  consultations?: Consultation[];
}

export interface Consultation {
  id: string;
  request_id: string;
  animal_id: string;
  vet_id: string | null;
  status: ConsultationStatus;
  scheduled_at: string | null;
  consulted_at: string | null;
  summary: string | null;
  observations: string | null;
  weight_kg: number | null;
  temperature: number | null;
  decision: VetDecision | null;
  certified: boolean;
  review_reason: string | null;
  /** 3 dates proposées par le propriétaire ; le vétérinaire en choisit une pour accepter. */
  proposed_slots: string[];
  created_at: string;
  updated_at: string;
  animal?: Animal | null;
  vet?: Profile | null;
  request?: PublicationRequest | null;
  exams?: ConsultationExam[];
  vaccinations?: Vaccination[];
  documents?: ConsultationDocument[];
  photos?: ConsultationPhoto[];
}

export interface ConsultationExam {
  id: string;
  consultation_id: string;
  name: string;
  result: ExamResult;
  note: string | null;
  position: number;
}

export interface Vaccination {
  id: string;
  consultation_id: string | null;
  animal_id: string;
  name: string;
  status: VaccinationStatus;
  vaccinated_on: string | null;
  next_due_on: string | null;
}

export interface ConsultationDocument {
  id: string;
  consultation_id: string;
  title: string;
  file_path: string;
  file_name: string | null;
  kind: string | null;
  created_at: string;
}

export interface ConsultationPhoto {
  id: string;
  consultation_id: string;
  url: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  animal_id: string | null;
  participant_a: string;
  participant_b: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  animal?: Pick<Animal, "id" | "name" | "cover_url"> | null;
  a?: Profile | null;
  b?: Profile | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  animal_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  reporter?: Profile | null;
  animal?: Animal | null;
  reported_user?: Profile | null;
}

export interface ActivityLog {
  id: string;
  type: string;
  request_id: string | null;
  animal_id: string | null;
  actor_id: string | null;
  message: string | null;
  created_at: string;
  animal?: Pick<Animal, "id" | "name" | "cover_url"> | null;
  actor?: Pick<Profile, "id" | "full_name"> | null;
}

/** Document fourni par le propriétaire sur l'animal (bucket privé vet-documents). */
export interface AnimalDocument {
  id: string;
  animal_id: string;
  owner_id: string;
  title: string;
  file_path: string;
  file_name: string | null;
  created_at: string;
}

/** Pièce d'identité du propriétaire (visible par lui-même et les admins). */
export interface OwnerIdentity {
  profile_id: string;
  cin_number: string;
  cin_photo_path: string;
  updated_at: string;
}
