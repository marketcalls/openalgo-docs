# Data

A backtest needs **bars**. A bar is one interval of trading (one day, or 5 minutes) summed up in five numbers: the open, high, low and close price, and the volume traded. The engine gets the bars from your OpenAlgo server, or you hand it bars you already have as a pandas DataFrame. Either way the bars go through the same checks against the exchange calendar, and the result says exactly what was obtained.

Every example on this page takes its data from OpenAlgo. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the first block, and run the blocks in order: each continues from the ones before it.

## Where the bars come from

| You pass | The engine uses |
|---|---|
| `client` (an `openalgo.api`) with `source="auto"` (default) | Historify when it holds the whole range, otherwise the broker's history; never a mix of both |
| `client` with `source="db"` | Historify only (the local database of your OpenAlgo server) |
| `client` with `source="api"` | The broker's history API only |
| `data=frame` | Bars you already have, as a pandas (or polars) DataFrame |
| `data={"SBIN": frame1, "INFY": frame2}` | Your bars for each symbol of a strategy with `symbols` |
| `data="bars.csv"` | Bars in a CSV file (Parquet and Feather files need `pyarrow`). The path may contain `{symbol}`, `{exchange}` and `{interval}` |

The usual way is to pass the client and let the engine fetch the bars. This strategy trades SBIN on 5-minute bars: it buys 50 shares when the 10-bar EMA (an average of recent closes that weights the latest bars most) crosses above the 30-bar EMA, and sells when it crosses back below.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: intraday (MIS)

    def init(self):
        self.fast = self.I(ta.ema, self.close, 10)
        self.slow = self.I(ta.ema, self.close, 30)

    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            self.buy(qty=50)
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


# source="auto", the default: Historify when it holds the whole range, otherwise the broker.
result = bt.backtest(EmaCross, client, start="2026-07-01", end="2026-11-11", capital=200_000)
print(result.assumptions["base_rule"])  # which bars stops and fills were tested on
for warning in result.warnings:
    print(warning)
```

<!-- output -->
```text
base 1m (1-minute data covers the run for every instrument): stops are tested on 1-minute ranges and orders fill at 1-minute bar opens
The run ends at 2026-11-11 15:15 IST, the close of the last bar in the data, before the end of its range at 2026-11-11 15:30 IST: equity, trades and metrics stop there, and positions still open are reported open
9 of 195 orders were rejected with reject_code 'entry_window' (result.orders), the first decided at 2026-07-03 15:25 IST: orders after the MIS entry cut-off (entry_until) are rejected, and so are entries before entry_from; check self.now or set entry_until
SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
```

What the output says:

* On the server this ran on, Historify did not hold the range, so the bars came from the broker. Its 1-minute bars covered the run, so stops were tested on 1-minute bars (the first line).
* The broker's last bar of 11 November closes at 15:15, so the run ends there, with a warning.
* Some entry orders came after the latest time an intraday (MIS) position may be opened (15:00 until 31 July 2026, 14:50 from 3 August) and were rejected. `result.orders` lists them with their `reject_code`.
* SBIN is a share, so the engine used the generic lot of 1 share and tick of 5 paise.

To pick the source yourself, pass `source="db"` (Historify only; it stops with `NoDataError` when Historify holds no bars for the range) or `source="api"` (the broker only).

What to expect from each source:

* **Historify** (`source="db"`) holds what you downloaded into it, including expired contracts and long histories. It is the right source for old ranges and for futures and options that have expired.
* **The broker** (`source="api"`) serves only instruments in today's master contract, and most brokers keep a limited history for intraday intervals. Long requests are fetched in chunks sized for your broker, paced and retried.
* **`source="auto"`** checks Historify first (its daily bars, and the intraday bars of the first and last session) and uses it only when it covers the whole range. It never stitches the two sources together.
* Weekly, monthly, quarterly and yearly bars from the server are always built from daily bars by the engine, never taken from the server's own aggregation.
* The bar still forming at the time of the request (today's partial candle) is dropped.

`start` and `end` are IST dates, both included. A datetime bounds the run to that time of day, which helps when you want part of a session. A run never goes past its data or the present: it ends at the earliest of `end`, the close of the last bar in the data and the present (`now=`, the clock by default), with a warning that names the end used. See [Where a run ends](results-and-reports.md#where-a-run-ends).

## Your own data

When you already hold bars in a DataFrame, pass it with `data=` instead of the client. The engine needs three things from it, and guesses none of them:

1. **The columns.** `open`, `high`, `low`, `close` and `volume`, in any letter case (`Open`, `CLOSE`). An `oi` column (open interest) is optional.
2. **The time.** A `DatetimeIndex`, or a column named `timestamp`, `datetime`, `date`, `time` or `ts`.
3. **The time zone.** Times that carry their zone, or `tz=` for times without one (`tz="Asia/Kolkata"` for IST clock times). There is no default, because a wrong guess shifts every bar by 5 hours 30 minutes. Numbers counted from 1970 (epoch values, with `unit=`) are UTC by definition and need no `tz=`.

Each timestamp is the instant the bar **opens** (the OpenAlgo convention). A daily bar is stamped with its date: midnight IST, 00:00 UTC of the session date, or the session open all work (other times of day are mapped to their IST date, with a warning).

Here the DataFrame is SBIN's daily bars from `client.history`. Its dates have no time zone, so `tz="Asia/Kolkata"` says they are IST dates. The strategy is the same EMA crossover on daily bars, with all the capital in each trade. The run takes its `start` and `end` from the data when you leave them out.

<!-- requires-server -->
<!-- continues -->
```python
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")


class DailyEmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # daily bars: delivery (CNC)

    def init(self):
        self.fast = self.I(ta.ema, self.close, 10)
        self.slow = self.I(ta.ema, self.close, 30)

    def on_bar(self, bar):
        if len(self.close) <= 30:  # let the slow EMA warm up first
            return
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            self.buy()
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


own = bt.backtest(DailyEmaCross, data=sbin, tz="Asia/Kolkata", capital=100_000)
print(len(own.equity), "sessions from", own.equity.index[0].date(), "to", own.equity.index[-1].date())
print(f"Net profit: Rs {own.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
1453 sessions from 2021-01-01 to 2026-11-11
Net profit: Rs 71,912.03
```

The column names may be in any letter case, and the time may be a column instead of the index, the way a spreadsheet holds it. The same bars with a `Date` column and `Open`, `High`, `Low`, `Close`, `Volume` give the same trades:

<!-- requires-server -->
<!-- continues -->
```python
sheet = sbin.rename(columns=str.title).reset_index(names="Date")
print(sheet.columns.tolist())
same = bt.backtest(DailyEmaCross, data=sheet, tz="Asia/Kolkata", capital=100_000)
print("same fills:", same.fills.equals(own.fills))
```

<!-- output -->
```text
['Date', 'Close', 'High', 'Low', 'Oi', 'Open', 'Volume']
same fills: True
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

The 1-minute bars of `client.history` carry the IST zone. Many files do not: they hold the same clock times (09:15, 09:16, ...) with no zone. This block makes such bars from three sessions of SBIN and loads them with the wrong zone, UTC. The engine sees that every bar would fall 5 hours 30 minutes late and stops:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest.errors import TimestampError

minutes = client.history(symbol="SBIN", exchange="NSE", interval="1m", start_date="2026-11-04", end_date="2026-11-06")
clock_times = minutes.tz_localize(None)  # 09:15, 09:16, ... with the zone removed

try:
    bt.data.load_bars("SBIN", "NSE", "1m", "2026-11-04", "2026-11-06", data=clock_times, tz="UTC")
except TimestampError as error:
    print(str(error).split(". ")[0])
```

<!-- output -->
```text
NSE:SBIN 1m: timestamps are 5 hours 30 minutes late against the NSE session calendar: 945 of 1080 bars are outside the session or off its lattice as given, 0 after undoing the offset, which then covers 3 days (first bar: 2026-11-04 14:45:00 IST)
```

The same bars with the right zone load without an error:

<!-- requires-server -->
<!-- continues -->
```python
bars, meta = bt.data.load_bars("SBIN", "NSE", "1m", "2026-11-04", "2026-11-06", data=clock_times, tz="Asia/Kolkata")
print(len(bars), "bars, quality ok:", meta.quality.ok)
```

<!-- output -->
```text
1080 bars, quality ok: True
```

## Quality checks

Every load runs quality checks and keeps the report in its metadata (`meta.quality`):

| Severity | Checks |
|---|---|
| Error (the load stops with `DataQualityError`) | A price that is NaN, infinite, zero or negative; a high below the open or close, or a low above them; a suspected unadjusted split or bonus in the bars of a share (see [Splits and bonuses](#splits-and-bonuses)) |
| Warning (counted) | Duplicate timestamps; bars missing from the session grid; bars off the session lattice; sessions with no bar at all; bars dropped after the close, on closed days, partial or built from part of a period; sessions whose first bar opens late |
| Info | Open interest of 0 on every row turned into "unknown"; pre-open bars dropped |

Every report also lists the checks that did **not** run, so their absence is never read as a pass: runs of zero volume, outlier returns, survivorship bias, whether a series is adjusted at all, and for an index or a derivative the split and bonus check. `load_bars(..., strict=False)` returns the bars together with a report that has errors, so you can inspect them.

Real bars from OpenAlgo pass these checks. To see what a failed check looks like, this block copies SBIN's daily bars and puts a typing mistake in one row: a high below that day's close. The backtest refuses the bars:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest.errors import DataQualityError

broken = sbin.copy()
broken.loc["2026-11-11", "high"] = 1050.00  # the real high was 1077.95; the close was 1061.20

try:
    bt.backtest(DailyEmaCross, data=broken, tz="Asia/Kolkata", capital=100_000)
except DataQualityError as error:
    print(str(error).split(". ")[0])
```

<!-- output -->
```text
NSE:SBIN D: data quality check failed: 1 row has a high below the open or close, or a low above them
```

`strict=False` gives you the bars together with the report, so you can find the row:

<!-- requires-server -->
<!-- continues -->
```python
bars, meta = bt.data.load_bars("SBIN", "NSE", "D", "2021-01-01", "2026-11-11", data=broken, tz="Asia/Kolkata", strict=False)
print(meta.quality.summary().splitlines()[0])
```

<!-- output -->
```text
error: 1 row has a high below the open or close, or a low above them
```

## Splits and bonuses

In a bonus or a split a company gives its shareholders more shares, and the share price falls in the same proportion: after a 1:1 bonus you hold twice the shares at half the price. Bars **adjusted** for it have the earlier prices divided by the same factor, so the chart has no jump. Bars **not adjusted** show the price halving overnight, and a backtest would read that as a 50 percent fall that never happened.

OpenAlgo history may not be adjusted for splits and bonuses, so every load of **NSE and BSE shares** (intraday or daily) looks for them in the bars themselves. An overnight gap is a suspected unadjusted split or bonus when it:

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

The examples use a real case: RELIANCE gave a 1:1 bonus with the ex-date 28 October 2024. The daily bars from the server this page ran on are adjusted for it: the close of 25 October 2024 is 1,327.85, next to an open of 1,337.00 on the 28th. Before the bonus the shares really traded near Rs 2,655. This block rebuilds those prices as they traded (the adjusted prices before the ex-date times 2) and runs the daily crossover on them. Nothing is declared, so the run stops at the bonus:

<!-- requires-server -->
<!-- continues -->
```python
reliance = client.history(symbol="RELIANCE", exchange="NSE", interval="D", start_date="2024-06-01", end_date="2024-12-31")
as_traded = reliance.copy()
before_bonus = as_traded.index < "2024-10-28"
as_traded.loc[before_bonus, ["open", "high", "low", "close"]] *= 2  # the prices before the 1:1 bonus


class RelianceCross(DailyEmaCross):
    symbol = "RELIANCE"


try:
    bt.backtest(RelianceCross, data=as_traded, tz="Asia/Kolkata", capital=100_000)
except DataQualityError as error:
    print(str(error).split(". ")[0])
```

<!-- output -->
```text
NSE:RELIANCE D: data quality check failed: 1 suspected unadjusted split or bonus (2024-10-28: the previous close 2655.70 against the open 1337.00 is a ratio of 1.986, near 2 shares for every 1 (a 1:1 bonus, or a split from face value 10 to 5 or 2 to 1), and the session closed at 1334.35, keeping the new level)
```

`price_gaps` in the quality report holds the evidence of each gap:

<!-- requires-server -->
<!-- continues -->
```python
bars, meta = bt.data.load_bars("RELIANCE", "NSE", "D", "2024-06-01", "2024-12-31", data=as_traded, tz="Asia/Kolkata", strict=False)
gap = meta.quality.price_gaps[0]
print("gap:", gap.ex_date, gap.status, round(gap.ratio, 3), "|", gap.reading)
```

<!-- output -->
```text
gap: 2024-10-28 suspected 1.986 | a 1:1 bonus, or a split from face value 10 to 5 or 2 to 1
```

Declared with `corporate_actions=`, the bonus becomes a warning and the run goes on. The crossover's trades of that period ended before the ex-date:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest.data import CorporateAction

bonus = [CorporateAction.bonus("2024-10-28", 1, 1)]  # 1 new share for every 1 held
declared = bt.backtest(RelianceCross, data=as_traded, tz="Asia/Kolkata", capital=100_000, corporate_actions=bonus)
print(declared.warnings[0].split(". ")[0])
print("trades:", len(declared.trades), "| last exit:", declared.trades["exit_time"].iloc[-1].date())
```

<!-- output -->
```text
RELIANCE: the bars are not adjusted for 1 declared corporate action (2024-10-28: a bonus (2 shares for every 1); the previous close 2655.70 against the open 1337.00 is a ratio of 1.986)
trades: 2 | last exit: 2024-10-03
```

A strategy that holds RELIANCE through 28 October 2024 on these bars stops, because holding across a bonus the bars are not adjusted for is not built yet:

<!-- requires-server -->
<!-- continues -->
```python
class BuyAndHold(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"

    def on_bar(self, bar):
        if self.position.is_flat:
            self.buy()


try:
    bt.backtest(BuyAndHold, data=as_traded, tz="Asia/Kolkata", capital=100_000, corporate_actions=bonus)
except NotImplementedError as error:
    print(str(error).split(". ")[0])
```

<!-- output -->
```text
RELIANCE: a position is held across 2024-10-28, the ex-date of a bonus (2 shares for every 1) that the bars are not adjusted for
```

The bars from your server are adjusted, so the same strategy runs on them through the bonus, and the declaration is only noted:

<!-- requires-server -->
<!-- continues -->
```python
held = bt.backtest(BuyAndHold, client, start="2024-06-01", end="2024-12-31", capital=100_000, corporate_actions=bonus)
print(held.warnings[0])
```

<!-- output -->
```text
RELIANCE: the bars are already adjusted for 1 declared corporate action (2024-10-28: a bonus (2 shares for every 1); the previous close 1327.85 against the open 1337.00 is a ratio of 0.993)
```

## Short history

A source that returns less than you asked for is never silent. The first warning of the result says what was requested, what came back, how many sessions, and what to do, for example to download the range into Historify when the broker keeps only a short intraday history.

Here the run asks for bars from 1 July 2020, but the SBIN bars passed in start on 1 January 2021:

<!-- requires-server -->
<!-- continues -->
```python
earlier = bt.backtest(DailyEmaCross, data=sbin, tz="Asia/Kolkata", capital=100_000, start="2020-07-01", end="2026-11-11")
print(earlier.warnings[0])
```

<!-- output -->
```text
Short history: 2020-07-01 to 2026-11-11 was requested but the supplied data returned 2021-01-01 to 2026-11-11, 1453 of 1582 sessions. The supplied data does not cover the rest of the requested range.
```

## The local cache

Bars from your OpenAlgo server are cached on disk, so a second run of the same range makes no request:

* The cache keeps exactly the rows each source returned, per source and per broker, one file per symbol, interval and month.
* A session counts as complete only when it was fetched at least 6 hours after its close (and, from a broker, on a later date). Anything else is fetched again on the next run.
* Every read verifies a content hash. A damaged file is moved aside, never served, and its sessions are fetched again.
* The folder is `cache_dir=` when you call `load_bars`, else the environment variable `OPENALGO_BT_CACHE`, else `~/.openalgo/backtest/cache`. `load_bars(..., refresh=True)` fetches a range again.
* Bars you pass with `data=` are never cached.

The run manifest records a hash of the bars of every month the run used, so a later rerun can tell you when the data has changed (see [Results and Reports](results-and-reports.md#reproducing-a-run)).

No market-data downloader is bundled, and none is needed: use your OpenAlgo server and Historify.
