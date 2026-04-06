// index.js — always-on web service with built-in scheduler
// Deploy as a Web Service on Render (free tier)
require('dotenv').config()
const http   = require('http')
const cron   = require('node-cron')
const { startAll }      = require('./mqttClient')
const { checkAndAlert } = require('./notify')

const PORT      = process.env.PORT || 3000
const SELF_URL  = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
const ALERT_CRON = process.env.ALERT_CRON || '0 * * * *' // every hour

// ── Minimal HTTP server — keeps Render web service alive ──────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('WA Notifier running')
})
server.listen(PORT, () => console.log(`[app] HTTP server on port ${PORT}`))

// ── Self-ping every 14 minutes to prevent Render free tier sleep ──────────────
setInterval(() => {
  const url = new URL(SELF_URL)
  const options = { hostname: url.hostname, port: url.port || 443, path: '/', method: 'GET' }
  const mod = url.protocol === 'https:' ? require('https') : require('http')
  const req = mod.request(options, res => console.log(`[ping] ${res.statusCode}`))
  req.on('error', err => console.error('[ping] error:', err.message))
  req.end()
}, 14 * 60 * 1000)

// ── Connect to MQTT brokers ───────────────────────────────────────────────────
console.log('[app] Starting WA Notifier...')
startAll()

// ── Initial check after 15s ───────────────────────────────────────────────────
setTimeout(() => {
  console.log('[app] Running initial check...')
  checkAndAlert()
}, 15_000)

// ── Scheduled check every hour ────────────────────────────────────────────────
cron.schedule(ALERT_CRON, () => {
  console.log('[app] Scheduled check triggered')
  checkAndAlert()
})

console.log(`[app] Scheduler running — cron: "${ALERT_CRON}"`)
