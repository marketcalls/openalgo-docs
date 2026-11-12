# Data

A backtest needs bars: open, high, low, close and volume for every interval of the run. You can give the engine your own bars, or let it fetch them from your OpenAlgo server. Either way the bars go through the same checks against the exchange calendar, and the result says exactly what was obtained.

## Where the bars come from

| You pass | The engine uses |
|---|---|
| `data=frame` | Your own pandas (or polars) DataFrame. No server needed |
| `data={"SBIN": frame1, "INFY": frame2}` | Your own bars for each symbol of a strategy with `symbols` |
| `data="bars.csv"` | A CSV file (Parquet and Feather files need `pyarrow`). The path may contain `{symbol}`, `{exchange}` and `{interval}` |
| `client` (an `openalgo.api`) with `source="auto"` (default) | Historify when it holds the whole range, otherwise the broker's history; never a mix of both |
| `client` with `source="db"` | Historify only (the local database of your OpenAlgo server) |
| `client` with `source="api"` | The broker's history API only |

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        self.fast = self.I(ta.ema, self.close, 10)
        self.slow = self.I(ta.ema, self.close, 30)

    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            self.buy(qty=50)
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


# Historify if it covers 2025, otherwise the broker.
result = bt.backtest(EmaCross, client, start="2025-01-01", end="2025-12-31", capital=200_000)

# Historify only, or the broker only.
from_db = bt.backtest(EmaCross, client, start="2025-01-01", end="2025-12-31", capital=200_000, source="db")
from_broker = bt.backtest(EmaCross, client, start="2025-10-01", end="2025-12-31", capital=200_000, source="api")
print(result.warnings)
```

What to expect from each source:

* **Historify** (`source="db"`) holds what you downloaded into it, including expired contracts and long histories. It is the right source for old ranges and for futures and options that have expired.
* **The broker** (`source="api"`) serves only instruments in today's master contract, and most brokers keep a limited history for intraday intervals. Long requests are fetched in chunks sized for your broker, paced and retried.
* **`source="auto"`** checks Historify first (its daily bars, and the intraday bars of the first and last session) and uses it only when it covers the whole range. It never stitches the two sources together.
* Weekly, monthly, quarterly and yearly bars from the server are always built from daily bars by the engine, never taken from the server's own aggregation.
* The bar still forming at the time of the request (today's partial candle) is dropped.

`start` and `end` are IST dates, both included. A datetime bounds the run to that time of day, which helps when you want part of a session. A run never goes past its data or the present: it ends at the earliest of `end`, the close of the last bar in the data and the present (`now=`, the clock by default), with a warning that names the end used. See [Where a run ends](results-and-reports.md#where-a-run-ends).

## Your own data

A DataFrame works when the engine can tell three things, none of which it guesses:

1. **The columns.** `open`, `high`, `low`, `close` and `volume`, in any letter case (`Open`, `CLOSE`). An `oi` column is optional.
2. **The time.** A `DatetimeIndex`, or a column named `timestamp`, `datetime`, `date`, `time` or `ts`.
3. **The time zone.** A time-zone-aware index or column, or `tz=` for naive times (`tz="Asia/Kolkata"` for IST clock times). There is no default, because a wrong guess shifts every bar by 5 hours 30 minutes. Numbers counted from 1970 (epoch values, with `unit=`) are UTC by definition and need no `tz=`.

The run takes its `start` and `end` from your data when you leave them out, whether it is a DataFrame (naive with `tz=`, or time-zone aware) or a file.

Each timestamp is the instant the bar **opens** (the OpenAlgo convention). A daily bar is stamped with its date: midnight IST, 00:00 UTC of the session date, or the session open all work (other times of day are mapped to their IST date, with a warning).

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

# Daily bars as they often arrive from a spreadsheet: a Date column, naive dates, capitalised names.
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-04-01", "2026-06-30")
k = np.arange(len(sessions))
close = (1000 + k + 30 * np.sin(k / 5)).round(1)
frame = pd.DataFrame(
    {
        "Date": pd.to_datetime(sessions["date"]),
        "Open": close - 2,
        "High": close + 5,
        "Low": close - 6,
        "Close": close,
        "Volume": 10_000,
    }
)
frame.to_csv("sbin_daily.csv", index=False)


class BuyAndHold(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"

    def on_bar(self, bar):
        if self.position.is_flat:
            self.buy(qty=50)


# The same bars from the DataFrame and from the CSV file; both give the run its dates.
from_frame = bt.backtest(BuyAndHold, data=frame, tz="Asia/Kolkata", capital=100_000)
from_file = bt.backtest(BuyAndHold, data="sbin_daily.csv", tz="Asia/Kolkata", capital=100_000)
print(len(from_frame.equity), "sessions;", "same result:", from_frame.fills.equals(from_file.fills))
```

