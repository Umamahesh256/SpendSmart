import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, ArrowRightLeft, ChevronRight,
  Sparkles, Flame, ShieldCheck, AlertTriangle, Coffee, Sun, Moon, Sunset, Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// ── Smart Insight Engine ─────────────────────────────────────────────────────
function getInsight({ todaySpend, monthlyExpense, monthlyIncome, savingsRate, topCategory, balance }) {
  const insights = [];

  // 1. Today's spend
  if (todaySpend > 0) {
    insights.push({
      icon: Coffee,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      text: `You've spent ${todaySpend} today.`,
      sub: 'Keep an eye on daily habits — small amounts add up!',
    });
  }

  // 2. Savings rate compliment
  if (savingsRate >= 40) {
    insights.push({
      icon: Sparkles,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      text: '🎉 Outstanding! You\'re saving over 40% of your income.',
      sub: 'You\'re building real wealth. Keep it up!',
    });
  } else if (savingsRate >= 20) {
    insights.push({
      icon: ShieldCheck,
      color: 'text-primary',
      bg: 'bg-primary/10',
      text: '💪 Great discipline! You saved more than 20% this month.',
      sub: 'Consistent saving leads to long-term freedom.',
    });
  } else if (savingsRate > 0 && savingsRate < 10) {
    insights.push({
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      text: 'Your savings rate is below 10% this month.',
      sub: 'Try cutting back on one category to boost your savings.',
    });
  }

  // 3. Negative balance warning
  if (balance < 0) {
    insights.push({
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      text: '⚠️ Your balance is currently negative.',
      sub: 'Consider reviewing your expenses to get back on track.',
    });
  }

  // 4. Expense > Income warning
  if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
    insights.push({
      icon: Flame,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      text: '🔥 You\'ve spent more than you earned this month.',
      sub: `Your top spending category is ${topCategory || 'unknown'}.`,
    });
  }

  // 5. No data yet
  if (monthlyIncome === 0 && monthlyExpense === 0) {
    insights.push({
      icon: Sparkles,
      color: 'text-primary',
      bg: 'bg-primary/10',
      text: 'Welcome to SpendSmart! 👋',
      sub: 'Start by adding your first income or expense transaction.',
    });
  }

  // Return first (most relevant) insight
  return insights[0] || null;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Sun, color: 'text-amber-400' };
  if (h < 17) return { text: 'Good afternoon', Icon: Sunset, color: 'text-orange-400' };
  return { text: 'Good evening', Icon: Moon, color: 'text-indigo-400' };
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ balance: 0, monthlyIncome: 0, monthlyExpense: 0, todaySpend: 0, topCategory: '' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [currency, setCurrency] = useState('INR');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('currency, full_name')
        .eq('id', user.id)
        .single();
      if (profile?.currency) setCurrency(profile.currency);
      if (profile?.full_name) setUserName(profile.full_name.split(' ')[0]);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, type, date, category, note, id, payment_method')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (allTransactions) {
        let balance = 0, mIncome = 0, mExpense = 0, todaySpend = 0;
        const categoryMap = {};

        allTransactions.forEach(t => {
          const amount = parseFloat(t.amount);
          const isCurrentMonth = t.date >= startOfMonth && t.date <= endOfMonth;
          const isToday = t.date >= startOfToday;

          if (t.type === 'income') {
            balance += amount;
            if (isCurrentMonth) mIncome += amount;
          } else {
            balance -= amount;
            if (isCurrentMonth) {
              mExpense += amount;
              categoryMap[t.category] = (categoryMap[t.category] || 0) + amount;
            }
            if (isToday) todaySpend += amount;
          }
        });

        const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        setStats({ balance, monthlyIncome: mIncome, monthlyExpense: mExpense, todaySpend, topCategory });
        setRecentTransactions(allTransactions.slice(0, 5));

        const chartData = Object.keys(categoryMap)
          .map(key => ({ name: key, value: categoryMap[key] }))
          .sort((a, b) => b.value - a.value);
        setCategoryData(chartData);
      }
      setLoading(false);
    }
    fetchDashboardData();
  }, [user]);

  const fmt = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin text-primary"><Wallet size={32} /></div>
      </div>
    );
  }

  const monthName = new Date().toLocaleString('default', { month: 'long' });
  const savingsRate = stats.monthlyIncome > 0
    ? Math.round(((stats.monthlyIncome - stats.monthlyExpense) / stats.monthlyIncome) * 100)
    : 0;

  const insight = getInsight({
    todaySpend: fmt(stats.todaySpend),
    monthlyExpense: stats.monthlyExpense,
    monthlyIncome: stats.monthlyIncome,
    savingsRate,
    topCategory: stats.topCategory,
    balance: stats.balance,
  });

  const { text: greetText, Icon: GreetIcon, color: greetColor } = getGreeting();

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        <GreetIcon size={18} className={greetColor} />
        <p className="text-sm text-muted">
          {greetText}{userName ? `, ${userName}` : ''}!
        </p>
      </div>

      {/* ── Balance Hero Card ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/80 to-emerald-700 text-white shadow-xl shadow-primary/30">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-black/10 blur-xl" />
        <p className="text-sm font-medium text-white/70 mb-1">Total Balance</p>
        <h2 className={`text-4xl font-bold tracking-tight ${stats.balance < 0 ? 'text-red-200' : 'text-white'}`}>
          {fmt(stats.balance)}
        </h2>
        <p className="text-xs text-white/60 mt-2">{monthName} overview · {savingsRate}% saved</p>

        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-400/20 rounded-xl">
              <TrendingUp size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Income</p>
              <p className="text-sm font-bold">{fmt(stats.monthlyIncome)}</p>
            </div>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-red-400/20 rounded-xl">
              <TrendingDown size={16} className="text-red-300" />
            </div>
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Expenses</p>
              <p className="text-sm font-bold">{fmt(stats.monthlyExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Smart Insight Card ────────────────────────────────── */}
      {insight && (
        <div className={`flex items-start gap-4 p-4 rounded-2xl border border-white/5 ${insight.bg} transition-all`}>
          <div className={`p-2.5 rounded-xl ${insight.bg} flex-shrink-0`}>
            <insight.icon size={20} className={insight.color} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{insight.text}</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{insight.sub}</p>
          </div>
        </div>
      )}

      {/* ── Desktop Grid ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Spending Donut */}
          {categoryData.length > 0 && (
            <div className="glass p-6 rounded-3xl h-full border border-white/5">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart size={16} className="text-primary" />
                Spending Breakdown
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-48 h-48 flex-shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmt(v)}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] text-muted uppercase font-bold">Total</p>
                    <p className="text-sm font-black">{fmt(stats.monthlyExpense)}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {categoryData.slice(0, 6).map((item, i) => (
                    <div key={item.name} className="group flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-muted group-hover:text-text transition-colors truncate capitalize">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0">{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Recent Transactions */}
          <div className="glass rounded-3xl overflow-hidden border border-white/5 flex flex-col h-full">
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/5">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-primary" />
                Recent Activity
              </h3>
              <Link to="/transactions" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-12">
                  <EmptyState 
                    icon={Plus}
                    title="Start Tracking"
                    message="No transactions recorded yet."
                    actionLabel="Add Now"
                    onAction={() => window.location.href = '/transactions'}
                  />
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-all group">
                      <div className={`p-3 rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110 ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold capitalize truncate group-hover:text-primary transition-colors">{tx.category}</p>
                        <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {tx.payment_method && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              {tx.payment_method}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-text'}`}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                        </p>
                        {tx.note && <p className="text-[10px] text-muted truncate max-w-[80px] mt-0.5">{tx.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
