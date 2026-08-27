import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockState, resetMockState, buildSupabaseClient } from './mocks/supabase';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => buildSupabaseClient()
}));

async function renderApp() {
  const { default: Home } = await import('../app/page');
  render(<Home />);
  await waitFor(() => expect(screen.queryByText('JOIN BREAK THE LOOP')).not.toBeInTheDocument());
}

beforeEach(() => {
  resetMockState();
  // A verified (non-guest) session is required to select Duo/Squad mode.
  mockState.session = {
    user: { id: 'tester-id', email: 'tester@example.com' },
    access_token: 'fake-token'
  };
  mockState.responses['profiles'] = (builder) => {
    const profile = { device_id: 'tester-id', handle: 'Tester', streak: 1, time_saved_mins: 15, badges: [] };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
});

describe('duo/squad shared reroll', () => {
  it('calls reroll_shared_quest and syncs the new quest via the realtime queue subscription', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['find_or_create_match'] = {
      data: {
        matched: true,
        queue_id: 'queue-1',
        room_id: 'room-1',
        quest_text: 'Original shared quest',
        rarity: 'common',
        xp_reward: 15,
        max_players: 2,
        is_creator: true,
        roster: [{ user_id: 'tester-id', handle: 'Tester' }]
      },
      error: null
    };
    mockState.rpcResponses['reroll_shared_quest'] = { data: { success: true }, error: null };

    await renderApp();

    await user.click(screen.getByRole('button', { name: 'duo' }));
    await user.click(screen.getByRole('button', { name: /destroy/i }));
    await user.click(screen.getByRole('button', { name: 'I Agree & Search' }));

    await screen.findByText(/Original shared quest/, {}, { timeout: 3000 });

    // The client that matched immediately must have opened a persistent
    // subscription on its own queue row (not just the client that had to wait).
    const queueEntry = mockState.channels.find((c) => c.name === 'queue_queue-1');
    expect(queueEntry).toBeTruthy();
    const handler = queueEntry!.channel._handlers.find((h) => h.event === 'postgres_changes');
    expect(handler).toBeTruthy();

    await user.click(screen.getByText('🔄 Reroll Quest'));

    const rerollCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'reroll_shared_quest');
    expect(rerollCall?.args[0]).toMatchObject({ p_queue_id: 'queue-1' });

    // The RPC itself never sets local state directly (per the "single source
    // of truth" design) — simulate the realtime UPDATE it produces, the same
    // way it would arrive for a partner who didn't trigger the reroll.
    await handler!.callback({
      old: { status: 'matched' },
      new: {
        status: 'matched',
        room_id: 'room-1',
        quest_text: 'Rerolled shared quest',
        rarity: 'legendary',
        xp_reward: 75
      }
    });

    await screen.findByText(/Rerolled shared quest/, {}, { timeout: 3000 });
    expect(screen.getByText('⚡ LEGENDARY QUEST')).toBeInTheDocument();
    expect(screen.getByText('+75 IRL XP')).toBeInTheDocument();
  });
});
