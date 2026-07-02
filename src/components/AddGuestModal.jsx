import { useState } from 'react';
import { X, User, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function AddGuestModal({ isOpen, onClose, groupId, onGuestAdded }) {
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Basic validation
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!formData.guest_name.trim()) {
      setErrors({ guest_name: 'Name is required' });
      return;
    }
    if (!phoneRegex.test(formData.guest_phone)) {
      setErrors({ guest_phone: 'Invalid phone number format (e.g. +919876543210)' });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate guest in this group
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('guest_phone', formData.guest_phone)
        .eq('is_guest', true)
        .single();

      if (existing) {
        toast.error('Guest already exists in this group. Use existing guest instead?');
        setLoading(false);
        return;
      }

      // Insert guest
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          guest_name: formData.guest_name,
          guest_phone: formData.guest_phone,
          is_guest: true,
          role: 'member'
        }]);

      if (error) throw error;

      toast.success('Guest added successfully!');
      onGuestAdded();
      setFormData({ guest_name: '', guest_phone: '' });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to add guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/10">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold">Add Guest</h2>
            <p className="text-xs text-muted mt-0.5">Add a non-registered member</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <User size={14} /> Guest Name *
            </label>
            <input
              type="text"
              required
              value={formData.guest_name}
              onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
              className={`w-full bg-surface border ${errors.guest_name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="e.g. Rahul"
            />
            {errors.guest_name && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.guest_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex items-center gap-2">
              <Phone size={14} /> Phone Number *
            </label>
            <input
              type="text"
              required
              value={formData.guest_phone}
              onChange={e => setFormData({ ...formData, guest_phone: e.target.value })}
              className={`w-full bg-surface border ${errors.guest_phone ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="+919876543210"
            />
            {errors.guest_phone && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.guest_phone}</p>}
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
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
