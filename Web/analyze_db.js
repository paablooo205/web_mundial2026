const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local manually
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

const tables = [
  'players',
  'teams',
  'matches',
  'predictions',
  'special_predictions',
  'match_results',
  'tournament_awards',
  'standings',
  'apify_runs'
];

async function analyze() {
  const report = {};
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      continue;
    }
    
    const rowCount = data.length;
    const nullCounts = {};
    if (rowCount > 0) {
      const keys = Object.keys(data[0]);
      for (const key of keys) {
        nullCounts[key] = data.filter(row => row[key] === null || row[key] === undefined || row[key] === '').length;
      }
    }
    
    report[table] = {
      total_rows: rowCount,
      null_counts: nullCounts
    };
    
    if (table === 'predictions') {
      const missingWinners = data.filter(row => 
        row.predicted_home_goals !== null && 
        row.predicted_away_goals !== null && 
        row.predicted_winner_team_id === null
      );
      report[table].missing_logical_winners = missingWinners.length;
      
      const missingAdvanced = data.filter(row => 
        row.predicted_home_team_id === null || 
        row.predicted_away_team_id === null
      );
      report[table].missing_logical_advanced = missingAdvanced.length;
    }
    
    if (table === 'match_results') {
      const missingWinners = data.filter(row => 
        row.home_goals !== null && 
        row.away_goals !== null && 
        row.winner_team_id === null
      );
      report[table].missing_logical_winners = missingWinners.length;
    }
  }
  
  console.log(JSON.stringify(report, null, 2));
}

analyze();
