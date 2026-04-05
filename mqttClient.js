// mqttClient.js — connects to all brokers, stores latest reading per topic in memory
const mqtt   = require('mqtt')
const config = require('./config.json')

// { [topic]: { ts, received_at } }
const latestReadings = {}

function parseTimestamp(ts) {
  if (!ts) return null
  const normalized = ts.replace(/\//g, '-').replace(' ', 'T')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d.getTime()
}

function parsePayload(raw) {
  try {
    const parts = raw.trim().split(',')
    if (parts.length < 2) return null
    return { ts: parts[0].trim() }
  } catch { return null }
}

function startAll() {
  for (const broker of config.brokers) {
    const topics = config.topics
      .filter(t => t.broker_id === broker.id)
      .map(t => t.topic)

    if (topics.length === 0) continue

    const url = `mqtt://${broker.host}:${broker.port}`
    const opts = {}
    if (broker.username) opts.username = broker.username
    if (broker.password) opts.password = broker.password

    const client = mqtt.connect(url, opts)

    client.on('connect', () => {
      console.log(`[mqtt] Connected to ${broker.name} (${broker.host})`)
      topics.forEach(t => client.subscribe(t, { qos: 1 }))
    })

    client.on('message', (topic, message) => {
      const parsed = parsePayload(message.toString())
      if (!parsed) return
      latestReadings[topic] = {
        ts:          parsed.ts,
        received_at: Date.now(),
        ts_ms:       parseTimestamp(parsed.ts),
      }
    })

    client.on('error', err => console.error(`[mqtt] ${broker.name} error:`, err.message))
    client.on('close', ()  => console.log(`[mqtt] ${broker.name} disconnected`))
  }
}

function getLatest(topic) {
  return latestReadings[topic] ?? null
}

module.exports = { startAll, getLatest }
