import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }
  const file = path.resolve(process.cwd(), 'public', 'index.html')
  try {
    const html = fs.readFileSync(file, 'utf8')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch {
    res.status(500).send('Internal Server Error')
  }
}
