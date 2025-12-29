import express from 'express';
import { nanoid } from 'nanoid';
import escapeHtml from 'escape-html';
import db from './db.js';

const app = express();

// Parse JSON bodies
app.use(express.json());

// Helper to determine current time (handling TEST_MODE)
const getNow = (req) => {
  if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
    const testTime = parseInt(req.headers['x-test-now-ms'], 10);
    if (!isNaN(testTime)) {
      return testTime;
    }
  }
  return Date.now();
};

// 1) Health Check
app.get('/healthz', (req, res) => {
  const isHealthy = db.checkHealth();
  if (isHealthy) {
    res.status(200).json({ ok: true });
  } else {
    res.status(503).json({ ok: false });
  }
});

// 2) Create a Paste
app.post('/pastes', (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  // Validation
  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required and must be a non-empty string.' });
  }

  let expiresAt = null;
  if (ttl_seconds !== undefined) {
    if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
      return res.status(400).json({ error: 'ttl_seconds must be a positive integer.' });
    }
    const now = getNow(req);
    expiresAt = now + (ttl_seconds * 1000);
  }

  let maxViews = null;
  if (max_views !== undefined) {
    if (!Number.isInteger(max_views) || max_views < 1) {
      return res.status(400).json({ error: 'max_views must be a positive integer.' });
    }
    maxViews = max_views;
  }

  const id = nanoid();
  const now = getNow(req);

  try {
    db.insertPaste({
      id,
      content,
      created_at: now,
      expires_at: expiresAt,
      max_views: maxViews
    });

    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/p/${id}`;

    res.status(201).json({
      id,
      url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3) Fetch a Paste (API)
app.get('/pastes/:id', (req, res) => {
  const { id } = req.params;
  const now = getNow(req);

  try {
    const paste = db.getPaste(id, now);

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found or unavailable' });
    }

    // Calculate response fields
    let remaining_views = null;
    if (paste.max_views !== null) {
      remaining_views = Math.max(0, paste.max_views - paste.views);
    }

    const expires_at = paste.expires_at ? new Date(paste.expires_at).toISOString() : null;

    res.json({
      content: paste.content,
      remaining_views,
      expires_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4) View a Paste (HTML)
app.get('/p/:id', (req, res) => {
  const { id } = req.params;
  const now = getNow(req);

  try {
    const paste = db.getPaste(id, now);

    if (!paste) {
      return res.status(404).send('<h1>404 - Paste not found or unavailable</h1>');
    }

    const safeContent = escapeHtml(paste.content);
    
    // Minimal HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paste ${id}</title>
    <style>
        :root {
            --primary-color: #2563eb;
            --primary-hover: #1d4ed8;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-color: #1e293b;
            --border-color: #e2e8f0;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.5;
            margin: 0;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        .card {
            background: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            padding: 2rem;
            border: 1px solid var(--border-color);
        }

        .header {
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        h1 {
            margin: 0;
            font-size: 1.5rem;
            color: var(--primary-color);
        }

        .meta {
            color: #64748b;
            font-size: 0.875rem;
            background: #f1f5f9;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
        }

        pre {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 6px;
            overflow-x: auto;
            white-space: pre-wrap;
            border: 1px solid var(--border-color);
            font-family: 'Consolas', 'Monaco', monospace;
            margin: 0;
            font-size: 0.95rem;
        }

        .actions {
            margin-top: 2rem;
            text-align: center;
        }

        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background-color: var(--primary-color);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background-color 0.15s ease-in-out;
        }

        .btn:hover {
            background-color: var(--primary-hover);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>Paste #${id}</h1>
                <div class="meta">
                    ${paste.expires_at ? `Expires: ${new Date(paste.expires_at).toLocaleString()}` : 'Never Expires'} 
                    <span style="margin: 0 0.5rem">|</span> 
                    ${paste.max_views ? `Views: ${paste.views}/${paste.max_views}` : `Views: ${paste.views}`}
                </div>
            </div>
            <pre>${safeContent}</pre>
            <div class="actions">
                <a href="/" class="btn">Create New Paste</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Serve static files (for frontend)
app.use(express.static('public'));

export default app;
