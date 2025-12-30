import { kv } from '@vercel/kv'
import { Redis } from '@upstash/redis'

const store = new Map()
const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
const redis = hasUpstash ? Redis.fromEnv() : null

async function insertPaste(paste) {
  if (hasUpstash) {
    const ttl =
      typeof paste.expires_at === 'number'
        ? Math.max(1, Math.ceil((paste.expires_at - paste.created_at) / 1000))
        : undefined
    await redis.set(
      `paste:${paste.id}`,
      {
        id: paste.id,
        content: paste.content,
        created_at: paste.created_at,
        expires_at: paste.expires_at ?? null,
        max_views: paste.max_views ?? null
      },
      ttl ? { ex: ttl } : undefined
    )
    await redis.set(`paste:views:${paste.id}`, 0, ttl ? { ex: ttl } : undefined)
    return
  }
  if (hasKV) {
    const ttl =
      typeof paste.expires_at === 'number'
        ? Math.max(1, Math.ceil((paste.expires_at - paste.created_at) / 1000))
        : undefined
    await kv.set(
      `paste:${paste.id}`,
      {
        id: paste.id,
        content: paste.content,
        created_at: paste.created_at,
        expires_at: paste.expires_at ?? null,
        max_views: paste.max_views ?? null
      },
      ttl ? { ex: ttl } : undefined
    )
    await kv.set(`paste:views:${paste.id}`, 0, ttl ? { ex: ttl } : undefined)
    return
  }
  const record = {
    id: paste.id,
    content: paste.content,
    created_at: paste.created_at,
    expires_at: paste.expires_at ?? null,
    max_views: paste.max_views ?? null,
    views: 0
  }
  store.set(record.id, record)
}

async function getPaste(id, now) {
  if (hasUpstash) {
    const paste = await redis.get(`paste:${id}`)
    if (!paste) return null
    const views = (await redis.get(`paste:views:${id}`)) ?? 0
    if (paste.expires_at !== null && paste.expires_at < now) return null
    if (paste.max_views !== null && views >= paste.max_views) return null
    await redis.incr(`paste:views:${id}`)
    return { ...paste, views: (typeof views === 'number' ? views : Number(views) || 0) + 1 }
  }
  if (hasKV) {
    const paste = await kv.get(`paste:${id}`)
    if (!paste) return null
    const views = (await kv.get(`paste:views:${id}`)) ?? 0
    if (paste.expires_at !== null && paste.expires_at < now) return null
    if (paste.max_views !== null && views >= paste.max_views) return null
    await kv.incr(`paste:views:${id}`)
    return { ...paste, views: (typeof views === 'number' ? views : Number(views) || 0) + 1 }
  }
  const paste = store.get(id)
  if (!paste) return null
  if (paste.expires_at !== null && paste.expires_at < now) return null
  if (paste.max_views !== null && paste.views >= paste.max_views) return null
  paste.views += 1
  return { ...paste }
}

async function checkHealth() {
  try {
    if (hasUpstash) {
      await redis.set('healthcheck', 'ok', { ex: 10 })
      const v = await redis.get('healthcheck')
      return v === 'ok'
    }
    if (hasKV) {
      await kv.set('healthcheck', 'ok', { ex: 10 })
      const v = await kv.get('healthcheck')
      return v === 'ok'
    }
    return true
  } catch {
    return false
  }
}

export default { insertPaste, getPaste, checkHealth }
