# CRUDEOIL Futures: MACD Crossover

MACD measures momentum: the MACD line is the gap between a 12-bar and a 26-bar EMA (exponential moving average), and its signal line a 9-bar EMA of that gap. A crossover of the two lines shows momentum turning, and MACD above or below zero shows the trend. Commodity traders use it on MCX crude oil in the evening session, when the international market is most active.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** CRUDEOIL19NOV26FUT on MCX, the November 2026 contract, 5-minute bars. A bar is one period of prices, here 5 minutes. A lot, the fixed number of units a contract trades in, is 100 barrels.
* **Long:** buy one lot when MACD (12, 26, 9) crosses above its signal line while MACD is above zero.
* **Short:** sell one lot short (sell first, buy back later, to gain from a fall) when MACD crosses below its signal line while MACD is below zero.
* **Exit:** the opposite crossover, or the square-off (the forced close of intraday positions) before the session closes. New trades from 17:00 only.
* **Product:** MIS (intraday), Rs 3,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open).
* **Data:** 20 July to 11 November 2026, the contract's whole trading life up to that date. MCX lists a crude oil contract months ahead, but this one first traded on 20 July 2026: the daily bars before then show no volume, and there are no 5-minute bars for them. Your broker serves a contract's history only while it trades, so the run cannot start earlier; Historify on your OpenAlgo server keeps expired contracts you download while they trade, for longer tests (`source="db"`, see [Data](../data.md#where-the-bars-come-from)). The contract expires on 19 November 2026: then switch to the current contract and dates inside its life.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class CrudeOilMacd(bt.Strategy):
    symbol, exchange, interval = "CRUDEOIL19NOV26FUT", "MCX", "5m"  # the November contract, 5-minute bars
    entry_from = "17:00"  # new trades in the evening session only
    longs, shorts = True, True  # trade both ways

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.macd gives three lines: MACD, signal and histogram; "_" drops the histogram.
        self.macd, self.signal, _ = self.I(ta.macd, self.close, 12, 26, 9)

    # on_bar runs at the close of every 5-minute bar: decide what to do.
    def on_bar(self, bar):
        if self.macd.crossed_above(self.signal):  # momentum turns up
            self.exit()  # close a short, if any
            if self.longs and self.macd[-1] > 0:  # and the trend is up ([-1] is the latest value)
                self.buy(lots=1)
        elif self.macd.crossed_below(self.signal):  # momentum turns down
            self.exit()  # close a long, if any
            if self.shorts and self.macd[-1] < 0:  # and the trend is down: sell short
                self.sell(lots=1)


# Run the backtest over the contract's trading life, 20 July to 11 November 2026, with Rs 3,00,000.
result = bt.backtest(CrudeOilMacd, client, start="2026-07-20", end="2026-11-11", capital=300_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 9,392.51
Return       : 3.13%
Max drawdown : -22.56%
Trades       : 150 (33% won)
Overfitting  : quick checks: 3 failed (random_out_of_sample, resample, variance), 1 informational; see result.robustness()
```

The strategy made money with only 33 percent of its trades winning, because its average win, Rs 5,659, was more than twice its average loss, Rs 2,653 (`result.metrics['average_win']` and `result.metrics['average_loss']`). The profit is thin and late: from late July to the end of October the strategy lost about Rs 34,300, and the first eleven days of November made all of it back and Rs 9,400 more. The engine took the contract's lot (100 barrels), tick size (Rs 1) and expiry from its reference tables, and charged the commodity rates. The max drawdown is the largest fall of the account from its highest value.

The Overfitting line says three of the engine's quick checks of the trades failed. For example, when 30 percent of the sessions were set aside at random, they kept half of the Sharpe ratio of the others in only 7.5 percent of 200 draws, where the check asks for 80 percent. That is not proof the strategy is overfitted, but the edge did not hold up under that check: a profit that rests on a few days is too small to tell apart from luck. See [Overfitting checks](../results-and-reports.md#overfitting-checks).

The first trade came on 24 July. The MACD needs 512 bars of 5 minutes before its value settles, and a new contract has no bars before its first trade, so the strategy waited inside the run for it. Python prints a `WarmUpWarning` that says so, and it is the first note in `result.warnings`.

Python also prints two `ReferenceDataWarning` lines after the run. They say that the MCX contract terms in the engine's tables are not yet confirmed against the exchange circular and were last checked on 31 March 2026; the lot and tick size match the master contract on your OpenAlgo server.

The crossovers before 17:00, which `entry_from` keeps out, and the ones after the cut-off for new intraday positions near the close were not placed. That is what the entry window is for, so Python prints no warning about them; `result.warnings` counts them. This block continues the one above:

<!-- continues -->
<!-- requires-server -->
```python
print(result.warnings[1])  # the second note of the run: the orders the entry window kept out
```

<!-- output -->
```text
196 of 488 orders were outside the MIS entry window, 17:00 to 30 minutes before each session's close (entry_from to entry_until), and were not placed, as the window intends (reject_code 'entry_window' in result.orders), the first decided at 2026-07-27 10:10 IST
```

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trade the whole day: delete the `entry_from` line.
* After 19 November 2026: the current contract, for example `"CRUDEOIL18DEC26FUT"`, with `start` its first session with trades (the first daily bar `client.history` returns for it with a volume above zero) and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md).
