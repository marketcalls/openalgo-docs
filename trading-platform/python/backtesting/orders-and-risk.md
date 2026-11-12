# Orders and Risk

This page covers how a strategy places orders, how stops, targets and trailing stops work, the intraday entry window and square-off, the strategy-level risk rules, and when exactly an order fills.

The examples use two synthetic sessions of 1-minute bars: a rising day (5 October 2026) and a falling day (6 October 2026). This first block builds them; the blocks after it continue from it.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt


def path_bars(day, knots, prices):
    """1-minute bars of one NSE session whose close follows straight lines between
    (minute after 09:15, price) points."""
    minute = np.arange(375)
    close = np.interp(minute, knots, prices).round(1)
    open_ = np.r_[close[0], close[:-1]]
    index = pd.Timestamp(f"{day} 09:15", tz="Asia/Kolkata") + pd.to_timedelta(minute, unit="min")
    return pd.DataFrame(
        {
            "open": open_,
            "high": np.maximum(open_, close) + 0.1,
            "low": np.minimum(open_, close) - 0.1,
            "close": close,
            "volume": 1_000,
        },
        index=index,
    )


rising = path_bars("2026-10-05", [0, 60, 120, 180, 374], [500, 510, 506, 516, 512])
falling = path_bars("2026-10-06", [0, 90, 374], [512, 494, 498])
bars = pd.concat([rising, falling])


def first_bar(**order):
    """A 15-minute strategy that buys 100 SBIN at its first bar close with `order`."""

    class FirstBar(bt.Strategy):
        symbol, exchange, interval = "SBIN", "NSE", "15m"

        def on_bar(self, bar):
            if len(self.close) == 1:
                self.buy(qty=100, **order)

    return FirstBar


def show(result):
    columns = ["time", "side", "quantity_units", "price_rupees", "reason", "target_index"]
    print(result.fills[columns].to_string(index=False))


