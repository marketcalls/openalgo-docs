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
| `result.returns` | Simple returns of the equity series, bar to bar |
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

`result.metrics` is a read-only mapping of every figure, and `result.performance` holds the series behind them:

| `result.performance.` | What it holds |
|---|---|
| `metrics` | The figures below (the same as `result.metrics`) |
| `equity` | The equity series that was analysed |
| `drawdown` | Drawdown at every equity point, a fraction from 0 down to -1 |
| `session_returns` | The return of each IST session date |
| `monthly_returns` | Compounded returns per calendar month: rows are years, columns months 1 to 12 |
| `yearly_returns` | Compounded return per calendar year |
| `trades` | The trades table the figures were computed from (closed trades, and positions still open at the end as open trades) |
| `cost_breakdown` | Rupees per cost component over the closed trades |

How the figures are measured:

* **From your capital.** The capital is the opening wealth, so the profit or loss of the first bar and the return of the first session count, and a fall below the capital is a drawdown.
* **Per session.** Returns are taken per IST session date and annualised with the real number of sessions per year of the traded exchange (from the holiday calendar), never a fixed 252. CAGR uses calendar days (365.25 a year) and is NaN for runs shorter than 28 days.
* **After charges.** Net figures subtract every charge. Trade statistics count closed trades only; an open position at the end counts for exposure and turnover.
* `result.metrics` uses a risk-free rate of 0 and no benchmark. For a risk-free rate, a benchmark (alpha, beta, correlation) or deposits and withdrawals, call [`metrics.analyse`](support-functions/metrics.md) on the run's equity and trades.
* A figure the data cannot define is NaN (for example a Sharpe ratio with no variation); a positive figure over a zero denominator is infinite.

<!-- continues -->
```python
m = result.metrics
for key in ("start_equity", "end_equity", "net_profit", "total_return", "cagr", "volatility",
            "sharpe", "sortino", "calmar", "max_drawdown", "exposure", "sessions_per_year"):
    print(f"{key:18} {m[key]:12.4f}")
print(result.performance.monthly_returns.round(4))
```

<!-- output -->
```text
start_equity        100000.0000
end_equity          104688.2800
net_profit            4688.2800
total_return             0.0469
cagr                     0.0794
volatility               0.0844
sharpe                   0.9370
sortino                  1.4483
calmar                   1.1030
max_drawdown            -0.0720
exposure                 0.4497
sessions_per_year      247.1692
month  1   2   3    4       5     6       7       8       9       10   11  12
year
2026  NaN NaN NaN  0.0  0.0077  0.02  0.0516 -0.0595  0.0935 -0.0583  0.0 NaN
```

### Every metric

The table below is `openalgo.backtest.metrics.DEFINITIONS`, the one source the engine and the tearsheet take their labels and definitions from. Units: a **fraction** of 0.01 is one percent; **rupees**; a **ratio** is a pure number; **days** are calendar days; a **timestamp** is an IST time.

#### Run

| Key | Label | Unit | Definition |
|---|---|---|---|
| `start` | Start | timestamp | Time of the first equity point: the starting equity, or with an opening wealth the first mark after it (the opening has no time of its own and is counted from here). |
| `end` | End | timestamp | Time of the last equity point. |
| `elapsed_days` | Elapsed | days | Calendar days from start to end. |
| `sessions` | Sessions | count | IST session dates with an equity point after the start (every point, with an opening wealth); one return each, the first one from the start equity. |
| `missing_sessions` | Missing sessions | count | Calendar sessions of the traded exchanges, between the first and last session date, with no equity point; each one's move is folded into the next return. |
| `start_equity` | Start equity | rupees | The opening wealth (the capital before the first point) when one is given, else the equity at the first point. |
| `end_equity` | End equity | rupees | Equity at the last point. |
| `net_cash_flows` | Net cash flows | rupees | Deposits minus withdrawals in the run. |
| `net_profit` | Net profit | rupees | End equity minus start equity minus net cash flows. |

#### Returns and risk

| Key | Label | Unit | Definition |
|---|---|---|---|
| `total_return` | Total return | fraction | Time-weighted: the product of (1 + session return), minus 1, so measured from the start equity. Cash flows are not returns. |
| `cagr` | CAGR | fraction | (1 + total return) ^ (365.25 / elapsed days) - 1. NaN below 28 elapsed days, -1 after ruin. |
| `volatility` | Volatility | fraction | Sample standard deviation of session returns, times sqrt(sessions per year). |
| `sharpe` | Sharpe ratio | ratio | Mean excess session return over its sample standard deviation, times sqrt(sessions per year). NaN when the deviation is zero. |
| `sortino` | Sortino ratio | ratio | Mean excess session return over the downside deviation sqrt(sum(min(excess, 0)^2) / n), times sqrt(sessions per year). |
| `calmar` | Calmar ratio | ratio | CAGR over the magnitude of the maximum drawdown. |
| `exposure` | Exposure | fraction | Share of the equity series' bars during which a position was open. A bar runs from one equity point to the next; time before the first point is not a bar. |
| `risk_free_rate` | Risk-free rate | fraction | The annual risk-free rate supplied. |
| `risk_free_per_session` | Risk-free per session | fraction | (1 + annual rate) ^ (1 / sessions per year) - 1, subtracted from every session. |
| `sessions_per_year` | Sessions per year | sessions | Sessions of the traded exchanges (union calendar) in the whole calendar years the run touches, scaled to 365.25 days. |
| `annualisation_years` | Annualisation years | text | The calendar years counted for sessions per year. |
| `annualisation_coverage` | Calendar coverage | text | Weakest holiday-data coverage of those years: sourced, unverified or template. |
| `annualisation_template_years` | Template-only years | text | Exchange-years with no holiday list; sessions per year is overstated by them. |

