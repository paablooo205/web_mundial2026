import { defaultScoringConfig, scoreMatch, type MatchPrediction, type MatchResult, type ScoringConfig } from "./scoring";

/** Fases con doble puntuación: clasificado (+3) + marcador solo si el cruce coincide. */
export const DOUBLE_SCORING_PHASES = new Set([
  "Cuartos de final",
  "Semifinales",
  "Final"
]);

export function isDoubleScoringPhase(phase: string) {
  return DOUBLE_SCORING_PHASES.has(phase);
}

export function pairingMatches(
  predictedHomeTeamId: number | null | undefined,
  predictedAwayTeamId: number | null | undefined,
  actualHomeTeamId: number | null | undefined,
  actualAwayTeamId: number | null | undefined
) {
  if (!predictedHomeTeamId || !predictedAwayTeamId || !actualHomeTeamId || !actualAwayTeamId) {
    return false;
  }

  return (
    (predictedHomeTeamId === actualHomeTeamId && predictedAwayTeamId === actualAwayTeamId) ||
    (predictedHomeTeamId === actualAwayTeamId && predictedAwayTeamId === actualHomeTeamId)
  );
}

export function resolveActualWinner(
  result: { home_goals: number; away_goals: number; winner_team_id?: number | null },
  match: { home_team_id: number | null; away_team_id: number | null }
): number | null {
  if (result.winner_team_id) {
    return result.winner_team_id;
  }
  if (!match.home_team_id || !match.away_team_id) {
    return null;
  }
  if (result.home_goals > result.away_goals) {
    return match.home_team_id;
  }
  if (result.away_goals > result.home_goals) {
    return match.away_team_id;
  }
  return null;
}

export type KnockoutScoreInput = {
  prediction: MatchPrediction;
  result: MatchResult;
  predictedHomeTeamId: number | null | undefined;
  predictedAwayTeamId: number | null | undefined;
  predictedWinnerTeamId: number | null | undefined;
  actualHomeTeamId: number | null | undefined;
  actualAwayTeamId: number | null | undefined;
  actualWinnerTeamId: number | null | undefined;
  config?: ScoringConfig;
};

export function scoreKnockoutMatch(input: KnockoutScoreInput) {
  const config = input.config ?? defaultScoringConfig;
  const pairingOk = pairingMatches(
    input.predictedHomeTeamId,
    input.predictedAwayTeamId,
    input.actualHomeTeamId,
    input.actualAwayTeamId
  );

  const matchScored = pairingOk
    ? scoreMatch(input.prediction, input.result, config)
    : { points: 0, exact: false, correctSign: false, goalDifferenceHit: false };

  const advancementHit =
    input.predictedWinnerTeamId != null &&
    input.actualWinnerTeamId != null &&
    input.predictedWinnerTeamId === input.actualWinnerTeamId;

  const advancementPoints = advancementHit ? config.advancementPoints : 0;

  return {
    points: matchScored.points + advancementPoints,
    exact: matchScored.exact,
    correctSign: matchScored.correctSign,
    goalDifferenceHit: matchScored.goalDifferenceHit,
    advancementHit,
    pairingMatched: pairingOk
  };
}
