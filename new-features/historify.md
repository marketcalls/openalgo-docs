# Historify

Historify downloads normalized broker candles into a local DuckDB database for reuse in charts, research, exports, and backtests. It also manages a symbol watchlist, data catalog, background download jobs, metadata, and recurring schedules.

{% embed url="https://www.youtube.com/watch?v=NgRdbs0Xr5Q" %}

## Access

Open **Profile -> Historify**, or navigate to `/historify` after signing in. The page and its `/historify/api` administration routes use the OpenAlgo browser session.

<figure><img src="../.gitbook/assets/openalgo-ui-historify.png" alt="Historify watchlist and download settings"><figcaption></figcaption></figure>

Historify administration is not part of the public `/api/v1` namespace. Public API clients can read stored candles through `/api/v1/history` with `source: "db"`.

## Storage

OpenAlgo uses six primary configured stores for separate application concerns. Historify owns `db/historify.duckdb`; it does not replace the main, traffic, latency, health, or sandbox databases.

The DuckDB schema stores:

- OHLCV and open-interest candles.
- Watchlist entries and symbol metadata.
- Catalog ranges and record counts.
- Download jobs and per-symbol job items.
- Schedules and schedule execution history.

Candles are upserted by symbol, exchange, interval, and timestamp to avoid duplicate rows. DuckDB connections use the application's locking and retry behavior.

## Watchlist And Discovery

Use the watchlist as the symbol source for bulk downloads and schedules. Symbols are validated against current contract data before persistence. The Historify page also exposes exchange and interval discovery plus futures and options contract selectors.

## Download Jobs

You can download one symbol or create a multi-symbol job from a watchlist, custom selection, option chain, or futures chain. Jobs run in a bounded background pool and report progress to the page through Socket.IO.

Supported job operations include:

- Pause, resume, cancel, retry, and delete.
- Incremental downloads for missing data before or after the stored range.
- Per-symbol status, downloaded records, timestamps, and broker errors.
- Restart recovery that marks orphaned active jobs failed so they can be retried.

Historical availability depends on the active broker, requested interval, and requested date range. A completed job can still contain symbol-level no-data or broker errors.

## Intervals And Charts

`1m` and `D` are the primary downloaded and stored intervals. Supported higher and calendar intervals can be derived from stored candles for charts, API queries, and exports. The running application exposes the exact current list through its Historify interval-discovery route.

Charts display stored historical candles, not a real-time feed. Use them to inspect gaps, range coverage, and unexpected values before relying on a dataset.

## Import And Export

Historify accepts validated CSV and Parquet uploads. Sample-file endpoints show the required structure.

Exports support CSV, TXT, ZIP, and Parquet with symbol, exchange, interval, and date filters. The preview reports matching records and estimated size. Generated temporary files are streamed and removed after download.

## Scheduling

Schedules use the Historify watchlist as their symbol source. Create interval-based or daily schedules, enable or disable them, pause or resume them, trigger them manually, and inspect execution history and the next run time.

OpenAlgo and the broker session must be available when a scheduled download runs. Broker token lifetime and market-data history limits remain broker-specific.

## Public History API

Choose the history source per request:

| Source | Behavior |
|---|---|
| `api` | Fetch normalized candles from the active broker |
| `db` | Query locally stored Historify candles |

See [History](../api-documentation/v1/data-api/history.md) for the public request and response contract.

## Operational Notes

- Stored data is broker-independent after download, but its original quality and availability depend on the broker response.
- Analyzer and live trading databases are separate from Historify.
- Configure the DuckDB file with `HISTORIFY_DATABASE_PATH`; the default is `db/historify.duckdb`. Note that `.sample.env` still ships the obsolete `HISTORIFY_DATABASE_URL` spelling on line 61, which the code does not read: copying it verbatim leaves the default path in place. Rename the key if you want to relocate the file.
- Back up the DuckDB file before destructive maintenance or host migration.
