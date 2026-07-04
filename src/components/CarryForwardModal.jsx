import React, { useState } from 'react';
import { X, ArrowRight, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function CarryForwardModal({ 
  isOpen, 
  onClose, 
  groupId,
  memberId,
  memberName,
  overpaidAmount, 
  fromMonth, 
  fromYear,
  onSuccess 
}) {
  const [amount, setAmount] = useState(overpaidAmount?.toString() || '');
  const [toMonth, setToMonth] = useState((fromMonth % 12) + 1);
  const [toYear, setToYear] = useState(fromMonth === 12 ? fromYear + 1 : fromYear);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid positive amount.');
      return;
    }
    if (val > overpaidAmount) {
      toast.error(`Amount cannot exceed the overpaid amount (₹${overpaidAmount}).`);
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const carryData = {
        group_id: groupId,
        member_id: memberId,
        from_month: fromMonth,
        from_year: fromYear,
        to_month: toMonth,
        to_year: toYear,
        original_amount: val,
        used_amount: 0,
        remaining_amount: val,
        status: 'active',
        created_by: user.id
      };

      const { error } = await supabase.from('budget_carry_forwards').insert([carryData]);
      if (error) throw error;
      
      toast.success('Funds carried forward successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-fade-in">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <ArrowRight className="text-primary" size={20} /> Carry Forward
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-muted transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              <span className="font-bold">{memberName}</span> has an overpaid amount of <span className="font-bold">₹{overpaidAmount}</span> for {monthNames[fromMonth - 1]} {fromYear}. You can carry this amount forward to their budget in a future month.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Target Month</label>
              <div className="flex gap-2">
                <select 
                  value={toMonth} 
                  onChange={(e) => setToMonth(parseInt(e.target.value))} 
                  className="w-2/3 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  value={toYear} 
                  onChange={(e) => setToYear(parseInt(e.target.value))} 
                  className="w-1/3 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-text focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1">Amount to Carry Forward</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                  <DollarSign size={16} />
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={overpaidAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl pl-10 pr-4 py-3 text-text focus:ring-2 focus:ring-primary/50 text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-text font-semibold hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Carry Forward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
