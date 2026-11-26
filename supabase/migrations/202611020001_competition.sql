-- Aucune donnée de l'ancien classement n'est déclarée vérifiée.
create table public.competition_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0 check (streak >= 0)
);
create table public.competition_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  version integer not null default 0 check (version >= 0),
  hints integer not null default 0 check (hints >= 0),
  streak integer not null default 0 check (streak >= 0),
  rewarded boolean not null default false,
  unique (user_id, day)
);
create table public.competition_scores (
  public_id uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode = 'daily'),
  pseudo text not null check (char_length(pseudo) between 1 and 16),
  score integer not null check (score between 1 and 1000),
  at timestamptz not null default now(),
  primary key (user_id, mode)
);
create index competition_score_order on public.competition_scores(mode, score desc, at);
create table public.competition_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  run_id uuid not null references public.competition_runs(id) on delete cascade,
  fingerprint text not null,
  reply jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create table public.competition_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute timestamptz not null,
  calls integer not null
);

alter table public.competition_players enable row level security;
alter table public.competition_runs enable row level security;
alter table public.competition_scores enable row level security;
alter table public.competition_events enable row level security;
alter table public.competition_limits enable row level security;
revoke all on public.competition_players, public.competition_runs, public.competition_scores, public.competition_events, public.competition_limits from public, anon, authenticated;
grant all on public.competition_players, public.competition_runs, public.competition_scores, public.competition_events, public.competition_limits to service_role;


create function public.competition_rate(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.competition_limits(user_id, minute, calls) values (p_user, date_trunc('minute', now()), 1)
  on conflict (user_id) do update set
    minute = excluded.minute,
    calls = case when competition_limits.minute = excluded.minute then competition_limits.calls + 1 else 1 end
  returning calls into n;
  if n > 60 then raise exception 'rate_limited'; end if;
end $$;

create function public.competition_read(p_user uuid, p_run uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.competition_runs; best integer;
begin
  select * into r from public.competition_runs where id = p_run and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  select score into best from public.competition_scores where user_id = p_user and mode = 'daily';
  return to_jsonb(r) || jsonb_build_object('confirmed_best', coalesce(best, 0));
end $$;

create function public.competition_begin(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.competition_runs; s integer;
begin
  perform public.competition_rate(p_user);
  insert into public.competition_players(user_id) values (p_user) on conflict do nothing;
  select streak into s from public.competition_players where user_id = p_user for update;
  insert into public.competition_runs(user_id, day, streak) values (p_user, (now() at time zone 'UTC')::date, s)
  on conflict (user_id, day) do nothing;
  select * into r from public.competition_runs where user_id = p_user and day = (now() at time zone 'UTC')::date;
  return public.competition_read(p_user, r.id);
end $$;

create function public.competition_replay(p_user uuid, p_event uuid, p_fingerprint text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.competition_events;
begin
  select * into e from public.competition_events where user_id = p_user and event_id = p_event;
  if not found then return null; end if;
  if e.fingerprint <> p_fingerprint then raise exception 'event_conflict'; end if;
  return e.reply;
end $$;

create function public.competition_commit(p_user uuid, p_run uuid, p_event uuid, p_version integer, p_fingerprint text, p_action text, p_pseudo text, p_reply jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.competition_runs; previous jsonb; result jsonb; best integer;
  next_hints integer; next_streak integer; gained integer; won boolean;
begin
  -- Verrou du joueur avant celui du run : même ordre dans begin et commit.
  perform 1 from public.competition_players where user_id = p_user for update;
  select * into r from public.competition_runs where id = p_run and user_id = p_user for update;
  if not found then raise exception 'not_found'; end if;
  previous := public.competition_replay(p_user, p_event, p_fingerprint);
  if previous is not null then return previous; end if;
  perform public.competition_rate(p_user);
  if r.day <> (now() at time zone 'UTC')::date then raise exception 'expired'; end if;
  if r.rewarded then raise exception 'daily_done'; end if;
  if r.version <> p_version then raise exception 'stale_version'; end if;
  next_hints := (p_reply #>> '{challenge,hints}')::integer;
  next_streak := (p_reply #>> '{challenge,streak}')::integer;
  won := coalesce((p_reply #>> '{outcome,ok}')::boolean, false);
  gained := coalesce((p_reply #>> '{outcome,gained}')::integer, 0);
  if char_length(p_pseudo) not between 1 and 16 or gained not between 0 and 1000
    or next_streak is null or next_hints is null
    or (p_action = 'hint' and (next_hints <> r.hints + 1 or next_streak <> r.streak or gained <> 0 or won))
    or (p_action = 'answer' and (next_hints <> r.hints or (won and (next_streak <> r.streak + 1 or gained <= 0)) or (not won and (next_streak not in (0, r.streak) or gained <> 0))))
    or p_action not in ('hint', 'answer') then raise exception 'invalid_transition'; end if;

  update public.competition_runs set version = version + 1, hints = next_hints, streak = next_streak, rewarded = won where id = r.id;
  update public.competition_players set streak = next_streak where user_id = p_user;
  if won then
    insert into public.competition_scores(user_id, mode, pseudo, score) values (p_user, 'daily', p_pseudo, gained)
    on conflict (user_id, mode) do update set
      score = greatest(competition_scores.score, excluded.score),
      pseudo = case when excluded.score > competition_scores.score then excluded.pseudo else competition_scores.pseudo end,
      at = case when excluded.score > competition_scores.score then now() else competition_scores.at end;
  end if;
  select score into best from public.competition_scores where user_id = p_user and mode = 'daily';
  result := p_reply || jsonb_build_object('confirmedBest', coalesce(best, 0));
  insert into public.competition_events(user_id, event_id, run_id, fingerprint, reply) values (p_user, p_event, r.id, p_fingerprint, result);
  return result;
end $$;

-- Lecture publique bornée : aucun UUID Auth, expression ou état de partie exposé.
create function public.competition_top() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
    select public_id as id, pseudo, mode, score, floor(extract(epoch from at) * 1000)::bigint as at
    from public.competition_scores order by score desc, at, public_id limit 50
  ) s;
$$;

revoke all on function public.competition_rate(uuid), public.competition_read(uuid, uuid), public.competition_begin(uuid), public.competition_replay(uuid, uuid, text), public.competition_commit(uuid, uuid, uuid, integer, text, text, text, jsonb), public.competition_top() from public, anon, authenticated;
grant execute on function public.competition_rate(uuid), public.competition_read(uuid, uuid), public.competition_begin(uuid), public.competition_replay(uuid, uuid, text), public.competition_commit(uuid, uuid, uuid, integer, text, text, text, jsonb), public.competition_top() to service_role;
grant execute on function public.competition_top() to anon, authenticated;
