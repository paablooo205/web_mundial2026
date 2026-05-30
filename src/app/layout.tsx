import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import { HeaderClient } from "./header-client";
import { KickoffModal } from "./kickoff-modal";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Porra Mundial 2026",
  description: "Clasificación y predicciones de la porra del Mundial 2026"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body>
        <div className="shell">
          <HeaderClient />
          {children}
        </div>
        <KickoffModal />
        <Analytics />
      </body>
    </html>
  );
}
