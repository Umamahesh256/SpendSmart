import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Users, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | valid | invalid | accepted | error | wrong_email
  const [invite, setInvite] = useState(null);
  const [group, setGroup] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    if (authLoading) return;

    async function processInvite() {
      // 1. Look up invite by token
      const { data: inv, error } = await supabase
        .from('invites')
        .select('*, groups(name, description)')
        .eq('token', token)
        .single();

      if (error || !inv) { setStatus('invalid'); return; }
      if (inv.status === 'accepted') { setStatus('accepted'); setInvite(inv); setGroup(inv.groups); return; }

      setInvite(inv);
      setGroup(inv.groups);

      // 2. If not logged in → show invite preview with login/signup options
      if (!user) {
        setStatus('valid');
        return;
      }

      // 3. Email-specific invite: check email matches
      if (inv.email && user.email.toLowerCase() !== inv.email.toLowerCase()) {
        setStatus('wrong_email');
        return;
      }

      // 4. Auto-accept: add to group_members, mark invite accepted
      try {
        // Check if already a member
        const { data: existing } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', inv.group_id)
          .eq('user_id', user.id)
          .single();

        if (!existing) {
          const { error: joinError } = await supabase
            .from('group_members')
            .insert([{ group_id: inv.group_id, user_id: user.id }]);
          if (joinError) throw joinError;
        }

        // Mark invite accepted (open invites stay usable — only mark if email-specific)
        if (inv.email) {
          await supabase.from('invites').update({ status: 'accepted' }).eq('id', inv.id);
        }

        setStatus('joined');
        setTimeout(() => navigate(`/group/${inv.group_id}`), 2000);
      } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
      }
    }

    processInvite();
  }, [token, user, authLoading, navigate]);

  const handleLoginRedirect = () => {
    navigate(`/login?redirect=/invite?token=${token}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center shadow-2xl animate-fade-in">

        {/* Loading */}
        {(status === 'loading') && (
          <>
            <Loader size={48} className="mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-bold">Checking your invite…</h2>
          </>
        )}

        {/* Valid — not logged in */}
        {status === 'valid' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're Invited!</h2>
            {group && <p className="text-muted mb-1">Join <span className="font-semibold text-text">{group.name}</span></p>}
            {group?.description && <p className="text-muted text-sm mb-6">{group.description}</p>}
            <p className="text-sm text-muted mb-6">
              This invite is for <span className="font-medium text-text">{invite?.email}</span>.<br />
              Please log in or sign up with that email to accept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLoginRedirect}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                Log In to Accept
              </button>
              <button
                onClick={() => navigate(`/register?email=${invite?.email}&redirect=/invite?token=${token}`)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-surface transition-colors"
              >
                Sign Up
              </button>
            </div>
          </>
        )}

        {/* Already accepted */}
        {status === 'accepted' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
            <h2 className="text-xl font-bold mb-2">Already Joined!</h2>
            <p className="text-muted text-sm mb-6">You've already accepted this invite to <span className="font-semibold text-text">{group?.name}</span>.</p>
            <button onClick={() => navigate(`/group/${invite?.group_id}`)} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-emerald-400 transition-colors">
              Go to Group Room
            </button>
          </>
        )}

        {/* Joined! */}
        {status === 'joined' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
            <h2 className="text-2xl font-bold mb-2">Welcome aboard! 🎉</h2>
            <p className="text-muted text-sm mb-2">You've successfully joined <span className="font-semibold text-text">{group?.name}</span>.</p>
            <p className="text-xs text-muted">Redirecting to group room…</p>
          </>
        )}

        {/* Wrong email */}
        {status === 'wrong_email' && (
          <>
            <XCircle size={48} className="mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">Wrong Account</h2>
            <p className="text-muted text-sm mb-6">
              This invite was sent to <span className="font-semibold text-text">{invite?.email}</span>.<br />
              You're logged in as <span className="font-semibold text-text">{user?.email}</span>.
            </p>
            <p className="text-xs text-muted">Please sign in with the correct email to accept this invite.</p>
          </>
        )}

        {/* Invalid */}
        {status === 'invalid' && (
          <>
            <XCircle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Invalid Invite</h2>
            <p className="text-muted text-sm mb-6">This invite link is invalid or has expired.</p>
            <button onClick={() => navigate('/')} className="w-full py-3 rounded-xl bg-surface border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors">
              Back to Home
            </button>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted text-sm mb-6">{errorMsg}</p>
            <button onClick={() => navigate('/')} className="w-full py-3 rounded-xl bg-surface border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors">
              Back to Home
            </button>
          </>
        )}

      </div>
    </div>
  );
}
