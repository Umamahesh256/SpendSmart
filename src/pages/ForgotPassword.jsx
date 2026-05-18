import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { resetPassword } = useAuth();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResetRequest = async (e) => {
    if (e) e.preventDefault();
    if (cooldown > 0) return;
    setIsSubmitting(true);

    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setIsSent(true);
      setCooldown(60);
      toast.success('Reset link sent to your email!');
    } catch (err) {
      toast.error(err.message);
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
        setCooldown(60);
      } else {
        setCooldown(10); // Standard brief cooldown
      }
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
              <KeyRound size={32} />
            </div>
          </div>

          {!isSent ? (
            <>
              <h2 className="text-3xl font-bold text-center mb-2">Forgot Password?</h2>
              <p className="text-muted text-center mb-8">Enter your email and we'll send you a link to reset your password.</p>

              <form onSubmit={handleResetRequest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cooldown > 0}
                  className="w-full py-4 bg-primary hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : cooldown > 0 ? (
                    `Resubmit in ${cooldown}s`
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Check Your Email</h3>
                <p className="text-muted leading-relaxed">
                  We've sent a password reset link to <span className="text-text font-medium">{email}</span>.
                </p>
              </div>
              <p className="text-sm text-muted">
                Didn't receive the email?{' '}
                <button
                  disabled={cooldown > 0}
                  onClick={handleResetRequest}
                  className="text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Click to resend'}
                </button>
              </p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link to="/login" className="flex items-center justify-center gap-2 text-muted hover:text-text transition-colors group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
