# Data Loading

`openalgo.backtest.data.load_bars` is the one function the backtest uses to get bars, and you can call it yourself: to fetch and cache history from your OpenAlgo server, to read your own files with an unusual layout, to check a series before a backtest, or to get bars in the canonical layout for [resampling](resampling.md). [Data](../data.md) explains the sources, time zones, quality checks and the cache in plain words; this page is the reference.

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

## Example: your own file

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

# 15-minute bars stamped at their close time in Unix seconds, with unusual column names.
start = pd.Timestamp("2026-10-05 09:30", tz="Asia/Kolkata")
closes = [start + pd.Timedelta(minutes=15 * k) for k in range(25)]
price = (800 + np.arange(25) * 0.5).round(2)
pd.DataFrame(
    {
        "epoch": [int(t.timestamp()) for t in closes],
        "o": price - 0.3, "h": price + 1.0, "l": price - 1.0, "c": price, "qty": 5_000,
    }
).to_csv("sbin_15m.csv", index=False)

bars, meta = bt.data.load_bars(
    "SBIN", "NSE", "15m", "2026-10-05", "2026-10-05",
    data="sbin_15m.csv",
    columns={"timestamp": "epoch", "open": "o", "high": "h", "low": "l", "close": "c", "volume": "qty"},
    unit="s",
    label="close",
)
print(meta.source, meta.rows, "bars from", meta.obtained_start, "to", meta.obtained_end, "quality ok:", meta.quality.ok)
first = bars.iloc[0]
opens, closes = (pd.Timestamp(first[c], tz="UTC").tz_convert("Asia/Kolkata") for c in ("ts_open", "ts_close"))
print("first bar opens at", opens.strftime("%H:%M"), "and closes at", closes.strftime("%H:%M"))
print(bars[["open", "high", "low", "close", "volume"]].head(2).to_string(index=False))
```

<!-- output -->
```text
files 25 bars from 2026-10-05 to 2026-10-05 quality ok: True
first bar opens at 09:15 and closes at 09:30
 open  high   low  close  volume
799.7 801.0 799.0  800.0  5000.0
800.2 801.5 799.5  800.5  5000.0
```

The file stamped each bar at its close (09:30 for the first bar); with `label="close"` the engine stores it as the 09:15 bar, the OpenAlgo convention.

## Example: from your OpenAlgo server

<!-- requires-server -->
```python
from openalgo import api

import openalgo.backtest as bt

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")

bars, meta = bt.data.load_bars("SBIN", "NSE", "5m", "2025-01-01", "2025-06-30", client=client)
print(meta.source, meta.broker, meta.cache, meta.rows)
print(meta.warnings)               # a short history is the first warning
print(meta.quality.summary())

# The next call reads the cache and fetches only sessions that are missing or not settled.
bars, meta = bt.data.load_bars("SBIN", "NSE", "5m", "2025-01-01", "2025-06-30", client=client)
print(meta.cache)
```

`source="auto"` decides once per load and never stitches Historify and broker rows together; `meta.auto_probe` says how it decided. For a broker, long ranges are fetched in chunks sized for that broker, paced and retried with backoff. The rows are cached under `~/.openalgo/backtest/cache` (or `OPENALGO_BT_CACHE`, or `cache_dir=`), and a session is trusted from the cache only once it was fetched well after its close.
