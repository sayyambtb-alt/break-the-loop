"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { initAnalytics, track, identifyUser } from './lib/analytics';
import MissionTicket, { GemDetails, Rarity } from './components/MissionTicket';
import RollingOverlay from './components/RollingOverlay';
import BottomNav, { BtlTab } from './components/BottomNav';
import { createClient } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vopavevysovvucmhkvkr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KohfZUd_E0OapmrmwrxaCQ_l-b0NdZe';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const ADMIN_EMAIL = 'sayyambtb@gmail.com';
const MISSION_MINUTES = 45;

const RANK_TIERS: { minXp: number; title: string }[] = [
  { minXp: 0, title: 'Fresh Escapee' },
  { minXp: 100, title: 'Chaos Local' },
  { minXp: 300, title: 'Boredom Slayer' },
  { minXp: 700, title: 'Street Legend' },
  { minXp: 1500, title: 'Mumbai Made' },
];

const getRankTitle = (totalXp: number): string => {
  let title = RANK_TIERS[0].title;
  for (const tier of RANK_TIERS) {
    if (totalXp >= tier.minXp) title = tier.title;
  }
  return title;
};

function getRankProgress(xp: number) {
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].minXp) idx = i;
  }
  const current = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] || null;
  const pct = next
    ? Math.max(0, Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)))
    : 100;
  return {
    current,
    next,
    pct,
    label: next ? `${xp} / ${next.minXp} XP` : `${xp} XP`,
    nextLabel: next ? `${next.minXp - xp} XP to ${next.title}` : 'Top rank. Nothing left to prove.'
  };
}

// Strips a leading emoji (or any other non-letter/non-digit lead-in, plus the
// space after it) from badge strings like "🌱 First Step" -- render-time
// only, the stored profiles.badges values are never rewritten.
function stripBadgeEmoji(badge: string): string {
  const stripped = badge.replace(/^[^\p{L}\p{N}]+\s*/u, '').trim();
  return stripped || badge;
}

function dayPartLabel(): string {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const h = now.getHours();
  const part = h < 5 ? 'LATE NIGHT' : h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : h < 21 ? 'EVENING' : 'NIGHT';
  return `${day} ${part}`;
}

