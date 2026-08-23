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
});

describe('email OTP sign-in (main Auth Modal)', () => {
  it('verifies a 6-digit code and signs the user in with their real email', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['signInWithOtp'] = { data: {}, error: null };
    mockState.rpcResponses['verifyOtp'] = {
      data: { session: { user: { id: 'verified-user-id' }, access_token: 'verified-token' } },
      error: null
    };

    await renderApp();

    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByText('EMAIL VERIFICATION')).toBeInTheDocument();

    await user.type(screen.getAllByPlaceholderText('yourname@gmail.com')[0], 'player@example.com');
    await user.click(screen.getByText('Send 6-Digit Code'));

    const otpCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'signInWithOtp');
    expect(otpCall?.args[0]).toMatchObject({ email: 'player@example.com', options: { shouldCreateUser: true } });

    const otpInput = await screen.findByPlaceholderText('Enter 6-digit Email Code');
    await user.type(otpInput, '123456');
    await user.click(screen.getByText('Verify & Continue'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument());
    expect(screen.queryByText('EMAIL VERIFICATION')).not.toBeInTheDocument();
  });
});

describe('save my progress (email linking, no real email sent)', () => {
  it('links an email to the current anonymous session via updateUser', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['updateUser'] = { data: {}, error: null };

    await renderApp();

    await user.click(screen.getByRole('button', { name: /save my progress/i }));
    expect(screen.getByText('SAVE MY PROGRESS')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('yourname@gmail.com');
    await user.type(emailInput, 'save-me@example.com');
    await user.click(screen.getByText('Send Confirmation Link'));

    await waitFor(() => {
      const call = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'updateUser');
      expect(call?.args[0]).toMatchObject({ email: 'save-me@example.com' });
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Check your email'));
    // updateUser never sends a real email in tests -- it's a mocked resolver,
    // so no network call to Supabase's auth API happens here at all.
    expect(screen.queryByText('SAVE MY PROGRESS')).not.toBeInTheDocument();
  });

  it('surfaces the error and keeps the modal open when updateUser fails', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['updateUser'] = { data: null, error: { message: 'Email already in use' } };

    await renderApp();
    await user.click(screen.getByRole('button', { name: /save my progress/i }));
    await user.type(screen.getByPlaceholderText('yourname@gmail.com'), 'taken@example.com');
    await user.click(screen.getByText('Send Confirmation Link'));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Email already in use')));
    expect(screen.getByText('SAVE MY PROGRESS')).toBeInTheDocument();
  });
});

describe('recover account on this device (OTP code, not a magic link)', () => {
  it('sends a 6-digit code, then verifies it to recover the linked profile', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['signInWithOtp'] = { data: {}, error: null };
    mockState.rpcResponses['verifyOtp'] = {
      data: { session: { user: { id: 'recovered-user-id' }, access_token: 'recovered-token' } },
      error: null
    };

    await renderApp();

    await user.click(screen.getByText('Already have an account? Sign in'));
    expect(screen.getByText('SIGN IN ON THIS DEVICE')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('yourname@gmail.com'), 'returning@example.com');
    await user.click(screen.getByText('Send Sign-In Code'));

    const sentCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'signInWithOtp');
    expect(sentCall?.args[0]).toMatchObject({ email: 'returning@example.com', options: { shouldCreateUser: false } });

    const codeInput = await screen.findByPlaceholderText('Enter 6-digit Email Code');
    await user.type(codeInput, '654321');
    await user.click(screen.getByText('Verify & Sign In'));

    const verifyCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'verifyOtp');
    expect(verifyCall?.args[0]).toMatchObject({ email: 'returning@example.com', token: '654321', type: 'email' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument());
    expect(screen.queryByText('SIGN IN ON THIS DEVICE')).not.toBeInTheDocument();
  });

  it('does not create a new account when the email was never linked', async () => {
    const user = userEvent.setup();
    mockState.rpcResponses['signInWithOtp'] = { data: null, error: { message: 'User not found' } };

    await renderApp();
    await user.click(screen.getByText('Already have an account? Sign in'));
    await user.type(screen.getByPlaceholderText('yourname@gmail.com'), 'nobody@example.com');
    await user.click(screen.getByText('Send Sign-In Code'));

    const sentCall = mockState.calls.find((c) => c.type === 'rpc' && c.method === 'signInWithOtp');
    expect(sentCall?.args[0]).toMatchObject({ options: { shouldCreateUser: false } });
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Couldn't find an account")));
    expect(screen.queryByPlaceholderText('Enter 6-digit Email Code')).not.toBeInTheDocument();
  });
});
