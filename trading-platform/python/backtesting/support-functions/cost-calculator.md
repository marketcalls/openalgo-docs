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

## Examples

The examples price real trades of 11 November 2026, at prices taken from your OpenAlgo server. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before it.

The day's bars of SBIN and RELIANCE: the examples buy at the open and sell at the close.

<!-- requires-server -->
```python
from openalgo import api
from openalgo.backtest import costs

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-11", end_date="2026-11-11").iloc[0]
reliance = client.history(symbol="RELIANCE", exchange="NSE", interval="D", start_date="2026-11-11", end_date="2026-11-11").iloc[0]
print("SBIN open", sbin["open"], "close", sbin["close"], "| RELIANCE open", reliance["open"], "close", reliance["close"])
```

<!-- output -->
```text
SBIN open 1056.0 close 1061.2 | RELIANCE open 1333.5 close 1335.4
```

`trade_cost` prices one trade. Here, an intraday (MIS) sell of 400 SBIN shares at the close; a sell pays STT, a buy pays stamp duty:

<!-- requires-server -->
<!-- continues -->
```python
sell = costs.trade_cost("SELL", sbin["close"], 400, "2026-11-11", exchange="NSE", product="MIS")
print({name: round(value, 2) for name, value in sell.as_dict().items()})
print("rates:", sell.schedules, "| verified:", sell.verified)
```

<!-- output -->
```text
{'brokerage': 20.0, 'stt': 106.12, 'exchange_txn': 13.03, 'sebi_fee': 0.42, 'stamp_duty': 0.0, 'gst': 6.02, 'total': 145.6}
rates: ('IN-2026-04-01',) | verified: True
```

`round_trip_cost` prices a buy and a sell of the same quantity: 400 SBIN shares bought at the open and sold at the close, intraday, rounded the way the Zerodha brokerage calculator rounds:

<!-- requires-server -->
<!-- continues -->
```python
trip = costs.round_trip_cost(sbin["open"], sbin["close"], 400, "2026-11-11", segment="NSE_EQ_INTRADAY", rounding="calculator")
print("intraday round trip:", trip.total)
```

<!-- output -->
```text
intraday round trip: 197.88
```

Brokerage presets matter most on small trades. The default preset, Zerodha's (0.03 percent of the order value, at most Rs 20 an order), on a round trip of only 20 SBIN shares:

<!-- requires-server -->
<!-- continues -->
```python
small = costs.round_trip_cost(sbin["open"], sbin["close"], 20, "2026-11-11", segment="NSE_EQ_INTRADAY", rounding="calculator")
print("20 shares, zerodha:", small.total)
```

<!-- output -->
```text
20 shares, zerodha: 22.58
```

The same 20 shares with a flat Rs 20 an order (`costs.flat(20)`):

<!-- requires-server -->
<!-- continues -->
```python
flat = costs.round_trip_cost(sbin["open"], sbin["close"], 20, "2026-11-11", segment="NSE_EQ_INTRADAY",
                             brokerage=costs.flat(20), rounding="calculator")
print("20 shares, flat(20):", flat.total)
```

<!-- output -->
```text
20 shares, flat(20): 54.78
```

On 20 shares (about Rs 21,000 an order) the percentage preset charges about Rs 6 an order against the flat Rs 20. On the 400-share round trip above, both come to Rs 20 an order, because 0.03 percent of an order above Rs 66,667 reaches the Rs 20 cap.

A delivery (CNC) sell from your holdings also pays the DP charge, once per scrip per day:

<!-- requires-server -->
<!-- continues -->
```python
print("DP charge:", costs.dp_charge("2026-11-11").total)
```

<!-- output -->
```text
DP charge: 15.34
```

## Many trades and a contract note

`trade_costs` prices a whole list of trades at once, one row per trade. Here the day's four intraday trades: 400 SBIN and 100 RELIANCE, each bought at the open and sold at the close:

<!-- requires-server -->
<!-- continues -->
```python
trades = costs.trade_costs(
    ["BUY", "SELL", "BUY", "SELL"],
    [sbin["open"], sbin["close"], reliance["open"], reliance["close"]],
    [400, 400, 100, 100],
    ["2026-11-11"] * 4,
    "NSE_EQ_INTRADAY",
)
print(trades[["brokerage", "stt", "stamp_duty", "total"]].round(2).to_string(index=False))
```

<!-- output -->
```text
 brokerage    stt  stamp_duty  total
      20.0   0.00       12.67  52.07
      20.0 106.12        0.00 145.60
      20.0   0.00        4.00  32.59
      20.0  33.38        0.00  61.98
```

`contract_note` rounds them the way a contract note does: per trade date and exchange segment, each charge summed over the day, STT and stamp duty rounded to the rupee and the others to the paisa. That rounding rule is an assumption, not checked against a real contract note; `costs.CONTRACT_NOTE_RULE` states it.

<!-- requires-server -->
<!-- continues -->
```python
note = costs.contract_note(trades)
print(note[["date", "note", "fills", "total", "adjustment"]].round(2).to_string(index=False))
```

<!-- output -->
```text
      date   note  fills  total  adjustment
2026-11-11 NSE_EQ      4 293.06        0.82
```

## Dated and verified rates

Each schedule has a start date, and each of its rows records the last date its rates were checked against their source. Charges are built in from 1 July 2020 (`IN-2020-07-01`), one schedule per rate change. A trade dated before the first schedule raises `CostError`, unless the model was built with `CostModel(backfill=True)`, which charges it at the first schedule's rates and warns. A cost from rates that are not verified for its date is still returned, with `verified=False`, and Python shows an `UnverifiedScheduleWarning`.

The built-in schedules (this block needs no server):

```python
from openalgo.backtest import costs

for schedule in costs.schedules():
    print(schedule["id"], schedule["valid_from"], "to", schedule["valid_to"], "verified through", schedule["verified_through"])
```

<!-- output -->
```text
IN-2020-07-01 2020-07-01 to 2020-12-31 verified through 2020-12-31
IN-2021-01-01 2021-01-01 to 2021-02-28 verified through 2021-02-28
IN-2021-03-01 2021-03-01 to 2021-03-31 verified through 2021-03-31
IN-2021-04-01 2021-04-01 to 2021-04-30 verified through 2021-04-30
IN-2021-05-01 2021-05-01 to 2022-05-01 verified through 2022-05-01
IN-2022-05-02 2022-05-02 to 2022-11-30 verified through 2022-11-30
IN-2022-12-01 2022-12-01 to 2023-03-31 verified through 2023-03-31
IN-2023-04-01 2023-04-01 to 2023-10-31 verified through 2023-10-31
IN-2023-11-01 2023-11-01 to 2024-05-12 verified through 2024-05-12
IN-2024-05-13 2024-05-13 to 2024-09-30 verified through 2024-09-30
IN-2024-10-01 2024-10-01 to 2026-03-31 verified through None
IN-2026-04-01 2026-04-01 to None verified through 2026-11-12
```

To add or correct a period, copy one of these dicts, change it, and pass it to `costs.CostModel(schedules=[...])`. Use the model's own `trade`, `round_trip` and `trades` methods, or pass it to `bt.backtest(costs=model)`.
