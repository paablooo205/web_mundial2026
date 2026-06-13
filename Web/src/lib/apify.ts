import type { FlashscoreLiveMatch } from "./types";

export async function fetchLiveMatches(): Promise<FlashscoreLiveMatch[]> {
  const token = process.env.API_FOOTBALL_KEY;
  if (!token) {
    throw new Error("Missing API_FOOTBALL_KEY");
  }

  // Para que funcione la simulación "actual", vamos a pedir los partidos del Mundial 2026,
  // pero también los de la Eurocopa 2024 (ID 4) y Copa América 2024 (ID 9) que son los que 
  // realmente se están jugando en estos "últimos días" y que estabas scrapeando sin darte cuenta con Apify.
  const urls = [
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026`,
    `https://v3.football.api-sports.io/fixtures?league=4&season=2024`,
    `https://v3.football.api-sports.io/fixtures?league=9&season=2024`
  ];

  const fetchPromises = urls.map(url => 
    fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": token },
      cache: "no-store"
    }).then(res => {
      if (!res.ok) throw new Error(`API-Football request failed: ${res.status}`);
      return res.json();
    })
  );

  const results = await Promise.all(fetchPromises);
  
  let allMatches: any[] = [];
  results.forEach(data => {
    if (data.response && Array.isArray(data.response)) {
      allMatches = allMatches.concat(data.response);
    }
  });

  return allMatches.map((item: any) => {
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
