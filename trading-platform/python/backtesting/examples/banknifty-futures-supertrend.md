# BANKNIFTY Futures: Supertrend

Supertrend draws a line a multiple of the average true range away from the price: below the price in an uptrend, above it in a downtrend, and it flips when the price closes through it. Intraday traders use it on BANKNIFTY futures to ride the trend of the day and reverse when it turns. This version is always in the market during the session, long or short, since futures can be sold short intraday (MIS) and overnight (NRML).

## Rules

* **Instrument:** BANKNIFTY futures (the November 2026 contract), 15-minute bars, MIS (intraday).
* **Indicator:** Supertrend with a 10-bar ATR and a multiplier of 3, from `openalgo.ta`.
* **Long:** one lot (30 units) while the 15-minute close is above the Supertrend line.
* **Short:** one lot while the close is below it. When the trend flips, the position reverses at the next bar's open.
* **Stop:** the Supertrend line itself: a close through it reverses the trade.
* **End of day:** the 15:10 square-off; the next session starts again from its first bar.

## Code

`self.target(lots=1)` trades to a position of one lot long, whatever is held now: from flat it buys one lot, from a short it buys back the short and then buys one lot. `self.target(lots=-1)` does the same for the short side. Your broker serves history only for contracts still trading, so the example tests BANKNIFTY23NOV26FUT, the November 2026 contract, from 1 October to 11 November 2026, with the engine's defaults: Zerodha charges, the default slippage, the contract's lot and tick size, a margin of 20 percent of the contract value and the MIS rules (no new entries after 15:00, square-off at 15:10).

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class BankNiftySupertrend(bt.Strategy):
    symbol, exchange, interval = "BANKNIFTY23NOV26FUT", "NFO", "15m"  # the November 2026 contract

    def init(self):
        self.supertrend, _ = self.I(ta.supertrend, self.high, self.low, self.close, 10, 3)

    def on_bar(self, bar):
        if len(self.close) < 10:  # wait until the Supertrend has 10 bars
            return
        if bar.close > self.supertrend[-1]:  # price above the line: an uptrend
            self.target(lots=1)  # hold one lot long (a short is bought back first)
        else:  # price below the line: a downtrend
            self.target(lots=-1)  # hold one lot short (a long is sold first)


result = bt.backtest(BankNiftySupertrend, client, start="2026-10-01", end="2026-11-11", capital=500_000)

m = result.metrics
print(f"Net profit    Rs {m['net_profit']:,.2f} after Rs {m['total_costs']:,.2f} of charges")
print(f"Trades        {m['trades']}, win rate {m['win_rate']:.0%}")
print(f"Max drawdown  {m['max_drawdown']:.2%}")
trades = result.trades[["entry_time", "direction", "entry_price_rupees", "exit_price_rupees", "exit_reason", "net_pnl_rupees"]]
print(trades.head(5).round({"net_pnl_rupees": 2}).to_string(index=False))
```

## Output

BANKNIFTY23NOV26FUT expires on 23 November 2026. After that your broker no longer serves its history, so switch to the current contract and its dates (see Try this).

<!-- output -->
```text
Net profit    Rs -6,313.46 after Rs 41,774.67 of charges
Trades        42, win rate 43%
Max drawdown  -18.58%
               entry_time direction  entry_price_rupees  exit_price_rupees exit_reason  net_pnl_rupees
2026-10-01 11:45:00+05:30     short             55564.8            55000.2   scheduler        15948.79
2026-10-05 09:30:00+05:30      long             55670.2            55051.4      signal       -19546.02
2026-10-05 12:15:00+05:30     short             55051.4            55225.0   scheduler        -6189.45
2026-10-06 09:30:00+05:30     short             55410.8            55558.4      signal        -5415.51
2026-10-06 10:00:00+05:30      long             55558.4            55491.8   scheduler        -2986.78
```

`signal` is a reversal and `scheduler` the 15:10 square-off. The trend flipped often over these sessions, and the charges, about Rs 1,000 a round trip, turned a gross profit of about Rs 35,500 into a net loss. After the 15:00 cut-off for new MIS entries the engine refuses the strategy's orders until the next session; `result.orders` lists them as rejected with `entry_window`.

## Try this

* Long only: `self.target(lots=0)` instead of `self.target(lots=-1)`, so a downtrend means flat. Short only: `self.target(lots=0)` instead of `self.target(lots=1)`.
* Hold the trend overnight: add `product = "NRML"` under the `symbol, exchange, interval` line. The position is then marked to market at each close instead of squared off.
* After 23 November 2026: the current contract and dates inside its life, for example `"BANKNIFTY29DEC26FUT"` with `start="2026-11-01"` and `end` the last session before the day you run it.

[Futures](../futures.md) explains how the engine handles contracts, and [Orders and Risk](../orders-and-risk.md) covers target positions and the square-off.
