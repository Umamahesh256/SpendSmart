import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PasswordInput from '../components/PasswordInput';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setIsSubmitting(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="glass p-8 rounded-3xl shadow-2xl border border-white/10">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary ring-8 ring-primary/5">
              <ShieldCheck size={32} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Set New Password</h2>
          <p className="text-muted text-center mb-8">Choose a strong password to secure your account.</p>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted ml-1">New Password</label>
              <PasswordInput
                id="password"
                name="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted ml-1">Confirm New Password</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Update Password'}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-muted">
            Remember your password? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
