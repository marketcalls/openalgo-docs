# Orders and Risk

This page covers how a strategy places orders, how a stop-loss, a target and a trailing stop work, the intraday entry window and square-off, the strategy-level risk rules, and when exactly an order fills.

A few words used throughout:

* A **bar** is one candle: the open, high, low and close prices of one period (one day, 15 minutes).
* A **stop-loss** (or stop) is a price at which you sell to cap a loss; a **target** is a price at which you sell to book a profit.
* **CNC** is delivery: shares held overnight. **MIS** is intraday: the position is closed (squared off) before the market closes the same day.

## The strategies the examples build on

Every example on this page runs on real SBIN history from your OpenAlgo server. Run this block first; the blocks after it continue from it. Put your own API key from the OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

It defines two plain EMA crossovers (an **EMA** is a moving average of closing prices that gives more weight to recent days). Each buys when the fast EMA crosses above the slow one and sells when it crosses back below. The examples below change only one thing at a time, usually the `enter` method, which places the buy order.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCross(bt.Strategy):
    """10-day and 30-day EMA crossover on daily bars: CNC, held overnight."""

    symbol, exchange, interval = "SBIN", "NSE", "D"

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, 10)
        self.slow_ema = self.I(ta.ema, self.close, 30)

    def on_bar(self, bar):
        if len(self.close) < 30:  # wait until the slow EMA has enough bars
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.enter()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()

    def enter(self):
        self.buy()  # all the capital, at the next open


class EmaIntraday(EmaCross):
    """9 and 21 EMA crossover on 15-minute bars: MIS, squared off every session."""

    interval = "15m"

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, 9)
        self.slow_ema = self.I(ta.ema, self.close, 21)

    def enter(self):
        self.buy(qty=100)  # 100 shares
