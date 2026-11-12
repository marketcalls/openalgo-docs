# Costs, Slippage and Margin

A backtest that ignores charges and slippage overstates every strategy, and an intraday strategy most of all. The engine charges every fill by default, adds slippage to every fill, and rejects an order your free cash cannot margin. This page shows what is applied and how to change it.

A few words used on this page:

* A **fill** is an executed order: the price and quantity you actually traded.
* **Charges** are what a trade costs besides the price: brokerage and the taxes and fees the exchange and government collect.
* **Slippage** is the gap between the price you expected (the bar's open) and the price you got.
* **Margin** is the money blocked in your account while a position is open.
* **CNC** is delivery (shares held overnight); **MIS** is intraday (closed the same day).

## The strategies the examples use

Every example on this page runs on real SBIN history from your OpenAlgo server. Run this block first; the blocks after it continue from it. Put your own API key from the OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

It defines two plain EMA crossovers (an **EMA** is a moving average of closing prices that weighs recent days more): one on daily bars, held overnight as CNC, and one on 15-minute bars, traded intraday as MIS. Each buys when the fast EMA crosses above the slow one and sells when it crosses back below; the `enter` method places the buy, and the examples below change only that.

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
        self.buy(qty=100)  # 100 shares


class EmaIntraday(EmaCross):
    """9 and 21 EMA crossover on 15-minute bars: MIS, squared off every session."""

    interval = "15m"

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, 9)
        self.slow_ema = self.I(ta.ema, self.close, 21)
```

## Charges

With no `costs=` argument a backtest uses `costs="zerodha"`: Zerodha's brokerage plus every statutory and exchange charge, at the rates in force on each fill's trade date.

| Component | What it is |
|---|---|
| `brokerage` | From the brokerage preset. Zerodha: delivery free; intraday equity and futures 0.03 percent or Rs 20 per executed order, whichever is lower; options Rs 20 per executed order |
| `stt` | Securities transaction tax (commodity transaction tax on MCX) |
| `exchange_txn` | The exchange transaction charge, including the IPFT levy |
| `sebi_fee` | SEBI turnover fee |
| `stamp_duty` | Stamp duty on the buy side |
| `gst` | 18 percent GST on brokerage, exchange charges and the SEBI fee |
| `dp_charge` | On the first delivery (CNC) sell of a scrip in a day from holdings: Rs 13 plus GST under the Zerodha preset |

Segments covered: NSE and BSE equity (delivery and intraday), NFO and BFO futures and options, and MCX futures. Currency derivatives (CDS, BCD) and MCX options are not costed yet; a run on them stops before it starts with a `CostError` that tells you to pass `costs=None`.

The rates are dated **schedules**. A fill is charged at the schedule in force on its trade date:

| Schedule | Trade dates | Status |
|---|---|---|
| `IN-2020-07-01` to `IN-2024-05-13` | 1 July 2020 to 30 September 2024, ten versions, one per rate change | Verified from the exchanges' circulars, SEBI fee notifications and the Finance Acts, except a few rows whose notes say why (BSE groups X and SS, MCX agri and every MCX row of 2020, Sensex options from November 2023 to May 2024). Exchange charges are the first-slab rate of the turnover tiers of the time, the rate brokers passed on to clients |
| `IN-2024-10-01` | 1 October 2024 to 31 March 2026 | Not verified: the transaction charges, IPFT and F&O STT were sourced for the period; the other rates are assumed equal to the current ones |
| `IN-2026-04-01` | From 1 April 2026 | Verified on 12 November 2026; later trade dates are charged at these rates and flagged unverified |

Charges are built in from 1 July 2020, the day stamp duty became one rate across the states. A trade dated earlier has no schedule, so a run that starts earlier stops with a `CostError` (pass `costs=None`, or a `bt.costs.CostModel(backfill=True)` to charge such trades at the first schedule's rates with a warning). Fills charged at unverified rates are counted in `result.warnings`, and Python also shows an `UnverifiedScheduleWarning`.

The charges of one delivery trade: the daily crossover's first trade of 2026, 100 SBIN shares bought on 22 April and sold on 6 May.

<!-- continues -->
<!-- requires-server -->
```python
delivery = bt.backtest(EmaCross, client, start="2026-01-01", end="2026-11-11", capital=200_000)
columns = ["side", "price_rupees", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "dp_charge", "total"]
print(delivery.costs[columns].head(2).round(2).to_string(index=False))
```

<!-- output -->
```text
side  price_rupees  brokerage    stt  exchange_txn  sebi_fee  stamp_duty  gst  dp_charge  total
 BUY       1110.25        0.0 111.02          3.41      0.11       16.65 0.63       0.00 131.83
