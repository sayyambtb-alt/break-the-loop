import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    const profile = { device_id: 'anon-user-id', handle: 'Tester', streak: 1, time_saved_mins: 15, badges: ['🌱 First Step'] };
    if (builder.method === 'select.single') return { data: profile, error: null };
    if (builder.method === 'select') return { data: [profile], error: null };
    return { data: null, error: null };
  };
  mockState.responses['friends'] = { data: [], error: null };
  mockState.responses['quests'] = { data: [{ quest_text: 'Take a photo of the nearest tree' }], error: null };
});

describe('mission completion end-to-end', () => {
  it('lets a solo player pick a quest, upload proof, and complete the mission', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['complete_mission'] = {
      data: {
        success: true,
        new_streak: 2,
        new_saved_mins: 30,
        badges: ['🌱 First Step', '🔥 Warm Up']
      },
      error: null
    };

    await renderApp();

    const startButton = await screen.findByRole('button', { name: /destroy/i });
    await user.click(startButton);

    await waitFor(() => expect(screen.getByText(/mission assigned/i)).toBeInTheDocument());
    await waitFor(
      () => expect(screen.getByText('ACCEPT MISSION & OPEN CAMERA')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await user.click(screen.getByText('ACCEPT MISSION & OPEN CAMERA'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['fake-bytes'], 'proof.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    const uploadCall = mockState.calls.find((c) => c.type === 'storage-upload');
    expect(uploadCall?.args[0]).toBe('Proofs');

    const completeButton = screen.getByText('Complete & Log Proof 🔥');
    await user.click(completeButton);

    await waitFor(() => expect(screen.getByText('LOOP BROKEN!')).toBeInTheDocument());

    const rpcCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'complete_mission');
    expect(rpcCall).toBeTruthy();
    expect(rpcCall?.args[0]).toMatchObject({ p_mode: 'solo' });

    expect(screen.getByText('2 Days 🔥')).toBeInTheDocument();
    expect(screen.getByText('30 XP ⚡')).toBeInTheDocument();
  });

  it('shows an error and does not mark the mission complete when the RPC fails', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['complete_mission'] = {
      data: null,
      error: { message: 'Unauthorized: a valid session is required to complete a mission' }
    };

    await renderApp();

    await user.click(await screen.findByRole('button', { name: /destroy/i }));
    await waitFor(
      () => expect(screen.getByText('ACCEPT MISSION & OPEN CAMERA')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await user.click(screen.getByText('ACCEPT MISSION & OPEN CAMERA'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    await user.click(screen.getByText('Complete & Log Proof 🔥'));

    await screen.findByText(/Unauthorized/);
    expect(screen.queryByText('LOOP BROKEN!')).not.toBeInTheDocument();
  });
});
