# Discord Notify

Post a message to your Discord channel from a script, a strategy or any tool
that can make an HTTP request. OpenAlgo posts it through a Discord **channel
webhook**: there is no bot to run and no token to keep alive.

The same webhook also carries OpenAlgo's automatic order alerts (orders placed,
modified, cancelled, positions closed, basket, split and options orders, GTT
orders). Which of those reach Discord is chosen on the **Alerts** page
(`/alerts`), next to Telegram, WhatsApp and Slack. An order that fails on its
own is never sent as an alert.

## Set up Discord

1. Open the settings of the channel the alerts should go to (**Edit Channel**).
2. Open **Integrations**, then **Webhooks**, and choose **New Webhook**. You need the Manage Webhooks permission.
3. Choose **Copy Webhook URL**.
4. Paste it on OpenAlgo's `/discord` page and save. Discord alerts switch on.

To post somewhere else later, create a new webhook in Discord and save it on
the `/discord` page. The old one is replaced.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/discord/notify
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/discord/notify
Custom Domain:  POST https://<your-custom-domain>/api/v1/discord/notify
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "message": "**NIFTY breakout** above 24,200",
  "wait_for_delivery": false
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/discord/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "apikey": "<your_app_apikey>",
    "message": "Alert from OpenAlgo"
  }'
```

The API key may also be sent in the `X-API-KEY` header. It is not accepted in
the query string, where proxies and access logs keep it.

## Request Body

| Parameter | Type | Description |
|-----------|------|-------------|
| `apikey` | string | OpenAlgo API key (or the `X-API-KEY` header). **Mandatory.** |
| `message` | string | The text to post, at most 2000 characters (Discord's limit). Discord markdown is kept. Mentions never ping anybody: `@everyone`, `@here`, user and role mentions are shown as text. **Mandatory.** |
| `wait_for_delivery` | boolean | `false` (default) queues the message and returns at once. `true` posts it first and reports whether Discord accepted it. |

## Sample API Response

Queued (default):

```json
{
  "status": "success",
  "message": "Notification queued."
}
```

Delivered (`"wait_for_delivery": true`):

```json
{
  "status": "success",
  "message": "Message sent to Discord."
}
```

## Errors

| Status | Condition | Message |
|---:|---|---|
| 400 | Missing or empty `message`, `message` longer than 2000 characters, `wait_for_delivery` not true or false, or the body is not a JSON object | Names the field |
| 401 | Missing or invalid API key | `Invalid or missing API key` |
| 409 | Discord is switched off on the `/alerts` page | `Discord alerts are turned off. Turn them on from the Alerts page in OpenAlgo.` |
| 409 | No Discord webhook is saved | `No Discord webhook is saved. Add one on the Discord page in OpenAlgo.` |
| 429 | More than 30 requests in a minute | Rate limit message |
| 502 | With `wait_for_delivery`, Discord refused the message or could not be reached | Says why and what to do, for example that the webhook was deleted and a new one should be saved |
| 503 | Too many messages are already waiting to be sent | `Too many Discord messages are waiting to be sent. Try again shortly.` |

## Rate Limit

30 requests per minute, about what Discord itself accepts on one webhook. This
limit is fixed and has no setting. A failed post is not retried: an alert
retried a minute later describes a market that has moved.

## Keeping the webhook safe

Anybody holding a Discord webhook URL can post into that channel, so OpenAlgo
treats it like a password:

- Only Discord webhook URLs are accepted (`https://discord.com/api/webhooks/...`,
  and the same path on `discordapp.com`, `ptb.discord.com` and
  `canary.discord.com`), so a post can only ever reach Discord. A webhook into a
  forum thread may carry its `thread_id`. The saved URL is checked again before
  every post, and redirects are not followed.
- It is stored encrypted, never shown again on the page or through the API, and
  kept out of OpenAlgo's logs.
- This API can only post a message. Saving or removing the webhook, switching
  Discord on or off and choosing its event groups happen on the logged-in
  `/discord` and `/alerts` pages, so a leaked API key can never read or replace
  the webhook.

If you think the webhook URL has leaked, delete the webhook in Discord, create
a new one and save it on the `/discord` page.

## Notes

- Only the Discord switch on `/alerts` applies to this endpoint. The event
  groups chosen there apply to the automatic order alerts, not to messages sent
  here.
- A Discord channel can have other readers. Anything that holds your API key
  can post there while Discord is switched on.
- The Flow editor's **Discord** node and the MCP tool `send_discord_alert` post
  under the same rules. A Flow node shortens a message over 2000 characters
  instead of refusing it, since nobody is watching a running workflow.
