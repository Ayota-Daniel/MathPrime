# Leaderboard anonyme — mise en place

Par défaut le jeu utilise un leaderboard **local** (ne voit que l'appareil) : aucune config requise.
Pour un classement **mondial**, branche un backend. Le plus simple sans login : **Supabase**.

## Anonymat (design)
- Identité = **UUID aléatoire** généré sur l'appareil (`deviceId`, stocké en local) + **pseudo** choisi.
- Aucune PII, aucun e-mail, **aucun fingerprint** (on n'envoie ni IP volontairement, ni user-agent).
- Le partage est **opt-in explicite** : rien n'est publié tant que le joueur n'a pas activé le partage et fourni un pseudo.
- L'`deviceId` ne sert qu'à mettre à jour **sa propre** ligne (un score par appareil et par mode).

## Limite assumée
Sans authentification, un score reste **falsifiable côté client**. On stocke l'expression gagnante (`expr`)
pour permettre une **revalidation serveur** (Edge Function) si tu veux durcir l'anti-triche plus tard.

## Supabase — SQL
```sql
create table public.scores (
  id     text   not null,
  mode   text   not null,
  pseudo text   not null,
  score  int    not null,
  expr   text,
  at     bigint not null,
  primary key (id, mode)
);
alter table public.scores enable row level security;
create policy "read_all"    on public.scores for select using (true);
create policy "insert_anon" on public.scores for insert
  with check (char_length(pseudo) <= 16 and score >= 0 and score < 100000);
create policy "update_anon" on public.scores for update using (true)
  with check (char_length(pseudo) <= 16 and score >= 0 and score < 100000);
```

## Variables d'environnement
**Web** (`apps/web/.env`) :
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_anon_publique
```
**Mobile** (`apps/mobile/.env` ou via app.config) :
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon_publique
```
Sans ces variables, le fallback local s'active automatiquement.

## Tester le multi (pas à pas)
1. Crée un projet sur supabase.com (gratuit) → SQL Editor → colle le SQL ci-dessus → Run.
2. Project Settings → API → copie **Project URL** et la clé **anon public**.
3. Web : crée `apps/web/.env` avec `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, relance `npm run dev`.
4. Mobile : crée `apps/mobile/.env` avec `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   ⚠️ Les variables `EXPO_PUBLIC_*` sont **inlinées au build** → après les avoir ajoutées, **rebuild** le dev build (`npx expo run:android`), un simple reload ne suffit pas.
5. Dans chaque app : écran Leaderboard → active le partage → choisis un pseudo → joue et bats un record.
6. Le score apparaît dans Supabase (Table Editor → `scores`) et dans l'autre app (badge « mondial » au lieu de « local »).
