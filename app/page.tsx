"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { initAnalytics, track, identifyUser } from './lib/analytics';
import { getRankTitle } from './lib/ranks';
import SuspenseMissionCard, { GemDetails } from "./components/SuspenseMissionCard";
import RankProgress from "./components/RankProgress";
import { Modal, Button, Chip, Stat, SectionLabel, inputClass } from "./components/ui";
import {
  IconBell, IconBellOff, IconShield, IconFlag, IconMap, IconPencil,
  IconUsers, IconUser, IconUserPlus, IconCamera, IconTrophy,
  IconFlame, IconBolt, IconShare, IconSend, IconChat, IconHeadphones,
  IconCompass, IconTarget, IconTrash, IconBan, IconSave, IconClock,
  IconSearch, IconWhatsApp, IconInbox, IconCrown, IconGem, IconSparkle, IconLock,
  IconRefresh, IconCheck, IconMail,
} from "./components/Icons";
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

  // Admin tools are collapsed behind one menu rather than three header buttons.
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

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

  // Dismiss the admin menu on an outside click or Escape. The pointerdown
  // must ignore presses inside the menu itself: closing on any pointerdown
  // unmounts the item before its click event lands, so no menu entry would
  // ever fire.
  useEffect(() => {
    if (!showAdminMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (adminMenuRef.current?.contains(e.target as Node)) return;
      setShowAdminMenu(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdminMenu(false);
    };
    // Defer so the click that opened the menu doesn't immediately close it.
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showAdminMenu]);

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

  const handleSendEmailOtp = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setAuthError('');
    if (!emailInput.includes('@')) return setAuthError('Please enter a valid email address');
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { shouldCreateUser: true }
    });
    if (error) setAuthError(error.message);
    else setIsOtpSent(true);
  };

  const handleVerifyEmailOtp = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
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

  // Rebranded onto the app's own palette (it was still slate/rose from the
  // pre-light-theme design), and given the right numbers: it used to print the
  // running time_saved_mins total under an "IRL XP GAINED" heading, which is
  // neither XP nor a gain.
  const generateShareCard = (
    newStreak: number,
    xpEarned: number,
    newTotalXp: number
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const INK = '#1C1917';
    const MUTED = '#78716C';
    const ACTION = '#EA580C';
    const REWARD = '#B45309';
    const LINE = '#E7E0D8';

    const bgGradient = ctx.createLinearGradient(0, 0, 540, 1920);
    bgGradient.addColorStop(0, '#FFFAF4');
    bgGradient.addColorStop(0.55, '#FFF4E6');
    bgGradient.addColorStop(1, '#FDE9D0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    const g = ctx.createRadialGradient(540, 420, 0, 540, 420, 460);
    g.addColorStop(0, 'rgba(234, 88, 12, 0.16)');
    g.addColorStop(1, 'rgba(255, 250, 244, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(540, 420, 460, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';

    ctx.fillStyle = ACTION;
    ctx.font = '700 50px "Space Grotesk", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('BREAK THE LOOP', 540, 214);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = MUTED;
    ctx.font = '600 32px Inter, sans-serif';
    ctx.fillText('MUMBAI REAL-WORLD RAID', 540, 272);

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(90, 350, 900, 1140, 48);
    ctx.fill();
    ctx.stroke();

    // Mode pill
    const pillLabel = `${(isExplorerMode ? 'explorer' : mode).toUpperCase()} MISSION BROKEN`;
    ctx.font = '700 34px Inter, sans-serif';
    const pillWidth = ctx.measureText(pillLabel).width + 72;
    ctx.fillStyle = '#FFF7ED';
    ctx.strokeStyle = '#FED7AA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(540 - pillWidth / 2, 424, pillWidth, 72, 36);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ACTION;
    ctx.fillText(pillLabel, 540, 472);

    // Quest text, wrapped
    ctx.fillStyle = INK;
    ctx.font = '500 46px "Space Grotesk", sans-serif';
    const text = `"${activeQuest || 'Completed a local real-world mission in Mumbai'}"`;
    const words = text.split(' ');
    let line = '';
    let y = 620;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > 760 && i > 0) {
        ctx.fillText(line.trim(), 540, y);
        line = words[i] + ' ';
        y += 62;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 540, y);

    const statsY = Math.max(y + 160, 1090);

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, statsY - 92);
    ctx.lineTo(900, statsY - 92);
    ctx.stroke();

    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText('STREAK', 320, statsY);
    ctx.fillText('XP EARNED', 760, statsY);

    ctx.font = '700 70px "Space Grotesk", sans-serif';
    ctx.fillStyle = ACTION;
    ctx.fillText(`${newStreak} days`, 320, statsY + 82);
    ctx.fillStyle = REWARD;
    ctx.fillText(`+${xpEarned}`, 760, statsY + 82);

    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `${newTotalXp.toLocaleString()} XP total • ${getRankTitle(newTotalXp)}`,
      540,
      statsY + 168
    );

    ctx.fillStyle = INK;
    ctx.font = '700 42px "Space Grotesk", sans-serif';
    ctx.fillText(`@${handle} • Mumbai, MH`, 540, 1610);

    ctx.fillStyle = MUTED;
    ctx.font = '500 32px Inter, sans-serif';
    ctx.fillText('Join at breaktheloopapp.in', 540, 1676);

    setCardDataUrl(canvas.toDataURL('image/png'));
  };

  // The share card is the one part of the app that travels -- it lands on
  // someone else's Instagram story with no other context. It was still on the
  // pre-redesign slate/rose/purple palette, so the thing representing the brand
  // in public looked like a different product. It also printed time_saved_mins
  // under an "XP" label, baking the footer's bug into an image people share.
  const generateSpotifyWrappedCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const INK = '#1C1917';
    const MUTED = '#78716C';
    const ACTION = '#EA580C';
    const REWARD = '#B45309';
    const LINE = '#E7E0D8';

    const bgGradient = ctx.createLinearGradient(0, 0, 540, 1920);
    bgGradient.addColorStop(0, '#FFFAF4');
    bgGradient.addColorStop(0.55, '#FFF4E6');
    bgGradient.addColorStop(1, '#FDE9D0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Soft brand blooms, matching the app's hero rings.
    const bloom = (x: number, y: number, r: number, rgba: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba);
      g.addColorStop(1, 'rgba(255,250,244,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    bloom(190, 330, 420, 'rgba(234, 88, 12, 0.18)');
    bloom(900, 1500, 520, 'rgba(245, 158, 11, 0.20)');

    ctx.textAlign = 'center';

    ctx.fillStyle = ACTION;
    ctx.font = '700 46px "Space Grotesk", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('BREAK THE LOOP', 540, 196);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = MUTED;
    ctx.font = '600 32px Inter, sans-serif';
    ctx.fillText('YOUR IRL RECAP', 540, 252);

    // Card
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(90, 330, 900, 1270, 48);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = INK;
    ctx.font = '700 58px "Space Grotesk", sans-serif';
    ctx.fillText('YOU DESTROYED ROUTINE', 540, 452);

    ctx.fillStyle = MUTED;
    ctx.font = '400 30px Inter, sans-serif';
    ctx.fillText('Real-world time reclaimed from the scroll', 540, 508);

    const rank = getRankTitle(totalXp);

    const stat = (value: string, label: string, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.font = '700 86px "Space Grotesk", sans-serif';
      ctx.fillText(value, 540, y);
      ctx.fillStyle = MUTED;
      ctx.font = '600 30px Inter, sans-serif';
      ctx.fillText(label, 540, y + 56);
    };

    const divider = (y: number) => {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, y);
      ctx.lineTo(880, y);
      ctx.stroke();
    };

    // Real XP now, not minutes -- and the minutes get their own honest line.
    stat(`${totalXp.toLocaleString()} XP`, 'Total experience earned', 660, REWARD);
    divider(756);
    stat(`${streak} DAY STREAK`, 'Consecutive days unbroken', 872, ACTION);
    divider(968);
    stat(`${savedMins} MIN`, 'Real-world time reclaimed', 1084, INK);
    divider(1180);

    ctx.fillStyle = REWARD;
    ctx.font = '700 64px "Space Grotesk", sans-serif';
    ctx.fillText(rank, 540, 1296);
    ctx.fillStyle = MUTED;
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillText('Current rank', 540, 1352);

    const topBadge = badges[badges.length - 1] || '\u{1F331} First Step';
    ctx.fillStyle = INK;
    ctx.font = '600 44px Inter, sans-serif';
    ctx.fillText(topBadge, 540, 1456);
    ctx.fillStyle = MUTED;
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillText(`${friendsList.length} raid partners in your squad`, 540, 1524);

    ctx.fillStyle = INK;
    ctx.font = '700 42px "Space Grotesk", sans-serif';
    ctx.fillText(`@${handle} \u2022 Mumbai, MH`, 540, 1716);

    ctx.fillStyle = MUTED;
    ctx.font = '500 30px Inter, sans-serif';
    ctx.fillText('breaktheloopapp.in', 540, 1780);

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
            showToast(`Rank up! You're now a ${newRankTitle}.`, 'success');
          }
        }

        // Wrap card generation in try/catch and provide fallback 0 values
        try {
          generateShareCard(
            data.new_streak || 0,
            activeQuestXp,
            data.new_total_xp ?? totalXp
          );
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
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(120%_80%_at_50%_0%,_#FFFDFA_0%,_#FFF8F0_45%,_#FBE7CE_100%)] text-stone-900 flex flex-col items-center justify-between gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] font-sans">
      {/* Toast Stack. Toasts were left over from the old dark theme -- near-black
          panels dropped into a cream page. They now read as one system, and
          carry an icon so success/error is legible without relying on colour. */}
      <div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-1.5rem)] max-w-sm pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`a-drop w-full flex items-start gap-2.5 px-3.5 py-3 rounded-[0.875rem] text-[0.8125rem] font-semibold border shadow-[0_8px_28px_rgba(28,25,23,0.16)] ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-[#e7e0d8] text-stone-800'
            }`}
          >
            <span className="shrink-0 mt-px">
              {t.type === 'error' ? (
                <IconBan size={15} />
              ) : t.type === 'success' ? (
                <IconCheck size={15} />
              ) : (
                <IconSparkle size={15} />
              )}
            </span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>

      {/* The three admin buttons used to sit inline here, competing with the
          product's own navigation for the one account on earth that can see
          them. They now collapse into a single Admin control. */}
      <header className="w-full max-w-md flex justify-between items-center gap-3 py-3">
        <h1
          onMouseDown={handleDevPressStart}
          onMouseUp={handleDevPressEnd}
          onTouchStart={handleDevPressStart}
          onTouchEnd={handleDevPressEnd}
          className="flex items-center gap-2 cursor-pointer select-none active:scale-[0.98] transition-transform"
          title={userEmail === ADMIN_EMAIL ? "Hold for 2s for Developer Access" : "Break The Loop"}
        >
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-[0.5rem] bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_2px_0_0_#9A3412] flex items-center justify-center text-white shrink-0"
          >
            <IconBolt size={15} />
          </span>
          <span className="font-display text-[0.9375rem] font-bold tracking-tight text-stone-900 leading-none whitespace-nowrap">
            Break The Loop
          </span>
        </h1>

        <div className="flex items-center gap-1.5">
          {userEmail === ADMIN_EMAIL && (
            <div className="relative" ref={adminMenuRef}>
              <button
                onClick={() => setShowAdminMenu((v) => !v)}
                aria-expanded={showAdminMenu}
                aria-haspopup="menu"
                className="icon-btn relative"
                title="Admin tools"
              >
                <IconShield size={17} />
                {pendingGemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[0.625rem] font-bold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center border-2 border-[#FFFAF4]">
                    {pendingGemCount}
                  </span>
                )}
                <span className="sr-only">Admin tools</span>
              </button>

              {showAdminMenu && (
                <div
                  role="menu"
                  className="a-rise absolute right-0 top-full mt-1.5 z-50 w-52 bg-white border border-[#e7e0d8] rounded-[1rem] shadow-[0_12px_32px_rgba(28,25,23,0.16)] p-1.5"
                >
                  <SectionLabel className="px-2.5 py-1.5">Admin</SectionLabel>
                  {[
                    { label: 'Moderation reports', icon: <IconFlag size={15} />, run: fetchAdminReports, badge: 0 },
                    { label: 'Quest suggestions', icon: <IconPencil size={15} />, run: fetchPendingQuests, badge: 0 },
                    { label: 'Hidden gems', icon: <IconMap size={15} />, run: fetchPendingGems, badge: pendingGemCount },
                  ].map((entry) => (
                    <button
                      key={entry.label}
                      role="menuitem"
                      onClick={() => {
                        setShowAdminMenu(false);
                        entry.run();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[0.625rem] text-[0.8125rem] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                    >
                      <span className="text-stone-500">{entry.icon}</span>
                      <span className="flex-1 text-left">{entry.label}</span>
                      {entry.badge > 0 && (
                        <span className="nums bg-orange-100 text-orange-700 text-[0.6875rem] font-bold px-1.5 rounded-full">
                          {entry.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={requestNotificationPermission}
            aria-pressed={notificationsEnabled}
            className="icon-btn"
            title={notificationsEnabled ? 'Notifications active' : 'Enable notifications'}
          >
            {notificationsEnabled ? <IconBell size={17} /> : <IconBellOff size={17} />}
            <span className="sr-only">
              {notificationsEnabled ? 'Notifications are on' : 'Turn on notifications'}
            </span>
          </button>

          <div
            role="group"
            aria-label="View"
            className="flex bg-white border border-[#e7e0d8] rounded-[0.625rem] p-1 shadow-[0_1px_2px_rgba(68,64,60,0.04)]"
          >
            {(['quest', 'feed'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-[0.4rem] text-[0.8125rem] font-bold capitalize transition-all ${
                  tab === t
                    ? 'bg-orange-600 text-white shadow-[0_1px_2px_rgba(154,52,18,0.4)]'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t === 'quest' ? 'Quest' : 'Feed'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Incoming Live Raid Invite Banner. This used to be a near-black panel
          running animate-bounce forever -- it never stopped moving until you
          answered it, which is hard to read and hard to dismiss. It now drops
          in once and holds still. */}
      {incomingInvite && (
        <div
          role="alertdialog"
          aria-label={`Duo raid invite from ${incomingInvite.sender_handle}`}
          className="a-drop fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm z-50 bg-white border border-orange-200 p-4 rounded-[1.25rem] shadow-[0_16px_48px_rgba(234,88,12,0.24)]"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"
            >
              <IconBolt size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[0.875rem] font-bold text-stone-900 leading-snug">
                @{incomingInvite.sender_handle} challenged you to a Duo Raid
              </h3>
              <p className="text-[0.8125rem] text-stone-600 mt-1 leading-snug line-clamp-2">
                "{incomingInvite.quest_text}"
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="secondary" size="sm" full onClick={declineDirectInvite}>
              Decline
            </Button>
            <Button variant="primary" size="sm" full onClick={acceptDirectInvite}>
              <IconFlame size={14} />
              Accept Raid
            </Button>
          </div>
        </div>
      )}

      {/* Explorer Public Profile Modal */}
      <Modal open={!!selectedProfile} onClose={() => setSelectedProfile(null)}>
        {selectedProfile && (
          <div className="space-y-4 -mt-2">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-[0_2px_0_0_#9A3412]"
              >
                <IconUser size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-stone-900 truncate">
                  @{selectedProfile.handle}
                </h2>
                <span className="flex items-center gap-1 text-[0.8125rem] text-amber-700 font-semibold">
                  <IconCrown size={13} />
                  {getRankTitle(selectedProfile.total_xp || 0)}
                </span>
              </div>
            </div>

            {/* A public profile now shows real XP, which is what actually drives
                the rank shown right above it. It previously showed
                time_saved_mins under an "IRL XP" label. */}
            <div className="flex justify-around bg-[#faf7f3] p-3.5 rounded-[1rem] border border-[#e7e0d8]">
              <Stat
                label="Streak"
                value={selectedProfile.streak ?? 0}
                suffix="d"
                icon={<IconFlame size={12} />}
                tone="action"
              />
              <div className="w-px bg-[#e7e0d8]" />
              <Stat
                label="Total XP"
                value={(selectedProfile.total_xp ?? 0).toLocaleString()}
                icon={<IconBolt size={12} />}
                tone="reward"
              />
              <div className="w-px bg-[#e7e0d8]" />
              <Stat
                label="Saved"
                value={selectedProfile.time_saved_mins ?? 0}
                suffix="m"
                icon={<IconClock size={12} />}
              />
            </div>

            {selectedProfile.badges && selectedProfile.badges.length > 0 && (
              <div className="space-y-2">
                <SectionLabel>Unlocked badges</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.badges.map((b, i) => (
                    <Chip key={i} tone="reward">
                      {b}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <SectionLabel>Recent missions</SectionLabel>
              <div className="max-h-44 overflow-y-auto scroll-soft space-y-2 pr-1">
                {selectedProfile.history && selectedProfile.history.length > 0 ? (
                  selectedProfile.history.map((h) => (
                    <div
                      key={h.id}
                      className="bg-[#faf7f3] p-2 rounded-[0.875rem] border border-[#e7e0d8] flex gap-2.5 items-center"
                    >
                      {h.photo_url && (
                        <img
                          src={h.photo_url}
                          alt=""
                          className="w-11 h-11 object-cover rounded-[0.625rem] shrink-0"
                        />
                      )}
                      <div className="text-left overflow-hidden min-w-0">
                        <p className="text-[0.8125rem] text-stone-800 truncate font-medium">
                          "{h.quest_text}"
                        </p>
                        <span className="text-[0.6875rem] text-stone-500 uppercase font-bold tracking-wide">
                          {h.mode} mission
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[0.8125rem] text-stone-500 text-center py-3">
                    No public missions logged yet.
                  </p>
                )}
              </div>
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
                className="w-full flex items-center justify-center gap-1.5 text-[0.8125rem] font-semibold text-stone-500 hover:text-red-700 py-2 rounded-[0.625rem] border border-transparent hover:border-red-200 hover:bg-red-50 transition"
              >
                <IconBan size={14} />
                Block this Explorer
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Admin Moderation Queue Modal */}
      <Modal
        open={showReportsModal && userEmail === ADMIN_EMAIL}
        onClose={() => setShowReportsModal(false)}
        size="md"
        title={
          <span className="flex items-center gap-1.5">
            <IconShield size={15} className="text-amber-600" />
            Moderation Reports Queue ({adminReports.length})
          </span>
        }
      >
        <div>
            <div className="max-h-[60vh] overflow-y-auto scroll-soft space-y-2 pr-1">
              {adminReports.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <span className="inline-flex w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center">
                    <IconCheck size={22} />
                  </span>
                  <p className="text-[0.875rem] font-semibold text-stone-800">Queue clear! Zero reported content.</p>
                </div>
              ) : (
                adminReports.map((r) => (
                  <div key={r.id} className="bg-[#faf7f3] p-3 rounded-[1rem] border border-[#e7e0d8] space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <Chip tone="action">Flagged {r.reported_type.toUpperCase()}</Chip>
                      <span className="nums text-[0.6875rem] text-stone-500 shrink-0 pt-1">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-700 text-[0.8125rem]">
                      <strong className="font-semibold">Reason:</strong> "{r.reason}"
                    </p>
                    {r.content_text && (
                      <p className="text-stone-800 text-[0.8125rem] bg-white border border-[#e7e0d8] rounded-[0.625rem] p-2.5">
                        <strong className="text-amber-700 font-semibold">Reported content:</strong> "{r.content_text}"
                      </p>
                    )}
                    {r.content_photo_url && (
                      <img
                        src={r.content_photo_url}
                        alt="Reported proof photo"
                        className="w-full max-h-40 object-cover rounded-[0.625rem] border border-[#e7e0d8]"
                      />
                    )}
                    <p className="text-stone-500 text-[0.6875rem]">
                      Reported by @{r.reporter_handle}
                      {r.offender_handle ? ` • Posted by @${r.offender_handle}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e7e0d8]">
                      {r.reported_type === 'feed' && (
                        <button
                          onClick={() => {
                            handleAdminDeleteFeedPost(r.target_id);
                            handleResolveReport(r.id);
                          }}
                          className="btn btn-danger text-[0.75rem] px-3 py-1.5"
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
                          className="btn btn-danger text-[0.75rem] px-3 py-1.5"
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
                          className="btn text-[0.75rem] px-3 py-1.5 bg-white text-red-700 border border-red-300 hover:bg-red-50"
                        >
                          Ban User
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="btn btn-secondary text-[0.75rem] px-3 py-1.5"
                      >
                        Dismiss Flag
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </Modal>

      {/* Admin Pending Quest Suggestions Modal */}
      <Modal
        open={showPendingQuestsModal && userEmail === ADMIN_EMAIL}
        onClose={() => setShowPendingQuestsModal(false)}
        size="md"
        title={
          <span className="flex items-center gap-1.5">
            <IconPencil size={15} className="text-amber-600" />
            Pending Quest Suggestions ({pendingQuests.length})
          </span>
        }
        action={
          <button onClick={fetchPendingQuests} className="icon-btn !w-8 !h-8 border-transparent bg-transparent" title="Refresh">
            <IconRefresh size={15} />
            <span className="sr-only">Refresh</span>
          </button>
        }
      >
        <div>
            <div className="max-h-[60vh] overflow-y-auto scroll-soft space-y-2 pr-1">
              {loadingPendingQuests ? (
                <p className="text-[0.875rem] text-stone-500 text-center py-10">Loading...</p>
              ) : pendingQuests.length === 0 ? (
                <p className="text-[0.875rem] text-stone-500 text-center py-10">No quests awaiting review.</p>
              ) : (
                pendingQuests.map((q) => (
                  <div key={q.id} className="bg-[#faf7f3] p-3 rounded-[1rem] border border-[#e7e0d8] space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <Chip tone="reward" className="uppercase">{q.mode}</Chip>
                      <span className="nums text-[0.6875rem] text-stone-500 shrink-0 pt-1">{new Date(q.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-800 text-[0.875rem]">"{q.quest_text}"</p>
                    <p className="text-stone-500 text-[0.6875rem]">Suggested by @{q.submitted_by_handle}</p>
                    <div className="flex gap-2 pt-2 border-t border-[#e7e0d8]">
                      <button
                        onClick={() => handleApproveQuest(q.id)}
                        className="btn btn-primary text-[0.75rem] px-3 py-1.5"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectQuest(q.id)}
                        className="btn btn-secondary text-[0.75rem] px-3 py-1.5"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </Modal>

      <Modal
        open={showPendingGemsModal && userEmail === ADMIN_EMAIL}
        onClose={() => setShowPendingGemsModal(false)}
        size="md"
        title={
          <span className="flex items-center gap-1.5">
            <IconMap size={15} className="text-amber-600" />
            Manage Hidden Gems ({pendingGems.length})
          </span>
        }
        action={
          <button onClick={fetchPendingGems} className="icon-btn !w-8 !h-8 border-transparent bg-transparent" title="Refresh">
            <IconRefresh size={15} />
            <span className="sr-only">Refresh</span>
          </button>
        }
      >
        <div>
            <div className="max-h-[60vh] overflow-y-auto scroll-soft space-y-2 pr-1">
              {loadingPendingGems ? (
                <p className="text-[0.875rem] text-stone-500 text-center py-10">Loading...</p>
              ) : pendingGems.length === 0 ? (
                <p className="text-[0.875rem] text-stone-500 text-center py-10">No spots awaiting review.</p>
              ) : (
                pendingGems.map((g) => (
                  <div key={g.id} className="bg-[#faf7f3] p-3 rounded-[1rem] border border-[#e7e0d8] space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={g.neighborhood}
                          onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, neighborhood: e.target.value } : item)); }}
                          className="bg-amber-50 text-amber-800 text-[0.6875rem] font-bold px-2 py-1 rounded-full uppercase border border-amber-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                          {MUMBAI_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n} className="bg-white text-stone-900 normal-case">{n}</option>
                          ))}
                        </select>
                        <span className={`text-[0.6875rem] font-bold px-2 py-1 rounded-full uppercase border ${
                          g.status === 'pending' ? 'bg-stone-100 text-stone-700 border-stone-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {g.status === 'pending' ? 'Pending' : 'Live'}
                        </span>
                        {dirtyGemIds.includes(g.id) && (
                          <span className="text-[0.6875rem] font-bold px-2 py-1 rounded-full uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Unsaved
                          </span>
                        )}
                        {savedGemIds.includes(g.id) && !dirtyGemIds.includes(g.id) && (
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold px-2 py-1 rounded-full uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <IconCheck size={11} />
                            Saved
                          </span>
                        )}
                      </div>
                      <span className="nums text-[0.6875rem] text-stone-500 shrink-0 pt-1">{new Date(g.created_at).toLocaleTimeString()}</span>
                    </div>
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, name: e.target.value } : item)); }}
                      maxLength={100}
                      className="w-full bg-white border border-[#e7e0d8] rounded-[0.625rem] px-2.5 py-2 text-stone-900 text-[0.875rem] font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                    <textarea
                      value={g.description}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, description: e.target.value } : item)); }}
                      maxLength={300}
                      rows={3}
                      className="w-full bg-white border border-[#e7e0d8] rounded-[0.625rem] px-2.5 py-2 text-stone-800 text-[0.8125rem] resize-none focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                    <p className="text-stone-500 text-[0.6875rem]">Suggested by @{g.submitted_by_handle}</p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e7e0d8]">
                      {g.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveGem(g)}
                            className="btn btn-primary text-[0.75rem] px-3 py-1.5"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectGem(g.id)}
                            className="btn btn-secondary text-[0.75rem] px-3 py-1.5"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateGem(g)}
                            disabled={!dirtyGemIds.includes(g.id)}
                            className="btn btn-reward text-[0.75rem] px-3 py-1.5"
                          >
                            {dirtyGemIds.includes(g.id) ? 'Save Changes' : 'No Changes'}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Permanently remove "${g.name}" from Explorer mode?`)) {
                                handleRejectGem(g.id);
                              }
                            }}
                            className="btn btn-secondary text-[0.75rem] px-3 py-1.5"
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
      </Modal>

      {/* Developer Access Modal */}
      <Modal
        open={showDevModal && userEmail === ADMIN_EMAIL}
        onClose={() => setShowDevModal(false)}
        title="Developer Tools"
        subtitle={userEmail}
      >
        <div className="space-y-4">
            <div className="text-[0.75rem] font-mono bg-[#faf7f3] p-3 rounded-[0.875rem] border border-[#e7e0d8] text-stone-700 space-y-1 break-all">
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
                className="btn btn-secondary w-full text-[0.8125rem] py-2.5"
              >
                Force Clear Queue Locks
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="btn w-full text-[0.8125rem] py-2.5 bg-white text-red-700 border border-red-300 hover:bg-red-50"
              >
                Hard Reset Local Storage & Reload
              </button>
            </div>
        </div>
      </Modal>

      {/* Handle Setup Modal. Not dismissible -- the app needs a handle before
          anyone can be matched or credited. */}
      <Modal open={showHandleModal} dismissible={false}>
        <div className="text-center space-y-4">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconUser size={24} />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold text-stone-900">CHOOSE YOUR EXPLORER TAG</h2>
            <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
              Pick a unique handle so other Mumbai explorers can recognize and add you to their squad.
            </p>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-600 font-bold text-[0.875rem]">@</span>
            <input
              type="text"
              placeholder="ExplorerTag"
              value={newHandleInput}
              onChange={(e) => setNewHandleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveHandleDirect(newHandleInput || handle)}
              maxLength={20}
              className={`${inputClass} pl-7 font-semibold`}
            />
          </div>
          <Button variant="primary" size="lg" full onClick={() => saveHandleDirect(newHandleInput || handle)}>
            Claim Tag & Start
          </Button>
        </div>
      </Modal>

      {/* Auth Modal. Only dismissible once you're already signed in -- a first
          visit has to resolve to either an email or a guest session. */}
      <Modal
        open={(!isLoggedIn || showAuthModal) && !showHandleModal}
        onClose={() => setShowAuthModal(false)}
        dismissible={isLoggedIn}
      >
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconMail size={24} />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-stone-900">
              {showAuthModal ? 'EMAIL VERIFICATION' : 'JOIN BREAK THE LOOP'}
            </h2>
            <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
              {authModalReason || 'Enter your email to match with squad partners or continue as a guest for solo missions.'}
            </p>
          </div>

          {authError && (
            <p
              role="alert"
              className="text-[0.8125rem] text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-[0.625rem] font-medium text-left"
            >
              {authError}
            </p>
          )}

          {!isOtpSent ? (
            <div className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="yourname@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendEmailOtp()}
                className={`${inputClass} text-center`}
              />
              <Button variant="primary" size="lg" full onClick={handleSendEmailOtp}>
                Send 6-Digit Code
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e7e0d8]"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-[0.6875rem] uppercase tracking-wide text-stone-500 font-semibold">Or</span></div>
              </div>

              <Button variant="secondary" size="lg" full onClick={handleGuestLogin}>
                <IconBolt size={16} />
                Continue as Guest
              </Button>
              <p className="text-[0.6875rem] text-stone-500 -mt-1">Solo missions only</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit Email Code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmailOtp()}
                className={`${inputClass} text-center font-mono tracking-[0.3em]`}
              />
              <Button variant="primary" size="lg" full onClick={handleVerifyEmailOtp}>
                Verify & Continue
              </Button>
              <button
                onClick={() => setIsOtpSent(false)}
                className="text-[0.8125rem] text-stone-500 hover:text-stone-800 hover:underline pt-1 block mx-auto"
              >
                Change Email
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Save My Progress Modal */}
      <Modal open={showSaveProgressModal} onClose={() => setShowSaveProgressModal(false)}>
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconSave size={23} />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold text-stone-900">SAVE MY PROGRESS</h2>
            <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
              Link an email so your streak, XP, and badges are safe if you switch devices or clear your browser. Fully optional — your progress keeps working without it.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="yourname@gmail.com"
              value={saveProgressEmail}
              onChange={(e) => setSaveProgressEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProgress(saveProgressEmail.trim())}
              className={`${inputClass} text-center`}
            />
            <Button variant="primary" size="lg" full onClick={() => handleSaveProgress(saveProgressEmail.trim())}>
              Send Confirmation Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suggest a Quest Modal */}
      <Modal open={showSuggestQuestModal} onClose={() => setShowSuggestQuestModal(false)}>
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconPencil size={22} />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold text-stone-900">SUGGEST A QUEST</h2>
            <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
              Got a great real-world mission idea? Submit it for review — approved quests go live for everyone.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex bg-[#faf7f3] p-1 rounded-[0.75rem] border border-[#e7e0d8] gap-1">
              {(['solo', 'duo', 'squad'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSuggestQuestMode(m)}
                  aria-pressed={suggestQuestMode === m}
                  className={`flex-1 py-2 text-[0.8125rem] font-bold rounded-[0.5rem] capitalize transition-all ${
                    suggestQuestMode === m
                      ? 'bg-orange-600 text-white shadow-[0_1px_2px_rgba(154,52,18,0.4)]'
                      : 'text-stone-600 hover:text-stone-900'
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
              className={`${inputClass} resize-none`}
            />
            <div className="flex justify-end -mt-1">
              <span className="nums text-[0.6875rem] text-stone-500">{suggestQuestText.length}/300</span>
            </div>
            <Button variant="primary" size="lg" full onClick={handleSubmitQuestSuggestion}>
              Submit for Review
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSuggestGemModal} onClose={() => setShowSuggestGemModal(false)}>
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-amber-100 text-amber-700 items-center justify-center"
          >
            <IconGem size={22} />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold text-stone-900">SUGGEST A HIDDEN GEM</h2>
            <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
              A real place only you and a few people actually know about — a shop, a stall, a spot with no reviews anywhere. Approved spots go live for everyone to discover.
            </p>
          </div>
          <div className="space-y-3 text-left">
            <input
              type="text"
              placeholder="Place name"
              value={suggestGemName}
              onChange={(e) => setSuggestGemName(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
            <div className="space-y-1.5">
              <SectionLabel>Neighborhood</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {MUMBAI_NEIGHBORHOODS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSuggestGemNeighborhood(n)}
                    aria-pressed={suggestGemNeighborhood === n}
                    className={`px-2.5 py-1 rounded-full text-[0.75rem] font-semibold border transition-all ${
                      suggestGemNeighborhood === n
                        ? 'bg-amber-500 text-stone-900 border-amber-500'
                        : 'bg-white text-stone-600 border-[#e7e0d8] hover:border-amber-300 hover:text-stone-900'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Why is it special? (15-300 characters)..."
              value={suggestGemDescription}
              onChange={(e) => setSuggestGemDescription(e.target.value)}
              maxLength={300}
              rows={4}
              className={`${inputClass} resize-none`}
            />
            <Button variant="reward" size="lg" full onClick={handleSubmitGemSuggestion}>
              Submit for Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* First-visit welcome. Now walks through the actual three-step loop
          rather than describing it in a paragraph -- it is the one screen that
          has to land the concept. */}
      <Modal open={showWelcomeModal} onClose={dismissWelcomeModal}>
        <div className="text-center space-y-5 -mt-2">
          <div className="space-y-2">
            <span
              aria-hidden="true"
              className="inline-flex w-14 h-14 rounded-[1rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-[0_3px_0_0_#9A3412]"
            >
              <IconBolt size={26} />
            </span>
            <h2 className="font-display text-xl font-bold text-stone-900 pt-1">
              Welcome to Break The Loop
            </h2>
            <p className="text-[0.875rem] text-stone-600 leading-relaxed">
              Stuck scrolling? We hand you something real to go do instead.
            </p>
          </div>

          <ol className="space-y-2.5 text-left">
            {[
              { icon: <IconTarget size={17} />, title: 'Tap the button', body: 'You get one random micro-mission somewhere near you.' },
              { icon: <IconCamera size={17} />, title: 'Go do it', body: 'Snap a photo as proof you actually showed up.' },
              { icon: <IconBolt size={17} />, title: 'Earn XP and rank up', body: 'Build a streak, unlock badges, climb from Fresh Escapee to Mumbai Made.' },
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start bg-[#faf7f3] border border-[#e7e0d8] rounded-[0.875rem] p-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 w-8 h-8 rounded-[0.5rem] bg-white border border-[#e7e0d8] text-orange-600 flex items-center justify-center"
                >
                  {step.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[0.875rem] font-bold text-stone-900 leading-tight">
                    {step.title}
                  </span>
                  <span className="block text-[0.8125rem] text-stone-600 leading-snug mt-0.5">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <Button variant="primary" size="lg" full onClick={dismissWelcomeModal}>
            Let's go
          </Button>
        </div>
      </Modal>

      <Modal open={showRecoverModal} onClose={() => setShowRecoverModal(false)}>
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconLock size={22} />
          </span>
          <h2 className="font-display text-lg font-bold text-stone-900">SIGN IN ON THIS DEVICE</h2>
          {!isRecoverOtpSent ? (
            <>
              <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
                Enter the email you previously saved your progress with, and we'll send you a 6-digit code.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="yourname@gmail.com"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecoverAccount(recoverEmail.trim())}
                  className={`${inputClass} text-center`}
                />
                <Button variant="primary" size="lg" full onClick={() => handleRecoverAccount(recoverEmail.trim())}>
                  Send Sign-In Code
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[0.8125rem] text-stone-600 leading-relaxed">
                Enter the 6-digit code we emailed to {recoverEmail}.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit Email Code"
                  value={recoverOtpInput}
                  onChange={(e) => setRecoverOtpInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyRecoverOtp()}
                  className={`${inputClass} text-center font-mono tracking-[0.3em]`}
                />
                <Button variant="primary" size="lg" full onClick={handleVerifyRecoverOtp}>
                  Verify & Sign In
                </Button>
                <button
                  onClick={() => setIsRecoverOtpSent(false)}
                  className="text-[0.8125rem] text-stone-500 hover:text-stone-800 hover:underline pt-1 block mx-auto"
                >
                  Change Email
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Safety gate before any multiplayer match. */}
      <Modal open={showSafetyModal} onClose={() => setShowSafetyModal(false)}>
        <div className="text-center space-y-4 -mt-2">
          <span
            aria-hidden="true"
            className="inline-flex w-12 h-12 rounded-full bg-orange-100 text-orange-600 items-center justify-center"
          >
            <IconShield size={23} />
          </span>
          <h2 className="font-display text-lg font-bold text-stone-900">SAFETY FIRST</h2>
          <ul className="text-left space-y-2.5">
            {[
              ['Meet in public', 'Coordinate only at visible, public landmarks.'],
              ['Trust your instincts', 'Leave or cancel the mission immediately if you feel uncomfortable.'],
              ['Never share private data', 'Do not disclose banking details, OTPs, or exact home addresses.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-2.5 items-start">
                <span aria-hidden="true" className="shrink-0 mt-0.5 text-orange-600">
                  <IconCheck size={16} />
                </span>
                <span className="text-[0.8125rem] leading-snug">
                  <strong className="font-semibold text-stone-900">{title}:</strong>{' '}
                  <span className="text-stone-600">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" full onClick={() => setShowSafetyModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              full
              onClick={() => isExplorerMode ? handleExploreMatchmaking() : executeMatchmaking()}
            >
              I Agree & Search
            </Button>
          </div>
        </div>
      </Modal>

      {/* Friends List / Leaderboard Modal */}
      <Modal
        open={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        title={
          <span className="flex items-center gap-1.5">
            <IconUsers size={15} className="text-orange-600" />
            Raid Squad ({friendsList.length})
          </span>
        }
      >
        <div className="space-y-3">
            <div role="group" aria-label="Squad view" className="flex bg-[#faf7f3] p-1 rounded-[0.75rem] border border-[#e7e0d8] gap-1">
              {(['squad', 'leaderboard'] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={leaderboardTab === t}
                  onClick={() => setLeaderboardTab(t)}
                  className={`flex-1 py-2 text-[0.8125rem] font-bold rounded-[0.5rem] transition-all ${
                    leaderboardTab === t
                      ? 'bg-orange-600 text-white shadow-[0_1px_2px_rgba(154,52,18,0.4)]'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t === 'squad' ? 'Squad' : 'Leaderboard'}
                </button>
              ))}
            </div>

            {leaderboardTab === 'leaderboard' ? (
              <div className="max-h-[52vh] overflow-y-auto scroll-soft space-y-1.5 pr-1">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.handle}
                    data-leaderboard-row
                    className={`p-2.5 rounded-[0.875rem] border flex items-center justify-between gap-2 ${
                      entry.is_self
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-[#faf7f3] border-[#e7e0d8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* The top three get a medal treatment -- a leaderboard
                          where every row looks the same isn't much of a prize. */}
                      <span
                        className={`nums shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] font-bold ${
                          i === 0
                            ? 'bg-amber-400 text-stone-900'
                            : i === 1
                            ? 'bg-stone-300 text-stone-800'
                            : i === 2
                            ? 'bg-orange-200 text-orange-900'
                            : 'text-stone-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <button
                          onClick={() => inspectProfile(entry.handle)}
                          className="text-[0.875rem] font-bold text-orange-700 hover:underline truncate block"
                        >
                          @{entry.handle}
                        </button>
                        <span className="block text-[0.6875rem] text-stone-500">{getRankTitle(entry.total_xp)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="nums text-[0.875rem] font-bold text-stone-900">{entry.total_xp} XP</p>
                      <p className="flex items-center justify-end gap-0.5 text-[0.6875rem] text-stone-500">
                        <IconFlame size={11} />
                        <span className="nums">{entry.streak}</span> days
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="max-h-[52vh] overflow-y-auto scroll-soft space-y-1.5 pr-1">
              {friendsList.length === 0 ? (
                <div className="text-center py-10 space-y-2.5">
                  <span className="inline-flex w-11 h-11 rounded-full bg-stone-100 text-stone-500 items-center justify-center">
                    <IconUsers size={22} />
                  </span>
                  <p className="text-[0.8125rem] text-stone-600 max-w-[240px] mx-auto leading-relaxed">
                    No squad friends added yet. Complete a Duo or Squad mission and tap Add Friend.
                  </p>
                </div>
              ) : (
                friendsList.map((f, i) => {
                  const isOnline = onlineUserIds.has(f.friend_user_id);
                  return (
                    <div key={i} className="bg-[#faf7f3] p-2.5 rounded-[0.875rem] border border-[#e7e0d8] flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`}
                          />
                          <button
                            onClick={() => inspectProfile(f.handle)}
                            className="text-[0.875rem] font-bold text-orange-700 hover:underline truncate"
                          >
                            @{f.handle}
                          </button>
                        </div>
                        <span className="block text-[0.6875rem] text-stone-500 pl-3.5">
                          {isOnline ? 'Online in app' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => inspectProfile(f.handle)}
                          className="btn btn-secondary text-[0.75rem] px-2.5 py-1.5"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => sendDirectRaidInvite(f)}
                          disabled={!isOnline || sendingInviteTo === f.handle}
                          className="btn btn-primary text-[0.75rem] px-2.5 py-1.5"
                        >
                          <IconBolt size={12} />
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
      </Modal>

      {/* Journey Recap Modal */}
      <Modal
        open={showWrappedModal}
        onClose={() => setShowWrappedModal(false)}
        tone="reward"
        title={
          <span className="flex items-center gap-1.5">
            <IconHeadphones size={15} className="text-amber-600" />
            Your IRL Recap
          </span>
        }
      >
        <div className="space-y-3">
          {wrappedCardDataUrl && (
            <div className="rounded-[1rem] overflow-hidden border border-[#e7e0d8] bg-[#faf7f3]">
              <img src={wrappedCardDataUrl} alt="Your recap card" className="w-full h-80 object-contain mx-auto" />
            </div>
          )}
          <Button variant="primary" size="lg" full onClick={() => handleShareCard(wrappedCardDataUrl)}>
            <IconShare size={16} />
            Share Recap to Story / WhatsApp
          </Button>
        </div>
      </Modal>

      {tab === 'quest' ? (
        <div className="w-full max-w-md flex flex-col items-center justify-center my-auto space-y-4">
          {/* Track choice. Each side now says what it actually does -- "Quest"
              and "Explore" alone never explained the difference. */}
          <div className="flex bg-white p-1.5 rounded-[1.25rem] border border-[#e7e0d8] w-full gap-1.5 shadow-[0_1px_2px_rgba(68,64,60,0.04),0_4px_16px_rgba(68,64,60,0.06)]">
            <button
              onClick={handleSelectQuestTrack}
              aria-pressed={!isExplorerMode}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-[0.875rem] transition-all active:scale-[0.98] ${
                !isExplorerMode
                  ? 'bg-orange-600 text-white shadow-[0_2px_0_0_#9A3412]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <span className="flex items-center gap-1.5 font-display text-[0.9375rem] font-bold leading-none">
                <IconTarget size={16} />
                Quest
              </span>
              <span className={`text-[0.6875rem] font-medium ${!isExplorerMode ? 'text-white' : 'text-stone-600'}`}>
                Random dare
              </span>
            </button>
            <button
              onClick={handleSelectExplorer}
              aria-pressed={isExplorerMode}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-[0.875rem] transition-all active:scale-[0.98] ${
                isExplorerMode
                  ? 'bg-amber-500 text-stone-900 shadow-[0_2px_0_0_#B45309]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <span className="flex items-center gap-1.5 font-display text-[0.9375rem] font-bold leading-none">
                <IconCompass size={16} />
                Explore
              </span>
              <span className={`text-[0.6875rem] font-medium ${isExplorerMode ? 'text-amber-950' : 'text-stone-600'}`}>
                Hidden gems
              </span>
            </button>
          </div>

          {/* Deliberately lighter-weight than the Quest/Explore choice above --
              this is a refinement of that choice, not a second equal decision. */}
          <div className="flex items-center justify-center gap-1" role="group" aria-label="Party size">
            {(['solo', 'duo', 'squad'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSelectMode(m)}
                aria-pressed={mode === m}
                className={`px-3.5 py-1.5 text-[0.8125rem] font-bold rounded-full capitalize transition-all active:scale-95 ${
                  mode === m
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-white'
                }`}
              >
                {m === 'squad' ? 'Squad (2-8)' : m}
              </button>
            ))}
          </div>

          {isExplorerMode && !activeQuest && !isCompleted && (
            <div className="w-full card card-lift p-5 space-y-4 a-rise">
              <div className="text-center space-y-1">
                <span
                  aria-hidden="true"
                  className="inline-flex w-11 h-11 rounded-full bg-amber-100 text-amber-700 items-center justify-center"
                >
                  <IconCompass size={22} />
                </span>
                <p className="text-[0.875rem] text-stone-700 leading-relaxed pt-1">
                  Pick a neighborhood to discover a hidden gem someone local actually knows about.
                </p>
              </div>

              <div className="space-y-2">
                <SectionLabel>Neighborhood</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {MUMBAI_NEIGHBORHOODS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setSelectedNeighborhood(n)}
                      disabled={isSearching}
                      aria-pressed={selectedNeighborhood === n}
                      className={`px-2.5 py-1.5 rounded-full text-[0.75rem] font-semibold border transition-all disabled:opacity-40 ${
                        selectedNeighborhood === n
                          ? 'bg-amber-500 text-stone-900 border-amber-500'
                          : 'bg-white text-stone-600 border-[#e7e0d8] hover:border-amber-300 hover:text-stone-900'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onStartMatchingClick}
                disabled={!selectedNeighborhood || isSearching}
                className="btn btn-reward w-full text-[0.9375rem] py-3.5"
              >
                {isSearching ? (
                  <>
                    <IconSearch size={16} className="animate-spin" />
                    {squadRoster.length > 0
                      ? `LOBBY (${squadRoster.length}/${squadCapacity})`
                      : `SEARCHING ${selectedNeighborhood?.toUpperCase()}...`}
                  </>
                ) : !selectedNeighborhood ? (
                  'Pick a neighborhood first'
                ) : (
                  <>
                    <IconGem size={16} />
                    Reveal a Hidden Gem
                  </>
                )}
              </button>

              {!isSearching && (
                <button
                  onClick={() => setShowSuggestGemModal(true)}
                  className="w-full text-[0.8125rem] text-stone-500 hover:text-stone-900 font-semibold underline decoration-stone-300 underline-offset-2"
                >
                  Know a spot? Suggest your own hidden gem
                </button>
              )}
            </div>
          )}

          {!activeQuest && !isCompleted && !isExplorerMode && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="relative flex items-center justify-center">
                {/* Two soft rings behind the button give it somewhere to sit.
                    The outer one breathes slowly so the idle screen isn't
                    completely static, and stops entirely under
                    prefers-reduced-motion. */}
                <div
                  aria-hidden="true"
                  className="absolute w-[19rem] h-[19rem] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.16)_0%,rgba(234,88,12,0)_68%)] pointer-events-none a-breathe"
                />
                <div
                  aria-hidden="true"
                  className="absolute w-64 h-64 rounded-full border border-orange-200/70 pointer-events-none"
                />

                <button
                  onClick={onStartMatchingClick}
                  disabled={isSearching}
                  aria-label={isSearching ? 'Searching for a mission' : 'Destroy boredom — get a random mission'}
                  className={`relative w-56 h-56 rounded-full bg-gradient-to-b from-orange-600 to-orange-800 flex flex-col items-center justify-center text-white overflow-hidden touch-manipulation transition-transform duration-100 ring-[6px] ring-white shadow-[0_10px_0_0_#7C2D12,0_24px_48px_rgba(194,65,12,0.35)] ${
                    isSearching
                      ? 'opacity-90 cursor-wait'
                      : 'hover:scale-[1.03] active:translate-y-[6px] active:shadow-[0_4px_0_0_#7C2D12,0_12px_24px_rgba(194,65,12,0.3)]'
                  }`}
                >
                  {/* Gloss highlight. */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-8 left-6 w-32 h-20 rounded-full bg-white/20 rotate-[-20deg] pointer-events-none"
                  />
                  {isSearching ? (
                    <span className="flex flex-col items-center gap-2">
                      <IconSearch size={26} className="animate-spin" />
                      <span className="nums text-[0.75rem] text-white font-semibold tracking-wide">
                        {squadRoster.length > 0
                          ? `LOBBY ${squadRoster.length}/${squadCapacity}`
                          : 'SEARCHING...'}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="font-display font-bold text-[2rem] leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(120,40,0,0.35)]">
                        DESTROY
                      </span>
                      <span className="font-display font-bold text-[1.25rem] text-white mt-1.5 tracking-[0.1em] line-through decoration-2 decoration-white/70">
                        BOREDOM
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center space-y-3 max-w-xs">
                <p className="text-[0.875rem] text-stone-600 leading-relaxed">
                  {isSearching
                    ? `Searching the live queue for Mumbai ${mode.toUpperCase()} partners...`
                    : 'Tap to trigger a random real-world micro-mission.'}
                </p>

                {isSearching && (
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="primary" onClick={handleWhatsAppInvite}>
                      <IconWhatsApp size={15} />
                      Invite a Friend on WhatsApp
                    </Button>
                    <button
                      onClick={cancelSearch}
                      className="text-[0.8125rem] text-stone-500 hover:text-stone-800 hover:underline"
                    >
                      Cancel search
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeQuest && !isCompleted && (
            <div className="w-full card card-lift p-5 space-y-4 a-rise">
              <div className="flex justify-between items-center gap-2">
                <Chip tone="action" className="uppercase tracking-wide">
                  {isExplorerMode ? 'Explorer' : mode} Mission Assigned
                </Chip>
                <span className="flex items-center gap-1.5 text-[0.6875rem] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold whitespace-nowrap">
                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {squadRoster.length > 0 && (
                <div className="bg-[#faf7f3] border border-[#e7e0d8] p-3 rounded-[0.875rem] text-left space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <SectionLabel className="flex items-center gap-1.5">
                      <IconCrown size={13} className="text-amber-600" />
                      Squad roster ({squadRoster.length})
                    </SectionLabel>
                    <span className="text-[0.6875rem] text-emerald-700 font-semibold">Live lobby</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {squadRoster.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white border border-[#e7e0d8] pl-2.5 pr-1.5 py-1 rounded-full">
                        <button
                          onClick={() => inspectProfile(p.handle)}
                          className="text-[0.8125rem] text-orange-700 font-bold hover:underline"
                        >
                          @{p.handle}
                        </button>
                        {p.user_id !== currentUserId && (
                          <button
                            onClick={() => handleAddFriend(p.user_id)}
                            className="text-stone-500 hover:text-orange-700 p-0.5 rounded-full transition"
                            title={`Add @${p.handle} as a friend`}
                          >
                            <IconUserPlus size={14} />
                            <span className="sr-only">Add @{p.handle} as a friend</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="my-4 flex justify-center">
                <SuspenseMissionCard
                  nested
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
                <div className="bg-[#faf7f3] border border-[#e7e0d8] rounded-[1rem] p-3 flex flex-col gap-2.5 text-left">
                  <div className="flex justify-between items-center gap-2 border-b border-[#e7e0d8] pb-2">
                    <SectionLabel className="flex items-center gap-1.5">
                      <IconChat size={13} className="text-orange-600" />
                      Live {mode} rally chat
                    </SectionLabel>
                    <button
                      onClick={handleWhatsAppInvite}
                      className="btn btn-secondary text-[0.75rem] px-2.5 py-1"
                    >
                      <IconWhatsApp size={13} />
                      Invite
                    </button>
                  </div>

                  <div className="h-32 overflow-y-auto scroll-soft space-y-1.5 pr-1">
                    {messages.length === 0 ? (
                      <p className="text-[0.8125rem] text-stone-500 py-4 text-center">
                        No messages yet. Coordinate your rally point.
                      </p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id || Math.random()}
                          className="bg-white p-2.5 rounded-[0.75rem] border border-[#e7e0d8] flex justify-between items-start gap-2"
                        >
                          <div className="min-w-0">
                            <button
                              onClick={() => inspectProfile(m.sender_handle)}
                              className="text-[0.6875rem] font-bold text-orange-700 hover:underline"
                            >
                              @{m.sender_handle}
                            </button>
                            <span className="block text-[0.8125rem] text-stone-800 leading-snug break-words">
                              {m.message}
                            </span>
                          </div>
                          {m.sender_handle !== handle && (
                            <button
                              onClick={() => handleReport('chat', m.id || m.message)}
                              className="shrink-0 text-stone-500 hover:text-red-600 p-0.5 transition"
                              title="Report message"
                            >
                              <IconFlag size={13} />
                              <span className="sr-only">Report this message</span>
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
                      placeholder="Say something..."
                      maxLength={300}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className={`${inputClass} flex-1 !py-2 bg-white`}
                    />
                    <button onClick={sendMessage} className="btn btn-primary px-3 py-2" title="Send message">
                      <IconSend size={15} />
                      <span className="sr-only">Send</span>
                    </button>
                  </div>
                </div>
              )}

              {isMissionAccepted && (
                <div className="border-2 border-dashed border-[#e7e0d8] rounded-[1rem] p-3 flex flex-col items-center justify-center bg-[#faf7f3]/60">
                  {uploading ? (
                    <div className="py-5 flex flex-col items-center gap-2">
                      <IconCamera size={22} className="text-orange-600 animate-pulse" />
                      <span className="text-[0.8125rem] text-stone-700 font-semibold">
                        Compressing &amp; uploading...
                      </span>
                    </div>
                  ) : proofImage ? (
                    <div className="relative w-full">
                      <img src={proofImage} alt="Proof" className="w-full h-40 object-cover rounded-[0.75rem]" />
                      <span className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600 text-white text-[0.6875rem] font-bold px-2 py-1 rounded-full shadow">
                        <IconCheck size={12} />
                        Proof ready
                      </span>
                    </div>
                  ) : (
                    /* This label had no text at all before -- just a bare camera
                       emoji with an empty span under it. */
                    <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full py-4 text-center">
                      <span
                        aria-hidden="true"
                        className="w-11 h-11 rounded-full bg-white border border-[#e7e0d8] text-orange-600 flex items-center justify-center"
                      >
                        <IconCamera size={21} />
                      </span>
                      <span className="text-[0.875rem] text-stone-800 font-semibold">Tap to take your proof photo</span>
                      <span className="text-[0.6875rem] text-stone-500">Compressed to about 50KB before upload</span>
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

              <div className="flex flex-col gap-2 pt-1">
                {isMissionAccepted && (
                <button
                  onClick={handleCompleteMission}
                  disabled={uploading || !proofImage}
                  className="btn btn-primary w-full text-[0.875rem] py-3.5"
                >
                  {proofImage ? (
                    <>
                      <IconFlame size={16} />
                      <span>Complete &amp; Log Proof</span>
                    </>
                  ) : (
                    <>
                      <IconCamera size={16} />
                      <span>Take Photo Proof to Complete</span>
                    </>
                  )}
                </button>
                )}
                <button
                  onClick={handleAbandonMission}
                  className="text-[0.8125rem] text-stone-600 hover:text-stone-900 py-1.5 transition-colors"
                >
                  Abandon mission
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="a-pop w-full card card-lift border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-6 text-center space-y-4">
              <span
                aria-hidden="true"
                className="inline-flex w-14 h-14 rounded-full bg-amber-400 text-stone-900 items-center justify-center shadow-[0_3px_0_0_#B45309]"
              >
                <IconTrophy size={26} />
              </span>
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-bold text-stone-900">LOOP BROKEN!</h2>
                <p className="text-[0.875rem] text-stone-600">
                  You broke routine and gained real-world experience today.
                </p>
              </div>

              {/* Where the XP actually landed. Completing a mission used to give
                  no numeric feedback at all on this screen. */}
              <div className="bg-white/80 border border-[#e7e0d8] rounded-[1rem] p-3.5">
                <RankProgress totalXp={totalXp} />
              </div>

              {cardDataUrl && (
                <div className="space-y-3">
                  <div className="rounded-[1rem] overflow-hidden border border-[#e7e0d8] bg-[#faf7f3]">
                    <img src={cardDataUrl} alt="Your shareable mission card" className="w-full h-64 object-contain mx-auto" />
                  </div>

                  <Button variant="primary" size="lg" full onClick={() => handleShareCard(cardDataUrl)}>
                    <IconShare size={16} />
                    Share to Instagram Story / WhatsApp
                  </Button>
                </div>
              )}

              <Button variant="secondary" size="lg" full onClick={() => setIsCompleted(false)}>
                Back to Home
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md my-auto space-y-3">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="font-display text-base font-bold text-stone-900">Community Proof Feed</h2>
            <span className="nums text-[0.8125rem] text-stone-500">
              {feedItems.length} logged
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-[62vh] overflow-y-auto scroll-soft pr-1">
            {loadingFeed ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="card p-3 flex flex-col gap-3">
                  <div className="w-full h-48 skeleton rounded-[0.875rem]" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-24 skeleton rounded-full" />
                      <div className="h-3 w-8 skeleton rounded-full" />
                    </div>
                    <div className="h-3 w-full skeleton rounded-full" />
                    <div className="h-3 w-2/3 skeleton rounded-full" />
                  </div>
                </div>
              ))
            ) : feedItems.length > 0 ? (
              feedItems.map((item) => (
                <article key={item.id} className="card overflow-hidden">
                  {item.photo_url && (
                    <img
                      src={item.photo_url}
                      alt={`Proof photo for: ${item.quest_text}`}
                      loading="lazy"
                      className="w-full h-52 object-cover"
                    />
                  )}
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center gap-2">
                      <button
                        onClick={() => inspectProfile(item.handle)}
                        className="flex items-center gap-1.5 text-[0.875rem] font-bold text-orange-700 hover:underline min-w-0"
                      >
                        <span
                          aria-hidden="true"
                          className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"
                        >
                          <IconUser size={13} />
                        </span>
                        <span className="truncate">@{item.handle || 'Explorer'}</span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {userEmail === ADMIN_EMAIL && (
                          <button
                            onClick={() => handleAdminDeleteFeedPost(item.id)}
                            className="text-stone-500 hover:text-red-600 p-1 rounded transition"
                            title="Admin: delete post"
                          >
                            <IconTrash size={14} />
                            <span className="sr-only">Delete this post</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleReport('feed', item.id)}
                          className="text-stone-500 hover:text-red-600 p-1 rounded transition"
                          title="Report post"
                        >
                          <IconFlag size={14} />
                          <span className="sr-only">Report this post</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[0.875rem] text-stone-800 leading-snug">"{item.quest_text}"</p>

                    {/* The emoji here stay -- 🔥 and ✋ are the reactions
                        themselves, not UI chrome standing in for an icon. */}
                    <div className="flex gap-2 pt-2.5 border-t border-[#e7e0d8]">
                      <button
                        onClick={() => handleReact(item.id, 'fire')}
                        className="flex items-center gap-1.5 bg-[#faf7f3] hover:bg-orange-50 hover:border-orange-200 border border-[#e7e0d8] px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold text-stone-700 transition-all active:scale-95"
                      >
                        <span aria-hidden="true">🔥</span>
                        <span className="nums">{item.fire_count || 0}</span>
                        <span className="sr-only">fire reactions</span>
                      </button>
                      <button
                        onClick={() => handleReact(item.id, 'five')}
                        className="flex items-center gap-1.5 bg-[#faf7f3] hover:bg-orange-50 hover:border-orange-200 border border-[#e7e0d8] px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold text-stone-700 transition-all active:scale-95"
                      >
                        <span aria-hidden="true">✋</span>
                        <span className="nums">{item.five_count || 0}</span>
                        <span className="sr-only">high fives</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="text-center py-12 space-y-3">
                <span className="inline-flex w-14 h-14 rounded-full bg-stone-100 text-stone-500 items-center justify-center">
                  <IconInbox size={26} />
                </span>
                <div className="space-y-1">
                  <h3 className="font-display text-[0.9375rem] font-bold text-stone-900">No missions logged yet</h3>
                  <p className="text-[0.8125rem] text-stone-600 max-w-[240px] mx-auto leading-relaxed">
                    Be the first to complete one and show up here.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setTab('quest')}>
                  Start a mission
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The profile card. This was previously a single flat stack doing five
          unrelated jobs -- identity, badges, stats, auth CTA and legal links --
          with no hierarchy between them. It now reads top to bottom: who you
          are, how far along you are, what you've done, what you've unlocked. */}
      <footer className="w-full max-w-md card card-lift p-4 flex flex-col gap-3.5 mt-auto">
        <div className="flex justify-between items-center gap-2">
          {isEditingHandle ? (
            <input
              type="text"
              defaultValue={handle}
              onBlur={(e) => saveHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveHandle(e.currentTarget.value)}
              autoFocus
              maxLength={20}
              aria-label="Your handle"
              className="bg-[#faf7f3] border border-orange-400 rounded-[0.5rem] px-2 py-1 text-[0.875rem] text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-w-0 flex-1"
            />
          ) : (
            <button
              onClick={() => setIsEditingHandle(true)}
              className="flex items-center gap-1.5 min-w-0 group"
              title="Edit your handle"
            >
              <span className="text-[0.9375rem] font-bold text-orange-700 truncate">@{handle}</span>
              <IconPencil size={13} className="text-stone-500 group-hover:text-stone-900 shrink-0 transition" />
            </button>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowFriendsModal(true)}
              className="icon-btn !w-8 !h-8"
              title={`Squad (${friendsList.length})`}
            >
              <IconUsers size={16} />
              <span className="sr-only">Squad ({friendsList.length})</span>
            </button>
            <button
              onClick={generateSpotifyWrappedCard}
              className="icon-btn !w-8 !h-8"
              title="Your IRL recap"
            >
              <IconHeadphones size={16} />
              <span className="sr-only">Recap</span>
            </button>
            <button
              onClick={() => {
                setSuggestQuestMode(mode);
                setShowSuggestQuestModal(true);
              }}
              className="icon-btn !w-8 !h-8"
              title="Suggest a quest"
            >
              <IconPencil size={16} />
              <span className="sr-only">Suggest Quest</span>
            </button>
            {userEmail && userEmail !== 'guest@breaktheloop.app' ? (
              <button
                onClick={handleSignOut}
                className="text-[0.75rem] text-stone-500 hover:text-stone-900 hover:underline font-semibold px-1.5"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalReason('');
                  setShowAuthModal(true);
                }}
                className="text-[0.75rem] text-orange-700 hover:underline font-semibold px-1.5"
              >
                Verify
              </button>
            )}
          </div>
        </div>

        {/* Progression. The app tracked XP and five rank tiers but never showed
            how close you were to the next one. */}
        <RankProgress totalXp={totalXp} showXp={false} />

        {/* These three were previously two stats, one of which was wrong: the
            footer printed time_saved_mins under a "Total IRL XP" label, so the
            number shown had nothing to do with the rank beside it. */}
        <div className="flex justify-around items-center border-t border-[#e7e0d8] pt-3">
          <Stat
            label="Streak"
            value={streak}
            suffix={streak === 1 ? 'day' : 'days'}
            icon={<IconFlame size={12} />}
            tone="action"
          />
          <div className="w-px h-8 bg-[#e7e0d8]" />
          <Stat
            label="Total XP"
            value={totalXp.toLocaleString()}
            icon={<IconBolt size={12} />}
            tone="reward"
          />
          <div className="w-px h-8 bg-[#e7e0d8]" />
          <Stat
            label="Saved"
            value={savedMins}
            suffix="min"
            icon={<IconClock size={12} />}
          />
        </div>

        {badges.length > 0 && (
          <div className="space-y-1.5 border-t border-[#e7e0d8] pt-3">
            <SectionLabel>Badges</SectionLabel>
            <div className="flex items-center gap-1.5 overflow-x-auto scroll-soft pb-1">
              {badges.map((b, i) => (
                <Chip key={i} tone="reward">{b}</Chip>
              ))}
            </div>
          </div>
        )}

        {(!userEmail || userEmail === 'guest@breaktheloop.app') && (
          <div className="flex flex-col items-center gap-2 border-t border-[#e7e0d8] pt-3">
            <Button variant="secondary" full onClick={() => setShowSaveProgressModal(true)}>
              <IconSave size={15} />
              Save My Progress
            </Button>
            <button
              onClick={() => setShowRecoverModal(true)}
              className="text-[0.75rem] text-stone-500 hover:text-stone-800 hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 border-t border-[#e7e0d8] pt-3">
          <Link href="/privacy" className="text-[0.75rem] text-stone-500 hover:text-stone-800 hover:underline">
            Privacy
          </Link>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <Link href="/terms" className="text-[0.75rem] text-stone-500 hover:text-stone-800 hover:underline">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
