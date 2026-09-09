-- ============================================================================
-- EXPLORE DUO/SQUAD MATCHMAKING
-- ============================================================================
-- Adds real Duo/Squad matchmaking for the Explore track (introduced in the
-- Quest/Explore restructure). These columns and functions were applied
-- directly to Supabase already -- this migration is a git-tracked record of
-- that live schema, not a change to be run against a database that doesn't
-- already have it. It brings the baseline snapshot (20260901) up to date
-- with what has shipped since.
--
-- Changes:
--   * matchmaking_queue gains four columns so an Explore room can carry the
--     hidden gem it matched on, alongside the neighborhood it was for:
--     neighborhood, gem_name, gem_description, gem_submitted_by.
--   * find_or_create_explore_match(): new RPC, the Explore-track counterpart
--     to find_or_create_match(). Matches players on the same neighborhood
--     instead of the same generic mode, and sources its quest_text from a
--     random active row in hidden_gems for that neighborhood rather than
--     from public.quests.
--   * join_room_by_id(): updated to also return the neighborhood/gem_* fields
--     on the matched row, so a room-code join lands the joiner on the
--     correct Explore gem instead of losing that context.
--   * reroll_shared_quest(): updated to branch on whether the queue row has
--     a neighborhood set -- Explore rooms reroll to a different real gem in
--     the same neighborhood; Quest rooms keep the original random-quest
--     reroll behavior.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- COLUMNS
-- ---------------------------------------------------------------------------

ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS gem_name text;
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS gem_description text;
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS gem_submitted_by text;