<!-- output -->
```text
60 sessions; same result: True
```

For a layout `bt.backtest` cannot read on its own (other column names, bars stamped at their close, Unix seconds), load the bars first with [`load_bars`](support-functions/data-loading.md), which takes `columns=`, `label="close"`, `unit=` and `timestamp_format=`, and pass the frame it returns to `bt.backtest(data=...)`.

### Which bars stops are tested on

Orders and stops are evaluated on one **base interval** per run, and the Assumptions block says which one and why:

* `base=` when you give it;
* daily bars for a daily strategy;
* for an intraday strategy, 1-minute bars when 1-minute data covers the whole run for every symbol, otherwise the strategy interval.

So give an intraday strategy 1-minute bars when you have them: the engine builds the strategy bars from them, tests stops and targets inside each strategy bar, and fills at 1-minute opens. With 5-minute data only, a stop and a target hit inside the same 5-minute bar are resolved in favour of the stop.

## Time zones and bar labels

The engine stores every bar with its open and close as UTC instants and checks each one against the session calendar of its exchange. It stops with a `TimestampError` that names the likely cause, rather than shifting anything silently, when:

* the times are **5 hours 30 minutes off** (IST clock times read as UTC, or the reverse). On a single session the check may be inconclusive; you then get a `CalendarWarning` and the out-of-session bars are dropped and counted;
* the bars look **stamped at their close** instead of their open (declare `label="close"` in `load_bars`);
* bars do not start a whole number of intervals after the session open.

Pre-open bars, bars at or after the close and bars on a date the exchange was closed are dropped and counted in the quality report (add a special session to the calendar to keep them).

<!-- continues -->
```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo.backtest.errors import TimestampError

frames = []
for day in ("2026-10-05", "2026-10-06", "2026-10-07"):
    minutes = pd.Timestamp(f"{day} 09:15") + pd.to_timedelta(np.arange(375), unit="min")
    frames.append(pd.DataFrame({"open": 100.0, "high": 101.0, "low": 99.0, "close": 100.0, "volume": 1.0}, index=minutes))
ist_clock_times = pd.concat(frames)  # naive IST times

try:
    bt.data.load_bars("SBIN", "NSE", "1m", "2026-10-05", "2026-10-07", data=ist_clock_times, tz="UTC")
except TimestampError as error:
    print(str(error).split(". ")[0])

bars, meta = bt.data.load_bars("SBIN", "NSE", "1m", "2026-10-05", "2026-10-07", data=ist_clock_times, tz="Asia/Kolkata")
print(len(bars), "bars, quality ok:", meta.quality.ok)
```

<!-- output -->
```text
NSE:SBIN 1m: timestamps are 5 hours 30 minutes late against the NSE session calendar: 990 of 1125 bars are outside the session or off its lattice as given, 0 after undoing the offset, which then covers 3 days (first bar: 2026-10-05 14:45:00 IST)
1125 bars, quality ok: True
```

## Quality checks

Every load runs quality checks and keeps the report in its metadata (`meta.quality`):

