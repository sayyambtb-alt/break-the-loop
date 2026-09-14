import { createFixture } from './fixture.mjs';
import assert from 'node:assert/strict';
const db = await createFixture().catch(error => { console.error(error.message); process.exit(1); });
const u = '11111111-1111-4111-8111-111111111111';
const v = '22222222-2222-4222-8222-222222222222';
const stranger = '33333333-3333-4333-8333-333333333333';
const guest = '44444444-4444-4444-8444-444444444444';
const as = async (id,fn) => {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify(id?{sub:id,role:'authenticated',email:id+'@example.test'}:{role:'anon'})]);
  await db.exec(`SET ROLE ${id?'authenticated':'anon'}`);
  try { return await fn(); } finally { await db.exec('RESET ROLE'); }
};
const rpc = async (name,args=[]) => (await db.query(`SELECT public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args)).rows[0].result;
let count = 0;
const test = async (name,fn) => { await fn(); count++; process.stdout.write(`✓ ${name}\n`); };
try {
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous) VALUES($1,'one@example.test',now(),false),($2,'two@example.test',now(),false),($3,'three@example.test',now(),false),($4,NULL,NULL,true)",[u,v,stranger,guest]);
  await db.exec("INSERT INTO quests(mode,quest_text,city) VALUES('solo','Solo detail','general'),('duo','Duo detail','general'),('squad','Squad detail','general'); INSERT INTO hidden_gems(name,neighborhood,description,status,is_active) VALUES('Local place','Fort','A local detail','approved',true);");
  for (const id of [u,v,stranger,guest]) await as(id,()=>rpc('ensure_profile'));
  await test('guest profiles are unique and start at zero XP',async()=>{
    const rows=(await db.query('SELECT handle,total_xp FROM profiles')).rows;
    assert.equal(new Set(rows.map(p=>p.handle)).size,4); assert(rows.every(p=>p.total_xp===0));
  });
  await test('handles cannot impersonate another explorer, including changes in letter case',async()=>{
    await as(u,()=>rpc('update_user_handle',['CityWalker']));
    await as(v,()=>assert.rejects(rpc('update_user_handle',['citywalker']),/already taken/));
    await as(u,()=>rpc('update_user_handle',['CITYWALKER']));
    await as(u,()=>assert.rejects(rpc('update_user_handle',[null]),/between 2 and 25/));
    assert.equal((await as(v,()=>rpc('get_explorer_public_profile',['citywalker']))).handle,'CITYWALKER');
  });
  await test('clients cannot forge profile rewards or mission logs',async()=>{
    await as(u,async()=>{
      await assert.rejects(db.query('UPDATE profiles SET total_xp=999999 WHERE device_id=$1',[u]),/permission denied/);
      await assert.rejects(db.query("INSERT INTO mission_logs(user_id,mode,quest_text,xp_earned) VALUES($1,'solo','fake',999999)",[u]),/permission denied/);
      await assert.rejects(rpc('complete_mission',['fake',null,'solo',999999]),/refresh/);
    });
  });
  await test('anonymous and guest callers cannot enter multiplayer',async()=>{
    await as(null,()=>assert.rejects(rpc('find_or_create_match',[u,'duo','fake','mumbai']),/permission denied/));
    await as(guest,()=>assert.rejects(rpc('find_or_create_match',[guest,'duo','fake','mumbai']),/Verify your email/));
  });
  let room;
  await test('server assigns the room handle; outsiders cannot read chat or roster',async()=>{
    room=await as(u,()=>rpc('find_or_create_match',[u,'duo','fake','mumbai']));
    assert.notEqual(room.handle,'fake');
    await as(u,()=>rpc('send_room_message',[room.room_id,'Hello partner']));
    await as(stranger,async()=>{
      assert.equal((await db.query('SELECT * FROM mission_messages')).rows.length,0);
      assert.equal((await db.query('SELECT * FROM matchmaking_participants')).rows.length,0);
      await assert.rejects(rpc('send_room_message',[room.room_id,'intrusion']),/not a member/);
      await assert.rejects(db.query("INSERT INTO mission_messages(room_id,sender_id,sender_handle,message) VALUES($1,$2,'fake','intrusion')",[room.room_id,stranger]),/permission denied/);
    });
    await as(null,()=>assert.rejects(db.query('SELECT * FROM mission_messages'),/permission denied/));
  });
  await test('outsider leave and repeated leave do not corrupt occupancy',async()=>{
    await as(stranger,()=>rpc('leave_match_queue',[room.queue_id,stranger,true]));
    assert.equal((await db.query('SELECT current_players FROM matchmaking_queue WHERE id=$1',[room.queue_id])).rows[0].current_players,1);
    const joined=await as(v,()=>rpc('find_or_create_match',[v,'duo','fake','mumbai']));
    assert.equal(joined.room_id,room.room_id); assert.equal(joined.current_players,2);
    await as(v,()=>rpc('leave_match_queue',[room.queue_id,v,true]));
    await as(v,()=>rpc('leave_match_queue',[room.queue_id,v,true]));
    assert.equal((await db.query('SELECT current_players FROM matchmaking_queue WHERE id=$1',[room.queue_id])).rows[0].current_players,1);
  });
  await test('Quest and Explore queues never cross',async()=>{
    const explore=await as(v,()=>rpc('find_explore_match',['duo','mumbai','Fort']));
    assert.notEqual(explore.room_id,room.room_id);
    await as(v,()=>rpc('cancel_active_mission'));
    await as(u,()=>rpc('cancel_active_mission'));
    await as(v,()=>assert.rejects(rpc('find_explore_match',['duo','delhi','Fort']),/not available/));
  });
  let assignment, path;
  await test('mission assignment survives reload and completion requires acceptance and owned proof',async()=>{
    assignment=await as(guest,()=>rpc('start_solo_mission',['quest','mumbai',null,false]));
    const resume=await as(guest,()=>rpc('get_active_mission'));
    assert.equal(resume.assignment.id,assignment.id);
    await as(guest,()=>assert.rejects(rpc('complete_assigned_mission',[assignment.id,null,false]),/Accept a current/));
    await as(guest,()=>rpc('accept_assignment',[assignment.id]));
    await as(guest,()=>assert.rejects(rpc('attach_mission_proof',[assignment.id,'fake/photo.jpg']),/Upload a photo/));
    path=`${guest}/${assignment.id}/photo.jpg`;
    await as(stranger,()=>assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('MissionProofs',$1,$2)",[path,stranger]),/row-level security/));
    await as(guest,()=>db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('MissionProofs',$1,$2)",[path,guest]));
    await as(guest,()=>rpc('attach_mission_proof',[assignment.id,path]));
  });
  await test('completion retries award once, use server XP, and keep proof private by default',async()=>{
    const first=await as(guest,()=>rpc('complete_assigned_mission',[assignment.id,path,false]));
    const retry=await as(guest,()=>rpc('complete_assigned_mission',[assignment.id,path,true]));
    assert.deepEqual(first,retry); assert.equal(first.xp_earned,assignment.xp_reward);
    assert.equal(first.new_total_xp,assignment.xp_reward);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM mission_logs WHERE assignment_id=$1',[assignment.id])).rows[0].n,1);
    await as(stranger,async()=>{
      assert.equal((await db.query('SELECT * FROM mission_logs')).rows.length,0);
      assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='MissionProofs'")).rows.length,0);
      await assert.rejects(rpc('complete_assigned_mission',[assignment.id,path,true]),/does not belong/);
    });
  });
  await test('private helpers cannot bypass public RPC validation',async()=>{
    await as(u,()=>assert.rejects(db.query("SELECT private.pick_mission('solo','mumbai',NULL)"),/permission denied/));
    await as(u,()=>assert.rejects(db.query('UPDATE cities SET enabled=true'),/permission denied/));
    await as(guest,async()=>assert.equal((await db.query("UPDATE storage.objects SET name='changed' WHERE name=$1",[path])).affectedRows,0));
  });
  await test('private friend invites create real rooms and reject another recipient', async () => {
    await db.query('INSERT INTO friends(user_id,friend_user_id) VALUES($1,$2)', [u,v]);
    const invited = await as(u,()=>rpc('send_raid_invite',[v,'mumbai',null]));
    await as(stranger,()=>assert.rejects(rpc('join_room_by_id',[invited.room_id,stranger,'spoof']), /someone else/));
    const invite = (await db.query('SELECT id FROM raid_invites WHERE room_id=$1',[invited.room_id])).rows[0];
    const joined = await as(v,()=>rpc('respond_to_raid_invite',[invite.id,true]));
    assert.equal(joined.current_players,2);
    const accepted = await as(u,()=>rpc('accept_room_mission',[invited.room_id]));
    await as(v,()=>assert.rejects(rpc('reroll_shared_quest',[invited.queue_id]), /Someone has accepted/));
    const partnerAssignment = await as(v,()=>rpc('accept_room_mission',[invited.room_id]));
    assert.equal(accepted.quest_text,partnerAssignment.quest_text);
    for (const [id,a] of [[u,accepted],[v,partnerAssignment]]) {
      const file = `${id}/${a.id}/proof.jpg`;
      await as(id,()=>db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('MissionProofs',$1,$2)",[file,id]));
      await as(id,()=>rpc('attach_mission_proof',[a.id,file]));
      await as(id,()=>rpc('complete_assigned_mission',[a.id,file,true]));
      if (id===u) {
        const resumed = await as(v,()=>rpc('get_active_mission'));
        assert.equal(resumed.assignment.id,partnerAssignment.id);
        assert.equal(resumed.room.current_players,1);
      }
    }
  });
  await test('public proof visibility follows the post; deletion is queued until Storage confirms removal', async () => {
    const log = (await db.query('SELECT id,proof_path FROM mission_logs WHERE user_id=$1 AND is_public LIMIT 1',[u])).rows[0];
    await as(stranger,async()=>assert.equal((await db.query('SELECT name FROM storage.objects WHERE name=$1',[log.proof_path])).rows.length,1));
    await db.query('DELETE FROM mission_logs WHERE id=$1',[log.id]);
    const cleanup = (await db.query('SELECT id FROM proof_cleanup WHERE path=$1',[log.proof_path])).rows[0];
    assert(cleanup);
    await as(stranger,async()=>{
      assert.equal((await db.query('SELECT name FROM storage.objects WHERE name=$1',[log.proof_path])).rows.length,0);
      await rpc('acknowledge_proof_cleanup',[cleanup.id]);
    });
    await as(u,()=>rpc('acknowledge_proof_cleanup',[cleanup.id]));
    assert.equal((await db.query('SELECT id FROM proof_cleanup WHERE id=$1',[cleanup.id])).rows.length,1);
    // This removes only the fixture metadata, simulating a successful Storage
    // API response. The application never issues SQL DELETE on storage.objects.
    await as(u,()=>db.query('DELETE FROM storage.objects WHERE name=$1',[log.proof_path]));
    await as(u,()=>rpc('acknowledge_proof_cleanup',[cleanup.id]));
    assert.equal((await db.query('SELECT id FROM proof_cleanup WHERE id=$1',[cleanup.id])).rows.length,0);
  });
  await test('accepted solo assignments cannot be bypassed using a room link', async () => {
    const solo = await as(u,()=>rpc('start_solo_mission'));
    await as(u,()=>rpc('accept_assignment',[solo.id]));
    const otherRoom = await as(v,()=>rpc('find_or_create_match',[v,'duo','spoof','mumbai']));
    await as(u,()=>assert.rejects(rpc('join_room_by_id',[otherRoom.room_id,u,'spoof']),/current mission/));
    await as(u,()=>rpc('cancel_active_mission'));
    await as(v,()=>rpc('cancel_active_mission'));
  });
  await test('server clock filters time-gated quests on every solo reroll', async () => {
    const hour = Number((await db.query("SELECT extract(hour FROM now() AT TIME ZONE 'Asia/Kolkata') AS h")).rows[0].h);
    const ineligibleWindow = hour>=5 && hour<9 ? 'night' : 'morning';
    await db.query("UPDATE quests SET is_active=false WHERE mode='solo'");
    await db.query("INSERT INTO quests(mode,quest_text,time_window) VALUES('solo','Must never appear',$1)",[ineligibleWindow]);
    for (let i=0;i<3;i++) {
      const a=await as(u,()=>rpc('start_solo_mission',['quest','mumbai',null,i>0]));
      assert.notEqual(a.quest_text,'Must never appear');
    }
    await as(u,()=>rpc('cancel_active_mission'));
  });
  await test('blocks exclude opponents, and a ban prevents assignment and chat mutations',async()=>{
    const before=await as(u,()=>rpc('find_or_create_match',[u,'duo','spoof','mumbai']));
    await db.query('INSERT INTO blocked_users(blocker_user_id,blocked_user_id) VALUES($1,$2)',[u,v]);
    const after=await as(v,()=>rpc('find_or_create_match',[v,'duo','spoof','mumbai']));
    assert.notEqual(before.room_id,after.room_id);
    await as(v,()=>assert.rejects(rpc('join_room_by_id',[before.room_id,v,'spoof'])));
    await db.query('UPDATE profiles SET is_banned=true WHERE device_id=$1',[u]);
    await as(u,()=>assert.rejects(rpc('send_room_message',[before.room_id,'test']),/suspended/));
    await as(u,()=>assert.rejects(rpc('start_solo_mission'),/suspended/));
    await as(u,()=>rpc('cancel_active_mission'));
    await as(v,()=>rpc('cancel_active_mission'));
    await db.query('UPDATE profiles SET is_banned=false WHERE device_id=$1',[u]);
  });
  await test('public history is limited to 15 public missions and never includes private proofs',async()=>{
    for(let i=0;i<20;i++) await db.query("INSERT INTO mission_logs(user_id,mode,quest_text,is_public) VALUES($1,'solo',$2,true)",[v,'Public '+i]);
    await db.query("INSERT INTO mission_logs(user_id,mode,quest_text,is_public) VALUES($1,'solo','Private detail',false)",[v]);
    const profile=(await db.query('SELECT handle FROM profiles WHERE device_id=$1',[v])).rows[0];
    const result=await as(stranger,()=>rpc('get_explorer_public_profile',[profile.handle]));
    assert.equal(result.history.length,15);
    assert(!result.history.some(m=>m.quest_text==='Private detail'));
  });
  await test('reaction retries do not inflate counts and reporters cannot impersonate handles',async()=>{
    const log=(await db.query('SELECT id FROM mission_logs WHERE user_id=$1 AND is_public LIMIT 1',[v])).rows[0];
    await as(stranger,()=>rpc('react_to_mission',[log.id,'fire']));
    await as(stranger,()=>rpc('react_to_mission',[log.id,'fire']));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM feed_reactions WHERE user_id=$1 AND log_id=$2',[stranger,log.id])).rows[0].n,1);
    await as(stranger,()=>rpc('report_content',['feed',log.id,'Please review this test content']));
    const reporter=(await db.query('SELECT handle FROM profiles WHERE device_id=$1',[stranger])).rows[0].handle;
    assert.equal((await db.query('SELECT reporter_handle FROM reports WHERE target_id=$1',[log.id])).rows[0].reporter_handle,reporter);
  });
  process.stdout.write(`Database security checks passed: ${count}\n`);
} catch(e) { process.stderr.write(`${e.message}\n${e.detail||''}\n${e.where||''}\n`); process.exitCode=1; }
finally { await db.close(); }
