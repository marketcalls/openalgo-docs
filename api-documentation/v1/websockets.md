# WebSocket API

OpenAlgo exposes normalized real-time market data through a separate WebSocket proxy. It is not mounted below the REST `/api/v1` prefix.

## Connection URL

```text
Local:      ws://127.0.0.1:8765
Production: wss://<your-domain>/ws
```

The direct host and port come from `WEBSOCKET_HOST` and `WEBSOCKET_PORT`. A production reverse proxy normally exposes the service at `/ws` over TLS.

## Authenticate

Send authentication immediately after connecting. The default authentication grace period is 15 seconds.

```json
{
  "action": "authenticate",
  "api_key": "<your_app_apikey>"
}
```

`apikey` is also accepted as the key field. A successful response identifies the active broker:

```json
{
  "type": "auth",
  "status": "success",
  "message": "Authentication successful",
  "broker": "zerodha",
  "user_id": "openalgo-user",
  "supported_features": {
    "ltp": true,
    "quote": true,
    "depth": true
  }
}
```

The generic `supported_features` flags do not guarantee every exchange, instrument, field or depth level is supported. Inspect per-symbol subscription results and the active broker's capabilities.

## Subscribe

Use `LTP`, `Quote`, or `Depth`. Mode names are case-insensitive; integers `1`, `2`, and `3` are accepted respectively. The optional `depth` field defaults to 5. `request_id` is echoed in the acknowledgement when supplied.

```json
{
  "action": "subscribe",
  "mode": "Quote",
  "symbols": [
    {"exchange": "NSE", "symbol": "RELIANCE"},
    {"exchange": "NSE", "symbol": "INFY"}
  ],
  "request_id": "quotes-1"
}
```

A single `symbol` and `exchange` pair can be sent instead of `symbols`. The acknowledgement reports success or failure for each requested instrument:

```json
{
  "type": "subscribe",
  "status": "success",
  "subscriptions": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "status": "success",
      "mode": "Quote",
      "depth": 5,
      "broker": "zerodha"
    }
  ],
  "message": "Subscription processing complete",
  "broker": "zerodha",
  "request_id": "quotes-1"
}
```

## Market-Data Messages

Ticks use a common wrapper. The nested `data` object is the normalized available broker payload. The outbound numeric `mode` is the client's subscribed mode, and higher-mode publications can be delivered to lower-mode subscribers.

```json
{
  "type": "market_data",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "mode": 2,
  "broker": "zerodha",
  "data": {
    "ltp": 1424.0,
    "open": 1415.0,
    "high": 1432.5,
    "low": 1408.0,
    "close": 1418.0,
    "volume": 100000
  }
}
```

| Mode | Value | Payload |
|---|---:|---|
| LTP | 1 | Last traded price and tick fields |
| Quote | 2 | LTP and quote fields the broker supplies |
| Depth | 3 | Available quote fields and order-book levels |

Depth availability and the number of levels depend on the active broker. Higher-mode broker ticks can satisfy subscribers to lower modes.

### Field availability

Quote and Depth do not guarantee complete OHLCV, previous close, OI, buy/sell totals or order counts. Sahi omits OHLC/previous close because its stream does not carry them. Groww publishes available fields from its merged cache and is commonly LTP-only. Index streams can lack tradable depth or volume. Read optional fields without inventing prices/quantities; a stream can provide fewer fields than a REST snapshot. REST normally uses `prev_close` and `bids`/`asks`; streams use `close` and `depth.buy`/`depth.sell`.

