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
export type PurchaseStatus = "paiement_a_verifier" | "paiement_refuse" | "annulee" | "garantie" | "litige" | "versee" | "remboursee";

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
  /** nombre d'utilisateurs ayant mis l'animal en favori (trigger) */
  favorites_count: number;
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

/** Achat d'un animal : virement à Bakma, validé par l'admin, conservé pendant la garantie puis versé au vendeur. */
export interface Purchase {
  id: string;
  ref: string;
  animal_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: PurchaseStatus;
  receipt_path: string;
  receipt_name: string | null;
  buyer_note: string | null;
  payer_name: string | null;
  payer_account: string | null;
  hold_days: number;
  verified_at: string | null;
  verified_by: string | null;
  release_at: string | null;
  refusal_reason: string | null;
  dispute_reason: string | null;
  disputed_at: string | null;
  paid_out_at: string | null;
  paid_out_by: string | null;
  payout_reference: string | null;
  refunded_at: string | null;
  refund_reference: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  animal?: Animal | null;
  buyer?: (Profile & { contact?: ProfileContact | null }) | null;
  seller?: (Profile & { contact?: ProfileContact | null }) | null;
}

/** Vente vue par le vendeur (RPC my_sales) : aucune information sur l'acheteur. */
export interface Sale {
  id: string;
  ref: string;
  animal_id: string;
  animal_name: string;
  animal_cover: string | null;
  amount: number;
  status: PurchaseStatus;
  hold_days: number;
  created_at: string;
  verified_at: string | null;
  release_at: string | null;
  paid_out_at: string | null;
  payout_reference: string | null;
}

/** RIB du vendeur pour recevoir ses paiements (lui-même + admin). */
export interface PayoutAccount {
  profile_id: string;
  account_holder: string;
  bank_name: string | null;
  rib: string;
  updated_at: string;
}

/** settings.payment : compte Bakma qui reçoit les virements + durée de garantie. */
export interface PaymentSettings {
  bank_name?: string;
  account_holder?: string;
  rib?: string;
  hold_days?: number;
}

// ---------------------------------------------------------------- Boutique en ligne
export type OrderStatus = "nouvelle" | "confirmee" | "expediee" | "livree" | "annulee";

export interface ShopCategory {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/** Code promo boutique (limites null = illimité ; product_ids null/vide = tous les produits). */
export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  percent: number;
  max_uses_per_user: number | null;
  max_users: number | null;
  starts_at: string;
  ends_at: string | null;
  product_ids: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopBrand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: number | null;
  /** Marque liée (shop_brands) ; `brand` en est le nom, recopié automatiquement. */
  brand_id: number | null;
  name: string;
  brand: string | null;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  /** URLs publiques (bucket shop-images), la 1re = couverture. */
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  sold_count: number;
  created_at: string;
  updated_at: string;
  category?: Pick<ShopCategory, "id" | "name" | "icon"> | null;
  /** Onglet « Détails du produit » */
  details: string | null;
  specs: ProductSpec[];
  detail_images: string[];
  /** Déclinaisons : options (Taille, Couleur…) ; vide = produit simple, stock = somme des déclinaisons sinon */
  options: ProductOption[];
  rating_avg: number;
  rating_count: number;
  variants?: ProductVariant[];
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  options: Record<string, string>;
  label: string;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  image: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
  product?: Pick<Product, "id" | "name" | "images"> | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  variant_label: string | null;
  product_name: string;
  image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

/** Commande boutique : paiement à la livraison, prix et noms figés à la commande. */
export interface Order {
  id: string;
  ref: string;
  user_id: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  note: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  /** code promo utilisé (copie figée) et réduction appliquée sur les produits */
  promo_code_id: string | null;
  promo_code: string | null;
  promo_percent: number | null;
  discount: number;
  admin_note: string | null;
  cancel_reason: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

/** settings.shop : frais de livraison (null / 0 = jamais offerte). */
export interface ShopSettings {
  delivery_fee?: number;
  free_delivery_from?: number | null;
}
