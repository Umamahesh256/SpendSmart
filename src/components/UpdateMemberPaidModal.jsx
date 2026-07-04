import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdateMemberPaidModal({ isOpen, onClose, groupId, memberId, memberName, currentPaid, month, year, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(currentPaid || '');
      setError('');
    }
  }, [isOpen, currentPaid]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) < 0) {
      setError('Please enter a valid amount (0 or greater).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // First, ensure a member_budget exists for this member for the given month.
      // If it doesn't, we'll need to create a group_budget and member_budget on the fly, 
      // or we can just reject it if they don't have a budget set.
      // Usually, if a member appears in the MemberBudgetPanel, they MIGHT NOT have a budget target (status: 'no_target').
      
      // Let's check if there is an existing group_budget for this month
      const { data: bData } = await supabase
        .from('group_budgets')
        .select('id')
        .eq('group_id', groupId)
        .eq('month', month)
        .eq('year', year)
        .single();
        
      let groupBudgetId = bData?.id;
      
      if (!groupBudgetId) {
        // Create a 0 target group budget just to hold the member_budget if it doesn't exist
        const { data: newGB, error: gbErr } = await supabase
          .from('group_budgets')
          .insert({ group_id: groupId, month, year, budget_amount: 0 })
          .select('id').single();
          
        if (gbErr) throw gbErr;
        groupBudgetId = newGB.id;
      }
      
      // Now update or insert the member_budget with manual_paid
      const { data: mbData } = await supabase
        .from('member_budgets')
        .select('id')
        .eq('group_budget_id', groupBudgetId)
        .eq('member_id', memberId)
        .single();
        
      if (mbData?.id) {
        // Update
        const { error: updErr } = await supabase
          .from('member_budgets')
          .update({ manual_paid: Number(amount) })
          .eq('id', mbData.id);
        if (updErr) throw updErr;
      } else {
        // Insert
        const { error: insErr } = await supabase
          .from('member_budgets')
          .insert({
            group_budget_id: groupBudgetId,
            member_id: memberId,
            target_amount: 0,
            manual_paid: Number(amount)
          });
        if (insErr) throw insErr;
      }

      toast.success(`Updated paid amount for ${memberName}`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update paid amount.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden animate-scale-up">
        <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg font-bold">Update Paid Amount</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                Member
              </label>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-sm font-semibold">
                {memberName}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                Manual Paid Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter exact amount paid"
                autoFocus
              />
              <p className="text-[10px] text-muted mt-2">
                This will override the calculated ledger contributions for this member in the selected month.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? 'Saving...' : <><Save size={16} /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
