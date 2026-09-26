# 22 - Log Section

## Overview

OpenAlgo provides comprehensive log viewing and management through the web interface, supporting both API order logs and general application logs.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-log-section-architecture.png" alt="Order events flow through the EventBus log subscriber into order_logs or analyzer_logs in openalgo.db, served by log_bp and analyzer_bp; application logs go to console, dated log files and errors.jsonl"><figcaption></figcaption></figure>

## Log Types

### 1. API Order Logs

**Backend:** `log_bp`, registered with `url_prefix="/logs"`

**React page:** `/logs/live` (`/logs` itself is the logs index page)

Displays all API request/response pairs for order operations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                API Logs View                                │
│                                                                             │
│ Filters: [Date Range] [API Type ▼] [Search...]                              │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Time          │ API Type    │ Request          │ Response      │ Status │ │
│ ├───────────────┼─────────────┼──────────────────┼───────────────┼────────┤ │
│ │ 09:30:15 IST  │ placeorder  │ SBIN BUY 100 MIS │ orderid: 123  │ OK     │ │
│ │ 09:31:20 IST  │ placeorder  │ INFY SELL 50 CNC │ orderid: 124  │ OK     │ │
│ │ 09:35:45 IST  │ cancelorder │ orderid: 124     │ Cancelled     │ OK     │ │
│ │ 10:15:00 IST  │ placeorder  │ RELIANCE BUY 25  │ Margin error  │ FAIL   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Pagination: [< Prev] Page 1 of 25 [Next >]                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Analyzer Logs

**Backend:** `analyzer_bp`, registered with `url_prefix="/analyzer"`

**React page:** `/logs/sandbox`

Logs from sandbox (analyzer) trading mode, stored in the `analyzer_logs` table.

### 3. Application Logs

**Location:** `log/openalgo_<YYYY-MM-DD>.log` (directory from `LOG_DIR`, default `log`)

File-based logs for debugging and monitoring, written only when `LOG_TO_FILE=True`. `log/errors.jsonl` is always written and holds ERROR-and-above records in JSON Lines form.

A consolidated `/logging/` page (`logging_bp`) links the live, analyzer, traffic, latency, and security views.

## Database Schema

### order_logs Table

```
┌─────────────────────────────────────────────────────┐
│                  order_logs table                   │
├───────────────┬────────────┬────────────────────────┤
│ Column        │ Type       │ Description            │
├───────────────┼────────────┼────────────────────────┤
│ id            │ INTEGER PK │ Auto-increment         │
│ api_type      │ TEXT       │ placeorder, cancel     │
│ request_data  │ TEXT       │ JSON request           │
│ response_data │ TEXT       │ JSON response          │
│ created_at    │ DATETIME   │ Timestamp (IST)        │
└───────────────┴────────────┴────────────────────────┘
```

### analyzer_logs Table

```
┌─────────────────────────────────────────────────────┐
│                 analyzer_logs table                 │
├───────────────┬─────────────┬───────────────────────┤
│ Column        │ Type        │ Description           │
├───────────────┼─────────────┼───────────────────────┤
│ id            │ INTEGER PK  │ Auto-increment        │
│ api_type      │ VARCHAR(50) │ API endpoint type     │
│ request_data  │ TEXT        │ JSON request          │
│ response_data │ TEXT        │ JSON response         │
│ created_at    │ DATETIME    │ Timestamp             │
└───────────────┴─────────────┴───────────────────────┘
```

## API Endpoints

### Get Order Logs

There is no separate JSON endpoint. `GET /logs/` returns JSON when the request carries the AJAX header and renders the `logs.html` template otherwise.

