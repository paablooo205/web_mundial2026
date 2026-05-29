"use client";

import { useState, useMemo } from "react";

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

const groupCodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const knockoutRounds = [
  "Dieciseisavos de final",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "3º y 4º puesto",
  "Final",
];

// Mapping of match ID → formula for home and away teams in KO rounds
const KO_FORMULAS: Record<number, { home: string; away: string }> = {
  73: { home: "2A", away: "2B" },
  74: { home: "1C", away: "2F" },
  75: { home: "1E", away: "3ABCDF" },
  76: { home: "1F", away: "2C" },
  77: { home: "2E", away: "2I" },
  78: { home: "1I", away: "3CDFGH" },
  79: { home: "1A", away: "3CEFHI" },
  80: { home: "1L", away: "3EHIJK" },
  81: { home: "1G", away: "3AEHIJ" },
  82: { home: "1D", away: "3BEFIJ" },
  83: { home: "1H", away: "2J" },
  84: { home: "2K", away: "2L" },
  85: { home: "1B", away: "3EFGIJ" },
  86: { home: "2D", away: "2G" },
  87: { home: "1J", away: "2H" },
  88: { home: "1K", away: "3DEIJL" },

  89: { home: "W73", away: "W75" },
  90: { home: "W74", away: "W77" },
  91: { home: "W76", away: "W78" },
  92: { home: "W79", away: "W80" },
  93: { home: "W83", away: "W84" },
  94: { home: "W81", away: "W82" },
  95: { home: "W86", away: "W88" },
  96: { home: "W85", away: "W87" },

  97: { home: "W89", away: "W90" },
  98: { home: "W93", away: "W94" },
  99: { home: "W91", away: "W92" },
  100: { home: "W95", away: "W96" },

  101: { home: "W97", away: "W98" },
  102: { home: "W99", away: "W100" },

  103: { home: "L101", away: "L102" },
  104: { home: "W101", away: "W102" },
};

