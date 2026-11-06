# Rate Limiting

To protect OpenAlgo from abuse and ensure fair usage, rate limits are enforced at both login and API levels. These limits are configurable via the `.env` file and use the caller IP by default, with ordinary decorators maintaining route-specific budgets; explicit shared limiters can use other keys/scopes.

## UI Login Rate Limits

OpenAlgo applies two login-specific rate limits:

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Minute | 5 per minute | Allows a maximum of 5 login attempts per minute |
| Per Hour | 25 per hour | Allows a maximum of 25 login attempts per hour |

These limits help prevent brute-force login attempts and secure user accounts.

## API Rate Limits

OpenAlgo implements differentiated rate limiting for various types of operations:

### Order Management APIs

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Second | 10 per second | Order placement, modification, cancellation, and GTT writes |

**Applies to:**
- `/api/v1/placeorder` - Place new orders
- `/api/v1/modifyorder` - Modify existing orders
- `/api/v1/cancelorder` - Cancel orders
- `/api/v1/optionsorder` and `/api/v1/optionsmultiorder` - Options execution
- `/api/v1/placegttorder`, `/api/v1/modifygttorder`, and `/api/v1/cancelgttorder` - GTT writes

`ORDER_RATE_LIMIT` does **not** cover every order-related route. `/api/v1/basketorder`, `/api/v1/splitorder`, `/api/v1/cancelallorder`, `/api/v1/closeposition`, and `/api/v1/gttorderbook` are decorated with `API_RATE_LIMIT` instead.

### Smart Order API

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Second | 10 per second | Position-aware smart order operations |

**Applies to:**
- `/api/v1/placesmartorder` - Reconcile a symbol position to a target size

`SMART_ORDER_RATE_LIMIT` is independent from `ORDER_RATE_LIMIT`, even though both currently default to 10 per second.

### General APIs

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Second | 50 per second | All other API endpoints including market data |

**Applies to most other API endpoints including:**
- Market data APIs (quotes, multiquotes, depth, history, ticker, intervals)
- Account APIs (funds, margin, positions, holdings)
- Information APIs (orderbook, tradebook, orderstatus, openposition)
- Search, symbol, expiry, instruments, option chain, and synthetic future
- Analyzer, ping, chart preferences, sandbox P&L, market holidays and timings

### Endpoints With Their Own Limiter

Several resources do not use `API_RATE_LIMIT`. Each reads its own environment variable and falls back to the value shown when that variable is unset. These variables are not present in `.sample.env`, so the fallback is the effective default on a stock install.

| Environment variable | Fallback | Applies to |
|---|---|---|
| `GREEKS_RATE_LIMIT` | 30 per minute | `/api/v1/optiongreeks` |
| `PORTFOLIO_API_RATE_LIMIT` | 10 per minute | `/api/v1/portfolio/backtest`, `/api/v1/portfolio/holdings` |
| `PORTFOLIO_TEARSHEET_RATE_LIMIT` | 5 per minute | `/api/v1/portfolio/tearsheet` |
| `SIP_API_RATE_LIMIT` | 10 per minute | `/api/v1/sip/frequencies`, `/api/v1/sip/backtest` |
| `SECTOR_ROTATION_API_RATE_LIMIT` | 30 per minute | `/api/v1/sectorrotation`, `/api/v1/sectorrotation/options` |
| `TELEGRAM_RATE_LIMIT` | 30 per minute | Telegram resources except broadcast |
| (hard-coded) | 5 per minute | `/api/v1/telegram/broadcast` |
| `WHATSAPP_RATE_LIMIT` | 30 per minute | `/api/v1/whatsapp/notify` |

`/api/v1/multioptiongreeks` uses `API_RATE_LIMIT`, not `GREEKS_RATE_LIMIT`. `/api/v1/portfolio/benchmarks` also uses `API_RATE_LIMIT`.

Note that the in-code fallback for `API_RATE_LIMIT` itself is `10 per second`, lower than the `50 per second` that `.sample.env` ships. If `API_RATE_LIMIT` is absent from your `.env`, the effective limit is 10 per second, not 50.

### Webhook APIs

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Minute | 100 per minute | External webhook endpoints from trading platforms |

**Applies to:**
- `/strategy/webhook/<token>` - Strategy RMS webhook from external platforms
- `/chartink/webhook/<webhook_id>` - ChartInk webhook from external platforms
- `/flow/webhook/<token>` and `/flow/webhook/<token>/<symbol>` - Flow workflow webhooks

Flow applies shared budgets by caller IP and workflow token across both URL variants, so alternating routes does not double the allowance. A throttled Flow webhook returns JSON `429` rather than a redirect.

These limits protect against external DoS attacks and webhook flooding.

### Strategy RMS Browser APIs

| Scope | Limit | Description |
|-------|-------|-------------|
| Per Minute | 200 per minute | Session-authenticated Strategy RMS configuration, operator, and detail calls |

