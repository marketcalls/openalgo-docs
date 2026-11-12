# Trade Futures

So far every lesson traded shares. In this lesson you run the same EMA crossover on NIFTY futures, and learn three words every futures trader uses: contract, lot and margin.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Futures in three ideas

* **A futures contract** is an agreement to buy or sell NIFTY on a set date, its expiry. Its price moves with the NIFTY index. Every month has its own contract: `NIFTY23NOV26FUT` is the one that expires on 23 November 2026.
* **A lot** is the fixed number of units a contract trades in: 65 for NIFTY. You buy whole lots only. One lot at a price of 22,800 is worth about Rs 14.8 lakh (65 x 22,800).
* **Margin** is the money your broker blocks while you hold a position. It is only a part of the contract's value, so Rs 5 lakh is enough to hold one lot worth Rs 14.8 lakh. Your profit or loss is still on the full value.

Your broker serves a contract's history only while the contract trades, so this lesson tests the November 2026 contract from 1 October to 11 November 2026. After 23 November 2026, switch to the current contract (for example `NIFTY29DEC26FUT`) and dates inside its life.

## The strategy on NIFTY futures

The EMA crossover of the first lesson (buy when the 20-bar EMA, an average of recent closes that counts the latest most, crosses above the 50-bar EMA; sell when it crosses back) with three changes: the contract as the symbol, 15-minute bars, and `lots=1` in the buy. A bar is one period of prices, here 15 minutes, with its open, high, low and close. On 15-minute bars the engine trades MIS (intraday): no new entry after 15:00, and every open position is closed (squared off) at 15:10.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class NiftyFuturesEma(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV26FUT", "NFO", "15m"  # the November contract, 15-minute bars
    fast = 20  # bars in the fast EMA
    slow = 50  # bars in the slow EMA

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every 15-minute bar: decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs 50 bars first
            return
        # crossed_above: the fast EMA was below the slow one a bar ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(lots=1)  # one lot: 65 units of NIFTY futures
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell the lot


# Run the backtest with Rs 5,00,000, enough for the margin of one lot.
result = bt.backtest(NiftyFuturesEma, client, start="2026-10-01", end="2026-11-11", capital=500_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# Every trade: when it opened and closed, how many units, and its profit after charges.
trades = result.trades[["entry_time", "exit_time", "entry_units", "net_pnl_rupees"]]
print(trades.to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 31,722.48
Return       : 6.34%
Max drawdown : -1.54%
Trades       : 4 (100% won)
               entry_time                 exit_time  entry_units  net_pnl_rupees
2026-10-09 13:15:00+05:30 2026-10-09 15:10:00+05:30        65.00          762.54
2026-10-13 10:30:00+05:30 2026-10-13 15:10:00+05:30        65.00        10343.47
2026-10-26 13:15:00+05:30 2026-10-26 15:10:00+05:30        65.00         6249.03
2026-10-29 09:30:00+05:30 2026-10-29 15:10:00+05:30        65.00        14368.12
```

* Every trade was one lot, 65 units, and every one was closed at 15:10 by the engine's square-off.
* A trade's profit is the points the price moved times 65. On 29 October NIFTY futures rose 234.80 points after the entry: 234.80 x 65 = Rs 15,262 before charges, Rs 14,368.12 after them.
* The max drawdown (the largest fall of the account from its highest value) was only 1.54 percent, because every trade made money.
* Four trades in six weeks are far too few to judge a strategy. The point of this lesson is how futures work, not this result.

## Margin

The engine blocks **20 percent of the contract value** as margin for every futures position, unless you give it your broker's figure. Real margins change every day; your broker's margin calculator shows the figure for one lot. Pass it with `margin=`: `bt.rupees(...)` for rupees per lot, or `bt.pct(...)` for a percent of the contract value. This block continues the one above:

<!-- continues -->
<!-- requires-server -->
```python
# The most margin the run above blocked, with the default of 20 percent.
print(f"Margin, default    : Rs {result.equity['margin_rupees'].max():,.2f}")

# The same backtest with your broker's margin for one lot, here Rs 2,00,000.
own = bt.backtest(NiftyFuturesEma, client, start="2026-10-01", end="2026-11-11", capital=500_000,
                  margin=bt.rupees(200_000))
print(f"Margin, your figure: Rs {own.equity['margin_rupees'].max():,.2f}")
print(f"Net profit         : Rs {own.metrics['net_profit']:,.2f}")  # the same as before
```

<!-- output -->
```text
Margin, default    : Rs 296,595.00
Margin, your figure: Rs 200,000.00
Net profit         : Rs 31,722.48
```

The default blocked about Rs 2.97 lakh: 20 percent of one lot at about 22,815 (0.20 x 65 x 22,815). With your broker's figure it blocked Rs 2 lakh instead, and the net profit did not change: margin is money set aside while a position is open, not a cost. It matters when your capital is small: an order that needs more margin than your free cash is rejected, as your broker would reject it.

## What you learned

* A futures contract trades in lots: `self.buy(lots=1)` buys one lot, 65 units of NIFTY.
* Intraday futures (MIS) are squared off by the engine at 15:10, so no position is held overnight.
* Margin is money blocked, not money spent: 20 percent of the contract value by default, or your broker's figure with `margin=`.

## More options

* Sell short (sell first, buy back later, to gain from a fall): `self.sell(lots=1)`. See the [NIFTY futures opening range breakout](../examples/nifty-futures-opening-range-breakout.md), which trades both ways.
* Hold the position overnight: add `product = "NRML"` under the `symbol` line.
* Trade NIFTY futures without naming a contract, with the roll to the next contract done for you: [Futures](../futures.md).

**Next lesson:** [Compare with NIFTY](08-compare-with-nifty.md)
