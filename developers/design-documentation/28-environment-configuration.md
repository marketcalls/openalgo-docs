# 28 - Environment Configuration

## Overview

OpenAlgo uses environment variables for configuration, managed through a `.env` file with validation at startup. For cloud deployments (Railway/Render), the `start.sh` script can auto-generate `.env` from environment variables.

## Configuration Files

```
.env                # Active configuration (not in git)
.sample.env         # Reference template with all variables
```

## Environment Variables

### Version Tracking

```bash
# Configuration version - compare with .sample.env when updating
ENV_CONFIG_VERSION = '1.0.7'
```

Startup compares this value against `.sample.env` and refuses to boot when your `.env` is older. The values below reproduce `.sample.env`. Where a variable is optional, the default written in code can differ from the sample; those cases are called out inline.

### Core Security (Required)

```bash
# Application secret key (required, 32+ characters)
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
APP_KEY = 'your_32_character_secret_key_here'

# Security pepper for API key hashing, password hashing, token encryption
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
API_KEY_PEPPER = 'your_32_character_pepper_here'

# Per-install random salt feeding the Fernet KDF in database/auth_db.py
# Auto-generated on first run; never reuse across installs
FERNET_SALT = 'your_random_hex_salt_here'
```

`.sample.env` ships all three as named placeholders (`OPENALGO_PLACEHOLDER_...`). On first run `utils/env_check.py` detects them, generates fresh installation secrets, writes them back to `.env`, and includes saved broker keys with broker tokens, API keys and TOTP secrets in the relevant rotation paths. A newly generated Fernet salt uses 16 random bytes; app key and pepper use 32. Existing real secrets are retained.

### Broker Configuration

Broker environment keys are optional. New installs may leave broker credentials and `REDIRECT_URL` empty, then save encrypted per-broker keys in Broker Configuration after app sign-in. When `REDIRECT_URL` names a broker and `BROKER_API_KEY` is set, its `.env` values take precedence. Keep `VALID_BROKERS` set so the broker pages can list enabled choices. See [broker configuration](51-broker-and-system-config.md).

```bash
# Broker API credentials
BROKER_API_KEY = 'YOUR_BROKER_API_KEY'
BROKER_API_SECRET = 'YOUR_BROKER_API_SECRET'

# XTS API brokers only (5Paisa XTS, Jainam XTS, etc.)
BROKER_API_KEY_MARKET = 'YOUR_BROKER_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_BROKER_MARKET_API_SECRET'

# OAuth redirect URL
REDIRECT_URL = 'http://127.0.0.1:5000/<broker>/callback'

# Enabled brokers (comma-separated)
VALID_BROKERS = 'fivepaisa,fivepaisaxts,aliceblue,angel,arrow,compositedge,dhan,dhan_sandbox,definedge,deltaexchange,firstock,flattrade,fyers,groww,hdfcsecurities,hdfcsky,ibulls,iifl,iiflcapital,indmoney,jainamxts,kotak,motilal,mstock,nubra,paytm,pocketful,rmoney,rupeezy,sahi,samco,shoonya,tradejini,tradesmart,upstox,wisdom,zebu,zerodha'
```

### Database Configuration

```bash
# Main database
DATABASE_URL = 'sqlite:///db/openalgo.db'

# Additional databases
LATENCY_DATABASE_URL = 'sqlite:///db/latency.db'
LOGS_DATABASE_URL = 'sqlite:///db/logs.db'
HEALTH_DATABASE_URL = 'sqlite:///db/health.db'
SANDBOX_DATABASE_URL = 'sqlite:///db/sandbox.db'
HISTORIFY_DATABASE_URL = 'db/historify.duckdb'
```

Historify uses two different variable names, and they are not aliases of each other. `database/historify_db.py` and the Historify migrations read `HISTORIFY_DATABASE_PATH`; `.sample.env` and `blueprints/system_permissions.py` use `HISTORIFY_DATABASE_URL`. Both fall back to the same `db/historify.duckdb` default, so a default install works either way, but pointing the DuckDB file somewhere else requires setting `HISTORIFY_DATABASE_PATH`.

