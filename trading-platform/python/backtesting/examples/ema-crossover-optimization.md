# Optimizing the EMA Crossover

This example sweeps the two EMA lengths of the [EMA crossover](ema-crossover.md) on one period, picks the pair with the best Sharpe ratio, and then checks that pair on the months that followed, which the sweep never saw. It runs the combinations in two worker processes.

Save it as a file (for example `optimize_ema.py`) and run `python optimize_ema.py`: worker processes import the strategy from your file, and the `if __name__ == "__main__":` guard keeps them from starting the sweep again (see [Optimization](../optimization.md#worker-processes-and-windows)).

## The complete example

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

# Data: synthetic daily bars for every NSE session from 1 April to 6 November 2026.
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
    fast = bt.param(5, range(3, 11))  # the default and the values a sweep tries
    slow = bt.param(20, (15, 20, 25, 30))

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
    # 1. Sweep the 8 x 4 grid declared with bt.param on April to July.
    sweep = bt.optimize(
        EmaCross,
        data=bars,
        capital=100_000,
        start="2026-04-01",
        end="2026-07-31",
        objective="sharpe",
        workers=2,
    )
    table = sweep.table.sort_values("objective", ascending=False)
    print(len(table), "combinations; the five best by Sharpe:")
    print(table.head(5).round(3).to_string(index=False))
    print("best:", sweep.best)

    # 2. The Sharpe ratio over both lengths (other parameters at their best values).
    print(sweep.heatmap("fast", "slow").round(2).to_string())

    # 3. The best pair on August to November, which the sweep did not see.
    later = bt.backtest(EmaCross, data=bars, capital=100_000, start="2026-08-01", end="2026-11-06", params=sweep.best)
    default = bt.backtest(EmaCross, data=bars, capital=100_000, start="2026-08-01", end="2026-11-06")
    for name, run in (("best pair", later), ("defaults 5/20", default)):
        m = run.metrics
        print(f"{name:14} out of sample: net profit {m['net_profit']:9.2f}, closed trades {m['trades']}, open {m['open_trades']}")
```

<!-- output -->
```text
32 combinations; the five best by Sharpe:
 fast  slow  net_profit  total_return  max_drawdown  sharpe  trades  objective
    3    15   11198.190         0.112        -0.050   4.010     1.0      4.010
    3    20   11198.190         0.112        -0.050   4.010     1.0      4.010
    4    15   11198.190         0.112        -0.050   4.010     1.0      4.010
    5    15   10254.069         0.103        -0.050   3.708     1.0      3.708
    4    20   10180.780         0.102        -0.051   3.676     1.0      3.676
best: {'fast': 3, 'slow': 15}
fast    3     4     5     6     7     8     9     10
slow
15    4.01  4.01  3.71  3.11  3.11  2.56  2.56  2.19
20    4.01  3.68  3.11  2.56  2.56  2.19  1.24  1.24
25    3.68  2.88  2.56  2.19  1.88  1.24  0.93  0.78
30    2.88  2.88  2.19  1.88  0.93  0.93  0.78  0.30
best pair      out of sample: net profit   4766.04, closed trades 1, open 1
defaults 5/20  out of sample: net profit   1774.16, closed trades 1, open 0
```

## Reading the result

* **The table** has one row per combination with the key figures, so you can sort and filter it like any DataFrame. `sweep.best` is the row with the highest objective; a tie goes to the first in grid order, which is why (3, 15) wins over (3, 20) and (4, 15) here.
* **Count the trades.** On four months of these synthetic bars every combination closed a single trade, so the ranking says little. Real data over a longer period gives a table worth reading; a Sharpe ratio built on one trade is not evidence.
* **The heatmap** shows whether the best pair sits in a stable region or on an isolated peak. Neighbouring cells with similar values are a better sign than one bright cell at the edge of the grid.
* **The out-of-sample check** is the honest number. A pair chosen on one period often does worse on the next; when it does much worse, the sweep fitted noise. Note also that a run starting on 1 August spends its first `slow` sessions warming up the EMAs, so a short test window holds few trades.
* `sweep.select(**sweep.best)` returns the full `Result` of the best combination (trades, equity, tearsheet), bit for bit what the sweep computed.

Walk-forward testing, which repeats this sweep-then-test cycle over many windows automatically, is [planned](../walk-forward.md).

## With data from OpenAlgo

<!-- requires-server -->
```python
from openalgo import api

if __name__ == "__main__":
    client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
    sweep = bt.optimize(EmaCross, client, start="2024-10-01", end="2025-12-31", capital=100_000,
                        objective="sharpe")
    later = bt.backtest(EmaCross, client, start="2026-01-01", end="2026-10-30", capital=100_000,
                        params=sweep.best)
    print(sweep.best, later.metrics["sharpe"])
```

The bars are loaded once for the whole sweep (and cached), and every worker reuses them.
