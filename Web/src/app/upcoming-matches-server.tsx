import { createServiceClient } from "@/lib/supabase";
import { UpcomingMatchesWidget } from "./upcoming-matches-widget";
import { KNOCKOUT_ROUND_ORDER } from "@/lib/knockout-bracket";

export async function UpcomingMatchesServer() {
  try {
    const supabase = createServiceClient();
    const now = new Date();
    const nowStr = now.toISOString();

    // Traer los próximos 6 partidos con los campos extra para detectar multiplicadores
    const { data: matches } = await supabase
      .from("match_cards")
      .select("id, home_team_name, away_team_name, kickoff_at, phase, group_code, home_team_id, away_team_id, excel_match_key")
      .gt("kickoff_at", nowStr)
      .order("kickoff_at", { ascending: true })
      .limit(6);

    if (!matches || matches.length === 0) return null;

    // Obtener el id del partido inaugural (el primero cronológicamente)
    const { data: allMatches } = await supabase
      .from("match_cards")
      .select("id, kickoff_at")
      .not("kickoff_at", "is", null)
      .order("kickoff_at", { ascending: true })
      .limit(1);
    const openingMatchId = allMatches?.[0]?.id ?? null;

    // Obtener el team_id de España
    const { data: spainTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("canonical_name", "España")
      .maybeSingle();
    const spainTeamId = spainTeam?.id ?? null;

    const knockoutPhases = KNOCKOUT_ROUND_ORDER as readonly string[];

    // Detectar si cada partido tiene multiplicador x2
    const mapped = matches.map((m) => {
      const isGroupStage = !knockoutPhases.includes(m.phase ?? "");
      const hasMultiplier =
        m.id === openingMatchId ||
        m.phase === "Semifinales" ||
        m.phase === "Final" ||
        (isGroupStage && m.excel_match_key && /^[A-L]3/.test(m.excel_match_key)) ||
        (isGroupStage && spainTeamId != null &&
          (m.home_team_id === spainTeamId || m.away_team_id === spainTeamId));

      return {
        id: String(m.id),
        home_team: m.home_team_name ?? "Por decidir",
        away_team: m.away_team_name ?? "Por decidir",
        kickoff_at: m.kickoff_at ?? "",
        stage: m.phase ?? undefined,
        group_code: m.group_code ?? undefined,
        hasMultiplier: Boolean(hasMultiplier),
      };
    });

    return <UpcomingMatchesWidget matches={mapped} />;
  } catch {
    // Si falla silenciosamente, no rompemos la app
    return null;
  }
}
