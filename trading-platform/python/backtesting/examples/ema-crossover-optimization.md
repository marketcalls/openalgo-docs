# Tuning a Strategy

Every strategy has numbers someone chose: the 20 and 50 of the [EMA crossover](ema-crossover.md) (the lengths, in days, of its two exponential moving averages) are two of them. These numbers are the strategy's parameters. `bt.optimize` backtests the strategy once for every combination of values you list and ranks them, so you can see which lengths worked best on RELIANCE in the past, and then check whether they keep working on later data.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## How it works

1. **Parameters are class attributes.** `fast = 20` and `slow = 50` in the class are the defaults; any number, text or true/false class attribute is a parameter the optimizer can change.
2. **Give the values to try by name.** `bt.optimize(EmaCrossover, client, ..., fast=(10, 15, 20, 25), slow=(40, 50, 60))` runs all 12 pairs, each a full backtest with the same charges and rules as `bt.backtest`.
3. **Read the result.** `opt.table` has one row per pair, `opt.best` is the winning pair, `opt.heatmap("fast", "slow")` lays the results out as a grid, and `opt.select(**opt.best)` gives the full backtest of the winner, with its trades.
4. **Check it on data the optimizer never saw.** Optimize on January 2021 to December 2024, then backtest the best pair on January 2025 to November 2026 and compare it with the original 20/50.

Save the code as a file (for example `tune_ema.py`) and run `python tune_ema.py`: the optimizer runs the pairs in worker processes, and each one imports your file. That is why the code that runs sits under `if __name__ == "__main__":`. Add each block below to the end of the same file.

## The code

The strategy, and the sweep of 12 pairs on January 2021 to December 2024. It prints the five best pairs by net profit and the winner.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # "D": daily bars
    fast = 20  # parameters: class attributes the optimizer can change
    slow = 50

    def init(self):
        # Runs once, before the first bar: the two EMAs of the closing prices.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


if __name__ == "__main__":  # needed: the optimizer starts worker processes that import this file
    opt = bt.optimize(
        EmaCrossover, client, start="2021-01-01", end="2024-12-31", capital=100_000,
        fast=(10, 15, 20, 25), slow=(40, 50, 60),
    )
    top = opt.table.sort_values("objective", ascending=False).head(5)
    print(top[["fast", "slow", "net_profit", "max_drawdown", "trades"]].round(2).to_string(index=False))
    print("best:", opt.best)
```

<!-- output -->
```text
 fast  slow  net_profit  max_drawdown  trades
   25    60     8537.40         -0.31       8
   20    60     2747.97         -0.28      10
   10    60     1482.35         -0.25      13
   15    40     1208.63         -0.27      14
   20    50      367.70         -0.24      11
best: {'fast': 25, 'slow': 60}
```

The net profit of every pair as a grid, fast lengths across and slow lengths down:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    print(opt.heatmap("fast", "slow").round(0))
```

<!-- output -->
```text
fast      10      15      20      25
slow
40     114.0  1209.0 -8985.0 -2658.0
50   -1391.0 -2926.0   368.0 -5984.0
60    1482.0 -2273.0  2748.0  8537.0
```

The full backtest of the best pair, with its first trades:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    best = opt.select(**opt.best)
    print(best.trades[["entry_time", "exit_time", "net_pnl_rupees"]].head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time                 exit_time  net_pnl_rupees
2021-06-02 09:15:00+05:30 2021-12-15 09:15:00+05:30        10212.27
2022-01-14 09:15:00+05:30 2022-01-31 09:15:00+05:30        -7886.86
2022-03-24 09:15:00+05:30 2022-07-04 09:15:00+05:30        -5619.20
2022-08-17 09:15:00+05:30 2022-09-23 09:15:00+05:30        -6789.40
2022-11-10 09:15:00+05:30 2023-01-12 09:15:00+05:30        -2508.56
```

The check: the best pair on January 2025 to November 2026, which the optimizer never saw.

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    later = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000, params=opt.best)
    print(f"{opt.best} after 2024: net profit Rs {later.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
{'fast': 25, 'slow': 60} after 2024: net profit Rs 1,294.40
```

The original 20/50 over the same later dates, for comparison:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    original = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000)
    print(f"20/50 after 2024: net profit Rs {original.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
20/50 after 2024: net profit Rs -7,213.11
```

## Reading it

* **The table** ranks by the objective, net profit unless you choose another. `max_drawdown` is a fraction: -0.31 is a fall of 31 percent from the peak. 25/60 made Rs 8,537 in 8 trades; the original 20/50 only Rs 368.
* **The heatmap** shows every pair at once. Half the pairs lost money, and the best one sits in the corner of the grid next to a loss of Rs 5,984 (25/50): a lone peak at the edge is more likely luck than a real edge.
* **The trade list** of the winner comes from `opt.select`, the same full `Result` that `bt.backtest` returns: its trades, equity curve and tearsheet.

## Is the best pair really better?

The pair that did best on the past is the one that fitted the past best, and part of that fit is luck. So test it on later data the optimizer never saw. Here 25/60 made Rs 1,294 from January 2025 to November 2026 while the original 20/50 lost Rs 7,213: better, but far below its Rs 8,537 of the earlier years. Trust a choice only when it holds up on unseen dates and its neighbours on the heatmap did nearly as well.

## Try this

* Rank by return per unit of risk instead of profit: `bt.optimize(..., objective="sharpe")`.
* A wider grid: `fast=range(5, 35, 5), slow=range(40, 110, 10)`.
* Another stock: `symbol = "SBIN"`.

More: [Optimization](../optimization.md), the reference for grids, objectives and worker processes.
