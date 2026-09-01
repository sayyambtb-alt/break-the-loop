-- ============================================================================
-- BASELINE SCHEMA SNAPSHOT
-- ============================================================================
-- This project's schema has always lived directly in Supabase, tracked in
-- Supabase's own migration history (32 migrations as of this snapshot, going
-- back to 2026-08-21) but never checked into this git repo. This file is a
-- single consolidated snapshot of the current schema, not a replay of that
-- history -- it exists so the repo has *some* record of what the database
-- looks like, for disaster recovery or spinning up a new environment.
--
-- Going forward: new schema changes should still be applied directly to
-- Supabase (that's the established workflow), but each one should also get
-- its own migration file in this folder, same as this file's neighbors will
-- be, so the repo and the live database stay in sync from here on.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  device_id text PRIMARY KEY,
  handle text NOT NULL DEFAULT 'Explorer' UNIQUE,
  streak integer DEFAULT 1,
  time_saved_mins integer DEFAULT 15,
  total_xp integer DEFAULT 0,
  badges text[] DEFAULT ARRAY['🌱 First Step'],
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  city text NOT NULL DEFAULT 'general',
  quest_text text NOT NULL,
  is_active boolean DEFAULT true,
  status text NOT NULL DEFAULT 'approved',
  rarity text DEFAULT 'common',
  xp_reward integer DEFAULT 15,
  time_window text,
  submitted_by_user_id text,
  submitted_by_handle text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.mission_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  mode text NOT NULL,
  quest_text text NOT NULL,
  photo_url text,
  xp_earned integer DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mission_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  sender_id text,
  sender_handle text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  handle text NOT NULL DEFAULT 'Explorer',
  mode text NOT NULL,
  city text NOT NULL DEFAULT 'mumbai',
  room_id text NOT NULL,
  quest_text text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  current_players integer DEFAULT 1,
  max_players integer DEFAULT 2,
  rarity text NOT NULL DEFAULT 'common',
  xp_reward integer NOT NULL DEFAULT 15,
  matched_with_user_id text,   -- dead column, kept for compatibility; never read
  matched_with_handle text,    -- dead column, kept for compatibility; never read
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matchmaking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL,
  room_id text NOT NULL,
  user_id text NOT NULL,
  handle text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(queue_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  friend_user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raid_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id text NOT NULL,
  sender_handle text NOT NULL,
  receiver_user_id text NOT NULL,
  room_id text NOT NULL,
  quest_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_handle text NOT NULL,
  reported_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid,
  user_id text,
  user_handle text NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id text NOT NULL,
  blocked_user_id text NOT NULL,
  blocked_handle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS public.hidden_gems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  neighborhood text NOT NULL,
  description text NOT NULL,
  submitted_by_user_id text,
  submitted_by_handle text,
  status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = device_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = device_id);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active quests" ON public.quests FOR SELECT USING (is_active = true);
CREATE POLICY "Users can submit their own pending quest" ON public.quests FOR INSERT WITH CHECK (submitted_by_user_id = auth.uid()::text AND status = 'pending' AND is_active = false);
CREATE POLICY "Users can view their own submissions too" ON public.quests FOR SELECT USING (is_active = true OR submitted_by_user_id = auth.uid()::text);

ALTER TABLE public.mission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on mission_logs" ON public.mission_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert their own mission logs" ON public.mission_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

ALTER TABLE public.mission_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read chat messages" ON public.mission_messages FOR SELECT USING (true);
CREATE POLICY "Users can send their own messages" ON public.mission_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id AND char_length(message) > 0 AND char_length(message) <= 300);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can see their own queue entry" ON public.matchmaking_queue FOR SELECT USING (
  auth.uid()::text = user_id OR EXISTS (SELECT 1 FROM matchmaking_participants p WHERE p.queue_id = matchmaking_queue.id AND p.user_id = auth.uid()::text)
);

ALTER TABLE public.matchmaking_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public participants read" ON public.matchmaking_participants FOR SELECT USING (true);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can add friends as themselves" ON public.friends FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own friend connections" ON public.friends FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = friend_user_id);

