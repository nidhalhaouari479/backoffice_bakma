import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Limite les workers de build (machines avec peu de mémoire). Peut être retiré.
  experimental: {
    cpus: 2,
    // L'espace admin est protégé côté client (AdminShell attend l'auth Supabase avant
    // de rendre la page) : la validation "instant" ne peut pas voir les pages et lève
    // "instant-unrendered-segment". On ne valide que les segments qui exportent `instant`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
