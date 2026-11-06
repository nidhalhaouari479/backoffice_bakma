"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FileText, PawPrint, Search, Users } from "lucide-react";
import { AnimalCell, CategoryChip, ErrorState, PageHeader, RequestStatusBadge } from "@/components/admin-ui";
import { Avatar, Badge, Card, EmptyState, Input, MetaBadge, PageLoader } from "@/components/ui";
import { must, useAsync } from "@/hooks/useAsync";
import { ANIMAL_LIST_SELECT, PROFILE_FULL_SELECT, REQUEST_LIST_SELECT, ROLE_TONE, sanitizeSearch } from "@/lib/admin";
import { ANIMAL_STATUS, ROLE_LABEL, formatDate } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Animal, Profile, PublicationRequest } from "@/lib/types";

export default function RecherchePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Recherche />
    </Suspense>
  );
}

function Recherche() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  return <Results key={q} q={q} />;
}

function Results({ q }: { q: string }) {
  const router = useRouter();
  const [input, setInput] = useState(q);
  const term = sanitizeSearch(q);

  const { data, error, loading, reload } = useAsync(async () => {
    const supabase = getSupabase();
    const like = `%${term}%`;
    const [animals, profiles, contacts, requests] = await Promise.all([
      supabase.from("animals").select(ANIMAL_LIST_SELECT).or(`name.ilike.${like},breed.ilike.${like}`).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select(PROFILE_FULL_SELECT).ilike("full_name", like).limit(20),
      supabase.from("profile_contacts").select("id").or(`email.ilike.${like},phone.ilike.${like}`).limit(20),
      supabase.from("publication_requests").select(REQUEST_LIST_SELECT).ilike("ref", like).order("submitted_at", { ascending: false }).limit(20),
    ]);
    let users = must<Profile[]>(profiles);
    const extraIds = must<{ id: string }[]>(contacts)
      .map((c) => c.id)
      .filter((id) => !users.some((u) => u.id === id));
    if (extraIds.length) {
      const more = await supabase.from("profiles").select(PROFILE_FULL_SELECT).in("id", extraIds);
      users = [...users, ...must<Profile[]>(more)];
    }
    // demandes des animaux trouvés (recherche par nom d'animal)
    let reqs = must<PublicationRequest[]>(requests);
    const animalIds = must<Animal[]>(animals).map((a) => a.id);
    if (animalIds.length) {
      const byAnimal = await supabase.from("publication_requests").select(REQUEST_LIST_SELECT).in("animal_id", animalIds).order("submitted_at", { ascending: false }).limit(20);
      for (const r of must<PublicationRequest[]>(byAnimal)) if (!reqs.some((x) => x.id === r.id)) reqs = [...reqs, r];
    }
    return { animals: must<Animal[]>(animals), users, requests: reqs };
  }, term.length >= 2 ? term : null);

  const total = data ? data.animals.length + data.users.length + data.requests.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Recherche" subtitle={term ? `Résultats pour « ${q} »` : "Recherchez une demande, un animal ou un utilisateur."} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) router.replace(`/recherche?q=${encodeURIComponent(input.trim())}`);
        }}
        className="max-w-2xl"
      >
        <Input icon={<Search />} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nom d'animal, race, utilisateur, email, référence DP-…" className="rounded-2xl" />
      </form>

      {term.length < 2 ? (
        <Card>
          <EmptyState icon={<Search />} title="Saisissez au moins 2 caractères" />
        </Card>
      ) : loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState icon={<Search />} title="Aucun résultat" text={`Aucune demande, annonce ou utilisateur ne correspond à « ${q} ».`} />
        </Card>
      ) : (
        <>
          <Section icon={<FileText />} title="Demandes" count={data!.requests.length}>
            {data!.requests.map((r) => (
              <Link key={r.id} href={`/demandes/${r.id}`} className="flex flex-wrap items-center gap-4 px-6 py-3 hover:bg-page/50">
                <div className="min-w-[220px] flex-1">
                  <AnimalCell animal={r.animal} thumbClass="size-12" />
                </div>
                <span className="text-sm font-semibold text-navy">{r.ref}</span>
                <span className="text-sm text-body">{r.owner?.full_name}</span>
                <span className="text-sm text-muted">{formatDate(r.submitted_at)}</span>
                <RequestStatusBadge status={r.status} />
              </Link>
            ))}
          </Section>
          <Section icon={<PawPrint />} title="Animaux" count={data!.animals.length}>
            {data!.animals.map((a) => (
              <Link key={a.id} href={`/animaux/${a.id}`} className="flex flex-wrap items-center gap-4 px-6 py-3 hover:bg-page/50">
                <div className="min-w-[220px] flex-1">
                  <AnimalCell animal={a} thumbClass="size-12" />
                </div>
                <CategoryChip category={a.category} />
                <span className="text-sm text-body">{a.owner?.full_name}</span>
                <MetaBadge meta={ANIMAL_STATUS[a.status]} />
              </Link>
            ))}
          </Section>
          <Section icon={<Users />} title="Utilisateurs" count={data!.users.length}>
            {data!.users.map((u) => (
              <Link key={u.id} href={`/utilisateurs/${u.id}`} className="flex flex-wrap items-center gap-4 px-6 py-3 hover:bg-page/50">
                <div className="flex min-w-[220px] flex-1 items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.full_name} size={40} />
                  <div className="min-w-0">
                    <div className="truncate font-bold text-navy">{u.full_name}</div>
                    <div className="truncate text-xs text-muted">{u.contact?.email}</div>
                  </div>
                </div>
                <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                <span className="text-sm text-body">{u.city || "—"}</span>
              </Link>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-6 pb-3 pt-5 text-primary [&>svg]:size-5">
        {icon}
        <h2 className="text-lg font-bold">
          {title} <span className="text-sm font-semibold text-muted">({count})</span>
        </h2>
      </div>
      <div className="divide-y divide-line/70 border-t border-line/70">{children}</div>
    </Card>
  );
}
