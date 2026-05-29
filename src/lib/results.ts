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

  for (const match of matches) {
    if (typeof match.home_score !== "number" || typeof match.away_score !== "number") {
      continue;
    }

    const { data: dbMatch } = await supabase
      .from("match_cards")
      .select("id")
      .ilike("home_team_name", match.home_team ?? "")
      .ilike("away_team_name", match.away_team ?? "")
      .maybeSingle();

    if (!dbMatch) {
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
    }
  }

  return { updated };
}