The pinned Python SDK 2.0.5 changes raw frames: its Quote callback/cache fills a fixed field set with zero defaults, and its Depth callback/cache retains only `ltp`, `timestamp` and `depth`. Those SDK zeroes can mean unavailable upstream; extra quote fields in raw Depth frames are discarded. Callbacks use `message["data"]` for market values. Use a raw WebSocket client when missing-field semantics or extra Depth fields matter. See [Python SDK behavior](../../trading-platform/python/README.md#websocket-cache-and-callback-behavior).

## Unsubscribe

For selected subscriptions, put the mode on each symbol object:

```json
{
  "action": "unsubscribe",
  "symbols": [
    {"exchange": "NSE", "symbol": "RELIANCE", "mode": "Quote"}
  ],
  "request_id": "quotes-2"
}
```

Remove every subscription owned by the connection with:

```json
{
  "action": "unsubscribe_all"
}
```

An unsubscribe acknowledgement separates `successful` and `failed` items. An individual symbol's mode overrides the top-level mode; if neither is present, the default is Quote. Mode-valid outcomes carry the canonical label; a mode-validation failure carries `mode: null`.

A last-owner adapter refusal leaves that local subscription registered for retry. Releasing one client preserves other owners. Disconnect cleanup removes the dead session and reclaims unresolved last-client feed ownership through teardown; it does not preserve a disconnected session for later replay.

## Order Updates

Real-time order status changes: fills, partial fills, rejections, and
cancellations pushed by the broker after an order is placed, or by the sandbox
engine in analyze mode. This is an **account-level** stream: no symbols or
modes are involved.

Subscribe after authenticating:

```json
{
  "action": "subscribe_orders",
  "request_id": "orders-1"
}
```

The acknowledgement:

```json
{
  "type": "subscribe_orders",
  "status": "success",
  "message": "Subscribed to order updates",
  "request_id": "orders-1"
}
```

Each order event then arrives as an `order_update` message using OpenAlgo's
common order vocabulary (see Order Constants): `symbol` is in OpenAlgo symbol
format (mapped from the broker's own symbology, so `NHPC-EQ` becomes
`NHPC`, and NFO futures appear as `NIFTY28JUL26FUT`), `action` is
`BUY`/`SELL`, `pricetype` is `MARKET`/`LIMIT`/`SL`/`SL-M`, `product` is
`CNC`/`NRML`/`MIS`, and `order_status` is lowercase `open` / `trigger pending` / `complete` /
`rejected` / `cancelled` (plus broker-specific extras such as `expired`).
`rejection_reason` carries the broker's full RMS/OMS text when rejected.
`mode` is `live` for broker events and `analyze` for sandbox events.

```json
{
  "type": "order_update",
  "user_id": "openalgo-user",
  "mode": "live",
  "broker": "upstox",
  "orderid": "240221025997024",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "action": "BUY",
  "quantity": 10,
  "price": 1424.0,
  "trigger_price": 0,
  "pricetype": "LIMIT",
  "product": "MIS",
  "order_status": "complete",
  "filled_quantity": 10,
  "pending_quantity": 0,
  "average_price": 1423.85,
  "rejection_reason": ""
}
```

Stop the stream with:

```json
{
  "action": "unsubscribe_orders"
}
```

Order-update sources are broker-dependent: brokers with a dedicated
order-update WebSocket or ticker postback channel (Zerodha, Dhan, Fyers,
Upstox, AliceBlue, Definedge, IndMoney, Angel One, Nubra, Arrow) stream
natively; brokers without a push mechanism (e.g. Groww) fall back to
server-side orderbook polling. HTTPS postbacks registered with the broker at
`/postback/<broker>` feed the same stream on production deployments. If both
a broker WebSocket and a postback are configured, the same transition may be
delivered twice, so deduplicate on `orderid` + `order_status` +
`filled_quantity`.

## Other Actions

| Action | Purpose |
|---|---|
| `get_broker_info` | Return the authenticated broker and adapter state |
| `get_supported_brokers` | Return brokers supported by the proxy configuration |
| `ping` | Return a `pong` with the server timestamp |

The `ping` action echoes an optional `timestamp` and `_pingId`, which can be used for latency measurement.

## Delivery limits

The current proxy listener forwards publications without applying the legacy LTP time-throttle attribute. Broker cadence, mode fan-out, network delays and slow consumers still affect delivery; there is no guarantee of every exchange tick, simultaneous delivery or replay. Track freshness before using prices.

`WS_MAX_QUEUE` defaults to 1024 and is passed to the WebSocket library's incoming receive queue. It is not an outgoing tick buffer and does not guarantee lossless delivery to slow clients.

## Reconnection

WebSocket transport pings are configured by `WS_PING_INTERVAL` and `WS_PING_TIMEOUT`, both 20 seconds by default. After a disconnect, clients must reconnect, authenticate again, and restore subscriptions. SDK 2.0.5 does this by default (`auto_reconnect=True`), including its remembered order subscriptions; explicit `disconnect()` stops that loop. The server does not restore the disconnected session or replay missed ticks.
