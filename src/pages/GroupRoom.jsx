import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import AddContributionModal from '../components/AddContributionModal';
import AddGuestModal from '../components/AddGuestModal';
import { groupExpenseSchema, calculatePoolStats, calculateMonthlyPoolStats, calculateGroupBudgetStats, calculatePersonalPayments, calculateMemberBalances } from '../lib/groupLedger';
import GroupBudgetModal from '../components/GroupBudgetModal';
import GroupFinanceSummary from '../components/GroupFinanceSummary';
import UpdateBalanceModal from '../components/UpdateBalanceModal';
import MemberBudgetPanel from '../components/MemberBudgetPanel';
import UpdateMemberPaidModal from '../components/UpdateMemberPaidModal';
import GroupDuesPanel from '../components/GroupDuesPanel';
import MemberDuesPanel from '../components/MemberDuesPanel';
import CreateDueModal from '../components/CreateDueModal';
import CreateMemberDueModal from '../components/CreateMemberDueModal';
import UpdateMemberDueModal from '../components/UpdateMemberDueModal';
import CarryForwardModal from '../components/CarryForwardModal';
import BudgetHistory from '../components/BudgetHistory';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import {
  Users, Plus, Trash2, X, ArrowLeft,
  UserPlus, Copy, Check, Share2, Link2, DollarSign, Settings2, Edit2, LogOut, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, Wallet, History, Info, PiggyBank, ChevronLeft, ChevronRight, Calendar
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
  const [myMemberId, setMyMemberId]     = useState(null);
  const [isManager, setIsManager]       = useState(false);


// Add-expense modal
  const [showModal, setShowModal]       = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editContribution, setEditContribution] = useState(null);
  const [amount, setAmount]             = useState('');
  const [description, setDescription]  = useState('');
  const [category, setCategory]         = useState(CATEGORIES[0]);
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState('personal_pocket');
  const [formLoading, setFormLoading]   = useState(false);
  const [formMsg, setFormMsg]           = useState({ type: '', text: '' });
  const [errors, setErrors]             = useState({});
  const [ledgerFilter, setLedgerFilter] = useState('recent');

  // Split logic
  const [isSplit, setIsSplit]           = useState(false);
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]); // Array of user IDs
  const [expensePayer, setExpensePayer] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Reporting stats
  const [dailyStats, setDailyStats] = useState({ total: 0, breakdown: {} });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, breakdown: {} });

  const [editGroupInfo, setEditGroupInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Pool stats
  const [poolStats, setPoolStats] = useState({ balance: 0, totalInflow: 0, totalOutflow: 0, memberContributions: {} });

  // Budget system state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [currentMemberBudgets, setCurrentMemberBudgets] = useState([]);
  const [allBudgets, setAllBudgets] = useState([]);
  const [allMemberBudgets, setAllMemberBudgets] = useState([]);
  const [budgetStats, setBudgetStats] = useState(null);
  const [monthlyPoolStats, setMonthlyPoolStats] = useState({ balance: 0, totalInflow: 0, totalOutflow: 0, memberContributions: {} });
  const [personalPayments, setPersonalPayments] = useState({ byMember: {}, total: 0 });
  const [memberBalances, setMemberBalances] = useState([]);
  const [thisMonthMemberBudgets, setThisMonthMemberBudgets] = useState([]);
  
  // Global View Date State
  const [globalViewMonth, setGlobalViewMonth] = useState(new Date().getMonth() + 1);
  const [globalViewYear, setGlobalViewYear] = useState(new Date().getFullYear());

  const [carryForwards, setCarryForwards] = useState([]);
  const [carryForwardData, setCarryForwardData] = useState(null);
  
  const [updatePaidData, setUpdatePaidData] = useState(null);
  
  const [groupDues, setGroupDues] = useState([]);
  const [memberDues, setMemberDues] = useState([]);
  const [showCreateDueModal, setShowCreateDueModal] = useState(false);
  const [showCreateMemberDueModal, setShowCreateMemberDueModal] = useState(false);
  const [editMemberDueItem, setEditMemberDueItem] = useState(null);

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
      const userId = e.paid_by_member_id;
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
    
    // Only show full-page loading spinner on initial load
    if (!group) setLoading(true);

    try {
      const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (!g) { navigate('/'); return; }
      setGroup(g);

      const { data: membership } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', user.id).single();
      setIsMember(!!membership);
      setMyMemberId(membership?.id);

      const { data: mems } = await supabase
        .from('group_members').select('*').eq('group_id', groupId);
      setMembers(mems || []);

      if (mems?.length > 0) {
        const userIds = mems.map(m => m.user_id).filter(Boolean);
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        
        const profileMap = {};
        profiles?.forEach(p => { 
          profileMap[p.id] = p.full_name || p.email?.split('@')[0] || 'Member'; 
        });
        
        const finalMap = {};
        mems.forEach(m => {
          if (m.is_guest) {
            finalMap[m.id] = m.guest_name + ' (Guest)';
          } else {
            finalMap[m.id] = profileMap[m.user_id] || 'Member';
          }
        });
        setMemberProfiles(finalMap);
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

      // Budget data fetching
      const currentMonth = globalViewMonth;
      const currentYear = globalViewYear;

      const { data: dData } = await supabase
        .from('group_dues').select('*')
        .eq('group_id', groupId)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('created_at', { ascending: true });
      setGroupDues(dData || []);

      const { data: mdData } = await supabase
        .from('member_dues').select('*')
        .eq('group_id', groupId)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('created_at', { ascending: true });
      setMemberDues(mdData || []);

      const { data: bData } = await supabase
        .from('group_budgets').select('*')
        .eq('group_id', groupId);
      const allGroupBudgets = bData || [];
      setAllBudgets(allGroupBudgets);
      
      const thisMonthBudget = allGroupBudgets.find(b => b.month === currentMonth && b.year === currentYear);
      setCurrentBudget(thisMonthBudget || null);

      const { data: mbData } = await supabase
        .from('member_budgets').select('*')
        .eq('group_id', groupId);
      const allMBs = mbData || [];
      setAllMemberBudgets(allMBs);
      
      const thisMonthMemberBudgets = allMBs.filter(b => b.month === currentMonth && b.year === currentYear);
      setCurrentMemberBudgets(thisMonthMemberBudgets);
      
      const { data: cfData } = await supabase.from('budget_carry_forwards').select('*').eq('group_id', groupId);
      const allCFs = cfData || [];
      setCarryForwards(allCFs);

      // Budget stats calculations
      const monthPool = calculateMonthlyPoolStats(contributionsList, expensesList, currentMonth, currentYear);
      setMonthlyPoolStats(monthPool);
      
      const gStats = calculateGroupBudgetStats(expensesList, thisMonthBudget, currentMonth, currentYear);
      setBudgetStats(gStats);
      
      const pPayments = calculatePersonalPayments(expensesList, currentMonth, currentYear);
      setPersonalPayments(pPayments);
      
      const mBalances = calculateMemberBalances(mems || [], contributionsList, thisMonthMemberBudgets, expensesList, allCFs, currentMonth, currentYear);
      setMemberBalances(mBalances);

    } catch (err) {
      console.error('Error fetching group data:', err);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [user, groupId, navigate, globalViewMonth, globalViewYear]);

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
      
      // Determine if the selected category is a Group Due
      const matchingDue = groupDues.find(d => d.status !== 'Paid' && d.category_name === category);
      const payload = {
        ...expenseData,
        group_id: groupId,
        recorded_by: user.id, 
        paid_by_member_id: expensePayer || myMemberId,
        group_due_id: matchingDue ? matchingDue.id : null
      };

      if (editExpenseId) {
        const { error } = await supabase.from('group_expenses').update(payload).eq('id', editExpenseId);
        if (error) throw error;
        toast.success('Expense updated!');
      } else {
        const { error } = await supabase.from('group_expenses').insert([payload]);
        if (error) throw error;
        toast.success('Expense added!');
      }
      
      setAmount(''); setDescription(''); setCategory(CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentSource('personal_pocket');
      setIsSplit(false);
      setSelectedSplitMembers([]);
      setEditExpenseId(null);
      setShowModal(false);
      
      // Refresh to grab updated due balances
      fetchGroupData();
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
  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the group?')) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Member removed');
      setMembers(prev => prev.filter(m => m.id !== memberId));
      
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
    .filter(e => e && e.paid_by_member_id === myMemberId && e.payment_source === 'personal_pocket')
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const myPoolContributions = contributions
    .filter(c => c && c.member_id === myMemberId)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const myTotalContribution = myPocketSpending + myPoolContributions;

  // ── Missing Handlers ──────────────────────────────────────
  const handleEditExpense = (expense) => {
    setEditExpenseId(expense.id);
    setAmount(expense.amount);
    setDescription(expense.description || '');
    setCategory(expense.category);
    setDate(expense.date);
    setPaymentSource(expense.payment_source);
    setIsSplit(expense.is_split || false);
    setShowModal(true);
  };

  const handleDeleteExpense = (id) => {
    setDeleteConfirmType({ type: 'expense', id });
  };

  const handleDeleteDue = (id) => {
    setDeleteConfirmType({ type: 'due', id });
  };

  const handleDeleteMemberDue = (id) => {
    setDeleteConfirmType({ type: 'member_due', id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmType) return;
    setIsDeleting(true);
    try {
      const { type, id } = deleteConfirmType;
      let error = null;

      if (type === 'expense') {
        const res = await supabase.from('group_expenses').delete().eq('id', id);
        error = res.error;
      } else if (type === 'contribution') {
        const res = await supabase.from('group_contributions').delete().eq('id', id);
        error = res.error;
      } else if (type === 'due') {
        const res = await supabase.from('group_dues').delete().eq('id', id);
        error = res.error;
      } else if (type === 'member_due') {
        const res = await supabase.from('member_dues').delete().eq('id', id);
        error = res.error;
      } else if (type === 'member') {
        const res = await supabase.from('group_members').delete().eq('group_id', groupId).eq('id', id);
        error = res.error;
      }

      if (error) throw error;
      toast.success('Deleted successfully!');
      fetchGroupData(false);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmType(null);
    }
  };

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
            onClick={() => { setShowModal(true); setErrors({}); setExpensePayer(myMemberId); }}
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
      
      {/* ── Global Month Selector ───────────────────────────── */}
      <div className="flex items-center justify-between glass p-2 rounded-2xl animate-fade-in border border-white/5">
        <button 
          onClick={() => {
            if (globalViewMonth === 1) { setGlobalViewMonth(12); setGlobalViewYear(globalViewYear - 1); }
            else setGlobalViewMonth(globalViewMonth - 1);
          }}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2 font-bold text-lg tracking-wide">
          <Calendar size={18} className="text-primary" />
          {new Date(globalViewYear, globalViewMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        
        <button 
          onClick={() => {
            const currentM = new Date().getMonth() + 1;
            const currentY = new Date().getFullYear();
            if (globalViewYear > currentY || (globalViewYear === currentY && globalViewMonth >= currentM)) return;
            if (globalViewMonth === 12) { setGlobalViewMonth(1); setGlobalViewYear(globalViewYear + 1); }
            else setGlobalViewMonth(globalViewMonth + 1);
          }}
          disabled={globalViewYear === new Date().getFullYear() && globalViewMonth === new Date().getMonth() + 1}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Desktop: 3 Column Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pool Stats */}
        <div className="space-y-6 md:col-span-2 lg:col-span-1 flex flex-col md:flex-row lg:flex-col gap-6 md:gap-4 lg:gap-6">
          <div className="glass p-5 rounded-3xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 shadow-xl shadow-primary/5 animate-slide-up flex-1" style={{ animationDelay: '0.05s' }}>
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
          
          <GroupDuesPanel 
            dues={groupDues} 
            isManager={isManager} 
            onCreateDue={() => setShowCreateDueModal(true)} 
            fmt={fmt} 
          />

          <MemberDuesPanel 
            dues={memberDues} 
            members={members}
            memberProfiles={memberProfiles}
            isManager={isManager} 
            onCreateDue={() => setShowCreateMemberDueModal(true)} 
            onEditDue={(due) => setEditMemberDueItem(due)}
            onDeleteDue={(id) => setDeleteConfirmType({ type: 'member_due', id })}
            fmt={fmt} 
          />


        </div>

        {/* Middle Column: Ledger */}
        <div className="space-y-6 lg:h-[800px] lg:overflow-y-auto custom-scrollbar lg:pr-2">
          <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Group Ledger</h3>
              <div className="flex items-center gap-2">
                <select
                  value={ledgerFilter}
                  onChange={e => setLedgerFilter(e.target.value)}
                  className="bg-surface border border-white/5 text-xs text-muted px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="recent">Recent (Last 8)</option>
                  <option value="current_month">Current Month</option>
                  <option value="last_3_months">Last 3 Months</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="all">All Transactions</option>
                </select>
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
                {(() => {
                  let filteredExpenses = [...expenses].filter(e => new Date(e.date).getMonth() + 1 === globalViewMonth && new Date(e.date).getFullYear() === globalViewYear);
                  let filteredContributions = [...contributions].filter(c => new Date(c.date).getMonth() + 1 === globalViewMonth && new Date(c.date).getFullYear() === globalViewYear);
                  
                  let combined = [...filteredExpenses, ...filteredContributions].sort((a, b) => new Date(b.date) - new Date(a.date));
                  
                  if (ledgerFilter === 'recent') {
                    combined = combined.slice(0, 8);
                  }
                  return combined;
                })().map(item => {
                  if (!item) return null;
                  const isExpense = 'payment_source' in item;
                  const isOwn = isExpense ? (item.paid_by_member_id === myMemberId) : (item.member_id === myMemberId);
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedTransaction(item)}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {isExpense ? <TrendingDown size={15} /> : <DollarSign size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {isExpense ? (item.description || item.category) : `Received from ${memberProfiles[item.member_id] || 'Member'}`}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isExpense ? (item.payment_source === 'group_fund' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400') : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isExpense ? (item.payment_source === 'group_fund' ? 'Pool Expense' : 'Personal Pay') : 'Contribution'}
                          </span>
                        </div>
                        <p className="text-xs text-muted">
                          {isExpense 
                            ? `${item.category} · Paid by ${memberProfiles[item.paid_by_member_id] || 'Member'}` 
                            : `${item.note || 'No note'} · Added by ${memberProfiles[item.created_by] || 'Member'}`}
                          {` · ${new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                          {isExpense && item.is_split && (
                            <span className="ml-2 px-1.5 py-0.5 bg-white/5 text-muted rounded text-[10px] font-medium">Split</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-sm font-bold mr-1 ${isExpense ? 'text-text' : 'text-emerald-400'}`}>
                          {isExpense ? '-' : '+'}{fmt(item.amount)}
                        </span>
                        
                        {(isOwn || isManager) && isExpense && (
                          <div className="flex gap-1 transition-all">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditExpenseId(item.id); setAmount(item.amount); setDescription(item.description); setCategory(item.category); setDate(item.date); setPaymentSource(item.payment_source); setShowModal(true); }}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                              title="Edit Expense"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteExpense(item.id); }}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                              title="Delete Expense"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}

                        {!isExpense && isManager && (
                          <div className="flex gap-1 transition-all">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditContribution(item); }}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                              title="Edit Contribution"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteContribution(item.id); }}
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
        </div>

        {/* Right Column: Budgets & Reports */}
        <div className="space-y-6 lg:h-[800px] lg:overflow-y-auto custom-scrollbar lg:pr-2">
          <GroupFinanceSummary 
            budgetStats={budgetStats}
            poolStats={monthlyPoolStats}
            personalPayments={personalPayments}
            memberProfiles={memberProfiles}
            fmt={fmt}
            manualBalance={group?.manual_balance}
            isManager={isManager}
            onUpdateBalance={() => setShowUpdateBalanceModal(true)}
            onAddBudget={() => setShowBudgetModal(true)}
          />
          <MemberBudgetPanel
            memberBalances={memberBalances}
            members={members}
            memberProfiles={memberProfiles}
            fmt={fmt}
            isManager={isManager}
            onUpdatePaid={(mId, paid) => {
              setUpdatePaidData({ memberId: mId, memberName: memberProfiles[mId] || 'Member', currentPaid: paid });
            }}
            onCarryForward={(mId, amt) => {
              const currentMonth = new Date().getMonth() + 1;
              const currentYear = new Date().getFullYear();
              setCarryForwardData({
                memberId: mId,
                memberName: memberProfiles[mId] || 'Member',
                overpaidAmount: amt,
                fromMonth: currentMonth,
                fromYear: currentYear
              });
            }}
          />
          <BudgetHistory
            allBudgets={allBudgets}
            allContributions={contributions}
            allExpenses={expenses}
            allMemberBudgets={allMemberBudgets}
            carryForwards={carryForwards}
            members={members}
            memberProfiles={memberProfiles}
            fmt={fmt}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">Invite to Group</h2>
                <p className="text-xs text-muted mt-0.5">Anyone with the link can join</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-full hover:bg-surface text-muted">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {!inviteLink ? (
                <button
                  onClick={generateInviteLink}
                  disabled={inviteLoading}
                  className="w-full flex justify-center items-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {inviteLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Link2 size={18} />}
                  Generate Open Invite Link
                </button>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 p-3 bg-surface border border-white/10 rounded-xl">
                    <div className="flex-1 min-w-0 font-mono text-xs text-text overflow-hidden text-ellipsis whitespace-nowrap">
                      {inviteLink}
                    </div>
                    <button
                      onClick={() => copyLink(inviteLink)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-text transition-colors flex-shrink-0"
                    >
                      {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => shareWhatsApp(inviteLink)}
                      className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl font-semibold hover:bg-[#20b958] transition-colors text-sm"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareNative(inviteLink)}
                      className="flex items-center justify-center gap-2 bg-white/10 text-white py-2.5 rounded-xl font-semibold hover:bg-white/20 transition-colors text-sm"
                    >
                      Share...
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/5 shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><Plus className="text-primary" size={20} /> Record Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-white/10 text-muted transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Amount (₹) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-xl font-bold text-muted">₹</span>
                  </div>
                  <input
                    type="number" step="1" min="1" required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl pl-10 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 text-xl font-bold"
                    placeholder="0"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.amount}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Who Paid? *</label>
                <select 
                  required
                  value={expensePayer} 
                  onChange={e => {
                    if (e.target.value === 'ADD_GUEST') {
                      setShowModal(false);
                      setShowGuestModal(true);
                      setExpensePayer('');
                    } else {
                      setExpensePayer(e.target.value);
                    }
                  }}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                >
                  <option value="">Select Member</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{memberProfiles[m.id] || 'Member'}</option>
                  ))}
                  <option value="ADD_GUEST" className="font-bold text-primary">+ Add Guest</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Description *</label>
                <input
                  type="text" required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="What was this for?"
                />
                {errors.description && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                  >
                    <optgroup label="Standard Categories">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    {groupDues && groupDues.filter(d => d.status !== 'Paid').length > 0 && (
                      <optgroup label="Outstanding Group Bills">
                        {groupDues.filter(d => d.status !== 'Paid').map(d => (
                          <option key={`due-${d.id}`} value={d.category_name}>
                            {d.category_name} (₹{d.remaining_amount} due)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {errors.category && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Date</label>
                  <input
                    type="date" required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.date && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">Payment Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPaymentSource('personal_pocket')} className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${paymentSource === 'personal_pocket' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-white/10 text-muted hover:bg-white/5'}`}>Personal</button>
                  <button type="button" onClick={() => setPaymentSource('group_fund')} className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${paymentSource === 'group_fund' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-surface border-white/10 text-muted hover:bg-white/5'}`}>Group Pool</button>
                </div>
                {errors.payment_source && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.payment_source}</p>}
                <p className="text-[10px] text-muted mt-2 text-center">
                  {paymentSource === 'personal_pocket' ? 'Paid from your own money.' : 'Paid using money already collected in the group pool.'}
                </p>
              </div>

              <div className="bg-background/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text flex items-center gap-2">Split this expense? <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[9px] uppercase tracking-wider rounded font-bold">BETA</span></label>
                  <button type="button" onClick={() => setIsSplit(!isSplit)} className={`relative w-10 h-6 rounded-full transition-colors ${isSplit ? 'bg-primary' : 'bg-surface border border-white/10'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isSplit ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {isSplit && (
                  <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                    <p className="text-xs text-muted mb-3">Select who shares this expense. You can select multiple people.</p>
                    <div className="flex flex-wrap gap-2">
                      {members.map(m => {
                        const isSelected = selectedSplitMembers.includes(m.id);
                        return (
                          <button key={m.id} type="button" onClick={() => {
                            if (isSelected) {
                              if (selectedSplitMembers.length > 1) setSelectedSplitMembers(prev => prev.filter(id => id !== m.id));
                              else toast.error("Select at least one person");
                            } else setSelectedSplitMembers(prev => [...prev, m.id]);
                          }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-muted border border-white/5'}`}>
                            {memberProfiles[m.id] || 'Member'}
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
                  {formLoading ? (editExpenseId ? "Updating…" : "Adding…") : (editExpenseId ? "Update Expense" : "Add Expense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  const isMe = m.user_id && m.user_id === user?.id;
                  const isAdmin = m.user_id && m.user_id === group?.created_by;
                  const currentUserIsAdmin = group?.created_by === user?.id;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group/member">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface border border-white/5 flex items-center justify-center font-bold text-lg text-primary shadow-inner">
                          {(m.is_guest ? (m.guest_name?.[0] || '?') : ((memberProfiles[m.id] || '?')[0])).toUpperCase()}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-text">
                            {isMe ? 'You' : (m.is_guest ? m.guest_name + ' (Guest)' : (memberProfiles[m.id] || 'Member'))}
                          </span>
                          <span className="text-[10px] text-muted">
                            {isAdmin ? 'Group Admin' : (m.is_guest ? 'Guest' : 'Participant')}
                          </span>
                        </div>
                      </div>
                      {currentUserIsAdmin && !isMe && (
                        <button onClick={() => handleRemoveMember(m.id)} className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="h-px bg-white/5 w-full" />
              <div className="pt-2">
                {group?.created_by !== user?.id ? (
                  <button onClick={() => { setShowSettings(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"><LogOut size={18} /><span className="font-semibold">Exit Group</span></button>
                ) : (
                  <p className="text-xs text-center text-muted italic p-2">As the creator, you can't exit. Use Admin Panel to delete.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AddContributionModal
        isOpen={showContributionModal}
        onClose={() => {
          setShowContributionModal(false);
          setEditContribution(null);
        }}
        groupId={groupId}
        members={members}
        memberProfiles={memberProfiles}
        memberDues={memberDues}
        managerId={user.id}
        editItem={editContribution}
        onContributionAdded={fetchGroupData}
        onAddGuest={() => { setShowContributionModal(false); setShowGuestModal(true); }}
      />

      {/* ── Group Budget Modal ── */}
      <GroupBudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        groupId={groupId}
        members={members}
        memberProfiles={memberProfiles}
        userId={user.id}
        existingBudget={currentBudget}
        existingMemberBudgets={currentMemberBudgets}
        onBudgetSaved={fetchGroupData}
      />



      <AddGuestModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        groupId={groupId}
        onGuestAdded={fetchGroupData}
      />

      <DeleteConfirmModal
        isOpen={!!deleteConfirmType}
        onClose={() => setDeleteConfirmType(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title={deleteConfirmType?.type === 'expense' ? 'Delete Expense?' : 'Delete Item?'}
        message="This action cannot be undone."
      />
      {carryForwardData && (
        <CarryForwardModal
          isOpen={true}
          onClose={() => setCarryForwardData(null)}
          groupId={groupId}
          memberId={carryForwardData.memberId}
          memberName={carryForwardData.memberName}
          overpaidAmount={carryForwardData.overpaidAmount}
          fromMonth={carryForwardData.fromMonth}
          fromYear={carryForwardData.fromYear}
          onSuccess={fetchGroupData}
        />
      )}
      
      {updatePaidData && (
        <UpdateMemberPaidModal
          isOpen={true}
          onClose={() => setUpdatePaidData(null)}
          groupId={groupId}
          memberId={updatePaidData.memberId}
          memberName={updatePaidData.memberName}
          currentPaid={updatePaidData.currentPaid}
          month={globalViewMonth}
          year={globalViewYear}
          onSuccess={fetchGroupData}
        />
      )}
      
      <UpdateBalanceModal
        isOpen={showUpdateBalanceModal}
        onClose={() => setShowUpdateBalanceModal(false)}
        groupId={groupId}
        currentBalance={group?.manual_balance}
        onUpdate={(newBal) => setGroup(prev => ({ ...prev, manual_balance: newBal }))}
      />

      {showCreateDueModal && (
        <CreateDueModal
          isOpen={true}
          onClose={() => setShowCreateDueModal(false)}
          groupId={groupId}
          month={globalViewMonth}
          year={globalViewYear}
          onSuccess={fetchGroupData}
        />
      )}

      {showCreateMemberDueModal && (
        <CreateMemberDueModal
          isOpen={true}
          onClose={() => setShowCreateMemberDueModal(false)}
          groupId={groupId}
          month={globalViewMonth}
          year={globalViewYear}
          members={members}
          memberProfiles={memberProfiles}
          onSuccess={() => fetchGroupData(false)}
        />
      )}

      {editMemberDueItem && (
        <UpdateMemberDueModal
          isOpen={true}
          onClose={() => setEditMemberDueItem(null)}
          editItem={editMemberDueItem}
          members={members}
          memberProfiles={memberProfiles}
          onSuccess={() => fetchGroupData(false)}
        />
      )}

      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        item={selectedTransaction}
        memberProfiles={memberProfiles}
      />
    </div>
  );
}
