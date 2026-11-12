# Your First Backtest

In this lesson you run a real trading strategy on SBIN and see how it would have done from January 2021 to November 2026. Then you go through the code line by line, so you know what every part does.

## The strategy

The EMA crossover is a classic first strategy for catching a trend.

* A **bar**, or **candle**, is one period of prices: its open, high, low and close. Here one bar is one trading day.
* An **EMA** (exponential moving average) is the average closing price of the last few days, with the recent days counting more. The 20-day EMA follows the price closely; the 50-day EMA moves slowly.
* **Buy** when the 20-day EMA crosses above the 50-day EMA: the price has started to rise.
* **Sell** when the 20-day EMA crosses back below the 50-day EMA: the rise is over.
* The shares are bought as **CNC** (delivery): you hold them overnight, for as long as the trade lasts.

The test runs on SBIN daily bars from 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.

## Before you run it

You need a running OpenAlgo server, your API key and the OpenAlgo Python library (`pip install openalgo`); see [What you need](../README.md#what-you-need). Copy the code into a file, for example `first_backtest.py`, put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run `python first_backtest.py`.

## The code

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class groups the strategy's settings and steps under one name.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        # self.I(...) makes an indicator line that the strategy can read at every bar.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # 20-day EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, self.slow)  # 50-day EMA of the closes

    # on_bar runs at the close of every bar (here once a day) and decides what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until there are 50 days for the slow EMA
            return
        # Buy when holding nothing (is_flat) and the fast EMA crosses above the slow EMA.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        # Sell when holding shares (is_long) and the fast EMA crosses back below.
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. f"..." is an f-string: the values in braces are filled in.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

## Line by line

**The imports.** `import openalgo.backtest as bt` loads the backtesting engine under the short name `bt`. `from openalgo import api, ta` loads `api`, which talks to your OpenAlgo server, and `ta`, OpenAlgo's library of indicators (EMA, SMA, MACD, Supertrend, RSI and many more).

**Connecting.** `client = api(...)` connects to your OpenAlgo server at `http://127.0.0.1:5000`. The backtest reads SBIN's past prices through it, from Historify when it holds them, otherwise from your broker.

**The strategy class.**

* `class EmaCrossover(bt.Strategy):` starts the strategy and names it `EmaCrossover`. `(bt.Strategy)` means it builds on the engine's strategy, which does the bookkeeping for you.
* `symbol, exchange, interval = "SBIN", "NSE", "D"` says what to trade and the bar size. `"D"` is one bar a day; `"5m"` would be 5-minute bars.
* `fast = 20` and `slow = 50` are the EMA lengths in days. Settings at the top of the class are easy to change later.

**init.**

* `def init(self):` defines a method: a function, or set of steps, that belongs to the class. `self` is the strategy itself, so `self.close` means "this strategy's closing prices".
* The engine calls `init` once, before the first bar.
* `self.I(ta.ema, self.close, self.fast)` makes the 20-day EMA of the closing prices. `self.I` hands the indicator to the engine, which checks that it never uses a future price, and gives you its value at each bar.

**on_bar.**

* The engine calls `on_bar` at the close of every bar, here once a day. At that moment the strategy sees only the prices up to that day, as you would in real trading.
* `if len(self.close) < self.slow: return` is the warm-up. `len(self.close)` is the number of days seen so far; the 50-day EMA needs 50 days, so until then `return` leaves `on_bar` without doing anything.
* `self.position.is_flat` is true while you hold no shares, and `self.position.is_long` while you hold some.
* `self.fast_ema.crossed_above(self.slow_ema)` is true on the day the fast EMA moves from below the slow EMA to above it. `crossed_below` is the opposite.
* `self.buy()` buys at the next day's open. With no quantity given, it uses all the capital, less the charges.
* `self.exit()` sells everything at the next day's open.

**Running and printing.**

* `bt.backtest(...)` runs the strategy over the dates with Rs 1,00,000 (`100_000` is Python's way of writing 100000 with a separator) and returns the result.
* `result.metrics` holds the performance figures by name, such as `m['net_profit']`.
* In an f-string, `:,.2f` writes a number with commas and two decimals, and `:.2%` writes a fraction as a percent (0.5327 becomes 53.27%).

## What happened

* The strategy turned Rs 1,00,000 into Rs 1,53,267.29: a net profit of Rs 53,267.29, or 53.27 percent, after all charges.
* Every buy and sell was decided at a day's close and filled at the next day's open, 09:15. A backtest never trades at a price it could not have seen.
* The engine took Indian charges (brokerage, STT, exchange charges, stamp duty, GST and the rest) and slippage off every trade. **Slippage** is the small amount every fill loses to the market: you rarely get exactly the price you see.
* Only 4 of the 11 trades made money, but a few long rises paid for the many small losses. The next lesson shows each trade.

## What you learned

* A strategy is a class with `init` (set up the indicators once) and `on_bar` (decide at every bar).
* `bt.backtest` runs it on real past prices from your OpenAlgo server, with charges and slippage applied.
* `result.metrics` gives the net profit, return, max drawdown and trade count.

## Next lesson

[Read the Results](02-read-the-results.md): what the four numbers mean, the list of every trade, and a full report you open in your browser.
