create table if not exists players (
  id bigserial primary key,
  display_name text not null,
  access_code text not null unique,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id bigserial primary key,
  canonical_name text not null unique,
  excel_name text,
  flashscore_name text,
  group_code text
);

create table if not exists matches (
  id bigserial primary key,
  excel_match_key text unique,
  flashscore_match_id text unique,
  phase text not null,
  group_code text,
  kickoff_at timestamptz,
  home_team_id bigint references teams(id),
  away_team_id bigint references teams(id),
  status text not null default 'scheduled'
);

create table if not exists predictions (
  id bigserial primary key,
  player_id bigint not null references players(id) on delete cascade,
  match_id bigint not null references matches(id) on delete cascade,
  predicted_home_goals integer,
  predicted_away_goals integer,
  predicted_winner_team_id bigint references teams(id),
  predicted_home_team_id bigint references teams(id),
  predicted_away_team_id bigint references teams(id),
  locked_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique(player_id, match_id)
);

create table if not exists special_predictions (
  player_id bigint primary key references players(id) on delete cascade,
  champion_team_id bigint references teams(id),
  top_scorer_name text,
  golden_ball_name text,
  locked_at timestamptz,
  submitted_at timestamptz not null default now()
);

create table if not exists match_results (
  match_id bigint primary key references matches(id) on delete cascade,
  home_goals integer,
  away_goals integer,
  winner_team_id bigint references teams(id),
  status text not null,
  source text not null,
  source_payload jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists tournament_awards (
  id integer primary key default 1 check (id = 1),
  champion_team_id bigint references teams(id),
  top_scorer_name text,
  golden_ball_name text,
  source text,
  updated_at timestamptz not null default now()
);

create table if not exists standings (
  player_id bigint primary key references players(id) on delete cascade,
  total_points numeric not null default 0,
  exact_scores integer not null default 0,
  correct_signs integer not null default 0,
  goal_difference_hits integer not null default 0,
  advancement_hits integer not null default 0,
  champion_hit boolean not null default false,
  top_scorer_hit boolean not null default false,
  golden_ball_hit boolean not null default false,
  tie_break_score numeric not null default 0,
  position integer,
  recalculated_at timestamptz not null default now()
);

create table if not exists apify_runs (
  id bigserial primary key,
  actor_id text not null,
  run_id text,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  input_json jsonb,
  output_json jsonb,
  error text
);

create or replace view match_cards as
select
  m.id,
  m.phase,
  m.group_code,
  m.kickoff_at,
  ht.canonical_name as home_team_name,
  at.canonical_name as away_team_name,
  m.status
from matches m
left join teams ht on ht.id = m.home_team_id
left join teams at on at.id = m.away_team_id;

drop view if exists public_standings;

create view public_standings as
select
  p.id as player_id,
  p.display_name,
  coalesce(s.total_points, 0)          as total_points,
  coalesce(s.exact_scores, 0)          as exact_scores,
  coalesce(s.correct_signs, 0)         as correct_signs,
  coalesce(s.goal_difference_hits, 0)  as goal_difference_hits,
  coalesce(s.advancement_hits, 0)      as advancement_hits,
  s.position
from players p
left join standings s on s.player_id = p.id
order by s.position asc nulls last, s.total_points desc;

alter table players enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table special_predictions enable row level security;
alter table match_results enable row level security;
alter table tournament_awards enable row level security;
alter table standings enable row level security;
alter table apify_runs enable row level security;

create policy "public can read standings view base players"
on players for select using (true);

create policy "public can read teams"
on teams for select using (true);

create policy "public can read matches"
on matches for select using (true);

create policy "public can read standings"
on standings for select using (true);
