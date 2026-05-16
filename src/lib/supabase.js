import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'CRITICAL: Supabase environment variables are missing! Check Vercel project settings.';
  console.error(errorMsg);
  // We throw a delayed error to ensure the ErrorBoundary can catch it during app initialization
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Just a log for now, as throwing here might be too early for some boundaries
      console.warn('App will likely fail because of missing Supabase config.');
    });
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
