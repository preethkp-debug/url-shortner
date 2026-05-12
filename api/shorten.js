// POST /api/shorten — create a short link
const { customAlphabet } = require('nanoid');
const { getClient, buildShortUrl } = require('./_lib/supabase');

const nanoid = customAlphabet(
  '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
  6
);

const RESERVED = new Set([
  'api',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  '_next',
]);
const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  let url = input.trim();
  if (!url) return null;
  if (!/^https:?\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const targetUrl = normalizeUrl(body.url);
  if (!targetUrl) {
    return res
      .status(400)
      .json({ error: 'Please provide a valid http(s) URL.' });
  }

  const supabase = getClient();
  let code;

  if (body.alias) {
    const alias = String(body.alias).trim();
    if (!ALIAS_RE.test(alias)) {
      return res.status(400).json({
        error: 'Alias must be 3-32 chars, letters/digits/dash/underscore only.',
      });
    }
    if (RESERVED.has(alias.toLowerCase())) {
      return res.status(400).json({ error: 'That alias is reserved.' });
    }
    code = alias;
  } else {
    // Generate; retry on rare collision
    for (let i = 0; i < 5; i++) {
      const candidate = nanoid();
      const { data, error } = await supabase
        .from('snip_links')
        .select('code')
        .eq('code', candidate)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res
        .status(500)
        .json({ error: 'Could not generate a unique code. Try again.' });
    }
  }

  const { data, error } = await supabase
    .from('snip_links')
    .insert({ code, target_url: targetUrl })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That alias is already taken.' });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    code: data.code,
    short_url: buildShortUrl(req, data.code),
    target_url: data.target_url,
    clicks: data.clicks,
    created_at: data.created_at,
    last_visit: data.last_visit,
  });
};
