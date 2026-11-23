# Costs, Slippage and Margin

Every backtest pays Indian charges and slippage on each trade, and checks that you have the money (margin) for each order, so the result is close to what your account would show. This page shows what is applied by default and how to change it.

## The strategy this page uses

An EMA crossover on SBIN: buy when the 20-day EMA (an average of closing prices that weighs recent days more) crosses above the 50-day EMA, sell when it crosses back below. It runs on **daily bars** (one bar, or candle, per day) and trades **CNC** (delivery: shares held overnight). Besides the usual summary (net profit, return, max drawdown and trades) it prints the total charges paid.

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
    print(result.summary())  # net profit, return, drawdown and trades
    # result.metrics holds every figure of the run by name. f"..." fills in the {value},
    # and ":,.2f" writes it with commas and 2 decimals.
    print(f"Charges      : Rs {result.metrics['total_costs']:,.2f}")  # all charges of all fills


# The strategy. A class bundles settings and functions; inside it, "self" is the strategy itself.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: buy, sell or wait.
    def on_bar(self, bar):
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
Net profit   : Rs 53,485.86
Return       : 53.49%
Max drawdown : -29.42%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Charges      : Rs 3,836.94
```

The net profit is after every charge. The **max drawdown** is the largest fall of the account from its highest value.

## What am I charged on each trade?

A **fill** is an executed order: the price and quantity you actually traded. Each fill pays:

* **Brokerage:** your broker's fee. With the default preset (`"standard"`), a delivery order pays 2.5 percent of its value or Rs 20, whichever is lower; an intraday order 0.1 percent or Rs 20; a futures order 0.03 percent or Rs 20; an option order Rs 20.
* **STT:** securities transaction tax (commodity transaction tax on MCX).
* **Exchange charge, SEBI fee, stamp duty** (on the buy side) and **GST** (18 percent on the brokerage, exchange charge and SEBI fee).
* **DP charge:** on the first delivery sell of a stock in a day, Rs 13 plus GST.

The charges of the first trade, its buy and its sell:

<!-- continues -->
<!-- requires-server -->
```python
# result.costs has one row per fill with every charge in rupees; show the first two rows.
columns = ["side", "price_rupees", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "dp_charge", "total", "charged"]
print(result.costs[columns].head(2).round(2).to_string(index=False))
```

<!-- output -->
```text
side  price_rupees  brokerage    stt  exchange_txn  sebi_fee  stamp_duty  gst  dp_charge  total  charged
 BUY        356.95       20.0  96.38          3.33      0.10       14.46 4.20       0.00 138.45   137.63
SELL        456.95       20.0 123.38          4.26      0.12        0.00 4.37      15.34 167.46   167.09
```

Reading the buy: 270 shares at 356.95 is an order of Rs 96,377. Delivery brokerage is Rs 20, its cap (2.5 percent of the order would be far more). STT is 0.1 percent of the value (Rs 96.38), stamp duty 0.015 percent (Rs 14.46), and the exchange charge, SEBI fee and GST add about Rs 8. The sell pays STT again, no stamp duty, and the DP charge of Rs 15.34. Every rate is the one in force on the trade's date. `total` adds up the charges as worked out; `charged` is what the account paid for the fill. The day's contract note rounds STT and stamp duty to whole rupees (Rs 96 and Rs 14 for the buy), so the buy paid Rs 137.63 and the sell Rs 167.09. A trade's charges are what its fills paid.

## How do I use my own broker's brokerage?

Pass `costs=` to `bt.backtest`. The taxes and exchange charges apply under every choice; only the brokerage changes.

| `costs=` | Brokerage |
|---|---|
| `"standard"` (the default) | Delivery 2.5 percent or Rs 20 per order, whichever is lower; intraday 0.1 percent or Rs 20; futures 0.03 percent or Rs 20; options Rs 20 per order |
| `"zerodha"` | Delivery free; intraday and futures 0.03 percent or Rs 20 per order, whichever is lower; options Rs 20 per order (the default before openalgo 2.4.1) |
| `"zero_brokerage"` | No brokerage |
| `bt.costs.flat(20)` | Rs 20 per order |
| `bt.costs.percent(0.03, 20)` | 0.03 percent of the order value, at most Rs 20 |
| `None` | No charges at all; every result then warns that the profit is overstated |

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy with a broker that charges no brokerage on delivery.
free_delivery = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                            costs="zerodha")
print_summary(free_delivery)
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Charges      : Rs 3,322.91
```