```

## Placing orders

| Method | What it does |
|---|---|
| `self.buy(qty=None, ...)` | Opens a long, adds to it, or reduces a short |
| `self.sell(qty=None, ...)` | Opens a short, adds to it, or reduces a long |
| `self.exit(symbol=None, fraction=1.0, qty=None)` | Closes the position, or a fraction of it, or `qty` units; does nothing when flat |
| `self.reduce(qty=None, lots=None, fraction=None)` | Reduces the position by exactly one of units, lots or a fraction |
| `self.target(qty=None, lots=None, value=None, percent=None, symbol=None)` | Trades to a target position: one order for the difference (see [Trading to a target position](#trading-to-a-target-position)) |
| `self.cancel(order)` | Cancels a working order; returns its state afterwards |
| `self.cancel_all(symbol=None)` | Cancels every working order, or those of one symbol |

Orders are **market orders** (OpenAlgo `MARKET`, DAY validity: they fill at the next price available) unless you give a price: `price=` makes a limit order and `trigger_price=` a stop order (see [Limit, stop and GTT orders](#limit-stop-and-gtt-orders)).

The arguments of `buy` and `sell`:

| Argument | Meaning |
|---|---|
| `qty` | Units: shares for equity; for futures and options the number of units, a whole multiple of the lot size (a **lot** is the fixed number of units one contract holds) |
| `price`, `trigger_price` | A limit price, a stop trigger, or both (below); none for a market order |
| `validity` | `"day"` (default) or `"gtt"` (below) |
| `lots` | Number of lots instead of `qty` (not both) |
| `size` | A sizer such as `bt.size.percent(50)`, or your own sizing function (see [Sizing](costs-slippage-and-margin.md#sizing)) |
| `stop`, `target`, `targets`, `trail`, `breakeven`, `after_first_target` | The leg rules of the position the order opens (below) |
| `product` | `"MIS"`, `"CNC"` or `"NRML"` for this order; the strategy's product otherwise |
| `leverage` | Intraday (MIS) leverage asked for, up to 5 for cash equity (see [Margin](costs-slippage-and-margin.md#margin)); the class attribute `leverage` sets the default for every order |
| `reverse` | `True` lets an order larger than the opposite position close it and open the rest on the other side |
| `symbol` | Required when the strategy trades several symbols |
| `tag` | Your own label, kept in the orders table |

With no `qty`, `lots` or `size` (and no strategy `size`), the engine default applies: one lot for futures and options; for cash equity the whole equity (never more than the free cash, split equally across the strategy's symbols) less the order's estimated charges.

`buy`, `sell`, `exit` and `reduce` return an **order handle**: `order.id` (`"o1"`), `order.status` (`"Submitted"`, `"Triggered"`, `"Filled"`, `"Canceled"`, `"Expired"`, `"Rejected"`), `order.filled_qty`, `order.avg_price` and `order.reject_code`. They return `None` when there was nothing to do (an exit while flat) or a sizer sized the order to zero or a size cap left no room (listed in `result.skipped`).

### Trading to a target position

`self.target(...)` says how large the position should be, and the engine works out the order. Give exactly one of:

| Argument | Target position |
|---|---|
| `qty` | Units (negative is short, 0 is flat) |
| `lots` | Lots, a whole number |
| `value` | Rupees of position value, converted at the decision price |
| `percent` | Percent of equity, converted at the decision price (of the starting capital when the strategy sets `reinvest = False`) |

`value` and `percent` are rounded towards zero: to whole shares with `quantity_mode="venue"`, to whole lots for futures and options, and to fractional shares in the default fractional mode.

* It sends **one market order** (DAY validity) for the difference between the target and the position the strategy will hold once its queued market orders fill, and returns its handle; it returns `None` when the position already is the target.
* A smaller position on the same side only reduces. A target on the other side closes the position and opens the rest in the same order (two fills).
* Resting limit, stop and GTT orders are left working and are not counted.
* The order carries no stop or target of its own: an add keeps the position's leg rules, and the side a reversal opens has none. It uses the strategy's product, and its `leverage` when it opens or adds. Size caps do not apply: `target()` trades what you ask for.

An always-in-the-market intraday crossover: long 100 shares after a cross up, short 100 after a cross down. The fills of 6 November 2026:

<!-- continues -->
<!-- requires-server -->
```python
class AlwaysIn(EmaIntraday):
    def on_bar(self, bar):
        if len(self.close) < 21:
            return
        if self.fast_ema.crossed_above(self.slow_ema):
            self.target(qty=100)  # be long 100 shares
        elif self.fast_ema.crossed_below(self.slow_ema):
            self.target(qty=-100)  # be short 100 shares


