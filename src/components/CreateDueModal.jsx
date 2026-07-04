import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateDueModal({ isOpen, onClose, groupId, month, year, onSuccess }) {
  const [formData, setFormData] = useState({
    category_name: '',
    amount: '',
    description: '',
    due_date: '',
    type: 'One-Time',
    priority: 'Normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_name.trim() || !formData.amount || Number(formData.amount) <= 0) {
      setError('Please provide a valid category name and amount.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insErr } = await supabase
        .from('group_dues')
        .insert({
          group_id: groupId,
          category_name: formData.category_name.trim(),
          amount: Number(formData.amount),
          remaining_amount: Number(formData.amount),
          description: formData.description.trim() || null,
          due_date: formData.due_date || null,
          month,
          year,
          type: formData.type,
          priority: formData.priority,
          status: 'Pending'
        });

      if (insErr) throw insErr;

      toast.success('Group Due created successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create group due.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-scale-up">
        <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg font-bold">Create Group Due</h2>
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
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Due Category / Name</label>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Room Rent, Electricity, Cleaning"
                required
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Total due amount"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Due Date (Optional)</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="One-Time">One-Time</option>
                  <option value="Recurring">Recurring</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
                placeholder="Any additional details..."
              />
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
