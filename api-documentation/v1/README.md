# OpenAlgo API Documentation

This directory documents the registered OpenAlgo v1 REST API and the separate WebSocket protocol. The source of truth for REST registration is `restx_api/__init__.py`; request validation is defined in `restx_api/schemas.py`, `restx_api/data_schemas.py`, `restx_api/account_schema.py`, and `restx_api/strategy_schema.py`.

## Base URLs

```text
REST API:  http://127.0.0.1:5000/api/v1
WebSocket: ws://127.0.0.1:8765
```

Replace the local host with the configured HTTPS/WSS domain in a remote deployment.

## Authentication

Most POST endpoints accept the OpenAlgo API key as `apikey` in a JSON object. GET endpoints accept it as the `apikey` query parameter. Telegram and WhatsApp management endpoints, and the Slack and Discord notify endpoints, may also accept `X-API-KEY`; the Telegram webhook authenticates with `X-Telegram-Bot-Api-Secret-Token` instead of an OpenAlgo key.

```json
{
  "apikey": "<your_app_apikey>"
}
```

Never put broker credentials or broker access tokens in these requests. The OpenAlgo API key resolves the active broker session server-side.

## Strict Request Validation

POST bodies are deserialized by marshmallow schemas that do not set `Meta.unknown`, so marshmallow's default of `RAISE` applies: a field the schema does not declare makes the whole request fail with HTTP 400, even when every other field is valid. Treat each endpoint page's request-body table as the exact allowed field set rather than a summary. The GTT place and modify schemas set `unknown = EXCLUDE` and silently drop extras instead; chart preferences sets `unknown = INCLUDE` because arbitrary preference keys are the point of that resource.

GET resources (`/instruments`, `/ticker/<symbol>`, `/chart`, `/telegram/*`) read query parameters directly and ignore unrecognized ones.

## Registered REST Inventory

The current v1 surface contains **76 method/path pairs**. A resource with both GET and POST counts as two endpoints.

### Order Management

| Method | Path | Documentation |
|---|---|---|
| POST | `/placeorder` | [Place order](./orders-api/placeorder.md) |
| POST | `/placesmartorder` | [Place smart order](./orders-api/placesmartorder.md) |
| POST | `/optionsorder` | [Options order](./orders-api/optionsorder.md) |
| POST | `/optionsmultiorder` | [Options multi-order](./orders-api/optionsmultiorder.md) |
| POST | `/basketorder` | [Basket order](./orders-api/basketorder.md) |
| POST | `/splitorder` | [Split order](./orders-api/splitorder.md) |
| POST | `/modifyorder` | [Modify order](./orders-api/modifyorder.md) |
| POST | `/cancelorder` | [Cancel order](./orders-api/cancelorder.md) |
| POST | `/cancelallorder` | [Cancel all orders](./orders-api/cancelallorder.md) |
| POST | `/closeposition` | [Close positions](./orders-api/closeposition.md) |
| POST | `/placegttorder` | [Place GTT](./orders-api/placegttorder.md) |
| POST | `/modifygttorder` | [Modify GTT](./orders-api/modifygttorder.md) |
| POST | `/cancelgttorder` | [Cancel GTT](./orders-api/cancelgttorder.md) |
| POST | `/gttorderbook` | [GTT order book](./orders-api/gttorderbook.md) |

### Order And Account Information

| Method | Path | Documentation |
|---|---|---|
| POST | `/orderstatus` | [Order status](./orders-api/orderstatus.md) |
| POST | `/openposition` | [Open position](./orders-api/openposition.md) |
| POST | `/funds` | [Funds](./accounts-api/funds.md) |
| POST | `/margin` | [Margin](./accounts-api/margin.md) |
| POST | `/orderbook` | [Order book](./accounts-api/orderbook.md) |
| POST | `/tradebook` | [Trade book](./accounts-api/tradebook.md) |
| POST | `/positionbook` | [Position book](./accounts-api/positionbook.md) |
| POST | `/holdings` | [Holdings](./accounts-api/holdings.md) |

