import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// A real PostgreSQL engine with a minimal Supabase platform fixture. It does
// not emulate GoTrue, Storage's object service, or multi-connection locking.
export async function createFixture() {
  const db = new PGlite();
  const root = new URL('../../', import.meta.url);
  const sql = async path => (await readFile(new URL(path, root), 'utf8')).replace(/^\$function\$\s*$/gm, '$function$;');
  try {
    await db.exec(await sql('test/database/bootstrap.sql'));
    // The historical dump lists dependent functions before their definitions.
    await db.exec('SET check_function_bodies=off');
    await db.exec(await sql('supabase/migrations/20260901_baseline_schema_snapshot.sql'));
    await db.exec(await sql('supabase/migrations/20260903_explore_matchmaking.sql'));
    await db.exec('SET check_function_bodies=on');
    // Include the production FK missing from the original baseline snapshot.
    await db.exec('ALTER TABLE matchmaking_participants ADD FOREIGN KEY(queue_id) REFERENCES matchmaking_queue(id) ON DELETE CASCADE');
    await db.exec('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated; CREATE POLICY legacy_storage_access ON storage.objects FOR ALL USING(true) WITH CHECK(true);');
    await db.exec(await sql('supabase/migrations/20260913150519_secure_missions_and_rooms.sql'));
    return db;
  } catch (error) { await db.close(); throw error; }
}
