"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck, FileText, MessageCircle, Stethoscope, Trash2 } from "lucide-react";
import { useAdminCounts } from "@/components/AdminShell";
import { ErrorState, PageHeader } from "@/components/admin-ui";
import { Button, Card, EmptyState, PageLoader, Tabs, cn, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { must, useAsync } from "@/hooks/useAsync";
import { formatDateTime, timeAgo } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";

function iconFor(type: string) {
  if (type === "consultation") return Stethoscope;
  if (type === "message") return MessageCircle;
  if (type === "demande") return FileText;
  return Bell;
}

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { counts, refresh } = useAdminCounts();
  const uid = user?.id ?? "";
  const [tab, setTab] = useState<"all" | "unread">("all");

  const { data, error, loading, reload, mutate } = useAsync(async () => {
    const res = await getSupabase().from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(200);
    return must<Notification[]>(res);
  }, uid ? `${uid}|${counts.notifications}` : null);

  const list = (data ?? []).filter((n) => tab === "all" || !n.read_at);
  const unread = (data ?? []).filter((n) => !n.read_at).length;

  async function markAll() {
    const now = new Date().toISOString();
    const { error: err } = await getSupabase().from("notifications").update({ read_at: now }).eq("user_id", uid).is("read_at", null);
    if (err) return toast(errorMessage(err), "error");
    mutate((l) => l?.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    refresh();
  }

  async function open(n: Notification) {
    if (!n.read_at) {
      await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      refresh();
    }
    if (n.link?.startsWith("/")) router.push(n.link);
    else reload();
  }

  async function remove(n: Notification) {
    const { error: err } = await getSupabase().from("notifications").delete().eq("id", n.id);
    if (err) return toast(errorMessage(err), "error");
    mutate((l) => l?.filter((x) => x.id !== n.id));
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Toutes les alertes concernant les demandes, consultations et messages."
        action={
          unread > 0 && (
            <Button variant="outline" icon={<CheckCheck className="size-4" />} onClick={markAll}>
              Tout marquer comme lu
            </Button>
          )
        }
      />
      {loading ? (
        <PageLoader />
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 pt-2">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "Toutes", count: data?.length ?? 0 },
                { value: "unread", label: "Non lues", count: unread },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<Bell />} title={tab === "unread" ? "Aucune notification non lue" : "Aucune notification"} text="Vous êtes à jour." />
          ) : (
            <ul className="divide-y divide-line/70">
              {list.map((n) => {
                const I = iconFor(n.type);
                return (
                  <li key={n.id} className={cn("group flex items-start gap-4 px-6 py-4 transition hover:bg-page/50", !n.read_at && "bg-primary-soft/30")}>
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", n.read_at ? "bg-page text-muted" : "bg-primary-soft text-primary")}>
                      <I className="size-5" />
                    </span>
                    <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-navy">{n.title}</span>
                        {!n.read_at && <span className="size-2 rounded-full bg-primary" />}
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-body">{n.body}</p>}
                      <span className="mt-1 block text-xs text-muted" title={formatDateTime(n.created_at)}>
                        {timeAgo(n.created_at)}
                      </span>
                    </button>
                    <button onClick={() => remove(n)} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
