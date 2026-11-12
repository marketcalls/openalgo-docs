# Metrics

`openalgo.backtest.metrics` computes performance figures from an equity curve: returns, CAGR, volatility, Sharpe and Sortino ratios, drawdowns, exposure, trade statistics, costs, turnover, monthly and yearly returns, and, with a benchmark, alpha, beta and correlation. Every backtest result uses it (`result.metrics`), and you can call it on any equity curve: a backtest with a benchmark and a risk-free rate added, your live account, or several strategies combined. The per-bar work runs in the Rust core.

Two things make the figures fit Indian markets:

* **Real sessions per year.** Volatility, Sharpe, Sortino and alpha are annualised with the number of sessions the traded exchanges actually had in the years the run touches (from the holiday calendar), never a fixed 252 or 365. A year without a holiday list is reported, with a warning.
* **Returns per session.** Each IST session date gets one return, the time-weighted change of wealth from the previous session's last mark; deposits and withdrawals change equity but are not returns.

Every figure is defined in `metrics.DEFINITIONS` (key, label, unit and definition); [Results and Reports](../results-and-reports.md#every-metric) lists them all.

## Main functions

| Function | Returns |
|---|---|
| `analyse(equity, *, exchanges, trades=None, cash_flows=None, benchmark=None, risk_free_rate=0.0, calendar=None, opening_wealth=None)` | A `Performance`: `.metrics`, `.equity`, `.drawdown`, `.session_returns`, `.monthly_returns`, `.yearly_returns`, `.trades`, `.cost_breakdown`, `.benchmark_equity` |
| `combine_equity(equities, *, opening_wealth=None)` | The combined equity of strategies run on fixed capital allocations |
| `return_correlation(strategies)` | The correlation matrix of the strategies' session returns |
| `DEFINITIONS` | Every metric's label, unit and definition |
| `openalgo.backtest.report.tearsheet(performance, path=None, title=None)` | The HTML tearsheet of a `Performance` |

The inputs of `analyse`:

* `equity`: a pandas Series of equity in rupees, indexed by time-zone-aware times (or UTC nanoseconds), strictly increasing; each point is the marked equity at that time.
* `opening_wealth`: the capital before the first point. Pass it whenever the first point can already hold profit or loss (it always can for a backtest; `Result.performance` passes the run's capital). Without it, the first point is taken as the starting equity and belongs to no session.
* `exchanges`: the exchanges traded (`"NSE"`, or `["NFO", "MCX"]`); their calendars give the sessions per year.
* `trades`: one row per round trip with `entry_time`, `exit_time` (NaT while open), `entry_price`, `exit_price`, `quantity` (units), `side` (`"BUY"` or `"SELL"`), `gross_pnl`, `costs` and `net_pnl`; optional cost columns are summed into `cost_breakdown`.
* `benchmark`: index or price levels indexed by time (NIFTY 50 closes, for example).
* `risk_free_rate`: annual, as a fraction (`0.065` is 6.5 percent). A value written in percent (6.5) is refused.
* `cash_flows`: deposits (positive) and withdrawals (negative) in rupees, indexed by time.

## Example

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo.backtest import metrics, report

# One equity point and one benchmark close per NSE session, 1 April to 6 November 2026.
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-04-01", "2026-11-06")
closes = pd.DatetimeIndex(pd.to_datetime(sessions["close"], utc=True)).tz_convert("Asia/Kolkata")
k = np.arange(len(sessions))
equity = pd.Series(500_000 * (1 + 0.0006 * k + 0.01 * np.sin(k / 7)), index=closes)
nifty = pd.Series(25_000 * (1 + 0.0004 * k + 0.008 * np.sin(k / 9)), index=closes)

performance = metrics.analyse(equity, exchanges="NSE", benchmark=nifty, risk_free_rate=0.065, opening_wealth=500_000)
m = performance.metrics
for key in ("total_return", "cagr", "volatility", "sharpe", "sortino", "max_drawdown",
            "benchmark_total_return", "alpha", "beta", "correlation", "sessions_per_year"):
    print(f"{key:22} {m[key]:9.4f}   {metrics.DEFINITIONS[key].label}")

print(report.tearsheet(performance, "my_curve.html", title="My equity curve"))
```

<!-- output -->
```text
total_return              0.0959   Total return
cagr                      0.1650   CAGR
volatility                0.0150   Volatility
sharpe                    5.8546   Sharpe ratio
sortino                  12.0508   Sortino ratio
max_drawdown             -0.0084   Maximum drawdown
benchmark_total_return    0.0536   Benchmark return
alpha                     0.0957   Alpha
beta                     -0.2817   Beta
correlation              -0.1824   Correlation
sessions_per_year       247.1692   Sessions per year
my_curve.html
```

## A backtest with a benchmark and a risk-free rate

`result.metrics` uses a risk-free rate of 0 and no benchmark. To add them, analyse the run's own equity and trades again:

<!-- continues -->
```python
from openalgo import ta


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"

    def init(self):
        self.fast = self.I(ta.ema, self.close, 5)
        self.slow = self.I(ta.ema, self.close, 20)

    def on_bar(self, bar):
        if len(self.close) <= 20:
            return
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            self.buy()
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


close = (1000 + k + 60 * np.sin(k / 6) + 10 * np.sin(k / 1.3)).round(1)
open_ = (close - 4 * np.sin(1.3 * k)).round(1)
bars = pd.DataFrame(
    {"open": open_, "high": np.maximum(open_, close) + 6, "low": np.minimum(open_, close) - 6,
     "close": close, "volume": 50_000},
    index=pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata"),
)
result = bt.backtest(EmaCross, data=bars, capital=100_000)

with_benchmark = metrics.analyse(
    result.equity["equity_rupees"],
    exchanges="NSE",
    trades=result.performance.trades,
    benchmark=nifty,
    risk_free_rate=0.065,
    opening_wealth=100_000,
)
for key in ("net_profit", "sharpe", "alpha", "beta"):
    print(f"{key:10} plain {result.metrics.get(key, float('nan')):10.4f}   with benchmark {with_benchmark.metrics[key]:10.4f}")
```

<!-- output -->
```text
net_profit plain  4688.2800   with benchmark  4688.2800
sharpe     plain     0.9370   with benchmark     0.1903
alpha      plain        nan   with benchmark     0.0071
beta       plain        nan   with benchmark     0.4024
```

`alpha` and `beta` exist only when a benchmark is given, so the plain run shows NaN for them here, and its Sharpe ratio is higher because it subtracts no risk-free return.

## Several strategies

Strategies run on fixed capital allocations combine by adding their equity curves. Give each one's capital to `combine_equity`, and analyse the sum with the combined capital as the opening wealth:

<!-- continues -->
```python
reversion = pd.Series(300_000 * (1 + 0.0003 * k - 0.005 * np.sin(k / 5)), index=closes)
combined = metrics.combine_equity(
    {"trend": equity, "reversion": reversion},
    opening_wealth={"trend": 500_000, "reversion": 300_000},
)
portfolio = metrics.analyse(combined, exchanges="NSE", opening_wealth=800_000)
print("combined total return:", round(portfolio.metrics["total_return"], 4))

reversion_performance = metrics.analyse(reversion, exchanges="NSE", opening_wealth=300_000)
print(metrics.return_correlation({"trend": performance, "reversion": reversion_performance}).round(3))
```

<!-- output -->
```text
combined total return: 0.0786
           trend  reversion
trend      1.000     -0.106
reversion -0.106      1.000
```
