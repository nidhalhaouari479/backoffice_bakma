"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Funnel, Search, Users } from "lucide-react";
import { ActionMenu, ErrorState, PageHeader } from "@/components/admin-ui";
import { useUserActions } from "@/components/UserActions";
import { Avatar, Badge, Button, Card, EmptyState, Input, PageLoader, Pagination, Select } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { PROFILE_FULL_SELECT, ROLE_TONE, normalize } from "@/lib/admin";
import { ROLE_LABEL, formatDate } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { AccountStatus, Profile, UserRole } from "@/lib/types";

const PER_PAGE = 10;

export default function UtilisateursPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | UserRole>("");
  const [status, setStatus] = useState<"" | AccountStatus>("");
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const [profiles, animals] = await Promise.all([
      supabase.from("profiles").select(PROFILE_FULL_SELECT).order("created_at", { ascending: false }).limit(5000),
      supabase.from("animals").select("owner_id").limit(20000),
    ]);
    const counts: Record<string, number> = {};
    for (const a of must<{ owner_id: string }[]>(animals)) counts[a.owner_id] = (counts[a.owner_id] ?? 0) + 1;
    return { profiles: must<Profile[]>(profiles), counts };
  });

  const actions = useUserActions(reload);

  const filtered = useMemo(() => {
    if (!data) return [];
    const nq = normalize(q.trim());
    return data.profiles.filter((p) => {
      if (role && p.role !== role) return false;
      if (status && p.status !== status) return false;
      if (nq && !normalize([p.full_name, p.contact?.email, p.contact?.phone, p.city].join(" ")).includes(nq)) return false;
      return true;
    });
  }, [data, q, role, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Gérez les comptes des particuliers, vétérinaires et administrateurs." />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_1fr_1fr_auto]">
            <Input icon={<Search />} placeholder="Rechercher par nom, email, téléphone, ville…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-2xl" />
            <Select value={role} onChange={(e) => { setRole(e.target.value as UserRole | ""); setPage(1); }} className="rounded-2xl" aria-label="Rôle">
              <option value="">Tous les rôles</option>
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value as AccountStatus | ""); setPage(1); }} className="rounded-2xl" aria-label="Statut">
              <option value="">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
            </Select>
            <Button variant="outline" icon={<Funnel className="size-4" />} className="h-12 rounded-2xl text-primary" onClick={() => { setQ(""); setRole(""); setStatus(""); setPage(1); }}>
              Réinitialiser
            </Button>
          </div>

          <Card className="overflow-hidden">
            {error && <div className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>}
            {filtered.length === 0 ? (
              <EmptyState icon={<Users />} title="Aucun utilisateur" text="Aucun compte ne correspond à ces critères." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-page/70 text-[13px] font-bold text-navy [&_th]:px-4 [&_th]:py-3.5">
                    <tr>
                      <th className="pl-6">Utilisateur</th>
                      <th>Contact</th>
                      <th>Rôle</th>
                      <th>Ville</th>
                      <th>Statut</th>
                      <th>Inscrit le</th>
                      <th>Annonces</th>
                      <th className="pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 [&_td]:px-4 [&_td]:py-3">
                    {rows.map((p) => (
                      <tr key={p.id} className="hover:bg-page/40">
                        <td className="pl-6">
                          <Link href={`/utilisateurs/${p.id}`} className="flex items-center gap-3 hover:opacity-90">
                            <Avatar src={p.avatar_url} name={p.full_name} size={40} />
                            <span className="font-bold text-navy">{p.full_name || "Sans nom"}</span>
                          </Link>
                        </td>
                        <td className="text-body">
                          <div className="max-w-[220px] truncate">{p.contact?.email || "—"}</div>
                          <div className="text-xs text-muted">{p.contact?.phone || ""}</div>
                        </td>
                        <td>
                          <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABEL[p.role]}</Badge>
                          {p.role === "veterinaire" && p.veterinarian && !p.veterinarian.is_verified && <div className="mt-1 text-[11px] font-semibold text-amber-600">À valider</div>}
                        </td>
                        <td className="text-body">{p.city || "—"}</td>
                        <td>
                          <Badge tone={p.status === "actif" ? "green" : "red"}>{p.status === "actif" ? "Actif" : "Suspendu"}</Badge>
                        </td>
                        <td className="whitespace-nowrap text-body">{formatDate(p.created_at)}</td>
                        <td className="font-semibold text-navy">{data?.counts[p.id] ?? 0}</td>
                        <td className="pr-6">
                          <div className="flex items-center gap-1">
                            <Button href={`/utilisateurs/${p.id}`} variant="outline" size="sm" className="px-5 text-primary">
                              Voir
                            </Button>
                            <ActionMenu items={actions.menuItems(p)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-body">
                  Affichage de {(current - 1) * PER_PAGE + 1} à {Math.min(current * PER_PAGE, filtered.length)} sur {filtered.length} utilisateurs
                </span>
                <Pagination page={current} pageCount={pageCount} onChange={setPage} />
              </div>
            )}
          </Card>
        </>
      )}
      {actions.dialogs}
    </div>
  );
}
