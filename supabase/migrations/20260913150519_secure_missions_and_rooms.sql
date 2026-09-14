-- Coordinated release: deploy this migration with the assignment-aware client.
-- Old clients receive an explicit refresh error instead of an insecure fallback.
-- Existing public Feed photos remain public; new proofs use a private bucket.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.cities (
  slug text PRIMARY KEY, name text NOT NULL, timezone text NOT NULL,
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.cities VALUES ('mumbai', 'Mumbai', 'Asia/Kolkata', true);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cities TO anon, authenticated;
CREATE POLICY "Read launched cities" ON public.cities FOR SELECT USING (enabled);
ALTER TABLE public.hidden_gems ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'mumbai';
ALTER TABLE public.hidden_gems ADD CONSTRAINT hidden_gems_city_fkey FOREIGN KEY (city) REFERENCES public.cities(slug);
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS revealed_at timestamptz;
UPDATE public.matchmaking_queue SET revealed_at = updated_at WHERE current_players >= 2;
CREATE INDEX IF NOT EXISTS matchmaking_room_idx ON public.matchmaking_queue(room_id);
CREATE INDEX IF NOT EXISTS matchmaking_pool_idx ON public.matchmaking_queue(city, mode, neighborhood, created_at) WHERE status = 'waiting' AND NOT is_private;
CREATE INDEX IF NOT EXISTS participants_user_idx ON public.matchmaking_participants(user_id, queue_id);
CREATE INDEX IF NOT EXISTS messages_room_created_idx ON public.mission_messages(room_id, created_at);

CREATE TABLE public.mission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  city text NOT NULL REFERENCES public.cities(slug), track text NOT NULL CHECK(track IN ('quest','explore')),
  mode text NOT NULL CHECK(mode IN ('solo','duo','squad')), room_id text,
  quest_text text NOT NULL, rarity text NOT NULL, xp_reward integer NOT NULL CHECK(xp_reward IN (15,35,75)),
  gem jsonb, credit text, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  accepted_at timestamptz, proof_path text, result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE UNIQUE INDEX one_active_assignment_per_user ON public.mission_assignments(user_id) WHERE status = 'active';
ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mission_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_assignments TO authenticated;
CREATE POLICY "Own assignments" ON public.mission_assignments FOR SELECT TO authenticated USING(user_id = (SELECT auth.uid())::text);
ALTER TABLE public.mission_logs ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.mission_assignments(id);
ALTER TABLE public.mission_logs ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'mumbai';
ALTER TABLE public.mission_logs ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.mission_logs ADD COLUMN IF NOT EXISTS proof_path text;
CREATE UNIQUE INDEX IF NOT EXISTS mission_log_assignment_unique ON public.mission_logs(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mission_log_proof_unique ON public.mission_logs(proof_path) WHERE proof_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS mission_logs_city_created_idx ON public.mission_logs(city, created_at DESC) WHERE is_public;

CREATE FUNCTION private.require_user(p_multiplayer boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u text := auth.uid()::text;
BEGIN
  IF u IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN RAISE EXCEPTION 'Please sign in again.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE device_id=u AND is_banned) THEN RAISE EXCEPTION 'Your account has been suspended.' USING ERRCODE='42501'; END IF;
  IF p_multiplayer AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND NOT COALESCE(is_anonymous,true)) THEN RAISE EXCEPTION 'Verify your email before joining multiplayer.' USING ERRCODE='42501'; END IF;
  RETURN u;
END $$;

CREATE FUNCTION public.ensure_profile() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text := private.require_user(); p public.profiles; generated_handle text;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE device_id=u;
  IF FOUND THEN RETURN to_jsonb(p); END IF;
  -- The live baseline has duplicate legacy handles and no unique constraint.
  -- Serialize handle allocation without silently renaming existing accounts.
  PERFORM pg_advisory_xact_lock(hashtextextended('profile-handle-allocation',2));
  LOOP
    generated_handle := 'Explorer_' || substr(replace(gen_random_uuid()::text,'-',''),1,16);
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE lower(handle)=lower(generated_handle));
  END LOOP;
  INSERT INTO public.profiles(device_id,handle,streak,total_xp,time_saved_mins,badges)
  VALUES(u,generated_handle,0,0,0,ARRAY[]::text[]) ON CONFLICT(device_id) DO NOTHING;
  SELECT * INTO p FROM public.profiles WHERE device_id=u;
  RETURN to_jsonb(p);
END $$;
CREATE OR REPLACE FUNCTION public.update_user_handle(p_new_handle text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); cleaned text:=regexp_replace(trim(p_new_handle),'[^a-zA-Z0-9_]','','g');
BEGIN
  PERFORM public.ensure_profile();
  PERFORM pg_advisory_xact_lock(hashtextextended('profile-handle-allocation',2));
  IF cleaned IS NULL OR length(cleaned) NOT BETWEEN 2 AND 25 THEN RAISE EXCEPTION 'Handle must be between 2 and 25 alphanumeric characters.'; END IF;
  IF lower(cleaned)='guest' THEN RAISE EXCEPTION 'That handle is reserved — try another one.'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE device_id<>u AND lower(handle)=lower(cleaned)) THEN RAISE EXCEPTION 'That handle is already taken — try another one.'; END IF;
  UPDATE public.profiles SET handle=cleaned,updated_at=now() WHERE device_id=u;
  RETURN jsonb_build_object('success',true,'handle',cleaned);
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
REVOKE INSERT, UPDATE, DELETE ON public.mission_logs FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can insert their own mission logs" ON public.mission_logs;
DROP POLICY IF EXISTS "Allow public select on mission_logs" ON public.mission_logs;
CREATE POLICY "Visible mission logs" ON public.mission_logs FOR SELECT USING(is_public OR user_id=(SELECT auth.uid())::text OR (SELECT auth.jwt()->>'email')='sayyambtb@gmail.com');

