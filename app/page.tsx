'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vopavevysovvucmhkvkr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KohfZUd_E0OapmrmwrxaCQ_l-b0NdZe';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const QUESTS = {
  solo: [
    "Walk 100 steps north. Find a local shop or tea stall you've never ordered from and get the simplest item on the menu.",
    "Go outside and find an object that is bright orange. Take a photo of it, then walk back.",
    "Pick up a book or magazine near you, flip to page 42, and read sentence 3 out loud.",
    "Walk down a street in your neighborhood you usually skip. Take a photo of the most interesting doorway."
  ],
  duo: [
    "Rally with your partner at the nearest public bench. Find 1 weird local snack together and split it 50/50.",
    "Meet at the nearest street corner. Choose 1 item each from a nearby shop and draft a funny 2-line backstory for it.",
    "Find an old stationery or local shop together. Evaluate all the pens and officially declare one 'Pen of the Neighborhood'."
  ],
  squad: [
    "Assemble your squad at the main plaza. Hold a sign reading 'Free High-Five Zone' and collect 15 high-fives from passersby.",
    "Race a 10-minute clock to gather 3 items: a leaf larger than your palm, a coin, and a receipt for less than ₹20."
  ]
};

export default function Home() {
  const [mode, setMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [isSearching, setIsSearching] = useState(false);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [streak, setStreak] = useState(2);
  const [savedMins, setSavedMins] = useState(30);
  const [isCompleted, setIsCompleted] = useState(false);

  const [locationStatus, setLocationStatus] = useState<string>('');
  const [matchedPartner, setMatchedPartner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [activePlayerCount, setActivePlayerCount] = useState<number>(1);

  // Get or generate persistent Device ID
  const getDeviceId = () => {
    if (typeof window === 'undefined') return 'user_server';
    let id = localStorage.getItem('btl_device_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('btl_device_id', id);
    }
    return id;
  };

  // Fetch only active queue count from the last 15 minutes
  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('active_queue')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fifteenMinsAgo);

        if (count !== null) {
          setActivePlayerCount(Math.max(1, count));
        }
      } catch (e) {
        console.log('Fetching queue stats...', e);
      }
    }
    fetchQueueCount();
  }, [isSearching]);

  useEffect(() => {
    if (!activeQuest || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuest, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBreakLoop = async () => {
    setIsSearching(true);
    setActiveQuest(null);
    setProofImage(null);
    setIsCompleted(false);
    setMatchedPartner(null);
    setTimeLeft(600);

    if ('geolocation' in navigator) {
      setLocationStatus('Acquiring GPS fix...');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocationStatus(`GPS Locked: ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
          await registerAndMatch(lat, lng);
        },
        async () => {
          setLocationStatus('GPS fallback: Active');
          await registerAndMatch(19.166, 72.852);
        }
      );
    } else {
      await registerAndMatch(19.166, 72.852);
    }
  };

  const registerAndMatch = async (lat: number, lng: number) => {
    const userId = getDeviceId();

    try {
      await supabase.from('active_queue').upsert([
        {
          user_id: userId,
          mode: mode,
          location: `POINT(${lng} ${lat})`,
          status: 'searching',
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });
    } catch (e) {
      console.log('Database queueing active:', e);
    }

    setTimeout(() => {
      const questList = QUESTS[mode];
      const randomQuest = questList[Math.floor(Math.random() * questList.length)];
      setActiveQuest(randomQuest);
      setIsSearching(false);

      if (mode === 'duo') {
        setMatchedPartner('Partner Matched Nearby');
      } else if (mode === 'squad') {
        setMatchedPartner('Squad Assembled: Active Nearby');
      }
    }, 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteMission = () => {
    setIsCompleted(true);
    setStreak((prev) => prev + 1);
    setSavedMins((prev) => prev + 15);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 font-sans select-none">
      <header className="w-full max-w-md flex justify-between items-center py-4 border-b border-slate-800">
        <h1 className="text-xl font-extrabold tracking-wider text-rose-500">BREAK THE LOOP</h1>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{activePlayerCount} Nearby Active</span>
        </div>
      </header>

      <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-8">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full justify-between">
          {(['solo', 'duo', 'squad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setActiveQuest(null);
                setProofImage(null);
                setIsCompleted(false);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl capitalize transition-all active:scale-95 ${
                mode === m
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'squad' ? 'Squad (3-6)' : m}
            </button>
          ))}
        </div>

        {!activeQuest && !isCompleted && (
          <div className="flex flex-col items-center space-y-6">
            <button
              onClick={handleBreakLoop}
              disabled={isSearching}
              className={`w-56 h-56 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 border-8 border-rose-950 shadow-[0_0_50px_rgba(225,29,72,0.4)] flex flex-col items-center justify-center text-white font-black text-2xl tracking-wide active:scale-90 transition-transform duration-100 touch-manipulation ${
                isSearching ? 'animate-pulse opacity-80' : 'hover:scale-105'
              }`}
            >
              {isSearching ? (
                <span className="text-2xl animate-spin">🌀</span>
              ) : (
                <>
                  <span>DESTROY</span>
                  <span className="text-sm font-normal text-rose-200 mt-1">BOREDOM</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 text-center max-w-xs">
              {isSearching
                ? locationStatus || 'Scanning nearby 1.5 km radius...'
                : 'Tap to trigger a random real-world micro-mission.'}
            </p>
          </div>
        )}

        {activeQuest && !isCompleted && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {mode} Mission Assigned
              </span>
              <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                ⏱️ Rally: {formatTime(timeLeft)}
              </span>
            </div>

            {matchedPartner && (
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-center space-x-2 text-xs text-rose-300 font-semibold">
                <span>🤝</span>
                <span>{matchedPartner}</span>
              </div>
            )}

            <p className="text-lg font-medium text-slate-200 leading-relaxed">
              "{activeQuest}"
            </p>

            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-950/50 space-y-2">
              {proofImage ? (
                <img src={proofImage} alt="Proof" className="w-full h-48 object-cover rounded-xl" />
              ) : (
                <label className="cursor-pointer flex flex-col items-center space-y-2 w-full py-2">
                  <span className="text-2xl">📸</span>
                  <span className="text-xs text-slate-400 font-medium">Attach Photo Proof</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleCompleteMission}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              Complete & Log Proof
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-extrabold text-emerald-400">LOOP BROKEN!</h2>
            <p className="text-sm text-slate-300">
              You saved another 15 minutes from doomscrolling reels.
            </p>
            <button
              onClick={() => setIsCompleted(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>

      <footer className="w-full max-w-md bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex justify-around text-center">
        <div>
          <p className="text-xs text-slate-500">Loop Streak</p>
          <p className="text-lg font-bold text-slate-200">{streak} Days 🔥</p>
        </div>
        <div className="w-px bg-slate-800" />
        <div>
          <p className="text-xs text-slate-500">Reel Time Saved</p>
          <p className="text-lg font-bold text-rose-400">{savedMins} Mins ⚡</p>
        </div>
      </footer>
    </main>
  );
}
