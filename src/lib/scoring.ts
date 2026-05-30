export type MatchPrediction = {
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
};

export type MatchResult = {
  home_goals: number;
  away_goals: number;
};

export type ScoringConfig = {
  exactScore: number;
  correctSign: number;
  goalDifference: number;
  /** Equipo que acertaste que avanza (cuartos, semifinales, final). */
  advancementPoints: number;
  champion: number;
  topScorer: number;
  goldenBall: number;
};

export const defaultScoringConfig: ScoringConfig = {
  exactScore: 5,
  correctSign: 2,
  goalDifference: 1,
  advancementPoints: 3,
  champion: 10,
  topScorer: 5,
  goldenBall: 5
};

export function sign(home: number, away: number) {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

export function scoreMatch(
  prediction: MatchPrediction,
  result: MatchResult,
  config: ScoringConfig = defaultScoringConfig
) {
  if (prediction.predicted_home_goals === null || prediction.predicted_away_goals === null) {
    return { points: 0, exact: false, correctSign: false, goalDifferenceHit: false };
  }

  const exact =
    prediction.predicted_home_goals === result.home_goals &&
    prediction.predicted_away_goals === result.away_goals;

  if (exact) {
    return { points: config.exactScore, exact: true, correctSign: true, goalDifferenceHit: false };
  }

  const correctSign =
    sign(prediction.predicted_home_goals, prediction.predicted_away_goals) ===
    sign(result.home_goals, result.away_goals);

  let points = correctSign ? config.correctSign : 0;
  const predictedDiff = Math.abs(prediction.predicted_home_goals - prediction.predicted_away_goals);
  const resultDiff = Math.abs(result.home_goals - result.away_goals);
  const goalDifferenceHit = correctSign && predictedDiff === resultDiff;

  if (goalDifferenceHit) {
    points += config.goalDifference;
  }

  return { points, exact: false, correctSign, goalDifferenceHit };
}

export function normalizePersonName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
