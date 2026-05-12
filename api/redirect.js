// GET /:code — look up short code and 302-redirect to target URL.
// Click counts are incremented atomically via a Postgres RPC.
const { getClient } = require('./_lib/supabase');

function send404(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link not found — Snip</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="hero" style="min-height:80vh;display:flex;align-items:center;">
    <div class="container">
      <span class="eyebrow">404</span>
      <h1>That short link doesn't <span class="grad">exist</span>.</h1>
      <p class="lede">The link may have been deleted, or never created.</p>
      <p><a class="btn-secondary" href="/">← Back to Snip</a></p>
    </div>
  </main>
</body>
</html>`);
}

module.exports = async function handler(req, res) {
  const code = req.query.code;
  if (!code) return send404(res);

  const supabase = getClient();
  const { data, error } = await supabase
    .from('snip_links')
    .select('target_url')
    .eq('code', code)
    .maybeSingle();

  if (error || !data) return send404(res);

  // Fire-and-forget atomic click increment via Postgres RPC.
  // We don't await — the redirect should be fast.
  supabase
    .rpc('snip_increment_clicks', { p_code: code })
    .then(() => {})
    .catch(() => {});

  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: data.target_url });
  res.end();
};