result = bt.backtest(AlwaysIn, client, start="2026-10-26", end="2026-11-11", capital=200_000)
fills = result.fills[["time", "side", "quantity_units", "price_rupees", "reason"]]
print(fills[fills["time"].dt.strftime("%Y-%m-%d") == "2026-11-06"].to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees    reason
2026-11-06 12:00:00+05:30 SELL           100.0        998.05     entry
2026-11-06 12:15:00+05:30  BUY           100.0       1002.00    signal
2026-11-06 12:15:00+05:30  BUY           100.0       1002.00     entry
2026-11-06 15:00:00+05:30 SELL           100.0       1013.55 scheduler
```

On 6 November the strategy was short 100 shares from 12:00. At the 12:15 cross up, `target(qty=100)` sent one buy order for 200 shares: 100 closed the short (`signal`) and 100 opened the long (`entry`), both at the same open. The long was squared off at 15:00, the end of the intraday session.

## Limit, stop and GTT orders

`buy` and `sell` take OpenAlgo's order types:

| Arguments | Order type | How it fills |
|---|---|---|
| none | `MARKET` | At the next base-bar open, plus slippage |
| `price=` | `LIMIT` | At the bar's open when the open is already at or better than the limit, otherwise at the limit once a bar's range reaches it. No slippage |
| `trigger_price=` | `SL-M` | Once the price reaches the trigger: at the trigger, or at the open when a bar gaps through it, plus slippage |
| `price=` and `trigger_price=` | `SL` | Triggers like a stop, then fills like a limit at `price` or better. An exit stop-limit that triggers without filling becomes a market order at the next bar's open |

* A limit or stop order rests from the next base bar and is matched on every base bar, the open first and then the range. It is a DAY order: unfilled at the session close, it expires (status `Expired`).
* A price off the tick grid is rejected with `tick`. The **tick size** is the smallest step a price can move: 0.05 rupees (5 paise) for SBIN. Round a computed price to it, as below. On options, an `SL-M` is sent as an `SL` with its limit 5 percent beyond the trigger.
* `self.cancel(order)` cancels an order while it rests; `self.orders` lists the working ones.
* `result.orders` shows each order's `order_type`, `limit_rupees`, `trigger_rupees` and `validity`.

The crossover again, entering with a limit order 1 percent below the crossover day's close: it fills only if the next session dips that far, and expires otherwise.

<!-- continues -->
<!-- requires-server -->
```python
class LimitEntry(EmaCross):
    def enter(self):
        tick = 0.05  # SBIN prices move in steps of 5 paise
        price = round(self.close[-1] * 0.99 / tick) * tick  # 1 percent below the close, on the tick grid
        self.buy(price=price)


limit_run = bt.backtest(LimitEntry, client, start="2021-01-01", end="2026-11-11", capital=100_000)
orders = limit_run.orders[["time", "side", "order_type", "limit_rupees", "status", "average_fill_rupees"]]
print(orders.head(5).to_string(index=False))
```

<!-- output -->
```text
                     time side order_type  limit_rupees  status  average_fill_rupees
2021-05-10 15:30:00+05:30  BUY      LIMIT        358.10  Filled               356.85
2021-08-18 15:30:00+05:30 SELL     MARKET           NaN  Filled               414.90
2021-09-06 15:30:00+05:30  BUY      LIMIT        426.75  Filled               426.75
2021-11-26 15:30:00+05:30 SELL     MARKET           NaN  Filled               469.90
2022-01-06 15:30:00+05:30  BUY      LIMIT        486.80 Expired                 0.00
```

The orders table shows each order at the time it was decided (the 15:30 close of a daily bar). A `LIMIT` buy either filled at its limit or better, or expired at the end of the next session.

Entering with a stop order instead: buy only if the next session trades above the crossover day's high, a breakout confirmation.

<!-- continues -->
<!-- requires-server -->
```python
class BreakoutEntry(EmaCross):
    def enter(self):
        self.buy(trigger_price=self.high[-1] + 0.05)  # one tick above the day's high


stop_run = bt.backtest(BreakoutEntry, client, start="2021-01-01", end="2026-11-11", capital=100_000)
orders = stop_run.orders[["time", "side", "order_type", "trigger_rupees", "status", "average_fill_rupees"]]
print(orders.head(5).to_string(index=False))
```

<!-- output -->
```text
                     time side order_type  trigger_rupees  status  average_fill_rupees
2021-05-10 15:30:00+05:30  BUY       SL-M          367.05 Expired                 0.00
2021-09-06 15:30:00+05:30  BUY       SL-M          433.90 Expired                 0.00
2022-01-06 15:30:00+05:30  BUY       SL-M          494.45  Filled               494.55
2022-02-23 15:30:00+05:30 SELL     MARKET             NaN  Filled               479.90
2022-03-29 15:30:00+05:30  BUY       SL-M          501.45 Expired                 0.00
```

A filled `SL-M` buy paid the trigger plus slippage, or the open when the session opened above the trigger.

### GTT orders for positional trades

On CNC and NRML positions, `stop=`, `target=`, `targets=`, `trail=` and `breakeven=` are held the way a broker holds them overnight, as GTT (good till triggered) orders: orders that stay with the broker across days until the price reaches them.

* The GTT orders are placed with the fill that opens the position: one per target, as a SINGLE or an OCO with the stop for that part, and a stop for the rest. An OCO (one cancels the other) holds a stop and a target together; when one fills, the other is cancelled.
* When a trail, a breakeven move or an add shifts a level by at least a tick, the GTT is modified, at most once per base bar. A GTT is cancelled before any other exit of the position, and re-created when it is older than 360 days.
* When a GTT fires it places a LIMIT child order 1 percent beyond its trigger (5 percent for options). If a gap leaves the child unfilled, the child is cancelled and the engine exits at the next base-bar open, flagged `gtt_child_unfilled`.
* `result.events` records `GttPlaced`, `GttModified`, `GttTriggered`, `GttChildFilled`, `GttChildCanceled` and `GttCanceled`, and each fill carries its `gtt_id`.

`validity="gtt"` rests an order of your own the same way, until its trigger `price` is reached or you cancel it, across sessions (CNC and NRML only; on MIS it is rejected with `product_rule`).

The daily crossover with a 5 percent stop-loss and a 10 percent target. Its first trade, and the GTT events that held the two levels:

<!-- continues -->
<!-- requires-server -->
```python
class StopAndTarget(EmaCross):
    def enter(self):
        self.buy(stop=bt.pct(5), target=bt.pct(10))


gtt_run = bt.backtest(StopAndTarget, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(gtt_run.fills[["time", "side", "price_rupees", "reason", "gtt_id"]].head(2).to_string(index=False))
events = gtt_run.events
print(events[events["name"].str.startswith("Gtt")][["time", "name"]].head(3).to_string(index=False))
```

<!-- output -->
```text
                     time side  price_rupees     reason  gtt_id
2021-05-11 09:15:00+05:30  BUY        356.95      entry     NaN
2021-05-21 09:15:00+05:30 SELL        392.55 leg_target     1.0
                     time           name
2021-05-11 09:15:00+05:30      GttPlaced
2021-05-21 09:15:00+05:30   GttTriggered
2021-05-21 09:15:00+05:30 GttChildFilled
```

Reading it: the first trade bought at 356.95. The stop was 5 percent below, 339.10, and the target 10 percent above: 356.95 x 1.10 = 392.645, rounded to the tick, 392.65. Both were placed as one GTT with the entry fill. On 21 May 2021 the price reached 392.65, the GTT fired, and its child order sold at 392.55: the target less the default slippage of 2 basis points, rounded down to the tick.

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
| `bt.atr(multiple, period=14)` | A multiple of the ATR from `openalgo.ta` at the strategy bar the order was decided on; needs `period` closed bars. The **ATR** (average true range) is the average size of a bar's move |

How they behave:

* Levels are computed from the position's **average fill price** (after slippage) and rounded to the tick.
* They are tested on every base bar **from the entry bar on**. If a bar reaches both the stop and a target, the stop wins. Several targets can fill in one bar, nearest first.
* An **add** recomputes the stop and the unfilled targets from the new average price; a stop never moves against you. An add may repeat the rules of the first order but not change them.
* Exit fills carry the reason `leg_sl` or `leg_target`, and a target fill its `target_index` (0 for the first). `result.positions` shows the levels in force after every change.
* On **MIS** positions the engine holds the levels itself. On **CNC** and **NRML** positions they are held as GTT orders, the way your broker would hold them overnight (see [GTT orders](#gtt-orders-for-positional-trades)).

Scaling out of an intraday trade: a 0.5 percent stop, half the shares sold at 0.5 percent profit and 30 percent at 1 percent. The trade of 6 November 2026:

<!-- continues -->
<!-- requires-server -->
```python
class ScaleOut(EmaIntraday):
    def enter(self):
        self.buy(qty=100, stop=bt.pct(0.5), targets=[(bt.pct(0.5), 0.5), (bt.pct(1), 0.3)])


scale_run = bt.backtest(ScaleOut, client, start="2026-10-26", end="2026-11-11", capital=200_000)
fills = scale_run.fills[["time", "side", "quantity_units", "price_rupees", "reason", "target_index"]]
print(fills[fills["time"].dt.strftime("%Y-%m-%d") == "2026-11-06"].to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees     reason  target_index
2026-11-06 12:15:00+05:30  BUY           100.0       1002.00      entry           NaN
2026-11-06 13:16:00+05:30 SELL            50.0       1006.75 leg_target           0.0
2026-11-06 13:48:00+05:30 SELL            30.0       1011.75 leg_target           1.0
2026-11-06 15:00:00+05:30 SELL            20.0       1013.55  scheduler           NaN
```

The buy filled at 1002.00. The first target, 0.5 percent above, was 1007.00 (1002 x 1.005 = 1007.01, rounded to the tick): 50 shares sold there at 1006.75 after slippage. The second, 1 percent above, was 1012.00: 30 shares at 1011.75. The last 20 shares were squared off at 15:00.

## Trailing stops

`trail=` takes OpenAlgo's trailing stop, the same `{x, y}` pair the Strategy RMS uses. A **trailing stop** follows the price up (for a long) and never moves down, so it locks in part of a gain.

| Form | Meaning |
|---|---|
| `bt.trail(x, 0)`, or `bt.trail_points(x)` | Continuous: once the price has moved `x` in your favour, the stop follows the best price at a distance of `x` |
| `bt.trail(x, y)` with `y` above 0 | Stepped: the stop moves up by `y` for every `x` of favourable move. Needs a `stop=` to start from |
| `bt.trail_pct(p)` | Continuous, with `x` as p percent of the average price |
| `bt.trail_atr(multiple, period=14)` | Continuous, with `x` as a multiple of the ATR at the decision |

`x` and `y` are distances as above (a bare number is points). A trail moves the stop from each bar's best price and the new stop applies from the next base bar. It never loosens.

A continuous 5 percent trail on the daily crossover. The first rows of `result.positions` follow the stop as the price rose after the first entry:

<!-- continues -->
<!-- requires-server -->
```python
class Trailing(EmaCross):
    def enter(self):
        self.buy(trail=bt.trail_pct(5))


trail_run = bt.backtest(Trailing, client, start="2021-01-01", end="2026-11-11", capital=100_000)
levels = trail_run.positions[["time", "average_price_rupees", "trail_extreme_rupees", "stop_rupees"]]
print(levels.head(4).to_string(index=False))
print(trail_run.trades[["exit_time", "exit_price_rupees", "exit_reason"]].head(1).to_string(index=False))
```

<!-- output -->
```text
                     time  average_price_rupees  trail_extreme_rupees  stop_rupees
2021-05-11 09:15:00+05:30                356.95                366.40          NaN
2021-05-17 09:15:00+05:30                356.95                385.20       367.35
2021-05-18 09:15:00+05:30                356.95                392.55       374.70
2021-05-21 09:15:00+05:30                356.95                404.40       386.55
                exit_time  exit_price_rupees exit_reason
2021-06-08 09:15:00+05:30              424.0      leg_sl
```

5 percent of the buying price 356.95 is 17.85 rupees. The trail had no stop until the price had risen 17.85 (to 374.80). By 17 May the best price was 385.20 and the stop 385.20 - 17.85 = 367.35; it rose with every new high and sold the position on 8 June 2021 at 424.00.

A stepped trail: a 5 percent stop to start, raised by 10 rupees for every 20 rupees the price gains:

<!-- continues -->
<!-- requires-server -->
```python
class SteppedTrail(EmaCross):
    def enter(self):
        self.buy(stop=bt.pct(5), trail=bt.trail(20, 10))


stepped_run = bt.backtest(SteppedTrail, client, start="2021-01-01", end="2026-11-11", capital=100_000)
levels = stepped_run.positions[["time", "average_price_rupees", "trail_extreme_rupees", "stop_rupees"]]
print(levels.head(5).to_string(index=False))
```

<!-- output -->
```text
                     time  average_price_rupees  trail_extreme_rupees  stop_rupees
2021-05-11 09:15:00+05:30                356.95                366.40        339.1
2021-05-17 09:15:00+05:30                356.95                385.20        349.1
2021-05-21 09:15:00+05:30                356.95                404.40        359.1
2021-05-24 09:15:00+05:30                356.95                419.20        369.1
2021-06-02 09:15:00+05:30                356.95                437.95        379.1
```

The stop started at 339.10, 5 percent below 356.95. Each time the best price gained another 20 rupees over the buying price (376.95, 396.95, 416.95, 436.95), the stop rose by 10: 349.10, 359.10, 369.10, 379.10.

A breakeven stop: a 5 percent stop that moves up to the entry price once the trade is 5 percent in profit, so a winning trade cannot turn into a loss (apart from charges):

<!-- continues -->
<!-- requires-server -->
```python
class Breakeven(EmaCross):
    def enter(self):
        self.buy(stop=bt.pct(5), breakeven=bt.breakeven(bt.pct(5)))


breakeven_run = bt.backtest(Breakeven, client, start="2021-01-01", end="2026-11-11", capital=100_000)
levels = breakeven_run.positions[["time", "average_price_rupees", "stop_rupees", "breakeven_armed"]]
print(levels.head(2).to_string(index=False))
```

<!-- output -->
```text
                     time  average_price_rupees  stop_rupees breakeven_armed
2021-05-11 09:15:00+05:30                356.95       339.10           False
2021-05-17 09:15:00+05:30                356.95       356.95            True
```

Once the price reached 374.80, 5 percent above the buying price, the stop moved from 339.10 up to the buying price, 356.95.

## Adds, partial exits and reverse

* A `buy` while long adds a tranche (fill reason `add`); `self.position.adds` counts them.
* A `sell` while long reduces it. A `sell` larger than the long is **rejected** with `reverse_not_allowed`, unless you pass `reverse=True`: then it closes the long and opens a short with the rest. `self.target(...)` does the same in one call (see [Trading to a target position](#trading-to-a-target-position)).
* `self.exit(fraction=0.5)` closes half; `self.reduce(qty=30)` closes 30 units.

Booking half the profit: buy 100 shares on the crossover, sell half once the close is 10 percent above the buying price, and the rest on the crossover down:

<!-- continues -->
<!-- requires-server -->
```python
class BookHalf(EmaCross):
    def enter(self):
        self.buy(qty=100)

    def on_bar(self, bar):
        super().on_bar(bar)  # the crossover entry and exit, as in EmaCross
        p = self.position
        if p.qty == 100 and self.close[-1] > 1.10 * p.avg_price:  # up 10 percent: book half
            self.exit(fraction=0.5)


half_run = bt.backtest(BookHalf, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(half_run.fills[["time", "side", "quantity_units", "price_rupees", "reason"]].head(3).to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees reason
2021-05-11 09:15:00+05:30  BUY           100.0        356.95  entry
2021-05-24 09:15:00+05:30 SELL            50.0        416.90 signal
2021-08-20 09:15:00+05:30 SELL            50.0        414.90 signal
```

The close of 21 May 2021 was more than 10 percent above the buying price of 356.95, so 50 shares were sold at the next open (416.90). The other 50 were sold on the crossover down in August.

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

Pyramiding into a trend: buy 50 shares at every new 20-day closing high while the price is above its 50-day EMA, with at most two adds, and sell everything when the close drops below the EMA:

<!-- continues -->
<!-- requires-server -->
```python
class Pyramid(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    max_adds = 2  # an entry and at most two adds

    def init(self):
        self.trend = self.I(ta.ema, self.close, 50)

    def on_bar(self, bar):
        if len(self.close) < 50:
            return
        if self.position.is_long and self.close[-1] < self.trend[-1]:
            self.exit()
        elif self.close[-1] > self.trend[-1] and self.close[-1] >= self.close[-20:].max():
            self.buy(qty=50)  # the close is the highest of the last 20 days


pyramid = bt.backtest(Pyramid, client, start="2021-01-01", end="2026-11-11", capital=200_000)
print(pyramid.orders[["time", "side", "quantity_units", "status", "reject_code"]].head(5).to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units   status    reject_code
2021-05-11 15:30:00+05:30  BUY            50.0   Filled            NaN
2021-05-12 15:30:00+05:30  BUY            50.0   Filled            NaN
2021-05-17 15:30:00+05:30  BUY            50.0   Filled            NaN
2021-05-19 15:30:00+05:30  BUY            50.0 Rejected scale_in_limit
2021-05-20 15:30:00+05:30  BUY            50.0 Rejected scale_in_limit
```

The entry and two adds filled on three new highs; the next buys were refused by `max_adds` while the position stayed open. Had the price been below the average price at a new add, the add would also have been refused as averaging down.

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

The intraday crossover with no new entries from 13:00 and everything closed at 14:00:

<!-- continues -->
<!-- requires-server -->
```python
window = bt.backtest(EmaIntraday, client, start="2026-10-01", end="2026-11-11", capital=200_000,
                     entry_until="13:00", square_off="14:00")
orders = window.orders
print(orders[orders["reject_code"] == "entry_window"][["time", "side", "status", "reject_code"]].head(2).to_string(index=False))
fills = window.fills
print(fills[fills["reason"] == "scheduler"][["time", "side", "price_rupees", "reason"]].head(2).to_string(index=False))
```

<!-- output -->
```text
                     time side   status  reject_code
2026-10-05 13:45:00+05:30  BUY Rejected entry_window
2026-10-13 14:00:00+05:30  BUY Rejected entry_window
                     time side  price_rupees    reason
2026-10-09 14:00:00+05:30 SELL        955.55 scheduler
2026-10-28 14:00:00+05:30 SELL        956.20 scheduler
```

The crossovers decided after 13:00 were rejected with `entry_window`, and the positions still open at 14:00 were closed then (`scheduler`).

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

The intraday crossover with a daily loss limit of Rs 500, from 29 September to 5 October 2026:

<!-- continues -->
<!-- requires-server -->
```python
class Guarded(EmaIntraday):
    max_daily_loss = 500  # rupees

    def on_risk_event(self, event):
        print(f"{event['time']:%d %b %H:%M} {event['name']}", event.get("trading_state") or "")


guarded = bt.backtest(Guarded, client, start="2026-09-29", end="2026-10-05", capital=200_000)
print(guarded.fills[["time", "side", "price_rupees", "reason"]].to_string(index=False))
orders = guarded.orders
print(orders[orders["status"] == "Rejected"][["time", "side", "reject_code"]].to_string(index=False))
```

<!-- output -->
```text
05 Oct 11:09 daily_loss_limit_hit
05 Oct 11:09 trading_state_changed REDUCING
                     time side  price_rupees           reason
2026-10-05 09:45:00+05:30  BUY         965.0            entry
2026-10-05 11:10:00+05:30 SELL         959.8 daily_loss_limit
                     time side     reject_code
2026-10-05 13:45:00+05:30  BUY daily_loss_gate
```

The strategy bought 100 shares at 965.00 at 09:45. At the 11:09 close (the 1-minute base bar) its open loss reached Rs 500, so the engine sold at the 11:10 open (`daily_loss_limit`) and moved the strategy to `REDUCING`. The crossover at 13:45 was then rejected with `daily_loss_gate`. From the next session the strategy is `ACTIVE` again.

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
