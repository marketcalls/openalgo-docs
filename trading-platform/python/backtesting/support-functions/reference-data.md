# Instruments and Reference Data

`openalgo.backtest.reference` holds the contract facts a futures or options backtest needs, by date: lot sizes, freeze quantities, strike steps, tick sizes and expiry dates. A backtest looks up every futures and options symbol here, and you can use the tables on their own to find an expiry, check a lot size on a past date or build an option symbol.

Two terms first. A **lot** is the fixed number of units a futures or options contract trades in (65 for NIFTY in November 2026). The **freeze quantity** is the largest quantity, in units, the exchange accepts in one order.

The first example looks up the NIFTY November 2026 future in the built-in tables and in your OpenAlgo server's list of symbols. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the OpenAlgo client and the reference tables
from openalgo import api
from openalgo.backtest import reference as ref

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# The contract in the built-in tables, as it stood on 11 November 2026
tables = ref.default_tables()
future = tables.instrument("NIFTY23NOV26FUT", "NFO", "2026-11-11")
print("built-in tables : lot", future.lot_size, "| freeze", future.freeze_qty, "| expiry", future.expiry)

# The same contract in your OpenAlgo server's symbol list
info = client.symbol(symbol="NIFTY23NOV26FUT", exchange="NFO")["data"]
print("OpenAlgo server : lot", info["lotsize"], "| freeze", info["freeze_qty"], "| expiry", info["expiry"])
```

<!-- output -->
```text
built-in tables : lot 65 | freeze 1800 | expiry 2026-11-23
OpenAlgo server : lot 65 | freeze 1800 | expiry 23-NOV-26
```

The two agree. NIFTY23NOV26FUT expires on 23 November 2026; after that your server no longer lists it, so use the current contract.

## Lot size on a date

Lot sizes change, and a backtest of an older date needs the lot of that date. This block and the ones after it read only the built-in tables, so they need no server; run them in order:

```python
# Load the reference tables
from openalgo.backtest import reference as ref

tables = ref.default_tables()
print("NIFTY lot in October 2025 :", tables.lot_size("NIFTY", "NFO", "2025-10-01"))
print("NIFTY lot in November 2026:", tables.lot_size("NIFTY", "NFO", "2026-11-11"))
```

<!-- output -->
```text
NIFTY lot in October 2025 : 75
NIFTY lot in November 2026: 65
```

## Expiry dates

`expiries` lists the expiry dates in a range, weekly and monthly, placed on the trading calendar:

<!-- continues -->
```python
from openalgo.backtest.calendar import default_calendar

# The NIFTY expiries of November 2026, checked against the NSE holiday calendar
print(tables.expiries("NIFTY", "NFO", "2026-11-01", "2026-11-30", default_calendar()))
```

<!-- output -->
```text
[datetime.date(2026, 11, 3), datetime.date(2026, 11, 9), datetime.date(2026, 11, 17), datetime.date(2026, 11, 23)]
```

NIFTY contracts expire on Tuesdays. Tuesday 10 November 2026 was a holiday (Diwali Balipratipada), so that expiry moved to Monday 9 November, and the monthly expiry moved from Tuesday 24 November (Guru Nanak Jayanti) to Monday 23 November.

## Reading and building symbols

`parse_symbol` reads an OpenAlgo symbol, here the NIFTY 25300 call option of 23 November 2026; `format_symbol` builds one:

<!-- continues -->
```python
import datetime as dt

