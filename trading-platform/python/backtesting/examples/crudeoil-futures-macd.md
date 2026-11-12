# CRUDEOIL Futures: MACD Crossover

MACD measures momentum: the MACD line is the gap between a 12-bar and a 26-bar EMA (exponential moving average), and its signal line a 9-bar EMA of that gap. A crossover of the two lines shows momentum turning, and MACD above or below zero shows the trend. Commodity traders use it on MCX crude oil in the evening session, when the international market is most active.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Instrument:** CRUDEOIL19NOV26FUT on MCX, the November 2026 contract, 5-minute bars. A bar is one period of prices, here 5 minutes. A lot, the fixed number of units a contract trades in, is 100 barrels.
* **Long:** buy one lot when MACD (12, 26, 9) crosses above its signal line while MACD is above zero.
* **Short:** sell one lot short (sell first, buy back later, to gain from a fall) when MACD crosses below its signal line while MACD is below zero.
* **Exit:** the opposite crossover, or the square-off (the forced close of intraday positions) before the session closes. New trades from 17:00 only.
* **Product:** MIS (intraday), Rs 3,00,000. The engine blocks 20 percent of the contract value as margin (the money set aside while a position is open).
* **Data:** 1 October to 11 November 2026. The contract expires on 19 November 2026, after which your broker no longer serves its history: then switch to the current contract and dates inside its life.

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

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        # ta.macd gives three lines: MACD, signal and histogram; "_" drops the histogram.
        self.macd, self.signal, _ = self.I(ta.macd, self.close, 12, 26, 9)

    # on_bar runs at the close of every 5-minute bar: decide what to do.
    def on_bar(self, bar):
        if len(self.close) < 35:  # warm-up: MACD needs 26 + 9 bars first
            return
        if self.macd.crossed_above(self.signal):  # momentum turns up
            self.exit()  # close a short, if any
            if self.longs and self.macd[-1] > 0:  # and the trend is up ([-1] is the latest value)
                self.buy(lots=1)
        elif self.macd.crossed_below(self.signal):  # momentum turns down
            self.exit()  # close a long, if any
            if self.shorts and self.macd[-1] < 0:  # and the trend is down: sell short
                self.sell(lots=1)


# Run the backtest from 1 October to 11 November 2026 with Rs 3,00,000.
result = bt.backtest(CrudeOilMacd, client, start="2026-10-01", end="2026-11-11", capital=300_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 34,383.92
Return       : 11.46%
Max drawdown : -12.91%
Trades       : 70 (37% won)
```

The strategy made money with only 37 percent of its trades winning, because its average win, Rs 6,163, was more than twice its average loss, Rs 2,860 (`m['average_win']` and `m['average_loss']`). The engine took the contract's lot (100 barrels), tick size (Rs 1) and expiry from its reference tables, and charged the commodity rates. The max drawdown is the largest fall of the account from its highest value.

Python also prints two `ReferenceDataWarning` lines: the MCX contract terms in the engine's tables are not yet confirmed against the exchange circular. The backtest is complete, and the lot and tick size match the master contract on your OpenAlgo server.

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trade the whole day: delete the `entry_from` line.
* After 19 November 2026: the current contract, for example `"CRUDEOIL18DEC26FUT"`, with `start="2026-11-01"` and `end` the last session before the day you run it.

More: [Trade Futures](../tutorial/07-futures.md), [Futures](../futures.md).
