"use client";

import { useMemo } from "react";
import type { StandingRow } from "@/lib/types";

type Match = { id: number; phase: string; home_team_name: string | null; away_team_name: string | null; kickoff_at: string | null; };
type Player = { id: number; display_name: string; };
type Team = { id: number; canonical_name: string; group_code: string | null; };
type PlayerPrediction = {
  player_id: number; match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
};
type MatchResult = {
  match_id: number;
  home_goals: number | null;
  away_goals: number | null;
};
type PlayerSpecialPrediction = {
  player_id: number; champion_team_id: number | null;
  top_scorer_name: string | null; golden_ball_name: string | null;
};

type Props = {
  matches?: Match[];
  players: Player[];
  teams: Team[];
  predictions: PlayerPrediction[];
  results?: MatchResult[];
  specialPredictions: PlayerSpecialPrediction[];
  standings: StandingRow[];
};

export function ClubStatisticsViewer({ matches = [], players, teams, predictions, results = [], specialPredictions, standings }: Props) {
  // Helpers
  const getPlayerName = (id: number) => players.find(p => p.id === id)?.display_name || `Jugador ${id}`;
  const getTeamName = (id: number) => teams.find(t => t.id === id)?.canonical_name || "Desconocido";

  // --- RENDIMIENTO (Basado en Standings) ---
  const oraculos = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.exact_scores ?? 0));
    if (maxVal === 0 || isNaN(maxVal)) return [];
    return standings.filter(s => s.exact_scores === maxVal).map(s => ({ name: s.display_name, val: s.exact_scores }));
  }, [standings]);

  const rey1x2 = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.correct_signs ?? 0));
    if (maxVal === 0 || isNaN(maxVal)) return [];
    return standings.filter(s => s.correct_signs === maxVal).map(s => ({ name: s.display_name, val: s.correct_signs }));
  }, [standings]);

  const visionario = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.advancement_hits ?? 0));
    if (maxVal === 0 || isNaN(maxVal)) return [];
    return standings.filter(s => s.advancement_hits === maxVal).map(s => ({ name: s.display_name, val: s.advancement_hits }));
  }, [standings]);

  // --- ESTILOS DE JUEGO (Basado en Predictions) ---
  const { amarrategui, locoGoles, gafas } = useMemo(() => {
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

    // Filtramos para Amarrategui/Loco (mínimo 10 pronósticos)
    const validAvgPlayers = playersStats.filter(p => p.count >= 10).sort((a, b) => a.avg - b.avg);
    
    let amarrateguiRes = null;
    let locoGolesRes = null;
    if (validAvgPlayers.length > 0) {
      const minAvg = validAvgPlayers[0].avg;
      const maxAvg = validAvgPlayers[validAvgPlayers.length - 1].avg;
      amarrateguiRes = validAvgPlayers.filter(p => p.avg === minAvg).map(p => ({ name: getPlayerName(p.id), val: p.avg.toFixed(2) }));
      locoGolesRes = validAvgPlayers.filter(p => p.avg === maxAvg).map(p => ({ name: getPlayerName(p.id), val: p.avg.toFixed(2) }));
    }

    // El Gafas (mínimo 1 0-0)
    const validGafasPlayers = playersStats.filter(p => p.zeroZero > 0).sort((a, b) => b.zeroZero - a.zeroZero);
    let gafasRes = null;
    if (validGafasPlayers.length > 0) {
      const maxZeros = validGafasPlayers[0].zeroZero;
      gafasRes = validGafasPlayers.filter(p => p.zeroZero === maxZeros).map(p => ({ name: getPlayerName(p.id), val: p.zeroZero }));
    }

    return { amarrategui: amarrateguiRes, locoGoles: locoGolesRes, gafas: gafasRes };
  }, [predictions, players]);

  // --- EL SUIZO (más signos de empate en pronósticos totales) ---
  const suizo = useMemo(() => {
    const drawsByPlayer: Record<number, { draws: number, total: number }> = {};
    predictions.forEach(p => {
      if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
        if (!drawsByPlayer[p.player_id]) drawsByPlayer[p.player_id] = { draws: 0, total: 0 };
        drawsByPlayer[p.player_id].total++;
        if (p.predicted_home_goals === p.predicted_away_goals) drawsByPlayer[p.player_id].draws++;
      }
    });
    const stats = Object.keys(drawsByPlayer)
      .filter(pid => drawsByPlayer[Number(pid)].total >= 10)
      .map(pid => {
        const d = drawsByPlayer[Number(pid)];
        return { id: Number(pid), pct: (d.draws / d.total) * 100, draws: d.draws };
      })
      .sort((a, b) => b.pct - a.pct);
    if (stats.length === 0) return null;
    const maxPct = stats[0].pct;
    return stats.filter(p => p.pct === maxPct).map(p => ({ name: getPlayerName(p.id), val: `${p.pct.toFixed(0)}%` }));
  }, [predictions, players]);

  // --- ESTADÍSTICAS QUE REQUIEREN RESULTADOS REALES ---

  // El Pupas: jugador con más partidos a 0 puntos
  // El Rompe-Quinielas: mayor error acumulado en un solo partido
  // El Cholón / El Cisne Negro: partidos donde más/menos puntos repartió la comunidad
  const { pupas, rompeQuinielas, cholon, cisneNegro } = useMemo(() => {
    if (results.length === 0) return { pupas: null, rompeQuinielas: null, cholon: null, cisneNegro: null };

    // Creamos un mapa de resultados reales por partido
    const resultMap: Record<number, { home: number, away: number }> = {};
    results.forEach(r => {
      if (r.home_goals !== null && r.away_goals !== null) {
        resultMap[r.match_id] = { home: r.home_goals, away: r.away_goals };
      }
    });

    const matchesWithResults = Object.keys(resultMap).map(Number);
    if (matchesWithResults.length === 0) return { pupas: null, rompeQuinielas: null, cholon: null, cisneNegro: null };

    // Por jugador: partidos a 0 puntos y peor cantada
    const pupasCount: Record<number, number> = {};
    const cantadaMax: Record<number, { error: number, matchId: number }> = {};

    // Por partido: suma total de error de toda la comunidad (para Cholón/Cisne Negro)
    const matchCommunityScore: Record<number, number> = {};
    matchesWithResults.forEach(mId => { matchCommunityScore[mId] = 0; });

    predictions.forEach(p => {
      const real = resultMap[p.match_id];
      if (!real || p.predicted_home_goals === null || p.predicted_away_goals === null) return;

      // Puntos de este pronóstico (sistema 1X2 simple para ver si acertó algo)
      const predictedSign = p.predicted_home_goals > p.predicted_away_goals ? 1 : p.predicted_home_goals < p.predicted_away_goals ? -1 : 0;
      const realSign = real.home > real.away ? 1 : real.home < real.away ? -1 : 0;
      const exactScore = p.predicted_home_goals === real.home && p.predicted_away_goals === real.away;
      const correctSign = predictedSign === realSign;
      const points = exactScore ? 3 : correctSign ? 1 : 0;

      // El Pupas: partidos a 0 puntos
      if (points === 0) {
        pupasCount[p.player_id] = (pupasCount[p.player_id] || 0) + 1;
      }

      // El Rompe-Quinielas: mayor error absoluto de goles en un solo partido
      const goalError = Math.abs(p.predicted_home_goals - real.home) + Math.abs(p.predicted_away_goals - real.away);
      if (!cantadaMax[p.player_id] || goalError > cantadaMax[p.player_id].error) {
        cantadaMax[p.player_id] = { error: goalError, matchId: p.match_id };
      }

      // Cholón / Cisne Negro: puntos repartidos por la comunidad en cada partido
      matchCommunityScore[p.match_id] = (matchCommunityScore[p.match_id] || 0) + points;
    });

    // El Pupas
    let pupasRes = null;
    const pupasEntries = Object.entries(pupasCount).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (pupasEntries.length > 0) {
      const maxZero = Number(pupasEntries[0][1]);
      pupasRes = pupasEntries.filter(([, v]) => Number(v) === maxZero).map(([pid, v]) => ({
        name: getPlayerName(Number(pid)), val: Number(v)
      }));
    }

    // El Rompe-Quinielas
    let rompeRes = null;
    const rompeEntries = Object.entries(cantadaMax).sort((a, b) => b[1].error - a[1].error);
    if (rompeEntries.length > 0) {
      const maxError = rompeEntries[0][1].error;
      rompeRes = rompeEntries.filter(([, v]) => v.error === maxError).map(([pid, v]) => {
        const match = matches.find(m => m.id === v.matchId);
        const matchLabel = match ? `${match.home_team_name} vs ${match.away_team_name}` : `Partido ${v.matchId}`;
        return { name: getPlayerName(Number(pid)), val: `${v.error} goles (${matchLabel})` };
      });
    }

    // El Cholón (más puntos repartidos)
    let cholonRes = null;
    const cholonEntries = Object.entries(matchCommunityScore).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (cholonEntries.length > 0 && Number(cholonEntries[0][1]) > 0) {
      const topMatchId = Number(cholonEntries[0][0]);
      const topMatch = matches.find(m => m.id === topMatchId);
      cholonRes = topMatch ? `${topMatch.home_team_name} vs ${topMatch.away_team_name} (${Number(cholonEntries[0][1])} pts totales)` : null;
    }

    // El Cisne Negro (menos puntos repartidos)
    let cisneRes = null;
    const cisneEntries = [...cholonEntries].reverse();
    if (cisneEntries.length > 0) {
      const bottomMatchId = Number(cisneEntries[0][0]);
      const bottomMatch = matches.find(m => m.id === bottomMatchId);
      cisneRes = bottomMatch ? `${bottomMatch.home_team_name} vs ${bottomMatch.away_team_name} (${Number(cisneEntries[0][1])} pts totales)` : null;
    }

    return { pupas: pupasRes, rompeQuinielas: rompeRes, cholon: cholonRes, cisneNegro: cisneRes };
  }, [predictions, results, matches, players]);

  const { topRepeatedScore, avgExpectedGoals, consensusMatch } = useMemo(() => {
    if (predictions.length === 0) return { topRepeatedScore: null, avgExpectedGoals: null, consensusMatch: null };

    const scoreCounts: Record<string, number> = {};
    const matchSigns: Record<number, { home: number, draw: number, away: number, total: number }> = {};
    let totalGoals = 0;
    let validPredictionsCount = 0;

    predictions.forEach(p => {
      if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
        // Marcador más repetido
        const scoreKey = `${p.predicted_home_goals}-${p.predicted_away_goals}`;
        scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1;

        // Promedio global
        totalGoals += (p.predicted_home_goals + p.predicted_away_goals);
        validPredictionsCount++;

        // Consenso de signos
        if (!matchSigns[p.match_id]) matchSigns[p.match_id] = { home: 0, draw: 0, away: 0, total: 0 };
        
        // Simple 1X2 calculation based on goals
        if (p.predicted_home_goals > p.predicted_away_goals) matchSigns[p.match_id].home++;
        else if (p.predicted_home_goals < p.predicted_away_goals) matchSigns[p.match_id].away++;
        else matchSigns[p.match_id].draw++;
        
        matchSigns[p.match_id].total++;
      }
    });

    // Score más repetido
    let topScoreStr: string | null = null;
    let topScoreCount = 0;
    Object.entries(scoreCounts).forEach(([score, count]) => {
      if (count > topScoreCount) {
        topScoreStr = score;
        topScoreCount = count;
      }
    });

    // Promedio esperado global
    const avgExpected = validPredictionsCount > 0 ? (totalGoals / validPredictionsCount).toFixed(2) : null;

    // Partido de mayor consenso (Requiere al menos 3 votos)
    let highestConsensusMatchId: number | null = null;
    let highestConsensusPercent = 0;
    let highestConsensusSign = "1";
    
    Object.entries(matchSigns).forEach(([mId, stats]) => {
      if (stats.total >= 3) {
        const homePct = (stats.home / stats.total) * 100;
        const drawPct = (stats.draw / stats.total) * 100;
        const awayPct = (stats.away / stats.total) * 100;
        const maxPct = Math.max(homePct, drawPct, awayPct);
        
        if (maxPct > highestConsensusPercent) {
          highestConsensusMatchId = Number(mId);
          highestConsensusPercent = maxPct;
          if (maxPct === drawPct) highestConsensusSign = "X";
          else if (maxPct === awayPct) highestConsensusSign = "2";
          else highestConsensusSign = "1";
        }
      }
    });

    let consensusStr: string | null = null;
    if (highestConsensusMatchId !== null && matches.length > 0) {
      const match = matches.find(m => m.id === highestConsensusMatchId);
      if (match) {
        const home = match.home_team_name || "L";
        const away = match.away_team_name || "V";
        consensusStr = `${home} vs ${away} (${highestConsensusSign}) - ${highestConsensusPercent.toFixed(0)}%`;
      }
    }

    return {
      topRepeatedScore: topScoreStr ? `${topScoreStr} (${topScoreCount} veces)` : null,
      avgExpectedGoals: avgExpected,
      consensusMatch: consensusStr
    };
  }, [predictions, matches]);

  // --- FAVORITOS (Basado en Special Predictions) ---
  const championFavorites = useMemo(() => {
    const counts: Record<number, number> = {};
    let total = 0;
    specialPredictions.forEach(sp => {
      if (sp.champion_team_id) {
        counts[sp.champion_team_id] = (counts[sp.champion_team_id] || 0) + 1;
        total++;
      }
    });
    
    return Object.entries(counts)
      .map(([teamId, count]) => ({ teamName: getTeamName(Number(teamId)), count, percent: ((count / total) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }, [specialPredictions, teams]);

  const topScorerFavorites = useMemo(() => {
    const counts: Record<string, number> = {};
    specialPredictions.forEach(sp => {
      if (sp.top_scorer_name) {
        const name = sp.top_scorer_name.trim().toLowerCase();
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name: name.replace(/\b\w/g, c => c.toUpperCase()), count }));
  }, [specialPredictions]);

  const goldenBallFavorites = useMemo(() => {
    const counts: Record<string, number> = {};
    specialPredictions.forEach(sp => {
      if (sp.golden_ball_name) {
        const name = sp.golden_ball_name.trim().toLowerCase();
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name: name.replace(/\b\w/g, c => c.toUpperCase()), count }));
  }, [specialPredictions]);


  const renderNames = (items: { name: string, val: string | number }[] | null) => {
    if (!items || items.length === 0) return "Nadie todavía";
    return items.map(i => i.name).join(", ");
  };

  const renderVal = (items: { name: string, val: string | number }[] | null) => {
    if (!items || items.length === 0) return "";
    return items[0].val;
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", display: "flex", flexDirection: "column", gap: "40px" }}>
      
      {/* BLOQUE 1: Rendimiento y Estilos */}
      <div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--usa-white)", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          Rendimiento y Estilos de Juego
        </h2>
        
        <section style={{ marginBottom: "32px" }}>
          <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-red-bright)" }}>
            Salón de la Fama
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎯</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Oráculo</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más marcadores exactos</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>{renderNames(oraculos)}</span>
                <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(oraculos)}</span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚖️</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Rey del 1X2</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más signos correctos acertados</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>{renderNames(rey1x2)}</span>
                <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(rey1x2)}</span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔮</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Visionario</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más clasificados de eliminatoria</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>{renderNames(visionario)}</span>
                <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(visionario)}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-blue-bright)" }}>
            Perfiles de Jugador
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛡️</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Amarrategui</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Menor promedio de goles pronosticados</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(amarrategui)}
                </span>
                <span style={{ fontWeight: "800", color: "var(--usa-blue-bright)", fontSize: "1.5rem" }}>
                  {amarrategui ? renderVal(amarrategui) : "-"}
                </span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚽</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Loco de los Goles</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Mayor promedio de goles pronosticados</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(locoGoles)}
                </span>
                <span style={{ fontWeight: "800", color: "var(--usa-blue-bright)", fontSize: "1.5rem" }}>
                  {locoGoles ? renderVal(locoGoles) : "-"}
                </span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>👓</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Gafas</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más veces ha pronosticado un 0-0</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(gafas)}
                </span>
                <span style={{ fontWeight: "800", color: "var(--usa-blue-bright)", fontSize: "1.5rem" }}>
                  {gafas ? renderVal(gafas) : "-"}
                </span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🤝</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Suizo</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Mayor % de empates pronosticados</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(suizo)}
                </span>
                <span style={{ fontWeight: "800", color: "var(--usa-blue-bright)", fontSize: "1.5rem" }}>
                  {suizo ? renderVal(suizo) : "-"}
                </span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📉</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Pupas</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más partidos con 0 puntos</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(pupas)}
                </span>
                <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>
                  {pupas ? renderVal(pupas) : "-"}
                </span>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎢</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Rompe-Quinielas</h4>
              <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Mayor cantada en un solo partido</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                <span style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--usa-white)" }}>
                  {renderNames(rompeQuinielas)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--usa-red-bright)", fontWeight: "600" }}>
                  {rompeQuinielas ? String(rompeQuinielas[0]?.val) : "Sin resultados aún"}
                </span>
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* BLOQUE 2: Tendencias y Sabiduría de Masas */}
      <div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--usa-white)", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          Tendencias Generales
        </h2>

        <section style={{ marginBottom: "32px" }}>
          <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-white)" }}>
            Datos Curiosos
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            
            <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>📊</span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>Marcador más repetido</h4>
              <div style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-blue-bright)", marginTop: "4px" }}>
                {topRepeatedScore || "N/A"}
              </div>
            </div>

            <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>🤝</span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>Mayor Consenso (1X2)</h4>
              <div style={{ fontWeight: "700", fontSize: "1rem", color: "var(--usa-red-bright)", marginTop: "4px" }}>
                {consensusMatch || "Todavía no hay votos claros"}
              </div>
            </div>

            <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>🥅</span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>Promedio de Goles (Mundial)</h4>
              <div style={{ fontWeight: "700", fontSize: "1.4rem", color: "var(--usa-white)", marginTop: "4px" }}>
                {avgExpectedGoals ? `${avgExpectedGoals} por partido` : "N/A"}
              </div>
            </div>

            <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>🔥</span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>El Cholón</h4>
              <p className="muted" style={{ margin: "2px 0 4px", fontSize: "0.8rem" }}>Partido con más puntos repartidos a la comunidad</p>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--usa-red-bright)", marginTop: "4px" }}>
                {cholon || "Sin resultados aún"}
              </div>
            </div>

            <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "1.5rem" }}>🦄</span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>El Cisne Negro</h4>
              <p className="muted" style={{ margin: "2px 0 4px", fontSize: "0.8rem" }}>Partido que más sorprendió (menos puntos totales)</p>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--usa-blue-bright)", marginTop: "4px" }}>
                {cisneNegro || "Sin resultados aún"}
              </div>
            </div>

          </div>
        </section>

        <section>
          <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-white)" }}>
            La Sabiduría de las Masas
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            
            <div className="panel" style={{ padding: "24px" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>🏆 Favoritos al Título</h4>
              {championFavorites.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {championFavorites.map((fav, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: "800", color: i === 0 ? "var(--usa-red-bright)" : "var(--muted)" }}>#{i+1}</span>
                        <span style={{ fontWeight: "600", color: "var(--usa-white)" }}>{fav.teamName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.85rem" }} className="muted">{fav.count} votos</span>
                        <span style={{ fontWeight: "700", fontSize: "0.9rem", backgroundColor: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>
                          {fav.percent}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Todavía no hay votos.</p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="panel" style={{ padding: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>👟 Candidatos Bota de Oro</h4>
                {topScorerFavorites.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {topScorerFavorites.map((fav, i) => (
                      <li key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "600" }}>{fav.name}</span>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>{fav.count} votos</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ fontSize: "0.9rem" }}>Todavía no hay votos.</p>
                )}
              </div>

              <div className="panel" style={{ padding: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>🥇 Candidatos Balón de Oro</h4>
                {goldenBallFavorites.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {goldenBallFavorites.map((fav, i) => (
                      <li key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "600" }}>{fav.name}</span>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>{fav.count} votos</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ fontSize: "0.9rem" }}>Todavía no hay votos.</p>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
      
    </div>
  );
}
