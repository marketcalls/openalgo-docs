# WhatsApp Notify

Send a WhatsApp message (text, image, document, or any combination) to
yourself, a single recipient, or a small group (up to 5). This is the single
trader-facing send endpoint; everything you might do with `wa.send()` in a
script is exposed here.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/whatsapp/notify
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/whatsapp/notify
Custom Domain:  POST https://<your-custom-domain>/api/v1/whatsapp/notify
```

## Sample API Requests

### Send to yourself (paired device's own number)

```json
{
  "apikey": "<your_app_apikey>",
  "self": true,
  "message": "Build #482 finished in 1m 23s"
}
```

### Send to a single phone number

```json
{
  "apikey": "<your_app_apikey>",
  "phone": "919876543210",
  "message": "Order placed: BUY RELIANCE x 10 @ MARKET"
}
```

### Send to a linked OpenAlgo user

```json
{
  "apikey": "<your_app_apikey>",
  "username": "rajan",
  "message": "Daily summary attached",
  "document_path": "/srv/reports/2026-05-17.pdf",
  "filename": "summary.pdf"
}
```

### Small broadcast (max 5 recipients)

```json
{
  "apikey": "<your_app_apikey>",
  "phones": ["919876543210", "919812345678", "919900112233"],
  "image_path": "/srv/charts/nifty.png",
  "caption": "NIFTY EOD chart"
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/whatsapp/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "apikey": "<your_app_apikey>",
    "self": true,
    "message": "Alert from OpenAlgo"
  }'
```

## Sample API Response

### Synchronous delivery (default)

```json
{
  "status": "success",
  "message": "Delivered to 2, failed 0",
  "data": {
    "sent":    ["919876543210@s.whatsapp.net", "919812345678@s.whatsapp.net"],
    "failed":  [],
    "skipped": 0
  }
}
```

### `wait_for_delivery: false` (fire-and-forget)

```json
{
  "status": "success",
  "message": "Queued for 1 recipient(s)",
  "queued": 1
}
```

## Request Body

| Parameter | Type | Description |
|-----------|------|-------------|
| `apikey` | string | OpenAlgo API key. **Mandatory.** |
| `self` | boolean | If `true`, send to the paired device's own number. |
| `username` | string | OpenAlgo username. Resolves through the linked-users table. |
| `phone` | string | Single E.164 digit string (e.g. `919876543210`). |
| `phones` | array of strings | Up to 5 E.164 digit strings (small broadcast). Anything beyond 5 is dropped. |
| `message` | string | Text body. Optional if `image_path` or `document_path` is set. Max 4096 chars. |
| `image_path` | string | Server-local path to an image file. |
| `document_path` | string | Server-local path to a document file (PDF, CSV, etc.). |
| `caption` | string | Caption attached to the image. For documents, sent as a follow-up text. |
| `filename` | string | Override the document's display name on the recipient's device. |
| `wait_for_delivery` | boolean | Default `true`. Blocks until the WhatsApp bridge returns and includes a per-recipient delivery report. Set explicitly to `false` for fire-and-forget queuing. |

Exactly one recipient form is required: `self`, `username`, `phone`, or
`phones`. Combining is not supported. The recipient fields are checked in the
order `self`, `phones`, `phone`, `username`, and the first one present wins.

This endpoint reads the JSON body directly rather than through a marshmallow
schema, so unrecognized keys are ignored instead of returning HTTP 400. The
API key may also be supplied as an `X-API-KEY` header or an `apikey` query
parameter.

## Response Fields (`wait_for_delivery: false`)

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `success` or `error` |
| `message` | string | Human-readable summary |
| `queued` | int | Number of recipients dispatched to the alert pool |

## Response Fields (default, synchronous)

`data` contains the per-recipient delivery report:

| Field | Type | Description |
|-------|------|-------------|
| `sent` | array | JIDs the WhatsApp bridge confirmed it accepted |
| `failed` | array | `[{ "to": "<jid>", "error": "<msg>" }, ...]` |
| `skipped` | int | Recipients trimmed by the 5-recipient cap |

## Errors

| Status | Condition |
|---:|---|
| 400 | No recipient specified, `phones` is not a list, no valid phone in `phones`, an invalid `phone`, none of `message`/`image_path`/`document_path` supplied, `message` longer than 4096 characters, or an attachment path outside the allowlist |
| 401 | Missing or invalid API key |
| 404 | `username` is not found or is not linked to WhatsApp |
| 409 | WhatsApp is not paired or not connected. Pair the device from the `/whatsapp` page first. When WhatsApp itself logged the device out, the `message` says so: "WhatsApp logged this device out, so alerts cannot be sent. Pair it again from the /whatsapp page in OpenAlgo." |
| 429 | `WHATSAPP_RATE_LIMIT` exceeded, default 30 per minute |

## Notes

- The bot must be paired and connected for `notify` to deliver. Connect /
  disconnect lives on the `/whatsapp` admin web UI; this REST namespace
  intentionally does not expose those controls. While the bot is stopped,
  unpaired or disconnected, the call is refused with 409 and nothing is
  queued for later.
- The WhatsApp switch and event groups on the **Alerts** page (`/alerts`)
  govern automatic order alerts only. They do not apply to this endpoint.
- Image / document paths are read from the OpenAlgo server's filesystem,
  not uploaded by the API call. Place files in a server-readable location
  first.
- **Attachment path allowlist.** For security, only paths inside the
  directories listed in the `WHATSAPP_ATTACHMENT_ROOTS` env var are
  accepted. The default (when unset) is `<openalgo>/db/attachments/` only.
  Anything outside the allowlist returns `400 image_path is not allowed`.
  Set `WHATSAPP_ATTACHMENT_ROOTS` to a comma-separated list of absolute
  directories to expand it. Paths containing `..`, paths under sensitive
  system trees (`/etc`, `/proc`, `/sys`, `/root`, `/var/log`, `C:\Windows`,
  `C:\Users\Default`), and symlinks that resolve outside the allowlist are
  always rejected.
- The 5-recipient cap is a ToS-safety guardrail: bulk-messaging patterns
  can get the paired device unlinked by Meta. Use the official WhatsApp
  Business API for genuine mass-messaging use cases.
