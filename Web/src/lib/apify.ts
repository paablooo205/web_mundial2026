import type { FlashscoreLiveMatch } from "./types";

export async function fetchLiveMatches(): Promise<FlashscoreLiveMatch[]> {
  const token = process.env.API_FOOTBALL_KEY;
  if (!token) {
    throw new Error("Missing API_FOOTBALL_KEY");
  }

  // World Cup 2026 League ID is 1
  // We fetch fixtures for the current date. In a real scenario you might fetch live or recent ones.
  // We can fetch by date to get today's matches.
  const today = new Date().toISOString().split("T")[0];
  
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`,
    {
      method: "GET",
      headers: {
        "x-apisports-key": token
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`API-Football request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.response || !Array.isArray(data.response)) {
    return [];
  }

  return data.response.map((item: any) => {
    return {
      home_team: item.teams.home.name,
      away_team: item.teams.away.name,
      home_score: item.goals.home,
      away_score: item.goals.away,
      status: item.fixture.status.short, // "FT", "1H", "2H", "NS", etc.
      match_id: String(item.fixture.id),
    };
  });
}
