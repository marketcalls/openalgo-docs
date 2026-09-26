# 21 - Admin Section

## Overview

The Admin section provides system configuration and management capabilities including freeze quantity management, market holidays, market timings, and security monitoring.

`admin_bp` is registered with `url_prefix="/admin"` and now exposes JSON endpoints only. The former server-rendered page routes (`/admin/`, `/admin/freeze`, `/admin/holidays`, `/admin/timings`) are commented out in `blueprints/admin.py`; the pages themselves are React routes.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-admin-section-architecture.png" alt="React admin pages call admin_bp JSON endpoints under /admin/api, backed by openalgo.db tables, log files and .env"><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/diagram-admin-section-monitoring-dashboards.png" alt="React /logs/security, /logs/traffic and /logs/latency pages backed by security_bp, traffic_bp and latency_bp over logs.db, latency.db and openalgo.db"><figcaption></figcaption></figure>

## Freeze Quantity Management

### Purpose
Manage F&O freeze quantity limits for automatic order splitting.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/api/freeze` | List all freeze quantities |
| POST | `/admin/api/freeze` | Add new entry |
| PUT | `/admin/api/freeze/<id>` | Update entry |
| DELETE | `/admin/api/freeze/<id>` | Delete entry |
| POST | `/admin/api/freeze/upload` | Bulk CSV upload |

### Database Schema

```
┌─────────────────────────────────────────────────────┐
│                  qty_freeze table                   │
├────────────┬─────────────┬──────────────────────────┤
│ Column     │ Type        │ Description              │
├────────────┼─────────────┼──────────────────────────┤
│ id         │ INTEGER PK  │ Auto-increment           │
│ exchange   │ VARCHAR(10) │ NFO, BFO, CDS, MCX       │
│ symbol     │ VARCHAR(50) │ Trading symbol           │
│ freeze_qty │ INTEGER     │ Max order quantity       │
└────────────┴─────────────┴──────────────────────────┘
```

### Example Request

```json
// POST /admin/api/freeze
{
    "exchange": "NFO",
    "symbol": "NIFTY",
    "freeze_qty": 1800
}
```

### Common Freeze Quantities

| Symbol | Exchange | Freeze Qty |
|--------|----------|------------|
| NIFTY | NFO | 1800 |
| BANKNIFTY | NFO | 900 |
| FINNIFTY | NFO | 1800 |
| SENSEX | BFO | 1000 |

## Market Holidays Management

### Purpose
Maintain trading holidays calendar for all exchanges.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/api/holidays?year=2024` | Get holidays for year |
| POST | `/admin/api/holidays` | Add new holiday |
| DELETE | `/admin/api/holidays/<id>` | Delete holiday |

### Database Schema

```
┌──────────────────────────────────────────────────────────────┐
│                    market_holidays table                     │
├──────────────┬─────────────┬─────────────────────────────────┤
│ Column       │ Type        │ Description                     │
├──────────────┼─────────────┼─────────────────────────────────┤
│ id           │ Integer PK  │ Auto-increment                  │
│ holiday_date │ Date        │ Holiday date, not null, indexed │
│ description  │ String(150) │ Holiday name, not null          │
│ holiday_type │ String(30)  │ Default TRADING_HOLIDAY         │
│ year         │ Integer     │ Not null, indexed               │
└──────────────┴─────────────┴─────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   market_holiday_exchanges table                   │
├───────────────┬────────────┬───────────────────────────────────────┤
│ Column        │ Type       │ Description                           │
├───────────────┼────────────┼───────────────────────────────────────┤
│ id            │ Integer PK │ Auto-increment                        │
│ holiday_id    │ Integer    │ Holiday reference, not null, indexed  │
│ exchange_code │ String(10) │ Exchange code, not null, indexed      │
│ is_open       │ Boolean    │ Exchange open, defaults to false      │
│ start_time    │ BigInteger │ Session start, epoch millis, nullable │
│ end_time      │ BigInteger │ Session end, epoch millis, nullable   │
└───────────────┴────────────┴───────────────────────────────────────┘
```

### Holiday Types

| Type | Description |
|------|-------------|
| TRADING_HOLIDAY | Full market closure |
| SETTLEMENT_HOLIDAY | Settlement closed |
| SPECIAL_SESSION | Muhurat trading |

### Supported Exchanges

- NSE (National Stock Exchange)
- BSE (Bombay Stock Exchange)
- NFO (NSE F&O)
- BFO (BSE F&O)
- MCX (Multi Commodity Exchange)
- CDS (Currency Derivatives)
- BCD (BSE Currency Derivatives)

### Example Request

```json
// POST /admin/api/holidays
{
    "holiday_date": "2024-01-26",
    "description": "Republic Day",
    "holiday_type": "TRADING_HOLIDAY",
    "exchanges": ["NSE", "BSE", "NFO", "BFO", "MCX", "CDS"]
}
```

## Market Timings Configuration

