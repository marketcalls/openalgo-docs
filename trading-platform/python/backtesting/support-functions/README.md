# Support Functions

The backtesting engine is built from parts you can also use on their own, without running a backtest: a trading calendar, a cost calculator, contract facts, resampling, data loading and performance figures. Each works without an OpenAlgo server unless you ask it to fetch prices from one.

A first taste: the full charges of 100 SBIN shares bought at the open of 11 November 2026 and sold at that day's close, intraday, at prices from your OpenAlgo server. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the OpenAlgo client and the cost calculator
from openalgo import api
from openalgo.backtest import costs

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# SBIN's daily bar of 11 November 2026; iloc[0] picks its one row
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2026-11-11", end_date="2026-11-11").iloc[0]

# Brokerage, taxes and fees of buying 100 shares at the open and selling at the close (MIS: intraday)
trip = costs.round_trip_cost(sbin["open"], sbin["close"], 100, "2026-11-11", exchange="NSE", product="MIS")
print(f"Charges: Rs {trip.total:,.2f}")
```

<!-- output -->
```text
Charges: Rs 84.82
```

| Page | What it is for |
|---|---|
| [Session Calendar](calendar.md) (`openalgo.backtest.calendar`) | Trading days, session hours, holidays and the intraday cut-off times of every OpenAlgo exchange |
| [Cost Calculator](cost-calculator.md) (`openalgo.backtest.costs`) | The full charges of an Indian trade on any date, under any brokerage preset |
| [Instruments and Reference Data](reference-data.md) (`openalgo.backtest.reference`) | Lot sizes, freeze quantities, tick sizes and expiries of futures and options, by date |
| [Resampling](resampling.md) (`openalgo.backtest.resample`) | 15-minute, hourly or daily bars built from 1-minute bars, the way Historify builds them |
| [Data Loading](data-loading.md) (`openalgo.backtest.data`) | Bars from your OpenAlgo server or your own, checked and cached |
| [Metrics](metrics.md) (`openalgo.backtest.metrics`) | Performance figures, drawdowns, Monte Carlo and the HTML report for any equity curve |

Like the rest of the engine, these modules are a preview: available from SDK 2.1.0, with an interface that may still change. `import openalgo` does not load them, and importing them makes no network call.
