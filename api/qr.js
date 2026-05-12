// GET /api/links/:code/qr — generate QR code as PNG data URL
const QRCode = require('qrcode');
const { getClient, buildShortUrl } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('snip_links')
    .select('code')
    .eq('code', code)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });

  const shortUrl = buildShortUrl(req, code);
  try {
    const qr = await QRCode.toDataURL(shortUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.json({ short_url: shortUrl, qr });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code.' });
  }
};