#### Drawdowns

`max_drawdown` is a negative fraction (-0.07 is a 7 percent fall); `max_drawdown_amount` is the largest fall of cumulative P&L in rupees, given as a positive number.

| Key | Label | Unit | Definition |
|---|---|---|---|
| `max_drawdown` | Maximum drawdown | fraction | Deepest fall of the time-weighted wealth index from its running peak, on every equity point. The peak starts at the start equity, so a first point below an opening wealth is a fall. Zero or negative. |
| `max_drawdown_amount` | Maximum drawdown amount | rupees | Largest fall of cumulative P&L (equity less the start equity and cash flows) from its running peak, which starts at 0. |
| `max_drawdown_peak` | Drawdown peak | timestamp | Peak before the maximum drawdown; the start when the peak is the opening wealth. |
| `max_drawdown_trough` | Drawdown trough | timestamp | Lowest point of it. |
| `max_drawdown_recovery` | Drawdown recovery | timestamp | First point back at the peak, or None when not recovered. |
| `max_drawdown_days` | Maximum drawdown length | days | Calendar days from its peak to its recovery, or to the end when unrecovered. |
| `longest_drawdown_days` | Longest drawdown | days | Calendar days of the longest time below a peak, recovered or not. |
| `longest_drawdown_start` | Longest drawdown start | timestamp | Its peak; the start when that is the opening wealth. |
| `longest_drawdown_end` | Longest drawdown end | timestamp | Its recovery, or the last point when unrecovered. |
| `longest_drawdown_recovered` | Longest drawdown recovered | flag | Whether it ended. |
| `ruined` | Ruined | flag | Whether equity before cash flows reached zero or below. |
| `ruin_time` | Ruin | timestamp | When it did, or None. |

#### Trades and costs

| Key | Label | Unit | Definition |
|---|---|---|---|
| `trades` | Trades | count | Closed round trips. |
| `open_trades` | Open trades | count | Trades with no exit; not in trade statistics. |
| `winning_trades` | Winning trades | count | Closed trades with net P&L above zero. |
| `losing_trades` | Losing trades | count | Closed trades with net P&L below zero. |
| `win_rate` | Win rate | fraction | Winning trades over closed trades. |
| `average_win` | Average win | rupees | Mean net P&L of winning trades. |
| `average_loss` | Average loss | rupees | Mean net P&L of losing trades (negative). |
| `profit_factor` | Profit factor | ratio | Sum of winning net P&L over the magnitude of the sum of losing net P&L. |
| `expectancy` | Expectancy | rupees | Mean net P&L per closed trade. |
| `payoff_ratio` | Payoff ratio | ratio | Average win over the magnitude of average loss. |
| `largest_win` | Largest win | rupees | Highest net P&L of a winning trade. |
| `largest_loss` | Largest loss | rupees | Lowest net P&L of a losing trade. |
| `max_consecutive_wins` | Consecutive wins | count | Longest run of wins in exit order; a breakeven trade breaks a run. |
| `max_consecutive_losses` | Consecutive losses | count | Longest run of losses. |
| `average_holding_seconds` | Average holding time | seconds | Mean of exit time minus entry time over closed trades. |
| `gross_pnl` | Gross P&L | rupees | Sum of closed trades' P&L before costs. |
| `total_costs` | Costs | rupees | Sum of closed trades' costs. |
| `net_pnl` | Net P&L | rupees | Sum of closed trades' P&L after costs. |
| `cost_share_of_gross_pnl` | Costs / gross P&L | fraction | Costs over gross P&L; NaN when gross P&L is zero or negative. |
| `turnover` | Turnover | rupees | Traded value: \|price\| x quantity of every entry and every exit. |
| `turnover_ratio` | Turnover ratio | ratio | Turnover over mean equity. |

#### Benchmark (only with a benchmark)

| Key | Label | Unit | Definition |
|---|---|---|---|
| `benchmark_total_return` | Benchmark return | fraction | Benchmark value at the end over its first value in the run (as of the start, which with an opening wealth is its last value before the first point; else as of the first session end it covers), minus 1. |
| `benchmark_sessions` | Benchmark sessions | count | Sessions with both a strategy and a benchmark return. |
| `alpha` | Alpha | fraction | Jensen's alpha per year: (mean(s - rf) - beta * mean(b - rf)) x sessions per year. |
| `beta` | Beta | ratio | cov(strategy, benchmark) / var(benchmark), per session. |
| `correlation` | Correlation | ratio | Pearson correlation of session returns. |

## The HTML tearsheet

`result.tearsheet("report.html")` writes a single, self-contained HTML file and returns its path; `result.tearsheet()` returns the HTML as a string. It needs no plotting package and no internet connection: the charts are inline SVG, there is no script, and the page follows the reader's light or dark setting and reads on a phone. Rupee amounts use Indian digit grouping (12,34,567.89) and lakh and crore units.

Its sections: headline figures, equity with the drawdown underneath, monthly returns as a heat grid, yearly returns, the distribution of trade P&L, the trade list, costs, the Assumptions (every setting and every warning of the run, so a run without charges says so on the report), and notes with the definition of every figure.

<!-- continues -->
```python
path = result.tearsheet("ema_cross.html")
print(path)
```

<!-- output -->
```text
ema_cross.html
```

To render a report for figures you computed yourself, pass a `Performance` to `openalgo.backtest.report.tearsheet(performance, path, title=...)`.

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