### Purpose
Configure trading session timings for each exchange.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/api/timings` | Get all timings |
| PUT | `/admin/api/timings/<exchange>` | Update timing |
| POST | `/admin/api/timings/check` | Check for date |

### Default Timings

Seeded from `DEFAULT_MARKET_TIMINGS` in `database/market_calendar_db.py` when the `market_timings` table is empty.

| Exchange | Market Open | Market Close |
|----------|-------------|--------------|
| NSE | 09:15 | 15:30 |
| BSE | 09:15 | 15:30 |
| NFO | 09:15 | 15:40 |
| BFO | 09:15 | 15:40 |
| CDS | 09:00 | 17:00 |
| BCD | 09:00 | 17:00 |
| MCX | 09:00 | 23:55 |
| NCO | 09:00 | 23:55 |
| CRYPTO | 00:00 | 23:59 |

NFO and BFO close at 15:40, not 15:30: SEBI's Closing Auction Session applies to the cash segment only, and derivatives keep trading past the cash close.

### Example Request

```json
// PUT /admin/api/timings/NSE
{
    "start_time": "09:15",
    "end_time": "15:30"
}
```

## System Settings

### Analyzer Mode Toggle

`settings_bp` is registered with `url_prefix="/settings"`.

```
GET  /settings/analyze-mode      Get current mode
POST /settings/analyze-mode/0    Switch to Live mode
POST /settings/analyze-mode/1    Switch to Analyze mode
```

The setter route is `POST /settings/analyze-mode/<int:mode>`. Switching to Analyze starts the sandbox execution engine; switching to Live stops it.

### Settings Schema

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                 settings table                                 │
├────────────────────────────────┬─────────────┬─────────────────────────────────┤
│ Column                         │ Type        │ Description                     │
├────────────────────────────────┼─────────────┼─────────────────────────────────┤
│ id                             │ Integer PK  │ Single row, id = 1              │
│ analyze_mode                   │ Boolean     │ False is Live, True is Analyzer │
│ smtp_server                    │ String(255) │ SMTP host                       │
│ smtp_port                      │ Integer     │ SMTP port                       │
│ smtp_username                  │ String(255) │ SMTP user                       │
│ smtp_password_encrypted        │ Text        │ Fernet ciphertext               │
│ smtp_use_tls                   │ Boolean     │ STARTTLS, defaults to true      │
│ smtp_from_email                │ String(255) │ From address                    │
│ smtp_helo_hostname             │ String(255) │ HELO/EHLO hostname              │
│ security_auto_ban_enabled      │ Boolean     │ Auto-ban, defaults to false     │
│ security_404_threshold         │ Integer     │ 404s per day before ban, 100    │
│ security_404_ban_duration      │ Integer     │ Hours, 0 means permanent        │
│ security_api_threshold         │ Integer     │ Invalid keys per day, 100       │
│ security_api_ban_duration      │ Integer     │ Hours, 0 means permanent        │
│ security_repeat_offender_limit │ Integer     │ Bans before permanent, 2        │
└────────────────────────────────┴─────────────┴─────────────────────────────────┘
```

## Other Admin API Endpoints

All of these live under `/admin` and require a valid session.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/api/stats` | Freeze-entry and holiday counts |
| GET | `/admin/api/errors` | Recent entries from `log/errors.jsonl` |
| POST | `/admin/api/errors/client` | Ingest a browser-side error report |
| GET | `/admin/api/errors/stats` | Error counts by level |
| GET | `/admin/api/errors/groups` | Errors grouped by fingerprint |
| GET | `/admin/api/system` | Host, runtime, hardware, build, config, broker, database snapshot |
| POST | `/admin/api/system/diagnostics` | Run the fixed latency/connectivity probes |
| GET | `/admin/api/system/report` | Download a rendered `.md` / `.txt` report |
| GET | `/admin/api/oauth/clients` | List Remote MCP OAuth clients |
| POST | `/admin/api/oauth/clients/<client_id>/approve` | Approve a client |
| POST | `/admin/api/oauth/clients/<client_id>/revoke` | Revoke a client |
| GET | `/admin/api/mcp/audit` | Read the Remote MCP audit trail |
| POST | `/admin/api/mcp/kill-switch` | Toggle the Remote MCP kill switch |
| GET | `/admin/api/mcp/settings` | Read Remote MCP settings |
| PUT | `/admin/api/mcp/settings` | Update Remote MCP settings |

## Security Dashboard

### Access
```
/logs/security
```

### Features

```
┌──────────────────────────────────────────────────────────────────┐
│                        Security Dashboard                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  IP Bans                                                   │  │
│  │                                                            │  │
│  │  IP Address      │ Reason        │ Expires     │ Actions  │   │
│  │  192.168.1.100   │ 404 abuse     │ 24h         │ Unban    │   │
│  │  10.0.0.50       │ API brute     │ Permanent   │ Unban    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Security Thresholds                                       │  │
│  │                                                            │  │
│  │  Automatic bans: Off by default                            │  │
│  │  404 Errors: 100/day → 0h (permanent) when enabled        │   │
│  │  API Abuse:  100/day → 0h (permanent) when enabled        │   │
│  │  Repeat Offender: 2 bans → Permanent                       │  │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Security Tables

