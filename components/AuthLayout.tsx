import { Suspense } from "react";
import { BarChart3, ClipboardCheck, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "./Logo";

const FEATURES = [
  { Icon: ClipboardCheck, title: "Modération des annonces", text: "Validez, refusez et suivez chaque demande publiée." },
  { Icon: Stethoscope, title: "Réseau vétérinaire", text: "Gérez les comptes et les consultations des vétérinaires." },
  { Icon: BarChart3, title: "Pilotage en temps réel", text: "Statistiques, signalements et activité de la plateforme." },
];

/** Écran scindé des pages d'authentification du back-office. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panneau de marque */}
      <aside className="relative hidden overflow-hidden bg-[#0b1e2c] text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(14,124,155,0.45),transparent_45%),radial-gradient(circle_at_90%_85%,rgba(34,165,91,0.22),transparent_40%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "44px 44px" }}
        />

        <div className="relative flex flex-1 flex-col px-12 py-12 xl:px-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            <ShieldCheck className="size-4" /> Back-office
          </span>

          <h2 className="mt-8 max-w-md text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-[44px]">
            Pilotez la plateforme <span className="text-cyan-300">Bakma Store</span>.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Un espace unique pour superviser les annonces, les utilisateurs et le réseau vétérinaire.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-cyan-200">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="flex min-h-screen flex-col bg-gradient-to-b from-white to-page/60 px-6 py-8 sm:px-12">
        <Logo height={52} className="w-fit" />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</div>
        <footer className="flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row">
          <span>
            ©{" "}
            <Suspense fallback={null}>
              <CurrentYear />
            </Suspense>{" "}
            Bakma Store. Tous droits réservés.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Connexion sécurisée
          </span>
        </footer>
      </main>
    </div>
  );
}

/** Année courante : lue au rendu côté client, derrière Suspense (cacheComponents). */
function CurrentYear() {
  return <>{new Date().getFullYear()}</>;
}
