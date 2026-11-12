# How Much to Buy

So far every buy used all the capital. In this lesson you choose how much each trade buys, which is called **position sizing**: a fixed number of shares, a part of your capital, or an amount set by how much you are willing to lose. The entries and exits stay those of the [EMA crossover](01-first-backtest.md); only the size of each buy changes.

Each block also prints the average amount put into a trade (the shares bought times the buying price), so you can see the size at work.

## A fixed quantity

`self.buy(qty=100)` buys 100 shares every time, whatever the price. Quantities are always in shares (units), never in lots (a lot is the fixed bundle that futures and options trade in). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

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
            self.buy(qty=100)  # buy 100 shares
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
# The average amount put into a trade: shares bought times the buying price.
invested = result.trades["entry_units"] * result.trades["entry_price_rupees"]
print(f"Average buy  : Rs {invested.mean():,.0f}")
```

<!-- output -->
```text
Net profit   : Rs 24,756.04
Return       : 24.76%
Max drawdown : -23.55%
Trades       : 11 (36% won)
Average buy  : Rs 67,321
```

**What changed:** 100 shares cost about Rs 36,000 in 2021 and over Rs 1,00,000 in 2026, so the early trades used about a third of the capital and the 2026 ones most of it. The trades were the same as in lesson 1, but less money was at work, so the profit and the drawdown were both smaller.

## A percent of your capital

The next block continues from the one above: add it below it in the same file. `class HalfCapital(EmaCrossover)` makes a new strategy that starts as a copy of `EmaCrossover`; only the `on_bar` written in it changes. `bt.size.percent(50)` buys for 50 percent of your **equity**: your cash plus the value of the shares you hold, so the size grows as the account grows.

<!-- requires-server -->
<!-- continues -->
```python
# A copy of EmaCrossover with a new on_bar: each buy takes half the equity.
class HalfCapital(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up, as before
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(size=bt.size.percent(50))  # buy for 50 percent of the equity
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it and print the summary and the average buy.
result = bt.backtest(HalfCapital, client, start="2021-01-01", end="2026-11-11", capital=100_000)
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
invested = result.trades["entry_units"] * result.trades["entry_price_rupees"]
print(f"Average buy  : Rs {invested.mean():,.0f}")
```

<!-- output -->
```text
Net profit   : Rs 27,236.50
Return       : 27.24%
Max drawdown : -17.62%
Trades       : 11 (36% won)
Average buy  : Rs 57,191
```

**What changed:** each trade put half the account to work and kept the other half in cash, so the profit was about half of lesson 1's and the drawdown much smaller (-17.62 percent against -29.82).

## Risk-based sizing with a stop

Risk-based sizing starts from the loss you accept on one trade. `bt.size.fixed_risk(1)` buys as many shares as would lose 1 percent of your equity if the stop-loss is hit, so it needs a stop: here 3 percent below the buying price. Losing 1 percent of the equity on a 3 percent fall means buying for about a third of the equity.

<!-- requires-server -->
<!-- continues -->
```python
# A copy of EmaCrossover with a new on_bar: the size is set by the risk to the stop.
class OnePercentRisk(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up, as before
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            # Lose at most 1 percent of the equity if the stop, 3 percent below, is hit.
            self.buy(size=bt.size.fixed_risk(1), stop=bt.pct(3))
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it and print the summary and the average buy.
result = bt.backtest(OnePercentRisk, client, start="2021-01-01", end="2026-11-11", capital=100_000)
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
invested = result.trades["entry_units"] * result.trades["entry_price_rupees"]
print(f"Average buy  : Rs {invested.mean():,.0f}")
```

<!-- output -->
```text
Net profit   : Rs 12,426.75
Return       : 12.43%
Max drawdown : -8.83%
Trades       : 11 (27% won)
Average buy  : Rs 33,910
```

**What changed:** each trade used about a third of the equity, and a trade stopped out lost about 1 percent of it. The max drawdown fell to under 9 percent, the smallest on this page, and so did the profit: less money at risk means less to gain as well as less to lose.

## Side by side

| Size of each buy | Net profit | Return | Max drawdown | Average buy |
|---|---|---|---|---|
| All the capital (lesson 1) | Rs 53,267.48 | 53.27% | -29.82% | All the equity |
| `qty=100` | Rs 24,756.04 | 24.76% | -23.55% | Rs 67,321 |
| `size=bt.size.percent(50)` | Rs 27,236.50 | 27.24% | -17.62% | Rs 57,191 |
| `size=bt.size.fixed_risk(1)`, `stop=bt.pct(3)` | Rs 12,426.75 | 12.43% | -8.83% | Rs 33,910 |

Profit and drawdown grow together with the money at work. Choose the size by the fall you can live with, then look at the profit.

## More options

* A rupee amount: `size=bt.size.value(50_000)` buys Rs 50,000 worth each time.
* Set the size once for every buy with a class setting: `size = bt.size.percent(50)` at the top of the class, then a plain `self.buy()`.
* Whole shares instead of fractional ones: `bt.backtest(..., quantity_mode="venue")`.
* Size every trade from the starting capital, so sizes do not grow or shrink with the results: add `reinvest = False` to the class.
* Risk sized to the stock's daily moves: `size=bt.size.atr_risk(1, mult=2)` with `stop=bt.atr(2)`.
* All the sizers and limits: [Sizing](../costs-slippage-and-margin.md#how-do-i-choose-how-many-shares-to-buy).

## What you learned

* `qty=` buys a fixed number of shares; `size=bt.size.percent(...)` buys a part of your equity.
* `size=bt.size.fixed_risk(1)` with a `stop=` sizes each trade so that the stop loses 1 percent of your equity.
* The same signals make or lose very different amounts depending on the size: the smaller the money at work, the smaller both the profit and the drawdown.

## Next lesson

[Trade Intraday](05-intraday.md): an opening range breakout on 5-minute bars, bought and sold within the same day.
