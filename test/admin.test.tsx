import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockState, resetMockState, buildSupabaseClient } from './mocks/supabase';
import { vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => buildSupabaseClient()
}));

async function renderAdmin() {
  const { default: AdminPage } = await import('../app/admin/page');
  render(<AdminPage />);
}

// Admin-only moderation UI (Reports/Quests/Gems), moved verbatim out of
// app/page.tsx and onto its own /admin route guarded by the ADMIN_EMAIL
// check. See test/moderation.test.tsx for the non-admin report flow that
// stays on the main player surface.
describe('moderation flow (admin route)', () => {
  beforeEach(() => {
    resetMockState();
    mockState.session = {
      user: { id: 'admin-user-id', email: 'sayyambtb@gmail.com' },
      access_token: 'fake-admin-token'
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
    await renderAdmin();

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

  it('refuses a non-admin session', async () => {
    resetMockState();
    mockState.session = {
      user: { id: 'someone-else', email: 'someone@example.com' },
      access_token: 'fake-token'
    };
    await renderAdmin();
    await screen.findByText(/Not authorized/i);
  });
});
