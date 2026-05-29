import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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
          <header className="topbar">
            <div className="topbar-content">
              <Link className="brand" href="/clasificacion">
                <strong>{process.env.NEXT_PUBLIC_APP_NAME ?? "Porra Mundial 2026"}</strong>
                <span>Clasificación, apuestas y resultados</span>
              </Link>
              <nav className="nav" aria-label="Navegacion">
                <Link href="/clasificacion">Clasificación</Link>
                <Link href="/predicciones">Club Selecto</Link>
                <Link href="/admin">Admin</Link>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
