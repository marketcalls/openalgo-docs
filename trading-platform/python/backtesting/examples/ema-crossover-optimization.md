# Tuning a Strategy

Every strategy has numbers someone chose: the 20 and 50 of the [EMA crossover](ema-crossover.md) are two of them. `bt.optimize` backtests the strategy once for every combination of values you list and ranks them, so you can see which lengths worked best on RELIANCE in the past, and then check whether they keep working on later data.

## How it works

1. **Parameters are class attributes.** `fast = 20` and `slow = 50` in the class are the defaults; any number, text or true/false class attribute is a parameter the optimizer can change.
2. **Give the values to try by name.** `bt.optimize(EmaCrossover, client, ..., fast=(10, 15, 20, 25), slow=(40, 50, 60))` runs all 12 pairs, each a full backtest with the same charges and rules as `bt.backtest`.
3. **Read the result.** `opt.table` has one row per pair, `opt.best` is the winning pair, `opt.heatmap("fast", "slow")` lays the results out as a grid, and `opt.select(**opt.best)` gives the full backtest of the winner, with its trades.
4. **Check it on data the optimizer never saw.** Optimize on January 2021 to December 2024, then backtest the best pair on January 2025 to November 2026 and compare it with the original 20/50.

Save the code as a file (for example `tune_ema.py`) and run `python tune_ema.py`: the optimizer runs the pairs in worker processes, and each one imports your file.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"
    fast = 20  # parameters: class attributes the optimizer can change
    slow = 50

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


if __name__ == "__main__":  # needed: the optimizer starts worker processes that import this file
    # 1. Backtest every pair of lengths on January 2021 to December 2024.
    opt = bt.optimize(
        EmaCrossover, client, start="2021-01-01", end="2024-12-31", capital=100_000,
        fast=(10, 15, 20, 25), slow=(40, 50, 60),
    )

    # 2. The five best pairs by net profit, and the winner.
    top = opt.table.sort_values("objective", ascending=False).head(5)
    print(top[["fast", "slow", "net_profit", "max_drawdown", "trades"]].round(2).to_string(index=False))
    print("best:", opt.best)

    # 3. Net profit of every pair: fast lengths across, slow lengths down.
    print(opt.heatmap("fast", "slow").round(0))

    # 4. The full backtest of the best pair, with its trade list.
    best = opt.select(**opt.best)
    print(best.trades[["entry_time", "exit_time", "net_pnl_rupees"]].head().to_string(index=False, float_format="%.2f"))

    # 5. The check: the best pair and the original 20/50 on 2025-2026, which the optimizer never saw.
    for params in (opt.best, {"fast": 20, "slow": 50}):
        later = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000, params=params)
        print(f"{params} after 2024: net profit Rs {later.metrics['net_profit']:,.2f}")
```

```text
 fast  slow  net_profit  max_drawdown  trades
   25    60     8544.50         -0.31     8.0
   20    60     2756.32         -0.28    10.0
   10    60     1492.58         -0.25    13.0
   15    40     1220.07         -0.27    14.0
   20    50      376.56         -0.24    11.0
best: {'fast': 25, 'slow': 60}
fast      10      15      20      25
slow
40     125.0  1220.0 -8976.0 -2649.0
50   -1381.0 -2917.0   377.0 -5976.0
60    1493.0 -2264.0  2756.0  8544.0
               entry_time                 exit_time  net_pnl_rupees
2021-06-02 09:15:00+05:30 2021-12-15 09:15:00+05:30        10213.26
2022-01-14 09:15:00+05:30 2022-01-31 09:15:00+05:30        -7886.01
2022-03-24 09:15:00+05:30 2022-07-04 09:15:00+05:30        -5618.43
2022-08-17 09:15:00+05:30 2022-09-23 09:15:00+05:30        -6788.78
2022-11-10 09:15:00+05:30 2023-01-12 09:15:00+05:30        -2507.87
{'fast': 25, 'slow': 60} after 2024: net profit Rs 1,294.40
{'fast': 20, 'slow': 50} after 2024: net profit Rs -7,213.11
```

## Reading it

* **The table** ranks by the objective, net profit unless you choose another. `max_drawdown` is a fraction: -0.31 is a fall of 31 percent from the peak. 25/60 made Rs 8,544 in 8 trades; the original 20/50 only Rs 377.
* **The heatmap** shows every pair at once. Half the pairs lost money, and the best one sits in the corner of the grid next to a loss of Rs 5,976 (25/50): a lone peak at the edge is more likely luck than a real edge.
* **The trade list** of the winner comes from `opt.select`, the same full `Result` that `bt.backtest` returns: its trades, equity curve and tearsheet.

## Is the best pair really better?

The pair that did best on the past is the one that fitted the past best, and part of that fit is luck. So test it on later data the optimizer never saw. Here 25/60 made Rs 1,294 from January 2025 to November 2026 while the original 20/50 lost Rs 7,213: better, but far below its Rs 8,544 of the earlier years. Trust a choice only when it holds up on unseen dates and its neighbours on the heatmap did nearly as well.

## Try this

* Rank by return per unit of risk instead of profit: `bt.optimize(..., objective="sharpe")`.
* A wider grid: `fast=range(5, 35, 5), slow=range(40, 110, 10)`.
* Another stock: `symbol = "SBIN"`.

More: [Optimization](../optimization.md), the reference for grids, objectives and worker processes.
