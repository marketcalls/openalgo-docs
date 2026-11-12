# Orders and Risk

This page shows how a strategy buys and sells, and how to protect a trade with a stop-loss, a target or a trailing stop. It then covers the intraday square-off, a daily loss limit, and why an order can be rejected.

## The strategy this page builds on

An EMA crossover on SBIN: buy when the 20-day EMA (an average of closing prices that weighs recent days more) crosses above the 50-day EMA, sell when it crosses back below. It runs on **daily bars** (one bar, or candle, per day) and trades **CNC** (delivery: shares held overnight). The buy is in its own function, `enter`, so each example below changes only that.

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

    # init runs once, before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: buy, sell or wait.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until the slow EMA has 50 days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.enter()  # the buy, in its own function below
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything held, at the next day's open

    # enter places the buy. The examples on this page change only this function.
    def enter(self):
        self.buy()  # no quantity: all the capital, at the next day's open


# Run it on SBIN from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print_summary(result)
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

The **max drawdown** is the largest fall of the account from its highest value.

## How do I buy and sell?

* `self.buy()` buys; `self.sell()` sells. With no quantity, a buy uses all the capital (less the estimated charges). Give a quantity with `qty=`, always in shares (units), never lots. For futures, `lots=1` buys one lot.
* These are **market orders**: decided at the close of a bar and filled at the open of the next bar, plus slippage (the small amount every fill loses to the market).
* `self.sell()` while holding shares reduces them. A sell with nothing held opens a **short** (see [Can I sell short?](#can-i-sell-short)).

A fixed 50 shares on every buy:

<!-- continues -->
<!-- requires-server -->
```python
# "class BuyFifty(EmaCrossover)" copies EmaCrossover; only enter changes.
class BuyFifty(EmaCrossover):
    def enter(self):
        self.buy(qty=50)  # 50 shares


# Run it over the same years and print the four numbers.
print_summary(bt.backtest(BuyFifty, client, start="2021-01-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs 12,294.07
Return       : 12.29%
Max drawdown : -14.62%
Trades       : 11 (36% won)
```

Fifty shares used only part of the capital, so the profit is smaller than with all of it.

## How do I exit a trade?

* `self.exit()` closes the whole position at the next bar's open: it sells what you hold, or buys back a short. With nothing held it does nothing.
* `self.exit(fraction=0.5)` closes half.
* A stop-loss, a target and a trailing stop exit on their own (next sections).

Exiting sooner: sell when the close falls below the 50-day EMA, without waiting for the crossover.

<!-- continues -->
<!-- requires-server -->
```python
# The same entry, with a faster exit rule.
class ExitBelowEma(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.enter()
        elif self.position.is_long and self.close[-1] < self.slow_ema[-1]:  # [-1]: the latest value
            self.exit()


# Run it over the same years and print the four numbers.
print_summary(bt.backtest(ExitBelowEma, client, start="2021-01-01", end="2026-11-11", capital=100_000))
```

<!-- output -->
```text
Net profit   : Rs 5,410.32
Return       : 5.41%
Max drawdown : -20.96%
Trades       : 11 (18% won)
```

The faster exit cut the losing trades early, but it also sold the big trends early, so on SBIN it made far less.

## How do I add a stop-loss?

A **stop-loss** (or stop) sells when the price falls a set distance below your buying price, so one trade cannot lose too much. Give it on the buy:

| Distance | Meaning |
|---|---|
| `stop=bt.pct(5)` | 5 percent below the buying price |
| `stop=bt.points(20)`, or `stop=20` | 20 rupees below |
| `stop=bt.atr(2)` | 2 times the ATR (average true range: the average size of a bar's move) |

<!-- continues -->
<!-- requires-server -->
```python
# Every buy carries a stop 5 percent below the buying price.
class WithStop(EmaCrossover):
    def enter(self):
        self.buy(stop=bt.pct(5))


# Run it, print the four numbers, and count how the trades ended.
stopped = bt.backtest(WithStop, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print_summary(stopped)
print(stopped.trades["exit_reason"].value_counts().to_dict())  # how many trades ended each way
```

<!-- output -->
```text
Net profit   : Rs 22,537.04
Return       : 22.54%
Max drawdown : -28.97%
Trades       : 11 (27% won)
{'leg_sl': 7, 'signal': 4}
```

`leg_sl` is a trade closed by its stop, `signal` one closed by the strategy's own `self.exit()`. The stop limited the losing trades but also closed some that would have recovered: test a stop on your stock and compare the four numbers.

On CNC positions (and NRML, futures held overnight) the stop is held as a **GTT** (good till triggered) order: one your broker keeps across days until the price reaches it. On MIS (intraday) positions the engine holds the stop itself.

## How do I add a target?

A **target** sells when the price has risen a set distance above your buying price, to book the profit. It takes the same distances as the stop. If one bar reaches both the stop and the target, the stop wins: the engine cannot tell which came first, so it assumes the worse.

<!-- continues -->
<!-- requires-server -->
```python
# A 5 percent stop and a 20 percent target on every buy.
class StopAndTarget(EmaCrossover):
    def enter(self):
        self.buy(stop=bt.pct(5), target=bt.pct(20))


# Run it, print the four numbers, and count how the trades ended.
booked = bt.backtest(StopAndTarget, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print_summary(booked)
print(booked.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
Net profit   : Rs 16,577.04
Return       : 16.58%
Max drawdown : -22.24%
Trades       : 11 (27% won)
{'leg_sl': 7, 'leg_target': 3, 'signal': 1}
```

`leg_target` is a trade closed at its target. The [stop-loss and target lesson](tutorial/03-stop-loss-and-target.md) builds these step by step.

## How do I add a trailing stop?

A **trailing stop** follows the price up and never moves down, so it locks in part of a gain. `trail=bt.trail_pct(10)` starts once the price has risen 10 percent above your buying price; from then on the stop stays 10 percent below the highest price reached. Until then there is no stop, unless you also give `stop=`.

<!-- continues -->
<!-- requires-server -->
```python
# A trailing stop 10 percent below the best price, on every buy.
class Trailing(EmaCrossover):
    def enter(self):
        self.buy(trail=bt.trail_pct(10))


# Run it, print the four numbers, and count how the trades ended.
trailed = bt.backtest(Trailing, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print_summary(trailed)
print(trailed.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
Net profit   : Rs 22,961.80
Return       : 22.96%
Max drawdown : -23.61%
Trades       : 11 (36% won)
{'signal': 7, 'leg_sl': 4}
```

Trades that hit the trailing stop end with `leg_sl`, like a fixed stop. `bt.trail_points(30)` trails by rupees and `bt.trail_atr(3)` by 3 ATRs.

## Can I buy at a set price?

Yes. Give a price and the order is no longer a market order:

| Arguments | Order type | How it fills |
|---|---|---|
| none | `MARKET` | At the next bar's open, plus slippage |
| `price=` | `LIMIT` | At your price or better, once the price reaches it |
| `trigger_price=` | `SL-M` | Once the price reaches the trigger: at the trigger, or at the open if the price gaps past it, plus slippage |
| `price=` and `trigger_price=` | `SL` | Triggers like `SL-M`, then fills like a limit at `price` or better |

These are DAY orders: one not filled by the session close expires. The price must be a whole number of ticks (the smallest price step, 0.05 rupees for SBIN), or the order is rejected with `tick`.

## When is an intraday position closed?

On minute bars, such as 15-minute bars, a stock is traded **MIS** (intraday). As a broker does, the engine refuses new entries near the close and closes (squares off) every open position before the session ends:

| Exchange | No new entry from | Square-off |
|---|---|---|
| NSE, BSE cash, from 3 August 2026 | 14:50 | 15:00 |
| NSE, BSE cash, before 3 August 2026 | 15:00 | 15:10 |
| NFO, BFO (futures and options) | 15:00 | 15:10 |
| MCX | 30 minutes before the close | 20 minutes before the close |

Change them with `bt.backtest(..., entry_until="14:00", square_off="14:30")`, or class attributes of the same names.

<!-- continues -->
<!-- requires-server -->
```python
# The same crossover on 15-minute bars: MIS, squared off every session.
class Intraday(EmaCrossover):
    interval = "15m"


# Run it on a recent stretch of 15-minute bars and count how the trades ended.
intraday = bt.backtest(Intraday, client, start="2026-08-01", end="2026-11-11", capital=100_000)
print_summary(intraday)
print(intraday.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
Net profit   : Rs -1,128.76
Return       : -1.13%
Max drawdown : -3.82%
Trades       : 9 (56% won)
{'scheduler': 8, 'signal': 1}
```

`scheduler` is the square-off at 15:00. The [intraday lesson](tutorial/05-intraday.md) explains intraday trading step by step.

## How do I stop trading after a bad day?

Set `max_daily_loss` in rupees. When the day's loss reaches it, the engine closes every position and refuses new entries until the next session.

<!-- continues -->
<!-- requires-server -->
```python
# The intraday crossover that stops for the day after a loss of Rs 500.
class Guarded(Intraday):
    max_daily_loss = 500  # rupees


# Run it over the same months and count how the trades ended.
guarded = bt.backtest(Guarded, client, start="2026-08-01", end="2026-11-11", capital=100_000)
print_summary(guarded)
print(guarded.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
Net profit   : Rs -2,084.46
Return       : -2.08%
Max drawdown : -2.94%
Trades       : 9 (44% won)
{'scheduler': 5, 'daily_loss_limit': 4}
```

`daily_loss_limit` is a trade closed by the limit. Here the result was worse than without it: a loss limit caps a bad day, it does not pick better trades. The day's loss counts the trades closed that session plus the open position's loss.

## Can I sell short?

A **short** sells first and buys back later, to gain from a fall. Use `self.sell()` to open it and `self.exit()` to buy it back, or `self.target(qty=-50)` to be short 50 shares in one call.

* A stock can be shorted only intraday (MIS). On daily bars (CNC) a sell that would open a short is rejected with `product_rule`, as the Indian cash market does not allow an overnight short.
* To hold a short overnight, trade [futures](futures.md).

The [lesson Go Short](tutorial/06-going-short.md) shorts an intraday breakdown and flips between long and short.

## Why was my order rejected?

A rejected order has `status` `"Rejected"` and a `reject_code` in `result.orders`:

<!-- continues -->
<!-- requires-server -->
```python
# The orders of the intraday run that were rejected, and why.
orders = intraday.orders
print(orders[orders["status"] == "Rejected"][["time", "side", "reject_code"]].to_string(index=False))
```

<!-- output -->
```text
                     time side  reject_code
2026-08-25 15:15:00+05:30  BUY entry_window
2026-10-13 15:00:00+05:30  BUY entry_window
2026-10-28 15:00:00+05:30  BUY entry_window
```

These crossovers came at 15:00 or later, after the 14:50 cut-off, so the buys were refused. The codes you will meet most:

| Code | Why |
|---|---|
| `margin` | Not enough free cash for the order (see [Margin](costs-slippage-and-margin.md#how-much-money-does-a-trade-block)) |
| `entry_window` | An intraday entry at or after the entry cut-off |
| `product_rule` | A CNC sell that would open a short, or an order for an index |
| `tick` | A limit or trigger price that is not a whole number of ticks |
| `daily_loss_gate` | An entry after the daily loss limit was hit, until the next session |

## What do the exit reasons mean?

Every closed trade has an `exit_reason` in `result.trades` (and every fill a `reason` in `result.fills`):

| Reason | Meaning |
|---|---|
| `signal` | Your own `exit`, `sell` of a long or `buy` of a short, or `exit_when` |
| `leg_sl` | The stop-loss: fixed, trailing or moved to breakeven |
| `leg_target` | A target |
| `scheduler` | The intraday square-off |
| `eod` | An intraday position closed at the session's last close, because no bar came at or after the square-off |
| `daily_loss_limit`, `drawdown_halt`, `time_exit` | A strategy risk rule |
| `roll`, `expiry` | A futures roll to the next contract, or a contract settled at expiry (see [Futures](futures.md)) |

## More options

* **Trade to a size:** `self.target(qty=100)` makes the position 100 shares long (`-100` short, `0` flat) in one order; it also takes `lots=`, `value=` or `percent=`. See [How do I ...?](how-to.md#long-only-short-only-or-long-and-short).
* **Reverse:** a sell larger than the long is rejected with `reverse_not_allowed`, unless you pass `reverse=True`: it then closes the long and opens a short with the rest.
* **Partial exits:** `self.exit(fraction=0.5)` or `self.reduce(qty=30)` (`reduce` also takes `lots=` or `fraction=`).
* **Several targets:** `targets=[(bt.pct(5), 0.5), (bt.pct(10), 0.3)]` sells half at 5 percent and 30 percent at 10 percent; `after_first_target="breakeven"` then moves the stop to the buying price.
* **Breakeven:** `breakeven=bt.breakeven(bt.pct(5))` moves the stop up to the buying price once the trade is 5 percent up.
* **Stepped trail:** `trail=bt.trail(20, 10)`, with a `stop=` to start from, raises the stop by 10 rupees for every 20 rupees the price gains.
* **Other distances:** `bt.ticks(n)` (ticks of the instrument) and `bt.rupees(x)` (rupees of the trade's profit or loss).
* **How levels are tested:** from the average fill price, rounded to the tick, on every base bar from the entry bar on; a level the price gaps past fills at the open. An add recomputes them from the new average price.
* **GTT details:** a triggered GTT sends a LIMIT order 1 percent beyond the trigger (5 percent for options); if a gap leaves it unfilled, the engine exits at the next open. `result.events` records every GTT step.
* **Your own GTT order:** `validity="gtt"` keeps an order working across sessions until its price is reached (CNC and NRML only).
* **Order handles:** `buy` and `sell` return a handle with `id`, `status`, `filled_qty`, `avg_price` and `reject_code`; `self.cancel(order)`, `self.cancel_all()` and `self.orders` manage working orders; `tag=` adds your own label.
* **Fill timing:** a market order fills at the next base bar's open (with 1-minute data, the next minute); an order placed by a timer fills at the open the timer ran at.
* **Scale-in limits:** `max_adds`, `max_position`, `min_spacing`, `max_risk` and `allow_averaging_down` cap the adds of a strategy that buys again while long; a breach is rejected with `scale_in_limit`.
* **More risk rules:** `drawdown_halt`, `cooldown`, `max_positions`, `max_hold`, `entry_from` and `risk_basis="net"`; `on_risk_event(self, event)` is called when one fires.
* **Rarer reject codes:** `quantity_rule` (not whole lots), `freeze_qty` (above the exchange's freeze quantity), `market_closed` (the fill would fall in a later session), `cooldown`, `max_positions`, `halted` (after `drawdown_halt`), `reverse_not_allowed`, `scale_in_limit`, `instrument_unknown`.
