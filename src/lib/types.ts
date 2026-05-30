export type StandingRow = {
  player_id: number;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_signs: number;
  goal_difference_hits: number;
  advancement_hits: number;
  position: number | null;
};

export type FlashscoreLiveMatch = {
  home_team?: string;
  away_team?: string;
  home_score?: number;
  away_score?: number;
  status?: string;
  status_time?: string;
  start_time?: string;
  league?: string;
  source_url?: string;
  match_id?: string;
};
