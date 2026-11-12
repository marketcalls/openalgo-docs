# Resampling

`openalgo.backtest.resample.resample_bars` builds coarser bars from finer ones on the exchange's session lattice: 5-minute, 15-minute or hourly bars from 1-minute bars, daily bars from intraday bars, and weekly, monthly, quarterly or yearly bars from daily bars. It produces the same buckets as Historify on the OpenAlgo server, so bars you resample yourself line up with the ones the server serves. The backtest uses it to build strategy bars and other timeframes from the base bars.

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

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo.backtest.resample import resample_bars

minute = np.arange(375)
close = (800 + 3 * np.sin(minute / 20)).round(1)
frame = pd.DataFrame(
    {"open": close, "high": close + 0.2, "low": close - 0.2, "close": close, "volume": 100},
    index=pd.Timestamp("2026-10-05 09:15", tz="Asia/Kolkata") + pd.to_timedelta(minute, unit="min"),
)
one_minute, _ = bt.data.load_bars("SBIN", "NSE", "1m", "2026-10-05", "2026-10-05", data=frame)


def ist(column):
    return pd.to_datetime(column, utc=True).dt.tz_convert("Asia/Kolkata").dt.strftime("%H:%M").tolist()


hourly = resample_bars(one_minute, "1h", exchange="NSE")
print("hourly bars open at ", ist(hourly["ts_open"]))
print("and close at        ", ist(hourly["ts_close"]))
print(hourly[["open", "high", "low", "close", "volume"]].to_string(index=False))

daily = resample_bars(one_minute, "D", exchange="NSE")
print(daily[["open", "high", "low", "close", "volume"]].to_string(index=False), daily.attrs["dropped"])
```

<!-- output -->
```text
hourly bars open at  ['09:15', '10:15', '11:15', '12:15', '13:15', '14:15', '15:15']
and close at         ['10:15', '11:15', '12:15', '13:15', '14:15', '15:15', '15:30']
 open  high   low  close  volume
800.0 803.2 799.8  800.6  6000.0
800.4 800.6 796.8  799.0  6000.0
799.2 803.2 799.0  801.4  6000.0
801.2 801.4 796.8  798.3  6000.0
798.4 803.2 798.2  802.1  6000.0
802.0 802.2 796.8  797.7  6000.0
797.7 799.8 797.5  799.6  1500.0
 open  high   low  close  volume
800.0 803.2 796.8  799.6 37500.0 {'pre_open_bars': 0, 'post_close_bars': 0, 'closed_day_bars': 0, 'empty_buckets': 0}
```

To resample your own bars, load them with `load_bars` first, as above: it checks the timestamps against the calendar and puts them in the canonical layout. `load_bars` can also resample for you while loading: pass `interval="15m", base="1m"`.
