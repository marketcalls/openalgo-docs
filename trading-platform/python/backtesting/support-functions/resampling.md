# Resampling

Resampling builds longer bars from shorter ones: fifteen 1-minute bars make one 15-minute bar, with the first open, the highest high, the lowest low, the last close and the total volume. `openalgo.backtest.resample.resample_bars` does this on the exchange's session times, the same way Historify on your OpenAlgo server does, so bars you build yourself line up with the ones the server serves.

The first example loads SBIN's 1-minute bars of 11 November 2026 from your OpenAlgo server and builds 15-minute bars from them. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before.

<!-- requires-server -->
```python
# Load pandas, the backtest engine, the OpenAlgo client and the resampling function
import pandas as pd

import openalgo.backtest as bt
from openalgo import api
from openalgo.backtest.resample import resample_bars

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# SBIN's 1-minute bars of 11 November 2026, in the layout resample_bars needs
one_minute, _ = bt.data.load_bars("SBIN", "NSE", "1m", "2026-11-11", "2026-11-11", client=client)

# Build 15-minute bars, then show the first three with their open time in IST
fifteen = resample_bars(one_minute, "15m", exchange="NSE")
opens = pd.to_datetime(fifteen["ts_open"], utc=True).dt.tz_convert("Asia/Kolkata").dt.strftime("%H:%M")
print(len(one_minute), "one-minute bars make", len(fifteen), "fifteen-minute bars")
print(fifteen[["open", "high", "low", "close", "volume"]].assign(opens=opens).head(3).to_string(index=False))
```

<!-- output -->
```text
360 one-minute bars make 24 fifteen-minute bars
  open   high     low   close    volume opens
1056.0 1065.0 1052.85 1058.70 3327366.0 09:15
1059.0 1068.0 1058.00 1065.85 2069414.0 09:30
1066.0 1071.1 1065.40 1065.80 1754279.0 09:45
```

`load_bars` gives the bars in the engine's own layout, with each bar's open and close time as `ts_open` and `ts_close` (UTC nanoseconds); the block converts `ts_open` to an Indian clock time to print it. The buckets start at the 09:15 open and every 15 minutes after it.

## Hourly bars

The same minutes as hourly bars. On NSE the hourly buckets start at 09:15, 10:15, 11:15 and so on:

<!-- requires-server -->
<!-- continues -->
```python
# Build hourly bars from the same minutes and show their open times in IST
hourly = resample_bars(one_minute, "1h", exchange="NSE")
opens = pd.to_datetime(hourly["ts_open"], utc=True).dt.tz_convert("Asia/Kolkata").dt.strftime("%H:%M")
print(hourly[["open", "high", "low", "close", "volume"]].assign(opens=opens).to_string(index=False))
```

<!-- output -->
```text
   open    high     low   close    volume opens
1056.00 1071.10 1052.85 1063.85 8339622.0 09:15
1064.00 1072.90 1063.60 1071.15 3731640.0 10:15
1071.45 1077.95 1071.00 1071.80 3095505.0 11:15
1071.80 1074.50 1063.50 1066.35 2763888.0 12:15
1066.35 1068.70 1061.55 1064.65 2590164.0 13:15
1064.65 1067.70 1058.50 1059.10 3393617.0 14:15
```

With every minute of the session, the last bucket would be a short bar from 15:15 to the 15:30 close. Here the broker's minutes end at 15:14, so there is no bar for it.

## A daily bar from minutes

All the minutes of the day as one daily bar:

<!-- requires-server -->
<!-- continues -->
```python
# Build one daily bar from the same minutes
daily = resample_bars(one_minute, "D", exchange="NSE")
print(daily[["open", "high", "low", "close", "volume"]].to_string(index=False))
```

<!-- output -->
```text
  open    high     low  close     volume
1056.0 1077.95 1052.85 1059.1 23914436.0
```

Its close, 1,059.10, is the close of the last minute the broker served, 15:14. The exchange's official close that day was 1,061.20 (the daily bar of `client.history`), and the daily volume is higher, because trading after 15:14 is not in these minutes. So build daily bars from intraday ones only when the minutes cover the whole session; a daily strategy is best given the source's own daily bars.

## Resampling while loading

`load_bars` can build the bars for you: ask for the interval you want and give the `base` to build it from:

<!-- requires-server -->
<!-- continues -->
```python
# 15-minute bars of 11 November 2026, built from 1-minute data
built, meta = bt.data.load_bars("SBIN", "NSE", "15m", "2026-11-11", "2026-11-11", client=client, base="1m")
print(len(built), "fifteen-minute bars, the same as above:", built["close"].equals(fifteen["close"]))
```

<!-- output -->
```text
24 fifteen-minute bars, the same as above: True
```

A backtest does the same: an intraday strategy gets its bars built from 1-minute data when 1-minute bars cover the run.

## More options

* `resample_bars(bars, interval, *, exchange, calendar=None, source_interval=None, on_closed_day="error")`. `interval` is the target, such as `"5m"`, `"15m"`, `"1h"`, `"D"`, `"W"`, `"M"`, `"Q"` or `"Y"`; an intraday target must be a whole multiple of the source interval. `source_interval` is read from `bars.attrs["interval"]` when not given.
* `bars` must be in the engine's layout: `ts_open`, `ts_close` (UTC nanoseconds), `open`, `high`, `low`, `close`, `volume` and `oi`. Load bars you already hold with `load_bars(..., data=...)` first (see [Data Loading](data-loading.md)).
* Buckets start at the exchange's regular open plus whole multiples of the interval, on every session, special sessions included, so missing minutes and a short last bucket are handled.
* Open interest takes the last known value. `ts_close` of a bar is the end of its bucket, cut at the session close; daily and longer bars run from the open of their first session to the close of their last.
* Bars before the open, at or after the close, or on a closed date are dropped (a closed date raises an error unless `on_closed_day="drop"`) and counted in `frame.attrs["dropped"]` (`pre_open_bars`, `post_close_bars`, `closed_day_bars`, `empty_buckets`).
* Weekly, monthly, quarterly and yearly bars are built from daily bars.
