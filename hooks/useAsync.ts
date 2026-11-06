"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/supabase";

type State<T> = { data: T | undefined; error: string | null; loading: boolean };

/**
 * Charge des données côté client (dans un effet, jamais au rendu serveur).
 * - `key` : relance le chargement quand il change (ex. filtres sérialisés) ; `null` = ne rien charger.
 * - `reload()` : recharge silencieusement (les données affichées restent visibles).
 * - `mutate()` : mise à jour locale optimiste.
 */
export function useAsync<T>(fn: () => Promise<T>, key: string | null = "") {
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (key === null) return;
    let active = true;
    fnRef
      .current()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (active) setState((s) => ({ data: s.data, error: errorMessage(e), loading: false }));
      });
    return () => {
      active = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((updater: (d: T | undefined) => T | undefined) => {
    setState((s) => ({ ...s, data: updater(s.data) }));
  }, []);

  return { ...state, reload, mutate };
}

/** Lève l'erreur Supabase éventuelle et renvoie `data` typé. */
export function must<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
