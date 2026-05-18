import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

export default function AuthRedirectHandler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Reset hasProcessed on route/location change to ensure clean checking
    // if new parameters are appended
    const hash = window.location.hash;
    const search = window.location.search;

    if (!hash && !search) {
      hasProcessed.current = false;
      return;
    }

    if (hasProcessed.current) return;

    // Helper to parse key-value pairs from hash or query string
    const parseParams = (str) => {
      if (!str) return {};
      const cleanStr = str.startsWith('#') || str.startsWith('?') ? str.substring(1) : str;
      return Object.fromEntries(new URLSearchParams(cleanStr).entries());
    };

    const hashParams = parseParams(hash);
    const searchParams = parseParams(search);

    // 1. Check for auth/verification errors redirected by GoTrue (e.g., expired token, rate limits)
    const error = hashParams.error || searchParams.error;
    const errorDescription = hashParams.error_description || searchParams.error_description;

    if (error || errorDescription) {
      hasProcessed.current = true;
      const decodedError = decodeURIComponent((errorDescription || error || '').replace(/\+/g, ' '));
      
      toast.error(`Authentication failed: ${decodedError}`, {
        id: 'auth-error-toast',
        duration: 6000,
      });

      // Clear the url parameters cleanly to keep the address bar clean
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    // 2. Check for successful email confirmation/signup redirect
    const type = hashParams.type || searchParams.type;
    const isSignupConfirm = type === 'signup' || type === 'invite';
    const isRecovery = type === 'recovery';

    if (isSignupConfirm) {
      if (user) {
        hasProcessed.current = true;
        toast.success("Email verified successfully! Welcome to SpendSmart! 🎉", {
          id: 'auth-success-toast',
          duration: 6000,
        });
        
        // Clear the URL hash/query
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      }
    } else if (isRecovery) {
      if (user) {
        hasProcessed.current = true;
        toast.success("Password reset link verified! Please set your new password.", {
          id: 'auth-recovery-toast',
          duration: 6000,
        });

        // Clear hash but navigate directly to /reset-password
        window.history.replaceState(null, '', '/reset-password');
        navigate('/reset-password', { replace: true });
      }
    }
  }, [user, navigate, location]);

  return null;
}
