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
type PlayerSpecialPrediction = {
  player_id: number; champion_team_id: number | null;
  top_scorer_name: string | null; golden_ball_name: string | null;
};

type Props = {
  matches?: Match[];
  players: Player[];
  teams: Team[];
  predictions: PlayerPrediction[];
  specialPredictions: PlayerSpecialPrediction[];
  standings: StandingRow[];
};

export function ClubStatisticsViewer({ matches = [], players, teams, predictions, specialPredictions, standings }: Props) {
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

  // --- TENDENCIAS GENERALES (Sabiduría de las masas) ---
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