print(ref.parse_symbol("NIFTY23NOV2625300CE", "NFO"))  # what the symbol means
print(ref.format_symbol("NIFTY", dt.date(2026, 11, 23), 25300, "PE"))  # the matching put option
```

<!-- output -->
```text
ParsedSymbol(symbol='NIFTY23NOV2625300CE', exchange='NFO', kind='option', underlying='NIFTY', expiry=datetime.date(2026, 11, 23), strike=25300.0, option_type='CE')
NIFTY23NOV2625300PE
```

Without a strike and an option type, `format_symbol` gives the future (`NIFTY23NOV26FUT`).

## Large orders

An order above the freeze quantity is rejected by the exchange, so a large order is split into smaller ones, each a whole number of lots. Here 80 lots of NIFTY (5,200 units) against the freeze quantity of 1,800:

<!-- continues -->
```python
print("freeze quantity:", tables.freeze_qty("NIFTY", "NFO", "2026-11-11"))
print("orders:", ref.split_by_freeze(5200, 1800, 65))  # units, freeze quantity, lot size
```

<!-- output -->
```text
freeze quantity: 1800
orders: [1755, 1755, 1690]
```

Three orders of 27, 27 and 26 lots, each at most 1,800 units.

## Rounding to the tick and the lot

A price must be a whole number of **ticks** (the smallest price step, 0.05 rupees here), and a futures quantity a whole number of lots:

<!-- continues -->
```python
print(ref.round_to_tick(102.123, 0.05))  # to the nearest tick
print(ref.round_to_lot(200, 65), "units")  # down to whole lots of 65
```

<!-- output -->
```text
102.1
195 units
```

## In a backtest

When a strategy trades a future or an option, the engine takes its lot, tick, freeze quantity and expiry from these tables, and says so in the run's assumptions. This strategy buys the NIFTY 25300 call of 23 November 2026 on 11 November 2026, on the option's own 5-minute bars from your OpenAlgo server: two lots when a bar closes above the high of the first 15 minutes, with a stop-loss 10 percent below the buy price and a target 15 percent above:

<!-- requires-server -->
```python
# Load the backtest engine and the OpenAlgo client
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class is a recipe; the engine follows it on every bar.
class CallBreakout(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV2625300CE", "NFO", "5m"  # 5-minute bars: intraday (MIS)

    # init runs once, before the first bar
    def init(self):
        self.traded = False  # one trade only

    # on_bar runs at the close of every 5-minute bar
    def on_bar(self, bar):
        if bar.time.strftime("%H:%M") == "09:25":  # the third bar: the first 15 minutes are done
            self.range_high = max(self.high[-3:])  # the highest high of the first three bars
        elif bar.time.strftime("%H:%M") > "09:25" and not self.traded and bar.close > self.range_high:
            self.buy(lots=2, stop=bt.pct(10), target=bt.pct(15))  # 2 lots = 130 units
            self.traded = True


# Run it on 11 November 2026, then print the contract terms used and the fills
result = bt.backtest(CallBreakout, client, start="2026-11-11", end="2026-11-11", capital=100_000)
print(result.assumptions["instruments"])
print(result.fills[["time", "side", "quantity_units", "price_rupees", "reason"]].to_string(index=False))
```

<!-- output -->
```text
NIFTY23NOV2625300CE: lot 65, tick 0.05, freeze 1800 from the reference tables (builtin:2026-11-12:319d8b455d2d)
                     time side  quantity_units  price_rupees reason
2026-11-11 09:45:00+05:30  BUY           130.0        389.25  entry
2026-11-11 09:55:00+05:30 SELL           130.0        348.55 leg_sl
```

The breakout came at 09:45 and two lots (130 units) were bought at 389.25. The premium then fell, and the 10 percent stop closed the trade at 09:55, a little below the stop level because every fill pays the default slippage for index options (0.5 percent of the premium). The run is intraday (MIS), so the engine held the stop and target itself. To run it after 23 November 2026, pick an option of the current expiry and a recent session.

## More options

* **Dated:** each row says from when to when it applies, so a lookup for a past date gets the value of that date.
* **Sourced:** each row cites the exchange circular or file it comes from and is marked verified or unverified. Using an unverified row, or a row for a date after its table was last checked, warns with `ReferenceDataWarning`.
* **Never guessed:** a lookup no row covers raises `ReferenceDataError` naming the table, the key and the date.
* Contracts the exchange re-dated after listing keep their listed expiry (the date in the symbol) and their real last trading day.
* `tables.strike_step(underlying, exchange, date)`, `tables.underlying_type(...)` (`"index"`, `"stock"`, `"etf"`, `"commodity"` or `"currency"`), `tables.tick_size(exchange, segment, date, reference_price=None)` (some futures take their tick from a price slab), and `tables.expiries(..., series="weekly")` or `"monthly"` for one series.
* `units_to_lots(units, lot)`, `check_freeze(units, freeze)`, and `round_to_tick(price, tick, "up")` or `"down"`.
* `tables.coverage()`, `tables.verification_summary()` and `tables.version` (recorded in run manifests).
* `ReferenceTables(user_files=..., snapshots=...)` adds your own CSV rows (they win over the built-in rows, with a warning) or symbol-list snapshots from your OpenAlgo server.
* In a backtest, an order without a quantity buys one lot, `lots=` counts lots, a sized quantity is capped at the freeze quantity, and an explicit quantity above it is rejected (`freeze_qty`). `bt.backtest(instrument=Instrument(...))` gives the terms yourself, also for a share that needs its own tick or a future whose tick depends on a price slab.
