/**
 * Supabase Server Client
 * Creates authenticated Supabase client for server-side operations
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

// Create Supabase client with service role key (for server-side operations)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create Supabase client with anon key (for client-side operations)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

/**
 * Get authenticated Supabase client for a user
 * @param accessToken - JWT access token from Supabase Auth
 */
export function getAuthenticatedClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

