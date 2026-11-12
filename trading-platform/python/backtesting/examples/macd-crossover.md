# MACD Crossover

MACD (moving average convergence divergence) measures momentum. The MACD line is the gap between a 12-day and a 26-day EMA (an EMA, exponential moving average, is the average closing price of the last few days, with the recent days counting more). Its signal line is a 9-day EMA of that gap. When the MACD line crosses above its signal line, momentum has turned up; when it crosses back below, momentum has turned down. Traders use it to time entries and exits more quickly than a plain moving average crossover.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the MACD line crosses above its signal line (MACD 12, 26, 9).
* **Exit:** sell when the MACD line crosses back below its signal line.
* **Stop-loss:** none. A stop-loss is an exit that limits the loss of a trade; here the opposite cross is the only exit.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only (it buys, and never sells short).
* **Data:** ICICIBANK (NSE) daily bars from January 2021 to 11 November 2026. A bar is one period of prices, here one trading day, with its open, high, low and close.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class MacdCrossover(bt.Strategy):
    symbol, exchange, interval = "ICICIBANK", "NSE", "D"  # "D": daily bars

    def init(self):
        # ta.macd returns three lines: MACD, signal and histogram (12, 26 and 9 days).
        self.macd, self.signal, self.histogram = self.I(ta.macd, self.close, 12, 26, 9)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < 35:  # wait for 26 + 9 days of history
            return
        if self.position.is_flat and self.macd.crossed_above(self.signal):
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.macd.crossed_below(self.signal):
            self.exit()  # sell everything at the next day's open


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

## Reading it

* `self.position.is_flat` is true while the strategy holds nothing, and `is_long` while it holds shares. Each cross was decided at a session's close and filled at the next session's open (09:15 IST).
* MACD crosses often on daily bars: 51 trades in under six years, and fewer than one in three won. The few long trends paid for the many small losses, which is how most trend strategies make money.
* Each round trip (a buy and its sell) also pays delivery charges, so a strategy that trades this often needs its winners to be large.
* The max drawdown is the largest fall of the account from its highest value.

## Try this

* Only take crosses above the zero line (momentum and trend together): add `and self.macd[-1] > 0` to the entry condition. `self.macd[-1]` is the MACD value at the latest bar.
* Slower settings: `self.I(ta.macd, self.close, 19, 39, 9)`.
* Another stock: `symbol = "AXISBANK"`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
