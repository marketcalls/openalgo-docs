# Cost Calculator

`openalgo.backtest.costs` works out the full charges of an Indian trade: brokerage, STT, exchange charges, the SEBI fee, stamp duty, GST and the DP charge, at the rates in force on the trade date. The backtest charges every fill with it, and you can use it on its own to see what a trade will cost or to check your broker's contract note.

The first example prices a real intraday trade: 400 SBIN shares bought at the open of 11 November 2026 and sold at that day's close, at prices from your OpenAlgo server. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before.

<!-- requires-server -->
```python
# Load the OpenAlgo client and the cost calculator
from openalgo import api
from openalgo.backtest import costs

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# SBIN's daily bar of 11 November 2026; iloc[0] picks its one row
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-11", end_date="2026-11-11").iloc[0]

# The charges of buying 400 shares at the open and selling them at the close, intraday (MIS)
trip = costs.round_trip_cost(sbin["open"], sbin["close"], 400, "2026-11-11", exchange="NSE", product="MIS")

# The profit before and after charges
gross = (sbin["close"] - sbin["open"]) * 400
print(f"Bought at {sbin['open']:.2f}, sold at {sbin['close']:.2f}")
print(f"Profit before charges : Rs {gross:,.2f}")
print(f"Charges               : Rs {trip.total:,.2f}")
print(f"Profit after charges  : Rs {gross - trip.total:,.2f}")
```

<!-- output -->
```text
Bought at 1056.00, sold at 1061.20
Profit before charges : Rs 2,080.00
Charges               : Rs 197.67
Profit after charges  : Rs 1,882.33
```

The quantity is always in units (shares), never lots, and prices and charges are in rupees.

## What each charge is

`as_dict()` lists the charges of the round trip one by one:

<!-- requires-server -->
<!-- continues -->
```python
# A for loop runs the print once for each charge and its amount
for name, amount in trip.as_dict().items():
    print(f"{name:13} Rs {amount:8.2f}")
```

<!-- output -->
```text
brokerage     Rs    40.00
stt           Rs   106.12
exchange_txn  Rs    26.00
sebi_fee      Rs     0.85
stamp_duty    Rs    12.67
gst           Rs    12.03
total         Rs   197.67
```

* `brokerage`: your broker's fee. The default is Zerodha's rates: 0.03 percent of each intraday order, at most Rs 20.
* `stt`: Securities Transaction Tax, paid on the sell side of an intraday share trade.
* `exchange_txn`: the exchange's transaction charges (with the IPFT charge).
* `sebi_fee`: the fee of SEBI, the market regulator.
* `stamp_duty`: paid on the buy side.
* `gst`: 18 percent GST on the brokerage, exchange charges and SEBI fee.

## A delivery (CNC) trade

A delivery trade holds the shares overnight. It pays STT on both sides, and selling shares from your holdings also pays the **DP charge**, a fixed fee per stock per day. Here, 100 SBIN shares bought at the close of 2 November 2026 and sold at the close of 11 November:

<!-- requires-server -->
<!-- continues -->
```python
# The close of 2 November 2026, the day of the buy
bought = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-02", end_date="2026-11-02").iloc[0]

# A buy and a later sell of 100 shares, delivery (CNC), and the DP charge of the sell day
cnc = costs.round_trip_cost(bought["close"], sbin["close"], 100, "2026-11-02", sell_date="2026-11-11", exchange="NSE", product="CNC")
dp = costs.dp_charge("2026-11-11")
print(f"Round trip : Rs {cnc.total:,.2f} (STT Rs {cnc.stt:,.2f})")
print(f"DP charge  : Rs {dp.total:,.2f}")
```

<!-- output -->
```text
Round trip : Rs 227.29 (STT Rs 204.82)
DP charge  : Rs 15.34
```

The default preset charges no brokerage on delivery, so most of the cost is STT, 0.1 percent of each side. The DP charge (Rs 13 plus GST) is paid once per stock on each day you sell it from your holdings.

