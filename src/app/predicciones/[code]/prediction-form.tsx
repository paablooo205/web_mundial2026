"use client";

import { isDoubleScoringPhase } from "@/lib/knockout-scoring";
import { useState, useMemo } from "react";

type Player = {
  id: number;
  access_code: string;
  display_name: string;
};

type Team = {
  id: number;
  canonical_name: string;
  group_code: string | null;
};

type Match = {
  id: number;
  phase: string;
  home_team_name: string | null;
  away_team_name: string | null;
  kickoff_at: string | null;
};

type Prediction = {
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id?: number | null;
};

type SpecialPrediction = {
  champion_team_id: number | null;
  top_scorer_name: string | null;
  golden_ball_name: string | null;
} | null;

type Props = {
  player: Player;
  matches: Match[];
  teams: Team[];
  specialPrediction: SpecialPrediction;
  predictions: Prediction[];
  locked: boolean;
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

export function PredictionForm({
  player,
  matches,
  teams,
  specialPrediction,
  predictions,
  locked,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"grupos" | "eliminatorias" | "especiales">("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [activeKnockoutRound, setActiveKnockoutRound] = useState<string>("Dieciseisavos de final");
  const [bracketView, setBracketView] = useState<"lista" | "cuadro">("cuadro");

  // Master scores state: match_id → { home: number|"", away: number|"" }
  const [scores, setScores] = useState<Record<number, { home: number | ""; away: number | "" }>>(() => {
    const initial: Record<number, { home: number | ""; away: number | "" }> = {};
    predictions.forEach((p) => {
      initial[p.match_id] = {
        home: p.predicted_home_goals !== null ? p.predicted_home_goals : "",
        away: p.predicted_away_goals !== null ? p.predicted_away_goals : "",
      };
    });
    matches.forEach((m) => {
      if (!initial[m.id]) {
        initial[m.id] = { home: "", away: "" };
      }
    });
    return initial;
  });

  // Penalty/Extra time winners state: match_id → team_id
  const [penaltyWinners, setPenaltyWinners] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    predictions.forEach((p) => {
      if (p.predicted_winner_team_id) {
        initial[p.match_id] = p.predicted_winner_team_id;
      }
    });
    return initial;
  });

  // Resolution method state: match_id → "ot" (prórroga) | "pk" (penaltis)
  const [resolutionMethods, setResolutionMethods] = useState<Record<number, "ot" | "pk">>(() => {
    const initial: Record<number, "ot" | "pk"> = {};
    // Load as "pk" by default if a winner was already saved (to preserve state in UI)
    predictions.forEach((p) => {
      if (p.predicted_winner_team_id) {
        initial[p.match_id] = "pk";
      }
    });
    return initial;
  });

  const handleScoreChange = (matchId: number, type: "home" | "away", value: string) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [type]: value === "" ? "" : Number(value),
      },
    }));
  };

  const handleResolutionChange = (matchId: number, teamId: number, method: "ot" | "pk") => {
    setPenaltyWinners((prev) => ({
      ...prev,
      [matchId]: teamId,
    }));
    setResolutionMethods((prev) => ({
      ...prev,
      [matchId]: method,
    }));
  };

  // ─── Helpers to detect if a group is fully predicted ───
  const getMatchesForGroup = (groupCode: string) => {
    const groupTeamNames = new Set(
      teams.filter((t) => t.group_code === groupCode).map((t) => t.canonical_name)
    );
    const groupStageMatches = matches.filter((m) => m.phase === "Fase de Grupos");
    return groupStageMatches.filter(
      (m) => m.home_team_name && groupTeamNames.has(m.home_team_name)
    );
  };

  const isGroupFullyPredicted = (groupCode: string) => {
    const groupMatches = getMatchesForGroup(groupCode);
    if (groupMatches.length === 0) return false;
    return groupMatches.every((m) => {
      const score = scores[m.id];
      return score && score.home !== "" && score.away !== "";
    });
  };

  // ─── Reactive bracket engine (all inside useMemo to avoid stale closures) ───
  const { resolvedKnockoutTeams, groupStandings } = useMemo(() => {
    // Build team lookup by canonical name
    const teamByName: Record<string, Team> = {};
    teams.forEach((t) => { teamByName[t.canonical_name] = t; });

    // Compute standings for a group
    const computeStandings = (groupCode: string) => {
      const groupTeams = teams.filter((t) => t.group_code === groupCode);
      const stats: Record<string, { team: Team; pts: number; gd: number; gs: number }> = {};
      groupTeams.forEach((t) => {
        stats[t.canonical_name] = { team: t, pts: 0, gd: 0, gs: 0 };
      });

      // Find all group stage matches where EITHER team is in this group
      const groupMatchIds = new Set(groupTeams.map((t) => t.canonical_name));
      matches.forEach((m) => {
        if (m.phase !== "Fase de Grupos") return;
        const homeInGroup = m.home_team_name && groupMatchIds.has(m.home_team_name);
        const awayInGroup = m.away_team_name && groupMatchIds.has(m.away_team_name);
        if (!homeInGroup || !awayInGroup) return; // skip inter-group (shouldn't happen)

        const score = scores[m.id];
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

    // Compute standings for ALL groups
    const allStandings: Record<string, ReturnType<typeof computeStandings>> = {};
    groupCodes.forEach((code) => {
      allStandings[code] = computeStandings(code);
    });

    // Compute best third-placed teams across all groups
    const allThirds = groupCodes.map((code) => {
      const standing = allStandings[code];
      const entry = standing[2]; // 3rd place (index 2)
      return entry ? { ...entry, groupCode: code } : null;
    }).filter(Boolean) as Array<{ team: Team; pts: number; gd: number; gs: number; groupCode: string }>;

    allThirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gs !== a.gs) return b.gs - a.gs;
      return a.team.canonical_name.localeCompare(b.team.canonical_name);
    });

    // Track which best-third teams have been assigned to a slot
    const assignedThirds = new Set<string>();

    // Resolve formulas to team names
    const resolved: Record<number, { home: string; away: string }> = {};

    const resolveFormula = (formula: string): string => {
      if (!formula) return "Por decidir";

      // W/L of a match (e.g., W73, L101)
      const matchRef = /^([WL])(\d+)$/.exec(formula);
      if (matchRef) {
        const type = matchRef[1];
        const refId = Number(matchRef[2]);
        const refTeams = resolved[refId];

        if (!refTeams) return `Ganador de M${refId}`;
        if (refTeams.home.startsWith("Ganador") || refTeams.away.startsWith("Ganador") ||
            refTeams.home === "Por decidir" || refTeams.away === "Por decidir" ||
            refTeams.home.includes("º Grupo") || refTeams.away.includes("º Grupo") ||
            refTeams.home.includes("3º de")) {
          return type === "W" ? `Ganador de M${refId}` : `Perdedor de M${refId}`;
        }

        const score = scores[refId];
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
          // Extra Time / Penalty shootout tie-breaker
          const chosenWinnerId = penaltyWinners[refId];
          const homeTeamObj = teamByName[refTeams.home];
          const awayTeamObj = teamByName[refTeams.away];
          
          if (chosenWinnerId && homeTeamObj && chosenWinnerId === homeTeamObj.id) {
            winnerName = refTeams.home;
            loserName = refTeams.away;
          } else if (chosenWinnerId && awayTeamObj && chosenWinnerId === awayTeamObj.id) {
            winnerName = refTeams.away;
            loserName = refTeams.home;
          } else {
            // Default fallback
            winnerName = refTeams.home;
            loserName = refTeams.away;
          }
        }

        return type === "W" ? winnerName : loserName;
      }

      // Group position (e.g., 1A, 2B)
      const groupPos = /^(\d)([A-L])$/.exec(formula);
      if (groupPos) {
        const rank = Number(groupPos[1]) - 1;
        const code = groupPos[2];
        // ONLY resolve if that group is fully predicted!
        if (!isGroupFullyPredicted(code)) {
          return `${groupPos[1]}º Grupo ${code}`;
        }
        const entry = allStandings[code]?.[rank];
        return entry?.team.canonical_name ?? `${groupPos[1]}º Grupo ${code}`;
      }

      // Best third place from specific groups (e.g., 3ABCDF)
      const thirdRef = /^3([A-L]+)$/.exec(formula);
      if (thirdRef) {
        const allowed = thirdRef[1];
        // ONLY resolve if all groups in the allowed string are fully predicted!
        const allAllowedPredicted = allowed.split("").every((code) => isGroupFullyPredicted(code));
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

    // Process KO matches in order (73→104) so dependencies are resolved first
    for (let id = 73; id <= 104; id++) {
      const formula = KO_FORMULAS[id];
      if (formula) {
        resolved[id] = {
          home: resolveFormula(formula.home),
          away: resolveFormula(formula.away),
        };
      }
    }

    return { resolvedKnockoutTeams: resolved, groupStandings: allStandings };
  }, [scores, penaltyWinners, teams, matches]);

  // ─── Submit ───
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    
    // Explicitly append penalty/OT winner IDs to form data
    Object.entries(penaltyWinners).forEach(([matchId, teamId]) => {
      formData.set(`match_${matchId}_winner`, String(teamId));
    });

    // Knockout: winner + cruce del cuadro (equipos local/visitante predichos)
    matches.forEach((match) => {
      if (match.phase === "Fase de Grupos") return;

      const resolvedHome = resolvedKnockoutTeams[match.id]?.home;
      const resolvedAway = resolvedKnockoutTeams[match.id]?.away;
      const homeTeam = teams.find((t) => t.canonical_name === resolvedHome);
      const awayTeam = teams.find((t) => t.canonical_name === resolvedAway);

      if (isDoubleScoringPhase(match.phase)) {
        if (homeTeam) formData.set(`match_${match.id}_home_team_id`, String(homeTeam.id));
        if (awayTeam) formData.set(`match_${match.id}_away_team_id`, String(awayTeam.id));
      }

      const score = scores[match.id];
      if (score && score.home !== "" && score.away !== "") {
        const hg = Number(score.home);
        const ag = Number(score.away);

        if (hg !== ag) {
          const winnerName = hg > ag ? resolvedHome : resolvedAway;
          const winnerTeam = teams.find((t) => t.canonical_name === winnerName);
          if (winnerTeam) {
            formData.set(`match_${match.id}_winner`, String(winnerTeam.id));
          }
        }
      }
    });

    const response = await fetch("/api/predictions", { method: "POST", body: formData });
    setSaving(false);
    setMessage(response.ok ? "✅ Guardado correctamente." : "❌ No se pudo guardar.");
  }

  // ─── Match Group List Generators ───
  const knockoutMatchesByPhase: Record<string, Match[]> = {};
  matches.forEach((m) => {
    if (m.phase !== "Fase de Grupos") {
      if (!knockoutMatchesByPhase[m.phase]) knockoutMatchesByPhase[m.phase] = [];
      knockoutMatchesByPhase[m.phase].push(m);
    }
  });

  const isResolved = (name: string) =>
    name && !name.startsWith("Ganador") && !name.startsWith("Perdedor") && name !== "Por decidir" && !/^[0-9]º/.test(name) && !name.startsWith("3º mejor");

  // Determine global simulated champion for visual bracket representation
  const simulatedChampion = useMemo(() => {
    const finalMatch = matches.find((m) => m.id === 104);
    if (!finalMatch) return "Por decidir";
    const resolvedHome = resolvedKnockoutTeams[104]?.home;
    const resolvedAway = resolvedKnockoutTeams[104]?.away;
    if (!isResolved(resolvedHome) || !isResolved(resolvedAway)) return "Por decidir";

    const score = scores[104];
    if (!score || score.home === "" || score.away === "") return "Por decidir";

    const hg = Number(score.home);
    const ag = Number(score.away);
    if (hg > ag) return resolvedHome;
    if (hg < ag) return resolvedAway;

    // Penalty winner
    const homeTeamObj = teams.find((t) => t.canonical_name === resolvedHome);
    const awayTeamObj = teams.find((t) => t.canonical_name === resolvedAway);
    const chosenWinnerId = penaltyWinners[104];
    if (chosenWinnerId && homeTeamObj && chosenWinnerId === homeTeamObj.id) return resolvedHome;
    if (chosenWinnerId && awayTeamObj && chosenWinnerId === awayTeamObj.id) return resolvedAway;

    return resolvedHome;
  }, [scores, resolvedKnockoutTeams, penaltyWinners, teams, matches]);

  // ─── Render Bracket Card ───
  const renderBracketCard = (match: Match) => {
    const resolvedHome = resolvedKnockoutTeams[match.id]?.home ?? "Por decidir";
    const resolvedAway = resolvedKnockoutTeams[match.id]?.away ?? "Por decidir";
    const homeResolved = isResolved(resolvedHome);
    const awayResolved = isResolved(resolvedAway);
    const canBet = homeResolved && awayResolved && !locked;

    const score = scores[match.id];
    const isDraw = score && score.home !== "" && score.away !== "" && Number(score.home) === Number(score.away);
    const homeTeamObj = teams.find((t) => t.canonical_name === resolvedHome);
    const awayTeamObj = teams.find((t) => t.canonical_name === resolvedAway);

    return (
      <div className={`bracket-card ${!canBet ? "bracket-card--pending" : ""}`} key={match.id}>
        <div className="bracket-card-header">
          <strong>P. {match.id}</strong>
          <span className="muted">{match.phase.replace(" de final", "")}</span>
        </div>
        
        <div className="bracket-card-row">
          <span className={homeResolved ? "team-resolved" : "team-pending"}>
            {resolvedHome}
          </span>
          <input
            aria-label={`Goles local ${match.id}`}
            disabled={!canBet}
            min={0}
            name={`match_${match.id}_home`}
            type="number"
            placeholder="0"
            value={scores[match.id]?.home ?? ""}
            onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
          />
        </div>

        <div className="bracket-card-row">
          <span className={awayResolved ? "team-resolved" : "team-pending"}>
            {resolvedAway}
          </span>
          <input
            aria-label={`Goles visitante ${match.id}`}
            disabled={!canBet}
            min={0}
            name={`match_${match.id}_away`}
            type="number"
            placeholder="0"
            value={scores[match.id]?.away ?? ""}
            onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
          />
        </div>

        {/* ── INTERACTIVE DRAW RESOLUTION SELECTOR (Prórroga vs Penaltis) ── */}
        {isDraw && canBet && homeTeamObj && awayTeamObj && (
          <div className="penalty-selector">
            <span className="penalty-title">Resolución del empate (90 min):</span>
            
            {/* OT Row */}
            <div className="penalty-row-sub">
              <span className="penalty-label" style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600" }}>En Prórroga:</span>
              <div className="penalty-actions">
                <button
                  type="button"
                  className={`penalty-pill ${penaltyWinners[match.id] === homeTeamObj.id && resolutionMethods[match.id] === "ot" ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "4px" }}
                  onClick={() => handleResolutionChange(match.id, homeTeamObj.id, "ot")}
                >
                  Gana {resolvedHome.substring(0, 8)}
                </button>
                <button
                  type="button"
                  className={`penalty-pill ${penaltyWinners[match.id] === awayTeamObj.id && resolutionMethods[match.id] === "ot" ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "4px" }}
                  onClick={() => handleResolutionChange(match.id, awayTeamObj.id, "ot")}
                >
                  Gana {resolvedAway.substring(0, 8)}
                </button>
              </div>
            </div>

            {/* PK Row */}
            <div className="penalty-row-sub" style={{ marginTop: "4px" }}>
              <span className="penalty-label" style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600" }}>En Penaltis:</span>
              <div className="penalty-actions">
                <button
                  type="button"
                  className={`penalty-pill ${penaltyWinners[match.id] === homeTeamObj.id && resolutionMethods[match.id] === "pk" ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "4px", backgroundColor: "rgba(245,158,11,0.05)" }}
                  onClick={() => handleResolutionChange(match.id, homeTeamObj.id, "pk")}
                >
                  Gana {resolvedHome.substring(0, 8)}
                </button>
                <button
                  type="button"
                  className={`penalty-pill ${penaltyWinners[match.id] === awayTeamObj.id && resolutionMethods[match.id] === "pk" ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "4px", backgroundColor: "rgba(245,158,11,0.05)" }}
                  onClick={() => handleResolutionChange(match.id, awayTeamObj.id, "pk")}
                >
                  Gana {resolvedAway.substring(0, 8)}
                </button>
              </div>
            </div>
            
            <input type="hidden" name={`match_${match.id}_winner`} value={penaltyWinners[match.id] ?? ""} />
          </div>
        )}
      </div>
    );
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <input name="playerId" type="hidden" value={player.id} />
      <input name="accessCode" type="hidden" value={player.access_code} />

      {/* ── Main Tab Bar ── */}
      <div className="tabs-container">
        <button type="button" className={`tab-button ${activeTab === "grupos" ? "active" : ""}`} onClick={() => setActiveTab("grupos")}>
          ⚽ Fase de Grupos
        </button>
        <button type="button" className={`tab-button ${activeTab === "eliminatorias" ? "active" : ""}`} onClick={() => setActiveTab("eliminatorias")}>
          🏆 Eliminatorias
        </button>
        <button type="button" className={`tab-button ${activeTab === "especiales" ? "active" : ""}`} onClick={() => setActiveTab("especiales")}>
          ⭐ Premios
        </button>
      </div>

      {/* ════════════════ 1. PHASE: GRUPOS ════════════════ */}
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
          const standing = groupStandings[groupCode] ?? [];

          return (
            <div key={groupCode} className="phase-group" style={{ display: activeGroup === groupCode ? "block" : "none" }}>
              {/* Standing mini-table */}
              <div className="group-standing-wrap">
                <h4 className="standing-title">Clasificación simulada – Grupo {groupCode}</h4>
                <table className="standing-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Selección</th>
                      <th title="Puntos">Pts</th>
                      <th title="Diferencia de goles">DG</th>
                      <th title="Goles a favor">GF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standing.map((entry, i) => (
                      <tr key={entry.team.canonical_name} className={i < 2 ? "qualifies" : i === 2 ? "third-place" : ""}>
                        <td>{i + 1}</td>
                        <td>{entry.team.canonical_name}</td>
                        <td><strong>{entry.pts}</strong></td>
                        <td>{entry.gd > 0 ? `+${entry.gd}` : entry.gd}</td>
                        <td>{entry.gs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="standing-legend"><span className="dot qualifies-dot" /> Clasificado · <span className="dot third-dot" /> Posible mejor 3º</p>
              </div>

              {/* Match inputs */}
              <h3 className="phase-title">Partidos del Grupo {groupCode}</h3>
              <section className="panel">
                {groupMatches.map((match) => (
                  <div className="match-row" key={match.id}>
                    <div className="team-names">
                      <strong>{match.home_team_name ?? "Por decidir"}</strong>
                      <span className="muted">vs</span>
                      <strong>{match.away_team_name ?? "Por decidir"}</strong>
                    </div>
                    <input
                      aria-label={`Goles local ${match.id}`}
                      disabled={locked}
                      min={0}
                      name={`match_${match.id}_home`}
                      type="number"
                      placeholder="0"
                      value={scores[match.id]?.home ?? ""}
                      onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
                    />
                    <input
                      aria-label={`Goles visitante ${match.id}`}
                      disabled={locked}
                      min={0}
                      name={`match_${match.id}_away`}
                      type="number"
                      placeholder="0"
                      value={scores[match.id]?.away ?? ""}
                      onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
                    />
                  </div>
                ))}
              </section>
            </div>
          );
        })}
      </div>

      {/* ════════════════ 2. PHASE: ELIMINATORIAS ════════════════ */}
      <div style={{ display: activeTab === "eliminatorias" ? "block" : "none" }}>
        
        {/* Toggle between Tree/Bracket and List Views */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            className={`button ${bracketView === "cuadro" ? "primary" : ""}`}
            style={{ minHeight: "36px", padding: "4px 12px", fontSize: "13px" }}
            onClick={() => setBracketView("cuadro")}
          >
            📊 Ver Cuadro Completo
          </button>
          <button
            type="button"
            className={`button ${bracketView === "lista" ? "primary" : ""}`}
            style={{ minHeight: "36px", padding: "4px 12px", fontSize: "13px" }}
            onClick={() => setBracketView("lista")}
          >
            📋 Ver Listado por Rondas
          </button>
        </div>

        {/* ── BRACKET VIEW (STUNNING PREMIUM TREE VISUALIZER) ── */}
        {bracketView === "cuadro" && (
          <div className="bracket-wrapper">
            <div className="bracket-grid">
              
              {/* LEFT SIDE BRACKET (Dieciseisavos -> Octavos -> Cuartos) */}
              <div className="bracket-side bracket-side-left">
                {/* Col 1: Dieciseisavos Left */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Dieciseisavos (Izq.)</h4>
                  {[73, 75, 74, 77, 76, 78, 79, 80].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>

                {/* Col 2: Octavos Left */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Octavos (Izq.)</h4>
                  {[89, 90, 91, 92].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>

                {/* Col 3: Cuartos Left */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Cuartos (Izq.)</h4>
                  {[97, 99].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>
              </div>

              {/* CENTER COLUMN (Semifinals -> Finals -> Champion) */}
              <div className="bracket-center-column">
                <div className="bracket-center-section">
                  <h4 className="bracket-col-title">Semifinales</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "32px", alignItems: "center" }}>
                    {[101, 102].map((id) => {
                      const match = matches.find((m) => m.id === id);
                      return match ? renderBracketCard(match) : null;
                    })}
                  </div>
                </div>

                <div className="bracket-center-section champion-section">
                  <h4 className="bracket-col-title" style={{ color: "var(--usa-white)" }}>🏆 CAMPEÓN DEL MUNDO 🏆</h4>
                  <div className="champion-card">
                    <div className="trophy-glow">🏆</div>
                    <strong className={isResolved(simulatedChampion) ? "champion-name resolved" : "champion-name pending"}>
                      {simulatedChampion}
                    </strong>
                    <p className="champion-subtitle">Simulado en Directo</p>
                  </div>
                </div>

                <div className="bracket-center-section">
                  <h4 className="bracket-col-title">Finales</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "32px", alignItems: "center" }}>
                    <div>
                      <span className="bracket-card-header" style={{ display: "block", textAlign: "center", marginBottom: "6px" }}>Gran Final</span>
                      {(() => {
                        const match = matches.find((m) => m.id === 104);
                        return match ? renderBracketCard(match) : null;
                      })()}
                    </div>
                    <div>
                      <span className="bracket-card-header" style={{ display: "block", textAlign: "center", marginBottom: "6px" }}>3º y 4º puesto</span>
                      {(() => {
                        const match = matches.find((m) => m.id === 103);
                        return match ? renderBracketCard(match) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE BRACKET (Cuartos <- Octavos <- Dieciseisavos) */}
              <div className="bracket-side bracket-side-right">
                {/* Col 3: Cuartos Right */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Cuartos (Der.)</h4>
                  {[98, 100].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>

                {/* Col 2: Octavos Right */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Octavos (Der.)</h4>
                  {[93, 94, 95, 96].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>

                {/* Col 1: Dieciseisavos Right */}
                <div className="bracket-column">
                  <h4 className="bracket-col-title">Dieciseisavos (Der.)</h4>
                  {[83, 84, 81, 82, 86, 88, 85, 87].map((id) => {
                    const match = matches.find((m) => m.id === id);
                    return match ? renderBracketCard(match) : null;
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── LIST VIEW (TABBED LIST) ── */}
        {bracketView === "lista" && (
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
                  <section className="panel">
                    {matchesInRound.length === 0 ? (
                      <div style={{ padding: "24px", textAlign: "center" }} className="muted">
                        No hay partidos cargados para esta ronda.
                      </div>
                    ) : (
                      matchesInRound.map((match) => {
                        const resolvedHome = resolvedKnockoutTeams[match.id]?.home ?? "Por decidir";
                        const resolvedAway = resolvedKnockoutTeams[match.id]?.away ?? "Por decidir";
                        const homeResolved = isResolved(resolvedHome);
                        const awayResolved = isResolved(resolvedAway);
                        const canBet = homeResolved && awayResolved && !locked;
                        
                        const score = scores[match.id];
                        const isDraw = score && score.home !== "" && score.away !== "" && Number(score.home) === Number(score.away);
                        const homeTeamObj = teams.find((t) => t.canonical_name === resolvedHome);
                        const awayTeamObj = teams.find((t) => t.canonical_name === resolvedAway);

                        return (
                          <div className={`match-row ${!canBet ? "match-row--pending" : ""}`} key={match.id}>
                            <div className="team-names">
                              <strong className={homeResolved ? "team-resolved" : "team-pending"}>
                                {resolvedHome}
                              </strong>
                              <span className="muted">vs</span>
                              <strong className={awayResolved ? "team-resolved" : "team-pending"}>
                                {resolvedAway}
                              </strong>
                            </div>
                            <input
                              aria-label={`Goles local ${match.id}`}
                              disabled={!canBet}
                              min={0}
                              name={`match_${match.id}_home`}
                              type="number"
                              placeholder="0"
                              value={scores[match.id]?.home ?? ""}
                              onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
                            />
                            <input
                              aria-label={`Goles visitante ${match.id}`}
                              disabled={!canBet}
                              min={0}
                              name={`match_${match.id}_away`}
                              type="number"
                              placeholder="0"
                              value={scores[match.id]?.away ?? ""}
                              onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
                            />

                            {/* Penalty/OT selector in list view */}
                            {isDraw && canBet && homeTeamObj && awayTeamObj && (
                              <div className="penalty-selector" style={{ gridColumn: "1 / span 3", marginTop: "8px" }}>
                                <span className="penalty-title">Resolución del empate (90 min):</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted)", width: "80px" }}>En Prórroga:</span>
                                    <button
                                      type="button"
                                      className={`penalty-pill ${penaltyWinners[match.id] === homeTeamObj.id && resolutionMethods[match.id] === "ot" ? "active" : ""}`}
                                      onClick={() => handleResolutionChange(match.id, homeTeamObj.id, "ot")}
                                    >
                                      Gana {resolvedHome}
                                    </button>
                                    <button
                                      type="button"
                                      className={`penalty-pill ${penaltyWinners[match.id] === awayTeamObj.id && resolutionMethods[match.id] === "ot" ? "active" : ""}`}
                                      onClick={() => handleResolutionChange(match.id, awayTeamObj.id, "ot")}
                                    >
                                      Gana {resolvedAway}
                                    </button>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted)", width: "80px" }}>En Penaltis:</span>
                                    <button
                                      type="button"
                                      className={`penalty-pill ${penaltyWinners[match.id] === homeTeamObj.id && resolutionMethods[match.id] === "pk" ? "active" : ""}`}
                                      onClick={() => handleResolutionChange(match.id, homeTeamObj.id, "pk")}
                                    >
                                      Gana {resolvedHome}
                                    </button>
                                    <button
                                      type="button"
                                      className={`penalty-pill ${penaltyWinners[match.id] === awayTeamObj.id && resolutionMethods[match.id] === "pk" ? "active" : ""}`}
                                      onClick={() => handleResolutionChange(match.id, awayTeamObj.id, "pk")}
                                    >
                                      Gana {resolvedAway}
                                    </button>
                                  </div>
                                </div>
                                <input type="hidden" name={`match_${match.id}_winner`} value={penaltyWinners[match.id] ?? ""} />
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

      {/* ════════════════ 3. ESPECIALES ════════════════ */}
      <div className="phase-group" style={{ display: activeTab === "especiales" ? "block" : "none" }}>
        <h3 className="phase-title">Premios Especiales</h3>
        <section className="panel">
          <div className="special-row">
            <label>🏆 Campeón del mundo</label>
            <select defaultValue={specialPrediction?.champion_team_id ?? ""} disabled={locked} name="championTeamId">
              <option value="">Seleccionar selección…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.canonical_name} {team.group_code ? `(Grupo ${team.group_code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="special-row">
            <label>👟 Top goleador</label>
            <input
              defaultValue={specialPrediction?.top_scorer_name ?? ""}
              disabled={locked}
              name="topScorerName"
              type="text"
              placeholder="Ej: Mbappé"
            />
          </div>
          <div className="special-row">
            <label>🥇 Balón de oro</label>
            <input
              defaultValue={specialPrediction?.golden_ball_name ?? ""}
              disabled={locked}
              name="goldenBallName"
              type="text"
              placeholder="Ej: Bellingham"
            />
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="page-header" style={{ alignItems: "center", marginTop: "24px" }}>
        <p className="muted" style={{ margin: 0 }}>
          {message}
          {!message && locked && "El formulario está bloqueado (partidos ya iniciados)."}
        </p>
        <button className="button primary" disabled={locked || saving} type="submit">
          {saving ? "Guardando…" : "💾 Guardar apuestas"}
        </button>
      </div>
    </form>
  );
}
