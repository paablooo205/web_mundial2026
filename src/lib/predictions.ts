import { z } from "zod";
import { isDoubleScoringPhase } from "./knockout-scoring";
import { createServiceClient } from "./supabase";

const baseSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  accessCode: z.string().min(4),
  championTeamId: z.coerce.number().int().positive().optional().or(z.literal("")),
  topScorerName: z.string().optional(),
  goldenBallName: z.string().optional()
});

type PredictionRow = {
  player_id: number;
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
  predicted_home_team_id: number | null;
  predicted_away_team_id: number | null;
};

function getOrCreatePredictionRow(
  predictions: PredictionRow[],
  playerId: number,
  matchId: number
) {
  let row = predictions.find((item) => item.match_id === matchId);
  if (!row) {
    row = {
      player_id: playerId,
      match_id: matchId,
      predicted_home_goals: null,
      predicted_away_goals: null,
      predicted_winner_team_id: null,
      predicted_home_team_id: null,
      predicted_away_team_id: null
    };
    predictions.push(row);
  }
  return row;
}

export async function savePredictionsFromForm(form: FormData) {
  const TOURNAMENT_START = new Date("2026-06-11T00:00:00Z");
  const LOCK_DATE = new Date(TOURNAMENT_START.getTime() - 24 * 60 * 60 * 1000);
  if (new Date() >= LOCK_DATE) {
    return { ok: false as const, error: "El tiempo para hacer predicciones ha terminado. La porra está cerrada." };
  }

  const raw = Object.fromEntries(form.entries());
  const parsed = baseSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false as const, error: "Formulario no valido" };
  }

  const supabase = createServiceClient();
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", parsed.data.playerId)
    .eq("access_code", parsed.data.accessCode)
    .single();

  if (!player) {
    return { ok: false as const, error: "Codigo no valido" };
  }

  const { data: matches } = await supabase.from("matches").select("id, phase");
  const phaseByMatchId = new Map((matches ?? []).map((m) => [m.id, m.phase]));

  const predictions: PredictionRow[] = [];

  for (const [key, value] of form.entries()) {
    const scoreMatch = /^match_(\d+)_(home|away)$/.exec(key);
    if (scoreMatch && value !== "") {
      const matchId = Number(scoreMatch[1]);
      const row = getOrCreatePredictionRow(predictions, parsed.data.playerId, matchId);
      if (scoreMatch[2] === "home") row.predicted_home_goals = Number(value);
      if (scoreMatch[2] === "away") row.predicted_away_goals = Number(value);
      continue;
    }

    const teamMatch = /^match_(\d+)_(home|away)_team_id$/.exec(key);
    if (teamMatch && value !== "") {
      const matchId = Number(teamMatch[1]);
      const phase = phaseByMatchId.get(matchId);
      if (!phase || !isDoubleScoringPhase(phase)) continue;

      const row = getOrCreatePredictionRow(predictions, parsed.data.playerId, matchId);
      if (teamMatch[2] === "home") row.predicted_home_team_id = Number(value);
      if (teamMatch[2] === "away") row.predicted_away_team_id = Number(value);
    }
  }

  predictions.forEach((row) => {
    const winnerVal = form.get(`match_${row.match_id}_winner`);
    if (winnerVal) {
      row.predicted_winner_team_id = Number(winnerVal);
    }
  });

  if (predictions.length) {
    const { error } = await supabase.from("predictions").upsert(predictions, {
      onConflict: "player_id,match_id"
    });
    if (error) return { ok: false as const, error: error.message };
  }

  const { error: specialError } = await supabase.from("special_predictions").upsert({
    player_id: parsed.data.playerId,
    champion_team_id: parsed.data.championTeamId === "" ? null : parsed.data.championTeamId,
    top_scorer_name: parsed.data.topScorerName ?? null,
    golden_ball_name: parsed.data.goldenBallName ?? null,
    submitted_at: new Date().toISOString()
  });

  if (specialError) {
    return { ok: false as const, error: specialError.message };
  }

  return { ok: true as const };
}
