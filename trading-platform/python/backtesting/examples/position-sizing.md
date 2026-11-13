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

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy the size above at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades

# The average money put into a trade: shares bought x entry price, over the closed trades.
# f"..." fills in the {value}; ":,.0f" writes it with commas and no decimals.
trades = result.trade_list()
print(f"Average trade: Rs {(trades['quantity'] * trades['entry_price']).mean():,.0f}")
```

<!-- output -->
```text
Net profit   : Rs -844.47
Return       : -0.84%
Max drawdown : -2.77%
Trades       : 16 (31% won), 1 still open
Average trade: Rs 9,301
```

Each trade put about Rs 9,300 to work: 10 percent of the equity, rounded down to whole shares of a stock that cost over Rs 1,000 a share. So the 16 closed trades lost only Rs 844, and the account never fell more than 2.77 percent from its highest value (the max drawdown). With all the capital in every trade, the same signals lost Rs 9,345 with a drawdown of 23.82 percent. "1 still open" is the position bought at the last crossover and still held on 11 November 2026. Smaller positions mean smaller losses and smaller gains: sizing decides how much a strategy's ups and downs can hurt you.

## Try this

* A fixed 50 shares every trade: `size = bt.size.qty(50)`.
* Risk 1 percent of equity per trade, with a stop-loss 2 ATR (average true range, a typical day's move) below the entry: `size = bt.size.atr_risk(1, mult=2)` and `self.buy(stop=bt.atr(2))`. A volatile stock then gets fewer shares, a calm one more.
* Size from the starting capital, so sizes do not grow or shrink with the results: add `reinvest = False` to the class.

More: [Sizing](../costs-slippage-and-margin.md#how-do-i-choose-how-many-shares-to-buy), every sizer and the caps.
