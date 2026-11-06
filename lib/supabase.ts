"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client Supabase côté navigateur (singleton). Sécurité assurée par les policies RLS. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants : copiez .env.example en .env.local",
    );
  }
  client = createBrowserClient(url, key);
  return client;
}

/** Message d'erreur lisible à partir d'une erreur Supabase / JS. */
export function errorMessage(e: unknown): string {
  if (!e) return "Une erreur est survenue";
  if (typeof e === "string") return e;
  const msg = (e as { message?: string }).message ?? "Une erreur est survenue";
  if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect";
  if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre adresse e-mail";
  if (msg.includes("User already registered")) return "Un compte existe déjà avec cet e-mail";
  if (msg.includes("Password should be")) return "Le mot de passe doit contenir au moins 6 caractères";
  return msg;
}
