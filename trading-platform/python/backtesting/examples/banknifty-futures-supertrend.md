# BANKNIFTY Futures: Supertrend

Supertrend is a line drawn below the price in an uptrend and above it in a downtrend, a multiple of the ATR (average true range: how far the price moves in a typical bar) away. It flips when the price closes through it. On BANKNIFTY futures, which can be sold short (sold first and bought back later, to gain from a fall), this version is always in the market during the session: long above the line, short below it.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** BANKNIFTY23NOV26FUT, the November 2026 contract, 15-minute bars. A bar is one period of prices, here 15 minutes. A lot, the fixed number of units a contract trades in, is 30.
* **Long:** one lot while the close is above the Supertrend line (10-bar ATR, multiplier 3).
* **Short:** one lot while the close is below it. When the trend flips, the position reverses at the next bar's open.
* **Exit:** the flip, or the square-off (the forced close of intraday positions) at 15:10.
* **Product:** MIS (intraday), Rs 5,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open).
* **Data:** 26 August to 11 November 2026, the contract's whole life up to that date: your broker serves a contract's history only while it trades, so the run cannot start earlier. Historify on your OpenAlgo server keeps expired contracts you download while they trade, for longer tests (`source="db"`, see [Data](../data.md#where-the-bars-come-from)). The contract expires on 23 November 2026: then switch to the current contract and dates inside its life.

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

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.supertrend gives the line and its direction; "_" drops the direction, unused here.
        self.supertrend, _ = self.I(ta.supertrend, self.high, self.low, self.close, 10, 3)

    # on_bar runs at the close of every 15-minute bar: decide what to do.
    def on_bar(self, bar):
        # self.target(lots=...) trades to that position, whatever is held now.
        if bar.close > self.supertrend[-1]:  # above the line ([-1] is the latest value)
            self.target(lots=1)  # hold one lot long; a short is bought back first
        else:  # below the line
            self.target(lots=-1)  # hold one lot short; a long is sold first


# Run the backtest over the contract's life, 26 August to 11 November 2026, with Rs 5,00,000.
result = bt.backtest(BankNiftySupertrend, client, start="2026-08-26", end="2026-11-11", capital=500_000)

# Print the summary, then the charges. result.metrics holds every figure of the run by name;
# f"..." fills in the {value}, and ":,.2f" writes it with commas and 2 decimals.
print(result.summary())  # net profit, return, drawdown and trades
print(f"Charges      : Rs {result.metrics['total_costs']:,.2f}")  # all charges paid
```

<!-- output -->
```text
Net profit   : Rs -8,815.29
Return       : -1.76%
Max drawdown : -18.67%
Trades       : 51 (45% won)
Overfitting  : quick checks: 3 not judged, 1 informational; see result.robustness()
Charges      : Rs 50,719.29
```

The trend flipped often: 51 trades in seven weeks, 45 percent won. Before charges the strategy made about Rs 41,900, and the charges of about Rs 1,000 a round trip (a trade in and out) turned that into a loss. The max drawdown is the largest fall of the account from its highest value. The Overfitting line judges nothing for a run that lost money ([Overfitting checks](../results-and-reports.md#overfitting-checks)).

The first trade came on 23 September, not 26 August. The Supertrend line needs 512 bars of 15 minutes (about 20 sessions) before its value settles, and a new contract has no bars before its first session, so the strategy waited inside the run for it. Python prints a `WarmUpWarning` that says so, and it is the first note in `result.warnings`.

NFO trades until 15:40 from 3 August 2026, so each session ends with bars that close at 15:15, 15:30 and 15:40. After the 15:10 square-off has closed the position, the strategy asks again for a lot on each of those last bars, and now and then a flip comes after 15:00. Both come after the 15:00 cut-off for new intraday positions, so the engine does not place them, as a broker would not. That is what the cut-off is for, so Python prints no warning about them; `result.warnings` counts them. This block continues the one above:

<!-- continues -->
<!-- requires-server -->
```python
print(result.warnings[1])  # the second note of the run: the orders the cut-off kept out
```

<!-- output -->
```text
104 of 155 orders were outside the MIS entry window, each session's open to 15:00 (entry_from to entry_until), and were not placed, as the window intends (reject_code 'entry_window' in result.orders), the first decided at 2026-09-23 15:15 IST
```

## Try this

* Long only: `self.target(lots=0)` in place of `self.target(lots=-1)`, so a downtrend means flat (holding nothing).
* Hold the trend overnight: add `product = "NRML"` (the futures product held overnight) under the `symbol` line.
* After 23 November 2026: the current contract, for example `"BANKNIFTY29DEC26FUT"`, with `start` its first session (the first daily bar `client.history` returns for it) and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md), [Orders and Risk](../orders-and-risk.md).
