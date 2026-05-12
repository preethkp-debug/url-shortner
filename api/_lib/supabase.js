// Shared Supabase client for serverless functions.
// Files under api/_lib/ are not exposed as routes by Vercel.
const { createClient } = require('@supabase/supabase-js');

let cached = null;

function getClient() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_KEY environment variables must be set.'
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

function buildShortUrl(req, code) {
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/${code}`;
}

module.exports = { getClient, buildShortUrl };
