-- ============================================================================
-- STREAK FREEZE (NEW FEATURE -- NOT YET APPLIED TO THE LIVE DATABASE)
-- ============================================================================
-- One missed day a week no longer kills a streak. Adds `freezes_available`
-- to profiles (defaults to 1, capped at 1 banked freeze at a time) and
-- changes complete_mission()'s streak calculation:
--
--   * 0 days since the last mission (same day)         -> streak unchanged
--   * 1 day since the last mission (normal cadence)     -> streak += 1
--   * exactly 2 days since the last mission (one day
--     was missed) AND a freeze is banked                -> streak += 1,
--                                                           freeze consumed
--   * exactly 2 days since the last mission with no
--     freeze banked, or more than 2 days                 -> streak resets
--                                                           to 1
--   * whenever the resulting streak is a multiple of 7   -> one freeze is
--                                                           replenished
--                                                           (capped at 1
--                                                           banked)
--
-- NOT APPLIED: this file has NOT been run against the live Supabase project.
-- It needs to be applied manually before the freeze logic is live; until
-- then complete_mission() keeps behaving exactly as it does today, and the
-- client's freezesAvailable state stays at its default of 1 with no
-- server-side persistence.
--
-- This CREATE OR REPLACE reproduces complete_mission()'s full current body
-- (from 20260901_baseline_schema_snapshot.sql) with only the streak/freeze
-- block and the new freezes_available bookkeeping added -- mission logging,
-- badge thresholds, and the xp/streak columns updated are all unchanged.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freezes_available integer NOT NULL DEFAULT 1;

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
    v_current_freezes integer;
    v_last_mission_date date;
    v_new_streak integer;
    v_new_saved_mins integer;
    v_new_badges text[];
    v_new_total_xp integer;
    v_new_freezes integer;
    v_used_freeze boolean := false;
BEGIN
    v_user_identifier := auth.uid()::text;
    IF v_user_identifier IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: a valid session is required to complete a mission';
    END IF;

    SELECT handle, streak, time_saved_mins, badges, COALESCE(freezes_available, 1)
      INTO v_handle, v_current_streak, v_current_saved_mins, v_current_badges, v_current_freezes
    FROM public.profiles
    WHERE device_id = v_user_identifier
    FOR UPDATE;

    SELECT MAX(created_at)::date INTO v_last_mission_date
    FROM public.mission_logs
    WHERE user_id = v_user_identifier;

    INSERT INTO public.mission_logs (user_id, mode, quest_text, photo_url, xp_earned)
    VALUES (v_user_identifier, p_mode, p_quest_text, p_photo_url, COALESCE(p_xp_earned, 15));

    v_new_freezes := v_current_freezes;

    IF v_last_mission_date IS NULL OR v_last_mission_date < CURRENT_DATE - INTERVAL '2 days' THEN
        v_new_streak := 1;
    ELSIF v_last_mission_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := COALESCE(v_current_streak, 0) + 1;
    ELSIF v_last_mission_date = CURRENT_DATE - INTERVAL '2 days' AND v_current_freezes > 0 THEN
        -- Exactly one day was missed and a freeze is banked: forgive it and
        -- keep the streak alive instead of resetting to 1.
        v_new_streak := COALESCE(v_current_streak, 0) + 1;
        v_new_freezes := v_current_freezes - 1;
        v_used_freeze := true;
    ELSIF v_last_mission_date = CURRENT_DATE - INTERVAL '2 days' THEN
        v_new_streak := 1;
    ELSE
        v_new_streak := COALESCE(v_current_streak, 1);
    END IF;

    -- Replenish at most one banked freeze every time a full week (7-day
    -- multiple) of streak is reached.
    IF v_new_streak > 0 AND v_new_streak % 7 = 0 THEN
        v_new_freezes := LEAST(GREATEST(v_new_freezes, 0) + 1, 1);
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
        freezes_available = v_new_freezes,
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
        'new_total_xp', v_new_total_xp,
        'freezes_available', v_new_freezes,
        'used_freeze', v_used_freeze
    );
END;
$function$
