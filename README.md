# WA Notifier

Standalone WhatsApp alert service. Connects to MQTT brokers, compares sensor timestamps vs an external API, and sends alerts for **LAGGING** / **STALE** stations via Fonnte.

---

## First-Time Setup

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
nano .env

# Edit config.json with your brokers and topics
nano config.json
```

### `.env` reference

```bash
WA_TOKEN=your_fonnte_device_token
WA_TARGET=120363XXXXXXXXXX@g.us
API_URL=https://weatherapi.blitztechnology.tech/test/0
ALERT_CRON=0 */3 * * *     # every 3 hours
LAGGING_THRESHOLD=3600     # 1 hour in seconds
STALE_THRESHOLD=86400      # 24 hours in seconds
```

### `config.json` reference

```json
{
  "brokers": [
    { "id": "broker1", "name": "Main", "host": "your.broker.ip", "port": 1883 }
  ],
  "topics": [
    {
      "broker_id": "broker1",
      "topic": "inst/city/type/station",
      "label": "Station Name",
      "channel_count": 6
    }
  ]
}
```

---

## Running on Termux (Android)

### Install dependencies (first time only)

```bash
pkg update && pkg upgrade
pkg install nodejs git
npm install -g pm2
```

### Start the service

```bash
cd ~/wa-notifier-main
pm2 start index.js --name wa-notifier
pm2 save
```

---

## Termux — Quick Command Reference

### Check service status

```bash
pm2 status
pm2 show wa-notifier       # detailed info
```

### Restart the service

```bash
pm2 restart wa-notifier
```

Use this when: alerts stopped sending, you updated `.env` or `config.json`, or something looks stuck.

### Stop / start manually

```bash
pm2 stop wa-notifier
pm2 start wa-notifier
```

### View live logs

```bash
pm2 logs wa-notifier              # follow live
pm2 logs wa-notifier --lines 50   # last 50 lines
```

### Kill duplicate / ghost processes

If `pm2 status` shows 2 processes or something looks wrong:

```bash
pm2 delete all
cd ~/wa-notifier-main
pm2 start index.js --name wa-notifier
pm2 save
```

### Restore after Termux was closed or phone restarted

```bash
pm2 resurrect
```

If that doesn't work:

```bash
cd ~/wa-notifier-main
pm2 start index.js --name wa-notifier
pm2 save
```

---

## Update Service from Git

```bash
cd ~/wa-notifier-main
git pull
npm install              # only needed if package.json changed
pm2 restart wa-notifier
```

---

## Test: Send a WA Notification Manually

Trigger an immediate alert check without waiting for the cron schedule:

```bash
cd ~/wa-notifier-main
node -e "require('dotenv').config(); require('./notify').checkAndAlert()"
```

---

## Fix: Service Stops When Termux is Closed

Android kills background apps aggressively. Do all of the following:

**1. Disable battery optimization for Termux**
Settings → Battery → Battery Optimization → All Apps → Termux → **Don't optimize**

**2. Allow autostart**
Settings → App Management → Termux → Autostart → **Enable**

**3. Acquire a wake lock before starting**

```bash
termux-wake-lock
pm2 resurrect || (cd ~/wa-notifier-main && pm2 start index.js --name wa-notifier && pm2 save)
```

**4. Auto-start on boot with Termux:Boot**

Install **Termux:Boot** from F-Droid (same source as Termux), then:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-wa-notifier.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
sleep 30
cd ~/wa-notifier-main
pm2 resurrect || pm2 start index.js --name wa-notifier
pm2 save
EOF
chmod +x ~/.termux/boot/start-wa-notifier.sh
```

The service will now auto-restart every time the phone reboots.

---

## Cron Schedule Reference

Edit `ALERT_CRON` in `.env`:

| Value          | Meaning          |
| -------------- | ---------------- |
| `0 * * * *`    | Every hour       |
| `0 */3 * * *`  | Every 3 hours    |
| `0 */6 * * *`  | Every 6 hours    |
| `0 8 * * *`    | Daily at 8 AM    |
| `*/30 * * * *` | Every 30 minutes |

After changing `.env`, always run: `pm2 restart wa-notifier`
