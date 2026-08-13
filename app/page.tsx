"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vopavevysovvucmhkvkr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KohfZUd_E0OapmrmwrxaCQ_l-b0NdZe';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

interface FeedItem {
  id: string;
  user_id: string;
  mode: string;
  quest_text: string;
  photo_url: string;
  created_at: string;
  fire_count?: number;
  five_count?: number;
}

interface ChatMessage {
  id: string;
  sender_handle: string;
  message: string;
  created_at: string;
}

export default function Home() {
  const [tab, setTab] = useState<'quest' | 'feed'>('quest');
  const [mode, setMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [isSearching, setIsSearching] = useState(false);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [streak, setStreak] = useState(1);
  const [savedMins, setSavedMins] = useState(15);
  const [handle, setHandle] = useState('Explorer');
  const [badges, setBadges] = useState<string[]>(['🌱 First Step']);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Email Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [locationStatus, setLocationStatus] = useState<string>('');
  const [matchedPartner, setMatchedPartner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [activePlayerCount, setActivePlayerCount] = useState<number>(1);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Notifications are not supported on this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      new Notification('Break The Loop 🔥', {
        body: 'Daily reminders active! Get ready to destroy boredom.',
        icon: '/icon.png'
      });
    } else {
      alert('Notification access was denied.');
    }
  };

  const handleGuestLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setAuthError(error.message);
    } else if (data.session?.user) {
      setUserEmail('guest@breaktheloop.app');
      loadOrCreateProfile(data.session.user.id, 'guest@breaktheloop.app');
    }
  };

  const handleSendEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!emailInput.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await supabase.auth.signOut();

    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: {
        shouldCreateUser: true,
      }
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setIsOtpSent(true);
    }
  };

  const handleVerifyEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!otpInput.trim()) {
      setAuthError('Please enter the 6-digit code');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: emailInput,
      token: otpInput.trim(),
      type: 'email'
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.session?.user) {
      setUserEmail(emailInput);
      loadOrCreateProfile(data.session.user.id, emailInput);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsOtpSent(false);
    setOtpInput('');
    setEmailInput('');
  };

  const loadOrCreateProfile = async (userId: string, email: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('device_id', userId)
        .single();

      if (data) {
        setHandle(data.handle);
        setStreak(data.streak);
        setSavedMins(data.time_saved_mins);
        if (data.badges) setBadges(data.badges);
      } else {
        await supabase.from('profiles').insert([
          { device_id: userId, handle: 'Explorer', streak: 1, time_saved_mins: 15, badges: ['🌱 First Step'], phone: email }
        ]);
      }
    } catch (e) {
      console.log('Profile setup:', e);
    }
  };

  const saveHandle = async (newHandle: string) => {
    setHandle(newHandle);
    setIsEditingHandle(false);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'guest';
    try {
      await supabase
        .from('profiles')
        .update({ handle: newHandle })
        .eq('device_id', userId);
    } catch (e) {
      console.log('Handle update error:', e);
    }
  };

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
    if (tab === 'feed') {
      fetchGallery();
    }
  }, [tab]);

  const fetchGallery = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('mission_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logs && !error) {
        const { data: reactions } = await supabase.from('feed_reactions').select('*');

        const logsWithReactions = logs.map((log) => {
          const logReactions = reactions?.filter((r) => r.log_id === log.id) || [];
          return {
            ...log,
            fire_count: logReactions.filter((r) => r.reaction_type === 'fire').length,
            five_count: logReactions.filter((r) => r.reaction_type === 'five').length
          };
        });

        setFeedItems(logsWithReactions);
      }
    } catch (e) {
      console.log('Error fetching gallery:', e);
    }
  };

  const handleReact = async (logId: string, type: 'fire' | 'five') => {
    try {
      await supabase.from('feed_reactions').upsert([
        { log_id: logId, user_handle: handle, reaction_type: type }
      ]);
      fetchGallery();
    } catch (e) {
      console.log('Reaction error:', e);
    }
  };

  useEffect(() => {
    if (!activeQuest || mode === 'solo') return;

    const channel = supabase
      .channel('room_goregaon')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mission_messages', filter: "room_id=eq.room_goregaon" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeQuest, mode]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await supabase.from('mission_messages').insert([
        {
          room_id: 'room_goregaon',
          sender_handle: handle,
          message: msgText
        }
      ]);
    } catch (e) {
      console.log('Error sending message:', e);
    }
  };

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
    setMessages([]);
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
          await registerAndMatch(19.0176, 72.8481); // Dadar Default GPS
        }
      );
    } else {
      await registerAndMatch(19.0176, 72.8481);
    }
  };

  const registerAndMatch = async (lat: number, lng: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'guest_user';
    
    // Check if GPS is inside Greater Mumbai bounds
    const isMumbai = lat >= 18.8000 && lat <= 19.3500 && lng >= 72.7000 && lng <= 73.0000;
    const targetCity = isMumbai ? 'mumbai' : 'general';

    let selectedQuest = "Order a cutting chai at the nearest tapri and ask for Parle-G vs Khari recommendations.";
    try {
      // First try fetching city-specific quests
      const { data: dbQuests } = await supabase
        .from('quests')
        .select('quest_text')
        .eq('mode', mode)
        .eq('city', targetCity)
        .eq('is_active', true);

      if (dbQuests && dbQuests.length > 0) {
        selectedQuest = dbQuests[Math.floor(Math.random() * dbQuests.length)].quest_text;
      } else {
        // Fallback to general quests if no city quests match
        const { data: fallbackQuests } = await supabase
          .from('quests')
          .select('quest_text')
          .eq('mode', mode)
          .eq('city', 'general')
          .eq('is_active', true);

        if (fallbackQuests && fallbackQuests.length > 0) {
          selectedQuest = fallbackQuests[Math.floor(Math.random() * fallbackQuests.length)].quest_text;
        }
      }
    } catch (e) {
      console.log('Fetching dynamic quests error:', e);
    }

    try {
      if (mode !== 'solo') {
        const { data: existingQueue } = await supabase
          .from('active_queue')
          .select('active_quest')
          .eq('mode', mode)
          .not('active_quest', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingQueue && existingQueue.length > 0 && existingQueue[0].active_quest) {
          selectedQuest = existingQueue[0].active_quest;
        }
      }

      await supabase.from('active_queue').upsert([
        {
          user_id: userId,
          mode: mode,
          location: `POINT(${lng} ${lat})`,
          status: 'searching',
          active_quest: selectedQuest,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

      if (mode !== 'solo') {
        const { data: matches } = await supabase.rpc('get_nearby_matches', {
          user_lat: lat,
          user_lng: lng,
          search_mode: mode,
          radius_meters: 3000
        });

        const otherPlayer = matches?.find((m: { user_id: string; distance_meters: number }) => m.user_id !== userId);
        if (otherPlayer) {
          const dist = Math.round(otherPlayer.distance_meters);
          setMatchedPartner(`Matched: Partner (${dist}m away)`);
        } else {
          setMatchedPartner(`Searching for nearby ${mode}... (Found local hub match)`);
        }
      }
    } catch (e) {
      console.log('Database queueing active:', e);
    }

    setTimeout(() => {
      setActiveQuest(selectedQuest);
      setIsSearching(false);
    }, 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('Proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        const reader = new FileReader();
        reader.onloadend = () => setProofImage(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('Proofs').getPublicUrl(fileName);
        setProofImage(data.publicUrl);
      }
    } catch (err) {
      console.error('Catastrophic upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const evaluateBadges = (currentStreak: number, currentSavedMins: number, currentMode: string, existingBadges: string[]) => {
    const updated = [...existingBadges];

    if (currentStreak >= 3 && !updated.includes('🔥 3-Day Streak')) {
      updated.push('🔥 3-Day Streak');
    }
    if (currentSavedMins >= 60 && !updated.includes('⚡ 1 Hour Saved')) {
      updated.push('⚡ 1 Hour Saved');
    }
    if (currentMode === 'duo' && !updated.includes('🤝 Duo Tactician')) {
      updated.push('🤝 Duo Tactician');
    }
    if (currentMode === 'squad' && !updated.includes('👑 Squad Leader')) {
      updated.push('👑 Squad Leader');
    }

    return updated;
  };

  const handleCompleteMission = async () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'],
    });

    setIsCompleted(true);
    const newStreak = streak + 1;
    const newSavedMins = savedMins + 15;
    const updatedBadges = evaluateBadges(newStreak, newSavedMins, mode, badges);

    setStreak(newStreak);
    setSavedMins(newSavedMins);
    setBadges(updatedBadges);

    try {
      await supabase.from('mission_logs').insert([
        {
          user_id: handle,
          mode: mode,
          quest_text: activeQuest || 'Micro Mission Completed',
          photo_url: proofImage
        }
      ]);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({
            streak: newStreak,
            time_saved_mins: newSavedMins,
            badges: updatedBadges
          })
          .eq('device_id', session.user.id);
      }
    } catch (e) {
      console.log('Failed to log mission:', e);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 font-sans select-none">
      <header className="w-full max-w-md flex justify-between items-center py-4 border-b border-slate-800">
        <h1 className="text-xl font-extrabold tracking-wider text-rose-500">BREAK THE LOOP</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={requestNotificationPermission}
            className={`p-2 rounded-xl text-xs font-bold border transition-all ${
              notificationsEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={notificationsEnabled ? 'Notifications active' : 'Enable notifications'}
          >
            {notificationsEnabled ? '🔔' : '🔕'}
          </button>

          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setTab('quest')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                tab === 'quest' ? 'bg-rose-600 text-white' : 'text-slate-400'
              }`}
            >
              Quest
            </button>
            <button
              onClick={() => setTab('feed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                tab === 'feed' ? 'bg-rose-600 text-white' : 'text-slate-400'
              }`}
            >
              Feed
            </button>
          </div>
        </div>
      </header>

      {!userEmail && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="text-4xl">✉️</div>
            <h2 className="text-xl font-extrabold text-slate-100">JOIN BREAK THE LOOP</h2>
            <p className="text-xs text-slate-400">Enter your email or continue as a guest to save your streaks.</p>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl font-medium">{authError}</p>
            )}

            {!isOtpSent ? (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 text-center focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleSendEmailOtp}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  Send 6-Digit Code
                </button>
                
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or</span></div>
                </div>

                <button
                  onClick={handleGuestLogin}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-sm border border-slate-700 transition-all active:scale-95"
                >
                  ⚡ Continue as Guest
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit Email Code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono text-center focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleVerifyEmailOtp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  Verify & Continue
                </button>
                <button
                  onClick={() => setIsOtpSent(false)}
                  className="text-xs text-slate-500 hover:underline pt-2 block mx-auto"
                >
                  Change Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'quest' ? (
        <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-6">
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
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {mode} Mission Assigned
                </span>
                <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                  ⏱️ Rally: {formatTime(timeLeft)}
                </span>
              </div>

              {matchedPartner && (
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-center space-x-2 text-xs text-rose-300 font-semibold">
                  <span>🤝</span>
                  <span>{matchedPartner}</span>
                </div>
              )}

              <p className="text-base font-medium text-slate-200 leading-relaxed">
                "{activeQuest}"
              </p>

              {(mode === 'duo' || mode === 'squad') && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-2 text-left">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">💬 Live {mode.toUpperCase()} Rally Chat</span>
                    <span className="text-[9px] text-emerald-400 font-semibold">● Realtime</span>
                  </div>
                  <div className="h-28 overflow-y-auto space-y-2 pr-1 text-xs">
                    {messages.length === 0 ? (
                      <p className="text-[10px] text-slate-600 italic py-2 text-center">No messages yet. Coordinate your squad rally point!</p>
                    ) : (
                      messages.map((m, i) => (
                        <div key={i} className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] font-bold text-rose-400">@{m.sender_handle}: </span>
                          <span className="text-slate-300">{m.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Say something..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center bg-slate-950/50 space-y-1">
                {uploading ? (
                  <div className="py-4 flex flex-col items-center space-y-1">
                    <span className="animate-spin text-xl">☁️</span>
                    <span className="text-xs text-rose-400 font-semibold">Uploading photo to Supabase Cloud...</span>
                  </div>
                ) : proofImage ? (
                  <img src={proofImage} alt="Proof" className="w-full h-36 object-cover rounded-xl" />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center space-y-1 w-full py-1">
                    <span className="text-xl">📸</span>
                    <span className="text-xs text-slate-400 font-semibold">Attach Photo Proof</span>
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
                disabled={uploading}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
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
      ) : (
        <div className="w-full max-w-md my-auto space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-300">Community Proof Feed</h2>
            <span className="text-xs text-slate-500">{feedItems.length} Missions Logged</span>
          </div>

          <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {feedItems.length > 0 ? (
              feedItems.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-3">
                  {item.photo_url && (
                    <img src={item.photo_url} alt="Proof" className="w-full h-48 object-cover rounded-xl" />
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-rose-400">
                        @{item.user_id || 'Explorer'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">🔥 Loop Broken</span>
                    </div>
                    <p className="text-xs text-slate-200 italic font-medium">"{item.quest_text}"</p>

                    <div className="flex space-x-2 pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => handleReact(item.id, 'fire')}
                        className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 transition-all active:scale-95"
                      >
                        <span>🔥</span>
                        <span>{item.fire_count || 0}</span>
                      </button>
                      <button
                        onClick={() => handleReact(item.id, 'five')}
                        className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 transition-all active:scale-95"
                      >
                        <span>✋</span>
                        <span>{item.five_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No missions logged yet. Complete a mission to be the first!
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="w-full max-w-md bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3 mt-auto">
        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
          {isEditingHandle ? (
            <input
              type="text"
              defaultValue={handle}
              onBlur={(e) => saveHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveHandle(e.currentTarget.value)}
              autoFocus
              className="bg-slate-950 border border-rose-500/50 rounded-lg px-2 py-1 text-xs text-rose-400 font-bold focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingHandle(true)}
              className="text-xs font-bold text-rose-400 hover:underline flex items-center space-x-1"
            >
              <span>@{handle}</span>
              <span className="text-[10px] text-slate-500">✏️</span>
            </button>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-500">{userEmail ? `User: ${userEmail}` : 'Tap to edit handle'}</span>
            {userEmail && (
              <button
                onClick={handleSignOut}
                className="text-[10px] text-rose-400 hover:underline font-semibold"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px]">
          <span className="text-slate-500 text-[9px] font-semibold uppercase pr-1">Badges:</span>
          {badges.map((b, i) => (
            <span key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              {b}
            </span>
          ))}
        </div>

        <div className="flex justify-around text-center border-t border-slate-800/60 pt-2">
          <div>
            <p className="text-xs text-slate-500">Loop Streak</p>
            <p className="text-lg font-bold text-slate-200">{streak} Days 🔥</p>
          </div>
          <div className="w-px bg-slate-800" />
          <div>
            <p className="text-xs text-slate-500">Reel Time Saved</p>
            <p className="text-lg font-bold text-rose-400">{savedMins} Mins ⚡</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
