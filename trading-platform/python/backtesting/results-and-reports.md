# Results and Reports

`bt.backtest` returns a `Result`. It holds every table of the run as a pandas DataFrame, every performance figure, an HTML tearsheet, the settings the run used, and what is needed to run it again.

The examples on this page use the EMA crossover of the [overview](README.md#your-first-backtest-in-five-minutes). This first block runs it; the blocks after it continue from it.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

sessions = bt.calendar.default_calendar().sessions("NSE", "2026-04-01", "2026-11-06")
k = np.arange(len(sessions))
close = (1000 + k + 60 * np.sin(k / 6) + 10 * np.sin(k / 1.3)).round(1)
open_ = (close - 4 * np.sin(1.3 * k)).round(1)
bars = pd.DataFrame(
    {
        "open": open_,
        "high": np.maximum(open_, close) + 6,
        "low": np.minimum(open_, close) - 6,
        "close": close,
        "volume": 50_000,
    },
    index=pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata"),
)


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 5
    slow = 20

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) <= self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCross, data=bars, capital=100_000)
```

## The tables

Times are IST (`time`, `entry_time`, `exit_time` columns, time-zone aware); columns ending in `_ts` are the same instants as UTC nanoseconds. Prices and money are rupees, quantities are units.

| Property | What it holds |
|---|---|
| `result.fills` | One row per fill: time, side, units, price, where in the bar it filled (`fill_at`: open, level, close), `reason`, order id, `target_index`, flags, charges |
| `result.orders` | Every order with its final status, filled units, average price and `reject_code` |
| `result.trades` | Closed round trips: entry and exit time and price, units, gross P&L, charges, net P&L, `exit_reason`, number of fills |
| `result.positions` | The position history: one row whenever a position or its stop, targets or trail changed |
| `result.equity` | One row per base bar, indexed by its IST close: equity, realized and unrealized P&L, charges so far, margin blocked, exposure |
| `result.returns` | Simple returns of the equity series, bar to bar; the first bar is measured from the capital |
| `result.events` | Every order, position and risk event in the order it happened; `result.risk_events` keeps the risk events |
| `result.final_positions` | Every position at the end, open ones marked at the last close |
| `result.stale_marks` | Open positions marked at an earlier close because a bar was missing |
| `result.costs` | What each fill was charged, component by component (see [Costs](costs-slippage-and-margin.md#charges)) |
| `result.contract_notes` | One row per contract note, with the rounding adjustment |
| `result.skipped` | Orders a sizer sized to zero, with the reason |
| `result.gross_pnl` | `{"realized", "unrealized", "total"}` before charges |
| `result.assumptions` | Every setting the run used, defaults resolved |
| `result.warnings` | What you must know about the result, most important first |
| `result.to_dataframes()` | The main tables in one dict |

<!-- continues -->
```python
trades = result.trades
columns = ["entry_time", "exit_time", "entry_units", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]
print(trades[columns].round(2).to_string(index=False))
print(result.equity[["equity_rupees", "costs_rupees", "margin_rupees"]].tail(2).round(2))
```

<!-- output -->
```text
               entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2026-05-26 09:15:00+05:30 2026-06-25 09:15:00+05:30        97.57             1023.65            1054.75         2793.84
2026-07-22 09:15:00+05:30 2026-08-20 09:15:00+05:30        95.00             1080.75            1071.45        -1126.35
2026-09-11 09:15:00+05:30 2026-10-15 09:15:00+05:30        93.32             1088.15            1123.15         3021.56
                           equity_rupees  costs_rupees  margin_rupees
