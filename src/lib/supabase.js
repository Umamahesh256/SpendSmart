import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// CLEANING: Automatically strip quotes if the user pasted them into Vercel by mistake
const supabaseUrl = rawUrl?.replace(/^["']|["']$/g, '')
const supabaseAnonKey = rawKey?.replace(/^["']|["']$/g, '')

if (rawUrl !== supabaseUrl || rawKey !== supabaseAnonKey) {
  console.warn('%c WARNING: Accidental quotes detected in Environment Variables. They have been stripped for you.', 'color: #f59e0b; font-weight: bold;');
}

// Log highly visible error if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('%c CRITICAL: Supabase environment variables are missing!', 'background: #ef4444; color: white; font-size: 16px; padding: 4px; border-radius: 4px;');
  console.warn('Check Vercel Project Settings -> Environment Variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  
  if (typeof window !== 'undefined') {
    window.__SUPABASE_CONFIG_ERROR__ = true;
  }
}

// Prevent the "supabaseUrl is required" crash by only initializing if variables exist.
// If they don't, we export a proxy object that handles calls gracefully without crashing.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({}, {
      get: (target, prop) => {
        // Return a dummy handler that returns a Promise to avoid ".then is not a function"
        const dummyHandler = (...args) => Promise.resolve({
          data: { 
            session: null, 
            user: null, 
            subscription: { unsubscribe: () => {} } 
          },
          error: { message: "Supabase not configured" }
        });
        
        // Return the handler as a Proxy to allow infinite nesting (e.g., supabase.auth.onAuthStateChange)
        return new Proxy(dummyHandler, {
          get: (t, p) => {
            if (p === 'then') return undefined; 
            return new Proxy(dummyHandler, { get: () => dummyHandler });
          }
        });
      }
    });
