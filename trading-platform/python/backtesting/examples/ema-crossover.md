# EMA Crossover on Daily Bars

A positional strategy on one stock: buy when the 5-day EMA crosses above the 20-day EMA, sell when it crosses back below. Daily bars, delivery (CNC), the whole capital in each trade, Zerodha charges and the default slippage.

## The complete example

The data step builds synthetic daily bars, one per NSE session from 1 April to 6 November 2026, so the example runs anywhere. The version that loads real bars from OpenAlgo is further down.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

# Data: synthetic daily bars for every NSE session.
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
    """Long while the fast EMA is above the slow EMA."""

    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 5
    slow = 20

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) <= self.slow:  # wait until the slow EMA has warmed up
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # the whole capital, less estimated charges
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCross, data=bars, capital=100_000)

m = result.metrics
print(f"Net profit     Rs {m['net_profit']:,.2f}")
print(f"Total return   {m['total_return']:.2%}   CAGR {m['cagr']:.2%}")
print(f"Max drawdown   {m['max_drawdown']:.2%}")
print(f"Sharpe         {m['sharpe']:.2f}")
print(f"Trades         {m['trades']}, won {m['winning_trades']}, lost {m['losing_trades']}")
print(f"Charges        Rs {m['total_costs']:,.2f}")
print(result.trades[["entry_time", "exit_time", "entry_units", "net_pnl_rupees"]].round(2).to_string(index=False))

result.tearsheet("ema_crossover.html")
```

<!-- output -->
```text
Net profit     Rs 4,688.28
Total return   4.69%   CAGR 7.94%
Max drawdown   -7.20%
Sharpe         0.94
Trades         3, won 2, lost 1
Charges        Rs 728.20
               entry_time                 exit_time  entry_units  net_pnl_rupees
2026-05-26 09:15:00+05:30 2026-06-25 09:15:00+05:30        97.57         2793.84
2026-07-22 09:15:00+05:30 2026-08-20 09:15:00+05:30        95.00        -1126.35
2026-09-11 09:15:00+05:30 2026-10-15 09:15:00+05:30        93.32         3021.56
```

What to look at:

* **Fills at the next open.** Each crossover was decided at a session close and filled at the next session's open (09:15), plus 2 basis points of slippage.
* **Quantity.** `self.buy()` with no quantity uses the whole equity less the estimated charges, so each trade's size changes with the equity (fractional shares by default; pass `quantity_mode="venue"` for whole shares).
* **Charges.** Delivery has no Zerodha brokerage, but STT, stamp duty, exchange charges and the DP charge on each sell still cost about Rs 728 over three round trips.
* **The tearsheet** `ema_crossover.html` has the equity curve, drawdown, monthly returns, the trade list and every assumption.

## The same strategy as conditions

The rules fit in two conditions, so the strategy can also be written without `on_bar`. It then runs entirely in the Rust core and gives exactly the same trades. `self.close.shift(self.slow) > 0` is true once `slow` bars have closed, which replaces the warm-up check.

<!-- continues -->
```python
class EmaCrossRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 5
    slow = 20

    def init(self):
        fast = self.I(ta.ema, self.close, self.fast)
        slow = self.I(ta.ema, self.close, self.slow)
        warmed_up = self.close.shift(self.slow) > 0
        self.entry_when(fast.crossed_above(slow) & warmed_up)
        self.exit_when(fast.crossed_below(slow))


rules = bt.backtest(EmaCrossRules, data=bars, capital=100_000)
print("same fills:", rules.fills.equals(result.fills), "net profit", round(rules.metrics["net_profit"], 2))
```

<!-- output -->
```text
same fills: True net profit 4688.28
```

## With data from OpenAlgo

Replace the data step with your OpenAlgo server. The engine loads SBIN's daily history (from Historify when it holds the whole range, otherwise from your broker), checks it against the NSE calendar and caches it.

<!-- requires-server -->
```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
result = bt.backtest(EmaCross, client, start="2024-10-01", end="2026-10-30", capital=100_000)
print(result)
```

`print(result)` starts with the Assumptions block; check its warnings first (a short history, unverified charge rates before April 2026). Real prices will give different figures from the synthetic ones above.