time
2026-11-05 15:30:00+05:30      104688.28        728.97            0.0
2026-11-06 15:30:00+05:30      104688.28        728.97            0.0
```

## Performance figures

`result.metrics` is a read-only mapping of every figure (100 of them without a benchmark), and `result.performance` holds the series and tables behind them:

| `result.performance.` | What it holds |
|---|---|
| `metrics` | The figures (the same as `result.metrics`); every one is defined on [Metric Definitions](metric-definitions.md) |
| `equity` | The equity series that was analysed |
| `wealth` | The time-weighted wealth index at each equity point: 1 at the opening, so the cumulative return is `wealth - 1` |
| `drawdown` | Drawdown at every equity point, a fraction from 0 down to -1 |
| `drawdown_episodes`, `drawdown_details(top=5)` | Every drawdown episode, and the deepest ones |
| `session_returns` | The return of each IST session date |
| `monthly_returns`, `yearly_returns` | Compounded returns per calendar month (rows are years, columns months 1 to 12) and per year |
| `rolling` | Rolling volatility, Sharpe, Sortino and win rate (and beta, with a benchmark) over trailing windows of sessions |
| `horizons` | The horizon summary: the last 1, 3 and 6 months, 1, 3 and 5 years, and since the start |
| `losing_streaks` | How many runs of losing sessions and of losing trades of each length the run had |
| `benchmark_returns`, `benchmark_comparison(period)` | With a benchmark: its session returns, and the strategy against it per year or month |
| `trades` | The trades table the figures were computed from (closed trades, and positions still open at the end as open trades) |
| `cost_breakdown` | Rupees per cost component over the closed trades |

The [Metrics](support-functions/metrics.md) support page shows each of these tables with an example.

### How the figures are measured

* **From your capital and from the first bar's open.** The capital is the *opening wealth* and the open of the run's first bar the *opening time*. So the profit or loss of the first bar and the return of the first session count, a fall below the capital is a drawdown, and the start, the elapsed days, CAGR and exposure are counted from the first bar's open (here 09:15 on 1 April, not that day's close).
* **Drawdowns are zero or negative.** `max_drawdown` is a fraction (-0.072 is a fall of 7.2 percent from the peak) and `max_drawdown_amount` is in rupees (a fall of Rs 7,887 is -7,887). Episode depths, the conditional drawdown and the drawdowns of the horizon summary and of Monte Carlo follow the same rule. Durations and the ulcer index are zero or positive.
* **Per session.** Returns are taken per IST session date and annualised with the real number of sessions per year of the traded exchange (from the holiday calendar), never a fixed 252. CAGR uses calendar days (365.25 a year) and is NaN for runs shorter than 28 days.
* **After charges.** Net figures subtract every charge. Trade statistics count closed trades only; an open position at the end counts for exposure and turnover.
* `result.metrics` uses a risk-free rate of 0 and no benchmark. For a risk-free rate, a benchmark (alpha, beta, R squared, tracking error, information and Treynor ratios) or deposits and withdrawals, call [`metrics.analyse`](support-functions/metrics.md) on the run's equity and trades.
* A figure the data cannot define is NaN (for example a Sharpe ratio with no variation); a positive figure over a zero denominator is infinite.

<!-- continues -->
```python
m = result.metrics
print("start", m["start"], "| elapsed days", round(m["elapsed_days"], 2))
for key in ("start_equity", "end_equity", "net_profit", "total_return", "cagr", "volatility",
            "sharpe", "sortino", "calmar", "max_drawdown", "max_drawdown_amount", "exposure",
            "sessions_per_year", "probabilistic_sharpe", "value_at_risk", "ulcer_index"):
    print(f"{key:22} {m[key]:12.4f}")
print(result.performance.monthly_returns.round(4))
```

<!-- output -->
```text
start 2026-04-01 09:15:00+05:30 | elapsed days 219.26
start_equity            100000.0000
end_equity              104688.2800
net_profit                4688.2800
total_return                 0.0469
cagr                         0.0793
volatility                   0.0844
sharpe                       0.9370
sortino                      1.4483
calmar                       1.1016
max_drawdown                -0.0720
max_drawdown_amount      -7887.4103
exposure                     0.4467
sessions_per_year          247.1692
probabilistic_sharpe         0.7681
value_at_risk               -0.0099
ulcer_index                  0.0394
month  1   2   3    4       5     6       7       8       9       10   11  12
year
2026  NaN NaN NaN  0.0  0.0077  0.02  0.0516 -0.0595  0.0935 -0.0583  0.0 NaN
```

### Every metric, as a table

The figures fall into nine groups: run, returns and risk, drawdown, trades, benchmark, risk-adjusted ratios, session returns, tail risk and trade ratios (eight without a benchmark). [Metric Definitions](metric-definitions.md) lists every key with its label, unit and definition.

`result.metrics_table()` gives them all as a DataFrame, indexed by key, with the columns `group`, `label`, `value`, `unit` and `definition`, so you can filter, sort or export them:

<!-- continues -->
```python
table = result.metrics_table()
print(len(table), "metrics in", table["group"].nunique(), "groups")
risk_adjusted = table[table["group"] == "Risk-adjusted ratios"]
print(risk_adjusted[["label", "value"]].head(6).to_string())
```

<!-- output -->
```text
100 metrics in 8 groups
                                                         label     value
key
smart_sharpe                                      Smart Sharpe  0.270024
smart_sortino                                    Smart Sortino  0.417358
adjusted_sortino                              Adjusted Sortino   1.02408
probabilistic_sharpe                      Probabilistic Sharpe  0.768106
probabilistic_sortino                    Probabilistic Sortino   0.87181
probabilistic_adjusted_sortino  Probabilistic adjusted Sortino  0.788458
```

### Monte Carlo

`result.monte_carlo()` asks how the run might have gone with its sessions in another order. It draws thousands of alternative runs, each made of the run's own session returns drawn at random with replacement (`resample="trades"` draws its closed trades instead), measures each one like the run, and reports the spread: percentiles of the final return, CAGR, maximum drawdown and Sharpe, a band of cumulative returns, and how often a drawdown limit (`bust=`) or a return goal (`goal=`) was reached. A fixed `seed` gives the same simulations every time, on every platform.

<!-- continues -->
```python
study = result.monte_carlo(simulations=500, seed=7, bust=-0.10, goal=0.05)
print(study.percentiles.loc[[0.05, 0.5, 0.95]].round(4))
print("this run:", {key: round(value, 4) for key, value in study.actual.items()})
print("paths with a 10% drawdown:", study.bust_probability, "| paths reaching +5%:", study.goal_probability)
```

<!-- output -->
```text
            final_return    cagr  max_drawdown  sharpe
