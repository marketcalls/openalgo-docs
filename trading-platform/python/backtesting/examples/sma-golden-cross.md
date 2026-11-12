# SMA Golden Cross

The long-term trend signal that investors watch. An SMA (simple moving average) is the plain average of the last few closing prices. The golden cross is the 50-day SMA moving above the 200-day SMA; the death cross is the move back below. It is slow by design: a few trades in several years, each held for months.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy on the golden cross, when the 50-day SMA crosses above the 200-day SMA.
* **Exit:** sell on the death cross, when it crosses back below. No stop-loss (an exit that limits a trade's loss).
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** HDFCBANK (NSE) daily bars from 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class GoldenCross(bt.Strategy):
    symbol, exchange, interval = "HDFCBANK", "NSE", "D"  # HDFCBANK on NSE, daily bars

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.sma50 = self.I(ta.sma, self.close, 50)
        self.sma200 = self.I(ta.sma, self.close, 200)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < 200:  # warm-up: the 200-day SMA needs 200 days first
            return
        # crossed_above: the 50-day SMA was below the 200-day a day ago, and is above it now.
        if self.position.is_flat and self.sma50.crossed_above(self.sma200):
            self.buy()  # golden cross: buy with all the capital at the next day's open
        elif self.position.is_long and self.sma50.crossed_below(self.sma200):
            self.exit()  # death cross: sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(GoldenCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 5,432.61
Return       : 5.43%
Max drawdown : -13.51%
Trades       : 3 (67% won)
```

Three trades in almost six years. The 200-day average needs 200 sessions before it has a value, so the first trade came only in September 2022. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Another stock: `symbol = "SBIN"`.
* Price above its 200-day average instead of the cross: buy on `self.close.crossed_above(self.sma200)`, sell on `self.close.crossed_below(self.sma200)`.
* Exponential averages, which give the recent days more weight: `ta.ema` in place of `ta.sma`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
