"use client";

import { useState } from "react";

export function ScoringSystemModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button" 
        className="button" 
        onClick={() => setIsOpen(true)}
        style={{ fontSize: "0.85rem", padding: "6px 12px", minHeight: "32px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        <span>ℹ️</span> Sistema de Puntos
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content info-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--usa-white)" }}>Sistema de Puntuación</h2>
              <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="rules-content">
              <section>
                <h3>⚽ Partidos (Grupos y Eliminatorias)</h3>
                <ul>
                  <li><strong>Marcador Exacto:</strong> <span className="pts">+5 pts</span> <em>(Pleno de goles local y visitante)</em></li>
                  <li><strong>Signo (1X2):</strong> <span className="pts">+2 pts</span> <em>(Acertar quién gana o si hay empate)</em></li>
                  <li><strong>Diferencia de Goles:</strong> <span className="pts">+1 pt</span> extra <em>(Si aciertas el signo y la diferencia de goles, pero no el resultado exacto. P. ej: predices 2-1 y quedan 3-2. Sumas 2+1 = 3 pts)</em></li>
                </ul>
              </section>

              <section>
                <h3>🏆 Cruces de Eliminatorias (Desde Cuartos)</h3>
                <ul>
                  <li><strong>Clasificado:</strong> <span className="pts">+3 pts</span> <em>(Si aciertas el equipo que avanza a la siguiente ronda, independientemente del marcador, siempre que el cruce real coincida con el de tu cuadro)</em></li>
                </ul>
              </section>

              <section>
                <h3>⭐ Premios Especiales</h3>
                <ul>
                  <li><strong>Campeón del Mundo:</strong> <span className="pts">+10 pts</span></li>
                  <li><strong>Máximo Goleador:</strong> <span className="pts">+5 pts</span></li>
                  <li><strong>Balón de Oro (Mejor Jugador):</strong> <span className="pts">+5 pts</span></li>
                </ul>
              </section>

              <div className="note muted">
                <strong>Nota sobre Eliminatorias:</strong> Los partidos que van a prórroga o penaltis se puntúan en base al resultado <strong>al final de los 120 minutos</strong> para el marcador, pero la clasificación y el avance se determinan por quién gane la tanda de penaltis.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out forwards;
        }

        .info-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .close-button {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
        }

        .close-button:hover {
          color: var(--usa-white);
        }

        .rules-content section {
          margin-bottom: 24px;
        }

        h3 {
          font-size: 1rem;
          color: var(--usa-blue-bright);
          margin-bottom: 12px;
          font-weight: 600;
          border-bottom: 1px solid var(--line);
          padding-bottom: 6px;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        li {
          font-size: 0.9rem;
          color: var(--usa-white);
          line-height: 1.4;
        }

        li em {
          color: var(--muted);
          font-size: 0.8rem;
          display: block;
          margin-top: 4px;
        }

        .pts {
          display: inline-block;
          background: rgba(25, 135, 84, 0.2);
          color: #4ade80;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.85rem;
          border: 1px solid rgba(74, 222, 128, 0.3);
        }

        .note {
          font-size: 0.8rem;
          background: rgba(12, 21, 40, 0.5);
          padding: 12px;
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--usa-red-bright);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
