import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? 'member');
        setChecking(false);
      });
  }, [user]);

  if (loading || checking) {
    return (
      <div className="flex justify-center items-center h-64">
        <Shield size={32} className="animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <Shield size={48} className="text-red-500 opacity-40" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted text-sm">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return children;
}
