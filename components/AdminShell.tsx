"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ChartColumn,
  FileText,
  Flag,
  FolderTree,
  House,
  LogOut,
  MessageCircle,
  MessageSquareText,
  Package,
  PawPrint,
  Settings,
  Shapes,
  ShieldAlert,
  ShoppingCart,
  Stethoscope,
  Tag,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { purchasesToHandleFilter } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";
import { Logo } from "./Logo";
import { AppFrame, type NavGroup } from "./shell/AppFrame";
import { Button, Card, PageLoader } from "./ui";

// ------------------------------------------------------------------ compteurs partagés (badges sidebar + cloche)
type Counts = { requests: number; purchases: number; orders: number; vets: number; messages: number; reports: number; notifications: number };
const EMPTY: Counts = { requests: 0, purchases: 0, orders: 0, vets: 0, messages: 0, reports: 0, notifications: 0 };

const CountsCtx = createContext<{ counts: Counts; refresh: () => void }>({ counts: EMPTY, refresh: () => {} });
export const useAdminCounts = () => useContext(CountsCtx);

async function fetchCounts(uid: string): Promise<Counts> {
  const supabase = getSupabase();
  const head = { count: "exact" as const, head: true };
  const convs = await supabase.from("conversations").select("id").or(`participant_a.eq.${uid},participant_b.eq.${uid}`);
  const ids = (convs.data ?? []).map((c: { id: string }) => c.id);
  const [r, p, o, v, rep, n, m] = await Promise.all([
    supabase.from("publication_requests").select("id", head).eq("status", "en_cours"),
    supabase.from("purchases").select("id", head).or(purchasesToHandleFilter()),
    supabase.from("orders").select("id", head).eq("status", "nouvelle"),
    supabase.from("veterinarians").select("profile_id", head).eq("is_verified", false),
    supabase.from("reports").select("id", head).eq("status", "ouvert"),
    supabase.from("notifications").select("id", head).eq("user_id", uid).is("read_at", null),
    ids.length
      ? supabase.from("messages").select("id", head).in("conversation_id", ids).is("read_at", null).neq("sender_id", uid)
      : Promise.resolve({ count: 0 }),
  ]);
  return {
    requests: r.count ?? 0,
    purchases: p.count ?? 0,
    orders: o.count ?? 0,
    vets: v.count ?? 0,
    reports: rep.count ?? 0,
    notifications: n.count ?? 0,
    messages: m.count ?? 0,
  };
}

// ------------------------------------------------------------------ navigation (groupée)
function navGroups(c: Counts): NavGroup[] {
  return [
    {
      title: "Général",
      items: [
        { href: "/", label: "Tableau de bord", icon: House },
        { href: "/statistiques", label: "Statistiques", icon: ChartColumn },
      ],
    },
    {
      title: "Annonces",
      items: [
        { href: "/demandes", label: "Demandes", icon: FileText, badge: c.requests },
        { href: "/animaux", label: "Animaux", icon: PawPrint },
        { href: "/achats", label: "Achats", icon: Wallet, badge: c.purchases },
        { href: "/catalogue", label: "Catalogue", icon: Shapes },
      ],
    },
    {
      title: "Boutique",
      items: [
        { href: "/boutique/commandes", label: "Commandes", icon: ShoppingCart, badge: c.orders },
        { href: "/boutique/produits", label: "Produits", icon: Package },
        { href: "/boutique/categories", label: "Catégories", icon: FolderTree },
        { href: "/boutique/marques", label: "Marques", icon: Tag },
        { href: "/boutique/codes-promo", label: "Codes promo", icon: Ticket },
        { href: "/boutique/avis", label: "Avis clients", icon: MessageSquareText },
      ],
    },
    {
      title: "Personnes",
      items: [
        { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
        { href: "/veterinaires", label: "Vétérinaires", icon: Stethoscope, badge: c.vets },
      ],
    },
    {
      title: "Échanges",
      items: [
        { href: "/messages", label: "Messages", icon: MessageCircle, badge: c.messages },
        { href: "/signalements", label: "Signalements", icon: Flag, badge: c.reports },
      ],
    },
    { title: "Gestion", items: [{ href: "/parametres", label: "Paramètres", icon: Settings }] },
  ];
}

// ------------------------------------------------------------------ shell
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading, user, profile, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/connexion");
  }, [loading, user, router]);

  if (loading || !user || !profile) return <PageLoader />;

  if (profile.role !== "admin" || profile.status !== "actif") {
    return (
      <div className="grid min-h-screen place-items-center bg-shell p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Logo height={40} className="mx-auto inline-block" />
          <span className="mx-auto mt-6 grid size-10 place-items-center rounded-full bg-rose-50 text-rose-600" aria-hidden>
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="mt-3 text-lg font-semibold">Accès réservé aux administrateurs</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Le compte <strong>{user.email}</strong> n&apos;a pas les droits nécessaires pour accéder au panneau d&apos;administration.
          </p>
          <Button
            className="mt-6 w-full"
            icon={<LogOut className="size-4" />}
            onClick={async () => {
              await signOut();
              router.replace("/connexion");
            }}
          >
            Se déconnecter
          </Button>
        </Card>
      </div>
    );
  }

  return <AdminFrame uid={user.id}>{children}</AdminFrame>;
}

function AdminFrame({ uid, children }: { uid: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifTick, setNotifTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetchCounts(uid)
        .then(setCounts)
        .catch(() => {});
      setNotifTick((t) => t + 1);
    }, 250);
  }, [uid]);

  // chargement initial + à chaque navigation
  useEffect(() => {
    let on = true;
    fetchCounts(uid)
      .then((c) => on && setCounts(c))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [uid, pathname]);

  // dernières notifications (dropdown)
  useEffect(() => {
    let on = true;
    getSupabase()
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => on && setNotifs((data as Notification[]) ?? []));
    return () => {
      on = false;
    };
  }, [uid, notifTick]);

  // temps réel : notifications + messages + commandes boutique
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`admin-shell-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  async function logout() {
    await signOut();
    router.replace("/connexion");
  }

  async function markAll() {
    await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
    refresh();
  }

  async function openNotif(n: Notification) {
    if (!n.read_at) {
      await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      refresh();
    }
    if (n.link?.startsWith("/")) router.push(n.link);
  }

  const name = profile?.full_name || "Administrateur";

  return (
    <CountsCtx.Provider value={{ counts, refresh }}>
      <AppFrame
        storageKey="bakma-admin:sidebar-collapsed"
        groups={navGroups(counts)}
        user={{ name, avatar: profile?.avatar_url, role: "Administrateur", greeting: name.split(" ")[0] || name }}
        notifications={{ count: counts.notifications, items: notifs, onOpen: openNotif, onMarkAll: markAll, allHref: "/notifications" }}
        menuLinks={[{ href: "/profil", label: "Mon profil", icon: User }]}
        search={{ placeholder: "Rechercher une demande, un animal, un utilisateur…", toHref: (q) => `/recherche?q=${encodeURIComponent(q)}` }}
        onLogout={logout}
      >
        {children}
      </AppFrame>
    </CountsCtx.Provider>
  );
}
