import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/kickoff
 * Syncs official kickoff times from the FIFA REST API into match_cards.kickoff_at
 * Body: { secret: string, dryRun?: boolean, force?: boolean }
 * - force=true: also update cards that already have kickoff_at (to fix midnight-only dates)
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { secret, dryRun = false, force = false } = body as {
    secret?: string;
    dryRun?: boolean;
    force?: boolean;
  };

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Fetch official FIFA schedule ────────────────────────────────────────
  // idCompetition=17 (FIFA World Cup™), idSeason=285023 (2026)
  const fifaUrl =
    "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200&language=en";

  let fifaMatches: any[] = [];
  try {
    const res = await fetch(fifaUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/json" }
    });
    if (res.ok) {
      const raw = await res.json();
      fifaMatches = Array.isArray(raw?.Results) ? raw.Results : [];
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `FIFA API fetch failed: ${err.message}` },
      { status: 502 }
    );
  }

  if (fifaMatches.length === 0) {
    return NextResponse.json({ error: "No matches returned by FIFA API" }, { status: 502 });
  }

  const supabase = createServiceClient();

  // ── 2. Load all match_cards from Supabase ──────────────────────────────────
  // match_cards is a VIEW – we must read team names from there but write to matches
  const { data: matchCards, error: fetchErr } = await supabase
    .from("match_cards")
    .select("id, home_team_name, away_team_name, kickoff_at, phase")
    .order("id", { ascending: true });

  if (fetchErr || !matchCards) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Could not load match_cards" },
      { status: 500 }
    );
  }

  // ── 3. Build a lookup: FIFA team names → canonical spanish name variants ───
  // The FIFA API returns English names. Our DB has Spanish names.
  // We use a translation map for names that differ significantly,
  // and fall back to fuzzy token matching for others.
  const ES_TO_EN: Record<string, string> = {
    "méxico": "mexico",
    "corea del sur": "korea republic",
    "república checa": "czechia",
    "estados unidos": "usa",
    "catar": "qatar",
    "marruecos": "morocco",
    "suiza": "switzerland",
    "haití": "haiti",
    "escocia": "scotland",
    "alemania": "germany",
    "curazao": "curacao",
    "países bajos": "netherlands",
    "holanda": "netherlands",
    "bélgica": "belgium",
    "egipto": "egypt",
    "irán": "ir iran",
    "nueva zelanda": "new zealand",
    "francia": "france",
    "senegal": "senegal",
    "irak": "iraq",
    "noruega": "norway",
    "argentina": "argentina",
    "argelia": "algeria",
    "austria": "austria",
    "jordania": "jordan",
    "portugal": "portugal",
    "congo dr": "congo dr",
    "república democrática del congo": "congo dr",
    "uzbekistán": "uzbekistan",
    "colombia": "colombia",
    "ghana": "ghana",
    "panamá": "panama",
    "sudáfrica": "south africa",
    "bosnia y herzegovina": "bosnia and herzegovina",
    "canadá": "canada",
    "arabia saudita": "saudi arabia",
    "arabia saudí": "saudi arabia",
    "uruguay": "uruguay",
    "cabo verde": "cabo verde",
    "brasil": "brazil",
    "paraguay": "paraguay",
    "australia": "australia",
    "turquía": "turkiye",
    "túnez": "tunisia",
    "suecia": "sweden",
    "japón": "japan",
    "españa": "spain",
    "eslovenia": "slovenia",
    "irlanda del norte": "northern ireland",
    "gales": "wales",
    "rumania": "romania",
    "croacia": "croatia",
    "serbia": "serbia",
    "nigeria": "nigeria",
    "camerún": "cameroon",
    "ecuador": "ecuador",
    "costa rica": "costa rica",
    "peru": "peru",
    "perú": "peru",
    "chile": "chile",
    "venezuela": "venezuela",
    "bolivia": "bolivia",
    "indonesia": "indonesia",
    "tailandia": "thailand",
    "vietnam": "vietnam",
    "china": "china pr",
    "india": "india"
  };

  function normalize(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9 ]/g, " ")
      .trim();
  }

  function teamsMatch(fifaName: string, dbName: string): boolean {
    const f = normalize(fifaName);
    const d = normalize(dbName);
    if (f === d) return true;

    // Check via translation map
    const translated = ES_TO_EN[d] ?? ES_TO_EN[dbName.toLowerCase()];
    if (translated && normalize(translated) === f) return true;

    // Check if any word from FIFA name appears in db name and vice versa
    const fWords = f.split(" ").filter((w) => w.length > 2);
    const dWords = d.split(" ").filter((w) => w.length > 2);
    return fWords.some((fw) => dWords.some((dw) => fw === dw || fw.startsWith(dw) || dw.startsWith(fw)));
  }

  // ── 4. Match each card to a FIFA match ─────────────────────────────────────
  const updates: { id: number; kickoff_at: string; fifaMatch: string }[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const card of matchCards) {
    // Skip knockout cards with no teams yet
    if (!card.home_team_name || !card.away_team_name) {
      skipped.push({ id: card.id, reason: "no teams" });
      continue;
    }

    // Skip if already has a real kickoff time (not midnight) unless force=true
    if (!force && card.kickoff_at) {
      const d = new Date(card.kickoff_at);
      const isRealTime =
        d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0;
      if (isRealTime) {
        skipped.push({ id: card.id, reason: "already has real time" });
        continue;
      }
    }

    // Find the FIFA match
    const fifaMatch = fifaMatches.find((m: any) => {
      const fifaHome: string =
        m.Home?.TeamName?.find((t: any) => t.Locale === "en-GB")?.Description ??
        m.Home?.ShortClubName ?? "";
      const fifaAway: string =
        m.Away?.TeamName?.find((t: any) => t.Locale === "en-GB")?.Description ??
        m.Away?.ShortClubName ?? "";
      return teamsMatch(fifaHome, card.home_team_name!) &&
             teamsMatch(fifaAway, card.away_team_name!);
    });

    if (!fifaMatch?.Date) {
      skipped.push({ id: card.id, reason: `no FIFA match found for ${card.home_team_name} vs ${card.away_team_name}` });
      continue;
    }

    updates.push({
      id: card.id,
      kickoff_at: fifaMatch.Date, // already ISO UTC e.g. "2026-06-11T19:00:00Z"
      fifaMatch: `${
        fifaMatch.Home?.ShortClubName
      } vs ${fifaMatch.Away?.ShortClubName} @ ${fifaMatch.Date}`
    });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      fifaMatchesFound: fifaMatches.length,
      totalCards: matchCards.length,
      wouldUpdate: updates.length,
      skipped: skipped.length,
      preview: updates.slice(0, 20),
      skippedPreview: skipped.slice(0, 10)
    });
  }

  // ── 5. Apply updates ───────────────────────────────────────────────────────
  let updated = 0;
  const errors: string[] = [];
  for (const u of updates) {
    // match_cards is a VIEW — we must update the underlying `matches` table
    const { error } = await supabase
      .from("matches")
      .update({ kickoff_at: u.kickoff_at })
      .eq("id", u.id);
    if (!error) {
      updated++;
    } else {
      errors.push(`id=${u.id}: ${error.message}`);
    }
  }

  if (updated > 0) {
    revalidatePath("/", "layout");
  }

  return NextResponse.json({
    ok: true,
    fifaMatchesFound: fifaMatches.length,
    totalCards: matchCards.length,
    updated,
    skipped: skipped.length,
    errors
  });
}


/**
 * GET /api/admin/kickoff
 * Returns current kickoff coverage stats (how many cards have kickoff_at set)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("match_cards")
    .select("id, home_team_name, away_team_name, kickoff_at, phase")
    .order("kickoff_at", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withKickoff = (data ?? []).filter(m => m.kickoff_at);
  const withoutKickoff = (data ?? []).filter(m => !m.kickoff_at);

  return NextResponse.json({
    total: (data ?? []).length,
    withKickoff: withKickoff.length,
    withoutKickoff: withoutKickoff.length,
    sample_filled: withKickoff.map(m => ({
      id: m.id,
      match: `${m.home_team_name} vs ${m.away_team_name}`,
      kickoff_at: m.kickoff_at,
      phase: m.phase
    })),
    missing: withoutKickoff.map(m => ({
      id: m.id,
      match: `${m.home_team_name} vs ${m.away_team_name}`,
      phase: m.phase
    }))
  });
}
