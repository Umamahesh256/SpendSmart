import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import {
  ArrowDownRight, DollarSign, Wallet, Users, Plus, ArrowRight,
  Sparkles, TrendingDown, TrendingUp, Bell, Mail, Sun, Sunset, Moon,
  LayoutDashboard, Target, Shield
} from 'lucide-react';

// ── Static demo data for the landing graphic ─────────────────
const DONUT_DATA = [
  { name: 'Housing', value: 45000, color: '#34d399' },
  { name: 'Food',    value: 20000, color: '#60a5fa' },
  { name: 'Travel',  value: 15000, color: '#fcd34d' },
];
const LINE_DATA = [
  { v: 10 }, { v: 25 }, { v: 15 }, { v: 40 }, { v: 20 }, { v: 50 }, { v: 30 }
];

// ── Greeting helper ───────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Good night',     emoji: '🌙', Icon: Moon,    color: 'text-indigo-400' };
  if (h < 12) return { text: 'Good morning',   emoji: '☀️', Icon: Sun,     color: 'text-amber-400' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️', Icon: Sunset,  color: 'text-orange-400' };
  return       { text: 'Good evening',         emoji: '🌙', Icon: Moon,    color: 'text-indigo-400' };
}

// ── Dynamic insight engine ────────────────────────────────────
function getDynamicMessage({ yesterdaySpend, thisWeekSpend, lastWeekSpend, balance, fmt }) {
  const msgs = [];

  if (yesterdaySpend > 0) {
    msgs.push({
      icon: Bell,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      title: `Yesterday you spent ${fmt(yesterdaySpend)}`,
      sub: "Let's be mindful of today's spending 🎯",
    });
  }

  if (thisWeekSpend < lastWeekSpend && lastWeekSpend > 0) {
    const saved = lastWeekSpend - thisWeekSpend;
    msgs.push({
      icon: Sparkles,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      title: `You spent ${fmt(saved)} less than last week! 🎉`,
      sub: 'Great discipline. Keep the streak going!',
    });
  } else if (thisWeekSpend > lastWeekSpend && lastWeekSpend > 0) {
    msgs.push({
      icon: TrendingUp,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      title: 'Spending is up compared to last week',
      sub: `You've spent ${fmt(thisWeekSpend - lastWeekSpend)} more. Review your categories.`,
    });
  }

  if (balance < 0) {
    msgs.push({
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      title: '⚠️ Your balance is negative',
      sub: 'Consider reducing expenses to get back on track.',
    });
  }

  if (msgs.length === 0) {
    msgs.push({
      icon: Sparkles,
      color: 'text-primary',
      bg: 'bg-primary/10',
      title: 'Welcome! Start tracking today 👋',
      sub: 'Add your first transaction to see personalized insights here.',
    });
  }

  return msgs[0];
}