| Severity | Checks |
|---|---|
| Error (the load stops with `DataQualityError`) | A price that is NaN, infinite, zero or negative; a high below the open or close, or a low above them; a suspected unadjusted split or bonus in the bars of a share (see [Splits and bonuses](#splits-and-bonuses)) |
| Warning (counted) | Duplicate timestamps; bars missing from the session grid; bars off the session lattice; sessions with no bar at all; bars dropped after the close, on closed days, partial or built from part of a period; sessions whose first bar opens late |
| Info | Open interest of 0 on every row turned into "unknown"; pre-open bars dropped |

Every report also lists the checks that did **not** run, so their absence is never read as a pass: runs of zero volume, outlier returns, survivorship bias, whether a series is adjusted at all, and for an index or a derivative the split and bonus check. `load_bars(..., strict=False)` returns the bars together with a report that has errors, so you can inspect them.

<!-- continues -->
```python
from openalgo.backtest.errors import DataQualityError

broken = frame.set_index("Date")
broken.iloc[5, broken.columns.get_loc("High")] = broken.iloc[5]["Close"] - 10  # a high below the close

try:
    bt.backtest(BuyAndHold, data=broken, tz="Asia/Kolkata", capital=100_000)
except DataQualityError as error:
    print(str(error).split(". ")[0])

bars, meta = bt.data.load_bars("SBIN", "NSE", "D", "2026-04-01", "2026-06-30", data=broken, tz="Asia/Kolkata", strict=False)
print(meta.quality.summary().splitlines()[0])
```

<!-- output -->
```text
NSE:SBIN D: data quality check failed: 1 row has a high below the open or close, or a low above them
error: 1 row has a high below the open or close, or a low above them
```

## Splits and bonuses

OpenAlgo history may not be adjusted for splits and bonuses. In unadjusted bars a 1:1 bonus halves the price overnight, and a backtest would read it as a 50 percent fall that never happened. So every load of **NSE and BSE shares** (intraday or daily) looks for them in the bars themselves. An overnight gap is a suspected unadjusted split or bonus when it:

* is within 5 percent of a usual factor, from a 1:3 bonus up to a 10-for-1 split, or a consolidation;
* lies beyond the widest daily price band, so no ordinary session or circuit-limit day explains it;
* still holds at that session's close, so it is not a bad print at the open.

A suspected split or bonus is an **error**: `load_bars` and `bt.backtest` stop with the date, the ratio, the prices and what to do. Smaller bonuses (1:4, 1:5, 1:10) move the price no further than an ordinary session can and are not detected. Indices and derivatives are not checked; their report lists the check among those that did not run.

To go on, do one of these:

* supply bars adjusted for it (`data=`);
* run on dates that do not span it;
* declare what happened with `corporate_actions=` (on `bt.backtest` and `bt.data.load_bars`): a list of `CorporateAction` from `openalgo.backtest.data`, or a dict of such lists by symbol.

| Declaration | Meaning |
|---|---|
| `CorporateAction.split(ex_date, from_face_value, to_face_value)` | A face-value split, for example from Rs 10 to Rs 2 (5 shares for every 1); a consolidation when the face value rises |
| `CorporateAction.bonus(ex_date, bonus, held)` | A bonus of `bonus` new shares for every `held` shares, as announced ("1:1" doubles the shares) |
| `CorporateAction.none(ex_date)` | The date was checked and had no corporate action: the gap is a genuine price move |

`ex_date` is the IST date of the first session at the new price. What a declaration does:

* A declared split or bonus that the bars are **not** adjusted for becomes a warning (in the quality report and in `result.warnings`). The run goes on, but an indicator whose window spans the ex-date reads prices from both sides of it.
* One that the bars are already adjusted for is noted, and `none` turns the gap into a genuine move; neither stops the run.
* A declared factor that does not match the gap in the bars is an error.

A declaration does not adjust anything. **Holding across a corporate action is not available yet**: a backtest that holds a position or a GTT order across a declared split or bonus that the bars are not adjusted for raises `NotImplementedError`. `meta.quality.price_gaps` lists every reported gap with its evidence, and the run manifest records the declarations.

The example builds daily bars of a share with a 1:1 bonus on 1 July 2026 that they are not adjusted for. The strategy trades before the ex-date.

<!-- continues -->
```python
from openalgo.backtest.data import CorporateAction

# A share's daily bars for June and July 2026, not adjusted for a 1:1 bonus on 1 July.
june_july = bt.calendar.default_calendar().sessions("NSE", "2026-06-01", "2026-07-31")
days = pd.DatetimeIndex(june_july["date"]).tz_localize("Asia/Kolkata")
n = np.arange(len(days))
close = (1200 + 2 * n + 15 * np.sin(n / 4)).round(1)
ex_date = days.get_loc(pd.Timestamp("2026-07-01", tz="Asia/Kolkata"))
close[ex_date:] = (close[ex_date:] / 2).round(1)  # the price halves overnight
open_ = np.r_[close[0], close[:-1]]
open_[ex_date] = close[ex_date] - 1
bonus_bars = pd.DataFrame(
    {"open": open_, "high": np.maximum(open_, close) + 5, "low": np.minimum(open_, close) - 5,
     "close": close, "volume": 10_000},
    index=days,
)


class InAndOut(bt.Strategy):
    """Buys 10 shares on the 3rd session and sells them on the 10th, before the ex-date."""

    symbol, exchange, interval = "EXAMPLE", "NSE", "D"

    def on_bar(self, bar):
        if len(self.close) == 3:
            self.buy(qty=10)
        elif len(self.close) == 10:
            self.exit()


class Holder(InAndOut):
    """Buys on the 3rd session and holds through the ex-date."""

    def on_bar(self, bar):
        if len(self.close) == 3:
            self.buy(qty=10)


# Nothing declared: the run stops at the suspected bonus.
try:
    bt.backtest(InAndOut, data=bonus_bars, capital=100_000)
except DataQualityError as error:
    print(str(error).split(". ")[0])

loaded, report = bt.data.load_bars("EXAMPLE", "NSE", "D", "2026-06-01", "2026-07-31", data=bonus_bars, strict=False)
gap = report.quality.price_gaps[0]
print("gap:", gap.ex_date, gap.status, round(gap.ratio, 3), "|", gap.reading)

# Declared: the run goes on, with a warning.
bonus = [CorporateAction.bonus("2026-07-01", 1, 1)]
declared = bt.backtest(InAndOut, data=bonus_bars, capital=100_000, corporate_actions=bonus)
print(declared.warnings[0].split(". ")[0])
print("trades:", len(declared.trades))

# Holding across it is not available yet.
try:
    bt.backtest(Holder, data=bonus_bars, capital=100_000, corporate_actions=bonus)
except NotImplementedError as error:
    print(str(error).split(". ")[0])
```

<!-- output -->
```text
NSE:EXAMPLE D: data quality check failed: 1 suspected unadjusted split or bonus (2026-07-01: the previous close 1225.60 against the open 613.60 is a ratio of 1.997, near 2 shares for every 1 (a 1:1 bonus, or a split from face value 10 to 5 or 2 to 1), and the session closed at 614.60, keeping the new level)
gap: 2026-07-01 suspected 1.997 | a 1:1 bonus, or a split from face value 10 to 5 or 2 to 1
EXAMPLE: the bars are not adjusted for 1 declared corporate action (2026-07-01: a bonus (2 shares for every 1); the previous close 1225.60 against the open 613.60 is a ratio of 1.997)
trades: 1
EXAMPLE: a position is held across 2026-07-01, the ex-date of a bonus (2 shares for every 1) that the bars are not adjusted for
```

## Short history

A source that returns less than you asked for is never silent. The first warning of the result says what was requested, what came back, how many sessions, and what to do, for example to download the range into Historify when the broker keeps only a short intraday history.

<!-- continues -->
```python
earlier = bt.backtest(BuyAndHold, data=frame, tz="Asia/Kolkata", capital=100_000, start="2026-03-02", end="2026-06-30")
print(earlier.warnings[0])
```

<!-- output -->
```text
Short history: 2026-03-02 to 2026-06-30 was requested but the supplied data returned 2026-04-01 to 2026-06-30, 60 of 79 sessions. The supplied data does not cover the rest of the requested range.
```

(This run also shows an `UnverifiedScheduleWarning` from Python: its requested range starts in March 2026, which the verified cost schedule does not cover.)

## The local cache

Bars from your OpenAlgo server are cached on disk, so a second run of the same range makes no request:

* The cache keeps exactly the rows each source returned, per source and per broker, one file per symbol, interval and month.
* A session counts as complete only when it was fetched at least 6 hours after its close (and, from a broker, on a later date). Anything else is fetched again on the next run.
* Every read verifies a content hash. A damaged file is moved aside, never served, and its sessions are fetched again.
* The folder is `cache_dir=` when you call `load_bars`, else the environment variable `OPENALGO_BT_CACHE`, else `~/.openalgo/backtest/cache`. `load_bars(..., refresh=True)` fetches a range again.
* Your own data is never cached.

The run manifest records a hash of the bars of every month the run used, so a later rerun can tell you when the data has changed (see [Results and Reports](results-and-reports.md#reproducing-a-run)).

No market-data downloader is bundled, and none is needed: use your OpenAlgo server, Historify, or your own files.
