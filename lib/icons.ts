import { createElement, forwardRef } from "react";
import {
  Activity,
  Apple,
  Baby,
  BadgeCheck,
  Bath,
  Bird,
  Bone,
  Box,
  Brain,
  Bug,
  Car,
  Cat,
  Clock,
  Cookie,
  Dna,
  Dog,
  Droplets,
  Dumbbell,
  Egg,
  Feather,
  Fence,
  Fish,
  Flame,
  Footprints,
  HandHeart,
  Heart,
  HeartPulse,
  Hospital,
  House,
  Laugh,
  Leaf,
  Microscope,
  Moon,
  PawPrint,
  Pill,
  Puzzle,
  Rabbit,
  Rat,
  Ruler,
  Scissors,
  Shell,
  Shield,
  ShieldCheck,
  Smile,
  Snail,
  Snowflake,
  Sparkles,
  Squirrel,
  Star,
  Stethoscope,
  Sun,
  Syringe,
  Thermometer,
  ThumbsUp,
  Tractor,
  TreePine,
  Trees,
  Turtle,
  Users,
  Utensils,
  Volume2,
  Wheat,
  Worm,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Icônes proposées à l'admin (catégories, caractéristiques).
 * La clé est enregistrée en base (colonne `icon`) : ne pas renommer une clé existante.
 * Fichier identique dans spa/ et backoffice/.
 */
export const ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  // Animaux
  { key: "dog", label: "Chien", Icon: Dog },
  { key: "cat", label: "Chat", Icon: Cat },
  { key: "bird", label: "Oiseau", Icon: Bird },
  { key: "rabbit", label: "Lapin", Icon: Rabbit },
  { key: "rat", label: "Rongeur", Icon: Rat },
  { key: "squirrel", label: "Écureuil", Icon: Squirrel },
  { key: "fish", label: "Poisson", Icon: Fish },
  { key: "turtle", label: "Tortue", Icon: Turtle },
  { key: "snail", label: "Escargot", Icon: Snail },
  { key: "bug", label: "Insecte", Icon: Bug },
  { key: "worm", label: "Ver", Icon: Worm },
  { key: "shell", label: "Coquillage", Icon: Shell },
  { key: "feather", label: "Plume", Icon: Feather },
  { key: "egg", label: "Œuf", Icon: Egg },
  { key: "tractor", label: "Ferme", Icon: Tractor },
  { key: "fence", label: "Enclos", Icon: Fence },
  { key: "wheat", label: "Blé", Icon: Wheat },
  { key: "bone", label: "Os", Icon: Bone },
  { key: "paw-print", label: "Patte", Icon: PawPrint },
  // Santé
  { key: "heart-pulse", label: "Santé", Icon: HeartPulse },
  { key: "syringe", label: "Vaccin", Icon: Syringe },
  { key: "pill", label: "Médicament", Icon: Pill },
  { key: "scissors", label: "Ciseaux", Icon: Scissors },
  { key: "stethoscope", label: "Stéthoscope", Icon: Stethoscope },
  { key: "thermometer", label: "Thermomètre", Icon: Thermometer },
  { key: "activity", label: "Activité", Icon: Activity },
  { key: "microscope", label: "Analyse", Icon: Microscope },
  { key: "dna", label: "ADN", Icon: Dna },
  { key: "hospital", label: "Clinique", Icon: Hospital },
  { key: "shield-check", label: "Protégé", Icon: ShieldCheck },
  { key: "badge-check", label: "Certifié", Icon: BadgeCheck },
  // Caractère
  { key: "sparkles", label: "Étincelles", Icon: Sparkles },
  { key: "smile", label: "Sourire", Icon: Smile },
  { key: "laugh", label: "Rire", Icon: Laugh },
  { key: "heart", label: "Cœur", Icon: Heart },
  { key: "hand-heart", label: "Tendresse", Icon: HandHeart },
  { key: "zap", label: "Énergie", Icon: Zap },
  { key: "moon", label: "Calme", Icon: Moon },
  { key: "sun", label: "Soleil", Icon: Sun },
  { key: "puzzle", label: "Jeu", Icon: Puzzle },
  { key: "users", label: "Sociable", Icon: Users },
  { key: "baby", label: "Enfants", Icon: Baby },
  { key: "brain", label: "Intelligent", Icon: Brain },
  { key: "star", label: "Étoile", Icon: Star },
  { key: "thumbs-up", label: "Pouce", Icon: ThumbsUp },
  { key: "volume-2", label: "Bruyant", Icon: Volume2 },
  { key: "shield", label: "Protecteur", Icon: Shield },
  // Besoins
  { key: "house", label: "Maison", Icon: House },
  { key: "trees", label: "Jardin", Icon: Trees },
  { key: "tree-pine", label: "Nature", Icon: TreePine },
  { key: "leaf", label: "Feuille", Icon: Leaf },
  { key: "footprints", label: "Promenade", Icon: Footprints },
  { key: "dumbbell", label: "Exercice", Icon: Dumbbell },
  { key: "utensils", label: "Repas", Icon: Utensils },
  { key: "apple", label: "Alimentation", Icon: Apple },
  { key: "cookie", label: "Friandise", Icon: Cookie },
  { key: "droplets", label: "Eau", Icon: Droplets },
  { key: "bath", label: "Toilettage", Icon: Bath },
  { key: "box", label: "Cage", Icon: Box },
  { key: "ruler", label: "Espace", Icon: Ruler },
  { key: "clock", label: "Temps", Icon: Clock },
  { key: "car", label: "Transport", Icon: Car },
  { key: "snowflake", label: "Froid", Icon: Snowflake },
  { key: "flame", label: "Chaleur", Icon: Flame },
];

