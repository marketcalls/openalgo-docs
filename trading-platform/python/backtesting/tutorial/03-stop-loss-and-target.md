# Stop-Loss and Target

In this lesson you add an exit to every trade of the [EMA crossover](01-first-backtest.md): a stop-loss, a target, and a trailing stop. Each is one argument of `self.buy()`, and each block shows how it changes the result.

* A **stop-loss** (or stop) sells when the price falls a set distance below your buying price, so one trade cannot lose too much.
* A **target** sells when the price has risen a set distance above your buying price, to book the profit.
* A **trailing stop** is a stop that rises with the price and never moves down, so it keeps part of a gain.

The distance is written `bt.pct(3)`: 3 percent of your buying price.

Without any of them, lesson 1 made Rs 53,267.48 (53.27 percent), with a max drawdown of -29.82 percent, from 11 trades.

## A stop-loss

The strategy of lesson 1, with one change: `self.buy(stop=bt.pct(3))` sells if the price falls 3 percent below the buying price. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The EMA crossover of lesson 1. A class groups the strategy's settings and steps under one name.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I: an indicator read at every bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every day and decides what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until there are 50 days for the slow EMA
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.pct(3))  # buy, with a stop-loss 3 percent below the buying price
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest over the same dates and capital as lesson 1.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. f"..." is an f-string: the values in braces are filled in.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 39,430.64
Return       : 39.43%
Max drawdown : -23.57%
Trades       : 11 (27% won)
```

**What changed:** the stop closed 7 of the 11 trades before the EMAs crossed back, so the worst fall of the account was smaller (-23.57 percent against -29.82), but it also sold some trades that recovered later, and the profit fell.

The stop is checked every day, from the day you buy. On a CNC (delivery) position the engine holds it as a **GTT order** (good till triggered: an order your broker keeps open across days until its price is reached), the way your broker would hold it overnight.

## A target

The next block continues from the one above: add it below it in the same file. `class WithTarget(EmaCrossover)` makes a new strategy that starts as a copy of `EmaCrossover`; only the `on_bar` written in it changes. Here the buy has a target 20 percent above the buying price, and no stop.

<!-- requires-server -->
<!-- continues -->
```python
# A copy of EmaCrossover with a new on_bar: a target instead of the stop.
class WithTarget(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up, as before
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(target=bt.pct(20))  # buy, and sell once the price is 20 percent higher
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it and print the summary.
result = bt.backtest(WithTarget, client, start="2021-01-01", end="2026-11-11", capital=100_000)
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 34,098.52
Return       : 34.10%
Max drawdown : -22.74%
Trades       : 11 (36% won)
```

**What changed:** 4 trades sold at the target, which booked their profit before the price fell back, so the max drawdown was smaller; but it also cut the big trends short, and those made most of the profit.

## A trailing stop

A trailing stop of 15 percent: once the price has risen 15 percent above your buying price, the stop starts following the highest price at a distance of 15 percent, and never moves down. Before that the trade has no stop.

<!-- requires-server -->
<!-- continues -->
```python
# A copy of EmaCrossover with a new on_bar: a trailing stop.
class WithTrailingStop(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up, as before
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(trail=bt.trail_pct(15))  # buy, with a stop that follows the price 15 percent below
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it and print the summary.
result = bt.backtest(WithTrailingStop, client, start="2021-01-01", end="2026-11-11", capital=100_000)
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 63,367.77
Return       : 63.37%
Max drawdown : -25.17%
Trades       : 11 (36% won)
```

**What changed:** the trailing stop sold 4 trades after a rise of at least 15 percent, keeping part of their gain instead of giving it back while waiting for the EMAs to cross. Here that gave more profit than lesson 1 and a smaller drawdown.

## Side by side

| Exit added to `self.buy()` | Net profit | Return | Max drawdown | Trades won |
|---|---|---|---|---|
| None (lesson 1) | Rs 53,267.48 | 53.27% | -29.82% | 36% |
| `stop=bt.pct(3)` | Rs 39,430.64 | 39.43% | -23.57% | 27% |
| `target=bt.pct(20)` | Rs 34,098.52 | 34.10% | -22.74% | 36% |
| `trail=bt.trail_pct(15)` | Rs 63,367.77 | 63.37% | -25.17% | 36% |

These numbers are for SBIN over these six years. Another stock or another period can rank the exits differently, so do not pick a setting only because it did best here; [Find Better Settings](09-find-better-settings.md) shows how to test that properly.

## More options

* Stop and target together: `self.buy(stop=bt.pct(3), target=bt.pct(20))`. If one day reaches both, the engine assumes the stop came first, the worse case.
* A distance in rupees instead of percent: `stop=20` (20 rupees below the buying price). In ATR, the average size of a day's move: `stop=bt.atr(2)`.
* Move the stop up to the buying price after a 5 percent gain: `breakeven=bt.breakeven(bt.pct(5))`.
* Sell half at the first target: `targets=[(bt.pct(10), 0.5)]`.
* All the forms and how they are tested: [Stops, targets and scale-out](../orders-and-risk.md#how-do-i-add-a-stop-loss) and [Trailing stops](../orders-and-risk.md#how-do-i-add-a-trailing-stop).

## What you learned

* A stop-loss, a target and a trailing stop are each one argument of `self.buy()`: `stop=`, `target=`, `trail=`.
* `bt.pct(3)` is a distance of 3 percent of the buying price.
* Every exit has a cost: a stop limits each loss but can sell a trade that would have recovered, and a target books profit but cuts the long trends short.

## Next lesson

[How Much to Buy](04-how-much-to-buy.md): a fixed number of shares, a part of your capital, or an amount set by how much you are willing to lose.
