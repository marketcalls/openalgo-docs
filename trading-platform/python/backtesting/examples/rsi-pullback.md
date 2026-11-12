# RSI Pullback

Buying the dip in an uptrend. The RSI (relative strength index) is a number from 0 to 100 that falls after several down days and rises after up days. While the stock is above its 200-day SMA (simple moving average: the plain average of the last 200 closes), a low RSI usually marks a pause in the uptrend, so traders buy it and sell into the recovery.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the close is above the 200-day SMA and the 14-day RSI is below 40.
* **Exit:** sell when the RSI rises above 60. No stop-loss (an exit that limits a trade's loss), and the result shows why that matters.
* **Size:** all the capital, Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only.
* **Data:** INFY (NSE) daily bars from 1 January 2021 to 11 November 2026. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class RsiPullback(bt.Strategy):
    symbol, exchange, interval = "INFY", "NSE", "D"  # INFY on NSE, daily bars
    buy_below = 40  # an RSI this low is a pullback
    sell_above = 60  # an RSI this high has recovered

    # init runs once, before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.rsi = self.I(ta.rsi, self.close, 14)
        self.sma200 = self.I(ta.sma, self.close, 200)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        if len(self.close) < 200:  # warm-up: the 200-day SMA needs 200 days first
            return
        uptrend = self.close[-1] > self.sma200[-1]  # [-1] is the latest value
        if self.position.is_flat and uptrend and self.rsi[-1] < self.buy_below:
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.rsi[-1] > self.sell_above:
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(RsiPullback, client, start="2021-01-01", end="2026-11-11", capital=100_000)

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
Net profit   : Rs -14,867.26
Return       : -14.87%
Max drawdown : -30.53%
Trades       : 6 (50% won)
               entry_time                 exit_time  net_pnl_rupees
2022-01-25 09:15:00+05:30 2022-03-10 09:15:00+05:30         6544.95
2022-04-12 09:15:00+05:30 2022-07-22 09:15:00+05:30       -13811.94
2023-10-25 09:15:00+05:30 2023-11-23 09:15:00+05:30         4290.26
```

Half the pullbacks recovered, but the one of April 2022 did not: the stock kept falling, the RSI stayed below 60 for three months, and with no stop-loss that one trade lost more than the two winners around it made. That is the risk of buying dips without a stop. The max drawdown is the largest fall of the account from its highest value.

## Try this

* A stop-loss 8 percent below the entry: `self.buy(stop=bt.pct(8))`.
* Deeper pullbacks only: `bt.backtest(..., params={"buy_below": 30})`.
* Another stock: `symbol = "TCS"`.

More: [Orders and Risk](../orders-and-risk.md#stops-targets-and-scale-out), [Indicators: Momentum](../../indicators/momentum.md).
