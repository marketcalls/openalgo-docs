# Metrics

`openalgo.backtest.metrics` turns an **equity curve** (the value of an account after every session) into performance figures: returns and risk, risk-adjusted ratios, drawdowns and their episodes, the distribution and tails of session returns, trade statistics and ratios, costs and turnover, monthly and yearly returns, rolling statistics, a horizon summary, and, with a benchmark, alpha, beta, R squared, tracking error and the information and Treynor ratios. It also runs Monte Carlo studies. Every backtest result uses it (`result.metrics`), and you can call it on any equity curve: a backtest with a benchmark and a risk-free rate added, your live account, or several strategies combined. The calculations run in the Rust core.

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
* `benchmark`: index or price levels indexed by time-zone-aware times (NIFTY 50 closes, for example), each stamped when its session closed. Unlike `bt.backtest(benchmark=)`, `analyse` does not accept plain dates; the example below shows how to stamp them.
* `risk_free_rate`: annual, as a fraction (`0.065` is 6.5 percent). A value written in percent (6.5) is refused.
* `cash_flows`: deposits (positive) and withdrawals (negative) in rupees, indexed by time.

## Example

The examples on this page analyse a real backtest: the EMA crossover of the [overview](../README.md#your-first-backtest-in-five-minutes) on RELIANCE daily bars from your OpenAlgo server, 1 January 2021 to 11 November 2026, with Rs 1,00,000. An EMA (exponential moving average) is an average of recent closes that weights the latest days most; the strategy buys when the 20-day EMA rises above the 50-day EMA and sells when it falls back below.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before it.

<!-- requires-server -->
```python
import pandas as pd

import openalgo.backtest as bt
from openalgo import api, ta
from openalgo.backtest import metrics

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "D"  # daily bars
    fast = 20  # days
    slow = 50

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(result.equity["equity_rupees"].tail(3).round(2))
```

<!-- output -->
```text
time
2026-11-08 15:30:00+05:30    91241.38
2026-11-09 15:30:00+05:30    91624.16
2026-11-11 15:30:00+05:30    92385.16
Name: equity_rupees, dtype: float64
```

`result.equity["equity_rupees"]` is the equity curve: the account value at the close of every session. That Series is what `metrics.analyse` measures.

A **benchmark** is what you compare the strategy with; here the NIFTY 50 index. `load_bars` returns its daily bars with a `ts_close` column, the instant each session closed (in UTC nanoseconds). This block makes a Series of NIFTY closes stamped at those instants, which is the form `analyse` needs. It starts in December 2020, so the first session of the run already has a benchmark return.

<!-- requires-server -->
<!-- continues -->
```python
nifty_bars, _ = bt.data.load_bars("NIFTY", "NSE_INDEX", "D", "2020-12-01", "2026-11-11", client=client)
closed_at = pd.to_datetime(nifty_bars["ts_close"], utc=True).dt.tz_convert("Asia/Kolkata")
nifty = pd.Series(nifty_bars["close"].to_numpy(), index=closed_at)
print(len(nifty), "NIFTY closes,", nifty.index[0], "to", nifty.index[-1])
```

<!-- output -->
```text
1475 NIFTY closes, 2020-12-01 15:30:00+05:30 to 2026-11-11 15:30:00+05:30
```

Now the analysis, with NIFTY as the benchmark and a **risk-free rate** of 6.5 percent a year: what a safe deposit would have paid, which the Sharpe ratio and alpha subtract. `opening_wealth` is the capital and `opening_time` the open of the run's first bar, the way the backtest measures itself:

<!-- requires-server -->
<!-- continues -->
```python
performance = metrics.analyse(
    result.equity["equity_rupees"],
    exchanges="NSE",
    trades=result.performance.trades,
    benchmark=nifty,
    risk_free_rate=0.065,
    opening_wealth=100_000,
    opening_time=result.metrics["start"],
)
m = performance.metrics
for key in ("total_return", "cagr", "volatility", "sharpe", "max_drawdown",
            "benchmark_total_return", "alpha", "beta", "correlation", "sessions_per_year"):
    print(f"{key:22} {m[key]:9.4f}   {metrics.DEFINITIONS[key].label}")
```

<!-- output -->
```text
total_return             -0.0761   Total return
cagr                     -0.0134   CAGR
volatility                0.1511   Volatility
sharpe                   -0.4308   Sharpe ratio
max_drawdown             -0.2459   Maximum drawdown
benchmark_total_return    0.8063   Benchmark return
alpha                    -0.0867   Alpha
beta                      0.4528   Beta
correlation               0.4207   Correlation
sessions_per_year       247.8899   Sessions per year
```

Over these years the crossover lost 7.6 percent while NIFTY 50 gained 80.6 percent. A **beta** of 0.45 means that on an average session the strategy moved about 0.45 percent for each 1 percent move of NIFTY, partly because it held RELIANCE only part of the time. **Alpha**, the yearly return beyond what that beta explains, after the risk-free rate, is -8.7 percent. The Sharpe ratio is negative because the strategy earned less than the safe deposit.

## The same benchmark inside the backtest

`result.metrics` uses a risk-free rate of 0, and a benchmark only when the run is given one (`bt.backtest(benchmark=...)`, see [A benchmark](../results-and-reports.md#a-benchmark)). Given `benchmark="NIFTY"`, the backtest reads the same closes from your server and gives the same beta and correlation as `analyse`. Only alpha differs, because the run subtracts no risk-free return:

<!-- requires-server -->
<!-- continues -->
```python
in_run = result.rerun(benchmark="NIFTY")  # the same run, with NIFTY as its benchmark
for key in ("alpha", "beta", "correlation"):
    print(f"{key:12} in the run {in_run.metrics[key]:8.4f}   analysed {performance.metrics[key]:8.4f}")
```

<!-- output -->
```text
alpha        in the run  -0.0523   analysed  -0.0867
beta         in the run   0.4528   analysed   0.4528
correlation  in the run   0.4207   analysed   0.4207
```

## Rolling statistics

`performance.rolling` recomputes volatility, Sharpe, Sortino and the session win rate (and beta, with a benchmark) over a trailing window of sessions, one row per session date. A strategy whose rolling Sharpe drifts down, or whose rolling volatility climbs, is changing character even when the totals look fine. The window is `rolling_window=` sessions (half a year of sessions by default, `metrics["rolling_window_sessions"]`); rows are NaN until a window is full.

One row from each year of the run (every 250th session):

<!-- requires-server -->
<!-- continues -->
```python
print("window:", performance.metrics["rolling_window_sessions"], "sessions")
print(performance.rolling.dropna().iloc[::250].round(3).to_string())
```

<!-- output -->
```text
window: 124 sessions
            volatility  sharpe  sortino  win_rate   beta
date
2021-07-02       0.082  -1.181   -1.501     0.542  0.021
2022-07-05       0.235  -0.735   -1.084     0.455  0.590
2023-07-10       0.109   1.508    3.040     0.562  0.368
2024-07-11       0.244   0.590    0.906     0.496  1.135
2025-07-30       0.176  -0.469   -0.707     0.468  0.766
2026-08-05       0.053  -2.893   -2.889     0.400  0.058
```

## Drawdown episodes

A **drawdown** is a fall of the equity from its highest point so far, lasting until the equity gets back to that point. `performance.drawdown_episodes` lists every drawdown in the order they started: `start` (the peak), `trough`, `end` (the recovery, NaT while unrecovered), `recovered`, `depth` (a fraction, zero or negative), `days` (peak to recovery, or to the last point when unrecovered), `days_to_trough` and `days_to_recover`, in calendar days. `performance.drawdown_details(top=5)` returns the `top` deepest, deepest first.

The three deepest drawdowns of the run:

<!-- requires-server -->
<!-- continues -->
```python
worst = performance.drawdown_details(3)
print(worst[["start", "trough", "end", "depth", "days"]].round(4).to_string())
```

<!-- output -->
```text
                         start                    trough                       end   depth    days
rank
1    2021-10-19 15:30:00+05:30 2025-04-07 15:30:00+05:30                       NaT -0.2459  1849.0
2    2021-06-15 15:30:00+05:30 2021-07-28 15:30:00+05:30 2021-09-03 15:30:00+05:30 -0.0945    80.0
3    2021-09-07 15:30:00+05:30 2021-09-14 15:30:00+05:30 2021-09-23 15:30:00+05:30 -0.0297    16.0
```

The deepest drawdown started at the equity peak of 19 October 2021 and reached its bottom on 7 April 2025, 24.6 percent lower. The end is `NaT` because the equity had still not returned to that peak on 11 November 2026, 1,849 days later.

## Horizon summary

`performance.horizons` measures the last month, 3 months, 6 months, year, 3 years and 5 years (those the run covers) and the whole run since the start: the date each window starts after, sessions, total return, CAGR, volatility, Sharpe, maximum drawdown and, with a benchmark, the benchmark's return and `benchmark_sessions`, the sessions of the window with a benchmark return. It answers "how has this done lately" next to "how has it done overall".

<!-- requires-server -->
<!-- continues -->
```python
print(performance.horizons[["sessions", "total_return", "sharpe", "max_drawdown", "benchmark_return"]].round(4).to_string())
```

<!-- output -->
```text
             sessions  total_return  sharpe  max_drawdown  benchmark_return
horizon
1M                 22        0.0125  2.5424        0.0000            0.1214
3M                 63        0.0125 -0.7523        0.0000            0.0320
6M                127       -0.0057 -2.5756       -0.0212            0.0604
1Y                248       -0.0624 -1.4768       -0.1343           -0.0171
3Y                744       -0.0340 -0.4515       -0.2299            0.3001
5Y               1240       -0.1768 -0.5872       -0.2299            0.4130
Since start      1453       -0.0761 -0.4308       -0.2459            0.8063
```

## Losing streaks

`performance.losing_streaks` counts how many runs of losing sessions, and of losing closed trades in exit order, the run had of each length. A strategy you cannot sit through eight losing days in a row is a strategy you will abandon at the wrong time; this table shows how long its bad runs were.

<!-- requires-server -->
<!-- continues -->
```python
streaks = performance.losing_streaks
print(streaks[(streaks["sessions"] > 0) | (streaks["trades"] > 0)].to_string())
```

<!-- output -->
```text
        sessions  trades
length
1             76       2
2             45       2
3             24       0
4             15       1
5              3       0
6              2       0
9              1       0
```

The longest run of losing sessions was 9 in a row, and the longest run of losing trades 4.

## Benchmark comparison

One rule gives every benchmark return: the run's `benchmark_total_return`, the "Since start" and other rows of the horizon summary, and each period of `benchmark_comparison` compound the benchmark's session returns over the span. A session has a benchmark return only when it and the session before it both have a benchmark close of their own (for the first session, the close of the calendar session before it); **a missing close is never filled from a neighbouring day**, so it leaves its session and the next one without a benchmark return. A span with no benchmark return at all is NaN. Alpha, beta, correlation, R squared, tracking error, the information and Treynor ratios and rolling beta use only the sessions with both a strategy and a benchmark return, counted in `benchmark_sessions` (for the run and for each row of the horizon summary). Give the benchmark one close before the first equity point when you want the first session to count; `bt.backtest(benchmark=)` does this for you.

With a benchmark, `performance.benchmark_comparison("year")` or `("month")` sets the strategy's compounded return against the benchmark's for each calendar year or month: `strategy`, `benchmark`, `excess` (strategy minus benchmark) and `beat` (True when the strategy did better). `performance.benchmark_returns` holds the benchmark's session returns on the strategy's session dates.

<!-- requires-server -->
<!-- continues -->
```python
print(performance.benchmark_comparison("year").round(4).to_string())
```

<!-- output -->
```text
      strategy  benchmark  excess   beat
year
2021    0.0673     0.2412 -0.1738  False
2022   -0.1226     0.0433 -0.1659  False
2023    0.0760     0.2003 -0.1243  False
2024   -0.0039     0.0880 -0.0920  False
2025    0.0323     0.1051 -0.0728  False
2026   -0.1084    -0.0335 -0.0749  False
```

NIFTY beat the crossover in every year of the run.

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

<!-- requires-server -->
<!-- continues -->
```python
study = metrics.monte_carlo(performance, simulations=1_000, seed=7, bust=-0.30, goal=0.25)
print(study.percentiles.loc[[0.05, 0.25, 0.5, 0.75, 0.95]].round(4).to_string())
print("the run:", {key: round(value, 4) for key, value in study.actual.items()})
print("drawdown of 30% or more:", study.bust_probability, "| a 25% return or more:", study.goal_probability)
```

<!-- output -->
```text
            final_return    cagr  max_drawdown  sharpe
percentile
0.05             -0.4908 -0.1088       -0.5738 -1.1286
0.25             -0.2780 -0.0541       -0.4505 -0.7098
0.50             -0.0558 -0.0098       -0.3548 -0.4055
0.75              0.2108  0.0332       -0.2779 -0.1264
0.95              0.7059  0.0954       -0.1957  0.2599
the run: {'final_return': -0.0761, 'cagr': -0.0134, 'max_drawdown': -0.2459, 'sharpe': -0.4308}
drawdown of 30% or more: 0.672 | a 25% return or more: 0.213
```

Read the 5th percentile row as a sober case: with these session returns in an unlucky order, one path in twenty did no better than that. The share of paths that reached the `bust` drawdown is a plain answer to "how likely is a fall I could not stomach".

## Several strategies

Strategies run on fixed capital allocations combine by adding their equity curves. Give each one's capital to `combine_equity`, and analyse the sum with the combined capital as the opening wealth. Here the same crossover also runs on SBIN with its own Rs 1,00,000:

<!-- requires-server -->
<!-- continues -->
```python
class SbinCrossover(EmaCrossover):
    symbol = "SBIN"  # everything else as in EmaCrossover


sbin = bt.backtest(SbinCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
combined = metrics.combine_equity(
    {"RELIANCE": result.equity["equity_rupees"], "SBIN": sbin.equity["equity_rupees"]},
    opening_wealth={"RELIANCE": 100_000, "SBIN": 100_000},
)
both = metrics.analyse(combined, exchanges="NSE", opening_wealth=200_000)
for name, run in (("RELIANCE", result), ("SBIN", sbin)):
    print(f"{name:9} total return {run.metrics['total_return']:8.4f}")
print(f"together  total return {both.metrics['total_return']:8.4f}")
```

<!-- output -->
```text
RELIANCE  total return  -0.0761
SBIN      total return   0.5327
together  total return   0.2283
```

`return_correlation` says how closely the two strategies' session returns moved together (1 is in lockstep, 0 is unrelated):

<!-- requires-server -->
<!-- continues -->
```python
print(metrics.return_correlation({"RELIANCE": result.performance, "SBIN": sbin.performance}).round(3))
```

<!-- output -->
```text
          RELIANCE   SBIN
RELIANCE     1.000  0.284
SBIN         0.284  1.000
```

## Reports

`openalgo.backtest.report.tearsheet(performance, path=None, *, title=None, mode="full", log_scale=False)` renders any `Performance` as the same self-contained HTML report a backtest produces: `"full"` (every section), `"basic"` (the essentials), `"metrics"` (every metric with its definition) or `"charts"` (every chart). `log_scale=True` draws the cumulative return on a logarithmic scale. [Results and Reports](../results-and-reports.md#the-html-tearsheet) lists what each mode holds.

The full report of the analysis with NIFTY and the risk-free rate, written to a file you open in your browser:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest import report

print(report.tearsheet(performance, "reliance_vs_nifty.html", title="RELIANCE EMA crossover against NIFTY 50"))
```

<!-- output -->
```text
reliance_vs_nifty.html
```

`report.metrics_table(performance)` returns every metric as a DataFrame, with its group, label, value, unit and definition:

<!-- requires-server -->
<!-- continues -->
```python
table = report.metrics_table(performance)
print(table.loc[["sharpe", "smart_sharpe", "omega", "ulcer_index", "beta"], ["group", "label", "value"]].round(4).to_string())
```

<!-- output -->
```text
                             group         label     value
key
sharpe            Returns and risk  Sharpe ratio -0.430819
smart_sharpe  Risk-adjusted ratios  Smart Sharpe  -0.44109
omega         Risk-adjusted ratios   Omega ratio  0.896393
ulcer_index   Risk-adjusted ratios   Ulcer index  0.166837
beta                     Benchmark          Beta  0.452772
```
