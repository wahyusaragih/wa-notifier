// index.js — entry point
// Designed to run as a Railway Cron Job (not always-on)
// Railway starts the process, it runs the check, then exits
// Schedule in Railway: 0 * * * * (every hour, every day)
require('dotenv').config()
const { startAll } = require('./mqttClient')
const { checkAndAlert } = require('./notify')

console.log('[app] WA Notifier starting...')

// Connect to brokers, wait for readings, check, then exit
startAll()

setTimeout(async () => {
  await checkAndAlert()
  console.log('[app] Check complete — exiting')
  process.exit(0)
}, 5 * 60 * 1000) // wait 5 minutes for MQTT to receive readings
