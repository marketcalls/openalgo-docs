# Session Calendar

`openalgo.backtest.calendar` knows, for every OpenAlgo exchange and date, whether the exchange is open, when its session opens and closes, and the default intraday times. The backtest uses it on every run, and you can use it on its own to plan a run, count trading days or check your data.

The first example checks the built-in calendar against real bars from your OpenAlgo server: the NSE trading days of 1 to 11 November 2026, and the days SBIN has a daily bar. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the OpenAlgo client and the built-in calendar
from openalgo import api
from openalgo.backtest.calendar import default_calendar

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# The NSE trading days from the calendar: a table with one row per session
cal = default_calendar()
sessions = cal.sessions("NSE", "2026-11-01", "2026-11-11")
print("calendar :", [str(day) for day in sessions["date"]])  # a list of the dates, as text

# The days SBIN has a daily bar on your OpenAlgo server
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-01", end_date="2026-11-11")
print("SBIN bars:", [str(day.date()) for day in bars.index])
```

<!-- output -->
```text
calendar : ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-11']
SBIN bars: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-11']
```

The two lists match. Sunday 8 November 2026 is a trading day, NSE's Diwali Muhurat trading session, and Tuesday 10 November is a holiday, Diwali Balipratipada.

## Is the exchange open on a day?

`cal.is_open(exchange, day)` answers yes or no. This block and the ones after it read only the built-in calendar, so they need no server; run them in order. Good Friday, 3 April 2026:

```python
# Load the built-in calendar
from openalgo.backtest.calendar import default_calendar

cal = default_calendar()
print("NSE open on Good Friday:", cal.is_open("NSE", "2026-04-03"))
```

<!-- output -->
```text
NSE open on Good Friday: False
```

## Session hours

`cal.session_info(exchange, day)` gives a session's open and close, and whether it is a regular or a special session. The engine keeps times in UTC nanoseconds (a count from 1970), so this block first defines a small function that shows them as Indian clock times:

<!-- continues -->
```python
import pandas as pd


# A function (def) is a named piece of code you can call again.
# This one turns a time in UTC nanoseconds into an IST clock time such as "09:15".
def ist(nanos):
    return pd.Timestamp(nanos, tz="UTC").tz_convert("Asia/Kolkata").strftime("%H:%M")


# A regular day, and the Muhurat trading session of Diwali
regular = cal.session_info("NSE", "2026-11-11")
muhurat = cal.session_info("NSE", "2026-11-08")
print("11 November:", regular.kind, ist(regular.open), "to", ist(regular.close))
print("8 November :", muhurat.kind, ist(muhurat.open), "to", ist(muhurat.close))
```

<!-- output -->
```text
11 November: regular 09:15 to 15:30
8 November : special 14:20 to 15:30
```

## Intraday times

An intraday (MIS) position must be opened before a cut-off time and is squared off (closed) at a set time before the session ends. Both times are dated, because the exchange changes them. NSE changed them on 3 August 2026:

<!-- continues -->
```python
# A for loop runs the indented lines once for each day in the list
for day in ("2026-07-31", "2026-08-03"):
    times = cal.intraday_times("NSE", day)
    print(day, "entries until", ist(times.entry_until), "| square-off", ist(times.square_off))
```

<!-- output -->
```text
2026-07-31 entries until 15:00 | square-off 15:10
2026-08-03 entries until 14:50 | square-off 15:00
```

## Holidays of a year

`cal.holidays(exchange, year)` lists the year's closures and special sessions, with their names. The last four of NSE in 2026:

<!-- continues -->
```python
print(cal.holidays("NSE", 2026)[["date", "name"]].tail(4).to_string(index=False))  # tail(4): the last four rows
```

<!-- output -->
```text
      date                                 name
2026-11-08 Diwali Laxmi Pujan (Muhurat trading)
2026-11-10                 Diwali-Balipratipada
2026-11-24   Prakash Gurpurb Sri Guru Nanak Dev
2026-12-25                            Christmas
```

## Counting trading days

`cal.sessions(exchange, start, end)` has one row per session, so its length is the number of trading days:

<!-- continues -->
```python
print(len(cal.sessions("NSE", "2026-01-01", "2026-12-31")), "NSE trading days in 2026")
```

<!-- output -->
```text
247 NSE trading days in 2026
```

## A calendar of your own

The built-in calendar is read-only. To add a day the exchange announces it will close, copy it, add the closure and pass the copy to `bt.backtest(..., calendar=mine)`:

<!-- continues -->
```python
mine = default_calendar().copy()  # an editable copy
mine.add_closure("NSE", "2026-12-31", name="Example closure")
print("open on 31 December:", mine.is_open("NSE", "2026-12-31"))
```

<!-- output -->
```text
open on 31 December: False
```

`mine.add_session("NSE", "2026-12-27", "10:00", "12:00", name="...")` adds a special session the same way.

## Holidays from your OpenAlgo server

For a year the built-in lists do not cover yet, add the holiday tables your OpenAlgo server serves:

<!-- output-varies -->
<!-- requires-server -->
```python
# Load the OpenAlgo client and the Calendar class
from openalgo import api
from openalgo.backtest.calendar import Calendar

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# A calendar with the server's 2027 holidays added
cal = Calendar.from_openalgo(client, years=[2027])
print(cal.coverage("NSE", 2027))
```

<!-- output -->
```text
template
```

The output depends on what your server holds. When this page was last run, in November 2026, the server had no 2027 list yet, so 2027 stayed `template`: weekdays open, weekends closed. Once the server serves the list, the same line prints `unverified`.

## More options

* Built-in holiday lists cover 2019 to 2026 for NSE, BSE, NFO, BFO, MCX, CDS and BCD, with special sessions (Muhurat trading, Budget-day sessions). `NSE_INDEX` and `BSE_INDEX` follow NSE and BSE.
* Regular hours are dated: NFO closes at 15:30, at 15:40 from 3 August 2026 and at 15:45 from 7 December 2026; MCX closes at 23:55, or 23:30 while the United States is on daylight saving time.
* Every date has a coverage level, from `cal.coverage(exchange, day_or_year)`: `sourced` (from a cited exchange or regulator document), `unverified` (loaded but not confirmed) or `template` (no holiday list for that year, so only weekends are closed). A year without a list is reported, never treated as holiday-free. `session_info(...).hours_unverified` flags session hours not yet confirmed.
* `cal.session(exchange, day)` gives `(open, close)` in UTC nanoseconds, or `None` when closed. Dates are IST dates; times are IST `"HH:MM"` text or UTC nanoseconds.
* `cal.sessions_per_year(exchanges, start, end)` is the number the metrics annualise with.
* `cal.validate_intraday(bars, exchange=, interval=)` checks an intraday series and raises `TimestampError` for wrong timestamps.
* `cal.set_regular_hours(...)` and `cal.add_holidays(response)` edit a copy too; `Calendar(builtin=False)` has weekdays and regular hours only.
* A backtest given a calendar of its own runs its optimization sweeps in one process (see [Optimization](../optimization.md)).
