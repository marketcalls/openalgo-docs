# Backtest on yfinance Data

You can backtest without an OpenAlgo server: download daily bars with yfinance, rename their columns to the ones the engine reads, and pass them with `data=`. This page runs the [EMA crossover](ema-crossover.md) on RELIANCE this way.

yfinance is a separate package (`pip install yfinance`); the OpenAlgo SDK does not depend on it. Its prices are adjusted for splits, bonuses and dividends by default, so they differ a little from OpenAlgo's history.

## Rules

* **Entry and exit:** buy when the 20-day EMA (exponential moving average) crosses above the 50-day, sell when it crosses back below.
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** RELIANCE.NS daily bars from yfinance, 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

The engine needs the columns `open`, `high`, `low`, `close` and `volume`, and times that carry their time zone. yfinance's columns are capitalised and come with extra dividend and split columns, so the code keeps the five price columns and names them in lower case.

<!-- requires-network -->
```python
# Imports: yfinance for the download, the backtest engine (bt) and the indicators (ta).
import yfinance as yf

import openalgo.backtest as bt
from openalgo import ta

# Download RELIANCE's daily bars (yfinance leaves out the end date, hence the 12th).
raw = yf.Ticker("RELIANCE.NS").history(start="2021-01-01", end="2026-11-12")

# Keep the five columns the engine reads, in lower case, with Indian (IST) times.
bars = raw[["Open", "High", "Low", "Close", "Volume"]].rename(columns=str.lower)
bars.index = bars.index.tz_convert("Asia/Kolkata")


# The strategy. A class bundles its settings and its functions (each "def").
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # what the bars are: RELIANCE, daily
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs 50 days first
            return
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest on the downloaded bars: data= instead of an OpenAlgo client.
result = bt.backtest(EmaCrossover, data=bars, capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs -4,226.55
Return       : -4.23%
Max drawdown : -24.33%
Trades       : 15 (33% won)
```

The run takes its dates from the data. On OpenAlgo's history the same strategy also made 15 trades but lost Rs 7,615: yfinance takes the dividends out of past prices, so its prices are a little lower and the results differ. The engine still applied the Indian defaults to the downloaded bars: delivery charges, slippage and the NSE calendar. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Another stock: `yf.Ticker("INFY.NS")` with `symbol = "INFY"`.
* Prices without the dividend adjustment: `.history(..., auto_adjust=False)` (splits and bonuses stay adjusted).
* Any other strategy of the [examples](README.md): only the data step changes, `data=bars` instead of the client.

More: [Use Your Own Data](../tutorial/11-your-own-data.md), [Data](../data.md#your-own-data) for every format the engine reads.
