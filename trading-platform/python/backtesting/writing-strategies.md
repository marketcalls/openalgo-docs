# Writing Strategies

A strategy is a small Python class that says when to buy and when to sell. This page shows how to write one, a piece at a time, starting from a complete EMA crossover on SBIN.

## Your first strategy

An **EMA** (exponential moving average) is the average closing price of the last few days, with recent days counting more. The strategy buys SBIN when the 20-day EMA crosses above the 50-day EMA (the price has started to trend up) and sells when it crosses back below. It runs on **daily bars**: a **bar** (or candle) is one period of prices, here one day, with its open, high, low and close. A stock on daily bars is traded as **CNC** (delivery): the shares are held overnight, for as long as the strategy wants.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`. Run this block first: the other blocks on this page continue from it.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the price history comes from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# A function ("def") is a named piece of code you can run again: print_summary(result).
def print_summary(result):
    m = result.metrics  # a dict: the figures of the run, looked up by name
    # f"..." fills in each {value}: ":,.2f" is rupees with commas, ":.2%" a percent.
    print(f"Net profit   : Rs {m['net_profit']:,.2f}")
    print(f"Return       : {m['total_return']:.2%}")
    print(f"Max drawdown : {m['max_drawdown']:.2%}")
    print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")


# The strategy. A class bundles settings and functions; inside it, "self" is the strategy itself.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar: set up the indicators.
    def init(self):
        # self.I adds an indicator; each bar sees only the values known at that bar.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): buy, sell or wait.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until the slow EMA has 50 days
            return
        # crossed_above: the fast EMA was below the slow one a bar ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # no quantity: all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything held, at the next day's open


# Run it on SBIN from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print_summary(result)
```

