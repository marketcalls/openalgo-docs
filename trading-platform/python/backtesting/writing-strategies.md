# Writing Strategies

A strategy is a small Python class. You declare what it trades, register its indicators once in `init`, and decide what to do in `on_bar`, which the engine calls at the close of every bar. The same class is meant to run unchanged in `bt.live` once that is available.

The examples on this page use synthetic 1-minute bars so they run without a server. This first block builds them; the blocks after it continue from it.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta


def minute_bars(start, end, base_price, swing):
    """Synthetic 1-minute bars for every NSE session from start to end."""
    frames = []
    sessions = bt.calendar.default_calendar().sessions("NSE", start, end)
    for day, session in enumerate(sessions.itertuples()):
        minute = np.arange(375)  # 09:15 to 15:29 IST
        close = (base_price + day + swing * np.sin(minute / 25 + day)).round(1)
        open_ = np.r_[close[0], close[:-1]]
        opens_at = pd.Timestamp(session.open, tz="UTC").tz_convert("Asia/Kolkata")
        frames.append(
            pd.DataFrame(
                {
                    "open": open_,
                    "high": np.maximum(open_, close) + 0.2,
                    "low": np.minimum(open_, close) - 0.2,
                    "close": close,
                    "volume": 1_000,
                },
                index=opens_at + pd.to_timedelta(minute, unit="min"),
            )
        )
    return pd.concat(frames)


sbin = minute_bars("2026-10-05", "2026-10-09", 800, 4)
print(len(sbin), sbin.index[0], sbin.index[-1])
```

<!-- output -->
```text
1875 2026-10-05 09:15:00+05:30 2026-10-09 15:29:00+05:30
```

## The strategy class

<!-- continues -->
```python
class EmaRsi(bt.Strategy):
    # What it trades: exactly one of symbol or symbols, plus exchange and interval.
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    # Parameters: any other class attribute with a number, bool or text default.
    fast = 9
    slow = 21
    rsi_limit = 70

    def init(self):
        # Called once before the first bar: register indicators and timers here.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)
        self.rsi = self.I(ta.rsi, self.close, 14)

    def on_bar(self, bar):
        # Called at every 5-minute bar close. Orders fill at the next bar's open.
        if self.position.is_flat:
            if self.fast_ema.crossed_above(self.slow_ema) and self.rsi[-1] < self.rsi_limit:
                self.buy(qty=50)
        elif self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaRsi, data=sbin, capital=200_000)
