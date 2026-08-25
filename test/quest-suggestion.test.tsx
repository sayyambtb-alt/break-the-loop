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

describe('suggest a quest', () => {
  it('submits a quest suggestion and shows a success toast', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['submit_quest_suggestion'] = { data: { success: true }, error: null };

    await renderApp();

    await user.click(screen.getByRole('button', { name: /suggest quest/i }));
    const heading = screen.getByText('SUGGEST A QUEST');
    expect(heading).toBeInTheDocument();
    const modal = within(heading.closest('div')!);

    await user.click(modal.getByRole('button', { name: 'duo' }));
    await user.type(
      screen.getByPlaceholderText(/describe the mission/i),
      'Find a mural in your neighborhood and take a photo next to it.'
    );
    await user.click(screen.getByText('Submit for Review'));

    const call = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'submit_quest_suggestion');
    expect(call?.args[0]).toMatchObject({
      p_quest_text: 'Find a mural in your neighborhood and take a photo next to it.',
      p_mode: 'duo'
    });

    await screen.findByText(/awaiting review/i);
    expect(screen.queryByText('SUGGEST A QUEST')).not.toBeInTheDocument();
  });

  it('surfaces the 5-pending-submission cap error and keeps the modal open', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['submit_quest_suggestion'] = {
      data: null,
      error: { message: 'You already have 5 quests awaiting review — wait for those to be reviewed first' }
    };

    await renderApp();

    await user.click(screen.getByRole('button', { name: /suggest quest/i }));
    await user.type(
      screen.getByPlaceholderText(/describe the mission/i),
      'Order the strangest thing on a street food menu and rate it out of ten.'
    );
    await user.click(screen.getByText('Submit for Review'));

    await screen.findByText(/already have 5 quests awaiting review/i);
    expect(screen.getByText('SUGGEST A QUEST')).toBeInTheDocument();
  });
});
