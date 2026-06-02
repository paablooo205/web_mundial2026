"use client";

import { useState, useMemo, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  groupCodes as BRACKET_GROUP_CODES,
  isBracketSlotResolved,
  resolveKnockoutBracket
} from "@/lib/knockout-bracket";
import { RealKnockoutBracket } from "./real-knockout-bracket";

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
  results: MatchResult[];
  awards: TournamentAwards;
  players: Player[];
  predictions: PlayerPrediction[];
  specialPredictions: PlayerSpecialPrediction[];
  summary: {
    players: number;
    matches: number;
    results: number;
  };
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

const CRON_SYNC_DISPLAY_URL = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/api/apify/sync?secret=mundial2026secret`;

export function AdminForm({
  matches,
  teams,
  results,
  awards,
  summary,
}: Props) {
  // Password Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_auth") === "true";
    }
    return false;
  });
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [currentSection, setCurrentSection] = useState<"resumen" | "resultados" | "mantenimiento">("resumen");
  const [activeTab, setActiveTab] = useState<"grupos" | "eliminatorias" | "especiales">("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [activeKnockoutRound, setActiveKnockoutRound] = useState<string>("Dieciseisavos de final");
  const [realResultsKnockoutMode, setRealResultsKnockoutMode] = useState<"rondas" | "cuadro">("cuadro");

  // Local state for actual match results
  const [realScores, setRealScores] = useState<Record<number, { home: number | ""; away: number | ""; winner: number | "" }>>(() => {
    const initial: Record<number, { home: number | ""; away: number | ""; winner: number | "" }> = {};
    results.forEach((r) => {
      initial[r.match_id] = {
        home: r.home_goals !== null ? r.home_goals : "",
        away: r.away_goals !== null ? r.away_goals : "",
        winner: r.winner_team_id !== null ? r.winner_team_id : "",
      };
    });
    matches.forEach((m) => {
      if (!initial[m.id]) {
        initial[m.id] = { home: "", away: "", winner: "" };
      }
    });
    return initial;
  });

  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingAwards, setSavingAwards] = useState(false);
  const [syncingApify, setSyncingApify] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [runningMaintenance, setRunningMaintenance] = useState<string | null>(null);

  const triggerMaintenance = async (action: string) => {
    setRunningMaintenance(action);
    setGlobalMessage(null);
    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (response.ok) {
        setGlobalMessage(`✅ ${data.message}`);
        if (action === "clear_cache") {
           window.location.reload();
        }
      } else {
        setGlobalMessage(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setGlobalMessage(`❌ Error de red: ${err.message}`);
    } finally {
      setRunningMaintenance(null);
    }
  };

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === "pablo.ortiz25") {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      setLoginError(null);
    } else {
      setLoginError("Contraseña incorrecta");
    }
  }

  const triggerApifySync = async () => {
    setSyncingApify(true);
    setGlobalMessage(null);
    try {
      const secret = "mundial2026secret";
      const response = await fetch(`/api/apify/sync?secret=${secret}`, { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setGlobalMessage(`✅ Sincronización completada. Se procesaron ${data.matchesSeen} partidos de Flashscore. Clasificación de jugadores actualizada.`);
        window.location.reload();
      } else {
        setGlobalMessage(`❌ Sincronización fallida: ${data.error || "Error desconocido"}`);
      }
    } catch (err: any) {
      setGlobalMessage(`❌ Error de red al sincronizar: ${err.message}`);
    } finally {
      setSyncingApify(false);
    }
  };

  const handleScoreChange = (matchId: number, type: "home" | "away" | "winner", value: string) => {
    setRealScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [type]: value === "" ? "" : Number(value),
      },
    }));
  };

  const saveMatchResult = async (matchId: number) => {
    setSavingId(matchId);
    setGlobalMessage(null);
    const score = realScores[matchId];

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeGoals: score.home,
          awayGoals: score.away,
          status: score.home !== "" && score.away !== "" ? "finished" : "scheduled",
          winnerTeamId: score.winner || null,
          homeTeamId: teams.find((t) => t.canonical_name === matches.find((m) => m.id === matchId)?.home_team_name)?.id ?? null,
          awayTeamId: teams.find((t) => t.canonical_name === matches.find((m) => m.id === matchId)?.away_team_name)?.id ?? null
        }),
      });

      if (response.ok) {
        setGlobalMessage(`✅ Resultado del Partido ${matchId} guardado. ¡Clasificación recalculada!`);
      } else {
        setGlobalMessage("❌ No se pudo guardar el resultado.");
      }
    } catch {
      setGlobalMessage("❌ Error de red.");
    } finally {
      setSavingId(null);
    }
  };

  const saveSpecialAwards = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingAwards(true);
    setGlobalMessage(null);

    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "special_awards",
          championTeamId: formData.get("championTeamId"),
          topScorerName: formData.get("topScorerName"),
          goldenBallName: formData.get("goldenBallName"),
        }),
      });

      if (response.ok) {
        setGlobalMessage("✅ Premios oficiales guardados correctamente. ¡Clasificación recalculada!");
      } else {
        setGlobalMessage("❌ No se pudieron guardar los premios.");
      }
    } catch {
      setGlobalMessage("❌ Error de red.");
    } finally {
      setSavingAwards(false);
    }
  };

  // ─── Match Group List Generators ───
  const groupStageMatches = matches.filter((m) => m.phase === "Fase de Grupos");

  const getMatchesForGroup = (groupCode: string) => {
    const groupTeamNames = new Set(
      teams.filter((t) => t.group_code === groupCode).map((t) => t.canonical_name)
    );
    return groupStageMatches.filter(
      (m) => m.home_team_name && groupTeamNames.has(m.home_team_name)
    );
  };

  const knockoutMatchesByPhase: Record<string, Match[]> = {};
  matches.forEach((m) => {
    if (m.phase !== "Fase de Grupos") {
      if (!knockoutMatchesByPhase[m.phase]) knockoutMatchesByPhase[m.phase] = [];
      knockoutMatchesByPhase[m.phase].push(m);
    }
  });

  const getRealWinnerTeamId = useCallback(
    (matchId: number, homeName: string, awayName: string) => {
      const score = realScores[matchId];
      if (!score || score.home === "" || score.away === "") return null;
      const hg = Number(score.home);
      const ag = Number(score.away);
      const homeTeam = teams.find((t) => t.canonical_name === homeName);
      const awayTeam = teams.find((t) => t.canonical_name === awayName);
      if (hg > ag) return homeTeam?.id ?? null;
      if (ag > hg) return awayTeam?.id ?? null;
      if (score.winner) return Number(score.winner);
      return results.find((r) => r.match_id === matchId)?.winner_team_id ?? null;
    },
    [realScores, teams, results]
  );

  const realKnockoutBracket = useMemo(() => {
    const scores: Record<number, { home: number | ""; away: number | "" }> = {};
    Object.entries(realScores).forEach(([id, s]) => {
      scores[Number(id)] = { home: s.home, away: s.away };
    });

    return resolveKnockoutBracket({
      groupCodes,
      groupStageMatches,
      teams,
      scores,
      getWinnerTeamId: (matchId, homeName, awayName, score) => {
        const hg = Number(score.home);
        const ag = Number(score.away);
        const homeTeam = teams.find((t) => t.canonical_name === homeName);
        const awayTeam = teams.find((t) => t.canonical_name === awayName);
        if (hg > ag) return homeTeam?.id ?? null;
        if (ag > hg) return awayTeam?.id ?? null;
        const rs = realScores[matchId];
        if (rs?.winner) return Number(rs.winner);
        return results.find((r) => r.match_id === matchId)?.winner_team_id ?? null;
      }
    });
  }, [realScores, teams, groupStageMatches, results]);

  // Si no está autenticado, mostramos la pantalla de login con contraseña
  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "55vh" }}>
        <div className="panel auth-panel" style={{ width: "100%", maxWidth: "420px", padding: "36px", background: "rgba(12, 21, 40, 0.5)", backdropFilter: "blur(10px)", borderTop: "3px solid var(--usa-red)" }}>
          <div className="auth-panel__head" style={{ textAlign: "center", marginBottom: "24px" }}>
            <span style={{ fontSize: "3rem", marginBottom: "12px", display: "block" }}>🔒</span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--usa-white)" }}>Administrador</h2>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "6px" }}>Introduce la contraseña oficial para ingresar al Panel de Administración.</p>
          </div>

          <form onSubmit={handleLogin} className="form-stack">
            <div>
              <label className="form-label" htmlFor="admin-password">Contraseña</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(null);
                }}
                placeholder="••••••••"
                style={{ textAlign: "center", letterSpacing: "0.15em" }}
                autoComplete="current-password"
              />
              {loginError && <p className="form-error" style={{ textAlign: "center", fontWeight: "600" }}>{loginError}</p>}
            </div>

            <button className="button primary" type="submit" style={{ width: "100%", minHeight: "44px", marginTop: "8px" }}>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout">
      {/* Barra Lateral / Menú de Navegación */}
      <aside className="admin-menu">
        <button
          type="button"
          className={`admin-menu-btn ${currentSection === "resumen" ? "active" : ""}`}
          onClick={() => setCurrentSection("resumen")}
        >
          Resumen y Sincronización
        </button>
        <button
          type="button"
          className={`admin-menu-btn ${currentSection === "resultados" ? "active" : ""}`}
          onClick={() => setCurrentSection("resultados")}
        >
          Resultados Reales
        </button>
        <button
          type="button"
          className={`admin-menu-btn ${currentSection === "mantenimiento" ? "active" : ""}`}
          onClick={() => setCurrentSection("mantenimiento")}
        >
          Mantenimiento ⚙️
        </button>
      </aside>

      {/* Panel de Contenido Principal */}
      <div className="admin-content-pane">
        
        {globalMessage && (
          <div className="panel" style={{ padding: "16px 20px", background: "var(--secondary-soft)", borderColor: "var(--secondary)", marginBottom: "16px" }}>
            <strong style={{ color: "var(--ink)", fontSize: "14px" }}>{globalMessage}</strong>
          </div>
        )}

        {/* ════════════════ SECCIÓN 1: RESUMEN Y SINCRONIZACIÓN ════════════════ */}
        {currentSection === "resumen" && (
          <div>
            {/* Panel de Métricas Generales */}
            <div className="admin-grid" style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div className="panel metric" style={{ padding: "20px", textAlign: "center" }}>
                <span className="muted" style={{ fontSize: "14px" }}>Jugadores registrados</span>
                <strong style={{ display: "block", fontSize: "32px", marginTop: "8px", fontWeight: "800" }}>{summary.players}</strong>
              </div>
              <div className="panel metric" style={{ padding: "20px", textAlign: "center" }}>
                <span className="muted" style={{ fontSize: "14px" }}>Partidos totales</span>
                <strong style={{ display: "block", fontSize: "32px", marginTop: "8px", fontWeight: "800" }}>{summary.matches}</strong>
              </div>
              <div className="panel metric" style={{ padding: "20px", textAlign: "center" }}>
                <span className="muted" style={{ fontSize: "14px" }}>Resultados oficiales ingresados</span>
                <strong style={{ display: "block", fontSize: "32px", marginTop: "8px", fontWeight: "800" }}>{summary.results}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ SECCIÓN 2: RESULTADOS REALES ════════════════ */}
        {currentSection === "resultados" && (
          <div>
            {/* Sub-navegación Horizontal de Resultados */}
            <div className="tabs-container" style={{ marginBottom: "24px" }}>
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
                Eliminatorias
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === "especiales" ? "active" : ""}`}
                onClick={() => setActiveTab("especiales")}
              >
                Premios Oficiales
              </button>
            </div>

            {/* Fase de Grupos */}
            <div style={{ display: activeTab === "grupos" ? "block" : "none" }}>
              <div className="subtabs-container">
                {groupCodes.map((g) => (
                  <button key={g} type="button" className={`subtab-button ${activeGroup === g ? "active" : ""}`} onClick={() => setActiveGroup(g)}>
                    Grupo {g}
                  </button>
                ))}
              </div>

              {groupCodes.map((groupCode) => {
                const groupMatches = getMatchesForGroup(groupCode);

                return (
                  <div key={groupCode} className="phase-group" style={{ display: activeGroup === groupCode ? "block" : "none" }}>
                    <h3 className="phase-title">Resultados Reales del Grupo {groupCode}</h3>
                    <section className="panel">
                      {groupMatches.map((match) => (
                        <div className="match-row" key={match.id} style={{ gridTemplateColumns: "1fr 88px 88px 120px", gap: "16px" }}>
                          <div className="team-names">
                            <strong>{match.home_team_name ?? "Por decidir"}</strong>
                            <span className="muted">vs</span>
                            <strong>{match.away_team_name ?? "Por decidir"}</strong>
                          </div>
                          <input
                            aria-label={`Goles real local ${match.id}`}
                            min={0}
                            type="number"
                            placeholder="Goles"
                            value={realScores[match.id]?.home ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
                          />
                          <input
                            aria-label={`Goles real visitante ${match.id}`}
                            min={0}
                            type="number"
                            placeholder="Goles"
                            value={realScores[match.id]?.away ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
                          />
                          <button
                            type="button"
                            className="button primary"
                            style={{ minHeight: "44px" }}
                            disabled={savingId === match.id}
                            onClick={() => saveMatchResult(match.id)}
                          >
                            {savingId === match.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      ))}
                    </section>
                  </div>
                );
              })}
            </div>

            {/* Eliminatorias */}
            <div style={{ display: activeTab === "eliminatorias" ? "block" : "none" }}>
              <div className="admin-ko-toolbar" style={{ marginBottom: 16 }}>
                <div>
                  <h4 className="phase-title" style={{ margin: 0, border: 0, padding: 0 }}>
                    Cuadro real del torneo
                  </h4>
                  <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.8125rem" }}>
                    Se actualiza según los resultados de grupos y eliminatorias que guardes.
                  </p>
                </div>
                <div className="admin-ko-mode-toggle">
                  <button
                    type="button"
                    className={`subtab-button ${realResultsKnockoutMode === "cuadro" ? "active" : ""}`}
                    onClick={() => setRealResultsKnockoutMode("cuadro")}
                  >
                    Esquema
                  </button>
                  <button
                    type="button"
                    className={`subtab-button ${realResultsKnockoutMode === "rondas" ? "active" : ""}`}
                    onClick={() => setRealResultsKnockoutMode("rondas")}
                  >
                    Introducir por ronda
                  </button>
                </div>
              </div>

              {realResultsKnockoutMode === "cuadro" && (
                <div className="bracket-viewport" style={{ marginBottom: 24 }}>
                  <p className="bracket-viewport-hint muted">
                    Cuadro oficial según resultados reales. Desplaza dentro del recuadro; arriba puedes seguir
                    editando partido a partido en «Introducir por ronda».
                  </p>
                  <div className="bracket-wrapper bracket-wrapper--embedded">
                    <TransformWrapper
                      initialScale={1}
                      minScale={0.3}
                      maxScale={3}
                      centerOnInit={true}
                      wheel={{ step: 0.1 }}
                    >
                      {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                          <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10, display: "flex", gap: "8px" }}>
                            <button type="button" className="button" style={{ padding: "4px 8px", fontSize: "12px", minHeight: "24px" }} onClick={() => zoomIn()}>+</button>
                            <button type="button" className="button" style={{ padding: "4px 8px", fontSize: "12px", minHeight: "24px" }} onClick={() => zoomOut()}>-</button>
                            <button type="button" className="button" style={{ padding: "4px 8px", fontSize: "12px", minHeight: "24px" }} onClick={() => resetTransform()}>⟲</button>
                          </div>
                          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%" }}>
                            <RealKnockoutBracket
                              resolved={realKnockoutBracket.resolved}
                              scores={realScores}
                              teams={teams}
                              getWinnerTeamId={getRealWinnerTeamId}
                            />
                          </TransformComponent>
                        </>
                      )}
                    </TransformWrapper>
                  </div>
                </div>
              )}

              {realResultsKnockoutMode === "rondas" && (
                <>
                  <div className="subtabs-container">
                    {knockoutRounds.map((round) => (
                      <button
                        key={round}
                        type="button"
                        className={`subtab-button ${activeKnockoutRound === round ? "active" : ""}`}
                        onClick={() => setActiveKnockoutRound(round)}
                      >
                        {round.replace(" de final", "").replace("Dieciseisavos", "1/16").replace("Octavos", "1/8").replace("Cuartos", "1/4")}
                      </button>
                    ))}
                  </div>

                  {knockoutRounds.map((roundName) => {
                    const matchesInRound = knockoutMatchesByPhase[roundName] ?? [];
                    return (
                      <div key={roundName} className="phase-group" style={{ display: activeKnockoutRound === roundName ? "block" : "none" }}>
                        <h3 className="phase-title">{roundName}</h3>
                        <section className="panel admin-ko-list">
                          {matchesInRound.length === 0 ? (
                            <div style={{ padding: "24px", textAlign: "center" }} className="muted">
                              No hay partidos cargados para esta ronda.
                            </div>
                          ) : (
                            matchesInRound
                              .sort((a, b) => a.id - b.id)
                              .map((match) => {
                                const score = realScores[match.id];
                                const isDraw = score && score.home !== "" && score.away !== "" && Number(score.home) === Number(score.away);
                                const resolvedHome = realKnockoutBracket.resolved[match.id]?.home ?? match.home_team_name ?? "Por decidir";
                                const resolvedAway = realKnockoutBracket.resolved[match.id]?.away ?? match.away_team_name ?? "Por decidir";
                                const homeTeamObj = teams.find((t) => t.canonical_name === resolvedHome);
                                const awayTeamObj = teams.find((t) => t.canonical_name === resolvedAway);

                                return (
                                  <div className="match-row admin-result-entry" key={`entry-${match.id}`} style={{ gridTemplateColumns: "1fr 88px 88px 120px", gap: "16px" }}>
                                    <div className="team-names">
                                      <strong>{resolvedHome}</strong>
                                      <span className="muted">vs</span>
                                      <strong>{resolvedAway}</strong>
                                      <span className="admin-ko-row__id" style={{ marginTop: 4 }}>M{match.id}</span>
                                    </div>
                                    <input
                                      aria-label={`Goles real local ${match.id}`}
                                      min={0}
                                      type="number"
                                      placeholder="Goles"
                                      value={realScores[match.id]?.home ?? ""}
                                      onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
                                    />
                                    <input
                                      aria-label={`Goles real visitante ${match.id}`}
                                      min={0}
                                      type="number"
                                      placeholder="Goles"
                                      value={realScores[match.id]?.away ?? ""}
                                      onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="button primary"
                                      style={{ minHeight: "44px" }}
                                      disabled={savingId === match.id}
                                      onClick={() => saveMatchResult(match.id)}
                                    >
                                      {savingId === match.id ? "Guardando..." : "Guardar"}
                                    </button>

                                    {isDraw && homeTeamObj && awayTeamObj && (
                                      <div className="penalty-selector" style={{ gridColumn: "1 / span 4", marginTop: "8px" }}>
                                        <span className="penalty-title">Ganador Real en Penaltis:</span>
                                        <div className="penalty-actions">
                                          <button
                                            type="button"
                                            className={`penalty-pill ${realScores[match.id]?.winner === homeTeamObj.id ? "active" : ""}`}
                                            onClick={() => handleScoreChange(match.id, "winner", String(homeTeamObj.id))}
                                          >
                                            {resolvedHome}
                                          </button>
                                          <button
                                            type="button"
                                            className={`penalty-pill ${realScores[match.id]?.winner === awayTeamObj.id ? "active" : ""}`}
                                            onClick={() => handleScoreChange(match.id, "winner", String(awayTeamObj.id))}
                                          >
                                            {resolvedAway}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </section>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Premios Oficiales */}
            <div className="phase-group" style={{ display: activeTab === "especiales" ? "block" : "none" }}>
              <h3 className="phase-title">Resultados Oficiales Finales del Torneo</h3>
              <form onSubmit={saveSpecialAwards}>
                <section className="panel">
                  <div className="special-row">
                    <label>Campeón del Mundo Real</label>
                    <select defaultValue={awards?.champion_team_id ?? ""} name="championTeamId">
                      <option value="">Seleccionar selección…</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.canonical_name} {team.group_code ? `(Grupo ${team.group_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="special-row">
                    <label>Bota de Oro Real</label>
                    <input
                      defaultValue={awards?.top_scorer_name ?? ""}
                      name="topScorerName"
                      type="text"
                      placeholder="Ej: Mbappé"
                    />
                  </div>
                  <div className="special-row">
                    <label>Balón de Oro Real</label>
                    <input
                      defaultValue={awards?.golden_ball_name ?? ""}
                      name="goldenBallName"
                      type="text"
                      placeholder="Ej: Bellingham"
                    />
                  </div>
                </section>

                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                  <button className="button primary" disabled={savingAwards} type="submit">
                    {savingAwards ? "Guardando..." : "Guardar y Calcular Premios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════════════ SECCIÓN 3: MANTENIMIENTO ════════════════ */}
        {currentSection === "mantenimiento" && (
          <div className="maintenance-section">
            <h2 style={{ fontSize: "1.75rem", marginBottom: "24px", color: "var(--usa-white)" }}>Mantenimiento y Solución de Problemas</h2>
            <p className="muted" style={{ marginBottom: "32px", fontSize: "1rem" }}>
              Utiliza estas herramientas solo en caso de emergencia para forzar recalculos, limpiar la caché o resincronizar el sistema.
            </p>

            <div style={{ display: "grid", gap: "24px" }}>
              {/* Recalcular Clasificación */}
              <div className="panel" style={{ padding: "24px", borderLeft: "4px solid var(--usa-blue-bright)", display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "var(--usa-white)" }}>Recalcular Clasificación Total</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.5" }}>
                    Si los puntos de los jugadores se han desincronizado con respecto a los resultados reales (por un fallo de red o tras muchas ediciones manuales), usa este botón para borrar y volver a calcular toda la tabla de posiciones desde cero.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="button primary" 
                  style={{ minWidth: "200px" }}
                  disabled={runningMaintenance === "recalculate_standings"}
                  onClick={() => triggerMaintenance("recalculate_standings")}
                >
                  {runningMaintenance === "recalculate_standings" ? "Calculando..." : "Recalcular Ahora"}
                </button>
              </div>

              {/* Forzar Sincronización */}
              <div className="panel" style={{ padding: "24px", borderLeft: "4px solid #10b981", display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "var(--usa-white)" }}>Forzar Sincronización Automática</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.5" }}>
                    Ejecuta manualmente el Scraper de Apify para traer los últimos resultados desde Flashscore si crees que el proceso en segundo plano (Cron) ha fallado o se ha retrasado.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="button primary" 
                  style={{ minWidth: "200px", background: "#10b981", borderColor: "#10b981" }}
                  disabled={syncingApify}
                  onClick={triggerApifySync}
                >
                  {syncingApify ? "Sincronizando..." : "Sincronizar Flashscore"}
                </button>
              </div>

              {/* Limpiar Caché */}
              <div className="panel" style={{ padding: "24px", borderLeft: "4px solid var(--usa-red-bright)", display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "var(--usa-white)" }}>Purgar y Limpiar Caché de la Web</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.5" }}>
                    Si los usuarios reportan que ven resultados antiguos o la clasificación no se actualiza al recargar la página, este botón forzará a Vercel a borrar la memoria estática y regenerar la web con los datos más recientes de la base de datos.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="button primary" 
                  style={{ minWidth: "200px", background: "var(--usa-red)", borderColor: "var(--usa-red)" }}
                  disabled={runningMaintenance === "clear_cache"}
                  onClick={() => triggerMaintenance("clear_cache")}
                >
                  {runningMaintenance === "clear_cache" ? "Limpiando..." : "Limpiar Caché Global"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