-- ---------------------------------------------------------------------------
-- FUNCTIONS (RPCs) -- exact current definitions, pulled live from Supabase
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_or_create_explore_match(p_user_id text, p_mode text, p_handle text, p_neighborhood text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_waiting_row public.matchmaking_queue%ROWTYPE;
  v_gem RECORD;
  v_room_id TEXT;
  v_new_id UUID;
  v_max_cap INT;
  v_min_reveal INT := 2;
  v_updated_count INT;
  v_roster JSONB;
  v_is_banned BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT is_banned INTO v_is_banned FROM public.profiles WHERE device_id = p_user_id;
  IF v_is_banned THEN
    RETURN jsonb_build_object('error', 'banned');
  END IF;

  v_max_cap := CASE WHEN p_mode = 'squad' THEN 8 ELSE 2 END;

  SELECT q.*
  INTO v_waiting_row
  FROM public.matchmaking_queue q
  JOIN public.matchmaking_participants p ON p.queue_id = q.id
  WHERE p.user_id = p_user_id
    AND q.mode = p_mode
    AND q.neighborhood = p_neighborhood
    AND q.status = 'waiting'
    AND q.created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 1;

  IF FOUND THEN
    SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'handle', handle))
    INTO v_roster
    FROM public.matchmaking_participants
    WHERE queue_id = v_waiting_row.id;

    RETURN jsonb_build_object(
      'matched', (v_waiting_row.current_players >= v_min_reveal),
      'queue_id', v_waiting_row.id,
      'room_id', v_waiting_row.room_id,
      'neighborhood', v_waiting_row.neighborhood,
      'gem_name', v_waiting_row.gem_name,
      'gem_description', v_waiting_row.gem_description,
      'gem_submitted_by', v_waiting_row.gem_submitted_by,
      'quest_text', v_waiting_row.quest_text,
      'xp_reward', v_waiting_row.xp_reward,
      'current_players', v_waiting_row.current_players,
      'max_players', v_waiting_row.max_players,
      'is_creator', (v_waiting_row.user_id = p_user_id),
      'roster', v_roster
    );
  END IF;

  DELETE FROM public.matchmaking_queue
  WHERE user_id = p_user_id
    AND neighborhood IS NOT NULL
    AND (current_players <= 1 OR created_at < NOW() - INTERVAL '5 minutes');

  SELECT q.*
  INTO v_waiting_row
  FROM public.matchmaking_queue q
  WHERE q.mode = p_mode
    AND q.neighborhood = p_neighborhood
    AND q.status = 'waiting'
    AND q.user_id != p_user_id
    AND q.current_players < q.max_players
    AND q.created_at > NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.matchmaking_participants mp
      WHERE mp.queue_id = q.id
        AND (
          EXISTS (SELECT 1 FROM public.blocked_users b WHERE b.blocker_user_id = p_user_id AND b.blocked_user_id = mp.user_id)
          OR EXISTS (SELECT 1 FROM public.blocked_users b WHERE b.blocker_user_id = mp.user_id AND b.blocked_user_id = p_user_id)
        )
    )
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_updated_count := v_waiting_row.current_players + 1;

    INSERT INTO public.matchmaking_participants (queue_id, room_id, user_id, handle)
    VALUES (v_waiting_row.id, v_waiting_row.room_id, p_user_id, p_handle)
    ON CONFLICT (queue_id, user_id) DO NOTHING;

    UPDATE public.matchmaking_queue
    SET current_players = v_updated_count,
        status = CASE WHEN v_updated_count >= v_waiting_row.max_players THEN 'matched' ELSE 'waiting' END,
        updated_at = NOW()
    WHERE id = v_waiting_row.id;

    SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'handle', handle))
    INTO v_roster
    FROM public.matchmaking_participants
    WHERE queue_id = v_waiting_row.id;

    RETURN jsonb_build_object(
      'matched', (v_updated_count >= v_min_reveal),
      'queue_id', v_waiting_row.id,
      'room_id', v_waiting_row.room_id,
      'neighborhood', v_waiting_row.neighborhood,
      'gem_name', v_waiting_row.gem_name,
      'gem_description', v_waiting_row.gem_description,
      'gem_submitted_by', v_waiting_row.gem_submitted_by,
      'quest_text', v_waiting_row.quest_text,
      'xp_reward', v_waiting_row.xp_reward,
      'current_players', v_updated_count,
      'max_players', v_waiting_row.max_players,
      'is_creator', false,
      'roster', v_roster
    );
  END IF;

  SELECT * INTO v_gem
  FROM public.hidden_gems
  WHERE neighborhood = p_neighborhood AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_gems_for_neighborhood');
  END IF;

  v_room_id := 'room_' || substr(md5(random()::text), 1, 10);

  INSERT INTO public.matchmaking_queue (
    user_id, handle, mode, city, room_id, quest_text, neighborhood, gem_name, gem_description, gem_submitted_by,
    rarity, xp_reward, status, current_players, max_players
  )
  VALUES (
    p_user_id, p_handle, p_mode, 'mumbai', v_room_id,
    format('📍 %s (%s) — %s', v_gem.name, v_gem.neighborhood, v_gem.description),
    p_neighborhood, v_gem.name, v_gem.description, v_gem.submitted_by_handle,
    'common', 15, 'waiting', 1, v_max_cap
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.matchmaking_participants (queue_id, room_id, user_id, handle)
  VALUES (v_new_id, v_room_id, p_user_id, p_handle);

  RETURN jsonb_build_object(
    'matched', false,
    'queue_id', v_new_id,
    'room_id', v_room_id,
    'neighborhood', p_neighborhood,
    'gem_name', v_gem.name,
    'gem_description', v_gem.description,
    'gem_submitted_by', v_gem.submitted_by_handle,
    'quest_text', format('📍 %s (%s) — %s', v_gem.name, v_gem.neighborhood, v_gem.description),
    'xp_reward', 15,
    'current_players', 1,
    'max_players', v_max_cap,
    'is_creator', true,
    'roster', jsonb_build_array(jsonb_build_object('user_id', p_user_id, 'handle', p_handle))
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.join_room_by_id(p_room_id text, p_user_id text, p_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.matchmaking_queue%ROWTYPE;
  v_actual_count INT;
  v_roster JSONB;
  v_is_banned BOOLEAN;
  v_has_conflict BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT is_banned INTO v_is_banned FROM public.profiles WHERE device_id = p_user_id;
  IF v_is_banned THEN
    RETURN jsonb_build_object('error', 'banned');
  END IF;

  SELECT *
  INTO v_row
  FROM public.matchmaking_queue
  WHERE room_id = p_room_id
    AND status = 'waiting'
    AND current_players < max_players
    AND created_at > NOW() - INTERVAL '60 minutes'
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.matchmaking_participants mp
    WHERE mp.queue_id = v_row.id
      AND (
        EXISTS (SELECT 1 FROM public.blocked_users b WHERE b.blocker_user_id = p_user_id AND b.blocked_user_id = mp.user_id)
        OR EXISTS (SELECT 1 FROM public.blocked_users b WHERE b.blocker_user_id = mp.user_id AND b.blocked_user_id = p_user_id)
      )
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RETURN jsonb_build_object('error', 'blocked');
  END IF;

  INSERT INTO public.matchmaking_participants (queue_id, room_id, user_id, handle)
  VALUES (v_row.id, v_row.room_id, p_user_id, p_handle)
  ON CONFLICT (queue_id, user_id) DO NOTHING;

  SELECT count(*) INTO v_actual_count
  FROM public.matchmaking_participants
  WHERE queue_id = v_row.id;

  UPDATE public.matchmaking_queue
  SET current_players = v_actual_count,
      status = CASE WHEN v_actual_count >= v_row.max_players THEN 'matched' ELSE 'waiting' END,
      updated_at = NOW()
  WHERE id = v_row.id;

  SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'handle', handle))
  INTO v_roster
  FROM public.matchmaking_participants
  WHERE queue_id = v_row.id;

  RETURN jsonb_build_object(
    'matched', (v_actual_count >= 2),
    'queue_id', v_row.id,
    'room_id', v_row.room_id,
    'mode', v_row.mode,
    'neighborhood', v_row.neighborhood,
    'gem_name', v_row.gem_name,
    'gem_description', v_row.gem_description,
    'gem_submitted_by', v_row.gem_submitted_by,
    'quest_text', v_row.quest_text,
    'rarity', v_row.rarity,
    'xp_reward', v_row.xp_reward,
    'current_players', v_actual_count,
    'max_players', v_row.max_players,
    'is_creator', (v_row.user_id = p_user_id),
    'roster', v_roster
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.reroll_shared_quest(p_queue_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
  v_mode text;
  v_neighborhood text;
  v_quest_text text;
  v_gem RECORD;
  v_rarity text;
  v_xp_reward int;
  v_roll float;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: a valid session is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matchmaking_participants
    WHERE queue_id = p_queue_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you are not a participant in this match';
  END IF;

  SELECT mode, neighborhood INTO v_mode, v_neighborhood FROM public.matchmaking_queue WHERE id = p_queue_id;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Explore room: reroll to a different real gem in the same
  -- neighborhood, not a generic quest.
  IF v_neighborhood IS NOT NULL THEN
    SELECT * INTO v_gem
    FROM public.hidden_gems
    WHERE neighborhood = v_neighborhood AND is_active = true
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'no_gems_for_neighborhood');
    END IF;

    UPDATE public.matchmaking_queue
    SET gem_name = v_gem.name,
        gem_description = v_gem.description,
        quest_text = format('📍 %s (%s) — %s', v_gem.name, v_gem.neighborhood, v_gem.description),
        updated_at = NOW()
    WHERE id = p_queue_id;

    RETURN jsonb_build_object(
      'success', true,
      'gem_name', v_gem.name,
      'gem_description', v_gem.description,
      'neighborhood', v_neighborhood,
      'quest_text', format('📍 %s (%s) — %s', v_gem.name, v_gem.neighborhood, v_gem.description),
      'xp_reward', 15
    );
  END IF;

  BEGIN
    SELECT quest_text INTO v_quest_text
    FROM public.quests
    WHERE mode = v_mode AND is_active = true
    ORDER BY random() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_quest_text := NULL;
  END;

  IF v_quest_text IS NULL OR v_quest_text = '' THEN
    v_quest_text := CASE WHEN v_mode = 'squad'
      THEN 'Find a nearby circle or chai spot, gather the whole squad, and take a synced group jump photo!'
      ELSE 'Head to the nearest tapri or cafe and order a beverage you have never tried!'
    END;
  END IF;

  v_roll := random();
  IF v_roll > 0.85 THEN
    v_rarity := 'legendary';
    v_xp_reward := 75;
  ELSIF v_roll > 0.60 THEN
    v_rarity := 'rare';
    v_xp_reward := 35;
  ELSE
    v_rarity := 'common';
    v_xp_reward := 15;
  END IF;

  UPDATE public.matchmaking_queue
  SET quest_text = v_quest_text, rarity = v_rarity, xp_reward = v_xp_reward, updated_at = NOW()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'success', true,
    'quest_text', v_quest_text,
    'rarity', v_rarity,
    'xp_reward', v_xp_reward
  );
END;
$function$
