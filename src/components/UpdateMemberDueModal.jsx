import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdateMemberDueModal({ isOpen, onClose, editItem, members, memberProfiles, onSuccess }) {
  const [formData, setFormData] = useState({
    member_id: '',
    category_name: '',
    amount: '',
    description: '',
    type: 'One-Time',
    priority: 'Normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editItem) {
      setFormData({
        member_id: editItem.member_id || '',
        category_name: editItem.category_name || '',
        amount: editItem.amount || '',
        description: editItem.description || '',
        type: editItem.type || 'One-Time',
        priority: editItem.priority || 'Normal'
      });
    }
  }, [editItem]);

  if (!isOpen || !editItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.member_id) {
      setError('Please select a member.');
      return;
    }
    if (!formData.category_name.trim() || !formData.amount || Number(formData.amount) <= 0) {
      setError('Please provide a valid category name and amount.');
      return;
    }

    // Basic logic to handle if they increase/decrease the total amount
    // The trigger doesn't auto-handle manual amount adjustments of the due itself,
    // so we recalculate remaining_amount based on what they've paid.
    const originalAmount = parseFloat(editItem.amount);
    const newAmount = parseFloat(formData.amount);
    const originalRemaining = parseFloat(editItem.remaining_amount);
    const amountPaid = originalAmount - originalRemaining;
    let newRemaining = newAmount - amountPaid;
    if (newRemaining < 0) newRemaining = 0;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: updErr } = await supabase
        .from('member_dues')
        .update({
          member_id: formData.member_id,
          category_name: formData.category_name.trim(),
          amount: newAmount,
          remaining_amount: newRemaining,
          description: formData.description.trim() || null,
          type: formData.type,
          priority: formData.priority,
        })
        .eq('id', editItem.id);

      if (updErr) throw updErr;

      toast.success('Member Due updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update member due.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-scale-up">
        <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg font-bold">Update Member Due</h2>
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
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Select Member/Guest</label>
              <select
                value={formData.member_id}
                onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                required
              >
                <option value="">-- Choose Member --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{memberProfiles[m.id] || 'Member'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Due Category / Name</label>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Groceries, Special Event"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Total Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Description (Optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Any additional details..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Due Type</label>
              <div className="flex bg-background border border-white/10 rounded-xl p-1">
                {['One-Time', 'Recurring'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      formData.type === type ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
