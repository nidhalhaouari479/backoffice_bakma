"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChartColumn,
  CheckCheck,
  ChevronDown,
  FileText,
  Flag,
  House,
  LogOut,
  Menu,
  MessageCircle,
  PawPrint,
  Search,
  Settings,
  Shapes,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/labels";
import type { Notification } from "@/lib/types";
import { Logo } from "./Logo";
import { Avatar, Button, PageLoader, cn } from "./ui";

// ------------------------------------------------------------------ compteurs partagés (badges sidebar + cloche)
type Counts = { requests: number; vets: number; messages: number; reports: number; notifications: number };
const EMPTY: Counts = { requests: 0, vets: 0, messages: 0, reports: 0, notifications: 0 };

const CountsCtx = createContext<{ counts: Counts; refresh: () => void }>({ counts: EMPTY, refresh: () => {} });
export const useAdminCounts = () => useContext(CountsCtx);

async function fetchCounts(uid: string): Promise<Counts> {
  const supabase = getSupabase();
  const head = { count: "exact" as const, head: true };
  const convs = await supabase.from("conversations").select("id").or(`participant_a.eq.${uid},participant_b.eq.${uid}`);
  const ids = (convs.data ?? []).map((c: { id: string }) => c.id);
  const [r, v, rep, n, m] = await Promise.all([
    supabase.from("publication_requests").select("id", head).eq("status", "en_cours"),
    supabase.from("veterinarians").select("profile_id", head).eq("is_verified", false),
    supabase.from("reports").select("id", head).eq("status", "ouvert"),
    supabase.from("notifications").select("id", head).eq("user_id", uid).is("read_at", null),
    ids.length
      ? supabase.from("messages").select("id", head).in("conversation_id", ids).is("read_at", null).neq("sender_id", uid)
      : Promise.resolve({ count: 0 }),
  ]);
  return {
    requests: r.count ?? 0,
    vets: v.count ?? 0,
    reports: rep.count ?? 0,
    notifications: n.count ?? 0,
    messages: m.count ?? 0,
  };
}

// ------------------------------------------------------------------ navigation
const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: keyof Counts }[] = [
  { href: "/", label: "Tableau de bord", icon: House },
  { href: "/demandes", label: "Demandes", icon: FileText, badge: "requests" },
  { href: "/animaux", label: "Animaux", icon: PawPrint },
  { href: "/catalogue", label: "Catalogue", icon: Shapes },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/veterinaires", label: "Vétérinaires", icon: Stethoscope, badge: "vets" },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  { href: "/signalements", label: "Signalements", icon: Flag, badge: "reports" },
  { href: "/statistiques", label: "Statistiques", icon: ChartColumn },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
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
      <div className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-white p-8 text-center shadow-[0_4px_24px_rgba(15,40,90,0.06)]">
          <Logo height={48} className="mx-auto inline-block" />
          <span className="mx-auto mt-6 grid size-16 place-items-center rounded-full bg-red-50 text-red-500">
            <ShieldAlert className="size-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Accès réservé aux administrateurs</h1>
          <p className="mt-2 text-sm text-body">
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
        </div>
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
  const [drawer, setDrawer] = useState(false);
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

  // temps réel : notifications + messages
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`admin-shell-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  async function logout() {
    await signOut();
    router.replace("/connexion");
  }

  const sidebar = (
    <nav className="flex h-full flex-col px-4 py-6">
      <ul className="space-y-1.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const n = item.badge ? counts[item.badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setDrawer(false)}
                className={cn(
                  "relative flex h-12 items-center gap-3.5 rounded-xl px-4 text-[15px] font-semibold transition",
                  active ? "bg-primary-soft text-primary" : "text-body hover:bg-page hover:text-navy",
                )}
              >
                {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
                <item.icon className="size-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {n > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{n > 99 ? "99+" : n}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <button onClick={logout} className="mt-auto flex h-12 items-center gap-3.5 rounded-xl px-4 text-[15px] font-semibold text-body transition hover:bg-red-50 hover:text-red-600">
        <LogOut className="size-5" /> Se déconnecter
      </button>
    </nav>
  );

  return (
    <CountsCtx.Provider value={{ counts, refresh }}>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur">
          <div className="flex h-[72px] items-center gap-3 px-4 lg:h-[84px] lg:px-6">
            <button className="grid size-10 place-items-center rounded-xl text-navy hover:bg-page lg:hidden" onClick={() => setDrawer(true)} aria-label="Ouvrir le menu">
              <Menu className="size-6" />
            </button>
            <div className="shrink-0 lg:w-[250px]">
              <Logo height={44} />
            </div>
            <div className="hidden flex-1 md:block">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <NotificationBell count={counts.notifications} items={notifs} uid={uid} onChange={refresh} />
              <UserMenu name={profile?.full_name} avatar={profile?.avatar_url} onLogout={logout} />
            </div>
          </div>
          <div className="px-4 pb-3 md:hidden">
            <GlobalSearch />
          </div>
        </header>

        <div className="flex">
          {/* Sidebar desktop */}
          <aside className="sticky top-[84px] hidden h-[calc(100vh-84px)] w-[272px] shrink-0 overflow-y-auto border-r border-line/70 bg-white lg:block">{sidebar}</aside>

          {/* Tiroir mobile */}
          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
              <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <Logo height={40} />
                  <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-page" onClick={() => setDrawer(false)} aria-label="Fermer le menu">
                    <X className="size-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
              </aside>
            </div>
          )}

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </CountsCtx.Provider>
  );
}

// ------------------------------------------------------------------ recherche globale
function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative mx-auto max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-navy/70" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une demande, un animal, un utilisateur…"
        className="h-12 w-full rounded-full border border-line bg-page/60 pl-12 pr-4 text-sm text-navy outline-none transition placeholder:text-muted focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
      />
    </form>
  );
}

// ------------------------------------------------------------------ dropdown générique (header)
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function NotificationBell({ count, items, uid, onChange }: { count: number; items: Notification[]; uid: string; onChange: () => void }) {
  const { open, setOpen, ref } = useDropdown();
  const router = useRouter();

  async function markAll() {
    await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
    onChange();
  }

  async function openNotif(n: Notification) {
    setOpen(false);
    if (!n.read_at) {
      await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      onChange();
    }
    if (n.link?.startsWith("/")) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative grid size-11 place-items-center rounded-full text-navy transition hover:bg-page" aria-label="Notifications">
        <Bell className="size-6" />
        {count > 0 && (
          <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-bold text-navy">Notifications</span>
            {count > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="size-4" /> Tout marquer comme lu
              </button>
            )}
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Aucune notification</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => openNotif(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-page", !n.read_at && "bg-primary-soft/40")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-navy">{n.title}</span>
                    {n.body && <span className="line-clamp-2 block text-xs text-body">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-page">
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, avatar, onLogout }: { name?: string | null; avatar?: string | null; onLogout: () => void }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-page">
        <Avatar src={avatar} name={name || "Admin"} size={44} />
        <span className="hidden text-sm font-bold text-navy sm:block">Admin</span>
        <ChevronDown className={cn("hidden size-4 text-navy transition sm:block", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-2xl">
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <div className="truncate text-sm font-bold text-navy">{name || "Administrateur"}</div>
            <div className="text-xs text-muted">Administrateur</div>
          </div>
          <Link href="/profil" onClick={() => setOpen(false)} className="mt-1 flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-navy hover:bg-primary-soft hover:text-primary">
            <User className="size-4" /> Mon profil
          </Link>
          <button onClick={onLogout} className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut className="size-4" /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
