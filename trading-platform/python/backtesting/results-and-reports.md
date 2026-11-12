# Results and Reports

`bt.backtest` runs your strategy on past prices and gives back a `Result`: everything the run did and how well it did. It holds every table of the run (orders, fills, trades, the equity curve) as a pandas DataFrame, every performance figure, an HTML report, the settings the run used, and what is needed to run it again. The *equity curve* is the value of your account (cash plus open positions) after every bar.

The examples on this page use the EMA crossover of the [overview](README.md#your-first-backtest-in-five-minutes). An EMA (exponential moving average) is an average of recent closing prices that gives more weight to the latest days. The strategy buys RELIANCE when its 20-day EMA rises above its 50-day EMA and sells when it falls back below, on daily bars from your OpenAlgo server, from 1 January 2021 to 11 November 2026, with Rs 1,00,000.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` and run this block first. Every block after it continues from it, so run them in order in the same Python session.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

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
print(f"Net profit: Rs {result.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
Net profit: Rs -7,614.84
```

## The tables

Every table is a pandas DataFrame, so you can print it, filter it or save it like any other. A few words used below: a *fill* is one executed order at one price; a *trade* is a round trip, from the fill that opens a position to the fill that closes it; *P&L* is profit and loss.

Times are IST (`time`, `entry_time`, `exit_time` columns, time-zone aware); columns ending in `_ts` are the same instants as UTC nanoseconds. Prices and money are rupees, quantities are units (shares, never lots).

| Property | What it holds |
|---|---|
| `result.fills` | One row per fill: time, side, units, price, where in the bar it filled (`fill_at`: open, level, close), `reason`, order id, `target_index`, flags, charges |
| `result.orders` | Every order with its final status, filled units, average price, `reject_code`, `tag` and `sizer` (the sizer that set its quantity, if one did) |
| `result.trades` | Closed round trips: entry and exit time and price, units, gross P&L, charges, net P&L, `exit_reason`, number of fills, `initial_risk_rupees` and `r_multiple` (see [R-multiples](#r-multiples)) |
| `result.positions` | The position history: one row whenever a position or its stop, targets or trail changed |
| `result.equity` | One row per base bar, indexed by its IST close: equity, realized and unrealized P&L, charges so far, margin blocked, exposure |
| `result.returns` | Simple returns of the equity series, bar to bar; the first bar is measured from the capital |
| `result.events` | Every order, position and risk event in the order it happened; `result.risk_events` keeps the risk events |
| `result.final_positions` | Every position at the end, open ones marked at the last close |
| `result.stale_marks` | Open positions marked at an earlier close because a bar was missing |
| `result.costs` | What each fill was charged, component by component (see [Costs](costs-slippage-and-margin.md#charges)) |
| `result.contract_notes` | One row per contract note, with the rounding adjustment |
| `result.skipped` | Orders a sizer sized to zero (`rounded_to_zero`) or a size cap left no room for (`cap`), with the reason |
| `result.settlements`, `result.rolls` | Futures runs: the daily mark to market and settlement postings, and every roll (see [Futures](futures.md#mark-to-market-and-settlement)) |
| `result.r_summary` | The R-multiples of the closed trades (see [R-multiples](#r-multiples)) |
| `result.gross_pnl` | `{"realized", "unrealized", "total"}` before charges |
| `result.assumptions` | Every setting the run used, defaults resolved |
| `result.warnings` | What you must know about the result, most important first |
| `result.to_dataframes()` | The main tables in one dict |

The first five trades of the run. Each row is one trade: when it was bought and sold, how many shares, at what prices, and the profit after charges. `entry_units` has decimals because `self.buy()` with no quantity invests all the capital (see [Costs, Slippage and Margin](costs-slippage-and-margin.md#reinvest-and-size-caps) for whole shares).

<!-- requires-server -->
<!-- continues -->
```python
columns = ["entry_time", "exit_time", "entry_units", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]
print(result.trades[columns].head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-06-01 09:15:00+05:30 2021-07-29 09:15:00+05:30        96.73             1032.55             978.70        -5442.05
2021-08-16 09:15:00+05:30 2021-12-01 09:15:00+05:30        92.17             1024.65            1159.35        12176.42
2022-01-14 09:15:00+05:30 2022-01-31 09:15:00+05:30        88.22             1208.45            1124.65        -7638.45
2022-03-23 09:15:00+05:30 2022-06-27 09:15:00+05:30        82.30             1202.70            1212.65          581.56
2022-08-12 09:15:00+05:30 2022-09-22 09:15:00+05:30        80.63             1234.75            1184.55        -4281.15
```

The last three points of the equity curve: the account value at each session's close, the charges paid so far, and the margin blocked (the money tied up in the open position):

<!-- requires-server -->
<!-- continues -->
```python
print(result.equity[["equity_rupees", "costs_rupees", "margin_rupees"]].tail(3).round(2))
```

<!-- output -->
```text
                           equity_rupees  costs_rupees  margin_rupees
time
2026-11-08 15:30:00+05:30       91241.38       3537.65           0.00
2026-11-09 15:30:00+05:30       91624.16       3646.06       91112.28
2026-11-11 15:30:00+05:30       92385.16       3646.06       91112.28
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
| `horizons` | The horizon summary: the last 1, 3 and 6 months, 1, 3 and 5 years, and since the start; with a benchmark, its return and `benchmark_sessions` for each span |
| `losing_streaks` | How many runs of losing sessions and of losing trades of each length the run had |
| `benchmark_returns`, `benchmark_comparison(period)` | With a benchmark: its session returns, and the strategy against it per year or month |
| `trades` | The trades table the figures were computed from (closed trades, and positions still open at the end as open trades) |
| `cost_breakdown` | Rupees per cost component over the closed trades |

The [Metrics](support-functions/metrics.md) support page shows each of these tables with an example.

### How the figures are measured

* **From your capital and from the first bar's open.** The capital is the *opening wealth* and the open of the run's first bar the *opening time*. So the profit or loss of the first bar and the return of the first session count, a fall below the capital is a drawdown, and the start, the elapsed days, CAGR and exposure are counted from the first bar's open (here 09:15 on 1 January 2021, not that day's close).
* **Drawdowns are zero or negative.** `max_drawdown` is a fraction (this run's -0.2459 is a fall of 24.59 percent from its highest equity) and `max_drawdown_amount` is in rupees (its fall of Rs 29,511.49 is -29,511.49). Episode depths, the conditional drawdown and the drawdowns of the horizon summary and of Monte Carlo follow the same rule. Durations and the ulcer index are zero or positive.
* **Per session.** Returns are taken per IST session date and annualised with the real number of sessions per year of the traded exchange (from the holiday calendar), never a fixed 252. CAGR uses calendar days (365.25 a year) and is NaN for runs shorter than 28 days.
* **After charges.** Net figures subtract every charge. Trade statistics count closed trades only; an open position at the end counts for exposure and turnover.
* `result.metrics` uses a risk-free rate of 0, and no benchmark unless you pass `benchmark=` (see [A benchmark](#a-benchmark)). For a risk-free rate or deposits and withdrawals, call [`metrics.analyse`](support-functions/metrics.md) on the run's equity and trades. The run's benchmark return, the "Since start" row of the horizon summary and `benchmark_comparison` all take a span's benchmark return by one rule, the one in the [`benchmark_total_return` definition](metric-definitions.md#benchmark); a span with no benchmark return is NaN.
* The figures cover the run up to its end, which can be before `end` (see [Where a run ends](#where-a-run-ends)).
* A figure the data cannot define is NaN (for example a Sharpe ratio with no variation); a positive figure over a zero denominator is infinite.

The headline figures of the run. `total_return` and `max_drawdown` are fractions (-0.0761 is a loss of 7.61 percent); `cagr` is the yearly growth rate; `sharpe` and `sortino` measure return per unit of risk (higher is better); `exposure` is the share of the time a position was open:

<!-- requires-server -->
<!-- continues -->
```python
m = result.metrics
for key in ("start_equity", "end_equity", "net_profit", "total_return", "cagr", "volatility",
            "sharpe", "sortino", "max_drawdown", "max_drawdown_amount", "exposure", "sessions_per_year"):
    print(f"{key:20} {m[key]:12.4f}")
```

<!-- output -->
```text
start_equity          100000.0000
end_equity             92385.1586
net_profit             -7614.8414
total_return              -0.0761
cagr                      -0.0134
volatility                 0.1511
sharpe                    -0.0141
sortino                   -0.0204
max_drawdown              -0.2459
max_drawdown_amount   -29511.4889
exposure                   0.4584
sessions_per_year        247.8899
```

The return of each calendar year, as a fraction:

<!-- requires-server -->
<!-- continues -->
```python
print(result.performance.yearly_returns.round(4).to_string())
```

<!-- output -->
```text
year
2021    0.0673
2022   -0.1226
2023    0.0760
2024   -0.0039
2025    0.0323
2026   -0.1084
```

### Every metric, as a table

The figures fall into nine groups: run, returns and risk, drawdown, trades, benchmark, risk-adjusted ratios, session returns, tail risk and trade ratios (eight without a benchmark). [Metric Definitions](metric-definitions.md) lists every key with its label, unit and definition.

`result.metrics_table()` gives them all as a DataFrame, indexed by key, with the columns `group`, `label`, `value`, `unit` and `definition`, so you can filter, sort or export them:

<!-- requires-server -->
<!-- continues -->
```python
table = result.metrics_table()
print(table[table["group"] == "Risk-adjusted ratios"][["label", "value"]].head(6).to_string())
```

<!-- output -->
```text
                                                         label     value
key
smart_sharpe                                      Smart Sharpe -0.014396
smart_sortino                                    Smart Sortino -0.020909
adjusted_sortino                              Adjusted Sortino  -0.01444
probabilistic_sharpe                      Probabilistic Sharpe  0.486429
probabilistic_sortino                    Probabilistic Sortino  0.480296
probabilistic_adjusted_sortino  Probabilistic adjusted Sortino  0.486063
```

### Monte Carlo

`result.monte_carlo()` asks how the run might have gone with its sessions in another order. It draws thousands of alternative runs, each made of the run's own session returns drawn at random with replacement (`resample="trades"` draws its closed trades instead), measures each one like the run, and reports the spread: percentiles of the final return, CAGR, maximum drawdown and Sharpe, a band of cumulative returns, and how often a drawdown limit (`bust=`) or a return goal (`goal=`) was reached. A fixed `seed` gives the same simulations every time, on every platform.

<!-- requires-server -->
<!-- continues -->
```python
study = result.monte_carlo(simulations=500, seed=7, bust=-0.30, goal=0.25)
print(study.percentiles.loc[[0.05, 0.5, 0.95]].round(4))
print("this run:", {key: round(value, 4) for key, value in study.actual.items()})
print("paths with a 30% drawdown:", study.bust_probability, "| paths reaching +25%:", study.goal_probability)
```

<!-- output -->
```text
            final_return    cagr  max_drawdown  sharpe
percentile
0.05             -0.4948 -0.1100       -0.5874 -0.7132
0.50             -0.0468 -0.0081       -0.3529  0.0210
0.95              0.6893  0.0936       -0.1985  0.6328
this run: {'final_return': -0.0761, 'cagr': -0.0134, 'max_drawdown': -0.2459, 'sharpe': -0.0141}
paths with a 30% drawdown: 0.654 | paths reaching +25%: 0.228
```

Read it like this: the real run lost 7.6 percent with a drawdown of 24.6 percent. Shuffled into 500 other orders, the same session returns gave a median path that lost 4.7 percent, and 65 percent of the paths had a drawdown of 30 percent or more at some point. A strategy whose returns are this spread out needs a long test before you trust it. The [Metrics](support-functions/metrics.md#monte-carlo) page describes every option and table of a study.

## A benchmark

`bt.backtest(benchmark=...)` compares the strategy with an index or any price series of your own. The benchmark never trades and never changes a fill; it adds the benchmark figures to `result.metrics` (alpha, beta, correlation, R squared, tracking error, information ratio, Treynor ratio), rolling beta, the benchmark columns of the horizon summary, `benchmark_comparison()` and the benchmark lines of the tearsheet. There is no default: without `benchmark=` the run has no benchmark figures.

| `benchmark=` | What the run compares with |
|---|---|
| `"NIFTY"` | An index symbol: read on NSE_INDEX for an NSE or NFO strategy, on BSE_INDEX for a BSE or BFO one |
| `("SENSEX", "BSE_INDEX")` | A `(symbol, exchange)` pair on NSE_INDEX or BSE_INDEX |
| a pandas Series of closes | Your own closes (or a DataFrame with a `close` column); a date index is stamped at each session's close |

An index's daily closes come from the run's own source, the same way as the strategy's bars: a dict `data=` holding the symbol, else Historify or your broker through `client`. They are read from the session before the run (so the run's first session has a benchmark return) up to the present, `now=`. The Assumptions block names the benchmark and where its closes came from, the manifest records it with a hash of its closes, `rerun()` reproduces it, and `bt.optimize` measures every combination against it.

The run against NIFTY 50, its closes read from your server:

<!-- requires-server -->
<!-- continues -->
```python
against_nifty = result.rerun(benchmark="NIFTY")  # the same run, compared with NIFTY 50
m = against_nifty.metrics
print("sessions with a NIFTY return:", m["benchmark_sessions"])
for key in ("benchmark_total_return", "alpha", "beta", "correlation", "information_ratio"):
    print(f"{key:22} {m[key]:9.4f}")
```

<!-- output -->
```text
sessions with a NIFTY return: 1453
benchmark_total_return    0.8063
alpha                    -0.0523
beta                      0.4528
correlation               0.4207
information_ratio        -0.7183
```

Missing benchmark data is a warning, never a stop: a source that cannot serve the benchmark leaves the run without benchmark figures, and the warnings name every session without a close. **A missing session stays missing.** It is never filled from a neighbouring day: that session and the one after it have no benchmark return, and alpha, beta and the other paired figures use only the sessions with both a strategy and a benchmark return, counted in `benchmark_sessions`.

Here the benchmark is a Series of NIFTY closes taken from your server, with the close of 15 July 2024 dropped to show what a missing session does:

<!-- requires-server -->
<!-- continues -->
```python
import pandas as pd

# NIFTY 50 daily bars from your server; the "close" column is the Series of closes.
nifty = client.history(symbol="NIFTY", exchange="NSE_INDEX", interval="D", start_date="2020-12-01", end_date="2026-11-11")
with_gap = result.rerun(benchmark=nifty["close"].drop(pd.Timestamp("2024-07-15")))
print("benchmark sessions:", with_gap.metrics["benchmark_sessions"])
print(next(text for text in with_gap.warnings if text.startswith("benchmark")).split(". ")[0])
```

<!-- output -->
```text
benchmark sessions: 1451
benchmark the Series given as benchmark=: no close on 1 of the 1454 sessions it is read on (the run's sessions and the one before them): 2024-07-15
```

## The HTML tearsheet

`result.tearsheet(path, mode="full", log_scale=False)` writes a single, self-contained HTML file and returns its path; without a path it returns the HTML as a string. It needs no plotting package and no internet connection: the charts are inline SVG, there is no script, and the page follows the reader's light or dark setting and reads on a phone. Rupee amounts use Indian digit grouping (12,34,567.89) and lakh and crore units.

Four modes:

| `mode=` | What the page holds |
|---|---|
| `"full"` (default) | Headline figures and fact lists; equity with its longest drawdowns shaded and the drawdown underneath; cumulative return (against the benchmark, when one is given); session return bars; monthly returns as a heat grid; yearly returns; the return distribution by period and its histogram; the worst drawdowns; rolling volatility, Sharpe, Sortino, win rate and beta; the horizon summary; the yearly benchmark comparison (with a benchmark); Monte Carlo (1,000 runs from the session returns, fixed seed); the trade P&L distribution; the trade list; R-multiples (when a closed trade has a stop); losing streaks; costs; the assumptions; and notes with every definition used |
| `"basic"` | Headline and basic facts, equity, monthly and yearly returns, the worst drawdowns, trades, costs, assumptions and notes |
| `"metrics"` | Every metric with its value and definition, and the assumptions |
| `"charts"` | Every chart and nothing else |

`log_scale=True` draws the cumulative return on a logarithmic scale of growth, which keeps a long run's early years readable. The Assumptions section lists every setting and every warning of the run, so a run without charges says so on the report.

The full report, written to a file you open in your browser:

<!-- requires-server -->
<!-- continues -->
```python
print(result.tearsheet("reliance_ema_crossover.html"))
```

<!-- output -->
```text
reliance_ema_crossover.html
```

Without a path, the report comes back as a string of HTML, here the short `basic` one:

<!-- requires-server -->
<!-- continues -->
```python
html = result.tearsheet(mode="basic")
print(html.startswith("<!DOCTYPE html>"), "<script" in html)
```

<!-- output -->
```text
True False
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

The strategy and its parameters, as the manifest records them:

<!-- requires-server -->
<!-- continues -->
```python
print(result.manifest["strategy"]["name"], result.manifest["strategy"]["parameters"])
```

<!-- output -->
```text
EmaCrossover {'fast': 20, 'slow': 50}
```

`result.rerun()` runs the same backtest again: the same strategy class, client and arguments. With no changes the new result is identical to the original, bit for bit. Pass any `bt.backtest` argument or strategy parameter to change it. If the data the source returns has changed since (other monthly hashes), the rerun's first warning says it is not a reproduction.

<!-- requires-server -->
<!-- continues -->
```python
again = result.rerun()
print("identical:", again.fills.equals(result.fills) and again.equity.equals(result.equity))
```

<!-- output -->
```text
identical: True
```

The same run with faster averages, without editing the class:

<!-- requires-server -->
<!-- continues -->
```python
faster = result.rerun(fast=10, slow=30)
print(f"fast=10, slow=30 net profit: Rs {faster.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
fast=10, slow=30 net profit: Rs -11,981.34
```

## R-multiples

An R-multiple measures a trade in units of the risk taken: a trade that risked Rs 2,500 to its stop and made Rs 5,000 is +2R, one that lost the full Rs 2,500 is -1R. It makes trades of different sizes comparable and tells you whether the winners pay for the losers.

* `result.trades` has `initial_risk_rupees`, what the opening fill would have lost at the stop its entry set, and `r_multiple`, the trade's net P&L over it. A trade opened without a stop has no initial risk, so its `r_multiple` is NaN.
* `result.r_summary` gives the count of closed trades and of those with an initial risk, the mean R (the expectancy in R), median, standard deviation, best, worst, total, the share above zero, and the distribution in one-R bins.
* The full tearsheet has an R-multiples section when a closed trade has an initial risk.

The crossover above has no stop, so its trades have no R. Here is the same crossover with a stop-loss 5 percent below each entry price (`bt.pct(5)`). The new class takes everything from `EmaCrossover` and changes only `on_bar`:

<!-- requires-server -->
<!-- continues -->
```python
class EmaCrossoverWithStop(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.pct(5))  # risk: 5 percent of the entry price
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


with_stop = bt.backtest(EmaCrossoverWithStop, client, start="2021-01-01", end="2026-11-11", capital=100_000)
columns = ["entry_time", "exit_reason", "initial_risk_rupees", "net_pnl_rupees", "r_multiple"]
print(with_stop.trades[columns].head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time exit_reason  initial_risk_rupees  net_pnl_rupees  r_multiple
2021-06-01 09:15:00+05:30      leg_sl              4996.22        -5248.79       -1.05
2021-08-16 09:15:00+05:30      signal              4733.52        12201.36        2.58
2022-01-14 09:15:00+05:30      leg_sl              5339.25        -5609.73       -1.05
2022-03-23 09:15:00+05:30      leg_sl              5062.36        -5319.56       -1.05
2022-08-12 09:15:00+05:30      signal              4796.44        -4124.81       -0.86
```

The summary of the R-multiples of all its closed trades:

<!-- requires-server -->
<!-- continues -->
```python
summary = with_stop.r_summary
print("trades with a stop:", summary["trades_with_risk"], "of", summary["trades"])
print("mean R:", round(summary["mean_r"], 2), "| total R:", round(summary["total_r"], 2))
print("share of trades above 0R:", round(summary["positive_share"], 2))
print("trades per one-R bin:", summary["distribution"])
```

<!-- output -->
```text
trades with a stop: 15 of 15
mean R: -0.11 | total R: -1.62
share of trades above 0R: 0.27
trades per one-R bin: {-2: 6, -1: 5, 0: 1, 1: 1, 2: 2}
```

In the trades table, `leg_sl` means the stop was hit and `signal` means the strategy's own exit (the crossover back down). Each trade risked about Rs 5,000, 5 percent of the capital it invested. A trade stopped out lost a little more than 1R (-1.05R), because charges and slippage come on top of the distance to the stop. The bins of `distribution` are named by their lower edge, so those trades count in bin `-2` (from -2R up to -1R). A mean R below zero says that, over these years, the winners did not pay for the losers.

## Where a run ends

A run ends at the earliest of three times: the `end` you asked for, the close of the last bar in the data, and the present. When that is before `end`, the first warning of the result names the end it used and why.

* **Equity, trades and metrics stop there.** The equity series, the performance figures and the report cover the run up to that instant, never empty time after the data.
* **A position still open is reported open**, marked at the last close in `result.final_positions` and counted as an open trade. It is not squared off at a stale price, even on MIS: the run simply has no later bar to act on.
* **Charges do not depend on where the data stops.** The contract notes of the final session are settled at the run's end exactly as at a session close, so a run whose data ends at noon is charged what the same fills would be charged in a full session.
* **The present** is the clock by default: bars that have not closed yet are dropped, so a run for today stops at the last completed bar. `bt.backtest(now=...)` fixes the present instead (a datetime, an ISO string read as IST, or UTC nanoseconds), which makes a test or a rerun on today's data repeatable.

The example is an opening range breakout on SBIN 15-minute bars, run for 11 November 2026 as it would have stood at noon (`now=`): it buys 100 shares when a bar closes above the high of the first 15 minutes.

<!-- requires-server -->
<!-- continues -->
```python
class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"  # intraday: MIS

    def on_bar(self, bar):
        if bar.time.strftime("%H:%M") == "09:15":  # the first bar of the session
            self.range_high = bar.high
        elif self.position.is_flat and bar.close > self.range_high:
            self.buy(qty=100)


at_noon = bt.backtest(OpeningRangeBreakout, client, start="2026-11-11", end="2026-11-11", capital=200_000,
                      now="2026-11-11 12:00")
print(at_noon.warnings[0])
```

<!-- output -->
```text
The run ends at 2026-11-11 12:00 IST, the present (now=), before the end of its range at 2026-11-11 15:30 IST: equity, trades and metrics stop there, and positions still open are reported open
```

The position bought at 09:45 is still open, marked at the last close before noon:

<!-- requires-server -->
<!-- continues -->
```python
columns = ["symbol", "quantity_units", "average_price_rupees", "mark_rupees", "unrealized_rupees"]
print(at_noon.final_positions[columns].to_string(index=False))
```

<!-- output -->
```text
symbol  quantity_units  average_price_rupees  mark_rupees  unrealized_rupees
  SBIN           100.0               1066.25       1074.4              815.0
```

The day's contract note is settled all the same:

<!-- requires-server -->
<!-- continues -->
```python
print(at_noon.contract_notes[["date", "charged_total", "adjustment", "settled"]].to_string(index=False))
```

<!-- output -->
```text
      date  charged_total  adjustment  settled
2026-11-11          30.59        -0.2     True
```
