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
    const profile = { device_id: 'anon-user-id', handle: 'Tester', streak: 1, time_saved_mins: 15, badges: [] };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
  mockState.responses['mission_logs'] = {
    data: [
      { id: 'log-1', user_id: 'other-user-id', mode: 'solo', quest_text: 'Talk to a stranger', photo_url: null, created_at: new Date().toISOString() }
    ],
    error: null
  };
  mockState.responses['feed_reactions'] = { data: [], error: null };
});

describe('report flow (non-admin)', () => {
  it('lets a player report a feed post', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: 'Feed' }));
    const reportButton = await screen.findByTitle('Report post');
    await user.click(reportButton);

    await waitFor(() => expect(window.prompt).toHaveBeenCalled());

    const reportInsert = mockState.calls.find((c) => c.table === 'reports' && c.method === 'insert');
    expect(reportInsert).toBeTruthy();
    expect(reportInsert?.args[0][0]).toMatchObject({
      reported_type: 'feed',
      target_id: 'log-1',
      reason: 'Not appropriate for this app'
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Report submitted'));
  });

  it('does not submit a report when the user cancels the reason prompt', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockImplementation(() => null);
    await renderApp();

    await user.click(screen.getByRole('button', { name: 'Feed' }));
    const reportButton = await screen.findByTitle('Report post');
    await user.click(reportButton);

    expect(mockState.calls.find((c) => c.table === 'reports')).toBeUndefined();
  });
});

describe('moderation flow (admin)', () => {
  beforeEach(() => {
    mockState.session = {
      user: { id: 'admin-user-id', email: 'sayyambtb@gmail.com' },
      access_token: 'fake-admin-token'
    };
    mockState.responses['profiles'] = (builder) => {
      const profile = { device_id: 'admin-user-id', handle: 'Admin', streak: 1, time_saved_mins: 15, badges: [] };
      if (builder.method === 'select.single') return { data: profile, error: null };
      if (builder.method === 'select') return { data: [profile], error: null };
      return { data: null, error: null };
    };
    mockState.rpcResponses['admin_get_reports'] = {
      data: [
        { id: 'report-1', reporter_handle: 'Reporter', reported_type: 'feed', target_id: 'log-1', reason: 'Spam content', created_at: new Date().toISOString() }
      ],
      error: null
    };
    mockState.rpcResponses['admin_delete_feed_post'] = { data: null, error: null };
    mockState.rpcResponses['admin_resolve_report'] = { data: null, error: null };
  });

  it('lets an admin review, delete, and resolve a reported post', async () => {
    const user = userEvent.setup();
    await renderApp();

    const reportsButton = await screen.findByRole('button', { name: /reports/i });
    await user.click(reportsButton);

    await waitFor(() => expect(screen.getByText(/Moderation Reports Queue/i)).toBeInTheDocument());
    expect(screen.getByText(/Spam content/)).toBeInTheDocument();

    await user.click(screen.getByText('Delete Post'));

    await waitFor(() => {
      const deleteCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'admin_delete_feed_post');
      expect(deleteCall?.args[0]).toMatchObject({ p_log_id: 'log-1' });
    });
    const resolveCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'admin_resolve_report');
    expect(resolveCall?.args[0]).toMatchObject({ p_report_id: 'report-1' });

    await waitFor(() => expect(screen.getByText(/Queue clear/i)).toBeInTheDocument());
  });
});
