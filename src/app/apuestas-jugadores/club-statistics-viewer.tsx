"use client";

import { useMemo } from "react";
import type { StandingRow } from "@/lib/types";

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
  players: Player[];
  teams: Team[];
  predictions: PlayerPrediction[];
  specialPredictions: PlayerSpecialPrediction[];
  standings: StandingRow[];
};

export function ClubStatisticsViewer({ players, teams, predictions, specialPredictions, standings }: Props) {
  // Helpers
  const getPlayerName = (id: number) => players.find(p => p.id === id)?.display_name || `Jugador ${id}`;
  const getTeamName = (id: number) => teams.find(t => t.id === id)?.canonical_name || "Desconocido";

  // --- RENDIMIENTO (Basado en Standings) ---
  const oraculos = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.exact_scores));
    if (maxVal === 0) return [];
    return standings.filter(s => s.exact_scores === maxVal).map(s => ({ name: s.display_name, val: s.exact_scores }));
  }, [standings]);

  const rey1x2 = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.correct_signs));
    if (maxVal === 0) return [];
    return standings.filter(s => s.correct_signs === maxVal).map(s => ({ name: s.display_name, val: s.correct_signs }));
  }, [standings]);

  const visionario = useMemo(() => {
    if (standings.length === 0) return [];
    const maxVal = Math.max(...standings.map(s => s.advancement_hits));
    if (maxVal === 0) return [];
    return standings.filter(s => s.advancement_hits === maxVal).map(s => ({ name: s.display_name, val: s.advancement_hits }));
  }, [standings]);

  // --- ESTILOS DE JUEGO (Basado en Predictions) ---
  const { amarrategui, locoGoles } = useMemo(() => {
    const goalsByPlayer: Record<number, { total: number, count: number }> = {};
    predictions.forEach(p => {
      if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
        if (!goalsByPlayer[p.player_id]) goalsByPlayer[p.player_id] = { total: 0, count: 0 };
        goalsByPlayer[p.player_id].total += p.predicted_home_goals + p.predicted_away_goals;
        goalsByPlayer[p.player_id].count += 1;
      }
    });

    const averages = Object.keys(goalsByPlayer).map(pid => {
      const data = goalsByPlayer[Number(pid)];
      return { id: Number(pid), avg: data.total / data.count, count: data.count };
    }).filter(p => p.count >= 10); // Require at least 10 predictions to be considered

    if (averages.length === 0) return { amarrategui: null, locoGoles: null };

    averages.sort((a, b) => a.avg - b.avg);
    const minAvg = averages[0];
    const maxAvg = averages[averages.length - 1];

    const minPlayers = averages.filter(p => p.avg === minAvg.avg);
    const maxPlayers = averages.filter(p => p.avg === maxAvg.avg);

    return {
      amarrategui: minPlayers.map(p => ({ name: getPlayerName(p.id), val: p.avg.toFixed(2) })),
      locoGoles: maxPlayers.map(p => ({ name: getPlayerName(p.id), val: p.avg.toFixed(2) }))
    };
  }, [predictions]);

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


  const renderNames = (items: { name: string, val: string | number }[]) => {
    if (!items || items.length === 0) return "Nadie todavía";
    return items.map(i => i.name).join(", ");
  };

  const renderVal = (items: { name: string, val: string | number }[]) => {
    if (!items || items.length === 0) return "";
    return items[0].val;
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", display: "flex", flexDirection: "column", gap: "32px" }}>
      
      <section>
        <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-red-bright)" }}>
          Salón de la Fama
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎯</div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Oráculo</h4>
            <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más marcadores exactos</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-white)" }}>{renderNames(oraculos)}</span>
              <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(oraculos)}</span>
            </div>
          </div>

          <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚖️</div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Rey del 1X2</h4>
            <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más signos correctos acertados</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-white)" }}>{renderNames(rey1x2)}</span>
              <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(rey1x2)}</span>
            </div>
          </div>

          <div className="panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔮</div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Visionario</h4>
            <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Más clasificados de eliminatoria</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-white)" }}>{renderNames(visionario)}</span>
              <span style={{ fontWeight: "800", color: "var(--usa-red-bright)", fontSize: "1.5rem" }}>{renderVal(visionario)}</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="phase-title" style={{ marginBottom: "16px", paddingLeft: "12px", borderLeft: "3px solid var(--usa-blue-bright)" }}>
          Estilos de Juego
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          <div className="panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛡️</div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>El Amarrategui</h4>
            <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "0.85rem" }}>Menor promedio de goles pronosticados</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-white)" }}>
                {amarrategui ? renderNames(amarrategui) : "N/A"}
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
              <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--usa-white)" }}>
                {locoGoles ? renderNames(locoGoles) : "N/A"}
              </span>
              <span style={{ fontWeight: "800", color: "var(--usa-blue-bright)", fontSize: "1.5rem" }}>
                {locoGoles ? renderVal(locoGoles) : "-"}
              </span>
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
            <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>🏆 Favoritos al Título</h4>
            {championFavorites.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {championFavorites.map((fav, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "800", color: i === 0 ? "var(--usa-red-bright)" : "var(--muted-color)" }}>#{i+1}</span>
                      <span style={{ fontWeight: "600", color: "var(--usa-white)" }}>{fav.teamName}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.85rem" }} className="muted">{fav.count} votos</span>
                      <span style={{ fontWeight: "700", fontSize: "0.9rem", backgroundColor: "var(--bg-modifier-hover)", padding: "2px 6px", borderRadius: "4px" }}>
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
              <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>👟 Candidatos Bota de Oro</h4>
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
              <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>🥇 Candidatos Balón de Oro</h4>
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
  );
}
