# Backtest on yfinance Data

You can backtest without an OpenAlgo server: download daily bars with yfinance, shape them into the DataFrame the engine reads, and pass it with `data=`. This page runs the [EMA crossover](ema-crossover.md) on RELIANCE this way.

yfinance is a separate package (`pip install yfinance`); the OpenAlgo SDK does not depend on it. Yahoo prices are adjusted for splits and bonuses by default (and, with yfinance's default `auto_adjust=True`, for dividends too), so they differ a little from OpenAlgo's history.

## Rules

* **Entry and exit:** buy when the 20-day EMA crosses above the 50-day, sell when it crosses back below.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery), long only, on Yahoo's RELIANCE.NS daily bars from January 2021 to 11 November 2026.

## The code

The engine needs three things from your data: the columns `open`, `high`, `low`, `close` and `volume`, and a time index in IST (or any time zone it can convert). Yahoo's columns are capitalised and come with dividend and split columns, so step 2 keeps the five price columns and names them in lower case.

<!-- requires-network -->
```python
import yfinance as yf

import openalgo.backtest as bt
from openalgo import ta

# 1. Daily bars of RELIANCE from Yahoo Finance (the end date is not included).
raw = yf.Ticker("RELIANCE.NS").history(start="2021-01-01", end="2026-11-12")

# 2. The columns the engine reads, with an IST time index.
bars = raw[["Open", "High", "Low", "Close", "Volume"]].rename(columns=str.lower)
bars.index = bars.index.tz_convert("Asia/Kolkata")
print(bars.head(3).round(2).to_string())


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"
    fast = 20
    slow = 50

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# 3. The same backtest as with OpenAlgo data, on the downloaded bars: no server needed.
result = bt.backtest(EmaCrossover, data=bars, capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

```text
                             open    high     low   close    volume
Date
2021-01-01 00:00:00+05:30  897.27  901.33  894.56  897.05  10015175
2021-01-04 00:00:00+05:30  900.48  902.19  888.25  898.56  24513534
2021-01-05 00:00:00+05:30  888.70  895.29  882.83  887.39  24123091
Net profit   : Rs -4,218.02
Return       : -4.22%
Max drawdown : -24.33%
Trades       : 15 (33% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-06-01 09:15:00+05:30 2021-07-30 09:15:00+05:30              977.85             931.90        -4926.19
2021-08-13 09:15:00+05:30 2021-12-01 09:15:00+05:30              959.20            1101.70        13866.28
2022-01-14 09:15:00+05:30 2022-01-31 09:15:00+05:30             1148.40            1068.75        -7796.44
2022-03-23 09:15:00+05:30 2022-06-27 09:15:00+05:30             1142.95            1152.40          594.31
2022-08-12 09:15:00+05:30 2022-09-23 09:15:00+05:30             1173.45            1128.90        -4095.34
```

The run takes its dates from the data. It made the same 15 closed trades as the [OpenAlgo version](ema-crossover.md), at prices about 5 percent lower (Yahoo takes the dividends out of past prices), and a few crossovers moved by a day for the same reason. The engine still applied the Indian defaults: delivery charges, slippage and the NSE calendar.

## Try this

* Another stock: `yf.Ticker("INFY.NS")` with `symbol = "INFY"`.
* Prices without the dividend adjustment: `.history(..., auto_adjust=False)` (splits and bonuses stay adjusted).
* Any other strategy of the [examples](README.md): only the data step changes, `data=bars` instead of the client.

More: [Data](../data.md#your-own-data) for every format the engine reads (CSV and Parquet files, other column names, time zones).
