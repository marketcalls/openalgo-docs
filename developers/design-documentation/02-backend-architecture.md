# 02 - Backend Architecture

## Overview

OpenAlgo uses Flask 3.1 with Flask-RESTX, Flask-SocketIO, Flask-Limiter, Flask-WTF CSRF, SQLAlchemy, APScheduler, DuckDB, ZeroMQ, and a separate asyncio WebSocket proxy. Python `>=3.12` is required.

The backend is a single-user application. Production runs Gunicorn with a single eventlet worker (`start.sh` passes `--worker-class eventlet --workers 1`), and the market-data proxy runs outside it in its own process. Process-local components such as caches and the EventBus are therefore per process, not shared. Cross-process market-data and selected cache invalidation paths use ZeroMQ.

## Request Surfaces

| Surface | Registration | Authentication |
|---|---|---|
| REST v1 | `restx_api/__init__.py`, prefix `/api/v1` | OpenAlgo API key; CSRF exempt |
| Session APIs and webhooks | `blueprints/*.py` | Flask session, webhook secret, or explicit exemption |
| React bundle | `blueprints/react_app.py` | Route-specific frontend/auth gates |
| Socket.IO | `extensions.py` and subscribers | Flask/Socket.IO lifecycle |
| Market-data WebSocket | `websocket_proxy/server.py`, port 8765 | Authenticate action with API key |
| Remote MCP | Conditional in `app.py` | OAuth 2.1 bearer tokens |

Flask-RESTX's Swagger UI is intentionally disabled through `doc=False`. The [API documentation](../../api-documentation/v1/README.md) is the maintained external contract.

## Application Factory

`create_app()` initializes Flask, Socket.IO, EventBus subscribers, CSRF, limiter, CORS, CSP, security middleware, traffic/latency/health hooks, React routes, RESTX, feature blueprints, the broker keepalive service, and the real-time order-update adapters. The scoped-session teardown handler is registered at module scope after the factory returns. Remote MCP blueprints are imported and registered only when `MCP_HTTP_ENABLED=True` passes startup safety checks.

## Service Flow

<figure><img src="../../.gitbook/assets/diagram-backend-service-request-path.png" alt="Backend request path: resource or blueprint, schema validation, service, Action Center or analyzer/live routing, EventBus subscribers"><figcaption></figcaption></figure>

Order services strip sensitive fields before logging events. Analyzer mode routes supported operations to sandbox managers. Semi-auto mode queues eligible operations in Action Center and blocks specific destructive calls according to each service's policy.

## Persistence

SQLAlchemy modules use scoped sessions and `NullPool` for SQLite. `utils/db_sessions.py` owns the registry of every scoped session; `app.py`'s `teardown_appcontext` handler calls `remove_all_scoped_sessions()` after each request, and background threads that run without an app context call the same function themselves. Historify owns a separate DuckDB file and its own connection discipline. See [18 Database Structure](18-database-structure.md).

## Background Components

- APScheduler jobs for Flow, Python strategies, Historify, and maintenance paths.
- Sandbox execution, square-off, and settlement workers.
- Broker keepalive service.
- Real-time order-update adapters that ingest broker order pushes or postbacks and republish them as `order.update` events.
- Scalping risk monitor that subscribes to live ticks and survives browser navigation.
- Telegram/WhatsApp service startup when configured.
- WebSocket proxy process under eventlet/gunicorn, or OS thread in direct development startup.
- Health metrics and database initialization work.

## Security Boundaries

- `APP_KEY` and `API_KEY_PEPPER` are startup requirements.
- Broker tokens and retrievable API keys are Fernet-encrypted; API-key verification uses Argon2 plus a pepper.
- Session routes retain CSRF except explicit broker-callback, webhook, postback, and health exemptions. `auth.logout` is deliberately not exempt.
- `/api/v1` is CSRF-exempt because it uses API-key authentication.
- CORS, CSP, proxy-header trust, IP bans, cookie security, and session expiry are environment controlled.
- Debug mode on a non-loopback host is refused unless explicitly overridden; Remote MCP refuses debug mode.

## Key Files

| File | Purpose |
|---|---|
| `app.py` | Factory, registration, setup, startup |
| `restx_api/__init__.py` | Public v1 namespace registry |
| `blueprints/react_app.py` | SPA serving and route aliases |
| `services/order_router_service.py` | Auto/semi-auto routing |
| `utils/plugin_loader.py` | Broker discovery and lazy auth imports |
| `database/engine_factory.py` | SQLite engine policy |
| `utils/db_sessions.py` | Scoped-session registry and release |
| `utils/event_bus.py` | Per-process async event dispatch |
| `websocket_proxy/app_integration.py` | Proxy lifecycle selection |