SELL       1071.75        0.0 107.18          3.29      0.11        0.00 0.61      15.34 126.52
```

Reading the buy: the order value is 100 x 1110.25 = Rs 1,11,025. Delivery brokerage is zero. STT is 0.1 percent (Rs 111.025), the exchange charge 0.00307 percent (Rs 3.41), the SEBI fee Rs 10 per crore of value (Rs 0.11), stamp duty 0.015 percent on the buy side (Rs 16.65), and GST 18 percent of the exchange charge and SEBI fee (Rs 0.63). The sell pays STT again, no stamp duty, and the DP charge of Rs 13 plus 18 percent GST, Rs 15.34.

`result.costs` has one row per fill with every component (plus the schedule that priced it and whether it is verified).

The charges of one intraday trade: the 15-minute crossover bought 100 SBIN at 12:15 on 6 November 2026 and was squared off at 15:00.

<!-- continues -->
<!-- requires-server -->
```python
intraday = bt.backtest(EmaIntraday, client, start="2026-11-04", end="2026-11-06", capital=200_000)
print(intraday.costs[columns].round(2).to_string(index=False))
```

<!-- output -->
```text
side  price_rupees  brokerage   stt  exchange_txn  sebi_fee  stamp_duty  gst  dp_charge  total
 BUY       1002.00       20.0  0.00          3.08       0.1        3.01 4.17        0.0  30.35
SELL       1013.55       20.0 25.34          3.11       0.1        0.00 4.18        0.0  52.73
```

Reading it: the buy's value is Rs 1,00,200, and 0.03 percent of it is Rs 30.06, so the brokerage is the Rs 20 cap. Intraday STT is 0.025 percent on the sell side only (Rs 25.34), and intraday stamp duty 0.003 percent on the buy side (Rs 3.01). GST is 18 percent of the brokerage, exchange charge and SEBI fee: 0.18 x (20 + 3.08 + 0.10) = Rs 4.17.

The contract note of that day: what a broker would charge after rounding.

<!-- continues -->
<!-- requires-server -->
```python
notes = intraday.contract_notes[["date", "note_group", "stt", "stamp_duty", "charged_total", "accrued_total", "adjustment"]]
print(notes.to_string(index=False))
```

<!-- output -->
```text
      date note_group  stt  stamp_duty  charged_total  accrued_total  adjustment
2026-11-06     NSE_EQ 25.0         3.0          82.74      83.084116       -0.34
```

`result.contract_notes` has one row per contract note: what was charged after rounding (`charged_total`), the unrounded total (`accrued_total`), and the rounding adjustment posted at the session close. Here STT of Rs 25.34 was rounded to Rs 25 and stamp duty of Rs 3.01 to Rs 3, so the note charged Rs 0.34 less than the fills accrued.

### Presets

| `costs=` | Brokerage |
|---|---|
| `"zerodha"` (default) | Zerodha's rates, as above |
| `"zero_brokerage"` or `bt.costs.zero_brokerage(dp_fee=None)` | No brokerage; statutory charges and the DP charge still apply |
| `bt.costs.flat(20)` | Rs 20 per executed order in every segment |
| `bt.costs.percent(0.03, 20)` | 0.03 percent of the order value, at most Rs 20 (`cap=None` for no cap) |
| `bt.costs.custom(delivery=..., intraday=..., futures=..., options=..., dp_fee=...)` | One rule per kind of trade: `None` or `"zero"`, a flat amount, `("flat", rupees)` or `("percent", percent, cap)` |
| `bt.costs.CostModel(brokerage=..., rounding=..., schedules=..., backfill=...)` | A preset with another rounding mode, your own rate schedules, or backfill |
| `None` | No charges at all. Every result and report then warns that P&L is overstated |

Statutory charges apply under every preset; only the brokerage (and the DP fee where you give `dp_fee`) changes. A preset without its own DP fee uses Zerodha's Rs 13 and says so.

The same intraday trade with a zero-brokerage broker:

<!-- continues -->
<!-- requires-server -->
```python
no_brokerage = bt.backtest(EmaIntraday, client, start="2026-11-04", end="2026-11-06", capital=200_000,
                           costs="zero_brokerage")