export function AdminForm({
  matches,
  teams,
  results,
  awards,
  players,
  predictions,
  specialPredictions,
  summary,
}: Props) {
  const [currentSection, setCurrentSection] = useState<"resumen" | "resultados" | "jugadores">("resumen");
  const [activeTab, setActiveTab] = useState<"grupos" | "eliminatorias" | "especiales">("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [activeKnockoutRound, setActiveKnockoutRound] = useState<string>("Dieciseisavos de final");

  // Selected player for viewing predictions
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(players[0]?.id || 0);
  const [activeViewerGroup, setActiveViewerGroup] = useState<string>("A");

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

  const triggerApifySync = async () => {
    setSyncingApify(true);
    setGlobalMessage(null);
    try {
      const secret = "mundial2026secret"; // default local secret
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

  // ─── Computations for selected player predictions viewer ───
  const selectedPlayerPredictions = useMemo(() => {
    return predictions.filter((p) => p.player_id === selectedPlayerId);
  }, [predictions, selectedPlayerId]);

  const selectedPlayerSpecial = useMemo(() => {
    return specialPredictions.find((sp) => sp.player_id === selectedPlayerId) || null;
  }, [specialPredictions, selectedPlayerId]);

  // Simulated brackets for the currently viewed player (copied bracket engine of player form)
  const playerSimulatedBracket = useMemo(() => {
    const playerScores: Record<number, { home: number | ""; away: number | "" }> = {};
    selectedPlayerPredictions.forEach((p) => {
      playerScores[p.match_id] = {
        home: p.predicted_home_goals !== null ? p.predicted_home_goals : "",
        away: p.predicted_away_goals !== null ? p.predicted_away_goals : "",
      };
    });

    const isPlayerGroupFullyPredicted = (code: string) => {
      const groupTeamNames = new Set(
        teams.filter((t) => t.group_code === code).map((t) => t.canonical_name)
      );
      const groupMatches = groupStageMatches.filter(
        (m) => m.home_team_name && groupTeamNames.has(m.home_team_name)
      );
      if (groupMatches.length === 0) return false;
      return groupMatches.every((m) => {
        const score = playerScores[m.id];
        return score && score.home !== "" && score.away !== "";
      });
    };

    const computePlayerStandings = (groupCode: string) => {
      const groupTeams = teams.filter((t) => t.group_code === groupCode);
      const stats: Record<string, { team: Team; pts: number; gd: number; gs: number }> = {};
      groupTeams.forEach((t) => {
        stats[t.canonical_name] = { team: t, pts: 0, gd: 0, gs: 0 };
      });

      const groupMatchIds = new Set(groupTeams.map((t) => t.canonical_name));
      matches.forEach((m) => {
        if (m.phase !== "Fase de Grupos") return;
        const homeInGroup = m.home_team_name && groupMatchIds.has(m.home_team_name);
        const awayInGroup = m.away_team_name && groupMatchIds.has(m.away_team_name);
        if (!homeInGroup || !awayInGroup) return;

        const score = playerScores[m.id];
        if (!score || score.home === "" || score.away === "") return;

        const hg = Number(score.home);
        const ag = Number(score.away);
        const hs = stats[m.home_team_name!];
        const as_ = stats[m.away_team_name!];
        if (!hs || !as_) return;

        hs.gs += hg;
        as_.gs += ag;
        hs.gd += hg - ag;
        as_.gd += ag - hg;

        if (hg > ag) { hs.pts += 3; }
        else if (hg < ag) { as_.pts += 3; }
        else { hs.pts += 1; as_.pts += 1; }
      });

      return Object.values(stats).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gs !== a.gs) return b.gs - a.gs;
        return a.team.canonical_name.localeCompare(b.team.canonical_name);
      });
    };

    const allStandings: Record<string, ReturnType<typeof computePlayerStandings>> = {};
    groupCodes.forEach((code) => {
      allStandings[code] = computePlayerStandings(code);
    });

    const allThirds = groupCodes.map((code) => {
      const standing = allStandings[code];
      const entry = standing[2];
      return entry ? { ...entry, groupCode: code } : null;
    }).filter(Boolean) as Array<{ team: Team; pts: number; gd: number; gs: number; groupCode: string }>;

    allThirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gs !== a.gs) return b.gs - a.gs;
      return a.team.canonical_name.localeCompare(b.team.canonical_name);
    });

    const assignedThirds = new Set<string>();
    const resolved: Record<number, { home: string; away: string }> = {};

    const resolveFormula = (formula: string): string => {
      if (!formula) return "Por decidir";

      const matchRef = /^([WL])(\d+)$/.exec(formula);
      if (matchRef) {
        const type = matchRef[1];
        const refId = Number(matchRef[2]);
        const refTeams = resolved[refId];

        if (!refTeams) return `Ganador de M${refId}`;
        if (refTeams.home.startsWith("Ganador") || refTeams.away.startsWith("Ganador") ||
            refTeams.home === "Por decidir" || refTeams.away === "Por decidir" ||
            refTeams.home.includes("º Grupo") || refTeams.away.includes("º Grupo")) {
          return type === "W" ? `Ganador de M${refId}` : `Perdedor de M${refId}`;
        }

        const score = playerScores[refId];
        if (!score || score.home === "" || score.away === "") {
          return type === "W" ? `Ganador de M${refId}` : `Perdedor de M${refId}`;
        }

        const hg = Number(score.home);
        const ag = Number(score.away);
        
        let winnerName = "";
        let loserName = "";
        
        if (hg > ag) {
          winnerName = refTeams.home;
          loserName = refTeams.away;
        } else if (hg < ag) {
          winnerName = refTeams.away;
          loserName = refTeams.home;
        } else {
          // Check saved winner team ID in predictions
          const savedPred = selectedPlayerPredictions.find((sp) => sp.match_id === refId);
          if (savedPred && savedPred.predicted_winner_team_id) {
            const winnerObj = teams.find((t) => t.id === savedPred.predicted_winner_team_id);
            if (winnerObj && winnerObj.canonical_name === refTeams.home) {
              winnerName = refTeams.home;
              loserName = refTeams.away;
            } else if (winnerObj && winnerObj.canonical_name === refTeams.away) {
              winnerName = refTeams.away;
              loserName = refTeams.home;
            }
          }
          if (!winnerName) {
            winnerName = refTeams.home;
            loserName = refTeams.away;
          }
        }
        return type === "W" ? winnerName : loserName;
      }

      const groupPos = /^(\d)([A-L])$/.exec(formula);
      if (groupPos) {
        const rank = Number(groupPos[1]) - 1;
        const code = groupPos[2];
        if (!isPlayerGroupFullyPredicted(code)) {
          return `${groupPos[1]}º Grupo ${code}`;
        }
        return allStandings[code]?.[rank]?.team.canonical_name ?? `${groupPos[1]}º Grupo ${code}`;
      }

      const thirdRef = /^3([A-L]+)$/.exec(formula);
      if (thirdRef) {
        const allowed = thirdRef[1];
        const allAllowedPredicted = allowed.split("").every((code) => isPlayerGroupFullyPredicted(code));
        if (!allAllowedPredicted) {
          return `3º de ${allowed}`;
        }
        const match = allThirds.find(
          (t) => allowed.includes(t.groupCode) && !assignedThirds.has(t.team.canonical_name)
        );
        if (match) {
          assignedThirds.add(match.team.canonical_name);
          return match.team.canonical_name;
        }
        return `3º mejor de ${allowed}`;
      }

      return formula;
    };

    for (let id = 73; id <= 104; id++) {
      const formula = KO_FORMULAS[id];
      if (formula) {
        resolved[id] = {
          home: resolveFormula(formula.home),
          away: resolveFormula(formula.away),
        };
      }
    }

    return { resolved, standings: allStandings };
  }, [selectedPlayerPredictions, teams, matches]);

  const isResolved = (name: string) =>
    name && !name.startsWith("Ganador") && !name.startsWith("Perdedor") && name !== "Por decidir" && !/^[0-9]º/.test(name) && !name.startsWith("3º mejor");

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
          className={`admin-menu-btn ${currentSection === "jugadores" ? "active" : ""}`}
          onClick={() => setCurrentSection("jugadores")}
        >
          Apuestas de Jugadores
        </button>
      </aside>

      {/* Panel de Contenido Principal */}
      <div className="admin-content-pane" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {globalMessage && (
          <div className="panel" style={{ padding: "16px 20px", background: "rgba(16, 185, 129, 0.15)", borderColor: "var(--accent)", marginBottom: "16px" }}>
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

            {/* Panel de Control de Sincronización */}
            <section className="panel" style={{ padding: "24px", background: "rgba(2, 6, 23, 0.45)", borderLeft: "4px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--accent)", fontSize: "18px" }}>Sincronización Automática con Flashscore</h3>
                  <p className="muted" style={{ margin: "6px 0 0 0", fontSize: "14px" }}>
                    Obtén goles, ganadores y estado de los partidos reales automáticamente sin meterlos a mano usando el Scraper de Apify.
                  </p>
                </div>
                <button
                  type="button"
                  className="button primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "46px" }}
                  disabled={syncingApify}
                  onClick={triggerApifySync}
                >
                  {syncingApify ? "Sincronizando..." : "Sincronizar en Vivo Ahora"}
                </button>
              </div>
              
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "14px", fontSize: "12px" }}>
                <span style={{ color: "var(--gold)", fontWeight: "700" }}>Automatización en segundo plano (CRON):</span> Para que la porra se actualice sola durante el mundial real sin tener que pulsar este botón, puedes configurar una petición automática <code>POST</code> cada 10 minutos a <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/apify/sync?secret=mundial2026secret` : "/api/apify/sync?secret=mundial2026secret"}</code> en un servicio gratuito como <b>cron-job.org</b>.
              </div>
            </section>
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
                    <section className="panel">
                      {matchesInRound.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center" }} className="muted">
                          No hay partidos cargados para esta ronda.
                        </div>
                      ) : (
                        matchesInRound.map((match) => {
                          const score = realScores[match.id];
                          const isDraw = score && score.home !== "" && score.away !== "" && Number(score.home) === Number(score.away);
                          const homeTeamObj = teams.find((t) => t.canonical_name === match.home_team_name);
                          const awayTeamObj = teams.find((t) => t.canonical_name === match.away_team_name);

                          return (
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

                              {isDraw && homeTeamObj && awayTeamObj && (
                                <div className="penalty-selector" style={{ gridColumn: "1 / span 4", marginTop: "8px" }}>
                                  <span className="penalty-title">Ganador Real en Penaltis:</span>
                                  <div className="penalty-actions">
                                    <button
                                      type="button"
                                      className={`penalty-pill ${realScores[match.id]?.winner === homeTeamObj.id ? "active" : ""}`}
                                      onClick={() => handleScoreChange(match.id, "winner", String(homeTeamObj.id))}
                                    >
                                      {match.home_team_name}
                                    </button>
                                    <button
                                      type="button"
                                      className={`penalty-pill ${realScores[match.id]?.winner === awayTeamObj.id ? "active" : ""}`}
                                      onClick={() => handleScoreChange(match.id, "winner", String(awayTeamObj.id))}
                                    >
                                      {match.away_team_name}
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

        {/* ════════════════ SECCIÓN 3: APUESTAS DE JUGADORES ════════════════ */}
        {currentSection === "jugadores" && (
          <div>
            <div className="panel" style={{ padding: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--accent)" }}>Consultar apuestas de jugadores</h3>
                <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "14px" }}>Selecciona un jugador para ver toda su porra simulada y premios especiales.</p>
              </div>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                style={{ maxWidth: "260px", fontWeight: "700" }}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Premios Especiales del Jugador Seleccionado */}
            <h4 className="phase-title">Premios Especiales de {players.find(p => p.id === selectedPlayerId)?.display_name}</h4>
            <section className="panel" style={{ marginBottom: "24px", padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div>
                  <span className="muted" style={{ fontSize: "12px", textTransform: "uppercase" }}>Campeón del Mundo:</span>
                  <p style={{ margin: "6px 0 0 0", fontSize: "16px", fontWeight: "700", color: "var(--gold)" }}>
                    {teams.find((t) => t.id === selectedPlayerSpecial?.champion_team_id)?.canonical_name ?? "No pronosticado"}
                  </p>
                </div>
                <div>
                  <span className="muted" style={{ fontSize: "12px", textTransform: "uppercase" }}>Máximo Goleador:</span>
                  <p style={{ margin: "6px 0 0 0", fontSize: "16px", fontWeight: "700" }}>
                    {selectedPlayerSpecial?.top_scorer_name ?? "No pronosticado"}
                  </p>
                </div>
                <div>
                  <span className="muted" style={{ fontSize: "12px", textTransform: "uppercase" }}>Balón de Oro:</span>
                  <p style={{ margin: "6px 0 0 0", fontSize: "16px", fontWeight: "700" }}>
                    {selectedPlayerSpecial?.golden_ball_name ?? "No pronosticado"}
                  </p>
                </div>
              </div>
            </section>

            {/* Fase de Grupos del Jugador Seleccionado */}
            <h4 className="phase-title">Pronósticos de Fase de Grupos</h4>
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
                        <div className="match-row" key={match.id} style={{ gridTemplateColumns: "1fr auto" }}>
                          <div className="team-names">
                            <strong>{match.home_team_name}</strong>
                            <span className="muted">vs</span>
                            <strong>{match.away_team_name}</strong>
                          </div>
                          <div style={{ display: "flex", gap: "10px", fontSize: "18px", fontWeight: "800", paddingRight: "16px" }}>
                            <span style={{ color: "var(--accent)" }}>{pred?.predicted_home_goals !== null ? pred?.predicted_home_goals : "-"}</span>
                            <span className="muted">:</span>
                            <span style={{ color: "var(--accent)" }}>{pred?.predicted_away_goals !== null ? pred?.predicted_away_goals : "-"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                </div>
              );
            })}

            {/* Cuadro de Eliminatorias del Jugador Seleccionado */}
            <h4 className="phase-title">Cuadro de Eliminatorias Simulado</h4>
            <div className="bracket-wrapper">
              <div className="bracket-grid">
                
                {/* Lado Izquierdo del Cuadro */}
                <div className="bracket-side bracket-side-left">
                  <div className="bracket-column">
                    <h4 className="bracket-col-title">1/16 Izq.</h4>
                    {[73, 75, 74, 77, 76, 78, 79, 80].map((id) => {
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                          <div className="bracket-card" key={id} style={{ width: "100%", opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">P. {id}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                    <h4 className="bracket-col-title" style={{ color: "var(--gold)" }}>Simulación Campeón</h4>
                    <div className="champion-card" style={{ padding: "16px 12px", minWidth: "180px" }}>
                      <div className="trophy-glow" style={{ fontSize: "30px" }}>🏆</div>
                      <strong className={isResolved(playerSimulatedBracket.resolved[104]?.home) ? "champion-name resolved" : "champion-name pending"} style={{ fontSize: "14px" }}>
                        {(() => {
                          const pred = selectedPlayerPredictions.find((p) => p.match_id === 104);
                          const resHome = playerSimulatedBracket.resolved[104]?.home;
                          const resAway = playerSimulatedBracket.resolved[104]?.away;
                          if (!isResolved(resHome) || !isResolved(resAway) || !pred || pred.predicted_home_goals === null) return "Por decidir";
                          
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
                          <div className="bracket-card" key={id} style={{ width: "100%", opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                            <div className="bracket-card-header">{id === 104 ? "Gran Final" : "3º Puesto"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                                {resolvedHome} {isHomeWinner && "🏆"}
                              </span>
                              <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
                      const match = matches.find((m) => m.id === id);
                      const pred = selectedPlayerPredictions.find((p) => p.match_id === id);
                      const resolvedHome = playerSimulatedBracket.resolved[id]?.home ?? "Por decidir";
                      const resolvedAway = playerSimulatedBracket.resolved[id]?.away ?? "Por decidir";
                      const isHomeWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedHome;
                      const isAwayWinner = pred?.predicted_winner_team_id && teams.find((t) => t.id === pred.predicted_winner_team_id)?.canonical_name === resolvedAway;

                      return (
                        <div className="bracket-card" key={id} style={{ opacity: isResolved(resolvedHome) ? 1 : 0.4 }}>
                          <div className="bracket-card-header">P. {id}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isHomeWinner ? "800" : "600", color: isHomeWinner ? "var(--gold)" : "inherit" }}>
                              {resolvedHome} {isHomeWinner && "🏆"}
                            </span>
                            <strong>{pred?.predicted_home_goals ?? "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: isAwayWinner ? "800" : "600", color: isAwayWinner ? "var(--gold)" : "inherit" }}>
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
    </div>
  );
}
