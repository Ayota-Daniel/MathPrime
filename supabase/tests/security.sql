-- PostgreSQL réel, sans projet externe. Tout ce scénario est annulé en fin de test.
begin;
-- Schéma permissif documenté avant M3.3 : la migration doit neutraliser ses grants.
create table public.scores(id text, mode text, pseudo text, score integer);
alter table public.scores enable row level security;
create policy insert_anon on public.scores for insert with check (score >= 0 and score < 100000);
create policy update_anon on public.scores for update using (true) with check (score >= 0 and score < 100000);
grant all on public.scores to public, anon, authenticated;
\ir ../migrations/202611020002_lock_legacy.sql
do $$ begin
  if has_table_privilege('anon', 'public.scores', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.scores', 'INSERT,UPDATE,DELETE') then raise exception 'legacy writes remain allowed'; end if;
end $$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');

do $$
declare t text; r jsonb; result jsonb; again jsonb; run_id uuid;
begin
  foreach t in array array['competition_players','competition_runs','competition_scores','competition_events','competition_limits'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception 'RLS inactive: %', t; end if;
    if has_table_privilege('authenticated', 'public.' || t, 'INSERT,UPDATE,DELETE') or has_table_privilege('anon', 'public.' || t, 'INSERT,UPDATE,DELETE') then raise exception 'client write grant: %', t; end if;
  end loop;
  foreach t in array array[
    'competition_begin(uuid)', 'competition_rate(uuid)', 'competition_read(uuid,uuid)',
    'competition_replay(uuid,uuid,text)', 'competition_commit(uuid,uuid,uuid,integer,text,text,text,jsonb)'
  ] loop
    if has_function_privilege('authenticated', 'public.' || t, 'EXECUTE')
      or has_function_privilege('anon', 'public.' || t, 'EXECUTE') then raise exception 'client RPC grant: %', t; end if;
    if not has_function_privilege('service_role', 'public.' || t, 'EXECUTE') then raise exception 'server RPC grant missing: %', t; end if;
  end loop;
  if not has_function_privilege('anon', 'public.competition_top()', 'EXECUTE') then raise exception 'public read unavailable'; end if;
  r := public.competition_begin('00000000-0000-4000-8000-000000000001');
  run_id := (r->>'id')::uuid;
  if public.competition_begin('00000000-0000-4000-8000-000000000001')->>'id' <> r->>'id' then raise exception 'start duplicated the daily run'; end if;
  begin
    perform public.competition_commit('00000000-0000-4000-8000-000000000001', run_id,
      '00000000-0000-4000-8000-000000000005', 99, 'stale-hash', 'answer', 'stale',
      '{"challenge":{"hints":0,"streak":1},"outcome":{"ok":true,"gained":10}}');
    raise exception 'stale version accepted';
  exception when raise_exception then if sqlerrm <> 'stale_version' then raise; end if; end;
  if (select version from public.competition_runs where id = (r->>'id')::uuid) <> 0
    or exists(select 1 from public.competition_events e where e.run_id = (r->>'id')::uuid) then raise exception 'stale event changed state'; end if;
  insert into public.competition_scores(user_id, mode, pseudo, score) values ('00000000-0000-4000-8000-000000000001', 'daily', 'best', 900);
  result := public.competition_commit('00000000-0000-4000-8000-000000000001', run_id,
    '00000000-0000-4000-8000-000000000002', 0, 'hash-one', 'answer', 'lower',
    '{"challenge":{"hints":0,"streak":1},"outcome":{"ok":true,"gained":10}}');
  if (result->>'confirmedBest')::integer <> 900 then raise exception 'best score overwritten'; end if;
  again := public.competition_commit('00000000-0000-4000-8000-000000000001', run_id,
    '00000000-0000-4000-8000-000000000002', 0, 'hash-one', 'answer', 'lower',
    '{"challenge":{"hints":0,"streak":1},"outcome":{"ok":true,"gained":10}}');
  if result <> again then raise exception 'replay changed response'; end if;
  if (select count(*) from public.competition_events e where e.run_id = (r->>'id')::uuid) <> 1 then raise exception 'duplicate event'; end if;
  begin
    perform public.competition_replay('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'different-hash');
    raise exception 'changed replay accepted';
  exception when raise_exception then if sqlerrm <> 'event_conflict' then raise; end if; end;
  begin
    perform public.competition_commit('00000000-0000-4000-8000-000000000001', run_id,
      '00000000-0000-4000-8000-000000000003', 1, 'new-hash', 'answer', 'lower',
      '{"challenge":{"hints":0,"streak":2},"outcome":{"ok":true,"gained":10}}');
    raise exception 'second daily reward accepted';
  exception when raise_exception then if sqlerrm <> 'daily_done' then raise; end if; end;
end $$;

insert into auth.users(id) values ('00000000-0000-4000-8000-000000000004');
do $$ begin
  for i in 1..60 loop perform public.competition_begin('00000000-0000-4000-8000-000000000004'); end loop;
  begin
    perform public.competition_begin('00000000-0000-4000-8000-000000000004');
    raise exception 'rate limit ignored';
  exception when raise_exception then if sqlerrm <> 'rate_limited' then raise; end if; end;
  if (select calls from public.competition_limits where user_id = '00000000-0000-4000-8000-000000000004') <> 60 then raise exception 'quota changed after rejection'; end if;
  if (select count(*) from public.competition_runs where user_id = '00000000-0000-4000-8000-000000000004') <> 1 then raise exception 'quota rejection duplicated run'; end if;
end $$;

-- Même avec un grant accidentel, aucune policy RLS ne permet l'insertion cliente.
grant insert on public.competition_scores to authenticated;
set local role authenticated;
do $$ begin
  begin
    insert into public.competition_scores(user_id,mode,pseudo,score) values ('00000000-0000-4000-8000-000000000001','daily','forged',1);
    raise exception 'RLS write allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
