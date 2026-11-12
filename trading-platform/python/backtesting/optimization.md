# Optimization

Every strategy has numbers someone chose, such as the 10 and 30 of a 10-day and 30-day EMA crossover. `bt.optimize` runs one strategy over a grid of parameter values and ranks the combinations, so you can see which values worked best in the past. Every combination is an ordinary backtest with the same charges, slippage and rules, so its row in the table is exactly what `bt.backtest` gives for those values.

A **parameter** is a class attribute with a number (or text, or true/false) default, such as `fast = 10`. The **grid** is every combination of the values you list: 3 values of `fast` and 3 of `slow` make 9 backtests.

## A first sweep

Save this as a file (for example `sweep.py`) and run it with `python sweep.py`. Put your own API key from the OpenAlgo dashboard in place of `OPENALGO_API_KEY`. The `if __name__ == "__main__":` line matters: the sweep starts worker processes, and each one imports your file (see [Worker processes](#worker-processes-and-windows)).

The strategy is an EMA crossover on SBIN daily bars (an **EMA** is a moving average of closing prices that weighs recent days more): buy when the fast EMA crosses above the slow one, sell when it crosses back below. The sweep tries three fast and three slow lengths over January 2021 to 11 November 2026.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 10  # parameters: the optimizer changes these
    slow = 30

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


if __name__ == "__main__":  # needed: worker processes import this file
    sweep = bt.optimize(
        EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000,
        fast=(5, 10, 20),   # the values to try for each parameter
        slow=(30, 50, 100),
        workers=2,          # worker processes; leave it out to use every CPU core
    )
    print(sweep.table.round(2).to_string(index=False))
    print("best:", sweep.best)
```

<!-- output -->
```text
 fast  slow  net_profit  total_return  max_drawdown  sharpe  trades  objective
    5    30    99261.99          0.99         -0.26    0.72      28   99261.99
    5    50    74666.79          0.75         -0.28    0.59      23   74666.79
    5   100    25352.11          0.25         -0.29    0.30      17   25352.11
   10    30    71912.03          0.72         -0.24    0.58      23   71912.03
   10    50    58861.35          0.59         -0.27    0.50      19   58861.35
   10   100    18377.18          0.18         -0.28    0.25      14   18377.18
   20    30    54755.14          0.55         -0.26    0.48      17   54755.14
   20    50    53267.29          0.53         -0.30    0.46      11   53267.29
   20   100    26271.64          0.26         -0.27    0.31       9   26271.64
best: {'fast': 5, 'slow': 30}
```

`sweep.table` has one row per combination; `max_drawdown` and `total_return` are fractions (-0.25 is 25 percent). `sweep.best` is the combination with the highest objective, net profit unless you choose another.

## The grid

* Name a parameter in the call with the values to try: `fast=(5, 10, 20)` or `fast=range(5, 30, 5)`.
* Or declare the values on the class with `bt.param(default, values)`: `fast = bt.param(10, (5, 10, 20))`. Values named in the call replace the declared ones.
* `params={"slow": 50}` fixes a parameter out of the grid.
* Every combination of the values is run, in the order the class declares its parameters. A name that is neither a parameter nor a `bt.backtest` argument is an error.
* Every other keyword is a `bt.backtest` argument (`start=`, `end=`, `capital=`, `costs=`, ...) and is the same for every combination; `capital=` is required, as for `bt.backtest`. With `benchmark=`, its closes are read once and every combination is measured against the same benchmark, so `objective="information_ratio"` or `"alpha"` compares like with like.

## The objective

`objective=` decides what "best" means:

* The name of any [metric](metric-definitions.md): `"net_profit"` (the default), `"sharpe"`, `"sortino"`, `"calmar"`, `"cagr"`, `"total_return"`, `"profit_factor"`, `"expectancy"`, `"win_rate"` and so on.
* Or a function that takes a `Result` and returns a number, passed as `objective=profit_per_drawdown`. Define it with `def` at the top level of your file, so worker processes can import it (a `lambda` cannot be imported).

`maximize=False` picks the lowest value instead, for a figure where lower is better such as `objective="ulcer_index"`. Drawdowns are negative numbers, so the shallowest drawdown is the highest `max_drawdown` and needs the default `maximize=True`.

The same grid ranked by the Sharpe ratio (return per unit of day-to-day swings) instead of net profit:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    by_sharpe = bt.optimize(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                            fast=(5, 10, 20), slow=(30, 50, 100), objective="sharpe", workers=2)
    print("best by Sharpe:", by_sharpe.best)
```

<!-- output -->
```text
best by Sharpe: {'fast': 5, 'slow': 30}
```

On SBIN over these years the fastest pair also had the best Sharpe ratio, so the winner did not change.

Your own measure, net profit per rupee of the deepest fall, as a function defined at the top level of the file:

<!-- continues -->
<!-- requires-server -->
```python
def profit_per_drawdown(result):
    """Net profit per rupee of the deepest fall in P&L."""
    return result.metrics["net_profit"] / -result.metrics["max_drawdown_amount"]  # the amount is negative


if __name__ == "__main__":
    by_own_measure = bt.optimize(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                                 fast=(5, 10, 20), slow=(30, 50, 100), objective=profit_per_drawdown, workers=2)
    print("best by profit per drawdown:", by_own_measure.best)
```

<!-- output -->
```text
best by profit per drawdown: {'fast': 5, 'slow': 30}
```

## OptimizeResult

| Attribute | What it is |
|---|---|
| `.table` | One row per combination, in grid order: the parameter values, `net_profit`, `total_return`, `max_drawdown`, `sharpe`, `trades` and `objective` |
| `.best` | The parameters of the combination with the highest objective (lowest with `maximize=False`). A tie goes to the first in grid order, and a NaN objective is never best |
| `.select(**params)` | The full `Result` of one combination, run again in your process; bit for bit what the sweep computed |
| `.heatmap(x, y)` | The objective with `x` values as columns and `y` values as rows; other parameters held at their best values |
| `.objective` | The objective's name |
| `.plan` | The line reported before the sweep started: combinations, processes and the time estimate |
| `.path` | How each combination was evaluated |

The first sweep's net profit as a grid, fast lengths across and slow lengths down:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    print(sweep.heatmap("fast", "slow").round(0))
```

<!-- output -->
```text
fast       5        10       20
slow
30    99262.0  71912.0  54755.0
50    74667.0  58861.0  53267.0
100   25352.0  18377.0  26272.0
```

Every pair made money over these years, and profit fell steadily as the averages got slower: a smooth picture in which neighbouring cells agree, rather than a lone peak.

The full backtest of the best combination, with its trades:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    best = sweep.select(**sweep.best)
    print("net profit", round(best.metrics["net_profit"], 2), "in", best.metrics["trades"], "trades")
    print(best.trades[["entry_time", "exit_time", "net_pnl_rupees"]].head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
net profit 99261.99 in 28 trades
               entry_time                 exit_time  net_pnl_rupees
2021-05-07 09:15:00+05:30 2021-08-17 09:15:00+05:30        18497.59
2021-09-03 09:15:00+05:30 2021-11-24 09:15:00+05:30        17358.54
2021-12-15 09:15:00+05:30 2021-12-16 09:15:00+05:30         -830.13
```

`select` returns the same `Result` that `bt.backtest` gives, so its trades, equity curve and `tearsheet()` are all there.

## How a sweep runs

1. The data is loaded and the settings resolved **once** for the whole sweep.
2. The first combination runs in your process. It also runs the look-ahead checks of the indicators, once for the whole sweep (the checks do not depend on parameter values). Its duration gives the time estimate.
3. Before the rest starts, the plan line (how many combinations, in how many processes, and the estimate) goes to `progress=` (a function taking one line of text, such as `print`) or, without one, to the `openalgo.backtest.optimize` logger at INFO level.
4. The other combinations run in `workers` processes (the number of CPUs by default), or in your process with `workers=1`. The table is the same whatever the number of workers.

The plan line of the first sweep, kept on the result:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    print(sweep.plan.split(". The first")[0])
```

<!-- output -->
```text
bt.optimize: 9 combinations of EmaCross on the event path (on_bar runs in Python for every strategy bar), in 2 worker processes
```

A strategy with `on_bar` makes one Python call per bar in every combination, which suits grids of hundreds to a few thousand combinations. A [condition strategy](writing-strategies.md#condition-strategies) runs without a Python call per bar and sweeps faster. The plan line suggests the condition form for grids above 1,000 combinations.

## Worker processes and Windows

Worker processes start the way Windows requires on every platform (a fresh Python that imports your code), so a sweep behaves the same on Windows, macOS and Linux. That has three consequences:

* **Put the strategy in a file.** A worker imports the strategy class (and a custom objective function) from its module. A class defined in a notebook, in an interactive session or inside a function cannot be imported. The sweep then stops with a `ConfigError` that tells you to move it into a `.py` file, to install `cloudpickle` (used automatically when present), or to pass `workers=1`.
* **Guard the script.** Run the sweep under `if __name__ == "__main__":`, or every worker would start the sweep again when it imports your file.
* **Some settings keep the sweep in your process.** A run with its own `calendar=`, or with a cost preset object such as `costs=bt.costs.flat(20)` or a `bt.costs.CostModel`, cannot be sent to a worker; the sweep then runs every combination in your process and the plan line says why. Preset names such as `costs="zerodha"` work in workers.

## A word on overfitting

The best row of a grid is the best fit to the past, not a forecast. Prefer a region of the heatmap where neighbours agree, test the chosen values on a period the sweep did not see, and keep the number of parameters small. [Tuning a Strategy](examples/ema-crossover-optimization.md) does this step by step: it optimizes on 2021 to 2024 and checks the winner on 2025 and 2026. Walk-forward testing, which automates this, is [planned](walk-forward.md).
