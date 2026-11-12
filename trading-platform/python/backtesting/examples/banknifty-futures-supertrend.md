# BANKNIFTY Futures: Supertrend

Supertrend is a line drawn below the price in an uptrend and above it in a downtrend, a multiple of the ATR (average true range: how far the price moves in a typical bar) away. It flips when the price closes through it. On BANKNIFTY futures, which can be sold short (sold first and bought back later, to gain from a fall), this version is always in the market during the session: long above the line, short below it.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** BANKNIFTY23NOV26FUT, the November 2026 contract, 15-minute bars. A bar is one period of prices, here 15 minutes. A lot, the fixed number of units a contract trades in, is 30.
* **Long:** one lot while the close is above the Supertrend line (10-bar ATR, multiplier 3).
* **Short:** one lot while the close is below it. When the trend flips, the position reverses at the next bar's open.
* **Exit:** the flip, or the square-off (the forced close of intraday positions) at 15:10.
* **Product:** MIS (intraday), Rs 5,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open).
* **Data:** 1 October to 11 November 2026. The contract expires on 23 November 2026, after which your broker no longer serves its history: then switch to the current contract and dates inside its life.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class BankNiftySupertrend(bt.Strategy):
    symbol, exchange, interval = "BANKNIFTY23NOV26FUT", "NFO", "15m"  # the November contract, 15-minute bars

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.supertrend gives the line and its direction; "_" drops the direction, unused here.
        self.supertrend, _ = self.I(ta.supertrend, self.high, self.low, self.close, 10, 3)

    # on_bar runs at the close of every 15-minute bar: decide what to do.
    def on_bar(self, bar):
        if len(self.close) < 10:  # warm-up: the ATR needs 10 bars first
            return
        # self.target(lots=...) trades to that position, whatever is held now.
        if bar.close > self.supertrend[-1]:  # above the line ([-1] is the latest value)
            self.target(lots=1)  # hold one lot long; a short is bought back first
        else:  # below the line
            self.target(lots=-1)  # hold one lot short; a long is sold first


# Run the backtest from 1 October to 11 November 2026 with Rs 5,00,000.
result = bt.backtest(BankNiftySupertrend, client, start="2026-10-01", end="2026-11-11", capital=500_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
print(f"Charges      : Rs {m['total_costs']:,.2f}")  # all charges paid
```

<!-- output -->
```text
Net profit   : Rs -6,313.46
Return       : -1.26%
Max drawdown : -18.58%
Trades       : 42 (43% won)
Charges      : Rs 41,774.67
```

The trend flipped often over these sessions: 42 trades, 43 percent won. Before charges the strategy made about Rs 35,500, and the charges of about Rs 1,000 a round trip (a trade in and out) turned that into a loss. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Long only: `self.target(lots=0)` in place of `self.target(lots=-1)`, so a downtrend means flat (holding nothing).
* Hold the trend overnight: add `product = "NRML"` (the futures product held overnight) under the `symbol` line.
* After 23 November 2026: the current contract, for example `"BANKNIFTY29DEC26FUT"`, with `start="2026-11-01"` and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md), [Orders and Risk](../orders-and-risk.md).