### Market Data And Symbols

| Method | Path | Documentation |
|---|---|---|
| POST | `/quotes` | [Quote](./data-api/quotes.md) |
| POST | `/multiquotes` | [Multiple quotes](./data-api/multiquotes.md) |
| POST | `/depth` | [Market depth](./data-api/depth.md) |
| POST | `/history` | [Historical candles](./data-api/history.md) |
| POST | `/intervals` | [Supported intervals](./data-api/intervals.md) |
| GET | `/ticker/<string:symbol>` | [Ticker-compatible history](./data-api/ticker.md) |
| POST | `/symbol` | [Symbol information](./data-api/symbol.md) |
| POST | `/search` | [Symbol search](./data-api/search.md) |
| POST | `/expiry` | [Expiry dates](./data-api/expiry.md) |
| GET | `/instruments` | [Instrument master](./data-api/instruments.md) |

### Options Analytics

| Method | Path | Documentation |
|---|---|---|
| POST | `/optionsymbol` | [Resolve option symbol](./data-api/optionsymbol.md) |
| POST | `/optionchain` | [Option chain](./data-api/option-chain.md) |
| POST | `/syntheticfuture` | [Synthetic future](./data-api/syntheticfuture.md) |
| POST | `/optiongreeks` | [Option Greeks](./data-api/optiongreeks.md) |
| POST | `/multioptiongreeks` | [Batch option Greeks](./data-api/multioptiongreeks.md) |

### Calendar, Analyzer, And Preferences

| Method | Path | Documentation |
|---|---|---|
| POST | `/market/holidays` | [Market holidays](./utilities-api/holidays.md) |
| POST | `/market/timings` | [Market timings](./utilities-api/timings.md) |
| POST | `/analyzer` | [Analyzer status](./accounts-api/analyzer-status.md) |
| POST | `/analyzer/toggle` | [Toggle analyzer mode](./accounts-api/analyzer-toggle.md) |
| POST | `/pnl/symbols` | [Sandbox P&L by symbol](./accounts-api/pnl-symbols.md) |
| GET | `/chart` | [Read chart preferences](./accounts-api/chart-preferences.md) |
| POST | `/chart` | [Update chart preferences](./accounts-api/chart-preferences.md) |
| POST | `/ping` | [Authenticated ping](./accounts-api/ping.md) |

There is no public `/api/v1/checkholiday` endpoint. Use `/market/timings` for a date; its response identifies holiday/closed sessions through the returned market schedule.

### Portfolio Analytics

| Method | Path | Documentation |
|---|---|---|
| GET | `/portfolio/benchmarks` | [Portfolio API](./portfolio.md) |
| POST | `/portfolio/backtest` | [Portfolio API](./portfolio.md) |
| POST | `/portfolio/tearsheet` | [Portfolio API](./portfolio.md) |
| POST | `/portfolio/holdings` | [Portfolio API](./portfolio.md) |

Portfolio endpoints are authenticated and read-only. The holdings resource reads the active broker account, but none of these resources places, modifies, or cancels an order.

### Strategy RMS Engine

The Strategy RMS Engine lifecycle and audit surface is under `/strategy`. It
contains nine authenticated RESTX routes; strategy creation, editing, live
enablement, token rotation, and deletion remain browser/session operations.

| Method | Path | Documentation |
|---|---|---|
| POST | `/strategy/list` | [List strategies](./strategy-rms-api/list.md) |
| POST | `/strategy/status` | [Strategy status](./strategy-rms-api/status.md) |
| POST | `/strategy/start` | [Start run](./strategy-rms-api/start.md) |
| POST | `/strategy/stop` | [Stop run](./strategy-rms-api/stop.md) |
| POST | `/strategy/close_all` | [Close all legs](./strategy-rms-api/close-all.md) |
| POST | `/strategy/close_leg` | [Close one leg](./strategy-rms-api/close-leg.md) |
| POST | `/strategy/runs` | [Run history](./strategy-rms-api/runs.md) |
| POST | `/strategy/orders` | [Order history](./strategy-rms-api/orders.md) |
| POST | `/strategy/events` | [Risk event audit trail](./strategy-rms-api/events.md) |

