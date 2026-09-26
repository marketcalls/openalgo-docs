# 36 - Rate Limiting Guide

## Overview

OpenAlgo uses Flask-Limiter with a moving-window strategy to protect endpoints from abuse. Different rate limits apply to different endpoint categories based on their sensitivity and resource usage.

Two properties of the current setup matter before reading the numbers below. `limiter.py` passes no `default_limits`, so an endpoint without an explicit `@limiter.limit(...)` decorator is unlimited. And `storage_uri` is `memory://`, so counters live in the worker process; a multi-worker deployment enforces each limit once per worker rather than once per install. There are no `limiter.exempt` registrations anywhere in the codebase, and `limiter.init_app(app)` runs unconditionally in `create_app()`.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-rate-limiting-architecture.png" alt="Flask-Limiter flow: decorated routes keyed by caller IP, moving-window check against memory storage, 429 handling"><figcaption></figcaption></figure>

## Rate Limit Categories

### Environment Variables

These are the eight keys `.sample.env` ships and `utils/env_check.py` validates:

```bash
# Login endpoints (authentication security)
LOGIN_RATE_LIMIT_MIN = "5 per minute"
LOGIN_RATE_LIMIT_HOUR = "25 per hour"

# Password reset
RESET_RATE_LIMIT = "15 per hour"

# General API endpoints (data queries)
API_RATE_LIMIT="100 per second"

# Order endpoints (trading operations)
ORDER_RATE_LIMIT="10 per second"

# Smart order endpoints (automated trading)
SMART_ORDER_RATE_LIMIT="10 per second"

# Webhook endpoints (external integrations)
WEBHOOK_RATE_LIMIT="100 per minute"

# Strategy endpoints
STRATEGY_RATE_LIMIT="200 per minute"
```

`RESET_RATE_LIMIT` is read by `blueprints/auth.py` but is not in the `rate_limit_vars` list that `utils/env_check.py` validates, so a malformed value there is not caught at startup.

### Limit Breakdown

| Category | Rate Limit | Endpoints | Purpose |
|----------|------------|-----------|---------|
| **Login** | 5/min, 25/hr | `/auth/login`, `/<broker>/callback` | Prevent brute force |
| **Password reset** | 15/hr | `/auth/reset-password` | Prevent reset abuse |
| **API** | 100/sec | `/api/v1/quotes`, `/api/v1/positionbook`, etc. | General data access |
| **Order** | 10/sec | `/api/v1/placeorder`, `/api/v1/modifyorder`, `/api/v1/cancelorder` | Trading rate control |
| **Smart Order** | 10/sec | `/api/v1/placesmartorder` | Automated order rate control |
| **Webhook** | 100/min | `/chartink/webhook`, `/strategy/webhook` | External integrations |
| **Strategy** | 200/min | Strategy CRUD views in `blueprints/strategy_module.py` and `blueprints/chartink.py` | Strategy execution |

### Code Defaults Differ From The Sample Values

The number that applies when a key is absent from `.env` is the second argument to `os.getenv` in the module, not the value in `.sample.env`. For `API_RATE_LIMIT` the two disagree:

| Default in code | Modules |
|---|---|
| `50 per second` | `blueprints/admin.py`, `blueprints/orders.py`, `blueprints/sandbox.py`, `restx_api/margin.py` |
| `10 per second` | the other 32 `restx_api/*.py` modules, including `quotes.py`, `orderbook.py`, `holdings.py`, `funds.py`, `depth.py`, `history.py` and `cancel_all_order.py` |

Because `.sample.env` sets `API_RATE_LIMIT="100 per second"`, a standard install gets 100/sec everywhere. Removing the key from `.env` silently drops most data endpoints to 10/sec. Keep the key present.

### Additional Rate Limit Variables

These are read by code but are not part of the validated set. Several are absent from `.sample.env` altogether.

