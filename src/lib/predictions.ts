import { z } from "zod";
import { createServiceClient } from "./supabase";

const baseSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  accessCode: z.string().min(4),
  championTeamId: z.coerce.number().int().positive().optional().or(z.literal("")),
  topScorerName: z.string().optional(),
  goldenBallName: z.string().optional()
});

export async function savePredictionsFromForm(form: FormData) {
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

  const predictions: {
    player_id: number;
    match_id: number;
    predicted_home_goals: number | null;
    predicted_away_goals: number | null;
    predicted_winner_team_id: number | null;
  }[] = [];
  for (const [key, value] of form.entries()) {
    const match = /^match_(\d+)_(home|away)$/.exec(key);
    if (!match || value === "") continue;

    const matchId = Number(match[1]);
    let row = predictions.find((item) => item.match_id === matchId);
    if (!row) {
      row = {
        player_id: parsed.data.playerId,
        match_id: matchId,
        predicted_home_goals: null,
        predicted_away_goals: null,
        predicted_winner_team_id: null
      };
      predictions.push(row);
    }
    if (match[2] === "home") row.predicted_home_goals = Number(value);
    if (match[2] === "away") row.predicted_away_goals = Number(value);
  }

  // Populate predicted_winner_team_id from form inputs
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
