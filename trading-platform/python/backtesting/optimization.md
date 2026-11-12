# Optimization

`bt.optimize` runs one strategy over a grid of parameter values and ranks the combinations. Every combination is an ordinary backtest with the same charges, slippage and rules, so its row in the table is exactly what `bt.backtest` gives for those values.

## A first sweep

Save this as a file (for example `sweep.py`) and run it with `python sweep.py`. The `if __name__ == "__main__":` line matters: the sweep starts worker processes, and each one imports your file (see [Worker processes](#worker-processes-and-windows)).

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

sessions = bt.calendar.default_calendar().sessions("NSE", "2026-04-01", "2026-11-06")
k = np.arange(len(sessions))
close = (1000 + k + 60 * np.sin(k / 6) + 10 * np.sin(k / 1.3)).round(1)
open_ = (close - 4 * np.sin(1.3 * k)).round(1)
bars = pd.DataFrame(
    {
        "open": open_,
        "high": np.maximum(open_, close) + 6,
        "low": np.minimum(open_, close) - 6,
        "close": close,
        "volume": 50_000,
    },
    index=pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata"),
)


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 5
    slow = 20

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) <= self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


if __name__ == "__main__":
    sweep = bt.optimize(
        EmaCross,
        data=bars,
        capital=100_000,
        fast=(3, 5, 8),
        slow=(15, 20, 30),
        workers=2,
    )
    print(sweep.plan.split(". The first")[0])
    print(sweep.table.round(4).to_string(index=False))
    print("best:", sweep.best)
    print(sweep.heatmap("fast", "slow").round(2))
```

<!-- output -->
```text
bt.optimize: 9 combinations of EmaCross on the event path (on_bar runs in Python for every strategy bar), in 2 worker processes
 fast  slow  net_profit  total_return  max_drawdown  sharpe  trades  objective
    3    15  11917.4807        0.1192       -0.0569  2.2614     3.0 11917.4807
    3    20   9776.3443        0.0978       -0.0666  1.8458     3.0  9776.3443
    3    30   2233.4292        0.0223       -0.0773  0.4600     3.0  2233.4292
    5    15   8894.3854        0.0889       -0.0638  1.7006     3.0  8894.3854
    5    20   4688.2800        0.0469       -0.0720  0.9370     3.0  4688.2800
    5    30    -60.6900       -0.0006       -0.0824  0.0327     3.0   -60.6900
    8    15   3326.1000        0.0333       -0.0720  0.6789     3.0  3326.1000
    8    20  -1222.9600       -0.0122       -0.0824 -0.1885     3.0 -1222.9600
    8    30  -8095.1100       -0.0810       -0.1412 -1.5416     3.0 -8095.1100
best: {'fast': 3, 'slow': 15}
fast         3        5        8
slow
15    11917.48  8894.39  3326.10
20     9776.34  4688.28 -1222.96
30     2233.43   -60.69 -8095.11
```

## The grid

* Name a parameter in the call with the values to try: `fast=(3, 5, 8)` or `fast=range(5, 30, 5)`.
* Or declare the values on the class with `bt.param(default, values)`: `fast = bt.param(5, (3, 5, 8))`. Values named in the call replace the declared ones.
* `params={"slow": 20}` fixes a parameter out of the grid.
* Every combination of the values is run, in the order the class declares its parameters. A name that is neither a parameter nor a `bt.backtest` argument is an error.
* Every other keyword is a `bt.backtest` argument (`data=`, `capital=`, `costs=`, `start=`, ...) and is the same for every combination; `capital=` is required, as for `bt.backtest`. With `benchmark=`, its closes are read once and every combination is measured against the same benchmark, so `objective="information_ratio"` or `"alpha"` compares like with like.

## The objective

`objective=` decides what "best" means:

* The name of any [metric](metric-definitions.md): `"net_profit"` (the default), `"sharpe"`, `"sortino"`, `"calmar"`, `"cagr"`, `"total_return"`, `"profit_factor"`, `"expectancy"`, `"win_rate"` and so on.
* Or a function that takes a `Result` and returns a number, passed as `objective=profit_per_drawdown`. Define it with `def` at the top level of your file, so worker processes can import it (a `lambda` cannot be imported).

<!-- continues -->
```python
def profit_per_drawdown(result):
    """Net profit per rupee of the deepest fall in P&L."""
    return result.metrics["net_profit"] / -result.metrics["max_drawdown_amount"]  # the amount is negative
```

`maximize=False` picks the lowest value instead, for a figure where lower is better such as `objective="ulcer_index"`. Drawdowns are negative numbers, so the shallowest drawdown is the highest `max_drawdown` and needs the default `maximize=True`.

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

<!-- continues -->
```python
if __name__ == "__main__":
    best = sweep.select(**sweep.best)
    print("best net profit:", round(best.metrics["net_profit"], 2), "with", len(best.trades), "trades")

    by_sharpe = bt.optimize(EmaCross, data=bars, capital=100_000, fast=(3, 5, 8), slow=(15, 20, 30),
                            objective="sharpe", workers=2)
    print("best by Sharpe:", by_sharpe.best)

    by_own_measure = bt.optimize(EmaCross, data=bars, capital=100_000, fast=(3, 5, 8), slow=(15, 20, 30),
                                 objective=profit_per_drawdown, workers=2)
    print("best by profit per drawdown:", by_own_measure.best)
```

<!-- output -->
```text
best net profit: 11917.48 with 3 trades
best by Sharpe: {'fast': 3, 'slow': 15}
best by profit per drawdown: {'fast': 3, 'slow': 15}
```

## How a sweep runs

1. The data is loaded and the settings resolved **once** for the whole sweep.
2. The first combination runs in your process. It also runs the look-ahead checks of the indicators, once for the whole sweep (the checks do not depend on parameter values). Its duration gives the time estimate.
3. Before the rest starts, the plan line (how many combinations, in how many processes, and the estimate) goes to `progress=` (a function taking one line of text, such as `print`) or, without one, to the `openalgo.backtest.optimize` logger at INFO level.
4. The other combinations run in `workers` processes (the number of CPUs by default), or in your process with `workers=1`. The table is the same whatever the number of workers.

A strategy with `on_bar` makes one Python call per bar in every combination, which suits grids of hundreds to a few thousand combinations. A [condition strategy](writing-strategies.md#condition-strategies) runs without a Python call per bar and sweeps faster. The plan line suggests the condition form for grids above 1,000 combinations.

## Worker processes and Windows

Worker processes start the way Windows requires on every platform (a fresh Python that imports your code), so a sweep behaves the same on Windows, macOS and Linux. That has three consequences:

* **Put the strategy in a file.** A worker imports the strategy class (and a custom objective function) from its module. A class defined in a notebook, in an interactive session or inside a function cannot be imported. The sweep then stops with a `ConfigError` that tells you to move it into a `.py` file, to install `cloudpickle` (used automatically when present), or to pass `workers=1`.
* **Guard the script.** Run the sweep under `if __name__ == "__main__":`, or every worker would start the sweep again when it imports your file.
* **Some settings keep the sweep in your process.** A run with its own `calendar=`, or with a cost preset object such as `costs=bt.costs.flat(20)` or a `bt.costs.CostModel`, cannot be sent to a worker; the sweep then runs every combination in your process and the plan line says why. Preset names such as `costs="zerodha"` work in workers.

## A word on overfitting

The best row of a grid is the best fit to the past, not a forecast. In the sweep above the best pair sits at the edge of the grid (the fastest EMAs tried), and neighbouring values give very different results: a sign that the edge is fragile. Prefer a region of the heatmap where neighbours agree, test the chosen values on a period the sweep did not see, and keep the number of parameters small. Walk-forward testing, which automates this, is [planned](walk-forward.md).
