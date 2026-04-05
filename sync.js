// sync.js — fetches external API and compares with local MQTT readings
const { getLatest } = require('./mqttClient')
const config        = require('./config.json')

const API_URL          = process.env.API_URL || 'https://weatherapi.blitztechnology.tech/test/0'
const LAGGING_THRESHOLD = Number(process.env.LAGGING_THRESHOLD) || 3600   // 1 hour
const STALE_THRESHOLD   = Number(process.env.STALE_THRESHOLD)   || 86400  // 24 hours

let apiCache     = null
let apiCacheTime = 0
const CACHE_TTL  = 60_000

async function fetchApiData() {
  const now = Date.now()
  if (apiCache && now - apiCacheTime < CACHE_TTL) return apiCache
  const res  = await fetch(API_URL)
  if (!res.ok) throw new Error(`API responded ${res.status}`)
  const json = await res.json()
  apiCache     = json[0]?.station_data ?? []
  apiCacheTime = now
  return apiCache
}

function parseLocalISO(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d.getTime()
}

function toIDDate(str) {
  if (!str || str === 'N/A') return 'N/A'
  const normalized = str.replace('T', ' ').replace(/\//g, '-')
  const d = new Date(normalized)
  if (isNaN(d)) return str
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function compare() {
  const stations = await fetchApiData()
  const apiMap   = {}
  for (const s of stations) {
    if (s.topic_MQTT) apiMap[s.topic_MQTT] = s
  }

  const results = []

  for (const t of config.topics) {
    const apiStation = apiMap[t.topic]
    const reading    = getLatest(t.topic)

    const mqttTs  = reading?.ts ?? null
    const mqttMs  = reading?.ts_ms ?? null
    const apiMs   = parseLocalISO(apiStation?.time ?? null)

    let diffSeconds = null
    if (mqttMs !== null && apiMs !== null) {
      diffSeconds = Math.round((mqttMs - apiMs) / 1000)
    }

    const absDiff = diffSeconds !== null ? Math.abs(diffSeconds) : null

    let status
    if (!apiStation)           status = 'no_api_match'
    else if (diffSeconds === null) status = 'no_local_data'
    else if (absDiff <= LAGGING_THRESHOLD) status = 'ok'
    else if (absDiff <= STALE_THRESHOLD)   status = 'lagging'
    else                                   status = 'stale'

    results.push({
      topic:            t.topic,
      label:            t.label || t.topic,
      api_station_name: apiStation?.station_name ?? null,
      api_time:         toIDDate(apiStation?.time ?? null),
      mqtt_time:        toIDDate(mqttTs),
      diff_seconds:     diffSeconds,
      status,
    })
  }

  return results
}

module.exports = { compare }