`app.py` creates the SQLite directory from `DATABASE_URL` before any engine connects, so all SQLite databases are expected to live under the same directory.

### Flask Application

```bash
# Host and port
FLASK_HOST_IP = '127.0.0.1'  # Use 0.0.0.0 for external access
FLASK_PORT = '5000'

# Environment
FLASK_DEBUG = 'False'
FLASK_ENV = 'development'  # or 'production'

# Public URL
HOST_SERVER = 'http://127.0.0.1:5000'
```

### Production Worker

`OPENALGO_WORKER_CLASS` selects `eventlet` (default) or `gthread` (opt-in, fixed 64 request threads). Both require exactly one Gunicorn worker process. `uv run app.py` uses standard threading and ignores this setting. Follow [worker selection and rollback](../../getting-started/gthread-migration.md) to change a deployed service.

### WebSocket Configuration

```bash
# WebSocket server
WEBSOCKET_HOST = '127.0.0.1'
WEBSOCKET_PORT = '8765'
WEBSOCKET_URL = 'ws://127.0.0.1:8765'

# Unauthenticated client grace window (seconds)
WS_AUTH_GRACE_SECONDS = '15'

# Per-client send buffer cap (pending messages)
WS_MAX_QUEUE = '1024'

# Server-initiated keepalive (seconds)
WS_PING_INTERVAL = '20'
WS_PING_TIMEOUT = '20'

# ZeroMQ message bus
ZMQ_HOST = '127.0.0.1'
ZMQ_PORT = '5555'
```

`ZMQ_HOST` must stay on loopback unless every process that publishes is on a trusted network: the proxy SUB socket binds this endpoint and every publisher connects to it, and the tick feed itself is unauthenticated.

### Connection Pooling

```bash
# Maximum symbols per WebSocket connection (default: 1000)
MAX_SYMBOLS_PER_WEBSOCKET = '1000'

# Maximum WebSocket connections per user/broker (default: 3)
# Total capacity = MAX_SYMBOLS_PER_WEBSOCKET × MAX_WEBSOCKET_CONNECTIONS
MAX_WEBSOCKET_CONNECTIONS = '3'

# Enable/disable connection pooling (default: true)
ENABLE_CONNECTION_POOLING = 'true'
```

### Real-Time Order Updates

```bash
# Always-on adapter per broker session ingesting broker order pushes
ORDER_UPDATES_ENABLED = 'TRUE'

# Fallback REST polling interval (seconds) for brokers without a push feed
ORDER_POLL_INTERVAL = '5'
```

### Broker Connection Keepalive

```bash
# Keep the pooled broker HTTP connection warm during market hours
BROKER_CONNECTION_KEEPALIVE = 'TRUE'
BROKER_KEEPALIVE_INTERVAL = '20'          # seconds, keep below 30
BROKER_KEEPALIVE_WINDOW = '09:00-23:30'   # IST window
```

### Ngrok Configuration

```bash
# Enable ngrok tunnel
NGROK_ALLOW = 'FALSE'
```

### Logging Configuration

```bash
# File logging
LOG_TO_FILE = 'False'
LOG_LEVEL = 'INFO'  # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_DIR = 'log'
LOG_FORMAT = '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
LOG_RETENTION = '14'  # Days

# Days to retain request traffic logs in logs.db (purged at startup)
TRAFFIC_LOG_RETENTION_DAYS = '30'

# Color output
LOG_COLORS = 'True'
FORCE_COLOR = '1'
```

### Health Monitoring

```bash
# Memory thresholds in MB for the background health monitor
HEALTH_MEMORY_WARNING_THRESHOLD = '3000'
HEALTH_MEMORY_CRITICAL_THRESHOLD = '5000'
```

### Python Strategy Logging

