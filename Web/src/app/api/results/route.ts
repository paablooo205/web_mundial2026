import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { recalculateStandings } from "@/lib/standings";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      matchId,
      homeGoals,
      awayGoals,
      status,
      winnerTeamId,
      homeTeamId,
      awayTeamId,
      championTeamId,
      topScorerName,
      goldenBallName,
      type
    } = body;

    const supabase = createServiceClient();

    if (type === "special_awards") {
      // Update real tournament awards
      const { error } = await supabase.from("tournament_awards").upsert({
        id: 1,
        champion_team_id: championTeamId === "" ? null : championTeamId,
        top_scorer_name: topScorerName || null,
        golden_ball_name: goldenBallName || null,
        source: "admin-manual",
        updated_at: new Date().toISOString()
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      // Update match result
      if (homeGoals === undefined || awayGoals === undefined || !matchId) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
      }

      // Si los goles están vacíos, el partido vuelve a "scheduled" (sin puntuar)
      const hasScore = homeGoals !== "" && awayGoals !== "";
      const resolvedStatus = hasScore ? "finished" : "scheduled";

      const { error } = await supabase.from("match_results").upsert({
        match_id: Number(matchId),
        home_goals: hasScore ? Number(homeGoals) : null,
        away_goals: hasScore ? Number(awayGoals) : null,
        status: resolvedStatus,
        winner_team_id: hasScore && winnerTeamId ? Number(winnerTeamId) : null,
        source: "admin-manual",
        updated_at: new Date().toISOString()
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (homeTeamId && awayTeamId) {
        const { error: matchTeamsError } = await supabase
          .from("matches")
          .update({
            home_team_id: Number(homeTeamId),
            away_team_id: Number(awayTeamId)
          })
          .eq("id", Number(matchId));

        if (matchTeamsError) {
          return NextResponse.json({ error: matchTeamsError.message }, { status: 400 });
        }
      }
    }

    // Always recalculate standings after saving any real result
    const newStandings = await recalculateStandings();

    revalidatePath("/", "layout");

    return NextResponse.json({ ok: true, standingsCount: newStandings.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
