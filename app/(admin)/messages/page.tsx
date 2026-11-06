"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, PawPrint, Search, Send } from "lucide-react";
import { useAdminCounts } from "@/components/AdminShell";
import { ErrorState, PageHeader } from "@/components/admin-ui";
import { Avatar, Card, EmptyState, PageLoader, Spinner, cn, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { must, useAsync } from "@/hooks/useAsync";
import { CONVERSATION_SELECT, normalize } from "@/lib/admin";
import { ROLE_LABEL, formatDate, formatTime, timeAgo } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Conversation, Message } from "@/lib/types";

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { refresh } = useAdminCounts();
  const uid = user?.id ?? "";
  const selected = sp.get("c");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);

  const convs = useAsync(async () => {
    const supabase = getSupabase();
    const res = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
      .order("last_message_at", { ascending: false });
    const list = must<Conversation[]>(res);
    const unread: Record<string, number> = {};
    if (list.length) {
      const m = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", list.map((c) => c.id))
        .is("read_at", null)
        .neq("sender_id", uid);
      for (const r of (m.data as { conversation_id: string }[]) ?? []) unread[r.conversation_id] = (unread[r.conversation_id] ?? 0) + 1;
    }
    return { list, unread };
  }, uid || null);

  const thread = useAsync(async () => {
    const res = await getSupabase().from("messages").select("*").eq("conversation_id", selected!).order("created_at", { ascending: true }).limit(500);
    return must<Message[]>(res);
  }, selected);

  const reloadConvs = convs.reload;
  const mutateThread = thread.mutate;

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Temps réel : nouveaux messages
  useEffect(() => {
    if (!uid) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`admin-messages-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.conversation_id === selectedRef.current) {
          mutateThread((list) => (list?.some((x) => x.id === m.id) ? list : [...(list ?? []), m]));
        }
        reloadConvs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, reloadConvs, mutateThread]);

  // Marquer comme lus les messages reçus de la conversation ouverte
  const unreadIds = useMemo(() => (thread.data ?? []).filter((m) => !m.read_at && m.sender_id !== uid).map((m) => m.id), [thread.data, uid]);
  useEffect(() => {
    if (!selected || !unreadIds.length) return;
    getSupabase()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        mutateThread((list) => list?.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m)));
        reloadConvs();
        refresh();
      });
  }, [selected, unreadIds, mutateThread, reloadConvs, refresh]);

  // Défilement en bas du fil
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [thread.data?.length, selected]);

  const other = (c: Conversation) => (c.participant_a === uid ? c.b : c.a);
  const current = convs.data?.list.find((c) => c.id === selected);
  const list = (convs.data?.list ?? []).filter((c) => !q.trim() || normalize([other(c)?.full_name, c.animal?.name, c.last_message].join(" ")).includes(normalize(q.trim())));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selected) return;
    setSending(true);
    try {
      const { data, error } = await getSupabase().from("messages").insert({ conversation_id: selected, sender_id: uid, body }).select().single();
      if (error) throw error;
      setText("");
      mutateThread((l) => (l?.some((x) => x.id === (data as Message).id) ? l : [...(l ?? []), data as Message]));
      reloadConvs();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="Échangez avec les propriétaires et les vétérinaires." />
      {convs.loading ? (
        <PageLoader />
      ) : convs.error && !convs.data ? (
        <Card>
          <ErrorState message={convs.error} onRetry={convs.reload} />
        </Card>
      ) : (
        <Card className="grid h-[calc(100vh-240px)] min-h-[480px] overflow-hidden lg:grid-cols-[340px_1fr]">
          {/* Liste */}
          <div className={cn("flex min-h-0 flex-col border-line lg:border-r", selected && "hidden lg:flex")}>
            <div className="border-b border-line p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une conversation…" className="h-10 w-full rounded-xl border border-line bg-page/60 pl-9 pr-3 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {list.length === 0 && (
                <li>
                  <EmptyState icon={<MessageCircle />} title="Aucune conversation" text="Contactez un propriétaire depuis une demande ou la fiche d'un utilisateur." />
                </li>
              )}
              {list.map((c) => {
                const o = other(c);
                const n = convs.data?.unread[c.id] ?? 0;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => router.replace(`/messages?c=${c.id}`)}
                      className={cn("flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-page", c.id === selected && "bg-primary-soft/60")}
                    >
                      <Avatar src={o?.avatar_url} name={o?.full_name} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm text-navy", n ? "font-extrabold" : "font-semibold")}>{o?.full_name || "Utilisateur"}</span>
                          <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.last_message_at)}</span>
                        </div>
                        {c.animal && (
                          <div className="flex items-center gap-1 truncate text-[11px] font-semibold text-primary">
                            <PawPrint className="size-3" /> {c.animal.name}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={cn("flex-1 truncate text-xs", n ? "font-semibold text-navy" : "text-muted")}>{c.last_message || "Nouvelle conversation"}</span>
                          {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{n}</span>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Fil */}
          <div className={cn("flex min-h-0 flex-col", !selected && "hidden lg:flex")}>
            {!selected ? (
              <div className="grid flex-1 place-items-center">
                <EmptyState icon={<MessageCircle />} title="Sélectionnez une conversation" text="Choisissez une conversation dans la liste pour afficher les messages." />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button onClick={() => router.replace("/messages")} className="grid size-9 place-items-center rounded-lg text-navy hover:bg-page lg:hidden" aria-label="Retour">
                    <ArrowLeft className="size-5" />
                  </button>
                  {current ? (
                    <>
                      <Avatar src={other(current)?.avatar_url} name={other(current)?.full_name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-navy">{other(current)?.full_name}</div>
                        <div className="truncate text-xs text-muted">
                          {other(current)?.role ? ROLE_LABEL[other(current)!.role] : ""}
                          {current.animal ? ` · à propos de ${current.animal.name}` : ""}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted">Conversation</span>
                  )}
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-page/40 px-4 py-4">
                  {thread.loading ? (
                    <div className="flex justify-center py-10">
                      <Spinner />
                    </div>
                  ) : thread.error ? (
                    <ErrorState message={thread.error} onRetry={thread.reload} />
                  ) : !thread.data?.length ? (
                    <p className="py-10 text-center text-sm text-muted">Aucun message. Écrivez le premier !</p>
                  ) : (
                    thread.data.map((m, i) => {
                      const mine = m.sender_id === uid;
                      const prev = thread.data![i - 1];
                      const newDay = !prev || formatDate(prev.created_at) !== formatDate(m.created_at);
                      return (
                        <div key={m.id}>
                          {newDay && <div className="my-3 text-center text-[11px] font-semibold text-muted">{formatDate(m.created_at)}</div>}
                          <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-white text-navy")}>
                              <p className="whitespace-pre-line break-words">{m.body}</p>
                              <div className={cn("mt-1 text-right text-[10px]", mine ? "text-white/70" : "text-muted")}>{formatTime(m.created_at)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottom} />
                </div>
                <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    placeholder="Écrire un message…"
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line px-4 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  <button type="submit" disabled={sending || !text.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:brightness-110 disabled:opacity-50" aria-label="Envoyer">
                    {sending ? <Spinner className="size-5 text-white" /> : <Send className="size-5" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