**Applies to:**
- `/strategy/api/strategies` - List and create strategies
- `/strategy/api/strategies/<id>` - Read, update, or delete a strategy
- `/strategy/api/strategies/<id>/start` and `/stop` - Browser lifecycle controls
- `/strategy/api/strategies/<id>/orderbook`, `/tradebook`, and `/positions` - Broker-backed detail data

These are browser/session endpoints, not the public RESTX API. The nine API-key
routes at `/api/v1/strategy/*` use `API_RATE_LIMIT`; see the [Strategy RMS API](strategy-rms-api/README.md).

## Configuration via .env

You can adjust the rate limits by editing the following variables in your `.env` file:

```env
# Login rate limits
LOGIN_RATE_LIMIT_MIN="5 per minute"
LOGIN_RATE_LIMIT_HOUR="25 per hour"
RESET_RATE_LIMIT="15 per hour"

# API rate limits
API_RATE_LIMIT="50 per second"
ORDER_RATE_LIMIT="10 per second"
SMART_ORDER_RATE_LIMIT="10 per second"
WEBHOOK_RATE_LIMIT="100 per minute"
STRATEGY_RATE_LIMIT="200 per minute"
```

`RESET_RATE_LIMIT` (default `15 per hour`) applies to the password-reset flow, not to the v1 API.

These limits follow [Flask-Limiter syntax](https://flask-limiter.readthedocs.io/en/stable/#rate-limit-string-format) and support formats like:
- `10 per second`
- `100 per minute`
- `1000 per day`
- `10 per second;40 per minute` (compound: both limits enforced simultaneously)

## What Happens When Limits Are Exceeded

If a client exceeds any configured rate limit:

1. The server will respond with HTTP status `429 Too Many Requests`
2. Further requests will be blocked until the moving window permits another request

Clients should not require a `Retry-After` header because header emission is not explicitly enabled in `limiter.py`.

A `429` can also originate at the broker or from a gthread broker queue/guard refusal before sending. The application limiter response below includes a fixed `retry_after: 60` hint; it is not a calculation of every route's remaining window. Bodies and retry conditions differ. See [order outcomes](README.md#order-outcomes-and-retries).

## Error Response

```json
{
  "status": "error",
  "message": "Rate limit exceeded. Please slow down your requests.",
  "retry_after": 60
}
```

## Security Impact

The rate limiting implementation provides essential protection:

### Critical Protection

| Protection | Description |
|------------|-------------|
| External DoS Attacks | Webhook endpoints are protected from unlimited external requests |
| System Overload | Strategy operations are protected from flooding |
| Resource Exhaustion | Prevents accidental system overwhelming |

### Attack Vector Mitigation

| Attack | Protection |
|--------|------------|
| Webhook Flooding | External platforms cannot flood webhook endpoints |
| Strategy Abuse | Prevents rapid strategy creation/deletion attempts |
| Order Flooding | Prevents overwhelming the order management system |

## Implementation Details

### Rate Limiting Strategy

OpenAlgo uses the **moving-window** strategy for rate limiting, which provides more accurate rate limiting compared to fixed-window approaches.

### Storage Backend

Rate limit counters are stored in memory (`memory://`), which means:
- Fast performance with minimal latency
- Counters reset when the application restarts
- Suitable for single-user deployments

### Key Function

Rate limits are applied per IP address using `get_remote_address` as the key function. Each unique IP address has its own rate limit counter.

## Recommendations

### For API Consumers

- Avoid retrying failed login attempts rapidly
- Spread out API requests using sleep/delay logic or a rate-limiter in your client code
- Use queues or batching when dealing with large volumes of data or orders
- Implement exponential backoff when receiving 429 errors

### For Webhook Integration

- Ensure webhook calls are spread out appropriately
- Implement retry logic with delays for webhook failures
- Monitor webhook success rates to detect rate limiting

### For Strategy Management

- Avoid rapid creation/deletion of strategies
- Batch symbol configuration operations when possible
- Implement proper error handling for strategy operations

## Troubleshooting

### Common Issues

**"Rate limit exceeded" errors**
- Check your request frequency
- Implement proper retry logic with delays
- Consider using batch operations

**Webhook failures**
- Verify webhook rate limits are appropriate for your platform
- Check if external platforms are respecting rate limits
- Monitor webhook logs for patterns

**Strategy operation failures**
- Ensure strategy operations are not happening too rapidly
- Check for automated scripts that might be creating excessive requests
- Verify proper error handling in strategy management code

## Customization

To modify rate limits:

1. Update the values in your `.env` file
2. Restart the application for changes to take effect

Example customization:

```env
# Increase webhook rate limit for high-frequency platforms
WEBHOOK_RATE_LIMIT="200 per minute"

# Decrease strategy operations for tighter control
STRATEGY_RATE_LIMIT="100 per minute"

# Increase order rate limit for active trading
ORDER_RATE_LIMIT="20 per second"
```

---

**Back to**: [API Documentation](./README.md)
