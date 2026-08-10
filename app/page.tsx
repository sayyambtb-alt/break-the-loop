'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSendEmailOtp = async () => {
    setAuthError('');
    if (!emailInput.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email: emailInput });

    if (error) {
      setAuthError(error.message);
    } else {
      setUserEmail(emailInput);
      setOtpSent(true);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setAuthError('');
    if (!otpInput || !userEmail) {
      setAuthError('Please enter the 6-digit verification code');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: otpInput,
      type: 'email'
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.session) {
      setIsLoggedIn(true);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>BREAK THE LOOP</h1>
      {!isLoggedIn ? (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          {!otpSent ? (
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ padding: '0.5rem', width: '100%', marginBottom: '1rem', color: '#000' }}
              />
              <button onClick={handleSendEmailOtp} style={{ padding: '0.5rem 1rem' }}>
                Send Verification Code
              </button>
            </div>
          ) : (
            <div>
              <p>Enter 6-digit OTP sent to {userEmail}:</p>
              <input
                type="text"
                placeholder="6-digit code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                style={{ padding: '0.5rem', width: '100%', marginBottom: '1rem', color: '#000' }}
              />
              <button onClick={handleVerifyEmailOtp} style={{ padding: '0.5rem 1rem' }}>
                Verify Code & Sign In
              </button>
            </div>
          )}
          {authError && <p style={{ color: 'red', marginTop: '1rem' }}>{authError}</p>}
        </div>
      ) : (
        <div>
          <h2>Welcome Explorer!</h2>
          <button onClick={() => setIsLoggedIn(false)} style={{ padding: '0.5rem 1rem' }}>
            Logout
          </button>
        </div>
      )}
    </main>
  );
}
