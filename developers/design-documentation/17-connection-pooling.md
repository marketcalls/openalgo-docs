# 17 - Connection Pooling

## Overview

OpenAlgo pools broker WebSocket adapters per broker and user. A `ConnectionPool` allocates subscriptions across adapter connections while a process-local `SharedZmqPublisher` sends every adapter's normalized ticks to the market-data proxy.

The default pool limits are 1,000 symbols per broker connection and three connections. These are capacity limits, not guarantees; broker-specific limits and capabilities still apply.

## Topology

<figure><img src="../../.gitbook/assets/diagram-connection-pooling-topology.png" alt="Inside the WebSocket proxy process, per broker and user ConnectionPool adapters (up to 1000 symbols each, up to 3 connections) publish through a SharedZmqPublisher that connects to the ZeroMQ bus on port 5555; the cache-invalidation and order-update publishers in the Flask process also connect, and the WebSocket proxy SUB socket is the sole binder that fans ticks out to clients on port 8765"><figcaption></figcaption></figure>

The proxy's SUB socket is the sole binder on the configured endpoint. Broker market-data publishers and cache-invalidation publishers connect to that fixed endpoint. There is no publisher bind or fallback-port scan; this avoids cross-process bind races that can acknowledge subscriptions without delivering ticks.

## Configuration

```bash
MAX_SYMBOLS_PER_WEBSOCKET=1000
MAX_WEBSOCKET_CONNECTIONS=3
ENABLE_CONNECTION_POOLING=true
ZMQ_HOST=127.0.0.1
ZMQ_PORT=5555
```

These are the defaults read in `websocket_proxy/base_adapter.py` and `websocket_proxy/connection_manager.py`. Setting `ENABLE_CONNECTION_POOLING=false` falls back to one connection per broker.

`ZMQ_HOST` defaults to loopback. Multi-host deployments can point publishers at the host where the proxy binds, but the endpoint must be consistent for all processes.

## Pool Allocation

`ConnectionPool` tracks `(symbol, exchange, mode)` subscriptions and the adapter that owns each one.

1. Reuse an existing adapter with capacity.
2. Create and initialize another adapter when all current adapters are full.
3. Reject the subscription when the configured connection and symbol capacity is exhausted.
4. Unsubscribe from the broker only when the last local client releases the subscription.

Requested depth levels are retained with the subscription so authentication recovery can restore depth subscriptions correctly. Authentication-like broker failures trigger a token refresh and subscription restoration path.

## Shared Publisher

The pool creates one thread-safe `SharedZmqPublisher` singleton per process. Pooled adapters publish through that object instead of creating individual ZeroMQ contexts and sockets. The publisher connects lazily and idempotently to `tcp://<ZMQ_HOST>:<ZMQ_PORT>`.

The WebSocket proxy maintains an O(1) subscription index keyed by symbol, exchange, and numeric mode. A higher-mode tick can satisfy lower-mode subscribers. Topics ending in `_positions` and `_margins` are private account events and are skipped entirely. Topics ending in `_orders` are the order-update relay published by `subscribers/wsproxy_subscriber.py`; the proxy routes them only to the owning authenticated client that sent `subscribe_orders`, never to the market-data fan-out.

## Lifecycle

- Adapter connections are created on demand and closed during pool cleanup.
- The shared publisher is closed only after the pools using it are released.
- Re-authentication evicts a disconnected or broker-mismatched cached adapter before rebuilding it with current credentials.
- Proxy shutdown closes client sockets, adapters, the ZMQ socket, and its asyncio tasks.

## Key Files

| File | Responsibility |
|---|---|
| `websocket_proxy/connection_manager.py` | Pool allocation, recovery, shared publisher |
| `websocket_proxy/base_adapter.py` | Base broker adapter and non-pooled publisher connection |
| `websocket_proxy/broker_factory.py` | Broker adapter and pool construction |
| `websocket_proxy/server.py` | SUB binder, client subscriptions, tick fan-out |
