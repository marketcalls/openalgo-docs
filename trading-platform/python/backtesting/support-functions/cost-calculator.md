# Cost Calculator

`openalgo.backtest.costs` prices Indian trades: brokerage plus STT (or CTT on MCX), exchange and IPFT charges, the SEBI fee, stamp duty, GST and the DP charge, at the rates in force on the trade date. The backtest charges every fill with it, and you can use it on its own: to see what a trade will cost, to check a contract note, or to cost a list of trades from your own records.

Units: prices and costs are rupees. A **quantity is always in units, never lots** (shares for equity; for futures and options, lots times the lot size; for an MCX future, lots times the contract multiplier). One trade is one executed order. Trade dates are IST dates.

Segments: NSE and BSE equity (delivery and intraday; BSE needs the scrip group), NFO and BFO futures and options, and MCX futures (which need the commodity). Currency derivatives and MCX options are not costed yet and raise `CostError`, as does anything the calculator does not recognise: nothing falls back silently.

## Main functions

| Function | Returns |
|---|---|
| `trade_cost(side, price, quantity, date, exchange=, product=, ...)` | A `CostBreakdown` of one trade |
| `round_trip_cost(buy_price, sell_price, quantity, date, sell_date=None, ...)` | A `CostBreakdown` of a buy and a sell of the same quantity |
| `trade_costs(sides, prices, quantities, dates, segment)` | A DataFrame, one row per trade (vectorised) |
| `contract_note(trades)` | Those trades rounded per trade date and contract note, as a broker's contract note rounds |
| `dp_charge(date)` | The DP charge for selling one scrip from holdings that day |
| `exercise_stt(intrinsic, quantity, date)` | STT on an exercised option |
| `segment_for(exchange, product, instrument="EQ", bse_group=None, underlying=None)` | The segment code (`"NSE_EQ_INTRADAY"`, `"NFO_OPT"`, ...) |
| `schedules()` | The dated rate schedules, with how far each row is verified |
| `zerodha()`, `zero_brokerage()`, `flat(amount)`, `percent(percent, cap)`, `custom(...)` | Brokerage presets |
| `CostModel(brokerage=, rounding=, schedules=, backfill=)` | A model with its own preset, rounding mode or schedules |

Say what is traded either with `segment=` (one of `costs.SEGMENTS`) or with `exchange=` and `product=` (plus `instrument="FUT"` or `"OPT"`, `bse_group=` for BSE equity, and `underlying=` for MCX futures and BFO options). `brokerage=` takes a preset (default `"zerodha"`), and `rounding=` is `"contract_note"` (default: unrounded amounts, to be rounded per note) or `"calculator"` (rounded per trade the way the Zerodha brokerage calculator rounds, to the paisa).

A `CostBreakdown` has `brokerage`, `stt`, `exchange_txn`, `sebi_fee`, `stamp_duty`, `gst` and `total`, the `schedules` that priced it, and `verified` (whether those rates are verified for the date). `as_dict()` gives the amounts as a dict.

## Example

```python
from openalgo.backtest import costs

# One intraday sell of 400 shares at Rs 1,100.
sell = costs.trade_cost("SELL", 1100, 400, "2026-10-05", exchange="NSE", product="MIS")
print({name: round(value, 2) for name, value in sell.as_dict().items()}, sell.schedules, sell.verified)

# An intraday round trip, rounded as the Zerodha calculator rounds it.
trip = costs.round_trip_cost(1000, 1100, 400, "2026-10-05", segment="NSE_EQ_INTRADAY", rounding="calculator")
print("intraday round trip:", trip.total)

# One lot (65 units) of a NIFTY option bought at 120 and sold at 150, carried forward.
option = costs.round_trip_cost(120, 150, 65, "2026-10-05", exchange="NFO", product="NRML",
                               instrument="OPT", rounding="calculator")
print("option round trip:", option.total)

# A delivery sell also pays the DP charge, once per scrip per day.
print("DP charge:", costs.dp_charge("2026-10-05").total)

# A small trade under two brokerage presets: 0.03 percent beats a flat Rs 20 here.
for preset in ("zerodha", costs.flat(20)):
    small = costs.round_trip_cost(1000, 1010, 20, "2026-10-05", segment="NSE_EQ_INTRADAY",
                                  brokerage=preset, rounding="calculator")
    print("20 shares,", getattr(preset, "name", preset), small.total)
```

<!-- output -->
```text
{'brokerage': 20.0, 'stt': 110.0, 'exchange_txn': 13.51, 'sebi_fee': 0.44, 'stamp_duty': 0.0, 'gst': 6.11, 'total': 150.06} ('IN-2026-04-01',) True
intraday round trip: 200.62
option round trip: 69.59
DP charge: 15.34
20 shares, zerodha 21.73
20 shares, flat(20) 54.7
```

## Many trades and a contract note

`trade_costs` prices a whole list of trades at once, and `contract_note` rounds them the way a contract note does: per trade date and exchange segment, each charge summed over the day, STT and stamp duty rounded to the rupee and the others to the paisa. That rounding rule is an assumption, not checked against a real contract note; `costs.CONTRACT_NOTE_RULE` states it.

<!-- continues -->
```python
trades = costs.trade_costs(
    ["BUY", "SELL", "BUY", "SELL"],
    [1000, 1010, 500, 495],
    [100, 100, 200, 200],
    ["2026-10-05"] * 4,
    "NSE_EQ_INTRADAY",
)
print(trades[["brokerage", "stt", "stamp_duty", "total"]].round(2).to_string(index=False))
note = costs.contract_note(trades)
print(note[["date", "note", "fills", "total", "adjustment"]].round(2).to_string(index=False))
```

<!-- output -->
```text
 brokerage   stt  stamp_duty  total
      20.0  0.00         3.0  30.34
      20.0 25.25         0.0  52.63
      20.0  0.00         3.0  30.34
      20.0 24.75         0.0  52.05
      date   note  fills  total  adjustment
2026-10-05 NSE_EQ      4 165.36        -0.0
```

## Dated and verified rates

Each schedule has a start date, and each of its rows records the last date its rates were checked against their source. A trade dated before the first schedule (1 October 2024) raises `CostError`, unless the model was built with `CostModel(backfill=True)`, which charges it at the first schedule's rates and warns. A cost from rates that are not verified for its date is still returned, with `verified=False`, and Python shows an `UnverifiedScheduleWarning`.

<!-- continues -->
```python
for schedule in costs.schedules():
    print(schedule["id"], schedule["valid_from"], "to", schedule["valid_to"], "verified through", schedule["verified_through"])
```

<!-- output -->
```text
IN-2024-10-01 2024-10-01 to 2026-03-31 verified through None
IN-2026-04-01 2026-04-01 to None verified through 2026-11-12
```

To add or correct a period, copy one of these dicts, change it, and pass it to `costs.CostModel(schedules=[...])`. Use the model's own `trade`, `round_trip` and `trades` methods, or pass it to `bt.backtest(costs=model)`.
