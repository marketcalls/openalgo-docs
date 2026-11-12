# Compare with NIFTY

A profit on its own does not say much: if the whole market rose more, simply holding NIFTY would have done better. In this lesson you compare the SBIN EMA crossover with NIFTY, and learn what beta and alpha mean.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## The strategy against NIFTY

The strategy is the one of the first lesson: buy SBIN when its 20-day EMA (an average of recent closes that counts the latest most) crosses above its 50-day EMA, and sell when it crosses back, on daily bars in delivery (CNC) with Rs 1,00,000.

The yardstick you compare with is called the **benchmark**. One argument adds it: `benchmark="NIFTY"`. The engine reads NIFTY's daily closes from your OpenAlgo server for the same dates. The benchmark never trades; it is only measured next to the strategy.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy of the first lesson. A class bundles its settings and its functions (each "def").
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
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


# Run the backtest, measured against NIFTY 50 over the same dates.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     benchmark="NIFTY")

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# And the strategy next to NIFTY.
print(f"NIFTY return : {m['benchmark_total_return']:.2%}")
print(f"Beta         : {m['beta']:.2f}")
print(f"Alpha        : {m['alpha']:.2%} a year")
```

<!-- output -->
```text
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
NIFTY return : 80.63%
Beta         : 0.72
Alpha        : 1.38% a year
```

## What the numbers mean

* **Max drawdown** is the largest fall of the account from its highest value.
* **NIFTY return** is what you would have made by simply holding NIFTY over the same dates.
* **Beta** says how much the strategy moves with NIFTY. A beta of 1 moves one for one with the index; a beta of 0.5 moves about half as much. It is measured on daily returns.
* **Alpha** is the return per year that the strategy earned beyond what its link to NIFTY (its beta) explains. Positive is better than the index for the risk taken, negative is worse.

Here the strategy made 53.27 percent while simply holding NIFTY made 80.63 percent: over these six years the index did better. A beta of 0.72 means the strategy moved about 0.72 percent for each 1 percent move of NIFTY, because it holds a single stock and sits in cash between trades. The alpha of 1.38 percent a year says that, for the share of NIFTY's ups and downs it took, it did a little better than the index. Less profit in total, then, but not a worse strategy for the risk it carried.

## What you learned

* `benchmark="NIFTY"` measures any strategy against NIFTY, without changing a single trade.
* Beta is how closely the strategy follows NIFTY; alpha is what it added beyond that.
* Always compare a strategy with simply holding the index over the same dates.

## More options

* Another index: `benchmark="BANKNIFTY"`, or a BSE index with `benchmark=("SENSEX", "BSE_INDEX")`.
* The strategy and NIFTY year by year: `print(result.performance.benchmark_comparison("year"))`.
* The full report, with NIFTY drawn next to the strategy: `result.tearsheet("vs_nifty.html")`. More in [Results and Reports](../results-and-reports.md#a-benchmark).

**Next lesson:** [Find Better Settings](09-find-better-settings.md)
