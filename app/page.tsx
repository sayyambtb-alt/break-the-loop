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

  // Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Safety Modal State
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Friends & Wrapped State
  const [lastPartnerHandle, setLastPartnerHandle] = useState<string | null>(null);
  const [isFriendAdded, setIsFriendAdded] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  const [wrappedCardDataUrl, setWrappedCardDataUrl] = useState<string | null>(null);

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [matchedPartner, setMatchedPartner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  // Chat & Moderation State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageSentTime, setLastMessageSentTime] = useState<number>(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const queueSubscriptionRef = useRef<any>(null);
  const myQueueEntryIdRef = useRef<string | null>(null);

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

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const email = session.user.email;
          if (email && email !== 'guest@breaktheloop.app') {
            setUserEmail(email);
            setIsGuest(false);
          } else {
            setIsGuest(true);
            setUserEmail('guest@breaktheloop.app');
          }
          setIsLoggedIn(true);
          loadOrCreateProfile(session.user.id, email || 'guest@breaktheloop.app');
          fetchFriends(session.user.id);
        } else {
          setIsLoggedIn(false);
        }
      });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      new Notification('Break The Loop 🔥', {
        body: 'Daily reminders active! Get ready to destroy boredom.',
        icon: '/icon.png'
      });
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
      setIsGuest(true);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      loadOrCreateProfile(data.session.user.id, 'guest@breaktheloop.app');
      fetchFriends(data.session.user.id);
    }
  };

  const handleSendEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput.includes('@')) return setAuthError('Please enter a valid email address');
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { shouldCreateUser: true }
    });
    if (error) setAuthError(error.message);
    else setIsOtpSent(true);
  };

  const handleVerifyEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!otpInput.trim()) return setAuthError('Please enter the 6-digit code');
    const { data, error } = await supabase.auth.verifyOtp({
      email: emailInput,
      token: otpInput.trim(),
      type: 'email'
    });
    if (error) {
      setAuthError(error.message);
    } else if (data.session?.user) {
      setUserEmail(emailInput);
      setIsGuest(false);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      loadOrCreateProfile(data.session.user.id, emailInput);
      fetchFriends(data.session.user.id);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsGuest(false);
    setIsLoggedIn(false);
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
        await supabase.from('profiles').insert([
          { device_id: userId, handle: 'Explorer', streak: 1, time_saved_mins: 15, badges: ['🌱 First Step'], phone: email }
        ]);
      }
    } catch (e) {
      console.log('Profile setup error:', e);
    }
  };

  const fetchFriends = async (userId: string) => {
    try {
      const { data } = await supabase.from('friends').select('friend_handle').eq('user_id', userId);
      if (data) {
        setFriendsList(data.map((f) => f.friend_handle));
      }
    } catch (e) {
      console.log('Error fetching friends:', e);
    }
  };

  const handleAddFriend = async () => {
    if (!lastPartnerHandle) return;
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || 'guest_user';

    try {
      await supabase.from('friends').insert([
        { user_id: currentUserId, friend_handle: lastPartnerHandle }
      ]);
      setIsFriendAdded(true);
      setFriendsList((prev) => Array.from(new Set([...prev, lastPartnerHandle])));
    } catch (e) {
      console.log('Add friend error:', e);
    }
  };

  const saveHandle = async (newHandle: string) => {
    setHandle(newHandle);
    setIsEditingHandle(false);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'guest';
    try {
      await supabase.from('profiles').update({ handle: newHandle }).eq('device_id', userId);
    } catch (e) {
      console.log('Handle update error:', e);
    }
  };

  const handleSelectMode = (selectedMode: 'solo' | 'duo' | 'squad') => {
    if ((selectedMode === 'duo' || selectedMode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbaikars in ${selectedMode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }

    setMode(selectedMode);
    setActiveQuest(null);
    setProofImage(null);
    setIsCompleted(false);
    setIsInviteSession(false);
    setIsSearching(false);
  };

  useEffect(() => {
    if (tab === 'feed') fetchGallery();
  }, [tab]);

  const fetchGallery = async () => {
    try {
      const { data: logs, error } = await supabase.from('mission_logs').select('*').order('created_at', { ascending: false }).limit(20);
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

  const handleReport = async (type: 'chat' | 'feed', targetId: string) => {
    const reason = window.prompt('Please specify the reason for reporting this content:');
    if (!reason || !reason.trim()) return;

    try {
      await supabase.from('reports').insert([
        {
          reporter_handle: handle,
          reported_type: type,
          target_id: targetId,
          reason: reason.trim()
        }
      ]);
      alert('Report submitted. Our team will review this shortly.');
    } catch (e) {
      console.log('Report error:', e);
    }
  };

  useEffect(() => {
    if (!activeQuest || mode === 'solo') return;

    const channel = supabase
      .channel(roomId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mission_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeQuest, mode, roomId]);

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastMessageSentTime < 3000) {
      alert('Please wait 3 seconds before sending another message.');
      return;
    }

    if (trimmed.length > 300) {
      alert('Message must be 300 characters or fewer.');
      return;
    }

    setLastMessageSentTime(now);
    setNewMessage('');
    try {
      await supabase.from('mission_messages').insert([
        { room_id: roomId, sender_handle: handle, message: trimmed }
      ]);
    } catch (e) {
      console.log('Error sending message:', e);
    }
  };

  const handleWhatsAppInvite = () => {
    const inviteLink = `https://breaktheloopapp.in/?room=${roomId}&mode=${mode}&quest=${encodeURIComponent(activeQuest || '')}`;
    const text = encodeURIComponent(
      `🔥 Hey! @${handle} invited you to a ${mode.toUpperCase()} Raid on Break The Loop!\n\nTap this link to join my exact mission lobby right now:\n${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  useEffect(() => {
    if (!activeQuest || isCompleted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuest, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const onStartMatchingClick = () => {
    if ((mode === 'duo' || mode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbaikars in ${mode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }

    if (mode !== 'solo' && !isInviteSession) {
      setShowSafetyModal(true);
    } else {
      executeMatchmaking();
    }
  };

  const executeMatchmaking = async () => {
    setShowSafetyModal(false);
    setIsSearching(true);
    setActiveQuest(null);
    setProofImage(null);
    setIsCompleted(false);
    setCardDataUrl(null);
    setIsFriendAdded(false);
    setMessages([]);
    setTimeLeft(600);

    const generatedRoom = isInviteSession ? roomId : `room_${Math.random().toString(36).substring(2, 9)}`;
    if (!isInviteSession) {
      setRoomId(generatedRoom);
      setMatchedPartner(null);
    }

    if (mode === 'solo' || isInviteSession) {
      await pickRandomQuest();
      setIsSearching(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || 'guest_user';

    try {
      const { data: matchResult, error } = await supabase.rpc('find_or_create_match', {
        p_user_id: currentUserId,
        p_mode: mode,
        p_handle: handle,
        p_city: 'mumbai'
      });

      if (error) {
        console.error('Matchmaking error detail:', error);
        alert(`Matchmaking error: ${error.message || JSON.stringify(error)}`);
        setIsSearching(false);
        return;
      }

      if (matchResult && matchResult.matched) {
        setRoomId(matchResult.room_id);
        setActiveQuest(matchResult.quest_text);
        const pHandle = matchResult.partner_handle || 'Explorer';
        setLastPartnerHandle(pHandle);
        setMatchedPartner(`Matched: Local Partner (@${pHandle}) 🤝`);
        setIsSearching(false);
      } else if (matchResult && matchResult.queue_id) {
        myQueueEntryIdRef.current = matchResult.queue_id;

        const queueChannel = supabase
          .channel(`queue_${matchResult.queue_id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'matchmaking_queue',
              filter: `id=eq.${matchResult.queue_id}`
            },
            (payload: any) => {
              if (payload.new && payload.new.status === 'matched') {
                setRoomId(payload.new.room_id);
                setActiveQuest(payload.new.quest_text);
                const pHandle = payload.new.matched_with_handle || 'Explorer';
                setLastPartnerHandle(pHandle);
                setMatchedPartner(`Matched: Local Partner (@${pHandle}) 🤝`);
                setIsSearching(false);
                supabase.removeChannel(queueChannel);
              }
            }
          )
          .subscribe();

        queueSubscriptionRef.current = queueChannel;
      }
    } catch (err: any) {
      console.error('Catastrophic match error:', err);
      alert(`Connection error: ${err.message || err}`);
      setIsSearching(false);
    }
  };

  const cancelSearch = async () => {
    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
    }
    if (myQueueEntryIdRef.current) {
      try {
        await supabase.from('matchmaking_queue').delete().eq('id', myQueueEntryIdRef.current);
      } catch (e) {
        console.log('Error cleaning queue entry:', e);
      }
    }
    setIsSearching(false);
    setActiveQuest(null);
  };

  const pickRandomQuest = async () => {
    try {
      const { data: dbQuests } = await supabase
        .from('quests')
        .select('quest_text')
        .eq('mode', mode)
        .eq('city', 'mumbai')
        .eq('is_active', true);

      if (dbQuests && dbQuests.length > 0) {
        setActiveQuest(dbQuests[Math.floor(Math.random() * dbQuests.length)].quest_text);
      } else {
        setActiveQuest("Rally nearby and complete a micro-mission!");
      }
    } catch (e) {
      setActiveQuest("Rally nearby and complete a micro-mission!");
    }
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
        const reader = new FileReader();
        reader.onloadend = () => setProofImage(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('Proofs').getPublicUrl(fileName);
        setProofImage(data.publicUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const evaluateBadges = (currentStreak: number, currentSavedMins: number, currentMode: string, existingBadges: string[]) => {
    const updated = [...existingBadges];
    if (currentStreak >= 3 && !updated.includes('🔥 3-Day Streak')) updated.push('🔥 3-Day Streak');
    if (currentSavedMins >= 60 && !updated.includes('⚡ 1 Hour Saved')) updated.push('⚡ 1 Hour Saved');
    if (currentMode === 'duo' && !updated.includes('🤝 Duo Tactician')) updated.push('🤝 Duo Tactician');
    if (currentMode === 'squad' && !updated.includes('👑 Squad Leader')) updated.push('👑 Squad Leader');
    return updated;
  };

  const generateShareCard = (newStreak: number, newSavedMins: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.beginPath();
    ctx.arc(540, 400, 350, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BREAK THE LOOP', 540, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 32px sans-serif';
    ctx.fillText('MUMBAI REAL-WORLD RAID', 540, 280);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(100, 360, 880, 1100, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.beginPath();
    ctx.roundRect(140, 420, 800, 80, 20);
    ctx.fill();

    ctx.fillStyle = '#fda4af';
    ctx.font = '700 36px sans-serif';
    ctx.fillText(`MODE: ${mode.toUpperCase()} MISSION BROKEN 🔥`, 540, 475);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 42px sans-serif';
    const text = `"${activeQuest || 'Completed a local real-world mission in Mumbai'}"`;
    const words = text.split(' ');
    let line = '';
    let y = 600;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 780 && i > 0) {
        ctx.fillText(line, 540, y);
        line = words[i] + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 540, y);

    const statsY = Math.max(y + 100, 1050);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 32px sans-serif';
    ctx.fillText('STREAK', 320, statsY);
    ctx.fillText('TIME SAVED', 760, statsY);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${newStreak} Days 🔥`, 320, statsY + 80);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${newSavedMins} Mins ⚡`, 760, statsY + 80);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 40px sans-serif';
    ctx.fillText(`@${handle} • Mumbai, MH 📍`, 540, 1580);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 32px sans-serif';
    ctx.fillText('Join at breaktheloopapp.in', 540, 1650);

    setCardDataUrl(canvas.toDataURL('image/png'));
  };

  const generateSpotifyWrappedCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(0.3, '#1e1b4b');
    bgGradient.addColorStop(0.7, '#881337');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.beginPath();
    ctx.arc(200, 300, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath();
    ctx.arc(880, 1400, 350, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BREAK THE LOOP', 540, 200);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('YOUR MONTHLY IRL RECAP 🎧', 540, 260);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(100, 340, 880, 1250, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 56px sans-serif';
    ctx.fillText('YOU DESTROYED ROUTINE', 540, 460);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 30px sans-serif';
    ctx.fillText('While Mumbai was stuck scrolling reels...', 540, 520);

    const hoursSaved = (savedMins / 60).toFixed(1);
    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 90px sans-serif';
    ctx.fillText(`${savedMins} MINS`, 540, 680);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`⚡ Approx ${hoursSaved} hrs reclaimed from screen addiction`, 540, 740);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 80px sans-serif';
    ctx.fillText(`${streak} DAYS STREAK`, 540, 900);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 32px sans-serif';
    ctx.fillText('🔥 Top 5% Spontaneous Mumbaikar', 540, 960);

    const topBadge = badges[badges.length - 1] || '🌱 First Step';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(topBadge, 540, 1120);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 30px sans-serif';
    ctx.fillText('🏆 Highest Rank Unlocked', 540, 1180);

    ctx.fillStyle = '#a855f7';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${friendsList.length} RAID PARTNERS`, 540, 1340);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 30px sans-serif';
    ctx.fillText('🤝 Met IRL in the Real World', 540, 1400);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 42px sans-serif';
    ctx.fillText(`@${handle} • Mumbai, MH`, 540, 1680);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 30px sans-serif';
    ctx.fillText('Get your recap at breaktheloopapp.in', 540, 1750);

    const url = canvas.toDataURL('image/png');
    setWrappedCardDataUrl(url);
    setShowWrappedModal(true);
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

    generateShareCard(newStreak, newSavedMins);

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

  const handleShareCard = async (imgUrl: string | null) => {
    if (!imgUrl) return;

    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], 'break-the-loop.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Break The Loop 🔥',
          text: 'I just broke the reel addiction loop in Mumbai! Check this out.'
        });
      } else {
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = 'break-the-loop-card.png';
        a.click();
      }
    } catch (e) {
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = 'break-the-loop-card.png';
      a.click();
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

      {/* Auth Modal */}
      {(!isLoggedIn || showAuthModal) && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl relative">
            {isLoggedIn && (
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            )}
            <div className="text-4xl">✉️</div>
            <h2 className="text-xl font-extrabold text-slate-100">
              {showAuthModal ? 'EMAIL VERIFICATION' : 'JOIN BREAK THE LOOP'}
            </h2>
            <p className="text-xs text-slate-400">
              {authModalReason || 'Enter your email to save streaks or continue as a guest for solo missions.'}
            </p>

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
                  ⚡ Continue as Guest (Solo Mode Only)
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

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-3xl">🛡️</div>
            <h2 className="text-lg font-extrabold text-slate-100">SAFETY FIRST</h2>
            <div className="text-xs text-slate-300 text-left space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <p>• <strong>Meet in Public:</strong> Coordinate only at visible, public landmarks.</p>
              <p>• <strong>Trust Your Instincts:</strong> Leave or cancel the mission immediately if you feel uncomfortable.</p>
              <p>• <strong>Never Share Private Data:</strong> Do not disclose banking, OTPs, or exact home addresses.</p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowSafetyModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executeMatchmaking}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                I Agree & Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends List Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-sm font-bold text-slate-200">🤝 Raid Squad ({friendsList.length})</h2>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {friendsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No squad friends added yet. Complete a Duo/Squad mission and tap "Add as Friend"!</p>
              ) : (
                friendsList.map((f, i) => (
                  <div key={i} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="font-bold text-rose-400">@{f}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Met IRL ⚡</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spotify-Wrapped Recap Modal */}
      {showWrappedModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-center relative">
            <button
              onClick={() => setShowWrappedModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-sm font-black text-rose-400 uppercase tracking-wider">🎧 Monthly Recap Card</h2>
            {wrappedCardDataUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img src={wrappedCardDataUrl} alt="Wrapped" className="w-full h-80 object-contain mx-auto" />
              </div>
            )}
            <button
              onClick={() => handleShareCard(wrappedCardDataUrl)}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>📲</span>
              <span>Share Recap to Story / WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {tab === 'quest' ? (
        <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-6">
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full justify-between">
            {(['solo', 'duo', 'squad'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSelectMode(m)}
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
                onClick={onStartMatchingClick}
                disabled={isSearching}
                className={`w-56 h-56 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 border-8 border-rose-950 shadow-[0_0_50px_rgba(225,29,72,0.4)] flex flex-col items-center justify-center text-white font-black text-2xl tracking-wide active:scale-90 transition-transform duration-100 touch-manipulation ${
                  isSearching ? 'animate-pulse opacity-80' : 'hover:scale-105'
                }`}
              >
                {isSearching ? (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-2xl animate-spin">🌀</span>
                    <span className="text-xs text-rose-200 font-mono font-normal">SEARCHING...</span>
                  </div>
                ) : (
                  <>
                    <span>DESTROY</span>
                    <span className="text-sm font-normal text-rose-200 mt-1">BOREDOM</span>
                  </>
                )}
              </button>

              <div className="text-center space-y-2 max-w-xs">
                <p className="text-xs text-slate-500">
                  {isSearching
                    ? `Searching live queue for nearby ${mode.toUpperCase()} partners...`
                    : 'Tap to trigger a random real-world micro-mission.'}
                </p>

                {isSearching && (
                  <div className="flex flex-col items-center space-y-2 pt-2">
                    <button
                      onClick={handleWhatsAppInvite}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center space-x-1 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <span>📲</span>
                      <span>Invite Friend via WhatsApp Now</span>
                    </button>
                    <button
                      onClick={cancelSearch}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Cancel Search
                    </button>
                  </div>
                )}
              </div>
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
                    <button
                      onClick={handleWhatsAppInvite}
                      className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center space-x-1"
                    >
                      <span>📲</span>
                      <span>Invite Friend</span>
                    </button>
                  </div>
                  <div className="h-28 overflow-y-auto space-y-2 pr-1 text-xs">
                    {messages.length === 0 ? (
                      <p className="text-[10px] text-slate-600 italic py-2 text-center">No messages yet. Coordinate your squad rally point!</p>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id || Math.random()} className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-rose-400">
                              @{m.sender_handle}: 
                            </span>
                            <span className="text-slate-300 ml-1">
                              {m.message}
                            </span>
                          </div>
                          {m.sender_handle !== handle && (
                            <button
                              onClick={() => handleReport('chat', m.id || m.message)}
                              className="text-[9px] text-slate-600 hover:text-rose-400 pl-2"
                              title="Report message"
                            >
                              🚩
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Say something (max 300 chars)..."
                      maxLength={300}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
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
                    <span className="text-xs text-slate-400 font-semibold">Take Live Photo Proof</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
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
              <p className="text-xs text-slate-300">
                You saved another 15 minutes from doomscrolling reels.
              </p>

              {lastPartnerHandle && (mode === 'duo' || mode === 'squad') && (
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Raid Partner</p>
                    <p className="text-xs font-bold text-rose-400">@{lastPartnerHandle}</p>
                  </div>
                  <button
                    onClick={handleAddFriend}
                    disabled={isFriendAdded}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isFriendAdded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 active:scale-95'
                    }`}
                  >
                    {isFriendAdded ? '✓ Friend Added' : '+ Add as Friend'}
                  </button>
                </div>
              )}

              {cardDataUrl && (
                <div className="space-y-3 pt-2">
                  <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 shadow-xl bg-slate-950">
                    <img src={cardDataUrl} alt="Story Card" className="w-full h-64 object-contain mx-auto" />
                  </div>

                  <button
                    onClick={() => handleShareCard(cardDataUrl)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <span>📲</span>
                    <span>Share to Instagram Story / WhatsApp</span>
                  </button>
                </div>
              )}

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
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-emerald-400 font-semibold">🔥 Loop Broken</span>
                        <button
                          onClick={() => handleReport('feed', item.id)}
                          className="text-[10px] text-slate-600 hover:text-rose-400"
                          title="Report post"
                        >
                          🚩
                        </button>
                      </div>
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
            <button
              onClick={() => setShowFriendsModal(true)}
              className="text-[10px] text-rose-300 hover:underline font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg"
            >
              🤝 Squad ({friendsList.length})
            </button>
            <button
              onClick={generateSpotifyWrappedCard}
              className="text-[10px] text-amber-400 hover:underline font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg"
            >
              🎧 Wrapped
            </button>
            {userEmail && userEmail !== 'guest@breaktheloop.app' ? (
              <button
                onClick={handleSignOut}
                className="text-[10px] text-rose-400 hover:underline font-semibold"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalReason('');
                  setShowAuthModal(true);
                }}
                className="text-[10px] text-emerald-400 hover:underline font-semibold"
              >
                Verify
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
