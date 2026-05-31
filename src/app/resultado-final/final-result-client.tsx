"use client";

import { useEffect, useState, useMemo } from "react";
import type { StandingRow } from "@/lib/types";

type Awards = {
  championName: string;
  topScorerName: string;
  goldenBallName: string;
};

type Player = { id: number; display_name: string; };
type PlayerPrediction = {
  player_id: number; match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
};

type Props = {
  awards: Awards;
  players: Player[];
  predictions: PlayerPrediction[];
  standings: StandingRow[];
};

// Domingo 19 de julio de 2026, 15:00 UTC
const FINAL_START_DATE = new Date("2026-07-19T15:00:00Z").getTime();

export function FinalResultClient({ awards, players, predictions, standings }: Props) {
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

  const getPlayerName = (id: number) => players.find(p => p.id === id)?.display_name || `Jugador ${id}`;

  const highlights = useMemo(() => {
    // 1. Oráculo y Rey 1X2
    let oraculoNames = "Nadie";
    let rey1x2Names = "Nadie";
    let oraculoVal = 0;
    let rey1x2Val = 0;

    if (standings.length > 0) {
      const maxExact = Math.max(...standings.map(s => s.exact_scores ?? 0));
      const maxSigns = Math.max(...standings.map(s => s.correct_signs ?? 0));

      if (maxExact > 0) {
        oraculoVal = maxExact;
        oraculoNames = standings.filter(s => s.exact_scores === maxExact).map(s => s.display_name).join(", ");
      }
      if (maxSigns > 0) {
        rey1x2Val = maxSigns;
        rey1x2Names = standings.filter(s => s.correct_signs === maxSigns).map(s => s.display_name).join(", ");
      }
    }

    // 2. Amarrategui y Gafas
    let amarrateguiNames = "N/A";
    let gafasNames = "N/A";
    let amarrateguiVal = "0.00";
    let gafasVal = 0;

    if (predictions.length > 0) {
      const dataByPlayer: Record<number, { totalGoals: number, count: number, zeroZero: number }> = {};
      predictions.forEach(p => {
        if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
          if (!dataByPlayer[p.player_id]) dataByPlayer[p.player_id] = { totalGoals: 0, count: 0, zeroZero: 0 };
          dataByPlayer[p.player_id].totalGoals += p.predicted_home_goals + p.predicted_away_goals;
          dataByPlayer[p.player_id].count += 1;
          if (p.predicted_home_goals === 0 && p.predicted_away_goals === 0) {
            dataByPlayer[p.player_id].zeroZero += 1;
          }
        }
      });

      const playersStats = Object.keys(dataByPlayer).map(pid => {
        const data = dataByPlayer[Number(pid)];
        return { id: Number(pid), avg: data.totalGoals / data.count, count: data.count, zeroZero: data.zeroZero };
      });

      const validAvg = playersStats.filter(p => p.count >= 10).sort((a, b) => a.avg - b.avg);
      if (validAvg.length > 0) {
        const minAvg = validAvg[0].avg;
        amarrateguiVal = minAvg.toFixed(2);
        amarrateguiNames = validAvg.filter(p => p.avg === minAvg).map(p => getPlayerName(p.id)).join(", ");
      }

      const validGafas = playersStats.filter(p => p.zeroZero > 0).sort((a, b) => b.zeroZero - a.zeroZero);
      if (validGafas.length > 0) {
        gafasVal = validGafas[0].zeroZero;
        gafasNames = validGafas.filter(p => p.zeroZero === gafasVal).map(p => getPlayerName(p.id)).join(", ");
      }
    }

    return { oraculoNames, oraculoVal, rey1x2Names, rey1x2Val, amarrateguiNames, amarrateguiVal, gafasNames, gafasVal };
  }, [standings, predictions, players]);


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
    <div style={{ display: "flex", flexDirection: "column", gap: "40px", animation: "fadeIn 0.5s ease-out" }}>
      
      {/* Premios Oficiales */}
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
      </div>

      {/* Highlights de la Porra */}
      <div className="panel" style={{ padding: "40px 20px" }}>
        <h2 style={{ marginBottom: "32px", color: "var(--usa-white)", fontSize: "1.75rem", textAlign: "center" }}>
          Lo más destacado de la Porra
        </h2>

        <div className="highlights-grid">
          <div className="highlight-item">
            <div className="hl-icon">🎯</div>
            <div className="hl-content">
              <h4>El Oráculo</h4>
              <p>Acertó {highlights.oraculoVal} resultados exactos.</p>
              <div className="hl-winner">{highlights.oraculoNames}</div>
            </div>
          </div>

          <div className="highlight-item">
            <div className="hl-icon">⚖️</div>
            <div className="hl-content">
              <h4>El Rey del 1X2</h4>
              <p>Acertó {highlights.rey1x2Val} signos correctos.</p>
              <div className="hl-winner">{highlights.rey1x2Names}</div>
            </div>
          </div>

          <div className="highlight-item">
            <div className="hl-icon">🛡️</div>
            <div className="hl-content">
              <h4>El Amarrategui</h4>
              <p>Promedió {highlights.amarrateguiVal} goles pronosticados.</p>
              <div className="hl-winner">{highlights.amarrateguiNames}</div>
            </div>
          </div>

          <div className="highlight-item">
            <div className="hl-icon">👓</div>
            <div className="hl-content">
              <h4>El Gafas</h4>
              <p>Apostó al 0-0 un total de {highlights.gafasVal} veces.</p>
              <div className="hl-winner">{highlights.gafasNames}</div>
            </div>
          </div>
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

        .highlights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .highlight-item {
          display: flex;
          gap: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          padding: 20px;
          border-radius: var(--radius-md);
          align-items: center;
        }
        .hl-icon {
          font-size: 2.5rem;
          background: rgba(255, 255, 255, 0.05);
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .hl-content h4 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: var(--usa-blue-bright);
        }
        .hl-content p {
          margin: 0 0 8px 0;
          font-size: 0.85rem;
          color: var(--muted);
        }
        .hl-winner {
          font-weight: 700;
          font-size: 1.2rem;
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
