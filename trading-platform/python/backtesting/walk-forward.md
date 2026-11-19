# Walk-Forward

A [sweep](optimization.md) picks the best settings on the whole history and then shows them on that same history, so of course they look good: you chose them with hindsight. **Walk-forward testing** repeats the search the way you would have lived through it. It picks the settings on the years before, trades them on the next stretch the search never saw, moves forward and does it again. Joining the traded stretches gives one equity curve made only of trading on prices the search had not seen.

{% hint style="info" %}
`bt.walk_forward` is new in openalgo 2.3.0: run `pip install -U openalgo` to update.
{% endhint %}

## How it works

`bt.walk_forward` cuts the backtest's trading days (sessions) into **folds**, 5 by default:

* Each fold has an **in-sample** window, 70 percent of the fold, where it tries every setting and picks the best, and an **out-of-sample** window right after it, where it trades that pick. The out-of-sample window is the "future" the pick has not seen.
* **Rolling** folds (the default) keep the in-sample window the same length and move it forward with each fold. **Anchored** folds (`anchored=True`) start every in-sample window on the first day, so it grows with each fold.
* The out-of-sample windows follow one another without overlap, from the end of the first in-sample window to the last day. Each is an ordinary backtest that starts with no position and the full capital.
* Their profits and losses are joined, one after another, into the **stitched** out-of-sample equity curve.

## An example

