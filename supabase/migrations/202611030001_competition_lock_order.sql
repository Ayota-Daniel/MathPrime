-- Ordre commun aux opérations d'un joueur : joueur, run, puis quota.
-- Migration additive : l'historique déjà appliqué reste inchangé.
create or replace function public.competition_begin(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.competition_runs; s integer;
begin
  insert into public.competition_players(user_id) values (p_user) on conflict do nothing;
  select streak into s from public.competition_players where user_id = p_user for update;
  insert into public.competition_runs(user_id, day, streak) values (p_user, (now() at time zone 'UTC')::date, s)
  on conflict (user_id, day) do nothing;
  select * into r from public.competition_runs
    where user_id = p_user and day = (now() at time zone 'UTC')::date for update;
  perform public.competition_rate(p_user);
  return public.competition_read(p_user, r.id);
end $$;
