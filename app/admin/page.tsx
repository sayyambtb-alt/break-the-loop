"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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

const MUMBAI_NEIGHBORHOODS = [
  'Colaba', 'Fort', 'Marine Drive', 'Dadar', 'Matunga', 'Mahim', 'Wadala', 'Sewri',
  'Bandra', 'Worli', 'Andheri', 'Juhu', 'Powai', 'Borivali'
];

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

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Reports / pending quests / pending gems moved here verbatim from
// app/page.tsx -- same handlers, same RPCs, same modal content -- so this
// admin-only surface no longer ships inside the player bundle/header.
export default function AdminPage() {
  const [checked, setChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = React.useRef(0);
  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const [showReportsModal, setShowReportsModal] = useState(false);
  const [adminReports, setAdminReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [showPendingQuestsModal, setShowPendingQuestsModal] = useState(false);
  const [pendingQuests, setPendingQuests] = useState<PendingQuest[]>([]);
  const [loadingPendingQuests, setLoadingPendingQuests] = useState(false);

  const [showPendingGemsModal, setShowPendingGemsModal] = useState(false);
  const [pendingGems, setPendingGems] = useState<PendingGem[]>([]);
  const [dirtyGemIds, setDirtyGemIds] = useState<string[]>([]);
  const [savedGemIds, setSavedGemIds] = useState<string[]>([]);
  const [pendingGemCount, setPendingGemCount] = useState<number>(0);
  const [loadingPendingGems, setLoadingPendingGems] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (userEmail !== ADMIN_EMAIL) return;
    (async () => {
      const { data } = await supabase.rpc('admin_get_pending_gem_count');
      if (typeof data === 'number') setPendingGemCount(data);
    })();
  }, [userEmail]);

  const fetchAdminReports = async () => {
    setLoadingReports(true);
    try {
      const { data } = await supabase.rpc('admin_get_reports');
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

  const handleAdminDeleteFeedPost = async (logId: string) => {
    if (!window.confirm('ADMIN: Are you sure you want to permanently remove this post from the community feed?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_feed_post', { p_log_id: logId });
      if (!error) showToast('Post removed successfully.', 'success');
      else showToast(`Failed to delete post: ${error.message}`, 'error');
    } catch {
    }
  };

  const handleAdminDeleteChatMessage = async (messageId: string) => {
    if (!window.confirm('ADMIN: Are you sure you want to permanently remove this chat message?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_chat_message', { p_message_id: messageId });
      if (!error) showToast('Message removed successfully.', 'success');
      else showToast(`Failed to delete message: ${error.message}`, 'error');
    } catch {
    }
  };

  const fetchPendingQuests = async () => {
    setLoadingPendingQuests(true);
    try {
      const { data } = await supabase.rpc('admin_get_pending_quests');
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

  const fetchPendingGems = async () => {
    setLoadingPendingGems(true);
    try {
      const { data } = await supabase.rpc('admin_get_all_gems');
      if (data) {
        setPendingGems(data);
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
    setDirtyGemIds((prev) => (prev.includes(gemId) ? prev : [...prev, gemId]));
    setSavedGemIds((prev) => prev.filter((id) => id !== gemId));
  };

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
    setPendingGems((prev) => prev.map((g) => (g.id === gem.id ? { ...g, status: 'approved', is_active: true } : g)));
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
    setSavedGemIds((prev) => (prev.includes(gem.id) ? prev : [...prev, gem.id]));
    showToast(`Saved — "${gem.name}" now lives in ${gem.neighborhood}.`, 'success');
  };

  if (!checked) {
    return <main className="min-h-screen bg-paper grid place-items-center text-ink-muted text-sm">Loading…</main>;
  }

  if (userEmail !== ADMIN_EMAIL) {
    return (
      <main className="min-h-screen bg-paper grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display font-extrabold text-xl text-ink">Not authorized</h1>
          <p className="mt-2 text-sm text-ink-muted">Sign in as the admin account from the main app first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-5 py-6">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-11/12 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl border ${
              t.type === 'error' ? 'bg-ink text-white border-legendary/40' : 'bg-ink text-white border-ember/40'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <h1 className="font-display font-extrabold text-2xl">Admin console</h1>
      <p className="text-sm text-ink-muted mt-1">Reports, quest suggestions and hidden gems -- moderation only, off the player surface.</p>

      <div className="flex flex-wrap gap-2 mt-5">
        <button
          onClick={fetchAdminReports}
          className="bg-ember/10 border border-ember/30 text-ember px-3 py-1.5 rounded-xl text-xs font-bold"
        >
          🚩 Reports
        </button>
        <button
          onClick={fetchPendingQuests}
          className="bg-ember/10 border border-ember/30 text-ember px-3 py-1.5 rounded-xl text-xs font-bold"
        >
          📝 Quests
        </button>
        <button
          onClick={fetchPendingGems}
          className="relative bg-ember/10 border border-ember/30 text-ember px-3 py-1.5 rounded-xl text-xs font-bold"
        >
          🗺️ Gems
          {pendingGemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-ember text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {pendingGemCount}
            </span>
          )}
        </button>
      </div>

      {showReportsModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-ember/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-hairline pb-2">
              <h2 className="text-xs font-mono font-bold text-ember uppercase tracking-wider">
                Moderation Reports Queue ({adminReports.length})
              </h2>
              <button onClick={() => setShowReportsModal(false)} className="text-ink-muted hover:text-ink text-sm font-bold">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingReports ? (
                <p className="text-xs text-ink-muted text-center py-8">Loading...</p>
              ) : adminReports.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-8">Queue clear! Zero reported content.</p>
              ) : (
                adminReports.map((r) => (
                  <div key={r.id} className="bg-paper-deep p-3 rounded-2xl border border-hairline space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="text-ember font-bold">Flagged {r.reported_type.toUpperCase()}</span>
                      <span className="text-[9px] text-ink-muted font-mono">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-ink-body text-[11px]"><strong>Reason:</strong> "{r.reason}"</p>
                    {r.content_text && (
                      <p className="text-ink text-[11px] bg-card border border-hairline rounded-lg p-2">
                        <strong className="text-ember">Reported content:</strong> "{r.content_text}"
                      </p>
                    )}
                    {r.content_photo_url && (
                      <img src={r.content_photo_url} alt="Reported proof" className="w-full max-h-40 object-cover rounded-lg border border-hairline" />
                    )}
                    <p className="text-ink-muted text-[10px]">
                      Reported by @{r.reporter_handle}{r.offender_handle ? ` • Posted by @${r.offender_handle}` : ''}
                    </p>
                    <div className="flex space-x-2 pt-1 border-t border-hairline">
                      {r.reported_type === 'feed' && (
                        <button
                          onClick={() => { handleAdminDeleteFeedPost(r.target_id); handleResolveReport(r.id); }}
                          className="bg-legendary text-white text-[10px] px-3 py-1 rounded-lg font-bold"
                        >
                          Delete Post
                        </button>
                      )}
                      {r.reported_type === 'chat' && (
                        <button
                          onClick={() => { handleAdminDeleteChatMessage(r.target_id); handleResolveReport(r.id); }}
                          className="bg-legendary text-white text-[10px] px-3 py-1 rounded-lg font-bold"
                        >
                          Delete Message
                        </button>
                      )}
                      {r.offender_user_id && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`ADMIN: Permanently ban @${r.offender_handle || 'this user'}? They will be unable to start or join any match.`)) return;
                            const { data, error } = await supabase.rpc('admin_ban_user', { p_user_id: r.offender_user_id });
                            if (!error && data && data.success) showToast(`@${r.offender_handle || 'User'} has been banned.`, 'success');
                            else showToast('Failed to ban user.', 'error');
                          }}
                          className="bg-ink text-legendary text-[10px] px-3 py-1 rounded-lg font-bold border border-legendary/40"
                        >
                          Ban User
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="bg-paper-deep hover:bg-hairline-soft text-ink text-[10px] px-3 py-1 rounded-lg font-semibold"
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

      {showPendingQuestsModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-ember/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-hairline pb-2">
              <h2 className="text-xs font-mono font-bold text-ember uppercase tracking-wider">
                Pending Quest Suggestions ({pendingQuests.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button onClick={fetchPendingQuests} className="text-ink-muted hover:text-ink text-[10px] font-bold" title="Refresh">↻</button>
                <button onClick={() => setShowPendingQuestsModal(false)} className="text-ink-muted hover:text-ink text-sm font-bold">✕</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingPendingQuests ? (
                <p className="text-xs text-ink-muted text-center py-8">Loading...</p>
              ) : pendingQuests.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-8">No quests awaiting review.</p>
              ) : (
                pendingQuests.map((q) => (
                  <div key={q.id} className="bg-paper-deep p-3 rounded-2xl border border-hairline space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="bg-ember/10 text-ember text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{q.mode}</span>
                      <span className="text-[9px] text-ink-muted font-mono">{new Date(q.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-ink-body text-[11px]">"{q.quest_text}"</p>
                    <p className="text-ink-muted text-[10px]">Suggested by @{q.submitted_by_handle}</p>
                    <div className="flex space-x-2 pt-1 border-t border-hairline">
                      <button onClick={() => handleApproveQuest(q.id)} className="bg-ember text-white text-[10px] px-3 py-1 rounded-lg font-bold">Approve</button>
                      <button onClick={() => handleRejectQuest(q.id)} className="bg-paper-deep hover:bg-hairline-soft text-ink text-[10px] px-3 py-1 rounded-lg font-semibold">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPendingGemsModal && (
        <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-ember/40 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-center border-b border-hairline pb-2">
              <h2 className="text-xs font-mono font-bold text-ember uppercase tracking-wider">
                Manage Hidden Gems ({pendingGems.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button onClick={fetchPendingGems} className="text-ink-muted hover:text-ink text-[10px] font-bold" title="Refresh">↻</button>
                <button onClick={() => setShowPendingGemsModal(false)} className="text-ink-muted hover:text-ink text-sm font-bold">✕</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingPendingGems ? (
                <p className="text-xs text-ink-muted text-center py-8">Loading...</p>
              ) : pendingGems.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-8">No spots awaiting review.</p>
              ) : (
                pendingGems.map((g) => (
                  <div key={g.id} className="bg-paper-deep p-3 rounded-2xl border border-hairline space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={g.neighborhood}
                          onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, neighborhood: e.target.value } : item)); }}
                          className="bg-ember/10 text-ember text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-ember/20 focus:outline-none"
                        >
                          {MUMBAI_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n} className="bg-card text-ink normal-case">{n}</option>
                          ))}
                        </select>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${g.status === 'pending' ? 'bg-hairline-soft text-ink-muted' : 'bg-ember/10 text-ember'}`}>
                          {g.status === 'pending' ? 'Pending' : 'Live'}
                        </span>
                        {dirtyGemIds.includes(g.id) && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#FBE8A6] text-[#5A3D00]">Unsaved</span>
                        )}
                        {savedGemIds.includes(g.id) && !dirtyGemIds.includes(g.id) && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#CFF3DE] text-[#0F5132]">✓ Saved</span>
                        )}
                      </div>
                      <span className="text-[9px] text-ink-muted font-mono">{new Date(g.created_at).toLocaleTimeString()}</span>
                    </div>
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, name: e.target.value } : item)); }}
                      maxLength={100}
                      className="w-full bg-card border border-hairline rounded-lg px-2 py-1.5 text-ink text-[11px] font-bold focus:outline-none focus:border-ember"
                    />
                    <textarea
                      value={g.description}
                      onChange={(e) => { markGemDirty(g.id); setPendingGems((prev) => prev.map((item) => item.id === g.id ? { ...item, description: e.target.value } : item)); }}
                      maxLength={300}
                      rows={3}
                      className="w-full bg-card border border-hairline rounded-lg px-2 py-1.5 text-ink-body text-[11px] resize-none focus:outline-none focus:border-ember"
                    />
                    <p className="text-ink-muted text-[10px]">Suggested by @{g.submitted_by_handle}</p>
                    <div className="flex space-x-2 pt-1 border-t border-hairline">
                      {g.status === 'pending' ? (
                        <>
                          <button onClick={() => handleApproveGem(g)} className="bg-ember text-white text-[10px] px-3 py-1 rounded-lg font-bold">Approve</button>
                          <button onClick={() => handleRejectGem(g.id)} className="bg-paper-deep hover:bg-hairline-soft text-ink text-[10px] px-3 py-1 rounded-lg font-semibold">Reject</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateGem(g)}
                            disabled={!dirtyGemIds.includes(g.id)}
                            className={`text-[10px] px-3 py-1 rounded-lg font-bold ${dirtyGemIds.includes(g.id) ? 'bg-ember text-white' : 'bg-paper-deep text-ink-muted cursor-not-allowed'}`}
                          >
                            {dirtyGemIds.includes(g.id) ? 'Save Changes' : 'No Changes'}
                          </button>
                          <button
                            onClick={() => { if (window.confirm(`Permanently remove "${g.name}" from Explorer mode?`)) handleRejectGem(g.id); }}
                            className="bg-paper-deep hover:bg-hairline-soft text-ink text-[10px] px-3 py-1 rounded-lg font-semibold"
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
    </main>
  );
}
