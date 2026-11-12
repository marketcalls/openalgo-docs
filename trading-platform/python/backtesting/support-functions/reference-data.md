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

## Examples

Each block below shows one lookup. They read only the built-in tables, so they need no server. Run the first block first; the others continue from it.

`parse_symbol` reads an OpenAlgo symbol, here the NIFTY 25300 call option that expires on 23 November 2026:

```python
import datetime as dt

from openalgo.backtest import reference as ref
from openalgo.backtest.calendar import default_calendar

tables = ref.default_tables()  # the built-in reference tables

print(ref.parse_symbol("NIFTY23NOV2625300CE", "NFO"))
```

<!-- output -->
```text
ParsedSymbol(symbol='NIFTY23NOV2625300CE', exchange='NFO', kind='option', underlying='NIFTY', expiry=datetime.date(2026, 11, 23), strike=25300.0, option_type='CE')
```

`format_symbol` does the reverse. Without a strike and an option type it gives the future:

<!-- continues -->
```python
print(ref.format_symbol("NIFTY", dt.date(2026, 11, 23)))
```

<!-- output -->
```text
NIFTY23NOV26FUT
```

`lot_size` gives the lot size in force on a date. NIFTY's lot changed between these two dates:

<!-- continues -->
```python
print("NIFTY lot:", tables.lot_size("NIFTY", "NFO", "2025-10-01"), "in October 2025,", tables.lot_size("NIFTY", "NFO", "2026-11-11"), "in November 2026")
```

<!-- output -->
```text
NIFTY lot: 75 in October 2025, 65 in November 2026
```

`freeze_qty` is the largest quantity, in units, that the exchange accepts in one order. NSE raised NIFTY's for October 2026 and set it back from 2 November:

<!-- continues -->
```python
print("NIFTY freeze quantity:", tables.freeze_qty("NIFTY", "NFO", "2026-10-15"), "on 15 October,", tables.freeze_qty("NIFTY", "NFO", "2026-11-11"), "on 11 November 2026")
```

<!-- output -->
```text
NIFTY freeze quantity: 3510 on 15 October, 1800 on 11 November 2026
```

`strike_step` is the gap between two strikes of the near contracts:

<!-- continues -->
```python
print("NIFTY strike step:", tables.strike_step("NIFTY", "NFO", "2026-11-11"))
```

<!-- output -->
```text
NIFTY strike step: 50.0
```

`expiries` lists the expiry dates in a range, weekly and monthly, placed on the session calendar:

<!-- continues -->
```python
print(tables.expiries("NIFTY", "NFO", "2026-11-01", "2026-11-30", default_calendar()))
```

<!-- output -->
```text
[datetime.date(2026, 11, 3), datetime.date(2026, 11, 9), datetime.date(2026, 11, 17), datetime.date(2026, 11, 23)]
```

NIFTY's weekly contracts expire on Tuesdays. Tuesday 10 November 2026 was a holiday (Diwali Balipratipada), so that expiry moved to Monday 9 November, and the monthly expiry moved from Tuesday 24 November (Guru Nanak Jayanti) to Monday 23 November: the tables place every expiry with the session calendar.

`instrument` gathers every term of one contract on a date:

<!-- continues -->
```python
option = tables.instrument("NIFTY23NOV2625300CE", "NFO", "2026-11-11")
print(option.kind, "| lot", option.lot_size, "| tick", option.tick_size, "| freeze", option.freeze_qty, "| expiry", option.expiry, "|", option.settlement, "settled")
```

<!-- output -->
```text
option | lot 65 | tick 0.05 | freeze 1800 | expiry 2026-11-23 | cash settled
```

`round_to_tick` rounds a price to the tick, to the nearest by default or `"up"`:

<!-- continues -->
```python
print(ref.round_to_tick(102.123, 0.05), ref.round_to_tick(102.123, 0.05, "up"))
```

<!-- output -->
```text
102.1 102.15
```

`round_to_lot` rounds a quantity in units down to whole lots of 65:

<!-- continues -->
```python
print(ref.round_to_lot(200, 65), "units")
```

<!-- output -->
```text
195 units
```

`split_by_freeze` splits a large order into orders the exchange accepts, each at most the freeze quantity and a whole number of lots. Here 80 lots of NIFTY (5,200 units) against the freeze quantity of 1,800:

<!-- continues -->
```python
print(ref.split_by_freeze(5200, 1800, 65))
```

<!-- output -->
```text
[1755, 1755, 1690]
```

## In a backtest

When a strategy trades a future or an option, the engine resolves its lot size, tick size, freeze quantity and expiry from these tables on the run's first date, and says so in the Assumptions block. Orders without a quantity buy one lot, `lots=` counts lots, a sized quantity is capped at the freeze quantity, and an explicit quantity above it is rejected (`freeze_qty`).

The example buys the NIFTY 25300 call of the November 2026 expiry on 11 November 2026, on the option's own 5-minute bars from your OpenAlgo server: two lots when a bar closes above the high of the first 15 minutes, with a stop 10 percent below the entry and a target 15 percent above it. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class CallBreakout(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV2625300CE", "NFO", "5m"  # intraday: MIS

    def init(self):
        self.traded = False  # one trade only

    def on_bar(self, bar):
        if bar.time.strftime("%H:%M") == "09:25":  # the third 5-minute bar: the first 15 minutes are done
            self.range_high = max(self.high[-3:])
        elif bar.time.strftime("%H:%M") > "09:25" and not self.traded and bar.close > self.range_high:
            self.buy(lots=2, stop=bt.pct(10), target=bt.pct(15))  # 2 lots = 130 units
            self.traded = True


result = bt.backtest(CallBreakout, client, start="2026-11-11", end="2026-11-11", capital=100_000)
print(result.assumptions["instruments"])
print(result.fills[["time", "side", "quantity_units", "price_rupees", "reason"]].to_string(index=False))
```

NIFTY23NOV2625300CE expires on 23 November 2026. After that your broker no longer serves its history, so to run the example later, pick an option of the current expiry and a recent session.

<!-- output -->
```text
NIFTY23NOV2625300CE: lot 65, tick 0.05, freeze 1800 from the reference tables (builtin:2026-11-12:319d8b455d2d)
                     time side  quantity_units  price_rupees reason
2026-11-11 09:45:00+05:30  BUY           130.0        389.25  entry
2026-11-11 09:55:00+05:30 SELL           130.0        348.55 leg_sl
```

The engine took the contract's terms from the tables (first line). The run is intraday (MIS), so the engine holds the stop and target itself. Two lots are 130 units. The breakout came at 09:45 and the buy filled at 389.25; the premium then fell, and the 10 percent stop closed the trade ten minutes later at 348.55. That is a little below the stop level of about 350.35, because every fill pays the default slippage for index options, 0.5 percent of the premium.

To give the terms yourself, pass `instrument=Instrument(symbol=..., exchange=..., kind=..., lot_size=..., tick_size=..., freeze_qty=..., expiry=..., underlying=...)` (or a dict of them by symbol) to `bt.backtest`. This is also how a cash-equity symbol gets its own tick and freeze quantity instead of the generic lot 1 and tick 0.05, and how a future whose tick depends on a price slab is run (the engine asks for `instrument=` when the tables cannot pick the slab).
