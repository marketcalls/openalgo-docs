# 06 - WebSocket Architecture

## Two Real-Time Channels

OpenAlgo uses two different real-time mechanisms:

| Channel | Purpose | Client |
|---|---|---|
| Socket.IO | Order lifecycle, analyzer refresh, sandbox engine events, UI notifications | React app |
| WebSocket proxy on port 8765 | Normalized broker market data | SDKs, React market-data manager, risk monitor |

They are not interchangeable. Socket.IO events originate from the in-process EventBus; market-data messages originate from broker adapters and the ZMQ bus.

## Market-Data Topology

<figure><img src="../../.gitbook/assets/diagram-websocket-zmq-topology.png" alt="ZMQ fan-in: broker adapters and the Flask SharedZmqPublisher connect to tcp 5555 where the WebSocket proxy SUB binds, then route through the subscription index to clients on port 8765"><figcaption></figcaption></figure>

The SUB side binds and publisher sockets connect. This permits multiple broker/worker publishers to fan into one proxy under gunicorn/eventlet. Reversing the topology can drop ticks in multi-process deployments.

## Proxy Lifecycle

`websocket_proxy/app_integration.py` chooses the execution model:

- Under eventlet/gunicorn, start the asyncio WebSocket proxy as a child process.
- Under direct development startup, run it in a real OS thread.
- Docker or standalone-proxy modes can suppress embedded startup.

The server listens on `WEBSOCKET_HOST`/`WEBSOCKET_PORT` (default port 8765), uses explicit `WS_MAX_QUEUE`, `WS_PING_INTERVAL`, and `WS_PING_TIMEOUT`, and closes clients, adapters, ZMQ sockets, and the server socket during shutdown.

## Protocol

Clients send JSON action envelopes. Supported actions are:

| Action | Purpose |
|---|---|
| `authenticate` (alias `auth`) | Verify `api_key` or `apikey` and resolve broker |
| `subscribe` | Subscribe one `symbol` or a `symbols` array |
| `unsubscribe` | Remove selected subscriptions |
| `unsubscribe_all` | Remove all subscriptions for the client |
| `subscribe_orders` | Account-scoped order-update stream, no symbol or mode |
| `unsubscribe_orders` | Stop the order-update stream |
| `get_broker_info` | Return active broker/capability information |
| `get_supported_brokers` | Return proxy-supported brokers |
| `ping` | Protocol keepalive/diagnostic |

`server.py` reads the action from either `action` or `type`, so both spellings work for the same envelope.

Authentication must complete within the configured grace period (15 seconds by default). Subscription modes accept `LTP`, `Quote`, or `Depth`, with integer modes 1, 2, and 3 normalized to those values. Responses report per-symbol success or failure.

## Subscription And Adapter Model

The proxy indexes subscribers by normalized symbol, exchange, and mode, and constructs broker adapters through `websocket_proxy/broker_factory.py`. Connection pooling limits are controlled by environment settings, with defaults of 1000 symbols per broker connection and three connections.

Public market data is fanned out to matching clients by symbol, exchange and mode. Order updates are a separate, account-scoped channel: a client must explicitly send `subscribe_orders`, and the stream is never fanned out as part of a market-data subscription. Order-update ingestion itself is governed by `ORDER_UPDATES_ENABLED` (default `TRUE`), with `ORDER_POLL_INTERVAL` (default 5 seconds) used for brokers that have no push mechanism. Position and margin topics are not published on the proxy at all.

## Shared Broker Feed

All app sessions share one installation-level broker feed. Re-authenticating another device with unchanged broker and feed tokens does not publish teardown invalidation. A material token/broker/revoke change still invalidates caches and feed state.

## Frontend Use

`frontend/src/lib/MarketDataManager.ts` centralizes client subscriptions. Hooks acquire and release subscriptions rather than opening independent connections per component. Page visibility and stale-tick fallbacks limit unnecessary traffic. The scalping server risk monitor uses `services/websocket_client.py` so stop evaluation survives browser navigation.

## Key Files

| File | Purpose |
|---|---|
| `websocket_proxy/server.py` | Protocol, auth, subscription index, delivery |
| `websocket_proxy/app_integration.py` | Thread/process startup choice |
| `websocket_proxy/broker_factory.py` | Adapter creation |
| `websocket_proxy/connection_manager.py` | Pooling and connection state |
| `services/websocket_service.py` | ZMQ publisher used by broker data paths |
| `services/websocket_client.py` | Internal proxy client |
| `frontend/src/lib/MarketDataManager.ts` | Browser subscription manager |

See the [WebSocket API](../../api-documentation/v1/websockets.md) for client messages.
