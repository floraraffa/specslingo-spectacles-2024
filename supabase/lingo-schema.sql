-- Lingo Specs · Snap Cloud schema (run ONCE in the SQL Editor of the
-- "Cloud Messages" project). Everything is prefixed lingo_ so it never mixes
-- with the Cloud Messages tables. Safe to re-run.
--
-- Who can do what
--   * The Lens signs in with Snapchat (signInWithIdToken) → auth.uid().
--     It may only read/write ITS OWN rows (RLS below).
--   * The web never logs in: it sends the NUBE-XXXX-XXXX code to the
--     lingo_web_* functions, which return ONLY that person's progress
--     (read-only). The code → user lookup is never exposed directly.

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.lingo_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  native_language text,
  avatar_path text,                      -- storage path of the Bitmoji, e.g. <uid>/avatar.png
  updated_at timestamptz not null default now()
);

create table if not exists public.lingo_progress (
  user_id uuid not null references auth.users on delete cascade,
  target_language text not null,         -- Spanish, English, German, French, Italian, Japanese
  native_language text,
  level text,                            -- A0..B2 (placement test), null = not assessed
  audio_xp integer not null default 0,
  text_xp integer not null default 0,
  words_count integer not null default 0,
  talk_scenes integer not null default 0,
  catcher_best integer not null default 0,
  last_practice_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, target_language)
);

create table if not exists public.lingo_words (
  user_id uuid not null references auth.users on delete cascade,
  target_language text not null,
  word_key text not null,                -- lower-cased word (one row per word)
  word text not null,
  translation text,
  phonetic text,
  room text,
  phrase text,
  phrase_translation text,
  image_path text,                       -- storage path of the card drawing, if uploaded
  updated_at timestamptz not null default now(),
  primary key (user_id, target_language, word_key)
);

-- One row per day the person practiced a language (streaks).
create table if not exists public.lingo_practice_days (
  user_id uuid not null references auth.users on delete cascade,
  target_language text not null,
  day date not null,
  primary key (user_id, target_language, day)
);

-- The web link code shown in the Lens (one active code per person).
create table if not exists public.lingo_web_codes (
  code text primary key,
  user_id uuid not null references auth.users on delete cascade,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lingo_web_codes_user_idx on public.lingo_web_codes (user_id);

-- ───────────────────────── row level security ─────────────────────────

alter table public.lingo_profiles enable row level security;
alter table public.lingo_progress enable row level security;
alter table public.lingo_words enable row level security;
alter table public.lingo_practice_days enable row level security;
alter table public.lingo_web_codes enable row level security;

drop policy if exists lingo_profiles_own on public.lingo_profiles;
create policy lingo_profiles_own on public.lingo_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lingo_progress_own on public.lingo_progress;
create policy lingo_progress_own on public.lingo_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lingo_words_own on public.lingo_words;
create policy lingo_words_own on public.lingo_words
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lingo_days_own on public.lingo_practice_days;
create policy lingo_days_own on public.lingo_practice_days
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Codes are only created / read through the functions below (no direct policy).

-- ───────────────────────── storage (Bitmoji + card drawings) ─────────────────────────
-- Public read so the web can show the pictures; each person writes only in
-- their own folder <uid>/...

insert into storage.buckets (id, name, public)
values ('lingo-media', 'lingo-media', true)
on conflict (id) do nothing;

drop policy if exists lingo_media_insert on storage.objects;
create policy lingo_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lingo-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists lingo_media_update on storage.objects;
create policy lingo_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'lingo-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists lingo_media_select on storage.objects;
create policy lingo_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'lingo-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── link code (Lens side) ─────────────────────────

-- Returns the signed-in person's active code, creating one if needed.
-- Format NUBE-XXXX-XXXX, 31 unambiguous characters, cryptographic randomness.
create or replace function public.lingo_issue_code(p_rotate boolean default false)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  i int;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if p_rotate then
    update lingo_web_codes set revoked = true where user_id = v_uid and not revoked;
  else
    select code into v_code from lingo_web_codes
      where user_id = v_uid and not revoked order by created_at desc limit 1;
    if v_code is not null then
      return v_code;
    end if;
  end if;
  loop
    v_bytes := gen_random_bytes(8);
    v_code := 'NUBE-';
    for i in 0..7 loop
      if i = 4 then v_code := v_code || '-'; end if;
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 31), 1);
    end loop;
    exit when not exists (select 1 from lingo_web_codes where code = v_code);
  end loop;
  insert into lingo_web_codes (code, user_id) values (v_code, v_uid);
  return v_code;
end;
$$;

revoke all on function public.lingo_issue_code(boolean) from public, anon;
grant execute on function public.lingo_issue_code(boolean) to authenticated;

-- Internal: code → user. NOT callable from outside.
create or replace function public.lingo_code_user(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from lingo_web_codes
  where code = upper(trim(p_code)) and not revoked
  limit 1;
$$;

revoke all on function public.lingo_code_user(text) from public, anon, authenticated;

-- ───────────────────────── web (read-only, by code) ─────────────────────────

-- Profile + one summary per language (with streaks). Null = unknown code.
create or replace function public.lingo_web_summary(p_code text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := lingo_code_user(p_code);
begin
  if v_uid is null then
    return null;
  end if;
  return json_build_object(
    'profile', (
      select json_build_object(
        'display_name', p.display_name,
        'native_language', p.native_language,
        'avatar_path', p.avatar_path
      ) from lingo_profiles p where p.user_id = v_uid
    ),
    'languages', coalesce((
      select json_agg(row_to_json(l) order by l.last_practice_at desc nulls last)
      from (
        select g.target_language, g.native_language, g.level, g.audio_xp, g.text_xp,
               g.words_count, g.talk_scenes, g.catcher_best, g.last_practice_at,
               (
                 -- consecutive days up to today (or yesterday) in this language
                 with days as (
                   select day from lingo_practice_days
                   where user_id = v_uid and target_language = g.target_language
                 ),
                 anchored as (
                   select day, (current_date - day) - row_number() over (order by day desc) as grp
                   from days where day <= current_date
                 )
                 select coalesce(count(*), 0) from anchored
                 where grp = (select min(grp) from anchored)
                   and (select max(day) from days) >= current_date - 1
               ) as streak
        from lingo_progress g where g.user_id = v_uid
      ) l
    ), '[]'::json)
  );
end;
$$;

-- Words of one language, newest first.
create or replace function public.lingo_web_words(p_code text, p_language text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := lingo_code_user(p_code);
begin
  if v_uid is null then
    return null;
  end if;
  return coalesce((
    select json_agg(row_to_json(w) order by w.updated_at desc)
    from (
      select word, translation, phonetic, room, phrase, phrase_translation, image_path, updated_at
      from lingo_words where user_id = v_uid and target_language = p_language
    ) w
  ), '[]'::json);
end;
$$;

revoke all on function public.lingo_web_summary(text) from public;
revoke all on function public.lingo_web_words(text, text) from public;
grant execute on function public.lingo_web_summary(text) to anon, authenticated;
grant execute on function public.lingo_web_words(text, text) to anon, authenticated;
