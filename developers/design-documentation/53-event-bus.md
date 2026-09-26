# 53 - Event Bus

## Scope

`utils/event_bus.py` is a lightweight, **per-process** topic bus for asynchronous order side effects. It is not the cross-process market-data bus; ZeroMQ owns that job.

Each Flask worker that imports the global singleton has its own subscriber registry and 10-worker `ThreadPoolExecutor`. A service publishes in the process handling the request, and that process dispatches its local subscribers.

Dispatch is bounded. `EventBus.DEFAULT_MAX_PENDING` is 1000 callbacks queued-or-running; beyond that, further callbacks are dropped rather than queued, because the executor's own work queue is unbounded and a publisher that outruns its subscribers would otherwise grow it until the process is killed. Drops are counted and logged sparsely, and `bus.stats()` reports pending/max/dropped for health reporting.

## Flow

<figure><img src="../../.gitbook/assets/diagram-event-bus-dispatch.png" alt="EventBus in one Flask worker: order services, REST endpoints, sandbox engine and postback adapters publish to a bounded 10-worker thread pool that runs log, Socket.IO, Telegram, WhatsApp, ZMQ relay and strategy book subscribers"><figcaption></figcaption></figure>

Callbacks are copied under a lock and submitted without blocking the publisher. `_safe_call` catches/logs subscriber exceptions so notification or logging failure cannot change the order response.

## Topics

| Topic | Event |
|---|---|
| `order.placed` | Successful single order |
| `order.failed` | Failed order |
| `order.no_action` | Smart order already at target |
| `order.modified`, `order.modify_failed` | Modify result |
| `order.cancelled`, `order.cancel_failed` | Cancel result |
| `orders.all_cancelled` | Cancel-all summary |
| `order.update` | Async broker postback / order-WS fill or rejection, and sandbox engine transitions |
| `gtt.placed`, `gtt.failed` | GTT placement result |
| `gtt.modified`, `gtt.modify_failed` | GTT modify result |
| `gtt.cancelled`, `gtt.cancel_failed` | GTT cancel result |
| `gtt.triggered`, `gtt.expired` | GTT lifecycle transitions |
| `position.closed` | Close-position summary |
| `basket.completed` | Basket summary |
| `split.completed` | Split summary |
| `options.completed` | Options-order summary |
| `multiorder.completed` | Multi-leg summary |
| `analyzer.error` | Analyzer validation/runtime error |
| `sandbox.order_filled` | Engine-driven fill refresh |
| `sandbox.auto_squareoff` | Engine-driven square-off refresh |
| `sandbox.t1_settlement` | Engine-driven settlement refresh |

Batch services suppress child events and publish one summary, preventing duplicate logs/chat alerts.

## Subscribers

`subscribers/register_all()` wires log, Socket.IO, Telegram, and WhatsApp callbacks for the order and GTT topics. Sandbox engine-internal topics go only to Socket.IO because they are UI refresh signals rather than user API calls; they are not duplicated into analyzer logs or chat alerts. `order.update` is engine-driven and broker-driven for the same reason: it goes to Socket.IO and to `wsproxy_subscriber`, which republishes it on the ZeroMQ bus so the WebSocket proxy can relay it to clients that sent `subscribe_orders`.

`subscribers/strategy_book_subscriber.register(bus)` is wired separately, from the database-initialization thread in `app.py` rather than from `register_all()`, because it must be listening before the first order is accepted. It subscribes to `order.placed`, `order.update`, and the four batch-completion topics.

Telegram/WhatsApp subscribers skip failure and analyzer-error chat notifications. The log and Socket.IO consumers still record/emit the applicable state.

## Event Data

Order events carry mode, API type, strategy, request/response data, and fields needed for notification formatting. API keys may be passed in memory for username resolution but must be stripped from persisted request logs. Do not add broker tokens or other decrypted credentials to an event.

## Why Per-Process

The bus decouples side effects on a single request path with minimal dependencies. It makes no durability or cross-worker delivery guarantee. Features that require cross-process delivery, replay, or durable queues need a different transport; do not infer those properties from this bus.

## Adding An Event Or Subscriber

1. Add a typed event under `events/` with a stable topic.
2. Publish once at the service boundary, after the outcome is known.
3. Add callbacks and registrations in `subscribers/__init__.py`.
4. Keep callbacks idempotent where duplicate upstream requests are possible.
5. Test publisher response independence and subscriber failure isolation.

## Key Files

| File | Purpose |
|---|---|
| `utils/event_bus.py` | Bus and executor singleton |
| `events/` | Typed payloads |
| `subscribers/__init__.py` | Registration |
| `subscribers/log_subscriber.py` | Database logging |
| `subscribers/socketio_subscriber.py` | Browser refresh/events |
| `subscribers/telegram_subscriber.py` | Telegram alerts |
| `subscribers/whatsapp_subscriber.py` | WhatsApp alerts |
| `subscribers/wsproxy_subscriber.py` | ZeroMQ relay of order updates to the proxy |
| `subscribers/strategy_book_subscriber.py` | Per-strategy position book |
