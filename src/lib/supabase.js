import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('%c CRITICAL: Supabase environment variables are missing!', 'background: #ef4444; color: white; font-size: 16px; padding: 4px; border-radius: 4px;');
  console.warn('Check Vercel Project Settings -> Environment Variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  
  // Attach a warning to the window so our diagnostic script can see it
  if (typeof window !== 'undefined') {
    window.__SUPABASE_CONFIG_ERROR__ = true;
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
