# NIFTY Futures: Opening Range Breakout

The opening range is the high and low of the first 15 minutes of the session. This strategy trades the first close outside it, in either direction, on NIFTY futures, where the first minutes often set the direction for the day. A futures contract trades in lots, a fixed number of units (65 for NIFTY), and can be sold short (sold first and bought back later, to gain from a fall).

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** NIFTY23NOV26FUT, the November 2026 contract, 5-minute bars. A bar is one period of prices, here 5 minutes.
* **Range:** the high and low of the first three bars, 09:15 to 09:30.
* **Entry:** buy one lot when a bar closes above the range; sell one lot short when one closes below it. One trade a day.
* **Exit:** the stop-loss (an exit that limits the loss) one range width from the entry, the target (an exit that takes the profit) two widths away, or the square-off (the forced close of intraday positions) at 15:10.
* **Product:** MIS (intraday), Rs 5,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open), about Rs 3 lakh for one lot.
* **Data:** 26 August to 11 November 2026, the contract's whole life up to that date: your broker serves a contract's history only while it trades, so the run cannot start earlier. Historify on your OpenAlgo server keeps expired contracts you download while they trade, for longer tests (`source="db"`, see [Data](../data.md#where-the-bars-come-from)). The contract expires on 23 November 2026: then switch to the current contract and dates inside its life.

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

    # init runs before the first bar.
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


# Run the backtest over the contract's life, 26 August to 11 November 2026, with Rs 5,00,000.
result = bt.backtest(NiftyOpeningRange, client, start="2026-08-26", end="2026-11-11", capital=500_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades

# The first three trades and how each ended. trade_list() is the table of closed trades.
trades = result.trade_list()[["entry_time", "direction", "exit_reason", "net_pnl"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 45,395.93
Return       : 9.08%
Max drawdown : -9.05%
Trades       : 51 (55% won)
Overfitting  : quick checks: 3 failed (random_out_of_sample, resample, variance), 1 informational; see result.robustness()
               entry_time direction exit_reason   net_pnl
2026-08-26 09:45:00+05:30      long      leg_sl -10684.96
2026-08-27 09:35:00+05:30     short   scheduler   2278.52
2026-08-28 09:45:00+05:30      long      leg_sl  -5699.36
```

`leg_sl` is the stop-loss, `leg_target` the target and `scheduler` the 15:10 square-off. The charges come to about Rs 900 a round trip (a trade in and out), most of it the 0.05 percent STT (securities transaction tax) on the sell side. The max drawdown is the largest fall of the account from its highest value.

The profit did not come evenly: the strategy lost about Rs 31,500 in its first five weeks, to the end of September, and made it back and more in October and November. The Overfitting line says three of the engine's quick checks of the trades failed. For example, when 30 percent of the sessions were set aside at random, they kept half of the Sharpe ratio of the others in only 47 percent of 200 draws, where the check asks for 80 percent. That is not proof the strategy is overfitted, but it says the edge did not hold up under that check: it may be fitted to these weeks, or too small to tell apart from luck. See [Overfitting checks](../results-and-reports.md#overfitting-checks).

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trail the stop (let it follow the price as the trade gains): add `trail=bt.trail_points(width)` to the `self.buy` and `self.sell` lines.
* After 23 November 2026: the current contract, for example `"NIFTY29DEC26FUT"`, with `start` its first session (the first daily bar `client.history` returns for it) and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md), [Orders and Risk](../orders-and-risk.md).
