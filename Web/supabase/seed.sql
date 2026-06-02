insert into players (display_name, access_code)
values
  ('Izan', 'JUGADOR1'),
  ('Dani', 'JUGADOR2'),
  ('Musta', 'JUGADOR3'),
  ('Txufo', 'JUGADOR4'),
  ('Pablo', 'JUGADOR5'),
  ('Chilo', 'JUGADOR6'),
  ('Nini', 'JUGADOR7')
on conflict (access_code) do nothing;

insert into teams (canonical_name, group_code)
values
  ('Mexico', 'A'),
  ('Sudafrica', 'A'),
  ('Corea del Sur', 'A'),
  ('Republica Checa', 'A'),
  ('Espana', null),
  ('Argentina', null),
  ('Brasil', null),
  ('Francia', null)
on conflict (canonical_name) do nothing;
