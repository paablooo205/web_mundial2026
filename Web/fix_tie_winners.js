const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: matches } = await supabase.from('matches').select('*');
  const { data: predictions } = await supabase.from('predictions').select('*');

  const matchMap = {};
  matches.forEach(m => matchMap[m.id] = m);

  const updates = [];

  for (const p of predictions) {
    const m = matchMap[p.match_id];
    if (!m) continue;

    // We only care about knockout stages (group_code is null)
    if (m.group_code === null) {
      // If the prediction has goals filled, but the winner is null
      if (p.predicted_home_goals !== null && p.predicted_away_goals !== null) {
        if (p.predicted_winner_team_id === null) {
          
          let newWinner = null;
          if (p.predicted_home_goals > p.predicted_away_goals) {
            newWinner = p.predicted_home_team_id;
          } else if (p.predicted_away_goals > p.predicted_home_goals) {
            newWinner = p.predicted_away_team_id;
          } else {
            // It's a tie, but winner is null. Default to home team.
            newWinner = p.predicted_home_team_id;
          }

          if (newWinner) {
            updates.push({
              id: p.id,
              predicted_winner_team_id: newWinner
            });
          }
        }
      }
    }
  }

  console.log(`Found ${updates.length} knockout matches with missing winner_team_id.`);
  let success = 0;
  for (const u of updates) {
    const { id, ...data } = u;
    const { error } = await supabase.from('predictions').update(data).eq('id', id);
    if (!error) success++;
    else console.error('Error updating', id, error);
  }
  console.log(`Updated ${success}/${updates.length}`);
}

main().catch(console.error);
