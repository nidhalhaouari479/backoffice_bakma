"use client";

/*
 * Cadre commun des back-offices Bakma (admin + vétérinaire) — fichier identique dans les deux apps.
 *
 *  ┌ shell (gris bleuté) ─────────────────────────────────────────────┐
 *  │ Logo           ┌ panneau canvas arrondi ─────────────────────────┐ │
 *  │ Rechercher ⌃K  │ Bonjour, …                     (cloche)(compte) │ │
 *  │ GROUPE         ├─────────────────────────────────────────────────┤ │
 *  │ ┃ Lien actif   │ main : seule zone qui défile                    │ │
 *  │   Lien         │                                                 │ │
 *  │ Profil·Réduire └─────────────────────────────────────────────────┘ │
 *  └──────────────────────────────────────────────────────────────────┘
 *  Barre latérale 264 px (72 px repliée, mémorisé), barre du haut 64 px.
 *  Sous 768 px : tiroir à gauche + (optionnel) barre d'onglets en bas.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, PawPrint, Search, X } from "lucide-react";
import { timeAgo } from "@/lib/labels";
import type { Notification } from "@/lib/types";
import { Logo } from "../Logo";
import { Avatar, IconButton, cn } from "../ui";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };
export type MenuLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

const countLabel = (n: number) => (n > 9 ? "9+" : String(n));

// ------------------------------------------------------------------ cadre
export function AppFrame({
  storageKey,
  groups,
  mobileTabs,
  user,
  notifications,
  menuLinks,
  search,
  onLogout,
  children,
}: {
  storageKey: string;
  groups: NavGroup[];
  mobileTabs?: NavItem[];
  user: { name: string; avatar?: string | null; role: string; greeting: string };
  notifications: { count: number; items: Notification[]; onOpen: (n: Notification) => void; onMarkAll: () => void; allHref: string };
  menuLinks: MenuLink[];
  search: { placeholder: string; toHref: (q: string) => string };
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(storageKey, c ? "0" : "1");
      } catch {
        /* stockage indisponible : préférence non mémorisée */
      }
      return !c;
    });

  // Raccourci Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = groups.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-shell text-navy">
      <a href="#contenu" className="sr-only z-[70] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy shadow-[var(--shadow-pop)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Aller au contenu
      </a>

      {/* Barre latérale desktop */}
      <aside className={cn("hidden h-full shrink-0 flex-col bg-shell transition-[width] duration-200 md:flex", collapsed ? "w-[72px]" : "w-[264px]")}>
        <Sidebar groups={groups} pathname={pathname} collapsed={collapsed} user={user} onSearch={() => setSearchOpen(true)} onToggle={toggleCollapsed} />
      </aside>

      {/* Tiroir mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="bo-fade-in absolute inset-0 bg-slate-900/30 backdrop-blur-[3px]" onClick={() => setDrawer(false)} />
          <aside className="bo-drawer-in absolute inset-y-0 left-0 flex w-[min(85vw,288px)] flex-col bg-shell pt-[env(safe-area-inset-top)] shadow-[var(--shadow-pop)]">
            <IconButton label="Fermer le menu" icon={<X />} onClick={() => setDrawer(false)} className="absolute right-2 top-[calc(env(safe-area-inset-top)+14px)]" />
            <Sidebar
              groups={groups}
              pathname={pathname}
              collapsed={false}
              user={user}
              onNavigate={() => setDrawer(false)}
              onSearch={() => {
                setDrawer(false);
                setSearchOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* Panneau de contenu */}
      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas md:rounded-2xl md:border md:border-slate-200/70 md:shadow-[var(--shadow-card)]">
          <header className="shrink-0 border-b border-slate-200/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:pt-0">
            <div className="flex h-16 items-center gap-2 px-3 sm:px-5 lg:px-8">
              <IconButton label="Ouvrir le menu" icon={<Menu />} onClick={() => setDrawer(true)} size={40} className="-ml-1 md:hidden" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-navy md:hidden">{current?.label ?? "Bakma"}</p>
                <div className="hidden md:block">
                  <p className="truncate text-[15px] font-semibold text-navy">Bonjour, {user.greeting}</p>
                  <p className="text-xs capitalize text-slate-500">{today}</p>
                </div>
              </div>
              <IconButton label="Rechercher" icon={<Search />} onClick={() => setSearchOpen(true)} size={44} className="md:hidden [&_svg]:size-5" />
              <NotificationBell {...notifications} />
              <UserMenu user={user} links={menuLinks} onLogout={onLogout} />
            </div>
          </header>

          <main id="contenu" className={cn("custom-scrollbar flex-1 overflow-y-auto px-3 pb-8 pt-5 sm:px-5 lg:px-8 lg:pt-6", mobileTabs && "pb-28 md:pb-8")}>
            <div key={pathname} className="bo-page-in mx-auto max-w-[1600px]">
              {children}
            </div>
          </main>
        </div>
      </div>

      {mobileTabs && <MobileTabs tabs={mobileTabs} pathname={pathname} />}
      {searchOpen && <SearchPalette {...search} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

// ------------------------------------------------------------------ barre latérale
function Sidebar({
  groups,
  pathname,
  collapsed,
  user,
  onSearch,
  onToggle,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed: boolean;
  user: { name: string; avatar?: string | null; role: string };
  onSearch: () => void;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center px-2" : "px-5")}>
        {collapsed ? (
          <Link href="/" aria-label="Bakma Store — accueil" className="grid size-10 place-items-center rounded-xl bg-gradient-to-b from-primary-light to-primary text-white shadow-[var(--shadow-brand)]">
            <PawPrint className="size-5" aria-hidden />
          </Link>
        ) : (
          <Logo height={36} />
        )}
      </div>

      <div className={cn("shrink-0 pb-2", collapsed ? "px-3" : "px-4")}>
        <button
          type="button"
          onClick={onSearch}
          title={collapsed ? "Rechercher (Ctrl + K)" : undefined}
          aria-label="Rechercher"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-[10px] border border-slate-200/80 bg-white text-[13px] text-slate-500 shadow-[var(--shadow-card)] outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-focus/50",
            collapsed ? "justify-center" : "px-3",
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 font-sans text-xs text-slate-500">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-3" aria-label="Navigation principale">
        {groups.map((g) => (
          <div key={g.title} className={cn("mt-3", collapsed ? "px-3" : "px-4")}>
            {collapsed ? (
              <div className="mx-auto mb-1.5 h-px w-6 bg-slate-300/70" aria-hidden />
            ) : (
              <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">{g.title}</p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <SideLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 space-y-1 border-t border-slate-200/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3", collapsed ? "px-3" : "px-4")}>
        <div className={cn("flex items-center gap-2.5 rounded-xl", collapsed ? "justify-center py-1" : "bg-white/60 p-2")} title={collapsed ? user.name : undefined}>
          <Avatar src={user.avatar} name={user.name} size={32} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-navy">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.role}</p>
            </div>
          )}
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Déplier le menu" : undefined}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg text-[13px] font-medium text-slate-500 outline-none transition hover:bg-white/70 hover:text-navy focus-visible:ring-2 focus-visible:ring-focus/50",
              collapsed ? "justify-center" : "px-2.5",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
            {collapsed ? <span className="sr-only">Déplier le menu</span> : "Réduire le menu"}
          </button>
        )}
      </div>
    </div>
  );
}

function SideLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const n = item.badge ?? 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex h-9 items-center gap-2.5 rounded-lg text-[13.5px] outline-none transition focus-visible:ring-2 focus-visible:ring-focus/50",
        collapsed ? "justify-center" : "px-2.5",
        active ? "bg-white font-semibold text-navy shadow-[var(--shadow-card)] ring-1 ring-slate-200/70" : "text-slate-600 hover:bg-white/70 hover:text-navy",
      )}
    >
      {active && <span className={cn("absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent", collapsed ? "-left-3" : "-left-4")} aria-hidden />}
      <span className="relative">
        <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-slate-400")} strokeWidth={active ? 2.2 : 2} />
        {collapsed && n > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-rose-500 ring-2 ring-shell" aria-hidden />}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && n > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold tabular-nums text-white">
          {n > 99 ? "99+" : n}
          <span className="sr-only"> en attente</span>
        </span>
      )}
    </Link>
  );
}

// ------------------------------------------------------------------ barre d'onglets mobile
function MobileTabs({ tabs, pathname }: { tabs: NavItem[]; pathname: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,42,61,0.06)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      aria-label="Navigation mobile"
    >
      {tabs.map((t) => {
        const on = isActive(pathname, t.href);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2 text-xs font-semibold", on ? "text-primary" : "text-slate-500")}>
            <span className="relative">
              <Icon className="size-[22px]" strokeWidth={on ? 2.2 : 2} />
              {!!t.badge && (
                <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">{countLabel(t.badge)}</span>
              )}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ------------------------------------------------------------------ recherche (Ctrl + K)
function SearchPalette({ placeholder, toHref, onClose }: { placeholder: string; toHref: (q: string) => string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="bo-fade-in fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 px-3 pt-[12vh] backdrop-blur-[3px]" onClick={onClose}>
      <form
        role="search"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (!v) return;
          onClose();
          router.push(toHref(v));
        }}
        className="bo-modal-in w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-3 px-4">
          <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 font-sans text-xs text-slate-500 sm:block">Échap</kbd>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
          <span>Entrée pour lancer la recherche</span>
          <button type="submit" className="font-semibold text-primary hover:underline">
            Rechercher
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ menus déroulants (barre du haut)
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
  const close = useCallback(() => setOpen(false), []);
  return { open, setOpen, close, ref };
}

function NotificationBell({
  count,
  items,
  onOpen,
  onMarkAll,
  allHref,
}: {
  count: number;
  items: Notification[];
  onOpen: (n: Notification) => void;
  onMarkAll: () => void;
  allHref: string;
}) {
  const { open, setOpen, close, ref } = useDropdown();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={count ? `Notifications (${count} non lues)` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-11 place-items-center rounded-lg text-slate-600 outline-none transition hover:bg-slate-100 hover:text-navy focus-visible:ring-2 focus-visible:ring-focus/50"
      >
        <Bell className="size-6" strokeWidth={1.8} />
        {count > 0 && (
          <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-semibold tabular-nums leading-none text-white ring-2 ring-canvas">
            {countLabel(count)}
          </span>
        )}
      </button>
      {open && (
        <div className="bo-fade-in absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-[15px] font-semibold text-navy">Notifications</span>
            {count > 0 && (
              <button onClick={onMarkAll} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="size-4" aria-hidden /> Tout marquer comme lu
              </button>
            )}
          </div>
          <ul className="custom-scrollbar max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-slate-500">Aucune notification</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    close();
                    onOpen(n);
                  }}
                  className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50", !n.read_at && "bg-primary-soft/40")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-navy">{n.title}</span>
                    {n.body && <span className="line-clamp-2 block text-xs text-slate-600">{n.body}</span>}
                    <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href={allHref} onClick={close} className="block border-t border-slate-100 px-4 py-2.5 text-center text-[13px] font-semibold text-primary hover:bg-slate-50">
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, links, onLogout }: { user: { name: string; avatar?: string | null; role: string }; links: MenuLink[]; onLogout: () => void }) {
  const { open, setOpen, close, ref } = useDropdown();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Menu du compte"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-1 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-focus/50 sm:pr-2"
      >
        <Avatar src={user.avatar} name={user.name} size={34} />
        <ChevronDown className={cn("hidden size-4 text-slate-500 transition sm:block", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="bo-fade-in absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-pop)]">
          <div className="border-b border-slate-100 px-2.5 pb-2.5 pt-1.5">
            <div className="truncate text-[13.5px] font-semibold text-navy">{user.name}</div>
            <div className="text-xs text-slate-500">{user.role}</div>
          </div>
          <div className="py-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={close} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-navy">
                <l.icon className="size-4 text-slate-400" /> {l.label}
              </Link>
            ))}
          </div>
          <button onClick={onLogout} className="flex h-9 w-full items-center gap-2.5 rounded-lg border-t border-slate-100 px-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
