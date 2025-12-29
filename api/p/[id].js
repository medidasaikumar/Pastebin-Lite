import escapeHtml from 'escape-html'
import db from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const { id } = req.query
  const now = Date.now()
  const paste = await db.getPaste(id, now)

  if (!paste) {
    let stateless = null
    try {
      const raw = Buffer.from(id, 'base64url').toString('utf8')
      const payload = JSON.parse(raw)
      if (payload && typeof payload.content === 'string') {
        const exp = payload.expires_at ?? null
        if (exp === null || exp > now) {
          stateless = { content: payload.content, expires_at: exp, views: null, max_views: null }
        }
      }
    } catch {}
    if (!stateless) {
      res.status(404).send('<h1>404 - Paste not found or unavailable</h1>')
      return
    }
    const safe = escapeHtml(stateless.content)
    const html = renderHtml(id, safe, stateless.expires_at, stateless.views, stateless.max_views)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
    return
  }

  const safe = escapeHtml(paste.content)

  const html = renderHtml(id, safe, paste.expires_at, paste.views, paste.max_views)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}

function renderHtml(id, safeContent, expiresAt, views, maxViews) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paste ${id}</title>
  <style>
    :root{--primary-color:#2563eb;--primary-hover:#1d4ed8;--bg-color:#f8fafc;--card-bg:#ffffff;--text-color:#1e293b;--border-color:#e2e8f0}
    body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background-color:var(--bg-color);color:var(--text-color);line-height:1.5;margin:0;padding:2rem 1rem}
    .container{max-width:800px;margin:0 auto}
    .card{background:var(--card-bg);border-radius:8px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1),0 2px 4px -2px rgb(0 0 0 / 0.1);padding:2rem;border:1px solid var(--border-color)}
    .header{margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
    h1{margin:0;font-size:1.5rem;color:var(--primary-color)}
    .meta{color:#64748b;font-size:.875rem;background:#f1f5f9;padding:.5rem 1rem;border-radius:9999px}
    pre{background:#f8fafc;padding:1.5rem;border-radius:6px;overflow-x:auto;white-space:pre-wrap;border:1px solid var(--border-color);font-family:'Consolas','Monaco',monospace;margin:0;font-size:.95rem}
    .actions{margin-top:2rem;text-align:center}
    .btn{display:inline-block;padding:.75rem 1.5rem;background-color:var(--primary-color);color:#fff;text-decoration:none;border-radius:6px;font-weight:600;transition:background-color .15s ease-in-out}
    .btn:hover{background-color:var(--primary-hover)}
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Paste #${id}</h1>
        <div class="meta">
          ${expiresAt ? `Expires: ${new Date(expiresAt).toLocaleString()}` : 'Never Expires'} 
          <span style="margin:0 .5rem">|</span>
          ${maxViews ? `Views: ${views}/${maxViews}` : (views === null ? 'Views: N/A' : `Views: ${views}`)}
        </div>
      </div>
      <pre>${safeContent}</pre>
      <div class="actions">
        <a href="/" class="btn">Create New Paste</a>
      </div>
    </div>
  </div>
</body>
</html>`
}
