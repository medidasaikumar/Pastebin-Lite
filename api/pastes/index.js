import { nanoid } from 'nanoid'
import db from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const { content, ttl_seconds, max_views } = await parseBody(req)

    if (typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required and must be a non-empty string.' })
      return
    }

    let expiresAt = null
    if (ttl_seconds !== undefined) {
      if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
        res.status(400).json({ error: 'ttl_seconds must be a positive integer.' })
        return
      }
      const now = Date.now()
      expiresAt = now + ttl_seconds * 1000
    }

    let maxViews = null
    if (max_views !== undefined) {
      if (!Number.isInteger(max_views) || max_views < 1) {
        res.status(400).json({ error: 'max_views must be a positive integer.' })
        return
      }
      maxViews = max_views
    }

    const id = nanoid()
    const now = Date.now()

    await db.insertPaste({
      id,
      content,
      created_at: now,
      expires_at: expiresAt,
      max_views: maxViews
    })

    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const url = `${protocol}://${host}/api/p/${id}`

    res.status(201).json({ id, url })
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}
