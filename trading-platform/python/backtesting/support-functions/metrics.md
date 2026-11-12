# Metrics

`openalgo.backtest.metrics` computes performance figures from an equity curve: returns and risk, risk-adjusted ratios, drawdowns and their episodes, the distribution and tails of session returns, trade statistics and ratios, costs and turnover, monthly and yearly returns, rolling statistics, a horizon summary, and, with a benchmark, alpha, beta, R squared, tracking error and the information and Treynor ratios. It also runs Monte Carlo studies. Every backtest result uses it (`result.metrics`), and you can call it on any equity curve: a backtest with a benchmark and a risk-free rate added, your live account, or several strategies combined. The calculations run in the Rust core.

Two things make the figures fit Indian markets:

* **Real sessions per year.** Volatility, Sharpe, Sortino and alpha are annualised with the number of sessions the traded exchanges actually had in the years the run touches (from the holiday calendar), never a fixed 252 or 365. A year without a holiday list is reported, with a warning.
* **Returns per session.** Each IST session date gets one return, the time-weighted change of wealth from the previous session's last mark; deposits and withdrawals change equity but are not returns.

Every figure is defined in `metrics.DEFINITIONS` (key, label, unit and definition) and grouped in `metrics.GROUPS`; [Metric Definitions](../metric-definitions.md) lists them all. Every drawdown figure is zero or negative: `max_drawdown` as a fraction, `max_drawdown_amount` in rupees (a fall of Rs 500 is -500).

## Main functions

