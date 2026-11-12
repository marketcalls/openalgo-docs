# Position Sizing

The same entries and exits can make or lose very different amounts depending on how much you buy each time. Deciding how much to buy is position sizing. This page runs the [EMA crossover](ema-crossover.md) on RELIANCE three times, with the same signals and three ways of sizing each entry, and compares the results. An EMA (exponential moving average) is the average closing price of the last few days, with the recent days counting more.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry and exit:** as in the EMA crossover: buy when the 20-day EMA crosses above the 50-day, sell when it crosses back below.
* **Size**, one of:
  * a fixed 50 shares every trade (`bt.size.qty(50)`);
  * 10 percent of the current equity, the cash plus the value of the shares held (`bt.size.percent(10)`);
  * 1 percent of equity at risk, with a stop-loss 2 ATR below the entry (`bt.size.atr_risk(1, mult=2)` with `stop=bt.atr(2)`): a volatile stock gets fewer shares, a calm one more. A stop-loss is an exit that limits the loss of a trade, and the ATR (average true range) is how far the price moves in a typical day.
* **Product:** CNC (delivery: the shares are held overnight), long only, on RELIANCE (NSE) daily bars (one bar per trading day) from January 2021 to 11 November 2026, with Rs 1,00,000.

## The code

The first block is the EMA crossover with the strategy's `size` set to 50 shares: every `self.buy()` without a quantity takes the strategy's `size`.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # "D": daily bars
    fast = 20
    slow = 50
    size = bt.size.qty(50)  # how much each buy() takes: 50 shares

    def init(self):
        # Runs once, before the first bar: the two EMAs of the closing prices.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
trades = result.trades
print(f"Net profit Rs {m['net_profit']:,.2f}, max drawdown {m['max_drawdown']:.2%}, {m['trades']} trades")
print(f"Average position Rs {(trades['entry_units'] * trades['entry_price_rupees']).mean():,.0f}")
```

<!-- output -->
```text
Net profit Rs -5,554.35, max drawdown -16.09%, 15 trades
Average position Rs 64,271
```

The same strategy with 10 percent of the current equity in each trade. `class TenPercent(EmaCrossover)` makes a copy of the strategy in which only `size` changes.

<!-- continues -->
<!-- requires-server -->
```python
class TenPercent(EmaCrossover):
    size = bt.size.percent(10)  # 10 percent of the current equity


result = bt.backtest(TenPercent, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
trades = result.trades
print(f"Net profit Rs {m['net_profit']:,.2f}, max drawdown {m['max_drawdown']:.2%}, {m['trades']} trades")
print(f"Average position Rs {(trades['entry_units'] * trades['entry_price_rupees']).mean():,.0f}")
```

<!-- output -->
```text
Net profit Rs -675.91, max drawdown -2.92%, 15 trades
Average position Rs 10,021
```

The same strategy risking 1 percent of equity on each trade. The risk sizer needs to know where the stop is, so the buy also places a stop 2 ATR below the entry.

<!-- continues -->
<!-- requires-server -->
```python
class OnePercentRisk(EmaCrossover):
    size = bt.size.atr_risk(1, mult=2)  # lose 1 percent of equity if the stop 2 ATR away is hit

    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.atr(2))  # the stop the sizer measures the risk to
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(OnePercentRisk, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
trades = result.trades
print(f"Net profit Rs {m['net_profit']:,.2f}, max drawdown {m['max_drawdown']:.2%}, {m['trades']} trades")
print(f"Average position Rs {(trades['entry_units'] * trades['entry_price_rupees']).mean():,.0f}")
```

<!-- output -->
```text
Net profit Rs -4,371.88, max drawdown -10.22%, 15 trades
Average position Rs 25,500
```

## Reading it

The entries were the same in all three runs, so the loss and the drawdown (the largest fall of the account from its highest value) grew with the money at work: about Rs 64,000 a trade for 50 shares, Rs 10,000 for 10 percent of equity. Risk sizing put about Rs 25,500 into each trade, sized so that the stop 2 ATR away would cost about 1 percent of equity, which keeps the loss of a trade about the same whether the stock is calm or volatile.

## Try this

* Cap any position at 50 percent of equity, whatever the sizer says: add `size_caps = bt.size.caps(position=bt.pct(50))` to the class.
* Size every trade from the starting capital instead of the current equity, so sizes do not grow or shrink with the results: add `reinvest = False` to the class.
* Risk half a percent instead: `bt.size.atr_risk(0.5, mult=2)`.

All the sizers, your own sizing function, and the caps: [Sizing](../costs-slippage-and-margin.md#sizing).
