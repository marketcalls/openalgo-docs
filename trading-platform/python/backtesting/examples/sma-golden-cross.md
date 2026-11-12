# SMA Golden Cross

The golden cross is the long-term trend signal that positional traders and investors watch: the 50-day simple moving average (SMA) moving above the 200-day. It is slow by design. It trades a few times in several years, stays in through long uptrends and steps aside when the 50-day falls back below the 200-day (the death cross).

## Rules

* **Entry:** buy when the 50-day SMA crosses above the 200-day SMA.
* **Exit:** sell when the 50-day SMA crosses back below the 200-day SMA.
* **Stop:** none; the death cross is the exit.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery), long only, on HDFCBANK (NSE) daily bars from January 2021 to 11 November 2026.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class GoldenCross(bt.Strategy):
    symbol, exchange, interval = "HDFCBANK", "NSE", "D"

    def init(self):
        self.sma50 = self.I(ta.sma, self.close, 50)
        self.sma200 = self.I(ta.sma, self.close, 200)

    def on_bar(self, bar):
        if self.position.is_flat and self.sma50.crossed_above(self.sma200):
            self.buy()  # golden cross: the 50-day average moves above the 200-day
        elif self.position.is_long and self.sma50.crossed_below(self.sma200):
            self.exit()  # death cross: it moves back below


result = bt.backtest(GoldenCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

```text
Net profit   : Rs 5,433.79
Return       : 5.43%
Max drawdown : -13.51%
Trades       : 3 (67% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2022-09-15 09:15:00+05:30 2023-09-20 09:15:00+05:30              765.20             799.30         4208.89
2024-06-26 09:15:00+05:30 2025-03-17 09:15:00+05:30              854.20             852.30         -478.19
2025-03-26 09:15:00+05:30 2026-01-29 09:15:00+05:30              912.70             929.90         1704.63
```

Three trades in almost six years, each held for months. A 200-day average needs 200 sessions before it has a value, so no trade can come in the first ten months of a run: here the first golden cross after that was in September 2022. The prices are adjusted for the 1:1 bonus of August 2025, so they are about half the quoted prices before it.

## Try this

* Another stock: `symbol = "SBIN"`.
* Price above its 200-day average instead of the cross: buy on `self.close.crossed_above(self.sma200)`, sell on `self.close.crossed_below(self.sma200)`.
* Exponential averages: `ta.ema` in place of `ta.sma`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
