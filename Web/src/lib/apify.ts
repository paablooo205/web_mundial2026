import type { FlashscoreLiveMatch } from "./types";

export async function fetchLiveMatches(): Promise<FlashscoreLiveMatch[]> {
  const token = process.env.API_FOOTBALL_KEY;
  if (!token) {
    throw new Error("Missing API_FOOTBALL_KEY");
  }

  // World Cup 2026 League ID is 1
  // Obtenemos TODOS los partidos del Mundial 2026 (pasados, presentes y futuros)
  // para asegurarnos de que si falló algún día anterior, se sincronice todo lo atrasado.
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026`,
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
