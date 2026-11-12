# Data Loading

`bt.data.load_bars` is the function the backtest uses to get its bars (the open, high, low, close and volume of each period), and you can call it yourself: to fetch history from your OpenAlgo server, to check bars before a backtest, or to read bars laid out another way. [Data](../data.md) explains the sources and checks in plain words; this page shows the function.

The first example loads SBIN's daily bars from 1 January 2021 to 11 November 2026 from your OpenAlgo server. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before.

<!-- requires-server -->
```python
# Load the backtest engine and the OpenAlgo client
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# load_bars gives back two things: the bars, and a record (meta) of where they came from
bars, meta = bt.data.load_bars("SBIN", "NSE", "D", "2021-01-01", "2026-11-11", client=client)
print(meta.rows, "bars from", meta.obtained_start, "to", meta.obtained_end, "| source:", meta.source)
```

<!-- output -->
```text
1453 bars from 2021-01-01 to 2026-11-11 | source: api
```

`source: api` means the bars came from your broker's history through OpenAlgo; `db` would be Historify, the database on your OpenAlgo server.

## What the bars look like

The bars come back as a table with one row per bar, in the layout the engine uses inside:

<!-- requires-server -->
<!-- continues -->
```python
print(bars.tail(3).to_string(index=False))  # the last three bars
```

<!-- output -->
```text
            ts_open            ts_close   open    high     low  close     volume  oi
1794127800000000000 1794132000000000000 1023.2 1025.00 1015.10 1016.0  1950983.0 NaN
1794195900000000000 1794218400000000000 1030.0 1048.60 1022.30 1042.0 24065897.0 NaN
1794368700000000000 1794391200000000000 1056.0 1077.95 1052.85 1061.2 24841448.0 NaN
```

`ts_open` and `ts_close` are when each bar opened and closed, counted in nanoseconds from 1970 in UTC, the form the engine computes with. `oi` (open interest) is NaN, unknown, because a share has none. To read the times as Indian dates and clock times, convert them:

<!-- requires-server -->
<!-- continues -->
```python
import pandas as pd

# Turn the nanosecond counts into Indian times (IST)
opens = pd.to_datetime(bars["ts_open"], utc=True).dt.tz_convert("Asia/Kolkata")
print(opens.tail(3).to_string(index=False))
```

<!-- output -->
```text
2026-11-08 14:20:00+05:30
2026-11-09 09:15:00+05:30
2026-11-11 09:15:00+05:30
```

In this layout a daily bar runs from the session's open to its close: 09:15 on a regular day, 14:20 for the Diwali Muhurat trading session of Sunday 8 November 2026.

## The quality report

Every load checks the bars and keeps a report in `meta.quality`. The checks that did not run are listed too, so their absence is never read as a pass:

<!-- requires-server -->
<!-- continues -->
```python
print(meta.quality.summary())
```

<!-- output -->
```text
info: open interest was 0 in every row (1453 rows), which means the source supplies none: converted to NaN (unknown)
not run: zero_volume_runs: not checked in this version
not run: outlier_returns: not checked in this version
not run: survivorship_bias: a property of a universe, checked where portfolios are built
not run: adjustment_status: the sources do not say whether a series is adjusted; treat it as unknown
```

A failed error-level check (a zero or negative price, a high below the close, a suspected unadjusted split or bonus) stops the load with a `DataQualityError` that says what to do. `strict=False` returns the bars with the report instead, so you can find the bad row.

## The cache

Bars from your server are saved on your disk, so the next load of the same range makes no request. `cache_dir="bars_cache"` keeps this example's cache in a folder of its own, so the first load fetches and the second reads the disk:

<!-- requires-server -->
<!-- continues -->
```python
# Load the same bars twice into a fresh cache folder
for attempt in ("first", "second"):
    bars, meta = bt.data.load_bars("SBIN", "NSE", "D", "2021-01-01", "2026-11-11", client=client, cache_dir="bars_cache")
    print(attempt, "load: cache", meta.cache)  # miss: fetched from the server; hit: read from the disk
```

<!-- output -->
```text
first load: cache miss
second load: cache hit
```

## Bars in another layout

`load_bars` also reads bars you pass with `data=` when their layout is not the one the engine expects, for example bars exported by another program. This block makes such bars from SBIN's real 15-minute history of 11 November 2026: short column names (`o`, `h`, `l`, `c`, `qty`) and each bar stamped at its **close** in Unix seconds (seconds since 1 January 1970, UTC):

<!-- requires-server -->
<!-- continues -->
```python
# SBIN's 15-minute bars of 11 November 2026, rewritten in the other layout
history = client.history(symbol="SBIN", exchange="NSE", interval="15m", start_date="2026-11-11", end_date="2026-11-11")
exported = pd.DataFrame({
    "epoch": (history.index + pd.Timedelta(minutes=15)).map(pd.Timestamp.timestamp).astype(int),  # each bar's close, in seconds
    "o": history["open"], "h": history["high"], "l": history["low"], "c": history["close"], "qty": history["volume"],
})

# columns= names the columns, unit="s" reads seconds, label="close" says each stamp is a bar's close
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

The first bar's stamp is its close, 09:30 IST; with `label="close"` the engine stores it as the bar that opens at 09:15. A frame `load_bars` returns can go straight to `bt.backtest(data=...)`.

## More options

* `load_bars(symbol, exchange, interval, start, end, *, source="auto", client=None, data=None, ...)` returns a `BarsResult` that unpacks as `bars, meta`. `start` and `end` are IST dates, both included: a bar is returned when it opens on or after `start` and closes on or before `end`.
* `source`: `"auto"` (Historify when it covers the whole range, else the broker; never a mix), `"db"` (Historify) or `"api"` (the broker). `meta.auto_probe` says how `"auto"` decided.
* `data`: a DataFrame, a dict of columns, NumPy arrays, or a CSV, Parquet or Feather path, instead of `client`.
* `tz`: the time zone of times without one (`"Asia/Kolkata"` or `"UTC"`); there is no default. Epoch numbers (with `unit=`) are UTC and need none.
* `columns`, `label` (`"open"`, the default and the OpenAlgo convention, or `"close"`), `unit` and `timestamp_format` read other layouts.
* `base`: the interval to fetch and build from, such as `interval="15m", base="1m"` for 15-minute bars built from 1-minute data (see [Resampling](resampling.md)).
* `calendar`, `now` (bars not closed by then, such as today's forming candle, are dropped), `broker` (sizes each history request), `provider_options` (`chunk_days`, `pacing`, `max_retries`), `corporate_actions` (see [Splits and bonuses](../data.md#splits-and-bonuses)) and `strict`.
* `cache`, `cache_dir`, `refresh`: the cache is on by default, in `~/.openalgo/backtest/cache` (or `OPENALGO_BT_CACHE`); `refresh=True` fetches the range again. A session is trusted from the cache only once it was fetched well after its close. `meta.cache` is `"hit"`, `"top-up"`, `"miss"`, `"refresh"`, `"off"` or `"bypassed"`.
* The bars have `ts_open`, `ts_close` (UTC nanoseconds), `open`, `high`, `low`, `close`, `volume` and `oi`, and `bars.attrs` carries the symbol, exchange, interval and source.
* `meta` also has `broker`, `requested_start`, `requested_end`, `short_history`, `warnings` (a short history first) and `partition_hashes()` (the monthly hashes a run manifest records).
* Errors, all in `openalgo.backtest.errors`: `ConfigError` (arguments that do not fit together), `NoDataError` (nothing for the range), `TimestampError` (times that do not fit the session calendar), `DataQualityError` (failed quality checks) and `DataError` (server failures).
