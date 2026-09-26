# OpenAlgo Architecture

OpenAlgo is a self-hosted Flask application with a React frontend. Everything runs on your machine: the web UI, the REST API, the WebSocket proxy, the strategy host, and the databases. No trading data leaves your infrastructure.

This page explains how the pieces fit together. For component-level detail, see the [Design Documentation](developers/design-documentation/README.md).

***

## The Layered View

Every client speaks the same OpenAlgo API. The service layer holds the business logic, and a broker plugin translates it to whatever the broker actually expects.

<figure><img src=".gitbook/assets/diagram-architecture-layered-view.png" alt="Layered architecture: clients to request guards, blueprints and REST API v1, service layer, then sandbox engine or broker plugins to broker APIs, with event bus and six databases"><figcaption></figcaption></figure>

The point of the plugin boundary is that your strategy never changes when your broker does. Symbols, order types, quotes and streams are normalised on the way down, and broker responses are normalised on the way back up.

***

## Processes and Ports

OpenAlgo runs as two listeners.

| Process | Default | Purpose |
| --- | --- | --- |
| **Flask application** | `127.0.0.1:5000` | Web UI, REST API v1, webhooks, broker OAuth callbacks |
| **WebSocket proxy** | `127.0.0.1:8765` | Market data streaming and order updates |

Hosted Python strategies run in **separate processes**, so a strategy that crashes or blocks cannot take the platform down with it.

***

## Request Lifecycle: Placing an Order

Whether the signal comes from a TradingView webhook, the Python SDK, an Excel cell, or the built-in terminal, it follows the same path.

<figure><img src=".gitbook/assets/diagram-architecture-placeorder-lifecycle.png" alt="Place order sequence: rate limit and schema check, optional Action Center queue, validation, Analyzer mode to sandbox or live broker plugin, which return the order id, then order event published to subscribers and the reply sent"><figcaption></figcaption></figure>

Two things in that chain are worth calling out.

**Analyzer mode is a real fork in the path.** When it is on, the order stops at the sandbox store and never reaches the broker, while market prices still come from live broker data. This is what makes it safe to test a strategy end to end. See [API Analyzer](new-features/api-analyzer.md).

**The event bus is how everything else stays in sync.** Order placement publishes an event that the Telegram and WhatsApp subscribers, the logging subscriber, the strategy book, and the WebSocket proxy all listen to independently. Adding a notification channel does not mean touching the order path.

***

## Market Data: One Upstream, Many Consumers

The WebSocket proxy holds **one connection to the broker feed** and fans it out to every consumer. Ten strategies watching NIFTY do not open ten broker connections.

<figure><img src=".gitbook/assets/diagram-architecture-market-data-fanout.png" alt="Market data path: broker feed to streaming adapter, ZeroMQ bus on 5555, WebSocket proxy on 8765, then Excel, Python SDK, browser UI and in-app Flow, sandbox and strategy services"><figcaption></figcaption></figure>

Each consumer subscribes to the symbols and mode it wants (LTP, quote, or depth). The proxy handles broker-specific adapter logic, reconnection, and subscription bookkeeping, so consumers see one protocol regardless of broker. See [WebSockets](developers/design-documentation/authentication-platforms.md).

***

## Code Layout

| Directory | Responsibility |
| --- | --- |
| `blueprints/` | Flask route modules, one per feature area, roughly 60 of them |
| `restx_api/` | The versioned REST API surface and its request schemas |
| `services/` | Business logic, around 80 modules, shared by the API and the UI |
| `broker/` | 36 broker plugins, each with its own `api/` and `mapping/` |
| `websocket_proxy/` | Streaming server, broker adapters, connection manager |
| `database/` | SQLAlchemy models and per-domain data access |
| `sandbox/` | Analyzer mode: simulated execution, margin, positions |
| `events/`, `subscribers/` | In-process event bus and its listeners |
| `strategies/`, `portfolio/`, `sip/` | Strategy hosting, portfolio and SIP backtesting |
| `mcp/` | Model Context Protocol server for AI agents |
| `frontend/` | React and Vite single page application |
| `utils/` | Shared helpers, HTTP connection pooling, constants |

The `restx_api/` schemas are the contract. They validate every incoming request and reject unknown fields, so a malformed payload fails fast with a clear message rather than reaching a broker.

***

## Data Stores

OpenAlgo splits its data across several SQLite databases so that heavy write paths do not contend with trading data, plus DuckDB for historical bars.

| Store | Holds |
| --- | --- |
| `db/openalgo.db` | Users, API keys, broker auth, symbols, strategies, settings |
| `db/latency.db` | Order round-trip timings |
| `db/logs.db` | Traffic logs: request metadata, status, duration |
| `db/sandbox.db` | Analyzer mode orders, positions, and funds |
| `db/health.db` | System health monitoring |
| DuckDB (Historify) | Historical OHLCV bars, stored columnar for fast range queries |

***

## Security Boundaries

| Layer | Control |
| --- | --- |
| Session login | TOTP two-factor, rate-limited login attempts |
| API requests | API key resolved server-side, never a broker token from the client |
| Key storage | Argon2 hashing plus a separately encrypted retrieval copy |
| Browser | CORS policy, CSP headers, CSRF tokens |
| Throughput | Per-endpoint rate limits, defaulting to 50 requests per second overall and 10 per second for orders |
| Strategies | Hosted scripts run in isolated processes |
| Audit | Full request and order audit trail |

Broker credentials never reach the client. A strategy holds an **OpenAlgo API key**, and the server resolves that to the active broker session, so revoking a key does not require touching your broker account. See [Security](developers/design-documentation/database-layer.md).

***

## Hosting Topologies

### Windows and Mac Hosting Architecture

<figure><img src=".gitbook/assets/image (124).png" alt=""><figcaption></figcaption></figure>

### Linux Server Hosting Architecture

<figure><img src=".gitbook/assets/image (125).png" alt=""><figcaption></figcaption></figure>

A local install is the simplest and keeps everything on your desktop. A server install suits strategies that must run when your desktop does not. A public deployment still requires you to configure TLS, a reverse proxy, firewall rules, secrets, and an update process correctly. See [Getting Started](getting-started/README.md).

***

## Related Reading

* [Design Documentation](developers/design-documentation/README.md) for the component-by-component breakdown
* [Place Order Call Flow](developers/design-documentation/19-placeorder-call-flow.md) for the order path in detail
* [Service Layer](developers/design-documentation/27-service-layer.md) and [Database Structure](developers/design-documentation/18-database-structure.md)
* [API Documentation](api-documentation/v1/README.md) for the REST and WebSocket surface
* [Why to Build with OpenAlgo?](why-to-build-with-openalgo.md) for the rationale
