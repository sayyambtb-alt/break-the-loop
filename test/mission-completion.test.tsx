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
        new_saved_mins: 290,
        new_total_xp: 30,
        xp_earned: 15,
        badges: ['🌱 First Step', '🔥 Warm Up']
      },
      error: null
    };

    await renderApp();

    const startButton = await screen.findByRole('button', { name: /find my next mission/i });
    await user.click(startButton);

    await waitFor(() => expect(screen.getByText(/mission assigned/i)).toBeInTheDocument());
    await waitFor(
      () => expect(screen.getByText('Accept mission')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(document.querySelector('input[type="file"]')).toBeNull();
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click');
    await user.click(screen.getByText('Accept mission'));
    expect(inputClick).not.toHaveBeenCalled();
    inputClick.mockRestore();

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

    expect(screen.getByText('Loop streak').parentElement).toHaveTextContent('2days');
    expect(screen.getByText('Real-world XP').parentElement).toHaveTextContent('30XP');
    const ctx = document.createElement('canvas').getContext('2d')!;
    expect(ctx.fillText).toHaveBeenCalledWith('+15 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).not.toHaveBeenCalledWith('+290 XP', expect.any(Number), expect.any(Number));
  });

  it('auto-surfaces the Recap with the updated XP, streak and actual rank when a new badge is earned', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['complete_mission'] = {
      data: {
        success: true,
        new_streak: 3,
        new_saved_mins: 290,
        new_total_xp: 155,
        xp_earned: 15,
        badges: ['🌱 First Step', '🔥 Warm Up']
      },
      error: null
    };

    await renderApp();

    await user.click(await screen.findByRole('button', { name: /find my next mission/i }));
    await waitFor(
      () => expect(screen.getByText('Accept mission')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await user.click(screen.getByText('Accept mission'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    await user.click(screen.getByText('Complete & Log Proof 🔥'));
    await waitFor(() => expect(screen.getByText('LOOP BROKEN!')).toBeInTheDocument());

    await waitFor(
      () => expect(screen.getByRole('dialog', { name: 'Your IRL Recap' })).toBeInTheDocument(),
      { timeout: 4000 }
    );
    expect(screen.getByAltText('Recap')).toBeInTheDocument();
    const ctx = document.createElement('canvas').getContext('2d')!;
    expect(ctx.fillText).toHaveBeenCalledWith('155 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('3 days', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('Chaos Local', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).not.toHaveBeenCalledWith('290 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).not.toHaveBeenCalledWith('🔥 Warm Up', expect.any(Number), expect.any(Number));

    await user.click(screen.getByRole('button', { name: 'Close recap' }));
    vi.mocked(ctx.fillText).mockClear();
    await user.click(screen.getByRole('button', { name: 'Recap' }));
    expect(ctx.fillText).toHaveBeenCalledWith('155 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('Chaos Local', expect.any(Number), expect.any(Number));
  });

  it('uses persisted profile XP for a manually opened recap and labels one day correctly', async () => {
    const user = userEvent.setup();
    mockState.responses['profiles'] = (builder) => {
      const profile = { device_id: 'anon-user-id', handle: 'Tester', streak: 1, time_saved_mins: 290, total_xp: 155, badges: ['⚡ 1 Hour Saved'] };
      return { data: builder.method === 'select' ? [profile] : profile, error: null };
    };
    await renderApp();
    await waitFor(() => expect(screen.getByText('Real-world XP').parentElement).toHaveTextContent('155XP'));
    const ctx = document.createElement('canvas').getContext('2d')!;
    vi.mocked(ctx.fillText).mockClear();
    await user.click(screen.getByRole('button', { name: 'Recap' }));
    expect(ctx.fillText).toHaveBeenCalledWith('155 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('1 day', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('Chaos Local', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).not.toHaveBeenCalledWith('290 XP', expect.any(Number), expect.any(Number));
    expect(ctx.fillText).not.toHaveBeenCalledWith('⚡ 1 Hour Saved', expect.any(Number), expect.any(Number));
  });

  it('pays out the XP that matches the rarity shown on the card', async () => {
    const user = userEvent.setup();
    // Force rollRarity() (and the quest-index pick, harmlessly, since only
    // one quest is mocked) to roll a legendary result: Math.random() * 100 = 90 > 85.
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    mockState.rpcResponses['complete_mission'] = {
      data: { success: true, new_streak: 1, new_saved_mins: 90, badges: [] },
      error: null
    };

    await renderApp();

    await user.click(await screen.findByRole('button', { name: /find my next mission/i }));
    await waitFor(
      () => expect(screen.getByText('Accept mission')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText('⚡ LEGENDARY QUEST')).toBeInTheDocument();
    expect(screen.getByText('+75 IRL XP')).toBeInTheDocument();

    await user.click(screen.getByText('Accept mission'));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    await user.click(screen.getByText('Complete & Log Proof 🔥'));
    await waitFor(() => expect(screen.getByText('LOOP BROKEN!')).toBeInTheDocument());

    const rpcCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'complete_mission');
    expect(rpcCall?.args[0]).toMatchObject({ p_xp_earned: 75 });
  });

  it('shows a rank-up toast when completing a mission crosses a rank threshold', async () => {
    const user = userEvent.setup();
    // Keep the rolled rarity common (no legendary/Recap interference) so this
    // test only exercises the rank-up path.
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    mockState.rpcResponses['complete_mission'] = {
      data: { success: true, new_streak: 2, new_saved_mins: 30, new_total_xp: 150, badges: ['🌱 First Step'] },
      error: null
    };

    await renderApp();

    await user.click(await screen.findByRole('button', { name: /find my next mission/i }));
    await waitFor(
      () => expect(screen.getByText('Accept mission')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await user.click(screen.getByText('Accept mission'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    await user.click(screen.getByText('Complete & Log Proof 🔥'));
    await waitFor(() => expect(screen.getByText('LOOP BROKEN!')).toBeInTheDocument());

    await screen.findByText(/Rank up! You're now a Chaos Local/);
  });

  it('shows an error and does not mark the mission complete when the RPC fails', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['complete_mission'] = {
      data: null,
      error: { message: 'Unauthorized: a valid session is required to complete a mission' }
    };

    await renderApp();

    await user.click(await screen.findByRole('button', { name: /find my next mission/i }));
    await waitFor(
      () => expect(screen.getByText('Accept mission')).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await user.click(screen.getByText('Accept mission'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByAltText('Proof')).toBeInTheDocument());

    await user.click(screen.getByText('Complete & Log Proof 🔥'));

    await screen.findByText(/Unauthorized/);
    expect(screen.queryByText('LOOP BROKEN!')).not.toBeInTheDocument();
  });
});
