# Metrics

`openalgo.backtest.metrics` turns an **equity curve** (the value of an account at the close of every day) into performance figures: returns, risk, drawdowns, trade statistics and Monte Carlo studies. Every backtest uses it for `result.metrics`, and you can call it yourself to add a risk-free rate, look deeper into the bad patches, or combine several strategies.

The examples analyse the first strategy of this section, the SBIN EMA crossover from [Your First Backtest](../tutorial/01-first-backtest.md): it buys SBIN when the 20-day EMA (an average of recent closing prices that counts the latest days most) rises above the 50-day EMA, and sells when it falls back below, on daily bars from 1 January 2021 to 11 November 2026, with Rs 1,00,000. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, and run the blocks in order: each continues from the ones before.

<!-- requires-server -->
```python
# Load the backtest engine, the OpenAlgo client, the indicators (ta) and the metrics module
import openalgo.backtest as bt
from openalgo import api, ta
from openalgo.backtest import metrics

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
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

## Analyse an equity curve

`metrics.analyse` measures any equity curve. The backtest's figures assume money left in cash earns nothing. A **risk-free rate** is what a safe deposit would have paid instead; the Sharpe ratio (return for the risk taken) then counts only the return above it. Here, 6.5 percent a year:

<!-- requires-server -->
<!-- continues -->
```python
performance = metrics.analyse(
    result.equity["equity_rupees"],  # the account value at each day's close
    exchanges="NSE",  # whose trading calendar to count sessions with
    trades=result.performance.trades,  # the trades, for the trade figures
    risk_free_rate=0.065,  # 6.5 percent a year, written as a fraction
    opening_wealth=100_000,  # the capital at the start
    opening_time=result.metrics["start"],  # when the run started
)
print(f"Sharpe in the backtest   : {result.metrics['sharpe']:.2f}")
print(f"Sharpe above 6.5 percent : {performance.metrics['sharpe']:.2f}")
```

<!-- output -->
```text
Sharpe in the backtest   : 0.46
Sharpe above 6.5 percent : 0.15
```

`performance.metrics` holds the same figures as `result.metrics`; [Metric Definitions](../metric-definitions.md) explains each one.

## Drawdown episodes

A **drawdown** is a fall of the account from its highest value so far, lasting until the account gets back to that value. `drawdown_details(3)` lists the three deepest:

<!-- requires-server -->
<!-- continues -->
```python
worst = performance.drawdown_details(3)  # the three deepest drawdowns, deepest first
print(worst[["start", "trough", "end", "depth", "days"]].round(4).to_string())
```

<!-- output -->
```text
                         start                    trough                       end   depth      days
rank
1    2026-02-23 15:30:00+05:30 2026-09-08 15:30:00+05:30                       NaT -0.2982  261.0000
2    2021-11-04 19:15:00+05:30 2022-07-15 15:30:00+05:30 2024-04-29 15:30:00+05:30 -0.2866  906.8438
3    2024-06-03 15:30:00+05:30 2025-04-09 15:30:00+05:30 2025-10-27 15:30:00+05:30 -0.1874  511.0000
```

`start` is the peak, `trough` the lowest point, `end` the day the account was back at the peak (`NaT`, no time, while it has not recovered), `depth` the fall as a fraction and `days` the calendar days it lasted. The deepest, 29.82 percent, is the max drawdown of the summary and has not recovered yet. The second peaked at 19:15 on 4 November 2021, the close of that year's Diwali Muhurat trading session.

## Horizon summary

How has the strategy done lately, next to how it has done overall? `horizons` measures the last month, 3 and 6 months, year, 3 and 5 years, and the whole run:

<!-- requires-server -->
<!-- continues -->
```python
print(performance.horizons[["sessions", "total_return", "max_drawdown"]].round(4).to_string())
```

<!-- output -->
```text
             sessions  total_return  max_drawdown
horizon
1M                 22        0.0000        0.0000
3M                 63       -0.0586       -0.0734
6M                127       -0.0502       -0.0854
1Y                248       -0.0961       -0.2982
3Y                744        0.3987       -0.2982
5Y               1240        0.0928       -0.2982
Since start      1453        0.5327       -0.2982
```

## Losing streaks

How many losing days or losing trades came in a row? `losing_streaks` counts the runs of each length. A strategy whose bad runs you cannot sit through is one you will abandon at the wrong time:

<!-- requires-server -->
<!-- continues -->
```python
streaks = performance.losing_streaks
print(streaks[(streaks["sessions"] > 0) | (streaks["trades"] > 0)].to_string())  # only lengths that happened
```

<!-- output -->
```text
        sessions  trades
length
1            143       1
2             55       3
3             25       0
4             12       0
5              9       0
6              3       0
7              2       0
```

## Benchmark comparison

Did the strategy beat NIFTY 50 year by year? Rerun the backtest with `benchmark="NIFTY"` and compare each calendar year:

<!-- requires-server -->
<!-- continues -->
```python
vs_nifty = result.rerun(benchmark="NIFTY")  # the same run, with NIFTY's closes from your server
print(vs_nifty.performance.benchmark_comparison("year").round(4).to_string())
```

<!-- output -->
```text
      strategy  benchmark  excess   beat
