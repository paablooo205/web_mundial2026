"use client";

import { useState } from "react";
import { PlayerBetsViewer } from "./player-bets-viewer";
import { ClubStatisticsViewer } from "./club-statistics-viewer";
import type { StandingRow } from "@/lib/types";

type Match = {
  id: number;
  phase: string;
  home_team_name: string | null;
  away_team_name: string | null;
  kickoff_at: string | null;
};

type Team = {
  id: number;
  canonical_name: string;
  group_code: string | null;
};

type Player = {
  id: number;
  display_name: string;
};

type PlayerPrediction = {
  player_id: number;
  match_id: number;
  predicted_home_goals: number | null;
  predicted_away_goals: number | null;
  predicted_winner_team_id: number | null;
};

type PlayerSpecialPrediction = {
  player_id: number;
  champion_team_id: number | null;
  top_scorer_name: string | null;
  golden_ball_name: string | null;
};

type Props = {
  matches: Match[];
  teams: Team[];
  players: Player[];
  predictions: PlayerPrediction[];
  specialPredictions: PlayerSpecialPrediction[];
  standings: StandingRow[];
};

export function ClubSelectoClientWrapper({
  matches,
  teams,
  players,
  predictions,
  specialPredictions,
  standings
}: Props) {
  const [activeTab, setActiveTab] = useState<"estadisticas" | "visor">("estadisticas");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Controles superiores para cambiar entre Estadísticas y Visor */}
      <div className="tabs-container admin-player-tabs" style={{ marginBottom: "0" }}>
        <button
          type="button"
          className={`tab-button ${activeTab === "estadisticas" ? "active" : ""}`}
          onClick={() => setActiveTab("estadisticas")}
        >
          Estadísticas de la Comunidad
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "visor" ? "active" : ""}`}
          onClick={() => setActiveTab("visor")}
        >
          Visor por Jugador
        </button>
      </div>

      {activeTab === "estadisticas" && (
        <ClubStatisticsViewer 
          matches={matches}
          players={players}
          teams={teams}
          predictions={predictions}
          specialPredictions={specialPredictions}
          standings={standings}
        />
      )}

      {activeTab === "visor" && (
        <PlayerBetsViewer
          matches={matches}
          teams={teams}
          players={players}
          predictions={predictions}
          specialPredictions={specialPredictions}
        />
      )}
    </div>
  );
}
