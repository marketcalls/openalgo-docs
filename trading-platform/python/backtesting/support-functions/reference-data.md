# Instruments and Reference Data

`openalgo.backtest.reference` holds the contract facts a backtest of futures and options needs, as dated tables: lot sizes, freeze quantities, strike steps, tick sizes, expiry weekdays and contract dates, settlement types, and the main MCX contracts. A backtest looks up every F&O symbol here on the run's first date; you can use the tables on their own to find expiries, check a lot size on a past date, or build option symbols.

How the tables are kept:

* **Dated.** Lot sizes and freeze quantities change; each row says from when to when it applies, so a lookup for a past date gets the value of that date.
* **Sourced.** Each row cites the exchange circular or file it comes from and is marked verified or unverified. Using an unverified row warns (`ReferenceDataWarning`), and so does using a row for a date after its table was last checked.
* **Never guessed.** A lookup no row covers raises `ReferenceDataError` naming the table, the key and the date, rather than falling back to a default.
* Contracts the exchange re-dated after listing keep their listed expiry (the date in the symbol) and their real last trading day. The tables reproduce the listed contracts, last trading days and lot sizes of 92 days of NSE and BSE bhavcopies.

Quantities are in units, never lots; prices and tick sizes are in rupees; dates are IST.

## Main functions

| Function | Returns |
|---|---|
| `parse_symbol(symbol, exchange)` | The underlying, expiry, strike and option type of an OpenAlgo symbol |
| `format_symbol(underlying, expiry, strike=None, option_type=None)` | The OpenAlgo symbol (a future without a strike) |
| `default_tables()` | The built-in `ReferenceTables` |
| `tables.lot_size(underlying, exchange, date, expiry=None)` | Lot size in units on that date |
| `tables.freeze_qty(underlying, exchange, date, kind=None)` | The largest quantity in units the exchange accepts in one order |
| `tables.strike_step(underlying, exchange, date)` | The strike interval of the near contracts |
| `tables.expiries(underlying, exchange, start, end, calendar, series="all")` | Expiry dates in a range (`series="weekly"` or `"monthly"` for one series) |
| `tables.instrument(symbol, exchange, date)` | An `Instrument` with every term of that contract on that date |
| `tables.underlying_type(underlying, exchange, date)` | `"index"`, `"stock"`, `"etf"`, `"commodity"` or `"currency"` |
| `tables.tick_size(exchange, segment, date, reference_price=None)` | The tick of a segment (a price slab needs a reference price) |
| `tables.coverage()`, `tables.verification_summary()`, `tables.version` | What the tables cover, how much is verified, and the version recorded in run manifests |
| `round_to_tick(price, tick, mode="nearest")`, `round_to_lot(units, lot, mode="down")`, `units_to_lots(units, lot)`, `split_by_freeze(units, freeze, lot)`, `check_freeze(units, freeze)` | Rounding and order-splitting helpers |

`ReferenceTables(user_files=..., snapshots=...)` adds your own CSV rows (they win over the built-in rows, with a warning naming both) or symbol-master snapshots taken from your OpenAlgo server.

## Example

```python
import datetime as dt

from openalgo.backtest import reference as ref
from openalgo.backtest.calendar import default_calendar

tables = ref.default_tables()

print(ref.parse_symbol("NIFTY27OCT2625000CE", "NFO"))
print(ref.format_symbol("BANKNIFTY", dt.date(2026, 10, 27), 56000, "PE"))

print("NIFTY lot:", tables.lot_size("NIFTY", "NFO", "2025-10-01"), "in Oct 2025,", tables.lot_size("NIFTY", "NFO", "2026-10-05"), "in Oct 2026")
print("NIFTY freeze quantity:", tables.freeze_qty("NIFTY", "NFO", "2026-10-01"), "on 1 Oct,", tables.freeze_qty("NIFTY", "NFO", "2026-10-05"), "from 5 Oct 2026")
print("NIFTY strike step:", tables.strike_step("NIFTY", "NFO", "2026-10-05"))
print("NIFTY expiries in Oct 2026:", tables.expiries("NIFTY", "NFO", "2026-10-01", "2026-10-31", default_calendar()))

option = tables.instrument("NIFTY27OCT2625000CE", "NFO", "2026-10-05")
print(option.kind, option.lot_size, option.tick_size, option.freeze_qty, option.expiry, option.settlement)

print(ref.round_to_tick(102.123, 0.05), ref.round_to_tick(102.123, 0.05, "up"))
print(ref.round_to_lot(200, 65), "units,", ref.units_to_lots(130, 65), "lots")
print(ref.split_by_freeze(7020, 3510, 65))
```

