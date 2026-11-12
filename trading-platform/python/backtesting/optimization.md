# Optimization

`bt.optimize` runs one strategy many times, once for every combination of the parameter values you list, and ranks the results. Each combination is an ordinary backtest with the same charges, slippage and rules, so you see which values would have worked best in the past.

## A first sweep

A **parameter** is a setting of the strategy with a default, such as `fast = 20`. The strategy is the EMA crossover on SBIN daily bars: buy when the fast EMA (an average of closing prices that weighs recent days more) crosses above the slow EMA, sell when it crosses back below. The sweep tries three fast and three slow lengths: 3 x 3 = 9 backtests.

Save the code as a file, for example `sweep.py`, and run it with `python sweep.py` (the next section says why). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the price history comes from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles settings and functions; inside it, "self" is the strategy itself.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # parameters: the sweep changes these
    slow = 50

    # init runs once, before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: buy, sell or wait.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything held


# The sweep runs only when you run this file itself (see the next section).
if __name__ == "__main__":
    sweep = bt.optimize(
        EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
        fast=(5, 10, 20),  # the values to try for each parameter
        slow=(30, 50, 100),
        workers=2,  # how many backtests run at once; leave it out to use every CPU core
    )
    print(sweep.table.round(2).to_string(index=False))  # one row per combination
    print("best:", sweep.best)

    # The full backtest of the best values. "**" passes the dict as fast=..., slow=...
    best = sweep.select(**sweep.best)
    m = best.metrics  # a dict: the figures of the run, looked up by name
    # f"..." fills in each {value}: ":,.2f" is rupees with commas, ":.2%" a percent.
    print(f"Net profit   : Rs {m['net_profit']:,.2f}")
    print(f"Return       : {m['total_return']:.2%}")
    print(f"Max drawdown : {m['max_drawdown']:.2%}")
    print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
 fast  slow  net_profit  total_return  max_drawdown  sharpe  trades  objective
    5    30    99262.54          0.99         -0.26    0.72      28   99262.54
    5    50    74667.11          0.75         -0.28    0.59      23   74667.11
    5   100    25352.21          0.25         -0.29    0.30      17   25352.21
   10    30    71912.31          0.72         -0.24    0.58      23   71912.31
   10    50    58861.66          0.59         -0.27    0.50      19   58861.66
   10   100    18377.28          0.18         -0.28    0.25      14   18377.28
   20    30    54755.41          0.55         -0.26    0.48      17   54755.41
   20    50    53267.48          0.53         -0.30    0.46      11   53267.48
   20   100    26271.69          0.26         -0.27    0.31       9   26271.69
best: {'fast': 5, 'slow': 30}
Net profit   : Rs 99,262.54
Return       : 99.26%
Max drawdown : -25.52%
Trades       : 28 (39% won)
```

Reading it:

* `sweep.table` has one row per combination. `total_return` and `max_drawdown` are fractions: 0.53 is 53 percent. The **max drawdown** is the largest fall of the account from its highest value; the **Sharpe** ratio is the return per unit of day-to-day swings. `objective` is the figure the sweep ranks by, net profit by default.
* `sweep.best` is the combination with the highest objective.
* `sweep.select(...)` gives the full result of one combination, exactly what `bt.backtest` gives for those values, with its trades and report.

## Why must a sweep run from a file?

A sweep runs several backtests at once, each in a **worker process** (a separate copy of Python). Each worker reads your file to find the strategy class. `if __name__ == "__main__":` is true only in the copy you started, so the workers find the class without starting the sweep again.

* Run the sweep from a `.py` file. A class written in a notebook or typed at the Python prompt cannot be found by a worker; the sweep then stops with a `ConfigError` that tells you to move it into a file, or to pass `workers=1`.
* `workers=1` runs every combination in your own process, one after another: slower, but it works anywhere, notebooks included. The table is the same whatever the number of workers.

## How do I choose the values to try?

* Name each parameter with its values: `fast=(5, 10, 20)` (a tuple: values in round brackets), or `fast=range(5, 30, 5)` for 5, 10, 15, 20 and 25.
* Every combination runs, so the count multiplies: 5 fast values and 4 slow values are 20 backtests.
* `params={"slow": 50}` holds a parameter at one value while the others vary.
* Every other keyword is a `bt.backtest` argument (`start=`, `end=`, `capital=`, `costs=` and so on) and is the same for every combination. `capital=` is required.
* A name that is neither a parameter of the class nor a `bt.backtest` argument is an error, so a typing mistake cannot pass silently.

## How do I rank by something other than net profit?

Pass `objective=` with the name of any [metric](metric-definitions.md), such as `"sharpe"`, `"calmar"`, `"profit_factor"` or `"win_rate"`. The highest wins.

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    # The same 9 combinations, ranked by the Sharpe ratio instead of net profit.
    by_sharpe = bt.optimize(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                            fast=(5, 10, 20), slow=(30, 50, 100), objective="sharpe", workers=2)
    print("best by Sharpe:", by_sharpe.best)
```

<!-- output -->
```text
best by Sharpe: {'fast': 5, 'slow': 30}
```

On SBIN over these years the same pair also had the best Sharpe ratio, so the winner did not change.

## How do I see the results as a grid?

`sweep.heatmap("fast", "slow")` lays the objective out as a table: one column per fast value and one row per slow value.

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    # Net profit of each pair, rounded to the rupee: fast across, slow down.
    print(sweep.heatmap("fast", "slow").round(0))
```

<!-- output -->
```text
fast       5        10       20
slow
30    99263.0  71912.0  54755.0
50    74667.0  58862.0  53267.0
100   25352.0  18377.0  26272.0
```

Every pair made money over these years, and the profit fell as the averages got slower. Neighbouring cells agree, which is a better sign than one lone high number surrounded by poor ones.

## Should I trade the best values?

Not without a further test. The best row is the best fit to the past, not a forecast, and with enough combinations one will look good by luck. Prefer values whose neighbours in the grid also did well, keep the number of parameters small, and check the chosen values on years the sweep did not see. The [lesson on finding better settings](tutorial/09-find-better-settings.md) and [Tuning a Strategy](examples/ema-crossover-optimization.md) do this step by step: they optimize on 2021 to 2024 and check the winner on 2025 and 2026. Walk-forward testing, which automates this, is [planned](walk-forward.md).

## More options

* **Your own objective:** `objective=profit_per_drawdown`, a function that takes a result and returns a number, defined with `def` at the top level of the file (not a `lambda`).
* **Lower is better:** `maximize=False` picks the lowest objective, for a figure such as `"ulcer_index"`.
* **Values on the class:** `fast = bt.param(20, (5, 10, 20))`; values named in the call replace them.
* **A benchmark:** with `benchmark=`, `objective="alpha"` or `"information_ratio"` ranks against it.
* **The result:** `.table`, `.best`, `.select(**params)`, `.heatmap(x, y)`, `.objective`, `.plan` (the line reported before the sweep) and `.path`.
* **Progress:** `progress=print` prints the plan line (combinations, processes, time estimate) before the sweep starts.
* **Faster sweeps:** a [condition strategy](writing-strategies.md#can-i-write-the-rules-as-conditions) makes no Python call per bar and sweeps much faster.
* **Notebooks:** with the `cloudpickle` package installed, a class defined in a notebook can go to the workers.
* **Kept in your process:** your own `calendar=` or a cost object such as `bt.costs.flat(20)` cannot go to a worker, so the sweep runs in your process and the plan line says why.