The public alert endpoint is `POST /strategy/webhook/<token>`. It is deliberately
outside `/api/v1`, uses the URL token rather than `apikey`, and is documented
separately in [Public Strategy Webhook](./strategy-rms-api/webhook.md). It is
not included in the 74 RESTX route count above.

### SIP Analytics

| Method | Path | Documentation |
|---|---|---|
| GET | `/sip/frequencies` | [SIP Backtest](./utilities-api/sip-backtest.md) |
| POST | `/sip/backtest` | [SIP Backtest](./utilities-api/sip-backtest.md) |

`/sip/backtest` validates against `SipBacktestSchema` and requires a valid API key; `source: "api"` additionally requires a broker session. `/sip/frequencies` returns the frequency list the engine supports and, like `/sectorrotation/options`, does not verify the API key. Both use `SIP_API_RATE_LIMIT`, default `10 per minute`.

### Sector Rotation

| Method | Path | Documentation |
|---|---|---|
| GET | `/sectorrotation/options` | [Sector Rotation API](sectorrotation.md) |
| POST | `/sectorrotation` | [Sector Rotation API](sectorrotation.md) |

The fixed options list needs no API key. A map request verifies `apikey`, even with local Historify data; `source="api"` additionally requires a broker login. Both use `SECTOR_ROTATION_API_RATE_LIMIT`, default `30 per minute`. These routes analyze historical prices and do not place orders.

### Messaging

