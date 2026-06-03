import { createServiceClient } from "./supabase";
import { isDoubleScoringPhase, resolveActualWinner, scoreKnockoutMatch } from "./knockout-scoring";
import { KNOCKOUT_ROUND_ORDER } from "./knockout-bracket";
import { defaultScoringConfig, normalizePersonName, scoreMatch } from "./scoring";

type PredictionRow = {
  player_id: number;
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
  predicted_home_team_id: number | null;
  predicted_away_team_id: number | null;
};

type ResultRow = {
  match_id: number;
  home_goals: number;
  away_goals: number;
  winner_team_id: number | null;
};

type MatchRow = {
  id: number;
  phase: string;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff_at: string | null;
};

export async function recalculateStandings() {
  const supabase = createServiceClient();
  const [{ data: players }, { data: predictions }, { data: results }, { data: matches }, { data: specials }, { data: awards }, { data: teams }] =
    await Promise.all([
      supabase.from("players").select("id, display_name"),
      supabase.from("predictions").select("*"),
      supabase.from("match_results").select("match_id, home_goals, away_goals, winner_team_id").eq("status", "finished"),
      supabase.from("matches").select("id, phase, home_team_id, away_team_id, kickoff_at"),
      supabase.from("special_predictions").select("*"),
      supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle(),
      supabase.from("teams").select("id, canonical_name")
    ]);

  const resultsByMatch = new Map((results ?? []).map((row: ResultRow) => [row.match_id, row]));
  const matchById = new Map((matches ?? []).map((row: MatchRow) => [row.id, row]));
  const specialsByPlayer = new Map((specials ?? []).map((row) => [row.player_id, row]));
  const standings = [];

  const spainTeam = (teams ?? []).find(t => t.canonical_name === "España");
  const spainTeamId = spainTeam?.id;

  // Encontrar el partido inaugural (el primero cronológicamente o por defecto el id 1)
  const sortedMatches = [...(matches ?? [])]
    .filter(m => m.kickoff_at)
    .sort((a, b) => new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime());
  const openingMatchId = sortedMatches.length > 0 ? sortedMatches[0].id : 1;

  for (const player of players ?? []) {
    let total = 0;
    let exactScores = 0;
    let correctSigns = 0;
    let goalDifferenceHits = 0;
    let advancementHits = 0;

    for (const prediction of (predictions ?? []) as PredictionRow[]) {
      if (prediction.player_id !== player.id) continue;
      const result = resultsByMatch.get(prediction.match_id);
      if (!result) continue;

      const match = matchById.get(prediction.match_id);
      if (!match) continue;

      let multiplier = 1;
      if (match.id === openingMatchId) {
        multiplier = 2;
      } else if (match.phase === "Semifinales" || match.phase === "Final") {
        multiplier = 2;
      } else {
        const isGroupStage = !KNOCKOUT_ROUND_ORDER.includes(match.phase as any);
        if (isGroupStage && spainTeamId && (match.home_team_id === spainTeamId || match.away_team_id === spainTeamId)) {
          multiplier = 2;
        }
      }

      if (isDoubleScoringPhase(match.phase)) {
        const actualWinner = resolveActualWinner(result, match);
        const scored = scoreKnockoutMatch({
          prediction,
          result,
          predictedHomeTeamId: prediction.predicted_home_team_id,
          predictedAwayTeamId: prediction.predicted_away_team_id,
          predictedWinnerTeamId: prediction.predicted_winner_team_id,
          actualHomeTeamId: match.home_team_id,
          actualAwayTeamId: match.away_team_id,
          actualWinnerTeamId: actualWinner
        });
        total += scored.points * multiplier;
        if (scored.exact) exactScores += 1 * multiplier;
        if (scored.correctSign) correctSigns += 1 * multiplier;
        if (scored.goalDifferenceHit) goalDifferenceHits += 1 * multiplier;
        if (scored.advancementHit) advancementHits += 1 * multiplier;
      } else {
        const scored = scoreMatch(prediction, result);
        total += scored.points * multiplier;
        if (scored.exact) exactScores += 1 * multiplier;
        if (scored.correctSign) correctSigns += 1 * multiplier;
        if (scored.goalDifferenceHit) goalDifferenceHits += 1 * multiplier;
      }
    }

    const special = specialsByPlayer.get(player.id);
    const championHit =
      Boolean(awards?.champion_team_id) && special?.champion_team_id === awards?.champion_team_id;
    const officialTopScorer = awards?.top_scorer_name?.trim();
    const officialGoldenBall = awards?.golden_ball_name?.trim();
    const topScorerHit =
      Boolean(officialTopScorer) &&
      normalizePersonName(special?.top_scorer_name) === normalizePersonName(officialTopScorer);
    const goldenBallHit =
      Boolean(officialGoldenBall) &&
      normalizePersonName(special?.golden_ball_name) === normalizePersonName(officialGoldenBall);

    if (championHit) total += defaultScoringConfig.champion;
    if (topScorerHit) total += defaultScoringConfig.topScorer;
    if (goldenBallHit) total += defaultScoringConfig.goldenBall;

    standings.push({
      player_id: player.id,
      total_points: total,
      exact_scores: exactScores,
      correct_signs: correctSigns,
      goal_difference_hits: goalDifferenceHits,
      advancement_hits: advancementHits,
      champion_hit: championHit,
      top_scorer_hit: topScorerHit,
      golden_ball_hit: goldenBallHit,
      tie_break_score:
        Number(championHit) * 1000 +
        Number(topScorerHit) * 100 +
        Number(goldenBallHit) * 10 +
        advancementHits * 5 +
        exactScores,
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
    const { error: upsertError } = await supabase.from("standings").upsert(ranked, { onConflict: "player_id" });
    if (upsertError) {
      console.error("[recalculateStandings] upsert error:", upsertError);
      throw new Error(upsertError.message);
    }
  }

  return ranked;
}
