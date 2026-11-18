# Use Your Own Data

Until now `bt.backtest` fetched the bars from OpenAlgo by itself. Sometimes you want them in your hands first: to look at the prices before you trust a result, or to change them before the run. In this lesson you fetch SBIN's bars with `client.history`, look at them, and pass them to the backtest with `data=`.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Fetch the bars and look at them

`client.history` returns the bars as a table (a pandas DataFrame): one row per bar, with the open, high, low, close and volume. A bar is one period of prices, here one trading day.

The backtest will start on 1 January 2021, but the bars start three years earlier, on 1 January 2018. The engine needs those earlier days to get the EMAs ready by the start date, as in [lesson 1](01-first-backtest.md): an EMA counts every earlier close a little, so the 50-day EMA needs about two years of earlier days before its value settles. When the engine fetches the bars itself, it loads them for you; when you bring your own bars, you include them.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# SBIN's daily bars ("D") from 1 January 2018 to 11 November 2026, as a table.
# They start three years before the backtest, so the EMAs are ready on its first day.
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2018-01-01", end_date="2026-11-11")

# Look at them: how many bars, and the first three rows.
print(len(bars), "bars")
print(bars.head(3))
```

<!-- output -->
```text
2195 bars
             close    high     low  oi   open    volume
timestamp
2018-01-01  307.10  312.75  306.30   0  310.6  12182400
2018-01-02  303.25  309.00  301.35   0  309.0  14797364
2018-01-03  302.85  306.45  302.15   0  305.3  13857373
```

Each row is one day: its close, high, low and open in rupees, and the volume (shares traded). `oi` (open interest) is for futures and options, so it is 0 for a share. The dates on the left are the table's index, the label of each row.

## Backtest on these bars

The same EMA crossover as in the first lesson (buy when the 20-day EMA, an average of recent closes that counts the latest most, crosses above the 50-day EMA; sell when it crosses back), with `data=bars` in place of the client. `start="2021-01-01"` says where the backtest begins: the bars before it only get the EMAs ready, and no trade is made on them. The run ends with the last bar. This block continues the one above:

<!-- continues -->
<!-- requires-server -->
```python
# The strategy of the first lesson. A class bundles its settings and its functions (each "def").
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # must match the bars you pass
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest on your bars (data= instead of the client), from 1 January 2021.
result = bt.backtest(EmaCrossover, data=bars, start="2021-01-01", capital=100_000)

# Print the summary.
print(result.summary())   # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
```

The same bars give the same result as the first lesson, to the paisa: Rs 53,941.09 in 11 trades, with a max drawdown (the largest fall of the account from its highest value) of 29.35 percent. Passing the bars yourself changes nothing, until you change the bars.

Daily bars from `client.history` need nothing more. Intraday bars, such as 5-minute ones, also need `tz="Asia/Kolkata"` in the `bt.backtest(...)` call: their times carry no time zone, and the argument says they are Indian time (IST).

## Bars that start on the start date

If your bars begin on the day the backtest starts, there are no earlier days for the EMAs. The strategy then waits inside the run, without trading, until they are ready. This block continues the one above: it keeps only the bars from 2021 onwards and runs again:

<!-- continues -->
<!-- requires-server -->
```python
# Keep only the bars from 1 January 2021: no earlier days for the EMAs.
late_bars = bars.loc["2021-01-01":]

# Run on them and print the summary.
late = bt.backtest(EmaCrossover, data=late_bars, capital=100_000)
print(late.summary())   # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 30,738.50
Return       : 30.74%
Max drawdown : -29.38%
Trades       : 7 (29% won)
Overfitting  : too few trades to judge (7 closed, 30 needed)
```

Python also prints a warning on the screen when this run ends, after your file's name and line number:

```text
WarmUpWarning: The strategy waited inside the run for its indicators to warm up and made its first decision at 2023-01-23 15:30 IST (SBIN waited 511 strategy bars): signals before then were not taken. See result.warnings for why.
```

The strategy waited two years, until January 2023, for its 50-day EMA, and made only 7 trades instead of 11. `result.warnings` has the details: the 50-day EMA needs 512 daily bars, and the bars you gave begin on 1 January 2021. The fix is the one this lesson started with: fetch the bars from an earlier date and pass `start=`.

## What you learned

* `client.history(...)` gives you the bars as a table you can print and check before a backtest.
* `bt.backtest(..., data=bars, start="2021-01-01")` runs on your bars instead of fetching them. Fetch them from earlier than `start`, so the indicators are ready on the first day.
* Daily bars need no time zone; intraday bars need `tz="Asia/Kolkata"`.
* The engine still applies the Indian market rules (charges, slippage, sessions) to bars you pass.

## More options

* Test a shorter period on the same bars: `start="2023-01-01"`. The bars before it still get the EMAs ready. Keep a daily test at least three years long, so it covers more than one kind of market.
* Bars you download from another source, with no OpenAlgo server at all: see the [example on downloaded daily bars](../examples/yfinance-data.md).
* Every format the engine reads (other column names, files, time zones): [Data](../data.md#your-own-data).

**Next:** the [examples](../examples/README.md), real strategies to run and change.