| Method | Path | Documentation |
|---|---|---|
| GET, POST | `/telegram/config` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/telegram/start` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/telegram/stop` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/telegram/webhook` | [Telegram REST surface](./utilities-api/telegram.md) |
| GET | `/telegram/users` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/telegram/broadcast` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/telegram/notify` | [Telegram REST surface](./utilities-api/telegram.md) |
| GET | `/telegram/stats` | [Telegram REST surface](./utilities-api/telegram.md) |
| GET, POST | `/telegram/preferences` | [Telegram REST surface](./utilities-api/telegram.md) |
| POST | `/whatsapp/notify` | [WhatsApp notification](./utilities-api/whatsapp.md) |
| POST | `/slack/notify` | [Slack notification](./utilities-api/slack.md) |
| POST | `/discord/notify` | [Discord notification](./utilities-api/discord.md) |

The Telegram resource contributes 11 method/path pairs. Its webhook acknowledges validated updates but does not yet dispatch them, and the REST broadcast handler currently returns zero delivery counts. Those limitations are documented on the Telegram page.

The four `notify` endpoints post a message you write. Each refuses with HTTP 409 when its channel cannot send, and each names the missing step:

| Endpoint | Refused while |
|---|---|
| `/telegram/notify` | The Telegram bot is stopped |
| `/whatsapp/notify` | No WhatsApp device is paired and connected |
| `/slack/notify` | Slack is switched off on `/alerts`, or no Slack webhook is saved |
| `/discord/notify` | Discord is switched off on `/alerts`, or no Discord webhook is saved |

The **Alerts** page (`/alerts`) switches each channel on or off and chooses which order events it hears about. That switch applies to `notify` for Slack and Discord only. For Telegram and WhatsApp it, and the event groups for every channel, govern the automatic order alerts, which need no API call.

## WebSocket Protocol

WebSocket streaming is not mounted below `/api/v1`. Clients connect to the proxy on port `8765`, authenticate, and send action messages.

| Mode | Documentation |
|---|---|
| LTP | [LTP subscription](./websockets.md) |
| Quote | [Quote subscription](./websockets.md) |
| Depth | [Depth subscription](./websockets.md) |

Supported actions are `authenticate`, `subscribe`, `unsubscribe`, `unsubscribe_all`, `subscribe_orders`, `unsubscribe_orders`, `get_broker_info`, `get_supported_brokers`, and `ping`.

## Order Constants

### Exchanges

`NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`, `NCDEX`, `NCO`, `NSE_INDEX`, `BSE_INDEX`, `MCX_INDEX`, `GLOBAL_INDEX`, and `CRYPTO` are recognized by the shared validation constants. Broker capability metadata determines which subset is usable for the active broker.

### Products And Price Types

| Kind | Values |
|---|---|
| Product | `MIS`, `CNC`, `NRML` |
| Price type | `MARKET`, `LIMIT`, `SL`, `SL-M` |
| Action | `BUY`, `SELL` (lowercase is normalized by order schemas) |

Regular order, smart-order, basket, split, and modify schemas accept numeric quantities. Fractional quantities are allowed only for `CRYPTO`; non-crypto quantities must be whole numbers. Options order quantities remain positive integers.

## Response And Status Conventions

Most JSON resources return `status: "success"` or `status: "error"`, but broker payloads are normalized only at the wrapper level and some resources intentionally return CSV, plain text, or an empty webhook acknowledgement. Treat each endpoint page as authoritative for its payload.

Common status codes are:

| Code | Meaning |
|---|---|
| 200 | Request handled; a semi-auto order may only be queued, and a batch may contain child failures |
| 400 | Invalid JSON, schema validation failure, unsupported mode, or invalid request state |
| 401 | Missing or invalid authentication on endpoints that use 401 |
| 403 | Invalid API key or operation blocked by mode/policy |
| 404 | Broker module, symbol, order, or linked messaging user not found |
| 422 | Historical data or inputs cannot support the analysis |
| 429 | Rate limit or broker queue/guard refusal; inspect the response |
| 500 | Unhandled internal or broker error |
| 501 | Active broker does not implement the operation |
| 502 | Broker response/data unavailable; on place/smart order, a detected lost write reply means the order may have been placed |

### Order outcomes and retries

In Semi-Auto mode, eligible entry requests return HTTP `200` with `status: "success"`, `mode: "semi_auto"`, and `pending_order_id` after they are saved for Action Center approval. No broker order has been sent yet; this is not a placement or fill acknowledgement. Placement `orderid` and GTT `trigger_id` belong to the broker/sandbox result, not this pending approval response.

Even a placement acknowledgement is not proof of a fill. Check order status and broker books or the order-update stream. If the shared transport detects that a placement write may have reached the broker but its reply was lost, `/placeorder` and `/placesmartorder` return `502` explaining that the order may have been placed. Reconcile before retrying; do not automatically resend it. Basket/split calls report this warning per child, so inspect every child even on HTTP `200`.

A gthread broker-queue refusal is different: the request is refused before sending and returns `429`. That status may also come from a rate limiter or the broker, so read the message and endpoint context. There is no universal idempotency key or blanket retry guarantee.

`strategy` on `/cancelallorder` and `/closeposition` is a tracking label, **not a filter**. Those operations affect the active account's eligible orders/positions, including other strategies and manual activity; analyzer mode uses the user's sandbox account instead.

## Rate Limits

Defaults from `.sample.env` are `API_RATE_LIMIT="50 per second"`, `ORDER_RATE_LIMIT="10 per second"`, and `SMART_ORDER_RATE_LIMIT="10 per second"`. Option Greeks, portfolio, SIP, Sector Rotation, Telegram, and WhatsApp resources each read their own variable, none of which appears in `.sample.env`, so their in-code fallbacks apply on a stock install. Slack and Discord notify are fixed at 30 per minute each and have no setting. All values are deployment configuration and may contain compound semicolon-separated limits. See [rate limiting](./rate-limiting.md).

## Client Libraries

The Python client is available as `openalgo` and is pinned by this application at `2.0.5` (see `pyproject.toml`). Go and Node.js examples in `examples/` demonstrate direct REST integration; they are not declared here as separately versioned official SDK releases.