print(no_brokerage.costs[["side", "brokerage", "gst", "total"]].round(2).to_string(index=False))
```

<!-- output -->
```text
side  brokerage  gst  total
 BUY        0.0 0.57   6.75
SELL        0.0 0.58  29.13
```

The brokerage and the GST on it are gone: the round trip costs Rs 35.88 instead of Rs 83.08.

### Rounding modes

| Mode | What it does |
|---|---|
| `"contract_note"` (default) | Each fill accrues its charges unrounded. At each session close the day's charges are summed per contract note (one per trade date and exchange segment), STT and stamp duty are rounded to the nearest rupee and the other charges to the paisa, as a broker's contract note does. This rule is an assumption, not checked against a real contract note, and `result.contract_notes.attrs["rule"]` states it |
| `"calculator"` | Each fill is charged and rounded the way the Zerodha brokerage calculator rounds one trade, to the paisa. Useful to compare with the calculator; there are no contract notes |

To price a trade on its own, without a backtest, use the [cost calculator](support-functions/cost-calculator.md).

The same intraday trade, rounded the way the brokerage calculator rounds it:

<!-- continues -->
<!-- requires-server -->
```python
calculator = bt.backtest(EmaIntraday, client, start="2026-11-04", end="2026-11-06", capital=200_000,
                         costs=bt.costs.CostModel(rounding="calculator"))
print(calculator.costs[["side", "stt", "stamp_duty", "total"]].to_string(index=False))
```

<!-- output -->
```text
side  stt  stamp_duty  total
 BUY  0.0         3.0  30.35
SELL 25.0         0.0  52.39
```

The calculator rounds the STT and stamp duty of each trade to the rupee (Rs 25 and Rs 3).

**A CNC buy and sell of one scrip on the same day** is charged as a broker charges it: as intraday, with no DP charge. The units a CNC fill matches against that day's fills on the other side are charged at the intraday rates, and the earlier fill of the pair is charged again at those rates.

A CNC trade that buys 100 SBIN at 09:20 and sells them at 14:30 on 6 November 2026. `self.at` runs a method at a clock time every session:

<!-- continues -->
<!-- requires-server -->
```python
class SameDayCnc(bt.Strategy):
    symbol, exchange, interval, product = "SBIN", "NSE", "15m", "CNC"

    def init(self):
        self.at("09:20", self.enter)
        self.at("14:30", self.exit)

    def enter(self):
        self.buy(qty=100)


same_day = bt.backtest(SameDayCnc, client, start="2026-11-06", end="2026-11-06", capital=200_000)
print(same_day.costs[["side", "product", "segment", "stt", "dp_charge", "total"]].round(2).to_string(index=False))
```

<!-- output -->
```text
side product         segment   stt  dp_charge  total
 BUY     CNC NSE_EQ_INTRADAY  0.00        0.0  30.32
