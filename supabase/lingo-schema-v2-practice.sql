-- Lingo Specs · v2: practice report + web exercises. Run ONCE in the SQL
-- Editor of the "Cloud Messages" project, AFTER lingo-schema.sql. Safe to re-run.
--
--   * lingo_words gets the practice report from the Lens (every pronunciation
--     and quiz attempt, not only successes) and from the web exercises.
--     The Lens writes audio_* / text_* / *_score / last_heard / last_tip;
--     the web writes only web_* (so neither overwrites the other).
--   * lingo_web_practice(code, language, results): the web saves the result of
--     an exercise session. The code is the key: whoever has it can add practice
--     to that person (same as reading their progress). Clamped and limited.

-- ───────────────────────── new columns ─────────────────────────

alter table public.lingo_words add column if not exists audio_tries integer not null default 0;
alter table public.lingo_words add column if not exists audio_misses integer not null default 0;
alter table public.lingo_words add column if not exists best_score integer;          -- 0..100, best pronunciation
alter table public.lingo_words add column if not exists last_score integer;          -- 0..100, last pronunciation
alter table public.lingo_words add column if not exists last_heard text;             -- what the glasses heard last time
alter table public.lingo_words add column if not exists last_tip text;               -- coach tip of the last miss
alter table public.lingo_words add column if not exists text_tries integer not null default 0;
alter table public.lingo_words add column if not exists text_misses integer not null default 0;
alter table public.lingo_words add column if not exists web_tries integer not null default 0;
alter table public.lingo_words add column if not exists web_misses integer not null default 0;
alter table public.lingo_words add column if not exists web_best_score integer;
alter table public.lingo_words add column if not exists web_practiced_at timestamptz;

alter table public.lingo_progress add column if not exists web_xp integer not null default 0;

-- ───────────────────────── web: words with the report ─────────────────────────

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
      select word_key, word, translation, phonetic, room, phrase, phrase_translation, image_path, updated_at,
             audio_tries, audio_misses, best_score, last_score, last_heard, last_tip,
             text_tries, text_misses, web_tries, web_misses, web_best_score, web_practiced_at
      from lingo_words where user_id = v_uid and target_language = p_language
    ) w
  ), '[]'::json);
end;
$$;

-- ───────────────────────── web: save an exercise session ─────────────────────────
-- p_results: [{"word_key": "chaise", "correct": true, "score": 84}, ...]
-- (score only for pronunciation). At most 40 results per call. Returns the
-- language's new web XP, or null for an unknown code.

create or replace function public.lingo_web_practice(p_code text, p_language text, p_results json)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := lingo_code_user(p_code);
  v_item json;
  v_key text;
  v_correct boolean;
  v_score integer;
  v_right integer := 0;
  v_count integer := 0;
  v_xp integer;
begin
  if v_uid is null then
    return null;
  end if;
  if json_typeof(p_results) <> 'array' then
    raise exception 'results must be an array';
  end if;
  if not exists (select 1 from lingo_progress where user_id = v_uid and target_language = p_language) then
    raise exception 'unknown language';
  end if;

  for v_item in select value from json_array_elements(p_results) loop
    v_count := v_count + 1;
    exit when v_count > 40;
    v_key := lower(left(coalesce(v_item->>'word_key', ''), 120));
    v_correct := coalesce((v_item->>'correct')::boolean, false);
    v_score := case when v_item->>'score' ~ '^[0-9]{1,3}$' then least(100, (v_item->>'score')::integer) end;
    update lingo_words set
      web_tries = web_tries + 1,
      web_misses = web_misses + case when v_correct then 0 else 1 end,
      web_best_score = case when v_score is null then web_best_score else greatest(coalesce(web_best_score, 0), v_score) end,
      web_practiced_at = now()
    where user_id = v_uid and target_language = p_language and word_key = v_key;
    if found and v_correct then
      v_right := v_right + 1;
    end if;
  end loop;

  -- 2 XP per right answer, and the day counts for the streak.
  update lingo_progress set
    web_xp = web_xp + v_right * 2,
    last_practice_at = greatest(coalesce(last_practice_at, now()), now())
  where user_id = v_uid and target_language = p_language
  returning web_xp into v_xp;
  insert into lingo_practice_days (user_id, target_language, day)
  values (v_uid, p_language, current_date)
  on conflict do nothing;
  return v_xp;
end;
$$;

revoke all on function public.lingo_web_words(text, text) from public;
grant execute on function public.lingo_web_words(text, text) to anon, authenticated;
revoke all on function public.lingo_web_practice(text, text, json) from public;
grant execute on function public.lingo_web_practice(text, text, json) to anon, authenticated;
