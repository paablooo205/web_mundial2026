import { createServiceClient } from "@/lib/supabase";
import { UpcomingMatchesWidget } from "./upcoming-matches-widget";

export async function UpcomingMatchesServer() {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { data: matches } = await supabase
      .from("match_cards")
      .select("id, home_team_name, away_team_name, kickoff_at, phase")
      .gt("kickoff_at", now)
      .order("kickoff_at", { ascending: true })
      .limit(3);

    if (!matches || matches.length === 0) return null;

    // Mapear a la forma que espera el widget
    const mapped = matches.map((m) => ({
      id: String(m.id),
      home_team: m.home_team_name ?? "Por decidir",
      away_team: m.away_team_name ?? "Por decidir",
      kickoff_at: m.kickoff_at ?? "",
      stage: m.phase ?? undefined,
    }));

    return <UpcomingMatchesWidget matches={mapped} />;
  } catch {
    // Si falla silenciosamente, no rompemos la app
    return null;
  }
}
