import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  try {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

    const { data: matches, error } = await supabase
      .from("match_cards")
      .select("id, home_team_name, away_team_name, kickoff_at, phase, group_code, home_team_id, away_team_id, excel_match_key")
      .gt("kickoff_at", threeHoursAgo)
      .order("kickoff_at", { ascending: true })
      .limit(6);
      
    if (error) throw error;
    console.log("Matches:", matches.length);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
