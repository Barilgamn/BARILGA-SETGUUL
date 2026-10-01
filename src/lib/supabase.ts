import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!url && !!anonKey;

if (!supabaseConfigured) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set; see .env.example');
}

// Without a project, fail every call at once instead of letting the client
// retry against a host that isn't there
const unconfiguredFetch: typeof fetch = () => Promise.reject(new Error('Supabase is not configured'));

// The anon key is public by design; row level security in
// supabase/migrations decides what each visitor may read or write.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
  ...(supabaseConfigured ? {} : { global: { fetch: unconfiguredFetch } }),
});
