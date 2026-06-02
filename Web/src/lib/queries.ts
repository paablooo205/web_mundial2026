import { createServiceClient } from "./supabase";
import type { StandingRow } from "./types";

export async function getPublicStandings(): Promise<StandingRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("public_standings")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPlayerEntryData(code: string) {
  const supabase = createServiceClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, access_code, display_name")
    .eq("access_code", code)
    .single();

  if (!player) {
    return { player: null, matches: [], teams: [], specialPrediction: null, locked: true };
  }

  const [
    { data: matches }, 
    { data: teams }, 
    { data: specialPrediction },
    { data: predictions }
  ] = await Promise.all([
    supabase
      .from("match_cards")
      .select("*")
      .order("kickoff_at", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("id, canonical_name, group_code").order("canonical_name"),
    supabase.from("special_predictions").select("*").eq("player_id", player.id).maybeSingle(),
    supabase.from("predictions").select("match_id, predicted_home_goals, predicted_away_goals, predicted_winner_team_id").eq("player_id", player.id)
  ]);

  const TOURNAMENT_START = new Date("2026-06-11T00:00:00Z");
  const LOCK_DATE = new Date(TOURNAMENT_START.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();
  const isLocked = now >= LOCK_DATE;

  return {
    player,
    matches: matches ?? [],
    teams: teams ?? [],
    specialPrediction: specialPrediction ?? null,
    predictions: predictions ?? [],
    locked: isLocked
  };
}

export async function getAdminSummary() {
  const supabase = createServiceClient();
  const [players, matches, results] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("match_cards").select("id", { count: "exact", head: true }),
    supabase.from("match_results").select("match_id", { count: "exact", head: true })
  ]);

  return {
    players: players.count ?? 0,
    matches: matches.count ?? 0,
    results: results.count ?? 0
  };
}

export async function getAdminFullData() {
  const supabase = createServiceClient();
  const [
    { data: matches },
    { data: teams },
    { data: results },
    { data: awards },
    { data: players },
    { data: predictions },
    { data: specialPredictions }
  ] = await Promise.all([
    supabase
      .from("match_cards")
      .select("*")
      .order("kickoff_at", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("id, canonical_name, group_code").order("canonical_name"),
    supabase.from("match_results").select("*"),
    supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle(),
    supabase.from("players").select("id, display_name").order("display_name"),
    supabase.from("predictions").select("player_id, match_id, predicted_home_goals, predicted_away_goals, predicted_winner_team_id"),
    supabase.from("special_predictions").select("player_id, champion_team_id, top_scorer_name, golden_ball_name")
  ]);

  return {
    matches: matches ?? [],
    teams: teams ?? [],
    results: results ?? [],
    awards: awards ?? null,
    players: players ?? [],
    predictions: predictions ?? [],
    specialPredictions: specialPredictions ?? []
  };
}
