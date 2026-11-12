# MACD Crossover

MACD (moving average convergence divergence) is the gap between a 12-day and a 26-day EMA, and its signal line is a 9-day EMA of that gap. When the MACD line crosses above its signal line, momentum has turned up; when it crosses back below, momentum has turned down. Traders use it to time entries and exits more quickly than a plain moving average crossover.

## Rules

* **Entry:** buy when the MACD line crosses above its signal line (MACD 12, 26, 9).
* **Exit:** sell when the MACD line crosses back below its signal line.
* **Stop:** none; the opposite cross is the exit.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery), long only, on ICICIBANK (NSE) daily bars from January 2021 to 11 November 2026.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class MacdCrossover(bt.Strategy):
    symbol, exchange, interval = "ICICIBANK", "NSE", "D"

    def init(self):
        # ta.macd returns three lines: MACD, signal and histogram (12, 26 and 9 days).
        self.macd, self.signal, self.histogram = self.I(ta.macd, self.close, 12, 26, 9)

    def on_bar(self, bar):
        if len(self.close) < 35:  # wait for 26 + 9 days of history
            return
        if self.position.is_flat and self.macd.crossed_above(self.signal):
            self.buy()
        elif self.position.is_long and self.macd.crossed_below(self.signal):
            self.exit()


result = bt.backtest(MacdCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 39,565.21
Return       : 39.57%
Max drawdown : -29.75%
Trades       : 51 (31% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-04-23 09:15:00+05:30 2021-06-07 09:15:00+05:30              570.05             645.05        12888.92
2021-07-07 09:15:00+05:30 2021-07-12 09:15:00+05:30              651.05             645.85        -1166.85
2021-07-13 09:15:00+05:30 2021-07-22 09:15:00+05:30              655.30             652.35         -766.42
2021-07-26 09:15:00+05:30 2021-08-17 09:15:00+05:30              680.15             699.65         2911.09
2021-09-01 09:15:00+05:30 2021-09-14 09:15:00+05:30              727.75             713.10        -2556.43
```

MACD crosses often on daily bars: 51 trades in under six years, and fewer than one in three won. The few long trends paid for the many small losses, which is how most trend strategies make money. Each round trip also pays delivery charges, so a strategy that trades this often needs its winners to be large.

## Try this

* Only take crosses above the zero line (momentum and trend together): add `and self.macd[-1] > 0` to the entry condition.
* Slower settings: `self.I(ta.macd, self.close, 19, 39, 9)`.
* Another stock: `symbol = "AXISBANK"`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
