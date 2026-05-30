import { createServiceClient } from "@/lib/supabase";
import { FinalResultClient } from "./final-result-client";

export const revalidate = 60; // Revalidate every minute

export default async function ResultadoFinalPage() {
  const supabase = createServiceClient();
  
  const [
    { data: awards },
    { data: teams }
  ] = await Promise.all([
    supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle(),
    supabase.from("teams").select("id, canonical_name").order("canonical_name")
  ]);

  let championName = "Por decidir";
  if (awards?.champion_team_id && teams) {
    const team = teams.find((t) => t.id === awards.champion_team_id);
    if (team) championName = team.canonical_name;
  }

  const finalAwards = {
    championName,
    topScorerName: awards?.top_scorer_name || "Por decidir",
    goldenBallName: awards?.golden_ball_name || "Por decidir"
  };

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
      <FinalResultClient awards={finalAwards} />
    </main>
  );
}
