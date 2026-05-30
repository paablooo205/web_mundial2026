"use client";

import { useEffect, useState } from "react";

type Awards = {
  championName: string;
  topScorerName: string;
  goldenBallName: string;
};

// Domingo 19 de julio de 2026, 15:00 UTC
const FINAL_START_DATE = new Date("2026-07-19T15:00:00Z").getTime();

export function FinalResultClient({ awards }: { awards: Awards }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const diff = FINAL_START_DATE - now;

      if (diff <= 0) {
        setIsUnlocked(true);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ d, h, m, s });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isUnlocked && !timeLeft) return <div className="panel" style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Cargando resultados...</div>;

  if (!isUnlocked && timeLeft) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ marginBottom: "30px", color: "var(--usa-white)" }}>Faltan para la gran final</h2>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <div className="time-box">
            <span className="value">{timeLeft.d}</span>
            <span className="label">Días</span>
          </div>
          <div className="time-box">
            <span className="value">{timeLeft.h}</span>
            <span className="label">Horas</span>
          </div>
          <div className="time-box">
            <span className="value">{timeLeft.m}</span>
            <span className="label">Minutos</span>
          </div>
          <div className="time-box">
            <span className="value">{timeLeft.s}</span>
            <span className="label">Segundos</span>
          </div>
        </div>
        <p className="muted" style={{ marginTop: "30px" }}>
          Esta sección se desbloqueará automáticamente el Domingo 19 de Julio de 2026.
        </p>
        <style jsx>{`
          .time-box {
            background: rgba(12, 21, 40, 0.5);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 20px;
            min-width: 90px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          .value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--usa-blue-bright);
            font-family: monospace;
          }
          .label {
            font-size: 0.85rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          @media (max-width: 600px) {
            .time-box { min-width: 70px; padding: 15px; }
            .value { font-size: 1.8rem; }
          }
        `}</style>
      </div>
    );
  }

  // Desbloqueado
  return (
    <div className="panel" style={{ padding: "50px 20px", textAlign: "center" }}>
      <h2 style={{ marginBottom: "40px", color: "var(--usa-white)", fontSize: "2rem" }}>¡Resultados Oficiales del Mundial!</h2>
      
      <div className="awards-grid">
        <div className="award-card champion">
          <div className="icon">🏆</div>
          <h3>Campeón del Mundo</h3>
          <div className="name">{awards.championName}</div>
        </div>
        
        <div className="award-card">
          <div className="icon">⚽</div>
          <h3>Máximo Goleador</h3>
          <div className="name">{awards.topScorerName}</div>
        </div>
        
        <div className="award-card">
          <div className="icon">⭐</div>
          <h3>Balón de Oro</h3>
          <div className="name">{awards.goldenBallName}</div>
        </div>
      </div>

      <style jsx>{`
        .awards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .award-card {
          background: rgba(12, 21, 40, 0.4);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .award-card:hover {
          transform: translateY(-5px);
          border-color: var(--usa-blue-bright);
        }
        .award-card.champion {
          background: linear-gradient(145deg, rgba(12, 21, 40, 0.8), rgba(212, 175, 55, 0.15));
          border-color: rgba(212, 175, 55, 0.4);
        }
        .award-card.champion:hover {
          border-color: rgba(212, 175, 55, 0.8);
        }
        .icon {
          font-size: 3.5rem;
          margin-bottom: 8px;
        }
        h3 {
          font-size: 1.1rem;
          color: var(--muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .name {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--usa-white);
        }
        @media (max-width: 900px) {
          .awards-grid { grid-template-columns: 1fr; }
          .award-card.champion { order: -1; }
        }
      `}</style>
    </div>
  );
}
