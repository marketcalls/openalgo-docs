# Find Better Settings

The 20 and 50 of the EMA crossover were picked by hand. Would 15 and 40 have done better? In this lesson `bt.optimize` tries many pairs for you, one backtest each, and ranks them. You will also learn the most important habit of tuning: checking the winner on dates it has never seen, so you do not fool yourself.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Run it as a file

The optimizer runs the backtests side by side in helper programs (processes), one per CPU core of your computer, and each helper reads your file to find the strategy. So:

* Save the code as a file, for example `find_settings.py`, and run it with `python find_settings.py`. Add the next two blocks to the end of the same file.
* Keep the line `if __name__ == "__main__":`. The lines under it run only when you start the file yourself, not again in every helper.

## Try 12 pairs

The strategy is the EMA crossover of the first lesson: buy SBIN when the fast EMA (an average of recent closes that counts the latest most) crosses above the slow EMA, and sell when it crosses back. Its two lengths are its **parameters**, the settings the optimizer changes. Four fast lengths and three slow lengths make 12 pairs. Each is a full backtest on SBIN daily bars (one bar of prices per trading day) with the same charges and rules, here on **2021 to 2024 only**: 2025 and 2026 are kept back for the check at the end.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy of the first lesson. A class bundles its settings and its functions (each "def").
# fast and slow are its parameters: the settings the optimizer changes.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs enough days first
            return
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Only in your own run, not again in each helper process.
if __name__ == "__main__":
    # One backtest for every pair of the lengths below, on 2021 to 2024.
    opt = bt.optimize(
        EmaCrossover, client, start="2021-01-01", end="2024-12-31", capital=100_000,
        fast=(10, 15, 20, 25),  # the fast lengths to try
        slow=(40, 50, 60),  # the slow lengths to try
    )
    # opt.table has one row per pair: sort by net profit, highest first, and show five.
    top = opt.table.sort_values("net_profit", ascending=False).head(5)
    print(top[["fast", "slow", "net_profit", "trades"]].round(2).to_string(index=False))
    print("Best:", opt.best)  # the pair with the highest net profit
```

<!-- output -->
```text
 fast  slow  net_profit  trades
   15    40    50314.94      11
   10    60    45902.33      12
   15    60    43845.96       8
   15    50    41352.42      11
   20    40    41057.66      10
Best: {'fast': 15, 'slow': 40}
```

On 2021 to 2024 the pair 15 and 40 made the most, Rs 50,315. The 20 and 50 of the first lesson made Rs 37,248 on the same years and did not reach the top five.

## The heatmap

The heatmap lays out the net profit of all 12 pairs as a grid: fast lengths across, slow lengths down. Add this to the end of the file:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    # Net profit of every pair, rounded to whole rupees.
    print(opt.heatmap("fast", "slow").round(0))
```

<!-- output -->
```text
fast       10       15       20       25
slow
40    36013.0  50315.0  41058.0  27569.0
50    37385.0  41352.0  37248.0  30563.0
60    45902.0  43846.0  37909.0   9861.0
```

Every pair made money on these years, and the cells next to the winner (Rs 36,013, Rs 41,058 and Rs 41,352) did well too. That is a good sign. A lone best cell surrounded by losses would be a warning: more likely luck than a real edge.

## Check it on later dates

The best pair is the one that fitted 2021 to 2024 best, and part of that fit is luck. The honest test is a period the optimizer never saw: 2025 and 2026. Run the best pair there, and the original 20 and 50 next to it. Add this to the end of the file:

<!-- continues -->
<!-- requires-server -->
```python
if __name__ == "__main__":
    # The best pair on 2025 to 11 November 2026. params= replaces the 20 and 50 for this run.
    later = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000,
                        params=opt.best)
    # The original 20 and 50 on the same dates.
    original = bt.backtest(EmaCrossover, client, start="2025-01-01", end="2026-11-11", capital=100_000)
    print(f"Best pair, 2025-26 : Rs {later.metrics['net_profit']:,.2f}")
    print(f"20 and 50, 2025-26 : Rs {original.metrics['net_profit']:,.2f}")
```

<!-- output -->
```text
Best pair, 2025-26 : Rs 16,459.97
20 and 50, 2025-26 : Rs 12,197.47
```

The winner held up: on the new dates it made Rs 16,460 against Rs 12,197 for the original. But its lead shrank from Rs 13,067 on 2021 to 2024 to Rs 4,262 on 2025 and 2026. That is the usual picture: part of the best result was the past fitting itself, and only the later dates show how much of the edge was real.

## Do not fool yourself

* The best row of an optimizer is a fit to the past, not a forecast. With enough pairs, one always looks great by chance.
* Trust a choice only when its neighbours on the heatmap did nearly as well, and when it still holds up on dates the optimizer never saw.
* Keep the grid small and the parameters few: the more you try, the easier it is to find luck.

## What you learned

* `bt.optimize` runs one backtest for every combination you list and ranks them; `opt.best` is the winner.
* The heatmap shows whether the winner sits among good neighbours or stands alone.
* Optimize on one period and check on a later one: only the later result tells you something.

## More options

* Rank by return per unit of risk instead of profit: `bt.optimize(..., objective="sharpe")`.
* The full backtest of the winner, with its trades and report: `best = opt.select(**opt.best)`.
* Grids, objectives and helper processes in detail: [Optimization](../optimization.md).

**Next lesson:** [Rebalance a Portfolio](10-portfolio-rebalancing.md)
