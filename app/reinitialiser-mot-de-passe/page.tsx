"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading, user, profile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = profile?.role === "admin";

  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Nouveau mot de passe</h1>
      {loading ? (
        <div className="mt-10 flex justify-center">
          <Spinner className="size-8" />
        </div>
      ) : done ? (
        <div className="mt-8 space-y-5">
          <Alert tone="green">
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="size-5" /> Votre mot de passe a été mis à jour.
            </span>
          </Alert>
          {isAdmin ? (
            <Button size="lg" className="h-14 w-full rounded-2xl" onClick={() => router.replace("/")}>
              Accéder au tableau de bord
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-14 w-full rounded-2xl"
              onClick={async () => {
                await getSupabase().auth.signOut();
                router.replace("/connexion");
              }}
            >
              Retour à la connexion
            </Button>
          )}
        </div>
      ) : !user ? (
        <div className="mt-6 space-y-5">
          <Alert>Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau depuis la page de connexion.</Alert>
          <Link href="/connexion" className="inline-flex text-sm font-semibold text-primary hover:underline">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-base text-body">Choisissez un nouveau mot de passe pour le compte {user.email}.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Nouveau mot de passe" hint="8 caractères minimum">
              <Input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                icon={<Lock />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="h-14"
                right={
                  <button type="button" onClick={() => setShow(!show)} className="p-1 text-navy/70 hover:text-primary" aria-label="Afficher / masquer">
                    {show ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                  </button>
                }
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <Input type={show ? "text" : "password"} autoComplete="new-password" icon={<KeyRound />} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmez le mot de passe" className="h-14" />
            </Field>
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" loading={busy} className="h-14 w-full rounded-2xl text-base">
              Enregistrer le mot de passe
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
