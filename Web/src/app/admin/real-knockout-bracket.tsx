"use client";

import { isBracketSlotResolved } from "@/lib/knockout-bracket";

type Team = { id: number; canonical_name: string };

type ScoreState = {
  home: number | "";
  away: number | "";
  winner?: number | "";
};

type Props = {
  resolved: Record<number, { home: string; away: string }>;
  scores: Record<number, ScoreState>;
  teams: Team[];
  getWinnerTeamId: (matchId: number, homeName: string, awayName: string) => number | null;
};

function MatchCard({
  id,
  resolved,
  scores,
  teams,
  getWinnerTeamId
}: {
  id: number;
  resolved: Props["resolved"];
  scores: Props["scores"];
  teams: Team[];
  getWinnerTeamId: Props["getWinnerTeamId"];
}) {
  const resolvedHome = resolved[id]?.home ?? "Por decidir";
  const resolvedAway = resolved[id]?.away ?? "Por decidir";
  const score = scores[id];
  const homeGoals = score?.home !== "" && score?.home !== undefined ? score.home : "–";
  const awayGoals = score?.away !== "" && score?.away !== undefined ? score.away : "–";
  const hasScore = score && score.home !== "" && score.away !== "";
  const winnerId = hasScore ? getWinnerTeamId(id, resolvedHome, resolvedAway) : null;
  const isHomeWinner = winnerId && teams.find((t) => t.id === winnerId)?.canonical_name === resolvedHome;
  const isAwayWinner = winnerId && teams.find((t) => t.id === winnerId)?.canonical_name === resolvedAway;
  const ready = isBracketSlotResolved(resolvedHome) && isBracketSlotResolved(resolvedAway);

  return (
    <div className={`bracket-card ${ready ? "" : "bracket-card--pending"}`}>
      <div className="bracket-card-header">M{id}</div>
      <div className="bracket-card-row">
        <span
          className={isHomeWinner ? "bracket-team bracket-team--winner" : "bracket-team"}
          title={resolvedHome}
        >
          {resolvedHome}
        </span>
        <strong className="bracket-score">{homeGoals}</strong>
      </div>
      <div className="bracket-card-row">
        <span
          className={isAwayWinner ? "bracket-team bracket-team--winner" : "bracket-team"}
          title={resolvedAway}
        >
          {resolvedAway}
        </span>
        <strong className="bracket-score">{awayGoals}</strong>
      </div>
    </div>
  );
}

export function RealKnockoutBracket({ resolved, scores, teams, getWinnerTeamId }: Props) {
  const card = (id: number) => (
    <MatchCard
      key={id}
      id={id}
      resolved={resolved}
      scores={scores}
      teams={teams}
      getWinnerTeamId={getWinnerTeamId}
    />
  );

  const championName = (() => {
    const id = 104;
    const resHome = resolved[id]?.home;
    const resAway = resolved[id]?.away;
    const score = scores[id];
    if (!isBracketSlotResolved(resHome) || !isBracketSlotResolved(resAway) || !score || score.home === "") {
      return "Por decidir";
    }
    const hg = Number(score.home);
    const ag = Number(score.away);
    if (hg > ag) return resHome;
    if (hg < ag) return resAway;
    const winnerId = getWinnerTeamId(id, resHome, resAway);
    return teams.find((t) => t.id === winnerId)?.canonical_name ?? resHome;
  })();

  return (
    <div className="bracket-grid bracket-grid--compact">
      <div className="bracket-side">
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/16 Izq.</h4>
          {[73, 75, 74, 77, 76, 78, 79, 80].map(card)}
        </div>
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/8 Izq.</h4>
          {[89, 90, 91, 92].map(card)}
        </div>
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/4 Izq.</h4>
          {[97, 99].map(card)}
        </div>
      </div>

      <div className="bracket-center-column">
        <div className="bracket-center-section">
          <h4 className="bracket-col-title">Semifinales</h4>
          <div className="bracket-center-stack">{[101, 102].map(card)}</div>
        </div>
        <div className="bracket-center-section">
          <h4 className="bracket-col-title">Campeón</h4>
          <div className="champion-card champion-card--real">
            <div className="trophy-glow">🏆</div>
            <strong
              className={
                isBracketSlotResolved(championName) ? "champion-name resolved" : "champion-name pending"
              }
            >
              {championName}
            </strong>
            <p className="champion-subtitle">Resultado real</p>
          </div>
        </div>
        <div className="bracket-center-section">
          <h4 className="bracket-col-title">Finales</h4>
          <div className="bracket-center-stack">
            {card(104)}
            {card(103)}
          </div>
        </div>
      </div>

      <div className="bracket-side">
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/4 Der.</h4>
          {[98, 100].map(card)}
        </div>
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/8 Der.</h4>
          {[93, 94, 95, 96].map(card)}
        </div>
        <div className="bracket-column">
          <h4 className="bracket-col-title">1/16 Der.</h4>
          {[83, 84, 81, 82, 86, 88, 85, 87].map(card)}
        </div>
      </div>
    </div>
  );
}
