import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  Users, Plus, TrendingDown, Trash2, X, ArrowLeft,
  UserPlus, Copy, Check, Share2, Link2, DollarSign, Settings2, Edit2, LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { calculateSettlements } from '../lib/financeUtils';

import { EXPENSE_CATEGORIES as CATEGORIES } from '../lib/categories';

// WhatsApp SVG icon (inline, no dependency needed)
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function GroupRoom() {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup]               = useState(null);
  const [expenses, setExpenses]         = useState([]);
  const [members, setMembers]           = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading]           = useState(true);
  const [isMember, setIsMember]         = useState(false);
  const [settlementData, setSettlementData] = useState(null);

  // Add-expense modal
  const [showModal, setShowModal]       = useState(false);
  const [amount, setAmount]             = useState('');
  const [description, setDescription]  = useState('');
  const [category, setCategory]         = useState(CATEGORIES[0]);
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [formLoading, setFormLoading]   = useState(false);
  const [formMsg, setFormMsg]           = useState({ type: '', text: '' });

  // Split logic
  const [isSplit, setIsSplit]           = useState(false);
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]); // Array of user IDs

  // Group Settings
  const [showSettings, setShowSettings] = useState(false);
  const [editGroupInfo, setEditGroupInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Invite panel
  const [showInvite, setShowInvite]         = useState(false);
  const [inviteLink, setInviteLink]         = useState('');
  const [inviteLoading, setInviteLoading]   = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [existingInvites, setExistingInvites] = useState([]);

  // ── Load group data ───────────────────────────────────────
  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setLoading(true);

    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!g) { navigate('/'); return; }
    setGroup(g);

    const { data: membership } = await supabase
      .from('group_members').select('id')
      .eq('group_id', groupId).eq('user_id', user.id).single();
    setIsMember(!!membership);

    const { data: mems } = await supabase
      .from('group_members').select('*').eq('group_id', groupId);
    setMembers(mems || []);

    if (mems?.length > 0) {
      const ids = mems.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      const map = {};
      profiles?.forEach(p => { 
        map[p.id] = p.full_name || p.email?.split('@')[0] || 'Member'; 
      });
      setMemberProfiles(map);
    }

    const { data: exp } = await supabase
      .from('group_expenses').select('*')
      .eq('group_id', groupId).order('date', { ascending: false });
    const expensesList = exp || [];
    setExpenses(expensesList);

    // Calculate settlements
    if (mems && expensesList.length > 0) {
      const settle = calculateSettlements(mems, expensesList);
      setSettlementData(settle);
    } else {
      setSettlementData(null);
    }

    setLoading(false);
  }, [user, groupId, navigate]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  // ── Real-time expense updates ─────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(`grp-exp-${groupId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_expenses', filter: `group_id=eq.${groupId}` },
        () => fetchGroupData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [groupId, fetchGroupData]);

  // ── Load pending invites for this group ───────────────────
  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from('invites').select('id, token, email, status')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    setExistingInvites(data || []);
  }, [groupId]);

  useEffect(() => { if (isMember) loadInvites(); }, [isMember, loadInvites]);

  // ── Generate invite link (open — no email needed) ─────────
  const generateInviteLink = async () => {
    setInviteLoading(true);
    try {
      const { data, error } = await supabase
        .from('invites')
        .insert([{ group_id: groupId, created_by: user.id }])  // email is null → open invite
        .select('token').single();
      if (error) throw error;
      const link = `${window.location.origin}/invite?token=${data.token}`;
      setInviteLink(link);
      toast.success('Invite link generated!');
      await loadInvites();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Copy link ─────────────────────────────────────────────
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Share on WhatsApp ─────────────────────────────────────
  const shareWhatsApp = (link) => {
    const text = `Hey! Join our group "${group?.name}" on SpendSmart to track expenses together 💰\n\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Share via Web Share API (native on mobile) ────────────
  const shareNative = async (link) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${group?.name}" on SpendSmart`,
          text: `Track expenses together with me on SpendSmart!`,
          url: link,
        });
      } catch {}
    } else {
      copyLink(link);
    }
  };

  // ── Delete own expense ────────────────────────────────────
  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    const { error } = await supabase.from('group_expenses').delete().eq('id', id).eq('added_by', user.id);
    if (error) {
      toast.error('Failed to delete expense');
    } else {
      toast.success('Expense deleted');
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // ── Add expense ───────────────────────────────────────────
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg({ type: '', text: '' });
    try {
      const { error } = await supabase.from('group_expenses').insert([{
        group_id: groupId, added_by: user.id,
        amount: parseFloat(amount), description, category, date,
        is_split: isSplit,
        split_members: isSplit ? selectedSplitMembers : [],
      }]);
      if (error) throw error;
      toast.success('Expense added!');
      setAmount(''); setDescription(''); setCategory(CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setIsSplit(false);
      setSelectedSplitMembers([]);
      setShowModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Leave Group ───────────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    // Check if user is the creator (creator should use Admin Panel to delete)
    if (group?.created_by === user.id) {
      return toast.error('As the creator, you must delete the group from the Admin Panel to leave.');
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('You left the group');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Update Group Info (Admin) ─────────────────────────────
  const handleUpdateGroupInfo = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: editName.trim(), description: editDesc.trim() })
        .eq('id', groupId)
        .eq('created_by', user.id); // Extra safety, though UI handles this

      if (error) throw error;
      toast.success('Group updated');
      setGroup({ ...group, name: editName.trim(), description: editDesc.trim() });
      setEditGroupInfo(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Remove Member (Admin) ─────────────────────────────────
  const handleRemoveMember = async (memberUserId) => {
    if (!confirm('Remove this member from the group?')) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberUserId);

      if (error) throw error;
      toast.success('Member removed');
      setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
      
      // Cleanup any split expenses related to this member if needed, 
      // but usually the DB schema or foreign keys should handle or leave them as is.
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const myTotal    = expenses.filter(e => e.added_by === user?.id).reduce((s, e) => s + parseFloat(e.amount), 0);
  const groupTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin text-primary"><Users size={32} /></div>
    </div>
  );

  if (!isMember) return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <Users size={48} className="text-muted opacity-30" />
      <h2 className="text-xl font-bold">Not a Member</h2>
      <p className="text-muted text-sm">You need an invite link to join this group.</p>
      <button onClick={() => navigate('/')} className="text-primary text-sm">← Back to Home</button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 animate-slide-up">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-surface hover:bg-white/10 transition-colors mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div 
          className="flex-1 min-w-0 cursor-pointer group"
          onClick={() => setShowSettings(true)}
        >
          <h1 className="text-2xl font-bold truncate group-hover:text-primary transition-colors">{group?.name}</h1>
          <p className="text-muted text-sm mt-0.5 truncate flex items-center gap-1">
            {members.length} members <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-2">Tap for group info</span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 p-2.5 bg-surface border border-white/10 text-text rounded-xl hover:bg-white/10 transition-colors"
            title="Group Info"
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={() => { setShowModal(true); setFormMsg({ type: '', text: '' }); }}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2.5 sm:px-4 rounded-xl font-medium text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass p-4 rounded-2xl">
          <p className="text-[10px] text-muted uppercase tracking-wider">Group Total</p>
          <p className="text-xl font-bold mt-1">{fmt(groupTotal)}</p>
          <p className="text-xs text-muted mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass p-4 rounded-2xl">
          <p className="text-[10px] text-muted uppercase tracking-wider">My Status</p>
          {settlementData ? (
            <>
              <p className={`text-xl font-bold mt-1 ${settlementData.balances[user.id] >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {fmt(Math.abs(settlementData.balances[user.id] || 0))}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {settlementData.balances[user.id] >= 0 ? 'You are owed' : 'You owe money'}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mt-1 text-primary">{fmt(myTotal)}</p>
              <p className="text-xs text-muted mt-0.5">My contribution</p>
            </>
          )}
        </div>
      </div>

      {/* ── Settlement breakdown ────────────────────────────── */}
      {settlementData && settlementData.settlements.length > 0 && (
        <div className="glass p-4 rounded-2xl bg-white/[0.02] animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Settlement Plan</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">OPTIMIZED</span>
          </div>
          <div className="space-y-2">
            {settlementData.settlements.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={s.from === user.id ? 'text-red-400 font-bold' : ''}>
                    {s.from === user.id ? 'You' : (memberProfiles[s.from] || 'Member')}
                  </span>
                  <span className="text-muted text-[10px]">owes</span>
                  <span className={s.to === user.id ? 'text-primary font-bold' : ''}>
                    {s.to === user.id ? 'You' : (memberProfiles[s.to] || 'Member')}
                  </span>
                </div>
                <span className="font-bold">{fmt(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expenses list ──────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider">All Expenses</h3>
        </div>
        {expenses.length === 0 ? (
          <EmptyState 
            icon={DollarSign}
            title="No group expenses"
            message="No one has added any expenses to this group yet. Start the tracking!"
            actionLabel="Add Expense"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map(exp => {
              const isOwn = exp.added_by === user?.id;
              return (
                <div key={exp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors group">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${isOwn ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-400'}`}>
                    <TrendingDown size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{exp.description || exp.category}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isOwn ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                        Paid by {isOwn ? 'You' : (memberProfiles[exp.added_by] || 'Member')}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {exp.category} · {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      {exp.is_split && (
                        <span className="ml-2 px-1.5 py-0.5 bg-white/5 text-muted rounded text-[10px] font-medium">
                          Split among {exp.split_members?.length || members.length}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold">{fmt(exp.amount)}</span>
                    {isOwn && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                        title="Delete Expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          INVITE PANEL MODAL
      ════════════════════════════════════════════════════ */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">Invite to Group</h2>
                <p className="text-xs text-muted mt-0.5">Anyone with the link can join</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-full hover:bg-surface text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Generate button */}
              {!inviteLink ? (
                <button
                  onClick={generateInviteLink}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
                >
                  <Link2 size={18} />
                  {inviteLoading ? 'Generating…' : 'Generate Invite Link'}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Link box */}
                  <div className="flex items-center gap-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3">
                    <span className="flex-1 text-xs text-muted truncate">{inviteLink}</span>
                    <button
                      onClick={() => copyLink(inviteLink)}
                      className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-muted hover:text-primary transition-colors flex-shrink-0"
                    >
                      {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>
                  </div>

                  {/* Share buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* WhatsApp */}
                    <button
                      onClick={() => shareWhatsApp(inviteLink)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors font-medium text-xs"
                    >
                      <WhatsAppIcon />
                      WhatsApp
                    </button>

                    {/* Copy */}
                    <button
                      onClick={() => copyLink(inviteLink)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-surface hover:bg-white/10 transition-colors text-muted text-xs font-medium"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>

                    {/* Native Share */}
                    <button
                      onClick={() => shareNative(inviteLink)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-surface hover:bg-white/10 transition-colors text-muted text-xs font-medium"
                    >
                      <Share2 size={16} />
                      More
                    </button>
                  </div>

                  <p className="text-center text-xs text-muted">
                    This link is valid until someone accepts it.<br />
                    New users will sign up and auto-join this group.
                  </p>

                  <button
                    onClick={generateInviteLink}
                    disabled={inviteLoading}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-sm text-muted hover:bg-surface transition-colors"
                  >
                    Generate Another Link
                  </button>
                </div>
              )}

              {/* Recent pending invites */}
              {existingInvites.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Recent Pending Links</p>
                  <div className="space-y-2">
                    {existingInvites.map(inv => {
                      const link = `${window.location.origin}/invite?token=${inv.token}`;
                      return (
                        <div key={inv.id} className="flex items-center gap-2 bg-surface/50 rounded-xl px-3 py-2">
                          <Link2 size={13} className="text-muted flex-shrink-0" />
                          <span className="text-xs text-muted flex-1 truncate">{link}</span>
                          <button onClick={() => shareWhatsApp(link)} className="p-1.5 text-[#25d366] hover:bg-[#25d366]/10 rounded-lg flex-shrink-0 transition-colors">
                            <WhatsAppIcon />
                          </button>
                          <button onClick={() => copyLink(link)} className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg flex-shrink-0 transition-colors">
                            <Copy size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          ADD EXPENSE MODAL
      ════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Add Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-surface text-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">

              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                  <input type="number" step="0.01" min="0.01" required
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {category !== 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Electricity bill"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Show purpose text box only when 'Other' is selected */}
                {category === 'Other' && (
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 mt-2"
                    placeholder="Specify other category… (optional)"
                    maxLength={100}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Date</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Split Expense Option */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={isSplit} onChange={e => {
                      setIsSplit(e.target.checked);
                      if (e.target.checked && selectedSplitMembers.length === 0) {
                        setSelectedSplitMembers(members.map(m => m.user_id));
                      }
                    }} className="sr-only peer" />
                    <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-medium text-text">Split this expense</span>
                </label>

                {isSplit && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    <p className="text-[10px] text-muted uppercase tracking-wider font-bold">Split with:</p>
                    <div className="flex flex-wrap gap-2">
                      {members.map(m => {
                        const isSelected = selectedSplitMembers.includes(m.user_id);
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedSplitMembers.length > 1) {
                                  setSelectedSplitMembers(prev => prev.filter(id => id !== m.user_id));
                                } else {
                                  toast.error("At least one person must be selected");
                                }
                              } else {
                                setSelectedSplitMembers(prev => [...prev, m.user_id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                              isSelected 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-surface text-muted border border-white/5'
                            }`}
                          >
                            {memberProfiles[m.user_id] || 'Member'}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted italic mt-1">
                      Each person pays: {fmt(parseFloat(amount || 0) / selectedSplitMembers.length)}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors">
                  {formLoading ? 'Adding…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings Modal (WhatsApp Style) ────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings2 className="text-primary" size={24} />
                Group Info
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-white/10 text-muted transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-6">
              
              {/* Info Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editGroupInfo ? (
                      <form onSubmit={handleUpdateGroupInfo} className="space-y-3">
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50 text-xl font-bold"
                          placeholder="Group Subject"
                        />
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50 text-sm min-h-[80px]"
                          placeholder="Group Description"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditGroupInfo(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 transition-colors">Save</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-text break-words pr-2">{group?.name}</h3>
                        <p className="text-sm text-muted mt-1 break-words">{group?.description || 'No description provided.'}</p>
                        <p className="text-xs text-muted mt-3">Created by {memberProfiles[group?.created_by] || 'Unknown'}</p>
                      </>
                    )}
                  </div>
                  {!editGroupInfo && group?.created_by === user?.id && (
                    <button 
                      onClick={() => {
                        setEditName(group?.name || '');
                        setEditDesc(group?.description || '');
                        setEditGroupInfo(true);
                      }}
                      className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      title="Edit Group Info"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Members List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-muted uppercase tracking-wider">{members.length} Participants</h4>
                </div>
                
                {/* Invite Button inline here like WhatsApp */}
                <button 
                  onClick={() => { setShowSettings(false); setShowInvite(true); setInviteLink(''); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-dashed border-white/10 group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <UserPlus size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-text">Add Participants</span>
                    <span className="block text-xs text-muted">Invite via link</span>
                  </div>
                </button>

                {members.map(m => {
                  const isMe = m.user_id === user?.id;
                  const isAdmin = m.user_id === group?.created_by;
                  const currentUserIsAdmin = group?.created_by === user?.id;

                  return (
                    <div key={m.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group/member">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface border border-white/5 flex items-center justify-center font-bold text-lg text-primary shadow-inner">
                          {(memberProfiles[m.user_id] || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-text">
                            {isMe ? 'You' : (memberProfiles[m.user_id] || 'Member')}
                          </span>
                          <span className="text-[10px] text-muted">
                            {isAdmin ? 'Group Admin' : 'Participant'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Remove Button (Only for Admin, and not for themselves) */}
                      {currentUserIsAdmin && !isMe && (
                        <button 
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
                          title="Remove Participant"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Leave Action */}
              <div className="pt-2">
                {group?.created_by !== user?.id ? (
                  <button
                    onClick={() => { setShowSettings(false); handleLeaveGroup(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="font-semibold">Exit Group</span>
                  </button>
                ) : (
                  <p className="text-xs text-center text-muted italic p-2">As the group creator, you cannot exit the group. You can only remove participants.</p>
                )}
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
