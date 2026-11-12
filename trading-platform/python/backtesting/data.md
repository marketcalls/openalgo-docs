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

    # init runs once, before the first bar: it sets up the two EMAs
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I keeps the indicator up to date bar by bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: it decides whether to buy or sell
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until there are 50 days of prices for the slow EMA
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):  # no shares, fast EMA just rose above slow
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):  # holding, fast EMA just fell below slow
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: the engine fetches SBIN's daily bars from your OpenAlgo server
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. An f-string (f"...") fills the values in {} into the text.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

What happened to the data:

* The engine asked your OpenAlgo server for SBIN's daily bars from 1 January 2021 to 11 November 2026.
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

When you already hold the bars in a DataFrame, pass it with `data=` instead of the client. This block, and every block after it on this page, continues the ones before. It fetches SBIN's daily bars with `client.history` and runs the same `EmaCrossover` on them. The result is the same, because the bars are the same:

<!-- requires-server -->
<!-- continues -->
```python
# Fetch the bars yourself: a DataFrame with one row per day
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")

# Run the strategy on those bars. tz= says the dates are Indian time (IST).
own = bt.backtest(EmaCrossover, data=sbin, tz="Asia/Kolkata", capital=100_000)

# Print the summary
m = own.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

The engine needs three things from your DataFrame:

1. **The columns** `open`, `high`, `low`, `close` and `volume`, in any letter case (`Close` works too).
2. **The time**, as the index or as a column named `timestamp`, `datetime`, `date`, `time` or `ts`.
3. **The time zone**, with `tz=`, when the times do not carry one (see the next section).

Leave out `start` and `end` and the run covers all the bars you pass. The lesson [Use Your Own Data](tutorial/11-your-own-data.md) goes further.

## Why it asks for `tz=`

The dates from `client.history` carry no time zone, and neither do most spreadsheets. The engine does not guess one: a wrong guess would move every bar by 5 hours 30 minutes, the gap between Indian time and UTC. Without `tz=` the run stops and says what to pass:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest.errors import ConfigError

# try runs the backtest; except catches the error, so we can print its message
try:
    bt.backtest(EmaCrossover, data=sbin, capital=100_000)  # no tz=
except ConfigError as error:
    print(error)
```

<!-- output -->
```text
the timestamps of the supplied data carry no time zone. Pass tz= (for example tz='Asia/Kolkata' for IST clock times, tz='UTC' for UTC): there is no default, because a wrong guess shifts every bar by 5 hours 30 minutes.
```

Pass `tz="Asia/Kolkata"` for Indian clock times, as in the block before.

## Columns with other names

A spreadsheet often has the date as a column and capitalised names (`Date`, `Open`, `Close`). The engine reads that layout as it is. This block renames the columns of `sbin` that way and runs the strategy again:

<!-- requires-server -->
<!-- continues -->
```python
# Make the layout of a spreadsheet: Title-case names, and the date as a column
sheet = sbin.rename(columns=str.title).reset_index(names="Date")
print(sheet.columns.tolist())  # the column names, as a list

# Run on it: the same trades, so the same net profit
same = bt.backtest(EmaCrossover, data=sheet, tz="Asia/Kolkata", capital=100_000)
print(f"Net profit   : Rs {same.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
['Date', 'Close', 'High', 'Low', 'Oi', 'Open', 'Volume']
Net profit   : Rs 53,267.29
```

For names the engine cannot match (such as `o`, `h`, `l`, `c`) or bars stamped at their close, load them first with [`load_bars`](support-functions/data-loading.md).

## How far back you can go

* **Daily bars:** brokers usually serve years of them; the daily runs on these pages start in 2021.
* **Intraday bars** (1-minute, 5-minute, 15-minute): most brokers keep a limited history. Download longer histories into Historify on your OpenAlgo server and run with `source="db"`.
* **Futures and options:** your broker serves a contract's history only while it trades. Historify keeps expired contracts you downloaded.
* **Charges** are built in from 1 July 2020. See [Backtest older years](how-to.md#backtest-older-years) to go further back.

When the source returns less than you asked for, the run goes on with what it has and its first warning says so. Here the run asks for bars from 1 July 2020, but `sbin` starts on 1 January 2021:

<!-- requires-server -->
<!-- continues -->
```python
# Ask for more than the bars hold: from 1 July 2020
earlier = bt.backtest(EmaCrossover, data=sbin, tz="Asia/Kolkata", capital=100_000, start="2020-07-01", end="2026-11-11")
print(earlier.warnings[0])  # the first warning
```

<!-- output -->
```text
Short history: 2020-07-01 to 2026-11-11 was requested but the supplied data returned 2021-01-01 to 2026-11-11, 1453 of 1582 sessions. The supplied data does not cover the rest of the requested range.
```

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
* Times 5 hours 30 minutes off (IST read as UTC, or the reverse) stop the run with a `TimestampError`; bars before the open, after the close or on a closed day are dropped and counted.
* What stops a load (`DataQualityError`): a price that is missing, zero or negative, a high below the open or close (or a low above them), and a suspected unadjusted split or bonus. Duplicates and missing bars are warnings. See [Data Loading](support-functions/data-loading.md) for the quality report and `strict=False`.
* A split or bonus is suspected when an overnight gap is within 5 percent of a usual factor (from a 1:3 bonus up to a 10-for-1 split), lies beyond the widest daily price band and still holds at that day's close. Smaller bonuses (1:4, 1:5, 1:10) are not detected; indices and derivatives are not checked.
* `CorporateAction.split(ex_date, from_face_value, to_face_value)`, `CorporateAction.bonus(ex_date, bonus, held)` and `CorporateAction.none(ex_date)` (a checked date with a genuine move). A declared action turns the stop into a warning; holding a position across one the bars are not adjusted for raises `NotImplementedError`.
* The cache keeps one file per source, broker, symbol, interval and month, checks a hash on every read, and lives in `~/.openalgo/backtest/cache` (or `OPENALGO_BT_CACHE`, or `load_bars(cache_dir=...)`). `load_bars(..., refresh=True)` fetches a range again.
* `data={"SBIN": frame1, "INFY": frame2}` gives bars for each symbol of a strategy with `symbols`. `data=` also takes a polars DataFrame or a path to a CSV, Parquet or Feather file (Parquet and Feather need `pyarrow`).
* No market-data downloader is bundled: your OpenAlgo server and Historify are the source.
