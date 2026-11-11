# Slack Notify

Post a message to your Slack channel from a script, a strategy or any tool that
can make an HTTP request. OpenAlgo posts it through a Slack **incoming
webhook**: there is no bot to run and no token to keep alive.

The same webhook also carries OpenAlgo's automatic order alerts (orders placed,
modified, cancelled, positions closed, basket, split and options orders, GTT
orders). Which of those reach Slack is chosen on the **Alerts** page
(`/alerts`), next to Telegram, WhatsApp and Discord. An order that fails on its
own is never sent as an alert.

## Set up Slack

1. Open api.slack.com/apps and create an app for your workspace ("From scratch").
2. Open **Incoming Webhooks**, switch them on, and choose **Add New Webhook to Workspace**.
3. Pick the channel, allow it, and copy the webhook URL.
4. Paste it on OpenAlgo's `/slack` page and save. Slack alerts switch on.

To post somewhere else later, create a new webhook in Slack and save it on the
`/slack` page. The old one is replaced.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/slack/notify
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/slack/notify
Custom Domain:  POST https://<your-custom-domain>/api/v1/slack/notify
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "message": "*NIFTY breakout* above 24,200",
  "wait_for_delivery": false
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/slack/notify \
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
| `message` | string | The text to post, at most 4000 characters. Slack bold (`*text*`) works. `&`, `<` and `>` are escaped, so mentions and link markup are shown as text. **Mandatory.** |
| `wait_for_delivery` | boolean | `false` (default) queues the message and returns at once. `true` posts it first and reports whether Slack accepted it. |

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
  "message": "Message sent to Slack."
}
```

## Errors

| Status | Condition | Message |
|---:|---|---|
| 400 | Missing or empty `message`, `message` longer than 4000 characters, `wait_for_delivery` not true or false, or the body is not a JSON object | Names the field |
| 401 | Missing or invalid API key | `Invalid or missing API key` |
| 409 | Slack is switched off on the `/alerts` page | `Slack alerts are turned off. Turn them on from the Alerts page in OpenAlgo.` |
| 409 | No Slack webhook is saved | `No Slack webhook is saved. Add one on the Slack page in OpenAlgo.` |
| 429 | More than 30 requests in a minute | Rate limit message |
| 502 | With `wait_for_delivery`, Slack refused the message or could not be reached | Says why and what to do, for example that the webhook was deleted and a new one should be saved |
| 503 | Too many messages are already waiting to be sent | `Too many Slack messages are waiting to be sent. Try again shortly.` |

## Rate Limit

30 requests per minute, about what Slack itself accepts on one webhook. This
limit is fixed and has no setting. A failed post is not retried: an alert
retried a minute later describes a market that has moved.

## Keeping the webhook safe

Anybody holding a Slack webhook URL can post into that channel, so OpenAlgo
treats it like a password:

- Only Slack webhook URLs are accepted (`https://hooks.slack.com/services/...`,
  host matched exactly), so a post can only ever reach Slack. The saved URL is
  checked again before every post, and redirects are not followed.
- It is stored encrypted, never shown again on the page or through the API, and
  kept out of OpenAlgo's logs.
- This API can only post a message. Saving or removing the webhook, switching
  Slack on or off and choosing its event groups happen on the logged-in
  `/slack` and `/alerts` pages, so a leaked API key can never read or replace
  the webhook.

If you think the webhook URL has leaked, delete the webhook in Slack, create a
new one and save it on the `/slack` page.

## Notes

- Only the Slack switch on `/alerts` applies to this endpoint. The event groups
  chosen there apply to the automatic order alerts, not to messages sent here.
- A Slack channel can have other readers. Anything that holds your API key can
  post there while Slack is switched on.
- The Flow editor's **Slack** node and the MCP tool `send_slack_alert` post
  under the same rules. A Flow node shortens a message over 4000 characters
  instead of refusing it, since nobody is watching a running workflow.