```bash
# Maximum log files per strategy (oldest deleted first)
STRATEGY_LOG_MAX_FILES = '10'

# Maximum total log size per strategy in MB
STRATEGY_LOG_MAX_SIZE_MB = '50'

# Delete strategy logs older than N days
STRATEGY_LOG_RETENTION_DAYS = '7'
```

### Rate Limiting

```bash
# Login rate limits
LOGIN_RATE_LIMIT_MIN = '5 per minute'
LOGIN_RATE_LIMIT_HOUR = '25 per hour'
RESET_RATE_LIMIT = '15 per hour'

# API rate limits
API_RATE_LIMIT = '50 per second'
ORDER_RATE_LIMIT = '10 per second'
SMART_ORDER_RATE_LIMIT = '10 per second'

# Webhook rate limits
WEBHOOK_RATE_LIMIT = '100 per minute'
STRATEGY_RATE_LIMIT = '200 per minute'
```

### API Configuration

```bash
# Session expiry time (24-hour format, IST)
SESSION_EXPIRY_TIME = '03:00'

# Disable the daily rollover entirely (crypto brokers, 24/7 markets)
DISABLE_SESSION_EXPIRY = 'false'

# Master contract smart download cutoffs
MASTER_CONTRACT_CUTOFF_TIME = '08:00'         # IST, Indian exchange brokers
CRYPTO_MASTER_CONTRACT_CUTOFF_TIME = '00:00'  # UTC, crypto brokers
```

### CORS Configuration

```bash
# Enable/disable CORS
# .sample.env ships TRUE; the default in cors.py when the variable is
# absent is FALSE, which falls back to Flask-CORS defaults
CORS_ENABLED = 'TRUE'

# Allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:5000'

# Allowed HTTP methods
CORS_ALLOWED_METHODS = 'GET,POST,DELETE,PUT,PATCH'

# Allowed headers
CORS_ALLOWED_HEADERS = 'Content-Type,Authorization,X-Requested-With'

# Exposed headers
CORS_EXPOSED_HEADERS = ''

# Allow credentials (cookies, auth headers)
CORS_ALLOW_CREDENTIALS = 'FALSE'

# Preflight cache max age (seconds)
CORS_MAX_AGE = '86400'
```

### Content Security Policy (CSP)

```bash
# Enable/disable CSP
CSP_ENABLED = 'TRUE'

# Report-only mode (testing)
CSP_REPORT_ONLY = 'FALSE'

# CSP directives
CSP_DEFAULT_SRC = "'self'"
CSP_SCRIPT_SRC = "'self' 'unsafe-inline' https://cdn.socket.io https://static.cloudflareinsights.com"
CSP_STYLE_SRC = "'self' 'unsafe-inline'"
CSP_IMG_SRC = "'self' data:"
CSP_CONNECT_SRC = "'self' wss: ws: https://cdn.socket.io"
CSP_FONT_SRC = "'self'"
CSP_OBJECT_SRC = "'none'"
CSP_MEDIA_SRC = "'self' data: https://*.amazonaws.com https://*.cloudfront.net"
CSP_FRAME_SRC = "'self'"
CSP_FORM_ACTION = "'self'"
CSP_FRAME_ANCESTORS = "'self'"
CSP_BASE_URI = "'self'"
CSP_UPGRADE_INSECURE_REQUESTS = 'FALSE'
CSP_REPORT_URI = ''

# Optional, no sample entry: emitted only when set
CSP_CHILD_SRC = ''
CSP_REPORT_TO = ''

# Additional security headers set by csp.py
REFERRER_POLICY = 'strict-origin-when-cross-origin'
PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(), web-share=()'
```

Four CSP directives are looser in `.sample.env` than the fallback defaults in `csp.py`. When the variable is absent, `csp.py` uses `script-src "'self' https://cdn.socket.io"`, `img-src "'self' data: blob:"`, `connect-src "'self' wss: ws:"`, and `media-src "'self'"`. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `X-XSS-Protection: 1; mode=block` are hard-coded and not configurable. A route that sets its own CSP header, such as the OAuth consent page, is not overwritten.

