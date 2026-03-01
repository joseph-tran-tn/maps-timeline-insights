#!/usr/bin/env node
/**
 * Screenshot a URL and save to ./temporary screenshots/screenshot-N[-label].png
 * Usage: node screenshot.mjs <url> [label]
 * Example: node screenshot.mjs http://localhost:3000
 *          node screenshot.mjs http://localhost:3000 timeline-day
 */
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, 'temporary screenshots')
const url = process.argv[2] || 'http://localhost:3000'
const label = process.argv[3] ? `-${process.argv[3]}` : ''

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
let n = 0
const files = fs.readdirSync(dir)
for (const f of files) {
  const m = f.match(/^screenshot-(\d+)/)
  if (m) n = Math.max(n, parseInt(m[1], 10))
}
n++
const outPath = path.join(dir, `screenshot-${n}${label}.png`)

console.log('Screenshot requires Puppeteer. Run: npm install puppeteer')
console.log('Then use: npx puppeteer screenshot', url, '--path', outPath)
console.log('Or use your browser dev tools to capture the page.')
console.log('Target path:', outPath)
