# 08 - Historify

## Architecture

Historify is the local historical-data subsystem. The React `/historify` page calls a session-authenticated Flask blueprint under `/historify/api`; download services use the logged-in user's OpenAlgo API key to fetch normalized broker history and persist it in DuckDB.

<figure><img src="../../.gitbook/assets/diagram-historify-request-path.png" alt="Historify path: React page to /historify/api routes, historify and scheduler services, history service and broker API, persisted in historify.duckdb, with Socket.IO progress back to the page and /api/v1/history source=db reading the stored candles"><figcaption></figcaption></figure>

Historify is not part of the Flask-RESTX `/api/v1` namespace. `/api/v1/history` can read its DuckDB data with `source=db`, but Historify administration remains session-authenticated.

## DuckDB Ownership

| Table | Purpose |
|---|---|
| `market_data` | OHLCV/OI candles keyed by symbol, exchange, interval, timestamp |
| `watchlist` | Unique tracked symbol/exchange entries |
| `data_catalog` | Stored range and record-count metadata |
| `download_jobs` | Asynchronous job status/configuration |
| `job_items` | Per-symbol job status and errors |
| `symbol_metadata` | Expiry, strike, lot, type, and tick metadata |
| `historify_schedules` | Recurring watchlist download definitions |
| `historify_schedule_executions` | Per-run schedule history |

Connections are context-managed and retry transient file-lock conflicts. The default path is `db/historify.duckdb`.

Historify's configured database file is `HISTORIFY_DATABASE_PATH`, defaulting to `db/historify.duckdb`. The obsolete `HISTORIFY_DATABASE_URL` spelling is not a runtime alias.

## Runtime Features

- Watchlist CRUD and bulk changes.
- Single/watchlist downloads.
- Multi-symbol jobs with pause, resume, cancel, retry, incremental ranges, and Socket.IO progress.
- Chart queries, catalog/statistics, dataset deletion, and metadata enrichment.
- CSV/Parquet upload plus CSV, TXT, ZIP, and Parquet export.
- F&O underlying, expiry, futures, options, and chain discovery.
- Interval/daily schedules backed by APScheduler and persisted execution history.

Jobs use a bounded thread pool. Active persisted jobs without matching process-local state after restart are marked failed so they can be retried.

## Intervals

`1m` and `D` are the primary downloaded/storage intervals. Historify can aggregate supported higher and calendar intervals from stored candles for query/export workflows. The exact supported list is exposed by `/historify/api/historify-intervals` rather than maintained as a hard-coded documentation list.

## Key Files

| File | Purpose |
|---|---|
| `blueprints/historify.py` | Session routes and complete `/historify/api` surface |
| `services/historify_service.py` | Download, query, export, import, and job logic |
| `services/historify_scheduler_service.py` | Recurring schedules |
| `database/historify_db.py` | DuckDB schema and operations |
| `frontend/src/pages/Historify.tsx` | React manager |

See the public [Historify guide](../../new-features/historify.md).
