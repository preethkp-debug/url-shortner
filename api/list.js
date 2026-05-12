// GET /api/links — list all short links (dashboard)
const { getClient, buildShortUrl } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('snip_links')
    .select('code, target_url, clicks, created_at, last_visit')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  const links = (data || []).map((l) => ({
    ...l,
    short_url: buildShortUrl(req, l.code),
  }));

  // Don't cache — dashboard wants fresh data every time
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ links });
};