// ─────────────────────────────────────────────────────────────
// LOGGED-IN HOME
// ─────────────────────────────────────────────────────────────
function LoggedInHome({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState({
    yesterdaySpend: 0, thisWeekSpend: 0, lastWeekSpend: 0, balance: 0,
    groups: [], userRole: 'member',
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Quick-create group
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);

  useEffect(() => {
    async function fetchHomeData() {
      if (!user) return;
      setLoading(true);

      // Profile
      const { data: profile } = await supabase
        .from('profiles').select('full_name, currency, role').eq('id', user.id).single();
      if (profile) {
        setUserName(profile.full_name?.split(' ')[0] || '');
        setCurrency(profile.currency || 'INR');
      }

      const now = new Date();

      // Yesterday range
      const yd = new Date(now); yd.setDate(yd.getDate() - 1);
      const ydStart = new Date(yd.getFullYear(), yd.getMonth(), yd.getDate()).toISOString().split('T')[0];
      const ydEnd   = ydStart;

      // This week (Mon–today)
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const thisMonday = new Date(now); thisMonday.setDate(now.getDate() - dayOfWeek);
      const thisWeekStart = thisMonday.toISOString().split('T')[0];

      // Last week
      const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday  = new Date(thisMonday); lastSunday.setDate(thisMonday.getDate() - 1);
      const lastWeekStart = lastMonday.toISOString().split('T')[0];
      const lastWeekEnd   = lastSunday.toISOString().split('T')[0];

      // All transactions
      const { data: txs } = await supabase
        .from('transactions').select('amount, type, date').eq('user_id', user.id);

      let balance = 0, yesterdaySpend = 0, thisWeekSpend = 0, lastWeekSpend = 0;
      txs?.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'income') balance += amt; else balance -= amt;
        if (t.type === 'expense') {
          if (t.date === ydStart) yesterdaySpend += amt;
          if (t.date >= thisWeekStart) thisWeekSpend += amt;
          if (t.date >= lastWeekStart && t.date <= lastWeekEnd) lastWeekSpend += amt;
        }
      });

      // Groups user belongs to
      const { data: memberships } = await supabase
        .from('group_members').select('group_id').eq('user_id', user.id);
      let groups = [];
      if (memberships && memberships.length > 0) {
        const ids = memberships.map(m => m.group_id);
        const { data: groupData } = await supabase
          .from('groups').select('id, name, description, created_by').in('id', ids);
        groups = groupData || [];
      }

      setData({
        yesterdaySpend, thisWeekSpend, lastWeekSpend, balance,
        groups, userRole: profile?.role || 'member',
      });
      setLoading(false);
    }
    fetchHomeData();
  }, [user]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(n);
  const { text: greetText, emoji } = getGreeting();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const insight = getDynamicMessage({ ...data, fmt });

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setGroupLoading(true);
    try {
      const { data: g, error } = await supabase
        .from('groups')
        .insert([{ name: groupName, description: groupDesc, created_by: user.id }])
        .select().single();
      if (error) throw error;
      await supabase.from('group_members').insert([{ group_id: g.id, user_id: user.id }]);
      setShowGroupModal(false);
      setGroupName(''); setGroupDesc('');
      navigate(`/group/${g.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setGroupLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">
          {greetText}{userName ? `, ${userName}` : ''}! {emoji}
        </h1>
        <p className="text-muted text-sm mt-0.5">{today}</p>
      </div>

      {/* ── Dynamic Insight / Pop-up message ─────────────────── */}
      {!loading && (
        <div className={`flex items-start gap-4 p-4 rounded-2xl border border-white/5 ${insight.bg}`}>
          <div className={`p-2.5 rounded-xl ${insight.bg} flex-shrink-0`}>
            <insight.icon size={20} className={insight.color} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-snug">{insight.title}</p>
            <p className="text-xs text-muted mt-0.5">{insight.sub}</p>
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard"
            className="glass flex items-center gap-3 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1"
          >
            <div className="p-2.5 bg-primary/10 rounded-2xl"><LayoutDashboard size={20} className="text-primary" /></div>
            <div>
              <p className="text-sm font-bold">Dashboard</p>
              <p className="text-xs text-muted">View finances</p>
            </div>
          </Link>
          <Link to="/transactions"
            className="glass flex items-center gap-3 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1"
          >
            <div className="p-2.5 bg-blue-500/10 rounded-2xl"><Plus size={20} className="text-blue-400" /></div>
            <div>
              <p className="text-sm font-bold">Add Expense</p>
              <p className="text-xs text-muted">Log transaction</p>
            </div>
          </Link>
          <button
            onClick={() => setShowGroupModal(true)}
            className="glass flex items-center gap-3 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1 text-left"
          >
            <div className="p-2.5 bg-purple-500/10 rounded-2xl"><Users size={20} className="text-purple-400" /></div>
            <div>
              <p className="text-sm font-bold">Create Group</p>
              <p className="text-xs text-muted">Track together</p>
            </div>
          </button>
          <Link to="/budgets"
            className="glass flex items-center gap-3 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1"
          >
            <div className="p-2.5 bg-amber-500/10 rounded-2xl"><Target size={20} className="text-amber-400" /></div>
            <div>
              <p className="text-sm font-bold">Budgets</p>
              <p className="text-xs text-muted">Set limits</p>
            </div>
          </Link>
          {data.userRole === 'admin' && (
            <Link to="/admin"
              className="glass flex items-center gap-3 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1 col-span-2 lg:col-span-4"
            >
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl"><Shield size={20} className="text-emerald-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-bold">Admin Panel</p>
                <p className="text-xs text-muted">Manage groups & invite members</p>
              </div>
              <ArrowRight size={18} className="text-muted ml-auto" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Your Groups ───────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Your Groups</p>
          {data.userRole === 'admin' && (
            <Link to="/admin" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:opacity-80">
              Manage <ArrowRight size={12} />
            </Link>
          )}
        </div>
        {loading ? (
          <div className="glass rounded-2xl p-6 text-center text-muted text-sm">Loading…</div>
        ) : data.groups.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-muted">
            <Users size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No groups yet</p>
            <p className="text-xs mt-1 opacity-60">Create a group or ask a friend to invite you.</p>
            <button
              onClick={() => setShowGroupModal(true)}
              className="mt-3 text-primary text-xs font-medium hover:underline"
            >
              + Create your first group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.groups.map(g => (
              <Link
                key={g.id}
                to={`/group/${g.id}`}
                className="glass flex items-center gap-4 p-5 rounded-3xl hover:bg-white/10 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-500/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                  {g.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{g.name}</p>
                  {g.description && <p className="text-xs text-muted truncate">{g.description}</p>}
                </div>
                <ArrowRight size={18} className="text-muted flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── This Week vs Last Week ────────────────────────────── */}
      {!loading && (data.thisWeekSpend > 0 || data.lastWeekSpend > 0) && (
        <div className="glass p-4 rounded-2xl">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">Weekly Spending</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-surface/50 rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wider">This Week</p>
              <p className="text-lg font-bold mt-1">{fmt(data.thisWeekSpend)}</p>
            </div>
            <div className="flex-1 bg-surface/50 rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wider">Last Week</p>
              <p className="text-lg font-bold mt-1">{fmt(data.lastWeekSpend)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Group Modal ────────────────────────────────── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Create a Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-2 rounded-full hover:bg-surface text-muted">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Group Name *</label>
                <input required value={groupName} onChange={e => setGroupName(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Flat 4 Expenses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                <input value={groupDesc} onChange={e => setGroupDesc(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface">Cancel</button>
                <button type="submit" disabled={groupLoading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
                  {groupLoading ? 'Creating…' : 'Create & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LANDING PAGE (not logged in)
// ─────────────────────────────────────────────────────────────
function LandingPage() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center py-12 lg:py-24 px-6 overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />

      <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center z-10">
        {/* Left Side: Hero Content */}
        <div className="text-center lg:text-left space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <Sparkles className="text-primary" size={16} />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted">Join 10k+ users managing group finances</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
            Smarter finance <br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              for everyone.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Premium group finance management. Track personal expenses, manage room budgets, and achieve financial clarity with your team or roommates.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-10 py-5 bg-primary hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={20} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Right Side: Visual Graphic */}
        <div className="hidden lg:block relative h-[600px] animate-slide-up">
          {/* Main Card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[340px] glass rounded-3xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.4)] flex flex-col p-8 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-muted uppercase tracking-wider font-bold">Total Balance</p>
                <p className="text-4xl font-black tracking-tighter">₹85,420.00</p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                <Wallet size={24} />
              </div>
            </div>
            <div className="flex-1 w-full relative z-10">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={LINE_DATA}>
                  <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={4} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Floating Bubble 1 */}
          <div className="absolute top-10 right-0 p-6 glass rounded-2xl border border-white/10 shadow-2xl animate-float">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs text-muted font-bold uppercase">Savings</p>
                <p className="font-bold text-emerald-400">+12% this month</p>
              </div>
            </div>
          </div>

          {/* Floating Bubble 2 */}
          <div className="absolute bottom-10 left-0 p-6 glass rounded-2xl border border-white/10 shadow-2xl animate-float-delayed">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-muted font-bold uppercase">Group Expenses</p>
                <p className="font-bold">4 Active Rooms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-32 z-10">
        {[
          { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade encryption for all your financial data.' },
          { icon: Users, title: 'Collaborative Tracking', desc: 'Share budgets and split expenses with roommates or friends.' },
          { icon: Target, title: 'Goal Oriented', desc: 'Set savings targets and visualize your progress in real-time.' }
        ].map((f, i) => (
          <div key={i} className="group glass p-10 rounded-[2rem] border border-white/10 hover:border-primary/50 transition-all hover:-translate-y-2 duration-500">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <f.icon size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
            <p className="text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT — decides which to render
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin text-primary"><Wallet size={32} /></div>
      </div>
    );
  }

  return user ? <LoggedInHome user={user} /> : <LandingPage />;
}
