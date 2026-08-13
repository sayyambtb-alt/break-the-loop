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
  const [roomId, setRoomId] = useState<string>('room_goregaon');
  const [isInviteSession, setIsInviteSession] = useState<boolean>(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [streak, setStreak] = useState(1);
  const [savedMins, setSavedMins] = useState(15);
  const [handle, setHandle] = useState('Explorer');
  const [badges, setBadges] = useState<string[]>(['🌱 First Step']);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [matchedPartner, setMatchedPartner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const urlMode = params.get('mode');
      const urlQuest = params.get('quest');

      if (urlRoom) {
        setRoomId(urlRoom);
        setIsInviteSession(true);
        if (urlMode) setMode(urlMode as 'duo' | 'squad');
        if (urlQuest) setActiveQuest(decodeURIComponent(urlQuest));
        setMatchedPartner('Joined Direct WhatsApp Lobby 🤝');
      }
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const handleGuestLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
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
    if (!emailInput.includes('@')) return setAuthError('Please enter a valid email address');
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({ email: emailInput, options: { shouldCreateUser: true } });
    if (error) setAuthError(error.message);
    else setIsOtpSent(true);
  };

  const handleVerifyEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!otpInput.trim()) return setAuthError('Please enter the 6-digit code');
    const { data, error } = await supabase.auth.verifyOtp({ email: emailInput, token: otpInput.trim(), type: 'email' });
    if (error) setAuthError(error.message);
    else if (data.session?.user) {
      setUserEmail(emailInput);
      loadOrCreateProfile(data.session.user.id, emailInput);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsOtpSent(false);
    setOtpInput('');
    setEmailInput('');
  };

  const loadOrCreateProfile = async (userId: string, email: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('device_id', userId).single();
      if (data) {
        setHandle(data.handle);
        setStreak(data.streak);
        setSavedMins(data.time_saved_mins);
        if (data.badges) setBadges(data.badges);
      } else {
        await supabase.from('profiles').insert([{ device_id: userId, handle: 'Explorer', streak: 1, time_saved_mins: 15, badges: ['🌱 First Step'], phone: email }]);
      }
    } catch (e) { console.log(e); }
  };

  const saveHandle = async (newHandle: string) => {
    setHandle(newHandle);
    setIsEditingHandle(false);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      await supabase.from('profiles').update({ handle: newHandle }).eq('device_id', session?.user?.id || 'guest');
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    if (tab === 'feed') fetchGallery();
  }, [tab]);

  const fetchGallery = async () => {
    try {
      const { data: logs, error } = await supabase.from('mission_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (logs && !error) {
        const { data: reactions } = await supabase.from('feed_reactions').select('*');
        const logsWithReactions = logs.map((log) => ({
          ...log,
          fire_count: reactions?.filter((r) => r.log_id === log.id && r.reaction_type === 'fire').length || 0,
          five_count: reactions?.filter((r) => r.log_id === log.id && r.reaction_type === 'five').length || 0
        }));
        setFeedItems(logsWithReactions);
      }
    } catch (e) { console.log(e); }
  };

  const handleReact = async (logId: string, type: 'fire' | 'five') => {
    try {
      await supabase.from('feed_reactions').upsert([{ log_id: logId, user_handle: handle, reaction_type: type }]);
      fetchGallery();
    } catch (e) { console.log(e); }
  };

  // Realtime Chat Subscription Sync
  useEffect(() => {
    if (!activeQuest || mode === 'solo') return;
    const channel = supabase.channel(roomId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mission_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeQuest, mode, roomId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const msgText = newMessage.trim();
    setNewMessage('');
    try {
      await supabase.from('mission_messages').insert([{ room_id: roomId, sender_handle: handle, message: msgText }]);
    } catch (e) { console.log(e); }
  };

  const handleWhatsAppInvite = () => {
    const inviteLink = `https://breaktheloopapp.in/?room=${roomId}&mode=${mode}&quest=${encodeURIComponent(activeQuest || '')}`;
    const text = encodeURIComponent(`🔥 Hey! @${handle} invited you to a ${mode.toUpperCase()} Raid on Break The Loop!\n\nTap this link to join my exact mission lobby right now:\n${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  useEffect(() => {
    if (!activeQuest || isCompleted) return;
    const timer = setInterval(() => { setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1)); }, 1000);
    return () => clearInterval(timer);
  }, [activeQuest, isCompleted]);

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleBreakLoop = async () => {
    setIsSearching(true);
    setProofImage(null);
    setIsCompleted(false);
    setCardDataUrl(null);
    setMessages([]);
    setTimeLeft(600);

    let currentRoom = roomId;
    if (!isInviteSession) {
      currentRoom = `room_${Math.random().toString(36).substring(2, 9)}`;
      setRoomId(currentRoom);
      setMatchedPartner(null);
    }

    if ('geolocation' in navigator) {
      setLocationStatus('Acquiring GPS fix...');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setLocationStatus(`GPS Locked: ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
          await registerAndMatch(pos.coords.latitude, pos.coords.longitude, currentRoom);
        },
        async () => {
          setLocationStatus('GPS fallback: Dadar Active');
          await registerAndMatch(19.0176, 72.8481, currentRoom);
        }
      );
    } else {
      await registerAndMatch(19.0176, 72.8481, currentRoom);
    }
  };

  const registerAndMatch = async (lat: number, lng: number, currentRoom: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'guest_user';
    const isMumbai = lat >= 18.8000 && lat <= 19.3500 && lng >= 72.7000 && lng <= 73.0000;
    const targetCity = isMumbai ? 'mumbai' : 'general';

    let matchFound = false;
    let finalRoomId = currentRoom;
    let finalQuest = activeQuest;

    try {
      // Step 1: Real GPS Local Matchmaking via PostGIS
      if (mode !== 'solo' && !isInviteSession) {
        const { data: matches } = await supabase.rpc('get_nearby_matches', { user_lat: lat, user_lng: lng, search_mode: mode, radius_meters: 3000 });
        const otherPlayer = matches?.find((m: any) => m.user_id !== userId);

        if (otherPlayer) {
          // Step 2: Grab the exact room ID and quest from the nearby player
          const { data: partnerQueue } = await supabase
            .from('active_queue')
            .select('status, active_quest, created_at')
            .eq('user_id', otherPlayer.user_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (partnerQueue && partnerQueue.length > 0) {
            const twoMinsAgo = Date.now() - 120000;
            if (new Date(partnerQueue[0].created_at).getTime() > twoMinsAgo) {
              finalRoomId = partnerQueue[0].status; 
              finalQuest = partnerQueue[0].active_quest;
              matchFound = true;
              setRoomId(finalRoomId);
              setMatchedPartner(`Matched: Local Partner (${Math.round(otherPlayer.distance_meters)}m away) 🤝`);
            }
          }
        }
      }

      // Step 3: If no match was found (or if solo), generate a brand new quest
      if (!matchFound && !finalQuest) {
        const { data: dbQuests } = await supabase.from('quests').select('quest_text').eq('mode', mode).eq('city', targetCity).eq('is_active', true);
        if (dbQuests && dbQuests.length > 0) finalQuest = dbQuests[Math.floor(Math.random() * dbQuests.length)].quest_text;
        else finalQuest = "Rally nearby and complete a micro-mission!";
        
        if (mode !== 'solo' && !isInviteSession) {
          setMatchedPartner(`No active players nearby right now. Tap "Invite Friend" below!`);
        }
      }

      // Step 4: Write your session state (with your Final Room ID) into the queue so others can find YOU
      await supabase.from('active_queue').upsert([
        { user_id: userId, mode: mode, location: `POINT(${lng} ${lat})`, status: finalRoomId, active_quest: finalQuest, created_at: new Date().toISOString() }
      ], { onConflict: 'id' });

    } catch (e) {
      console.log('Matchmaking Error:', e);
    }

    setTimeout(async () => {
      setActiveQuest(finalQuest);
      setIsSearching(false);
      
      // Notify the other player that you successfully hijacked their room
      if (matchFound) {
        await supabase.from('mission_messages').insert([
          { room_id: finalRoomId, sender_handle: 'System', message: `✅ @${handle} auto-matched nearby and joined the local raid!` }
        ]);
      }
    }, 1500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('Proofs').upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg' });
      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => setProofImage(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('Proofs').getPublicUrl(fileName);
        setProofImage(data.publicUrl);
      }
    } catch (err) { console.log(err); } finally { setUploading(false); }
  };

  const handleCompleteMission = async () => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'] });
    setIsCompleted(true);
    const newStreak = streak + 1;
    const newSavedMins = savedMins + 15;
    
    const updatedBadges = [...badges];
    if (newStreak >= 3 && !updatedBadges.includes('🔥 3-Day Streak')) updatedBadges.push('🔥 3-Day Streak');
    if (newSavedMins >= 60 && !updatedBadges.includes('⚡ 1 Hour Saved')) updatedBadges.push('⚡ 1 Hour Saved');
    if (mode === 'duo' && !updatedBadges.includes('🤝 Duo Tactician')) updatedBadges.push('🤝 Duo Tactician');

    setStreak(newStreak);
    setSavedMins(newSavedMins);
    setBadges(updatedBadges);

    try {
      await supabase.from('mission_logs').insert([{ user_id: handle, mode: mode, quest_text: activeQuest || 'Micro Mission', photo_url: proofImage }]);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').update({ streak: newStreak, time_saved_mins: newSavedMins, badges: updatedBadges }).eq('device_id', session.user.id);
      }
    } catch (e) { console.log(e); }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 font-sans select-none">
      <header className="w-full max-w-md flex justify-between items-center py-4 border-b border-slate-800">
        <h1 className="text-xl font-extrabold tracking-wider text-rose-500">BREAK THE LOOP</h1>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button onClick={() => setTab('quest')} className={`px-3 py-1 rounded-lg font-bold transition-all ${tab === 'quest' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>Quest</button>
          <button onClick={() => setTab('feed')} className={`px-3 py-1 rounded-lg font-bold transition-all ${tab === 'feed' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>Feed</button>
        </div>
      </header>

      {!userEmail && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-100">JOIN BREAK THE LOOP</h2>
            <button onClick={handleGuestLogin} className="w-full bg-slate-800 text-slate-200 py-3 rounded-xl font-bold text-sm border border-slate-700">⚡ Continue as Guest</button>
          </div>
        </div>
      )}

      {tab === 'quest' ? (
        <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-6">
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full justify-between">
            {(['solo', 'duo', 'squad'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setActiveQuest(null); setProofImage(null); setIsCompleted(false); setIsInviteSession(false); }} className={`flex-1 py-2 text-sm font-semibold rounded-xl capitalize transition-all ${mode === m ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>{m}</button>
            ))}
          </div>

          {!activeQuest && !isCompleted && (
            <div className="flex flex-col items-center space-y-6">
              <button onClick={handleBreakLoop} disabled={isSearching} className={`w-56 h-56 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 border-8 border-rose-950 shadow-[0_0_50px_rgba(225,29,72,0.4)] flex flex-col items-center justify-center text-white font-black text-2xl tracking-wide ${isSearching ? 'animate-pulse opacity-80' : ''}`}>
                {isSearching ? <span className="text-2xl animate-spin">🌀</span> : <span>DESTROY BOREDOM</span>}
              </button>
              <p className="text-xs text-slate-500">{isSearching ? locationStatus : 'Tap to trigger a micro-mission.'}</p>
            </div>
          )}

          {activeQuest && !isCompleted && (
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase">{mode} Mission</span>
                <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">⏱️ {formatTime(timeLeft)}</span>
              </div>
              {matchedPartner && <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-rose-300 font-semibold">{matchedPartner}</div>}
              <p className="text-base font-medium text-slate-200 leading-relaxed">"{activeQuest}"</p>

              {(mode === 'duo' || mode === 'squad') && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-2 text-left">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">💬 Live Rally Chat</span>
                    <button onClick={handleWhatsAppInvite} className="text-[10px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">📲 Invite Friend</button>
                  </div>
                  <div className="h-28 overflow-y-auto space-y-2 pr-1 text-xs">
                    {messages.length === 0 ? <p className="text-[10px] text-slate-600 italic py-2 text-center">No messages yet. Say hi!</p> : messages.map((m, i) => (
                        <div key={i} className={`bg-slate-900 p-2 rounded-xl border ${m.sender_handle === 'System' ? 'border-emerald-500/30' : 'border-slate-800/80'}`}>
                          <span className={`text-[10px] font-bold ${m.sender_handle === 'System' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.sender_handle === 'System' ? '🤖 System: ' : `@${m.sender_handle}: `}</span>
                          <span className={m.sender_handle === 'System' ? 'text-emerald-200 font-semibold italic' : 'text-slate-300'}>{m.message}</span>
                        </div>
                      ))}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <input type="text" placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none" />
                    <button onClick={sendMessage} className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">Send</button>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-3 bg-slate-950/50">
                {uploading ? <span className="animate-spin text-xl">☁️</span> : proofImage ? <img src={proofImage} alt="Proof" className="w-full h-36 object-cover rounded-xl" /> : (
                  <label className="cursor-pointer flex flex-col items-center space-y-1 w-full py-1">
                    <span className="text-xl">📸</span><span className="text-xs text-slate-400 font-semibold">Take Live Photo Proof</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
              <button onClick={handleCompleteMission} disabled={uploading} className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold text-sm">Complete & Log Proof</button>
            </div>
          )}

          {isCompleted && (
            <div className="w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="text-4xl">🎉</div>
              <h2 className="text-xl font-extrabold text-emerald-400">LOOP BROKEN!</h2>
              <button onClick={() => setIsCompleted(false)} className="w-full bg-slate-800 text-slate-200 py-3 rounded-xl font-semibold text-sm">Back to Home</button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md my-auto space-y-4">
          <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {feedItems.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-3">
                {item.photo_url && <img src={item.photo_url} alt="Proof" className="w-full h-48 object-cover rounded-xl" />}
                <p className="text-xs text-slate-200 italic font-medium">"{item.quest_text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