ALTER TABLE public.raid_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send invites as themselves" ON public.raid_invites FOR INSERT WITH CHECK (auth.uid()::text = sender_user_id);
CREATE POLICY "Users can view invites they sent or received" ON public.raid_invites FOR SELECT USING (auth.uid()::text = sender_user_id OR auth.uid()::text = receiver_user_id);
CREATE POLICY "Receivers can accept or decline their invites" ON public.raid_invites FOR UPDATE USING (auth.uid()::text = receiver_user_id) WITH CHECK (auth.uid()::text = receiver_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND length(trim(reason)) > 0);
CREATE POLICY "Reports viewable by admin only" ON public.reports FOR SELECT USING (auth.role() = 'service_role');

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed reactions viewable by everyone" ON public.feed_reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reactions" ON public.feed_reactions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own block list" ON public.blocked_users FOR SELECT USING (auth.uid()::text = blocker_user_id);

ALTER TABLE public.hidden_gems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved active gems" ON public.hidden_gems FOR SELECT USING (is_active = true);

-- ---------------------------------------------------------------------------
-- FUNCTIONS (RPCs) -- exact current definitions, pulled live from Supabase
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_gem(p_gem_id uuid, p_name text, p_neighborhood text, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
  v_clean_name text;
  v_clean_desc text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  v_clean_name := trim(p_name);
  v_clean_desc := trim(p_description);

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
    RAISE EXCEPTION 'Place name must be between 2 and 100 characters';
  END IF;
  IF length(v_clean_desc) < 15 OR length(v_clean_desc) > 300 THEN
    RAISE EXCEPTION 'Description must be between 15 and 300 characters';
  END IF;
  IF p_neighborhood IS NULL OR trim(p_neighborhood) = '' THEN
    RAISE EXCEPTION 'Neighborhood is required';
  END IF;

  UPDATE public.hidden_gems
  SET name = v_clean_name,
      neighborhood = trim(p_neighborhood),
      description = v_clean_desc,
      status = 'approved',
      is_active = true
  WHERE id = p_gem_id;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_approve_quest(p_quest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  UPDATE public.quests SET status = 'approved', is_active = true WHERE id = p_quest_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  UPDATE public.profiles SET is_banned = true WHERE device_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_delete_chat_message(p_message_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';

  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  DELETE FROM public.mission_messages WHERE id = p_message_id;
  DELETE FROM public.reports WHERE target_id = p_message_id::text;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_delete_feed_post(p_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';

  -- Strict Admin Email Check
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  DELETE FROM public.feed_reactions WHERE log_id = p_log_id;
  DELETE FROM public.mission_logs WHERE id = p_log_id;
  DELETE FROM public.reports WHERE target_id = p_log_id::text;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_get_all_gems()
 RETURNS TABLE(id uuid, name text, neighborhood text, description text, submitted_by_handle text, status text, is_active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT g.id, g.name, g.neighborhood, g.description, g.submitted_by_handle, g.status, g.is_active, g.created_at
  FROM public.hidden_gems g
  ORDER BY (g.status = 'pending') DESC, g.created_at DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_get_pending_gem_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
  v_count integer;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  SELECT count(*) INTO v_count FROM public.hidden_gems WHERE status = 'pending';
  RETURN v_count;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_get_pending_gems()
 RETURNS TABLE(id uuid, name text, neighborhood text, description text, submitted_by_handle text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT g.id, g.name, g.neighborhood, g.description, g.submitted_by_handle, g.created_at
  FROM public.hidden_gems g
  WHERE g.status = 'pending'
  ORDER BY g.created_at ASC;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_get_pending_quests()
 RETURNS TABLE(id uuid, mode text, quest_text text, submitted_by_handle text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT q.id, q.mode, q.quest_text, q.submitted_by_handle, q.created_at
  FROM public.quests q
  WHERE q.status = 'pending'
  ORDER BY q.created_at ASC
  LIMIT 50;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_get_reports()
 RETURNS TABLE(id uuid, reporter_handle text, reported_type text, target_id text, reason text, created_at timestamp with time zone, content_text text, content_photo_url text, offender_handle text, offender_user_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';

  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.reporter_handle, r.reported_type, r.target_id, r.reason, r.created_at,
    CASE WHEN r.reported_type = 'chat' THEN mm.message ELSE ml.quest_text END AS content_text,
    ml.photo_url AS content_photo_url,
    CASE WHEN r.reported_type = 'chat' THEN mm.sender_handle ELSE prof.handle END AS offender_handle,
    CASE WHEN r.reported_type = 'chat' THEN mm.sender_id ELSE ml.user_id END AS offender_user_id
  FROM public.reports r
  LEFT JOIN public.mission_messages mm ON r.reported_type = 'chat' AND mm.id::text = r.target_id
  LEFT JOIN public.mission_logs ml ON r.reported_type = 'feed' AND ml.id::text = r.target_id
  LEFT JOIN public.profiles prof ON prof.device_id = ml.user_id
  ORDER BY r.created_at DESC
  LIMIT 50;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_reject_gem(p_gem_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  DELETE FROM public.hidden_gems WHERE id = p_gem_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_reject_quest(p_quest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  DELETE FROM public.quests WHERE id = p_quest_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';

  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  DELETE FROM public.reports WHERE id = p_report_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  UPDATE public.profiles SET is_banned = false WHERE device_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_update_gem(p_gem_id uuid, p_name text, p_neighborhood text, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
  v_clean_name text;
  v_clean_desc text;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  IF v_user_email IS NULL OR v_user_email != 'sayyambtb@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  v_clean_name := trim(p_name);
  v_clean_desc := trim(p_description);

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
    RAISE EXCEPTION 'Place name must be between 2 and 100 characters';
  END IF;
  IF length(v_clean_desc) < 15 OR length(v_clean_desc) > 300 THEN
    RAISE EXCEPTION 'Description must be between 15 and 300 characters';
  END IF;
  IF p_neighborhood IS NULL OR trim(p_neighborhood) = '' THEN
    RAISE EXCEPTION 'Neighborhood is required';
  END IF;

  -- Deliberately does not touch status/is_active -- this edits an
  -- already-approved gem in place without needing to "re-approve" it.
  UPDATE public.hidden_gems
  SET name = v_clean_name,
      neighborhood = trim(p_neighborhood),
      description = v_clean_desc
  WHERE id = p_gem_id;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.block_user(p_blocked_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT device_id INTO v_blocked_id FROM public.profiles WHERE handle = p_blocked_handle;

  IF v_blocked_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_blocked_id = auth.uid()::text THEN
    RETURN jsonb_build_object('error', 'cannot_block_self');
  END IF;

  INSERT INTO public.blocked_users (blocker_user_id, blocked_user_id, blocked_handle)
  VALUES (auth.uid()::text, v_blocked_id, p_blocked_handle)
  ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.complete_mission(p_quest_text text, p_photo_url text, p_mode text, p_xp_earned integer DEFAULT 15)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_identifier text;
    v_handle text;
    v_current_streak integer;
    v_current_saved_mins integer;
    v_current_badges text[];
    v_last_mission_date date;
    v_new_streak integer;
    v_new_saved_mins integer;
    v_new_badges text[];
    v_new_total_xp integer;
BEGIN
    v_user_identifier := auth.uid()::text;
    IF v_user_identifier IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: a valid session is required to complete a mission';
    END IF;

    SELECT handle, streak, time_saved_mins, badges
      INTO v_handle, v_current_streak, v_current_saved_mins, v_current_badges
    FROM public.profiles
    WHERE device_id = v_user_identifier
    FOR UPDATE;

    SELECT MAX(created_at)::date INTO v_last_mission_date
    FROM public.mission_logs
    WHERE user_id = v_user_identifier;

    INSERT INTO public.mission_logs (user_id, mode, quest_text, photo_url, xp_earned)
    VALUES (v_user_identifier, p_mode, p_quest_text, p_photo_url, COALESCE(p_xp_earned, 15));

    IF v_last_mission_date IS NULL OR v_last_mission_date < CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := 1;
    ELSIF v_last_mission_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
        v_new_streak := COALESCE(v_current_streak, 1);
    END IF;

    v_new_saved_mins := COALESCE(v_current_saved_mins, 0) + COALESCE(p_xp_earned, 15);
    v_new_badges := COALESCE(v_current_badges, ARRAY['🌱 First Step']);

    IF v_new_streak >= 3 AND NOT ('🔥 Warm Up' = ANY(v_new_badges)) THEN
        v_new_badges := array_append(v_new_badges, '🔥 Warm Up');
    END IF;
    IF v_new_streak >= 7 AND NOT ('⚡ Week Warrior' = ANY(v_new_badges)) THEN
        v_new_badges := array_append(v_new_badges, '⚡ Week Warrior');
    END IF;
    IF v_new_streak >= 30 AND NOT ('👑 Loop Breaker' = ANY(v_new_badges)) THEN
        v_new_badges := array_append(v_new_badges, '👑 Loop Breaker');
    END IF;

    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + COALESCE(p_xp_earned, 15),
        streak = v_new_streak,
        time_saved_mins = v_new_saved_mins,
        badges = v_new_badges,
        updated_at = NOW()
    WHERE device_id = v_user_identifier
    RETURNING total_xp INTO v_new_total_xp;

    RETURN json_build_object(
        'success', true,
        'xp_earned', COALESCE(p_xp_earned, 15),
        'user_id', v_user_identifier,
        'handle', COALESCE(v_handle, 'Anonymous Adventurer'),
        'new_streak', v_new_streak,
        'new_saved_mins', v_new_saved_mins,
        'badges', v_new_badges,
        'new_total_xp', v_new_total_xp
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.find_or_create_match(p_user_id text, p_mode text, p_handle text, p_city text DEFAULT 'mumbai'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_waiting_row public.matchmaking_queue%ROWTYPE;
  v_quest_text TEXT;
  v_room_id TEXT;
  v_new_id UUID;
  v_max_cap INT;
  v_min_reveal INT := 2;
  v_updated_count INT;
  v_roster JSONB;
  v_rarity TEXT;
  v_xp_reward INT;
  v_roll FLOAT;
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
      'quest_text', v_waiting_row.quest_text,
      'rarity', v_waiting_row.rarity,
      'xp_reward', v_waiting_row.xp_reward,
      'current_players', v_waiting_row.current_players,
      'max_players', v_waiting_row.max_players,
      'is_creator', (v_waiting_row.user_id = p_user_id),
      'roster', v_roster
    );
  END IF;

  DELETE FROM public.matchmaking_queue
  WHERE user_id = p_user_id
    AND (current_players <= 1 OR created_at < NOW() - INTERVAL '5 minutes');

  SELECT q.*
  INTO v_waiting_row
  FROM public.matchmaking_queue q
  WHERE q.mode = p_mode
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
      'quest_text', v_waiting_row.quest_text,
      'rarity', v_waiting_row.rarity,
      'xp_reward', v_waiting_row.xp_reward,
      'current_players', v_updated_count,
      'max_players', v_waiting_row.max_players,
      'is_creator', false,
      'roster', v_roster
    );
  END IF;

  BEGIN
    SELECT quest_text INTO v_quest_text
    FROM public.quests
    WHERE mode = p_mode AND is_active = true AND public.is_quest_time_eligible(time_window)
    ORDER BY random() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_quest_text := NULL;
  END;

  IF v_quest_text IS NULL OR v_quest_text = '' THEN
    v_quest_text := CASE WHEN p_mode = 'squad'
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

  v_room_id := 'room_' || substr(md5(random()::text), 1, 10);

  INSERT INTO public.matchmaking_queue (
    user_id, handle, mode, city, room_id, quest_text, rarity, xp_reward, status, current_players, max_players
  )
  VALUES (
    p_user_id, p_handle, p_mode, COALESCE(p_city, 'mumbai'), v_room_id, v_quest_text, v_rarity, v_xp_reward, 'waiting', 1, v_max_cap
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.matchmaking_participants (queue_id, room_id, user_id, handle)
  VALUES (v_new_id, v_room_id, p_user_id, p_handle);

  RETURN jsonb_build_object(
    'matched', false,
    'queue_id', v_new_id,
    'room_id', v_room_id,
    'quest_text', v_quest_text,
    'rarity', v_rarity,
    'xp_reward', v_xp_reward,
    'current_players', 1,
    'max_players', v_max_cap,
    'is_creator', true,
    'roster', jsonb_build_array(jsonb_build_object('user_id', p_user_id, 'handle', p_handle))
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.get_eligible_quests(p_mode text)
 RETURNS TABLE(quest_text text, submitted_by_handle text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT q.quest_text, q.submitted_by_handle
  FROM public.quests q
  WHERE q.mode = p_mode
    AND q.is_active = true
    AND public.is_quest_time_eligible(q.time_window);
$function$

CREATE OR REPLACE FUNCTION public.get_explorer_public_profile(p_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_history JSONB;
BEGIN
  SELECT device_id, handle, streak, time_saved_mins, total_xp, badges, created_at
  INTO v_profile
  FROM public.profiles
  WHERE handle = p_handle
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'mode', mode,
      'quest_text', quest_text,
      'photo_url', photo_url,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_history
  FROM public.mission_logs
  WHERE user_id = v_profile.device_id
  LIMIT 15;

  RETURN jsonb_build_object(
    'found', true,
    'handle', v_profile.handle,
    'streak', v_profile.streak,
    'time_saved_mins', v_profile.time_saved_mins,
    'total_xp', v_profile.total_xp,
    'badges', v_profile.badges,
    'member_since', v_profile.created_at,
    'history', v_history
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard()
 RETURNS TABLE(handle text, total_xp integer, streak integer, is_self boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: a valid session is required';
  END IF;

  RETURN QUERY
  SELECT p.handle, COALESCE(p.total_xp, 0), COALESCE(p.streak, 0), (p.device_id = v_user_id)
  FROM public.profiles p
  WHERE p.device_id = v_user_id
     OR p.device_id IN (
       SELECT friend_user_id FROM public.friends WHERE user_id = v_user_id
       UNION
       SELECT user_id FROM public.friends WHERE friend_user_id = v_user_id
     )
  ORDER BY COALESCE(p.total_xp, 0) DESC
  LIMIT 50;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_gem_neighborhood_counts()
 RETURNS TABLE(neighborhood text, gem_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT g.neighborhood, count(*) AS gem_count
  FROM public.hidden_gems g
  WHERE g.is_active = true
  GROUP BY g.neighborhood;
$function$

CREATE OR REPLACE FUNCTION public.get_my_blocked_users()
 RETURNS TABLE(blocked_user_id text, blocked_handle text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT b.blocked_user_id, b.blocked_handle, b.created_at
  FROM public.blocked_users b
  WHERE b.blocker_user_id = auth.uid()::text
  ORDER BY b.created_at DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_random_hidden_gem(p_neighborhood text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gem RECORD;
BEGIN
  SELECT * INTO v_gem
  FROM public.hidden_gems
  WHERE neighborhood = p_neighborhood AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'name', v_gem.name,
    'neighborhood', v_gem.neighborhood,
    'description', v_gem.description,
    'submitted_by_handle', v_gem.submitted_by_handle
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.is_quest_time_eligible(p_time_window text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_local_time TIME;
BEGIN
  IF p_time_window IS NULL OR p_time_window = 'any' THEN
    RETURN true;
  END IF;

  v_local_time := (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME;

  IF p_time_window = 'morning' THEN
    RETURN v_local_time >= TIME '05:00' AND v_local_time < TIME '09:00';
  ELSIF p_time_window = 'sunset' THEN
    RETURN v_local_time >= TIME '17:30' AND v_local_time < TIME '19:30';
  ELSIF p_time_window = 'night' THEN
    RETURN v_local_time >= TIME '19:30' OR v_local_time < TIME '05:00';
  END IF;

  RETURN true;
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

CREATE OR REPLACE FUNCTION public.leave_match_queue(p_queue_id uuid, p_user_id text, p_is_creator boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT status INTO v_status
  FROM public.matchmaking_queue
  WHERE id = p_queue_id;

  IF v_status = 'waiting' THEN
    IF p_is_creator THEN
      DELETE FROM public.matchmaking_queue WHERE id = p_queue_id;
    ELSE
      DELETE FROM public.matchmaking_participants
      WHERE queue_id = p_queue_id AND user_id = p_user_id;

      UPDATE public.matchmaking_queue
      SET current_players = GREATEST(1, current_players - 1),
          updated_at = NOW()
      WHERE id = p_queue_id;
    END IF;
  ELSE
    DELETE FROM public.matchmaking_participants
    WHERE queue_id = p_queue_id AND user_id = p_user_id;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.purge_stale_match_rows()
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  DELETE FROM public.matchmaking_queue
  WHERE created_at < NOW() - INTERVAL '10 minutes';
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
  v_quest_text text;
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

  SELECT mode INTO v_mode FROM public.matchmaking_queue WHERE id = p_queue_id;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'Match not found';
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

CREATE OR REPLACE FUNCTION public.submit_hidden_gem(p_name text, p_neighborhood text, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
  v_handle text;
  v_pending_count int;
  v_clean_name text;
  v_clean_desc text;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: a valid session is required';
  END IF;

  v_clean_name := trim(p_name);
  v_clean_desc := trim(p_description);

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
    RAISE EXCEPTION 'Place name must be between 2 and 100 characters';
  END IF;

  IF length(v_clean_desc) < 15 OR length(v_clean_desc) > 300 THEN
    RAISE EXCEPTION 'Description must be between 15 and 300 characters';
  END IF;

  IF p_neighborhood IS NULL OR trim(p_neighborhood) = '' THEN
    RAISE EXCEPTION 'Neighborhood is required';
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.hidden_gems
  WHERE submitted_by_user_id = v_user_id AND status = 'pending';

  IF v_pending_count >= 5 THEN
    RAISE EXCEPTION 'You already have 5 spots awaiting review — wait for those to be reviewed first';
  END IF;

  SELECT handle INTO v_handle FROM public.profiles WHERE device_id = v_user_id;

  INSERT INTO public.hidden_gems (name, neighborhood, description, is_active, status, submitted_by_user_id, submitted_by_handle)
  VALUES (v_clean_name, trim(p_neighborhood), v_clean_desc, false, 'pending', v_user_id, COALESCE(v_handle, 'guest'));

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.submit_quest_suggestion(p_quest_text text, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text;
  v_handle text;
  v_cleaned text;
  v_pending_count int;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: a valid session is required';
  END IF;

  IF p_mode NOT IN ('solo', 'duo', 'squad') THEN
    RAISE EXCEPTION 'Invalid mode';
  END IF;

  v_cleaned := trim(p_quest_text);
  IF length(v_cleaned) < 15 OR length(v_cleaned) > 300 THEN
    RAISE EXCEPTION 'Quest text must be between 15 and 300 characters';
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.quests
  WHERE submitted_by_user_id = v_user_id AND status = 'pending';

  IF v_pending_count >= 5 THEN
    RAISE EXCEPTION 'You already have 5 quests awaiting review — wait for those to be reviewed first';
  END IF;

  SELECT handle INTO v_handle FROM public.profiles WHERE device_id = v_user_id;

  INSERT INTO public.quests (mode, city, quest_text, is_active, status, submitted_by_user_id, submitted_by_handle)
  VALUES (p_mode, 'general', v_cleaned, false, 'pending', v_user_id, COALESCE(v_handle, 'guest'));

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.blocked_users
  WHERE blocker_user_id = auth.uid()::text AND blocked_user_id = p_blocked_user_id;

  RETURN jsonb_build_object('success', true);
END;
$function$

CREATE OR REPLACE FUNCTION public.update_user_handle(p_new_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id TEXT;
  v_cleaned TEXT;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_cleaned := regexp_replace(trim(p_new_handle), '[^a-zA-Z0-9_]', '', 'g');
  IF length(v_cleaned) < 2 OR length(v_cleaned) > 25 THEN
    RAISE EXCEPTION 'Handle must be between 2 and 25 alphanumeric characters';
  END IF;

  IF lower(v_cleaned) = 'guest' THEN
    RAISE EXCEPTION 'That handle is reserved — try another one';
  END IF;

  BEGIN
    UPDATE public.profiles
    SET handle = v_cleaned,
        updated_at = NOW()
    WHERE device_id = v_user_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'That handle is already taken — try another one';
  END;

  RETURN jsonb_build_object('success', true, 'handle', v_cleaned);
END;
$function$
