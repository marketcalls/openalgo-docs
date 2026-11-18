# MACD Crossover

MACD measures momentum. The MACD line is the gap between a 12-day and a 26-day EMA (exponential moving average: the average close of the last few days, with the recent days counting more), and its signal line is a 9-day EMA of that gap. When the MACD line crosses above its signal line, momentum has turned up; when it crosses back below, it has turned down.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the MACD line (12, 26, 9) crosses above its signal line.
* **Exit:** sell when it crosses back below. No stop-loss (an exit that limits a trade's loss).
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** ICICIBANK (NSE) daily bars from 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class MacdCrossover(bt.Strategy):
    symbol, exchange, interval = "ICICIBANK", "NSE", "D"  # ICICIBANK on NSE, daily bars

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.macd gives three lines: MACD, signal and histogram (unused here).
        self.macd, self.signal, self.histogram = self.I(ta.macd, self.close, 12, 26, 9)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        # crossed_above: the MACD line was below its signal line a day ago, and is above it now.
        if self.position.is_flat and self.macd.crossed_above(self.signal):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.macd.crossed_below(self.signal):
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(MacdCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 47,464.45
Return       : 47.46%
Max drawdown : -26.32%
Trades       : 52 (35% won), 1 still open
Overfitting  : quick checks: 3 failed (random_out_of_sample, resample, variance), 1 informational; see result.robustness()
```

MACD crosses often on daily bars: 52 closed trades in under six years, and only about one in three won. A few long trends paid for the many small losses, which is how most trend strategies make money. "1 still open" is the position bought on 7 October 2026 and still held on 11 November 2026: it counts in the net profit at that day's close, but not among the closed trades. The max drawdown is the largest fall of the account from its highest value.

The Overfitting line says three of the engine's quick checks of the trades failed. For example, when 30 percent of the sessions were set aside at random, they kept half of the Sharpe ratio of the others in only 36 percent of 200 draws, where the check asks for 80 percent. The profit came from a few long trends, so how well it holds up depends on which sessions are tested. That is not proof the strategy is overfitted, but it is a reason not to trust the figure alone: see [Overfitting checks](../results-and-reports.md#overfitting-checks).

Python also prints a warning at the end of this run:

```text
OrdersNotPlacedWarning: 1 of 106 orders was rejected because the margin the order needed was more than the free cash (reject_code 'margin'). See result.warnings.
```

A buy with no quantity is sized at the close it was decided on, with 2 percent of the cash kept back. The buy decided on 7 April 2026 met an open 5.2 percent higher the next day (Rs 1,310.00 after a close of Rs 1,245.50), so it needed more than the cash and was refused; the strategy bought again at a later crossover.

## Try this

* Only crosses above the zero line (momentum and trend together): add `and self.macd[-1] > 0` to the entry condition. `[-1]` is the latest value.
* Slower settings: `self.I(ta.macd, self.close, 19, 39, 9)`.
* Another stock: `symbol = "AXISBANK"`.

More: [Writing Strategies](../writing-strategies.md), [Indicators](../../indicators/README.md).
