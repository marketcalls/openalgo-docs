# Session Calendar

`openalgo.backtest.calendar` answers, for any OpenAlgo exchange and date: is the exchange open, when does the session open and close, what are the default intraday cut-off and square-off times, and how well is that answer backed by an exchange document. The backtest uses it for every run; you can use it on its own to check your data, plan a run, or count trading days.

What it holds:

* Holiday lists for 2019 to 2026 for NSE, BSE, NFO, BFO, MCX, CDS and BCD, with special sessions (Muhurat trading, Budget-day Sunday sessions). `NSE_INDEX` and `BSE_INDEX` follow NSE and BSE.
* Dated regular hours. For example NFO closes at 15:30, at 15:40 from 3 August 2026 and at 15:45 from 7 December 2026; MCX closes at 23:55, or 23:30 while the United States is on daylight saving time.
* The dated default intraday times (see [Orders and Risk](../orders-and-risk.md#intraday-entry-window-and-square-off)).
* For every date, a coverage level: `sourced` (from a cited exchange or regulator document), `unverified` (loaded but not confirmed), or `template` (no holiday list for that year, so only weekends are closed). Nothing is assumed silently: a year without a holiday list is reported as such, never treated as holiday-free.

Times are given as IST `"HH:MM"` text or as UTC nanoseconds (the engine's form); dates are IST dates.

## Main functions

| Function | Returns |
|---|---|
| `default_calendar()` | The shared built-in calendar (read-only; `.copy()` gives an editable one) |
| `Calendar(builtin=True)` | A new calendar with the built-in holiday data (`builtin=False` for weekdays and regular hours only) |
| `cal.is_open(exchange, day)` | Whether the exchange has a session that date |
| `cal.session(exchange, day)` | `(open, close)` in UTC nanoseconds, or `None` when closed |
| `cal.session_info(exchange, day)` | The session with its kind (`regular` or `special`), coverage and `hours_unverified` |
| `cal.sessions(exchange, start, end)` | A DataFrame, one row per session |
| `cal.holidays(exchange, year)` | The dated rules of a year: closures and special sessions, with names |
| `cal.intraday_times(exchange, day)` | The default `entry_until` and `square_off` of that date |
| `cal.sessions_per_year(exchanges, start, end)` | The annualisation factor the metrics use |
| `cal.coverage(exchange, day_or_year)` | `"sourced"`, `"unverified"` or `"template"` |
| `cal.validate_intraday(bars, exchange=, interval=)` | Checks an intraday series and raises `TimestampError` for wrong timestamps |
| `cal.add_session(...)`, `cal.add_closure(...)`, `cal.set_regular_hours(...)`, `cal.add_holidays(response)` | Edit a copy |
| `Calendar.from_openalgo(client, years)` | A calendar with your OpenAlgo server's holiday tables added |

## Example

```python
import pandas as pd

from openalgo.backtest.calendar import default_calendar

cal = default_calendar()


def ist(nanos):
    return pd.Timestamp(nanos, tz="UTC").tz_convert("Asia/Kolkata").strftime("%H:%M")


print("Good Friday open:", cal.is_open("NSE", "2026-04-03"))
muhurat = cal.session_info("NSE", "2026-11-08")
print("Muhurat:", muhurat.kind, ist(muhurat.open), "to", ist(muhurat.close))
print("NFO close before and after 3 Aug 2026:", ist(cal.session("NFO", "2026-07-31")[1]), ist(cal.session("NFO", "2026-08-03")[1]))

for day in ("2026-07-31", "2026-08-03"):
    times = cal.intraday_times("NSE", day)
    print(day, "entries until", ist(times.entry_until), "square-off", ist(times.square_off))

print(cal.holidays("NSE", 2026)[["date", "name"]].tail(4).to_string(index=False))
print(len(cal.sessions("NSE", "2026-01-01", "2026-12-31")), "NSE sessions in 2026")
print("sessions per year:", round(cal.sessions_per_year("NSE", "2026-01-01", "2026-12-31").value, 2))
print("coverage:", cal.coverage("NSE", 2026), cal.coverage("MCX", 2026), cal.coverage("NSE", 2027))
```

<!-- output -->
```text
Good Friday open: False
Muhurat: special 14:20 to 15:30
NFO close before and after 3 Aug 2026: 15:30 15:40
2026-07-31 entries until 15:00 square-off 15:10
2026-08-03 entries until 14:50 square-off 15:00
      date                                 name
2026-11-08 Diwali Laxmi Pujan (Muhurat trading)
2026-11-10                 Diwali-Balipratipada
2026-11-24   Prakash Gurpurb Sri Guru Nanak Dev
2026-12-25                            Christmas
247 NSE sessions in 2026
sessions per year: 247.17
coverage: sourced unverified template
```

## A calendar of your own

The shared calendar is read-only. Copy it to add a special session or a closure the built-in data does not have, and pass it to `bt.backtest(..., calendar=cal)` or `load_bars(..., calendar=cal)`.

<!-- continues -->
```python
mine = default_calendar().copy()
mine.add_closure("NSE", "2026-12-31", name="Example closure")
mine.add_session("NSE", "2026-12-27", "10:00", "12:00", name="Example Sunday session")
print(mine.is_open("NSE", "2026-12-31"), mine.is_open("NSE", "2026-12-27"))
print(mine.holidays("NSE", 2026)[["date", "name", "open", "close"]].tail(3).to_string(index=False))
```

<!-- output -->
```text
False True
      date                   name  open close
2026-12-25              Christmas  None  None
2026-12-27 Example Sunday session 10:00 12:00
2026-12-31        Example closure  None  None
```

A backtest with a calendar of its own runs its optimization sweeps in one process (see [Optimization](../optimization.md#worker-processes-and-windows)).

## Holidays from your OpenAlgo server

For a year the built-in files do not cover, add the holiday tables your OpenAlgo server serves. Server rows are marked `unverified` and never replace built-in data.

<!-- requires-server -->
```python
from openalgo import api
from openalgo.backtest.calendar import Calendar

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
cal = Calendar.from_openalgo(client, years=[2027])
print(cal.coverage("NSE", 2027))
```
