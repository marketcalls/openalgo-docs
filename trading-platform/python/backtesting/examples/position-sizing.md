# Position Sizing

The same entries and exits can make or lose very different amounts depending on how much you buy each time. Deciding that is position sizing. This page runs the [EMA crossover](ema-crossover.md) on RELIANCE with 10 percent of the account in each trade, instead of all of it.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry and exit:** buy when the 20-day EMA (exponential moving average) crosses above the 50-day, sell when it crosses back below.
* **Size:** 10 percent of the current equity in each trade. Equity is the cash plus the value of the shares held, so the size grows with profits and shrinks with losses.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** RELIANCE (NSE) daily bars from 1 January 2021 to 11 November 2026, Rs 1,00,000 at the start. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # RELIANCE on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA
    size = bt.size.percent(10)  # every buy() takes 10 percent of the current equity

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
            self.buy()  # buy the size above at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# The average money put into a trade: units bought x entry price.
trades = result.trades
print(f"Average trade: Rs {(trades['entry_units'] * trades['entry_price_rupees']).mean():,.0f}")
```

<!-- output -->
```text
Net profit   : Rs -675.91
Return       : -0.68%
Max drawdown : -2.92%
Trades       : 15 (33% won)
Average trade: Rs 10,021
```

Each trade put about Rs 10,000 to work, so the 15 signals lost only Rs 676 and the account never fell more than 2.92 percent from its highest value (the max drawdown). With all the capital in every trade, about Rs 99,000 each, the same signals lost Rs 7,615 with a drawdown of 24.59 percent. Smaller positions mean smaller losses and smaller gains: sizing decides how much a strategy's ups and downs can hurt you.

## Try this

* A fixed 50 shares every trade: `size = bt.size.qty(50)`.
* Risk 1 percent of equity per trade, with a stop-loss 2 ATR (average true range, a typical day's move) below the entry: `size = bt.size.atr_risk(1, mult=2)` and `self.buy(stop=bt.atr(2))`. A volatile stock then gets fewer shares, a calm one more.
* Size from the starting capital, so sizes do not grow or shrink with the results: add `reinvest = False` to the class.

More: [Sizing](../costs-slippage-and-margin.md#how-do-i-choose-how-many-shares-to-buy), every sizer and the caps.
