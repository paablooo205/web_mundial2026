import { createServiceClient } from "./supabase";
import { defaultScoringConfig, normalizePersonName, scoreMatch } from "./scoring";

type PredictionRow = {
  player_id: number;
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
};

type ResultRow = {
  match_id: number;
  home_goals: number;
  away_goals: number;
};

export async function recalculateStandings() {
  const supabase = createServiceClient();
  const [{ data: players }, { data: predictions }, { data: results }, { data: specials }, { data: awards }] =
    await Promise.all([
      supabase.from("players").select("id, display_name"),
      supabase.from("predictions").select("*"),
      supabase.from("match_results").select("match_id, home_goals, away_goals").eq("status", "finished"),
      supabase.from("special_predictions").select("*"),
      supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle()
    ]);

  const resultsByMatch = new Map((results ?? []).map((row: ResultRow) => [row.match_id, row]));
  const specialsByPlayer = new Map((specials ?? []).map((row) => [row.player_id, row]));
  const standings = [];

  for (const player of players ?? []) {
    let total = 0;
    let exactScores = 0;
    let correctSigns = 0;

    for (const prediction of (predictions ?? []) as PredictionRow[]) {
      if (prediction.player_id !== player.id) continue;
      const result = resultsByMatch.get(prediction.match_id);
      if (!result) continue;

      const scored = scoreMatch(prediction, result);
      total += scored.points;
      if (scored.exact) exactScores += 1;
      if (scored.correctSign) correctSigns += 1;
    }

    const special = specialsByPlayer.get(player.id);
    const championHit =
      Boolean(awards?.champion_team_id) && special?.champion_team_id === awards?.champion_team_id;
    const topScorerHit =
      normalizePersonName(special?.top_scorer_name) === normalizePersonName(awards?.top_scorer_name);
    const goldenBallHit =
      normalizePersonName(special?.golden_ball_name) === normalizePersonName(awards?.golden_ball_name);

    if (championHit) total += defaultScoringConfig.champion;
    if (topScorerHit) total += defaultScoringConfig.topScorer;
    if (goldenBallHit) total += defaultScoringConfig.goldenBall;

    standings.push({
      player_id: player.id,
      total_points: total,
      exact_scores: exactScores,
      correct_signs: correctSigns,
      champion_hit: championHit,
      top_scorer_hit: topScorerHit,
      golden_ball_hit: goldenBallHit,
      tie_break_score:
        Number(championHit) * 1000 + Number(topScorerHit) * 100 + Number(goldenBallHit) * 10 + exactScores,
      recalculated_at: new Date().toISOString()
    });
  }

  standings.sort((a, b) => {
    return (
      b.total_points - a.total_points ||
      b.tie_break_score - a.tie_break_score ||
      b.correct_signs - a.correct_signs
    );
  });

  const ranked = standings.map((row, index) => ({ ...row, position: index + 1 }));

  if (ranked.length) {
    await supabase.from("standings").upsert(ranked, { onConflict: "player_id" });
  }

  return ranked;
}
