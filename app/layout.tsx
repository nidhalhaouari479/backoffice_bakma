import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Même police que le site Bakma Store (spa).
const font = Nunito({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Bakma Admin", template: "%s · Bakma Admin" },
  description: "Panneau d'administration de Bakma Store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${font.variable} h-full antialiased`}>
      <body className="admin-dashboard min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
