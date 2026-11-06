"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail, Send } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, getSupabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();
  const { loading, user, profile } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Déjà connecté en tant qu'admin → tableau de bord
  useEffect(() => {
    if (!loading && user && profile?.role === "admin" && profile.status === "actif") router.replace("/");
  }, [loading, user, profile, router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      const { data: p } = await supabase.from("profiles").select("role,status").eq("id", data.user.id).maybeSingle();
      if (!p || p.role !== "admin") {
        await supabase.auth.signOut();
        setError("Ce compte n'a pas les droits administrateur. L'accès est réservé à l'équipe Bakma Store.");
        return;
      }
      if (p.status !== "actif") {
        await supabase.auth.signOut();
        setError("Ce compte administrateur est suspendu.");
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Saisissez votre adresse e-mail.");
      return;
    }
    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? window.location.origin;
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${base}/reinitialiser-mot-de-passe`,
      });
      if (err) throw err;
      setInfo("Si un compte existe pour cette adresse, un lien de réinitialisation vient de vous être envoyé.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      {mode === "login" ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Espace administrateur</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Connexion</h1>
          <p className="mt-2 text-[15px] text-body">Connectez-vous pour accéder au panneau d&apos;administration.</p>
          <form onSubmit={login} className="mt-8 space-y-5">
            <Field label="Email">
              <Input type="email" required autoComplete="email" icon={<Mail />} placeholder="Entrez votre email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            </Field>
            <Field label="Mot de passe">
              <Input
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                icon={<Lock />}
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                right={
                  <button type="button" onClick={() => setShow(!show)} className="p-1 text-navy/70 hover:text-primary" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {show ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </button>
                }
              />
            </Field>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setMode("forgot"); setError(null); setInfo(null); }} className="text-sm font-semibold text-primary hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" loading={busy} icon={<LogIn className="size-5" />} className="h-12 w-full text-base">
              Se connecter
            </Button>
            <p className="text-center text-xs text-muted">Accès réservé à l&apos;équipe Bakma Store.</p>
          </form>
        </>
      ) : (
        <>
          <button type="button" onClick={() => { setMode("login"); setError(null); setInfo(null); }} className="mb-4 inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="size-4" /> Retour à la connexion
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight">Mot de passe oublié</h1>
          <p className="mt-2 text-[15px] text-body">Saisissez l&apos;adresse e-mail de votre compte administrateur : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <form onSubmit={forgot} className="mt-8 space-y-5">
            <Field label="Email">
              <Input type="email" required autoComplete="email" icon={<Mail />} placeholder="Entrez votre email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            </Field>
            <Alert>{error}</Alert>
            <Alert tone="green">{info}</Alert>
            <Button type="submit" size="lg" loading={busy} icon={<Send className="size-5" />} className="h-12 w-full text-base">
              Envoyer le lien
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
