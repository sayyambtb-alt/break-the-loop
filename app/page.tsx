"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { initAnalytics, track, identifyUser } from './lib/analytics';
import SuspenseMissionCard, { GemDetails } from "./components/SuspenseMissionCard";
import Overlay from "./components/Overlay";
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

// Drives the rank meter in the profile panel. Returns null at the top tier,
// where there is nothing left to progress towards.
const getNextRankTier = (totalXp: number): { title: string; minXp: number } | null => {
  const next = RANK_TIERS.find((tier) => totalXp < tier.minXp);
  return next ? { title: next.title, minXp: next.minXp } : null;
};

const getRankProgress = (totalXp: number): number => {
  const next = getNextRankTier(totalXp);
  if (!next) return 100;
  const floor = [...RANK_TIERS].reverse().find((tier) => totalXp >= tier.minXp)?.minXp ?? 0;
  const span = next.minXp - floor;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(4, Math.round(((totalXp - floor) / span) * 100)));
};

/* ---------------------------------------------------------------------------
   Shared class recipes
   ---------------------------------------------------------------------------
   The look is built from two ideas: an ink hairline around every surface, and
   a flat offset shadow instead of a blur (see .sticker / .press in
   globals.css). Keeping the recipes here means a button's press depth and a
   card's edge are defined once rather than re-typed across ~25 dialogs.

   Colour rule baked into these: white type only ever sits on ember-deep
   (5.18:1), never on the brighter ember, which is large-text-only at 3.56:1.
--------------------------------------------------------------------------- */
const PANEL = 'relative w-full max-w-sm rounded-3xl sticker bg-white p-5 sm:p-6';
const PANEL_WIDE = 'relative w-full max-w-md rounded-3xl sticker bg-white p-5 text-left';
const CARD = 'w-full rounded-3xl sticker bg-white';
const BTN_PRIMARY =
  'w-full rounded-2xl sticker press bg-ember-deep px-4 py-3.5 font-display text-sm font-bold text-white';
const BTN_GOLD =
  'w-full rounded-2xl sticker press bg-gold px-4 py-3.5 font-display text-sm font-bold text-ink';
const BTN_QUIET =
  'w-full rounded-2xl sticker-sm press-sm bg-white px-4 py-3 text-sm font-bold text-ink hover:bg-cream';
const BTN_MINI =
  'rounded-xl sticker-sm press-sm bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink hover:bg-cream';
const BTN_MINI_SOLID =
  'rounded-xl sticker-sm press-sm bg-ember-deep px-2.5 py-1.5 text-[11px] font-bold text-white';
const BTN_MINI_DANGER =
  'rounded-xl sticker-sm press-sm bg-rose px-2.5 py-1.5 text-[11px] font-bold text-white';
const CLOSE_BTN =
  'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full sticker-sm press-sm bg-cream text-sm font-bold text-ink';
const INPUT =
  'w-full rounded-2xl sticker-flat bg-cream px-4 py-3 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-muted focus:bg-white';
const CHIP_EMBER =
  'inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ember-wash px-2.5 py-0.5 text-[11px] font-bold text-ember-ink';
const CHIP_GOLD =
  'inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold-wash px-2.5 py-0.5 text-[11px] font-bold text-gold-ink';
const WELL = 'rounded-2xl sticker-flat bg-cream p-3';

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

interface ReportItem {
  id: string;
  reporter_handle: string;
  reported_type: string;
  target_id: string;
  reason: string;
  created_at: string;
  content_text?: string | null;
  content_photo_url?: string | null;
  offender_handle?: string | null;
  offender_user_id?: string | null;
}

interface PendingQuest {
  id: string;
  mode: string;
  quest_text: string;
  submitted_by_handle: string;
  created_at: string;
}

interface PendingGem {
  id: string;
  name: string;
  neighborhood: string;
  description: string;
  submitted_by_handle: string;
  created_at: string;
  status?: string;
  is_active?: boolean;
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

  const [tab, setTab] = useState<'quest' | 'feed'>('quest');
  const [mode, setMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [isExplorerMode, setIsExplorerMode] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [hiddenGemSubmittedBy, setHiddenGemSubmittedBy] = useState<string | null>(null);
  const [activeGem, setActiveGem] = useState<GemDetails | null>(null);
  const [showSuggestGemModal, setShowSuggestGemModal] = useState(false);
  const [suggestGemName, setSuggestGemName] = useState('');
  const [suggestGemNeighborhood, setSuggestGemNeighborhood] = useState('');
  const [suggestGemDescription, setSuggestGemDescription] = useState('');
  const [showPendingGemsModal, setShowPendingGemsModal] = useState(false);
  const [pendingGems, setPendingGems] = useState<PendingGem[]>([]);
  const [dirtyGemIds, setDirtyGemIds] = useState<string[]>([]);
  const [savedGemIds, setSavedGemIds] = useState<string[]>([]);
  const [pendingGemCount, setPendingGemCount] = useState<number>(0);
  const [loadingPendingGems, setLoadingPendingGems] = useState(false);

  const MUMBAI_NEIGHBORHOODS = [
    'Colaba', 'Fort', 'Marine Drive', 'Dadar', 'Matunga', 'Mahim', 'Wadala', 'Sewri',
    'Bandra', 'Worli', 'Andheri', 'Juhu', 'Powai', 'Borivali'
  ];
  const [isSearching, setIsSearching] = useState(false);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [activeQuestRarity, setActiveQuestRarity] = useState<'common' | 'rare' | 'legendary'>('common');
  const [activeQuestXp, setActiveQuestXp] = useState(15);
  const [activeQuestCredit, setActiveQuestCredit] = useState<string | null>(null);
  const [isMissionAccepted, setIsMissionAccepted] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [pendingInviteRoomId, setPendingInviteRoomId] = useState<string | null>(null);
  const [isInviteSession, setIsInviteSession] = useState<boolean>(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [streak, setStreak] = useState(1);
  const [savedMins, setSavedMins] = useState(15);
  const [totalXp, setTotalXp] = useState(0);
  const [handle, setHandle] = useState('Explorer');
  const [badges, setBadges] = useState<string[]>(['🌱 First Step']);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);

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
  const [showDevModal, setShowDevModal] = useState(false);
  const devTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Admin Reports Modal
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [adminReports, setAdminReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Quest Suggestions
  const [showSuggestQuestModal, setShowSuggestQuestModal] = useState(false);
  const [suggestQuestMode, setSuggestQuestMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [suggestQuestText, setSuggestQuestText] = useState('');
  const [showPendingQuestsModal, setShowPendingQuestsModal] = useState(false);
  const [pendingQuests, setPendingQuests] = useState<PendingQuest[]>([]);
  const [loadingPendingQuests, setLoadingPendingQuests] = useState(false);

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

  // Fires once on mount; no-ops entirely until a PostHog key is configured.
  useEffect(() => {
    initAnalytics();
  }, []);

  // A brand-new visitor has never seen this before -- show it once, then
  // never again. Deliberately client-side/localStorage-based rather than
  // tied to the account, so it works identically for guests.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('btl_has_seen_welcome')) {
      setShowWelcomeModal(true);
    }
  }, []);

