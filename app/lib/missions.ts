import type { SupabaseClient } from '@supabase/supabase-js';
import type { GemDetails } from '../components/SuspenseMissionCard';

export interface MissionAssignment {
  id: string;
  mode: 'solo' | 'duo' | 'squad';
  track: 'quest' | 'explore';
  city: string;
  room_id: string | null;
  quest_text: string;
  rarity: 'common' | 'rare' | 'legendary';
  xp_reward: number;
  gem: GemDetails | null;
  credit: string | null;
  accepted_at: string | null;
  proof_path: string | null;
}
export interface MissionRoom {
  queue_id: string;
  room_id: string;
  mode: 'duo' | 'squad';
  quest_text: string;
  rarity: MissionAssignment['rarity'];
  xp_reward: number;
  max_players: number;
  current_players: number;
  matched: boolean;
  is_creator: boolean;
  is_private?: boolean;
  neighborhood: string | null;
  gem_name: string;
  gem_description: string;
  gem_submitted_by: string | null;
  roster: { user_id: string; handle: string }[];
}
export const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;

export async function proofUrl(client: SupabaseClient, item: { proof_path?: string | null; photo_url?: string | null }) {
  if (!item.proof_path) return item.photo_url || '';
  const { data, error } = await client.storage.from('MissionProofs').createSignedUrl(item.proof_path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function flushProofCleanup(client: SupabaseClient) {
  const { data, error } = await client.from('proof_cleanup').select('id,bucket,path').order('created_at').limit(25);
  if (error) throw error;
  for (const item of data || []) {
    const { error: removalError } = await client.storage.from(item.bucket).remove([item.path]);
    if (removalError) throw removalError;
    const { error: ackError } = await client.rpc('acknowledge_proof_cleanup', { p_cleanup_id: item.id });
    if (ackError) throw ackError;
  }
}

// Some mobile/private-browsing configurations deny Web Storage entirely.
export const safeStorage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Optional UI preference. */ } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* Optional UI preference. */ } },
};