| Variable | Default in code | Applied by |
|---|---|---|
| `SIP_API_RATE_LIMIT` | `10 per minute` | `restx_api/sip.py` backtest POST |
| `PORTFOLIO_API_RATE_LIMIT` | `10 per minute` | `restx_api/portfolio.py` backtest POST |
| `PORTFOLIO_TEARSHEET_RATE_LIMIT` | `5 per minute` | `restx_api/portfolio.py` tearsheet |
| `GREEKS_RATE_LIMIT` | `30 per minute` | `restx_api/option_greeks.py` |
| `TELEGRAM_RATE_LIMIT` | `30 per minute` | `restx_api/telegram_bot.py` |
| `WHATSAPP_RATE_LIMIT` | `30 per minute` | `restx_api/whatsapp_bot.py` |
| `TELEGRAM_MESSAGE_RATE_LIMIT` | `10 per minute` | `blueprints/telegram.py` |
| `WHATSAPP_MESSAGE_RATE_LIMIT` | `10 per minute` | `blueprints/whatsapp.py` |
| `MCP_RATE_LIMIT_READ` | `60 per minute` | `blueprints/mcp_http.py` per-token scope quota |
| `MCP_RATE_LIMIT_WRITE` | `50 per minute` | `blueprints/mcp_http.py` per-token scope quota |

The MCP HTTP surface also carries two limits that are not environment-configurable: `_DISPATCH_RATE_LIMIT = "120 per minute"` on `/mcp` and `_SSE_RATE_LIMIT = "5 per minute"` on the SSE endpoint, both keyed by token rather than by remote address. None of these apply unless `MCP_HTTP_ENABLED` is `True`, since the blueprints are only registered in that case.

## Implementation

### Limiter Initialization

**Location:** `limiter.py`

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,  # Rate limit by client IP
    storage_uri="memory://",       # In-memory storage
    strategy="moving-window"       # Sliding window algorithm
)
```

### Applying Rate Limits

**Login Endpoint Example:**

```python
# blueprints/auth.py
from limiter import limiter

LOGIN_RATE_LIMIT_MIN = os.getenv('LOGIN_RATE_LIMIT_MIN', '5 per minute')
LOGIN_RATE_LIMIT_HOUR = os.getenv('LOGIN_RATE_LIMIT_HOUR', '25 per hour')

@auth_bp.route('/login', methods=['GET', 'POST'])
@limiter.limit(LOGIN_RATE_LIMIT_MIN)
@limiter.limit(LOGIN_RATE_LIMIT_HOUR)
def login():
    # Multiple limits can stack (both must pass)
    ...
```

**Order Endpoint Example:**

```python
# restx_api/place_order.py
from limiter import limiter

ORDER_RATE_LIMIT = os.getenv('ORDER_RATE_LIMIT', '10 per second')

@api.route('/', strict_slashes=False)
class PlaceOrder(Resource):
    @limiter.limit(ORDER_RATE_LIMIT)
    def post(self):
        """Place an order with the broker"""
        ...
```

**API Endpoint Example:**

```python
# restx_api/quotes.py
from limiter import limiter

API_RATE_LIMIT = os.getenv('API_RATE_LIMIT', '10 per second')

@api.route('/', strict_slashes=False)
class Quotes(Resource):
    @limiter.limit(API_RATE_LIMIT)
    def post(self):
        """Get real-time quotes"""
        ...
```

Each module defines its own constant at import time. There is no shared constant, so the effective limit for a route is whatever that one module read from the environment when it was imported. Changing a rate limit therefore requires a restart, not just an `.env` edit.

## Rate Limit Format

```
<number> per <timeunit>
```

Flask-Limiter also accepts compound limits joined by semicolons, and `utils/env_check.py` validates that form:

```
10 per second;40 per minute
```

### Valid Timeunits

| Timeunit | Alias |
|----------|-------|
| `second` | `s` |
| `minute` | `m` |
| `hour` | `h` |
| `day` | `d` |

### Examples

```bash
# Valid formats
5 per minute
10 per second
100 per hour
1000 per day

