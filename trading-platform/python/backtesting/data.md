# Data

This page shows where a backtest gets its past prices and how to give it prices you already have. Most of the time you only pass your OpenAlgo client, and the engine fetches, checks and saves the prices for you.

The prices come as **bars**, also called candles. A bar sums up one period of trading, such as one day or 5 minutes, in five numbers: the open, high, low and close price, and the volume traded.

The example is the first strategy of this section, the EMA crossover from [Your First Backtest](tutorial/01-first-backtest.md). An EMA (exponential moving average) is the average closing price of recent days, with the latest days counting most. The strategy buys SBIN when its 20-day EMA rises above its 50-day EMA and sells when it falls back below, on daily bars from 1 January 2021 to 11 November 2026, with Rs 1,00,000. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the backtest engine, the OpenAlgo client and the indicators (ta)
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class is a recipe; the engine follows it on every bar.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs before the first bar: it sets up the two EMAs
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I keeps the indicator up to date bar by bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: it decides whether to buy or sell
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):  # no shares, fast EMA just rose above slow
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):  # holding, fast EMA just fell below slow
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: the engine fetches SBIN's daily bars from your OpenAlgo server
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
```

What happened to the data:

* The engine asked your OpenAlgo server for SBIN's daily bars from 1 January 2021 to 11 November 2026.
* It also asked for the bars before 1 January 2021, so that both EMAs were ready on the start date (see [History before the start date](#history-before-the-start-date)). Those bars only warm up the indicators: the strategy decided nothing before 1 January 2021.
* It checked every bar against the NSE holiday calendar and looked for impossible prices.
* It saved a copy on your disk, so the next run of the same dates makes no request and starts at once.

## What a bar looks like

`client.history` gives you the same bars the engine fetches, as a table (a pandas DataFrame) with one row per bar. This block continues the first one, which connected `client`. It prints SBIN's last three daily bars up to 11 November 2026:

<!-- requires-server -->
<!-- continues -->
```python
# Fetch SBIN's daily bars for the first days of November 2026
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-01", end_date="2026-11-11")
print(bars.tail(3))  # tail(3): the last three rows
```

<!-- output -->
```text
             close     high      low  oi    open    volume
timestamp
2026-11-08  1016.0  1025.00  1015.10   0  1023.2   1950983
2026-11-09  1042.0  1048.60  1022.30   0  1030.0  24065897
2026-11-11  1061.2  1077.95  1052.85   0  1056.0  24841448
```

Each row is one trading day. `oi` is open interest, which only futures and options have, so it is 0 for a share. Sunday 8 November 2026 has a bar because NSE held its Diwali Muhurat trading session that day, and 10 November is missing because NSE was closed for Diwali Balipratipada.

## Where the bars come from

With a client, the engine reads the bars from your OpenAlgo server. `source=` on `bt.backtest` chooses where on the server:

| `source=` | Where the bars come from |
|---|---|
| `"auto"` (the default) | Historify (the local database of your OpenAlgo server) when it holds the whole date range, otherwise your broker's history |
| `"db"` | Historify only |
| `"api"` | Your broker's history only |

`source="db"` on a range Historify does not hold stops with a `NoDataError` that says what to do, for example `source='db' returned no bars for 2021-01-01 to 2026-11-11. Download the series in Historify first, or use source='api' for recent data.`

## Your own data

When you already hold the bars in a DataFrame, pass it with `data=` instead of the client. This block, and every block after it on this page, continues the ones before. It fetches SBIN's daily bars with `client.history`, from 2018 so that the EMAs have earlier history to warm up on, and runs the same `EmaCrossover` on them from 1 January 2021:

<!-- requires-server -->
<!-- continues -->
```python
# Fetch the bars yourself: SBIN's daily bars from 2018, a DataFrame with one row per day
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2018-01-01", end_date="2026-11-11")