```
GET /logs/
X-Requested-With: XMLHttpRequest
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| start_date | string | Start date (YYYY-MM-DD) |
| end_date | string | End date (YYYY-MM-DD) |
| search | string | Case-insensitive match on api_type, request, or response |

Page size is fixed at 20 rows inside `view_logs()` and is not a query parameter. When neither `start_date` nor `end_date` is given, the query defaults to today in IST.

**Response:**

```json
{
    "logs": [
        {
            "id": 1,
            "api_type": "placeorder",
            "request_data": {"symbol": "SBIN", "exchange": "NSE"},
            "response_data": {"status": "success", "orderid": "123"},
            "strategy": "Python",
            "created_at": "2024-01-15 09:30:15 AM"
        }
    ],
    "total_pages": 25,
    "current_page": 1
}
```

`request_data` and `response_data` come back as parsed objects, not JSON strings, and `strategy` is lifted out of the request payload.

### Export Order Logs

```
GET /logs/export
```

Accepts the same `start_date`, `end_date`, and `search` parameters, skips pagination, and returns `openalgo_logs_<YYYYMMDD_HHMMSS>.csv`.

## Log Filtering

### By API Type

There is no dedicated `api_type` parameter. The `search` term is matched case-insensitively against `api_type` as well as the request and response bodies, so typing an API type filters to it.

| API Type | Description |
|----------|-------------|
| placeorder | Order placements |
| placesmartorder | Smart orders |
| modifyorder | Order modifications |
| cancelorder | Order cancellations |
| cancelallorder | Bulk cancellations |
| closeposition | Position closures |
| basketorder, splitorder | Basket and split placements |
| placegttorder, modifygttorder, cancelgttorder | GTT orders |
| orderbook, tradebook, positionbook, holdings, funds, quotes, depth, history | Data reads |

### By Date Range

```javascript
// React component example
const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
});
```

### By Search Term

Searches in both request and response JSON data.

## Async Logging

### Non-Blocking Log Writes

```python
# database/apilog_db.py
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(10)


def async_log_order(api_type, request_data, response_data):
    """Runs synchronously. Callers submit it to the executor above so the
    SQLite write does not block the request thread."""
    ...


# Caller side
executor.submit(async_log_order, "placeorder", request_data, response_data)
```

### Benefits

- Request thread not blocked
- No impact on order latency
- Guaranteed log capture

## Log Viewer Features

### React Component

```typescript
// frontend/src/pages/Logs.tsx

const params = new URLSearchParams()
params.append('page', page.toString())
if (startDate) params.append('start_date', startDate)
if (endDate) params.append('end_date', endDate)
if (searchQuery) params.append('search', searchQuery)

const response = await webClient.get<LogsResponse>(`/logs/?${params.toString()}`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

setLogs(Array.isArray(response.data.logs) ? response.data.logs : [])

// Export opens the CSV route directly
window.open(`/logs/export?${params.toString()}`, '_blank')
```

### Features

- Real-time updates
- Pagination
- Filtering by type/date
- Search functionality
- JSON pretty-print
- Export capability

## File Logging

### Configuration

```bash
# .env
LOG_TO_FILE=True
LOG_LEVEL=INFO
LOG_DIR=log
LOG_RETENTION=14
```

### Rotation Settings

Rotation is time based, not size based: `utils/logging.py` installs a `TimedRotatingFileHandler`.

| Setting | Value | Description |
|---------|-------|-------------|
| when | `midnight` | Roll over daily |
| interval | 1 | One day per file |
| backupCount | `LOG_RETENTION` (default 14) | Files to keep |
| Compression | None | Plain text, UTF-8 |

`cleanup_old_logs()` also deletes files older than `LOG_RETENTION` days at startup.

### Log Format

```
[2024-01-15 09:30:15] INFO in place_order: Order placed - SBIN BUY 100 MIS
[2024-01-15 09:30:16] DEBUG in broker_api: Response: {"orderid": "123"}
[2024-01-15 09:31:00] WARNING in session: Session expiring in 5 minutes
```

## Viewing Logs

### Via Web UI

1. Navigate to `/logs/live`
2. Apply filters as needed
3. Click row to expand details
4. Use export for download

### Via Command Line

```bash
# View today's log
tail -f log/openalgo_$(date +%F).log

# Search for errors
grep ERROR log/openalgo_$(date +%F).log

# Structured ERROR-and-above records
tail -f log/errors.jsonl
```

## Security Considerations

### API Key Redaction

```python
# blueprints/log.py
def sanitize_request_data(data):
    """Remove sensitive information from request data"""
    if isinstance(data, str):
        data = json.loads(data)
    if isinstance(data, dict):
        sanitized = data.copy()
        sanitized.pop("apikey", None)
        return sanitized
    return data
```

Redaction happens on read, in the log viewer. The stored `request_data` column holds the serialized payload as submitted.

### Access Control

- Logs only visible to authenticated users
- Session validation required
- No public access

## Key Files Reference

| File | Purpose |
|------|---------|
| `blueprints/log.py` | Order-log viewer and CSV export routes |
| `blueprints/analyzer.py` | Analyzer log routes (`/analyzer`) |
| `blueprints/logging.py` | Consolidated `/logging/` landing page |
| `database/apilog_db.py` | Order logs model |
| `database/analyzer_db.py` | Analyzer logs model |
| `utils/logging.py` | Logging configuration |
| `frontend/src/pages/Logs.tsx` | React log viewer |
