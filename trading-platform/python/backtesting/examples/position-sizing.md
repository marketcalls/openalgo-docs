# Position Sizing

The same entries and exits can make or lose very different amounts depending on how much you buy each time. This page runs the [EMA crossover](ema-crossover.md) on RELIANCE three times, with the same signals and three ways of sizing each entry, and compares the results.

## Rules

* **Entry and exit:** as in the EMA crossover: buy when the 20-day EMA crosses above the 50-day, sell when it crosses back below.
* **Size**, one of:
  * a fixed 50 shares every trade (`bt.size.qty(50)`);
  * 10 percent of the current equity (`bt.size.percent(10)`);
  * 1 percent of equity at risk, with a stop 2 ATR below the entry (`bt.size.atr_risk(1, mult=2)` with `stop=bt.atr(2)`): a volatile stock gets fewer shares, a calm one more.
* **Product:** CNC (delivery), long only, on RELIANCE (NSE) daily bars from January 2021 to 11 November 2026, with Rs 1,00,000.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")

# Three ways to size each entry. The risk sizer needs a stop, so it gets a 2 ATR stop.
SIZERS = {
    "50 shares": {"size": bt.size.qty(50)},
    "10% of equity": {"size": bt.size.percent(10)},
    "1% risk": {"size": bt.size.atr_risk(1, mult=2), "stop": bt.atr(2)},
}


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"
    fast = 20
    slow = 50
    sizing = "50 shares"  # which entry of SIZERS to use

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(**SIZERS[self.sizing])
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


print(f"{'Sizing':14} {'Net profit':>11} {'Max drawdown':>13} {'Trades':>7} {'Avg position':>13}")
for name in SIZERS:
    result = bt.backtest(
        EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000, params={"sizing": name}
    )
    m = result.metrics
    trades = result.trades
    position_value = (trades["entry_units"] * trades["entry_price_rupees"]).mean()
    print(f"{name:14} {m['net_profit']:11,.2f} {m['max_drawdown']:13.2%} {m['trades']:7} {position_value:13,.0f}")
```

```text
Sizing          Net profit  Max drawdown  Trades  Avg position
50 shares        -5,549.00       -16.09%      15        64,271
10% of equity      -675.18        -2.92%      15        10,022
1% risk          -4,371.26       -10.22%      15        25,505
```

The signals were the same in all three runs, so the loss and the drawdown grew with the money at work: about Rs 64,000 a trade for 50 shares, Rs 10,000 for 10 percent of equity. Risk sizing put about Rs 25,000 into each trade, sized so that the stop 2 ATR away would cost about 1 percent of equity, which keeps the loss of a trade about the same whether the stock is calm or volatile.

`params={"sizing": name}` runs the same class with another value of its `sizing` attribute, so one class serves all three runs.

## Try this

* Cap any position at 50 percent of equity, whatever the sizer says: add `size_caps = bt.size.caps(position=bt.pct(50))` to the class.
* Size every trade from the starting capital instead of the current equity, so sizes do not grow or shrink with the results: add `reinvest = False` to the class.
* Risk half a percent instead: `bt.size.atr_risk(0.5, mult=2)`.

All the sizers, your own sizing function, and the caps: [Sizing](../costs-slippage-and-margin.md#sizing).
