import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Target, Plus, Pencil, Trash2, X, PiggyBank } from 'lucide-react';

import { EXPENSE_CATEGORIES as DEFAULT_CATEGORIES } from '../lib/categories';

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: profile } = await supabase.from('profiles').select('currency').eq('id', user.id).single();
    if (profile?.currency) setCurrency(profile.currency);

    const { data: budgetsData } = await supabase
      .from('budgets').select('*').eq('user_id', user.id).order('created_at', { ascending: true });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: expensesData } = await supabase
      .from('transactions').select('category, amount')
      .eq('user_id', user.id).eq('type', 'expense')
      .gte('date', startOfMonth).lte('date', endOfMonth);

    const expenseMap = {};
    if (expensesData) {
      expensesData.forEach(exp => {
        expenseMap[exp.category] = (expenseMap[exp.category] || 0) + parseFloat(exp.amount);
      });
    }

    setBudgets(budgetsData || []);
    setExpenses(expenseMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setBudgetToEdit(budget);
      setCategory(budget.category);
      setLimit(budget.monthly_limit);
    } else {
      setBudgetToEdit(null);
      setCategory(DEFAULT_CATEGORIES[0]);
      setLimit('');
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!user) return;
    setModalLoading(true);
    try {
      if (budgetToEdit) {
        const { error } = await supabase.from('budgets').update({ category, monthly_limit: parseFloat(limit) }).eq('id', budgetToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert([{ user_id: user.id, category, monthly_limit: parseFloat(limit) }]);
        if (error) {
          if (error.code === '23505') throw new Error('A budget for this category already exists.');
          throw error;
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    await supabase.from('budgets').delete().eq('id', id);
    fetchData();
  };

  const fmt = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin text-primary"><Target size={32} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-muted text-sm mt-0.5">Monthly spending limits</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          New
        </button>
      </div>

      {/* ── Budget Cards ─────────────────────────────────────── */}
      {budgets.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-muted">
          <PiggyBank size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-text mb-1">No budgets yet</p>
          <p className="text-sm max-w-xs mx-auto">Create budgets to track and control your monthly spending.</p>
          <button onClick={() => handleOpenModal()} className="mt-5 text-primary font-medium text-sm hover:underline">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const spent = expenses[budget.category] || 0;
            const lim = parseFloat(budget.monthly_limit);
            const pct = Math.min((spent / lim) * 100, 100);
            const remaining = Math.max(lim - spent, 0);

            let barColor = 'bg-emerald-500';
            let textColor = 'text-emerald-500';
            if (pct >= 90) { barColor = 'bg-red-500'; textColor = 'text-red-500'; }
            else if (pct >= 75) { barColor = 'bg-amber-500'; textColor = 'text-amber-500'; }

            return (
              <div key={budget.id} className="glass p-4 rounded-2xl group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold capitalize">{budget.category}</h3>
                    <p className="text-xs text-muted mt-0.5">{fmt(remaining)} remaining</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleOpenModal(budget)} className="p-1.5 bg-surface hover:bg-primary/20 text-muted hover:text-primary rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="p-1.5 bg-surface hover:bg-red-500/20 text-muted hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs mt-2">
                  <span className={`${textColor} font-semibold`}>{fmt(spent)} spent</span>
                  <span className="text-muted">of {fmt(lim)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Budget Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">{budgetToEdit ? 'Edit Budget' : 'New Budget'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-surface text-muted hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!!budgetToEdit}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
                >
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                  <input
                    type="number" step="1" min="1" required
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium border border-white/10 hover:bg-surface transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading} className="flex-1 py-3 rounded-xl font-medium text-white bg-primary hover:bg-emerald-400 transition-colors disabled:opacity-50 text-sm">
                  {modalLoading ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