SELL     CNC NSE_EQ_INTRADAY 25.33        0.0  52.72
```

Both fills are charged in the intraday segment (`NSE_EQ_INTRADAY`): STT on the sell side only and no DP charge, as a broker charges a CNC buy sold the same day.

## Slippage

Every fill pays slippage against you: a buy fills higher, a sell lower, and the price is rounded to the tick away from you (the **tick** is the smallest step a price can move, 0.05 rupees for SBIN). With no `slippage=` argument the engine uses the dated default table, one row per class of instrument:

| Class | Applies to | Default |
|---|---|---|
| `EQ_LARGE_MID` | Cash equity | 2 basis points, at least 1 tick |
| `EQ_LOW_VOLUME` | Cash equity you name as low volume | 5 basis points, at least 1 tick |
| `INDEX_FUT` | Index futures (NFO, BFO) | 1 tick |
| `STOCK_FUT` | Stock futures | 2 ticks |
| `INDEX_OPT` | Index options | 0.5 percent of the premium, at least 1 tick |
| `STOCK_OPT` | Stock options | 1 percent of the premium, at least 1 tick |
| `MCX_FUT` | MCX futures | 1 tick |
| `MCX_OPT` | MCX options | 1 percent of the premium, at least 1 tick |
| `CDS` | Currency derivatives | 1 tick |

A **basis point** is one hundredth of a percent: 2 basis points of Rs 1,000 is 20 paise. These are starting assumptions to calibrate against your own live fills; `bt.slippage.defaults()` lists each row with its source and notes. Whether a derivative is on an index or a stock comes from the reference tables; an underlying they do not list as an index takes the stock row, with a warning.

| `slippage=` | Meaning |
|---|---|
| `"default"` | The table above |
| `0` | No slippage |
| `bt.ticks(n)` | n ticks per fill |
| `bt.pct(p)` | p percent of the price (of the premium for options), at least 1 tick |
| `bt.slippage.bps(b, min_ticks=1)` | b basis points of the price, at least `min_ticks` ticks |
| `bt.slippage.table(overrides={"INDEX_FUT": bt.ticks(2)}, low_volume=("IDEA",))` | The default table with some classes replaced, and the cash-equity symbols to treat as low volume |
| `{"INDEX_FUT": bt.ticks(2)}` | Short for `bt.slippage.table(overrides=...)` |

The intraday trade above filled at 1002.00 and 1013.55. The 1-minute bars it filled on, straight from OpenAlgo, show the opens it started from:

<!-- continues -->
<!-- requires-server -->
```python
bars = client.history(symbol="SBIN", exchange="NSE", interval="1m", start_date="2026-11-06", end_date="2026-11-06")
print(bars.loc[["2026-11-06 12:15", "2026-11-06 15:00"], ["open"]])
```

<!-- output -->
```text
                              open
timestamp
2026-11-06 12:15:00+05:30  1001.75
2026-11-06 15:00:00+05:30  1013.80
```

Reading it: the buy started from the 12:15 open of 1001.75. Two basis points of that is 0.20, and a buy's price is rounded up to the next tick: 1002.00. The sell started from the 15:00 open of 1013.80, less 0.20, rounded down: 1013.55.

The same trade with 3 ticks of slippage on every fill:

<!-- continues -->
<!-- requires-server -->
```python
three_ticks = bt.backtest(EmaIntraday, client, start="2026-11-04", end="2026-11-06", capital=200_000,
                          slippage=bt.ticks(3))
print(three_ticks.fills[["time", "side", "price_rupees"]].to_string(index=False))
```

<!-- output -->
```text
                     time side  price_rupees
2026-11-06 12:15:00+05:30  BUY       1001.90
2026-11-06 15:00:00+05:30 SELL       1013.65
```

3 ticks are 0.15 rupees: 1001.75 + 0.15 = 1001.90 for the buy and 1013.80 - 0.15 = 1013.65 for the sell.

## Margin

An order that needs more margin than the strategy's free cash is rejected with `margin`, checked at the open of the bar it would fill on. The margin blocked:

| Position | Margin blocked | Status |
|---|---|---|
| Cash equity, CNC (delivery) | The full value; no leverage | Verified |
| Cash equity, MIS (intraday) | The value divided by the leverage the order asks for with `leverage=`, or the strategy's class attribute `leverage` (1 when neither asks), up to 5 (a 20 percent margin) | Verified from 1 September 2021; earlier dates use the same 5x limit, unverified |
| Long options | The premium paid | Verified |
| Futures, any exchange and underlying | 20 percent of the contract value (5x) on every date, unless `margin=` gives your own: a percent of the value or rupees per lot, for every underlying or per underlying (see [Futures](futures.md#your-own-margin)) | The engine's default, stated in the Assumptions block |

**Leverage** lets an intraday position be larger than your cash: at 5x, Rs 20,000 of margin holds Rs 1,00,000 of shares. Real futures margins differ by underlying and change every day, so the engine uses one stated default instead of a guess per contract; pass your broker's figures with `margin=` when they matter. It is a backtest assumption only: in live trading your broker computes the margin. Leverage on CNC, or above 5, is a `ConfigError`. Not available yet: selling an option to open a short position (short-option margin raises `NotImplementedError`).

A sizer is never cut down to the free cash: an order a sizer sized beyond the margin is rejected with `margin` like any other, and `result.warnings` says so and names the remedy, a size cap such as `size_caps = bt.size.caps(leverage=1)` (see [Reinvest and size caps](#reinvest-and-size-caps)). The `sizer` column of `result.orders` names the sizer that set each order's quantity.

200 shares of SBIN (about Rs 2,00,000) on Rs 1,00,000 of capital, without leverage: the buy is rejected.

<!-- continues -->
<!-- requires-server -->
```python
class TooBig(EmaIntraday):
    def enter(self):
        self.buy(qty=200)