## Another broker's brokerage

`brokerage=` takes a preset. The default (`"zerodha"`) is a percentage with a cap; `costs.flat(20)` is a flat Rs 20 an order. The difference shows on small trades, here 20 SBIN shares bought and sold intraday:

<!-- requires-server -->
<!-- continues -->
```python
small = costs.round_trip_cost(sbin["open"], sbin["close"], 20, "2026-11-11", exchange="NSE", product="MIS")
flat = costs.round_trip_cost(sbin["open"], sbin["close"], 20, "2026-11-11", exchange="NSE", product="MIS",
                             brokerage=costs.flat(20))
print(f"Default preset : Rs {small.total:,.2f}")
print(f"Flat Rs 20     : Rs {flat.total:,.2f}")
```

<!-- output -->
```text
Default preset : Rs 22.51
Flat Rs 20     : Rs 54.72
```

On 20 shares (about Rs 21,000 an order) the percentage preset charges about Rs 6 an order. On larger orders both reach Rs 20, because 0.03 percent of an order above Rs 66,667 reaches the cap. To use a preset in a backtest, see [Costs, Slippage and Margin](../costs-slippage-and-margin.md).

## Many trades at once

`trade_costs` prices a whole list of trades in one call, one row per trade. Here the day's four intraday orders, 400 SBIN and 100 RELIANCE shares, each bought at the open and sold at the close:

<!-- requires-server -->
<!-- continues -->
```python
reliance = client.history(symbol="RELIANCE", exchange="NSE", interval="D", start_date="2026-11-11", end_date="2026-11-11").iloc[0]

# Four lists of the same length: the sides, prices, quantities and dates, one entry per order
trades = costs.trade_costs(
    ["BUY", "SELL", "BUY", "SELL"],
    [sbin["open"], sbin["close"], reliance["open"], reliance["close"]],
    [400, 400, 100, 100],
    ["2026-11-11"] * 4,  # the same date four times
    "NSE_EQ_INTRADAY",  # the segment: NSE shares, intraday
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

## More options

* Segments: NSE and BSE equity (delivery and intraday; BSE needs `bse_group=`), NFO and BFO futures and options, and MCX futures (they need `underlying=`, the commodity). Name one with `segment=` (one of `costs.SEGMENTS`, or `costs.segment_for(exchange, product, instrument)`) or with `exchange=` and `product=` (plus `instrument="FUT"` or `"OPT"`). Currency derivatives and MCX options raise `CostError`, as does anything the calculator does not recognise.
* `trade_cost(side, price, quantity, date, ...)` prices one order. A `CostBreakdown` has `brokerage`, `stt`, `exchange_txn`, `sebi_fee`, `stamp_duty`, `gst`, `total`, the `schedules` that priced it and `verified`.
* `rounding="contract_note"` (default) returns unrounded amounts to be rounded per contract note; `rounding="calculator"` rounds each trade to the paisa the way the broker's online calculator does.
* `costs.contract_note(trades)` rounds a day's trades the way a contract note (the statement your broker sends after each trading day) does: each charge summed per date and segment, STT and stamp duty to the rupee, the others to the paisa. That rule is an assumption, stated in `costs.CONTRACT_NOTE_RULE`.
* Presets: `costs.zerodha()`, `zero_brokerage()`, `flat(amount)`, `percent(percent, cap)` and `custom(...)`.
* Rates are dated: `costs.schedules()` lists the built-in schedules from 1 July 2020, each with the date its rates were last checked. A trade before 1 July 2020 raises `CostError` unless the model is `CostModel(backfill=True)`. Rates not verified for a date still price the trade, with `verified=False` and an `UnverifiedScheduleWarning`.
* `costs.CostModel(brokerage=..., rounding=..., schedules=[...], backfill=...)` builds a model with its own preset or corrected rates; pass it to `bt.backtest(costs=model)`.
* `costs.exercise_stt(intrinsic, quantity, date)` is the STT on an exercised option.