trades = result.trades
print(trades[["entry_time", "net_pnl_rupees", "exit_reason"]].round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  net_pnl_rupees exit_reason
2026-10-05 12:00:00+05:30         -182.49      signal
2026-10-05 14:35:00+05:30           82.35   scheduler
2026-10-06 11:35:00+05:30         -182.54      signal
2026-10-06 14:10:00+05:30           57.32   scheduler
2026-10-07 09:20:00+05:30         -272.66      signal
2026-10-07 11:10:00+05:30         -182.60      signal
2026-10-07 13:45:00+05:30         -112.63   scheduler
2026-10-08 10:35:00+05:30         -102.62      signal
2026-10-08 13:20:00+05:30         -152.65      signal
2026-10-09 10:05:00+05:30          -62.65      signal
2026-10-09 12:55:00+05:30         -152.71      signal
```

What the class declares:

| Attribute | Meaning |
|---|---|
| `symbol` | The one symbol it trades, in OpenAlgo format (`"SBIN"`, `"NIFTY27OCT26FUT"`) |
| `symbols` | Several symbols on the same exchange, instead of `symbol` (see [Several symbols](#several-symbols)); on a futures exchange, underlyings such as `("HDFCBANK", "ICICIBANK")` |
| `underlying`, `expiry` | A futures strategy: the underlying (`"NIFTY"` with `exchange = "NFO"`) instead of a contract, and the contract rank, `"current_month"` (default) or `"next_month"` (see [Futures](futures.md)) |
| `exchange` | `"NSE"`, `"BSE"`, `"NFO"`, `"BFO"`, `"MCX"`, `"CDS"` or `"BCD"` |
| `interval` | The strategy bar: `"1m"`, `"3m"`, `"5m"`, `"15m"`, `"30m"`, `"1h"` (any whole number of minutes or hours) or `"D"` |
| `product` | `"MIS"`, `"CNC"` or `"NRML"`; when left out, MIS for intraday intervals, CNC for daily equity and NRML for daily F&O |
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

<!-- continues -->
```python
slower = bt.backtest(EmaRsi, data=sbin, capital=200_000, params={"fast": 5, "slow": 30})
print(slower.manifest["strategy"]["parameters"])
```

<!-- output -->
```text
{'fast': 5, 'slow': 30, 'rsi_limit': 70}
```

To give a parameter the values an optimization should try, declare it with `bt.param(default, values)`, for example `fast = bt.param(9, (5, 9, 13))`. See [Optimization](optimization.md).

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

<!-- continues -->
```python
class Logged(EmaRsi):
    def on_fill(self, fill):
        print(fill["time"].strftime("%d %b %H:%M"), fill["name"], fill["quantity_units"], fill["price_rupees"])

    def on_stop(self):
        print("final equity", round(self.equity, 2))


logged = bt.backtest(Logged, data=sbin, capital=200_000, end="2026-10-06")
```

<!-- output -->
```text
05 Oct 12:00 Filled 50.0 801.3
05 Oct 13:20 Filled 50.0 798.5
05 Oct 14:35 Filled 50.0 801.0
06 Oct 11:35 Filled 50.0 802.3
06 Oct 12:55 Filled 50.0 799.5
06 Oct 14:10 Filled 50.0 802.0
final equity 199775.51
```

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

<!-- continues -->
```python
class Indicators(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        self.ema = self.I(ta.ema, self.close, 20)
        self.atr = self.I(ta.atr, self.high, self.low, self.close, 14)
        self.macd, self.signal, self.hist = self.I(ta.macd, self.close)  # three outputs
        self.vwap = self.I(ta.vwap, self.high, self.low, self.close, self.volume)

    def on_bar(self, bar):
        if self.now.strftime("%d %H:%M") == "05 10:45":
            print("bars closed:", len(self.close))
            print("ema", round(self.ema[-1], 2), "atr", round(self.atr[-1], 2))
            print("macd", round(self.macd[-1], 3), "signal", round(self.signal[-1], 3))
            print("vwap", round(self.vwap[-1], 2), "above vwap:", bool(self.close > self.vwap))


bt.backtest(Indicators, data=sbin, capital=200_000, end="2026-10-05")
```

<!-- output -->
```text
bars closed: 18
ema 801.35 atr 0.94
macd -0.367 signal 0.211
vwap 802.1 above vwap: False
```

Before the first bar, every indicator is checked for look-ahead, once per strategy and data set:

* **Outputs that look ahead are rejected by name.** `ta.fractals` cannot be used at all, and the lagging span of `ta.ichimoku` raises an error the moment you use it (its other four lines work). The list comes from `openalgo.indicators.causality`.
* **Truncation check.** The indicator is computed again on the data cut at several points; every value up to a cut must equal the value on the whole data. An indicator that reads later bars stops the run with a `ConfigError`.
* **Window stability.** The engine finds how many bars of history reproduce the whole-series values within a relative tolerance of 1e-6. That warm-up is what a live run will need. Both checks are reported in the `indicator_checks` line of the Assumptions block.

<!-- continues -->
```python
from openalgo.backtest.errors import ConfigError


class PeeksAhead(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        self.up, self.down = self.I(ta.fractals, self.high, self.low)


try:
    bt.backtest(PeeksAhead, data=sbin, capital=200_000)
except ConfigError as error:
    print(str(error).split(" (")[0])

print(result.assumptions["indicator_checks"])
```

<!-- output -->
```text
ta.fractals cannot be used in a strategy, it looks ahead
window tolerance 1e-06 (relative); ema(SBIN.close, 9): truncation passed at 4 cuts, warm-up 64 bars; rsi(SBIN.close, 14): truncation passed at 4 cuts, warm-up 256 bars
```

## Other timeframes

`self.data[symbol, interval]` gives the bars of the same symbol at another interval, built from the run's own bars. A bar of that interval becomes visible only once it has closed: on a 5-minute strategy, the 09:15 to 09:30 bar of `"15m"` appears at the 09:30 decision, never earlier. A daily bar (`"D"`) appears at the session close, so during the day you see the previous sessions. `self.data[symbol]` (no interval) is the strategy bars.

Any interval that is a whole multiple of the run's base interval works, coarser or finer than the strategy interval. You can register an indicator on it too. You cannot mix two intervals in one expression or one indicator.

<!-- continues -->
```python
class TrendFilter(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        quarter_hour = self.data["SBIN", "15m"]
        self.trend = self.I(ta.ema, quarter_hour.close, 4)  # an EMA of 15-minute closes
        self.fast = self.I(ta.ema, self.close, 9)

    def on_bar(self, bar):
        if len(self.trend) < 4:
            return
        uptrend = self.data["SBIN", "15m"].close[-1] > self.trend[-1]
        if self.position.is_flat and uptrend and self.close.crossed_above(self.fast):
            self.buy(qty=50)
        elif self.position.is_long and not uptrend:
            self.exit()


filtered = bt.backtest(TrendFilter, data=sbin, capital=200_000)
print(len(filtered.trades), "trades")
```

<!-- output -->
```text
3 trades
```

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

<!-- continues -->
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


bt.backtest(Inspect, data=sbin, capital=200_000, end="2026-10-05")
```

<!-- output -->
```text
2026-10-05 09:45:00+05:30 100.0 802.3 140.0
equity 200110.99 free cash 119900.99
Instrument(symbol='SBIN', exchange='NSE', kind='equity', lot_size=1, tick_size=0.05, freeze_qty=None, multiplier=1.0, expiry=None, strike=None, option_type=None, underlying=None, settlement='delivery', last_trading_day=None, contract_date=None, generic=True)
```

Equity is the capital plus the open P&L less the entry's charges. The free cash is lower because an MIS position without leverage blocks its full value as margin.

## Timers

Timers run your function at a clock time, independent of the strategy bars. Register them in `init`.

* `self.at("09:20", fn)` calls `fn()` at the first base-bar open at or after 09:20 IST in every session. Orders it places fill **at that same open**. A session with no bar at or after that time skips the call, and the result's warnings say in how many sessions that happened.
* `self.every(period, fn)` with `"week"`, `"month"`, `"quarter"` or `"year"` (daily or longer strategies only) calls `fn()` for the close of the first session of each period; its orders fill at the next session's open.

<!-- continues -->
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


timed = bt.backtest(TimedEntry, data=sbin, capital=200_000)
print(timed.fills[["time", "side", "price_rupees", "reason"]].head(4))
```

<!-- output -->
```text
                       time  side  price_rupees  reason
0 2026-10-05 09:20:00+05:30   BUY         800.8   entry
1 2026-10-05 14:30:00+05:30  SELL         799.8  signal
2 2026-10-06 09:20:00+05:30   BUY         804.9   entry
3 2026-10-06 14:30:00+05:30  SELL         804.2  signal
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

<!-- continues -->
```python
class EmaCrossRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"
    fast = 9
    slow = 21

    def init(self):
        fast = self.I(ta.ema, self.close, self.fast)
        slow = self.I(ta.ema, self.close, self.slow)
        trading_hours = bt.time_between("09:30", "14:30")
        self.entry_when(fast.crossed_above(slow) & trading_hours, qty=50, stop=bt.pct(0.5))
        self.exit_when(fast.crossed_below(slow))


class Breakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"

    def init(self):
        # The close is above the highest high of the 12 bars before this one.
        self.entry_when(self.close > self.high.shift(1).rolling_max(12), qty=50)
        self.exit_when(self.close < self.low.shift(1).rolling_min(6))


for strategy in (EmaCrossRules, Breakout):
    run = bt.backtest(strategy, data=sbin, capital=200_000)
    print(strategy.__name__, len(run.trades), "trades, net", round(run.metrics["net_profit"], 2))
```

<!-- output -->
```text
EmaCrossRules 9 trades, net -1071.59
Breakout 12 trades, net 798.81
```

### ATR stops and sizing in conditions

`bt.atr(...)` stop and target distances, `bt.trail_atr(...)` and `bt.size.atr_risk(...)` work in `entry_when` and `short_when`. Each entry takes the `openalgo.ta` ATR of the bar that decided it, so a condition strategy and the equivalent `on_bar` give the same fills. An entry decided before the ATR has a value (fewer bars than its period) stops the run with a message, so require the ATR in the condition, as below. The 50 percent position cap keeps the risk sizing within the capital (see [Reinvest and size caps](costs-slippage-and-margin.md#reinvest-and-size-caps)).

<!-- continues -->
```python
class AtrRules(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"
    size_caps = bt.size.caps(position=bt.pct(50))

    def init(self):
        fast = self.I(ta.ema, self.close, 9)
        slow = self.I(ta.ema, self.close, 21)
        atr = self.I(ta.atr, self.high, self.low, self.close, 14)
        self.entry_when(
            fast.crossed_above(slow) & (atr > 0),
            size=bt.size.atr_risk(0.5, 2),  # risk 0.5 percent of equity to a stop 2 ATR away
            stop=bt.atr(2),
            trail=bt.trail_atr(3),
        )
        self.exit_when(fast.crossed_below(slow))


class AtrOnBar(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"
    size_caps = bt.size.caps(position=bt.pct(50))

    def init(self):
        self.fast = self.I(ta.ema, self.close, 9)
        self.slow = self.I(ta.ema, self.close, 21)
        self.atr = self.I(ta.atr, self.high, self.low, self.close, 14)

    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow) and self.atr[-1] > 0:
            self.buy(size=bt.size.atr_risk(0.5, 2), stop=bt.atr(2), trail=bt.trail_atr(3))
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


rules = bt.backtest(AtrRules, data=sbin, capital=200_000)
bars_run = bt.backtest(AtrOnBar, data=sbin, capital=200_000)
print(len(rules.trades), "trades;", "same fills:", rules.fills.equals(bars_run.fills))
```

<!-- output -->
```text
11 trades; same fills: True
```

### From a function or from arrays

`bt.from_signals(function, symbol, exchange, interval, **order_args)` builds a condition strategy from a function of the strategy bars. The function receives the bars as a DataFrame indexed by IST bar open (open, high, low, close, volume) and returns `(entries, exits)` or `(entries, exits, shorts, covers)`. Before the run it is called again on the bars cut at three points, and it is refused if any signal changes when later bars are removed, so a function that peeks ahead cannot slip through.

`bt.from_arrays(entries, exits, symbol=..., exchange=..., interval=..., **order_args)` does the same from arrays you computed yourself, one value per strategy bar. Both also take `shorts=`, `covers=` (for `from_arrays`), `pyramiding=` and `product=`, and return a strategy class for `bt.backtest` or `bt.optimize`.

<!-- continues -->
```python
def ema_signals(bars):
    fast, slow = ta.ema(bars.close, 9), ta.ema(bars.close, 21)
    return ta.crossover(fast, slow), ta.crossunder(fast, slow)


FromFunction = bt.from_signals(ema_signals, "SBIN", "NSE", "5m", qty=50)
by_function = bt.backtest(FromFunction, data=sbin, capital=200_000)

# The same signals as arrays, computed on the 5-minute bars of the run.
five_minute, _ = bt.data.load_bars("SBIN", "NSE", "5m", "2026-10-05", "2026-10-09", data=sbin, base="1m")
entries, exits = ema_signals(five_minute)
FromArrays = bt.from_arrays(entries, exits, symbol="SBIN", exchange="NSE", interval="5m", qty=50)
by_arrays = bt.backtest(FromArrays, data=sbin, capital=200_000)

print(len(by_function.trades), "trades;", "same fills:", by_function.fills.equals(by_arrays.fills))
```

<!-- output -->
```text
12 trades; same fills: True
```

## Several symbols

Declare `symbols` instead of `symbol` and pass a dict of DataFrames by symbol. `on_bar` then receives a dict of bars by symbol, and every order needs `symbol=`. The shortcuts `self.close` and `self.position` are for a single symbol; use `self.data[symbol].close` and `self.positions[symbol]`.

<!-- continues -->
```python
class Leader(bt.Strategy):
    symbols, exchange, interval = ("SBIN", "ICICIBANK"), "NSE", "15m"

    def on_bar(self, bars):
        sbin_up = bars["SBIN"].close > bars["SBIN"].open
        icici_up = bars["ICICIBANK"].close > bars["ICICIBANK"].open
        if sbin_up and icici_up and self.positions["SBIN"].is_flat:
            self.buy(qty=50, symbol="SBIN")
        elif not sbin_up and self.positions["SBIN"].is_long:
            self.exit(symbol="SBIN")


both = {"SBIN": sbin, "ICICIBANK": minute_bars("2026-10-05", "2026-10-09", 1400, 6)}
leader = bt.backtest(Leader, data=both, capital=500_000)
print(leader.fills.groupby("symbol").size())
```

<!-- output -->
```text
symbol
SBIN    24
dtype: int64
```

All symbols of one strategy trade on one exchange. Several strategies in one run, pairs and portfolios are not available yet.
