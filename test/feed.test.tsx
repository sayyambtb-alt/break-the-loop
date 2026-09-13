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

const NOW = new Date().toISOString();

beforeEach(() => {
  resetMockState();
  mockState.responses['profiles'] = (builder) => {
    const profile = { device_id: 'anon-user-id', handle: 'Tester', streak: 1, time_saved_mins: 15, badges: [] };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
  mockState.responses['mission_logs'] = {
    data: [{
      id: 'log-1', user_id: 'other-user', mode: 'duo',
      quest_text: 'Find the oldest shop on your street.',
      photo_url: 'https://example.test/proof.jpg', created_at: NOW
    }],
    error: null
  };
  mockState.responses['feed_reactions'] = { data: [], error: null };
});

describe('community feed', () => {
  it('renders the whole card, not just the photo', async () => {
    // Regression guard. The list was a flex column with a max-height, so every
    // card was shrunk below its natural height, and because the card clips its
    // own overflow the handle, quest text and reactions were cut away entirely.
    // The feed rendered as bare photos.
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Feed' }));

    const post = await screen.findByRole('article');
    expect(within(post).getByText('@other-us')).toBeInTheDocument();
    expect(within(post).getByText(/Find the oldest shop/)).toBeInTheDocument();
    expect(within(post).getByRole('img')).toBeInTheDocument();
    expect(within(post).getByText('duo')).toBeInTheDocument();
    expect(within(post).getByText('just now')).toBeInTheDocument();
  });

  it('bumps a reaction count immediately instead of waiting for a refetch', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Feed' }));

    const post = await screen.findByRole('article');
    const fire = within(post).getByRole('button', { name: /fire reactions/i });
    expect(fire).toHaveTextContent('0');
    expect(fire).toHaveAttribute('aria-pressed', 'false');

    await user.click(fire);

    expect(fire).toHaveTextContent('1');
    expect(fire).toHaveAttribute('aria-pressed', 'true');

    // A second tap must not send another row.
    await user.click(fire);
    const inserts = mockState.calls.filter(
      (c) => c.type === 'query' && c.table === 'feed_reactions' && c.method === 'insert'
    );
    expect(inserts).toHaveLength(1);
  });

  it('rolls the count back if the insert fails', async () => {
    const user = userEvent.setup();
    mockState.responses['feed_reactions'] = (builder) => {
      if (builder.method === 'insert') return { data: null, error: { message: 'nope' } };
      return { data: [], error: null };
    };

    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Feed' }));

    const post = await screen.findByRole('article');
    const fire = within(post).getByRole('button', { name: /fire reactions/i });
    await user.click(fire);

    await waitFor(() => expect(fire).toHaveTextContent('0'));
    expect(fire).toHaveAttribute('aria-pressed', 'false');
  });
});
