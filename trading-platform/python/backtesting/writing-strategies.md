# Writing Strategies

A strategy is a small Python class: a set of rules that says when to buy and when to sell. You write three things:

* **What it trades:** the symbol, the exchange and the bar size. A **bar** is one candle of the chart: the open, high, low and close prices (and the volume) of one period, such as one day or five minutes.
* **`init`:** runs once at the start. You set up your indicators here.
* **`on_bar`:** runs every time a bar closes. You look at the prices and indicators and decide to buy, sell or wait.

The engine then replays the past bar by bar and trades your rules, as if you had run them live. The same class is meant to run unchanged in `bt.live` once that is available.

Every example on this page runs on real history from your OpenAlgo server. Run this block first; the blocks after it continue from it. Put your own API key from the OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
import openalgo.backtest as bt   # the backtesting engine
from openalgo import api, ta     # the OpenAlgo client and the indicator library

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")
```

## The strategy class

An EMA crossover on SBIN daily bars, with an RSI filter. An **EMA** (exponential moving average) is the average of recent closing prices, with more weight on the latest ones. The **RSI** (relative strength index) is a 0 to 100 gauge of how strongly the price has been rising; above 70 is often called overbought. The rules: buy when the 10-day EMA crosses above the 30-day EMA while the RSI is below 70, and sell when the 10-day EMA crosses back below. On daily bars of a stock the engine trades **CNC** (delivery: shares you hold overnight).

<!-- continues -->
<!-- requires-server -->
```python
class EmaRsi(bt.Strategy):
    # What it trades: exactly one of symbol or symbols, plus exchange and interval.
    symbol, exchange, interval = "SBIN", "NSE", "D"

    # Parameters: any other class attribute with a number, bool or text default.
    fast = 10
    slow = 30
    rsi_limit = 70

    def init(self):
        # Called once before the first bar: register indicators and timers here.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)
        self.rsi = self.I(ta.rsi, self.close, 14)

    def on_bar(self, bar):
        # Called at every daily close. Orders fill at the next session's open.
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat:  # holding nothing
            if self.fast_ema.crossed_above(self.slow_ema) and self.rsi[-1] < self.rsi_limit:
                self.buy()  # no quantity: buy with all the capital
        elif self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything held


