const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const KO_FORMULAS = {
  73: { home: "2A", away: "2B" },
  74: { home: "1C", away: "2F" },
  75: { home: "1E", away: "3ABCDF" },
  76: { home: "1F", away: "2C" },
  77: { home: "2E", away: "2I" },
  78: { home: "1I", away: "3CDFGH" },
  79: { home: "1A", away: "3CEFHI" },
  80: { home: "1L", away: "3EHIJK" },
  81: { home: "1G", away: "3AEHIJ" },
  82: { home: "1D", away: "3BEFIJ" },
  83: { home: "1H", away: "2J" },
  84: { home: "2K", away: "2L" },
  85: { home: "1B", away: "3EFGIJ" },
  86: { home: "2D", away: "2G" },
  87: { home: "1J", away: "2H" },
  88: { home: "1K", away: "3DEIJL" },

  89: { home: "W73", away: "W75" },
  90: { home: "W74", away: "W77" },
  91: { home: "W76", away: "W78" },
  92: { home: "W79", away: "W80" },
  93: { home: "W83", away: "W84" },
  94: { home: "W81", away: "W82" },
  95: { home: "W86", away: "W88" },
  96: { home: "W85", away: "W87" },

  97: { home: "W89", away: "W90" },
  98: { home: "W93", away: "W94" },
  99: { home: "W91", away: "W92" },
  100: { home: "W95", away: "W96" },

  101: { home: "W97", away: "W98" },
  102: { home: "W99", away: "W100" },

  103: { home: "L101", away: "L102" },
  104: { home: "W101", away: "W102" },
};

const groupCodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

