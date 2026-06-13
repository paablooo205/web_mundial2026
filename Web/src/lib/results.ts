import { createServiceClient } from "./supabase";
import type { FlashscoreLiveMatch } from "./types";

function isFinished(status?: string) {
  return ["finished", "after penalties", "aet", "ft"].some((token) =>
    (status ?? "").toLowerCase().includes(token)
  );
}

export async function syncLiveResults(matches: FlashscoreLiveMatch[]) {
  const supabase = createServiceClient();
  let updated = 0;
  const errors: string[] = [];

  for (const match of matches) {
    if (typeof match.home_score !== "number" || typeof match.away_score !== "number") {
      continue;
    }

    const { data: homeTeam } = await supabase
      .from("teams")
      .select("id")
      .or(`flashscore_name.ilike.%${match.home_team}%,canonical_name.ilike.%${match.home_team}%,canonical_name.ilike.%${(match.home_team || '').substring(0,4)}%`)
      .limit(1)
      .maybeSingle();

    const { data: awayTeam } = await supabase
      .from("teams")
      .select("id")
      .or(`flashscore_name.ilike.%${match.away_team}%,canonical_name.ilike.%${match.away_team}%,canonical_name.ilike.%${(match.away_team || '').substring(0,4)}%`)
      .limit(1)
      .maybeSingle();

    if (!homeTeam || !awayTeam) {
      errors.push(`No match found: ${match.home_team} vs ${match.away_team}`);
      continue;
    }

    const { data: dbMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("home_team_id", homeTeam.id)
      .eq("away_team_id", awayTeam.id)
      .maybeSingle();

    if (!dbMatch) {
      errors.push(`Match not found in DB: ${match.home_team} vs ${match.away_team}`);
      continue;
    }

    const { error } = await supabase.from("match_results").upsert({
      match_id: dbMatch.id,
      home_goals: match.home_score,
      away_goals: match.away_score,
      status: isFinished(match.status) ? "finished" : "live",
      source: "apify-flashscore",
      source_payload: match,
      updated_at: new Date().toISOString()
    });

    if (!error) {
      updated += 1;
    } else {
      errors.push(`Upsert error match ${dbMatch.id}: ${error.message}`);
    }
  }

  return { updated, errors };
}
