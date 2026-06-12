import { NextResponse } from "next/server";
import { fetchLiveMatches } from "@/lib/apify";
import { syncLiveResults } from "@/lib/results";
import { recalculateStandings } from "@/lib/standings";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSync(request);
}

export async function GET(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const secret =
    bearerSecret ?? request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const liveMatches = await fetchLiveMatches();
    const sync = await syncLiveResults(liveMatches);
    await recalculateStandings();

    revalidatePath("/", "layout");
    revalidatePath("/clasificacion");
    revalidatePath("/admin");
    revalidatePath("/resultados");
    revalidatePath("/resultado-final");

    return NextResponse.json({ ok: true, matchesSeen: liveMatches.length, updated: sync.updated, errors: sync.errors });
  } catch (error: any) {
    console.error("[Cron Sync Error]:", error);
    return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
}
