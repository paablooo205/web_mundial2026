"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Countdown } from "./countdown";

export function HeaderClient() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className={`topbar ${isHome ? "topbar--home" : "topbar--nav"}`}>
      <div className="topbar-content">
        <Link className="brand" href="/">
          <strong>{process.env.NEXT_PUBLIC_APP_NAME ?? "Porra Mundial 2026"}</strong>
          <span style={{ display: "flex", alignItems: "center" }}>
            USA 2026 · Club Selecto
            <Countdown />
          </span>
        </Link>
        <nav className="nav" aria-label="Navegacion">
          <Link href="/">Inicio</Link>
          <Link href="/clasificacion">Clasificación</Link>
          <Link href="/predicciones">Tu porra</Link>
          <Link href="/apuestas-jugadores">Club Selecto</Link>
          <Link href="/resultados">Resultados</Link>
          <Link href="/resultado-final">Resultado Final</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>

      <style jsx>{`
        .topbar-content {
          position: relative;
          display: flex;
          align-items: center;
          min-height: 58px;
          width: min(1100px, 100%);
          margin: 0 auto;
          padding: 10px 20px;
        }

        /* Transición elástica del logo y fluida de los enlaces */
        .brand {
          transition: left 0.8s cubic-bezier(0.25, 1, 0.5, 1), 
                      transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 10;
        }
        .nav {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          transition: opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1), 
                      transform 0.6s cubic-bezier(0.25, 1, 0.5, 1),
                      visibility 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* En la Home, centramos el logo y ocultamos la navegación */
        .topbar--home .brand {
          position: absolute;
          left: 50%;
          transform: translate(-50%, 0);
          text-align: center;
          display: grid;
          place-items: center;
        }
        .topbar--home .brand strong,
        .topbar--home .brand span {
          text-align: center;
        }
        .topbar--home .nav {
          opacity: 0;
          visibility: hidden;
          transform: translateX(30px);
          pointer-events: none;
        }

        /* En las secciones, el logo se desliza a la izquierda y el nav aparece */
        .topbar--nav .brand {
          position: absolute;
          left: 20px;
          transform: translate(0, 0);
          text-align: left;
          display: grid;
          place-items: start;
        }
        .topbar--nav .brand strong,
        .topbar--nav .brand span {
          text-align: left;
        }
        .topbar--nav .nav {
          margin-left: auto;
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        @media (max-width: 900px) {
          .topbar-content {
            flex-direction: column;
            gap: 12px;
            padding: 14px 20px;
          }
          .topbar--home .brand {
            position: relative;
            left: auto;
            transform: none;
          }
          .topbar--nav .brand {
            position: relative;
            left: auto;
            transform: none;
            margin-bottom: 4px;
          }
          .topbar--nav .nav {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
}
