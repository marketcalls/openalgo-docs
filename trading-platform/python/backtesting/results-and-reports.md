# Results and Reports

A backtest gives back a `result` that holds everything the run did: the trades, the value of your account over time, the performance figures and a report you open in your browser. This page shows how to read each of them, one question at a time, using the first strategy of this section.

The strategy is the EMA crossover from [Your First Backtest](tutorial/01-first-backtest.md). An EMA (exponential moving average) is the average closing price of recent days, with the latest days counting most. It buys SBIN when the 20-day EMA rises above the 50-day EMA and sells when it falls back below, on daily bars (one bar per trading day) from 1 January 2021 to 11 November 2026, with Rs 1,00,000. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, run this block first, and run the others after it in the same Python session: each one continues from the ones before.

<!-- requires-server -->
```python
# Load the backtest engine, the OpenAlgo client and the indicators (ta)
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class is a recipe; the engine follows it on every bar.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar: it sets up the two EMAs
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I keeps the indicator up to date bar by bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: it decides whether to buy or sell
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until there are 50 days of prices for the slow EMA
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):  # no shares, fast EMA just rose above slow
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):  # holding, fast EMA just fell below slow
            self.exit()  # sell all the shares at the next day's open


# Run the backtest on SBIN's daily bars from your OpenAlgo server
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. An f-string (f"...") fills the values in {} into the text.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

What the four lines mean:

* **Net profit** is what the account gained, after all charges (brokerage, taxes and exchange fees).
* **Return** is the net profit as a share of the starting capital.
* **Max drawdown** is the largest fall of the account from its highest value so far: at its worst, the account was 29.82 percent below its peak.
* **Trades** counts the closed trades (a buy and the sell that closed it) and the share of them that made money.

## The tables

Every list the run produced is a table you can print, filter or save. The one you will read most is `result.trades`, one row per closed trade. The first five trades:

<!-- requires-server -->
<!-- continues -->
```python
# The columns to show, as a list of names
columns = ["entry_time", "exit_time", "entry_units", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees", "exit_reason"]

# head() keeps the first five rows; to_string prints them without the row numbers
print(result.trades[columns].head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees exit_reason
2021-05-12 09:15:00+05:30 2021-12-21 09:15:00+05:30       275.23              362.90             456.95        25619.92      signal
2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30       249.37              503.15             460.20       -10994.83      signal
2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30       225.75              507.15             470.90        -8445.92      signal
2022-07-13 09:15:00+05:30 2023-01-30 09:15:00+05:30       217.39              487.85             535.85        10171.56      signal
2023-04-28 09:15:00+05:30 2023-08-17 09:15:00+05:30       204.62              567.95             565.60         -755.01      signal
```

How to read a row:

* `entry_time` and `exit_time` are Indian time (IST). Each trade was decided at a day's close and filled at the next day's open, 09:15.
* `entry_units` is the number of shares. It has decimals because `self.buy()` with no quantity invests all the capital; see [How Much to Buy](tutorial/04-how-much-to-buy.md) for whole shares.
* `net_pnl_rupees` is the trade's profit or loss (P&L) after its charges.
* `exit_reason` says why the trade closed: `signal` is the strategy's own `self.exit()`. A stop-loss shows `leg_sl` and a target `leg_target` (see [Stop-Loss and Target](tutorial/03-stop-loss-and-target.md)).

Other tables: `result.orders` (every order, rejected ones with a `reject_code` that says why), `result.fills` (every executed order and its price) and `result.final_positions` (what was still held at the end).

## The equity curve

The **equity curve** is the value of your account (cash plus the shares you hold) at the close of every day. `result.equity` holds it, one row per day. Its highest, lowest and last values:

<!-- requires-server -->
<!-- continues -->
```python
equity = result.equity["equity_rupees"]  # the account value column, one value per day
print(f"Highest : Rs {equity.max():,.2f} on {equity.idxmax().date()}")  # idxmax: the day of the highest value
print(f"Lowest  : Rs {equity.min():,.2f} on {equity.idxmin().date()}")
print(f"Last    : Rs {equity.iloc[-1]:,.2f} on {equity.index[-1].date()}")  # iloc[-1]: the last value
```

<!-- output -->
```text
Highest : Rs 218,391.12 on 2026-02-23
Lowest  : Rs 99,206.50 on 2021-05-14
Last    : Rs 153,267.29 on 2026-11-11
```

The account peaked at Rs 2,18,391.12 in February 2026 and ended at Rs 1,53,267.29: that fall of 29.82 percent from the peak is the max drawdown of the summary. The last trade closed on 8 September 2026, so the account then held only cash and its value stopped moving.

## Performance figures

`result.metrics` holds about a hundred figures, read by name. A few worth knowing first:

<!-- requires-server -->
<!-- continues -->
```python
m = result.metrics
print(f"CAGR         : {m['cagr']:.2%}")  # the growth rate per year
print(f"Sharpe ratio : {m['sharpe']:.2f}")  # return for the risk taken; higher is better
print(f"Exposure     : {m['exposure']:.0%}")  # share of the time a position was open
print(f"Profit factor: {m['profit_factor']:.2f}")  # rupees won for every rupee lost
print(f"Charges      : Rs {m['total_costs']:,.2f}")  # all charges of the closed trades
```

<!-- output -->
```text
CAGR         : 7.56%
Sharpe ratio : 0.46
Exposure     : 66%
Profit factor: 1.92
Charges      : Rs 3,363.76
```

Returns, rates and drawdowns are stored as fractions (0.0756 is 7.56 percent); the `:.2%` in the f-string prints them as percents. [Metric Definitions](metric-definitions.md) explains every figure.

## Year by year

The return of each calendar year, as a percent:

<!-- requires-server -->
<!-- continues -->
```python
# A for loop runs the indented line once for each item; items() gives each year with its return
for year, value in result.performance.yearly_returns.items():
    print(year, f"{value:7.2%}")
```

<!-- output -->
```text
2021  25.62%
2022   6.20%
2023 -13.67%
2024  19.17%
2025  27.29%
2026 -12.27%
```

## The HTML tearsheet

A **tearsheet** is the full report of a backtest on one HTML page: the figures, the equity curve, the drawdowns, the monthly returns, the trade list and every setting the run used. `result.tearsheet(path)` writes it and returns the file name; open the file in your browser. It needs no internet connection.

<!-- requires-server -->
<!-- continues -->
```python
print(result.tearsheet("sbin_ema_crossover.html"))  # writes the report next to your script
```

<!-- output -->
```text
sbin_ema_crossover.html
```

`mode="basic"` writes a shorter report.

## A benchmark

A **benchmark** is what you compare the strategy with. Would simply holding the NIFTY 50 index have done better? `result.rerun(benchmark="NIFTY")` runs the same backtest again with NIFTY's daily closes from your OpenAlgo server, and adds the comparison figures:

<!-- requires-server -->
<!-- continues -->
```python
# The same backtest, compared with NIFTY 50
vs_nifty = result.rerun(benchmark="NIFTY")
m = vs_nifty.metrics
print(f"Strategy return : {m['total_return']:.2%}")
print(f"NIFTY return    : {m['benchmark_total_return']:.2%}")
print(f"Beta            : {m['beta']:.2f}")  # how strongly the strategy moved with NIFTY
```

<!-- output -->
```text
Strategy return : 53.27%
NIFTY return    : 80.63%
Beta            : 0.72
```

Over these years the crossover made less than simply holding NIFTY 50. A beta of 0.72 means that on an average day it moved about 0.7 percent for each 1 percent move of NIFTY. The lesson [Compare with NIFTY](tutorial/08-compare-with-nifty.md) explains alpha, beta and the NIFTY line on the tearsheet.

## Warnings

`result.warnings` lists what you should know about a run, most important first:

<!-- requires-server -->
<!-- continues -->
```python
for warning in result.warnings:  # print each warning on its own line
    print(warning)
```

<!-- output -->
```text
SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
```

This run has one: SBIN was traded with the usual terms of a share, a lot of 1 share and a tick (the smallest price step) of 5 paise. You will see it on every share you backtest; it needs no action. Orders the engine rejected (for not enough cash, or outside the intraday hours) are listed here too. `print(result)` shows the warnings together with every setting the run used.

## Saving to Excel or CSV

`result.to_csv("results")` writes every table as a CSV file into the folder `results` and returns the paths:

<!-- requires-server -->
<!-- continues -->
```python
paths = result.to_csv("results")
print([path.name for path in paths])  # the file names
```

<!-- output -->
```text
['fills.csv', 'orders.csv', 'trades.csv', 'positions.csv', 'equity.csv', 'events.csv', 'stale_marks.csv', 'costs.csv', 'contract_notes.csv']
```

`result.to_excel("backtest.xlsx")` writes the same tables to one workbook, a sheet per table. It needs `pip install openpyxl`.

## Reproducing a run

`result.rerun()` runs the same backtest again with the same strategy, client and settings, and gives an identical result. Pass a strategy setting to try other numbers without editing the class. Here, faster EMAs:

<!-- requires-server -->
<!-- continues -->
```python
faster = result.rerun(fast=10, slow=30)  # 10-day and 30-day EMAs instead of 20 and 50
m = faster.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 71,912.03
Return       : 71.91%
Max drawdown : -23.65%
Trades       : 23 (39% won)
```

To try many numbers at once and rank them, see [Find Better Settings](tutorial/09-find-better-settings.md).

## Monte Carlo

A backtest is one path through history. `result.monte_carlo()` asks how it might have gone with the same days in another order: it reshuffles the daily returns into many other paths and reports the spread. The 5th percentile is a bad case (one path in twenty did worse), the 50th a typical one and the 95th a good one:

<!-- requires-server -->
<!-- continues -->
```python
study = result.monte_carlo(simulations=1000, seed=7)  # seed: the same shuffle every time
print(study.percentiles.loc[[0.05, 0.5, 0.95], ["final_return", "max_drawdown"]].round(4))
```

<!-- output -->
```text
            final_return  max_drawdown
percentile
0.05             -0.3291       -0.5558
0.50              0.6258       -0.3319
0.95              2.4745       -0.2086
```

The figures are fractions (0.6258 is 62.58 percent). Read it like this: the real run made 53.27 percent. With its days reshuffled, the middle (50th percentile) return was 62.58 percent and the middle drawdown 33.19 percent, but one path in twenty lost 32.91 percent or more. Results this spread out need a long test before you trust them.

## More options

* **Every table:** `result.fills`, `orders`, `trades`, `positions` (each change of a position), `equity`, `returns`, `events` and `risk_events`, `final_positions`, `stale_marks`, `costs` (each fill's charges, item by item), `contract_notes`, `skipped` (orders sized to zero), `settlements` and `rolls` (futures), `r_summary`, `gross_pnl` and `to_dataframes()`. Times are IST; columns ending in `_ts` are the same instants in UTC nanoseconds; prices are rupees; quantities are units, never lots.
* **Every figure, with its definition:** `result.metrics_table()` returns a table with the group, label, value, unit and definition of each figure.
* **The series behind the figures:** `result.performance` has `drawdown`, `drawdown_details(top=5)`, `monthly_returns`, `rolling`, `horizons` (the last 1, 3 and 6 months, 1, 3 and 5 years), `losing_streaks`, `cost_breakdown` and, with a benchmark, `benchmark_comparison("year")`. See [Metrics](support-functions/metrics.md).
* **How the figures are measured:** from your capital and the open of the first bar; drawdowns are zero or negative; returns are per trading session, annualised with the real number of NSE sessions in each year (not a fixed 252); CAGR uses 365.25 calendar days a year and is not given for runs shorter than 28 days; net figures are after every charge; trade figures count closed trades only; the risk-free rate is 0 (pass one to [`metrics.analyse`](support-functions/metrics.md)); a figure the data cannot define is NaN.
* **Other benchmarks:** `benchmark=("SENSEX", "BSE_INDEX")`, or a pandas Series of your own closes. A day without a benchmark close stays missing; it is never filled from a neighbouring day.
* **Tearsheet modes:** `mode="full"` (default), `"basic"`, `"metrics"` (every figure with its definition) or `"charts"`; `log_scale=True` for long runs; without a path it returns the HTML as text. `openalgo.backtest.report.tearsheet(performance, path)` renders figures you computed yourself.
* **Monte Carlo options:** `resample="trades"` reshuffles the closed trades instead of the days; `bust=-0.30` and `goal=0.25` add the share of paths that fell 30 percent or gained 25 percent. See [Metrics](support-functions/metrics.md#monte-carlo).
* **R-multiples:** for trades opened with a stop-loss, `result.trades` has `initial_risk_rupees` (what the stop would have lost) and `r_multiple` (the trade's net P&L in units of that risk), and `result.r_summary` sums them up.
* **Where a run ends:** at the earliest of `end`, the close of the last bar in the data and the present; a warning names the end used. A position still open is reported open, valued at the last close. `bt.backtest(now="2026-11-11 12:00")` fixes the present, to replay a day as it stood at noon.
* **The manifest:** `result.manifest` records the engine version, the strategy's source hash and parameters, every argument, a hash of the bars used and the platform, as plain JSON. It never holds your API key. When the data has changed since, the first warning of `result.rerun()` says the rerun is not a reproduction.