# Replay SBIN from January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaRsi, client, start="2021-01-01", end="2026-11-11", capital=100_000)
trades = result.trades[["entry_time", "exit_time", "net_pnl_rupees", "exit_reason"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
print(result.metrics["trades"], "trades, net profit", round(result.metrics["net_profit"], 2))
```

<!-- output -->
```text
               entry_time                 exit_time  net_pnl_rupees exit_reason
2021-05-11 09:15:00+05:30 2021-08-20 09:15:00+05:30        15960.07      signal
2021-09-07 09:15:00+05:30 2021-11-29 09:15:00+05:30        10124.68      signal
2022-01-07 09:15:00+05:30 2022-02-24 09:15:00+05:30        -3775.97      signal
22 trades, net profit 71003.34
```

`[-1]` reads the latest value: `self.rsi[-1]` is the RSI at the bar that just closed. Each crossover was decided at a day's close and filled at the next day's open (09:15 IST). `result.trades` lists every round trip (a buy and the sell that closed it), and `result.metrics` holds the summary figures. The engine applied Indian charges, slippage and NSE holidays without being asked.

What the class declares:

| Attribute | Meaning |
|---|---|
| `symbol` | The one symbol it trades, in OpenAlgo format (`"SBIN"`, `"NIFTY23NOV26FUT"`) |
| `symbols` | Several symbols on the same exchange, instead of `symbol` (see [Several symbols](#several-symbols)); on a futures exchange, underlyings such as `("HDFCBANK", "ICICIBANK")` |
| `underlying`, `expiry` | A futures strategy: the underlying (`"NIFTY"` with `exchange = "NFO"`) instead of a contract, and the contract rank, `"current_month"` (default) or `"next_month"` (see [Futures](futures.md)) |
| `exchange` | `"NSE"`, `"BSE"`, `"NFO"`, `"BFO"`, `"MCX"`, `"CDS"` or `"BCD"` |
| `interval` | The strategy bar: `"1m"`, `"3m"`, `"5m"`, `"15m"`, `"30m"`, `"1h"` (any whole number of minutes or hours) or `"D"` |
| `product` | `"MIS"` (intraday: closed the same day), `"CNC"` (delivery: stocks held overnight) or `"NRML"` (futures and options held overnight); when left out, MIS for intraday intervals, CNC for daily equity and NRML for daily F&O |
| `size` | The default sizer for orders without a quantity, such as `bt.size.percent(50)`, or your own sizing function (see [Costs, Slippage and Margin](costs-slippage-and-margin.md#sizing)) |
| `reinvest` | `True` (default) sizes from the current equity; `False` sizes from the starting capital (see [Reinvest and size caps](costs-slippage-and-margin.md#reinvest-and-size-caps)) |
| `size_caps` | Caps on what any sizer gives, `bt.size.caps(position=, leverage=, risk=)` |
| `leverage` | The default intraday leverage of every order (a number, 1 or more); `leverage=` on an order wins |
| `max_adds`, `max_position`, `min_spacing`, `max_risk`, `allow_averaging_down` | Scale-in limits on adds (see [Orders and Risk](orders-and-risk.md#scale-in-limits)) |
| `max_daily_loss`, `drawdown_halt`, `cooldown`, `entry_from`, `entry_until`, `square_off` | Risk and session settings; a class attribute wins over the `bt.backtest` argument of the same name (see [Orders and Risk](orders-and-risk.md)) |
| `max_hold` | Exit a position after this many base bars (class attribute only) |
| `pyramiding` | How many adds a condition strategy makes while its entry stays true (default 0; see [Condition strategies](#condition-strategies)). An `on_bar` strategy places its own adds, so there it is named in the warnings as unused |

Every other public class attribute with a number, bool or text value is a **parameter**. Change parameters for one run with `params=`, without editing the class. A name the class does not have is an error.

**No setting is ignored.** Every class attribute above and every `bt.backtest` argument either works, raises an error, or is named in `result.warnings` with the reason it did nothing in this run (such as `pyramiding` on an `on_bar` strategy, or `entry_until` on a CNC run). Two names are refused outright: a class attribute `state` raises `ConfigError` (`self.state` is the strategy's own dict, filled while the run goes), and `after_risk_exit="allow_reentry"` raises `NotImplementedError` (it would govern only the combined rules, which are not built yet). Every value the run used, defaults resolved, is in the Assumptions block (`result.assumptions`).

The same class with a stricter RSI filter, for one run:

<!-- continues -->
<!-- requires-server -->
```python
strict = bt.backtest(EmaRsi, client, start="2021-01-01", end="2026-11-11", capital=100_000, params={"rsi_limit": 60})
print(strict.manifest["strategy"]["parameters"])
print(strict.metrics["trades"], "trades, net profit", round(strict.metrics["net_profit"], 2))
```

<!-- output -->
```text
{'fast': 10, 'slow': 30, 'rsi_limit': 60}
15 trades, net profit 22876.96
```

With the RSI below 60 required at the crossover, the strategy skipped the crossovers that came after a strong run-up and made fewer trades.

To give a parameter the values an optimization should try, declare it with `bt.param(default, values)`, for example `fast = bt.param(10, (5, 10, 15))`. See [Optimization](optimization.md).

## Hooks

The engine calls these methods; override the ones you need.

| Hook | When it is called |
|---|---|
| `init(self)` | Once, before the first bar. Register indicators (`self.I`) and timers (`self.at`, `self.every`) here. |
| `on_bar(self, bar)` | At every strategy-bar close. `bar` is the bar that just closed, or a dict of bars by symbol for a strategy with `symbols`. |
| `on_fill(self, fill)` | For every fill since the previous decision, before `on_bar`. |
| `on_order(self, order)` | For every order event (submitted, filled, rejected, cancelled) since the previous decision, before `on_bar`. |
| `on_position(self, position)` | For every position event (opened, changed, closed), before `on_bar`. |
| `on_risk_event(self, event)` | When a risk rule fires or the trading state changes, before `on_bar`. |
| `on_stop(self)` | Once, at the end of the run. |

The callbacks receive a plain dict. Every event carries `type`, `name`, `time` (IST), `symbol` and the slice it happened in; an order event adds `order_id`, `quantity_units`, `price_rupees` and `reject_code`.

`bar` is a read-only named tuple: `symbol`, `open`, `high`, `low`, `close`, `volume`, `ts_open` and `ts_close` (the open and close instants as UTC nanoseconds), plus `time` (the IST time the bar opened) and `close_time` (the IST time it closed).

The crossover again, logging every fill as it happens and the final equity, for 2026:

<!-- continues -->
<!-- requires-server -->
```python
class Logged(EmaRsi):
    def on_fill(self, fill):
        # A fill is an executed order. After it, self.position shows what you hold.
        print(fill["time"].strftime("%d %b %Y"), "filled at", fill["price_rupees"], "holding", round(self.position.qty, 2))

    def on_stop(self):
        print("final equity", round(self.equity, 2))


logged = bt.backtest(Logged, client, start="2026-01-01", end="2026-11-11", capital=100_000)
```

<!-- output -->
```text
22 Apr 2026 filled at 1110.25 holding 89.96
06 May 2026 filled at 1071.75 holding 0.0
07 May 2026 filled at 1106.25 holding 86.95
11 May 2026 filled at 1006.75 holding 0.0
18 Jun 2026 filled at 1028.15 holding 84.94
29 Jul 2026 filled at 1019.75 holding 0.0
04 Aug 2026 filled at 1047.85 holding 82.46
03 Sep 2026 filled at 1028.65 holding 0.0
06 Nov 2026 filled at 996.2 holding 84.94
final equity 90139.78
```

Each pair of lines is one trade: a buy (the holding goes up) and the sell that closed it (the holding is back to 0). The buy of 6 November was still open when the run ended. With no quantity, each buy put the whole equity to work, so the number of shares changed with the price and the results.

## Prices and series

For a strategy with one symbol, `self.open`, `self.high`, `self.low`, `self.close` and `self.volume` are the strategy bars revealed so far. Each is a **series view**:

* `self.close[-1]` is the latest closed bar, `self.close[-2]` the one before; `self.close[-5:]` is a NumPy array of the last five.
* `len(self.close)` is the number of bars closed so far, and `self.close.values` a copy of all of them.
* Arithmetic and comparisons with a number or another view of the same bars give a new view: `self.close - self.slow_ema`, `self.close > self.slow_ema`.
* `a.crossed_above(b)` and `a.crossed_below(b)` are true on the bar where `a` moves above or below `b` (a number or a view).
* A view of true and false values can be used in `if` directly; it is true when its latest value is. A view of numbers cannot (`if self.close:` is an error that tells you to use `self.close[-1]`).

`self.history(symbol, n)` returns the last `n` strategy bars as a DataFrame indexed by IST bar open (pass `None` as the symbol for a single-symbol strategy). Nothing after the current bar is ever visible.

## Indicators and look-ahead checks

`self.I(function, *inputs, **params)` registers an indicator. The function must come from the [openalgo.ta library](../indicators/README.md); anything else is refused. Inputs are series views (or other indicators) of one symbol and interval, plus plain values and keyword parameters. A function with several outputs returns one view per output.

The engine computes each indicator once over the whole run in the Rust core and reveals its values bar by bar, exactly like the prices: `self.ema[-1]` is the value at the latest closed bar. The series reach `ta` as pandas Series indexed by bar time, so anchored indicators such as the session VWAP restart at each session.

Four indicators on SBIN 5-minute bars, read at the 11:00 close of 11 November 2026: a 20-bar EMA, the ATR (average true range: the average size of a bar's move), the MACD (the gap between a fast and a slow EMA) with its signal line, and the VWAP (the session's volume-weighted average price).

<!-- continues -->
<!-- requires-server -->
```python
class Indicators(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        self.ema = self.I(ta.ema, self.close, 20)
        self.atr = self.I(ta.atr, self.high, self.low, self.close, 14)
        self.macd, self.signal, self.hist = self.I(ta.macd, self.close)  # three outputs
        self.vwap = self.I(ta.vwap, self.high, self.low, self.close, self.volume)

    def on_bar(self, bar):
        if f"{self.now:%d %H:%M}" == "11 11:00":  # self.now: the time the bar closed (IST)
            print("close", self.close[-1], "ema", round(self.ema[-1], 2), "atr", round(self.atr[-1], 2))
            print("macd", round(self.macd[-1], 2), "signal", round(self.signal[-1], 2))
            print("vwap", round(self.vwap[-1], 2), "above vwap:", bool(self.close > self.vwap))


bt.backtest(Indicators, client, start="2026-11-09", end="2026-11-11", capital=100_000)
```

<!-- output -->
```text
close 1071.0 ema 1064.63 atr 3.07
macd 6.15 signal 6.59
vwap 1064.66 above vwap: True
```

Before the first bar, every indicator is checked for look-ahead, once per strategy and data set:

* **Outputs that look ahead are rejected by name.** `ta.fractals` cannot be used at all, and the lagging span of `ta.ichimoku` raises an error the moment you use it (its other four lines work). The list comes from `openalgo.indicators.causality`.
* **Truncation check.** The indicator is computed again on the data cut at several points; every value up to a cut must equal the value on the whole data. An indicator that reads later bars stops the run with a `ConfigError`.
* **Window stability.** The engine finds how many bars of history reproduce the whole-series values within a relative tolerance of 1e-6. That warm-up is what a live run will need. Both checks are reported in the `indicator_checks` line of the Assumptions block.

A strategy that asks for `ta.fractals`, whose last values depend on bars that have not closed yet, is refused before it runs:

<!-- continues -->
<!-- requires-server -->
```python
from openalgo.backtest.errors import ConfigError


class PeeksAhead(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"

    def init(self):
        self.up, self.down = self.I(ta.fractals, self.high, self.low)


try:
    bt.backtest(PeeksAhead, client, start="2026-01-01", end="2026-11-11", capital=100_000)
except ConfigError as error:
    print(str(error).split(" (")[0])
```

<!-- output -->
```text
ta.fractals cannot be used in a strategy, it looks ahead
```

The checks the first run (`EmaRsi`) passed:

<!-- continues -->
<!-- requires-server -->
```python
print(result.assumptions["indicator_checks"])
```

<!-- output -->
```text
window tolerance 1e-06 (relative); ema(SBIN.close, 10): truncation passed at 4 cuts, warm-up 64 bars; rsi(SBIN.close, 14): truncation passed at 4 cuts, warm-up 256 bars
```

Both indicators passed the truncation check. The warm-up says how much history a live run needs: 64 daily bars before the 10-day EMA matches its value on the full history, and 256 for the RSI.

## Other timeframes

`self.data[symbol, interval]` gives the bars of the same symbol at another interval, built from the run's own bars. A bar of that interval becomes visible only once it has closed: on a 5-minute strategy, the 09:15 to 09:30 bar of `"15m"` appears at the 09:30 decision, never earlier. A daily bar (`"D"`) appears at the session close, so during the day you see the previous sessions. `self.data[symbol]` (no interval) is the strategy bars.

Any interval that is a whole multiple of the run's base interval works, coarser or finer than the strategy interval. You can register an indicator on it too. You cannot mix two intervals in one expression or one indicator.

A 5-minute entry that trades only with the 15-minute trend: buy when the 5-minute close crosses above its 9 EMA while the last 15-minute close is above the 20 EMA of 15-minute closes, and sell when the 15-minute trend turns down. On intraday bars the engine trades **MIS**: intraday positions, closed (squared off) before the session ends.

<!-- continues -->
<!-- requires-server -->
```python
class TrendFilter(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        quarter_hour = self.data["SBIN", "15m"]
        self.trend = self.I(ta.ema, quarter_hour.close, 20)  # an EMA of 15-minute closes
        self.fast = self.I(ta.ema, self.close, 9)

    def on_bar(self, bar):
        if len(self.trend) < 20:  # wait for twenty 15-minute bars
            return
        uptrend = self.data["SBIN", "15m"].close[-1] > self.trend[-1]
        if self.position.is_flat and uptrend and self.close.crossed_above(self.fast):
            self.buy(qty=100)
        elif self.position.is_long and not uptrend:
            self.exit()


filtered = bt.backtest(TrendFilter, client, start="2026-10-26", end="2026-11-11", capital=200_000)
trades = filtered.trades[["entry_time", "exit_time", "net_pnl_rupees", "exit_reason"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
print(len(filtered.trades), "trades")
```

<!-- output -->
```text
               entry_time                 exit_time  net_pnl_rupees exit_reason
2026-10-27 09:25:00+05:30 2026-10-27 11:15:00+05:30         -146.22      signal
2026-10-27 11:40:00+05:30 2026-10-27 11:45:00+05:30         -456.17      signal
2026-10-28 13:00:00+05:30 2026-10-28 15:00:00+05:30           88.80   scheduler
15 trades
```

An exit reason of `signal` is the strategy's own `self.exit()`; `scheduler` is the intraday square-off at 15:00.

## Position and account

| Property | What it holds |
|---|---|
| `self.position` | The position of the strategy's symbol: `qty` (signed units, negative when short), `avg_price`, `adds`, `unrealized`, `realized`, `tranches`, and `is_long`, `is_short`, `is_flat` |
| `self.positions` | Positions by symbol (several symbols) |
| `self.orders` | Handles of the orders still working |
| `self.instrument(symbol=None)` | Lot size, tick size, freeze quantity and expiry of a traded instrument |
| `self.equity` | Equity of the strategy's account in rupees (cash plus open P&L) |
| `self.cash` | Free cash in rupees: equity not blocked as margin |
| `self.now` | The current decision time in IST |
| `self.state` | A dict for your own values; it starts empty each run (do not declare `state` as a class attribute: it is refused) |

A strategy that buys 100 SBIN at its first 15-minute close of 11 November 2026 and prints what it holds one bar later:

<!-- continues -->
<!-- requires-server -->
```python
class Inspect(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"

    def on_bar(self, bar):
        if len(self.close) == 1:
            self.buy(qty=100)
        elif len(self.close) == 2:
            p = self.position
            print(self.now, p.qty, p.avg_price, round(p.unrealized, 2))
            print("equity", round(self.equity, 2), "free cash", round(self.cash, 2))
            print(self.instrument())


bt.backtest(Inspect, client, start="2026-11-11", end="2026-11-11", capital=200_000)
```

<!-- output -->
```text
2026-11-11 09:45:00+05:30 100.0 1059.25 660.0
equity 200629.26 free cash 94729.26
Instrument(symbol='SBIN', exchange='NSE', kind='equity', lot_size=1, tick_size=0.05, freeze_qty=None, multiplier=1.0, expiry=None, strike=None, option_type=None, underlying=None, settlement='delivery', last_trading_day=None, contract_date=None, generic=True)
```

Equity is the capital plus the open P&L less the entry's charges. The free cash is lower because an MIS position without leverage blocks its full value as margin.

## Timers

Timers run your function at a clock time, independent of the strategy bars. Register them in `init`.

* `self.at("09:20", fn)` calls `fn()` at the first base-bar open at or after 09:20 IST in every session. Orders it places fill **at that same open**. A session with no bar at or after that time skips the call, and the result's warnings say in how many sessions that happened.
* `self.every(period, fn)` with `"week"`, `"month"`, `"quarter"` or `"year"` (daily or longer strategies only) calls `fn()` for the close of the first session of each period; its orders fill at the next session's open.

A time-based intraday trade: buy 100 SBIN at 09:20 every session and sell at 14:30.

<!-- continues -->
<!-- requires-server -->
```python
class TimedEntry(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"

    def init(self):
        self.at("09:20", self.enter)
        self.at("14:30", self.leave)

    def enter(self):
        self.buy(qty=100)

    def leave(self):
        self.exit()


timed = bt.backtest(TimedEntry, client, start="2026-11-02", end="2026-11-11", capital=200_000)
print(timed.fills[["time", "side", "price_rupees", "reason"]].head(4).to_string(index=False))
```

<!-- output -->
```text
                     time side  price_rupees reason
2026-11-02 09:20:00+05:30  BUY        976.45  entry
2026-11-02 14:30:00+05:30 SELL        979.20 signal
2026-11-03 09:20:00+05:30  BUY        992.05  entry
2026-11-03 14:30:00+05:30 SELL        982.40 signal
```

## Condition strategies

A strategy that is only rules can state them in `init` instead of writing `on_bar`:

| Method | What it does |
|---|---|
| `self.entry_when(condition, **order_args)` | Buy at the next open whenever the condition is true at a bar close and the strategy is flat |
| `self.exit_when(condition)` | Exit the long whenever the condition is true at a bar close |
| `self.short_when(condition, **order_args)` | Sell short whenever the condition is true and the strategy is flat |
| `self.cover_when(condition)` | Cover the short whenever the condition is true |

The whole run then happens in the Rust core, with no Python call per bar, so a condition strategy runs and optimizes much faster than the same logic in `on_bar`. The decisions are exactly those of the equivalent `on_bar`:

* **Conditions are levels, not events.** `entry_when(fast > slow)` enters again at the next bar after any exit while the fast EMA is still above; use `fast.crossed_above(slow)` to enter only on the bar of the cross.
* When flat and both an entry and a short are true, the long entry wins. In a position, an exit comes before adding.
* `pyramiding` (a class attribute, default 0) is how many times the strategy adds while its entry condition stays true. An entry still waiting to fill counts as a position.
* Each of the four is declared at most once. Combine conditions with `&`, `|` and `~` (not with `and`, `or`, `not`).

A condition is any of:

* a true or false view built from prices and `self.I` indicators: comparisons, arithmetic, `.crossed_above`, `.crossed_below`, `&`, `|`, `~`, and the look-back helpers `.shift(n)` (the value `n` bars earlier), `.rolling_max(n)` and `.rolling_min(n)` (the highest and lowest of the last `n` values, this bar included);
* a clock condition: `bt.time_between("09:30", "14:30")` (true at bars that close at or after 09:30 and before 14:30 IST) or `bt.weekday("Mon", "Tue")`, combined with views by `&` and `|`;
* an array with one true or false value per strategy bar: a NumPy array or list in bar order, or a pandas Series indexed by bar open time.

A view of another interval (`self.data["SBIN", "15m"]`) counts with its latest closed bar. Anything else, such as a plain `True`, a number or an indicator output that looks ahead, raises a `ConfigError` that tells you to use `on_bar`.

The order arguments are `qty`, `size`, `lots`, `stop`, `target`, `targets`, `trail`, `breakeven`, `after_first_target`, `product`, `leverage` and `tag`; every entry is a market order. ATR distances and `bt.size.atr_risk` work as in `on_bar` (see [ATR stops and sizing in conditions](#atr-stops-and-sizing-in-conditions)). A condition strategy trades one symbol (not yet a futures underlying) and has no callbacks, timers or sizing functions (they would call Python during the run); `on_stop` still runs. A strategy uses `on_bar` or conditions, never both.

An intraday EMA crossover as conditions: buy 100 SBIN when the 9 EMA of 5-minute closes crosses above the 21 EMA between 09:30 and 14:30, with a 0.5 percent stop, and sell when it crosses back below:

<!-- continues -->
<!-- requires-server -->
```python
class EmaCrossRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        fast = self.I(ta.ema, self.close, 9)
        slow = self.I(ta.ema, self.close, 21)
        trading_hours = bt.time_between("09:30", "14:30")
        self.entry_when(fast.crossed_above(slow) & trading_hours, qty=100, stop=bt.pct(0.5))
        self.exit_when(fast.crossed_below(slow))


rules = bt.backtest(EmaCrossRules, client, start="2026-10-01", end="2026-11-11", capital=200_000)
print(len(rules.trades), "trades, net profit", round(rules.metrics["net_profit"], 2))
print(rules.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
31 trades, net profit -2792.2
{'signal': 13, 'scheduler': 11, 'leg_sl': 7}
```

The exit reasons: `signal` is the crossover down, `leg_sl` the stop and `scheduler` the intraday square-off.

A channel breakout as conditions: buy when the daily close is above the highest high of the previous 20 sessions, and sell when it closes below the lowest low of the previous 10.

<!-- continues -->
<!-- requires-server -->
```python
class Breakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"

    def init(self):
        # shift(1): the 20 sessions before this one, so today's own high does not count.
        self.entry_when(self.close > self.high.shift(1).rolling_max(20))
        self.exit_when(self.close < self.low.shift(1).rolling_min(10))


breakout = bt.backtest(Breakout, client, start="2021-01-01", end="2026-11-11", capital=100_000)
trades = breakout.trades[["entry_time", "exit_time", "net_pnl_rupees"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
print(len(breakout.trades), "trades, net profit", round(breakout.metrics["net_profit"], 2))
```

<!-- output -->
```text
               entry_time                 exit_time  net_pnl_rupees
2021-02-03 09:15:00+05:30 2021-03-08 09:15:00+05:30        16049.94
2021-05-18 09:15:00+05:30 2021-06-21 09:15:00+05:30         4519.44
2021-07-30 09:15:00+05:30 2021-08-18 09:15:00+05:30        -5610.14
29 trades, net profit 22463.31
```

### ATR stops and sizing in conditions

`bt.atr(...)` stop and target distances, `bt.trail_atr(...)` and `bt.size.atr_risk(...)` work in `entry_when` and `short_when`. Each entry takes the `openalgo.ta` ATR of the bar that decided it, so a condition strategy and the equivalent `on_bar` give the same fills. An entry decided before the ATR has a value (fewer bars than its period) stops the run with a message, so require the ATR in the condition, as below. The 50 percent position cap keeps the risk sizing within the capital (see [Reinvest and size caps](costs-slippage-and-margin.md#reinvest-and-size-caps)).

The daily EMA crossover with ATR risk sizing, an ATR stop and an ATR trailing stop, as conditions:

<!-- continues -->
<!-- requires-server -->
```python
class AtrRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    size_caps = bt.size.caps(position=bt.pct(50))

    def init(self):
        fast = self.I(ta.ema, self.close, 10)
        slow = self.I(ta.ema, self.close, 30)
        atr = self.I(ta.atr, self.high, self.low, self.close, 14)
        self.entry_when(
            fast.crossed_above(slow) & (atr > 0),
            size=bt.size.atr_risk(1, 2),  # risk 1 percent of equity to a stop 2 ATR away
            stop=bt.atr(2),
            trail=bt.trail_atr(3),
        )
        self.exit_when(fast.crossed_below(slow))


atr_rules = bt.backtest(AtrRules, client, start="2021-01-01", end="2026-11-11", capital=100_000)
trades = atr_rules.trades[["entry_time", "entry_units", "entry_price_rupees", "exit_reason"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees exit_reason
2021-02-02 09:15:00+05:30        40.82              315.10      leg_sl
2021-05-11 09:15:00+05:30        41.98              356.95      leg_sl
2021-09-07 09:15:00+05:30        55.90              431.15      leg_sl
```

The same rules written in `on_bar` give the same fills:

<!-- continues -->
<!-- requires-server -->
```python
class AtrOnBar(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    size_caps = bt.size.caps(position=bt.pct(50))

    def init(self):
        self.fast = self.I(ta.ema, self.close, 10)
        self.slow = self.I(ta.ema, self.close, 30)
        self.atr = self.I(ta.atr, self.high, self.low, self.close, 14)

    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow) and self.atr[-1] > 0:
            self.buy(size=bt.size.atr_risk(1, 2), stop=bt.atr(2), trail=bt.trail_atr(3))
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


atr_on_bar = bt.backtest(AtrOnBar, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(len(atr_on_bar.trades), "trades; same fills:", atr_on_bar.fills.equals(atr_rules.fills))
```

<!-- output -->
```text
24 trades; same fills: True
```

### From a function or from arrays

`bt.from_signals(function, symbol, exchange, interval, **order_args)` builds a condition strategy from a function of the strategy bars. The function receives the bars as a DataFrame indexed by IST bar open (open, high, low, close, volume) and returns `(entries, exits)` or `(entries, exits, shorts, covers)`. Before the run it is called again on the bars cut at three points, and it is refused if any signal changes when later bars are removed, so a function that peeks ahead cannot slip through.

`bt.from_arrays(entries, exits, symbol=..., exchange=..., interval=..., **order_args)` does the same from arrays you computed yourself, one value per strategy bar. Both also take `shorts=`, `covers=` (for `from_arrays`), `pyramiding=` and `product=`, and return a strategy class for `bt.backtest` or `bt.optimize`.

The daily EMA crossover from a function of the bars:

<!-- continues -->
<!-- requires-server -->
```python
def ema_signals(bars):
    fast, slow = ta.ema(bars.close, 10), ta.ema(bars.close, 30)
    return ta.crossover(fast, slow), ta.crossunder(fast, slow)


FromFunction = bt.from_signals(ema_signals, "SBIN", "NSE", "D")
by_function = bt.backtest(FromFunction, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(len(by_function.trades), "trades, net profit", round(by_function.metrics["net_profit"], 2))
```

<!-- output -->
```text
25 trades, net profit 100310.76
```

The same signals as arrays you compute yourself, on the daily bars from `client.history`:

<!-- continues -->
<!-- requires-server -->
```python
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")
entries, exits = ema_signals(bars)  # one True or False per daily bar

FromArrays = bt.from_arrays(entries, exits, symbol="SBIN", exchange="NSE", interval="D")
by_arrays = bt.backtest(FromArrays, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(len(by_arrays.trades), "trades; same fills:", by_arrays.fills.equals(by_function.fills))
```

<!-- output -->
```text
25 trades; same fills: True
```

## Several symbols

Declare `symbols` instead of `symbol`. `on_bar` then receives a dict of bars by symbol, and every order needs `symbol=`. The shortcuts `self.close` and `self.position` are for a single symbol; use `self.data[symbol].close` and `self.positions[symbol]`.

The daily EMA crossover on two banks at once, each traded on its own crossover. With no quantity, each buy takes an equal share of the equity:

<!-- continues -->
<!-- requires-server -->
```python
class TwoBanks(bt.Strategy):
    symbols, exchange, interval = ("SBIN", "ICICIBANK"), "NSE", "D"

    def init(self):
        self.fast = {s: self.I(ta.ema, self.data[s].close, 10) for s in self.symbols}
        self.slow = {s: self.I(ta.ema, self.data[s].close, 30) for s in self.symbols}

    def on_bar(self, bars):
        if len(self.data["SBIN"].close) < 30:
            return
        for s in self.symbols:
            if self.positions[s].is_flat and self.fast[s].crossed_above(self.slow[s]):
                self.buy(symbol=s)
            elif self.positions[s].is_long and self.fast[s].crossed_below(self.slow[s]):
                self.exit(symbol=s)


banks = bt.backtest(TwoBanks, client, start="2021-01-01", end="2026-11-11", capital=200_000)
print(banks.trades.groupby("symbol")["net_pnl_rupees"].agg(["count", "sum"]).round(2))
```

<!-- output -->
```text
           count       sum
symbol
ICICIBANK     30   1918.34
SBIN          23  63732.51
```

`count` is the number of closed trades of each stock and `sum` their net profit in rupees.

All symbols of one strategy trade on one exchange. Several strategies in one run, pairs and portfolios are not available yet.
