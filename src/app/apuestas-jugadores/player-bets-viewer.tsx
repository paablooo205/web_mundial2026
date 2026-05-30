"use client";

import { useState, useMemo } from "react";
import {
  groupCodes as BRACKET_GROUP_CODES,
  isBracketSlotResolved,
  resolveKnockoutBracket
} from "@/lib/knockout-bracket";

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

type Player = {
  id: number;
  display_name: string;
};

type PlayerPrediction = {
  player_id: number;
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
};

type PlayerSpecialPrediction = {
  player_id: number;
  champion_team_id: number | null;
  top_scorer_name: string | null;
  golden_ball_name: string | null;
};

type Props = {
  matches: Match[];
  teams: Team[];
  players: Player[];
  predictions: PlayerPrediction[];
  specialPredictions: PlayerSpecialPrediction[];
};

const groupCodes = [...BRACKET_GROUP_CODES];

const knockoutRounds = [
  "Dieciseisavos de final",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "3º y 4º puesto",
  "Final",
];

const groupStageMatchesPhase = "Fase de Grupos";

export function PlayerBetsViewer({
  matches,
  teams,
  players,
  predictions,
  specialPredictions,
}: Props) {
  // Selected player for viewing predictions
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(players[0]?.id || 0);
  const [playerViewerTab, setPlayerViewerTab] = useState<"especiales" | "grupos" | "eliminatorias">("especiales");
  const [activeViewerGroup, setActiveViewerGroup] = useState<string>("A");
  const [playerKnockoutMode, setPlayerKnockoutMode] = useState<"rondas" | "cuadro">("rondas");
  const [activeViewerKnockoutRound, setActiveViewerKnockoutRound] = useState(knockoutRounds[0]);

  // Computations for selected player predictions
  const selectedPlayerPredictions = useMemo(() => {
    return predictions.filter((p) => p.player_id === selectedPlayerId);
  }, [predictions, selectedPlayerId]);

  const selectedPlayerSpecial = useMemo(() => {
    return specialPredictions.find((sp) => sp.player_id === selectedPlayerId) || null;
  }, [specialPredictions, selectedPlayerId]);

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

  const knockoutMatchesByPhase = useMemo(() => {
    const map: Record<string, Match[]> = {};
    matches.forEach((m) => {
      if (m.phase !== groupStageMatchesPhase) {
        if (!map[m.phase]) map[m.phase] = [];
        map[m.phase].push(m);
      }
    });
    return map;
  }, [matches]);

  const playerSimulatedBracket = useMemo(() => {
    const playerScores: Record<number, { home: number | ""; away: number | "" }> = {};
    selectedPlayerPredictions.forEach((p) => {
      playerScores[p.match_id] = {
        home: p.predicted_home_goals !== null ? p.predicted_home_goals : "",
        away: p.predicted_away_goals !== null ? p.predicted_away_goals : ""
      };
    });

    return resolveKnockoutBracket({
      groupCodes,
      groupStageMatches,
      teams,
      scores: playerScores,
      getWinnerTeamId: (matchId, homeName, awayName, score) => {
        const hg = Number(score.home);
        const ag = Number(score.away);
        const homeTeam = teams.find((t) => t.canonical_name === homeName);
        const awayTeam = teams.find((t) => t.canonical_name === awayName);
        if (hg > ag) return homeTeam?.id ?? null;
        if (ag > hg) return awayTeam?.id ?? null;
        const savedPred = selectedPlayerPredictions.find((sp) => sp.match_id === matchId);
        return savedPred?.predicted_winner_team_id ?? null;
      }
    });
  }, [selectedPlayerPredictions, teams, groupStageMatches]);

  const selectedPlayerName = players.find((p) => p.id === selectedPlayerId)?.display_name ?? "Jugador";

  function renderPlayerKoMatch(id: number) {
    const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
    const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
    const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
    const isHomeWinner =
      Boolean(pred?.predicted_winner_team_id) &&
      teams.find((t) => t.id === pred?.predicted_winner_team_id)?.canonical_name === resolvedHome;
    const isAwayWinner =
      Boolean(pred?.predicted_winner_team_id) &&
      teams.find((t) => t.id === pred?.predicted_winner_team_id)?.canonical_name === resolvedAway;
    const teamsResolved = isBracketSlotResolved(resolvedHome) && isBracketSlotResolved(resolvedAway);
    const homeGoals = pred?.predicted_home_goals ?? "-";
    const awayGoals = pred?.predicted_away_goals ?? "-";

    return (
      <div
        key={id}
        className={`admin-ko-row ${teamsResolved ? "" : "admin-ko-row--pending"}`}
      >
        <div className="admin-ko-row__meta">
          <span className="admin-ko-row__id">Partido {id}</span>
        </div>
        <div className="admin-ko-row__teams">
          <div className={`admin-ko-row__team ${isHomeWinner ? "admin-ko-row__team--winner" : ""}`}>
            <span className="admin-ko-row__name" title={resolvedHome}>
              {resolvedHome}
              {isHomeWinner ? " 🏆" : ""}
            </span>
            <span className="admin-ko-row__score">{homeGoals}</span>
          </div>
          <span className="admin-ko-row__vs">vs</span>
          <div className={`admin-ko-row__team ${isAwayWinner ? "admin-ko-row__team--winner" : ""}`}>
            <span className="admin-ko-row__name" title={resolvedAway}>
              {resolvedAway}
              {isAwayWinner ? " 🏆" : ""}
            </span>
            <span className="admin-ko-row__score">{awayGoals}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      {/* Barra de Selección de Jugador Premium */}
      <div className="admin-player-toolbar panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", padding: "20px 24px" }}>
        <div className="admin-player-toolbar__info">
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>Visor de Apuestas</h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>Consulta y explora las apuestas completas y simulaciones de cuadro.</p>
        </div>
        <label className="admin-player-toolbar__select" style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "240px" }}>
          <span className="form-label" style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em" }}>Seleccionar Jugador</span>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            style={{ fontWeight: "600" }}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Navegación por Pestañas del Visualizador */}
      <div className="tabs-container admin-player-tabs" style={{ marginBottom: "8px" }}>
        <button
          type="button"
          className={`tab-button ${playerViewerTab === "especiales" ? "active" : ""}`}
          onClick={() => setPlayerViewerTab("especiales")}
        >
          Especiales
        </button>
        <button
          type="button"
          className={`tab-button ${playerViewerTab === "grupos" ? "active" : ""}`}
          onClick={() => setPlayerViewerTab("grupos")}
        >
          Fase de grupos
        </button>
        <button
          type="button"
          className={`tab-button ${playerViewerTab === "eliminatorias" ? "active" : ""}`}
          onClick={() => setPlayerViewerTab("eliminatorias")}
        >
          Eliminatorias
        </button>
      </div>

      {/* Pestaña: Especiales */}
      {playerViewerTab === "especiales" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <h4 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-red-bright)" }}>Premios especiales — {selectedPlayerName}</h4>
          <section className="panel admin-player-panel" style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
              <div>
                <span className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Campeón del Mundo:</span>
                <p style={{ margin: "8px 0 0 0", fontSize: "1.15rem", fontWeight: "700", color: "var(--usa-white)" }}>
                  {teams.find((t) => t.id === selectedPlayerSpecial?.champion_team_id)?.canonical_name ?? "No pronosticado"}
                </p>
              </div>
              <div>
                <span className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Máximo Goleador:</span>
                <p style={{ margin: "8px 0 0 0", fontSize: "1.15rem", fontWeight: "700", color: "var(--usa-white)" }}>
                  {selectedPlayerSpecial?.top_scorer_name ?? "No pronosticado"}
                </p>
              </div>
              <div>
                <span className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Balón de Oro:</span>
                <p style={{ margin: "8px 0 0 0", fontSize: "1.15rem", fontWeight: "700", color: "var(--usa-white)" }}>
                  {selectedPlayerSpecial?.golden_ball_name ?? "No pronosticado"}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Pestaña: Grupos */}
      {playerViewerTab === "grupos" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <h4 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-red-bright)" }}>Fase de grupos — {selectedPlayerName}</h4>
          <div className="subtabs-container">
            {groupCodes.map((g) => (
              <button key={g} type="button" className={`subtab-button ${activeViewerGroup === g ? "active" : ""}`} onClick={() => setActiveViewerGroup(g)}>
                Grupo {g}
              </button>
            ))}
          </div>

          {groupCodes.map((groupCode) => {
            const groupMatches = getMatchesForGroup(groupCode);
            return (
              <div key={groupCode} style={{ display: activeViewerGroup === groupCode ? "block" : "none" }}>
                <section className="panel" style={{ marginBottom: "24px" }}>
                  {groupMatches.map((match) => {
                    const pred = selectedPlayerPredictions.find((p) => p.match_id === match.id);
                    return (
                      <div className="match-row" key={match.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "14px 20px" }}>
                        <div className="team-names">
                          <strong>{match.home_team_name}</strong>
                          <span className="muted" style={{ fontSize: "0.75rem", margin: "2px 0" }}>vs</span>
                          <strong>{match.away_team_name}</strong>
                        </div>
                        <div style={{ display: "flex", gap: "10px", fontSize: "18px", fontWeight: "800", paddingRight: "16px" }}>
                          <span style={{ color: "var(--usa-red-bright)" }}>{pred?.predicted_home_goals !== null ? pred?.predicted_home_goals : "-"}</span>
                          <span className="muted">:</span>
                          <span style={{ color: "var(--usa-red-bright)" }}>{pred?.predicted_away_goals !== null ? pred?.predicted_away_goals : "-"}</span>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
            );
          })}
        </div>
      )}

      {/* Pestaña: Eliminatorias */}
      {playerViewerTab === "eliminatorias" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div className="admin-ko-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h4 className="phase-title" style={{ margin: 0, paddingLeft: "12px", borderLeft: "3px solid var(--usa-red-bright)" }}>
              Eliminatorias — {selectedPlayerName}
            </h4>
            <div className="admin-ko-mode-toggle">
              <button
                type="button"
                className={`subtab-button ${playerKnockoutMode === "rondas" ? "active" : ""}`}
                onClick={() => setPlayerKnockoutMode("rondas")}
              >
                Por ronda
              </button>
              <button
                type="button"
                className={`subtab-button ${playerKnockoutMode === "cuadro" ? "active" : ""}`}
                onClick={() => setPlayerKnockoutMode("cuadro")}
              >
                Cuadro completo
              </button>
            </div>
          </div>

          {playerKnockoutMode === "rondas" && (
            <>
              <div className="subtabs-container">
                {knockoutRounds.map((round) => (
                  <button
                    key={round}
                    type="button"
                    className={`subtab-button ${activeViewerKnockoutRound === round ? "active" : ""}`}
                    onClick={() => setActiveViewerKnockoutRound(round)}
                  >
                    {round.replace(" de final", "").replace("Dieciseisavos", "1/16").replace("Octavos", "1/8").replace("Cuartos", "1/4")}
                  </button>
                ))}
              </div>
              {knockoutRounds.map((roundName) => {
                const roundMatches = (knockoutMatchesByPhase[roundName] ?? []).sort((a, b) => a.id - b.id);
                return (
                  <section
                    key={roundName}
                    className="panel admin-ko-list"
                    style={{ display: activeViewerKnockoutRound === roundName ? "block" : "none" }}
                  >
                    {roundMatches.length === 0 ? (
                      <p className="muted" style={{ padding: "20px", margin: 0, textAlign: "center" }}>
                        No hay partidos en esta ronda.
                      </p>
                    ) : (
                      roundMatches.map((m) => renderPlayerKoMatch(m.id))
                    )}
                  </section>
                );
              })}
            </>
          )}

          {playerKnockoutMode === "cuadro" && (
            <div className="bracket-viewport">
              <p className="bracket-viewport-hint muted" style={{ fontSize: "0.8rem", marginBottom: "12px" }}>
                Desliza dentro del recuadro para ver todo el cuadro simulado de este jugador.
              </p>
              <div className="bracket-wrapper bracket-wrapper--embedded">
                <div className="bracket-grid bracket-grid--compact">
                  
                  {/* Lado Izquierdo del Cuadro */}
                  <div className="bracket-side bracket-side-left">
                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/16 Izq.</h4>
                      {[73, 75, 74, 77, 76, 78, 79, 80].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/8 Izq.</h4>
                      {[89, 90, 91, 92].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/4 Izq.</h4>
                      {[97, 99].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Columna Central (Semifinales, Finales y Campeón) */}
                  <div className="bracket-center-column">
                    <div className="bracket-center-section">
                      <h4 className="bracket-col-title">Semifinales</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", width: "100%" }}>
                        {[101, 102].map((id) => {
                          const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                          const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                          const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                          const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                          const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                          return (
                            <div className="bracket-card" key={id} style={{ width: "100%", opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                              <div className="bracket-card-header">P. {id}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                  {resolvedHome} {isHomeWinner && "🏆"}
                                </span>
                                <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                  {resolvedAway} {isAwayWinner && "🏆"}
                                </span>
                                <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarjeta del Campeón Simulado */}
                    <div className="bracket-center-section champion-section">
                      <h4 className="bracket-col-title" style={{ color: "var(--usa-white)" }}>Simulación Campeón</h4>
                      <div className="champion-card" style={{ padding: "16px 12px", minWidth: "180px" }}>
                        <div className="trophy-glow" style={{ fontSize: "30px" }}>🏆</div>
                        <strong className={isBracketSlotResolved(playerSimulatedBracket.resolved[104]?.home) ? "champion-name resolved" : "champion-name pending"} style={{ fontSize: "14px" }}>
                          {(() => {
                            const pred = selectedPlayerPredictions.find((p) => p.match_id === 104);
                            const resHome = playerSimulatedBracket.resolved[104]?.home;
                            const resAway = playerSimulatedBracket.resolved[104]?.away;
                            if (!isBracketSlotResolved(resHome) || !isBracketSlotResolved(resAway) || !pred || pred.predicted_home_goals === null) return "Por decidir";
                            
                            const hg = Number(pred.predicted_home_goals);
                            const ag = Number(pred.predicted_away_goals);
                            if (hg > ag) return resHome;
                            if (hg < ag) return resAway;
                            
                            const winnerObj = teams.find((t) => t.id === pred.predicted_winner_team_id);
                            return winnerObj?.canonical_name ?? resHome;
                          })()}
                        </strong>
                      </div>
                    </div>

                    {/* Finales y Tercer Puesto */}
                    <div className="bracket-center-section">
                      <h4 className="bracket-col-title">Finales</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
                        {[104, 103].map((id) => {
                          const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                          const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                          const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                          const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                          const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                          return (
                            <div className="bracket-card" key={id} style={{ width: "100%", opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                              <div className="bracket-card-header">{id === 104 ? "Gran Final" : "3º Puesto"}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                  {resolvedHome} {isHomeWinner && "🏆"}
                                </span>
                                <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                  {resolvedAway} {isAwayWinner && "🏆"}
                                </span>
                                <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Lado Derecho del Cuadro */}
                  <div className="bracket-side bracket-side-right">
                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/4 Der.</h4>
                      {[98, 100].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/8 Der.</h4>
                      {[93, 94, 95, 96].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bracket-column">
                      <h4 className="bracket-col-title">1/16 Der.</h4>
                      {[83, 84, 81, 82, 86, 88, 85, 87].map((id) => {
                        const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                        const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                        const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                        const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                        const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                        return (
                          <div className="bracket-card" key={id} style={{ opacity: isBracketSlotResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--usa-red-bright)" : "inherit" }}>
                                {resolvedAway} {isAwayWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_away_goals ?? "-"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
