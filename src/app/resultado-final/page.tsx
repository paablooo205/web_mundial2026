import { createServiceClient } from "@/lib/supabase";
import { FinalResultClient } from "./final-result-client";
import { getAdminFullData, getPublicStandings } from "@/lib/queries";

export const revalidate = 60; // Revalidate every minute

export default async function ResultadoFinalPage() {
  const supabase = createServiceClient();
  
  const [
    { data: awards },
    { data: teamsRaw },
    fullData,
    standings
  ] = await Promise.all([
    supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle(),
    supabase.from("teams").select("id, canonical_name").order("canonical_name"),
    getAdminFullData(),
    getPublicStandings()
  ]);

  let championName = "Por decidir";
  if (awards?.champion_team_id && teamsRaw) {
    const team = teamsRaw.find((t) => t.id === awards.champion_team_id);
    if (team) championName = team.canonical_name;
  }

  const finalAwards = {
    championName,
    topScorerName: awards?.top_scorer_name || "Por decidir",
    goldenBallName: awards?.golden_ball_name || "Por decidir"
  };

  // Mapeamos los datos de fullData
  const mappedMatches = fullData.matches.map((m: any) => ({
    id: m.id,
    phase: m.phase,
    home_team_name: m.home_team_name,
    away_team_name: m.away_team_name,
    kickoff_at: m.kickoff_at
  }));

  const mappedPredictions = fullData.predictions.map((p: any) => ({
    player_id: Number(p.player_id),
    match_id: Number(p.match_id),
    predicted_home_goals: p.predicted_home_goals,
    predicted_away_goals: p.predicted_away_goals,
    predicted_winner_team_id: p.predicted_winner_team_id ? Number(p.predicted_winner_team_id) : null
  }));

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Resultado Final</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.9375rem" }}>
            El resumen oficial del torneo y los premios individuales.
          </p>
        </div>
      </div>
      <FinalResultClient 
        awards={finalAwards} 
        players={fullData.players}
        predictions={mappedPredictions}
        standings={standings}
      />
    </main>
  );
}
