# NIFTY Futures: Opening Range Breakout

The opening range is the high and low of the first 15 minutes of the session. This strategy trades the first close outside it, in either direction, on NIFTY futures, where the first minutes often set the direction for the day. A futures contract trades in lots, a fixed number of units (65 for NIFTY), and can be sold short (sold first and bought back later, to gain from a fall).

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** NIFTY23NOV26FUT, the November 2026 contract, 5-minute bars. A bar is one period of prices, here 5 minutes.
* **Range:** the high and low of the first three bars, 09:15 to 09:30.
* **Entry:** buy one lot when a bar closes above the range; sell one lot short when one closes below it. One trade a day.
* **Exit:** the stop-loss (an exit that limits the loss) one range width from the entry, the target (an exit that takes the profit) two widths away, or the square-off (the forced close of intraday positions) at 15:10.
* **Product:** MIS (intraday), Rs 5,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open), about Rs 3 lakh for one lot.
* **Data:** 1 October to 11 November 2026. The contract expires on 23 November 2026, after which your broker no longer serves its history: then switch to the current contract and dates inside its life.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class NiftyOpeningRange(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV26FUT", "NFO", "5m"  # the November contract, 5-minute bars
    longs, shorts = True, True  # trade breakouts both ways

    # init runs once, before the first bar.
    def init(self):
        self.day = None  # the session the strategy is in

    # on_bar runs at the close of every 5-minute bar: decide what to do.
    def on_bar(self, bar):
        if bar.time.date() != self.day:  # the first bar of a new session: start counting again
            self.day, self.bars_today, self.traded = bar.time.date(), 0, False
        self.bars_today += 1
        if self.bars_today == 3:  # three bars done: the range from 09:15 to 09:30
            self.range_high, self.range_low = max(self.high[-3:]), min(self.low[-3:])
        if self.bars_today <= 3 or self.traded or not self.position.is_flat:
            return  # still in the range, already traded today, or holding a position
        width = self.range_high - self.range_low
        # bt.points(x): x points of price away from the entry.
        if self.longs and bar.close > self.range_high:  # a close above the range: buy
            self.buy(lots=1, stop=bt.points(width), target=bt.points(2 * width))
            self.traded = True
        elif self.shorts and bar.close < self.range_low:  # a close below it: sell short
            self.sell(lots=1, stop=bt.points(width), target=bt.points(2 * width))
            self.traded = True


# Run the backtest from 1 October to 11 November 2026 with Rs 5,00,000.
result = bt.backtest(NiftyOpeningRange, client, start="2026-10-01", end="2026-11-11", capital=500_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# The first three trades and how each ended.
trades = result.trades[["entry_time", "direction", "exit_reason", "net_pnl_rupees"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 76,864.15
Return       : 15.37%
Max drawdown : -3.69%
Trades       : 27 (63% won)
               entry_time direction exit_reason  net_pnl_rupees
2026-10-01 10:05:00+05:30      long      leg_sl        -5959.21
2026-10-05 09:35:00+05:30      long      leg_sl        -5634.33
2026-10-06 09:35:00+05:30      long  leg_target         4968.64
```

`leg_sl` is the stop-loss, `leg_target` the target and `scheduler` the 15:10 square-off. The charges come to about Rs 900 a round trip (a trade in and out), most of it the 0.05 percent STT (securities transaction tax) on the sell side. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trail the stop (let it follow the price as the trade gains): add `trail=bt.trail_points(width)` to the `self.buy` and `self.sell` lines.
* After 23 November 2026: the current contract, for example `"NIFTY29DEC26FUT"`, with `start="2026-11-01"` and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md), [Orders and Risk](../orders-and-risk.md).