<!-- output -->
```text
ParsedSymbol(symbol='NIFTY27OCT2625000CE', exchange='NFO', kind='option', underlying='NIFTY', expiry=datetime.date(2026, 10, 27), strike=25000.0, option_type='CE')
BANKNIFTY27OCT2656000PE
NIFTY lot: 75 in Oct 2025, 65 in Oct 2026
NIFTY freeze quantity: 1800 on 1 Oct, 3510 from 5 Oct 2026
NIFTY strike step: 50.0
NIFTY expiries in Oct 2026: [datetime.date(2026, 10, 6), datetime.date(2026, 10, 13), datetime.date(2026, 10, 19), datetime.date(2026, 10, 27)]
option 65 0.05 3510 2026-10-27 cash
102.1 102.15
195 units, 2 lots
[3510, 3510]
```

The weekly expiry that would have fallen on Tuesday 20 October 2026 (Dussehra) moved to Monday 19 October; the tables place every expiry with the session calendar.

## In a backtest

When a strategy trades a future or an option, the engine resolves its lot size, tick size, freeze quantity and expiry from these tables on the run's first date, and says so in the Assumptions block. Orders without a quantity buy one lot, `lots=` counts lots, a sized quantity is capped at the freeze quantity, and an explicit quantity above it is rejected (`freeze_qty`).

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

minute = np.arange(375)
premium = np.interp(minute, [0, 120, 374], [120, 150, 135]).round(1)
open_ = np.r_[premium[0], premium[:-1]]
bars = pd.DataFrame(
    {"open": open_, "high": np.maximum(open_, premium) + 0.5, "low": np.minimum(open_, premium) - 0.5,
     "close": premium, "volume": 10_000},
    index=pd.Timestamp("2026-10-05 09:15", tz="Asia/Kolkata") + pd.to_timedelta(minute, unit="min"),
)


class BuyCall(bt.Strategy):
    symbol, exchange, interval = "NIFTY27OCT2625000CE", "NFO", "5m"

    def on_bar(self, bar):
        if len(self.close) == 3:
            self.buy(lots=2, stop=bt.pct(10), target=bt.pct(15))


result = bt.backtest(BuyCall, data=bars, capital=100_000)
print(result.assumptions["instruments"])
print(result.fills[["time", "side", "quantity_units", "price_rupees", "reason"]].to_string(index=False))
print("margin blocked:", result.equity["margin_rupees"].max(), "charges:", round(result.equity["costs_rupees"].iloc[-1], 2))
```

<!-- output -->
```text
NIFTY27OCT2625000CE: lot 65, tick 0.05, freeze 3510 from the reference tables (builtin:2026-11-12:319d8b455d2d)
                     time side  quantity_units  price_rupees     reason
2026-10-05 09:30:00+05:30  BUY           130.0        124.15      entry
2026-10-05 10:45:00+05:30 SELL           130.0        142.00 leg_target
margin blocked: 16055.0 charges: 89.74
```

The run is MIS (an intraday interval), so the stop and target are held by the engine. Two lots are 130 units. A long option blocks the premium as margin (valued at the fill bar's open), and every fill pays the default slippage for index options, 0.5 percent of the premium, which is why the target, set 15 percent above the 124.15 entry, filled at 142.00.

To give the terms yourself, pass `instrument=Instrument(symbol=..., exchange=..., kind=..., lot_size=..., tick_size=..., freeze_qty=..., expiry=..., underlying=...)` (or a dict of them by symbol) to `bt.backtest`. This is also how a cash-equity symbol gets its own tick and freeze quantity instead of the generic lot 1 and tick 0.05, and how a future whose tick depends on a price slab is run (the engine asks for `instrument=` when the tables cannot pick the slab).
