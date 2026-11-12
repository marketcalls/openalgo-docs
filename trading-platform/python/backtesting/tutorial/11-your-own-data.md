# Use Your Own Data

Until now `bt.backtest` fetched the bars from OpenAlgo by itself. Sometimes you want them in your hands first: to look at the prices before you trust a result, or to change them before the run. In this lesson you fetch SBIN's bars with `client.history`, look at them, and pass them to the backtest with `data=`.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Fetch the bars and look at them

`client.history` returns the bars as a table (a pandas DataFrame): one row per bar, with the open, high, low, close and volume. A bar is one period of prices, here one trading day.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# SBIN's daily bars ("D") from 1 January 2021 to 11 November 2026, as a table.
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")

# Look at them: how many bars, and the first three rows.
print(len(bars), "bars")
print(bars.head(3))
```

<!-- output -->
```text
1453 bars
             close    high     low  oi    open    volume
timestamp
2021-01-01  279.40  280.00  274.40   0  274.90  24531791
2021-01-04  281.05  283.90  277.75   0  281.85  31450608
2021-01-05  281.75  282.45  277.00   0  278.05  27393072
```

1,453 trading days. Each row is one day: its close, high, low and open in rupees, and the volume (shares traded). `oi` (open interest) is for futures and options, so it is 0 for a share. The dates on the left are the table's index, the label of each row.

## Backtest on these bars

The same EMA crossover as in the first lesson (buy when the 20-day EMA, an average of recent closes that counts the latest most, crosses above the 50-day EMA; sell when it crosses back), with `data=bars` in place of the client. One more argument is needed: the dates in the table carry no time zone, so `tz="Asia/Kolkata"` tells the engine they are Indian (IST) dates. The run takes its first and last day from the bars. This block continues the one above:

<!-- continues -->
<!-- requires-server -->
```python
# The strategy of the first lesson. A class bundles its settings and its functions (each "def").
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # must match the bars you pass
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs 50 days first
            return
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest on your bars: data= instead of the client, tz= for their time zone.
result = bt.backtest(EmaCrossover, data=bars, tz="Asia/Kolkata", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

The same bars give the same result as the first lesson, to the paisa: Rs 53,267.48 in 11 trades, with a max drawdown (the largest fall of the account from its highest value) of 29.82 percent. Passing the bars yourself changes nothing, until you change the bars.

## What you learned

* `client.history(...)` gives you the bars as a table you can print and check before a backtest.
* `bt.backtest(..., data=bars, tz="Asia/Kolkata")` runs on your bars instead of fetching them.
* The engine still applies the Indian market rules (charges, slippage, sessions) to bars you pass.

## More options

* Change the bars before the run, for example keep 2024 onwards only: `bars = bars.loc["2024-01-01":]`.
* Bars from somewhere else: the [yfinance example](../examples/yfinance-data.md) downloads them with yfinance and runs with no OpenAlgo server.
* Every format the engine reads (other column names, files, time zones): [Data](../data.md#your-own-data).

**Next:** the [examples](../examples/README.md), real strategies to run and change.