interface FeedItem {
  id: string;
  user_id: string;
  handle: string;
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

interface FriendProfile {
  friend_user_id: string;
  handle: string;
}

interface SquadParticipant {
  user_id: string;
  handle: string;
}

interface IncomingInvite {
  id: string;
  sender_handle: string;
  room_id: string;
  quest_text: string;
}

interface PublicProfileData {
  found: boolean;
  handle?: string;
  streak?: number;
  time_saved_mins?: number;
  badges?: string[];
  total_xp?: number;
  member_since?: string;
  history?: Array<{
    id: string;
    mode: string;
    quest_text: string;
    photo_url: string;
    created_at: string;
  }>;
}

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GemPreview {
  gem: GemDetails;
  rarity: Rarity;
  xp: number;
  credit: string | null;
  questText: string;
}

export default function Home() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const [tab, setTab] = useState<BtlTab>('tonight');
  const [mode, setMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [isExplorerMode, setIsExplorerMode] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [hiddenGemSubmittedBy, setHiddenGemSubmittedBy] = useState<string | null>(null);
  const [activeGem, setActiveGem] = useState<GemDetails | null>(null);
  const [gemPreview, setGemPreview] = useState<GemPreview | null>(null);
  const [gemLoading, setGemLoading] = useState(false);
  const [showSuggestGemModal, setShowSuggestGemModal] = useState(false);
  const [suggestGemName, setSuggestGemName] = useState('');
  const [suggestGemNeighborhood, setSuggestGemNeighborhood] = useState('');
  const [suggestGemDescription, setSuggestGemDescription] = useState('');

  const MUMBAI_NEIGHBORHOODS = [
    'Colaba', 'Fort', 'Marine Drive', 'Dadar', 'Matunga', 'Mahim', 'Wadala', 'Sewri',
    'Bandra', 'Worli', 'Andheri', 'Juhu', 'Powai', 'Borivali'
  ];
  const [isSearching, setIsSearching] = useState(false);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [activeQuestRarity, setActiveQuestRarity] = useState<Rarity>('common');
  const [activeQuestXp, setActiveQuestXp] = useState(15);
  const [activeQuestCredit, setActiveQuestCredit] = useState<string | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(1);
  const [roomId, setRoomId] = useState<string>('');
  const [pendingInviteRoomId, setPendingInviteRoomId] = useState<string | null>(null);
  const [isInviteSession, setIsInviteSession] = useState<boolean>(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [streak, setStreak] = useState(1);
  const [savedMins, setSavedMins] = useState(15);
  const [totalXp, setTotalXp] = useState(0);
  const [freezesAvailable, setFreezesAvailable] = useState(1);
  const [handle, setHandle] = useState('Explorer');
  const [badges, setBadges] = useState<string[]>(['🌱 First Step']);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [completedAtLabel, setCompletedAtLabel] = useState('');
  const [earnedXp, setEarnedXp] = useState(0);
  const [memberSince, setMemberSince] = useState('');
  const [lastMissionAt, setLastMissionAt] = useState<number | null>(null);
  const [missionsLoggedCount, setMissionsLoggedCount] = useState(0);
  const [spotsFoundCount, setSpotsFoundCount] = useState(0);

  // Mission countdown -- an absolute deadline, not a tick counter, so it
  // survives a backgrounded PWA. `nowTick` just forces a re-render once a
  // second (and immediately on visibilitychange); the remaining time is
  // always derived fresh from Date.now() at render time.
  const [missionExpiresAt, setMissionExpiresAt] = useState<number | null>(null);
  const [missionExpired, setMissionExpired] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const prevActiveQuestRef = useRef<string | null>(null);

  // Boredom o'clock -- a client-side scheduled Notification (no push backend
  // exists in this codebase), pinned to 9:30 PM to match the copy in the
  // design spec exactly. Persisted locally per-device.
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [rollingCaptionIdx, setRollingCaptionIdx] = useState(0);
  const ROLL_CAPTIONS = ['scanning dadar…', 'checking who is out…', 'rolling rarity…', 'measuring the walk…', 'locking it in…'];

  // Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSaveProgressModal, setShowSaveProgressModal] = useState(false);
  const [saveProgressEmail, setSaveProgressEmail] = useState('');
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverOtpInput, setRecoverOtpInput] = useState('');
  const [isRecoverOtpSent, setIsRecoverOtpSent] = useState(false);

  // Modals & Inspection States
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [newHandleInput, setNewHandleInput] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Quest Suggestions
  const [showSuggestQuestModal, setShowSuggestQuestModal] = useState(false);
  const [suggestQuestMode, setSuggestQuestMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [suggestQuestText, setSuggestQuestText] = useState('');

  // Explorer Profile Modal
  const [selectedProfile, setSelectedProfile] = useState<PublicProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Squad Roster State
  const [squadRoster, setSquadRoster] = useState<SquadParticipant[]>([]);
  const [squadCapacity, setSquadCapacity] = useState<number>(2);
  const [isQueueCreator, setIsQueueCreator] = useState<boolean>(false);

  // Friends & Wrapped State
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'squad' | 'leaderboard'>('squad');
  const [leaderboard, setLeaderboard] = useState<{ handle: string; total_xp: number; streak: number; is_self: boolean }[]>([]);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  const [wrappedCardDataUrl, setWrappedCardDataUrl] = useState<string | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [sendingInviteTo, setSendingInviteTo] = useState<string | null>(null);

  // Notifications & Feed
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageSentTime, setLastMessageSentTime] = useState<number>(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Channel Cleanup Refs
  const queueSubscriptionRef = useRef<any>(null);
  const participantsSubRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const invitesChannelRef = useRef<any>(null);
  const myQueueEntryIdRef = useRef<string | null>(null);
  const inviteLinkJoinedRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string | null>(null);
  const isQueueCreatorRef = useRef<boolean>(false);
  const accessTokenRef = useRef<string | null>(null);

  const phase: 'idle' | 'rolling' | 'active' | 'done' =
    isCompleted ? 'done' : activeQuest ? 'active' : isSearching ? 'rolling' : 'idle';

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('btl_has_seen_welcome')) {
      setShowWelcomeModal(true);
    }
    const savedAlarm = localStorage.getItem('btl_alarm_enabled');
    if (savedAlarm === '1') setAlarmEnabled(true);
  }, []);

  const dismissWelcomeModal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('btl_has_seen_welcome', 'true');
    }
    setShowWelcomeModal(false);
    track('welcome_dismissed');
  };

  useEffect(() => {
    if (handle && handle !== 'Explorer') identifyUser(handle);
  }, [handle]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    isQueueCreatorRef.current = isQueueCreator;
  }, [isQueueCreator]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token || null;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const releaseQueueOnUnload = () => {
      const queueId = myQueueEntryIdRef.current;
      const userId = currentUserIdRef.current;
      const token = accessTokenRef.current;
      if (!queueId || !userId || !token) return;

      fetch(`${supabaseUrl}/rest/v1/rpc/leave_match_queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          p_queue_id: queueId,
          p_user_id: userId,
          p_is_creator: isQueueCreatorRef.current
        }),
        keepalive: true
      }).catch(() => {});
    };

    window.addEventListener('pagehide', releaseQueueOnUnload);
    return () => {
      window.removeEventListener('pagehide', releaseQueueOnUnload);
      releaseQueueOnUnload();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedHandle = localStorage.getItem('btl_user_handle');
      if (cachedHandle) setHandle(cachedHandle);

      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');

      if (urlRoom) {
        setPendingInviteRoomId(urlRoom);
      }

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        let activeUser = session?.user;
        if (!activeUser) {
          const { data: anonData } = await supabase.auth.signInAnonymously();
          activeUser = anonData?.session?.user;
        }

        if (activeUser) {
          const uid = activeUser.id;
          setCurrentUserId(uid);
          const email = activeUser.email;
          if (email && email !== 'guest@breaktheloop.app') {
            setUserEmail(email);
            setIsGuest(false);
          } else {
            setIsGuest(true);
            setUserEmail('guest@breaktheloop.app');
          }
          setIsLoggedIn(true);
          loadOrCreateProfile(uid, email || 'guest@breaktheloop.app');
          fetchFriends(uid);
          setupUserChannels(uid);
        }
      });
    }

    return () => {
      cleanupAllChannels();
    };
  }, []);

  useEffect(() => {
    if (!pendingInviteRoomId || !currentUserId || !handle || inviteLinkJoinedRef.current) return;
    inviteLinkJoinedRef.current = true;

    (async () => {
      const { data: joinResult, error } = await supabase.rpc('join_room_by_id', {
        p_room_id: pendingInviteRoomId,
        p_user_id: currentUserId,
        p_handle: handle
      });

      if (error || !joinResult || joinResult.error) {
        if (joinResult?.error === 'banned') {
          showToast('Your account has been suspended from multiplayer missions.', 'error');
        } else if (joinResult?.error === 'blocked') {
          showToast("Couldn't join that mission.", 'error');
        } else {
          showToast("That invite link has expired or the room is full — try starting your own mission instead!", 'error');
        }
        setPendingInviteRoomId(null);
        return;
      }

      setMode(joinResult.mode);
      setRoomId(joinResult.room_id);
      setSquadCapacity(joinResult.max_players || 2);
      setIsQueueCreator(false);
      if (joinResult.roster) setSquadRoster(joinResult.roster);

      if (joinResult.neighborhood) {
        setIsExplorerMode(true);
        setSelectedNeighborhood(joinResult.neighborhood);
      }

      if (joinResult.queue_id) {
        myQueueEntryIdRef.current = joinResult.queue_id;
      }

      if (joinResult.matched) {
        setActiveQuest(joinResult.quest_text);
        setActiveQuestRarity(joinResult.neighborhood ? 'common' : joinResult.rarity);
        setActiveQuestXp(joinResult.xp_reward);
        setActiveQuestCredit(null);
        setIsSearching(false);
        setTab('tonight');
        if (joinResult.neighborhood) {
          setActiveGem({
            name: joinResult.gem_name,
            neighborhood: joinResult.neighborhood,
            description: joinResult.gem_description
          });
          setHiddenGemSubmittedBy(joinResult.gem_submitted_by || null);
        }
        if (joinResult.queue_id) {
          subscribeToQueueUpdates(joinResult.queue_id);
        }
      } else if (joinResult.queue_id) {
        setIsSearching(true);
        subscribeToQueueUpdates(joinResult.queue_id);
      }

      setPendingInviteRoomId(null);
    })();
  }, [pendingInviteRoomId, currentUserId, handle]);

  const cleanupAllChannels = () => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (invitesChannelRef.current) {
      supabase.removeChannel(invitesChannelRef.current);
      invitesChannelRef.current = null;
    }
    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
      queueSubscriptionRef.current = null;
    }
    if (participantsSubRef.current) {
      supabase.removeChannel(participantsSubRef.current);
      participantsSubRef.current = null;
    }
  };

  const setupUserChannels = (userId: string) => {
    cleanupAllChannels();

    const presenceChannel = supabase.channel('global_presence', {
      config: { presence: { key: userId } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUserIds(new Set<string>(Object.keys(state)));
      })
      .on('presence', { event: 'join' }, ({ key }: any) => {
        setOnlineUserIds((prev) => new Set([...Array.from(prev), key]));
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        setOnlineUserIds((prev) => {
          const updated = new Set(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = presenceChannel;

    const invitesChannel = supabase
      .channel(`invites_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raid_invites',
          filter: `receiver_user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new && payload.new.status === 'pending') {
            setIncomingInvite({
              id: payload.new.id,
              sender_handle: payload.new.sender_handle,
              room_id: payload.new.room_id,
              quest_text: payload.new.quest_text
            });
          }
        }
      )
      .subscribe();

    invitesChannelRef.current = invitesChannel;
  };

  const inspectProfile = async (targetHandle: string) => {
    const cleanHandle = targetHandle.replace('@', '').trim();
    if (!cleanHandle) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase.rpc('get_explorer_public_profile', {
        p_handle: cleanHandle
      });
      if (error) {
        console.error('Profile lookup error:', error);
        showToast('Could not load that profile right now — try again.', 'error');
      } else if (data && data.found) {
        setSelectedProfile(data);
      } else {
        showToast(`Could not find an active profile for @${cleanHandle}`, 'error');
      }
    } catch (err) {
      console.error('Profile lookup exception:', err);
      showToast('Could not load that profile right now — try again.', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSubmitQuestSuggestion = async () => {
    const trimmed = suggestQuestText.trim();
    if (trimmed.length < 15 || trimmed.length > 300) {
      showToast('Quest text must be between 15 and 300 characters', 'error');
      return;
    }

    const { error } = await supabase.rpc('submit_quest_suggestion', {
      p_quest_text: trimmed,
      p_mode: suggestQuestMode
    });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    setShowSuggestQuestModal(false);
    setSuggestQuestText('');
    track('quest_suggested', { mode: suggestQuestMode });
    showToast('Thanks! Your quest is awaiting review.', 'success');
  };

  const handleSubmitGemSuggestion = async () => {
    const cleanName = suggestGemName.trim();
    const cleanDesc = suggestGemDescription.trim();

    if (!suggestGemNeighborhood) {
      showToast('Pick a neighborhood', 'error');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 100) {
      showToast('Place name must be between 2 and 100 characters', 'error');
      return;
    }
    if (cleanDesc.length < 15 || cleanDesc.length > 300) {
      showToast('Description must be between 15 and 300 characters', 'error');
      return;
    }

    const { error } = await supabase.rpc('submit_hidden_gem', {
      p_name: cleanName,
      p_neighborhood: suggestGemNeighborhood,
      p_description: cleanDesc
    });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    setShowSuggestGemModal(false);
    setSuggestGemName('');
    setSuggestGemNeighborhood('');
    setSuggestGemDescription('');
    track('gem_submitted', { neighborhood: suggestGemNeighborhood });
    showToast('Thanks! Your spot is awaiting review.', 'success');
  };

  const handleAdminDeleteFeedPost = async (logId: string) => {
    if (!window.confirm('ADMIN: Are you sure you want to permanently remove this post from the community feed?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_delete_feed_post', { p_log_id: logId });
      if (!error) {
        setFeedItems((prev) => prev.filter((item) => item.id !== logId));
        showToast('Post removed successfully.', 'success');
      } else {
        showToast(`Failed to delete post: ${error.message}`, 'error');
      }
    } catch {
    }
  };

  const acceptDirectInvite = async () => {
    if (!incomingInvite) return;
    try {
      const { error } = await supabase
        .from('raid_invites')
        .update({ status: 'accepted' })
        .eq('id', incomingInvite.id);

      if (error) return;

      setRoomId(incomingInvite.room_id);
      setActiveQuest(incomingInvite.quest_text);
      setSquadRoster([{ user_id: currentUserId || '', handle }]);
      setMode('duo');
      setIsInviteSession(true);
      setIsSearching(false);
      setIncomingInvite(null);
      setShowFriendsModal(false);
      setMessages([]);
      setTab('tonight');
    } catch {
    }
  };

  const declineDirectInvite = async () => {
    if (!incomingInvite) return;
    try {
      await supabase
        .from('raid_invites')
        .update({ status: 'declined' })
        .eq('id', incomingInvite.id);
      setIncomingInvite(null);
    } catch {
    }
  };

  const sendDirectRaidInvite = async (friend: FriendProfile) => {
    if (!currentUserId) return;
    setSendingInviteTo(friend.handle);

    try {
      const { data: quests } = await supabase
        .from('quests')
        .select('quest_text')
        .eq('mode', 'duo')
        .eq('is_active', true);

      const chosenQuest =
        quests && quests.length > 0
          ? quests[Math.floor(Math.random() * quests.length)].quest_text
          : 'Head to the nearest landmark or cafe together and complete a photo challenge!';

      const newRoomId = `room_${Math.random().toString(36).substring(2, 9)}`;

      await supabase.from('raid_invites').insert([
        {
          sender_user_id: currentUserId,
          sender_handle: handle,
          receiver_user_id: friend.friend_user_id,
          room_id: newRoomId,
          quest_text: chosenQuest,
          status: 'pending'
        }
      ]);

      setRoomId(newRoomId);
      setActiveQuest(chosenQuest);
      setSquadRoster([{ user_id: currentUserId, handle }]);
      setMode('duo');
      setIsInviteSession(true);
      setIsSearching(false);
      setShowFriendsModal(false);
      setMessages([]);
      setTab('tonight');
      showToast(`Raid challenge sent to @${friend.handle}! Waiting for them to accept in-app.`, 'success');
    } catch {
      showToast('Could not send raid invite. Please try again.', 'error');
    } finally {
      setSendingInviteTo(null);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  // Boredom o'clock -- schedules a single client-side Notification for the
  // next occurrence of 9:30 PM, then reschedules itself. Recomputed on
  // mount and on visibilitychange so a backgrounded/suspended tab catches up
  // instead of silently missing the fire time.
  const toggleAlarm = async () => {
    if (!alarmEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        await requestNotificationPermission();
      }
      setAlarmEnabled(true);
      if (typeof window !== 'undefined') localStorage.setItem('btl_alarm_enabled', '1');
    } else {
      setAlarmEnabled(false);
      if (typeof window !== 'undefined') localStorage.setItem('btl_alarm_enabled', '0');
    }
  };

  useEffect(() => {
    if (!alarmEnabled || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(21, 30, 0, 0);
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      const ms = next.getTime() - now.getTime();
      timer = setTimeout(() => {
        if (
          document.visibilityState !== 'visible' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification('Break The Loop', {
            body: "Bored? You've got a mission waiting.",
            icon: '/icons/icon-192.png'
          });
        }
        scheduleNext();
      }, ms);
    };

    scheduleNext();
    const onVis = () => {
      clearTimeout(timer);
      scheduleNext();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [alarmEnabled]);

  // Mission countdown -- recompute from Date.now() every second, plus
  // immediately on visibilitychange so a backgrounded tab catches up the
  // instant it's foregrounded rather than waiting for the next tick.
  useEffect(() => {
    if (!missionExpiresAt) return;
    const tick = () => setNowTick(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [missionExpiresAt]);

  useEffect(() => {
    if (!missionExpiresAt) {
      setMissionExpired(false);
      return;
    }
    setMissionExpired(nowTick >= missionExpiresAt);
  }, [nowTick, missionExpiresAt]);

  // A fresh mission (activeQuest transitioning from nothing to something)
  // gets a brand-new expiry + full reroll allowance; a reroll of an
  // already-active mission keeps both, since activeQuest never goes
  // through a falsy state during a reroll.
  useEffect(() => {
    const wasActive = !!prevActiveQuestRef.current;
    const isActive = !!activeQuest;
    if (!wasActive && isActive) {
      setRerollsLeft(1);
      setMissionExpiresAt(Date.now() + MISSION_MINUTES * 60000);
      setMissionExpired(false);
    }
    if (!isActive) {
      setMissionExpiresAt(null);
      setMissionExpired(false);
    }
    prevActiveQuestRef.current = activeQuest;
  }, [activeQuest]);

  // Cycles the "rolling" caption for a solo/invite roll -- duo/squad shows a
  // steady waiting-room caption instead (rendered directly, no cycling).
  useEffect(() => {
    if (!isSearching || (mode !== 'solo' && !isInviteSession)) return;
    setRollingCaptionIdx(0);
    const id = setInterval(() => setRollingCaptionIdx((i) => i + 1), 240);
    return () => clearInterval(id);
  }, [isSearching, mode, isInviteSession]);

  const handleGuestLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    cleanupAllChannels();
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setAuthError(error.message);
    } else if (data.session?.user) {
      const uid = data.session.user.id;
      setCurrentUserId(uid);
      setUserEmail('guest@breaktheloop.app');
      setIsGuest(true);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      loadOrCreateProfile(uid, 'guest@breaktheloop.app');
      fetchFriends(uid);
      setupUserChannels(uid);
    }
  };

  const handleSendEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput.includes('@')) return setAuthError('Please enter a valid email address');
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
      cleanupAllChannels();
      const uid = data.session.user.id;
      setCurrentUserId(uid);
      setUserEmail(emailInput);
      setIsGuest(false);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      loadOrCreateProfile(uid, emailInput);
      fetchFriends(uid);
      setupUserChannels(uid);
    }
  };

  const handleSaveProgress = async (email: string) => {
    if (!email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      showToast(`Couldn't save progress: ${error.message}`, 'error');
      return;
    }
    setShowSaveProgressModal(false);
    setSaveProgressEmail('');
    showToast('Check your email and click the confirmation link to save your progress!', 'success');
  };

  const handleRecoverAccount = async (email: string) => {
    if (!email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });
    if (error) {
      showToast(`Couldn't find an account with that email, or something went wrong: ${error.message}`, 'error');
      return;
    }
    setIsRecoverOtpSent(true);
    showToast('Check your email for a 6-digit code!', 'success');
  };

  const handleVerifyRecoverOtp = async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: recoverEmail,
      token: recoverOtpInput.trim(),
      type: 'email'
    });
    if (error) {
      showToast(`Couldn't verify that code: ${error.message}`, 'error');
      return;
    }
    if (data.session?.user) {
      cleanupAllChannels();
      const uid = data.session.user.id;
      setCurrentUserId(uid);
      setUserEmail(recoverEmail);
      setIsGuest(false);
      setIsLoggedIn(true);
      setShowRecoverModal(false);
      setIsRecoverOtpSent(false);
      setRecoverEmail('');
      setRecoverOtpInput('');
      loadOrCreateProfile(uid, recoverEmail);
      fetchFriends(uid);
      setupUserChannels(uid);
    }
  };

  const handleSignOut = async () => {
    cleanupAllChannels();
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    const { data } = await supabase.auth.signInAnonymously();
    const uid = data.session?.user.id || null;
    setCurrentUserId(uid);
    setUserEmail('guest@breaktheloop.app');
    setIsGuest(true);
    setIsLoggedIn(true);
    setIsOtpSent(false);
    setOtpInput('');
    setEmailInput('');
    setHandle('Explorer');
    setStreak(1);
    setSavedMins(15);
    setFreezesAvailable(1);
    setBadges(['🌱 First Step']);
    setFriendsList([]);
    if (uid) {
      loadOrCreateProfile(uid, 'guest@breaktheloop.app');
      fetchFriends(uid);
      setupUserChannels(uid);
    }
  };

  const fetchYouStats = async (userId: string) => {
    try {
      const { count: totalCount } = await supabase
        .from('mission_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      setMissionsLoggedCount(totalCount || 0);

      const { count: exploreCount } = await supabase
        .from('mission_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('mode', 'explorer');
      setSpotsFoundCount(exploreCount || 0);
    } catch {
    }
  };

  const loadOrCreateProfile = async (userId: string, email: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('device_id', userId).single();
      if (data) {
        if (data.handle && data.handle !== 'Explorer') {
          setHandle(data.handle);
          if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', data.handle);
        }
        setStreak(data.streak || 1);
        setSavedMins(data.time_saved_mins || 15);
        setTotalXp(data.total_xp || 0);
        setFreezesAvailable(typeof data.freezes_available === 'number' ? data.freezes_available : 1);
        if (data.badges) setBadges(data.badges);
        if (data.created_at) {
          setMemberSince(new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }
        if ((!data.handle || data.handle === 'Explorer') && email !== 'guest@breaktheloop.app') {
          setShowHandleModal(true);
        }
      } else {
        const defaultHandle = email.split('@')[0] || 'Explorer';
        await supabase.from('profiles').insert([
          { device_id: userId, handle: defaultHandle, streak: 1, time_saved_mins: 15, badges: ['🌱 First Step'] }
        ]);
        setHandle(defaultHandle);
        if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', defaultHandle);
        setMemberSince(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        if (email !== 'guest@breaktheloop.app') {
          setNewHandleInput(defaultHandle);
          setShowHandleModal(true);
        }
      }
      fetchYouStats(userId);
    } catch {
    }
  };

  const saveHandleDirect = async (chosenHandle: string) => {
    const cleaned = chosenHandle.replace(/[^a-zA-Z0-9_]/g, '').trim();
    if (!cleaned) return;
    const previousHandle = handle;
    setHandle(cleaned);
    if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', cleaned);
    setShowHandleModal(false);

    const { error } = await supabase.rpc('update_user_handle', { p_new_handle: cleaned });
    if (error) {
      setHandle(previousHandle);
      if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', previousHandle);
      setShowHandleModal(true);
      showToast(`Couldn't save that handle: ${error.message}`, 'error');
    }
  };

  const saveHandle = async (newHandle: string) => {
    const cleaned = newHandle.replace(/[^a-zA-Z0-9_]/g, '').trim();
    if (!cleaned) return;
    const previousHandle = handle;
    setHandle(cleaned);
    if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', cleaned);
    setIsEditingHandle(false);

    const { error } = await supabase.rpc('update_user_handle', { p_new_handle: cleaned });
    if (error) {
      setHandle(previousHandle);
      if (typeof window !== 'undefined') localStorage.setItem('btl_user_handle', previousHandle);
      showToast(`Couldn't save that handle: ${error.message}`, 'error');
    }
  };

  const fetchFriends = async (userId: string) => {
    try {
      const { data: friendsRows } = await supabase
        .from('friends')
        .select('user_id, friend_user_id')
        .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);

      if (friendsRows && friendsRows.length > 0) {
        const friendIds = friendsRows.map((f) => (f.user_id === userId ? f.friend_user_id : f.user_id));
        const uniqueFriendIds = Array.from(new Set(friendIds));

        const { data: profiles } = await supabase
          .from('profiles')
          .select('device_id, handle')
          .in('device_id', uniqueFriendIds);

        const mappedList: FriendProfile[] = uniqueFriendIds.map((id) => {
          const match = profiles?.find((p) => p.device_id === id);
          return {
            friend_user_id: id,
            handle: match?.handle || 'Explorer'
          };
        });
        setFriendsList(mappedList);
      } else {
        setFriendsList([]);
      }
    } catch {
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!currentUserId || !targetUserId) return;
    try {
      await supabase.from('friends').upsert(
        { user_id: currentUserId, friend_user_id: targetUserId },
        { onConflict: 'user_id, friend_user_id' }
      );
      fetchFriends(currentUserId);
      showToast('Squad friend added!', 'success');
    } catch {
    }
  };

  const resetMissionToIdle = () => {
    setIsCompleted(false);
    setActiveQuest(null);
    setActiveGem(null);
    setActiveQuestCredit(null);
    setHiddenGemSubmittedBy(null);
    setGemPreview(null);
    setProofImage(null);
    setCardDataUrl(null);
    setRoomId('');
    setSquadRoster([]);
    setMessages([]);
    setIsInviteSession(false);
    setMissionExpired(false);
    setMissionExpiresAt(null);
  };

  const handleSelectMode = (selectedMode: 'solo' | 'duo' | 'squad') => {
    if ((selectedMode === 'duo' || selectedMode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbai explorers in ${selectedMode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }

    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
      queueSubscriptionRef.current = null;
    }
    if (participantsSubRef.current) {
      supabase.removeChannel(participantsSubRef.current);
      participantsSubRef.current = null;
    }

    setMode(selectedMode);
    setActiveQuest(null);
    setActiveGem(null);
    setRoomId('');
    setProofImage(null);
    setIsCompleted(false);
    setIsInviteSession(false);
    setIsSearching(false);
    setSquadRoster([]);
    setSquadCapacity(selectedMode === 'squad' ? 8 : 2);
  };

  const rollRarity = (): { rarity: Rarity; xp: number } => {
    const roll = Math.random() * 100;
    if (roll > 85) return { rarity: 'legendary', xp: 75 };
    if (roll > 60) return { rarity: 'rare', xp: 35 };
    return { rarity: 'common', xp: 15 };
  };

  const pickRandomQuest = async () => {
    try {
      const { data: dbQuests } = await supabase
        .from('quests')
        .select('quest_text, submitted_by_handle')
        .eq('mode', mode)
        .eq('is_active', true);

      if (dbQuests && dbQuests.length > 0) {
        const { rarity, xp } = rollRarity();
        setActiveQuestRarity(rarity);
        setActiveQuestXp(xp);
        const chosen = dbQuests[Math.floor(Math.random() * dbQuests.length)];
        setActiveQuestCredit(chosen.submitted_by_handle || null);
        setActiveQuest(chosen.quest_text);
      } else {
        const { rarity, xp } = rollRarity();
        setActiveQuestRarity(rarity);
        setActiveQuestXp(xp);
        setActiveQuestCredit(null);
        setActiveQuest("Head to the nearest tapri or cafe and order a beverage you have never tried!");
      }
    } catch (e) {
      const { rarity, xp } = rollRarity();
      setActiveQuestRarity(rarity);
      setActiveQuestXp(xp);
      setActiveQuestCredit(null);
      setActiveQuest("Head to the nearest tapri or cafe and order a beverage you have never tried!");
    }
  };

  const executeMatchmaking = async () => {
    setShowSafetyModal(false);
    setIsSearching(true);
    setActiveQuest(null);
    setProofImage(null);
    setIsCompleted(false);
    setCardDataUrl(null);
    setMessages([]);
    setSquadRoster([]);
    setSquadCapacity(mode === 'squad' ? 8 : 2);

    if (mode === 'solo' || isInviteSession) {
      // Fixed minimum so the "rolling" ceremony always plays for at least
      // 1.5s even though picking a quest client-side is effectively instant.
      const rollStart = Date.now();
      await pickRandomQuest();
      const remain = 1500 - (Date.now() - rollStart);
      if (remain > 0) await new Promise((r) => setTimeout(r, remain));
      setIsSearching(false);
      setTab('tonight');
      return;
    }

    if (!currentUserId) {
      setIsSearching(false);
      return;
    }

    try {
      const { data: matchResult, error } = await supabase.rpc('find_or_create_match', {
        p_user_id: currentUserId,
        p_mode: mode,
        p_handle: handle,
        p_city: 'mumbai'
      });

      if (error) {
        console.error('Matchmaking error:', error);
        showToast(`Matchmaking error: ${error.message || JSON.stringify(error)}`, 'error');
        setIsSearching(false);
        return;
      }

      if (matchResult && matchResult.error === 'banned') {
        showToast('Your account has been suspended from multiplayer missions.', 'error');
        setIsSearching(false);
        return;
      }

      if (matchResult) {
        setRoomId(matchResult.room_id);
        setSquadCapacity(matchResult.max_players || 2);
        setIsQueueCreator(matchResult.is_creator || false);
        if (matchResult.roster) setSquadRoster(matchResult.roster);

        if (matchResult.queue_id) {
          myQueueEntryIdRef.current = matchResult.queue_id;
        }

        if (matchResult.matched) {
          setActiveQuest(matchResult.quest_text);
          setActiveQuestRarity(matchResult.rarity);
          setActiveQuestXp(matchResult.xp_reward);
          setActiveQuestCredit(null);
          setIsSearching(false);
          setTab('tonight');
          if (matchResult.queue_id) {
            subscribeToQueueUpdates(matchResult.queue_id);
          }
        } else if (matchResult.queue_id) {
          subscribeToQueueUpdates(matchResult.queue_id);

          const rosterChannel = supabase
            .channel(`roster_${matchResult.room_id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'matchmaking_participants'
              },
              (payload: any) => {
                if (payload.new && payload.new.room_id === matchResult.room_id) {
                  setSquadRoster((prev) => {
                    if (prev.some((p) => p.user_id === payload.new.user_id)) return prev;
                    return [...prev, { user_id: payload.new.user_id, handle: payload.new.handle }];
                  });
                }
              }
            )
            .subscribe();

          participantsSubRef.current = rosterChannel;
        }
      }
    } catch (err: any) {
      console.error('Catastrophic match error:', err);
      showToast(`Connection error: ${err.message || err}`, 'error');
      setIsSearching(false);
    }
  };

  const cancelSearch = async () => {
    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
      queueSubscriptionRef.current = null;
    }
    if (participantsSubRef.current) {
      supabase.removeChannel(participantsSubRef.current);
      participantsSubRef.current = null;
    }

    if (myQueueEntryIdRef.current && currentUserId) {
      try {
        await supabase.rpc('leave_match_queue', {
          p_queue_id: myQueueEntryIdRef.current,
          p_user_id: currentUserId,
          p_is_creator: isQueueCreator
        });
      } catch {
      }
      myQueueEntryIdRef.current = null;
    }
    setIsSearching(false);
    setActiveQuest(null);
    setRoomId('');
  };

  const handleAbandonMission = async () => {
    if (window.confirm("Are you sure you want to leave this mission? (Your streak won't be penalized)")) {
      track('mission_abandoned', { mode, track: isExplorerMode ? 'explore' : 'quest' });
      await cancelSearch();
      resetMissionToIdle();
    }
  };

  const fetchRoster = async (rId: string) => {
    const { data } = await supabase
      .from('matchmaking_participants')
      .select('user_id, handle')
      .eq('room_id', rId);
    if (data && data.length > 0) {
      setSquadRoster(data);
    }
  };

  const subscribeToQueueUpdates = (queueId: string) => {
    const queueChannel = supabase
      .channel(`queue_${queueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `id=eq.${queueId}`
        },
        async (payload: any) => {
          if (!payload.new) return;

          const prevCount = payload.old?.current_players ?? 0;
          const newCount = payload.new.current_players ?? 0;

          const justRevealed = prevCount < 2 && newCount >= 2;
          if (justRevealed) {
            setRoomId(payload.new.room_id);
            setIsSearching(false);
            setTab('tonight');
          }

          if (newCount !== prevCount) {
            await fetchRoster(payload.new.room_id);
          }

          setActiveQuest(payload.new.quest_text);
          setActiveQuestRarity(payload.new.rarity);
          setActiveQuestXp(payload.new.xp_reward);
          setActiveQuestCredit(null);

          if (payload.new.neighborhood) {
            setActiveGem({
              name: payload.new.gem_name,
              neighborhood: payload.new.neighborhood,
              description: payload.new.gem_description
            });
            setHiddenGemSubmittedBy(payload.new.gem_submitted_by || null);
          } else {
            setActiveGem(null);
          }
        }
      )
      .subscribe();

    queueSubscriptionRef.current = queueChannel;
  };

  const handleSharedReroll = async () => {
    if (rerollsLeft < 1) return;
    setRerollsLeft((r) => Math.max(0, r - 1));
    const { error } = await supabase.rpc('reroll_shared_quest', {
      p_queue_id: myQueueEntryIdRef.current
    });
    if (error) {
      showToast(`Couldn't reroll: ${error.message}`, 'error');
    }
  };

  // Reroll for an already-active solo Explore mission -- distinct from
  // previewGem() below, which is the *first* discovery step on the Explore
  // tab and does not touch the active mission at all.
  const rerollActiveGem = async () => {
    if (!selectedNeighborhood) return;
    const { data, error } = await supabase.rpc('get_random_hidden_gem', { p_neighborhood: selectedNeighborhood });

    if (error) {
      showToast('Could not load a hidden gem right now — try again.', 'error');
      return;
    }
    if (!data || !data.found) {
      showToast(`No hidden gems submitted for ${selectedNeighborhood} yet — be the first!`, 'error');
      return;
    }

    const { rarity, xp } = rollRarity();
    setActiveQuestRarity(rarity);
    setActiveQuestXp(xp);
    setActiveQuestCredit(null);
    setHiddenGemSubmittedBy(data.submitted_by_handle || null);
    setActiveGem({ name: data.name, neighborhood: data.neighborhood, description: data.description });
    setActiveQuest(`📍 ${data.name} (${data.neighborhood}) — ${data.description}`);
  };

  const handleTicketReroll = () => {
    if (rerollsLeft < 1) return;
    setRerollsLeft((r) => Math.max(0, r - 1));
    if (mode === 'solo') {
      if (isExplorerMode) rerollActiveGem(); else pickRandomQuest();
    } else {
      handleSharedReroll();
    }
  };

  // Explore tab, stage one: a preview-only reveal. Nothing here touches
  // activeQuest/activeGem -- "I'm going" (confirmGemPreview) is what turns
  // this into a real, tracked mission.
  const previewGem = async (neighborhood: string) => {
    setGemLoading(true);
    setGemPreview(null);
    try {
      const { data, error } = await supabase.rpc('get_random_hidden_gem', { p_neighborhood: neighborhood });
      if (error) {
        showToast('Could not load a hidden gem right now — try again.', 'error');
        return;
      }
      if (!data || !data.found) {
        showToast(`No hidden gems submitted for ${neighborhood} yet — be the first!`, 'error');
        return;
      }
      const { rarity, xp } = rollRarity();
      setGemPreview({
        gem: { name: data.name, neighborhood: data.neighborhood, description: data.description },
        rarity,
        xp,
        credit: data.submitted_by_handle || null,
        questText: `📍 ${data.name} (${data.neighborhood}) — ${data.description}`
      });
    } finally {
      setGemLoading(false);
    }
  };

  const confirmGemPreview = () => {
    if (!gemPreview) return;
    setActiveGem(gemPreview.gem);
    setActiveQuestRarity(gemPreview.rarity);
    setActiveQuestXp(gemPreview.xp);
    setActiveQuestCredit(null);
    setHiddenGemSubmittedBy(gemPreview.credit);
    setActiveQuest(gemPreview.questText);
    setGemPreview(null);
    setTab('tonight');
  };

  const selectNeighborhood = (n: string) => {
    setSelectedNeighborhood(n);
    setGemPreview(null);
    if (mode === 'solo') {
      setIsExplorerMode(true);
      previewGem(n);
    }
  };

  // Duo/Squad Explore -- mirrors executeMatchmaking's multiplayer path
  // closely, but matches people wanting the same neighborhood (not the
  // same generic mode) and sources content from hidden_gems. Unlike solo,
  // a multiplayer match goes straight to "active" (matching itself was
  // already the commitment step, made behind the Safety Modal).
  const handleExploreMatchmaking = async (neighborhoodOverride?: string) => {
    setShowSafetyModal(false);
    const neighborhood = neighborhoodOverride ?? selectedNeighborhood;
    if (!neighborhood) {
      showToast('Pick a neighborhood first.', 'error');
      return;
    }
    if (!currentUserId) return;

    setIsSearching(true);
    setActiveQuest(null);
    setActiveGem(null);
    setProofImage(null);
    setIsCompleted(false);
    setCardDataUrl(null);
    setMessages([]);
    setSquadRoster([]);
    setSquadCapacity(mode === 'squad' ? 8 : 2);

    try {
      const { data: matchResult, error } = await supabase.rpc('find_or_create_explore_match', {
        p_user_id: currentUserId,
        p_mode: mode,
        p_handle: handle,
        p_neighborhood: neighborhood
      });

      if (error) {
        console.error('Explore matchmaking error:', error);
        showToast(`Could not start exploring: ${error.message || JSON.stringify(error)}`, 'error');
        setIsSearching(false);
        return;
      }

      if (matchResult && matchResult.error === 'banned') {
        showToast('Your account has been suspended from multiplayer missions.', 'error');
        setIsSearching(false);
        return;
      }

      if (matchResult && matchResult.error === 'no_gems_for_neighborhood') {
        showToast(`No hidden gems submitted for ${neighborhood} yet — be the first!`, 'error');
        setIsSearching(false);
        return;
      }

      if (matchResult) {
        setRoomId(matchResult.room_id);
        setSquadCapacity(matchResult.max_players || 2);
        setIsQueueCreator(matchResult.is_creator || false);
        if (matchResult.roster) setSquadRoster(matchResult.roster);

        if (matchResult.queue_id) {
          myQueueEntryIdRef.current = matchResult.queue_id;
        }

        if (matchResult.matched) {
          setActiveGem({
            name: matchResult.gem_name,
            neighborhood: matchResult.neighborhood,
            description: matchResult.gem_description
          });
          setHiddenGemSubmittedBy(matchResult.gem_submitted_by || null);
          setActiveQuest(matchResult.quest_text);
          setActiveQuestRarity('common');
          setActiveQuestXp(matchResult.xp_reward);
          setActiveQuestCredit(null);
          setIsSearching(false);
          setTab('tonight');
          if (matchResult.queue_id) {
            subscribeToQueueUpdates(matchResult.queue_id);
          }
        } else if (matchResult.queue_id) {
          subscribeToQueueUpdates(matchResult.queue_id);

          const rosterChannel = supabase
            .channel(`roster_${matchResult.room_id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'matchmaking_participants',
                filter: `room_id=eq.${matchResult.room_id}`
              },
              () => fetchRoster(matchResult.room_id)
            )
            .subscribe();

          participantsSubRef.current = rosterChannel;
        }
      }
    } catch (err) {
      console.error('Explore matchmaking exception:', err);
      showToast('Could not start exploring right now — try again.', 'error');
      setIsSearching(false);
    }
  };

  const startExploreReveal = () => {
    setIsExplorerMode(true);
    track('mission_started', { mode, track: 'explore' });
    if (!selectedNeighborhood) {
      showToast('Pick a neighbourhood first.', 'error');
      return;
    }
    if (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app') {
      setAuthModalReason(`Verify your email to match with other Mumbai explorers in ${mode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }
    if (!isInviteSession) {
      setShowSafetyModal(true);
    } else {
      handleExploreMatchmaking();
    }
  };

  const startQuestRoll = () => {
    setIsExplorerMode(false);
    track('mission_started', { mode, track: 'quest' });
    if ((mode === 'duo' || mode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbai explorers in ${mode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }
    if (mode !== 'solo' && !isInviteSession) {
      setShowSafetyModal(true);
    } else {
      executeMatchmaking();
    }
  };

  useEffect(() => {
    if (tab === 'feed') fetchGallery();
  }, [tab]);

  useEffect(() => {
    if (tab === 'you' && currentUserId) fetchLeaderboard();
  }, [tab, currentUserId]);

  useEffect(() => {
    if (showFriendsModal && leaderboardTab === 'leaderboard') fetchLeaderboard();
  }, [showFriendsModal, leaderboardTab]);

  const fetchGallery = async () => {
    setLoadingFeed(true);
    try {
      const { data: logs, error } = await supabase.from("mission_logs").select("*").order("created_at", { ascending: false }).limit(20);
      if (logs && !error) {
        const { data: profiles } = await supabase.from("profiles").select("device_id, handle");
        const { data: reactions } = await supabase.from("feed_reactions").select("*");

        const profileMap = new Map((profiles || []).map(p => [p.device_id, p.handle]));

        const logsWithReactions = logs.map((log) => {
          const logReactions = reactions?.filter((r) => r.log_id === log.id) || [];
          const userHandle = profileMap.get(log.user_id) || (log.user_id ? log.user_id.substring(0, 8) : "Anonymous");
          return {
            ...log,
            handle: userHandle,
            fire_count: logReactions.filter((r) => r.reaction_type === "fire").length,
            five_count: logReactions.filter((r) => r.reaction_type === "five").length
          };
        });

        setFeedItems(logsWithReactions);
      }
    } catch (err) {
      console.error("Error fetching gallery:", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase.rpc('get_friends_leaderboard');
    if (error) {
      showToast(`Couldn't load leaderboard: ${error.message}`, 'error');
      return;
    }
    setLeaderboard(data || []);
  };

  const handleReact = async (logId: string, type: 'fire' | 'five') => {
    try {
      await supabase.from('feed_reactions').insert([
        { log_id: logId, user_handle: handle, user_id: currentUserId, reaction_type: type }
      ]);
      fetchGallery();
    } catch {
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
      showToast('Report submitted. Our moderation team will review this shortly.', 'success');
    } catch {
    }
  };

  useEffect(() => {
    if (!activeQuest || mode === 'solo' || !roomId) return;

    const channel = supabase
      .channel(`chat_${roomId}`)
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
    if (!trimmed || !roomId) return;

    const now = Date.now();
    if (now - lastMessageSentTime < 3000) {
      showToast('Please wait 3 seconds before sending another message.', 'info');
      return;
    }

    if (trimmed.length > 300) {
      showToast('Message must be 300 characters or fewer.', 'error');
      return;
    }

    setLastMessageSentTime(now);
    setNewMessage('');
    try {
      await supabase.from('mission_messages').insert([
        { room_id: roomId, sender_handle: handle, sender_id: currentUserId, message: trimmed }
      ]);
    } catch {
    }
  };

  const handleWhatsAppInvite = () => {
    const inviteLink = `https://breaktheloopapp.in/?room=${roomId}`;
    const text = encodeURIComponent(
      `🔥 Hey! @${handle} invited you to a ${mode.toUpperCase()} Raid on Break The Loop!\n\nTap this link to join my exact mission lobby right now:\n${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Reads the JPEG's EXIF orientation tag by walking its raw bytes -- no
  // library needed for just this one field. Returns 1 (normal) if the file
  // isn't a JPEG or has no EXIF block, which is a safe no-op default.
  const getExifOrientation = (arrayBuffer: ArrayBuffer): number => {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;

    const length = view.byteLength;
    let offset = 2;
    while (offset < length - 1) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        if (view.getUint32(offset + 2, false) !== 0x45786966) return 1;
        const little = view.getUint16(offset + 8, false) === 0x4949;
        const tiffOffset = offset + 8;
        const dirOffset = tiffOffset + view.getUint32(tiffOffset + 4, little);
        const tags = view.getUint16(dirOffset, little);
        for (let i = 0; i < tags; i++) {
          const entryOffset = dirOffset + i * 12 + 2;
          if (view.getUint16(entryOffset, little) === 0x0112) {
            return view.getUint16(entryOffset + 8, little);
          }
        }
        return 1;
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return 1;
  };

  const compressImage = (file: File, maxWidth = 800, quality = 0.6): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const exifReader = new FileReader();
      exifReader.readAsArrayBuffer(file);
      exifReader.onload = (exifEvent) => {
        let orientation = 1;
        try {
          orientation = getExifOrientation(exifEvent.target?.result as ArrayBuffer);
        } catch {
          orientation = 1;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            const swapDimensions = orientation >= 5 && orientation <= 8;
            canvas.width = swapDimensions ? height : width;
            canvas.height = swapDimensions ? width : height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            switch (orientation) {
              case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
              case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
              case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
              case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
              case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
              case 7: ctx.transform(0, -1, -1, 0, height, width); break;
              case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
              default: break;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas compression failed'));
              },
              'image/jpeg',
              quality
            );
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      };
      exifReader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const compressedBlob = await compressImage(file, 800, 0.6);
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('Proofs')
        .upload(fileName, compressedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        showToast('Could not upload image to cloud. Please check connection and try again.', 'error');
        setProofImage(null);
      } else {
        const { data } = supabase.storage.from('Proofs').getPublicUrl(fileName);
        setProofImage(data.publicUrl);
      }
    } catch (err) {
      console.error('Compression error:', err);
      showToast('Failed to process image. Please try again.', 'error');
      setProofImage(null);
    } finally {
      setUploading(false);
    }
  };

  // Restyled to the redesign's ink/ember/paper share-card composition
  // (README: "Tonight — complete" screen) -- same 1080x1920 share-image
  // layout as before, new palette and type.
  const generateShareCard = (newStreak: number, earnedXp: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#17140F';
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '800 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BREAK / THE / LOOP', 90, 180);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '700 62px sans-serif';
    const text = activeQuest || 'Completed a local real-world mission in Mumbai';
    const words = text.split(' ');
    let line = '';
    let y = 480;
    const lines: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > 880 && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    lines.forEach((l) => {
      ctx.fillText(l, 90, y);
      y += 78;
    });

    ctx.fillStyle = '#E5511C';
    ctx.font = '700 40px sans-serif';
    ctx.fillText(`@${handle} · +${earnedXp} XP · ${selectedNeighborhood || 'MUMBAI'}`.toUpperCase(), 90, 1720);

    ctx.fillStyle = 'rgba(247,244,238,0.55)';
    ctx.font = '500 32px sans-serif';
    ctx.fillText(`${newStreak} day streak · breaktheloopapp.in`, 90, 1790);

    setCardDataUrl(canvas.toDataURL('image/png'));
  };

  const generateSpotifyWrappedCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#17140F';
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(229,81,28,0.16)';
    ctx.beginPath();
    ctx.arc(200, 260, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(191,29,99,0.14)';
    ctx.beginPath();
    ctx.arc(900, 1500, 340, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '800 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BREAK / THE / LOOP', 540, 190);

    ctx.fillStyle = 'rgba(247,244,238,0.6)';
    ctx.font = '600 30px sans-serif';
    ctx.fillText('YOUR IRL RECAP', 540, 240);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '800 54px sans-serif';
    ctx.fillText('YOU DESTROYED ROUTINE', 540, 440);

    ctx.fillStyle = '#E5511C';
    ctx.font = '800 88px sans-serif';
    ctx.fillText(`${totalXp} XP`, 540, 620);
    ctx.fillStyle = 'rgba(247,244,238,0.6)';
    ctx.font = '600 30px sans-serif';
    ctx.fillText('TOTAL IRL XP', 540, 670);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '800 76px sans-serif';
    ctx.fillText(`${streak} DAY STREAK`, 540, 840);

    const topBadge = stripBadgeEmoji(badges[badges.length - 1] || 'First Step');
    ctx.fillStyle = '#BF1D63';
    ctx.font = '800 58px sans-serif';
    ctx.fillText(topBadge.toUpperCase(), 540, 1020);
    ctx.fillStyle = 'rgba(247,244,238,0.6)';
    ctx.font = '600 28px sans-serif';
    ctx.fillText('HIGHEST BADGE UNLOCKED', 540, 1070);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '800 58px sans-serif';
    ctx.fillText(`${friendsList.length} RAID PARTNERS`, 540, 1240);
    ctx.fillStyle = 'rgba(247,244,238,0.6)';
    ctx.font = '600 28px sans-serif';
    ctx.fillText('CONNECTED IN MUMBAI SQUAD', 540, 1290);

    ctx.fillStyle = '#F7F4EE';
    ctx.font = '700 38px sans-serif';
    ctx.fillText(`@${handle} · ${getRankTitle(totalXp).toUpperCase()}`, 540, 1500);
    ctx.fillStyle = 'rgba(247,244,238,0.5)';
    ctx.font = '500 28px sans-serif';
    ctx.fillText('Get your recap at breaktheloopapp.in', 540, 1550);

    const url = canvas.toDataURL('image/png');
    setWrappedCardDataUrl(url);
    setShowWrappedModal(true);
  };

  const handleCompleteMission = async () => {
    if (!proofImage) {
      showToast('Please capture a photo proof to complete your mission!', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('complete_mission', {
        p_quest_text: activeQuest || 'Micro Mission Completed',
        p_photo_url: proofImage,
        p_mode: isExplorerMode ? 'explorer' : mode,
        p_xp_earned: activeQuestXp
      });

      if (error) {
        showToast(`Mission error: ${error.message}`, 'error');
        return;
      }

      if (data && data.success) {
        track('mission_completed', {
          mode: isExplorerMode ? 'explorer' : mode,
          rarity: activeQuestRarity,
          xp_earned: activeQuestXp
        });

        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#E5511C", "#17140F", "#BF1D63", "#F7F4EE"],
        });

        setIsCompleted(true);
        setCompletedAtLabel(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
        setLastMissionAt(Date.now());

        if (queueSubscriptionRef.current) {
          supabase.removeChannel(queueSubscriptionRef.current);
          queueSubscriptionRef.current = null;
        }
        if (participantsSubRef.current) {
          supabase.removeChannel(participantsSubRef.current);
          participantsSubRef.current = null;
        }

        const justEarnedNewBadge = Array.isArray(data.badges) && data.badges.some((b: string) => !badges.includes(b));
        const wasLegendary = activeQuestRarity === 'legendary';
        const oldRankTitle = getRankTitle(totalXp);

        if (data.new_streak !== undefined) setStreak(data.new_streak);
        if (data.new_saved_mins !== undefined) setSavedMins(data.new_saved_mins);
        if (data.badges !== undefined) setBadges(data.badges);
        if (data.new_total_xp !== undefined) setTotalXp(data.new_total_xp);
        if (typeof data.freezes_available === 'number') setFreezesAvailable(data.freezes_available);
        if (data.used_freeze) {
          showToast('❄️ Streak freeze used — one missed day forgiven.', 'info');
        }
        setMissionsLoggedCount((c) => c + 1);
        if (isExplorerMode) setSpotsFoundCount((c) => c + 1);

        if (data.new_total_xp !== undefined) {
          const newRankTitle = getRankTitle(data.new_total_xp);
          if (newRankTitle !== oldRankTitle) {
            showToast(`🎖️ Rank up! You're now a ${newRankTitle}.`, 'success');
          }
        }

        const gainedXp = typeof data.xp_earned === 'number' ? data.xp_earned : activeQuestXp;
        setEarnedXp(gainedXp);
        try {
          generateShareCard(data.new_streak || 0, gainedXp);
        } catch {
        }

        if (justEarnedNewBadge || wasLegendary) {
          setTimeout(() => {
            generateSpotifyWrappedCard();
          }, 2500);
        }
      }
    } catch {
      showToast('Failed to log mission completion. Please try again.', 'error');
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
          title: 'Break The Loop',
          text: 'I just broke the reel addiction loop in Mumbai! Check this out.'
        });
      } else {
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = 'break-the-loop-card.png';
        a.click();
      }
    } catch {
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = 'break-the-loop-card.png';
      a.click();
    }
  };

  const rankProgress = getRankProgress(totalXp);
  const remainingSecs = missionExpiresAt ? Math.max(0, Math.round((missionExpiresAt - nowTick) / 1000)) : 0;
  const timerPct = missionExpiresAt
    ? Math.max(0, Math.min(100, Math.round((remainingSecs / (MISSION_MINUTES * 60)) * 100)))
    : 0;
  const clockLabel = `${String(Math.floor(remainingSecs / 60)).padStart(2, '0')}:${String(remainingSecs % 60).padStart(2, '0')}`;
  const modeLabel = mode === 'solo' ? 'Solo' : mode === 'duo' ? 'Duo raid' : 'Squad raid';
  const rollMeta = `${MISSION_MINUTES} MIN · PHOTO PROOF · ${mode.toUpperCase()}`;
  const hoursSinceMoved = lastMissionAt ? Math.max(0, Math.round((Date.now() - lastMissionAt) / 3600000)) : null;
  const eyebrowText =
    hoursSinceMoved !== null
      ? `${dayPartLabel()} · ${hoursSinceMoved}H SINCE YOU MOVED`
      : `${dayPartLabel()} · READY WHEN YOU ARE`;
  const rollingCaption =
    mode === 'solo' || isInviteSession
      ? ROLL_CAPTIONS[rollingCaptionIdx % ROLL_CAPTIONS.length]
      : squadRoster.length > 0
      ? `LOBBY (${squadRoster.length}/${squadCapacity})`
      : isExplorerMode
      ? `SEARCHING ${(selectedNeighborhood || '').toUpperCase()}…`
      : `SEARCHING ${mode.toUpperCase()}…`;

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col font-sans select-none">
      {/* Toast Stack */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-11/12 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md border transition-all ${
              t.type === 'error'
                ? 'bg-ink/95 border-legendary/40 text-white'
                : t.type === 'success'
                ? 'bg-ink/95 border-ember/40 text-white'
                : 'bg-card border-hairline text-ink'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Persistent app bar -- wordmark, streak pill, avatar. Shared across
          all four tabs (matches the prototype's chrome, which sits above the
          per-tab scroll area rather than inside any one screen). */}
      <header
        className="sticky top-0 z-30 flex justify-between items-center px-5 bg-paper/96 backdrop-blur-sm"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: 12 }}
      >
        <div className="font-display font-extrabold text-[13px] tracking-[.14em] leading-none">
          BREAK<span className="text-ember">/</span>THE<span className="text-ember">/</span>LOOP
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-ink text-paper px-2.5 py-[5px] rounded-full font-mono text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-ember animate-btl-blink" />
            <span>{streak}d</span>
          </div>
          <div className="w-[30px] h-[30px] rounded-full bg-ember text-white grid place-items-center font-display font-extrabold text-[13px]">
            {(handle[0] || 'E').toUpperCase()}
          </div>
        </div>
      </header>

      {/* Incoming Live Raid Invite Banner */}
      {incomingInvite && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-ink border-2 border-ember p-4 rounded-3xl z-50 shadow-2xl text-center space-y-2">
          <h3 className="font-display font-extrabold text-sm text-paper">
            @{incomingInvite.sender_handle} challenged you to a Duo Raid!
          </h3>
          <p className="text-[11px] text-paper/70 italic">"{incomingInvite.quest_text}"</p>
          <div className="flex space-x-2 pt-2">
            <button onClick={declineDirectInvite} className="flex-1 bg-white text-ink py-2 rounded-xl text-xs font-bold">
              Decline
            </button>
            <button onClick={acceptDirectInvite} className="flex-1 bg-ember text-white py-2 rounded-xl text-xs font-bold shadow-lg">
              Accept Raid
            </button>
          </div>
        </div>
      )}

      {/* Explorer Public Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-base font-display font-extrabold text-ember">
                @{selectedProfile.handle}{' '}
                <span className="text-ink-muted font-medium">· {getRankTitle(selectedProfile.total_xp || 0)}</span>
              </h2>
            </div>

            {selectedProfile.handle !== handle && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Block @${selectedProfile.handle}? You will never be matched with them again.`)) return;
                  const { data, error } = await supabase.rpc('block_user', { p_blocked_handle: selectedProfile.handle });
                  if (!error && data && !data.error) {
                    showToast(`@${selectedProfile.handle} has been blocked.`, 'success');
                    setSelectedProfile(null);
                  } else {
                    showToast('Could not block this user.', 'error');
                  }
                }}
                className="w-full bg-paper-deep hover:bg-hairline-soft text-ink-muted hover:text-ember text-[10px] font-bold py-2 rounded-lg border border-hairline transition-all"
              >
                Block this Explorer
              </button>
            )}

            <div className="flex justify-around bg-paper-deep p-3 rounded-2xl border border-hairline text-center">
              <div>
                <p className="text-[10px] text-ink-muted font-semibold">STREAK</p>
                <p className="text-sm font-display font-black text-ink">{selectedProfile.streak} Days</p>
              </div>
              <div className="w-px bg-hairline" />
              <div>
                <p className="text-[10px] text-ink-muted font-semibold">TOTAL XP</p>
                <p className="text-sm font-display font-black text-ember">{selectedProfile.total_xp ?? 0} XP</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-ink-muted uppercase">Unlocked Badges</span>
              <div className="flex flex-wrap gap-1">
                {selectedProfile.badges?.map((b, i) => (
                  <span key={i} className="bg-ember/10 border border-ember/20 text-ember text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {stripBadgeEmoji(b)}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-ink-muted uppercase">Recent Missions Conquered</span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {selectedProfile.history && selectedProfile.history.length > 0 ? (
                  selectedProfile.history.map((h) => (
                    <div key={h.id} className="bg-paper-deep p-2 rounded-xl border border-hairline flex space-x-2 items-center">
                      {h.photo_url && (
                        <img src={h.photo_url} alt="Proof" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="text-left overflow-hidden">
                        <p className="text-[10px] text-ink-body truncate font-medium">"{h.quest_text}"</p>
                        <span className="text-[9px] text-ember/80 uppercase font-mono font-bold">{h.mode} Mission</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-ink-faint text-center py-2">No public missions logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Handle Setup Modal */}
      {showHandleModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-ember/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-lg font-display font-extrabold text-ink">CHOOSE YOUR EXPLORER TAG</h2>
            <p className="text-xs text-ink-muted">
              Pick a unique handle so other Mumbai explorers can recognize and add you to their squad!
            </p>
            <div className="relative">
              <span className="absolute left-4 top-3 text-ember font-bold text-sm">@</span>
              <input
                type="text"
                placeholder="ExplorerTag"
                value={newHandleInput}
                onChange={(e) => setNewHandleInput(e.target.value)}
                maxLength={20}
                className="w-full bg-paper-deep border border-hairline rounded-xl pl-8 pr-4 py-2.5 text-sm text-ink font-bold focus:outline-none focus:border-ember"
              />
            </div>
            <button
              onClick={() => saveHandleDirect(newHandleInput || handle)}
              className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
            >
              Claim Tag & Start
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {(!isLoggedIn || showAuthModal) && !showHandleModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-5 shadow-2xl relative">
            {isLoggedIn && (
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            )}
            <h2 className="text-xl font-display font-extrabold text-ink">
              {showAuthModal ? 'EMAIL VERIFICATION' : 'JOIN BREAK THE LOOP'}
            </h2>
            <p className="text-xs text-ink-muted">
              {authModalReason || 'Enter your email to match with squad partners or continue as a guest for solo missions.'}
            </p>

            {authError && (
              <p className="text-xs text-ember bg-ember/10 p-2 rounded-xl font-medium">{authError}</p>
            )}

            {!isOtpSent ? (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink text-center focus:outline-none focus:border-ember"
                />
                <button
                  onClick={handleSendEmailOtp}
                  className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
                >
                  Send 6-Digit Code
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-card px-2 text-ink-muted">Or</span></div>
                </div>

                <button
                  onClick={handleGuestLogin}
                  className="w-full bg-paper-deep hover:bg-hairline-soft text-ink py-3 rounded-xl font-bold text-sm border border-hairline transition-all active:scale-95"
                >
                  Continue as Guest (Solo Mode Only)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit Email Code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink font-mono text-center focus:outline-none focus:border-ember"
                />
                <button
                  onClick={handleVerifyEmailOtp}
                  className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
                >
                  Verify & Continue
                </button>
                <button
                  onClick={() => setIsOtpSent(false)}
                  className="text-xs text-ink-muted hover:underline pt-2 block mx-auto"
                >
                  Change Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save My Progress Modal */}
      {showSaveProgressModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSaveProgressModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-lg font-display font-extrabold text-ink">SAVE MY PROGRESS</h2>
            <p className="text-xs text-ink-muted">
              Link an email so your streak, XP, and badges are safe if you switch devices or clear your browser. Fully optional — your progress keeps working without it.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={saveProgressEmail}
                onChange={(e) => setSaveProgressEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProgress(saveProgressEmail.trim())}
                className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink text-center focus:outline-none focus:border-ember"
              />
              <button
                onClick={() => handleSaveProgress(saveProgressEmail.trim())}
                className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
              >
                Send Confirmation Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest a Quest Modal */}
      {showSuggestQuestModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSuggestQuestModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-lg font-display font-extrabold text-ink">SUGGEST A QUEST</h2>
            <p className="text-xs text-ink-muted">
              Got a great real-world mission idea? Submit it for review — approved quests go live for everyone.
            </p>
            <div className="space-y-3">
              <div className="flex bg-paper-deep p-1 rounded-xl border border-hairline w-full justify-between">
                {(['solo', 'duo', 'squad'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSuggestQuestMode(m)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      suggestQuestMode === m ? 'bg-ember text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Describe the mission (15-300 characters)..."
                value={suggestQuestText}
                onChange={(e) => setSuggestQuestText(e.target.value)}
                maxLength={300}
                rows={4}
                className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-ember resize-none"
              />
              <button
                onClick={handleSubmitQuestSuggestion}
                className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuggestGemModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSuggestGemModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-lg font-display font-extrabold text-ink">SUGGEST A HIDDEN GEM</h2>
            <p className="text-xs text-ink-muted">
              A real place only you and a few people actually know about — a shop, a stall, a spot with no reviews anywhere. Approved spots go live for everyone to discover.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Place name"
                value={suggestGemName}
                onChange={(e) => setSuggestGemName(e.target.value)}
                maxLength={100}
                className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-legendary"
              />
              <div className="flex flex-wrap gap-2 justify-center">
                {MUMBAI_NEIGHBORHOODS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSuggestGemNeighborhood(n)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      suggestGemNeighborhood === n
                        ? 'bg-legendary text-white border-legendary'
                        : 'bg-paper-deep text-ink-muted border-hairline'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Why is it special? (15-300 characters)..."
                value={suggestGemDescription}
                onChange={(e) => setSuggestGemDescription(e.target.value)}
                maxLength={300}
                rows={4}
                className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-legendary resize-none"
              />
              <button
                onClick={handleSubmitGemSuggestion}
                className="w-full bg-legendary hover:opacity-90 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95"
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <h2 className="text-xl font-display font-black text-ink">Welcome to Break The Loop</h2>
            <p className="text-sm text-ink-body leading-relaxed">
              Tap the big button. Get handed a real, random micro-mission near you.
              Do it, snap a photo, earn XP. That's the whole game.
            </p>
            <p className="text-xs text-ink-muted">
              Bring friends into it later — for now, let's get your first one done.
            </p>
            <button
              onClick={dismissWelcomeModal}
              className="w-full bg-ember text-white font-display font-black py-3 rounded-xl shadow-[0_4px_0_0_#A8360C] active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px] transition-all"
            >
              I'm in →
            </button>
          </div>
        </div>
      )}

      {showRecoverModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowRecoverModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-lg font-display font-extrabold text-ink">SIGN IN ON THIS DEVICE</h2>
            {!isRecoverOtpSent ? (
              <>
                <p className="text-xs text-ink-muted">
                  Enter the email you previously saved your progress with, and we'll send you a 6-digit code.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRecoverAccount(recoverEmail.trim())}
                    className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink text-center focus:outline-none focus:border-ember"
                  />
                  <button
                    onClick={() => handleRecoverAccount(recoverEmail.trim())}
                    className="w-full bg-paper-deep hover:bg-hairline-soft text-ink py-3 rounded-xl font-bold text-sm border border-hairline transition-all active:scale-95"
                  >
                    Send Sign-In Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-muted">
                  Enter the 6-digit code we emailed to {recoverEmail}.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit Email Code"
                    value={recoverOtpInput}
                    onChange={(e) => setRecoverOtpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyRecoverOtp()}
                    className="w-full bg-paper-deep border border-hairline rounded-xl px-4 py-3 text-sm text-ink font-mono text-center focus:outline-none focus:border-ember"
                  />
                  <button
                    onClick={handleVerifyRecoverOtp}
                    className="w-full bg-ember text-white py-3 rounded-xl font-bold text-sm shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
                  >
                    Verify & Sign In
                  </button>
                  <button
                    onClick={() => setIsRecoverOtpSent(false)}
                    className="text-xs text-ink-muted hover:underline pt-2 block mx-auto"
                  >
                    Change Email
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 bg-ink/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-ember/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-lg font-display font-extrabold text-ink">SAFETY FIRST</h2>
            <div className="text-xs text-ink-body text-left space-y-2 bg-paper-deep p-3 rounded-xl border border-hairline">
              <p>• <strong>Meet in Public:</strong> Coordinate only at visible, public landmarks.</p>
              <p>• <strong>Trust Your Instincts:</strong> Leave or cancel the mission immediately if you feel uncomfortable.</p>
              <p>• <strong>Never Share Private Data:</strong> Do not disclose banking, OTPs, or exact home addresses.</p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowSafetyModal(false)}
                className="flex-1 bg-paper-deep hover:bg-hairline-soft text-ink py-2.5 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => (isExplorerMode ? handleExploreMatchmaking() : executeMatchmaking())}
                className="flex-1 bg-ember hover:opacity-90 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg"
              >
                I Agree & Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends List Modal -- interactive squad management (add/raid-invite),
          kept as a modal reachable from You; the read-only weekly leaderboard
          itself renders inline on the You tab per the design spec. */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-ink/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-hairline rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-hairline pb-2">
              <h2 className="text-sm font-bold text-ink">🤝 Raid Squad ({friendsList.length})</h2>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="text-ink-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-paper-deep p-1 rounded-xl border border-hairline w-full justify-between">
              {(['squad', 'leaderboard'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeaderboardTab(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    leaderboardTab === t ? 'bg-ember text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t === 'squad' ? 'Squad' : 'Leaderboard'}
                </button>
              ))}
            </div>

            {leaderboardTab === 'leaderboard' ? (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.handle}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      entry.is_self ? 'bg-ember/10 border-ember/40' : 'bg-paper-deep border-hairline'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-ink-muted font-bold w-4 text-center">{i + 1}</span>
                      <div>
                        <button
                          onClick={() => inspectProfile(entry.handle)}
                          className="font-bold text-ember hover:underline"
                        >
                          @{entry.handle}
                        </button>
                        <span className="block text-[9px] text-ink-muted">{getRankTitle(entry.total_xp)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">{entry.total_xp} XP</p>
                      <p className="text-[9px] text-ink-muted">{entry.streak} Days</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {friendsList.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-ink-muted max-w-[220px] mx-auto">
                      No squad friends added yet. Complete a Duo/Squad mission and add a friend!
                    </p>
                  </div>
                ) : (
                  friendsList.map((f, i) => {
                    const isOnline = onlineUserIds.has(f.friend_user_id);
                    return (
                      <div key={i} className="bg-paper-deep p-2.5 rounded-xl border border-hairline flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-ember' : 'bg-hairline'}`} />
                            <button
                              onClick={() => inspectProfile(f.handle)}
                              className="font-bold text-ember hover:underline"
                            >
                              @{f.handle}
                            </button>
                          </div>
                          <span className="block text-[9px] text-ink-muted pl-3.5">
                            {isOnline ? 'Online in App' : 'Offline'}
                          </span>
                        </div>
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => inspectProfile(f.handle)}
                            className="bg-card hover:bg-paper-deep text-ink text-[10px] px-2 py-1 rounded-lg border border-hairline font-bold"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => sendDirectRaidInvite(f)}
                            disabled={!isOnline || sendingInviteTo === f.handle}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                              isOnline
                                ? 'bg-ember text-white shadow-[0_4px_0_0_#A8360C] active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]'
                                : 'bg-card text-ink-faint border border-hairline cursor-not-allowed'
                            }`}
                          >
                            {sendingInviteTo === f.handle ? 'Sending...' : isOnline ? 'Raid' : 'Offline'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journey Recap Modal */}
      {showWrappedModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-ember/30 rounded-3xl p-5 space-y-4 shadow-2xl text-center relative">
            <button
              onClick={() => setShowWrappedModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-sm font-display font-black text-ember uppercase tracking-wider">Your IRL Recap</h2>
            {wrappedCardDataUrl && (
              <div className="rounded-2xl overflow-hidden border border-hairline bg-paper-deep">
                <img src={wrappedCardDataUrl} alt="Recap" className="w-full h-80 object-contain mx-auto" />
              </div>
            )}
            <button
              onClick={() => handleShareCard(wrappedCardDataUrl)}
              className="w-full bg-ember text-white py-3 rounded-xl font-bold text-xs shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
            >
              Share Recap to Story / WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Main content, one screen per tab */}
      <div className="flex-1 overflow-y-auto pb-28">
        {tab === 'tonight' && (
          <div className="px-5 pt-1.5 pb-7">
            {phase === 'idle' && (
              <div className="animate-btl-rise">
                <p className="mt-2.5 mb-0 font-mono text-[11px] tracking-[.14em] text-ink-muted uppercase">
                  {eyebrowText}
                </p>
                <h1 className="mt-2 mb-0 font-display font-extrabold text-[38px] leading-[1.02] tracking-[-0.02em]">
                  Something<br />small.<br /><span className="text-ember">Right now.</span>
                </h1>

                <div className="grid grid-cols-3 gap-2 mt-6">
                  {(['solo', 'duo', 'squad'] as const).map((m) => {
                    const selected = mode === m;
                    const sub = m === 'solo' ? 'just you' : m === 'duo' ? '1 friend' : '2–8 out';
                    return (
                      <button
                        key={m}
                        onClick={() => handleSelectMode(m)}
                        className={`p-[10px_12px] py-3 rounded-[14px] border-[1.5px] flex flex-col gap-[3px] transition-all ${
                          selected ? 'bg-ink border-ink text-paper' : 'bg-card border-hairline text-[#5A5149]'
                        }`}
                      >
                        <span className="font-display font-bold text-[15px] tracking-[-0.01em] capitalize">{m}</span>
                        <span className="text-[11px] opacity-72 font-medium">{sub}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-5">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3.5 rounded-[26px] bg-ember/20 blur-2xl animate-btl-pulse pointer-events-none"
                  />
                  <button
                    onClick={startQuestRoll}
                    className="relative block w-full text-left bg-ember text-white rounded-[20px] py-[26px] px-[22px] transition-transform active:translate-y-[5px]"
                    style={{ boxShadow: '0 6px 0 0 #A8360C' }}
                  >
                    <span className="block font-display font-extrabold text-[30px] tracking-[-0.02em] leading-none">
                      Roll a mission
                    </span>
                    <span className="block mt-2 font-mono text-[11px] tracking-[.1em] opacity-85">{rollMeta}</span>
                  </button>
                </div>

                <div className="mt-[18px] bg-card border border-hairline rounded-2xl p-[14px_16px] flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-display font-bold text-[15px]">Loop streak</span>
                    <span className="font-mono text-xs text-ink-muted">{streak} / 14 days</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 14 }, (_, i) => {
                      const filled = i < streak;
                      const freezeCell = i === streak && freezesAvailable > 0;
                      return (
                        <span
                          key={i}
                          className="flex-1 h-[26px] rounded-[5px] border"
                          style={{
                            background: filled
                              ? '#E5511C'
                              : freezeCell
                              ? 'repeating-linear-gradient(135deg,#EFEAE1 0 4px,#fff 4px 8px)'
                              : '#F2EDE4',
                            borderColor: filled ? '#E5511C' : '#E7E0D5'
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center gap-2.5 pt-2.5 border-t border-dashed border-hairline">
                    <div>
                      <p className="m-0 text-[13px] font-semibold">Streak freeze</p>
                      <p className="mt-0.5 mb-0 text-xs text-ink-muted">
                        One missed day a week won't kill the streak. {freezesAvailable} left.
                      </p>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[11px] font-bold tracking-[.08em] bg-paper-deep border border-hairline px-2.5 py-1.5 rounded-full">
                      NEW
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggleAlarm}
                  className="w-full mt-2.5 bg-ink text-paper rounded-2xl px-4 py-3.5 flex justify-between items-center"
                >
                  <span className="text-left">
                    <span className="block font-display font-bold text-[15px]">Boredom o'clock</span>
                    <span className="block mt-0.5 text-xs opacity-62">
                      {alarmEnabled ? 'Pings you at 9:30 PM — your usual scroll hour' : 'Off — no nudge tonight'}
                    </span>
                  </span>
                  <span
                    className="flex-shrink-0 w-11 h-[26px] rounded-full relative transition-colors"
                    style={{ background: alarmEnabled ? '#E5511C' : 'rgba(247,244,238,.22)' }}
                  >
                    <span
                      className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: alarmEnabled ? '21px' : '3px' }}
                    />
                  </span>
                </button>
              </div>
            )}

            {phase === 'rolling' && (
              <RollingOverlay
                caption={rollingCaption}
                showWaitingControls={mode !== 'solo' && !isInviteSession}
                onInvite={handleWhatsAppInvite}
                onCancel={cancelSearch}
              />
            )}

            {phase === 'active' && (
              <>
                <MissionTicket
                  questText={activeQuest || ''}
                  rarity={activeQuestRarity}
                  xp={activeQuestXp}
                  modeLabel={isExplorerMode ? modeLabel : modeLabel}
                  credit={isExplorerMode ? hiddenGemSubmittedBy : activeQuestCredit}
                  gem={isExplorerMode ? activeGem : null}
                  expired={missionExpired}
                  clockLabel={clockLabel}
                  timerPct={timerPct}
                  proofImage={proofImage}
                  uploading={uploading}
                  rerollsLeft={rerollsLeft}
                  onImageSelected={handleImageUpload}
                  onComplete={handleCompleteMission}
                  onReroll={handleTicketReroll}
                  onAbandon={handleAbandonMission}
                  onExpiredReset={resetMissionToIdle}
                />

                {(mode === 'duo' || mode === 'squad') && !missionExpired && (
                  <div className="mt-3 bg-card border border-hairline rounded-2xl p-3.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[11px] tracking-[.14em] text-ink-muted">
                        SQUAD · {squadRoster.length} IN
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-3">
                      {squadRoster.map((p, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                          <button
                            onClick={() => inspectProfile(p.handle)}
                            className={`w-[34px] h-[34px] rounded-full grid place-items-center font-display font-extrabold text-[13px] ${
                              p.user_id === currentUserId ? 'bg-ember text-white' : 'bg-paper-deep text-[#5A5149]'
                            }`}
                          >
                            {(p.handle[0] || '?').toUpperCase()}
                          </button>
                          <span className="text-[10px] text-ink-muted font-medium">@{p.handle}</span>
                          {p.user_id !== currentUserId && (
                            <button
                              onClick={() => handleAddFriend(p.user_id)}
                              className="text-[9px] text-ink-muted hover:text-ember"
                            >
                              + friend
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(mode === 'duo' || mode === 'squad') && !missionExpired && (
                  <div className="bg-card border border-hairline rounded-2xl p-3 flex flex-col gap-2 mt-3 text-left">
                    <div className="flex justify-between items-center border-b border-hairline pb-1">
                      <span className="text-[10px] font-bold text-ember uppercase">Live {mode.toUpperCase()} Rally Chat</span>
                      <button
                        onClick={handleWhatsAppInvite}
                        className="text-[10px] bg-ember/10 hover:bg-ember/20 text-ember border border-ember/30 px-2.5 py-1 rounded-lg font-bold transition-all"
                      >
                        Invite Friend
                      </button>
                    </div>
                    <div className="h-28 overflow-y-auto space-y-2 pr-1 text-xs">
                      {messages.length === 0 ? (
                        <p className="text-[10px] text-ink-faint italic py-2 text-center">No messages yet. Coordinate your squad rally point!</p>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id || Math.random()} className="bg-card p-2 rounded-xl border border-hairline-soft flex justify-between items-start">
                            <div>
                              <button
                                onClick={() => inspectProfile(m.sender_handle)}
                                className="text-[10px] font-bold text-ember hover:underline"
                              >
                                @{m.sender_handle}:
                              </button>
                              <span className="text-ink-body ml-1">{m.message}</span>
                            </div>
                            {m.sender_handle !== handle && (
                              <button
                                onClick={() => handleReport('chat', m.id || m.message)}
                                className="text-[9px] text-ink-faint hover:text-ember pl-2"
                                title="Report message"
                              >
                                report
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
                        className="flex-1 bg-paper-deep border border-hairline rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-ember"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-ember hover:opacity-90 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {phase === 'done' && (
              <div className="pt-6 text-center animate-btl-rise">
                <p className="m-0 font-mono text-[11px] tracking-[.18em] text-ink-muted">
                  MISSION LOGGED · {completedAtLabel}
                </p>
                <h2 className="mt-3 mb-0 font-display font-extrabold text-[42px] leading-[.98] tracking-[-0.03em]">
                  LOOP
                  <br />
                  <span className="text-ember">BROKEN</span>
                </h2>
                <div className="flex justify-center gap-2 mt-[18px]">
                  <span className="font-mono text-xs font-bold bg-ember text-white px-3 py-[7px] rounded-full">
                    +{earnedXp} XP
                  </span>
                  <span className="font-mono text-xs font-bold bg-ink text-paper px-3 py-[7px] rounded-full">
                    {streak} DAY STREAK
                  </span>
                </div>
                <div className="mt-5 rounded-2xl overflow-hidden border border-hairline bg-card">
                  {cardDataUrl ? (
                    <img src={cardDataUrl} alt="Story Card" className="w-full h-64 object-contain mx-auto bg-ink" />
                  ) : (
                    <div className="h-[230px] bg-ink" />
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-3.5">
                  <button
                    onClick={() => handleShareCard(cardDataUrl)}
                    className="w-full py-4 rounded-2xl bg-ink text-paper font-display font-extrabold text-base"
                  >
                    Share the card
                  </button>
                  <button
                    onClick={resetMissionToIdle}
                    className="w-full py-3.5 rounded-2xl border border-hairline bg-card text-sm font-semibold text-ink"
                  >
                    Back home
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'explore' && (
          <div className="px-5 pt-1.5 pb-7 animate-btl-rise">
            <p className="mt-2.5 mb-0 font-mono text-[11px] tracking-[.14em] text-ink-muted">LOCAL KNOWLEDGE ONLY</p>
            <h1 className="mt-2 mb-0 font-display font-extrabold text-[32px] leading-[1.04] tracking-[-0.02em]">
              Places people
              <br />
              actually go.
            </h1>
            <div className="flex flex-wrap gap-[7px] mt-5">
              {MUMBAI_NEIGHBORHOODS.map((n) => {
                const selected = selectedNeighborhood === n;
                return (
                  <button
                    key={n}
                    onClick={() => selectNeighborhood(n)}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border-[1.5px] transition-all ${
                      selected ? 'bg-ink border-ink text-paper' : 'bg-card border-hairline text-[#5A5149]'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {mode !== 'solo' && isSearching && (
              <RollingOverlay
                caption={rollingCaption}
                showWaitingControls
                onInvite={handleWhatsAppInvite}
                onCancel={cancelSearch}
              />
            )}

            {mode !== 'solo' && !isSearching && gemPreview === null && selectedNeighborhood && !activeQuest && (
              <button
                onClick={startExploreReveal}
                className="w-full mt-5 text-center py-[15px] rounded-2xl bg-ember text-white font-display font-extrabold text-base"
                style={{ boxShadow: '0 4px 0 0 #A8360C' }}
              >
                Reveal a hidden gem
              </button>
            )}

            {mode === 'solo' && gemLoading && (
              <p className="mt-6 text-center font-mono text-xs tracking-[.1em] text-ink-muted uppercase animate-pulse">
                asking around the neighbourhood…
              </p>
            )}

            {gemPreview && (
              <div className="mt-5 bg-card border border-hairline rounded-[20px] overflow-hidden animate-btl-rise">
                <div className="h-[132px] bg-paper-deep grid place-items-center">
                  <span className="font-mono text-[11px] text-ink-muted">photo of the spot</span>
                </div>
                <div className="px-[18px] pt-4 pb-[18px]">
                  <span className="font-mono text-[10px] font-bold tracking-[.14em] text-legendary uppercase">HIDDEN GEM</span>
                  <h3 className="mt-2 mb-0 font-display font-extrabold text-[22px] tracking-[-0.02em]">{gemPreview.gem.name}</h3>
                  <p className="mt-2 mb-0 text-sm leading-[1.5] text-ink-body">{gemPreview.gem.description}</p>
                  {gemPreview.credit && (
                    <p className="mt-3 mb-0 text-xs text-ink-muted">shared by @{gemPreview.credit}</p>
                  )}
                  <button
                    onClick={confirmGemPreview}
                    className="block w-full text-center mt-4 py-[15px] rounded-2xl bg-ember text-white font-display font-extrabold text-base"
                    style={{ boxShadow: '0 4px 0 0 #A8360C' }}
                  >
                    I'm going
                  </button>
                </div>
              </div>
            )}

            {!selectedNeighborhood && !gemPreview && (
              <div className="mt-6 border-[1.5px] border-dashed border-[#DDD4C7] rounded-[20px] px-6 py-9 text-center">
                <p className="m-0 text-sm text-ink-muted leading-relaxed">
                  Pick a neighbourhood to pull up a spot a local put there.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowSuggestGemModal(true)}
              className="block w-full text-center mt-3 py-3.5 rounded-2xl border border-hairline bg-card text-[13px] font-semibold text-ink"
            >
              Add a spot you know
            </button>
          </div>
        )}

        {tab === 'feed' && (
          <div className="px-5 pt-1.5 pb-7 animate-btl-rise">
            <div className="flex justify-between items-baseline mt-2.5">
              <h1 className="m-0 font-display font-extrabold text-[28px] tracking-[-0.02em]">Proof</h1>
              <span className="font-mono text-[11px] text-ink-muted">{feedItems.length} TODAY</span>
            </div>
            <div className="flex flex-col gap-3.5 mt-4.5">
              {loadingFeed ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-hairline rounded-2xl overflow-hidden animate-pulse">
                    <div className="w-full h-[180px] bg-paper-deep" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-3 w-20 bg-paper-deep rounded" />
                      <div className="h-3 w-full bg-paper-deep rounded" />
                    </div>
                  </div>
                ))
              ) : feedItems.length > 0 ? (
                feedItems.map((item) => {
                  const rarityColor =
                    item.mode === 'legendary' ? '#BF1D63' : item.mode === 'rare' ? '#E5511C' : '#6B6259';
                  return (
                    <div key={item.id} className="bg-card border border-hairline rounded-2xl overflow-hidden">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="Proof" className="w-full h-[180px] object-cover" />
                      ) : (
                        <div className="w-full h-[180px] bg-paper-deep" />
                      )}
                      <div className="p-3.5 pt-3">
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => inspectProfile(item.handle)}
                            className="text-[13px] font-bold text-ink"
                          >
                            @{item.handle || 'Explorer'}
                          </button>
                          <div className="flex items-center gap-2">
                            {userEmail === ADMIN_EMAIL && (
                              <button
                                onClick={() => handleAdminDeleteFeedPost(item.id)}
                                className="text-[10px] bg-ink text-legendary px-2 py-0.5 rounded-lg font-bold"
                                title="Admin: Delete post"
                              >
                                Delete
                              </button>
                            )}
                            <button
                              onClick={() => handleReport('feed', item.id)}
                              className="text-[10px] text-ink-faint hover:text-ember"
                              title="Report post"
                            >
                              report
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 mb-0 text-sm leading-[1.45] text-ink-body">{item.quest_text}</p>
                        <div className="flex gap-2 mt-3.5 items-center">
                          <button
                            onClick={() => handleReact(item.id, 'fire')}
                            className="px-3.5 py-2 rounded-full border border-hairline bg-card font-mono text-xs font-bold text-ink-body"
                          >
                            FIRE {item.fire_count || 0}
                          </button>
                          <button
                            onClick={() => handleReact(item.id, 'five')}
                            className="px-3.5 py-2 rounded-full border border-hairline bg-card font-mono text-xs font-bold text-ink-body"
                          >
                            RESPECT {item.five_count || 0}
                          </button>
                          <span className="ml-auto text-[11px] text-ink-faint">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 space-y-3">
                  <h3 className="text-sm font-bold text-ink">No missions logged yet</h3>
                  <p className="text-xs text-ink-muted max-w-[220px] mx-auto">
                    Be the first to complete one and show up here.
                  </p>
                  <button
                    onClick={() => setTab('tonight')}
                    className="bg-ember text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-[0_4px_0_0_#A8360C] active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px] transition-all"
                  >
                    Start a mission
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'you' && (
          <div className="px-5 pt-2.5 pb-8 animate-btl-rise">
            <div className="flex items-center gap-3.5 mt-2.5">
              <div className="w-14 h-14 rounded-full bg-ember text-white grid place-items-center font-display font-extrabold text-2xl">
                {(handle[0] || 'E').toUpperCase()}
              </div>
              <div>
                {isEditingHandle ? (
                  <input
                    type="text"
                    defaultValue={handle}
                    onBlur={(e) => saveHandle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveHandle(e.currentTarget.value)}
                    autoFocus
                    className="bg-paper-deep border border-ember/50 rounded-lg px-2 py-1 text-xl text-ember font-display font-extrabold focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingHandle(true)}
                    className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink"
                  >
                    @{handle}
                  </button>
                )}
                <p className="mt-0.5 mb-0 text-[13px] text-ink-muted">
                  {getRankTitle(totalXp)}{memberSince ? ` · since ${memberSince}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-5 bg-ink text-paper rounded-[18px] p-[18px]">
              <div className="flex justify-between items-baseline">
                <span className="font-display font-bold text-base">{rankProgress.current.title}</span>
                <span className="font-mono text-xs opacity-70">{rankProgress.label}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/[0.14] overflow-hidden">
                <div
                  className="h-full bg-ember rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${rankProgress.pct}%` }}
                />
              </div>
              <p className="mt-3 mb-0 text-[13px] opacity-66">{rankProgress.nextLabel}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-card border border-hairline rounded-2xl px-3 py-3.5">
                <p className="m-0 font-display font-extrabold text-2xl tracking-[-0.02em]">{streak}</p>
                <p className="mt-1 mb-0 text-[11px] text-ink-muted font-medium leading-tight">day streak</p>
              </div>
              <div className="bg-card border border-hairline rounded-2xl px-3 py-3.5">
                <p className="m-0 font-display font-extrabold text-2xl tracking-[-0.02em]">{missionsLoggedCount}</p>
                <p className="mt-1 mb-0 text-[11px] text-ink-muted font-medium leading-tight">missions logged</p>
              </div>
              <div className="bg-card border border-hairline rounded-2xl px-3 py-3.5">
                <p className="m-0 font-display font-extrabold text-2xl tracking-[-0.02em]">{spotsFoundCount}</p>
                <p className="mt-1 mb-0 text-[11px] text-ink-muted font-medium leading-tight">spots found</p>
              </div>
            </div>

            <p className="mt-6 mb-2.5 font-mono text-[11px] tracking-[.14em] text-ink-muted">BADGES</p>
            <div className="flex flex-wrap gap-[7px]">
              {badges.map((b, i) => {
                const hot = badges.length > 1 && i === badges.length - 1;
                return (
                  <span
                    key={i}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border ${
                      hot ? 'bg-legendary text-white border-legendary' : 'bg-card text-ink-body border-hairline'
                    }`}
                  >
                    {stripBadgeEmoji(b)}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-6 mb-2.5">
              <p className="m-0 font-mono text-[11px] tracking-[.14em] text-ink-muted">SQUAD LEADERBOARD · THIS WEEK</p>
              <button onClick={() => setShowFriendsModal(true)} className="text-[11px] font-bold text-ember">
                🤝 Squad ({friendsList.length})
              </button>
            </div>
            <div className="bg-card border border-hairline rounded-[18px] overflow-hidden">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">No squad data yet — add friends to see a leaderboard.</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div
                    key={entry.handle}
                    className={`flex items-center gap-3 px-4 py-[13px] border-b border-hairline-soft last:border-b-0 ${
                      entry.is_self ? 'bg-tint' : ''
                    }`}
                  >
                    <span className="font-mono text-xs text-ink-faint w-4">{i + 1}</span>
                    <button
                      onClick={() => inspectProfile(entry.handle)}
                      className={`flex-1 text-left text-sm ${entry.is_self ? 'font-bold text-ember' : 'font-medium text-ink'}`}
                    >
                      @{entry.handle}
                    </button>
                    <span className="font-mono text-xs text-ink-muted">{entry.streak}d</span>
                    <span className={`font-mono text-[13px] font-bold ${entry.is_self ? 'text-ember' : 'text-ink'}`}>
                      {entry.total_xp} XP
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => {
                  setSuggestQuestMode(mode);
                  setShowSuggestQuestModal(true);
                }}
                className="w-full text-center py-2.5 rounded-xl border border-hairline bg-card text-xs font-bold text-ink"
              >
                Suggest a quest
              </button>
              <button
                onClick={generateSpotifyWrappedCard}
                className="w-full text-center py-2.5 rounded-xl border border-hairline bg-card text-xs font-bold text-ink"
              >
                View my recap
              </button>
              {userEmail === ADMIN_EMAIL && (
                <Link
                  href="/admin"
                  className="block w-full text-center py-2.5 rounded-xl border border-hairline bg-card text-xs font-bold text-ink"
                >
                  Admin console →
                </Link>
              )}
              {userEmail && userEmail !== 'guest@breaktheloop.app' ? (
                <button onClick={handleSignOut} className="w-full text-center py-2.5 text-xs font-semibold text-ink-muted">
                  Sign Out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthModalReason('');
                      setShowAuthModal(true);
                    }}
                    className="w-full text-center py-2.5 rounded-xl bg-ember text-white text-xs font-bold"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setShowSaveProgressModal(true)}
                    className="w-full text-center py-2.5 text-xs font-bold text-ember"
                  >
                    Save my progress
                  </button>
                  <button
                    onClick={() => setShowRecoverModal(true)}
                    className="w-full text-center py-1.5 text-[11px] text-ink-muted"
                  >
                    Already have an account? Sign in
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-5">
              <Link href="/privacy" className="text-[11px] text-ink-faint hover:underline">Privacy</Link>
              <span className="text-[11px] text-hairline">·</span>
              <Link href="/terms" className="text-[11px] text-ink-faint hover:underline">Terms</Link>
            </div>
          </div>
        )}
      </div>

      <BottomNav active={tab} onSelect={setTab} />
    </main>
  );
}
