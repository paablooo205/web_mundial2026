"use client";

import { useState, useMemo } from "react";

function formatKickoff(kickoffAt: string | null): string | null {
  if (!kickoffAt) return null;
  try {
    const date = new Date(kickoffAt);
    const dayMonth = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Madrid"
    });
    const time = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid"
    });
    return `${dayMonth} · ${time}`;
  } catch {
    return null;
  }
}

import {
  groupCodes,
  resolveKnockoutBracket,
  isBracketSlotResolved
} from "@/lib/knockout-bracket";
import { RealKnockoutBracket } from "../admin/real-knockout-bracket";

type Match = {
  id: number;
  phase: string;
  home_team_name: string | null;
  away_team_name: string | null;
  kickoff_at: string | null;
};

type Team = {
  id: number;
  canonical_name: string;
  group_code: string | null;
};

type MatchResult = {
  match_id: number;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  winner_team_id: number | null;
};

type TournamentAwards = {
  champion_team_id: number | null;
  top_scorer_name: string | null;
  golden_ball_name: string | null;
} | null;

type Props = {
  matches: Match[];
  teams: Team[];
  results: MatchResult[];
  awards: TournamentAwards;
};

const groupStageMatchesPhase = "Fase de Grupos";

export function ResultadosClient({ matches, teams, results, awards }: Props) {
  const [activeTab, setActiveTab] = useState<"grupos" | "eliminatorias">("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [activeRound, setActiveRound] = useState<string>("Dieciseisavos de final");

  const knockoutRounds = [
    { key: "Dieciseisavos de final", label: "1/16 de Final" },
    { key: "Octavos de final", label: "1/8 de Final" },
    { key: "Cuartos de final", label: "Cuartos de Final" },
    { key: "Semifinales", label: "Semifinales" },
    { key: "Finales", label: "Finales" }
  ];

  // Mapeamos los resultados reales a la estructura que espera resolveKnockoutBracket
  const scores = useMemo(() => {
    const map: Record<number, { home: number | ""; away: number | "" }> = {};
    results.forEach((r) => {
      map[r.match_id] = {
        home: r.home_goals !== null ? r.home_goals : "",
        away: r.away_goals !== null ? r.away_goals : ""
      };
    });
    matches.forEach((m) => {
      if (!map[m.id]) {
        map[m.id] = { home: "", away: "" };
      }
    });
    return map;
  }, [results, matches]);

  const bracketData = useMemo(() => {
    const groupStageMatches = matches.filter((m) => m.phase === groupStageMatchesPhase);

    return resolveKnockoutBracket({
      groupCodes: [...groupCodes],
      groupStageMatches,
      teams,
      scores,
      getWinnerTeamId: (matchId) => {
        const res = results.find((r) => r.match_id === matchId);
        return res?.winner_team_id ?? null;
      }
    });
  }, [matches, teams, scores, results]);

  const groupStageMatches = useMemo(() => {
    return matches.filter((m) => m.phase === groupStageMatchesPhase);
  }, [matches]);

  const getMatchesForGroup = (groupCode: string) => {
    const groupTeamNames = new Set(
      teams.filter((t) => t.group_code === groupCode).map((t) => t.canonical_name)
    );
    return groupStageMatches.filter(
      (m) => m.home_team_name && groupTeamNames.has(m.home_team_name)
    ).sort((a, b) => a.id - b.id);
  };

  const getWinnerTeamId = (matchId: number) => {
    const res = results.find((r) => r.match_id === matchId);
    return res?.winner_team_id ?? null;
  };

  const championName = useMemo(() => {
    if (awards?.champion_team_id) {
      const team = teams.find((t) => t.id === awards.champion_team_id);
      return team?.canonical_name ?? "Por decidir";
    }
    const id = 104;
    const resHome = bracketData.resolved[id]?.home;
    const resAway = bracketData.resolved[id]?.away;
    const score = scores[id];
    if (!isBracketSlotResolved(resHome) || !isBracketSlotResolved(resAway) || !score || score.home === "") {
      return "Por decidir";
    }
    const hg = Number(score.home);
    const ag = Number(score.away);
    if (hg > ag) return resHome;
    if (hg < ag) return resAway;
    const winnerId = getWinnerTeamId(id);
    return teams.find((t) => t.id === winnerId)?.canonical_name ?? resHome;
  }, [bracketData.resolved, scores, teams, awards, results]);

  const getMatchesForRound = (roundKey: string) => {
    if (roundKey === "Finales") {
      return matches.filter((m) => m.phase === "Final" || m.phase === "3º y 4º puesto")
                    .sort((a, b) => b.id - a.id); // Final en primer lugar
    }
    return matches.filter((m) => m.phase === roundKey).sort((a, b) => a.id - b.id);
  };

  return (
    <div className="resultados-container">
      {/* Estilos CSS premium incrustados */}
      <style jsx>{`
        .tab-nav {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 12px;
        }
        .group-filter-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        .group-filter-container::-webkit-scrollbar {
          height: 4px;
        }
        .group-filter-container::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 99px;
        }
        .split-layout {
          display: grid;
          grid-template-columns: minmax(320px, 420px) 1fr;
          gap: 32px;
        }
        @media (max-width: 900px) {
          .split-layout {
            grid-template-columns: 1fr;
          }
        }
        .table-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .table-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--line);
        }
        .standings-panel {
          padding: 0;
          border: 1px solid var(--border);
          background: rgba(12, 21, 40, 0.45);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .standings-table {
          width: 100%;
          border-collapse: collapse;
        }
        .standings-table th,
        .standings-table td {
          padding: 10px 12px;
          font-size: 0.8125rem;
          text-align: center;
          border-bottom: 1px solid var(--line);
        }
        .standings-table th {
          background: rgba(60, 59, 110, 0.25);
          color: var(--muted);
          font-weight: 700;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .standings-table tr:last-child td {
          border-bottom: none;
        }
        .standings-table td:nth-child(2) {
          text-align: left;
          font-weight: 600;
          color: var(--usa-white);
        }
        .standings-table tr.qualify-direct td {
          background: rgba(37, 99, 235, 0.07);
        }
        .standings-table tr.qualify-direct td:first-child {
          color: var(--secondary);
          font-weight: 800;
        }
        .standings-table tr.qualify-third td {
          background: rgba(255, 255, 255, 0.02);
        }
        .standings-table tr.qualify-third td:first-child {
          color: var(--muted);
          font-weight: 700;
        }
        .match-cards-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .match-item {
          background: rgba(12, 21, 40, 0.35);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          transition: border-color 0.2s ease;
        }
        .match-item:hover {
          border-color: var(--border-strong);
        }
        .match-team {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .match-team--home {
          align-items: flex-end;
          text-align: right;
        }
        .match-team--away {
          align-items: flex-start;
          text-align: left;
        }
        .match-team-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--usa-white);
        }
        .match-team-name--winner {
          color: #fbbf24;
          text-shadow: 0 0 6px rgba(251, 191, 36, 0.15);
        }
        .match-team-flag {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
        }
        .match-score-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .score-pill {
          display: inline-flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 6px 14px;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--usa-white);
          min-width: 78px;
          justify-content: center;
        }
        .score-dash {
          color: var(--muted);
          opacity: 0.5;
        }
        .score-status {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
        }
        .score-status--finished {
          background: rgba(255, 255, 255, 0.05);
          color: var(--muted);
          border-color: var(--border);
        }
        .score-status--live {
          background: rgba(220, 38, 38, 0.1);
          color: var(--danger);
          border-color: rgba(220, 38, 38, 0.3);
          animation: pulse 1.5s infinite alternate;
        }
        .score-status--scheduled {
          background: rgba(37, 99, 235, 0.1);
          color: var(--secondary);
          border-color: rgba(37, 99, 235, 0.3);
        }
        .match-kickoff-time {
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: var(--muted);
          opacity: 0.75;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .bracket-container {
          background: rgba(12, 21, 40, 0.2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          overflow-x: auto;
        }
        .bracket-viewport-wrap {
          min-width: 900px;
        }
        .qualify-legend {
          display: flex;
          gap: 16px;
          font-size: 0.725rem;
          color: var(--muted);
          margin-top: 10px;
          padding: 0 4px;
        }
        .qualify-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot--direct {
          background: var(--usa-blue-bright);
        }
        .dot--third {
          background: var(--muted);
        }

        /* Estilos de Cuadro de Honor / Premios */
        .awards-panel {
          padding: 20px;
          border: 1px solid var(--border);
          background: rgba(12, 21, 40, 0.45);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }
        .awards-champion-card {
          background: linear-gradient(135deg, rgba(180, 83, 9, 0.22) 0%, rgba(251, 191, 36, 0.04) 100%);
          border: 1px solid rgba(251, 191, 36, 0.35);
          border-radius: var(--radius-sm);
          padding: 24px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .awards-champion-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top, rgba(251, 191, 36, 0.15), transparent 70%);
          pointer-events: none;
        }
        .awards-trophy {
          font-size: 2.5rem;
          margin-bottom: 8px;
          display: inline-block;
          animation: trophyPulse 2s infinite alternate ease-in-out;
        }
        .awards-champion-name {
          font-size: 1.3rem;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.35);
          margin-bottom: 4px;
        }
        .awards-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }
        .awards-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .awards-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
        }
        .awards-stat-value {
          font-weight: 700;
          color: var(--usa-white);
          font-size: 0.85rem;
        }

        @media (max-width: 600px) {
          .match-item {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 12px;
            padding: 16px;
          }
          .match-team {
            align-items: center !important;
            text-align: center !important;
          }
          .match-team--home {
            flex-direction: column;
          }
          .match-team--away {
            flex-direction: column-reverse; /* Flag below name */
          }
          .score-pill {
            min-width: auto;
            width: 100%;
          }
        }

        @keyframes trophyPulse {
          0% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1.05) rotate(2deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Navegación por pestañas */}
      <div className="tab-nav">
        <button
          type="button"
          className={`tab-button ${activeTab === "grupos" ? "active" : ""}`}
          onClick={() => setActiveTab("grupos")}
        >
          Fase de Grupos
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "eliminatorias" ? "active" : ""}`}
          onClick={() => setActiveTab("eliminatorias")}
        >
          Fase Final / Eliminatorias
        </button>
      </div>

      {/* Contenido: Grupos */}
      {activeTab === "grupos" && (
        <div>
          {/* Selector de Grupo */}
          <div className="group-filter-container">
            {groupCodes.map((g) => (
              <button
                key={g}
                type="button"
                className={`subtab-button ${activeGroup === g ? "active" : ""}`}
                onClick={() => setActiveGroup(g)}
              >
                Grupo {g}
              </button>
            ))}
          </div>

          <div className="split-layout">
            {/* Tabla de Clasificación del Grupo Seleccionado */}
            <div>
              <h3 className="table-title">Clasificación Grupo {activeGroup}</h3>
              <div className="standings-panel">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Selección</th>
                      <th>Pts</th>
                      <th>DG</th>
                      <th>GF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bracketData.standings[activeGroup]?.map((row, index) => {
                      const isFirstOrSecond = index < 2;
                      const isThird = index === 2;
                      const rowClass = isFirstOrSecond
                        ? "qualify-direct"
                        : isThird
                        ? "qualify-third"
                        : "";

                      return (
                        <tr key={row.team.id} className={rowClass}>
                          <td>{index + 1}</td>
                          <td>{row.team.canonical_name}</td>
                          <td><strong>{row.pts}</strong></td>
                          <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                          <td>{row.gs}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="qualify-legend">
                <div className="qualify-legend-item">
                  <span className="dot dot--direct" />
                  <span>Clasifica directo (Top 2)</span>
                </div>
                <div className="qualify-legend-item">
                  <span className="dot dot--third" />
                  <span>Disputa mejores terceros</span>
                </div>
              </div>
            </div>

            {/* Partidos del Grupo Seleccionado */}
            <div>
              <h3 className="table-title">Partidos del Grupo {activeGroup}</h3>
              <div className="match-cards-list">
                {getMatchesForGroup(activeGroup).map((match) => {
                  const score = scores[match.id];
                  const res = results.find((r) => r.match_id === match.id);
                  const isFinished = res?.status === "finished";
                  const isLive = res?.status === "live";

                  const scoreText =
                    score && score.home !== "" && score.away !== "" ? (
                      <span className="score-pill">
                        {score.home} <span className="score-dash">&nbsp;-&nbsp;</span> {score.away}
                      </span>
                    ) : (
                      <span className="score-pill">
                        <span className="score-dash" style={{ letterSpacing: "normal" }}>VS</span>
                      </span>
                    );

                  return (
                    <div className="match-item" key={match.id}>
                      {/* Local */}
                      <div className="match-team match-team--home">
                        <span className="match-team-name">{match.home_team_name ?? "Por decidir"}</span>
                        <span className="match-team-flag">Local</span>
                      </div>

                      {/* Marcador e Info */}
                      <div className="match-score-center">
                        {scoreText}
                        <span
                          className={`score-status ${
                            isFinished
                              ? "score-status--finished"
                              : isLive
                              ? "score-status--live"
                              : "score-status--scheduled"
                          }`}
                        >
                          {isFinished ? "Finalizado" : isLive ? "En Vivo" : "Programado"}
                        </span>
                        {formatKickoff(match.kickoff_at) && (
                          <span className="match-kickoff-time">
                            🕐 {formatKickoff(match.kickoff_at)}
                          </span>
                        )}
                      </div>

                      {/* Visitante */}
                      <div className="match-team match-team--away">
                        <span className="match-team-name">{match.away_team_name ?? "Por decidir"}</span>
                        <span className="match-team-flag">Visitante</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido: Eliminatorias */}
      {activeTab === "eliminatorias" && (
        <div>
          {/* Selector de Ronda de Eliminatorias (idéntica estética al selector de grupos) */}
          <div className="group-filter-container">
            {knockoutRounds.map((round) => (
              <button
                key={round.key}
                type="button"
                className={`subtab-button ${activeRound === round.key ? "active" : ""}`}
                onClick={() => setActiveRound(round.key)}
              >
                {round.label}
              </button>
            ))}
          </div>

          <div className="split-layout" style={{ marginBottom: "40px" }}>
            {/* Cuadro de Honor / Campeón del torneo */}
            <div>
              <h3 className="table-title">Cuadro de Honor</h3>
              <div className="awards-panel">
                <div className="awards-champion-card">
                  <span className="awards-trophy">🏆</span>
                  <div className="awards-champion-name">{championName}</div>
                  <div className="awards-label">Campeón del Mundo</div>
                </div>

                <div className="awards-list">
                  <div className="awards-stat-row">
                    <span className="awards-label">Bota de Oro</span>
                    <span className="awards-stat-value">{awards?.top_scorer_name ?? "Por decidir"}</span>
                  </div>
                  <div className="awards-stat-row">
                    <span className="awards-label">Balón de Oro</span>
                    <span className="awards-stat-value">{awards?.golden_ball_name ?? "Por decidir"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Partidos de la Ronda de Eliminatorias Seleccionada */}
            <div>
              <h3 className="table-title">Partidos de {knockoutRounds.find(r => r.key === activeRound)?.label}</h3>
              <div className="match-cards-list">
                {getMatchesForRound(activeRound).map((match) => {
                  const score = scores[match.id];
                  const res = results.find((r) => r.match_id === match.id);
                  const isFinished = res?.status === "finished";
                  const isLive = res?.status === "live";

                  const resolvedHome = bracketData.resolved[match.id]?.home ?? match.home_team_name ?? "Por decidir";
                  const resolvedAway = bracketData.resolved[match.id]?.away ?? match.away_team_name ?? "Por decidir";

                  const winnerId = getWinnerTeamId(match.id);
                  const isHomeWinner = winnerId && teams.find((t) => t.id === winnerId)?.canonical_name === resolvedHome;
                  const isAwayWinner = winnerId && teams.find((t) => t.id === winnerId)?.canonical_name === resolvedAway;

                  const scoreText =
                    score && score.home !== "" && score.away !== "" ? (
                      <span className="score-pill">
                        {score.home} <span className="score-dash">&nbsp;-&nbsp;</span> {score.away}
                      </span>
                    ) : (
                      <span className="score-pill">
                        <span className="score-dash" style={{ letterSpacing: "normal" }}>VS</span>
                      </span>
                    );

                  return (
                    <div className="match-item" key={match.id}>
                      {/* Local */}
                      <div className="match-team match-team--home">
                        <span className={`match-team-name ${isHomeWinner ? "match-team-name--winner" : ""}`}>
                          {resolvedHome} {isHomeWinner ? "🏆" : ""}
                        </span>
                        <span className="match-team-flag">Local</span>
                      </div>

                      {/* Marcador e Info */}
                      <div className="match-score-center">
                        {scoreText}
                        <span
                          className={`score-status ${
                            isFinished
                              ? "score-status--finished"
                              : isLive
                              ? "score-status--live"
                              : "score-status--scheduled"
                          }`}
                        >
                          {isFinished ? "Finalizado" : isLive ? "En Vivo" : "Programado"}
                        </span>
                        {formatKickoff(match.kickoff_at) && (
                          <span className="match-kickoff-time">
                            🕐 {formatKickoff(match.kickoff_at)}
                          </span>
                        )}
                      </div>

                      {/* Visitante */}
                      <div className="match-team match-team--away">
                        <span className={`match-team-name ${isAwayWinner ? "match-team-name--winner" : ""}`}>
                          {resolvedAway} {isAwayWinner ? "🏆" : ""}
                        </span>
                        <span className="match-team-flag">Visitante</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cuadro Visual de Eliminatorias en la parte inferior */}
          <h3 className="table-title" style={{ marginBottom: "16px" }}>Estructura del Cuadro Completo</h3>
          <div className="bracket-container">
            <div className="bracket-viewport-wrap">
              <RealKnockoutBracket
                resolved={bracketData.resolved}
                scores={scores}
                teams={teams}
                getWinnerTeamId={getWinnerTeamId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