| Function | Returns |
|---|---|
| `analyse(equity, *, exchanges, trades=None, cash_flows=None, benchmark=None, risk_free_rate=0.0, calendar=None, opening_wealth=None, opening_time=None, rolling_window=None)` | A `Performance`: `.metrics`, `.equity`, `.wealth`, `.drawdown`, `.drawdown_episodes`, `.drawdown_details(top)`, `.session_returns`, `.monthly_returns`, `.yearly_returns`, `.rolling`, `.horizons`, `.losing_streaks`, `.trades`, `.cost_breakdown`, `.benchmark_equity`, `.benchmark_returns`, `.benchmark_comparison(period)` |
| `monte_carlo(performance, *, simulations=1000, seed=2026, resample="sessions", bust=None, goal=None)` | A `MonteCarlo` study (below) |
| `combine_equity(equities, *, opening_wealth=None)` | The combined equity of strategies run on fixed capital allocations |
| `return_correlation(strategies)` | The correlation matrix of the strategies' session returns |
| `DEFINITIONS`, `GROUPS` | Every metric's label, unit and definition, and the groups the reports show them in |
| `openalgo.backtest.report.tearsheet(performance, path=None, title=None, mode="full", log_scale=False)` | The HTML tearsheet of a `Performance` (see [Reports](#reports)) |
| `openalgo.backtest.report.metrics_table(performance)` | Every metric as a DataFrame: group, label, value, unit and definition |

The inputs of `analyse`:

* `equity`: a pandas Series of equity in rupees, indexed by time-zone-aware times (or UTC nanoseconds), strictly increasing; each point is the marked equity at that time.
* `opening_wealth`: the capital before the first point. Pass it whenever the first point can already hold profit or loss (it always can for a backtest; `Result.performance` passes the run's capital). Without it, the first point is taken as the starting equity and belongs to no session.
* `opening_time`: the instant the account opened with that capital, before the first point (only with `opening_wealth`). The start, the elapsed days and CAGR are counted from it, exposure counts the time up to the first point, and a drawdown from the opening is timed from it. `Result.performance` passes the open of the run's first bar. Without it, the opening is timed at the first point.
* `rolling_window`: the sessions in each window of the rolling statistics, 2 or more; by default half a year of sessions of the traded calendar.
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

def session_closes(start, end):
    """The IST close of every NSE session from start to end."""
    sessions = bt.calendar.default_calendar().sessions("NSE", start, end)
    return sessions, pd.DatetimeIndex(pd.to_datetime(sessions["close"], utc=True)).tz_convert("Asia/Kolkata")


# One equity point per NSE session from 1 April to 6 November 2026. The benchmark starts
# one session earlier, so its level when the account opened is known.
sessions, closes = session_closes("2026-04-01", "2026-11-06")
k = np.arange(len(sessions))
equity = pd.Series(500_000 * (1 + 0.0006 * k + 0.01 * np.sin(k / 7)), index=closes)
_, benchmark_closes = session_closes("2026-03-30", "2026-11-06")
j = np.arange(len(benchmark_closes))
nifty = pd.Series(25_000 * (1 + 0.0004 * j + 0.008 * np.sin(j / 9)), index=benchmark_closes)

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
benchmark_total_return    0.0535   Benchmark return
alpha                     0.0938   Alpha
beta                     -0.2495   Beta
correlation              -0.1617   Correlation
sessions_per_year       247.1692   Sessions per year
my_curve.html
```

## A backtest with a benchmark and a risk-free rate

`result.metrics` uses a risk-free rate of 0 and no benchmark. To add them, analyse the run's own equity and trades again, with its capital as the opening wealth and its first bar's open (`result.metrics["start"]`) as the opening time, as `result.performance` does:

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
    opening_time=result.metrics["start"],
)
for key in ("net_profit", "sharpe", "alpha", "beta"):
    print(f"{key:10} plain {result.metrics.get(key, float('nan')):10.4f}   with benchmark {with_benchmark.metrics[key]:10.4f}")
```

<!-- output -->
```text
net_profit plain  4688.2800   with benchmark  4688.2800
sharpe     plain     0.9370   with benchmark     0.1903
alpha      plain        nan   with benchmark     0.0067
beta       plain        nan   with benchmark     0.4091
```

`alpha` and `beta` exist only when a benchmark is given, so the plain run shows NaN for them here, and its Sharpe ratio is higher because it subtracts no risk-free return.

## Rolling statistics

`performance.rolling` recomputes volatility, Sharpe, Sortino and the session win rate (and beta, with a benchmark) over a trailing window of sessions, one row per session date. A strategy whose rolling Sharpe drifts down, or whose rolling volatility climbs, is changing character even when the totals look fine. The window is `rolling_window=` sessions (half a year of sessions by default, `metrics["rolling_window_sessions"]`); rows are NaN until a window is full.

<!-- continues -->
```python
two_months = metrics.analyse(
    result.equity["equity_rupees"],
    exchanges="NSE",
    benchmark=nifty,
    opening_wealth=100_000,
    opening_time=result.metrics["start"],
    rolling_window=42,
)
print("window:", two_months.metrics["rolling_window_sessions"], "sessions")
print(two_months.rolling.dropna().iloc[::20].round(3).to_string())
```

<!-- output -->
```text
window: 42 sessions
            volatility  sharpe  sortino  win_rate   beta
date
2026-06-03       0.056   4.936  696.085     0.833 -0.058
2026-07-02       0.094   1.767    2.876     0.500 -2.317
2026-07-30       0.100   2.950    5.074     0.560 -6.769
2026-08-27       0.090  -0.677   -0.910     0.455 -1.161
2026-09-25       0.110   2.191    3.620     0.556  3.105
2026-10-27       0.093   1.892    3.333     0.522  4.971
```

## Drawdown episodes

`performance.drawdown_episodes` lists every drawdown in the order they started: `start` (the peak), `trough`, `end` (the recovery, NaT while unrecovered), `recovered`, `depth` (a fraction, zero or negative), `days` (peak to recovery, or to the last point when unrecovered), `days_to_trough` and `days_to_recover`, in calendar days. `performance.drawdown_details(top=5)` returns the `top` deepest, deepest first.

<!-- continues -->
```python
worst = with_benchmark.drawdown_details(3)
print(worst[["start", "trough", "end", "depth", "days", "days_to_recover"]].round(4).to_string())
```

<!-- output -->
```text
                         start                    trough                       end   depth  days  days_to_recover
rank
1    2026-08-04 15:30:00+05:30 2026-08-20 15:30:00+05:30 2026-09-28 15:30:00+05:30 -0.0720  55.0             39.0
2    2026-09-30 15:30:00+05:30 2026-10-15 15:30:00+05:30                       NaT -0.0583  37.0              NaN
3    2026-06-16 15:30:00+05:30 2026-07-22 15:30:00+05:30 2026-08-03 15:30:00+05:30 -0.0527  48.0             12.0
```

## Horizon summary and losing streaks

`performance.horizons` measures the last month, 3 months, 6 months, year, 3 years and 5 years (those the run covers) and the whole run since the start: the date each window starts after, sessions, total return, CAGR, volatility, Sharpe, maximum drawdown and, with a benchmark, the benchmark's return. It answers "how has this done lately" next to "how has it done overall".

`performance.losing_streaks` counts how many runs of losing sessions, and of losing closed trades in exit order, the run had of each length. A strategy you cannot sit through eight losing days in a row is a strategy you will abandon at the wrong time; this table shows how long its bad runs were.

<!-- continues -->
```python
print(with_benchmark.horizons.round(4).to_string())
streaks = with_benchmark.losing_streaks
print(streaks[(streaks["sessions"] > 0) | (streaks["trades"] > 0)].to_string())
```

<!-- output -->
```text
                   from  sessions  total_return    cagr  volatility  sharpe  max_drawdown  benchmark_return
horizon
1M           2026-10-06        22       -0.0396 -0.3789      0.0524 -9.8345       -0.0396           -0.0054
3M           2026-08-06        63       -0.0360 -0.1354      0.0928 -2.1824       -0.0638            0.0199
6M           2026-05-06       127        0.0469  0.0952      0.0917  0.3312       -0.0720            0.0393
Since start  2026-04-01       150        0.0469  0.0793      0.0844  0.1903       -0.0720            0.0535
        sessions  trades
length
1              3       1
3              1       0
5              1       0
6              1       0
7              1       0
10             1       0
```

## Benchmark comparison

With a benchmark, `performance.benchmark_comparison("year")` or `("month")` sets the strategy's compounded return against the benchmark's for each calendar year or month: `strategy`, `benchmark`, `excess` (strategy minus benchmark) and `beat` (True when the strategy did better). `performance.benchmark_returns` holds the benchmark's session returns on the strategy's session dates.

<!-- continues -->
```python
print(with_benchmark.benchmark_comparison("month").round(4).to_string())
```

<!-- output -->
```text
         strategy  benchmark  excess   beat
month
2026-04    0.0000     0.0144 -0.0144  False
2026-05    0.0077    -0.0061  0.0138   True
2026-06    0.0200     0.0187  0.0014   True
2026-07    0.0516     0.0076  0.0440   True
2026-08   -0.0595     0.0000 -0.0595  False
2026-09    0.0935     0.0222  0.0713   True
2026-10   -0.0583    -0.0027 -0.0556  False
2026-11    0.0000    -0.0013  0.0013   True
```

## Monte Carlo

A backtest is one path through history. `metrics.monte_carlo(performance, ...)` (or `result.monte_carlo(...)` for a run) asks how different the outcome could have been with the same ingredients in another order:

* `resample="sessions"` (default) draws the run's session returns at random with replacement and compounds them into each path. `resample="trades"` draws the closed trades' net P&L in rupees and books them one after another on the start equity at fixed rupee size; a path whose equity reaches zero is ruined there.
* Each of the `simulations` paths has as many draws as the run had, and is measured like the run: final return, CAGR over the run's elapsed time, maximum drawdown and Sharpe.
* `seed` fixes the random draws: the same inputs and seed give the same simulations, bit for bit, on every platform.
* `bust` (a maximum drawdown between -1 and 0) and `goal` (a final return) add the share of paths that reached them.

A `MonteCarlo` study holds:

| Attribute | What it holds |
|---|---|
| `runs` | One row per path: `final_return`, `cagr`, `max_drawdown`, `sharpe` |
| `percentiles` | Those figures at the 1st, 5th, 10th, 25th, 50th, 75th, 90th, 95th and 99th percentiles |
| `band` | The cumulative return of the paths after each number of draws, at the 5th, 25th, 50th, 75th and 95th percentiles |
| `actual`, `actual_path` | The same figures, and the cumulative return, of the run's own sequence |
| `bust_probability`, `goal_probability` | The share of paths that reached `bust` and `goal` (NaN when not asked) |
| `simulations`, `seed`, `resample`, `bust`, `goal` | The settings of the study |

<!-- continues -->
```python
study = metrics.monte_carlo(with_benchmark, simulations=1_000, seed=7, bust=-0.10, goal=0.10)
print(study.percentiles.loc[[0.05, 0.25, 0.5, 0.75, 0.95]].round(4).to_string())
print("the run:", {key: round(value, 4) for key, value in study.actual.items()})
print("drawdown of 10% or more:", study.bust_probability, "| a 10% return or more:", study.goal_probability)
print(study.band.tail(1).round(4).to_string())
```

<!-- output -->
```text
            final_return    cagr  max_drawdown  sharpe
percentile
0.05             -0.0603 -0.0984       -0.1012 -1.9665
0.25              0.0038  0.0064       -0.0670 -0.6122
0.50              0.0430  0.0726       -0.0496  0.1195
0.75              0.0901  0.1545       -0.0377  0.9821
0.95              0.1658  0.2912       -0.0263  2.3278
the run: {'final_return': 0.0469, 'cagr': 0.0793, 'max_drawdown': -0.072, 'sharpe': 0.1903}
drawdown of 10% or more: 0.054 | a 10% return or more: 0.204
         0.05    0.25   0.50    0.75    0.95
draws
150   -0.0603  0.0038  0.043  0.0901  0.1658
```

Read the 5th percentile row as a sober case: with these session returns in an unlucky order, one path in twenty did no better than that. The share of paths that reached the `bust` drawdown is a plain answer to "how likely is a fall I could not stomach".

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

## Reports

`openalgo.backtest.report.tearsheet(performance, path=None, *, title=None, mode="full", log_scale=False)` renders any `Performance` as the same self-contained HTML report a backtest produces: `"full"` (every section), `"basic"` (the essentials), `"metrics"` (every metric with its definition) or `"charts"` (every chart). `log_scale=True` draws the cumulative return on a logarithmic scale. [Results and Reports](../results-and-reports.md#the-html-tearsheet) lists what each mode holds. `report.metrics_table(performance)` returns every metric as a DataFrame.

<!-- continues -->
```python
from openalgo.backtest import report

print(report.tearsheet(with_benchmark, "ema_cross_charts.html", title="EMA crossover", mode="charts", log_scale=True))
table = report.metrics_table(with_benchmark)
print(table.loc[["sharpe", "smart_sharpe", "omega", "ulcer_index", "beta"], ["group", "label", "value"]].round(4).to_string())
```

<!-- output -->
```text
ema_cross_charts.html
                             group         label     value
key
sharpe            Returns and risk  Sharpe ratio  0.190334
smart_sharpe  Risk-adjusted ratios  Smart Sharpe   0.05485
omega         Risk-adjusted ratios   Omega ratio  1.043417
ulcer_index   Risk-adjusted ratios   Ulcer index  0.039351
beta                     Benchmark          Beta   0.40913
```
