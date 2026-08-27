import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  mockState.responses['profiles'] = (builder) => {
    const profile = { device_id: 'anon-user-id', handle: 'Tester', streak: 1, time_saved_mins: 15, badges: [] };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
});

describe('friends leaderboard', () => {
  it('renders a ranked list with the caller row highlighted', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['get_friends_leaderboard'] = {
      data: [
        { handle: 'TopDog', total_xp: 900, streak: 10, is_self: false },
        { handle: 'Tester', total_xp: 150, streak: 3, is_self: true },
        { handle: 'Rookie', total_xp: 20, streak: 1, is_self: false }
      ],
      error: null
    };

    await renderApp();

    await user.click(screen.getByRole('button', { name: /🤝 Squad/ }));
    const heading = await screen.findByText(/Raid Squad/);
    const modal = within(heading.closest('.rounded-3xl') as HTMLElement);

    await user.click(modal.getByRole('button', { name: 'Leaderboard' }));

    const call = await waitFor(() =>
      mockState.calls.find((c) => c.type === 'rpc' && c.method === 'get_friends_leaderboard')
    );
    expect(call).toBeTruthy();

    const topRow = (await modal.findByText('@TopDog')).closest('.rounded-xl') as HTMLElement;
    const selfRow = modal.getByText('@Tester').closest('.rounded-xl') as HTMLElement;
    const lastRow = modal.getByText('@Rookie').closest('.rounded-xl') as HTMLElement;

    // Ranked in the order the backend returned (sorted by total_xp desc).
    expect(within(topRow).getByText('1')).toBeInTheDocument();
    expect(within(selfRow).getByText('2')).toBeInTheDocument();
    expect(within(lastRow).getByText('3')).toBeInTheDocument();

    expect(within(topRow).getByText('900 XP')).toBeInTheDocument();
    expect(within(selfRow).getByText('150 XP')).toBeInTheDocument();
    expect(within(selfRow).getByText('Chaos Local')).toBeInTheDocument();

    // Only the caller's own row gets the highlight treatment.
    expect(selfRow.className).toContain('border-rose-500/40');
    expect(topRow.className).not.toContain('border-rose-500/40');
    expect(lastRow.className).not.toContain('border-rose-500/40');

    await user.click(screen.getByText('@TopDog'));
    const profileCall = mockState.calls.find(
      (c) => c.type === 'rpc' && c.method === 'get_explorer_public_profile'
    );
    expect(profileCall?.args[0]).toMatchObject({ p_handle: 'TopDog' });
  });
});
