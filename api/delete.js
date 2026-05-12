// DELETE /api/links/:code — delete a short link
const { getClient } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const supabase = getClient();
  const { error, count } = await supabase
    .from('snip_links')
    .delete({ count: 'exact' })
    .eq('code', code);

  if (error) return res.status(500).json({ error: error.message });
  if (!count) return res.status(404).json({ error: 'Not found' });

  return res.json({ ok: true });
};
