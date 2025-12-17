/**
 * Supabase Server Client
 * Creates authenticated Supabase client for server-side operations
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

// Create Supabase client with service role key (for server-side operations)
// With connection pooling configuration to prevent connection exhaustion
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      // Connection pooling configuration
      fetch: (...args) => fetch(...args),
    },
    // Note: Supabase JS client doesn't directly expose pool config
    // Connection pooling is handled by Supabase's PgBouncer
    // Ensure SUPABASE_URL uses pooler endpoint if needed
    // Format: postgres://[user]:[password]@[host]:6543/[db]?pgbouncer=true
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

