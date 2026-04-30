import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import {
  Shield, Plus, Users, Trash2, Copy, Check, X,
  Mail, TrendingDown, ChevronDown, ChevronRight, DollarSign, Share2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { EXPENSE_CATEGORIES as CATEGORIES } from '../lib/categories';

export default function AdminPanel() {
  const { user } = useAuth();

  // Data
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [invites, setInvites] = useState([]);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  // Forms
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  // ── Fetch all groups created by this admin ─────────────────
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setGroups(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // ── Load group details when selected ───────────────────────
  const loadGroupDetails = useCallback(async (group) => {
    setSelectedGroup(group);

    // Expenses
    const { data: expenses } = await supabase
      .from('group_expenses')
      .select('*')
      .eq('group_id', group.id)
      .order('date', { ascending: false });
    setGroupExpenses(expenses || []);

    // Members
    const { data: members } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id);
    setGroupMembers(members || []);

    // Member profiles
    if (members && members.length > 0) {
      const ids = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const profileMap = {};
      profiles?.forEach(p => { 
        profileMap[p.id] = p.full_name || p.email?.split('@')[0] || 'Member'; 
      });
      setMemberProfiles(profileMap);
    }

    // Invites
    const { data: inv } = await supabase
      .from('invites')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });
    setInvites(inv || []);
  }, []);

  // ── Create group ───────────────────────────────────────────
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg({ type: '', text: '' });
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{ name: groupName, description: groupDesc, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;

      // Auto-add admin as member
      await supabase.from('group_members').insert([{ group_id: data.id, user_id: user.id }]);

      toast.success('Group created successfully!');
      setGroupName(''); setGroupDesc('');
      setShowCreateGroup(false);
      await fetchGroups();
      loadGroupDetails(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Send invite / Direct Add ──────────────────────────────
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setFormLoading(true);
    setFormMsg({ type: '', text: '' });
    
    const emailToInvite = inviteEmail.toLowerCase().trim();

    try {
      // 1. Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', emailToInvite)
        .single();

      if (existingProfile) {
        // User exists! Add directly to group
        // Check if already a member first
        const isAlreadyMember = groupMembers.some(m => m.user_id === existingProfile.id);
        
        if (isAlreadyMember) {
          toast.error(`${existingProfile.full_name || emailToInvite} is already in this group`);
          setFormLoading(false);
          return;
        }

        const { error: joinError } = await supabase
          .from('group_members')
          .insert([{ group_id: selectedGroup.id, user_id: existingProfile.id }]);
        
        if (joinError) throw joinError;
        
        toast.success(`${existingProfile.full_name || 'User'} added directly!`);
        await loadGroupDetails(selectedGroup);
        setInviteEmail('');
        setShowInvite(false);
      } else {
        // User doesn't exist → create invite token
        const { error } = await supabase.from('invites').insert([{
          group_id: selectedGroup.id,
          email: emailToInvite,
          created_by: user.id,
        }]);
        if (error) throw error;
        
        toast.success('User not found. Invite link generated!');
        setInviteEmail('');
        // Reload invites
        const { data: inv } = await supabase
          .from('invites').select('*').eq('group_id', selectedGroup.id).order('created_at', { ascending: false });
        setInvites(inv || []);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete expense ─────────────────────────────────────────
  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    const { error } = await supabase.from('group_expenses').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete expense');
    } else {
      toast.success('Expense deleted');
      setGroupExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // ── Delete group ───────────────────────────────────────────
  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this entire group and all its data?')) return;
    try {
      await supabase.from('group_expenses').delete().eq('group_id', id);
      await supabase.from('group_members').delete().eq('group_id', id);
      await supabase.from('invites').delete().eq('group_id', id);
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      toast.success('Group deleted');
      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Copy invite link ───────────────────────────────────────
  const copyLink = (token) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success('Link copied!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // ── Computed: per-member breakdown ─────────────────────────
  const memberBreakdown = groupMembers.map(m => {
    const total = groupExpenses
      .filter(e => e.added_by === m.user_id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return { userId: m.user_id, name: memberProfiles[m.user_id] || '…', total };
  }).sort((a, b) => b.total - a.total);

  const totalSpent = groupExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={22} className="text-primary" /> Admin Panel
          </h1>
          <p className="text-muted text-sm mt-0.5">Manage groups, members & expenses</p>
        </div>
        <button
          onClick={() => { setShowCreateGroup(true); setFormMsg({ type: '', text: '' }); }}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> New Group
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Group List (left panel) ──────────────────────── */}
        <div className="lg:w-72 flex-shrink-0 space-y-2">
          {loading ? (
            <div className="glass rounded-2xl p-8 text-center text-muted">Loading…</div>
          ) : groups.length === 0 ? (
            <EmptyState 
              icon={Users}
              title="No groups"
              message="You haven't created any groups yet. Start by creating one to track shared expenses."
              actionLabel="Create Group"
              onAction={() => setShowCreateGroup(true)}
            />
          ) : groups.map(g => (
            <button
              key={g.id}
              onClick={() => loadGroupDetails(g)}
              className={`w-full text-left glass p-4 rounded-2xl border transition-all ${selectedGroup?.id === g.id ? 'border-primary bg-primary/5' : 'border-white/5 hover:border-white/20'}`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{g.name}</p>
                  {g.description && <p className="text-xs text-muted mt-0.5 truncate">{g.description}</p>}
                </div>
                <ChevronRight size={16} className="text-muted flex-shrink-0 mt-0.5" />
              </div>
            </button>
          ))}
        </div>

        {/* ── Group Detail (right panel) ───────────────────── */}
        {selectedGroup ? (
          <div className="flex-1 space-y-4 min-w-0">

            {/* Group Header */}
            <div className="glass p-5 rounded-2xl">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
                  {selectedGroup.description && <p className="text-sm text-muted mt-0.5">{selectedGroup.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setShowInvite(true); setFormMsg({ type: '', text: '' }); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Mail size={15} /> Invite
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(selectedGroup.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Summary row */}
              <div className="flex gap-3 mt-4">
                <div className="flex-1 bg-surface/50 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Total Spent</p>
                  <p className="text-lg font-bold mt-0.5">{fmt(totalSpent)}</p>
                </div>
                <div className="flex-1 bg-surface/50 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Members</p>
                  <p className="text-lg font-bold mt-0.5">{groupMembers.length}</p>
                </div>
                <div className="flex-1 bg-surface/50 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Expenses</p>
                  <p className="text-lg font-bold mt-0.5">{groupExpenses.length}</p>
                </div>
              </div>
            </div>

            {/* Per-member breakdown */}
            {memberBreakdown.length > 0 && (
              <div className="glass p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Member Contributions</h3>
                <div className="space-y-2">
                  {memberBreakdown.map(m => {
                    const pct = totalSpent > 0 ? (m.total / totalSpent) * 100 : 0;
                    return (
                      <div key={m.userId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted">{fmt(m.total)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invites */}
            {invites.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Invite Links</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {inv.status}
                        </span>
                      </div>
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => copyLink(inv.token)}
                          className="p-2 bg-surface hover:bg-primary/20 text-muted hover:text-primary rounded-xl transition-colors flex-shrink-0"
                          title="Copy invite link"
                        >
                          {copiedToken === inv.token ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses list */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider">All Expenses</h3>
              </div>
              {groupExpenses.length === 0 ? (
                <div className="py-10 text-center text-muted text-sm">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-20" />
                  No expenses yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {groupExpenses.map(exp => (
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-white/5">
                      <div className="p-2 rounded-xl bg-red-500/10 text-red-500 flex-shrink-0">
                        <TrendingDown size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{exp.description || exp.category}</p>
                        <p className="text-xs text-muted">
                          {memberProfiles[exp.added_by] || 'Unknown'} · {exp.category} · {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{fmt(exp.amount)}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 bg-surface opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex-1 glass rounded-2xl flex flex-col items-center justify-center py-20 text-muted text-center">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Select a group to manage it</p>
            <p className="text-sm opacity-60 mt-1">Or create a new group to get started.</p>
          </div>
        )}
      </div>

      {/* ── Create Group Modal ─────────────────────────────── */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Create Group</h2>
              <button onClick={() => setShowCreateGroup(false)} className="p-2 rounded-full hover:bg-surface text-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              {formMsg.text && (
                <div className={`p-3 rounded-lg text-sm ${formMsg.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {formMsg.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Group Name *</label>
                <input
                  required value={groupName} onChange={e => setGroupName(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Goa Trip 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                <input
                  value={groupDesc} onChange={e => setGroupDesc(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateGroup(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors">
                  {formLoading ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invite Modal ───────────────────────────────────── */}
      {showInvite && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-lg font-bold">Invite to "{selectedGroup.name}"</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-full hover:bg-surface text-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendInvite} className="p-5 space-y-4">
              {formMsg.text && (
                <div className={`p-3 rounded-lg text-sm ${formMsg.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {formMsg.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Member's Email *</label>
                <input
                  type="email" required
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="member@email.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors">
                  {formLoading ? 'Sending…' : 'Generate Invite'}
                </button>
              </div>

              {/* List pending invites with copy links */}
              {invites.filter(i => i.status === 'pending').length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Pending Invites — copy & share</p>
                  {invites.filter(i => i.status === 'pending').map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 bg-surface/50 rounded-xl px-3 py-2">
                      <span className="text-xs truncate text-muted">{inv.email}</span>
                      <button
                        type="button"
                        onClick={() => copyLink(inv.token)}
                        className="p-1.5 bg-surface hover:bg-primary/20 text-muted hover:text-primary rounded-lg transition-colors flex-shrink-0"
                      >
                        {copiedToken === inv.token ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
