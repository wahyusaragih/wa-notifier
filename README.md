# WA Notifier

Standalone WhatsApp alert service. Connects to MQTT brokers, compares sensor timestamps vs external API, and sends alerts for LAGGING / STALE stations.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your WA_TOKEN, WA_TARGET
# Edit config.json with your brokers and topics
node index.js
```

## config.json

```json
{
  "brokers": [
    { "id": "broker1", "name": "Main", "host": "your.broker.ip", "port": 1883 }
  ],
  "topics": [
    { "broker_id": "broker1", "topic": "inst/city/type/station", "label": "Station Name", "channel_count": 6 }
  ]
}
```

## .env

```bash
WA_TOKEN=your_fonnte_device_token
WA_TARGET=120363XXXXXXXXXX@g.us
API_URL=https://weatherapi.blitztechnology.tech/test/0
ALERT_CRON=0 * * * *      # every hour
LAGGING_THRESHOLD=3600     # 1 hour in seconds
STALE_THRESHOLD=86400      # 24 hours in seconds
```

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables from `.env` in Railway dashboard
4. Deploy — Railway keeps it running 24/7

## Deploy to Fly.io

```bash
npm install -g flyctl
fly auth login
fly launch
fly secrets set WA_TOKEN=xxx WA_TARGET=xxx
fly deploy
```
