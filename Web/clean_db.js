const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDB() {
  console.log("Fetching matches...");
  const { data: matches, error: matchError } = await supabase.from('matches').select('*');
  if (matchError) throw matchError;

  console.log("Fetching predictions...");
  const { data: predictions, error: predError } = await supabase.from('predictions').select('*');
  if (predError) throw predError;

  const matchMap = {};
  matches.forEach(m => {
    matchMap[m.id] = m;
  });

  let updates = [];

  for (const p of predictions) {
    const m = matchMap[p.match_id];
    if (!m) continue;

    let updatedP = { ...p };
    let changed = false;

    // Resolve home and away team IDs for the prediction
    // Group stages have it in matches, knockouts should have it in predictions
    let currentHome = p.predicted_home_team_id || m.home_team_id;
    let currentAway = p.predicted_away_team_id || m.away_team_id;

    // 1. Fill predicted_home_team_id and predicted_away_team_id if missing but we know it from match
    if (m.home_team_id && p.predicted_home_team_id === null) {
      updatedP.predicted_home_team_id = m.home_team_id;
      changed = true;
    }
    if (m.away_team_id && p.predicted_away_team_id === null) {
      updatedP.predicted_away_team_id = m.away_team_id;
      changed = true;
    }

    // 2. Fill predicted_winner_team_id based on goals if it is a strict win
    if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
      if (p.predicted_home_goals > p.predicted_away_goals) {
        if (currentHome && updatedP.predicted_winner_team_id !== currentHome) {
          updatedP.predicted_winner_team_id = currentHome;
          changed = true;
        }
      } else if (p.predicted_away_goals > p.predicted_home_goals) {
        if (currentAway && updatedP.predicted_winner_team_id !== currentAway) {
          updatedP.predicted_winner_team_id = currentAway;
          changed = true;
        }
      } else {
        // It's a tie
        // If it's group stage (m.phase === 'group' maybe? Or m.group_code is not null)
        // the winner should be null.
        if (m.group_code !== null) {
            if (updatedP.predicted_winner_team_id !== null) {
                // Should be null
                updatedP.predicted_winner_team_id = null;
                changed = true;
            }
        }
        // If knockout, it's a tie, winner must be explicitly chosen. We can't infer it from goals.
      }
    }

    if (changed) {
      updates.push(updatedP);
    }
  }

  console.log(`Found ${updates.length} predictions to fix.`);

  // Apply updates
  let successCount = 0;
  let failCount = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from('predictions')
      .update({
        predicted_home_team_id: u.predicted_home_team_id,
        predicted_away_team_id: u.predicted_away_team_id,
        predicted_winner_team_id: u.predicted_winner_team_id
      })
      .eq('id', u.id);
      
    if (error) {
      console.error(`Error updating prediction ${u.id}:`, error);
      failCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`Update complete. Success: ${successCount}, Fail: ${failCount}`);
}

cleanDB().catch(console.error);
