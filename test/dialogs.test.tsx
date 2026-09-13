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
  mockState.responses['profiles'] = (builder) => {
    const profile = {
      device_id: 'anon-user-id',
      handle: 'Tester',
      streak: 3,
      time_saved_mins: 45,
      total_xp: 320,
      badges: ['🌱 First Step']
    };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
});

/**
 * Every dialog was a bare <div> holding a scrim: no dialog role, no Escape, no
 * scroll lock, and focus left behind on the page underneath. These pin the
 * behaviour that the shared Overlay now provides.
 */
describe('dialogs', () => {
  it('exposes a labelled dialog and locks the page behind it', async () => {
    const user = userEvent.setup();
    await renderApp();

    // The first-visit welcome screen is itself a dialog.
    const welcome = await screen.findByRole('dialog', { name: 'Welcome to Break The Loop' });
    expect(welcome).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByText("I'm in →"));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The page gets its scroll back only once nothing is open on top of it.
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape and hands focus back to the control that opened it', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByText("I'm in →"));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const opener = screen.getByRole('button', { name: /Raid squad|🤝 Squad/ });
    await user.click(opener);
    await screen.findByRole('dialog', { name: 'Raid squad' });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
  });

  it('does not let Escape dismiss the handle setup dialog, which has to be answered', async () => {
    const user = userEvent.setup();
    // A verified account with no handle yet is what forces the setup dialog.
    mockState.session = {
      user: { id: 'anon-user-id', email: 'someone@example.com' },
      access_token: 'fake-token'
    };
    mockState.responses['profiles'] = (builder) => {
      const profile = { device_id: 'anon-user-id', handle: 'Explorer', streak: 1, time_saved_mins: 15, badges: [] };
      if (builder.method === 'select.single') return { data: profile, error: null };
      if (builder.method === 'select') return { data: [profile], error: null };
      return { data: null, error: null };
    };

    await renderApp();

    const dialog = await screen.findByRole('dialog', { name: 'Choose your explorer tag' });
    await user.keyboard('{Escape}');

    expect(dialog).toBeInTheDocument();
  });
});
