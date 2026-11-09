# STREAK

STREAK is a gym entrance attendance display. A member taps a 125 kHz EM4100 keyfob on a USB reader connected to the local gateway. The gateway stores the tap durably, sends it to the API when online, and retries queued events after connectivity returns.

## Pilot hardware

- 32-inch 1080p HDMI display with VESA mount
- Raspberry Pi 4, 4 GB RAM, high-endurance storage, and active cooling
- USB keyboard-emulation 125 kHz EM4100 reader
- 50 keyfobs plus reader, PSU, HDMI, and keyfob spares
- 600–650 VA UPS
- Ethernet preferred; ordinary WPA2 Wi-Fi fallback

## Event flow

The gateway sends:

```json
{
  "member_id": "member-1",
  "timestamp": "2026-11-02T04:30:00.000Z",
  "delivery_id": "gateway-uuid"
}
```

The API authenticates the gateway, deduplicates delivery IDs and same-day visits, calculates the active streak and personal best, then publishes a five-second welcome event and a refreshed top-10 leaderboard over SSE.

## Development

```powershell
npm install
npm test
npx tsc --noEmit
```

The pilot can run with a file-backed API state store by setting `STREAK_STATE_PATH`; omit it for the in-memory demo. PostgreSQL/Redis adapters should replace the JSON store before multi-gym production deployment.

## Physical-reader gateway

The gateway process accepts newline-terminated keyboard-emulation input from the USB reader:

```powershell
$env:STREAK_API_URL="http://127.0.0.1:3001"
$env:STREAK_GYM_ID="gym-1"
$env:STREAK_DEVICE_CREDENTIAL="local-demo-only"
$env:STREAK_CARD_MAP_PATH=".\card-map.json"
$env:STREAK_QUEUE_PATH=".\streak-queue.json"
npm run gateway
```

`card-map.json` maps normalized reader IDs to member IDs, for example:

```json
{ "ABC123": "member-1" }
```

Each tap is mapped, written to the durable queue, and posted to the authenticated attendance endpoint. If the API is offline, the queue remains on disk and the retry worker sends it after connectivity returns.

## Local demo

Start the one-process demo:

```powershell
npm install
npm run demo
```

For the local demo, admin username/password and the device credential default to `admin`/`admin`. Environment variables are optional for this software-only demo; set `STREAK_ADMIN_TOKEN` and `STREAK_DEVICE_CREDENTIAL` later when connecting real hardware or deploying.

Open `http://localhost:3001/display?gym=gym-1`, then simulate a tap:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3001/demo/tap `
  -ContentType 'application/json' `
  -Body '{"member_id":"member-1"}'
```

The browser receives the same SSE welcome and leaderboard events used by the kiosk flow. The welcome card displays for five seconds before the leaderboard returns.

The display remains public at `http://localhost:3001/display?gym=gym-1`. Admin APIs require the `STREAK_ADMIN_TOKEN` bearer token:

```powershell
$headers = @{ Authorization = "Bearer $env:STREAK_ADMIN_TOKEN" }
Invoke-RestMethod -Headers $headers http://localhost:3001/v1/gyms/gym-1/card-mappings
```

The admin page also creates members and assigns cards in one step:

```powershell
Invoke-RestMethod -Method Post -Headers $headers `
  -ContentType "application/json" `
  -Uri http://localhost:3001/v1/gyms/gym-1/members `
  -Body '{"member_id":"member-4","name":"Priya","card_id":"XYZ789"}'
```

Open `http://localhost:3001/admin/mappings?gym=gym-1` and `http://localhost:3001/admin/gateway-test?gym=gym-1`; use username `admin` and password `admin` for the local demo. The browser session supplies Basic Auth to the page actions, including member removal. The production admin token is never embedded into HTML or JavaScript. The member form requires Member ID, name, and card ID. New members start with zero streak values and can be edited or removed from the same page. These pages assign placeholder IDs such as `ABC123`; the IDs are software fixtures until real keyfobs are available.

Open `http://localhost:3001/admin/gateway-test?gym=gym-1` to test the gateway path in a browser. Enter a mapped ID such as `ABC123` to see `accepted`, enter it again to see `duplicate`, or enter an unmapped value to see `unknown-card`. This console is a software simulation; it does not validate physical reader hardware.

The gateway device credential is separate from the admin token. Set it with `$env:STREAK_DEVICE_CREDENTIAL` for the physical-reader gateway; do not reuse the admin token.
