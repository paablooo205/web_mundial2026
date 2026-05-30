"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleBetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("Introduce tu código de acceso.");
      return;
    }
    router.push(`/predicciones/${encodeURIComponent(cleanCode)}`);
  }

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "calc(80vh - 60px)" }}>
      {/* Estilos locales premium y animaciones */}
      <style jsx global>{`
        .hero-section {
          text-align: center;
          margin-bottom: 48px;
          animation: fadeIn 0.8s ease-out;
        }
        .hero-title {
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          background: linear-gradient(135deg, #ffffff 40%, var(--muted) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        .hero-subtitle {
          font-size: clamp(0.95rem, 2vw, 1.2rem);
          color: var(--muted);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 28px;
          width: 100%;
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        .menu-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 32px;
          background: rgba(12, 21, 40, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          overflow: hidden;
          cursor: pointer;
        }
        .menu-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: transparent;
          transition: background 0.3s ease;
        }
        .menu-card--standings::before {
          background: linear-gradient(90deg, var(--usa-blue-bright), transparent);
        }
        .menu-card--results::before {
          background: linear-gradient(90deg, #10b981, transparent);
        }
        .menu-card--bet::before {
          background: linear-gradient(90deg, var(--usa-red-bright), transparent);
        }
        .menu-card:hover {
          transform: translateY(-6px);
          border-color: var(--border-strong);
          background: rgba(12, 21, 40, 0.65);
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.4),
            0 0 20px rgba(255, 255, 255, 0.02);
        }
        .menu-card--standings:hover {
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(37, 99, 235, 0.15);
        }
        .menu-card--results:hover {
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(16, 185, 129, 0.15);
        }
        .menu-card--bet:hover {
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(220, 38, 38, 0.15);
        }
        .menu-card__icon {
          font-size: 3rem;
          margin-bottom: 20px;
          display: inline-block;
          transition: transform 0.3s ease;
        }
        .menu-card:hover .menu-card__icon {
          transform: scale(1.15) rotate(4deg);
        }
        .menu-card__title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--usa-white);
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }
        .menu-card__desc {
          font-size: 0.9375rem;
          color: var(--muted);
          line-height: 1.5;
          margin-bottom: 24px;
          flex: 1;
        }
        .menu-card__action {
          align-self: flex-start;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--usa-white);
          transition: gap 0.2s ease;
        }
        .menu-card:hover .menu-card__action {
          gap: 10px;
        }
        .menu-card__action svg {
          transition: transform 0.2s ease;
        }
        .menu-card:hover .menu-card__action svg {
          transform: translateX(2px);
        }

        /* Formulario integrado en la tarjeta de apuestas */
        .inline-auth-form {
          width: 100%;
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .inline-auth-input-container {
          position: relative;
          width: 100%;
        }
        .inline-auth-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          color: var(--usa-white);
          transition: all 0.3s ease;
        }
        .inline-auth-input:focus {
          border-color: var(--usa-red-bright);
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
          background: rgba(0, 0, 0, 0.5);
        }
        .inline-auth-button {
          width: 100%;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 0.875rem;
          background: var(--usa-red-bright);
          border: 1px solid var(--usa-red);
          color: var(--usa-white);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .inline-auth-button:hover {
          background: #ef4444;
          border-color: var(--usa-red-bright);
          transform: translateY(-1px);
        }
        .inline-auth-error {
          font-size: 0.8rem;
          color: var(--danger);
          margin: 4px 0 0 2px;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Hero Header */}
      <section className="hero-section">
        <h1 className="hero-title">Porra Mundial 2026</h1>
        <p className="hero-subtitle">
          Bienvenidos al portal exclusivo del <strong>Club Selecto</strong>. Sigue la clasificación, consulta los resultados reales y gestiona tus apuestas.
        </p>
      </section>

      {/* Grid de Opciones */}
      <div className="menu-grid">
        {/* Opción 1: Clasificación */}
        <Link href="/clasificacion" passHref legacyBehavior>
          <div className="menu-card menu-card--standings">
            <span className="menu-card__icon">🏆</span>
            <h2 className="menu-card__title">Ver Clasificación</h2>
            <p className="menu-card__desc">
              Consulta la tabla de posiciones en vivo. Compara tus puntos con los demás competidores del Club Selecto y mira quién lidera la porra.
            </p>
            <div className="menu-card__action">
              <span>Ver tabla completa</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Opción 2: Insertar/Editar Apuesta con Formulario Integrado */}
        <div className="menu-card menu-card--bet" onClick={(e) => {
          // Evitamos que haga clic en la tarjeta entera si hacen clic en elementos del form
          const target = e.target as HTMLElement;
          if (target.closest("form")) return;
          // Si hacen clic en la tarjeta fuera del form, ponemos el foco en el input
          document.getElementById("menu-access-code")?.focus();
        }}>
          <span className="menu-card__icon">🔒</span>
          <h2 className="menu-card__title">Apuestas / Pronósticos</h2>
          <p className="menu-card__desc" style={{ marginBottom: "16px" }}>
            Introduce tu código privado para rellenar, revisar o editar tu porra personal del torneo antes del cierre de los partidos.
          </p>

          <form onSubmit={handleBetSubmit} className="inline-auth-form">
            <div className="inline-auth-input-container">
              <input
                id="menu-access-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="juanmizo_marcaico"
                className="inline-auth-input"
                autoComplete="off"
                spellCheck={false}
              />
              {error && <p className="inline-auth-error">{error}</p>}
            </div>

            <button type="submit" className="inline-auth-button">
              <span>Entrar a mis apuestas</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>

        {/* Opción 3: Resultados Reales */}
        <Link href="/resultados" passHref legacyBehavior>
          <div className="menu-card menu-card--results">
            <span className="menu-card__icon">⚽</span>
            <h2 className="menu-card__title">Resultados Reales</h2>
            <p className="menu-card__desc">
              Revisa el calendario oficial del Mundial 2026, los marcadores de los partidos finalizados en tiempo real y el estado del cuadro de eliminatorias.
            </p>
            <div className="menu-card__action">
              <span>Explorar calendario</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