<!-- output -->
```text
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

The engine replayed almost six years of SBIN, one day at a time, and traded the rules as if you had run them live. It applied Indian charges, slippage (the small amount every fill loses to the market) and NSE holidays without being asked. The **max drawdown** is the largest fall of the account from its highest value. The [first lesson](tutorial/01-first-backtest.md) walks through this strategy line by line.

## What does each part do?

| Part | What it does |
|---|---|
| `class EmaCrossover(bt.Strategy):` | Starts the strategy. `bt.Strategy` gives it everything the engine needs |
| `symbol, exchange, interval` | What it trades and the bar size: `"D"` (daily), `"1h"`, `"15m"`, `"5m"`, `"1m"` |
| `fast = 20`, `slow = 50` | **Parameters**: numbers you can change for a run without editing the class |
| `def init(self):` | Runs once before the first bar. Set up indicators here with `self.I` |
| `self.I(ta.ema, self.close, 20)` | An indicator from the [openalgo.ta library](../indicators/README.md); any other function is refused |
| `def on_bar(self, bar):` | Runs at the close of every bar. Decide to buy, sell or wait |
| `self.position.is_flat`, `is_long`, `is_short` | True when holding nothing, holding shares, or short |
| `self.buy()`, `self.sell()`, `self.exit()` | Place an order; it fills at the next bar's open. See [Orders and Risk](orders-and-risk.md) |

The engine picks the product from the bar size: **CNC** for daily bars of a stock, **MIS** (intraday, closed the same day) for minute bars, and **NRML** (futures held overnight) for daily futures. Set `product = "MIS"` in the class to choose it yourself.

## How do I read prices and indicator values?

* `self.close[-1]` is the close of the bar that just closed and `self.close[-2]` the one before. `[-1]` means "the last one". The same works for `self.open`, `self.high`, `self.low`, `self.volume` and every indicator.
* `len(self.close)` is the number of bars closed so far. That is what the warm-up line checks.
* `a.crossed_above(b)` is true only on the bar where `a` moves from below `b` to above it; `a.crossed_below(b)` is the opposite. `b` can be a number, as in `self.rsi.crossed_above(30)`.
* `bar` in `on_bar(self, bar)` is the bar that just closed: `bar.close` is the same as `self.close[-1]`.
* You never see a bar that has not closed yet, so a strategy cannot peek into the future.

## How do I add a filter, such as RSI?

The **RSI** (relative strength index) is a 0 to 100 gauge of how strongly the price has been rising; above 70 is often called overbought. This version buys on the crossover only while the RSI is below 70, so it skips crossovers that come after a sharp run-up. It continues the first block (it needs `bt`, `ta`, `client` and `print_summary`).

<!-- continues -->
<!-- requires-server -->
```python
# The crossover with one more indicator, the 14-day RSI, as a filter on the buy.
class EmaRsi(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast, slow = 20, 50  # two parameters on one line
    rsi_limit = 70  # buy only while the RSI is below this

    # The two EMAs and the RSI.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)
        self.rsi = self.I(ta.rsi, self.close, 14)

    # Buy on the crossover only while the RSI is below the limit; sell on the cross down.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up
            return
        crossed_up = self.fast_ema.crossed_above(self.slow_ema)
        if self.position.is_flat and crossed_up and self.rsi[-1] < self.rsi_limit:  # all three true
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it over the same years and print the four numbers.
print_summary(bt.backtest(EmaRsi, client, start="2021-01-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs 17,046.03
Return       : 17.05%
Max drawdown : -30.94%
Trades       : 10 (30% won)
```

A filter takes fewer trades. Whether it helps depends on the stock and the years: compare the four numbers with and without it.

## How do I use an indicator with several lines, such as MACD?

The **MACD** is the gap between a 12-day and a 26-day EMA; its **signal line** is a 9-day EMA of that gap. `ta.macd` returns three lines (the MACD, the signal and the histogram), so `self.I` gives back three, one per name on the left.

<!-- continues -->
<!-- requires-server -->
```python
# Buy when the MACD crosses above its signal line, sell when it crosses back below.
class MacdCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"

    # The MACD with its default 12, 26 and 9 days.
    def init(self):
        self.macd, self.signal, self.histogram = self.I(ta.macd, self.close)  # three lines

    # Buy when the MACD crosses above the signal line, sell when it crosses below.
    def on_bar(self, bar):
        if len(self.close) < 35:  # warm-up: 26 days for the slow EMA plus 9 for the signal
            return
        if self.position.is_flat and self.macd.crossed_above(self.signal):
            self.buy()
        elif self.position.is_long and self.macd.crossed_below(self.signal):
            self.exit()


# Run it over the same years and print the four numbers.
print_summary(bt.backtest(MacdCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs 76,868.88
Return       : 76.87%
Max drawdown : -32.98%
Trades       : 50 (44% won)
```

The MACD turns sooner than the 20-day and 50-day EMAs, so it traded far more often.

## How do I try other values without editing the class?

Pass `params=` to `bt.backtest`. Here the 10-day and 30-day EMAs replace the 20 and 50 for one run; the class stays as it is.

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy with fast=10 and slow=30, for this run only.
faster = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     params={"fast": 10, "slow": 30})  # a dict: parameter name and its value
print_summary(faster)
```

<!-- output -->
```text
Net profit   : Rs 71,912.31
Return       : 71.91%
Max drawdown : -23.65%
Trades       : 23 (39% won)
```

A name the class does not have is an error, so a typing mistake cannot pass silently. To try many values at once and rank them, see [Optimization](optimization.md).

## How do I use 15-minute or 5-minute bars?

Change `interval`. On minute bars the engine trades **MIS**: no new entry from 14:50, and every open position is closed (squared off) at 15:00, as a broker does. The class below copies `EmaCrossover` and changes only the bar size.

<!-- continues -->
<!-- requires-server -->
```python
# "class Intraday(EmaCrossover)" copies EmaCrossover; only what is written here changes.
class Intraday(EmaCrossover):
    interval = "15m"  # 15-minute bars: 20 and 50 bars instead of days


# Run it on a recent stretch of minute bars (August to 11 November 2026) and print the four numbers.
print_summary(bt.backtest(Intraday, client, start="2026-08-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs -1,128.76
Return       : -1.13%
Max drawdown : -3.82%
Trades       : 9 (56% won)
```

Over these three months it lost a little after charges, and most trades ended at the 15:00 square-off rather than on a crossover. The [intraday lesson](tutorial/05-intraday.md) explains MIS and the square-off with an opening range breakout on 5-minute bars.

## How do I trade several stocks?

Write `symbols` (a tuple: values in round brackets) instead of `symbol`. Each stock then has its own bars in `self.data[...]` and its own position in `self.positions[...]`, and every order names its stock with `symbol=`. With no quantity, each buy takes an equal share of the capital.

<!-- continues -->
<!-- requires-server -->
```python
# The EMA crossover on two banks, each traded on its own crossover.
class TwoBanks(bt.Strategy):
    symbols, exchange, interval = ("SBIN", "ICICIBANK"), "NSE", "D"
    fast, slow = 20, 50

    def init(self):
        # One EMA per stock, kept in a dict by symbol ("for s in ..." repeats for each stock).
        self.fast_ema = {s: self.I(ta.ema, self.data[s].close, self.fast) for s in self.symbols}
        self.slow_ema = {s: self.I(ta.ema, self.data[s].close, self.slow) for s in self.symbols}

    # bars: the bars that just closed, one per stock.
    def on_bar(self, bars):
        if len(self.data["SBIN"].close) < self.slow:  # warm-up
            return
        for s in self.symbols:  # the same rules for each stock
            if self.positions[s].is_flat and self.fast_ema[s].crossed_above(self.slow_ema[s]):
                self.buy(symbol=s)
            elif self.positions[s].is_long and self.fast_ema[s].crossed_below(self.slow_ema[s]):
                self.exit(symbol=s)


# Run it with Rs 2,00,000 and print the four numbers for the whole strategy.
banks = bt.backtest(TwoBanks, client, start="2021-01-01", end="2026-11-11", capital=200_000)
print_summary(banks)
# Closed trades and net profit in rupees, per stock.
print(banks.trades.groupby("symbol")["net_pnl_rupees"].agg(["count", "sum"]).round(2))
```

<!-- output -->
```text
Net profit   : Rs 99,950.72
Return       : 49.98%
Max drawdown : -32.50%
Trades       : 23 (43% won)
           count       sum
symbol
ICICIBANK     12  25538.32
SBIN          11  57104.77
```

All the symbols of one strategy trade on one exchange.

## Can I write the rules as conditions?

Yes, for rules that are only conditions. State them once in `init` with `self.entry_when(...)` and `self.exit_when(...)`. The whole run then happens in the engine's Rust core, with no Python call per bar, so it runs and optimizes much faster.

<!-- continues -->
<!-- requires-server -->
```python
# The EMA crossover as two conditions, with no on_bar.
class EmaRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast, slow = 20, 50

    # init states the rules once; the engine checks them at every bar close.
    def init(self):
        fast_ema = self.I(ta.ema, self.close, self.fast)
        slow_ema = self.I(ta.ema, self.close, self.slow)
        self.entry_when(fast_ema.crossed_above(slow_ema))  # buy at the next open when true
        self.exit_when(fast_ema.crossed_below(slow_ema))  # sell at the next open when true


# Run it over the same years and print the four numbers.
print_summary(bt.backtest(EmaRules, client, start="2021-01-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs 79,818.10
Return       : 79.82%
Max drawdown : -29.82%
Trades       : 12 (42% won)
```

A condition strategy has no warm-up line, so it also took a crossover in the first days of January 2021, while the EMAs were still settling. That is why it made one trade more than `EmaCrossover`.

* Combine conditions with `&` (and), `|` (or) and `~` (not), not with the Python words `and`, `or`, `not`.
* A condition is a level, not an event: `entry_when(fast_ema > slow_ema)` enters again after every exit while the fast EMA is above. Use `crossed_above` to enter only on the bar of the cross.
* `self.short_when(...)` and `self.cover_when(...)` do the same for a short.

## Why was my indicator refused?

Some indicators use bars that come later, which no live strategy could know. `ta.fractals`, for example, is refused before the run starts with a `ConfigError` that says `ta.fractals cannot be used in a strategy, it looks ahead`. Before the first bar the engine also tests every indicator on the data cut at several points, and stops the run if a value changes when later bars are removed.

## More options

* **Callbacks:** `on_fill`, `on_order`, `on_position` and `on_risk_event` run before `on_bar` for each event since the last bar; `on_stop(self)` runs once at the end.
* **The bar:** `bar.open`, `bar.high`, `bar.low`, `bar.close`, `bar.volume`, `bar.time` (when it opened, IST) and `bar.close_time`.
* **Account and position:** `self.equity`, `self.cash`, `self.now`, `self.position.qty` (negative when short), `self.position.avg_price`, `self.position.unrealized`.
* **Instrument:** `self.instrument()` gives the lot size, tick size, freeze quantity and expiry.
* **Your own values:** `self.state` is a dict that starts empty each run.
* **History as a table:** `self.history(None, 20)` returns the last 20 bars as a DataFrame.
* **Other timeframes:** `self.data["SBIN", "15m"]` gives 15-minute bars of the same stock, each visible once it has closed.
* **Timers:** `self.at("09:20", fn)` runs `fn` at that time every session; `self.every("month", fn)` once a week, month, quarter or year.
* **Condition tools:** `.shift(n)`, `.rolling_max(n)`, `.rolling_min(n)`, `bt.time_between("09:30", "14:30")`, `bt.weekday("Mon")`, and `qty=`, `stop=` or `size=` on `entry_when`.
* **Signals you compute:** `bt.from_signals(function, "SBIN", "NSE", "D")` or `bt.from_arrays(entries, exits, ...)` builds a condition strategy.
* **Values to optimize:** `fast = bt.param(20, (10, 20, 30))` (see [Optimization](optimization.md)).
* **Settings on other pages:** sizing and leverage on [Costs, Slippage and Margin](costs-slippage-and-margin.md); risk rules and session times on [Orders and Risk](orders-and-risk.md); `underlying` and `expiry` on [Futures](futures.md).
* **No setting is ignored:** each one works, raises an error, or is named in `result.warnings`; `result.assumptions` lists every value the run used.
* **Not yet:** several strategies in one run, pairs and portfolios.
