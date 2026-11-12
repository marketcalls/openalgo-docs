# Costs, Slippage and Margin

Every backtest pays Indian charges and slippage on each trade, and checks that you have the money (margin) for each order, so the result is close to what your account would show. This page shows what is applied by default and how to change it.

## The strategy this page uses

An EMA crossover on SBIN: buy when the 20-day EMA (an average of closing prices that weighs recent days more) crosses above the 50-day EMA, sell when it crosses back below. It runs on **daily bars** (one bar, or candle, per day) and trades **CNC** (delivery: shares held overnight). Besides the usual four numbers it prints the total charges paid.

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
    print(f"Charges      : Rs {m['total_costs']:,.2f}")  # all charges of all fills


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
Charges      : Rs 3,363.62
```

The net profit is after every charge. The **max drawdown** is the largest fall of the account from its highest value.

## What am I charged on each trade?

A **fill** is an executed order: the price and quantity you actually traded. Each fill pays:

* **Brokerage:** your broker's fee. With the default preset, delivery is free and an intraday or futures order pays 0.03 percent or Rs 20, whichever is lower.
* **STT:** securities transaction tax (commodity transaction tax on MCX).
* **Exchange charge, SEBI fee, stamp duty** (on the buy side) and **GST** (18 percent on the brokerage, exchange charge and SEBI fee).
* **DP charge:** on the first delivery sell of a stock in a day, Rs 13 plus GST.

The charges of the first trade, its buy and its sell:

<!-- continues -->
<!-- requires-server -->
```python
# result.costs has one row per fill with every charge in rupees; show the first two rows.
columns = ["side", "price_rupees", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "dp_charge", "total"]
print(result.costs[columns].head(2).round(2).to_string(index=False))
```

<!-- output -->
```text
side  price_rupees  brokerage    stt  exchange_txn  sebi_fee  stamp_duty  gst  dp_charge  total
 BUY        362.90        0.0  99.88          3.45      0.10       14.98 0.62       0.00 119.03
SELL        456.95        0.0 125.77          4.34      0.13        0.00 0.78      15.34 146.35
```

Reading the buy: about 275 shares at 362.90 is an order of Rs 99,881. Delivery brokerage is zero. STT is 0.1 percent of the value (Rs 99.88), stamp duty 0.015 percent (Rs 14.98), and the exchange charge, SEBI fee and GST add about Rs 4. The sell pays STT again, no stamp duty, and the DP charge of Rs 15.34. Every rate is the one in force on the trade's date.

## How do I use my own broker's brokerage?

Pass `costs=` to `bt.backtest`. The taxes and exchange charges apply under every choice; only the brokerage changes.

| `costs=` | Brokerage |
|---|---|
| `"zerodha"` (the default) | Delivery free; intraday and futures 0.03 percent or Rs 20 per order, whichever is lower; options Rs 20 per order |
| `"zero_brokerage"` | No brokerage |
| `bt.costs.flat(20)` | Rs 20 per order |
| `bt.costs.percent(0.03, 20)` | 0.03 percent of the order value, at most Rs 20 |
| `None` | No charges at all; every result then warns that the profit is overstated |

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy with a broker that charges Rs 20 on every order, delivery included.
flat = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                   costs=bt.costs.flat(20))
print_summary(flat)
```

<!-- output -->
```text
Net profit   : Rs 52,636.37
Return       : 52.64%
Max drawdown : -29.87%
Trades       : 11 (36% won)
Charges      : Rs 3,875.24
```

Twenty-two orders at Rs 20 each (Rs 440), plus the GST on them, raised the charges and lowered the profit. To price one trade without a backtest, use the [cost calculator](support-functions/cost-calculator.md).

## What is slippage, and how do I change it?

