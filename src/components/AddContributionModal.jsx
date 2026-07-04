import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, User, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { contributionSchema } from '../lib/groupLedger';
import { supabase } from '../lib/supabase';

export default function AddContributionModal({ isOpen, onClose, groupId, members, memberProfiles, onContributionAdded, managerId, editItem = null, onAddGuest, memberDues = [] }) {
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    member_due_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Filter dues for selected member
  const outstandingDues = formData.member_id 
    ? memberDues.filter(d => d.member_id === formData.member_id && d.status !== 'Paid')
    : [];

  useEffect(() => {
    if (editItem) {
      setFormData({
        member_id: editItem.member_id,
        amount: editItem.amount.toString(),
        date: editItem.date,
        note: editItem.note || '',
        member_due_id: editItem.member_due_id || ''
      });
    } else {
      setFormData({
        member_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        member_due_id: ''
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate with Zod
      const validatedData = contributionSchema.parse(formData);

      if (editItem) {
        // Update existing contribution
        const { error } = await supabase
          .from('group_contributions')
          .update({
            ...validatedData,
            member_due_id: formData.member_due_id || null
          })
          .eq('id', editItem.id);

        if (error) throw error;
        toast.success('Contribution updated!');
      } else {
        // Insert new contribution
        const { error } = await supabase
          .from('group_contributions')
          .insert([{
            ...validatedData,
            group_id: groupId,
            created_by: managerId,
            member_due_id: formData.member_due_id || null
          }]);

        if (error) throw error;
        toast.success('Contribution logged successfully!');
      }

      onContributionAdded();
      onClose();
    } catch (err) {
      if (err.name === 'ZodError') {
        const fieldErrors = {};
        err.errors.forEach(e => {
          fieldErrors[e.path[0]] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(err.message || 'Operation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/10">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold">{editItem ? 'Edit Contribution' : 'Log Received Funds'}</h2>
            <p className="text-xs text-muted mt-0.5">{editItem ? 'Update the details of this contribution' : 'Record money received from a member'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <User size={14} /> Member Who Sent Money *
            </label>
            <select
              required
              value={formData.member_id}
              onChange={e => {
                if (e.target.value === 'ADD_GUEST') {
                  onAddGuest();
                  setFormData({ ...formData, member_id: '' });
                } else {
                  setFormData({ ...formData, member_id: e.target.value });
                }
              }}
              className={`w-full bg-surface border ${errors.member_id ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none`}
            >
              <option value="">Select a member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {memberProfiles[m.id] || 'Member'}
                </option>
              ))}
              <option value="ADD_GUEST" className="font-bold text-primary">+ Add Guest</option>
            </select>
            {errors.member_id && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.member_id}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <DollarSign size={14} /> Amount Received *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className={`w-full bg-surface border ${errors.amount ? 'border-red-500' : 'border-white/10'} rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.amount}</p>}
          </div>

          {/* Member Due Selection (Optional) */}
          {outstandingDues.length > 0 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <label className="block text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                <FileText size={14} /> Pay Towards Member Due (Optional)
              </label>
              <select
                value={formData.member_due_id}
                onChange={e => {
                  const dueId = e.target.value;
                  const due = outstandingDues.find(d => d.id === dueId);
                  if (due) {
                    setFormData(prev => ({ 
                      ...prev, 
                      member_due_id: dueId,
                      amount: due.remaining_amount.toString(),
                      note: `Payment for ${due.category_name}`
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, member_due_id: '' }));
                  }
                }}
                className="w-full bg-background border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="">-- No, general contribution --</option>
                {outstandingDues.map(due => (
                  <option key={due.id} value={due.id}>
                    {due.category_name} (Owes ₹{due.remaining_amount})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <Calendar size={14} /> Date Received *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className={`w-full bg-surface border ${errors.date ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
            />
            {errors.date && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.date}</p>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <FileText size={14} /> Note / Description
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className={`w-full bg-surface border ${errors.note ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="e.g., May Rent + Groceries"
              maxLength={200}
            />
            {errors.note && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.note}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {loading ? (editItem ? 'Updating…' : 'Logging…') : (editItem ? 'Update Contribution' : 'Log Contribution')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