CREATE FUNCTION private.room_member(p_room text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND NOT COALESCE(is_anonymous,true))
    AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE device_id=auth.uid()::text AND is_banned)
    AND EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.matchmaking_queue q ON q.id=p.queue_id
      WHERE p.user_id=auth.uid()::text AND q.room_id=p_room AND q.created_at>now()-interval '24 hours')
    AND NOT EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.blocked_users b
      ON (b.blocker_user_id=auth.uid()::text AND b.blocked_user_id=p.user_id) OR (b.blocked_user_id=auth.uid()::text AND b.blocker_user_id=p.user_id)
      WHERE p.room_id=p_room);
$$;
DROP POLICY IF EXISTS "Read chat messages" ON public.mission_messages;
DROP POLICY IF EXISTS "Users can send their own messages" ON public.mission_messages;
DROP POLICY IF EXISTS "Public participants read" ON public.matchmaking_participants;
REVOKE ALL ON public.mission_messages, public.matchmaking_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_messages, public.matchmaking_participants TO authenticated;
CREATE POLICY "Room chat reads" ON public.mission_messages FOR SELECT TO authenticated USING(private.room_member(room_id));
CREATE POLICY "Room roster reads" ON public.matchmaking_participants FOR SELECT TO authenticated USING(private.room_member(room_id));

