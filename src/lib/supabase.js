import { createClient } from '@supabase/supabase-js';

// Publishable key: intended for browser use. Protect data with Supabase RLS.
const url = 'https://wxjhxheonexietlkqlke.supabase.co';
const key = 'sb_publishable_Q0s4M8LyYpjIbd4mK6JdDQ_bxVGpUwq';

export const supabaseReady = Boolean(url && key);
export const supabase = createClient(url, key);