/**
 * Bibliothèque d'animaux (emoji couleur) pour les catégories : couvre les animaux
 * absents des pictogrammes ci-dessus (cheval, vache, chèvre, serpent…).
 * Clés préfixées par « e- » ; même règle : ne pas renommer une clé existante.
 */
export const ANIMAL_GROUPS = ["Compagnie", "Ferme", "Oiseaux", "Sauvages", "Reptiles & amphibiens", "Aquatiques", "Insectes & petites bêtes"] as const;
export type AnimalGroup = (typeof ANIMAL_GROUPS)[number];

export const ANIMALS: { key: string; label: string; emoji: string; group: AnimalGroup; tags?: string }[] = [
  // Compagnie
  { key: "e-dog-face", label: "Chien", emoji: "🐶", group: "Compagnie", tags: "chiot toutou" },
  { key: "e-dog", label: "Chien (entier)", emoji: "🐕", group: "Compagnie" },
  { key: "e-guide-dog", label: "Chien guide", emoji: "🦮", group: "Compagnie" },
  { key: "e-poodle", label: "Caniche", emoji: "🐩", group: "Compagnie" },
  { key: "e-cat-face", label: "Chat", emoji: "🐱", group: "Compagnie", tags: "chaton minou" },
  { key: "e-cat", label: "Chat (entier)", emoji: "🐈", group: "Compagnie" },
  { key: "e-black-cat", label: "Chat noir", emoji: "🐈‍⬛", group: "Compagnie" },
  { key: "e-rabbit-face", label: "Lapin", emoji: "🐰", group: "Compagnie" },
  { key: "e-rabbit", label: "Lapin (entier)", emoji: "🐇", group: "Compagnie" },
  { key: "e-hamster", label: "Hamster", emoji: "🐹", group: "Compagnie", tags: "rongeur cobaye gerbille" },
  { key: "e-mouse-face", label: "Souris", emoji: "🐭", group: "Compagnie", tags: "rongeur" },
  { key: "e-mouse", label: "Souris (entière)", emoji: "🐁", group: "Compagnie", tags: "rongeur" },
  { key: "e-rat", label: "Rat", emoji: "🐀", group: "Compagnie", tags: "rongeur" },
  { key: "e-chipmunk", label: "Écureuil", emoji: "🐿️", group: "Compagnie", tags: "rongeur" },
  { key: "e-hedgehog", label: "Hérisson", emoji: "🦔", group: "Compagnie" },
  { key: "e-otter", label: "Loutre / furet", emoji: "🦦", group: "Compagnie", tags: "furet" },
  { key: "e-paws", label: "Pattes", emoji: "🐾", group: "Compagnie", tags: "autres divers" },
  // Ferme
  { key: "e-horse-face", label: "Cheval", emoji: "🐴", group: "Ferme", tags: "équidé poney jument âne" },
  { key: "e-horse", label: "Cheval de course", emoji: "🐎", group: "Ferme", tags: "équidé" },
  { key: "e-cow-face", label: "Vache", emoji: "🐮", group: "Ferme", tags: "bovin" },
  { key: "e-cow", label: "Vache (entière)", emoji: "🐄", group: "Ferme", tags: "bovin" },
  { key: "e-ox", label: "Bœuf", emoji: "🐂", group: "Ferme", tags: "taureau bovin" },
  { key: "e-water-buffalo", label: "Buffle", emoji: "🐃", group: "Ferme", tags: "bovin" },
  { key: "e-pig-face", label: "Cochon", emoji: "🐷", group: "Ferme", tags: "porc" },
  { key: "e-pig", label: "Cochon (entier)", emoji: "🐖", group: "Ferme", tags: "porc" },
  { key: "e-sheep", label: "Mouton", emoji: "🐑", group: "Ferme", tags: "brebis agneau ovin" },
  { key: "e-ram", label: "Bélier", emoji: "🐏", group: "Ferme", tags: "ovin" },
  { key: "e-goat", label: "Chèvre", emoji: "🐐", group: "Ferme", tags: "bouc caprin" },
  { key: "e-camel", label: "Dromadaire", emoji: "🐪", group: "Ferme", tags: "chameau" },
  { key: "e-two-hump-camel", label: "Chameau", emoji: "🐫", group: "Ferme" },
  { key: "e-llama", label: "Lama", emoji: "🦙", group: "Ferme", tags: "alpaga" },
  { key: "e-chicken", label: "Poule", emoji: "🐔", group: "Ferme", tags: "volaille" },
  { key: "e-rooster", label: "Coq", emoji: "🐓", group: "Ferme", tags: "volaille" },
  { key: "e-hatching-chick", label: "Poussin", emoji: "🐣", group: "Ferme", tags: "volaille" },
  { key: "e-turkey", label: "Dinde", emoji: "🦃", group: "Ferme", tags: "volaille" },
  { key: "e-duck", label: "Canard", emoji: "🦆", group: "Ferme", tags: "volaille oie" },
  // Oiseaux
  { key: "e-bird", label: "Oiseau", emoji: "🐦", group: "Oiseaux", tags: "canari" },
  { key: "e-baby-chick", label: "Oisillon", emoji: "🐥", group: "Oiseaux" },
  { key: "e-parrot", label: "Perroquet", emoji: "🦜", group: "Oiseaux", tags: "perruche ara" },
  { key: "e-dove", label: "Colombe", emoji: "🕊️", group: "Oiseaux", tags: "pigeon" },
  { key: "e-eagle", label: "Aigle", emoji: "🦅", group: "Oiseaux", tags: "rapace faucon" },
  { key: "e-owl", label: "Hibou", emoji: "🦉", group: "Oiseaux", tags: "chouette rapace" },
  { key: "e-swan", label: "Cygne", emoji: "🦢", group: "Oiseaux" },
  { key: "e-peacock", label: "Paon", emoji: "🦚", group: "Oiseaux" },
  { key: "e-flamingo", label: "Flamant rose", emoji: "🦩", group: "Oiseaux" },
  { key: "e-penguin", label: "Pingouin", emoji: "🐧", group: "Oiseaux", tags: "manchot" },
  // Sauvages
  { key: "e-wolf", label: "Loup", emoji: "🐺", group: "Sauvages" },
  { key: "e-fox", label: "Renard", emoji: "🦊", group: "Sauvages" },
  { key: "e-raccoon", label: "Raton laveur", emoji: "🦝", group: "Sauvages" },
  { key: "e-lion", label: "Lion", emoji: "🦁", group: "Sauvages", tags: "félin" },
  { key: "e-tiger", label: "Tigre", emoji: "🐯", group: "Sauvages", tags: "félin" },
  { key: "e-leopard", label: "Léopard", emoji: "🐆", group: "Sauvages", tags: "félin guépard" },
  { key: "e-zebra", label: "Zèbre", emoji: "🦓", group: "Sauvages" },
  { key: "e-deer", label: "Cerf", emoji: "🦌", group: "Sauvages", tags: "biche gazelle" },
  { key: "e-bison", label: "Bison", emoji: "🦬", group: "Sauvages" },
  { key: "e-boar", label: "Sanglier", emoji: "🐗", group: "Sauvages" },
  { key: "e-giraffe", label: "Girafe", emoji: "🦒", group: "Sauvages" },
  { key: "e-elephant", label: "Éléphant", emoji: "🐘", group: "Sauvages" },
  { key: "e-rhino", label: "Rhinocéros", emoji: "🦏", group: "Sauvages" },
  { key: "e-hippo", label: "Hippopotame", emoji: "🦛", group: "Sauvages" },
  { key: "e-bear", label: "Ours", emoji: "🐻", group: "Sauvages" },
  { key: "e-polar-bear", label: "Ours polaire", emoji: "🐻‍❄️", group: "Sauvages" },
  { key: "e-koala", label: "Koala", emoji: "🐨", group: "Sauvages" },
  { key: "e-panda", label: "Panda", emoji: "🐼", group: "Sauvages" },
  { key: "e-sloth", label: "Paresseux", emoji: "🦥", group: "Sauvages" },
  { key: "e-skunk", label: "Mouffette", emoji: "🦨", group: "Sauvages" },
  { key: "e-badger", label: "Blaireau", emoji: "🦡", group: "Sauvages" },
  { key: "e-beaver", label: "Castor", emoji: "🦫", group: "Sauvages", tags: "rongeur" },
  { key: "e-kangaroo", label: "Kangourou", emoji: "🦘", group: "Sauvages" },
  { key: "e-bat", label: "Chauve-souris", emoji: "🦇", group: "Sauvages" },
  { key: "e-monkey-face", label: "Singe", emoji: "🐵", group: "Sauvages", tags: "primate" },
  { key: "e-monkey", label: "Singe (entier)", emoji: "🐒", group: "Sauvages", tags: "primate" },
  { key: "e-gorilla", label: "Gorille", emoji: "🦍", group: "Sauvages", tags: "primate" },
  { key: "e-orangutan", label: "Orang-outan", emoji: "🦧", group: "Sauvages", tags: "primate" },
  // Reptiles & amphibiens
  { key: "e-turtle", label: "Tortue", emoji: "🐢", group: "Reptiles & amphibiens" },
  { key: "e-lizard", label: "Lézard", emoji: "🦎", group: "Reptiles & amphibiens", tags: "gecko iguane caméléon" },
  { key: "e-snake", label: "Serpent", emoji: "🐍", group: "Reptiles & amphibiens", tags: "python couleuvre" },
  { key: "e-crocodile", label: "Crocodile", emoji: "🐊", group: "Reptiles & amphibiens", tags: "alligator" },
  { key: "e-frog", label: "Grenouille", emoji: "🐸", group: "Reptiles & amphibiens", tags: "crapaud amphibien" },
  // Aquatiques
  { key: "e-fish", label: "Poisson", emoji: "🐟", group: "Aquatiques" },
  { key: "e-tropical-fish", label: "Poisson tropical", emoji: "🐠", group: "Aquatiques", tags: "aquarium poisson rouge" },
  { key: "e-blowfish", label: "Poisson-globe", emoji: "🐡", group: "Aquatiques" },
  { key: "e-shark", label: "Requin", emoji: "🦈", group: "Aquatiques" },
  { key: "e-dolphin", label: "Dauphin", emoji: "🐬", group: "Aquatiques" },
  { key: "e-whale", label: "Baleine", emoji: "🐳", group: "Aquatiques" },
  { key: "e-seal", label: "Phoque", emoji: "🦭", group: "Aquatiques" },
  { key: "e-octopus", label: "Pieuvre", emoji: "🐙", group: "Aquatiques", tags: "poulpe" },
  { key: "e-squid", label: "Calmar", emoji: "🦑", group: "Aquatiques" },
  { key: "e-crab", label: "Crabe", emoji: "🦀", group: "Aquatiques" },
  { key: "e-lobster", label: "Homard", emoji: "🦞", group: "Aquatiques" },
  { key: "e-shrimp", label: "Crevette", emoji: "🦐", group: "Aquatiques" },
  { key: "e-shell", label: "Coquillage", emoji: "🐚", group: "Aquatiques" },
  // Insectes & petites bêtes
  { key: "e-bee", label: "Abeille", emoji: "🐝", group: "Insectes & petites bêtes", tags: "apiculture" },
  { key: "e-butterfly", label: "Papillon", emoji: "🦋", group: "Insectes & petites bêtes" },
  { key: "e-ladybug", label: "Coccinelle", emoji: "🐞", group: "Insectes & petites bêtes" },
  { key: "e-beetle", label: "Scarabée", emoji: "🪲", group: "Insectes & petites bêtes" },
  { key: "e-ant", label: "Fourmi", emoji: "🐜", group: "Insectes & petites bêtes" },
  { key: "e-cricket", label: "Grillon", emoji: "🦗", group: "Insectes & petites bêtes", tags: "sauterelle criquet" },
  { key: "e-caterpillar", label: "Chenille", emoji: "🐛", group: "Insectes & petites bêtes" },
  { key: "e-snail", label: "Escargot", emoji: "🐌", group: "Insectes & petites bêtes" },
  { key: "e-worm", label: "Ver", emoji: "🪱", group: "Insectes & petites bêtes" },
  { key: "e-spider", label: "Araignée", emoji: "🕷️", group: "Insectes & petites bêtes", tags: "mygale" },
  { key: "e-scorpion", label: "Scorpion", emoji: "🦂", group: "Insectes & petites bêtes" },
];

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Emoji rendu comme une icône Lucide (mêmes props de taille / className). */
function emojiIcon(emoji: string, label: string): LucideIcon {
  const C = forwardRef<SVGSVGElement, LucideProps>(function EmojiIcon({ size = 24, className, style }, ref) {
    return createElement(
      "svg",
      { ref, xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", className, style, "aria-hidden": true },
      createElement("text", { x: 12, y: 13, textAnchor: "middle", dominantBaseline: "central", fontSize: 20, fontFamily: EMOJI_FONT }, emoji),
    );
  });
  C.displayName = `Emoji(${label})`;
  return C as unknown as LucideIcon;
}

const BY_KEY: Record<string, LucideIcon> = Object.fromEntries(ICONS.map((i) => [i.key, i.Icon]));
for (const a of ANIMALS) BY_KEY[a.key] = emojiIcon(a.emoji, a.label);
BY_KEY.horse = Tractor; // ancienne valeur (catégorie « Animaux de ferme »)
BY_KEY.home = House;

/** Composant d'icône pour une clé enregistrée en base (patte par défaut). */
export function iconFor(key: string | null | undefined, fallback: LucideIcon = PawPrint): LucideIcon {
  return (key && BY_KEY[key]) || fallback;
}

/** Icône rendue à partir d'une clé enregistrée en base. */
export function AppIcon({ icon, fallback, ...props }: { icon: string | null | undefined; fallback?: LucideIcon } & Omit<LucideProps, "icon">) {
  return createElement(iconFor(icon, fallback), props);
}