### CSRF Protection

```bash
# Enable/disable CSRF protection
CSRF_ENABLED = 'TRUE'

# Token time limit (seconds, empty = no limit)
CSRF_TIME_LIMIT = ''
```

### Cookie Configuration

```bash
# Cookie names (customize for multiple instances)
SESSION_COOKIE_NAME = 'session'
CSRF_COOKIE_NAME = 'csrf_token'
```

When `HOST_SERVER` starts with `https://`, `app.py` marks both cookies `Secure` and prefixes their names with `__Secure-`.

### Reverse Proxy Trust

```bash
# Trust CF-Connecting-IP / True-Client-IP / X-Real-IP / X-Forwarded-For
# Only enable when a reverse proxy actually sits in front of gunicorn
TRUST_PROXY_HEADERS = 'FALSE'
```

With the default `FALSE`, `utils/ip_helper.get_real_ip()` returns `request.remote_addr` and ignores forwarded headers entirely, so IP bans, per-IP rate limits, and the login audit log cannot be spoofed by a client that reaches gunicorn directly.

### Remote MCP

```bash
# Master switch. Off by default; both /mcp and /oauth/* stay unregistered
MCP_HTTP_ENABLED = 'False'

# Required when enabled: canonical HTTPS origin, anchors JWT iss/aud
MCP_PUBLIC_URL = ''

MCP_OAUTH_REQUIRE_APPROVAL = 'False'
MCP_OAUTH_WRITE_SCOPE_ENABLED = 'True'
MCP_HTTP_CORS_ORIGINS = 'https://claude.ai,https://chatgpt.com'
```

Enabling Remote MCP with `FLASK_DEBUG` on, or without `MCP_PUBLIC_URL`, raises at startup. Advanced keys that are commented out in `.sample.env` and fall back to code defaults include `MCP_HTTP_IP_ALLOWLIST`, `MCP_OAUTH_ACCESS_TTL`, `MCP_OAUTH_REFRESH_TTL`, `MCP_OAUTH_CODE_TTL`, `MCP_RATE_LIMIT_READ`, `MCP_RATE_LIMIT_WRITE`, `MCP_OAUTH_KEYS_DIR`, and `MCP_LOOPBACK_URL`.

### Debug Override

```bash
# Allows FLASK_DEBUG=True on a non-loopback FLASK_HOST_IP. Startup refuses
# that combination without it, because the Werkzeug debugger is an RCE primitive
FLASK_DEBUG_ALLOW_EXTERNAL = 'False'
```

## Railway/Cloud Deployment

When deploying to Railway or Render, set these environment variables in the platform dashboard:

### Required Variables

| Variable | Description |
|----------|-------------|
| `HOST_SERVER` | Your app URL (e.g., `https://your-app.up.railway.app`) |
| `APP_KEY` | Generated secret key |
| `API_KEY_PEPPER` | Generated pepper |

### Auto-Generated by start.sh

When `HOST_SERVER` is set and no `.env` exists, `start.sh` automatically generates `.env` with:
- All security settings
- CORS configured for your domain
- CSP with secure WebSocket URLs
- Railway's `PORT` environment variable support

The generated file takes `ENV_CONFIG_VERSION` from the platform environment, falling back to the checked-out `.sample.env` version (then `1.0.7`). `start.sh` creates or restores installation secrets through `/app/keys` for supported cloud starts, and preserves existing data rather than silently replacing missing encryption keys. Keep that persistent directory and the database together; a mounted `.env` must be writable for startup rotation and server-setting saves.

## Validation

### Startup Validation

`app.py` calls the validator at the very top of the module, before any other project import, because auth and database modules need the secrets at import time.

```python
# First lines of app.py
from utils.env_check import load_and_check_env_variables

load_and_check_env_variables()
```

`load_and_check_env_variables()` returns `None`. It prints a remediation message and calls `sys.exit(1)` on any failure rather than returning an error list.

### Validation Rules

