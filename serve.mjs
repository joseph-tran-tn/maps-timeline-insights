#!/usr/bin/env node
/**
 * Serve project root at http://localhost:3000
 * For screenshot workflow: run in background before taking screenshots.
 * In development, prefer: npm run dev (Vite dev server).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3000

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const server = http.createServer((req, res) => {
  let p = req.url?.split('?')[0] || '/'
  if (p === '/') p = '/index.html'
  const filePath = path.join(__dirname, p)
  const ext = path.extname(filePath)
  const type = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }
    res.writeHead(200, { 'Content-Type': type })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`Serving at http://localhost:${PORT}`)
})
