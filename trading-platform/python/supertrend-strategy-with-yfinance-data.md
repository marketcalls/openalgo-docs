# Supertrend Backtest with yfinance Data

This page backtests a Supertrend trend-following strategy on SBIN with daily bars downloaded by yfinance, using the backtesting engine built into the OpenAlgo Python SDK. No OpenAlgo server or broker login is needed.

yfinance is a separate package (`pip install yfinance`); the OpenAlgo SDK does not depend on it. Yahoo prices are adjusted for splits and bonuses by default (and, with yfinance's default `auto_adjust=True`, for dividends too).

## Rules

* **Entry:** buy when Supertrend (10-day ATR, multiplier 3) shows an uptrend.
* **Exit:** sell when it turns to a downtrend.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery), long only, on Yahoo's SBIN.NS daily bars from January 2021 to 11 November 2026.

## The code

<!-- requires-network -->
```python
import yfinance as yf

import openalgo.backtest as bt
from openalgo import ta

# Daily bars of SBIN from Yahoo Finance, shaped the way the engine reads them.
raw = yf.Ticker("SBIN.NS").history(start="2021-01-01", end="2026-11-12")
bars = raw[["Open", "High", "Low", "Close", "Volume"]].rename(columns=str.lower)
bars.index = bars.index.tz_convert("Asia/Kolkata")


class SupertrendFollow(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    period = 10  # days of ATR
    multiplier = 3

    def init(self):
        self.line, self.direction = self.I(ta.supertrend, self.high, self.low, self.close, self.period, self.multiplier)

    def on_bar(self, bar):
        uptrend = self.direction[-1] < 0  # -1 means the price is above the Supertrend line
        if self.position.is_flat and uptrend:
            self.buy()
        elif self.position.is_long and not uptrend:
            self.exit()


result = bt.backtest(SupertrendFollow, data=bars, capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

```text
Net profit   : Rs 54,567.46
Return       : 54.57%
Max drawdown : -28.46%
Trades       : 23 (48% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-02-02 09:15:00+05:30 2021-03-18 09:15:00+05:30              285.60             336.65        17597.35
2021-05-14 09:15:00+05:30 2021-08-20 09:15:00+05:30              335.45             379.50        15131.38
2021-09-16 09:15:00+05:30 2021-11-29 09:15:00+05:30              407.05             429.80         7091.40
2022-01-06 09:15:00+05:30 2022-02-25 09:15:00+05:30              446.25             438.95        -2608.19
2022-03-17 09:15:00+05:30 2022-05-05 09:15:00+05:30              456.60             443.55        -4233.12
```

The trades are the same as in the [Supertrend example on OpenAlgo data](backtesting/examples/supertrend.md), but the return is higher: Yahoo takes the dividends out of past prices, so a holding's dividends show up as price gains. The engine applied delivery charges, slippage and the NSE calendar as usual.

## Next steps

* The shaping step and other symbols: [Backtest on yfinance Data](backtesting/examples/yfinance-data.md).
* More strategies on real data: [Examples](backtesting/examples/README.md).
* Trading the same class through OpenAlgo is planned (`bt.live`); until then, place live orders with the [Python SDK order functions](README.md).
