# 51 - Broker And System Configuration

## Configuration Sources

OpenAlgo does not use a `config_service.py` or broker configuration database. Runtime settings come from:

| Source | Examples |
|---|---|
| `.env` | Broker keys, redirect/host/WebSocket URLs, database paths, rate limits, security flags |
| `broker/*/plugin.json` | Broker name, type, exchanges, leverage capability |
| Main settings tables | Analyzer mode, SMTP, notification/application preferences |

Environment validation runs before application imports. Import-time settings require a restart after change.

## Broker Credential API

`blueprints/broker_credentials.py` provides session-authenticated `/api/broker/credentials` GET/POST and `/api/broker/capabilities` GET.

GET masks secrets with a fixed-length suffix and returns raw length separately for UI state. POST writes only supplied values to `.env`, validates redirect/host/WebSocket formats and selected broker-specific composite keys, and returns `restart_required: true`.

The UI is part of `frontend/src/pages/Profile.tsx`. Broker selection/login uses `BrokerSelect.tsx` and `BrokerTOTP.tsx`.

## Public Broker Config

`GET /auth/broker-config` always exposes the broker name needed to render login. API key and redirect URL are returned only for an authenticated app session. The route derives the broker key from the configured callback URL.

## Capability Loading

At startup `utils/plugin_loader.py` calls `load_broker_capabilities()`, which reads every `broker/*/plugin.json` that declares `supported_exchanges` into the module-level `_broker_capabilities` dict. All 37 plugins qualify today: 35 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin for testing without real money. `/api/broker/capabilities` reads the broker from the Flask session and serves the cached record through `get_broker_capabilities()`. No session broker returns HTTP 400. A missing capability record falls back to a minimal `IN_stock` object with an empty `supported_exchanges` list and `leverage_config: false`.

## Security Boundaries

- `.env` is installation-secret state and must not be committed.
- Browser reads receive masked credentials; writes never echo submitted secrets.
- Changes are CSRF-protected and session-authenticated.
- Updating `.env` is not hot reload; restart is explicit.
- Login-time broker tokens are encrypted in `database/auth_db.py`, separate from static broker application credentials.

## Key Files

| File | Purpose |
|---|---|
| `.sample.env` | Environment contract and defaults |
| `utils/env_check.py` | Startup validation |
| `utils/plugin_loader.py` | Plugin/capability discovery |
| `blueprints/broker_credentials.py` | Credential and capability API |
| `blueprints/auth.py` | Broker config/login routes |
| `frontend/src/pages/Profile.tsx` | Configuration UI |
| `broker/*/plugin.json` | Capability metadata |
