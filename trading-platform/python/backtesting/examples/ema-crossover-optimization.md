# Tuning a Strategy

The 20 and 50 of the [EMA crossover](ema-crossover.md) are numbers someone chose. `bt.optimize` backtests the strategy once for every pair of lengths you list and ranks them. This page finds the best pair on RELIANCE for 2021 to 2024, then checks it on 2025 and 2026, dates the optimizer never saw.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Strategy:** buy when the fast EMA (exponential moving average) crosses above the slow EMA, sell when it crosses back below. CNC (delivery), long only, all the capital, Rs 1,00,000.
* **Grid:** fast 10, 15, 20 or 25 days, slow 40, 50 or 60 days: 12 pairs, ranked by net profit.
* **Data:** RELIANCE (NSE) daily bars. The search uses 1 January 2021 to 31 December 2024; the check uses 1 January 2025 to 11 November 2026.

Save the code as a file (for example `tune_ema.py`) and run it with `python tune_ema.py`. The optimizer runs the backtests in helper processes that each read your file, so the lines that start the search sit under `if __name__ == "__main__":`, which runs them only in your own run.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
# fast and slow are its parameters: the settings the optimizer changes.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # RELIANCE on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs enough days first
            return
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Only in your own run, not again in each helper process.
if __name__ == "__main__":
    # The search: one backtest for every pair, on 2021 to 2024.
    opt = bt.optimize(
        EmaCrossover, client, start="2021-01-01", end="2024-12-31", capital=100_000,
        fast=(10, 15, 20, 25), slow=(40, 50, 60),
    )
    print("Best on 2021-24:", opt.best)

    # The check: the best pair on later dates. params= replaces the 20 and 50 for this run.
    result = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000,
                         params=opt.best)

    # Print the summary of the check. m is a dict; f"..." fills in each {value}.
    m = result.metrics
    print(f"Net profit   : Rs {m['net_profit']:,.2f}")
    print(f"Return       : {m['total_return']:.2%}")
    print(f"Max drawdown : {m['max_drawdown']:.2%}")
    print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Best on 2021-24: {'fast': 25, 'slow': 60}
Net profit   : Rs 1,294.40
Return       : 1.29%
Max drawdown : -14.45%
Trades       : 2 (50% won)
```

The search picked 25 and 60, which made Rs 8,537 on 2021 to 2024. On 2025 and 2026, which it never saw, the same pair made only Rs 1,294 in 2 trades. That still beats the original 20 and 50, which lost Rs 7,213 on those dates, but it is far below the result on the years it was picked on: the best pair of the past is partly luck. The max drawdown is the largest fall of the account from its highest value.

## Try this

* The whole grid at once, fast lengths across and slow lengths down: `print(opt.heatmap("fast", "slow").round(0))`. A best cell among good neighbours is more trustworthy than a lone peak.
* The original 20 and 50 on the same later dates, for comparison: the same `bt.backtest` call without `params=`.
* The full backtest of the winner on 2021 to 2024, with its trades: `best = opt.select(**opt.best)`.
* Rank by return per unit of risk instead of profit: `bt.optimize(..., objective="sharpe")`.

More: [Find Better Settings](../tutorial/09-find-better-settings.md), the same steps on SBIN; [Optimization](../optimization.md), the reference.
