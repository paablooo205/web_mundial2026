-- Cruce del cuadro por jugador (eliminatorias con doble puntuación)
alter table predictions
  add column if not exists predicted_home_team_id bigint references teams(id),
  add column if not exists predicted_away_team_id bigint references teams(id);

alter table standings
  add column if not exists advancement_hits integer not null default 0;

drop view if exists public_standings;

create view public_standings as
select
  s.player_id,
  p.display_name,
  s.total_points,
  s.exact_scores,
  s.correct_signs,
  s.goal_difference_hits,
  s.advancement_hits,
  s.position
from standings s
join players p on p.id = s.player_id
order by s.position asc nulls last, s.total_points desc;