too_big = bt.backtest(TooBig, client, start="2026-11-04", end="2026-11-06", capital=100_000)
print(too_big.orders[["time", "side", "quantity_units", "status", "reject_code"]].to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units   status reject_code
2026-11-06 12:15:00+05:30  BUY           200.0 Rejected      margin
```

The margin is checked at the open the buy would fill on: 200 shares at about Rs 1,002 need about Rs 2,00,000, twice the free cash.

The same 200 shares at 5x intraday leverage: the buy fills and blocks a fifth of its value.

<!-- continues -->
<!-- requires-server -->
```python
class Leveraged(EmaIntraday):
    def enter(self):
        self.buy(qty=200, leverage=5)


leveraged = bt.backtest(Leveraged, client, start="2026-11-04", end="2026-11-06", capital=100_000)
print(leveraged.fills[["time", "side", "quantity_units", "price_rupees"]].to_string(index=False))
print("margin blocked:", leveraged.equity["margin_rupees"].max().round(2))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees
2026-11-06 12:15:00+05:30  BUY           200.0       1002.00
2026-11-06 15:00:00+05:30 SELL           200.0       1013.55
margin blocked: 40070.0
```

At 5x the margin is a fifth of the value at the open: 200 x 1001.75 / 5 = Rs 40,070.

## Sizing

An order's quantity comes, in this order, from `qty=` or `lots=`, from `size=` on the order, from the strategy's `size` class attribute, or from the engine default (one lot for futures and options; for cash equity the whole equity, at most the free cash and split equally across the strategy's symbols, less the order's estimated charges).

| Sizer | Quantity |
|---|---|
| `bt.size.qty(units)` | A fixed number of units |
| `bt.size.lots(n)` | A fixed number of lots |
| `bt.size.value(rupees)` | Rupees of notional value |
| `bt.size.percent(p, basis="equity")` | p percent of equity (or of the starting `"capital"`, or of the free `"cash"`) |
| `bt.size.fixed_risk(risk_pct, units=1, hard_limit=None)` | Risk `risk_pct` percent of equity, less the estimated charges of the round trip, to the order's `stop=` (which it needs); `hard_limit` caps the units, and `units` splits the position into that many equal tranches |
| `bt.size.atr_risk(risk_pct, mult, period=14)` | Fixed risk with the stop distance taken as `mult` times the ATR of `period` strategy bars |
| Your own function `size(ctx, order)` | The units it returns (see [Your own sizing function](#your-own-sizing-function)) |

A sized quantity is cut to the strategy's size caps (see [Reinvest and size caps](#reinvest-and-size-caps)), rounded down to the venue rule (whole lots; whole shares unless the run is fractional) and capped at the freeze quantity. A size that rounds to zero skips the order (reason `rounded_to_zero`), and so does a cap that leaves no room (reason `cap`): the order method returns `None` and `result.skipped` lists the reason.

**Quantity mode.** `quantity_mode="fractional"` (the default) lets cash equity hold fractional shares, so results do not depend on the share price. `quantity_mode="venue"` uses whole shares and whole lots, and the engine default keeps a 2 percent cash buffer; a fractional `qty` is then rejected with `quantity_rule`.

Each example below sizes the daily crossover's first trade of 2026, with Rs 1,00,000 of capital. The strategy decided at the close of 21 April (1111.85, the **decision price** the sizers use) and bought at the next open, 1110.25 on 22 April.

With no quantity at all, the engine default buys with the whole equity, in fractional shares:

<!-- continues -->
<!-- requires-server -->
```python
class AllIn(EmaCross):
    def enter(self):
        self.buy()


all_in = bt.backtest(AllIn, client, start="2026-01-01", end="2026-11-11", capital=100_000)
print(all_in.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(1).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2026-04-22 09:15:00+05:30        89.96             1110.25
```

89.96 shares at 1110.25 is about Rs 99,880: the whole Rs 1,00,000 less the estimated charges of the buy.

The same default in whole shares, with `quantity_mode="venue"`:

<!-- continues -->
<!-- requires-server -->
```python
whole = bt.backtest(AllIn, client, start="2026-01-01", end="2026-11-11", capital=100_000, quantity_mode="venue")
print(whole.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(1).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2026-04-22 09:15:00+05:30         88.0             1110.25
```

Whole shares, with 2 percent kept as a cash buffer: Rs 98,000 at the decision price of 1111.85 is 88.1 shares, so 88.

Half the equity in every trade, with `bt.size.percent(50)`:

<!-- continues -->
<!-- requires-server -->
```python
class HalfEquity(EmaCross):
    def enter(self):
        self.buy(size=bt.size.percent(50))


half = bt.backtest(HalfEquity, client, start="2026-01-01", end="2026-11-11", capital=100_000)
print(half.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(1).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2026-04-22 09:15:00+05:30        44.97             1110.25
```

50 percent of Rs 1,00,000 at the decision price of 1111.85 is 44.97 shares.

Risk 1 percent of equity to a stop 5 percent below the entry, with `bt.size.fixed_risk(1)`:

<!-- continues -->
<!-- requires-server -->
```python
class OnePercentRisk(EmaCross):
    def enter(self):
        self.buy(size=bt.size.fixed_risk(1), stop=bt.pct(5))


risk = bt.backtest(OnePercentRisk, client, start="2026-01-01", end="2026-11-11", capital=100_000)
print(risk.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(1).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2026-04-22 09:15:00+05:30        17.19             1110.25
```

The stop is 5 percent below the decision price, Rs 55.59 a share. Rs 1,000 of risk, less the estimated charges of the round trip, buys 17.19 shares: if the stop is hit, the trade loses about 1 percent of equity.

### Your own sizing function

`size=` (on an order, or as the strategy's `size`) also takes a function `size(ctx, order)` that returns the quantity in **units**, never lots. The engine calls it when the order is placed. `ctx` holds what the built-in sizers see:

| `ctx.` | Meaning |
|---|---|
| `equity` | The sizing equity in rupees: the current equity, or the starting capital when the strategy sets `reinvest = False` |
| `capital` | The capital at the start of the run |
| `cash` | Equity not blocked as margin |
| `price` | The decision price (the last close) |
| `stop_distance` | Rupees of price from the decision price to the order's stop, or `None` when the order has no stop |
| `lot_size`, `multiplier` | Units in one lot; rupees per one-rupee move per unit |
| `fractional` | `True` when fractional quantities are allowed |
| `position` | Units held now, negative when short |

`order` has `symbol`, `side` (`"BUY"` or `"SELL"`), `product` and `tag`. Return 0 to skip the order (listed in `result.skipped` as `rounded_to_zero`). A negative number, NaN or anything that is not a number stops the run with a `ConfigError` naming your function. What it returns is then treated like any sizer's quantity: cut to the size caps, rounded down to the venue rule and capped at the freeze quantity. Condition strategies run without calling Python, so they cannot use a sizing function.

A sizing function that risks 1 percent of equity to the stop but never puts more than 40 percent of equity into one trade, on the daily crossover with a 2 percent stop:

<!-- continues -->
<!-- requires-server -->
```python
def one_percent_risk(ctx, order):
    """Units that lose 1 percent of equity at the stop, at most 40 percent of equity in value."""
    if ctx.stop_distance is None:
        return 0  # no stop, no trade
    by_risk = 0.01 * ctx.equity / ctx.stop_distance
    by_value = 0.40 * ctx.equity / ctx.price
    return min(by_risk, by_value)


class OwnSizer(EmaCross):
    def enter(self):
        self.buy(size=one_percent_risk, stop=bt.pct(2))


own = bt.backtest(OwnSizer, client, start="2026-01-01", end="2026-11-11", capital=100_000, quantity_mode="venue")
print(own.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(1).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2026-04-22 09:15:00+05:30         35.0             1110.25
```

The risk rule gives 1,000 / 22.24 (2 percent of 1111.85) = 44.97 shares and the value rule 40,000 / 1111.85 = 35.98. The smaller wins, rounded down to whole shares: 35.

### Reinvest and size caps

Two class attributes control every sizer of a strategy:

* `reinvest = True` (the default) sizes from the current equity, so sizes grow and shrink with the results. `reinvest = False` sizes every sizer, every cap given in percent or as leverage, and `target(percent=)` from the starting capital instead.
* `size_caps = bt.size.caps(position=..., leverage=..., risk=...)` cuts the quantity any sizer gives. Give one or more caps; the tightest wins.

| Cap | The largest |
|---|---|
| `position=` | Position on the order's side after the order, counting what is already held: units (a number or `bt.size.qty(n)`), `bt.size.lots(n)`, rupees of value at the decision price (`bt.rupees(x)` or `bt.size.value(x)`), or a percent of equity (`bt.pct(x)` or `bt.size.percent(x)`) |
| `leverage=` | Value of that position as a multiple of equity (1 is 1x) |
| `risk=` | Loss of the order at its stop: rupees (a number or `bt.rupees(x)`) or `bt.pct(x)` of equity, below 100. An order without a stop has no bounded loss, so under a risk cap it is skipped |

The capped quantity is then rounded down to the venue rule. When a cap leaves no room, the order is skipped with reason `cap`. Caps bound sizers only: an explicit `qty=` or `lots=`, and `target()`, trade what they ask for. Both settings are in the Assumptions block.

A sizer that asks for 80 percent of equity, held to at most 20 percent by a position cap:

<!-- continues -->
<!-- requires-server -->
```python
class Capped(EmaCross):
    size_caps = bt.size.caps(position=bt.pct(20))  # no position above 20 percent of equity

    def enter(self):
        self.buy(size=bt.size.percent(80))


capped = bt.backtest(Capped, client, start="2026-01-01", end="2026-11-11", capital=100_000)
first = capped.trades.iloc[0]
print("units", round(first["entry_units"], 2), "at", first["entry_price_rupees"])
print("size_caps:", capped.assumptions["size_caps"])
```

<!-- output -->
```text
units 17.99 at 1110.25
size_caps: position 20 percent of equity
```

80 percent of equity would be about 72 shares. The cap holds the position to 20 percent: Rs 20,000 / 1111.85 = 17.99 shares.

## Warnings to read

The engine never hides an assumption. These are the warnings you will meet; each appears in `result.warnings`, in the Assumptions section of the tearsheet, and in `print(result)`:

* `costs=None: no charges are modelled; results overstate P&L`.
* `charges: the ... rates of cost schedule ... are unverified for N fill(s)`: fills charged at rates not verified for their dates.
* A margin row that is not verified, named by its row id (such as `FUT_NIFTY/1`).
* `generic cash-equity instrument assumed (lot 1, tick 0.05)`: no `instrument=` was given for a cash-equity symbol.
* A derivative whose underlying is not a listed index takes the stock-derivative slippage row.

The warnings of the daily crossover over 2021 to 2026:

<!-- continues -->
<!-- requires-server -->
```python
long_run = bt.backtest(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)
for text in long_run.warnings:
    print(text)
```

<!-- output -->
```text
SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
```

Python warnings appear as well: `UnverifiedScheduleWarning` for unverified cost rates, `ReferenceDataWarning` when a reference row is unverified or used after the date it was last checked, and `CalendarWarning` for a year without a holiday list.
