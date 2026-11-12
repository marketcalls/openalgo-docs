# EMA Crossover

The classic first trend strategy. An EMA (exponential moving average) is the average closing price of the last few days, with the recent days counting more. When the 20-day EMA rises above the 50-day EMA the price has started to trend up; when it falls back below, the trend has faded.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the 20-day EMA crosses above the 50-day EMA.
* **Exit:** sell when the 20-day EMA crosses back below the 50-day EMA. No stop-loss (an exit that limits a trade's loss).
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** SBIN (NSE) daily bars from 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
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
        if len(self.close) < self.slow:  # warm-up: the slow EMA needs 50 days first
            return
        # crossed_above: the fast EMA was below the slow one a day ago, and is above it now.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# The first three trades: when each opened and closed, and its profit after charges.
trades = result.trades[["entry_time", "exit_time", "net_pnl_rupees"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 53,267.48
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
               entry_time                 exit_time  net_pnl_rupees
2021-05-12 09:15:00+05:30 2021-12-21 09:15:00+05:30        25619.96
2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30       -10994.80
2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30        -8445.89
```

Only 4 of the 11 trades won, but a few long trends paid for the many short false starts. The max drawdown is the largest fall of the account from its highest value. Every crossover was decided at a day's close and filled at the next day's open (09:15), after delivery charges and slippage.

## Try this

* Another stock: `symbol = "TCS"`.
* Faster averages without editing the class: `bt.backtest(..., params={"fast": 10, "slow": 30})`.
* A stop-loss 5 percent below the entry: `self.buy(stop=bt.pct(5))`.
* The full report in your browser: `result.tearsheet("ema_crossover.html")`.

More: [Writing Strategies](../writing-strategies.md), [Results and Reports](../results-and-reports.md).