#### ip_bans
Stores banned IP addresses with expiry.

#### error_404_tracker
Tracks 404 errors per IP. The persisted default threshold is 100 per 24 hours.

#### invalid_api_key_tracker
Tracks invalid API attempts per IP. The persisted default threshold is 100 per 24 hours.

## Traffic Dashboard

### Access
```
/logs/traffic
```

### Features

- HTTP request logging
- Request/response metrics
- Error rate monitoring
- API endpoint statistics

## Latency Dashboard

### Access
```
/logs/latency
```

### Features

- Order execution latency
- Round-trip time (RTT)
- Percentile metrics (P50, P90, P95, P99)
- SLA compliance tracking

### SLA Buckets

`OrderLatency.get_latency_stats()` reports the share of orders whose `total_latency_ms` falls under each of three fixed thresholds, alongside the p50/p90/p95/p99 percentiles. The thresholds are hard-coded, not configurable.

| Field | Meaning |
|-------|---------|
| sla_100ms | Percent of orders under 100 ms end to end |
| sla_150ms | Percent of orders under 150 ms end to end |
| sla_200ms | Percent of orders under 200 ms end to end |

## Access Control

### Session Validation

```python
@admin_bp.route('/api/freeze')
@check_session_validity
def get_freeze_quantities():
    # Only authenticated users can access
    pass
```

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Most `/admin/api/*` routes | `API_RATE_LIMIT` env var, default `50 per second` |
| `POST /admin/api/freeze/upload` | 10/minute |
| `POST /admin/api/system/diagnostics` | 10/minute |
| `GET /admin/api/system/report` | 10/minute |
| `POST /admin/api/mcp/kill-switch` | 10/minute |
| `PUT /admin/api/mcp/settings` | 30/minute |

The shared limiter in `limiter.py` keys on `get_remote_address` with in-memory storage and a moving-window strategy.

## React Components

### File Structure

```
frontend/src/pages/admin/
├── AdminIndex.tsx      # Main dashboard
├── FreezeQty.tsx       # Freeze quantity UI
├── Holidays.tsx        # Holiday calendar
├── MarketTimings.tsx   # Market timings
├── Diagnostics.tsx     # System snapshot and probes
├── RemoteMcp.tsx       # Remote MCP clients, audit, kill switch, settings
└── index.ts            # Barrel export
```

### API Client

```typescript
// frontend/src/api/admin.ts

export const adminApi = {
  getFreezeQuantities: () => api.get('/admin/api/freeze'),
  addFreezeQty: (data) => api.post('/admin/api/freeze', data),
  updateFreezeQty: (id, data) => api.put(`/admin/api/freeze/${id}`, data),
  deleteFreezeQty: (id) => api.delete(`/admin/api/freeze/${id}`),
  uploadFreezeCSV: (file) => api.post('/admin/api/freeze/upload', file),

  getHolidays: (year) => api.get(`/admin/api/holidays?year=${year}`),
  addHoliday: (data) => api.post('/admin/api/holidays', data),
  deleteHoliday: (id) => api.delete(`/admin/api/holidays/${id}`),

  getTimings: () => api.get('/admin/api/timings'),
  updateTiming: (exchange, data) => api.put(`/admin/api/timings/${exchange}`, data)
};
```

## System Snapshot

### Endpoint
```
GET /admin/api/system
```

Returns a `no-store` JSON snapshot assembled by `_build_system_payload()`. There is no file-permission audit anywhere in the codebase.

### Payload Sections

| Key | Contents |
|-----|----------|
| mode | Live or Analyze |
| host | OS, release, machine, distro, Docker / Raspberry Pi / Termux flags |
| runtime | Python and dependency runtime details |
| hardware | CPU, memory, disk snapshot |
| build | Version and build metadata |
| config | Non-secret settings plus secret presence and strength booleans |
| brokers | Configured brokers and the active session broker, never tokens |
| databases | Per-database file presence, size, and mtime |
| time | Server time information |

Secrets are never emitted as values. `config.secrets_present` reports set/not-set booleans for `APP_KEY`, `API_KEY_PEPPER`, `BROKER_API_KEY`, `BROKER_API_SECRET`, `BROKER_API_KEY_MARKET`, `BROKER_API_SECRET_MARKET`, and `REDIRECT_URL`, plus the DB-stored SMTP password and Telegram bot token. `config.secret_strength` reports whether `APP_KEY`, `API_KEY_PEPPER`, and `FERNET_SALT` are install-specific rather than the published sample placeholders.

## Key Files Reference

| File | Purpose |
|------|---------|
| `blueprints/admin.py` | Admin routes |
| `database/qty_freeze_db.py` | Freeze quantities |
| `database/market_calendar_db.py` | Holidays/timings |
| `database/settings_db.py` | Settings table |
| `database/traffic_db.py` | Security tables |
| `utils/security_middleware.py` | Request-time IP enforcement |
| `frontend/src/pages/admin/` | React components |
| `frontend/src/api/admin.ts` | API client |
