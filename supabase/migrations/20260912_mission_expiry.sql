-- ============================================================================
-- MISSION EXPIRY (NEW FEATURE -- NOT YET APPLIED TO THE LIVE DATABASE)
-- ============================================================================
-- Missions now expire. This migration adds an `expires_at` timestamp to the
-- matchmaking row so a mission ticket can carry a real, absolute deadline.
--
-- NOT APPLIED: unlike the two migrations before it, this file has NOT been
-- run against the live Supabase project. It needs to be applied manually
-- (`supabase db push`, the SQL editor, or however this repo normally ships
-- schema changes) before the server-side column is live.
--
-- Scope kept deliberately small: this only adds the column with a sane
-- default (45 minutes from row creation, matching the mission length already
-- used client-side) so every *existing* INSERT in find_or_create_match(),
-- find_or_create_explore_match() and join_room_by_id() gets a real
-- expires_at value for free, with no changes to those functions' matching
-- logic. Those RPCs' JSON return payloads are NOT yet updated to surface
-- this column to the client -- a bigger, riskier change to three
-- concurrency-sensitive functions than this PR's scope allows. In the
-- meantime, the client computes and stores its own absolute expiry
-- timestamp (mission length x 45 minutes) the moment a mission goes active,
-- which is what actually drives the countdown/expired-state UI today.
-- Wiring this column through find_or_create_match / find_or_create_explore_match
-- / join_room_by_id's return values (and the realtime UPDATE payload, which
-- already carries it for free) is a fast, low-risk follow-up once this is
-- applied.
-- ============================================================================

ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '45 minutes');

COMMENT ON COLUMN public.matchmaking_queue.expires_at IS
  'Absolute deadline for the mission tied to this matchmaking row. Defaults to 45 minutes after the row is created. Not yet returned by find_or_create_match/find_or_create_explore_match/join_room_by_id -- see this file''s header.';
