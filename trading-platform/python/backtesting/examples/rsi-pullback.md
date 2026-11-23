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

    # init runs before the first bar. self.I works out an indicator so that
    # each bar sees only the values known at that bar.
    def init(self):
        self.rsi = self.I(ta.rsi, self.close, 14)
        self.sma200 = self.I(ta.sma, self.close, 200)

    # on_bar runs at the close of every bar (here once a day): decide what to do.
    def on_bar(self, bar):
        uptrend = self.close[-1] > self.sma200[-1]  # [-1] is the latest value
        if self.position.is_flat and uptrend and self.rsi[-1] < self.buy_below:
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.rsi[-1] > self.sell_above:
            self.exit()  # sell everything at the next day's open


# Run the backtest from 1 January 2021 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(RsiPullback, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades

# The first three trades: when each opened and closed, and its profit after charges.
# trade_list() is the table of closed trades, one row each; [[...]] picks three columns.
trades = result.trade_list()[["entry_time", "exit_time", "net_pnl"]]
print(trades.head(3).to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs -9,737.17
Return       : -9.74%
Max drawdown : -29.93%
Trades       : 7 (57% won)
Overfitting  : too few trades to judge (7 closed, 30 needed)
               entry_time                 exit_time   net_pnl
2021-05-17 09:15:00+05:30 2021-05-27 09:15:00+05:30   5850.99
2022-01-25 09:15:00+05:30 2022-03-10 09:15:00+05:30   6668.32
2022-04-12 09:15:00+05:30 2022-07-22 09:15:00+05:30 -14236.85
```

Four of the seven pullbacks recovered, but the one of April 2022 did not: the stock kept falling, the RSI stayed below 60 for three months, and with no stop-loss that one trade lost Rs 14,237, more than the two winners before it made together (Rs 12,519). That is the risk of buying dips without a stop. The max drawdown is the largest fall of the account from its highest value.

## Try this

* A stop-loss 8 percent below the entry: `self.buy(stop=bt.pct(8))`.
* Deeper pullbacks only: `bt.backtest(..., params={"buy_below": 30})`.
* Another stock: `symbol = "TCS"`.

More: [Orders and Risk](../orders-and-risk.md#how-do-i-add-a-stop-loss), [Indicators: Momentum](../../indicators/momentum.md).
