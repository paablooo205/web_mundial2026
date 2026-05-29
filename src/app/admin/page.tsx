import { getAdminFullData, getAdminSummary } from "@/lib/queries";
import { AdminForm } from "./admin-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const summary = await getAdminSummary();
  const data = await getAdminFullData();

  // Map database structures to fit AdminForm typings perfectly
  const mappedMatches = data.matches.map((m: any) => ({
    id: m.id,
    phase: m.phase,
    home_team_name: m.home_team_name,
    away_team_name: m.away_team_name,
    kickoff_at: m.kickoff_at
  }));

  const mappedResults = data.results.map((r: any) => ({
    match_id: Number(r.match_id),
    home_goals: r.home_goals,
    away_goals: r.away_goals,
    status: r.status,
    winner_team_id: r.winner_team_id ? Number(r.winner_team_id) : null
  }));

  const mappedPredictions = data.predictions.map((p: any) => ({
    player_id: Number(p.player_id),
    match_id: Number(p.match_id),
    predicted_home_goals: p.predicted_home_goals,
    predicted_away_goals: p.predicted_away_goals,
    predicted_winner_team_id: p.predicted_winner_team_id ? Number(p.predicted_winner_team_id) : null
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
          <h1>Panel de Administración</h1>
          <p className="muted">Registra los resultados reales del Mundial y actualiza la clasificación al instante.</p>
        </div>
      </div>

      <AdminForm
        matches={mappedMatches}
        teams={data.teams}
        results={mappedResults}
        awards={data.awards}
        players={data.players}
        predictions={mappedPredictions}
        specialPredictions={mappedSpecialPredictions}
        summary={summary}
      />
    </main>
  );
}
