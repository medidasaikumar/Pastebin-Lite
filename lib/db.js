const store = new Map()

function insertPaste(paste) {
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

function getPaste(id, now) {
  const paste = store.get(id)
  if (!paste) return null
  if (paste.expires_at !== null && paste.expires_at < now) return null
  if (paste.max_views !== null && paste.views >= paste.max_views) return null
  paste.views += 1
  return { ...paste }
}

function checkHealth() {
  return true
}

export default { insertPaste, getPaste, checkHealth }
