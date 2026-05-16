import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import AddContributionModal from '../components/AddContributionModal';
import { groupExpenseSchema, calculatePoolStats } from '../lib/groupLedger';
import {
  Users, Plus, Trash2, X, ArrowLeft,
  UserPlus, Copy, Check, Share2, Link2, DollarSign, Settings2, Edit2, LogOut, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, Wallet, History, Info
} from 'lucide-react';


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
  const [contributions, setContributions] = useState([]);
  const [members, setMembers]           = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading]           = useState(true);
  const [isMember, setIsMember]         = useState(false);
  const [isManager, setIsManager]       = useState(false);


  // Add-expense modal
  const [showModal, setShowModal]       = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [editContribution, setEditContribution] = useState(null);
  const [amount, setAmount]             = useState('');
  const [description, setDescription]  = useState('');
  const [category, setCategory]         = useState(CATEGORIES[0]);
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState('personal_pocket');
  const [formLoading, setFormLoading]   = useState(false);
  const [formMsg, setFormMsg]           = useState({ type: '', text: '' });
  const [errors, setErrors]             = useState({});

  // Split logic
  const [isSplit, setIsSplit]           = useState(false);
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]); // Array of user IDs

  // Group Settings
  const [showSettings, setShowSettings] = useState(false);

  // Reporting stats
  const [dailyStats, setDailyStats] = useState({ total: 0, breakdown: {} });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, breakdown: {} });

  const [editGroupInfo, setEditGroupInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Pool stats
  const [poolStats, setPoolStats] = useState({ balance: 0, totalInflow: 0, totalOutflow: 0, memberContributions: {} });

  // Invite panel
  const [showInvite, setShowInvite]         = useState(false);
  const [inviteLink, setInviteLink]         = useState('');
  const [inviteLoading, setInviteLoading]   = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [existingInvites, setExistingInvites] = useState([]);

  // ── Reporting Logic Function ──────────────────────────────
  const calculateReports = (expensesList) => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const daily = { total: 0, breakdown: {} };
    const monthly = { total: 0, breakdown: {} };

    expensesList.forEach(e => {
      if (!e) return;
      
      const amt = parseFloat(e.amount) || 0;
      const eDate = e.date || '';
      const eMonth = eDate.slice(0, 7);
      const userId = e.added_by;
      const source = e.payment_source || 'personal_pocket';

      if (!userId || amt <= 0) return;

      const updateReport = (report) => {
        report.total += amt;
        if (!report.breakdown[userId]) report.breakdown[userId] = { total: 0, pool: 0, pocket: 0 };
        report.breakdown[userId].total += amt;
        if (source === 'group_fund') report.breakdown[userId].pool += amt;
        else report.breakdown[userId].pocket += amt;
      };

      // Monthly Report
      if (eMonth === thisMonth) updateReport(monthly);

      // Daily Report
      if (eDate === today) updateReport(daily);
    });

    return { daily, monthly };
  };

  // ── Load group data ───────────────────────────────────────
  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setLoading(true);

    try {
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

      const { data: conts } = await supabase
        .from('group_contributions').select('*')
        .eq('group_id', groupId).order('date', { ascending: false });
      const contributionsList = conts || [];
      setContributions(contributionsList);

      // Calculate stats
      const { daily, monthly } = calculateReports(expensesList);
      setDailyStats(daily);
      setMonthlyStats(monthly);

      const stats = calculatePoolStats(contributionsList, expensesList);
      setPoolStats(stats);
      setIsManager(g.created_by === user.id);

    } catch (err) {
      console.error('Error fetching group data:', err);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [user, groupId, navigate]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  // ── Real-time expense updates ─────────────────────────────
  useEffect(() => {
    const chExp = supabase.channel(`grp-exp-${groupId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_expenses', filter: `group_id=eq.${groupId}` },
        () => fetchGroupData())
      .subscribe();

    const chCont = supabase.channel(`grp-cont-${groupId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_contributions', filter: `group_id=eq.${groupId}` },
        () => fetchGroupData())
      .subscribe();

    return () => {
      supabase.removeChannel(chExp);
      supabase.removeChannel(chCont);
    };
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

  // ── Delete contribution ───────────────────────────────────
  const handleDeleteContribution = async (id) => {
    if (!confirm('Delete this contribution record? This will affect the pool balance.')) return;
    try {
      const { error } = await supabase
        .from('group_contributions')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id); // Only manager/creator can delete

      if (error) throw error;
      toast.success('Contribution deleted');
      fetchGroupData();
    } catch (err) {
      toast.error('Failed to delete contribution');
      console.error(err);
    }
  };

  const handleEditContribution = (item) => {
    setEditContribution(item);
    setShowContributionModal(true);
  };

  // ── Add expense ───────────────────────────────────────────
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrors({});
    
    try {
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category,
        date,
        payment_source: paymentSource,
        is_split: isSplit,
        split_members: isSplit ? selectedSplitMembers : [],
      };

      // Zod Validation
      groupExpenseSchema.parse(expenseData);

      const { error } = await supabase.from('group_expenses').insert([{
        ...expenseData,
        group_id: groupId,
        added_by: user.id
      }]);

      if (error) throw error;
      toast.success('Expense added!');
      setAmount(''); setDescription(''); setCategory(CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentSource('personal_pocket');
      setIsSplit(false);
      setSelectedSplitMembers([]);
      setShowModal(false);
    } catch (err) {
      if (err.name === 'ZodError') {
        const fieldErrors = {};
        err.errors.forEach(e => {
          fieldErrors[e.path[0]] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(err.message);
      }
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
      
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fmt = (n) => {
    if (isNaN(n) || n === null || n === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  };

  // Derived totals with robustness
  const groupTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  
  // My Total Contribution = (Personal Pocket expenses) + (My contributions to the pool)
  const myPocketSpending = expenses
    .filter(e => e && e.added_by === user?.id && e.payment_source === 'personal_pocket')
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const myPoolContributions = contributions
    .filter(c => c && c.user_id === user?.id)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const myTotalContribution = myPocketSpending + myPoolContributions;

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
            onClick={() => { setShowModal(true); setErrors({}); }}
            className="flex items-center gap-1.5 bg-surface border border-white/10 text-text px-3 py-2.5 sm:px-4 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors shadow-lg"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Expense</span>
          </button>
          {isManager && (
            <button
              onClick={() => setShowContributionModal(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2.5 sm:px-4 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-primary/20"
            >
              <ArrowUpCircle size={18} /> <span className="hidden sm:inline">Add Funds</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Group Pool Card ───────────────────────────────── */}
      <div className="glass p-5 rounded-3xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 shadow-xl shadow-primary/5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Group Fund Pool</p>
              <h2 className="text-3xl font-black tracking-tight">{fmt(poolStats.balance)}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Status</p>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <Check size={12} /> Live Balance
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1">
              <ArrowUpCircle size={10} className="text-emerald-400" /> Total Collected
            </span>
            <span className="text-sm font-bold mt-1">{fmt(poolStats.totalInflow)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1">
              <ArrowDownCircle size={10} className="text-red-400" /> Spent from Pool
            </span>
            <span className="text-sm font-bold mt-1">{fmt(poolStats.totalOutflow)}</span>
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass p-4 rounded-2xl bg-white/[0.02]">
          <p className="text-[10px] text-muted uppercase tracking-wider">Group Total</p>
          <p className="text-xl font-bold mt-1 text-primary">{fmt(groupTotal)}</p>
          <p className="text-xs text-muted mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass p-4 rounded-2xl bg-white/[0.02]">
          <p className="text-[10px] text-muted uppercase tracking-wider">My Contribution</p>
          <p className="text-xl font-bold mt-1 text-primary">{fmt(myTotalContribution)}</p>
          <div className="flex gap-2 mt-0.5">
            <span className="text-[9px] text-muted">Pocket: {fmt(myPocketSpending)}</span>
            <span className="text-[9px] text-muted">Pool: {fmt(myPoolContributions)}</span>
          </div>
        </div>
      </div>

      {/* ── Reporting Dashboard ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {/* Daily Report */}
        <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Daily Report</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">TODAY</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{fmt(dailyStats.total)}</span>
              <span className="text-xs text-muted">total today</span>
            </div>
            <div className="space-y-2">
              {Object.entries(dailyStats.breakdown).length > 0 ? (
                Object.entries(dailyStats.breakdown).map(([uid, stats]) => (
                  <div key={uid} className="flex justify-between items-center text-sm">
                    <span className="text-muted">{uid === user.id ? 'You' : (memberProfiles[uid] || 'Member')}</span>
                    <div className="text-right">
                      <span className="font-bold block">{fmt(stats.total)}</span>
                      <div className="flex gap-2 text-[9px] font-bold justify-end opacity-70">
                        {stats.pool > 0 && <span className="text-orange-400">Pool: {fmt(stats.pool)}</span>}
                        {stats.pocket > 0 && <span className="text-blue-400">Pocket: {fmt(stats.pocket)}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted italic">No expenses recorded today</p>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Report */}
        <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Monthly Report</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">THIS MONTH</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{fmt(monthlyStats.total)}</span>
              <span className="text-xs text-muted">total this month</span>
            </div>
            <div className="space-y-2">
              {Object.entries(monthlyStats.breakdown).length > 0 ? (
                Object.entries(monthlyStats.breakdown).map(([uid, stats]) => (
                  <div key={uid} className="flex justify-between items-center text-sm">
                    <span className="text-muted">{uid === user.id ? 'You' : (memberProfiles[uid] || 'Member')}</span>
                    <div className="text-right">
                      <span className="font-bold block">{fmt(stats.total)}</span>
                      <div className="flex gap-2 text-[9px] font-bold justify-end opacity-70">
                        {stats.pool > 0 && <span className="text-orange-400">Pool: {fmt(stats.pool)}</span>}
                        {stats.pocket > 0 && <span className="text-blue-400">Pocket: {fmt(stats.pocket)}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted italic">No expenses this month</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Group Ledger</h3>
          <div className="flex gap-2">
             <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted flex items-center gap-1">
               <History size={10} /> History
             </span>
          </div>
        </div>
        {expenses.length === 0 && contributions.length === 0 ? (
          <EmptyState 
            icon={DollarSign}
            title="No activity yet"
            message="No expenses or contributions recorded for this group."
            actionLabel="Add Expense"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {[...expenses, ...contributions]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(item => {
                if (!item) return null;
                const isExpense = 'payment_source' in item;
                const isOwn = isExpense ? (item.added_by === user?.id) : (item.created_by === user?.id);
                
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors group">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {isExpense ? <TrendingDown size={15} /> : <DollarSign size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {isExpense ? (item.description || item.category) : `Received from ${memberProfiles[item.user_id] || 'Member'}`}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isExpense ? (item.payment_source === 'group_fund' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400') : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {isExpense ? (item.payment_source === 'group_fund' ? 'Pool Expense' : 'Personal Pay') : 'Contribution'}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {isExpense ? item.category : (item.note || 'No note')} · {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        {isExpense && item.is_split && (
                          <span className="ml-2 px-1.5 py-0.5 bg-white/5 text-muted rounded text-[10px] font-medium">Split</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-sm font-bold mr-1 ${isExpense ? 'text-text' : 'text-emerald-400'}`}>
                        {isExpense ? '-' : '+'}{fmt(item.amount)}
                      </span>
                      
                      {/* Expense Actions (Delete only for now) */}
                      {isOwn && isExpense && (
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* Contribution Actions (Edit & Delete for Manager) */}
                      {!isExpense && isManager && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleEditContribution(item)}
                            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                            title="Edit Contribution"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteContribution(item.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                            title="Delete Contribution"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
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
                  <div className="flex items-center gap-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3">
                    <span className="flex-1 text-xs text-muted truncate">{inviteLink}</span>
                    <button onClick={() => copyLink(inviteLink)} className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-muted hover:text-primary transition-colors flex-shrink-0">
                      {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => shareWhatsApp(inviteLink)} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors font-medium text-xs">
                      <WhatsAppIcon /> WhatsApp
                    </button>
                    <button onClick={() => copyLink(inviteLink)} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-surface hover:bg-white/10 transition-colors text-muted text-xs font-medium">
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button onClick={() => shareNative(inviteLink)} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-surface hover:bg-white/10 transition-colors text-muted text-xs font-medium">
                      <Share2 size={16} /> More
                    </button>
                  </div>
                  <button onClick={generateInviteLink} disabled={inviteLoading} className="w-full py-2.5 rounded-xl border border-white/10 text-sm text-muted hover:bg-surface transition-colors">
                    Generate Another Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Modal ── */}
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">₹</span>
                  <input type="number" step="0.01" min="0.01" required
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className={`w-full bg-surface border ${errors.amount ? 'border-red-500' : 'border-white/10'} rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.amount}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Description *</label>
                <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                  className={`w-full bg-surface border ${errors.description ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  placeholder="e.g. Lunch at office"
                />
                {errors.description && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Date</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Payment Source Selection */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1">
                  <Info size={10} /> How was this paid?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentSource('group_fund')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${paymentSource === 'group_fund' ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-surface border-white/5 text-muted hover:border-white/10'}`}
                  >
                    <Wallet size={14} /> Group Pool
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSource('personal_pocket')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${paymentSource === 'personal_pocket' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10' : 'bg-surface border-white/5 text-muted hover:border-white/10'}`}
                  >
                    <DollarSign size={14} /> My Pocket
                  </button>
                </div>
                <p className="text-[10px] text-muted italic">
                  {paymentSource === 'group_fund' 
                    ? "Deducted from the central pool balance." 
                    : "Tracked as your contribution to the group."}
                </p>
              </div>

              {/* Split Option */}
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
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-muted uppercase tracking-wider font-bold">Split with:</p>
                    <div className="flex flex-wrap gap-2">
                      {members.map(m => {
                        const isSelected = selectedSplitMembers.includes(m.user_id);
                        return (
                          <button key={m.user_id} type="button" onClick={() => {
                            if (isSelected) {
                              if (selectedSplitMembers.length > 1) setSelectedSplitMembers(prev => prev.filter(id => id !== m.user_id));
                              else toast.error("Select at least one person");
                            } else setSelectedSplitMembers(prev => [...prev, m.user_id]);
                          }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-muted border border-white/5'}`}>
                            {memberProfiles[m.user_id] || 'Member'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors">
                  {formLoading ? 'Adding…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings2 className="text-primary" size={24} /> Group Info</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-white/10 text-muted transition-colors"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editGroupInfo ? (
                      <form onSubmit={handleUpdateGroupInfo} className="space-y-3">
                        <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50 text-xl font-bold" placeholder="Group Subject" />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50 text-sm min-h-[80px]" placeholder="Group Description" />
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
                    <button onClick={() => { setEditName(group?.name || ''); setEditDesc(group?.description || ''); setEditGroupInfo(true); }} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"><Edit2 size={16} /></button>
                  )}
                </div>
              </div>
              <div className="h-px bg-white/5 w-full" />
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-muted uppercase tracking-wider">{members.length} Participants</h4>
                <button onClick={() => { setShowSettings(false); setShowInvite(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-dashed border-white/10 group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><UserPlus size={18} /></div>
                  <div className="text-left"><span className="block text-sm font-bold text-text">Add Participants</span><span className="block text-xs text-muted">Invite via link</span></div>
                </button>
                {members.map(m => {
                  const isMe = m.user_id === user?.id;
                  const isAdmin = m.user_id === group?.created_by;
                  const currentUserIsAdmin = group?.created_by === user?.id;
                  return (
                    <div key={m.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group/member">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface border border-white/5 flex items-center justify-center font-bold text-lg text-primary shadow-inner">{(memberProfiles[m.user_id] || '?')[0].toUpperCase()}</div>
                        <div><span className="block text-sm font-semibold text-text">{isMe ? 'You' : (memberProfiles[m.user_id] || 'Member')}</span><span className="text-[10px] text-muted">{isAdmin ? 'Group Admin' : 'Participant'}</span></div>
                      </div>
                      {currentUserIsAdmin && !isMe && (
                        <button onClick={() => handleRemoveMember(m.user_id)} className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="h-px bg-white/5 w-full" />
              <div className="pt-2">
                {group?.created_by !== user?.id ? (
                  <button onClick={() => { setShowSettings(false); handleLeaveGroup(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"><LogOut size={18} /><span className="font-semibold">Exit Group</span></button>
                ) : (
                  <p className="text-xs text-center text-muted italic p-2">As the creator, you can't exit. Use Admin Panel to delete.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Add Contribution Modal ── */}
      <AddContributionModal
        isOpen={showContributionModal}
        onClose={() => {
          setShowContributionModal(false);
          setEditContribution(null);
        }}
        groupId={groupId}
        members={members}
        memberProfiles={memberProfiles}
        managerId={user.id}
        editItem={editContribution}
        onContributionAdded={fetchGroupData}
      />
    </div>
  );
}
