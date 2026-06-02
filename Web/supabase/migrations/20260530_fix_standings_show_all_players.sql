-- Fix public_standings view to show ALL players (even those with 0 points)
-- Previously used INNER JOIN so only players with a row in standings appeared.
-- Now uses LEFT JOIN from players so everyone is visible from day 1.

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
