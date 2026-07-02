import { useState } from 'react';
import { X, Save, IndianRupee } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function UpdateBalanceModal({ isOpen, onClose, groupId, currentBalance, onUpdate }) {
  const [balance, setBalance] = useState(currentBalance || 0);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          manual_balance: balance,
          manual_balance_updated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Balance updated successfully');
      onUpdate(balance);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-background border border-white/10 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surface/50">
          <h2 className="text-xl font-bold">Update Actual Balance</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted flex items-center gap-2">
              <IndianRupee size={16} /> Enter current group fund balance
            </label>
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xl">₹</div>
              <input
                type="number"
                step="0.01"
                required
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value))}
                className="w-full bg-surface border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted">This will override the calculated pool balance for display purposes.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