async function main() {
  const { data: teams } = await supabase.from('teams').select('*');
  const { data: matches } = await supabase.from('matches').select('*');
  const { data: players } = await supabase.from('players').select('*');
  const { data: predictions } = await supabase.from('predictions').select('*');

  // helper mappings
  const teamByName = {};
  teams.forEach(t => teamByName[t.canonical_name] = t);
  
  const matchMap = {};
  matches.forEach(m => {
    // resolve home_team_name for group stages
    if (m.home_team_id) m.home_team_name = teams.find(t=>t.id===m.home_team_id)?.canonical_name;
    if (m.away_team_id) m.away_team_name = teams.find(t=>t.id===m.away_team_id)?.canonical_name;
    matchMap[m.id] = m;
  });

  const updates = [];

  for (const player of players) {
    const playerPreds = predictions.filter(p => p.player_id === player.id);
    
    const scores = {};
    const penaltyWinners = {};
    playerPreds.forEach(p => {
      scores[p.match_id] = { 
        home: p.predicted_home_goals !== null ? p.predicted_home_goals : "", 
        away: p.predicted_away_goals !== null ? p.predicted_away_goals : "" 
      };
      if (p.predicted_winner_team_id) {
        penaltyWinners[p.match_id] = p.predicted_winner_team_id;
      }
    });

    const isGroupFullyPredicted = (groupCode) => {
      const groupTeams = teams.filter((t) => t.group_code === groupCode).map((t) => t.canonical_name);
      const groupMatches = matches.filter((m) => m.phase === "Fase de Grupos" && m.home_team_name && groupTeams.includes(m.home_team_name));
      if (groupMatches.length === 0) return false;
      return groupMatches.every((m) => {
        const score = scores[m.id];
        return score && score.home !== "" && score.away !== "";
      });
    };

    const computeStandings = (groupCode) => {
      const groupTeams = teams.filter((t) => t.group_code === groupCode);
      const stats = {};
      groupTeams.forEach((t) => {
        stats[t.canonical_name] = { team: t, pts: 0, gd: 0, gs: 0 };
      });

      const groupMatchIds = new Set(groupTeams.map((t) => t.canonical_name));
      matches.forEach((m) => {
        if (m.phase !== "Fase de Grupos") return;
        const homeInGroup = m.home_team_name && groupMatchIds.has(m.home_team_name);
        const awayInGroup = m.away_team_name && groupMatchIds.has(m.away_team_name);
        if (!homeInGroup || !awayInGroup) return; 

        const score = scores[m.id];
        if (!score || score.home === "" || score.away === "") return;

        const hg = Number(score.home);
        const ag = Number(score.away);
        const hs = stats[m.home_team_name];
        const as_ = stats[m.away_team_name];
        if (!hs || !as_) return;

        hs.gs += hg;
        as_.gs += ag;
        hs.gd += hg - ag;
        as_.gd += ag - hg;

        if (hg > ag) { hs.pts += 3; }
        else if (hg < ag) { as_.pts += 3; }
        else { hs.pts += 1; as_.pts += 1; }
      });

      return Object.values(stats).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gs !== a.gs) return b.gs - a.gs;
        return a.team.canonical_name.localeCompare(b.team.canonical_name);
      });
    };

    const allStandings = {};
    groupCodes.forEach((code) => {
      allStandings[code] = computeStandings(code);
    });

    const allThirds = groupCodes.map((code) => {
      const standing = allStandings[code];
      const entry = standing[2]; 
      return entry ? { ...entry, groupCode: code } : null;
    }).filter(Boolean);

    allThirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gs !== a.gs) return b.gs - a.gs;
      return a.team.canonical_name.localeCompare(b.team.canonical_name);
    });

    const assignedThirds = new Set();
    const resolved = {};

    const resolveFormula = (formula) => {
      if (!formula) return "Por decidir";

      const matchRef = /^([WL])(\d+)$/.exec(formula);
      if (matchRef) {
        const type = matchRef[1];
        const refId = Number(matchRef[2]);
        const refTeams = resolved[refId];

        if (!refTeams) return null;
        if (refTeams.home === null || refTeams.away === null ||
            refTeams.home.startsWith("Ganador") || refTeams.away.startsWith("Ganador") ||
            refTeams.home === "Por decidir" || refTeams.away === "Por decidir" ||
            refTeams.home.includes("º Grupo") || refTeams.away.includes("º Grupo") ||
            refTeams.home.includes("3º de")) {
          return null;
        }

        const score = scores[refId];
        if (!score || score.home === "" || score.away === "") {
          return null;
        }

        const hg = Number(score.home);
        const ag = Number(score.away);
        
        let winnerName = "";
        let loserName = "";
        
        if (hg > ag) {
          winnerName = refTeams.home;
          loserName = refTeams.away;
        } else if (hg < ag) {
          winnerName = refTeams.away;
          loserName = refTeams.home;
        } else {
          const chosenWinnerId = penaltyWinners[refId];
          const homeTeamObj = teamByName[refTeams.home];
          const awayTeamObj = teamByName[refTeams.away];
          
          if (chosenWinnerId && homeTeamObj && chosenWinnerId === homeTeamObj.id) {
            winnerName = refTeams.home;
            loserName = refTeams.away;
          } else if (chosenWinnerId && awayTeamObj && chosenWinnerId === awayTeamObj.id) {
            winnerName = refTeams.away;
            loserName = refTeams.home;
          } else {
            // Default to home if undefined
            winnerName = refTeams.home;
            loserName = refTeams.away;
          }
        }

        return type === "W" ? winnerName : loserName;
      }

      const groupPos = /^(\d)([A-L])$/.exec(formula);
      if (groupPos) {
        const rank = Number(groupPos[1]) - 1;
        const code = groupPos[2];
        if (!isGroupFullyPredicted(code)) {
          return null;
        }
        const entry = allStandings[code]?.[rank];
        return entry?.team.canonical_name ?? null;
      }

      const thirdRef = /^3([A-L]+)$/.exec(formula);
      if (thirdRef) {
        const allowed = thirdRef[1];
        const allAllowedPredicted = allowed.split("").every((code) => isGroupFullyPredicted(code));
        if (!allAllowedPredicted) {
          return null;
        }
        const match = allThirds.find(
          (t) => allowed.includes(t.groupCode) && !assignedThirds.has(t.team.canonical_name)
        );
        if (match) {
          assignedThirds.add(match.team.canonical_name);
          return match.team.canonical_name;
        }
        return null;
      }

      return formula;
    };

    for (let id = 73; id <= 104; id++) {
      const formula = KO_FORMULAS[id];
      if (formula) {
        resolved[id] = {
          home: resolveFormula(formula.home),
          away: resolveFormula(formula.away),
        };
      }
    }

    // Now update predictions for matches 73 to 104
    for (let id = 73; id <= 104; id++) {
      const pHomeName = resolved[id]?.home;
      const pAwayName = resolved[id]?.away;
      
      const homeTeamObj = teamByName[pHomeName];
      const awayTeamObj = teamByName[pAwayName];
      
      if (homeTeamObj || awayTeamObj) {
        const pred = playerPreds.find(p => p.match_id === id);
        if (pred) {
          const updateData = {};
          if (homeTeamObj && pred.predicted_home_team_id !== homeTeamObj.id) updateData.predicted_home_team_id = homeTeamObj.id;
          if (awayTeamObj && pred.predicted_away_team_id !== awayTeamObj.id) updateData.predicted_away_team_id = awayTeamObj.id;
          
          if (Object.keys(updateData).length > 0) {
            updates.push({ id: pred.id, ...updateData });
          }
        }
      }
    }
  }

  console.log(`Found ${updates.length} knockout matches to backfill teams.`);
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
