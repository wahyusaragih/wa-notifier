// index.js — entry point
require('dotenv').config()
const cron              = require('node-cron')
const { startAll }      = require('./mqttClient')
const { checkAndAlert } = require('./notify')

const ALERT_CRON = process.env.ALERT_CRON || '0 * * * *' // every hour

console.log('[app] Starting WA Notifier...')

// Connect to all MQTT brokers
startAll()

// Wait 10s for MQTT to receive initial readings, then run first check
setTimeout(() => {
  console.log('[app] Running initial check...')
  checkAndAlert()
}, 10_000)

// Schedule recurring checks
cron.schedule(ALERT_CRON, () => {
  console.log('[app] Scheduled check triggered')
  checkAndAlert()
})

console.log(`[app] Scheduler started — cron: "${ALERT_CRON}"`)
