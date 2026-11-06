# 34 - Application Startup

## Startup Sequence

`app.py` validates the environment before importing the rest of the application. This ordering is intentional because auth/database modules require installation secrets at import time.

```text
1. load and validate .env
2. import Flask extensions, databases, services, RESTX, proxy integration
3. create_app()
   - Flask + Socket.IO
   - EventBus subscribers
   - CSRF + limiter + CORS + CSP
   - security, traffic, latency, health hooks
   - React, RESTX, and feature blueprints
   - optional Remote MCP
   - request guards, broker keepalive, order-update adapters
4. setup_environment()
   - plugin discovery and broker capabilities
   - database/table initialization
   - strategy book database and subscriber
   - schedulers and restoration
   - sandbox workers and scalping risk monitor
   - configured Telegram and WhatsApp bots
5. module-scope teardown handler for scoped sessions
6. start WebSocket proxy when embedded mode applies
7. run Socket.IO server for direct startup, or expose app to gunicorn
```

## Required Configuration

A fresh checkout can create a missing `.env` from `.sample.env` with unique `APP_KEY`, `API_KEY_PEPPER`, and `FERNET_SALT`, private permissions, and no broker. It refuses to invent new keys when `db/openalgo.db` already exists. Preserve the original `.env` with the database; public sample placeholders are rotated on first run, while real existing values are retained.

`APP_KEY` must exist and contain at least 32 characters, checked in `create_app()`. `API_KEY_PEPPER` carries the same 32-character requirement, enforced at import time in `database/auth_db.py`. `utils/env_check.py` detects the placeholder `APP_KEY`, `API_KEY_PEPPER`, and `FERNET_SALT` values shipped in `.sample.env` and rotates them to fresh random secrets on first run. Official install paths generate unique values; placeholders are not accepted as production configuration.

Cookie security is derived from `HOST_SERVER`: HTTPS deployments use secure cookies while local HTTP development remains usable. External debug binding is refused unless explicitly allowed.

## Route Registration Order

When `frontend/dist` exists, the React blueprint is registered before REST/UI blueprints. Public REST is then registered and CSRF-exempted. Feature blueprints follow, with explicit CSRF exemptions for the broker OAuth callback, the Chartink/strategy/Flow webhooks, the broker postback endpoint, and the two health endpoints. `auth.logout` is deliberately not exempt: it revokes broker tokens and tears down the shared feed, so it keeps CSRF protection.

Flask-RESTX documentation is deliberately disabled (`doc=False`). Startup does not register Swagger UI.

## Remote MCP Gate

Remote MCP is off unless `MCP_HTTP_ENABLED=True`. Enabling it requires:

- Flask debug mode off.
- `MCP_PUBLIC_URL` set as the canonical public origin.
- OAuth/MCP blueprints imported only after the boot guard environment marker is set.

Startup logs warn when write scope is enabled or client approval is disabled.

## Database Readiness

Initialization runs before normal service use, and requests wait up to 30 seconds on `app.db_ready`. Table creation runs on a background thread through a `ThreadPoolExecutor` with `max_workers=1`, because most of those functions target the same SQLite file and SQLite allows one writer per file. Every initialization function must be idempotent and safe after partial prior setup. Sandbox initialization explicitly repairs missing tables.

The strategy book database and its EventBus subscriber are registered before `db_ready` is set, with up to three attempts, so no order can be accepted before its strategy tag can be recorded.

After each request, `app.py`'s `teardown_appcontext` handler calls `remove_all_scoped_sessions()` from `utils/db_sessions.py`, which holds the registry of every scoped session in the project. Background threads without an app context must call the same function themselves. This is part of the file-descriptor reliability contract.

## Background Services

`setup_environment()` initializes/restores background work for Flow (scheduler, order-update watches, price alerts, job reconciliation), Python strategies, Historify, sandbox execution/square-off plus catch-up settlement, scalping stops, and configured messaging services. The broker keepalive service and the real-time order-update adapters start earlier, inside `create_app()`. Failures should be logged with enough context and should only abort startup when the component is required for a coherent runtime.

## WebSocket Startup

The market-data proxy is skipped when Docker/standalone configuration owns it. Under either Gunicorn worker it runs in a child process; direct development startup uses an OS thread. See [06 WebSockets](authentication-platforms.md).

## Direct Run

The `__main__` block reads `FLASK_HOST_IP`, `FLASK_PORT`, and `FLASK_DEBUG`, performs bind/debug safety checks, and starts the Socket.IO server. Debug mode on a non-loopback host exits with an explanation unless `FLASK_DEBUG_ALLOW_EXTERNAL` is set to a truthy value. Production uses one Gunicorn worker: eventlet by default, or opt-in gthread with 64 request threads through the launcher. Docker `start.sh` owns the external proxy. The direct dev server ignores `OPENALGO_WORKER_CLASS`. See [worker selection](../../getting-started/gthread-migration.md).

## Adding Startup Work

1. Decide whether it belongs in factory registration or environment setup.
2. Make initialization idempotent and bounded.
3. Add teardown/stop ownership for threads, processes, sockets, or scoped sessions.
4. Avoid importing secret-dependent modules before environment validation.
5. Add startup diagnostics and a focused failure/restart test.
