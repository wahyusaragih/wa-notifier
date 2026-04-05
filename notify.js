// notify.js — sends WhatsApp alerts via Fonnte
const { compare } = require('./sync')

const WA_TOKEN          = process.env.WA_TOKEN  || ''
const WA_TARGET         = process.env.WA_TARGET || ''
const ALERT_COOLDOWN_MS = 60 * 60 * 1000  // 1 hour per station

const lastAlertAt = {}

function formatGap(seconds) {
  const abs  = Math.abs(seconds)
  const d    = Math.floor(abs / 86400)
  const h    = Math.floor((abs % 86400) / 3600)
  const m    = Math.floor((abs % 3600) / 60)
  const sign = seconds >= 0 ? '+' : '-'
  if (d > 0) return `${sign}${d}d ${h}h ${m}m`
  if (h > 0) return `${sign}${h}h ${m}m`
  return `${sign}${m}m`
}

function buildLines(stations) {
  return [...stations]
    .sort((a, b) => Math.abs(a.diff_seconds ?? 0) - Math.abs(b.diff_seconds ?? 0))
    .map(r => {
      const gap = formatGap(-(r.diff_seconds ?? 0))
      return `*${r.api_station_name ?? r.label}* | Gap: ${gap}\n  API:  ${r.api_time}\n  MQTT: ${r.mqtt_time}`
    })
}

async function sendWhatsApp(message) {
  if (!WA_TOKEN || !WA_TARGET) {
    console.warn('[notify] WA_TOKEN or WA_TARGET not set')
    return false
  }
  try {
    const isGroup = WA_TARGET.includes('@g.us')
    const body    = { target: WA_TARGET, message }
    if (!isGroup) body.countryCode = '62'

    const res  = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: { Authorization: WA_TOKEN, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    console.log('[notify] WA sent:', data)
    return data.status === true
  } catch (err) {
    console.error('[notify] WA send failed:', err.message)
    return false
  }
}

async function checkAndAlert() {
  console.log('[notify] Running check...')
  try {
    const results = await compare()

    const lagging = results.filter(r => r.status === 'lagging')
    const stale   = results.filter(r => r.status === 'stale')

    console.log(`[notify] lagging: ${lagging.length} | stale: ${stale.length}`)

    if (lagging.length === 0 && stale.length === 0) {
      console.log('[notify] All stations OK — no alert needed')
      return
    }

    const now            = Date.now()
    const toAlertLagging = lagging.filter(r => now - (lastAlertAt[r.topic] ?? 0) > ALERT_COOLDOWN_MS)
    const toAlertStale   = stale.filter(r   => now - (lastAlertAt[r.topic] ?? 0) > ALERT_COOLDOWN_MS)

    if (toAlertLagging.length === 0 && toAlertStale.length === 0) {
      console.log('[notify] All on cooldown — skipping')
      return
    }

    const dateStr = new Date().toLocaleString('id-ID')
    let message   = `📡 *MQTT Monitor Alert*\n_${dateStr}_\n`

    message += `\n⚠️ *LAGGING* (gap 1h–24h) — ${toAlertLagging.length} station(s)\n`
    if (toAlertLagging.length > 0) message += buildLines(toAlertLagging).join('\n\n') + '\n'

    message += `\n🚨 *STALE* (gap >24h) — ${toAlertStale.length} station(s)\n`
    if (toAlertStale.length > 0) message += buildLines(toAlertStale).join('\n\n') + '\n'

    const sent = await sendWhatsApp(message)
    if (sent) {
      for (const r of [...toAlertLagging, ...toAlertStale]) lastAlertAt[r.topic] = now
    }
  } catch (err) {
    console.error('[notify] checkAndAlert error:', err.message)
  }
}

module.exports = { checkAndAlert }
