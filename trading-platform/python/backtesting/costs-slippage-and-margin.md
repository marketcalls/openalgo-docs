# Costs, Slippage and Margin

A backtest that ignores charges and slippage overstates every strategy, and an intraday strategy most of all. The engine charges every fill by default, adds slippage to every fill, and rejects an order your free cash cannot margin. This page shows what is applied and how to change it.

The examples on this page use one synthetic session of 1-minute bars in which SBIN rises from 800 to 820. This first block builds it; the blocks after it continue from it.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

minute = np.arange(375)
close = np.interp(minute, [0, 374], [800, 820]).round(1)
open_ = np.r_[close[0], close[:-1]]
bars = pd.DataFrame(
    {
        "open": open_,
        "high": np.maximum(open_, close) + 0.1,
        "low": np.minimum(open_, close) - 0.1,
        "close": close,
        "volume": 1_000,
    },
    index=pd.Timestamp("2026-10-05 09:15", tz="Asia/Kolkata") + pd.to_timedelta(minute, unit="min"),
)


def round_trip(**order):
    """A 15-minute strategy that buys at its first bar close and exits at its 20th."""

    class RoundTrip(bt.Strategy):
        symbol, exchange, interval = "SBIN", "NSE", "15m"

        def on_bar(self, bar):
            if len(self.close) == 1:
                self.buy(**order)
            elif len(self.close) == 20:
                self.exit()

    return RoundTrip
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
| `dp_charge` | On the first delivery (CNC) sell of a scrip in a day: Rs 13 plus GST under the Zerodha preset |

Segments covered: NSE and BSE equity (delivery and intraday), NFO and BFO futures and options, and MCX futures. Currency derivatives (CDS, BCD) and MCX options are not costed yet; a run on them stops before it starts with a `CostError` that tells you to pass `costs=None`.

The rates are dated **schedules**. A fill is charged at the schedule in force on its trade date:

| Schedule | Trade dates | Status |
|---|---|---|
| `IN-2024-10-01` | 1 October 2024 to 31 March 2026 | Not verified: the transaction charges, IPFT and F&O STT were sourced for the period; the other rates are assumed equal to the current ones |
| `IN-2026-04-01` | From 1 April 2026 | Verified on 12 November 2026; later trade dates are charged at these rates and flagged unverified |

A trade dated before 1 October 2024 has no schedule, so a run that starts earlier stops with a `CostError` (pass `costs=None`, or a `bt.costs.CostModel(backfill=True)` to charge such trades at the first schedule with a warning). Fills charged at unverified rates are counted in `result.warnings`, and Python also shows an `UnverifiedScheduleWarning`.

<!-- continues -->
```python
result = bt.backtest(round_trip(qty=100), data=bars, capital=500_000)
columns = ["side", "price_rupees", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "total"]
print(result.costs[columns].round(2).to_string(index=False))
notes = result.contract_notes[["date", "note_group", "charged_total", "accrued_total", "adjustment"]]
print(notes.round(2).to_string(index=False))
```

<!-- output -->
```text
side  price_rupees  brokerage  stt  exchange_txn  sebi_fee  stamp_duty  gst  total
 BUY         800.9       20.0  0.0          2.46      0.08         2.4 4.06  29.00
SELL         815.8       20.0 20.4          2.50      0.08         0.0 4.07  47.05
      date note_group  charged_total  accrued_total  adjustment
2026-10-05     NSE_EQ          75.24          76.05       -0.81
```

`result.costs` has one row per fill with every component (plus the schedule that priced it and whether it is verified). `result.contract_notes` has one row per contract note: what was charged after rounding, the unrounded total, and the rounding adjustment posted at the session close.

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

<!-- continues -->
```python
for costs in ("zerodha", "zero_brokerage", bt.costs.flat(20), None):
    run = bt.backtest(round_trip(qty=100), data=bars, capital=500_000, costs=costs)
    label = run.assumptions["costs"]
    print(f"{label:41} charges {run.equity['costs_rupees'].iloc[-1]:7.2f}   net P&L {run.metrics['net_profit']:8.2f}")
```