| Variable | Validation | Enforced in |
|----------|------------|-------------|
| `ENV_CONFIG_VERSION` | Not older than `.sample.env` | `utils/env_check.py` |
| `APP_KEY` | Present, 32+ characters | `app.py` `create_app()` |
| `API_KEY_PEPPER` | Present, 32+ characters | `database/auth_db.py` at import |
| `FLASK_PORT`, `WEBSOCKET_PORT` | 0-65535 | `utils/env_check.py` |
| `FLASK_DEBUG` | True/False/1/0/t/f | `utils/env_check.py` |
| `FLASK_ENV` | development or production | `utils/env_check.py` |
| `*_RATE_LIMIT*` | "X per second\|minute\|hour\|day", semicolon-separated for compound limits | `utils/env_check.py` |
| `SESSION_EXPIRY_TIME` | Format: HH:MM, 24-hour | `utils/env_check.py` |
| `WEBSOCKET_URL` | Starts with ws:// or wss:// | `utils/env_check.py` |
| `REDIRECT_URL` | Optional; a real environment-configured broker callback must end in `/<broker>/callback` with an enabled broker | `utils/env_check.py` |
| `BROKER_API_KEY` | `:::` field count for 5paisa, Flattrade, and Dhan | `utils/env_check.py` |
| `LOG_LEVEL` | DEBUG/INFO/WARNING/ERROR/CRITICAL | `utils/env_check.py` |
| `LOG_RETENTION` | Positive integer | `utils/env_check.py` |
| `LOG_TO_FILE` | True/False | `utils/env_check.py` |
| `LOG_DIR`, `LOG_FORMAT` | Non-empty | `utils/env_check.py` |

## Generating Secrets

```bash
# Generate a 32-byte secret (64 hex characters) for APP_KEY,
# API_KEY_PEPPER and FERNET_SALT
python -c "import secrets; print(secrets.token_hex(32))"

# Output example:
# a1b2c3d4e5f67890123456789012345678901234567890123456789012345678
```

## Environment Comparison

### Development

```bash
FLASK_DEBUG = 'True'
FLASK_ENV = 'development'
LOG_LEVEL = 'DEBUG'
HOST_SERVER = 'http://127.0.0.1:5000'
FLASK_HOST_IP = '127.0.0.1'
CSP_UPGRADE_INSECURE_REQUESTS = 'FALSE'
```

### Production (Local)

```bash
FLASK_DEBUG = 'False'
FLASK_ENV = 'production'
LOG_LEVEL = 'INFO'
HOST_SERVER = 'https://your-domain.com'
FLASK_HOST_IP = '0.0.0.0'
CSP_UPGRADE_INSECURE_REQUESTS = 'TRUE'
```

### Production (Railway)

```bash
# Set in Railway dashboard, start.sh generates .env:
HOST_SERVER = 'https://your-app.up.railway.app'
FLASK_HOST_IP = '0.0.0.0'  # Auto-set
FLASK_PORT = '${PORT}'  # Railway's PORT
WEBSOCKET_HOST = '0.0.0.0'  # Auto-set
ZMQ_HOST = '0.0.0.0'  # Auto-set
```

## Security Best Practices

### File Permissions

```bash
# Restrict .env access
chmod 600 .env
```

### Never Commit Secrets

```gitignore
# .gitignore
.env
*.pem
*.key
```

### Version Check

Compare `ENV_CONFIG_VERSION` in your `.env` with `.sample.env` after updates. If they differ, copy new variables from the sample.

## Key Files Reference

| File | Purpose |
|------|---------|
| `.env` | Active configuration |
| `.sample.env` | Reference template |
| `start.sh` | Auto-generates .env for cloud |
| `utils/env_check.py` | Validation logic and first-run secret rotation |
| `utils/env_config.py` | `env_int` / `env_float` readers that fall back instead of crashing |
| `utils/config.py` | Config helpers |
| `cors.py`, `csp.py` | CORS and CSP fallback defaults |
