/** Fórmulas de emparejamiento del cuadro (ids de partido 73–104). */
export const KO_FORMULAS: Record<number, { home: string; away: string }> = {
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
  104: { home: "W101", away: "W102" }
};

export const groupCodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export const KNOCKOUT_ROUND_ORDER = [
  "Dieciseisavos de final",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "3º y 4º puesto",
  "Final"
] as const;

export type BracketTeam = {
  id: number;
  canonical_name: string;
  group_code: string | null;
};

export type BracketMatch = {
  id: number;
  phase: string;
  home_team_name: string | null;
  away_team_name: string | null;
};

export type BracketScore = {
  home: number | "";
  away: number | "";
};

export function isBracketSlotResolved(name: string) {
  return (
    Boolean(name) &&
    !name.startsWith("Ganador") &&
    !name.startsWith("Perdedor") &&
    name !== "Por decidir" &&
    !/^[0-9]º/.test(name) &&
    !name.startsWith("3º mejor") &&
    !name.startsWith("3º de")
  );
}

type ResolveParams = {
  groupCodes: string[];
  groupStageMatches: BracketMatch[];
  teams: BracketTeam[];
  scores: Record<number, BracketScore>;
  getWinnerTeamId: (
    matchId: number,
    homeName: string,
    awayName: string,
    score: BracketScore
  ) => number | null;
};

export function resolveKnockoutBracket({
  groupCodes,
  groupStageMatches,
  teams,
  scores,
  getWinnerTeamId
}: ResolveParams) {
  const isGroupFullyScored = (code: string) => {
    const groupTeamNames = new Set(
      teams.filter((t) => t.group_code === code).map((t) => t.canonical_name)
    );
    const groupMatches = groupStageMatches.filter(
      (m) => m.home_team_name && m.away_team_name && groupTeamNames.has(m.home_team_name)
    );
    if (groupMatches.length === 0) return false;
    return groupMatches.every((m) => {
      const score = scores[m.id];
      return score && score.home !== "" && score.away !== "";
    });
  };

  const computeStandings = (groupCode: string) => {
    const groupTeams = teams.filter((t) => t.group_code === groupCode);
    const stats: Record<string, { team: BracketTeam; pts: number; gd: number; gs: number }> = {};
    groupTeams.forEach((t) => {
      stats[t.canonical_name] = { team: t, pts: 0, gd: 0, gs: 0 };
    });

    const groupTeamNames = new Set(groupTeams.map((t) => t.canonical_name));
    groupStageMatches.forEach((m) => {
      if (!m.home_team_name || !m.away_team_name) return;
      if (!groupTeamNames.has(m.home_team_name) || !groupTeamNames.has(m.away_team_name)) return;

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

      if (hg > ag) hs.pts += 3;
      else if (hg < ag) as_.pts += 3;
      else {
        hs.pts += 1;
        as_.pts += 1;
      }
    });

    return Object.values(stats).sort((a, b) => {
      return (
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gs - a.gs ||
        a.team.canonical_name.localeCompare(b.team.canonical_name)
      );
    });
  };

  const allStandings: Record<string, ReturnType<typeof computeStandings>> = {};
  groupCodes.forEach((code) => {
    allStandings[code] = computeStandings(code);
  });

  const allThirds = groupCodes
    .map((code) => {
      const entry = allStandings[code][2];
      return entry ? { ...entry, groupCode: code } : null;
    })
    .filter(Boolean) as Array<{ team: BracketTeam; pts: number; gd: number; gs: number; groupCode: string }>;

  allThirds.sort((a, b) => {
    return (
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gs - a.gs ||
      a.team.canonical_name.localeCompare(b.team.canonical_name)
    );
  });

  const assignedThirds = new Set<string>();
  const resolved: Record<number, { home: string; away: string }> = {};

  const resolveFormula = (formula: string): string => {
    if (!formula) return "Por decidir";

    const matchRef = /^([WL])(\d+)$/.exec(formula);
    if (matchRef) {
      const type = matchRef[1];
      const refId = Number(matchRef[2]);
      const refTeams = resolved[refId];

      if (!refTeams) return type === "W" ? `Ganador M${refId}` : `Perdedor M${refId}`;

      const refHomePending = !isBracketSlotResolved(refTeams.home);
      const refAwayPending = !isBracketSlotResolved(refTeams.away);
      if (refHomePending || refAwayPending) {
        return type === "W" ? `Ganador M${refId}` : `Perdedor M${refId}`;
      }

      const score = scores[refId];
      if (!score || score.home === "" || score.away === "") {
        return type === "W" ? `Ganador M${refId}` : `Perdedor M${refId}`;
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
        const winnerId = getWinnerTeamId(refId, refTeams.home, refTeams.away, score);
        const winnerTeam = winnerId ? teams.find((t) => t.id === winnerId) : null;
        if (winnerTeam?.canonical_name === refTeams.home) {
          winnerName = refTeams.home;
          loserName = refTeams.away;
        } else if (winnerTeam?.canonical_name === refTeams.away) {
          winnerName = refTeams.away;
          loserName = refTeams.home;
        } else {
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
      if (!isGroupFullyScored(code)) return `${groupPos[1]}º Grupo ${code}`;
      return allStandings[code]?.[rank]?.team.canonical_name ?? `${groupPos[1]}º Grupo ${code}`;
    }

    const thirdRef = /^3([A-L]+)$/.exec(formula);
    if (thirdRef) {
      const allowed = thirdRef[1];
      if (!allowed.split("").every((code) => isGroupFullyScored(code))) {
        return `3º de ${allowed}`;
      }
      const match = allThirds.find(
        (t) => allowed.includes(t.groupCode) && !assignedThirds.has(t.team.canonical_name)
      );
      if (match) {
        assignedThirds.add(match.team.canonical_name);
        return match.team.canonical_name;
      }
      return `3º mejor (${allowed})`;
    }

    return formula;
  };

  for (let id = 73; id <= 104; id++) {
    const formula = KO_FORMULAS[id];
    if (formula) {
      resolved[id] = {
        home: resolveFormula(formula.home),
        away: resolveFormula(formula.away)
      };
    }
  }

  return { resolved, standings: allStandings };
}
