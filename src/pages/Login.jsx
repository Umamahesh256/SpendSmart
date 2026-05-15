import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Loader2, KeyRound } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const from = redirectParam || location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
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
            Master your money, manage shared bills, and achieve financial freedom together.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-sm text-muted">Trusted by thousands</p>
            </div>
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-sm text-muted">Group tracking ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 mb-12 animate-fade-in">
          <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
          <span className="text-2xl font-black tracking-tighter">SpendSmart</span>
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="glass p-8 rounded-3xl shadow-2xl relative group overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary ring-8 ring-primary/5">
                  <Wallet size={32} />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
              <p className="text-muted text-center mb-10">Continue your financial journey</p>
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-muted">Password</label>
                    <Link to="/forgot-password" size="sm" className="text-xs text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Sign In'}
                </button>
              </form>
              
              <p className="text-center mt-10 text-muted">
                Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
