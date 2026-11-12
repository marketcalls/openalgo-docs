# Go Short

Every trade so far bought first and sold later, to gain when the price rises. In this lesson you **go short**: sell first and buy back later, to gain when the price falls. You will short SBIN intraday with the opening range breakout of [lesson 5](05-intraday.md), see why a delivery short is refused, and flip between long and short with `self.target`.

## Shorts are intraday only

In the Indian cash market you can sell shares you do not own only intraday, as MIS: the short must be bought back the same day. A short cannot be held overnight in delivery (CNC), because at settlement you would have to deliver shares you do not have. So on 5-minute bars, where the engine trades MIS, a short is allowed and is squared off by 15:00 like any intraday position. To hold a short overnight, traders use futures.

## Short the opening range breakdown

The strategy of lesson 5, turned around: sell short when a 5-minute bar closes below the range low, before 11:00, with the stop-loss at the range high. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the backtesting engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class groups the strategy's settings and steps under one name.
class OpeningRangeBreakdown(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: the engine trades MIS

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        self.traded_today = True  # no trade until the first opening range is known

    # on_bar runs at the close of every 5-minute bar.
    def on_bar(self, bar):
        clock = bar.close_time.strftime("%H:%M")  # the time this bar closed, as text such as "09:30"
        if clock == "09:30":  # the first three bars are done: the opening range is known
            self.range_high = max(self.high[-3:])  # highest high of the last 3 bars
            self.range_low = min(self.low[-3:])  # lowest low of the last 3 bars
            self.traded_today = False  # a new day: one trade allowed
        elif "09:30" < clock < "11:00" and not self.traded_today:  # mornings only
            if bar.close < self.range_low:  # the bar closed below the range: a breakdown
                self.sell(stop=self.range_high - bar.close)  # sell short; stop-loss at the range high
                self.traded_today = True


# Run the backtest on SBIN 5-minute bars, 1 August to 11 November 2026, with Rs 1,00,000.
result = bt.backtest(OpeningRangeBreakdown, client, start="2026-08-01", end="2026-11-11", capital=100_000)

# Print the summary. f"..." is an f-string: the values in braces are filled in.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 380.76
Return       : 0.38%
Max drawdown : -3.67%
Trades       : 23 (57% won)
```

* `self.sell()` while holding nothing opens a short. The engine squares it off at 15:00 by buying the shares back.
* For a short, the stop-loss is above the selling price: the trade loses when the price rises.
* The short side made a small profit, Rs 380.76 from 23 trades, over the same three months in which the long side of lesson 5 lost Rs 4,648.41.

## What happens to a delivery short

The next block continues from the one above: add it below it in the same file. It tries to sell SBIN short on daily bars, where the engine trades CNC, each time the 20-day EMA falls below the 50-day EMA:

<!-- requires-server -->
<!-- continues -->
```python
# ta: OpenAlgo's indicators, for the two EMAs.
from openalgo import ta


# A daily strategy that tries to sell short when the 20-day EMA crosses below the 50-day EMA.
class ShortInDelivery(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # daily bars: the engine trades CNC
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # Once, before the first bar: the two EMAs (self.I makes an indicator read at every bar).
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # At the close of every day: sell short when the fast EMA crosses below the slow EMA.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until there are 50 days for the slow EMA
            return
        if self.position.is_flat and self.fast_ema.crossed_below(self.slow_ema):
            self.sell()  # a delivery short: the engine refuses it


# Run it, then print the number of trades and the engine's first warning.
result = bt.backtest(ShortInDelivery, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print("Trades:", result.metrics["trades"])
print(result.warnings[0])
```

<!-- output -->
```text
Trades: 0
12 of 12 orders were rejected with reject_code 'product_rule' (result.orders), the first decided at 2021-04-16 15:30 IST: a delivery (CNC) short is not allowed in Indian cash markets; short a stock intraday with MIS, or trade futures
```

Every sell was rejected, so there were no trades, and the warning says why and what to do instead. A refused order does not stop the backtest: always read `result.warnings` when a run trades less than you expect.

## Flip between long and short

`self.target(qty=80)` means "be long 80 shares", and `self.target(qty=-80)` means "be short 80 shares". The engine works out the order: if you are short 80 and ask to be long 80, it buys 160 in one order, 80 to close the short and 80 to open the long. If you already hold the target, it does nothing.

This strategy takes both sides of the opening range: long after a close above the range, short after a close below it, and it flips when the price later breaks the other side. A flip needs time, so it watches until 14:30. 80 shares of SBIN cost about Rs 85,000 in these months, inside the Rs 1,00,000.

<!-- requires-server -->
<!-- continues -->
```python
# Long above the opening range, short below it, flipping when the other side breaks.
class LongOrShort(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: MIS

    # At the close of every 5-minute bar: note the range, then follow the breaks.
    def on_bar(self, bar):
        clock = bar.close_time.strftime("%H:%M")  # the time this bar closed
        if clock == "09:30":  # the opening range is known
            self.range_high = max(self.high[-3:])  # highest high of the first 3 bars
            self.range_low = min(self.low[-3:])  # lowest low of the first 3 bars
        elif "09:30" < clock < "14:30":  # look for breaks until 14:30
            if bar.close > self.range_high:
                self.target(qty=80)  # be long 80 shares (buys back a short first)
            elif bar.close < self.range_low:
                self.target(qty=-80)  # be short 80 shares (sells a long first)


# Run it and print the summary.
result = bt.backtest(LongOrShort, client, start="2026-08-01", end="2026-11-11", capital=100_000)
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
# The fills of 17 August 2026, a day the strategy flipped from short to long.
fills = result.fills[["time", "side", "quantity_units", "price_rupees", "reason"]]
print(fills[fills["time"].dt.strftime("%Y-%m-%d") == "2026-08-17"].to_string(index=False))
```

<!-- output -->
```text
Net profit   : Rs -3,910.25
Return       : -3.91%
Max drawdown : -10.74%
Trades       : 75 (48% won)
                     time side  quantity_units  price_rupees    reason
2026-08-17 10:20:00+05:30 SELL            80.0       1054.55     entry
2026-08-17 13:00:00+05:30  BUY            80.0       1065.25    signal
2026-08-17 13:00:00+05:30  BUY            80.0       1065.25     entry
2026-08-17 15:00:00+05:30 SELL            80.0       1063.05 scheduler
```

On 17 August SBIN first broke below its opening range, so the strategy sold 80 shares short (`entry`). Later the price closed above the range high: the next fill bought back the 80 short shares (`signal`) and bought 80 more to open the long (`entry`), at the same price. The long was squared off at 15:00 (`scheduler`). Both sides lost a little that day: a flip pays only when the second break runs further than the first. Over the three months the strategy made 75 trades and lost Rs 3,910.25.

## More options

* Flip with `sell` instead of `target`: while long 80 shares, `self.sell(qty=160, reverse=True)` sells the 80 and opens a short of 80. Without `reverse=True`, a sell larger than your long is rejected.
* Shorts that are held overnight need futures: [Futures](../futures.md).
* The reject codes and what each means: [Reject codes](../orders-and-risk.md#reject-codes).

## What you learned

* `self.sell()` with no position opens a short; a short gains when the price falls.
* In Indian cash markets a stock can be shorted only intraday (MIS). A delivery (CNC) short is rejected, and `result.warnings` says so.
* `self.target(qty=...)` sets the position you want, long (positive) or short (negative), and flips in one order.

## Next lesson

[Trade Futures](07-futures.md): run a strategy on futures, which trade in lots and can be held overnight, long or short.
