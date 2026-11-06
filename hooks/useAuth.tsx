"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Profile, ProfileContact, Veterinarian } from "@/lib/types";

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  contact: ProfileContact | null;
  vet: Veterinarian | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contact, setContact] = useState<ProfileContact | null>(null);
  const [vet, setVet] = useState<Veterinarian | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setContact(null);
      setVet(null);
      return;
    }
    const supabase = getSupabase();
    const [p, c, v] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("profile_contacts").select("*").eq("id", userId).maybeSingle(),
      supabase.from("veterinarians").select("*").eq("profile_id", userId).maybeSingle(),
    ]);
    setProfile((p.data as Profile) ?? null);
    setContact((c.data as ProfileContact) ?? null);
    setVet((v.data as Veterinarian) ?? null);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // différé pour éviter un deadlock dans le callback supabase-js
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      contact,
      vet,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await getSupabase().auth.signOut();
        setProfile(null);
        setContact(null);
        setVet(null);
      },
    }),
    [loading, session, profile, contact, vet, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
