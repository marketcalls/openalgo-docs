# Supertrend Backtest with yfinance Data

This page backtests a Supertrend trend-following strategy on SBIN with daily bars downloaded by yfinance, using the backtesting engine built into the OpenAlgo Python SDK. No OpenAlgo server or broker login is needed.

yfinance is a separate package (`pip install yfinance`); the OpenAlgo SDK does not depend on it. Its prices are adjusted for splits and bonuses by default (and, with yfinance's default `auto_adjust=True`, for dividends too).

## Rules

* **Entry:** buy when Supertrend (10-day ATR, multiplier 3) shows an uptrend.
* **Exit:** sell when it turns to a downtrend.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery), long only, on SBIN.NS daily bars from yfinance, traded from 1 January 2021 to 11 November 2026. The bars from 2018 to 2020 are downloaded too: the engine works out the Supertrend over them, so it is ready on the first day.

## The code

<!-- requires-network -->
```python
import yfinance as yf

import openalgo.backtest as bt
from openalgo import ta

# Daily bars of SBIN from yfinance, from 2018 so the Supertrend has earlier history
# (yfinance leaves out the end date, hence the 12th), shaped the way the engine reads them.
raw = yf.Ticker("SBIN.NS").history(start="2018-01-01", end="2026-11-12")
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


# The bars before start only warm up the Supertrend; trading begins on 1 January 2021.
result = bt.backtest(SupertrendFollow, data=bars, start="2021-01-01", end="2026-11-11", capital=100_000)

print(result.summary())  # net profit, return, drawdown and trades
trades = result.trade_list()[["entry_time", "exit_time", "entry_price", "exit_price", "net_pnl"]]
print(trades.head().round({"net_pnl": 2}).to_string())  # the first five closed trades
```

<!-- output -->
```text
Net profit   : Rs 52,367.25
Return       : 52.37%
Max drawdown : -27.96%
Trades       : 24 (46% won), 1 still open
                     entry_time                 exit_time  entry_price  exit_price   net_pnl
trade
1     2021-01-04 09:15:00+05:30 2021-01-27 09:15:00+05:30       255.55      253.90   -871.79
2     2021-02-02 09:15:00+05:30 2021-03-18 09:15:00+05:30       285.60      336.65  17308.25
3     2021-05-14 09:15:00+05:30 2021-08-20 09:15:00+05:30       335.45      379.50  14734.58
4     2021-09-16 09:15:00+05:30 2021-11-29 09:15:00+05:30       407.05      429.80   6878.89
5     2022-01-06 09:15:00+05:30 2022-02-25 09:15:00+05:30       446.25      438.95  -2502.06
```

The trades are nearly the same as in the [Supertrend example on OpenAlgo data](backtesting/examples/supertrend.md), 24 closed trades with three of them a few days apart, but the return is higher: yfinance takes the dividends out of past prices, so a holding's dividends show up as price gains. The engine applied delivery charges, slippage and the NSE calendar as usual.

## Next steps

* The shaping step and other symbols: [Backtest on yfinance Data](backtesting/examples/yfinance-data.md).
* More strategies on real data: [Examples](backtesting/examples/README.md).
* Trading the same class through OpenAlgo is planned (`bt.live`); until then, place live orders with the [Python SDK order functions](README.md).