# Run the strategy on those bars. The bars before start only warm up the EMAs.
own = bt.backtest(EmaCrossover, data=sbin, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(own.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
```

The result is the same as the run with the client, because the bars are the same, the history before 2021 included.

The engine needs three things from your DataFrame:

1. **The columns** `open`, `high`, `low`, `close` and `volume`, in any letter case (`Close` works too).
2. **The time**, as the index or as a column named `timestamp`, `datetime`, `date`, `time` or `ts`.
3. **The time zone of intraday bars**, with `tz=`, when their times do not carry one (see [When do I pass tz=?](#when-do-i-pass-tz)). Daily bars need none.

Leave out `start` and `end` and the run covers all the bars you pass. The lesson [Use Your Own Data](tutorial/11-your-own-data.md) goes further.

## History before the start date

An indicator needs earlier bars before its value can be trusted: a 50-day EMA worked out on ten days of prices is not yet a 50-day average. So for every indicator made with `self.I` the engine knows its **warm-up**, the number of bars after which more history no longer changes its value. It measures it on its own reference bars, never on your data, so the same indicator needs the same bars on any share and at any bar size: 512 bars for a 50-bar EMA, daily or 15-minute. It then loads the bars before `start` that each indicator needs, in that indicator's own bar size, from the run's own source (your OpenAlgo server, or the bars of `data=` before `start`), and works out the indicators over them. The strategy makes no decision before `start`, nor before every indicator has closed its warm-up. Equity, trades and charges begin at `start`.

When the source has fewer bars before `start` (your own data begins on the start date, or the share was listed recently), the strategy waits inside the run until its indicators are ready, deciding nothing, and a warning says how long it waited. Here the bars begin on 1 January 2021:

<!-- requires-server -->
<!-- continues -->
```python
# SBIN's daily bars from 1 January 2021 only: no history before the start date
recent = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")
late = bt.backtest(EmaCrossover, data=recent, start="2021-01-01", end="2026-11-11", capital=100_000)
print(late.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 30,738.50
Return       : 30.74%
Max drawdown : -29.38%
Trades       : 7 (29% won)
```

Python prints the warning on the screen when the run ends, after the file name and line number:

```text
WarmUpWarning: The strategy waited inside the run for its indicators to warm up and made its first decision at 2023-01-23 15:30 IST (SBIN waited 511 strategy bars): signals before then were not taken. See result.warnings for why.
```

With no bars before 2021, the 50-day EMA needed 512 bars of the run itself, so the strategy decided nothing until 23 January 2023 and closed 7 trades instead of 11. `result.warnings` has the details: what each indicator needs, how many bars closed before `start`, and that the bars given begin on 1 January 2021. Load data from earlier than `start`, as `sbin` does, to trade from the first day.

The Assumptions of every run state the rule, what each series needed, the history loaded and when the strategy first decided, in `result.assumptions["warm_up"]`:

<!-- requires-server -->
<!-- continues -->
```python
print(result.assumptions["warm_up"])  # the warm-up of the first run on this page
```

<!-- output -->
```text
automatic: no decision before start, nor for a symbol before every self.I indicator of it has closed its warm-up of bars (its window-stability length on the engine's reference bars, the same for any data and in live trading; bars before start count); ema(SBIN.close, 50) needs 512 D bars of SBIN; history before start: SBIN 512 strategy bars from 2018-12-10 to 2020-12-31 (asked from 2018-06-17); ready at start
```

The slow EMA needs 512 daily bars. The engine asked your OpenAlgo server for SBIN's bars from 28 October 2018, a few weeks more than 512 trading days, to allow for holidays, and kept the last 512 of them, from 10 December 2018 to 31 December 2020. So the strategy was ready on the start date.

A strategy's own warm-up line at the top of `on_bar`, one that returns while too few bars have closed, still works, but it is no longer needed.

## When do I pass `tz=`?

**Daily bars need no time zone.** `client.history` stamps each daily bar with its date at midnight, without a time zone, and the engine reads such dates as Indian (IST) session dates. The Assumptions say so:

<!-- requires-server -->
<!-- continues -->
```python
print(own.assumptions["timestamps"])  # how the dates of the bars were read
```

<!-- output -->
```text
SBIN: naive midnight timestamps read as IST session dates (daily bars need no tz=)
```

**Intraday bars** carry a clock time, and there the engine does not guess: a wrong guess would move every bar by 5 hours 30 minutes, the gap between Indian time and UTC. The intraday bars of `client.history` come with the Indian time zone attached, so they need nothing. Times without a zone, as most spreadsheets hold them, stop the run with a message that says what to pass. This block removes the zone from SBIN's 15-minute bars of October 2026 to show it:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest.errors import ConfigError

# SBIN's 15-minute bars of October 2026, with the time zone removed as in a spreadsheet
bars15 = client.history(symbol="SBIN", exchange="NSE", interval="15m", start_date="2026-10-01", end_date="2026-10-30")
sheet15 = bars15.tz_localize(None)  # the same clock times, without "+05:30"


# The same strategy on 15-minute bars: a copy of EmaCrossover with another interval
class Intraday(EmaCrossover):
    interval = "15m"


# try runs the backtest; except catches the error, so we can print its message
try:
    bt.backtest(Intraday, data=sheet15, capital=100_000)  # no tz=
except ConfigError as error:
    print(error)
```

<!-- output -->
```text
the timestamps of the supplied data carry no time zone. Pass tz= (for example tz='Asia/Kolkata' for IST clock times, tz='UTC' for UTC): there is no default, because a wrong guess shifts every bar by 5 hours 30 minutes.
```

Pass `tz="Asia/Kolkata"` for Indian clock times: `bt.backtest(Intraday, data=sheet15, tz="Asia/Kolkata", capital=100_000)`.

## Columns with other names

A spreadsheet often has the date as a column and capitalised names (`Date`, `Open`, `Close`). The engine reads that layout as it is. This block renames the columns of `sbin` that way and runs the strategy again:

<!-- requires-server -->
<!-- continues -->
```python
# Make the layout of a spreadsheet: Title-case names, and the date as a column
sheet = sbin.rename(columns=str.title).reset_index(names="Date")
print(sheet.columns.tolist())  # the column names, as a list

# Run on it: the same bars, so the same trades and the same summary
same = bt.backtest(EmaCrossover, data=sheet, start="2021-01-01", end="2026-11-11", capital=100_000)
print(same.summary())
```

<!-- output -->
```text
['Date', 'Close', 'High', 'Low', 'Oi', 'Open', 'Volume']
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
```

For names the engine cannot match (such as `o`, `h`, `l`, `c`) or bars stamped at their close, load them first with [`load_bars`](support-functions/data-loading.md).

## How far back you can go

* **Daily bars:** brokers usually serve years of them; the daily runs on these pages start in 2021.
* **Intraday bars** (1-minute, 5-minute, 15-minute): most brokers keep a limited history. Download longer histories into Historify on your OpenAlgo server and run with `source="db"`.
* **Futures and options:** your broker serves a contract's history only while it trades. Historify keeps expired contracts you downloaded.
* **Charges** are built in from 1 July 2020. See [Backtest older years](how-to.md#backtest-older-years) to go further back.

When the source returns less than you asked for, the run goes on with what it has and a warning says so. Here the run asks for bars from 1 July 2020, but `recent` starts on 1 January 2021:

<!-- requires-server -->
<!-- continues -->
```python
# Ask for more than the bars hold: from 1 July 2020
earlier = bt.backtest(EmaCrossover, data=recent, start="2020-07-01", end="2026-11-11", capital=100_000)
print(earlier.warnings[1])  # the second warning (the first is the wait for the EMAs)
```

<!-- output -->
```text
Short history: 2020-07-01 to 2026-11-11 was requested but the supplied data returned 2021-01-01 to 2026-11-11, 1453 of 1582 sessions. The supplied data does not cover the rest of the requested range.
```

These bars have no history before 2021 either, so Python also prints the same `WarmUpWarning` as for the run above.

## Splits and bonuses

In a bonus or a split a company gives its shareholders more shares, and the share price falls in the same proportion: after a 1:1 bonus you hold twice the shares at half the price. Bars **adjusted** for it have the older prices divided too, so the chart has no jump. Bars **not adjusted** show the price halving overnight, and a backtest would read that as a crash that never happened.

OpenAlgo history may not be adjusted, so the engine looks for such a jump in the bars of every NSE and BSE share. When it finds one, the run stops with the date, the ratio and what to do:

* run on dates that do not cross the split or bonus, or
* pass bars that are adjusted for it (`data=`), or
* tell the engine what happened with `corporate_actions=`, for example `[CorporateAction.bonus("2024-10-28", 1, 1)]` for RELIANCE's 1:1 bonus (`from openalgo.backtest.data import CorporateAction`).

## Which bars stops are tested on

A stop-loss (an order that closes a trade when the price moves a set distance against you) is checked on one set of bars per run:

* a daily strategy: the day's high and low;
* an intraday strategy: 1-minute bars when your source has them for the whole run, otherwise the strategy's own bars. When one bar reaches both the stop and the target, the engine cannot tell which came first and assumes the stop.

`result.assumptions["base_rule"]` says which one a run used.

## The local cache

Bars from your OpenAlgo server are saved on your disk, so a second run of the same dates makes no request. A session is trusted from the cache only once it was fetched well after its close; anything else is fetched again. Bars you pass with `data=` are never saved.

## More options

* `source="auto"` checks Historify's daily bars and the intraday bars of the first and last session, and uses Historify only when it covers the whole range. It never mixes Historify and broker bars in one series.
* Weekly, monthly, quarterly and yearly bars are always built by the engine from daily bars.
* The bar still forming when you run (today's candle) is dropped. `bt.backtest(now=...)` fixes "now" to make a run on today's data repeatable.
* `start` and `end` are IST dates, both included; a date and time bounds the run to part of a session. A run ends at the earliest of `end`, the close of the last bar and the present, with a warning that names the end it used.
* Each timestamp is the moment the bar **opens** (the OpenAlgo convention); a daily bar is stamped with its date.
* Daily and longer bars (D, W, M, Q, Y) whose times are all midnight with no time zone are read as IST session dates, in an index, a timestamp column or CSV dates. Intraday times without a zone need `tz=`, and so do daily times stamped at a time of day.
* The history before `start` comes from the same source as the run's bars, never a mix; a futures series built from `underlying` loads none, because its contracts and rolls begin at `start`, so its strategy waits inside the run. `result.manifest["arguments"]["warm_up"]` records the warm-up a run used.
* Times 5 hours 30 minutes off (IST read as UTC, or the reverse) stop the run with a `TimestampError`; bars before the open, after the close or on a closed day are dropped and counted.
* What stops a load (`DataQualityError`): a price that is missing, zero or negative, a high below the open or close (or a low above them), and a suspected unadjusted split or bonus. Duplicates and missing bars are warnings. See [Data Loading](support-functions/data-loading.md) for the quality report and `strict=False`.
* A split or bonus is suspected when an overnight gap is within 5 percent of a usual factor (from a 1:3 bonus up to a 10-for-1 split), lies beyond the widest daily price band and still holds at that day's close. Smaller bonuses (1:4, 1:5, 1:10) are not detected; indices and derivatives are not checked.
* `CorporateAction.split(ex_date, from_face_value, to_face_value)`, `CorporateAction.bonus(ex_date, bonus, held)` and `CorporateAction.none(ex_date)` (a checked date with a genuine move). A declared action turns the stop into a warning; holding a position across one the bars are not adjusted for raises `NotImplementedError`.
* The cache keeps one file per source, broker, symbol, interval and month, checks a hash on every read, and lives in `~/.openalgo/backtest/cache` (or `OPENALGO_BT_CACHE`, or `load_bars(cache_dir=...)`). `load_bars(..., refresh=True)` fetches a range again.
* `data={"SBIN": frame1, "INFY": frame2}` gives bars for each symbol of a strategy with `symbols`. `data=` also takes a polars DataFrame or a path to a CSV, Parquet or Feather file (Parquet and Feather need `pyarrow`).
* No market-data downloader is bundled: your OpenAlgo server and Historify are the source.