CREATE FUNCTION public.send_room_message(p_room_id text,p_message text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text := private.require_user(true); m public.mission_messages;
BEGIN
  PERFORM public.ensure_profile();
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF NOT private.room_member(p_room_id) THEN RAISE EXCEPTION 'You are not a member of this room.' USING ERRCODE='42501'; END IF;
  IF p_message IS NULL OR length(trim(p_message)) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Messages must contain 1–300 characters.'; END IF;
  IF EXISTS(SELECT 1 FROM public.mission_messages WHERE sender_id=u AND created_at>clock_timestamp()-interval '3 seconds') THEN RAISE EXCEPTION 'Please wait 3 seconds before sending another message.'; END IF;
  INSERT INTO public.mission_messages(room_id,sender_id,sender_handle,message)
    SELECT p_room_id,u,handle,trim(p_message) FROM public.profiles WHERE device_id=u RETURNING * INTO m;
  RETURN to_jsonb(m);
END $$;

CREATE FUNCTION private.pick_mission(p_mode text,p_city text,p_neighborhood text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE z text; t time; q public.quests; g public.hidden_gems; rarity text:='common'; xp int:=15; roll float:=random();
BEGIN
  SELECT timezone INTO z FROM public.cities WHERE slug=p_city AND enabled;
  IF z IS NULL THEN RAISE EXCEPTION 'This city is not available yet.'; END IF;
  IF p_mode NOT IN ('solo','duo','squad') OR p_mode IS NULL THEN RAISE EXCEPTION 'Invalid mission mode.'; END IF;
  IF p_neighborhood IS NOT NULL THEN
    SELECT * INTO g FROM public.hidden_gems WHERE city=p_city AND neighborhood=p_neighborhood AND is_active AND status='approved' ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No hidden gems are available in this neighbourhood yet.'; END IF;
    RETURN jsonb_build_object('quest_text',format('📍 %s (%s) — %s',g.name,g.neighborhood,g.description),'rarity','common','xp_reward',15,'credit',g.submitted_by_handle,
      'gem',jsonb_build_object('name',g.name,'neighborhood',g.neighborhood,'description',g.description,'city',(SELECT name FROM public.cities WHERE slug=p_city)));
  END IF;
  t := (now() AT TIME ZONE z)::time;
  SELECT * INTO q FROM public.quests WHERE mode=p_mode AND is_active AND status='approved' AND city IN ('general',p_city)
    AND CASE time_window WHEN 'morning' THEN t>=time '05:00' AND t<time '09:00' WHEN 'sunset' THEN t>=time '17:30' AND t<time '19:30' WHEN 'night' THEN t>=time '19:30' OR t<time '05:00' ELSE true END
    ORDER BY random() LIMIT 1;
  IF roll>.85 THEN rarity:='legendary'; xp:=75; ELSIF roll>.60 THEN rarity:='rare'; xp:=35; END IF;
  RETURN jsonb_build_object('quest_text',COALESCE(q.quest_text,'Step outside and photograph one small detail you usually overlook.'),'rarity',rarity,'xp_reward',xp,'credit',q.submitted_by_handle);
END $$;

CREATE FUNCTION private.room_payload(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT to_jsonb(q) || jsonb_build_object('queue_id',q.id,'matched',q.revealed_at IS NOT NULL,'is_creator',q.user_id=auth.uid()::text,
    'roster',COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',p.user_id,'handle',p.handle)) FROM public.matchmaking_participants p WHERE p.queue_id=q.id),'[]'::jsonb))
  FROM public.matchmaking_queue q WHERE q.id=p_id;
$$;

CREATE FUNCTION private.join_queue(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); q public.matchmaking_queue; n int;
BEGIN
  SELECT * INTO q FROM public.matchmaking_queue WHERE id=p_id AND created_at>now()-interval '24 hours' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This room has expired.'; END IF;
  IF EXISTS(SELECT 1 FROM public.matchmaking_participants WHERE queue_id=q.id AND user_id=u) THEN RETURN private.room_payload(q.id); END IF;
  IF EXISTS(SELECT 1 FROM public.mission_assignments WHERE user_id=u AND status='active' AND expires_at>now()) THEN RAISE EXCEPTION 'Finish or leave your current mission first.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cities WHERE slug=q.city AND enabled) THEN RAISE EXCEPTION 'This city is not available yet.'; END IF;
  IF q.created_at<now()-interval '60 minutes' THEN RAISE EXCEPTION 'This invite has expired.'; END IF;
  IF EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.matchmaking_queue other ON other.id=p.queue_id WHERE p.user_id=u AND other.id<>q.id AND other.created_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'Leave your current room first.'; END IF;
  IF q.is_private AND NOT EXISTS(SELECT 1 FROM public.raid_invites WHERE room_id=q.room_id AND receiver_user_id=u AND status IN ('pending','accepted')) THEN RAISE EXCEPTION 'This invite is for someone else.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.blocked_users b ON (b.blocker_user_id=u AND b.blocked_user_id=p.user_id) OR (b.blocked_user_id=u AND b.blocker_user_id=p.user_id) WHERE p.queue_id=q.id) THEN RAISE EXCEPTION 'Unable to join this room.' USING ERRCODE='42501'; END IF;
  SELECT count(*) INTO n FROM public.matchmaking_participants WHERE queue_id=q.id;
  IF n>=q.max_players THEN RAISE EXCEPTION 'This room is full.'; END IF;
  INSERT INTO public.matchmaking_participants(queue_id,room_id,user_id,handle) SELECT q.id,q.room_id,u,handle FROM public.profiles WHERE device_id=u ON CONFLICT(queue_id,user_id) DO NOTHING;
  SELECT count(*) INTO n FROM public.matchmaking_participants WHERE queue_id=q.id;
  UPDATE public.matchmaking_queue SET current_players=n,status=CASE WHEN n>=max_players THEN 'matched' ELSE 'waiting' END,revealed_at=CASE WHEN n>=2 THEN COALESCE(revealed_at,now()) ELSE revealed_at END,updated_at=now() WHERE id=q.id;
  UPDATE public.raid_invites SET status='accepted' WHERE room_id=q.room_id AND receiver_user_id=u AND status='pending';
  RETURN private.room_payload(q.id);
END $$;

CREATE FUNCTION private.find_match(p_mode text,p_city text,p_neighborhood text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); q public.matchmaking_queue; content jsonb; cap int;
BEGIN
  PERFORM public.ensure_profile();
  IF p_mode NOT IN ('duo','squad') OR p_mode IS NULL THEN RAISE EXCEPTION 'Choose Duo or Squad.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cities WHERE slug=p_city AND enabled) THEN RAISE EXCEPTION 'This city is not available yet.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  -- Serialize creation of one pool, so two simultaneous first callers meet.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_city||':'||p_mode||':'||COALESCE(p_neighborhood,'quest'),1));
  SELECT r.* INTO q FROM public.matchmaking_queue r JOIN public.matchmaking_participants p ON p.queue_id=r.id WHERE p.user_id=u AND r.created_at>now()-interval '24 hours' LIMIT 1;
  IF FOUND THEN
    IF q.city=p_city AND q.mode=p_mode AND q.neighborhood IS NOT DISTINCT FROM p_neighborhood AND NOT q.is_private THEN RETURN private.room_payload(q.id); END IF;
    RAISE EXCEPTION 'Leave your current room first.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.mission_assignments WHERE user_id=u AND status='active' AND expires_at>now()) THEN RAISE EXCEPTION 'Finish or leave your current mission first.'; END IF;
  SELECT r.* INTO q FROM public.matchmaking_queue r WHERE r.city=p_city AND r.mode=p_mode AND r.neighborhood IS NOT DISTINCT FROM p_neighborhood AND NOT r.is_private AND r.status='waiting' AND r.current_players<r.max_players AND r.created_at>now()-interval '5 minutes'
    AND NOT EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.blocked_users b ON (b.blocker_user_id=u AND b.blocked_user_id=p.user_id) OR (b.blocked_user_id=u AND b.blocker_user_id=p.user_id) WHERE p.queue_id=r.id)
    ORDER BY r.created_at LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN private.join_queue(q.id); END IF;
  content:=private.pick_mission(p_mode,p_city,p_neighborhood); cap:=CASE WHEN p_mode='squad' THEN 8 ELSE 2 END;
  INSERT INTO public.matchmaking_queue(user_id,handle,mode,city,room_id,quest_text,rarity,xp_reward,current_players,max_players,neighborhood,gem_name,gem_description,gem_submitted_by)
    SELECT u,handle,p_mode,p_city,'room_'||replace(gen_random_uuid()::text,'-',''),content->>'quest_text',content->>'rarity',(content->>'xp_reward')::int,1,cap,p_neighborhood,content->'gem'->>'name',content->'gem'->>'description',content->>'credit' FROM public.profiles WHERE device_id=u RETURNING * INTO q;
  INSERT INTO public.matchmaking_participants(queue_id,room_id,user_id,handle) VALUES(q.id,q.room_id,u,q.handle);
  RETURN private.room_payload(q.id);
END $$;

CREATE OR REPLACE FUNCTION public.find_or_create_match(p_user_id text,p_mode text,p_handle text,p_city text DEFAULT 'mumbai') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF p_user_id IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF; RETURN private.find_match(p_mode,p_city,NULL); END $$;
-- Keep the existing Explore API; the new city-aware entry point is separate.
CREATE OR REPLACE FUNCTION public.find_or_create_explore_match(p_user_id text,p_mode text,p_handle text,p_neighborhood text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF p_user_id IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF; IF p_neighborhood IS NULL OR trim(p_neighborhood)='' THEN RAISE EXCEPTION 'Choose a neighbourhood.'; END IF; RETURN private.find_match(p_mode,'mumbai',p_neighborhood); END $$;
CREATE FUNCTION public.find_explore_match(p_mode text,p_city text,p_neighborhood text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF p_neighborhood IS NULL OR trim(p_neighborhood)='' THEN RAISE EXCEPTION 'Choose a neighbourhood.'; END IF; RETURN private.find_match(p_mode,p_city,p_neighborhood); END $$;
CREATE OR REPLACE FUNCTION public.join_room_by_id(p_room_id text,p_user_id text,p_handle text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q uuid; u text:=private.require_user(true);
BEGIN
  IF p_user_id IS DISTINCT FROM u THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  SELECT id INTO q FROM public.matchmaking_queue WHERE room_id=p_room_id LIMIT 1;
  RETURN private.join_queue(q);
END $$;

CREATE OR REPLACE FUNCTION public.leave_match_queue(p_queue_id uuid,p_user_id text,p_is_creator boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=auth.uid()::text; q public.matchmaking_queue; n int;
BEGIN
  IF u IS NULL OR u IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  SELECT * INTO q FROM public.matchmaking_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM public.matchmaking_participants WHERE queue_id=q.id AND user_id=u;
  IF NOT FOUND THEN RETURN; END IF; -- Outsiders/retries cannot change counts.
  UPDATE public.mission_assignments SET status='cancelled' WHERE user_id=u AND room_id=q.room_id AND status='active';
  UPDATE public.raid_invites SET status='declined' WHERE room_id=q.room_id AND status='pending' AND (sender_user_id=u OR receiver_user_id=u);
  SELECT count(*) INTO n FROM public.matchmaking_participants WHERE queue_id=q.id;
  IF n=0 THEN
    DELETE FROM public.matchmaking_queue WHERE id=q.id;
  ELSE
    UPDATE public.matchmaking_queue SET current_players=n,
      user_id=CASE WHEN user_id=u THEN (SELECT user_id FROM public.matchmaking_participants WHERE queue_id=q.id ORDER BY created_at LIMIT 1) ELSE user_id END,
      handle=CASE WHEN user_id=u THEN (SELECT handle FROM public.matchmaking_participants WHERE queue_id=q.id ORDER BY created_at LIMIT 1) ELSE handle END,
      status=CASE WHEN n>=max_players THEN 'matched' ELSE 'waiting' END,updated_at=now() WHERE id=q.id;
  END IF;
END $$;
DROP POLICY IF EXISTS "Participants can see their own queue entry" ON public.matchmaking_queue;
REVOKE ALL ON public.matchmaking_queue FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.matchmaking_queue TO authenticated;
CREATE POLICY "Room queue reads" ON public.matchmaking_queue FOR SELECT TO authenticated USING(private.room_member(room_id));
REVOKE INSERT,UPDATE,DELETE ON public.raid_invites FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.send_raid_invite(p_friend_user_id text,p_city text DEFAULT 'mumbai',p_neighborhood text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); c jsonb; q public.matchmaking_queue;
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF p_friend_user_id=u OR NOT EXISTS(SELECT 1 FROM auth.users a WHERE a.id::text=p_friend_user_id AND a.email_confirmed_at IS NOT NULL AND NOT COALESCE(a.is_anonymous,true)) THEN RAISE EXCEPTION 'This friend needs to verify their email first.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.friends WHERE (user_id=u AND friend_user_id=p_friend_user_id) OR (friend_user_id=u AND user_id=p_friend_user_id)) THEN RAISE EXCEPTION 'Add this explorer to your squad first.'; END IF;
  IF EXISTS(SELECT 1 FROM public.blocked_users WHERE (blocker_user_id=u AND blocked_user_id=p_friend_user_id) OR (blocker_user_id=p_friend_user_id AND blocked_user_id=u)) THEN RAISE EXCEPTION 'Unable to invite this explorer.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.matchmaking_queue r ON r.id=p.queue_id WHERE p.user_id=u AND r.created_at>now()-interval '24 hours') OR EXISTS(SELECT 1 FROM public.mission_assignments WHERE user_id=u AND status='active' AND expires_at>now()) THEN RAISE EXCEPTION 'Finish or leave your current mission first.'; END IF;
  c:=private.pick_mission('duo',p_city,p_neighborhood);
  INSERT INTO public.matchmaking_queue(user_id,handle,mode,city,room_id,quest_text,rarity,xp_reward,current_players,max_players,is_private,neighborhood,gem_name,gem_description,gem_submitted_by)
    SELECT u,handle,'duo',p_city,'room_'||replace(gen_random_uuid()::text,'-',''),c->>'quest_text',c->>'rarity',(c->>'xp_reward')::int,1,2,true,p_neighborhood,c->'gem'->>'name',c->'gem'->>'description',c->>'credit' FROM public.profiles WHERE device_id=u RETURNING * INTO q;
  INSERT INTO public.matchmaking_participants(queue_id,room_id,user_id,handle) VALUES(q.id,q.room_id,u,q.handle);
  INSERT INTO public.raid_invites(sender_user_id,sender_handle,receiver_user_id,room_id,quest_text) VALUES(u,q.handle,p_friend_user_id,q.room_id,q.quest_text);
  RETURN private.room_payload(q.id);
END $$;
CREATE FUNCTION public.respond_to_raid_invite(p_invite_id uuid,p_accept boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); i public.raid_invites; q uuid;
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  SELECT * INTO i FROM public.raid_invites WHERE id=p_invite_id AND receiver_user_id=u;
  IF NOT FOUND OR i.status='declined' THEN RAISE EXCEPTION 'This invite is no longer available.'; END IF;
  IF NOT p_accept THEN UPDATE public.raid_invites SET status='declined' WHERE id=i.id; RETURN jsonb_build_object('declined',true); END IF;
  SELECT id INTO q FROM public.matchmaking_queue WHERE room_id=i.room_id LIMIT 1;
  RETURN private.join_queue(q);
END $$;

CREATE OR REPLACE FUNCTION public.reroll_shared_quest(p_queue_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); q public.matchmaking_queue; c jsonb;
BEGIN
  SELECT * INTO q FROM public.matchmaking_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND OR NOT private.room_member(q.room_id) THEN RAISE EXCEPTION 'You are not a member of this room.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.mission_assignments WHERE room_id=q.room_id AND accepted_at IS NOT NULL AND status IN ('active','completed')) THEN RAISE EXCEPTION 'Someone has accepted this mission. Leave the room to start another.'; END IF;
  c:=private.pick_mission(q.mode,q.city,q.neighborhood);
  UPDATE public.matchmaking_queue SET quest_text=c->>'quest_text',rarity=c->>'rarity',xp_reward=(c->>'xp_reward')::int,gem_name=c->'gem'->>'name',gem_description=c->'gem'->>'description',gem_submitted_by=c->>'credit',updated_at=now() WHERE id=q.id;
  RETURN c||jsonb_build_object('success',true,'gem_name',c->'gem'->>'name','gem_description',c->'gem'->>'description','neighborhood',q.neighborhood);
END $$;

CREATE FUNCTION public.start_solo_mission(p_track text DEFAULT 'quest',p_city text DEFAULT 'mumbai',p_neighborhood text DEFAULT NULL,p_reroll boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); c jsonb; a public.mission_assignments;
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF p_track IS NULL OR p_track NOT IN ('quest','explore') THEN RAISE EXCEPTION 'Invalid mission track.'; END IF;
  IF p_track='explore' AND (p_neighborhood IS NULL OR trim(p_neighborhood)='') THEN RAISE EXCEPTION 'Choose a neighbourhood.'; END IF;
  IF EXISTS(SELECT 1 FROM public.matchmaking_participants p JOIN public.matchmaking_queue q ON q.id=p.queue_id WHERE p.user_id=u AND q.created_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'Leave your current room first.'; END IF;
  UPDATE public.mission_assignments SET status='cancelled' WHERE user_id=u AND status='active' AND expires_at<=now();
  SELECT * INTO a FROM public.mission_assignments WHERE user_id=u AND status='active';
  IF FOUND THEN
    IF NOT p_reroll THEN RETURN to_jsonb(a); END IF;
    IF a.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Leave your accepted mission before starting another.'; END IF;
    UPDATE public.mission_assignments SET status='cancelled' WHERE id=a.id;
  END IF;
  c:=private.pick_mission('solo',p_city,CASE WHEN p_track='explore' THEN p_neighborhood ELSE NULL END);
  INSERT INTO public.mission_assignments(user_id,city,track,mode,quest_text,rarity,xp_reward,gem,credit)
    VALUES(u,p_city,p_track,'solo',c->>'quest_text',c->>'rarity',(c->>'xp_reward')::int,c->'gem',c->>'credit') RETURNING * INTO a;
  RETURN to_jsonb(a);
END $$;
CREATE FUNCTION public.accept_assignment(p_assignment_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); a public.mission_assignments;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  UPDATE public.mission_assignments SET accepted_at=COALESCE(accepted_at,now()) WHERE id=p_assignment_id AND user_id=u AND status='active' AND expires_at>now() RETURNING * INTO a;
  IF NOT FOUND THEN RAISE EXCEPTION 'This mission has expired. Start a new one.'; END IF;
  RETURN to_jsonb(a);
END $$;
CREATE FUNCTION public.accept_room_mission(p_room_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true); q public.matchmaking_queue; a public.mission_assignments;
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  SELECT * INTO q FROM public.matchmaking_queue WHERE room_id=p_room_id LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR NOT private.room_member(p_room_id) THEN RAISE EXCEPTION 'You are not a member of this room.' USING ERRCODE='42501'; END IF;
  IF q.revealed_at IS NULL THEN RAISE EXCEPTION 'Wait for your partner to join.'; END IF;
  UPDATE public.mission_assignments SET status='cancelled' WHERE user_id=u AND status='active' AND expires_at<=now();
  SELECT * INTO a FROM public.mission_assignments WHERE user_id=u AND room_id=p_room_id AND status IN ('active','completed') LIMIT 1;
  IF FOUND THEN
    IF a.status='completed' THEN RAISE EXCEPTION 'You have already completed this room mission.'; END IF;
    RETURN to_jsonb(a);
  END IF;
  IF EXISTS(SELECT 1 FROM public.mission_assignments WHERE user_id=u AND status='active') THEN RAISE EXCEPTION 'Leave your current mission first.'; END IF;
  INSERT INTO public.mission_assignments(user_id,city,track,mode,room_id,quest_text,rarity,xp_reward,gem,credit,accepted_at,expires_at)
    VALUES(u,q.city,CASE WHEN q.neighborhood IS NULL THEN 'quest' ELSE 'explore' END,q.mode,q.room_id,q.quest_text,q.rarity,q.xp_reward,
    CASE WHEN q.neighborhood IS NOT NULL THEN jsonb_build_object('name',q.gem_name,'neighborhood',q.neighborhood,'description',q.gem_description,'city',(SELECT name FROM public.cities WHERE slug=q.city)) END,q.gem_submitted_by,now(),q.created_at+interval '24 hours') RETURNING * INTO a;
  RETURN to_jsonb(a);
END $$;
CREATE FUNCTION public.get_active_mission() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); a public.mission_assignments; q uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  UPDATE public.mission_assignments SET status='cancelled' WHERE user_id=u AND status='active' AND expires_at<=now();
  SELECT * INTO a FROM public.mission_assignments WHERE user_id=u AND status='active';
  SELECT r.id INTO q FROM public.matchmaking_queue r JOIN public.matchmaking_participants p ON p.queue_id=r.id WHERE p.user_id=u AND r.created_at>now()-interval '24 hours' LIMIT 1;
  RETURN jsonb_build_object('assignment',CASE WHEN a.id IS NOT NULL THEN to_jsonb(a) END,'room',CASE WHEN q IS NOT NULL AND private.room_member((SELECT room_id FROM public.matchmaking_queue WHERE id=q)) THEN private.room_payload(q) END);
END $$;
CREATE FUNCTION public.cancel_active_mission() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=auth.uid()::text; q record;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Please sign in again.' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  UPDATE public.mission_assignments SET status='cancelled' WHERE user_id=u AND status='active';
  FOR q IN SELECT queue_id FROM public.matchmaking_participants WHERE user_id=u LOOP
    PERFORM public.leave_match_queue(q.queue_id,u,false);
  END LOOP;
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('MissionProofs','MissionProofs',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE FUNCTION private.valid_proof(p_assignment_id uuid,p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_path IS NOT NULL AND EXISTS(SELECT 1 FROM public.mission_assignments a JOIN storage.objects o ON o.bucket_id='MissionProofs' AND o.name=p_path
    WHERE a.id=p_assignment_id AND a.user_id=auth.uid()::text AND o.owner_id=a.user_id
      AND (storage.foldername(p_path))[1]=a.user_id AND (storage.foldername(p_path))[2]=a.id::text);
$$;
CREATE FUNCTION public.attach_mission_proof(p_assignment_id uuid,p_photo_path text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); a public.mission_assignments;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF NOT private.valid_proof(p_assignment_id,p_photo_path) THEN RAISE EXCEPTION 'Upload a photo for this mission first.'; END IF;
  UPDATE public.mission_assignments SET proof_path=p_photo_path WHERE id=p_assignment_id AND user_id=u AND status='active' AND accepted_at IS NOT NULL AND expires_at>now() RETURNING * INTO a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Accept a current mission before adding a photo.'; END IF;
  RETURN to_jsonb(a);
END $$;
CREATE FUNCTION public.complete_assigned_mission(p_assignment_id uuid,p_photo_path text,p_is_public boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(); a public.mission_assignments; p public.profiles; last_day date; today date; tz text; s int; b text[]; v_result jsonb; q uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  SELECT * INTO a FROM public.mission_assignments WHERE id=p_assignment_id AND user_id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This mission does not belong to your account.' USING ERRCODE='42501'; END IF;
  IF a.status='completed' THEN RETURN a.result; END IF;
  IF a.status<>'active' OR a.accepted_at IS NULL OR a.expires_at<=now() THEN RAISE EXCEPTION 'Accept a current mission before completing it.'; END IF;
  IF NOT private.valid_proof(a.id,p_photo_path) OR a.proof_path IS DISTINCT FROM p_photo_path THEN RAISE EXCEPTION 'Attach your photo to this mission first.'; END IF;
  IF a.mode<>'solo' AND NOT private.room_member(a.room_id) THEN RAISE EXCEPTION 'You have left this mission room.' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.profiles WHERE device_id=u FOR UPDATE;
  SELECT timezone INTO tz FROM public.cities WHERE slug=a.city;
  today:=(now() AT TIME ZONE tz)::date;
  SELECT max((created_at AT TIME ZONE tz)::date) INTO last_day FROM public.mission_logs WHERE user_id=u;
  s:=CASE WHEN last_day=today THEN GREATEST(COALESCE(p.streak,0),1) WHEN last_day=today-1 THEN COALESCE(p.streak,0)+1 ELSE 1 END;
  b:=COALESCE(p.badges,ARRAY[]::text[]);
  IF NOT ('🌱 First Step'=ANY(b)) THEN b:=array_append(b,'🌱 First Step'); END IF;
  IF s>=3 AND NOT ('🔥 Warm Up'=ANY(b)) THEN b:=array_append(b,'🔥 Warm Up'); END IF;
  IF s>=7 AND NOT ('⚡ Week Warrior'=ANY(b)) THEN b:=array_append(b,'⚡ Week Warrior'); END IF;
  IF s>=30 AND NOT ('👑 Loop Breaker'=ANY(b)) THEN b:=array_append(b,'👑 Loop Breaker'); END IF;
  INSERT INTO public.mission_logs(user_id,mode,quest_text,photo_url,xp_earned,assignment_id,city,is_public,proof_path)
    VALUES(u,a.mode,a.quest_text,NULL,a.xp_reward,a.id,a.city,COALESCE(p_is_public,false),p_photo_path);
  -- XP is a reward, not a measurement of time spent away from the phone.
  UPDATE public.profiles SET total_xp=COALESCE(total_xp,0)+a.xp_reward,streak=s,badges=b,updated_at=now() WHERE device_id=u RETURNING * INTO p;
  v_result:=jsonb_build_object('success',true,'user_id',u,'handle',p.handle,'xp_earned',a.xp_reward,'new_total_xp',p.total_xp,'new_streak',s,'badges',b,'new_saved_mins',p.time_saved_mins);
  UPDATE public.mission_assignments SET status='completed',result=v_result WHERE id=a.id;
  SELECT id INTO q FROM public.matchmaking_queue WHERE room_id=a.room_id LIMIT 1;
  IF q IS NOT NULL THEN PERFORM public.leave_match_queue(q,u,false); END IF;
  RETURN v_result;
END $$;
CREATE OR REPLACE FUNCTION public.complete_mission(p_quest_text text,p_photo_url text,p_mode text,p_xp_earned integer DEFAULT 15) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Please refresh Break The Loop to use secure mission completion.'; END $$;

-- Storage deletions use the Storage API. The durable queue survives failed
-- requests so the owner or admin can retry without losing the object path.
CREATE TABLE public.proof_cleanup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  bucket text NOT NULL CHECK(bucket IN ('Proofs','MissionProofs')), path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bucket,path)
);
ALTER TABLE public.proof_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.proof_cleanup FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.proof_cleanup TO authenticated;
CREATE POLICY "Own pending proof deletion" ON public.proof_cleanup FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid())::text OR (SELECT auth.jwt()->>'email')='sayyambtb@gmail.com');
CREATE FUNCTION private.enqueue_deleted_proof() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p text;
BEGIN
  IF OLD.proof_path IS NOT NULL THEN
    INSERT INTO public.proof_cleanup(user_id,bucket,path) VALUES(OLD.user_id,'MissionProofs',OLD.proof_path) ON CONFLICT DO NOTHING;
  ELSIF OLD.photo_url LIKE 'https://vopavevysovvucmhkvkr.supabase.co/storage/v1/object/public/Proofs/%' THEN
    p:=split_part(OLD.photo_url,'/storage/v1/object/public/Proofs/',2);
    INSERT INTO public.proof_cleanup(user_id,bucket,path) VALUES(OLD.user_id,'Proofs',p) ON CONFLICT DO NOTHING;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER enqueue_deleted_proof BEFORE DELETE ON public.mission_logs FOR EACH ROW EXECUTE FUNCTION private.enqueue_deleted_proof();
CREATE FUNCTION private.enqueue_unused_proof() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF OLD.proof_path IS NOT NULL AND (NEW.status='cancelled' OR OLD.proof_path IS DISTINCT FROM NEW.proof_path) THEN
    INSERT INTO public.proof_cleanup(user_id,bucket,path) VALUES(OLD.user_id,'MissionProofs',OLD.proof_path) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enqueue_unused_proof AFTER UPDATE ON public.mission_assignments FOR EACH ROW EXECUTE FUNCTION private.enqueue_unused_proof();
CREATE FUNCTION private.proof_readable(p_bucket text,p_path text,p_owner text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_owner=auth.uid()::text OR auth.jwt()->>'email'='sayyambtb@gmail.com'
 OR EXISTS(SELECT 1 FROM public.mission_logs WHERE proof_path=p_path AND is_public AND p_bucket='MissionProofs')
 OR EXISTS(SELECT 1 FROM public.proof_cleanup WHERE bucket=p_bucket AND path=p_path AND user_id=auth.uid()::text);
$$;
CREATE FUNCTION private.proof_uploadable(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.mission_assignments a WHERE a.user_id=auth.uid()::text AND a.id::text=(storage.foldername(p_path))[2]
   AND (storage.foldername(p_path))[1]=a.user_id AND a.status='active' AND a.accepted_at IS NOT NULL AND a.expires_at>now())
 AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE device_id=auth.uid()::text AND is_banned);
$$;
CREATE FUNCTION private.proof_deletable(p_bucket text,p_path text,p_owner text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (p_owner=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.mission_logs WHERE proof_path=p_path AND p_bucket='MissionProofs'))
 OR EXISTS(SELECT 1 FROM public.proof_cleanup WHERE bucket=p_bucket AND path=p_path AND (user_id=auth.uid()::text OR auth.jwt()->>'email'='sayyambtb@gmail.com'));
$$;
-- Restrictive policies also constrain any pre-existing broad bucket policies.
CREATE POLICY "Protect mission proof reads" ON storage.objects AS RESTRICTIVE FOR SELECT USING(bucket_id<>'MissionProofs' OR private.proof_readable(bucket_id,name,owner_id));
CREATE POLICY "Protect mission proof inserts" ON storage.objects AS RESTRICTIVE FOR INSERT WITH CHECK(bucket_id NOT IN ('Proofs','MissionProofs') OR (bucket_id='MissionProofs' AND private.proof_uploadable(name)));
CREATE POLICY "Protect immutable mission proofs" ON storage.objects AS RESTRICTIVE FOR UPDATE USING(bucket_id NOT IN ('Proofs','MissionProofs')) WITH CHECK(bucket_id NOT IN ('Proofs','MissionProofs'));
CREATE POLICY "Protect mission proof deletions" ON storage.objects AS RESTRICTIVE FOR DELETE USING(bucket_id NOT IN ('Proofs','MissionProofs') OR private.proof_deletable(bucket_id,name,owner_id));
CREATE POLICY "Read mission proofs" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='MissionProofs' AND private.proof_readable(bucket_id,name,owner_id));
CREATE POLICY "Read proof cleanup targets" ON storage.objects FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.proof_cleanup WHERE bucket=bucket_id AND path=name));
CREATE POLICY "Upload own mission proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='MissionProofs' AND private.proof_uploadable(name));
CREATE POLICY "Remove unused mission proofs" ON storage.objects FOR DELETE TO authenticated USING(bucket_id IN ('Proofs','MissionProofs') AND private.proof_deletable(bucket_id,name,owner_id));
CREATE FUNCTION public.acknowledge_proof_cleanup(p_cleanup_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  DELETE FROM public.proof_cleanup c WHERE c.id=p_cleanup_id AND (c.user_id=auth.uid()::text OR auth.jwt()->>'email'='sayyambtb@gmail.com')
  AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path);
END $$;

CREATE FUNCTION public.add_squad_friend(p_friend_user_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user(true);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF p_friend_user_id=u OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE device_id=p_friend_user_id AND NOT is_banned) THEN RAISE EXCEPTION 'This explorer is not available.'; END IF;
  IF EXISTS(SELECT 1 FROM public.blocked_users WHERE (blocker_user_id=u AND blocked_user_id=p_friend_user_id) OR (blocker_user_id=p_friend_user_id AND blocked_user_id=u)) THEN RAISE EXCEPTION 'Unable to add this explorer.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.friends WHERE (user_id=u AND friend_user_id=p_friend_user_id) OR (friend_user_id=u AND user_id=p_friend_user_id)) THEN
    INSERT INTO public.friends(user_id,friend_user_id) VALUES(u,p_friend_user_id);
  END IF;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.friends FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.react_to_mission(p_log_id uuid,p_reaction text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user();
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF p_reaction IS NULL OR p_reaction NOT IN ('fire','five') THEN RAISE EXCEPTION 'Invalid reaction.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.mission_logs WHERE id=p_log_id AND is_public) THEN RAISE EXCEPTION 'This post is no longer available.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.feed_reactions WHERE log_id=p_log_id AND user_id=u AND reaction_type=p_reaction) THEN
    INSERT INTO public.feed_reactions(log_id,user_id,user_handle,reaction_type) SELECT p_log_id,u,handle,p_reaction FROM public.profiles WHERE device_id=u;
  END IF;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.feed_reactions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.report_content(p_type text,p_target_id text,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u text:=private.require_user();
BEGIN
  PERFORM public.ensure_profile(); PERFORM pg_advisory_xact_lock(hashtextextended(u,0));
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Please enter a reason (up to 2,000 characters).'; END IF;
  IF NOT ((p_type='feed' AND EXISTS(SELECT 1 FROM public.mission_logs WHERE id::text=p_target_id AND is_public))
    OR (p_type='chat' AND EXISTS(SELECT 1 FROM public.mission_messages WHERE id::text=p_target_id AND private.room_member(room_id)))) THEN RAISE EXCEPTION 'This content is no longer available.'; END IF;
  IF EXISTS(SELECT 1 FROM public.reports WHERE reporter_handle=(SELECT handle FROM public.profiles WHERE device_id=u) AND created_at>now()-interval '10 seconds') THEN RAISE EXCEPTION 'Please wait a moment before sending another report.'; END IF;
  INSERT INTO public.reports(reporter_handle,reported_type,target_id,reason) SELECT handle,p_type,p_target_id,trim(p_reason) FROM public.profiles WHERE device_id=u;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.reports FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.get_explorer_public_profile(p_handle text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles; history jsonb;
BEGIN
 IF (SELECT count(*) FROM public.profiles WHERE lower(handle)=lower(p_handle))<>1 THEN RETURN jsonb_build_object('found',false); END IF;
 SELECT * INTO p FROM public.profiles WHERE lower(handle)=lower(p_handle);
 IF NOT FOUND THEN RETURN jsonb_build_object('found',false); END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC),'[]'::jsonb) INTO history
 FROM (SELECT id,mode,quest_text,photo_url,proof_path,created_at FROM public.mission_logs WHERE user_id=p.device_id AND is_public ORDER BY created_at DESC LIMIT 15) l;
 RETURN jsonb_build_object('found',true,'handle',p.handle,'streak',p.streak,'time_saved_mins',p.time_saved_mins,'total_xp',p.total_xp,'badges',p.badges,'member_since',p.created_at,'history',history);
END $$;
CREATE OR REPLACE FUNCTION public.purge_stale_match_rows() RETURNS void LANGUAGE sql SET search_path='' AS $$
  DELETE FROM public.mission_messages m WHERE NOT EXISTS(SELECT 1 FROM public.matchmaking_queue q WHERE q.room_id=m.room_id AND q.created_at>now()-interval '24 hours');
  DELETE FROM public.matchmaking_participants p WHERE NOT EXISTS(SELECT 1 FROM public.matchmaking_queue q WHERE q.id=p.queue_id AND q.created_at>now()-interval '24 hours');
  DELETE FROM public.matchmaking_queue WHERE created_at<=now()-interval '24 hours';
  UPDATE public.mission_assignments SET status='cancelled' WHERE status='active' AND expires_at<=now();
$$;

REVOKE ALL ON public.cities FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cities TO anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
-- Only predicates needed by RLS are callable by clients; mutating helpers are not.
GRANT EXECUTE ON FUNCTION private.room_member(text),private.proof_readable(text,text,text),private.proof_uploadable(text),private.proof_deletable(text,text,text) TO authenticated;
-- Anon may evaluate restrictive predicates while accessing legacy public media;
-- these predicates reveal only a boolean, and never grant anonymous ownership.
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.proof_readable(text,text,text),private.proof_uploadable(text),private.proof_deletable(text,text,text) TO anon;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN
  ('ensure_profile','update_user_handle','find_or_create_match','find_or_create_explore_match','find_explore_match','join_room_by_id','leave_match_queue','send_room_message','send_raid_invite','respond_to_raid_invite','reroll_shared_quest','start_solo_mission','accept_assignment','accept_room_mission','get_active_mission','cancel_active_mission','attach_mission_proof','complete_assigned_mission','complete_mission','acknowledge_proof_cleanup','add_squad_friend','react_to_mission','report_content') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.purge_stale_match_rows() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_match_rows() TO service_role;
COMMIT;