  const dismissWelcomeModal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('btl_has_seen_welcome', 'true');
    }
    setShowWelcomeModal(false);
    track('welcome_dismissed');
  };

  // Re-identifies whenever the handle actually changes, rather than needing
  // a call at every one of the several places handle gets set.
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

  // Best-effort cleanup so a closed tab / dropped connection doesn't leave an
  // orphaned matchmaking_queue row behind — React's unmount cleanup never
  // runs on a real tab close, only pagehide does.
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

      // Don't set match state directly from URL params -- the room may
      // have filled up, expired, or moved on since the link was shared.
      // join_room_by_id is the source of truth once auth resolves below.
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

  // Resolve a shared invite link once we actually have an authenticated
  // user and handle -- never trust the URL's own claims about mode/quest,
  // since the room may have moved on since the link was shared.
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

      // An invite link to an Explore room needs to land the joiner on the
      // Explore track with the right neighborhood selected, not silently
      // treated as a regular Quest match.
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
        setIsMissionAccepted(false);
        setIsSearching(false);
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
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds((prev) => new Set([...Array.from(prev), key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const updated = new Set(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
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

  const handleDevPressStart = () => {
    if (userEmail !== ADMIN_EMAIL) return;

    devTimerRef.current = setTimeout(() => {
      setShowDevModal(true);
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
    }, 2000);
  };

  const handleDevPressEnd = () => {
    if (devTimerRef.current) {
      clearTimeout(devTimerRef.current);
      devTimerRef.current = null;
    }
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

  const fetchAdminReports = async () => {
    if (userEmail !== ADMIN_EMAIL) return;
    setLoadingReports(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_reports');
      if (data) {
        setAdminReports(data);
        setShowReportsModal(true);
      }
    } catch {
    } finally {
      setLoadingReports(false);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId });
    if (error) {
      showToast(`Couldn't resolve report: ${error.message}`, 'error');
      return;
    }
    setAdminReports((prev) => prev.filter((r) => r.id !== reportId));
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

  const fetchPendingQuests = async () => {
    if (userEmail !== ADMIN_EMAIL) return;
    setLoadingPendingQuests(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_pending_quests');
      if (data) {
        setPendingQuests(data);
        setShowPendingQuestsModal(true);
      }
    } catch {
    } finally {
      setLoadingPendingQuests(false);
    }
  };

  const handleApproveQuest = async (questId: string) => {
    const { error } = await supabase.rpc('admin_approve_quest', { p_quest_id: questId });
    if (error) {
      showToast(`Couldn't approve quest: ${error.message}`, 'error');
      return;
    }
    setPendingQuests((prev) => prev.filter((q) => q.id !== questId));
  };

  const handleRejectQuest = async (questId: string) => {
    const { error } = await supabase.rpc('admin_reject_quest', { p_quest_id: questId });
    if (error) {
      showToast(`Couldn't reject quest: ${error.message}`, 'error');
      return;
    }
    setPendingQuests((prev) => prev.filter((q) => q.id !== questId));
  };

  // Despite the name, this now fetches every gem regardless of status --
  // approved ones need to stay editable/removable too, not just pending ones.
  const fetchPendingGems = async () => {
    if (userEmail !== ADMIN_EMAIL) return;
    setLoadingPendingGems(true);
    try {
      const { data } = await supabase.rpc('admin_get_all_gems');
      if (data) {
        setPendingGems(data);
        // Any in-progress edits are discarded by a refetch, so clear the
        // dirty markers too rather than leaving them pointing at stale edits.
        setDirtyGemIds([]);
        setSavedGemIds([]);
        setPendingGemCount(data.filter((g: PendingGem) => g.status === 'pending').length);
        setShowPendingGemsModal(true);
      }
    } catch {
    } finally {
      setLoadingPendingGems(false);
    }
  };

  const markGemDirty = (gemId: string) => {
    setDirtyGemIds((prev) => prev.includes(gemId) ? prev : [...prev, gemId]);
    setSavedGemIds((prev) => prev.filter((id) => id !== gemId));
  };

  // Surfaces the pending-submission count on the header badge without
  // needing to open the panel first.
  useEffect(() => {
    if (userEmail !== ADMIN_EMAIL) return;
    (async () => {
      const { data } = await supabase.rpc('admin_get_pending_gem_count');
      if (typeof data === 'number') setPendingGemCount(data);
    })();
  }, [userEmail]);

  const handleApproveGem = async (gem: PendingGem) => {
    const { error } = await supabase.rpc('admin_approve_gem', {
      p_gem_id: gem.id,
      p_name: gem.name,
      p_neighborhood: gem.neighborhood,
      p_description: gem.description
    });
    if (error) {
      showToast(`Couldn't approve spot: ${error.message}`, 'error');
      return;
    }
    // Approving doesn't remove the gem, it flips it to live -- keep it in
    // the list so it stays editable, and drop the pending badge count.
    setPendingGems((prev) => prev.map((g) => g.id === gem.id ? { ...g, status: 'approved', is_active: true } : g));
    setDirtyGemIds((prev) => prev.filter((id) => id !== gem.id));
    setPendingGemCount((prev) => Math.max(0, prev - 1));
    showToast(`"${gem.name}" is now live in ${gem.neighborhood}.`, 'success');
  };

  const handleRejectGem = async (gemId: string) => {
    const wasPending = pendingGems.find((g) => g.id === gemId)?.status === 'pending';
    const { error } = await supabase.rpc('admin_reject_gem', { p_gem_id: gemId });
    if (error) {
      showToast(`Couldn't remove spot: ${error.message}`, 'error');
      return;
    }
    setPendingGems((prev) => prev.filter((g) => g.id !== gemId));
    setDirtyGemIds((prev) => prev.filter((id) => id !== gemId));
    if (wasPending) setPendingGemCount((prev) => Math.max(0, prev - 1));
    showToast('Spot removed.', 'success');
  };

  // Edits an already-approved gem in place, without re-triggering approval.
  const handleUpdateGem = async (gem: PendingGem) => {
    const { error } = await supabase.rpc('admin_update_gem', {
      p_gem_id: gem.id,
      p_name: gem.name,
      p_neighborhood: gem.neighborhood,
      p_description: gem.description
    });
    if (error) {
      showToast(`Couldn't save changes: ${error.message}`, 'error');
      return;
    }
    setDirtyGemIds((prev) => prev.filter((id) => id !== gem.id));
    setSavedGemIds((prev) => prev.includes(gem.id) ? prev : [...prev, gem.id]);
    showToast(`Saved — "${gem.name}" now lives in ${gem.neighborhood}.`, 'success');
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

  const handleAdminDeleteChatMessage = async (messageId: string) => {
    if (!window.confirm('ADMIN: Are you sure you want to permanently remove this chat message?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_delete_chat_message', { p_message_id: messageId });
      if (!error) {
        showToast('Message removed successfully.', 'success');
      } else {
        showToast(`Failed to delete message: ${error.message}`, 'error');
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
      new Notification('Break The Loop 🔥', {
        body: 'In-app notifications are active!',
        icon: '/icon.png'
      });
    }
  };

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
    setBadges(['🌱 First Step']);
    setFriendsList([]);
    if (uid) {
      loadOrCreateProfile(uid, 'guest@breaktheloop.app');
      fetchFriends(uid);
      setupUserChannels(uid);
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
        if (data.badges) setBadges(data.badges);
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
        if (email !== 'guest@breaktheloop.app') {
          setNewHandleInput(defaultHandle);
          setShowHandleModal(true);
        }
      }
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

  const handleSelectMode = (selectedMode: 'solo' | 'duo' | 'squad') => {
    if ((selectedMode === 'duo' || selectedMode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbai explorers in ${selectedMode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }

    // Switching mode tabs mid-match would otherwise leave the old match's
    // realtime connection open in the background — same cleanup
    // handleCompleteMission does once a mission genuinely ends.
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

  const handleSelectQuestTrack = () => {
    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
      queueSubscriptionRef.current = null;
    }
    if (participantsSubRef.current) {
      supabase.removeChannel(participantsSubRef.current);
      participantsSubRef.current = null;
    }

    setIsExplorerMode(false);
    setActiveQuest(null);
    setActiveGem(null);
    setRoomId('');
    setProofImage(null);
    setIsCompleted(false);
    setIsInviteSession(false);
    setIsSearching(false);
    setSquadRoster([]);
    setHiddenGemSubmittedBy(null);
  };

  const handleSelectExplorer = () => {
    if (queueSubscriptionRef.current) {
      supabase.removeChannel(queueSubscriptionRef.current);
      queueSubscriptionRef.current = null;
    }
    if (participantsSubRef.current) {
      supabase.removeChannel(participantsSubRef.current);
      participantsSubRef.current = null;
    }

    setIsExplorerMode(true);
    setActiveQuest(null);
    setRoomId('');
    setProofImage(null);
    setIsCompleted(false);
    setIsInviteSession(false);
    setIsSearching(false);
    setSquadRoster([]);
    setSquadCapacity(mode === 'squad' ? 8 : 2);
    setHiddenGemSubmittedBy(null);
    setActiveGem(null);
  };

  // The nav now carries Quest / Explore / Feed as three peer destinations
  // instead of a Quest|Feed tab pair plus a separate track toggle. Switching
  // tracks still resets the board (handleSelectQuestTrack / handleSelectExplorer
  // do that), but re-tapping the track you're already on must NOT -- that would
  // silently throw away a mission in progress.
  const goToQuestTrack = () => {
    setTab('quest');
    if (isExplorerMode) handleSelectQuestTrack();
  };

  const goToExploreTrack = () => {
    setTab('quest');
    if (!isExplorerMode) handleSelectExplorer();
  };

  const handleRevealGem = async () => {
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
    setIsMissionAccepted(false);
    setActiveGem({ name: data.name, neighborhood: data.neighborhood, description: data.description });
    // activeQuest still drives photo-proof, completion logging and the share
    // card, so it stays set even though the gem card renders from activeGem.
    setActiveQuest(`📍 ${data.name} (${data.neighborhood}) — ${data.description}`);
  };

  // Duo/Squad Explore -- mirrors executeMatchmaking's multiplayer path
  // closely, but matches people wanting the same neighborhood (not the
  // same generic mode) and sources content from hidden_gems.
  const handleExploreMatchmaking = async () => {
    setShowSafetyModal(false);
    if (!selectedNeighborhood) {
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
        p_neighborhood: selectedNeighborhood
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
        showToast(`No hidden gems submitted for ${selectedNeighborhood} yet — be the first!`, 'error');
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
          setIsMissionAccepted(false);
          setIsSearching(false);
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

  const handleAbandonMission = async () => {
    if (window.confirm("Are you sure you want to leave this mission? (Your streak won't be penalized)")) {
      track('mission_abandoned', { mode, track: isExplorerMode ? 'explore' : 'quest' });
      await cancelSearch();
      setActiveQuest(null);
      setActiveGem(null);
      setRoomId('');
      setProofImage(null);
      setIsCompleted(false);
      setIsInviteSession(false);
      setIsSearching(false);
      setMessages([]);
      setSquadRoster([]);
      setSquadCapacity(2);
    }
  };

  useEffect(() => {
    if (tab === 'feed') fetchGallery();
  }, [tab]);

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

  // Realtime Live Chat Subscription
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

  const onStartMatchingClick = () => {
    track('mission_started', { mode, track: isExplorerMode ? 'explore' : 'quest' });

    if (isExplorerMode && mode === 'solo') {
      handleRevealGem();
      return;
    }

    if ((mode === 'duo' || mode === 'squad') && (isGuest || !userEmail || userEmail === 'guest@breaktheloop.app')) {
      setAuthModalReason(`Verify your email to match with other Mumbai explorers in ${mode.toUpperCase()} mode.`);
      setShowAuthModal(true);
      return;
    }

    if (mode !== 'solo' && !isInviteSession) {
      setShowSafetyModal(true);
    } else if (isExplorerMode) {
      handleExploreMatchmaking();
    } else {
      executeMatchmaking();
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

  // Kept open for the lifetime of a Duo/Squad match (not just until matching
  // completes) so both the initial match AND every later shared reroll keep
  // syncing to every participant, not just whoever triggered it.
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

          // Reveal the mission the moment the room hits its minimum viable
          // size (2) -- not when it's full. A Squad room keeps accepting
          // joiners up to its cap long after this fires.
          const justRevealed = prevCount < 2 && newCount >= 2;
          if (justRevealed) {
            setRoomId(payload.new.room_id);
            setIsSearching(false);
          }

          // Keep the visible roster live as people keep trickling in,
          // not just at the initial reveal moment.
          if (newCount !== prevCount) {
            await fetchRoster(payload.new.room_id);
          }

          setActiveQuest(payload.new.quest_text);
          setActiveQuestRarity(payload.new.rarity);
          setActiveQuestXp(payload.new.xp_reward);
          setActiveQuestCredit(null);
          setIsMissionAccepted(false);

          // Explore rooms carry gem fields on the same row -- keep every
          // participant's structured gem card in sync too, whether this
          // update is the initial group reveal or a later shared reroll.
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
      await pickRandomQuest();
      setIsSearching(false);
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
          setIsMissionAccepted(false);
          setIsSearching(false);
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

  const rollRarity = (): { rarity: 'common' | 'rare' | 'legendary'; xp: number } => {
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
        setIsMissionAccepted(false);
        setActiveQuest(chosen.quest_text);
      } else {
        const { rarity, xp } = rollRarity();
        setActiveQuestRarity(rarity);
        setActiveQuestXp(xp);
        setActiveQuestCredit(null);
        setIsMissionAccepted(false);
        setActiveQuest("Head to the nearest tapri or cafe and order a beverage you have never tried!");
      }
    } catch (e) {
      const { rarity, xp } = rollRarity();
      setActiveQuestRarity(rarity);
      setActiveQuestXp(xp);
      setActiveQuestCredit(null);
      setIsMissionAccepted(false);
      setActiveQuest("Head to the nearest tapri or cafe and order a beverage you have never tried!");
    }
  };

  const handleSharedReroll = async () => {
    const { error } = await supabase.rpc('reroll_shared_quest', {
      p_queue_id: myQueueEntryIdRef.current
    });
    if (error) {
      showToast(`Couldn't reroll: ${error.message}`, 'error');
    }
    // No need to setActiveQuest here directly — the realtime subscription from
    // subscribeToQueueUpdates will deliver the update to this client too, the
    // same way it delivers it to the partner. Single source of truth, no
    // duplicate logic.
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
        // Orientation-detection is a nice-to-have, not something that should
        // ever be able to block the actual upload -- if parsing fails for
        // any reason (corrupt file, unexpected format), fall back to "no
        // rotation" rather than leaving compressImage's promise hanging.
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

            // Orientations 5-8 involve a 90-degree turn, so the canvas
            // itself needs swapped dimensions before we rotate into it.
            const swapDimensions = orientation >= 5 && orientation <= 8;
            canvas.width = swapDimensions ? height : width;
            canvas.height = swapDimensions ? width : height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            // Undoes exactly what each EXIF orientation value says was done
            // to the raw pixels, so the compressed output always comes out
            // right-side-up regardless of how the phone stored it.
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  /* -------------------------------------------------------------------------
     Share cards
     -------------------------------------------------------------------------
     These are the only part of the product that leaves the app — they get
     posted to Instagram and WhatsApp, where they are the whole first
     impression. They were still drawn in the pre-redesign palette (navy
     #090d16 grounds, rose #f43f5e accents, generic sans-serif), so the most
     public artifact looked like a different product from the one that made it.

     They are redrawn here in the same language as the app: cream paper, an ink
     hairline with a flat offset shadow, Space Grotesk, and ember/gold accents.

     They also printed the wrong numbers. The mission card's "IRL XP GAINED"
     read new_saved_mins — a cumulative minutes total, shown with a "+" as if
     it were the XP just earned. The recap's headline figure was the same
     minutes count labelled XP, and its "Highest Rank Unlocked" was whatever
     badge happened to be last in the array, not the rank the app actually
     computes from total_xp.
  --------------------------------------------------------------------------- */

  const CARD_INK = '#1C1410';
  const CARD_CREAM = '#FFF3E2';
  const CARD_CREAM_DEEP = '#FBE3C4';
  const CARD_EMBER = '#C2410C';
  const CARD_GOLD = '#F5A524';
  const CARD_MUTED = '#6B5B50';
  const DISPLAY = '"Space Grotesk", "Inter", sans-serif';
  const BODY = '"Inter", sans-serif';

  // Ink hairline + flat offset shadow, the .sticker recipe from globals.css
  // expressed on a canvas.
  const stickerBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill: string
  ) => {
    ctx.fillStyle = CARD_INK;
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 14, w, h, radius);
    ctx.fill();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    ctx.strokeStyle = CARD_INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();
  };

  // The printed-paper halftone, matching the .halftone class.
  const halftone = (ctx: CanvasRenderingContext2D, alpha: number) => {
    ctx.fillStyle = CARD_INK;
    ctx.globalAlpha = alpha;
    for (let y = 0; y < 1920; y += 26) {
      for (let x = 0; x < 1080; x += 26) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  // The struck-through LOOP from the header, drawn as the wordmark.
  const wordmark = (ctx: CanvasRenderingContext2D, y: number) => {
    ctx.textAlign = 'center';
    ctx.font = `700 54px ${DISPLAY}`;
    const left = 'BREAK THE ';
    const right = 'LOOP';
    const lw = ctx.measureText(left).width;
    const rw = ctx.measureText(right).width;
    const startX = 540 - (lw + rw) / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = CARD_INK;
    ctx.fillText(left, startX, y);
    ctx.fillStyle = CARD_EMBER;
    ctx.fillText(right, startX + lw, y);

    ctx.fillStyle = CARD_EMBER;
    ctx.fillRect(startX + lw, y - 16, rw, 6);
    ctx.textAlign = 'center';
  };

  // Wraps to a fixed width and returns the lines, so callers can lay out
  // around the real height instead of guessing at it (the old card pinned its
  // stats to y=1050 regardless, leaving ~350px of dead space on short quests).
  const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const statBlock = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    label: string,
    value: string,
    accent: string,
    fill: string
  ) => {
    stickerBox(ctx, x, y, w, 190, 28, fill);
    ctx.textAlign = 'center';
    ctx.fillStyle = CARD_MUTED;
    ctx.font = `700 28px ${DISPLAY}`;
    ctx.fillText(label, x + w / 2, y + 62);
    ctx.fillStyle = accent;
    ctx.font = `700 64px ${DISPLAY}`;
    ctx.fillText(value, x + w / 2, y + 138);
  };

  // xpGained is the XP this mission actually paid out; totalXpNow is the
  // lifetime figure the rank is derived from. They are different numbers and
  // the card says which is which.
  const generateShareCard = (newStreak: number, xpGained: number, totalXpNow: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = CARD_CREAM;
    ctx.fillRect(0, 0, 1080, 1920);
    halftone(ctx, 0.05);

    wordmark(ctx, 180);

    ctx.textAlign = 'center';
    ctx.fillStyle = CARD_MUTED;
    ctx.font = `700 30px ${DISPLAY}`;
    ctx.fillText('M U M B A I   ·   R E A L   W O R L D', 540, 236);

    const quoteFont = `700 56px ${DISPLAY}`;
    ctx.font = quoteFont;
    const quest = activeQuest || 'Completed a local real-world mission in Mumbai';
    const lines = wrapLines(ctx, `“${quest}”`, 700);

    // The card is sized to its content and then centred in the band between
    // the header and the footer, rather than pinned to a fixed frame. The old
    // card forced its stats to y=1050 and its panel to 1100px tall whatever
    // the quest said, so a short brief left ~350px of empty card.
    const quoteTop = 196;
    const briefH = quoteTop + lines.length * 74 + 40;
    const statsGap = 70;
    const statsH = 190;
    const rankGap = 78;
    const contentH = briefH + statsGap + statsH + rankGap;

    const bandTop = 300;
    const bandBottom = 1620;
    const briefTop = Math.max(bandTop, bandTop + (bandBottom - bandTop - contentH) / 2);
    stickerBox(ctx, 90, briefTop, 860, briefH, 48, '#FFFFFF');

    // Rarity ribbon across the top of the brief.
    const ribbonFill =
      activeQuestRarity === 'legendary' ? CARD_GOLD : activeQuestRarity === 'rare' ? '#FFE4E9' : CARD_CREAM_DEEP;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(90, briefTop, 860, briefH, 48);
    ctx.clip();
    ctx.fillStyle = ribbonFill;
    ctx.fillRect(90, briefTop, 860, 110);
    ctx.fillStyle = CARD_INK;
    ctx.fillRect(90, briefTop + 104, 860, 6);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = CARD_INK;
    ctx.font = `700 30px ${DISPLAY}`;
    ctx.fillText(
      `${(isExplorerMode ? 'EXPLORER' : mode).toUpperCase()} MISSION BROKEN`,
      140,
      briefTop + 68
    );

    ctx.textAlign = 'right';
    ctx.font = `700 32px ${DISPLAY}`;
    ctx.fillText(`+${xpGained} XP`, 900, briefTop + 68);

    ctx.textAlign = 'center';
    ctx.fillStyle = CARD_INK;
    ctx.font = quoteFont;
    lines.forEach((line, i) => {
      ctx.fillText(line, 540, briefTop + quoteTop + i * 74);
    });

    // Stats sit under the brief wherever it actually ends.
    const statsY = briefTop + briefH + statsGap;
    statBlock(ctx, 90, statsY, 410, 'STREAK', `${newStreak} days`, CARD_INK, CARD_CREAM_DEEP);
    statBlock(ctx, 540, statsY, 410, 'IRL XP', `${totalXpNow}`, CARD_EMBER, '#FFEAD8');

    ctx.fillStyle = CARD_MUTED;
    ctx.font = `700 30px ${DISPLAY}`;
    ctx.fillText(getRankTitle(totalXpNow).toUpperCase(), 540, statsY + 268);

    ctx.fillStyle = CARD_INK;
    ctx.font = `700 42px ${DISPLAY}`;
    ctx.fillText(`@${handle}`, 540, 1740);

    ctx.fillStyle = CARD_MUTED;
    ctx.font = `500 30px ${BODY}`;
    ctx.fillText('breaktheloopapp.in', 540, 1800);

    setCardDataUrl(canvas.toDataURL('image/png'));
  };

  // The auto-surfaced Recap fires from a setTimeout inside the completion
  // handler, where streak/xp/badges in scope are still the pre-completion
  // values. Taking them as arguments lets that path pass the fresh numbers
  // instead of showing you a recap of the run before the one you just did.
  const generateSpotifyWrappedCard = (
    recapStreak: number = streak,
    recapTotalXp: number = totalXp,
    recapBadges: string[] = badges
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = CARD_CREAM;
    ctx.fillRect(0, 0, 1080, 1920);
    halftone(ctx, 0.05);

    wordmark(ctx, 170);

    ctx.textAlign = 'center';
    ctx.fillStyle = CARD_MUTED;
    ctx.font = `700 30px ${DISPLAY}`;
    ctx.fillText('Y O U R   I R L   R E C A P', 540, 226);

    stickerBox(ctx, 90, 300, 860, 1210, 48, '#FFFFFF');

    ctx.fillStyle = CARD_INK;
    ctx.font = `700 62px ${DISPLAY}`;
    ctx.fillText('YOU BROKE', 540, 430);
    ctx.fillText('THE ROUTINE', 540, 500);

    ctx.fillStyle = CARD_MUTED;
    ctx.font = `500 30px ${BODY}`;
    ctx.fillText('Everything you have done outside, so far.', 540, 560);

    // Lifetime XP, not the minutes counter the old card printed here.
    statBlock(ctx, 150, 620, 340, 'IRL XP', `${recapTotalXp}`, CARD_EMBER, '#FFEAD8');
    statBlock(ctx, 560, 620, 340, 'STREAK', `${recapStreak}d`, CARD_INK, CARD_CREAM_DEEP);

    // The real rank the app computes, rather than the last badge in the array.
    stickerBox(ctx, 150, 890, 750, 190, 28, CARD_GOLD);
    ctx.fillStyle = CARD_INK;
    ctx.font = `700 28px ${DISPLAY}`;
    ctx.fillText('RANK', 525, 952);
    ctx.font = `700 56px ${DISPLAY}`;
    ctx.fillText(getRankTitle(recapTotalXp).toUpperCase(), 525, 1024);

    const topBadge = recapBadges[recapBadges.length - 1] || '🌱 First Step';
    stickerBox(ctx, 150, 1150, 750, 190, 28, '#FFF0CF');
    ctx.fillStyle = CARD_MUTED;
    ctx.font = `700 28px ${DISPLAY}`;
    ctx.fillText('LATEST BADGE', 525, 1212);
    ctx.fillStyle = '#7A4B05';
    ctx.font = `700 48px ${DISPLAY}`;
    ctx.fillText(topBadge, 525, 1286);

    const partners = friendsList.length;
    ctx.fillStyle = CARD_INK;
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.fillText(`${partners} raid ${partners === 1 ? 'partner' : 'partners'}`, 540, 1430);

    ctx.fillStyle = CARD_INK;
    ctx.font = `700 42px ${DISPLAY}`;
    ctx.fillText(`@${handle}`, 540, 1700);

    ctx.fillStyle = CARD_MUTED;
    ctx.font = `500 30px ${BODY}`;
    ctx.fillText('breaktheloopapp.in', 540, 1760);

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
          track: isExplorerMode ? 'explore' : 'quest',
          rarity: activeQuestRarity,
          xp_earned: activeQuestXp
        });

        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#EA580C", "#F97316", "#FACC15", "#78716C"],
        });

        setIsCompleted(true);

        // The match is over — tear down the persistent Duo/Squad channels
        // (same cleanup cancelSearch does when backing out early) so they
        // don't keep delivering reroll/roster updates after this point.
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

        // Safely check for data before setting state so the page does not crash
        if (data.new_streak !== undefined) setStreak(data.new_streak);
        if (data.new_saved_mins !== undefined) setSavedMins(data.new_saved_mins);
        if (data.badges !== undefined) setBadges(data.badges);
        if (data.new_total_xp !== undefined) setTotalXp(data.new_total_xp);

        if (data.new_total_xp !== undefined) {
          const newRankTitle = getRankTitle(data.new_total_xp);
          if (newRankTitle !== oldRankTitle) {
            showToast(`🎖️ Rank up! You're now a ${newRankTitle}.`, 'success');
          }
        }

        // The XP this mission paid out and the lifetime total are different
        // numbers, and the card labels them separately. Fall back to the
        // pre-completion total plus the reward if the RPC omits the total.
        const freshStreak = data.new_streak ?? streak;
        const freshTotalXp = data.new_total_xp ?? totalXp + activeQuestXp;
        const freshBadges: string[] = Array.isArray(data.badges) ? data.badges : badges;

        // Wrap card generation in try/catch and provide fallback 0 values
        try {
          generateShareCard(freshStreak || 0, activeQuestXp, freshTotalXp);
        } catch {
        }

        // Auto-surface the Recap at a genuine peak moment, after the completion
        // animation has had time to play rather than instantly on top of it.
        // The values are passed in: this closure captured the pre-completion
        // state, so reading them off the component would recap the run before
        // the one that just triggered it.
        if (justEarnedNewBadge || wasLegendary) {
          setTimeout(() => {
            generateSpotifyWrappedCard(freshStreak, freshTotalXp, freshBadges);
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
          title: 'Break The Loop 🔥',
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


  const rankTitle = getRankTitle(totalXp);
  const nextRank = getNextRankTier(totalXp);
  const rankProgress = getRankProgress(totalXp);
  const isOnQuestTrack = tab === 'quest' && !isExplorerMode;
  const isOnExploreTrack = tab === 'quest' && isExplorerMode;
  const hasActiveMission = Boolean(activeQuest) && !isCompleted;

  const navItems: { key: string; label: string; icon: string; active: boolean; onClick: () => void }[] = [
    { key: 'quest', label: 'Quest', icon: '🎲', active: isOnQuestTrack, onClick: goToQuestTrack },
    { key: 'explore', label: 'Explore', icon: '🗺️', active: isOnExploreTrack, onClick: goToExploreTrack },
    { key: 'feed', label: 'Feed', icon: '🔥', active: tab === 'feed', onClick: () => setTab('feed') },
  ];

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden bg-cream font-sans text-ink">
      {/* Printed-paper ground: halftone dots plus two warm light pools. Purely
          decorative, so it never traps a tap or reaches a screen reader. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 halftone opacity-[0.05]" />
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,165,36,0.38)_0%,rgba(245,165,36,0)_70%)]" />
        <div className="absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.26)_0%,rgba(234,88,12,0)_70%)]" />
      </div>

      {/* Toast Stack */}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-[min(22rem,92vw)] -translate-x-1/2 flex-col items-center gap-2 pt-[env(safe-area-inset-top)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full animate-pop rounded-2xl border-2 px-4 py-3 text-xs font-bold shadow-sticker ${
              t.type === 'error'
                ? 'border-ink bg-ink text-rose-wash'
                : t.type === 'success'
                ? 'border-ink bg-ink text-gold'
                : 'border-ink bg-white text-ink'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md flex-wrap items-center justify-between gap-y-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:max-w-5xl lg:px-8">
          <h1
            onMouseDown={handleDevPressStart}
            onMouseUp={handleDevPressEnd}
            onTouchStart={handleDevPressStart}
            onTouchEnd={handleDevPressEnd}
            className="cursor-pointer select-none whitespace-nowrap font-display text-lg font-bold leading-none tracking-tight active:scale-95 sm:text-xl"
            title={userEmail === ADMIN_EMAIL ? 'Hold for 2s for Developer Access' : 'Break The Loop'}
          >
            <span className="text-ink">BREAK THE </span>
            <span className="relative inline-block text-ember-deep">
              LOOP
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 h-[3px] -rotate-6 rounded bg-ember-deep"
              />
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-1.5">
            {userEmail === ADMIN_EMAIL && (
              <button onClick={fetchAdminReports} className={BTN_MINI} title="Admin Moderation Queue">
                🚩 Reports
              </button>
            )}

            {userEmail === ADMIN_EMAIL && (
              <button onClick={fetchPendingQuests} className={BTN_MINI} title="Pending Quest Suggestions">
                📝 Quests
              </button>
            )}

            {userEmail === ADMIN_EMAIL && (
              <button onClick={fetchPendingGems} className={`relative ${BTN_MINI}`} title="Manage Hidden Gems">
                🗺️ Gems
                {pendingGemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-rose px-1 font-display text-[10px] font-bold text-white">
                    {pendingGemCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={requestNotificationPermission}
              aria-label={notificationsEnabled ? 'Notifications are on' : 'Turn on notifications'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl sticker-sm press-sm text-sm ${
                notificationsEnabled ? 'bg-gold' : 'bg-white'
              }`}
              title={notificationsEnabled ? 'Notifications active' : 'Enable notifications'}
            >
              <span aria-hidden="true">{notificationsEnabled ? '🔔' : '🔕'}</span>
            </button>

            <span className="hidden items-center gap-1 rounded-full border-2 border-ink bg-gold-wash px-2.5 py-0.5 text-[11px] font-bold text-gold-ink sm:flex">
              <span aria-hidden="true">📍</span> Mumbai
            </span>
          </div>
        </div>
      </header>

      {/* Primary navigation. One element, two shapes: a thumb-reachable bar
          pinned to the bottom of the screen on phones, and an inline segmented
          control under the header from lg up. Rendering it once (rather than a
          mobile copy plus a desktop copy) keeps a single "Feed" control in the
          accessibility tree. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-cream/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:static lg:mx-auto lg:mt-6 lg:w-full lg:max-w-5xl lg:border-0 lg:bg-transparent lg:px-8 lg:pb-0 lg:pt-0 lg:backdrop-blur-none"
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-2xl lg:max-w-none lg:justify-start lg:gap-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2 font-display text-[13px] font-bold press-sm lg:max-w-[11rem] lg:flex-row lg:gap-2 lg:py-2.5 lg:text-sm ${
                item.active
                  ? item.key === 'explore'
                    ? 'sticker-sm bg-gold text-ink'
                    : 'sticker-sm bg-ember-deep text-white'
                  : 'sticker-sm bg-white text-ink'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* The board column takes the leftover width rather than being pinned to
          36rem and centred. Fixed columns plus lg:justify-center left the pair
          18px narrower than the container, so the board's left edge and the
          rail's right edge both sat inside the wordmark and nav above them —
          three left edges on one page that should agree and didn't. */}
      <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-4 px-4 pb-28 pt-4 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-7 lg:px-8 lg:pb-12 lg:pt-5">
        {tab === 'quest' ? (
          <section className="flex flex-col gap-4">
            {/* Track banner: says which of the two tracks you're on and what it
                does, so Explore isn't just "the other tab". */}
            <div
              className={`relative overflow-hidden rounded-3xl sticker ${
                isExplorerMode ? 'bg-gold-wash' : 'bg-ember-wash'
              }`}
            >
              <div aria-hidden="true" className="hazard h-2 opacity-70" />
              <div className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-white text-xl"
                >
                  {isExplorerMode ? '🗺️' : '🎲'}
                </span>
                <div className="min-w-0">
                  <p className="eyebrow text-muted">{isExplorerMode ? 'Explore track' : 'Quest track'}</p>
                  <p className="font-display text-[15px] font-bold leading-tight text-ink">
                    {isExplorerMode
                      ? 'Hidden gems, named by locals'
                      : 'Random real-world micro-missions'}
                  </p>
                </div>
              </div>
            </div>

            {/* Squad size. Deliberately lighter-weight than the track choice in
                the nav -- it refines that choice rather than competing with it.
                Hidden once a mission is live: switching it mid-mission silently
                discards the board. */}
            {!hasActiveMission && !isCompleted && (
              <div className="flex items-center gap-2">
                <span className="eyebrow shrink-0 text-muted">Squad</span>
                <div className="flex flex-1 items-center gap-1.5">
                  {(['solo', 'duo', 'squad'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSelectMode(m)}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold capitalize press-sm ${
                        mode === m ? 'sticker-sm bg-ink text-cream' : 'sticker-sm bg-white text-ink'
                      }`}
                    >
                      {m === 'squad' ? 'Squad (2-8)' : m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- Explore: neighborhood picker ---------------- */}
            {isExplorerMode && !activeQuest && !isCompleted && (
              <div className={`${CARD} animate-rise overflow-hidden`}>
                <div className="border-b-2 border-ink bg-gold px-5 py-3">
                  <p className="font-display text-base font-bold text-ink">Where are you right now?</p>
                  <p className="mt-0.5 text-xs font-semibold text-gold-ink">
                    Pick a neighborhood and we'll hand you a spot a local actually knows about.
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2">
                    {MUMBAI_NEIGHBORHOODS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedNeighborhood(n)}
                        disabled={isSearching}
                        aria-pressed={selectedNeighborhood === n}
                        className={`rounded-full px-3 py-2 text-xs font-bold press-sm disabled:opacity-40 ${
                          selectedNeighborhood === n
                            ? 'sticker-sm bg-gold text-ink'
                            : 'sticker-sm bg-white text-ink hover:bg-cream'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    <button
                      onClick={onStartMatchingClick}
                      disabled={!selectedNeighborhood || isSearching}
                      className={`w-full rounded-2xl px-4 py-4 font-display text-base font-bold press ${
                        !selectedNeighborhood
                          ? 'cursor-not-allowed border-2 border-dashed border-muted bg-cream-deep text-ink-soft'
                          : 'sticker bg-gold text-ink'
                      }`}
                    >
                      {isSearching ? (
                        <span className="flex items-center justify-center gap-2">
                          <span aria-hidden="true" className="animate-spin">
                            🌀
                          </span>
                          {squadRoster.length > 0
                            ? `LOBBY (${squadRoster.length}/${squadCapacity})`
                            : `SEARCHING ${selectedNeighborhood?.toUpperCase()}...`}
                        </span>
                      ) : !selectedNeighborhood ? (
                        'Pick a neighborhood first'
                      ) : (
                        '🗺️ Reveal a Hidden Gem'
                      )}
                    </button>

                    {!isSearching && (
                      <button
                        onClick={() => setShowSuggestGemModal(true)}
                        className="block w-full rounded-xl py-2 text-center text-xs font-bold text-ink-soft underline decoration-2 underline-offset-2 hover:text-ember-ink"
                      >
                        Know a spot? Suggest your own hidden gem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- Quest: the big red button ---------------- */}
            {!activeQuest && !isCompleted && !isExplorerMode && (
              <div className={`${CARD} animate-rise overflow-hidden`}>
                <div className="px-5 pb-6 pt-6 text-center sm:px-7">
                  <p className="eyebrow text-muted">No mission yet</p>
                  <h2 className="mx-auto mt-1 max-w-[18rem] font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                    Tap it. Go outside. Come back with proof.
                  </h2>

                  <div className="relative mx-auto mt-6 flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full border-2 border-dashed border-ink/25"
                    />
                    {!isSearching && (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute h-48 w-48 animate-halo rounded-full bg-ember/25 sm:h-56 sm:w-56"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute h-48 w-48 animate-halo rounded-full bg-gold/30 [animation-delay:1.3s] sm:h-56 sm:w-56"
                        />
                      </>
                    )}

                    <button
                      onClick={onStartMatchingClick}
                      disabled={isSearching}
                      className={`relative z-10 flex h-44 w-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-full border-[3px] border-ink bg-[radial-gradient(circle_at_30%_22%,#F97316_0%,#EA580C_34%,#9A3412_100%)] shadow-[0_7px_0_0_#1C1410] transition-transform duration-100 active:translate-y-[5px] active:shadow-[0_2px_0_0_#1C1410] sm:h-52 sm:w-52 ${
                        isSearching ? 'opacity-90' : 'hover:scale-[1.03]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-8 left-6 h-20 w-28 -rotate-[18deg] rounded-full bg-white/25"
                      />
                      {isSearching ? (
                        <>
                          <span aria-hidden="true" className="animate-spin text-3xl">
                            🌀
                          </span>
                          <span className="rounded-full bg-ink px-3 py-1 font-display text-[11px] font-bold tracking-wide text-cream">
                            {squadRoster.length > 0
                              ? `LOBBY (${squadRoster.length}/${squadCapacity})`
                              : 'SEARCHING...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-display text-[2rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_2px_rgba(28,20,16,0.45)] sm:text-[2.5rem]">
                            DESTROY
                          </span>
                          <span className="rounded-full bg-ink px-3 py-1 font-display text-xs font-bold tracking-wide text-cream line-through decoration-[2.5px]">
                            BOREDOM
                          </span>
                        </>
                      )}
                    </button>

                    {!isSearching && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 top-2 animate-wiggle rounded-xl border-2 border-ink bg-gold px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-ink shadow-sticker-xs sm:right-2"
                      >
                        Random · Real · Now
                      </span>
                    )}
                  </div>

                  <p className="mx-auto mt-5 max-w-[19rem] text-sm font-semibold text-ink-soft">
                    {isSearching
                      ? `Searching the live queue for Mumbai ${mode.toUpperCase()} partners...`
                      : mode === 'solo'
                      ? 'One tap hands you a random mission near you. 15 minutes, tops.'
                      : `You'll be matched with other ${mode.toUpperCase()} players in Mumbai.`}
                  </p>

                  {isSearching && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        onClick={handleWhatsAppInvite}
                        className="rounded-2xl sticker press bg-ember-deep px-4 py-2.5 text-xs font-bold text-white"
                      >
                        <span aria-hidden="true">📲 </span>Invite Friend via WhatsApp Now
                      </button>
                      <button
                        onClick={cancelSearch}
                        className="text-xs font-bold text-ink-soft underline decoration-2 underline-offset-2"
                      >
                        Cancel Search
                      </button>
                    </div>
                  )}
                </div>

                {/* Three-step explainer: the loop, stated once, for anyone who
                    dismissed the welcome screen and forgot what this is. */}
                <div className="grid grid-cols-3 divide-x-2 divide-ink border-t-2 border-ink bg-cream">
                  {[
                    { icon: '🎲', label: 'Get handed one' },
                    { icon: '🏃', label: 'Actually do it' },
                    { icon: '📸', label: 'Snap the proof' },
                  ].map((step) => (
                    <div key={step.label} className="px-2 py-3 text-center">
                      <div aria-hidden="true" className="text-lg">
                        {step.icon}
                      </div>
                      <p className="mt-0.5 text-[11px] font-bold leading-tight text-ink-soft">{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- Active mission workspace ---------------- */}
            {activeQuest && !isCompleted && (
              <div className={`${CARD} animate-rise p-4 sm:p-5`}>
                {/* justify-between here dropped the second chip to its own
                    line and shoved it back to the left as soon as the pair no
                    longer fit, which is every phone width. They just wrap. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={CHIP_EMBER}>
                    <span aria-hidden="true">🎯</span>
                    {isExplorerMode ? 'EXPLORER' : mode.toUpperCase()} MISSION ASSIGNED
                  </span>
                  <span className={CHIP_GOLD}>
                    <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-gold-deep" />
                    Live
                  </span>
                </div>

                {squadRoster.length > 0 && (
                  <div className={`mt-4 ${WELL} text-left`}>
                    <div className="flex items-center justify-between">
                      <span className="eyebrow text-muted">
                        <span aria-hidden="true">👑 </span>Squad roster ({squadRoster.length})
                      </span>
                      <span className="eyebrow text-gold-ink">Live lobby</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {squadRoster.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-full sticker-flat bg-white py-1 pl-1 pr-2.5"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-display text-[11px] font-bold uppercase text-cream"
                          >
                            {p.handle?.charAt(0) || '?'}
                          </span>
                          <button
                            onClick={() => inspectProfile(p.handle)}
                            className="text-xs font-bold text-ember-ink hover:underline"
                          >
                            @{p.handle}
                          </button>
                          {p.user_id !== currentUserId && (
                            <button
                              onClick={() => handleAddFriend(p.user_id)}
                              className="text-[11px] font-bold text-ink-soft hover:text-ember-ink"
                              title="Add as Friend"
                            >
                              +🤝
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="my-4 flex justify-center">
                  <SuspenseMissionCard
                    key={activeQuest}
                    quest={{
                      id: "active-quest",
                      quest_text: activeQuest,
                      mode: mode,
                      rarity: activeQuestRarity,
                      xp_reward: activeQuestXp
                    }}
                    credit={isExplorerMode ? hiddenGemSubmittedBy : activeQuestCredit}
                    gem={isExplorerMode ? activeGem : null}
                    onReroll={() => mode === 'solo' ? (isExplorerMode ? handleRevealGem() : pickRandomQuest()) : handleSharedReroll()}
                    onAcceptMission={() => {
                      setIsMissionAccepted(true);
                      // The upload box (and its file input) only mounts once
                      // isMissionAccepted flips, so defer the click until after
                      // that render commits.
                      setTimeout(() => {
                        const fileInput = document.querySelector("input[type='file']") as HTMLInputElement | null;
                        if (fileInput) {
                          fileInput.click();
                        }
                      }, 0);
                    }}
                  />
                </div>

                {(mode === 'duo' || mode === 'squad') && (
                  <div className={`${WELL} flex flex-col gap-2 text-left`}>
                    <div className="flex items-center justify-between border-b-2 border-ink/15 pb-2">
                      <span className="eyebrow text-ember-ink">
                        <span aria-hidden="true">💬 </span>Live {mode.toUpperCase()} rally chat
                      </span>
                      <button onClick={handleWhatsAppInvite} className={BTN_MINI}>
                        <span aria-hidden="true">📲 </span>Invite Friend
                      </button>
                    </div>

                    <div className="scroll-slim h-32 space-y-2 overflow-y-auto pr-1">
                      {messages.length === 0 ? (
                        <p className="py-4 text-center text-[11px] font-semibold text-muted">
                          No messages yet. Coordinate your squad rally point!
                        </p>
                      ) : (
                        messages.map((m) => (
                          <div
                            // Math.random() as a key gave every message a new
                            // identity on every render, so React tore down and
                            // rebuilt the whole list each time — losing any
                            // text selection in it. created_at is stable.
                            key={m.id || `${m.sender_handle}-${m.created_at}`}
                            className="flex items-start justify-between gap-2 rounded-xl sticker-flat bg-white px-2.5 py-2"
                          >
                            <p className="min-w-0 text-xs text-ink">
                              <button
                                onClick={() => inspectProfile(m.sender_handle)}
                                className="font-bold text-ember-ink hover:underline"
                              >
                                @{m.sender_handle}:
                              </button>{' '}
                              {m.message}
                            </p>
                            {m.sender_handle !== handle && (
                              <button
                                onClick={() => handleReport('chat', m.id || m.message)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] text-muted hover:bg-cream hover:text-rose-ink"
                                title="Report message"
                                aria-label="Report message"
                              >
                                <span aria-hidden="true">🚩</span>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Say something (max 300 chars)..."
                        maxLength={300}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        className="min-w-0 flex-1 rounded-xl sticker-flat bg-white px-3 py-2 text-xs font-medium text-ink placeholder:text-muted"
                      />
                      <button onClick={sendMessage} className={BTN_MINI_SOLID}>
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {isMissionAccepted && (
                  <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-3">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-1.5 py-5">
                        <span aria-hidden="true" className="animate-spin text-2xl">
                          ☁️
                        </span>
                        <span className="text-xs font-bold text-ember-ink">
                          Compressing &amp; Uploading (~50KB)...
                        </span>
                      </div>
                    ) : proofImage ? (
                      <img
                        src={proofImage}
                        alt="Proof"
                        className="h-40 w-full rounded-xl border-2 border-ink object-cover"
                      />
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-1.5 py-4">
                        <span aria-hidden="true" className="text-2xl">
                          📸
                        </span>
                        <span className="font-display text-sm font-bold text-ink">Add your photo proof</span>
                        <span className="text-[11px] font-semibold text-muted">
                          Opens your camera · stays on your device until you upload
                        </span>
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
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={handleCompleteMission}
                    disabled={uploading || !proofImage}
                    className={`w-full rounded-2xl px-4 py-4 font-display text-base font-bold press ${
                      proofImage && !uploading
                        ? 'sticker bg-ember-deep text-white'
                        : 'cursor-not-allowed border-2 border-dashed border-muted bg-cream-deep text-ink-soft'
                    }`}
                  >
                    {proofImage ? 'Complete & Log Proof 🔥' : 'Take Photo Proof to Complete'}
                  </button>
                  <button
                    onClick={handleAbandonMission}
                    className="mx-auto rounded-xl px-4 py-2.5 text-xs font-bold text-muted underline decoration-2 underline-offset-2 hover:bg-cream hover:text-ink"
                  >
                    Abandon Mission
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- Completion ---------------- */}
            {isCompleted && (
              <div className={`${CARD} animate-pop overflow-hidden text-center`}>
                <div className="border-b-2 border-ink bg-gold px-5 py-5">
                  <div aria-hidden="true" className="text-4xl">
                    🎉
                  </div>
                  <h2 className="mt-1 font-display text-3xl font-bold leading-none text-ink">LOOP BROKEN!</h2>
                  <p className="mt-2 text-xs font-bold text-gold-ink">
                    You broke routine and gained real-world experience today.
                  </p>
                  <span className="mt-3 inline-block rounded-full border-2 border-ink bg-ink px-3 py-1 font-display text-xs font-bold text-gold">
                    +{activeQuestXp} IRL XP BANKED
                  </span>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  {cardDataUrl && (
                    <>
                      <div className="overflow-hidden rounded-2xl sticker-flat bg-cream">
                        <img src={cardDataUrl} alt="Story Card" className="mx-auto h-64 w-full object-contain" />
                      </div>
                      <button onClick={() => handleShareCard(cardDataUrl)} className={BTN_PRIMARY}>
                        <span aria-hidden="true">📲 </span>Share to Instagram Story / WhatsApp
                      </button>
                    </>
                  )}

                  <button onClick={() => setIsCompleted(false)} className={BTN_QUIET}>
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          /* ---------------- Community feed ---------------- */
          <section className="flex flex-col gap-4">
            <div className={`${CARD} overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-ember-wash px-4 py-3">
                <div>
                  <p className="eyebrow text-muted">Community</p>
                  <h2 className="font-display text-base font-bold text-ink">Proof feed</h2>
                </div>
                <span className={CHIP_EMBER}>{feedItems.length} logged</span>
              </div>

              <div className="flex flex-col gap-4 p-4">
                {loadingFeed ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl sticker-flat bg-white p-3">
                      <div className="h-44 w-full rounded-xl bg-cream-deep" />
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-3 w-24 rounded bg-cream-deep" />
                          <div className="h-3 w-8 rounded bg-cream-deep" />
                        </div>
                        <div className="h-3 w-full rounded bg-cream-deep" />
                        <div className="h-3 w-2/3 rounded bg-cream-deep" />
                      </div>
                    </div>
                  ))
                ) : feedItems.length > 0 ? (
                  feedItems.map((item) => (
                    <article key={item.id} className="rounded-2xl sticker-sm bg-white p-3">
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt="Proof"
                          className="h-48 w-full rounded-xl border-2 border-ink object-cover"
                        />
                      )}
                      <div className="mt-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[11px] font-bold uppercase text-cream"
                            >
                              {(item.handle || 'E').charAt(0)}
                            </span>
                            <button
                              onClick={() => inspectProfile(item.handle)}
                              className="truncate text-xs font-bold text-ember-ink hover:underline"
                            >
                              @{item.handle || 'Explorer'}
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {userEmail === ADMIN_EMAIL && (
                              <button
                                onClick={() => handleAdminDeleteFeedPost(item.id)}
                                className={BTN_MINI_DANGER}
                                title="Admin: Delete post"
                              >
                                🗑️ Delete
                              </button>
                            )}
                            <button
                              onClick={() => handleReport('feed', item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-muted hover:bg-cream hover:text-rose-ink"
                              title="Report post"
                              aria-label="Report post"
                            >
                              <span aria-hidden="true">🚩</span>
                            </button>
                          </div>
                        </div>

                        <p className="font-display text-sm font-bold leading-snug text-ink">
                          “{item.quest_text}”
                        </p>

                        <div className="flex gap-2 border-t-2 border-ink/10 pt-2.5">
                          <button
                            onClick={() => handleReact(item.id, 'fire')}
                            className="flex items-center gap-1.5 rounded-xl sticker-sm press-sm bg-cream px-3 py-1.5 text-xs font-bold text-ink"
                          >
                            <span aria-hidden="true">🔥</span>
                            {item.fire_count || 0}
                          </button>
                          <button
                            onClick={() => handleReact(item.id, 'five')}
                            className="flex items-center gap-1.5 rounded-xl sticker-sm press-sm bg-cream px-3 py-1.5 text-xs font-bold text-ink"
                          >
                            <span aria-hidden="true">✋</span>
                            {item.five_count || 0}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <div aria-hidden="true" className="text-4xl">
                      📭
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold text-ink">No missions logged yet</h3>
                    <p className="mx-auto mt-1 max-w-[15rem] text-xs font-semibold text-muted">
                      Be the first to complete one and show up here.
                    </p>
                    <button
                      onClick={() => setTab('quest')}
                      className="mt-4 rounded-2xl sticker press bg-ember-deep px-5 py-2.5 text-xs font-bold text-white"
                    >
                      Start a mission
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Player panel ----------------
            Below the board on phones, a sticky rail from lg up. This is the
            old footer promoted into a real profile surface: identity, rank
            progress, stats, badges and every secondary action. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b-2 border-ink bg-cream px-4 py-3.5">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-ink font-display text-xl font-bold uppercase text-gold"
              >
                {handle.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                {isEditingHandle ? (
                  <input
                    type="text"
                    defaultValue={handle}
                    onBlur={(e) => saveHandle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveHandle(e.currentTarget.value)}
                    autoFocus
                    aria-label="Your handle"
                    className="w-full rounded-xl sticker-flat bg-white px-2 py-1 font-display text-sm font-bold text-ink"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingHandle(true)}
                    className="-mx-1 flex max-w-full items-center gap-1.5 rounded-xl px-1 py-1.5 text-left hover:bg-white"
                  >
                    <span className="truncate font-display text-base font-bold text-ink">@{handle}</span>
                    <span aria-hidden="true" className="text-[11px] text-muted">
                      ✏️
                    </span>
                  </button>
                )}
                <p className="eyebrow mt-0.5 truncate text-ember-ink">{rankTitle}</p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Rank meter: makes the XP number mean something by showing how
                  far it is to the next title. */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="eyebrow text-muted">Rank progress</span>
                  <span className="text-[11px] font-bold text-ink-soft">
                    {nextRank ? `${Math.max(0, nextRank.minXp - totalXp)} XP to ${nextRank.title}` : 'Top rank held'}
                  </span>
                </div>
                <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full sticker-flat bg-cream">
                  <div
                    className="h-full rounded-full bg-ember-deep"
                    style={{ width: `${rankProgress}%` }}
                    role="progressbar"
                    aria-valuenow={rankProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress to next rank"
                  />
                </div>
              </div>

              {/* The tile under this label used to print time_saved_mins — a
                  minutes count — while total_xp was what actually drove the
                  rank meter directly above it. The card contradicted itself:
                  "90 XP" sitting under "285 XP to Street Legend" at 415 XP.
                  IRL XP means total_xp; minutes get their own tile. */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl sticker-flat bg-cream px-2 py-2.5 text-center">
                  <p className="eyebrow text-muted">Streak</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-ink">{streak}d 🔥</p>
                </div>
                <div className="rounded-2xl sticker-flat bg-ember-wash px-2 py-2.5 text-center">
                  <p className="eyebrow text-muted">IRL XP</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-ember-ink">{totalXp} ⚡</p>
                </div>
                <div className="rounded-2xl sticker-flat bg-gold-wash px-2 py-2.5 text-center">
                  <p className="eyebrow text-muted">Offline</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-gold-ink">{savedMins}m 🌤️</p>
                </div>
              </div>

              <div>
                <span className="eyebrow text-muted">Badges</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {badges.map((b, i) => (
                    <span
                      key={i}
                      className="rounded-full border-2 border-ink bg-gold-wash px-2 py-0.5 text-[11px] font-bold text-gold-ink"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowFriendsModal(true)} className={BTN_MINI}>
                  🤝 Squad ({friendsList.length})
                </button>
                <button onClick={() => generateSpotifyWrappedCard()} className={BTN_MINI}>
                  🎧 Recap
                </button>
                <button
                  onClick={() => {
                    setSuggestQuestMode(mode);
                    setShowSuggestQuestModal(true);
                  }}
                  className={BTN_MINI}
                >
                  ✍️ Suggest Quest
                </button>
                {userEmail && userEmail !== 'guest@breaktheloop.app' ? (
                  <button onClick={handleSignOut} className={BTN_MINI}>
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalReason('');
                      setShowAuthModal(true);
                    }}
                    className={BTN_MINI}
                  >
                    Verify
                  </button>
                )}
              </div>

              {(!userEmail || userEmail === 'guest@breaktheloop.app') && (
                <div className="space-y-2 border-t-2 border-ink/10 pt-3">
                  <button
                    onClick={() => setShowSaveProgressModal(true)}
                    className="w-full rounded-2xl sticker-sm press-sm bg-gold-wash px-3 py-2.5 text-xs font-bold text-gold-ink"
                  >
                    💾 Save My Progress
                  </button>
                  <button
                    onClick={() => setShowRecoverModal(true)}
                    className="block w-full rounded-xl py-2 text-center text-[11px] font-bold text-muted underline decoration-2 underline-offset-2 hover:text-ink"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-center gap-3 pb-1">
            <Link
              href="/privacy"
              className="rounded-lg px-2 py-2 text-[11px] font-bold text-muted underline decoration-2 underline-offset-2 hover:text-ink"
            >
              Privacy
            </Link>
            <span aria-hidden="true" className="text-[11px] text-muted">
              ·
            </span>
            <Link
              href="/terms"
              className="rounded-lg px-2 py-2 text-[11px] font-bold text-muted underline decoration-2 underline-offset-2 hover:text-ink"
            >
              Terms
            </Link>
          </footer>
        </aside>
      </div>

      {/* Incoming Live Raid Invite Banner -- deliberately keeps its own dark
          card rather than joining the light theme: it interrupts whatever
          you're doing, so it should not look like part of the page. */}
      {incomingInvite && (
        <div className="fixed left-1/2 top-4 z-50 w-[min(22rem,92vw)] -translate-x-1/2 animate-bounce space-y-2 rounded-3xl border-2 border-gold bg-orange-950 p-4 text-center shadow-[6px_6px_0_0_#1C1410]">
          <div aria-hidden="true" className="text-2xl">
            ⚡
          </div>
          <h3 className="font-display text-sm font-bold text-cream">
            @{incomingInvite.sender_handle} challenged you to a Duo Raid!
          </h3>
          <p className="text-[11px] font-medium italic text-gold">"{incomingInvite.quest_text}"</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={declineDirectInvite}
              className="flex-1 rounded-xl border-2 border-ink bg-white px-3 py-2 text-xs font-bold text-ink"
            >
              Decline
            </button>
            <button
              onClick={acceptDirectInvite}
              className="flex-1 rounded-xl border-2 border-ink bg-gold px-3 py-2 text-xs font-bold text-ink"
            >
              Accept Raid 🔥
            </button>
          </div>
        </div>
      )}

      {/* Explorer Public Profile Modal */}
      {selectedProfile && (
        <Overlay label="Explorer profile" onClose={() => setSelectedProfile(null)} className="z-[60]">
          <div className={`${PANEL} my-auto space-y-4`}>
            <button onClick={() => setSelectedProfile(null)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>

            <div className="space-y-1 text-center">
              <span
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-ink font-display text-2xl font-bold uppercase text-gold"
              >
                {selectedProfile.handle?.charAt(0) || '?'}
              </span>
              <h2 className="pt-1 font-display text-lg font-bold text-ink">@{selectedProfile.handle}</h2>
              <p className="eyebrow text-ember-ink">{getRankTitle(selectedProfile.total_xp || 0)}</p>
              <p className="text-[11px] font-semibold text-muted">Active Mumbai loop destroyer</p>
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
                className="w-full rounded-xl sticker-sm press-sm bg-rose-wash px-3 py-2 text-[11px] font-bold text-rose-ink"
              >
                🚫 Block this Explorer
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl sticker-flat bg-cream px-3 py-2.5 text-center">
                <p className="eyebrow text-muted">Streak</p>
                <p className="mt-0.5 font-display text-base font-bold text-ink">{selectedProfile.streak} Days 🔥</p>
              </div>
              {/* Same fix as the player panel: the rank title rendered above
                  reads total_xp, so the XP stat has to read it too. */}
              <div className="rounded-2xl sticker-flat bg-ember-wash px-3 py-2.5 text-center">
                <p className="eyebrow text-muted">IRL XP</p>
                <p className="mt-0.5 font-display text-base font-bold text-ember-ink">
                  {selectedProfile.total_xp ?? 0} ⚡
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="eyebrow text-muted">Unlocked badges</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.badges?.map((b, i) => (
                  <span
                    key={i}
                    className="rounded-full border-2 border-ink bg-gold-wash px-2 py-0.5 text-[11px] font-bold text-gold-ink"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="eyebrow text-muted">Recent missions conquered</span>
              <div className="scroll-slim max-h-40 space-y-2 overflow-y-auto pr-1">
                {selectedProfile.history && selectedProfile.history.length > 0 ? (
                  selectedProfile.history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 rounded-xl sticker-flat bg-cream p-2">
                      {h.photo_url && (
                        <img
                          src={h.photo_url}
                          alt="Proof"
                          className="h-11 w-11 shrink-0 rounded-lg border-2 border-ink object-cover"
                        />
                      )}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[11px] font-semibold text-ink">"{h.quest_text}"</p>
                        <span className="eyebrow text-ember-ink">{h.mode} mission</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-center text-[11px] font-semibold text-muted">
                    No public missions logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Admin Moderation Queue Modal */}
      {showReportsModal && userEmail === ADMIN_EMAIL && (
        <Overlay label="Moderation queue" onClose={() => setShowReportsModal(false)}>
          <div className={`${PANEL_WIDE} my-auto space-y-4`}>
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
              <h2 className="eyebrow text-ink">🛡️ Moderation Reports Queue ({adminReports.length})</h2>
              <button onClick={() => setShowReportsModal(false)} className={BTN_MINI} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="scroll-slim max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {adminReports.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-muted">Queue clear! Zero reported content.</p>
              ) : (
                adminReports.map((r) => (
                  <div key={r.id} className="space-y-2 rounded-2xl sticker-flat bg-cream p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className={CHIP_EMBER}>Flagged {r.reported_type.toUpperCase()}</span>
                      <span className="font-mono text-[10px] font-bold text-muted">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      <strong>Reason:</strong> "{r.reason}"
                    </p>
                    {r.content_text && (
                      <p className="rounded-lg sticker-flat bg-white p-2 text-[11px] text-ink">
                        <strong className="text-ember-ink">Reported content:</strong> "{r.content_text}"
                      </p>
                    )}
                    {r.content_photo_url && (
                      <img
                        src={r.content_photo_url}
                        alt="Reported proof photo"
                        className="max-h-40 w-full rounded-lg border-2 border-ink object-cover"
                      />
                    )}
                    <p className="text-[11px] font-semibold text-muted">
                      Reported by @{r.reporter_handle}
                      {r.offender_handle ? ` • Posted by @${r.offender_handle}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 border-t-2 border-ink/10 pt-2">
                      {r.reported_type === 'feed' && (
                        <button
                          onClick={() => {
                            handleAdminDeleteFeedPost(r.target_id);
                            handleResolveReport(r.id);
                          }}
                          className={BTN_MINI_DANGER}
                        >
                          Delete Post
                        </button>
                      )}
                      {r.reported_type === 'chat' && (
                        <button
                          onClick={() => {
                            handleAdminDeleteChatMessage(r.target_id);
                            handleResolveReport(r.id);
                          }}
                          className={BTN_MINI_DANGER}
                        >
                          Delete Message
                        </button>
                      )}
                      {r.offender_user_id && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`ADMIN: Permanently ban @${r.offender_handle || 'this user'}? They will be unable to start or join any match.`)) return;
                            const { data, error } = await supabase.rpc('admin_ban_user', { p_user_id: r.offender_user_id });
                            if (!error && data && data.success) {
                              showToast(`@${r.offender_handle || 'User'} has been banned.`, 'success');
                            } else {
                              showToast('Failed to ban user.', 'error');
                            }
                          }}
                          className="rounded-xl border-2 border-ink bg-ink px-2.5 py-1.5 text-[11px] font-bold text-rose-wash press-sm"
                        >
                          Ban User
                        </button>
                      )}
                      <button onClick={() => handleResolveReport(r.id)} className={BTN_MINI}>
                        Dismiss Flag
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* Admin Pending Quest Suggestions Modal */}
      {showPendingQuestsModal && userEmail === ADMIN_EMAIL && (
        <Overlay label="Pending quest suggestions" onClose={() => setShowPendingQuestsModal(false)}>
          <div className={`${PANEL_WIDE} my-auto space-y-4`}>
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
              <h2 className="eyebrow text-ink">📝 Pending Quest Suggestions ({pendingQuests.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchPendingQuests} className={BTN_MINI} title="Refresh" aria-label="Refresh">
                  🔄
                </button>
                <button onClick={() => setShowPendingQuestsModal(false)} className={BTN_MINI} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="scroll-slim max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {loadingPendingQuests ? (
                <p className="py-8 text-center text-xs font-bold text-muted">Loading...</p>
              ) : pendingQuests.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-muted">No quests awaiting review.</p>
              ) : (
                pendingQuests.map((q) => (
                  <div key={q.id} className="space-y-2 rounded-2xl sticker-flat bg-cream p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className={CHIP_EMBER}>{q.mode.toUpperCase()}</span>
                      <span className="font-mono text-[10px] font-bold text-muted">
                        {new Date(q.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink">"{q.quest_text}"</p>
                    <p className="text-[11px] font-semibold text-muted">Suggested by @{q.submitted_by_handle}</p>
                    <div className="flex gap-2 border-t-2 border-ink/10 pt-2">
                      <button onClick={() => handleApproveQuest(q.id)} className={BTN_MINI_SOLID}>
                        Approve
                      </button>
                      <button onClick={() => handleRejectQuest(q.id)} className={BTN_MINI}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showPendingGemsModal && userEmail === ADMIN_EMAIL && (
        <Overlay label="Manage hidden gems" onClose={() => setShowPendingGemsModal(false)}>
          <div className={`${PANEL_WIDE} my-auto space-y-4`}>
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
              <h2 className="eyebrow text-ink">🗺️ Manage Hidden Gems ({pendingGems.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchPendingGems} className={BTN_MINI} title="Refresh" aria-label="Refresh">
                  🔄
                </button>
                <button onClick={() => setShowPendingGemsModal(false)} className={BTN_MINI} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="scroll-slim max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {loadingPendingGems ? (
                <p className="py-8 text-center text-xs font-bold text-muted">Loading...</p>
              ) : pendingGems.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-muted">No spots awaiting review.</p>
              ) : (
                pendingGems.map((g) => (
                  <div key={g.id} className="space-y-2 rounded-2xl sticker-flat bg-cream p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={g.neighborhood}
                          onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, neighborhood: e.target.value } : item)); }}
                          aria-label="Neighborhood"
                          className="rounded-lg border-2 border-ink bg-white px-2 py-1 text-[11px] font-bold text-ink"
                        >
                          {MUMBAI_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span
                          className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${
                            g.status === 'pending' ? 'bg-white text-ink' : 'bg-ember-wash text-ember-ink'
                          }`}
                        >
                          {g.status === 'pending' ? 'Pending' : 'Live'}
                        </span>
                        {dirtyGemIds.includes(g.id) && (
                          <span className="rounded-full border-2 border-ink bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                            Unsaved
                          </span>
                        )}
                        {savedGemIds.includes(g.id) && !dirtyGemIds.includes(g.id) && (
                          <span className="rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                            ✓ Saved
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-muted">
                        {new Date(g.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, name: e.target.value } : item)); }}
                      maxLength={100}
                      aria-label="Place name"
                      className="w-full rounded-lg border-2 border-ink bg-white px-2.5 py-2 text-[11px] font-bold text-ink"
                    />
                    <textarea
                      value={g.description}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, description: e.target.value } : item)); }}
                      maxLength={300}
                      rows={3}
                      aria-label="Description"
                      className="w-full resize-none rounded-lg border-2 border-ink bg-white px-2.5 py-2 text-[11px] text-ink"
                    />
                    <p className="text-[11px] font-semibold text-muted">Suggested by @{g.submitted_by_handle}</p>
                    <div className="flex gap-2 border-t-2 border-ink/10 pt-2">
                      {g.status === 'pending' ? (
                        <>
                          <button onClick={() => handleApproveGem(g)} className={BTN_MINI_SOLID}>
                            Approve
                          </button>
                          <button onClick={() => handleRejectGem(g.id)} className={BTN_MINI}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateGem(g)}
                            disabled={!dirtyGemIds.includes(g.id)}
                            className={
                              dirtyGemIds.includes(g.id)
                                ? 'rounded-xl sticker-sm press-sm bg-gold px-2.5 py-1.5 text-[11px] font-bold text-ink'
                                : 'cursor-not-allowed rounded-xl border-2 border-dashed border-muted bg-cream-deep px-2.5 py-1.5 text-[11px] font-bold text-ink-soft'
                            }
                          >
                            {dirtyGemIds.includes(g.id) ? 'Save Changes' : 'No Changes'}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Permanently remove "${g.name}" from Explorer mode?`)) {
                                handleRejectGem(g.id);
                              }
                            }}
                            className={BTN_MINI}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* Developer Access Modal */}
      {showDevModal && userEmail === ADMIN_EMAIL && (
        <Overlay label="Developer access" onClose={() => setShowDevModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-left`}>
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
              <h2 className="eyebrow text-ink">🛠️ Developer Tools</h2>
              <button onClick={() => setShowDevModal(false)} className={BTN_MINI} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="space-y-1 rounded-2xl sticker-flat bg-cream p-3 font-mono text-[11px] font-medium text-ink-soft">
              <p className="break-all"><strong>Auth UID:</strong> {currentUserId || 'None'}</p>
              <p className="break-all"><strong>Session:</strong> {userEmail}</p>
              <p className="break-all"><strong>Room:</strong> {roomId || 'None'}</p>
              <p className="break-all"><strong>Queue Ref:</strong> {myQueueEntryIdRef.current || 'None'}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  if (myQueueEntryIdRef.current && currentUserId) {
                    await supabase.rpc('leave_match_queue', {
                      p_queue_id: myQueueEntryIdRef.current,
                      p_user_id: currentUserId,
                      p_is_creator: isQueueCreator
                    });
                    showToast('Queue locks released.', 'success');
                  }
                }}
                className={BTN_QUIET}
              >
                Force Clear Queue Locks
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="w-full rounded-2xl sticker press bg-rose px-4 py-3 text-sm font-bold text-white"
              >
                Hard Reset Local Storage &amp; Reload
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Handle Setup Modal */}
      {showHandleModal && (
        <Overlay label="Choose your explorer tag">
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <div aria-hidden="true" className="text-3xl">🏷️</div>
            <h2 className="font-display text-xl font-bold text-ink">CHOOSE YOUR EXPLORER TAG</h2>
            <p className="text-xs font-semibold text-ink-soft">
              Pick a unique handle so other Mumbai explorers can recognize and add you to their squad!
            </p>
            <div className="relative">
              <span aria-hidden="true" className="absolute left-4 top-3 font-display text-sm font-bold text-ember-ink">
                @
              </span>
              <input
                type="text"
                placeholder="ExplorerTag"
                value={newHandleInput}
                onChange={(e) => setNewHandleInput(e.target.value)}
                maxLength={20}
                aria-label="Your handle"
                className={`${INPUT} pl-8 text-center`}
              />
            </div>
            <button onClick={() => saveHandleDirect(newHandleInput || handle)} className={BTN_PRIMARY}>
              Claim Tag &amp; Start
            </button>
          </div>
        </Overlay>
      )}

      {/* Auth Modal */}
      {(!isLoggedIn || showAuthModal) && !showHandleModal && (
        <Overlay label="Verify your email" onClose={isLoggedIn ? () => setShowAuthModal(false) : undefined}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            {isLoggedIn && (
              <button onClick={() => setShowAuthModal(false)} className={CLOSE_BTN} aria-label="Close">
                ✕
              </button>
            )}
            <div aria-hidden="true" className="text-4xl">✉️</div>
            <h2 className="font-display text-xl font-bold text-ink">
              {showAuthModal ? 'EMAIL VERIFICATION' : 'JOIN BREAK THE LOOP'}
            </h2>
            <p className="text-xs font-semibold text-ink-soft">
              {authModalReason || 'Enter your email to match with squad partners or continue as a guest for solo missions.'}
            </p>

            {authError && (
              <p className="rounded-xl sticker-flat bg-rose-wash p-2 text-xs font-bold text-rose-ink">{authError}</p>
            )}

            {!isOtpSent ? (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  aria-label="Email address"
                  className={`${INPUT} text-center`}
                />
                <button onClick={handleSendEmailOtp} className={BTN_PRIMARY}>
                  Send 6-Digit Code
                </button>

                <div className="relative py-1">
                  <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <div className="h-0.5 w-full bg-ink/15" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="eyebrow bg-white px-2 text-muted">Or</span>
                  </div>
                </div>

                <button onClick={handleGuestLogin} className={BTN_QUIET}>
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
                  aria-label="6-digit code"
                  className={`${INPUT} text-center font-mono tracking-[0.3em]`}
                />
                <button onClick={handleVerifyEmailOtp} className={BTN_PRIMARY}>
                  Verify &amp; Continue
                </button>
                <button
                  onClick={() => setIsOtpSent(false)}
                  className="mx-auto block pt-1 text-xs font-bold text-muted underline decoration-2 underline-offset-2"
                >
                  Change Email
                </button>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* Save My Progress Modal */}
      {showSaveProgressModal && (
        <Overlay label="Save your progress" onClose={() => setShowSaveProgressModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <button onClick={() => setShowSaveProgressModal(false)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>
            <div aria-hidden="true" className="text-3xl">💾</div>
            <h2 className="font-display text-xl font-bold text-ink">SAVE MY PROGRESS</h2>
            <p className="text-xs font-semibold text-ink-soft">
              Link an email so your streak, XP, and badges are safe if you switch devices or clear your browser. Fully optional — your progress keeps working without it.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={saveProgressEmail}
                onChange={(e) => setSaveProgressEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProgress(saveProgressEmail.trim())}
                aria-label="Email address"
                className={`${INPUT} text-center`}
              />
              <button onClick={() => handleSaveProgress(saveProgressEmail.trim())} className={BTN_PRIMARY}>
                Send Confirmation Link
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Suggest a Quest Modal */}
      {showSuggestQuestModal && (
        <Overlay label="Suggest a quest" onClose={() => setShowSuggestQuestModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <button onClick={() => setShowSuggestQuestModal(false)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>
            <div aria-hidden="true" className="text-3xl">✍️</div>
            <h2 className="font-display text-xl font-bold text-ink">SUGGEST A QUEST</h2>
            <p className="text-xs font-semibold text-ink-soft">
              Got a great real-world mission idea? Submit it for review — approved quests go live for everyone.
            </p>
            <div className="space-y-3">
              <div className="flex gap-1.5">
                {(['solo', 'duo', 'squad'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSuggestQuestMode(m)}
                    className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold capitalize press-sm ${
                      suggestQuestMode === m ? 'sticker-sm bg-ink text-cream' : 'sticker-sm bg-white text-ink'
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
                aria-label="Mission description"
                className={`${INPUT} resize-none text-left`}
              />
              <button onClick={handleSubmitQuestSuggestion} className={BTN_PRIMARY}>
                Submit for Review
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {showSuggestGemModal && (
        <Overlay label="Suggest a hidden gem" onClose={() => setShowSuggestGemModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <button onClick={() => setShowSuggestGemModal(false)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>
            <div aria-hidden="true" className="text-3xl">🗺️</div>
            <h2 className="font-display text-xl font-bold text-ink">SUGGEST A HIDDEN GEM</h2>
            <p className="text-xs font-semibold text-ink-soft">
              A real place only you and a few people actually know about — a shop, a stall, a spot with no reviews anywhere. Approved spots go live for everyone to discover.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Place name"
                value={suggestGemName}
                onChange={(e) => setSuggestGemName(e.target.value)}
                maxLength={100}
                aria-label="Place name"
                className={INPUT}
              />
              <div className="flex flex-wrap justify-center gap-1.5">
                {MUMBAI_NEIGHBORHOODS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSuggestGemNeighborhood(n)}
                    aria-pressed={suggestGemNeighborhood === n}
                    className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold press-sm ${
                      suggestGemNeighborhood === n
                        ? 'sticker-sm bg-gold text-ink'
                        : 'sticker-sm bg-white text-ink'
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
                aria-label="Why it is special"
                className={`${INPUT} resize-none text-left`}
              />
              <button onClick={handleSubmitGemSuggestion} className={BTN_GOLD}>
                Submit for Review
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* First-visit Welcome */}
      {showWelcomeModal && (
        <Overlay label="Welcome to Break The Loop" onClose={dismissWelcomeModal}>
          <div className="relative my-auto w-full max-w-sm overflow-hidden rounded-3xl sticker bg-white text-center">
            <div className="border-b-2 border-ink bg-gold px-5 py-5">
              <div aria-hidden="true" className="text-4xl">👋</div>
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-ink">
                Welcome to Break The Loop
              </h2>
            </div>
            <div className="space-y-4 px-5 pb-5">
              <p className="text-sm font-semibold leading-relaxed text-ink-soft">
                Tap the big button. Get handed a real, random micro-mission near you.
                Do it, snap a photo, earn XP. That's the whole game.
              </p>
              <p className="text-xs font-semibold text-muted">
                Bring friends into it later — for now, let's get your first one done.
              </p>
              <button onClick={dismissWelcomeModal} className={BTN_PRIMARY}>
                I'm in →
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Sign In / Recover Account Modal */}
      {showRecoverModal && (
        <Overlay label="Sign in to an existing account" onClose={() => setShowRecoverModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <button onClick={() => setShowRecoverModal(false)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>
            <div aria-hidden="true" className="text-3xl">🔑</div>
            <h2 className="font-display text-xl font-bold text-ink">SIGN IN ON THIS DEVICE</h2>
            {!isRecoverOtpSent ? (
              <>
                <p className="text-xs font-semibold text-ink-soft">
                  Enter the email you previously saved your progress with, and we'll send you a 6-digit code.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRecoverAccount(recoverEmail.trim())}
                    aria-label="Email address"
                    className={`${INPUT} text-center`}
                  />
                  <button onClick={() => handleRecoverAccount(recoverEmail.trim())} className={BTN_QUIET}>
                    Send Sign-In Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-ink-soft">
                  Enter the 6-digit code we emailed to {recoverEmail}.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit Email Code"
                    value={recoverOtpInput}
                    onChange={(e) => setRecoverOtpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyRecoverOtp()}
                    aria-label="6-digit code"
                    className={`${INPUT} text-center font-mono tracking-[0.3em]`}
                  />
                  <button onClick={handleVerifyRecoverOtp} className={BTN_PRIMARY}>
                    Verify &amp; Sign In
                  </button>
                  <button
                    onClick={() => setIsRecoverOtpSent(false)}
                    className="mx-auto block pt-1 text-xs font-bold text-muted underline decoration-2 underline-offset-2"
                  >
                    Change Email
                  </button>
                </div>
              </>
            )}
          </div>
        </Overlay>
      )}

      {/* Safety Modal */}
      {showSafetyModal && (
        <Overlay label="Safety guidelines" onClose={() => setShowSafetyModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <div aria-hidden="true" className="text-3xl">🛡️</div>
            <h2 className="font-display text-xl font-bold text-ink">SAFETY FIRST</h2>
            <div className="space-y-2 rounded-2xl sticker-flat bg-cream p-3 text-left text-xs text-ink-soft">
              <p>• <strong className="text-ink">Meet in Public:</strong> Coordinate only at visible, public landmarks.</p>
              <p>• <strong className="text-ink">Trust Your Instincts:</strong> Leave or cancel the mission immediately if you feel uncomfortable.</p>
              <p>• <strong className="text-ink">Never Share Private Data:</strong> Do not disclose banking, OTPs, or exact home addresses.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSafetyModal(false)} className={BTN_QUIET}>
                Cancel
              </button>
              <button
                onClick={() => isExplorerMode ? handleExploreMatchmaking() : executeMatchmaking()}
                className={BTN_PRIMARY}
              >
                I Agree &amp; Search
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Friends List Modal */}
      {showFriendsModal && (
        <Overlay label="Raid squad" onClose={() => setShowFriendsModal(false)}>
          <div className={`${PANEL} my-auto space-y-4`}>
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
              <h2 className="font-display text-sm font-bold text-ink">🤝 Raid Squad ({friendsList.length})</h2>
              <button onClick={() => setShowFriendsModal(false)} className={BTN_MINI} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="flex gap-1.5">
              {(['squad', 'leaderboard'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeaderboardTab(t)}
                  className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold press-sm ${
                    leaderboardTab === t ? 'sticker-sm bg-ink text-cream' : 'sticker-sm bg-white text-ink'
                  }`}
                >
                  {t === 'squad' ? 'Squad' : 'Leaderboard'}
                </button>
              ))}
            </div>

            {leaderboardTab === 'leaderboard' ? (
              <div className="scroll-slim max-h-60 space-y-2 overflow-y-auto pr-1">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.handle}
                    className={`flex items-center justify-between gap-2 rounded-xl border-2 p-2.5 text-xs ${
                      entry.is_self
                        ? 'border-orange-500/40 bg-ember-wash shadow-sticker'
                        : 'border-ink bg-white shadow-sticker-xs'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-muted">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <button
                          onClick={() => inspectProfile(entry.handle)}
                          className="block max-w-full truncate font-bold text-ember-ink hover:underline"
                        >
                          @{entry.handle}
                        </button>
                        <span className="eyebrow block text-muted">{getRankTitle(entry.total_xp)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold text-ink">{entry.total_xp} XP</p>
                      <p className="text-[10px] font-bold text-muted">{entry.streak} Days 🔥</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="scroll-slim max-h-60 space-y-2 overflow-y-auto pr-1">
              {friendsList.length === 0 ? (
                <div className="py-8 text-center">
                  <div aria-hidden="true" className="text-3xl">🤝</div>
                  <p className="mx-auto mt-2 max-w-[15rem] text-xs font-semibold text-muted">
                    No squad friends added yet. Complete a Duo/Squad mission and tap "+ Add Friend"!
                  </p>
                </div>
              ) : (
                friendsList.map((f, i) => {
                  const isOnline = onlineUserIds.has(f.friend_user_id);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xl sticker-flat bg-cream p-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 shrink-0 rounded-full border border-ink ${
                              isOnline ? 'bg-gold' : 'bg-white'
                            }`}
                          />
                          <button
                            onClick={() => inspectProfile(f.handle)}
                            className="truncate font-bold text-ember-ink hover:underline"
                          >
                            @{f.handle}
                          </button>
                        </div>
                        <span className="block pl-4 text-[10px] font-bold text-muted">
                          {isOnline ? 'Online in App' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button onClick={() => inspectProfile(f.handle)} className={BTN_MINI}>
                          Profile
                        </button>
                        <button
                          onClick={() => sendDirectRaidInvite(f)}
                          disabled={!isOnline || sendingInviteTo === f.handle}
                          className={
                            isOnline
                              ? BTN_MINI_SOLID
                              : 'cursor-not-allowed rounded-xl border-2 border-dashed border-muted bg-cream-deep px-2.5 py-1.5 text-[11px] font-bold text-ink-soft'
                          }
                        >
                          <span aria-hidden="true">⚡ </span>
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
        </Overlay>
      )}

      {/* Journey Recap Modal */}
      {showWrappedModal && (
        <Overlay label="Your IRL recap" onClose={() => setShowWrappedModal(false)}>
          <div className={`${PANEL} my-auto space-y-4 text-center`}>
            <button onClick={() => setShowWrappedModal(false)} className={CLOSE_BTN} aria-label="Close">
              ✕
            </button>
            <h2 className="eyebrow pt-1 text-ember-ink">🎧 Your IRL Recap</h2>
            {wrappedCardDataUrl && (
              <div className="overflow-hidden rounded-2xl sticker-flat bg-cream">
                <img src={wrappedCardDataUrl} alt="Recap" className="mx-auto h-80 w-full object-contain" />
              </div>
            )}
            <button onClick={() => handleShareCard(wrappedCardDataUrl)} className={BTN_PRIMARY}>
              <span aria-hidden="true">📲 </span>Share Recap to Story / WhatsApp
            </button>
          </div>
        </Overlay>
      )}
    </main>
  );
}