# No charges or slippage here, so the prices are easy to follow.
QUIET = {"capital": 500_000, "costs": None, "slippage": 0}
```

## Placing orders

| Method | What it does |
|---|---|
| `self.buy(qty=None, ...)` | Opens a long, adds to it, or reduces a short |
| `self.sell(qty=None, ...)` | Opens a short, adds to it, or reduces a long |
| `self.exit(symbol=None, fraction=1.0, qty=None)` | Closes the position, or a fraction of it, or `qty` units; does nothing when flat |
| `self.reduce(qty=None, lots=None, fraction=None)` | Reduces the position by exactly one of units, lots or a fraction |
| `self.cancel(order)` | Cancels a working order; returns its state afterwards |
| `self.cancel_all(symbol=None)` | Cancels every working order, or those of one symbol |

Orders are **market orders** (OpenAlgo `MARKET`, DAY validity) unless you give a price: `price=` makes a limit order and `trigger_price=` a stop order (see [Limit, stop and GTT orders](#limit-stop-and-gtt-orders)). `self.target(...)`, which trades to a target position size, is not available yet.

The arguments of `buy` and `sell`:

| Argument | Meaning |
|---|---|
| `qty` | Units: shares for equity; for futures and options the number of units, a whole multiple of the lot size |
| `price`, `trigger_price` | A limit price, a stop trigger, or both (below); none for a market order |
| `validity` | `"day"` (default) or `"gtt"` (below) |
| `lots` | Number of lots instead of `qty` (not both) |
| `size` | A sizer such as `bt.size.percent(50)` (see [Sizing](costs-slippage-and-margin.md#sizing)) |
| `stop`, `target`, `targets`, `trail`, `breakeven`, `after_first_target` | The leg rules of the position the order opens (below) |
| `product` | `"MIS"`, `"CNC"` or `"NRML"` for this order; the strategy's product otherwise |
| `leverage` | Intraday (MIS) leverage asked for, up to 5 for cash equity (see [Margin](costs-slippage-and-margin.md#margin)); the class attribute `leverage` sets the default for every order |
| `reverse` | `True` lets an order larger than the opposite position close it and open the rest on the other side |
| `symbol` | Required when the strategy trades several symbols |
| `tag` | Your own label, kept in the orders table |

With no `qty`, `lots` or `size` (and no strategy `size`), the engine default applies: one lot for futures and options; for cash equity the whole equity (never more than the free cash, split equally across the strategy's symbols) less the order's estimated charges.

`buy`, `sell`, `exit` and `reduce` return an **order handle**: `order.id` (`"o1"`), `order.status` (`"Submitted"`, `"Triggered"`, `"Filled"`, `"Canceled"`, `"Expired"`, `"Rejected"`), `order.filled_qty`, `order.avg_price` and `order.reject_code`. They return `None` when there was nothing to do (an exit while flat) or a sizer sized the order to zero (listed in `result.skipped`).

## Limit, stop and GTT orders

`buy` and `sell` take OpenAlgo's order types:

| Arguments | Order type | How it fills |
|---|---|---|
| none | `MARKET` | At the next base-bar open, plus slippage |
| `price=` | `LIMIT` | At the bar's open when the open is already at or better than the limit, otherwise at the limit once a bar's range reaches it. No slippage |
| `trigger_price=` | `SL-M` | Once the price reaches the trigger: at the trigger, or at the open when a bar gaps through it, plus slippage |
| `price=` and `trigger_price=` | `SL` | Triggers like a stop, then fills like a limit at `price` or better. An exit stop-limit that triggers without filling becomes a market order at the next bar's open |

* A limit or stop order rests from the next base bar and is matched on every base bar, the open first and then the range. It is a DAY order: unfilled at the session close, it expires (status `Expired`).
* A price off the tick grid is rejected with `tick`. On options, an `SL-M` is sent as an `SL` with its limit 5 percent beyond the trigger.
* `self.cancel(order)` cancels an order while it rests; `self.orders` lists the working ones.
* `result.orders` shows each order's `order_type`, `limit_rupees`, `trigger_rupees` and `validity`.

<!-- continues -->
```python
class Entries(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"

    def on_bar(self, bar):
        if len(self.close) == 5:  # the 10:30 close, with the price near 509
            self.state["orders"] = {
                "limit 507, buy the dip": self.buy(qty=100, price=507),
                "limit 503, never reached": self.buy(qty=100, price=503),
                "stop 514, buy the breakout": self.buy(qty=100, trigger_price=514),
                "limit 507.03, off the tick": self.buy(qty=100, price=507.03),
            }

    def on_stop(self):
        for name, order in self.state["orders"].items():
            print(f"{name:27} {order.status:9} {order.reject_code or '':5} {order.avg_price}")


entries = bt.backtest(Entries, data=rising, **QUIET)
show(entries)
```

<!-- output -->
```text
limit 507, buy the dip      Filled          507.0
limit 503, never reached    Expired         0.0
stop 514, buy the breakout  Filled          514.0
limit 507.03, off the tick  Rejected  tick  0.0
                     time side  quantity_units  price_rupees    reason target_index
2026-10-05 10:58:00+05:30  BUY           100.0         507.0     entry         None
2026-10-05 12:03:00+05:30  BUY           100.0         514.0       add         None
2026-10-05 15:00:00+05:30 SELL           200.0         512.6 scheduler         None
```

### GTT orders for positional trades

On CNC and NRML positions, `stop=`, `target=`, `targets=`, `trail=` and `breakeven=` are held the way a broker holds them overnight, as GTT (good till triggered) orders:

* The GTT orders are placed with the fill that opens the position: one per target, as a SINGLE or an OCO with the stop for that part, and a stop for the rest.
* When a trail, a breakeven move or an add shifts a level by at least a tick, the GTT is modified, at most once per base bar. A GTT is cancelled before any other exit of the position, and re-created when it is older than 360 days.
* When a GTT fires it places a LIMIT child order 1 percent beyond its trigger (5 percent for options). If a gap leaves the child unfilled, the child is cancelled and the engine exits at the next base-bar open, flagged `gtt_child_unfilled`.
* `result.events` records `GttPlaced`, `GttModified`, `GttTriggered`, `GttChildFilled`, `GttChildCanceled` and `GttCanceled`, and each fill carries its `gtt_id`.

`validity="gtt"` rests an order of your own the same way, until its trigger `price` is reached or you cancel it, across sessions (CNC and NRML only; on MIS it is rejected with `product_rule`).

<!-- continues -->
```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

sessions = bt.calendar.default_calendar().sessions("NSE", "2026-09-01", "2026-10-30")
k = np.arange(len(sessions))
close = (1000 + 40 * np.sin(k / 5)).round(1)
daily = pd.DataFrame(
    {"open": close, "high": close + 5, "low": close - 5, "close": close, "volume": 10_000},
    index=pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata"),
)


class Positional(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # daily equity: CNC

    def on_bar(self, bar):
        if len(self.close) == 2 and self.position.is_flat:
            self.buy(qty=50, stop=bt.pct(2), target=bt.pct(3))


positional = bt.backtest(Positional, data=daily, capital=500_000)
print(positional.fills[["time", "side", "quantity_units", "price_rupees", "reason", "gtt_id"]].to_string(index=False))
events = positional.events
print(events[events["name"].str.startswith("Gtt")][["time", "name"]].to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees reason  gtt_id
2026-09-03 09:15:00+05:30  BUY            50.0       1015.85  entry     NaN
2026-09-24 09:15:00+05:30 SELL            50.0        995.35 leg_sl     1.0
                     time           name
2026-09-03 09:15:00+05:30      GttPlaced
2026-09-24 09:15:00+05:30   GttTriggered
2026-09-24 09:15:00+05:30 GttChildFilled
```

## When an order fills

* A strategy decides at the **close** of its bar. A market order then fills at the **open of the next base bar**. On a 15-minute strategy with 1-minute data, the 09:15 bar closes at 09:30 and its order fills at the 09:30 open.
* An order placed by a timer (`self.at`) fills at the open the timer ran at.
* Every fill pays slippage against you (a buy pays more, a sell receives less), rounded to the tick away from you.
* A position that is still open is never filled at a price it could not have had: if a base bar is missing, the order waits for the next bar of the same session.
* Orders are DAY orders. On intraday bars an order decided at the session's last close would fill in the next session, so it is rejected with `market_closed`. On daily bars the next session's open is the next bar, so an order decided at a daily close fills there.
* Stops, targets and trails are held by the engine and tested on every base bar: a level already crossed at the bar's open fills at the open (a gap), otherwise at the level itself.

## Stops, targets and scale-out

Leg rules attach to the position an order opens:

| Argument | Meaning |
|---|---|
| `stop=` | Stop loss distance below a long's (above a short's) average price |
| `target=` | One profit target for the whole position |
| `targets=[(distance, fraction), ...]` | Several targets, each closing that fraction of the position; the fractions add up to at most 1, and the rest leaves by the stop, a trail, a signal or the square-off |
| `trail=` | A trailing stop (next section) |
| `breakeven=` | Move the stop to the entry price (plus an offset) after a favourable move |
| `after_first_target="breakeven"` | Move the stop to the entry price once the first target fills (`"keep"`, the default, leaves it) |

Distances:

| Form | Meaning |
|---|---|
| A bare number, or `bt.points(x)` | Rupees of price |
| `bt.pct(x)` | x percent of the position's average fill price |
| `bt.ticks(n)` | n ticks of the instrument |
| `bt.rupees(x)` | x rupees of the position's profit or loss (divided by the quantity) |
| `bt.atr(multiple, period=14)` | A multiple of the ATR from `openalgo.ta` at the strategy bar the order was decided on; needs `period` closed bars |

How they behave:

* Levels are computed from the position's **average fill price** (after slippage) and rounded to the tick.
* They are tested on every base bar **from the entry bar on**. If a bar reaches both the stop and a target, the stop wins. Several targets can fill in one bar, nearest first.
* An **add** recomputes the stop and the unfilled targets from the new average price; a stop never moves against you. An add may repeat the rules of the first order but not change them.
* Exit fills carry the reason `leg_sl` or `leg_target`, and a target fill its `target_index` (0 for the first). `result.positions` shows the levels in force after every change.
* On **MIS** positions the engine holds the levels itself. On **CNC** and **NRML** positions they are held as GTT orders, the way your broker would hold them overnight (see [GTT orders](#gtt-orders-for-positional-trades)).

<!-- continues -->
```python
scale_out = first_bar(stop=3, targets=[(bt.points(4), 0.5), (bt.points(8), 0.3)])
show(bt.backtest(scale_out, data=rising, **QUIET))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees     reason  target_index
2026-10-05 09:30:00+05:30  BUY           100.0         502.3      entry           NaN
2026-10-05 09:52:00+05:30 SELL            50.0         506.3 leg_target           0.0
2026-10-05 11:40:00+05:30 SELL            30.0         510.3 leg_target           1.0
2026-10-05 15:00:00+05:30 SELL            20.0         512.6  scheduler           NaN
```

The position was bought at the 09:30 open. Half of it left at the first target (4 points above the entry), 30 units at the second (8 points above), and the last 20 units at the 15:00 square-off.

## Trailing stops

`trail=` takes OpenAlgo's trailing stop, the same `{x, y}` pair the Strategy RMS uses:

| Form | Meaning |
|---|---|
| `bt.trail(x, 0)`, or `bt.trail_points(x)` | Continuous: once the price has moved `x` in your favour, the stop follows the best price at a distance of `x` |
| `bt.trail(x, y)` with `y` above 0 | Stepped: the stop moves up by `y` for every `x` of favourable move. Needs a `stop=` to start from |
| `bt.trail_pct(p)` | Continuous, with `x` as p percent of the average price |
| `bt.trail_atr(multiple, period=14)` | Continuous, with `x` as a multiple of the ATR at the decision |

`x` and `y` are distances as above (a bare number is points). A trail moves the stop from each bar's best price and the new stop applies from the next base bar. It never loosens.

<!-- continues -->
```python
forms = {
    "trail_points(4)": {"trail": bt.trail_points(4)},
    "trail(4, 2), stop 3": {"trail": bt.trail(4, 2), "stop": 3},
    "trail_pct(1)": {"trail": bt.trail_pct(1)},
    "breakeven(5)": {"breakeven": bt.breakeven(5), "stop": 3},
}
for name, order in forms.items():
    exit_fill = bt.backtest(first_bar(**order), data=rising, **QUIET).fills.iloc[-1]
    print(f"{name:20} exit {exit_fill['time']:%H:%M} at {exit_fill['price_rupees']} ({exit_fill['reason']})")
```

<!-- output -->
```text
trail_points(4)      exit 11:12 at 506.1 (leg_sl)
trail(4, 2), stop 3  exit 15:00 at 512.6 (scheduler)
trail_pct(1)         exit 15:00 at 512.6 (scheduler)
breakeven(5)         exit 15:00 at 512.6 (scheduler)
```

The continuous 4-point trail armed when the price reached 506.30 and stopped out in the pullback after 10:15. The stepped trail raised its stop by 2 points for every 4 points gained (499.30, 501.30, 503.30, 505.30) and was never hit, so the square-off closed it. A 1 percent trail of an average price of 502.30 is about 5 points, so it also rode through the pullback. The breakeven moved the stop to 502.30 after a 5-point gain.

## Adds, partial exits and reverse

* A `buy` while long adds a tranche (fill reason `add`); `self.position.adds` counts them.
* A `sell` while long reduces it. A `sell` larger than the long is **rejected** with `reverse_not_allowed`, unless you pass `reverse=True`: then it closes the long and opens a short with the rest.
* `self.exit(fraction=0.5)` closes half; `self.reduce(qty=30)` closes 30 units.

<!-- continues -->
```python
class Scaling(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"

    def on_bar(self, bar):
        step = len(self.close)
        if step == 1:
            self.buy(qty=100)
        elif step == 2:
            self.buy(qty=50)  # an add
        elif step == 3:
            self.exit(fraction=0.5)
        elif step == 4:
            rejected = self.sell(qty=200)  # more than the 75 held
            self.state["rejected"] = rejected
        elif step == 5:
            self.sell(qty=200, reverse=True)  # close 75, open 125 short

    def on_stop(self):
        order = self.state["rejected"]
        print(order.id, order.status, order.reject_code)


show(bt.backtest(Scaling, data=rising, **QUIET))
```

<!-- output -->
```text
o4 Rejected reverse_not_allowed
                     time side  quantity_units  price_rupees    reason target_index
2026-10-05 09:30:00+05:30  BUY           100.0         502.3     entry         None
2026-10-05 09:45:00+05:30  BUY            50.0         504.8       add         None
2026-10-05 10:00:00+05:30 SELL            75.0         507.3    signal         None
2026-10-05 10:30:00+05:30 SELL            75.0         509.1    signal         None
2026-10-05 10:30:00+05:30 SELL           125.0         509.1     entry         None
2026-10-05 15:00:00+05:30  BUY           125.0         512.6 scheduler         None
```

## Scale-in limits

An `on_bar` strategy adds whenever it buys while long (or sells while short). The scale-in limits, set as class attributes, cap those adds. Each sets nothing unless you give it:

| Class attribute | What it limits |
|---|---|
| `max_adds` | Adds to one position (a whole number; 0 forbids adding) |
| `max_position` | The largest position after an add: a number or `bt.size.qty(n)` is units, `bt.size.lots(n)` lots, `bt.rupees(x)` or `bt.size.value(x)` rupees of value at the decision price, `bt.pct(x)` or `bt.size.percent(x)` a percent of equity |
| `min_spacing` | The least gap between adds: a whole number is base bars closed after the bar in which the last tranche filled; `bt.points(x)`, `bt.pct(x)` (of the last tranche's price) or `bt.ticks(n)` is the least price distance from the last tranche |
| `max_risk` | The open risk of the whole position after the add, from the average price to the stop: a number or `bt.rupees(x)` is rupees, `bt.pct(x)` a percent of equity. A position without a stop has no bounded risk, so with `max_risk` set its adds are refused |
| `allow_averaging_down` | `False` (default) refuses an add while the decision price is worse than the average price (below it for a long, above it for a short); `True` allows it |

The limits are checked at submission on every add (an entry from flat is not an add), at the decision price, and adds still waiting for their fill count, so several adds decided together cannot slip past a limit. An add that breaks one is rejected with the reject code `scale_in_limit`. The Assumptions block lists every limit the run used.

<!-- continues -->
```python
class Pyramid(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"
    max_adds = 2                 # an entry and at most two adds
    allow_averaging_down = False  # the default: never add below the average price

    def init(self):
        self.state["orders"] = []

    def on_bar(self, bar):
        if len(self.close) <= 8:  # try to buy 100 at each of the first eight bar closes
            order = self.buy(qty=100)
            self.state["orders"].append((f"{self.now:%H:%M}", order.status, order.reject_code))

    def on_stop(self):
        for decided, status, code in self.state["orders"]:
            print(decided, status, code or "")


pyramid = bt.backtest(Pyramid, data=rising, **QUIET)
show(pyramid)
print({key: pyramid.assumptions[key] for key in ("max_adds", "allow_averaging_down")})
```

<!-- output -->
```text
09:30 Submitted
09:45 Submitted
10:00 Submitted
10:15 Rejected scale_in_limit
10:30 Rejected scale_in_limit
10:45 Rejected scale_in_limit
11:00 Rejected scale_in_limit
11:15 Rejected scale_in_limit
                     time side  quantity_units  price_rupees    reason target_index
2026-10-05 09:30:00+05:30  BUY           100.0         502.3     entry         None
2026-10-05 09:45:00+05:30  BUY           100.0         504.8       add         None
2026-10-05 10:00:00+05:30  BUY           100.0         507.3       add         None
2026-10-05 15:00:00+05:30 SELL           300.0         512.6 scheduler         None
{'max_adds': 2, 'allow_averaging_down': False}
```

The entry and two adds filled as the price rose (average price 504.80); every later buy was refused by `max_adds`. Had the price fallen below 504.80, an add would also have been refused as averaging down.

**Class-level leverage.** The class attribute `leverage` (a number, 1 or more) is the default leverage of every order of the strategy, `on_bar` and condition strategies alike; `leverage=` on an order wins over it. It is subject to the same limits as on an order: intraday (MIS) cash equity only, up to 5.

## Intraday entry window and square-off

For MIS positions the engine applies the session times a broker applies:

* **`entry_from`, `entry_until`**: an entry (or add) whose fill would come before `entry_from` or at or after `entry_until` is rejected with `entry_window`. Exits are always allowed.
* **`square_off`**: every open MIS position is closed at the first base-bar open at or after this time (fill reason `scheduler`). If no bar comes after it in the session, the position is closed at the last close (reason `eod`, flagged `filled_at_last_close`).

The defaults come from a dated table in the engine. They are chosen to be no later than any known broker's automatic square-off, so a backtest never keeps a position your broker would already have closed:

| Exchange | Dates | Entries until | Square-off |
|---|---|---|---|
| NSE, BSE (cash) | up to 2 August 2026 | 15:00 | 15:10 |
| NSE, BSE (cash) | from 3 August 2026 (closing auction at 15:15) | 14:50 | 15:00 |
| NFO, BFO | all dates | 15:00 | 15:10 |
| CDS, BCD | all dates | 16:30 | 16:40 |
| MCX | all dates | 30 minutes before that day's close | 20 minutes before that day's close |

Each session takes the row of its own date, and a special session (such as a Muhurat session) whose times do not fit takes the minutes-before-close rule. `entry_from` has no default: entries are allowed from the open. Change any of them with `bt.backtest(..., entry_from="09:30", entry_until="14:00", square_off="14:45")` or the class attributes of the same names; a class attribute wins.

<!-- continues -->
```python
class EveryHour(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1h"

    def on_bar(self, bar):
        if self.position.is_flat:
            self.buy(qty=100)


timed = bt.backtest(EveryHour, data=bars, entry_until="13:00", square_off="14:00", **QUIET)
print(timed.orders[["time", "status", "reject_code"]].to_string(index=False))
show(timed)
```

<!-- output -->
```text
                     time   status  reject_code
2026-10-05 10:15:00+05:30   Filled          NaN
2026-10-05 14:15:00+05:30 Rejected entry_window
2026-10-05 15:15:00+05:30 Rejected entry_window
2026-10-05 15:30:00+05:30 Rejected entry_window
2026-10-06 10:15:00+05:30   Filled          NaN
2026-10-06 14:15:00+05:30 Rejected entry_window
2026-10-06 15:15:00+05:30 Rejected entry_window
2026-10-06 15:30:00+05:30 Rejected entry_window
                     time side  quantity_units  price_rupees    reason target_index
2026-10-05 10:15:00+05:30  BUY           100.0         509.8     entry         None
2026-10-05 14:00:00+05:30 SELL           100.0         513.9 scheduler         None
2026-10-06 10:15:00+05:30  BUY           100.0         500.2     entry         None
2026-10-06 14:00:00+05:30 SELL           100.0         496.7 scheduler         None
```

The 1-hour bars close at 10:15, 11:15 and so on (the orders table shows each order at its decision time). Each day's first entry filled at 10:15 and was squared off at 14:00. The entries decided after that would have filled after the 13:00 cut-off, so they were rejected with `entry_window`.

## Strategy risk rules

These rules watch the whole strategy, not one position. Pass them to `bt.backtest` or set them as class attributes (a class attribute wins).

| Setting | What it does |
|---|---|
| `max_daily_loss` | Rupees (a number or `bt.rupees(x)`). When the day's loss reaches it, every position is closed (reason `daily_loss_limit`), and new entries are rejected with `daily_loss_gate` until the next session |
| `risk_basis` | `"gross"` (default) measures the day's loss before charges, `"net"` after them |
| `drawdown_halt` | Percent from peak equity (`bt.pct(x)` or a number). When equity falls that far, every position is closed (reason `drawdown_halt`) and the strategy is halted for the rest of the run: entries are rejected with `halted` |
| `cooldown` | Base bars after an exit during which new entries are rejected with `cooldown` |
| `max_positions` | Most open positions; an entry beyond it is rejected with `max_positions` |
| `max_hold` | Class attribute only: a position held this many base bars is closed (reason `time_exit`) |
| `round_levels` | `True` (default) rounds stop and target levels to the tick |
| `strict_config` | `True` (default) refuses settings that would do nothing, such as a stepped trail without a stop |

The day's loss is the realized P&L of the trades closed that session plus the open P&L of the position since its first fill. A breach exits at the next base-bar open; on daily bars, at that day's close (flagged `filled_at_last_close`). `on_risk_event` receives `daily_loss_limit_hit`, `risk_halt` and `trading_state_changed` events (the state goes `ACTIVE` to `REDUCING` after a daily-loss breach and back at the next session, or to `HALTED`).

`after_risk_exit` governs only the exits of the combined rules, which are not available yet. The default `"lock_session"` changes nothing today, and `"allow_reentry"` raises `NotImplementedError`; a daily-loss breach always blocks entries until the next session.

<!-- continues -->
```python
class BuyTheDip(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"
    max_daily_loss = 1_000

    def on_bar(self, bar):
        if self.position.is_flat:
            order = self.buy(qty=100)
            if order.status == "Rejected":
                print(f"{self.now:%d %b %H:%M} entry rejected: {order.reject_code}")

    def on_risk_event(self, event):
        state = event.get("trading_state")
        print(f"{event['time']:%d %b %H:%M} {event['name']}", state or "")


# A datetime as end= stops the run at that time (a date runs the whole session).
guarded = bt.backtest(BuyTheDip, data=falling, end=pd.Timestamp("2026-10-06 10:45"), **QUIET)
show(guarded)
```

<!-- output -->
```text
06 Oct 10:19 daily_loss_limit_hit
06 Oct 10:19 trading_state_changed REDUCING
06 Oct 10:30 entry rejected: daily_loss_gate
06 Oct 10:45 entry rejected: daily_loss_gate
                     time side  quantity_units  price_rupees           reason target_index
2026-10-06 09:30:00+05:30  BUY           100.0         509.2            entry         None
2026-10-06 10:20:00+05:30 SELL           100.0         499.2 daily_loss_limit         None
```

The strategy bought 100 at 509.20 on the falling day. At the 10:19 close its open loss reached Rs 1,000, so the engine closed the position at the 10:20 open and blocked new entries for the rest of the session.

## Reject codes

A rejected order has `status == "Rejected"` and one of these codes, both on its handle and in `result.orders`:

| Code | Why the order was rejected |
|---|---|
| `quantity_rule` | Not a whole number of lots, or a fractional quantity with `quantity_mode="venue"` |
| `freeze_qty` | An explicit quantity above the exchange's freeze quantity (a sizer's quantity is capped instead) |
| `product_rule` | A CNC sell that would open or increase a short, or an order for an index |
| `margin` | Not enough free cash for the margin the order needs, checked at the fill |
| `entry_window` | An MIS entry that would fill before `entry_from` or at or after `entry_until` |
| `market_closed` | The fill would fall in a later session than the decision |
| `daily_loss_gate` | An entry after the daily loss limit was hit, until the next session |
| `cooldown` | An entry inside the cooldown after an exit |
| `max_positions` | An entry beyond `max_positions` |
| `halted` | An entry while the strategy is halted by `drawdown_halt` |
| `reverse_not_allowed` | An order larger than the opposite position, without `reverse=True` |
| `scale_in_limit` | An add that breaks a scale-in limit: `max_adds`, `max_position`, `min_spacing`, `max_risk` or averaging down without `allow_averaging_down` |
| `tick` | A limit or trigger price off the tick grid |
| `instrument_unknown` | A symbol the run does not trade (from Python you get a `ConfigError` first) |
| `rate_limit` | The order rate limit (live trading, not available yet) |

## Exit reasons

Every fill has a `reason` in `result.fills`, and every closed trade an `exit_reason` in `result.trades`:

| Reason | Meaning |
|---|---|
| `entry`, `add` | Opened a position, or added to it |
| `signal` | Your own `exit`, `reduce`, `sell` of a long (or `buy` of a short), or `exit_when` |
| `leg_sl`, `leg_target` | The position's stop (fixed, trailed or at breakeven), or one of its targets |
| `scheduler` | The intraday square-off |
| `eod` | An MIS position closed at the session's last close because no bar came at or after the square-off |
| `daily_loss_limit`, `drawdown_halt`, `time_exit` | The strategy risk rules above |
| `roll` | Both legs of a futures roll: the exit from the expiring contract and the entry in the next (see [Futures](futures.md)) |
| `expiry` | A futures position held to expiry and settled at the close of its last trading day |
