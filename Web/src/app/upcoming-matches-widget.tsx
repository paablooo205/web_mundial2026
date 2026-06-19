"use client";

import { useState, useEffect, useTransition } from "react";

type UpcomingMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  stage?: string;
  group_code?: string;
  hasMultiplier?: boolean;
};

type Props = {
  matches: UpcomingMatch[];
};

function formatMatchDate(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  });
  const time = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  return { date, time };
}

function getTimeUntil(isoString: string): string {
  const now = new Date();
  const kickoff = new Date(isoString);
  const diffMs = kickoff.getTime() - now.getTime();
  if (diffMs <= 0) {
    // Partido ya empezado: mostrar "En curso" si lleva menos de 3h (duración max aprox)
    const elapsedMs = Math.abs(diffMs);
    if (elapsedMs < 3 * 60 * 60 * 1000) return "En curso";
    return "Finalizado";
  }
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffH >= 48) {
    const diffD = Math.floor(diffH / 24);
    return `En ${diffD}d`;
  }
  if (diffH >= 1) return `En ${diffH}h ${diffM}m`;
  return `En ${diffM}m`;
}

export function UpcomingMatchesWidget({ matches }: Props) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // Actualizar el reloj cada minuto para refrescar los "En Xh Xm"
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (matches.length === 0) return null;

  return (
    <>
      <style>{`
        .upcoming-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .upcoming-panel {
          background: rgba(8, 15, 30, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 16px;
          width: 280px;
          max-height: 70vh;
          overflow-y: auto;
          box-shadow:
            0 24px 48px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          transform-origin: bottom right;
          animation: panelIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .upcoming-panel__header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .upcoming-panel__title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          flex: 1;
        }

        .upcoming-match-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          animation: matchIn 0.3s ease both;
        }
        .upcoming-match-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .upcoming-match-item:first-child {
          padding-top: 0;
        }

        @keyframes matchIn {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .upcoming-match-item:nth-child(1) { animation-delay: 0.05s; }
        .upcoming-match-item:nth-child(2) { animation-delay: 0.10s; }
        .upcoming-match-item:nth-child(3) { animation-delay: 0.15s; }

        .upcoming-match__teams {
          font-size: 0.875rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .upcoming-match__vs {
          font-size: 0.7rem;
          font-weight: 500;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .upcoming-match__meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .upcoming-match__datetime {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }

        .upcoming-match__countdown {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          background: rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(37, 99, 235, 0.3);
          white-space: nowrap;
        }

        .upcoming-match__countdown--soon {
          background: rgba(220, 38, 38, 0.2);
          color: #f87171;
          border-color: rgba(220, 38, 38, 0.3);
        }

        .upcoming-match__multiplier {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%);
          color: #fbbf24;
          border: 1px solid rgba(234, 179, 8, 0.4);
          letter-spacing: 0.03em;
          white-space: nowrap;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.15);
        }

        .upcoming-match__stage {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* FAB button */
        .upcoming-fab-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(29, 78, 216, 0.9) 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45), 0 0 0 1px rgba(255,255,255,0.08) inset;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          position: relative;
        }

        .upcoming-fab-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.6), 0 0 0 1px rgba(255,255,255,0.12) inset;
        }

        .upcoming-fab-btn:active {
          transform: scale(0.95);
        }

        .upcoming-fab-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #dc2626;
          border: 2px solid rgba(8, 15, 30, 1);
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          line-height: 1;
        }

        @media (max-width: 480px) {
          .upcoming-fab {
            bottom: 16px;
            right: 16px;
          }
          .upcoming-panel {
            width: 260px;
          }
        }
      `}</style>

      <div className="upcoming-fab">
        {/* Panel desplegable */}
        {open && (
          <div className="upcoming-panel">
            <div className="upcoming-panel__header">
              <span style={{ fontSize: "1rem" }}>⚽</span>
              <span className="upcoming-panel__title">Próximos Partidos</span>
            </div>

            {matches.map((match) => {
              const { date, time } = formatMatchDate(match.kickoff_at);
              const countdown = getTimeUntil(match.kickoff_at);
              const kickoffTime = new Date(match.kickoff_at).getTime();
              const nowTime = now.getTime();
              const isLive = kickoffTime <= nowTime && nowTime - kickoffTime < 3 * 60 * 60 * 1000;
              const isSoon = isLive || (kickoffTime - nowTime < 6 * 60 * 60 * 1000 && kickoffTime > nowTime);

              return (
                <div key={match.id} className="upcoming-match-item">
                  <div className="upcoming-match__teams">
                    <span>{match.home_team}</span>
                    <span className="upcoming-match__vs">vs</span>
                    <span>{match.away_team}</span>
                  </div>
                  <div className="upcoming-match__meta">
                    <span className="upcoming-match__datetime">
                      {date} · {time}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {match.hasMultiplier && (
                        <span className="upcoming-match__multiplier">
                          ⚡ ×2
                        </span>
                      )}
                      <span className={`upcoming-match__countdown${isSoon ? " upcoming-match__countdown--soon" : ""}`}>
                        {countdown}
                      </span>
                    </div>
                  </div>
                  {(match.stage || match.group_code) && (
                    <span className="upcoming-match__stage">
                      {match.stage}
                      {match.group_code && match.stage === "Fase de Grupos" && ` - Grupo ${match.group_code}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botón FAB */}
        <button
          className="upcoming-fab-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar próximos partidos" : "Ver próximos partidos"}
          title="Próximos partidos"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )}
          <span className="upcoming-fab-badge">{matches.length}</span>
        </button>
      </div>
    </>
  );
}
