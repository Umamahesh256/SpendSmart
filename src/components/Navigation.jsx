import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  PieChart, Home, LayoutDashboard, ArrowRightLeft,
  Target, Settings as SettingsIcon, LogOut, ShieldCheck, HelpCircle, UserPlus, Share2
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function Navigation() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = profile?.role === 'admin';

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInvite = async () => {
    const inviteText = "Track expenses with me on SpendSmart! Sign up here:";
    const inviteUrl = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SpendSmart', text: inviteText, url: inviteUrl });
      } catch (e) {
        if (e.name !== 'AbortError') toast.error("Failed to share");
      }
    } else {
      navigator.clipboard.writeText(`${inviteText} ${inviteUrl}`);
      toast.success('App link copied to clipboard!');
    }
  };

  const navLinks = [
    { to: '/',             label: 'Home',         icon: Home },
    { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { to: '/budgets',      label: 'Budgets',      icon: Target },
    { to: '/settings',     label: 'Settings',     icon: SettingsIcon },
    { to: '#',             label: 'Help',         icon: HelpCircle, onClick: () => window.dispatchEvent(new CustomEvent('open-help')) },
  ];

  if (isAdmin) {
    navLinks.splice(4, 0, { to: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* ─── MOBILE TOP BAR ─────────────────────────────────── */}
      <nav
        className={`md:hidden px-5 py-3.5 flex justify-between items-center sticky top-0 z-50 transition-all duration-300 ${
          isHome && !scrolled ? 'bg-transparent' : 'glass shadow-lg'
        }`}
      >
        <Link to="/" className="text-xl font-bold text-text flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <PieChart size={22} strokeWidth={2.5} />
          </div>
          SpendSmart
        </Link>

        {user ? (
          <button onClick={handleInvite} className="p-2 text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
            <UserPlus size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-xs font-medium text-text px-3 py-1.5 rounded-lg border border-white/10">Log in</Link>
            <Link to="/register" className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg">Sign up</Link>
          </div>
        )}
      </nav>

      {/* ─── DESKTOP SIDEBAR ────────────────────────────────── */}
      {user && (
        <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-surface/50 backdrop-blur-xl border-r border-white/5 p-8 z-50">
          <div className="mb-10">
            <Link to="/" className="text-2xl font-bold text-text flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <PieChart size={28} strokeWidth={2.5} />
              </div>
              SpendSmart
            </Link>
          </div>

          <nav className="flex-1 space-y-2">
            {navLinks.map(({ to, label, icon: Icon, onClick }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                  onClick={onClick}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-2">
            <button
              onClick={handleInvite}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
            >
              <UserPlus size={20} />
              Invite Friends
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* ─── MOBILE BOTTOM TAB BAR ─────────────────────────── */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
          <div className="glass border-t border-white/10 px-2">
            <div className="flex justify-around items-center h-16">
              {navLinks.map(({ to, label, icon: Icon, onClick }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onClick}
                    className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
                  >
                    {active && (
                      <span className="absolute top-0 w-8 h-1 rounded-b-full bg-primary" />
                    )}
                    <Icon
                      size={20}
                      className={`transition-colors ${active ? 'text-primary' : 'text-muted'}`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                    <span
                      className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${
                        active ? 'text-primary' : 'text-muted'
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* ─── GUEST TOP NAV (Desktop) ───────────────────────── */}
      {!user && (
        <nav className="hidden md:flex items-center justify-between px-10 py-5 sticky top-0 z-40 glass">
          <Link to="/" className="text-2xl font-bold text-text flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <PieChart size={28} strokeWidth={2.5} />
            </div>
            SpendSmart
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-muted hover:text-text px-4 py-2">Log in</Link>
            <Link to="/register" className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-emerald-400 shadow-lg shadow-primary/20 transition-all">Get Started</Link>
          </div>
        </nav>
      )}
    </>
  );
}
