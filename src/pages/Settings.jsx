import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { User, Lock, Moon, Sun, Monitor, LogOut, Settings2, CreditCard, ChevronDown, HelpCircle, ChevronRight, UserPlus } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Accordion State
  const [expandedSection, setExpandedSection] = useState('profile');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  // Profile State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [currency, setCurrency] = useState('INR');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Security State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });

  // Load Profile from DB
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('currency, full_name')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setCurrency(data.currency || 'INR');
        if (data.full_name) setFullName(data.full_name);
      }
    }
    loadProfile();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      // Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (authError) throw authError;

      // Update Database profile
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, currency: currency })
        .eq('id', user.id);
      if (dbError) throw dbError;

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setSecurityMessage({ type: 'error', text: 'Passwords do not match.' });
    }
    if (password.length < 6) {
      return setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    }

    setSecurityLoading(true);
    setSecurityMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      
      setSecurityMessage({ type: 'success', text: 'Password updated successfully!' });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSecurityMessage({ type: 'error', text: error.message });
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings2 className="text-primary" size={32} />
          Settings
        </h1>
        <p className="text-muted mt-2">Manage your account preferences and security.</p>
      </div>

      <div className="space-y-4">
        
        {/* Profile & Preferences */}
        <section className="glass rounded-2xl overflow-hidden transition-all duration-300 border border-white/5">
          <button 
            onClick={() => toggleSection('profile')}
            className="w-full p-6 flex items-center justify-between text-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-3">
              <User size={22} className="text-primary" /> Profile & Preferences
            </span>
            <ChevronDown className={`transition-transform duration-300 ${expandedSection === 'profile' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${expandedSection === 'profile' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="p-6 md:p-8 border-t border-white/10">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileMessage.text && (
                  <div className={`p-3 rounded-lg text-sm ${profileMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'}`}>
                    {profileMessage.text}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted mt-1">Email cannot be changed currently.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    placeholder="Your Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1 flex items-center gap-2">
                    <CreditCard size={14} />
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={profileLoading}
                  className="mt-6 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Account Security */}
        <section className="glass rounded-2xl overflow-hidden transition-all duration-300 border border-white/5">
          <button 
            onClick={() => toggleSection('security')}
            className="w-full p-6 flex items-center justify-between text-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-3">
              <Lock size={22} className="text-primary" /> Account Security
            </span>
            <ChevronDown className={`transition-transform duration-300 ${expandedSection === 'security' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${expandedSection === 'security' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="p-6 md:p-8 border-t border-white/10">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {securityMessage.text && (
                  <div className={`p-3 rounded-lg text-sm ${securityMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'}`}>
                    {securityMessage.text}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={securityLoading}
                  className="mt-6 bg-surface border border-white/10 text-text font-semibold py-3 px-6 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {securityLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="glass rounded-2xl overflow-hidden transition-all duration-300 border border-white/5">
          <button 
            onClick={() => toggleSection('appearance')}
            className="w-full p-6 flex items-center justify-between text-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-3">
              <Monitor size={22} className="text-primary" /> Appearance
            </span>
            <ChevronDown className={`transition-transform duration-300 ${expandedSection === 'appearance' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${expandedSection === 'appearance' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="p-6 md:p-8 border-t border-white/10">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex justify-center items-center gap-3 p-4 rounded-xl border transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface hover:bg-white/5 text-text'}`}
                >
                  <Sun size={20} />
                  <span className="font-medium">Light</span>
                </button>
                
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex justify-center items-center gap-3 p-4 rounded-xl border transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface hover:bg-white/5 text-text'}`}
                >
                  <Moon size={20} />
                  <span className="font-medium">Dark</span>
                </button>
                
                <button
                  onClick={() => setTheme('system')}
                  className={`flex-1 flex justify-center items-center gap-3 p-4 rounded-xl border transition-all ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface hover:bg-white/5 text-text'}`}
                >
                  <Monitor size={20} />
                  <span className="font-medium">System</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Help & Support & Invite */}
        <section className="glass rounded-2xl overflow-hidden transition-all duration-300 border border-white/5">
          <button 
            onClick={() => toggleSection('help')}
            className="w-full p-6 flex items-center justify-between text-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-3">
              <HelpCircle size={22} className="text-primary" /> Help & Support
            </span>
            <ChevronDown className={`transition-transform duration-300 ${expandedSection === 'help' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${expandedSection === 'help' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="p-6 md:p-8 border-t border-white/10 space-y-4">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-help'))}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all text-left border border-white/5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <span className="font-bold block text-text text-lg">How to use SpendSmart</span>
                    <span className="text-sm text-muted">A quick guide to all features</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={async () => {
                  const inviteText = "Track expenses with me on SpendSmart! Sign up here:";
                  const inviteUrl = window.location.origin;
                  if (navigator.share) {
                    try { await navigator.share({ title: 'SpendSmart', text: inviteText, url: inviteUrl }); } catch (e) {}
                  } else {
                    navigator.clipboard.writeText(`${inviteText} ${inviteUrl}`);
                    alert('App link copied to clipboard!');
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all text-left border border-white/5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <span className="font-bold block text-text text-lg">Invite Friends to SpendSmart</span>
                    <span className="text-sm text-muted">Share the app with others</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* ── Sign Out ─────────────────────────────────────────── */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-500 font-semibold hover:bg-red-500/15 transition-colors"
      >
        <LogOut size={18} />
        Sign Out
      </button>

    </div>
  );
}