# Invalid formats (will fail validation)
5/minute        # Wrong separator
5 per minutes   # Wrong timeunit
five per minute # Must be number
```

## Error Handling

### 429 Response Handler

**Location:** `app.py`

```python
@app.errorhandler(429)
def rate_limit_exceeded(e):
    """Custom handler for 429 Too Many Requests"""
    from flask import redirect, request

    # Log rate limit hit
    logger.warning(f"Rate limit exceeded for {request.remote_addr}: {request.path}")

    # For API requests, return JSON response
    if request.path.startswith('/api/'):
        return {
            'status': 'error',
            'message': 'Rate limit exceeded. Please slow down your requests.',
            'retry_after': 60
        }, 429

    # For web requests, redirect to React rate-limited page
    return redirect('/rate-limited')
```

### Client-Side Handling

```python
# Python client example
import requests
import time

def place_order_with_retry(order_data, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post(
            'http://localhost:5000/api/v1/placeorder',
            json=order_data,
            headers={'Authorization': f'Bearer {api_key}'}
        )

        if response.status_code == 429:
            retry_after = response.json().get('retry_after', 60)
            print(f"Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            continue

        return response

    raise Exception("Max retries exceeded")
```

## Endpoint Limits Map

### REST API Endpoints

| Endpoint | Rate Limit Variable | Default |
|----------|---------------------|---------|
| `/api/v1/placeorder` | ORDER_RATE_LIMIT | 10/sec |
| `/api/v1/modifyorder` | ORDER_RATE_LIMIT | 10/sec |
| `/api/v1/cancelorder` | ORDER_RATE_LIMIT | 10/sec |
| `/api/v1/cancelallorder` | API_RATE_LIMIT | 100/sec (10/sec if the key is unset) |
| `/api/v1/placesmartorder` | SMART_ORDER_RATE_LIMIT | 10/sec |
| `/api/v1/quotes` | API_RATE_LIMIT | 100/sec |
| `/api/v1/multiquotes` | API_RATE_LIMIT | 100/sec |
| `/api/v1/positionbook` | API_RATE_LIMIT | 100/sec |
| `/api/v1/orderbook` | API_RATE_LIMIT | 100/sec |
| `/api/v1/tradebook` | API_RATE_LIMIT | 100/sec |
| `/api/v1/holdings` | API_RATE_LIMIT | 100/sec |
| `/api/v1/funds` | API_RATE_LIMIT | 100/sec |
| `/api/v1/history` | API_RATE_LIMIT | 100/sec |
| `/api/v1/depth` | API_RATE_LIMIT | 100/sec |
| `/api/v1/ping` | API_RATE_LIMIT | 100/sec |
| `/api/v1/intervals` | API_RATE_LIMIT | 100/sec |
| `/api/v1/optionsmultiorder` | ORDER_RATE_LIMIT | 10/sec |

### Authentication Endpoints

| Endpoint | Rate Limit Variable | Default |
|----------|---------------------|---------|
| `/auth/login` | LOGIN_RATE_LIMIT_MIN + HOUR | 5/min, 25/hr |
| `/auth/reset-password` | RESET_RATE_LIMIT | 15/hr |
| `/<broker>/callback` | LOGIN_RATE_LIMIT_MIN + HOUR | 5/min, 25/hr |

`blueprints/brlogin.py` resolves its two constants through `get_login_rate_limit_min()` and `get_login_rate_limit_hour()` in `utils/config.py`, while `blueprints/auth.py` reads the same environment variables directly. The defaults match, so behaviour is identical, but the two paths are duplicated rather than sharing one source.

### Webhook Endpoints

| Endpoint | Rate Limit Variable | Default |
|----------|---------------------|---------|
| `/chartink/webhook` | WEBHOOK_RATE_LIMIT | 100/min |
| `/strategy/webhook` | WEBHOOK_RATE_LIMIT | 100/min |

`STRATEGY_RATE_LIMIT` is applied to the strategy management views in `blueprints/strategy_module.py` and `blueprints/chartink.py`, not to the webhook receivers. The Flow webhook receivers `/flow/webhook/<token>` and `/flow/webhook/<token>/<symbol>` are CSRF-exempt and share `WEBHOOK_RATE_LIMIT` through two `shared_limit` scopes in `blueprints/flow.py`: one keyed by caller IP and one keyed by webhook token.

## Moving Window Strategy

<figure><img src="../../.gitbook/assets/diagram-rate-limiting-moving-window.png" alt="Moving-window rate limit: a timeline example (5 per minute) where older hits fall out of the last 60 seconds, then the steps: count hits for the key within the window, record and allow if under the limit, otherwise 429 until the oldest hit leaves the window"><figcaption></figcaption></figure>

### Algorithm Benefits

| Aspect | Moving Window | Fixed Window |
|--------|---------------|--------------|
| Accuracy | Higher | Lower |
| Burst protection | Better | Prone to bursts at boundaries |
| Memory | Slightly higher | Lower |
| Implementation | More complex | Simpler |

## Configuration Validation

**Location:** `utils/env_check.py`

```python
rate_limit_vars = [
    "LOGIN_RATE_LIMIT_MIN",
    "LOGIN_RATE_LIMIT_HOUR",
    "API_RATE_LIMIT",
    "ORDER_RATE_LIMIT",
    "SMART_ORDER_RATE_LIMIT",
    "WEBHOOK_RATE_LIMIT",
    "STRATEGY_RATE_LIMIT",
]
# Single: "10 per second"
# Compound (Flask-Limiter syntax): "10 per second;40 per minute"
single_limit = r"\d+\s+per\s+(second|minute|hour|day)"
rate_limit_pattern = re.compile(
    rf"^{single_limit}(;{single_limit})*$"
)

for var in rate_limit_vars:
    value = os.getenv(var, "")
    if not rate_limit_pattern.match(value):
        print(f"\nError: Invalid {var} format.")
        print("Format should be: 'number per timeunit'")
        print("Compound limits use semicolons: 'number per timeunit;number per timeunit'")
        print("Examples: '5 per minute', '10 per second', '10 per second;40 per minute'")
        sys.exit(1)
```

Validation is fail-fast: an unset or malformed value in that list calls `sys.exit(1)` before the Flask app is built. `RESET_RATE_LIMIT` and every variable in the additional table above are outside this check.

## Tuning Recommendations

### For High-Frequency Trading

```bash
# Increase order limits for HFT
ORDER_RATE_LIMIT=50 per second
SMART_ORDER_RATE_LIMIT=10 per second
API_RATE_LIMIT=200 per second
```

### For Webhook-Heavy Usage

```bash
# Increase webhook limits for multiple signal sources
WEBHOOK_RATE_LIMIT=500 per minute
STRATEGY_RATE_LIMIT=1000 per minute
```

### For Multi-User Deployments

Consider using Redis for distributed rate limiting:

```python
# limiter.py (with Redis)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379",
    strategy="moving-window"
)
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `limiter.py` | Flask-Limiter construction |
| `app.py` | `limiter.init_app(app)` and the 429 error handler |
| `utils/env_check.py` | Rate limit format validation at startup |
| `utils/config.py` | `get_login_rate_limit_min()`, `get_login_rate_limit_hour()` |
| `restx_api/*.py` | API endpoint rate limits |
| `blueprints/auth.py` | Login and password-reset rate limits |
| `blueprints/brlogin.py` | Broker callback rate limits |
| `blueprints/chartink.py` | Chartink webhook and strategy rate limits |
| `blueprints/strategy_module.py` | Strategy webhook and strategy rate limits |
| `blueprints/mcp_http.py` | Remote MCP dispatch, SSE and per-scope quotas |
