import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Loader2 } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [cooldown, setCooldown] = useState(0);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Prefill email if coming from invite
  useState(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  });

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cooldown > 0) return;

    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await signUp(email, password, fullName);
      if (error) throw error;
      
      if (data?.session) {
        toast.success('Account created successfully!');
        const redirectTo = searchParams.get('redirect') || '/dashboard';
        navigate(redirectTo);
      } else {
        toast.success('Verification email sent! Please check your inbox to confirm your account.', {
          duration: 6000
        });
        setCooldown(60); // Protect against duplicate signup submissions
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message);
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
        setCooldown(60);
      } else {
        setCooldown(10); // Standard brief cooldown to prevent duplicate submissions on other errors
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#020617] overflow-hidden">
      {/* Branding Section - Desktop Only */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/10" />
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
              <img src="/favicon.svg" alt="Logo" className="w-16 h-16" />
            </div>
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              SpendSmart
            </h1>
          </div>
          <p className="text-2xl text-muted font-medium leading-relaxed">
            Join thousands of users managing their group finances with elegance and ease.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-sm text-muted">Free for personal use</p>
            </div>
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-sm text-muted">Unlimited groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 mb-8 animate-fade-in">
          <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
          <span className="text-2xl font-black tracking-tighter">SpendSmart</span>
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="glass p-8 rounded-3xl shadow-2xl relative group overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 ring-8 ring-emerald-500/5">
                  <Wallet size={32} />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
              <p className="text-muted text-center mb-8">Start taking control of your finances</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted ml-1">Password</label>
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
                    <label className="text-sm font-medium text-muted ml-1">Confirm</label>
                    <PasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cooldown > 0}
                  className="w-full py-4 bg-primary hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : cooldown > 0 ? (
                    `Resubmit in ${cooldown}s`
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
              
              <p className="text-center mt-8 text-muted">
                Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