percentile
0.05             -0.0597 -0.0974       -0.1024 -1.1965
0.50              0.0401  0.0677       -0.0500  0.8207
0.95              0.1647  0.2891       -0.0271  3.0542
this run: {'final_return': 0.0469, 'cagr': 0.0793, 'max_drawdown': -0.072, 'sharpe': 0.937}
paths with a 10% drawdown: 0.058 | paths reaching +5%: 0.44
```

The run's own maximum drawdown of -7.2 percent is deeper than the median path's (-5.0 percent) but well inside the simulated range. In 5.8 percent of the paths (about one in seventeen) the drawdown reached 10 percent, and 44 percent of them ended at least 5 percent up. The [Metrics](support-functions/metrics.md#monte-carlo) page describes every option and table of a study.

## The HTML tearsheet

`result.tearsheet(path, mode="full", log_scale=False)` writes a single, self-contained HTML file and returns its path; without a path it returns the HTML as a string. It needs no plotting package and no internet connection: the charts are inline SVG, there is no script, and the page follows the reader's light or dark setting and reads on a phone. Rupee amounts use Indian digit grouping (12,34,567.89) and lakh and crore units.

Four modes:

| `mode=` | What the page holds |
|---|---|
| `"full"` (default) | Headline figures and fact lists; equity with its longest drawdowns shaded and the drawdown underneath; cumulative return (against the benchmark, when one is given); session return bars; monthly returns as a heat grid; yearly returns; the return distribution by period and its histogram; the worst drawdowns; rolling volatility, Sharpe, Sortino, win rate and beta; the horizon summary; the yearly benchmark comparison (with a benchmark); Monte Carlo (1,000 runs from the session returns, fixed seed); the trade P&L distribution; the trade list; losing streaks; costs; the assumptions; and notes with every definition used |
| `"basic"` | Headline and basic facts, equity, monthly and yearly returns, the worst drawdowns, trades, costs, assumptions and notes |
| `"metrics"` | Every metric with its value and definition, and the assumptions |
| `"charts"` | Every chart and nothing else |

`log_scale=True` draws the cumulative return on a logarithmic scale of growth, which keeps a long run's early years readable. The Assumptions section lists every setting and every warning of the run, so a run without charges says so on the report.

<!-- continues -->
```python
for mode in ("full", "basic", "metrics", "charts"):
    path = result.tearsheet(f"ema_cross_{mode}.html", mode=mode, log_scale=True)
    print(path)

summary = result.tearsheet(mode="basic")
print(summary.startswith("<!DOCTYPE html>"), "Backtest summary" in summary, "<script" in summary)
```

<!-- output -->
```text
ema_cross_full.html
ema_cross_basic.html
ema_cross_metrics.html
ema_cross_charts.html
True True False
```

To render a report for figures you computed yourself, pass a `Performance` to `openalgo.backtest.report.tearsheet(performance, path, title=..., mode=..., log_scale=...)`, and use `openalgo.backtest.report.metrics_table(performance)` for its table.

## Reproducing a run

Every result carries a **manifest**: what is needed to reproduce it, or to tell that it can no longer be reproduced.

| Key | What it records |
|---|---|
| `engine_version` | The version of the engine that ran it |
| `strategy` | Module, class name, a SHA-256 hash of its source, and its parameter values |
| `arguments` | Every argument after defaults were resolved |
| `instruments` | Each instrument's terms as used (lot, tick, freeze quantity, expiry) |
| `data` | A SHA-256 hash of the bars of every month the run used, per symbol |
| `reference_tables`, `cost_schedules` | The versions of the reference data and charge schedules |
| `random_seed` | Always `None`: nothing in a backtest is random |
| `platform` | Python, NumPy and pandas versions and the operating system |

The manifest holds plain JSON types, so `json.dumps(result.manifest)` saves it. It never holds your API key: a client is recorded only as `"given"`.

`result.rerun()` runs the same backtest again: the same strategy class, client and arguments. With no changes the new result is identical to the original, bit for bit. Pass any `bt.backtest` argument or strategy parameter to change it. If the data the source returns has changed since (other monthly hashes), the rerun's first warning says it is not a reproduction.

<!-- continues -->
```python
import json

print(result.manifest["strategy"]["parameters"], result.manifest["random_seed"])
print(len(json.dumps(result.manifest)) > 0)

again = result.rerun()
print("identical:", again.fills.equals(result.fills) and again.equity.equals(result.equity))

faster = result.rerun(fast=3, slow=15)
print("fast=3, slow=15 net profit:", round(faster.metrics["net_profit"], 2))
```

<!-- output -->
```text
{'fast': 5, 'slow': 20} None
True
identical: True
fast=3, slow=15 net profit: 11917.48
```
