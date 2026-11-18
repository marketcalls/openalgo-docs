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

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.sma50 = self.I(ta.sma, self.close, 50)
        self.sma200 = self.I(ta.sma, self.close, 200)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        # crossed_above: the 50-day SMA was below the 200-day a day ago, and is above it now.
        if self.position.is_flat and self.sma50.crossed_above(self.sma200):
            self.buy()  # golden cross: buy with all the capital at the next day's open
        elif self.position.is_long and self.sma50.crossed_below(self.sma200):
            self.exit()  # death cross: sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(GoldenCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 5,326.02
Return       : 5.33%
Max drawdown : -13.25%
Trades       : 3 (67% won)
Overfitting  : too few trades to judge (3 closed, 30 needed)
```

Three trades in almost six years, the first in September 2022: a golden cross is rare. The engine loaded HDFCBANK's bars from before 2021 by itself, so the 200-day average had its value from the first day of the run. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Another stock: `symbol = "SBIN"`.
* Price above its 200-day average instead of the cross: buy on `self.close.crossed_above(self.sma200)`, sell on `self.close.crossed_below(self.sma200)`.
* Exponential averages, which give the recent days more weight: `ta.ema` in place of `ta.sma`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
