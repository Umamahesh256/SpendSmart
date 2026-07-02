import { useState, useEffect } from 'react';
import { X, DollarSign, Users, ToggleLeft, ToggleRight, PiggyBank, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

/**
 * GroupBudgetModal — CRUD for monthly group budget + member allocation
 * Admin-only modal
 */
export default function GroupBudgetModal({ isOpen, onClose, groupId, members, memberProfiles, userId, existingBudget, existingMemberBudgets, onBudgetSaved }) {
  const now = new Date();
  const [month, setMonth] = useState(existingBudget?.month || (now.getMonth() + 1));
  const [year, setYear] = useState(existingBudget?.year || now.getFullYear());
  const [budgetAmount, setBudgetAmount] = useState(existingBudget?.budget_amount?.toString() || '');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
  const [customAmounts, setCustomAmounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Non-guest members for allocation
  const allocatableMembers = members.filter(m => !m.is_guest);

  useEffect(() => {
    if (existingBudget) {
      setMonth(existingBudget.month);
      setYear(existingBudget.year);
      setBudgetAmount(existingBudget.budget_amount?.toString() || '');
    }
    
    // Populate custom amounts from existing member budgets
    if (existingMemberBudgets?.length > 0) {
      const map = {};
      let hasCustom = false;
      const equalTarget = parseFloat(budgetAmount || 0) / (allocatableMembers.length || 1);
      
      existingMemberBudgets.forEach(mb => {
        map[mb.member_id] = mb.target_amount?.toString() || '0';
        if (Math.abs(parseFloat(mb.target_amount) - equalTarget) > 0.01) {
          hasCustom = true;
        }
      });
      setCustomAmounts(map);
      if (hasCustom) setSplitMode('custom');
    }
  }, [existingBudget, existingMemberBudgets, isOpen]);

  if (!isOpen) return null;

  const budget = parseFloat(budgetAmount) || 0;
  const equalShare = allocatableMembers.length > 0 ? (budget / allocatableMembers.length) : 0;
  
  const customTotal = splitMode === 'custom' 
    ? Object.values(customAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
    : 0;
  
  const isCustomValid = splitMode === 'equal' || Math.abs(customTotal - budget) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (budget <= 0) return toast.error('Budget must be greater than zero');
    if (!isCustomValid) return toast.error(`Member targets must sum to ${budgetAmount}. Currently: ${customTotal.toFixed(2)}`);

    setLoading(true);
    try {
      let budgetId;

      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('group_budgets')
          .update({ budget_amount: budget, updated_at: new Date().toISOString() })
          .eq('id', existingBudget.id);
        if (error) throw error;
        budgetId = existingBudget.id;
      } else {
        // Create new budget
        const { data, error } = await supabase
          .from('group_budgets')
          .insert([{
            group_id: groupId,
            month,
            year,
            budget_amount: budget,
            created_by: userId
          }])
          .select('id')
          .single();
        if (error) throw error;
        budgetId = data.id;
      }

      // Upsert member budgets
      const memberBudgetRows = allocatableMembers.map(m => ({
        group_budget_id: budgetId,
        member_id: m.id,
        target_amount: splitMode === 'equal' 
          ? parseFloat(equalShare.toFixed(2)) 
          : parseFloat(customAmounts[m.id] || 0)
      }));

      // Delete existing member budgets first, then insert fresh
      if (existingBudget) {
        await supabase.from('member_budgets').delete().eq('group_budget_id', budgetId);
      }

      const { error: mbError } = await supabase
        .from('member_budgets')
        .insert(memberBudgetRows);
      if (mbError) throw mbError;

      toast.success(existingBudget ? 'Budget updated!' : 'Budget created!');
      onBudgetSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingBudget) return;
    if (!confirm('Delete this budget? Member targets will also be removed.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('group_budgets').delete().eq('id', existingBudget.id);
      if (error) throw error;
      toast.success('Budget deleted');
      onBudgetSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/10 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <PiggyBank size={20} className="text-violet-400" />
              {existingBudget ? 'Edit Budget' : 'Set Monthly Budget'}
            </h2>
            <p className="text-xs text-muted mt-0.5">Define spending limits and member targets</p>
          </div>
          <div className="flex gap-2">
            {existingBudget && (
              <button onClick={handleDelete} disabled={loading} className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-muted transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Month/Year Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Month</label>
              <select 
                value={month} 
                onChange={e => setMonth(parseInt(e.target.value))}
                disabled={!!existingBudget}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Year</label>
              <select 
                value={year} 
                onChange={e => setYear(parseInt(e.target.value))}
                disabled={!!existingBudget}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
              >
                {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Budget Amount */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <DollarSign size={14} /> Total Budget *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={budgetAmount}
                onChange={e => setBudgetAmount(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 7500"
              />
            </div>
          </div>

          {/* Split Mode Toggle */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1">
                <Users size={10} /> Allocation Mode
              </p>
              <button
                type="button"
                onClick={() => setSplitMode(splitMode === 'equal' ? 'custom' : 'equal')}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-emerald-300 transition-colors"
              >
                {splitMode === 'equal' ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                {splitMode === 'equal' ? 'Equal Split' : 'Custom Split'}
              </button>
            </div>

            {splitMode === 'equal' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  Each member pays: <span className="font-bold text-primary">₹{equalShare.toFixed(2)}</span>
                </p>
                <div className="space-y-1">
                  {allocatableMembers.map(m => (
                    <div key={m.id} className="flex justify-between items-center text-sm py-1">
                      <span className="text-muted">{memberProfiles[m.id] || 'Member'}</span>
                      <span className="font-bold">₹{equalShare.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {allocatableMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-muted flex-1 truncate">{memberProfiles[m.id] || 'Member'}</span>
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customAmounts[m.id] || ''}
                        onChange={e => setCustomAmounts({ ...customAmounts, [m.id]: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
                <div className={`flex justify-between text-xs font-bold pt-2 border-t border-white/5 ${isCustomValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span>Total: ₹{customTotal.toFixed(2)}</span>
                  <span>Budget: ₹{budget.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors font-medium">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !isCustomValid} 
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {loading ? 'Saving…' : (existingBudget ? 'Update Budget' : 'Create Budget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
