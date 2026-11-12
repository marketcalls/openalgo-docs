# Supertrend

Supertrend is a line drawn below the price in an uptrend and above it in a downtrend. Its distance from the price is a multiple of the ATR (average true range: how far the price moves in a typical day), and it flips to the other side when the price closes through it. Trend followers hold while the line is below the price and step out when it flips.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when Supertrend (10-day ATR, multiplier 3) shows an uptrend.
* **Exit:** sell when it flips to a downtrend. The flip works as the stop-loss (an exit that limits a trade's loss).
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** SBIN (NSE) daily bars from 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class SupertrendFollow(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    period = 10  # days of ATR
    multiplier = 3  # the line's distance in ATRs

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.supertrend gives the line and its direction (-1 uptrend, 1 downtrend).
        self.line, self.direction = self.I(
            ta.supertrend, self.high, self.low, self.close, self.period, self.multiplier
        )

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.period:  # warm-up: the ATR needs 10 days first
            return
        uptrend = self.direction[-1] < 0  # [-1] is the latest value; -1 means an uptrend
        if self.position.is_flat and uptrend:
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and not uptrend:
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(SupertrendFollow, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 45,036.29
Return       : 45.04%
Max drawdown : -30.26%
Trades       : 23 (48% won)
```

Nearly half the trades won, and the long trends of 2021 paid the most. The max drawdown, the largest fall of the account from its highest value, is about 30 percent: the price of staying in until the line is crossed.

## Try this

* A tighter line that flips sooner: `bt.backtest(..., params={"period": 7, "multiplier": 2})`.
* Another stock: `symbol = "TATASTEEL"`.
* A stop-loss 5 percent below the entry, in case the price gaps through the line: `self.buy(stop=bt.pct(5))`.

More: [Writing Strategies](../writing-strategies.md), [Indicators: Trend](../../indicators/trend.md).
