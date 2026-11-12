# EMA Crossover

The moving average crossover is the classic first trend strategy. When a short average of closing prices rises above a longer one, the price has started to trend up; when it falls back below, the trend has faded. Swing traders use it on daily charts to ride moves that last weeks or months and to stay out of long falls.

## Rules

* **Entry:** buy when the 20-day EMA crosses above the 50-day EMA.
* **Exit:** sell when the 20-day EMA crosses back below the 50-day EMA.
* **Stop:** none; the opposite crossover is the exit.
* **Size:** all the capital (Rs 1,00,000 at the start), the engine default.
* **Product:** CNC (delivery), long only, on RELIANCE (NSE) daily bars from January 2021 to 11 November 2026.

A delivery (CNC) short is not allowed in the Indian cash market, and the engine rejects one (reject code `product_rule`). Short selling is intraday (MIS) only, as in the [opening range breakout](opening-range-breakout.md).

## The code

Replace `your_api_key` with the API key from your OpenAlgo dashboard.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # daily bars
    fast = 20  # days
    slow = 50

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

```text
Net profit   : Rs -7,606.60
Return       : -7.61%
Max drawdown : -24.59%
Trades       : 15 (33% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-06-01 09:15:00+05:30 2021-07-29 09:15:00+05:30             1032.55             978.70        -5441.20
2021-08-16 09:15:00+05:30 2021-12-01 09:15:00+05:30             1024.65            1159.35        12177.49
2022-01-14 09:15:00+05:30 2022-01-31 09:15:00+05:30             1208.45            1124.65        -7637.70
2022-03-23 09:15:00+05:30 2022-06-27 09:15:00+05:30             1202.70            1212.65          582.47
2022-08-12 09:15:00+05:30 2022-09-22 09:15:00+05:30             1234.75            1184.55        -4280.45
```

Each crossover was decided at a session's close and filled at the next session's open (09:15 IST). The engine applied the defaults for Indian markets without being asked: Zerodha delivery charges at each trade date's rates, 2 basis points of slippage, and NSE session times and holidays. On RELIANCE over these six years the crossover lost money: one good trend (August to December 2021) did not pay for the many false starts.

Python may also print an `UnverifiedScheduleWarning`: some charge rates of the period are not yet verified against their source. The backtest is complete; `result.warnings` lists the fills it affects.

## Try this

* Another stock: `symbol = "TCS"`.
* Another period: `start="2023-01-01"`.
* Faster averages, without editing the class: `bt.backtest(..., params={"fast": 10, "slow": 30})`.
* A stop loss 5 percent below the entry: `self.buy(stop=bt.pct(5))`. On a CNC position the engine holds it as a GTT order, the way your broker would hold it overnight.
* The full report in your browser: `result.tearsheet("ema_crossover.html")`.

More: [Writing Strategies](../writing-strategies.md), [Orders and Risk](../orders-and-risk.md), [Results and Reports](../results-and-reports.md).