The strategy is the EMA crossover of [Your First Backtest](tutorial/01-first-backtest.md) on SBIN daily bars, from 1 January 2021 to 11 November 2026 with Rs 1,00,000. Each fold tries the same 9 settings as the [first sweep](optimization.md#a-first-sweep): fast 5, 10 or 20 days and slow 30, 50 or 100 days, and picks the one with the highest net profit. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`, save the code as a file, for example `walk.py`, and run it with `python walk.py`.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy of lesson 1. A class groups the strategy's settings and steps under one name.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # parameters: each fold tries other values for these
    slow = 50

    # init runs before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: buy, sell or wait.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# The walk-forward runs only when you run this file itself, as a sweep does.
if __name__ == "__main__":
    wf = bt.walk_forward(
        EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
        fast=(5, 10, 20),  # the values each fold tries
        slow=(30, 50, 100),
        workers=2,  # backtests run at once; leave it out to use every CPU core
    )
    print(wf)  # the folds, the objective, the efficiency and the folds that made money

    # One row per fold: its windows, the settings it picked and the out-of-sample profit.
    columns = ["in_sample_start", "in_sample_end", "out_of_sample_start", "out_of_sample_end",
               "fast", "slow", "net_profit", "trades"]
    print(wf.folds[columns].to_string())

    # The stitched out-of-sample run and the walk-forward's figures.
    print(f"Net profit out of sample : Rs {wf.net_profit:,.2f}")
    print(f"Efficiency               : {wf.efficiency:.2f}")
    print(f"Folds that made money    : {wf.profitable_share:.0%}")
    print("Drift                    :", wf.drift.round(2).to_dict())  # a dict: name -> value
```

<!-- output -->
```text
WalkForwardResult(5 folds, objective 'net_profit', efficiency 0.25, 40% of folds profitable)
     in_sample_start in_sample_end out_of_sample_start out_of_sample_end  fast  slow  net_profit  trades
fold
1         2021-01-01    2022-11-14          2022-11-15        2023-08-30     5    30    -7463.78       4
2         2021-10-21    2023-08-30          2023-08-31        2024-06-20     5    30    25289.76       3
3         2022-08-08    2024-06-20          2024-06-21        2025-04-04     5    50   -10835.12       3
4         2023-05-30    2025-04-04          2025-04-07        2026-01-22    20    30    24180.38       1
5         2024-03-13    2026-01-22          2026-01-23        2026-11-11    20    50   -13874.13       2
Net profit out of sample : Rs 17,297.11
Efficiency               : 0.25
Folds that made money    : 40%
Drift                    : {'fast': 0.25, 'slow': 0.21}
```

Reading the folds:

* **Fold 1** searched 1 January 2021 to 14 November 2022 and picked fast 5 and slow 30, the best over those days. Traded from 15 November 2022 to 30 August 2023, that pick lost money.
* Each later fold moved forward by about 200 trading days and searched again. The pick changed three times: fast 5 slow 30, then fast 5 slow 50, then fast 20 with slow 30 and slow 50.
* Two folds of five made money out of sample. `net_profit` counts a position still open at a window's end at that day's close, while `trades` counts the closed trades only: fold 4 closed one losing trade but ended the window with an open profit.

Reading the figures:

* **Net profit out of sample:** the five traded stretches together, about four years, made Rs 17,297.11. For comparison, the sweep's best setting (fast 5, slow 30) made Rs 98,375.98 over the whole history, but it was picked knowing that history.
* **Efficiency** (walk-forward efficiency): the out-of-sample profit per year over the average in-sample profit per year of the folds. 0.25 means the traded stretches earned about a quarter of what the searched stretches promised. Near 1, the picks held up out of sample; the walk-forward check below asks for at least 0.5.
* **Folds that made money:** the share of folds whose out-of-sample window made money, 40 percent here.
* **Drift:** how far the pick moved from one fold to the next, on average, as a share of each range. Fast moved by a quarter of its range (5 to 20) between folds, slow by about a fifth. Settings that jump around are a sign that the search is fitting each stretch's noise.

What a trader learns: the best settings of the past did not stay the best, and re-picking them as the years went by would have earned much less than the sweep shows. That is not proof the strategy is overfitted, but it is a reason not to trust the sweep's best row.

## The walk-forward check

The [walk-forward check](robustness.md#the-searching-checks) of `bt.robustness` runs this same walk-forward, judges it and draws it in the robustness report: a diagram of the folds, the stitched equity curve and a table by fold. It passes when the stitched run makes money, the efficiency is at least 0.5 and at least 60 percent of the folds make money. It measures the Sharpe ratio by default and needs at least 30 closed trades in the stitched run: this example closed 13 (add up the `trades` column), so the check would say "not judged", too few trades to tell the result from luck.

This block continues the example: it runs the same walk-forward as a check, picking by net profit as above, and prints why it was not judged.

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    # checks= runs only the walk-forward check; objective= picks by net profit, as above.
    report = bt.robustness(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                           checks=["walk_forward"], objective="net_profit",
                           fast=(5, 10, 20), slow=(30, 50, 100), workers=2)
    print(report.check("walk_forward").verdict)
    print(report.check("walk_forward").note)  # why it was not judged
```

<!-- output -->
```text
not judged
Too few trades to judge: the stitched out-of-sample runs closed 13 trades, 30 needed.
```

## The result

* `wf.folds`: one row per fold, numbered from 1: `in_sample_start`, `in_sample_end`, `out_of_sample_start` and `out_of_sample_end` (IST dates), the settings it picked (one column per parameter), `in_sample` and `out_of_sample` (the objective per year in each window), `efficiency` (the fold's own), and the out-of-sample `net_profit` (rupees), `max_drawdown` (a fraction, zero or negative), `pnl_over_drawdown`, `trades` and `win_rate`.
* `wf.equity`: the stitched out-of-sample equity at each day's close, in rupees, starting from the capital.
* `wf.performance`: the stitched run measured as any backtest is; `wf.performance.metrics` holds its figures, such as `wf.performance.metrics["max_drawdown"]`.
* `wf.net_profit`, `wf.efficiency`, `wf.profitable_share` and `wf.drift`: the figures above.
* `wf.objective`: the figure each fold picked by; `wf.plan`: the plan reported before the folds ran, with its time estimate.

## Settings

* `folds=5`: how many folds.
* `anchored=False`: `True` starts every in-sample window on the first day.
* `in_sample=0.7`: the share of each fold searched, above 0 and below 1.
* `objective="net_profit"`: the figure each fold picks by, any [metric](metric-definitions.md) name such as `"sharpe"`; the highest is always picked.
* Parameter ranges named after the strategy's parameters (`fast=(5, 10, 20)`, or `bt.param` values on the class), and `params=` to hold a parameter at one value, as in [Optimization](optimization.md#how-do-i-choose-the-values-to-try) (unlike `bt.robustness`, where `params=` is the chosen setting and its range is still searched). A parameter given both a range and a `params=` value raises a `ConfigError`.
* `workers=` and `progress=print`, as in a sweep.
* Every other keyword is a `bt.backtest` argument, the same for every window.

Each window needs at least two trading days; too many folds for the dates raise a `ConfigError` that says so. A strategy on a futures series raises `NotImplementedError`: optimize on each in-sample window and backtest the window after it yourself.