<!-- output -->
```text
zerodha (contract-note rounding)          charges   75.24   net P&L  1414.76
zero_brokerage (contract-note rounding)   charges   28.04   net P&L  1461.96
flat(20) (contract-note rounding)         charges   75.24   net P&L  1414.76
none                                      charges    0.00   net P&L  1490.00
```

### Rounding modes

| Mode | What it does |
|---|---|
| `"contract_note"` (default) | Each fill accrues its charges unrounded. At each session close the day's charges are summed per contract note (one per trade date and exchange segment), STT and stamp duty are rounded to the nearest rupee and the other charges to the paisa, as a broker's contract note does. This rule is an assumption, not checked against a real contract note, and `result.contract_notes.attrs["rule"]` states it |
| `"calculator"` | Each fill is charged and rounded the way the Zerodha brokerage calculator rounds one trade, to the paisa. Useful to compare with the calculator; there are no contract notes |

Choose it with `costs=bt.costs.CostModel(rounding="calculator")`. To price a trade on its own, without a backtest, use the [cost calculator](support-functions/cost-calculator.md).

Not available yet: the charges of a delivery (CNC) buy and sell of the same scrip on the same day (`NotImplementedError`).

## Slippage

Every fill pays slippage against you: a buy fills higher, a sell lower, and the price is rounded to the tick away from you. With no `slippage=` argument the engine uses the dated default table, one row per class of instrument:

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

These are starting assumptions to calibrate against your own live fills; `bt.slippage.defaults()` lists each row with its source and notes. Whether a derivative is on an index or a stock comes from the reference tables; an underlying they do not list as an index takes the stock row, with a warning.

| `slippage=` | Meaning |
|---|---|
| `"default"` | The table above |
| `0` | No slippage |
| `bt.ticks(n)` | n ticks per fill |
| `bt.pct(p)` | p percent of the price (of the premium for options), at least 1 tick |
| `bt.slippage.bps(b, min_ticks=1)` | b basis points of the price, at least `min_ticks` ticks |
| `bt.slippage.table(overrides={"INDEX_FUT": bt.ticks(2)}, low_volume=("IDEA",))` | The default table with some classes replaced, and the cash-equity symbols to treat as low volume |
| `{"INDEX_FUT": bt.ticks(2)}` | Short for `bt.slippage.table(overrides=...)` |

<!-- continues -->
```python
forms = {
    "default": "default",
    "zero": 0,
    "3 ticks": bt.ticks(3),
    "0.1 percent": bt.pct(0.1),
    "low volume": bt.slippage.table(low_volume=("SBIN",)),
}
for name, slippage in forms.items():
    run = bt.backtest(round_trip(qty=100), data=bars, capital=500_000, costs=None, slippage=slippage)
    buy, sell = run.fills["price_rupees"]
    print(f"{name:12} buy {buy:.2f}  sell {sell:.2f}")
```

<!-- output -->
```text
default      buy 800.90  sell 815.80
zero         buy 800.70  sell 816.00
3 ticks      buy 800.85  sell 815.85
0.1 percent  buy 801.55  sell 815.15
low volume   buy 801.15  sell 815.55
```

The bar opens were 800.70 for the buy and 816.00 for the sell. Two basis points of 800.70 is 0.16, and the buyer's price rounds up to the next tick (800.90); two basis points of 816.00 is also 0.16, and the seller's price rounds down (815.80).

## Margin

An order that needs more margin than the strategy's free cash is rejected with `margin`, checked at the open of the bar it would fill on. The margin comes from a dated table:

| Position | Margin blocked | Status |
|---|---|---|
| Cash equity, CNC (delivery) | The full value; no leverage | Verified |
| Cash equity, MIS (intraday) | The value divided by the leverage the order asks for with `leverage=` (1 when it asks for none), up to 5 (a 20 percent margin) | Verified from 1 September 2021; earlier dates use the same 5x limit, unverified |
| Long options | The premium paid | Verified |
| NIFTY futures | 11.37 percent of the value | Unverified |
| BANKNIFTY and FINNIFTY futures | 11.38 percent of the value | Unverified |
| MIDCPNIFTY futures | 12.07 percent of the value | Unverified |
| NIFTYNXT50 futures | 11.41 percent of the value | Unverified |

The index-futures rows are one day's observation of SPAN plus exposure margin (12 November 2026) applied to every date, so a run that uses them names the row in `result.warnings`. Leverage on CNC, or above 5, is a `ConfigError`. Not available yet: the margin of stock futures, BSE and MCX futures, and short options (`NotImplementedError`).

<!-- continues -->
```python
too_big = bt.backtest(round_trip(qty=1_000), data=bars, capital=500_000, costs=None)
print("1,000 shares, no leverage:", too_big.orders["reject_code"].iloc[0])

leveraged = bt.backtest(round_trip(qty=1_000, leverage=5), data=bars, capital=500_000, costs=None)
print("1,000 shares at 5x: margin", leveraged.equity["margin_rupees"].max().round(2))
```

<!-- output -->
```text
1,000 shares, no leverage: margin
1,000 shares at 5x: margin 160140.0
```

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

A sized quantity is rounded down to the venue rule (whole lots; whole shares unless the run is fractional) and capped at the freeze quantity. A size that rounds to zero skips the order: the order method returns `None` and `result.skipped` lists the reason.

**Quantity mode.** `quantity_mode="fractional"` (the default) lets cash equity hold fractional shares, so results do not depend on the share price. `quantity_mode="venue"` uses whole shares and whole lots, and the engine default keeps a 2 percent cash buffer; a fractional `qty` is then rejected with `quantity_rule`.

<!-- continues -->
```python
sizers = {
    "engine default": {},
    "percent(50)": {"size": bt.size.percent(50)},
    "value(1 lakh)": {"size": bt.size.value(100_000)},
    "fixed_risk(1) stop 2%": {"size": bt.size.fixed_risk(1), "stop": bt.pct(2)},
}
for name, order in sizers.items():
    for mode in ("fractional", "venue"):
        run = bt.backtest(round_trip(**order), data=bars, capital=500_000, quantity_mode=mode)
        print(f"{name:22} {mode:10} {run.fills['quantity_units'].iloc[0]:10.2f} shares")
```

<!-- output -->
```text
engine default         fractional     624.23 shares
engine default         venue          611.00 shares
percent(50)            fractional     312.23 shares
percent(50)            venue          312.00 shares
value(1 lakh)          fractional     124.89 shares
value(1 lakh)          venue          124.00 shares
fixed_risk(1) stop 2%  fractional     303.74 shares
fixed_risk(1) stop 2%  venue          303.00 shares
```

## Warnings to read

The engine never hides an assumption. These are the warnings you will meet; each appears in `result.warnings`, in the Assumptions section of the tearsheet, and in `print(result)`:

* `costs=None: no charges are modelled; results overstate P&L`.
* `charges: the ... rates of cost schedule ... are unverified for N fill(s)`: fills charged at rates not verified for their dates.
* A margin row that is not verified, named by its row id (such as `FUT_NIFTY/1`).
* `generic cash-equity instrument assumed (lot 1, tick 0.05)`: no `instrument=` was given for a cash-equity symbol.
* A derivative whose underlying is not a listed index takes the stock-derivative slippage row.

Python warnings appear as well: `UnverifiedScheduleWarning` for unverified cost rates, `ReferenceDataWarning` when a reference row is unverified or used after the date it was last checked, and `CalendarWarning` for a year without a holiday list.
