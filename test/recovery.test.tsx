import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildSupabaseClient, defaultAssignment, mockState, resetMockState, type MockResponse } from './mocks/supabase';

vi.mock('@supabase/supabase-js', () => ({ createClient: () => buildSupabaseClient() }));

const restored = { ...defaultAssignment, accepted_at: '2026-09-14T10:00:00Z', proof_path: 'anon-user-id/assignment-1/proof.jpg' };
const success = { data: { success: true, new_total_xp: 15, xp_earned: 15, new_streak: 1, badges: [] }, error: null };
async function openApp() {
  const { default: Home } = await import('../app/page');
  render(<Home />);
  await screen.findByRole('button', { name: 'Today' });
}
beforeEach(() => {
  resetMockState();
  mockState.rpcResponses.get_active_mission = { data: { assignment: restored, room: null }, error: null };
  mockState.responses.friends = { data: [], error: null };
});

describe('mission and account recovery', () => {
  it('restores accepted proof and preserves it when completion fails, allowing a safe retry', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses.complete_assigned_mission = { data: null, error: { message: 'Connection interrupted. Please retry.' } };
    await openApp();
    expect(await screen.findByAltText('Proof')).toHaveAttribute('src', expect.stringContaining(restored.proof_path));
    const visibility = screen.getByRole('checkbox', { name: /Share this photo/ });
    expect(visibility).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Complete mission' }));
    await screen.findByText(/Connection interrupted/);
    expect(screen.queryByText('LOOP BROKEN!')).not.toBeInTheDocument();
    expect(screen.getByAltText('Proof')).toBeInTheDocument();
    mockState.rpcResponses.complete_assigned_mission = success;
    await user.click(visibility);
    await user.click(screen.getByRole('button', { name: 'Complete mission' }));
    await screen.findByText('LOOP BROKEN!');
    const completions = mockState.calls.filter(c => c.method === 'complete_assigned_mission');
    expect(completions).toHaveLength(2);
    expect(completions[1].args[0]).toEqual({ p_assignment_id: restored.id, p_photo_path: restored.proof_path, p_is_public: true });
    expect(mockState.calls.some(c => c.method === 'start_solo_mission')).toBe(false);
  });

  it('sends one completion request for repeated taps while the server is responding', async () => {
    let finish!: (value: MockResponse) => void;
    mockState.rpcResponses.complete_assigned_mission = () => new Promise(resolve => { finish = resolve; });
    await openApp();
    await screen.findByAltText('Proof');
    const button = screen.getByRole('button', { name: 'Complete mission' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mockState.calls.filter(c => c.method === 'complete_assigned_mission')).toHaveLength(1);
    expect(button).toBeDisabled();
    await act(async () => finish(success));
    await screen.findByText('LOOP BROKEN!');
  });

  it('clears proof when the account changes and ignores the previous account’s delayed completion', async () => {
    let finish!: (value: MockResponse) => void;
    mockState.rpcResponses.complete_assigned_mission = () => new Promise(resolve => { finish = resolve; });
    await openApp();
    await screen.findByAltText('Proof');
    fireEvent.click(screen.getByRole('button', { name: 'Complete mission' }));
    mockState.rpcResponses.get_active_mission = { data: null, error: null };
    const nextSession = { user: { id: 'next-account', email: 'next@example.test' }, access_token: 'fixture' };
    await act(async () => {
      mockState.session = nextSession;
      mockState.authStateCallback?.('SIGNED_IN', nextSession);
    });
    await screen.findByRole('button', { name: /Find my next mission/i });
    await act(async () => finish(success));
    expect(screen.queryByAltText('Proof')).not.toBeInTheDocument();
    expect(screen.queryByText('LOOP BROKEN!')).not.toBeInTheDocument();
    expect(screen.getByText('Real-world XP').parentElement).toHaveTextContent('0XP');
  });

  it('keeps a mission open if leaving fails', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses.cancel_active_mission = { data: null, error: { message: 'Could not leave. Try again.' } };
    await openApp();
    await screen.findByAltText('Proof');
    await user.click(screen.getByRole('button', { name: /Abandon Mission/i }));
    await screen.findByText('Could not leave. Try again.');
    expect(screen.getByAltText('Proof')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete mission' })).toBeEnabled();
  });
});

describe('clear failures and accessible navigation', () => {
  it('preserves a failed chat draft and keeps an accepted mission through room occupancy changes', async () => {
    const user = userEvent.setup();
    mockState.session = { user: { id: 'tester-id', email: 'tester@example.test' }, access_token: 'fixture' };
    const room = { queue_id: 'queue-1', room_id: 'room-1', mode: 'duo', matched: true, max_players: 2, current_players: 2, is_creator: true, quest_text: restored.quest_text, rarity: 'common', xp_reward: 15, roster: [] };
    mockState.rpcResponses.get_active_mission = { data: { assignment: { ...restored, mode: 'duo', room_id: room.room_id }, room }, error: null };
    mockState.rpcResponses.send_room_message = { data: null, error: { message: 'Message not sent. Please retry.' } };
    await openApp();
    await screen.findByAltText('Proof');
    const input = screen.getByPlaceholderText('Say something (max 300 chars)...');
    await user.type(input, 'Meet at the entrance');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Message not sent. Please retry.');
    expect(input).toHaveValue('Meet at the entrance');
    const queue = mockState.channels.find(c => c.name === 'queue_queue-1');
    const update = queue!.channel._handlers.find(h => h.event === 'postgres_changes');
    await act(async () => update!.callback({ old: {}, new: { ...room, revealed_at: new Date().toISOString(), current_players: 1 } }));
    expect(screen.getByAltText('Proof')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept mission' })).not.toBeInTheDocument();
    mockState.rpcResponses.send_room_message = { data: { id: 'message-1', sender_handle: 'Tester', message: 'Meet at the entrance', created_at: new Date().toISOString() }, error: null };
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(input).toHaveValue(''));
    await screen.findByText('Meet at the entrance');
  });

  it('shows a retryable feed failure instead of telling the user the community is empty', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses.get_active_mission = { data: null, error: null };
    mockState.responses.mission_logs = { data: null, error: { message: 'Feed temporarily unavailable' } };
    await openApp();
    await user.click(screen.getByRole('button', { name: 'Feed' }));
    await screen.findByText('Feed temporarily unavailable');
    expect(screen.queryByText('No missions logged yet')).not.toBeInTheDocument();
    mockState.responses.mission_logs = { data: [], error: null };
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No missions logged yet');
  });

  it('does not report success when a report is rejected', async () => {
    const user = userEvent.setup();
    mockState.responses.mission_logs = { data: [{ id: 'log-1', user_id: 'another', mode: 'solo', quest_text: 'Local walk', created_at: new Date().toISOString() }], error: null };
    mockState.rpcResponses.report_content = { data: null, error: { message: 'Please wait before reporting again.' } };
    await openApp();
    await user.click(screen.getByRole('button', { name: 'Feed' }));
    await user.click(await screen.findByTitle('Report post'));
    await screen.findByText(/Please wait before reporting again/);
    expect(screen.queryByText(/Report submitted/)).not.toBeInTheDocument();
  });

  it('closes a recap on native cancellation and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    await openApp();
    const trigger = screen.getByRole('button', { name: 'Recap' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Your IRL Recap' });
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('treats cancelling the share sheet as cancellation, without downloading a file', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    vi.stubGlobal('navigator', { canShare: () => true, share });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await openApp();
    await user.click(screen.getByRole('button', { name: 'Recap' }));
    await user.click(screen.getByRole('button', { name: 'Share your recap' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(download).not.toHaveBeenCalled();
  });
});
