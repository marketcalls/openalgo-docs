# Backtesting

{% hint style="warning" %}
**Preview.** The backtesting engine (`openalgo.backtest`) is new in OpenAlgo Python SDK 2.1.0. It is a preview: names and arguments may still change in later releases. The pages in this section describe the engine as released in SDK 2.1.1.
{% endhint %}

## What is a backtest?

A backtest runs a trading strategy on past prices to show what it would have done. You write the rules once in Python (when to buy, when to sell), and OpenAlgo replays years of real prices from your broker through them, with Indian charges, slippage and session times applied to every trade. You see the profit, the worst fall along the way and every trade before you risk any money.

## What you need

1. **A running OpenAlgo server**, logged in to your broker. See [Getting Started](../../../getting-started/README.md) to install it.
2. **Your API key**, from the API Key page of your OpenAlgo dashboard. The code on these pages writes `OPENALGO_API_KEY` where your key goes.
3. **Python 3.12 or newer, and the OpenAlgo library:**

```bash
pip install -U openalgo
```

## Your first backtest in five minutes

The strategy buys SBIN when its 20-day EMA crosses above its 50-day EMA, and sells when the 20-day EMA crosses back below. An EMA (exponential moving average) is the average closing price of the last few days, with the recent days counting more. The test runs on daily bars (one bar of prices per trading day) from 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.

Copy the code into a file such as `first_backtest.py`, put your API key in place of `OPENALGO_API_KEY`, and run `python first_backtest.py`.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class groups the strategy's settings and steps under one name.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        # self.I(...) makes an indicator line that the strategy can read at every bar.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # 20-day EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, self.slow)  # 50-day EMA of the closes

    # on_bar runs at the close of every bar (here once a day) and decides what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until there are 50 days for the slow EMA
            return
        # Buy when holding nothing (is_flat) and the fast EMA crosses above the slow EMA.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        # Sell when holding shares (is_long) and the fast EMA crosses back below.
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.
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
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

[Lesson 1](tutorial/01-first-backtest.md) explains this code line by line.

## What the four numbers mean

* **Net profit:** the strategy turned Rs 1,00,000 into Rs 1,53,267.48, after every charge (brokerage, STT, stamp duty, GST and the rest).
* **Return:** that profit as a percent of the starting capital.
* **Max drawdown:** the largest fall of the account from its highest value to a later low. At its worst, the account was 29.82 percent below its best value so far.
* **Trades:** 11 round trips (a buy and the sell that closed it), of which 36 percent, 4 trades, made money. A few long rises paid for the many small losses.

[Lesson 2](tutorial/02-read-the-results.md) shows every trade, the full HTML report, and what the engine assumed for you (the product, fills, charges, slippage and sessions).

## Where to go next

* [Tutorial](tutorial/README.md): eleven short lessons, from this first backtest to stops, sizing, intraday, shorts, futures and portfolios. Start here.
* [Examples](examples/README.md): complete strategies on real market data (EMA, SMA, MACD, Supertrend, RSI, the opening range breakout and futures), each with its code and its output.
* [How do I ...?](how-to.md): short answers to the common questions, each with a small example.

The reference pages explain every option:

* [Writing Strategies](writing-strategies.md): the strategy class, indicators, other timeframes and condition strategies.
* [Orders and Risk](orders-and-risk.md): orders, stops, targets, trailing stops, intraday times and risk rules.
* [Costs, Slippage and Margin](costs-slippage-and-margin.md): what is charged, margin and sizing.
* [Futures](futures.md): futures by underlying, the roll, mark to market and settlement.
* [Data](data.md): OpenAlgo history, your own data, quality checks, splits and bonuses.
* [Results and Reports](results-and-reports.md) and [Metric Definitions](metric-definitions.md): every table, figure and the tearsheet.
* [Optimization](optimization.md): parameter sweeps.
* [Support Functions](support-functions/README.md): the calendar, cost calculator, reference data, resampling and metrics on their own.

## Speed and repeatable results

The calculations (fills, positions, charges, the ledger, the metrics) run in a compiled Rust core. On one core of a current desktop, a strategy with `on_bar` runs about 575,000 bars a second, and a [condition strategy](writing-strategies.md#can-i-write-the-rules-as-conditions) on 1,000,000 one-minute bars with about 9,300 round trips takes about 1.1 seconds (measured with `benchmark/backtest_speed.py` in the SDK repository). Your own `on_bar` code and indicators add their own time.

The same strategy on the same data and settings gives the same result every time. The equity curve and the trade table use exact arithmetic (prices in whole price units, the ledger in paise), so they are identical on every platform; a metric that uses logarithms or powers can differ in its last digits on another operating system, always within one part in a billion.

## Not available yet

The following are part of the design but not built. Each raises `NotImplementedError` with a message that says what to do instead, so nothing is ignored silently.

* `bt.live`: trading a strategy through OpenAlgo. Whether its orders are simulated (sandbox mode) or sent to your broker will be decided by the analyzer switch inside OpenAlgo, never by an argument in your code.
* `fill="close"` (filling at the decision bar's close).
* Walk-forward optimization (`bt.walk_forward`).
* Several strategies in one run, pairs (`pair_long`, `pair_short`), the portfolio runner `bt.rebalance` (to rebalance today, call `self.rebalance` inside a strategy, as in [Equal-Weight Rebalancing](examples/rebalancing.md)), and strategies declared on a `universe`.
* Condition strategies on a futures underlying, and other intervals of a futures series (`self.data[underlying, "15m"]`).
* The combined rules `combined_stop`, `combined_target`, `lock_profit` and `trail_sl_to_entry`, and `after_risk_exit="allow_reentry"`, which only they would use.
* `cooldown` and `max_hold` given as a time (such as `"30m"`); give them in bars.
* One indicator over two symbols or two intervals, and open interest in strategy bars.
* Selling an option to open a short position (short-option margin).
* Holding a position or a GTT order across a split or bonus that the bars are not adjusted for (declared with `corporate_actions=`); supply adjusted bars or run on other dates.
