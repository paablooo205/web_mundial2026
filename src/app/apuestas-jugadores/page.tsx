import { getAdminFullData, getPublicStandings } from "@/lib/queries";
import { ClubSelectoClientWrapper } from "./club-selecto-client-wrapper";

export const dynamic = "force-dynamic";

export default async function ApuestasJugadoresPage() {
  const [data, standings] = await Promise.all([
    getAdminFullData(),
    getPublicStandings()
  ]);

  // Mapeamos los partidos
  const mappedMatches = data.matches.map((m: any) => ({
    id: m.id,
    phase: m.phase,
    home_team_name: m.home_team_name,
    away_team_name: m.away_team_name,
    kickoff_at: m.kickoff_at
  }));

  const mappedPredictions = data.predictions.map((p: any) => ({
    player_id: Number(p.player_id),
    match_id: Number(p.match_id),
    predicted_home_goals: p.predicted_home_goals,
    predicted_away_goals: p.predicted_away_goals,
    predicted_winner_team_id: p.predicted_winner_team_id ? Number(p.predicted_winner_team_id) : null
  }));

  const mappedResults = data.results.map((r: any) => ({
    match_id: Number(r.match_id),
    home_goals: r.home_goals,
    away_goals: r.away_goals
  }));

  const mappedSpecialPredictions = data.specialPredictions.map((sp: any) => ({
    player_id: Number(sp.player_id),
    champion_team_id: sp.champion_team_id ? Number(sp.champion_team_id) : null,
    top_scorer_name: sp.top_scorer_name,
    golden_ball_name: sp.golden_ball_name
  }));

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Club Selecto</h1>
          <p className="muted">Consulta las estadísticas de la comunidad y compara las porras personales de los integrantes.</p>
        </div>
        <span className="status-pill">Pública</span>
      </div>

      <ClubSelectoClientWrapper
        matches={mappedMatches}
        teams={data.teams}
        players={data.players}
        predictions={mappedPredictions}
        results={mappedResults}
        specialPredictions={mappedSpecialPredictions}
        standings={standings}
      />
    </main>
  );
}
