-- Fermer aussi les écritures historiques si la table existait déjà sur le projet.
do $$ begin
  if to_regclass('public.scores') is not null then
    execute 'revoke insert, update, delete on public.scores from public, anon, authenticated';
    if (select relkind in ('r', 'p') from pg_class where oid = 'public.scores'::regclass) then
      execute 'alter table public.scores enable row level security';
    end if;
  end if;
end $$;