year
2021    0.2562     0.2412  0.0150   True
2022    0.0620     0.0433  0.0187   True
2023   -0.1367     0.2003 -0.3370  False
2024    0.1917     0.0880  0.1036   True
2025    0.2729     0.1051  0.1678   True
2026   -0.1227    -0.0335 -0.0892  False
```

`excess` is the strategy's return minus NIFTY's, and `beat` is True in the years the strategy did better. The lesson [Compare with NIFTY](../tutorial/08-compare-with-nifty.md) explains the benchmark figures.

## Monte Carlo

A backtest is one path through history. `metrics.monte_carlo` reshuffles the run's daily returns into many other paths and measures each one, to show how different the outcome could have been. `bust=-0.30` adds the share of paths that fell 30 percent at some point, and `goal=0.25` the share that gained 25 percent:

<!-- requires-server -->
<!-- continues -->
```python
study = metrics.monte_carlo(performance, simulations=1_000, seed=7, bust=-0.30, goal=0.25)  # seed: the same shuffle every time
print(study.percentiles.loc[[0.05, 0.5, 0.95], ["final_return", "max_drawdown"]].round(4).to_string())
print("fell 30% or more:", study.bust_probability, "| gained 25% or more:", study.goal_probability)
```

<!-- output -->
```text
            final_return  max_drawdown
percentile
0.05             -0.3291       -0.5558
0.50              0.6258       -0.3319
0.95              2.4745       -0.2086
fell 30% or more: 0.637 | gained 25% or more: 0.7
```

Read the 0.05 row as a bad case: one path in twenty did no better than that. Here 63.7 percent of the reshuffled paths fell 30 percent or more at some point, against the real run's 29.82 percent: the order of the days helped this run.

## Several strategies

Strategies that each run on their own capital combine by adding their equity curves. Here the same crossover also runs on RELIANCE with its own Rs 1,00,000:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy on RELIANCE: a new class that changes only the symbol
class RelianceCrossover(EmaCrossover):
    symbol = "RELIANCE"


reliance = bt.backtest(RelianceCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Add the two equity curves, then measure the sum on the combined Rs 2,00,000
combined = metrics.combine_equity(
    {"SBIN": result.equity["equity_rupees"], "RELIANCE": reliance.equity["equity_rupees"]},
    opening_wealth={"SBIN": 100_000, "RELIANCE": 100_000},
)
both = metrics.analyse(combined, exchanges="NSE", opening_wealth=200_000)
print(f"SBIN     : {result.metrics['total_return']:.2%}")
print(f"RELIANCE : {reliance.metrics['total_return']:.2%}")
print(f"Together : {both.metrics['total_return']:.2%}")
```

<!-- output -->
```text
SBIN     : 53.27%
RELIANCE : -7.61%
Together : 22.83%
```

On the combined Rs 2,00,000 the pair made 22.83 percent: about the average of SBIN's gain and RELIANCE's loss.

## Reports

`report.tearsheet` writes the same HTML report a backtest makes, for any analysis. Here, the analysis with the 6.5 percent risk-free rate:

<!-- requires-server -->
<!-- continues -->
```python
from openalgo.backtest import report

print(report.tearsheet(performance, "sbin_risk_free.html", title="SBIN EMA crossover, risk-free 6.5%"))  # prints the file name
```

<!-- output -->
```text
sbin_risk_free.html
```

## More options

* `analyse(equity, *, exchanges, trades=None, cash_flows=None, benchmark=None, risk_free_rate=0.0, calendar=None, opening_wealth=None, opening_time=None, rolling_window=None)` returns a `Performance` with `.metrics`, `.equity`, `.wealth`, `.drawdown`, `.drawdown_episodes`, `.drawdown_details(top)`, `.session_returns`, `.monthly_returns`, `.yearly_returns`, `.rolling`, `.horizons`, `.losing_streaks`, `.trades`, `.cost_breakdown`, `.benchmark_equity`, `.benchmark_returns` and `.benchmark_comparison(period)`.
* `equity` is a pandas Series in rupees, indexed by time-zone-aware times, strictly increasing. Without `opening_wealth` the first point is the starting equity and belongs to no session.
* `risk_free_rate` is a yearly fraction (`0.065`); a value written in percent (6.5) is refused.
* `cash_flows`: deposits (positive) and withdrawals (negative) in rupees, indexed by time. They change equity but are not returns.
* `benchmark` for `analyse` is a Series of index levels stamped at each session's close (time-zone aware). `bt.data.load_bars("NIFTY", "NSE_INDEX", "D", ...)` gives the close instant of each bar in its `ts_close` column. A missing close is never filled from a neighbouring day: that session and the next have no benchmark return.
* `performance.rolling` recomputes volatility, Sharpe, Sortino and the win rate (and beta, with a benchmark) over a trailing window of `rolling_window` sessions, half a year by default.
* Volatility, Sharpe, Sortino and alpha are annualised with the real number of sessions the exchanges had in the years the run touches, never a fixed 252.
* `monte_carlo(performance, *, simulations=1000, seed=2026, resample="sessions", bust=None, goal=None)`: `resample="trades"` draws the closed trades' rupee P&L instead of the daily returns. A study has `runs`, `percentiles` (1st to 99th), `band`, `actual`, `actual_path`, `bust_probability` and `goal_probability`. The same seed gives the same paths on every platform.
* `return_correlation({"SBIN": result.performance, "RELIANCE": reliance.performance})` gives how closely strategies' daily returns moved together (1 in step, 0 unrelated).
* `metrics.DEFINITIONS` holds each figure's label, unit and definition, and `metrics.GROUPS` the groups the reports show them in. `report.metrics_table(performance)` returns them as a table with the values.
* `report.tearsheet(performance, path=None, *, title=None, mode="full", log_scale=False)`: modes `"full"`, `"basic"`, `"metrics"` and `"charts"`. See [Results and Reports](../results-and-reports.md#the-html-tearsheet).
