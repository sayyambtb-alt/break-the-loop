"use client";

import React, { useState, useEffect, useRef } from 'react';
import SuspenseMissionCard, { GemDetails } from "./components/SuspenseMissionCard";
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

      if (joinResult.queue_id) {
        myQueueEntryIdRef.current = joinResult.queue_id;
      }

      if (joinResult.matched) {
        setActiveQuest(joinResult.quest_text);
        setActiveQuestRarity(joinResult.rarity);
        setActiveQuestXp(joinResult.xp_reward);
        setActiveQuestCredit(null);
        setIsMissionAccepted(false);
        setIsSearching(false);
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
    setIsExplorerMode(false);
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
    setHiddenGemSubmittedBy(null);
    setActiveGem(null);
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

  const handleAbandonMission = async () => {
    if (window.confirm("Are you sure you want to leave this mission? (Your streak won't be penalized)")) {
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

  const compressImage = (file: File, maxWidth = 800, quality = 0.6): Promise<Blob> => {
    return new Promise((resolve, reject) => {
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

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
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
    ctx.fillText(`MODE: ${(isExplorerMode ? 'explorer' : mode).toUpperCase()} MISSION BROKEN 🔥`, 540, 475);

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
    ctx.fillText('IRL XP GAINED', 760, statsY);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${newStreak} Days 🔥`, 320, statsY + 80);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`+${newSavedMins} XP ⚡`, 760, statsY + 80);

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
    ctx.fillText('YOUR IRL RECAP 🎧', 540, 260);

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
    ctx.fillText('Real-world energy reclaimed from screen addiction...', 540, 520);

    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 90px sans-serif';
    ctx.fillText(`${savedMins} XP`, 540, 680);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`⚡ Real-World Energy Score`, 540, 740);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 80px sans-serif';
    ctx.fillText(`${streak} DAYS STREAK`, 540, 900);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 32px sans-serif';
    ctx.fillText('🔥 Active Loop Destroyer', 540, 960);

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
    ctx.fillText('🤝 Connected in Mumbai Squad', 540, 1400);

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
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"],
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

        // Wrap card generation in try/catch and provide fallback 0 values
        try {
          generateShareCard(data.new_streak || 0, data.new_saved_mins || 0);
        } catch {
        }

        // Auto-surface the Recap at a genuine peak moment, after the completion
        // animation has had time to play rather than instantly on top of it.
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 font-sans select-none">
      {/* Toast Stack */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-11/12 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md border transition-all ${
              t.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                : t.type === 'success'
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-200'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <header className="w-full max-w-md flex flex-wrap justify-between items-center gap-y-2 py-4 border-b border-slate-800">
        <h1
          onMouseDown={handleDevPressStart}
          onMouseUp={handleDevPressEnd}
          onTouchStart={handleDevPressStart}
          onTouchEnd={handleDevPressEnd}
          className="text-lg sm:text-xl font-bold tracking-tight font-['Space_Grotesk'] bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent drop-shadow-sm cursor-pointer select-none active:scale-95 transition-transform whitespace-nowrap"
          title={userEmail === ADMIN_EMAIL ? "Hold for 2s for Developer Access" : "Break The Loop"}
        >
          BREAK THE LOOP
        </h1>
        <div className="flex items-center flex-wrap gap-2">
          {userEmail === ADMIN_EMAIL && (
            <button
              onClick={fetchAdminReports}
              className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-xl text-xs font-bold transition-all hover:bg-amber-500/20"
              title="Admin Moderation Queue"
            >
              🚩 Reports
            </button>
          )}

          {userEmail === ADMIN_EMAIL && (
            <button
              onClick={fetchPendingQuests}
              className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-xl text-xs font-bold transition-all hover:bg-amber-500/20"
              title="Pending Quest Suggestions"
            >
              📝 Quests
            </button>
          )}

          {userEmail === ADMIN_EMAIL && (
            <button
              onClick={fetchPendingGems}
              className="relative bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-xl text-xs font-bold transition-all hover:bg-amber-500/20"
              title="Manage Hidden Gems"
            >
              🗺️ Gems
              {pendingGemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {pendingGemCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={requestNotificationPermission}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              notificationsEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
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

      {/* Incoming Live Raid Invite Banner */}
      {incomingInvite && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-rose-950 border-2 border-rose-500 p-4 rounded-3xl z-50 shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-bounce text-center space-y-2">
          <div className="text-2xl">⚡</div>
          <h3 className="font-extrabold text-sm text-slate-100">
            @{incomingInvite.sender_handle} challenged you to a Duo Raid!
          </h3>
          <p className="text-[11px] text-rose-200 italic">
            "{incomingInvite.quest_text}"
          </p>
          <div className="flex space-x-2 pt-2">
            <button
              onClick={declineDirectInvite}
              className="flex-1 bg-slate-900 text-slate-300 py-2 rounded-xl text-xs font-bold"
            >
              Decline
            </button>
            <button
              onClick={acceptDirectInvite}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/40"
            >
              Accept Raid 🔥
            </button>
          </div>
        </div>
      )}

      {/* Explorer Public Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <div className="text-3xl">👤</div>
              <h2 className="text-base font-extrabold text-rose-400">
                @{selectedProfile.handle}{' '}
                <span className="text-slate-500 font-medium">· {getRankTitle(selectedProfile.total_xp || 0)}</span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Explorer • Active Mumbai Loop Destroyer
              </p>
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
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-[10px] font-bold py-2 rounded-lg border border-slate-800 transition-all"
              >
                🚫 Block this Explorer
              </button>
            )}

            <div className="flex justify-around bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">STREAK</p>
                <p className="text-sm font-black text-slate-200">{selectedProfile.streak} Days 🔥</p>
              </div>
              <div className="w-px bg-slate-800" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">IRL XP</p>
                <p className="text-sm font-black text-rose-400">{selectedProfile.time_saved_mins} ⚡</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Unlocked Badges</span>
              <div className="flex flex-wrap gap-1">
                {selectedProfile.badges?.map((b, i) => (
                  <span key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Missions Conquered</span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {selectedProfile.history && selectedProfile.history.length > 0 ? (
                  selectedProfile.history.map((h) => (
                    <div key={h.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex space-x-2 items-center">
                      {h.photo_url && (
                        <img src={h.photo_url} alt="Proof" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="text-left overflow-hidden">
                        <p className="text-[10px] text-slate-300 truncate font-medium">"{h.quest_text}"</p>
                        <span className="text-[9px] text-rose-400/80 uppercase font-mono font-bold">{h.mode} Mission</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-600 text-center py-2">No public missions logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Moderation Queue Modal */}
      {showReportsModal && userEmail === ADMIN_EMAIL && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                🛡️ Moderation Reports Queue ({adminReports.length})
              </h2>
              <button
                onClick={() => setShowReportsModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {adminReports.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Queue clear! Zero reported content.</p>
              ) : (
                adminReports.map((r) => (
                  <div key={r.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="text-rose-400 font-bold">Flagged {r.reported_type.toUpperCase()}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      <strong>Reason:</strong> "{r.reason}"
                    </p>
                    {r.content_text && (
                      <p className="text-slate-200 text-[11px] bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <strong className="text-amber-400">Reported content:</strong> "{r.content_text}"
                      </p>
                    )}
                    {r.content_photo_url && (
                      <img
                        src={r.content_photo_url}
                        alt="Reported proof photo"
                        className="w-full max-h-40 object-cover rounded-lg border border-slate-800"
                      />
                    )}
                    <p className="text-slate-500 text-[10px]">
                      Reported by @{r.reporter_handle}
                      {r.offender_handle ? ` • Posted by @${r.offender_handle}` : ''}
                    </p>
                    <div className="flex space-x-2 pt-1 border-t border-slate-900">
                      {r.reported_type === 'feed' && (
                        <button
                          onClick={() => {
                            handleAdminDeleteFeedPost(r.target_id);
                            handleResolveReport(r.id);
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1 rounded-lg font-bold transition-all"
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
                          className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1 rounded-lg font-bold transition-all"
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
                          className="bg-red-950 hover:bg-red-900 text-red-300 text-[10px] px-3 py-1 rounded-lg font-bold border border-red-500/40 transition-all"
                        >
                          Ban User
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1 rounded-lg font-semibold transition-all"
                      >
                        Dismiss Flag
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Pending Quest Suggestions Modal */}
      {showPendingQuestsModal && userEmail === ADMIN_EMAIL && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                📝 Pending Quest Suggestions ({pendingQuests.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchPendingQuests}
                  className="text-slate-500 hover:text-slate-300 text-[10px] font-bold"
                  title="Refresh"
                >
                  🔄
                </button>
                <button
                  onClick={() => setShowPendingQuestsModal(false)}
                  className="text-slate-500 hover:text-slate-300 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingPendingQuests ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading...</p>
              ) : pendingQuests.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No quests awaiting review.</p>
              ) : (
                pendingQuests.map((q) => (
                  <div key={q.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {q.mode}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(q.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">"{q.quest_text}"</p>
                    <p className="text-slate-500 text-[10px]">Suggested by @{q.submitted_by_handle}</p>
                    <div className="flex space-x-2 pt-1 border-t border-slate-900">
                      <button
                        onClick={() => handleApproveQuest(q.id)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] px-3 py-1 rounded-lg font-bold transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectQuest(q.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1 rounded-lg font-semibold transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPendingGemsModal && userEmail === ADMIN_EMAIL && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                🗺️ Manage Hidden Gems ({pendingGems.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchPendingGems}
                  className="text-slate-500 hover:text-slate-300 text-[10px] font-bold"
                  title="Refresh"
                >
                  🔄
                </button>
                <button
                  onClick={() => setShowPendingGemsModal(false)}
                  className="text-slate-500 hover:text-slate-300 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingPendingGems ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading...</p>
              ) : pendingGems.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No spots awaiting review.</p>
              ) : (
                pendingGems.map((g) => (
                  <div key={g.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={g.neighborhood}
                          onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, neighborhood: e.target.value } : item)); }}
                          className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-500/20 focus:outline-none"
                        >
                          {MUMBAI_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n} className="bg-slate-900 text-slate-100 normal-case">{n}</option>
                          ))}
                        </select>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          g.status === 'pending' ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {g.status === 'pending' ? 'Pending' : 'Live'}
                        </span>
                        {dirtyGemIds.includes(g.id) && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500/20 text-amber-300">
                            Unsaved
                          </span>
                        )}
                        {savedGemIds.includes(g.id) && !dirtyGemIds.includes(g.id) && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/15 text-emerald-300">
                            ✓ Saved
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(g.created_at).toLocaleTimeString()}</span>
                    </div>
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, name: e.target.value } : item)); }}
                      maxLength={100}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-[11px] font-bold focus:outline-none focus:border-amber-500"
                    />
                    <textarea
                      value={g.description}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, description: e.target.value } : item)); }}
                      maxLength={300}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 text-[11px] resize-none focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-slate-500 text-[10px]">Suggested by @{g.submitted_by_handle}</p>
                    <div className="flex space-x-2 pt-1 border-t border-slate-900">
                      {g.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveGem(g)}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] px-3 py-1 rounded-lg font-bold transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectGem(g.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1 rounded-lg font-semibold transition-all"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateGem(g)}
                            disabled={!dirtyGemIds.includes(g.id)}
                            className={`text-[10px] px-3 py-1 rounded-lg font-bold transition-all ${
                              dirtyGemIds.includes(g.id)
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {dirtyGemIds.includes(g.id) ? 'Save Changes' : 'No Changes'}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Permanently remove "${g.name}" from Explorer mode?`)) {
                                handleRejectGem(g.id);
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1 rounded-lg font-semibold transition-all"
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
        </div>
      )}

      {/* Developer Access Modal */}
      {showDevModal && userEmail === ADMIN_EMAIL && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                🛠️ Developer Tools ({userEmail})
              </h2>
              <button
                onClick={() => setShowDevModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-[10px] font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400 space-y-1">
              <p><strong>Auth UID:</strong> {currentUserId || 'None'}</p>
              <p><strong>Session:</strong> {userEmail}</p>
              <p><strong>Room:</strong> {roomId || 'None'}</p>
              <p><strong>Queue Ref:</strong> {myQueueEntryIdRef.current || 'None'}</p>
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
                className="w-full bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 py-2 rounded-xl text-xs font-mono font-bold border border-rose-500/30"
              >
                Force Clear Queue Locks
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="w-full bg-red-950/50 hover:bg-red-900/50 text-red-300 py-2 rounded-xl text-xs font-mono font-bold border border-red-500/30"
              >
                Hard Reset Local Storage & Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handle Setup Modal */}
      {showHandleModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-3xl">🏷️</div>
            <h2 className="text-lg font-extrabold text-slate-100">CHOOSE YOUR EXPLORER TAG</h2>
            <p className="text-xs text-slate-400">
              Pick a unique handle so other Mumbai explorers can recognize and add you to their squad!
            </p>
            <div className="relative">
              <span className="absolute left-4 top-3 text-rose-400 font-bold text-sm">@</span>
              <input
                type="text"
                placeholder="ExplorerTag"
                value={newHandleInput}
                onChange={(e) => setNewHandleInput(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              onClick={() => saveHandleDirect(newHandleInput || handle)}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              Claim Tag & Start
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {(!isLoggedIn || showAuthModal) && !showHandleModal && (
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
              {authModalReason || 'Enter your email to match with squad partners or continue as a guest for solo missions.'}
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
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
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

      {/* Save My Progress Modal */}
      {showSaveProgressModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSaveProgressModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <div className="text-3xl">💾</div>
            <h2 className="text-lg font-extrabold text-slate-100">SAVE MY PROGRESS</h2>
            <p className="text-xs text-slate-400">
              Link an email so your streak, XP, and badges are safe if you switch devices or clear your browser. Fully optional — your progress keeps working without it.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={saveProgressEmail}
                onChange={(e) => setSaveProgressEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProgress(saveProgressEmail.trim())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 text-center focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => handleSaveProgress(saveProgressEmail.trim())}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Send Confirmation Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest a Quest Modal */}
      {showSuggestQuestModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSuggestQuestModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <div className="text-3xl">✍️</div>
            <h2 className="text-lg font-extrabold text-slate-100">SUGGEST A QUEST</h2>
            <p className="text-xs text-slate-400">
              Got a great real-world mission idea? Submit it for review — approved quests go live for everyone.
            </p>
            <div className="space-y-3">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full justify-between">
                {(['solo', 'duo', 'squad'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSuggestQuestMode(m)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      suggestQuestMode === m
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
              />
              <button
                onClick={handleSubmitQuestSuggestion}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuggestGemModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSuggestGemModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <div className="text-3xl">🗺️</div>
            <h2 className="text-lg font-extrabold text-slate-100">SUGGEST A HIDDEN GEM</h2>
            <p className="text-xs text-slate-400">
              A real place only you and a few people actually know about — a shop, a stall, a spot with no reviews anywhere. Approved spots go live for everyone to discover.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Place name"
                value={suggestGemName}
                onChange={(e) => setSuggestGemName(e.target.value)}
                maxLength={100}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <div className="flex flex-wrap gap-2 justify-center">
                {MUMBAI_NEIGHBORHOODS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSuggestGemNeighborhood(n)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      suggestGemNeighborhood === n
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
              />
              <button
                onClick={handleSubmitGemSuggestion}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-3 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/30 transition-all active:scale-95"
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In / Recover Account Modal */}
      {showRecoverModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowRecoverModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <div className="text-3xl">🔑</div>
            <h2 className="text-lg font-extrabold text-slate-100">SIGN IN ON THIS DEVICE</h2>
            {!isRecoverOtpSent ? (
              <>
                <p className="text-xs text-slate-400">
                  Enter the email you previously saved your progress with, and we'll send you a 6-digit code.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRecoverAccount(recoverEmail.trim())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 text-center focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={() => handleRecoverAccount(recoverEmail.trim())}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-sm border border-slate-700 transition-all active:scale-95"
                  >
                    Send Sign-In Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code we emailed to {recoverEmail}.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit Email Code"
                    value={recoverOtpInput}
                    onChange={(e) => setRecoverOtpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyRecoverOtp()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono text-center focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={handleVerifyRecoverOtp}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                  >
                    Verify & Sign In
                  </button>
                  <button
                    onClick={() => setIsRecoverOtpSent(false)}
                    className="text-xs text-slate-500 hover:underline pt-2 block mx-auto"
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

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full justify-between">
              {(['squad', 'leaderboard'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeaderboardTab(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    leaderboardTab === t
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
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
                      entry.is_self
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-bold w-4 text-center">{i + 1}</span>
                      <div>
                        <button
                          onClick={() => inspectProfile(entry.handle)}
                          className="font-bold text-rose-400 hover:underline"
                        >
                          @{entry.handle}
                        </button>
                        <span className="block text-[9px] text-slate-500">{getRankTitle(entry.total_xp)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-200">{entry.total_xp} XP</p>
                      <p className="text-[9px] text-slate-500">{entry.streak} Days 🔥</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {friendsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No squad friends added yet. Complete a Duo/Squad mission and tap "+ Add Friend"!</p>
              ) : (
                friendsList.map((f, i) => {
                  const isOnline = onlineUserIds.has(f.friend_user_id);
                  return (
                    <div key={i} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-600'}`} />
                          <button
                            onClick={() => inspectProfile(f.handle)}
                            className="font-bold text-rose-400 hover:underline"
                          >
                            @{f.handle}
                          </button>
                        </div>
                        <span className="block text-[9px] text-slate-500 pl-3.5">
                          {isOnline ? 'Online in App' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => inspectProfile(f.handle)}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-lg border border-slate-800 font-bold"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => sendDirectRaidInvite(f)}
                          disabled={!isOnline || sendingInviteTo === f.handle}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center space-x-1 transition-all ${
                            isOnline
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 active:scale-95'
                              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          <span>⚡</span>
                          <span>{sendingInviteTo === f.handle ? 'Sending...' : isOnline ? 'Raid' : 'Offline'}</span>
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
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-center relative">
            <button
              onClick={() => setShowWrappedModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold"
            >
              ✕
            </button>
            <h2 className="text-sm font-black text-rose-400 uppercase tracking-wider">🎧 Your IRL Recap</h2>
            {wrappedCardDataUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img src={wrappedCardDataUrl} alt="Recap" className="w-full h-80 object-contain mx-auto" />
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
        <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-4">
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full justify-between">
            {(['solo', 'duo', 'squad'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSelectMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl capitalize transition-all active:scale-95 ${
                  mode === m && !isExplorerMode
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'squad' ? 'Squad (2-8)' : m}
              </button>
            ))}
            <button
              onClick={handleSelectExplorer}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all active:scale-95 ${
                isExplorerMode
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Explore
            </button>
          </div>

          {isExplorerMode && !activeQuest && !isCompleted && (
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <p className="text-sm text-slate-300 font-semibold">
                Pick a neighborhood to discover a hidden gem someone local actually knows about.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {MUMBAI_NEIGHBORHOODS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedNeighborhood(n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedNeighborhood === n
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRevealGem}
                disabled={!selectedNeighborhood}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-black py-3 rounded-xl transition-all active:scale-95"
              >
                🗺️ Reveal a Hidden Gem
              </button>
              <button
                onClick={() => setShowSuggestGemModal(true)}
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold underline"
              >
                Know a spot? Suggest your own hidden gem
              </button>
            </div>
          )}

          {!activeQuest && !isCompleted && !isExplorerMode && (
            <div className="flex flex-col items-center space-y-4">
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
                    <span className="text-xs text-rose-200 font-mono font-normal">
                      {squadRoster.length > 0 ? `LOBBY (${squadRoster.length}/${squadCapacity})` : 'SEARCHING...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="font-['Space_Grotesk'] font-bold text-2xl tracking-tight drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]">DESTROY</span>
                    <span className="font-['Space_Grotesk'] font-medium text-sm text-rose-200 mt-1 tracking-wide line-through decoration-2">BOREDOM</span>
                  </>
                )}
              </button>

              <div className="text-center space-y-2 max-w-xs">
                <p className="text-xs text-slate-500">
                  {isSearching
                    ? `Searching live queue for Mumbai ${mode.toUpperCase()} partners...`
                    : 'Tap to trigger a random real-world micro-mission.'}
                </p>

                {isSearching && (
                  <div className="flex flex-col items-center space-y-2 pt-2">
                    <button
                      onClick={handleWhatsAppInvite}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center space-x-1 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
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
                  {isExplorerMode ? 'Explorer' : mode} Mission Assigned
                </span>
                <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Active Mission</span>
                </span>
              </div>

              {squadRoster.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-left space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                    <span>👑 Active Squad Roster ({squadRoster.length})</span>
                    <span className="text-amber-400 font-mono">Live Lobby</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {squadRoster.map((p, idx) => (
                      <div key={idx} className="flex items-center space-x-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-xs">
                        <button
                          onClick={() => inspectProfile(p.handle)}
                          className="text-rose-400 font-bold hover:underline"
                        >
                          @{p.handle}
                        </button>
                        {p.user_id !== currentUserId && (
                          <button
                            onClick={() => handleAddFriend(p.user_id)}
                            className="text-[10px] text-slate-400 hover:text-rose-400 pl-1"
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
                  onReroll={() => isExplorerMode ? handleRevealGem() : (mode === 'solo' ? pickRandomQuest() : handleSharedReroll())}
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
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-2 text-left">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">💬 Live {mode.toUpperCase()} Rally Chat</span>
                    <button
                      onClick={handleWhatsAppInvite}
                      className="text-[10px] bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center space-x-1"
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
                            <button
                              onClick={() => inspectProfile(m.sender_handle)}
                              className="text-[10px] font-bold text-rose-400 hover:underline"
                            >
                              @{m.sender_handle}: 
                            </button>
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

              {isMissionAccepted && (
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center bg-slate-950/50 space-y-1">
                  {uploading ? (
                    <div className="py-4 flex flex-col items-center space-y-1">
                      <span className="animate-spin text-xl">☁️</span>
                      <span className="text-xs text-rose-400 font-semibold">Compressing & Uploading (~50KB)...</span>
                    </div>
                  ) : proofImage ? (
                    <img src={proofImage} alt="Proof" className="w-full h-36 object-cover rounded-xl" />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center space-y-1 w-full py-1">
                      <span className="text-xl">📸</span>
                      <span className="text-xs text-slate-400 font-semibold"></span>
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

              <div className="flex flex-col space-y-2 pt-1">
                <button
                  onClick={handleCompleteMission}
                  disabled={uploading || !proofImage}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                    proofImage && !uploading
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  {proofImage ? 'Complete & Log Proof 🔥' : 'Take Photo Proof to Complete'}
                </button>
                <button
                  onClick={handleAbandonMission}
                  className="text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
                >
                  Abandon Mission
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="text-4xl">🎉</div>
              <h2 className="text-xl font-extrabold text-amber-400">LOOP BROKEN!</h2>
              <p className="text-xs text-slate-300">
                You broke routine and gained real-world experience today.
              </p>

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
                      <button
                        onClick={() => inspectProfile(item.handle)}
                        className="text-xs font-bold text-rose-400 hover:underline"
                      >
                        @{item.handle || 'Explorer'}
                      </button>
                      <div className="flex items-center space-x-2">
                        {userEmail === ADMIN_EMAIL && (
                          <button
                            onClick={() => handleAdminDeleteFeedPost(item.id)}
                            className="text-[10px] bg-red-950/80 border border-red-500/40 text-red-300 px-2 py-0.5 rounded-lg font-bold hover:bg-red-900"
                            title="Admin: Delete post"
                          >
                            🗑️ Delete
                          </button>
                        )}
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
              <span className="text-[10px] text-slate-500 font-medium">· {getRankTitle(totalXp)}</span>
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
              🎧 Recap
            </button>
            <button
              onClick={() => {
                setSuggestQuestMode(mode);
                setShowSuggestQuestModal(true);
              }}
              className="text-[10px] text-rose-300 hover:underline font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg"
            >
              ✍️ Suggest Quest
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
                className="text-[10px] text-rose-400 hover:underline font-semibold"
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
            <p className="text-xs text-slate-500">Total IRL XP</p>
            <p className="text-lg font-bold text-rose-400">{savedMins} XP ⚡</p>
          </div>
        </div>

        {(!userEmail || userEmail === 'guest@breaktheloop.app') && (
          <div className="flex flex-col items-center space-y-1.5 border-t border-slate-800/60 pt-2">
            <button
              onClick={() => setShowSaveProgressModal(true)}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              💾 Save My Progress
            </button>
            <button
              onClick={() => setShowRecoverModal(true)}
              className="text-[10px] text-slate-500 hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}
