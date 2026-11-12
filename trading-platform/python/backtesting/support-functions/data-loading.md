# Data Loading

`openalgo.backtest.data.load_bars` is the one function the backtest uses to get bars (the open, high, low, close and volume of each interval), and you can call it yourself: to fetch and cache history from your OpenAlgo server, to read bars in another layout, to check a series before a backtest, or to get bars in the canonical layout for [resampling](resampling.md). [Data](../data.md) explains the sources, time zones, quality checks and the cache in plain words; this page is the reference.

## The function

`load_bars(symbol, exchange, interval, start, end, *, source="auto", client=None, data=None, ...)` returns a `BarsResult`, which unpacks as `bars, meta = load_bars(...)`.

| Argument | Meaning |
|---|---|
| `symbol`, `exchange`, `interval` | OpenAlgo strings: `"SBIN"`, `"NSE"`, `"5m"` or `"D"` |
| `start`, `end` | IST dates, both included. A bar is returned when it opens on or after `start` and closes on or before `end` |
| `source` | `"auto"` (Historify when it covers the whole range, else the broker), `"db"` (Historify), `"api"` (the broker), or a registered data provider |
| `client` | An `openalgo.api` client; needed for the server sources |
| `data` | Your own data instead: a DataFrame, a dict of columns, NumPy arrays, or a CSV, Parquet or Feather path |
| `tz` | The time zone of naive timestamps in your data (`"Asia/Kolkata"` or `"UTC"`); there is no default. Epoch numbers (with `unit=`) are UTC and need none; another zone for them is a `ConfigError` |
| `columns` | Your column names, such as `{"timestamp": "Date", "close": "Adj Close"}` |
| `label` | `"open"` (default, the OpenAlgo convention) when a timestamp is the bar's open, `"close"` when it is the bar's close |
| `unit`, `timestamp_format` | For numeric timestamps (`unit="s"` for Unix seconds) or text in a fixed format |
| `base` | The interval to obtain and resample from, such as `base="1m"` for 15-minute bars built from 1-minute data |
| `calendar` | A session calendar (the built-in one by default) |
| `cache`, `cache_dir`, `refresh` | The local cache of server rows: on by default, its folder, and fetching a range again |
| `now` | The present: bars that have not closed by then (today's forming candle) are dropped. The clock by default |
| `broker` | Your broker's name, for the size of each history request; by default the server is asked |
| `provider_options` | Options for the data source, such as `chunk_days`, `pacing` or `max_retries` for OpenAlgo history |
| `corporate_actions` | Splits, bonuses and checked dates of a share, a list of `CorporateAction` (see [Splits and bonuses](../data.md#splits-and-bonuses)) |
| `strict` | `True` (default) stops on a failed error-level quality check; `False` returns the bars with the report |

The bars come back in the **canonical layout**: a plain index and the columns `ts_open`, `ts_close` (UTC nanoseconds), `open`, `high`, `low`, `close`, `volume` and `oi` (NaN when unknown). `bars.attrs` carries the symbol, exchange, interval and source. A canonical frame can be passed straight to `bt.backtest(data=...)`.

`meta` is a `LoadMetadata`: `source` (what was actually used), `broker`, `cache` (`"hit"`, `"top-up"`, `"miss"`, `"refresh"`, `"off"` or `"bypassed"`), `requested_start` and `requested_end`, `obtained_start` and `obtained_end`, `rows`, `short_history`, `warnings` (a short history first), `quality` (the quality report) and `partition_hashes()` (the monthly hashes a run manifest records).

Errors: `ConfigError` for arguments that do not fit together, `NoDataError` when the source has nothing for the range, `TimestampError` for timestamps that do not fit the session calendar, `DataQualityError` for failed quality checks, and `DataError` for server failures. All are in `openalgo.backtest.errors`.

## Example: from your OpenAlgo server

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before it. This block loads SBIN's 5-minute bars from 3 August to 11 November 2026. `cache_dir="bars_cache"` keeps the cache in a folder of its own, so the first load here fetches from the server:

<!-- requires-server -->
```python
import pandas as pd

import openalgo.backtest as bt
from openalgo import api

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

bars, meta = bt.data.load_bars("SBIN", "NSE", "5m", "2026-08-03", "2026-11-11", client=client, cache_dir="bars_cache")
print("source:", meta.source, "| cache:", meta.cache, "|", meta.rows, "bars from", meta.obtained_start, "to", meta.obtained_end)
```

<!-- output -->
```text
source: api | cache: miss | 4979 bars from 2026-08-03 to 2026-11-11
```

`meta.source` is what was used: `api` is the broker's history, `db` would be Historify. The bars come back in the canonical layout:

<!-- requires-server -->
<!-- continues -->
```python
print(bars.head(3).to_string(index=False))
```

<!-- output -->
```text
            ts_open            ts_close   open   high    low  close   volume  oi
1785728700000000000 1785729000000000000 1035.0 1036.8 1033.2 1033.5 297271.0 NaN
1785729000000000000 1785729300000000000 1034.0 1034.0 1031.6 1033.1 119945.0 NaN
1785729300000000000 1785729600000000000 1033.2 1034.4 1032.2 1034.0 129129.0 NaN
```

`ts_open` and `ts_close` are the bar's open and close as UTC nanoseconds (09:15 IST is 03:45 UTC). `oi` is NaN because the source gives no open interest for a share.

The quality report of the load:

<!-- requires-server -->
<!-- continues -->
```python
print(meta.quality.summary())
```

<!-- output -->
```text
warning: 210 bars of the session grid are missing on the 70 session days that have bars
info: open interest was 0 in every row (4979 rows), which means the source supplies none: converted to NaN (unknown)
not run: zero_volume_runs: not checked in this version
not run: outlier_returns: not checked in this version
not run: survivorship_bias: a property of a universe, checked where portfolios are built
not run: adjustment_status: the sources do not say whether a series is adjusted; treat it as unknown
```

The broker's 5-minute bars of these sessions stop at 15:15, so the last three bars before the 15:30 close are counted as missing, 3 on each of the 70 sessions. That is a warning, not an error: the bars are usable, and a backtest on them ends each session at 15:15. The `not run` lines are the checks this version does not make, listed so that their absence is never read as a pass.

The next load of the same range reads the cache and makes no request:

<!-- requires-server -->
<!-- continues -->
```python
bars, meta = bt.data.load_bars("SBIN", "NSE", "5m", "2026-08-03", "2026-11-11", client=client, cache_dir="bars_cache")
print("cache:", meta.cache)
```

<!-- output -->
```text
cache: hit
```

`source="auto"` decides once per load and never stitches Historify and broker rows together; `meta.auto_probe` says how it decided. For a broker, long ranges are fetched in chunks sized for that broker, paced and retried with backoff. The rows are cached under `~/.openalgo/backtest/cache` (or `OPENALGO_BT_CACHE`, or `cache_dir=`), and a session is trusted from the cache only once it was fetched well after its close.

## Example: bars in another layout

`load_bars` also reads bars you pass with `data=` when their layout is not the one the engine expects, for example bars exported by another tool. This block makes such bars from SBIN's 15-minute history of 11 November 2026: short column names (`o`, `h`, `l`, `c`, `qty`) and each bar stamped at its **close** in Unix seconds (seconds since 1 January 1970, UTC). `columns=` names the columns, `unit="s"` reads the seconds and `label="close"` says the stamp is the close:

<!-- requires-server -->
<!-- continues -->
```python
history = client.history(symbol="SBIN", exchange="NSE", interval="15m", start_date="2026-11-11", end_date="2026-11-11")
exported = pd.DataFrame({
    "epoch": (history.index + pd.Timedelta(minutes=15)).map(pd.Timestamp.timestamp).astype(int),  # close time
    "o": history["open"], "h": history["high"], "l": history["low"], "c": history["close"], "qty": history["volume"],
})

bars, meta = bt.data.load_bars(
    "SBIN", "NSE", "15m", "2026-11-11", "2026-11-11",
    data=exported,
    columns={"timestamp": "epoch", "open": "o", "high": "h", "low": "l", "close": "c", "volume": "qty"},
    unit="s",
    label="close",
)
first_open = pd.Timestamp(bars["ts_open"].iloc[0], tz="UTC").tz_convert("Asia/Kolkata")
print(meta.rows, "bars; the first is stamped", exported["epoch"].iloc[0], "and opens at", first_open.strftime("%H:%M IST"))
```

<!-- output -->
```text
24 bars; the first is stamped 1794369600 and opens at 09:15 IST
```

The first bar's stamp is its close, 09:30 IST; with `label="close"` the engine stores it as the bar that opens at 09:15, the OpenAlgo convention.
