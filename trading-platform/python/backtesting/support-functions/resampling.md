# Resampling

Resampling builds longer bars from shorter ones: sixty 1-minute bars make one hourly bar, with the first open, the highest high, the lowest low, the last close and the total volume. `openalgo.backtest.resample.resample_bars` does this on the exchange's session lattice (the fixed bar start times of each session): 5-minute, 15-minute or hourly bars from 1-minute bars, daily bars from intraday bars, and weekly, monthly, quarterly or yearly bars from daily bars. It produces the same buckets as Historify on the OpenAlgo server, so bars you resample yourself line up with the ones the server serves. The backtest uses it to build strategy bars and other timeframes from the base bars.

How a bucket is built:

* Buckets of interval N start at the exchange's regular open plus whole multiples of N, on every session (special sessions included). They are decided by the clock, so missing 1-minute bars and a short last bucket are handled: on NSE the last hourly bar runs from 15:15 to 15:30.
* Open is the first open, high the highest high, low the lowest low, close the last close, volume the sum, and open interest the last known value.
* `ts_close` of a bar is the end of its bucket, cut at the session close. Daily and longer bars run from the open of their first session to the close of their last.
* Bars before the session open, at or after the close, or on a closed date are dropped (closed dates raise an error unless `on_closed_day="drop"`), and counted in `frame.attrs["dropped"]`.

## The function

`resample_bars(bars, interval, *, exchange, calendar=None, source_interval=None, on_closed_day="error")`

* `bars`: bars in the engine's canonical layout: columns `ts_open` and `ts_close` (UTC nanoseconds) and `open`, `high`, `low`, `close`, `volume`, `oi`. `load_bars` returns exactly that (see [Data Loading](data-loading.md)).
* `interval`: the target, such as `"5m"`, `"15m"`, `"1h"`, `"D"`, `"W"`, `"M"`, `"Q"` or `"Y"`. An intraday target must be a whole multiple of the source interval.
* `exchange`: whose sessions bucket the bars.
* `calendar`: the session calendar (the built-in one by default).
* `source_interval`: the interval of `bars`; read from `bars.attrs["interval"]` when not given.

It returns a new frame in the same layout, with `attrs["interval"]` set to the target and `attrs["dropped"]` holding the counts `pre_open_bars`, `post_close_bars`, `closed_day_bars` and `empty_buckets`.

## Example

The examples load SBIN's 1-minute bars of 11 November 2026 from your OpenAlgo server and build coarser bars from them. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before it.

<!-- requires-server -->
```python
import pandas as pd

import openalgo.backtest as bt
from openalgo import api
from openalgo.backtest.resample import resample_bars

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

one_minute, _ = bt.data.load_bars("SBIN", "NSE", "1m", "2026-11-11", "2026-11-11", client=client)
first, last = (pd.Timestamp(stamp, tz="UTC").tz_convert("Asia/Kolkata") for stamp in one_minute["ts_open"].iloc[[0, -1]])
print(len(one_minute), "one-minute bars, the first opening at", first.strftime("%H:%M"), "and the last at", last.strftime("%H:%M"))
```

<!-- output -->
```text
360 one-minute bars, the first opening at 09:15 and the last at 15:14
```

Hourly bars from them. The times are converted from UTC nanoseconds to IST clock times to print them:

<!-- requires-server -->
<!-- continues -->
```python
hourly = resample_bars(one_minute, "1h", exchange="NSE")
opens = pd.to_datetime(hourly["ts_open"], utc=True).dt.tz_convert("Asia/Kolkata").dt.strftime("%H:%M")
closes = pd.to_datetime(hourly["ts_close"], utc=True).dt.tz_convert("Asia/Kolkata").dt.strftime("%H:%M")
print(hourly[["open", "high", "low", "close", "volume"]].assign(opens=opens, closes=closes).to_string(index=False))
```

<!-- output -->
```text
   open    high     low   close    volume opens closes
1056.00 1071.10 1052.85 1063.85 8339622.0 09:15  10:15
1064.00 1072.90 1063.60 1071.15 3731640.0 10:15  11:15
1071.45 1077.95 1071.00 1071.80 3095505.0 11:15  12:15
1071.80 1074.50 1063.50 1066.35 2763888.0 12:15  13:15
1066.35 1068.70 1061.55 1064.65 2590164.0 13:15  14:15
1064.65 1067.70 1058.50 1059.10 3393617.0 14:15  15:15
```

The buckets start at the 09:15 open and every hour after it. With every minute of the session the last bucket would be a short bar from 15:15 to the 15:30 close; here the broker's minutes end at 15:14, so there is no bar for it.

One daily bar from the same minutes:

<!-- requires-server -->
<!-- continues -->
```python
daily = resample_bars(one_minute, "D", exchange="NSE")
print(daily[["open", "high", "low", "close", "volume"]].to_string(index=False))
print(daily.attrs["dropped"])
```

<!-- output -->
```text
  open    high     low  close     volume
1056.0 1077.95 1052.85 1059.1 23914436.0
{'pre_open_bars': 0, 'post_close_bars': 0, 'closed_day_bars': 0, 'empty_buckets': 0}
```

Its close, 1,059.10, is the close of the last minute, 15:14. The exchange's official close that day was 1,061.20 (the daily bar of `client.history`), set by trading after 15:14 that these minutes do not hold, and the daily volume is higher for the same reason. So build daily bars from intraday ones only when the intraday bars cover the whole session; a daily strategy is best given the source's own daily bars.

To resample bars you already hold, load them with `load_bars(..., data=...)` first: it checks the timestamps against the calendar and puts them in the canonical layout. `load_bars` can also resample for you while loading: pass `interval="15m", base="1m"`.
