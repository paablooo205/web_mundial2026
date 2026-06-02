-- Run in Supabase SQL Editor if standings already exists without goal_difference_hits
alter table standings
  add column if not exists goal_difference_hits integer not null default 0;

-- REPLACE cannot remove columns from an existing view; drop and recreate.
drop view if exists public_standings;

create view public_standings as
select
  s.player_id,
  p.display_name,
  s.total_points,
  s.exact_scores,
  s.correct_signs,
  s.goal_difference_hits,
  s.position
from standings s
join players p on p.id = s.player_id
order by s.position asc nulls last, s.total_points desc;