**Slippage** is the gap between the price you expected (the bar's open) and the price you got. Every fill pays it against you: a buy fills a little higher, a sell a little lower. The defaults:

| Instrument | Default slippage |
|---|---|
| Cash equity | 2 basis points of the price, at least 1 tick |
| Index futures | 1 tick |
| Stock futures | 2 ticks |
| Index options, stock options | 0.5 percent and 1 percent of the premium, at least 1 tick |

A **basis point** is one hundredth of a percent: 2 basis points of Rs 1,000 is 20 paise. A **tick** is the smallest step a price can move, 0.05 rupees for SBIN. Change it with `slippage=`: `0` for none, `bt.ticks(3)` for 3 ticks, `bt.pct(0.1)` for 0.1 percent, or `bt.slippage.bps(5)` for 5 basis points.

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy with no slippage, to see what slippage cost.
no_slippage = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                          slippage=0)
print_summary(no_slippage)
```

<!-- output -->
```text
Net profit   : Rs 54,108.83
Return       : 54.11%
Max drawdown : -29.73%
Trades       : 11 (36% won)
Charges      : Rs 3,373.11
```

Over 22 fills, the default slippage cost about Rs 840 of profit. Keep it on: real fills are never exactly at the open.

## How much money does a trade block?

**Margin** is the money blocked in your account while a position is open. An order that needs more than your free cash is rejected with the reject code `margin`.

| Position | Margin blocked |
|---|---|
| Stock, CNC (delivery) | The full value |
| Stock, MIS (intraday) | The value divided by the leverage you ask for with `leverage=`, up to 5 (1 when you do not ask) |
| Option bought | The premium paid |
| Futures | 20 percent of the contract value, unless you give your broker's figure with `margin=` (see [Futures](futures.md)) |

**Leverage** lets an intraday position be larger than your cash: at 5x, Rs 20,000 of margin holds Rs 1,00,000 of shares. 200 SBIN shares (about Rs 2,00,000) intraday on Rs 1,00,000, without leverage:

<!-- continues -->
<!-- requires-server -->
```python
# The crossover on 15-minute bars (intraday, MIS), buying 200 shares each time.
class TooBig(EmaCrossover):
    interval = "15m"

    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(qty=200)  # add leverage=5 to block only a fifth of the value
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it over the first sessions of November 2026 and list its orders.
too_big = bt.backtest(TooBig, client, start="2026-11-01", end="2026-11-11", capital=100_000)
orders = too_big.orders  # every order, with its status and reject code
print(orders[["time", "side", "quantity_units", "status", "reject_code"]].to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units   status reject_code
2026-11-05 09:45:00+05:30  BUY           200.0 Rejected      margin
```

The buy needed about Rs 2,00,000 of margin, twice the free cash, so it was rejected. With `self.buy(qty=200, leverage=5)` it would block a fifth of that and fill.

## Why does a backtest hold a fraction of a share?

By default a cash-equity backtest may hold fractions of a share, so the result does not depend on the share price: the first buy above was 275.23 shares. For whole shares, as your broker trades them, pass `quantity_mode="venue"`; the engine then also keeps 2 percent of the cash aside as a buffer.

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy in whole shares.
whole = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                    quantity_mode="venue")
print_summary(whole)
print("first buy:", whole.trades["entry_units"].iloc[0], "shares")  # iloc[0]: the first row
```

<!-- output -->
```text
Net profit   : Rs 52,025.85
Return       : 52.03%
Max drawdown : -29.33%
Trades       : 11 (36% won)
Charges      : Rs 3,281.99
first buy: 268.0 shares
```

The first buy was 268 whole shares instead of 275.23. The buffer and the whole shares left a little cash unused, so the profit is slightly lower.

## How do I choose how many shares to buy?

Give a quantity on the order (`qty=50`), or a **sizer** with `size=`, on the order or once for the whole strategy as the class attribute `size`:

| Sizer | Quantity |
|---|---|
| `bt.size.percent(50)` | 50 percent of the equity |
| `bt.size.value(25_000)` | Rs 25,000 worth |
| `bt.size.fixed_risk(1)` | As many shares as lose 1 percent of the equity if the stop is hit (needs `stop=`) |
| `bt.size.lots(2)` | Two lots (futures and options) |

The [lesson How Much to Buy](tutorial/04-how-much-to-buy.md) compares a fixed quantity, a percent of the equity and risk-based sizing on this strategy.

## What do the warnings mean?

The engine never hides an assumption. Every result lists them in `result.warnings` (and in its report):

<!-- continues -->
<!-- requires-server -->
```python
# The warnings of the first run, one per line.
for text in result.warnings:  # "for" repeats the next line for each warning
    print(text)
```

<!-- output -->
```text
SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2021-01-01 used for 2021-01-01 were never verified against their source, so the charges may be off. Until 2021-03-31 NSE charged EQ-series shares outside the NIFTY 50 and NIFTY Next 50 Rs 2.75 per lakh (NSE/FA/46225) and the shares of those two indices this standard rate. The engine does not know an index's members, so the row is unverified.
```

Here there is one: no lot or tick size was given for SBIN, so the engine used the usual ones for a stock, lot 1 and tick 0.05. Fills charged at rates not yet checked against their source, and orders the engine rejected, are listed here too.

## More options

* **Contract-note rounding:** by default STT and stamp duty are rounded to the rupee once a day per contract note, as a broker does; `result.contract_notes` shows each note. `costs=bt.costs.CostModel(rounding="calculator")` rounds each trade instead.
* **Dated rates:** charges are built in from 1 July 2020, one schedule per rate change; `result.costs` names the `schedule` of each fill. An earlier start stops with a `CostError`: pass `costs=None`, or `bt.costs.CostModel(backfill=True)`.
* **Not costed yet:** currency derivatives (CDS, BCD) and MCX options stop with a `CostError`; pass `costs=None`.
* **Your own brokerage:** `bt.costs.custom(delivery=..., intraday=..., futures=..., options=..., dp_fee=...)`.
* **Same-day delivery trades:** a CNC buy and sell of one stock on the same day is charged as intraday, with no DP charge.
* **Slippage by class:** `bt.slippage.defaults()` lists every row and its source; `slippage={"INDEX_FUT": bt.ticks(2)}` replaces one row.
* **Leverage rules:** MIS cash equity only, up to 5; on CNC or above 5 it is a `ConfigError`. The class attribute `leverage` sets it for every order.
* **More sizers:** `bt.size.qty(n)`, `bt.size.atr_risk(1, 2)` (risk 1 percent to a stop 2 ATRs away), or your own function `size(ctx, order)` that returns units.
* **Size caps:** `size_caps = bt.size.caps(position=bt.pct(20))` caps any sizer; a sizer beyond the margin is rejected, not cut down.
* **Reinvest:** `reinvest = False` sizes from the starting capital instead of the current equity.
* **Skipped orders:** an order sized to zero, or left no room by a cap, is listed in `result.skipped`.