With no brokerage on its 22 delivery orders (Rs 20 each under the default, Rs 440 plus the GST on it), the charges fall from Rs 3,836.94 to Rs 3,322.91 and the profit rises to Rs 53,941.09. To price one trade without a backtest, use the [cost calculator](support-functions/cost-calculator.md).

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
Net profit   : Rs 54,130.74
Return       : 54.13%
Max drawdown : -29.30%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Charges      : Rs 3,840.11
```

Over 22 fills, the default slippage lowered the profit by about Rs 650. What it cost the fills themselves is `result.metrics["total_slippage"]`: Rs 705.80 for the first run. The profit differs by a little less: with no slippage, three of the trades could buy one more share each, and those extra shares lost about Rs 58. Keep it on: real fills are never exactly at the open.

## Would it survive worse fills, or late orders?

A backtest fills each order at the next bar's open, just after the strategy decided. Real fills can come at a worse price, and a real order can be late (a script that started late, a signal you acted on the next day). Two settings of `bt.backtest` test that without changing the strategy (both new in openalgo 2.3.0):

* `fill=` sets the price an order fills at: `"next_open"` (the default), or another price of the next bar: its close (`"next_close"`), the middle of its high and low (`"next_mid"`), or the average of its open, high, low and close (`"next_ohlc4"`). The same names ending in `_2` (`"next_close_2"` and so on) average that price with the bar after it. Slippage is added as usual; an order at a set price (a limit or a stop-loss) still fills at that price.
* `delay_entries=` holds each order that opens or adds to a position, and `delay_exits=` each one that reduces or closes it, for that many more bars before it can fill. A reversal (a sell that turns a long into a short) counts as an exit; for a short strategy, the entry is the sell. The stop-loss, target and trailing stop of a trade, and the engine's own exits (such as the intraday square-off), are never held. An order whose delay would end after the run's last bar, or (for an intraday order) at its session's close, is rejected with the reject code `delay_past_close`.

Every order filled at the next day's close instead of its open:

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy, each order filled at the next day's close instead of its open.
at_close = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                       fill="next_close")
print_summary(at_close)
```

<!-- output -->
```text
Net profit   : Rs 37,966.41
Return       : 37.97%
Max drawdown : -32.39%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Charges      : Rs 3,686.74
```

Every buy and every sell one day late:

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy, each buy and sell held one more day before it can fill.
late = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                   delay_entries=1, delay_exits=1)
print_summary(late)
```

<!-- output -->
```text
Net profit   : Rs 51,694.65
Return       : 51.69%
Max drawdown : -31.74%
Trades       : 9 (44% won)
Overfitting  : too few trades to judge (9 closed, 30 needed)
Charges      : Rs 3,075.60
```

The late run closed 9 trades, not 11. Its buys decided on 27 April 2023 and 4 November 2024 were each sized at that day's close, and by the time they could fill the price had risen by more than the 2 percent of cash kept back, so each needed more money than the account had and was rejected (reject code `margin`). Python prints a warning about them at the end of the run:

```text
OrdersNotPlacedWarning: 2 orders were rejected because the margin the order needed was more than the free cash (reject_code 'margin'). See result.warnings.
```

`late.orders` lists one more rejected order: a buy decided on 11 November 2026, the run's last day, whose one-day delay would have ended after the last bar (reject code `delay_past_close`). That is the delay working, so Python does not warn about it; `late.warnings` names it.

How to read the two runs against the first (Rs 53,485.86): filled at the close, the crossover kept about 71 percent of its profit; a day late, about 97 percent, and both drawdowns were a little deeper. Its edge does not hang on getting the exact open. A strategy whose profit vanishes one bar late, or at the bar's close instead of its open, has an edge too thin to trade: real fills and real delays would take all of it. For more ways to tell a real edge from a lucky one, see the [overfitting checks](results-and-reports.md#overfitting-checks).

A held order is waiting, not yet a position: `self.position.is_flat` stays `True` until it fills. The crossover buys only on the day the EMAs cross, so it cannot buy twice; a strategy that buys on every bar while it is flat would buy again while its first buy waits, so it should also check that `self.orders` (the orders still waiting) is empty.

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
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(qty=200)  # add leverage=5 to block only a fifth of the value
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it over a year of 15-minute bars, then show the orders rejected for margin.
too_big = bt.backtest(TooBig, client, start="2025-11-01", end="2026-11-11", capital=100_000)
orders = too_big.orders  # every order, with its status and reject code
refused = orders[orders["reject_code"] == "margin"]  # only the rows rejected for margin
print(len(refused), "of", len(orders), "orders were rejected for margin. The first three:")
print(refused[["time", "side", "quantity_units", "status", "reject_code"]].head(3).to_string(index=False))
```

<!-- output -->
```text
45 of 53 orders were rejected for margin. The first three:
                     time side  quantity_units   status reject_code
2025-11-07 13:15:00+05:30  BUY           200.0 Rejected      margin
2025-11-12 09:30:00+05:30  BUY           200.0 Rejected      margin
2025-11-14 09:30:00+05:30  BUY           200.0 Rejected      margin
```

Each buy needed about Rs 2,00,000 of margin, twice the free cash, so all 45 were rejected and the strategy did not trade once in the year. The other 8 orders came at or after the cut-off for new intraday positions (`entry_window`). With `self.buy(qty=200, leverage=5)` each buy would block a fifth of that and fill. Python also prints one warning at the end of the run:

```text
OrdersNotPlacedWarning: 45 orders were rejected because the margin the order needed was more than the free cash (reject_code 'margin'). See result.warnings.
```

## Whole shares or part shares?

A backtest buys **whole shares** by default, as your broker does (and whole lots of futures and options). A buy with no quantity is sized at the close it was decided on, and 2 percent of the cash is kept back as a buffer, so a higher open the next morning does not leave the order short of money.

A share that costs more than the money for the order cannot be bought in whole shares at all. That order is skipped (listed in `result.skipped`), and Python prints a warning at the end of the run, such as `OrdersNotPlacedWarning: 1 order was skipped because the sized quantity was less than one share or, for a derivative, one lot (skip reason 'rounded_to_zero'). See result.warnings.` Give the strategy more capital, or trade a cheaper share.

For research you can let it hold **part shares** with `quantity_mode="fractional"`. A buy with no quantity then invests all the capital at the price it fills at, so the result does not depend on the share price. Your broker cannot do this, so keep whole shares for a result you want to trade.

<!-- continues -->
<!-- requires-server -->
```python
# The same strategy with part shares allowed.
part = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                   quantity_mode="fractional")
print_summary(part)

# The first buy of each run. trade_list() is the table of closed trades; iloc[0] is its first row.
print("first buy, whole shares:", result.trade_list()["quantity"].iloc[0])
print("first buy, part shares :", round(part.trade_list()["quantity"].iloc[0], 2))  # 2 decimals
```

<!-- output -->
```text
Net profit   : Rs 55,193.09
Return       : 55.19%
Max drawdown : -29.87%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Charges      : Rs 3,926.15
first buy, whole shares: 270.0
first buy, part shares : 279.75
```

With part shares the first buy was 279.75 shares, all the capital at the next day's open, against 270 whole shares. No cash stayed in a buffer or in the part of a share left over, so the profit is a little higher, and the drawdown a little deeper. The difference is small here; on a stock priced in thousands of rupees, or with a small capital, whole shares matter more.

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

Here there are two. The first: no lot or tick size was given for SBIN, so the engine used the usual ones for a stock, lot 1 and tick 0.05. The second: the delivery charges of January to March 2021 are not verified, because until 31 March 2021 NSE charged shares outside the NIFTY 50 and NIFTY Next 50 a lower rate and the engine does not know which shares were in those indices. SBIN is a NIFTY 50 share, so its charges are right; Python also prints this one as an `UnverifiedScheduleWarning`. Orders the engine rejected or skipped are listed here too, one line per reason, and Python prints an `OrdersNotPlacedWarning` for them at the end of the run, unless a rule you set (such as the entry window or the daily loss limit) kept them out.

## More options

* **Contract-note rounding:** by default STT and stamp duty are rounded to the rupee once a day per contract note, as a broker does; `result.contract_notes` shows each note. Each fill pays its share of its note (`result.costs["charged"]`), and a trade pays what its fills paid, so the trades add up to the account. `costs=bt.costs.CostModel(rounding="calculator")` rounds each trade instead.
* **Dated rates:** charges are built in from 1 July 2020, one schedule per rate change; `result.costs` names the `schedule` of each fill. An earlier start stops with a `CostError`: pass `costs=None`, or `bt.costs.CostModel(backfill=True)`.
* **Currencies and commodity options:** NSE currency futures and options (CDS) and MCX options on non-agri commodities are costed from openalgo 2.4.1. BSE currency derivatives (BCD) and options on agri commodities stop with a `CostError`; pass `costs=None`.
* **Your own brokerage:** `bt.costs.custom(delivery=..., intraday=..., futures=..., options=..., dp_fee=...)`.
* **Same-day delivery trades:** a CNC buy and sell of one stock on the same day is charged as intraday, with no DP charge.
* **Slippage by class:** `bt.slippage.defaults()` lists every row and its source; `slippage={"INDEX_FUT": bt.ticks(2)}` replaces one row.
* **Leverage rules:** MIS cash equity only, up to 5; on CNC or above 5 it is a `ConfigError`. The class attribute `leverage` sets it for every order.
* **Rounding:** every sizer, an order with no quantity, `self.target(...)` and `self.rebalance(...)` round down to whole shares, and derivatives to whole lots. With `quantity_mode="fractional"` cash equity keeps part shares; futures and options stay in whole lots.
* **More sizers:** `bt.size.qty(n)`, `bt.size.atr_risk(1, 2)` (risk 1 percent to a stop 2 ATRs away), or your own function `size(ctx, order)` that returns units.
* **Size caps:** `size_caps = bt.size.caps(position=bt.pct(20))` caps any sizer; a sizer beyond the margin is rejected, not cut down.
* **Reinvest:** `reinvest = False` sizes from the starting capital instead of the current equity.
* **Skipped orders:** an order sized to zero, or left no room by a cap, is listed in `result.skipped`; one sized to zero also gives the `OrdersNotPlacedWarning`, one stopped by a cap you set does not.
