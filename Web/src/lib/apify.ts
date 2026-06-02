import type { FlashscoreLiveMatch } from "./types";

export async function fetchLiveMatches(): Promise<FlashscoreLiveMatch[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("Missing APIFY_TOKEN");
  }

  const actor = (process.env.APIFY_LIVE_ACTOR ?? "statanow/flashscore-scraper-live").replace("/", "~");
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sport: "football" }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Apify request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((item) => {
    if (Array.isArray(item.matches)) return item.matches;
    return item.home_team || item.away_team ? [item] : [];
  });
}
