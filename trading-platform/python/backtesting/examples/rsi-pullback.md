# RSI Pullback

Buying the dip in an uptrend. The RSI (relative strength index) is a number from 0 to 100 that falls when a stock has had several down days and rises after up days. While the stock is still above its 200-day SMA (simple moving average: the plain average of the last 200 closes), a low RSI usually marks a pullback inside the uptrend rather than the start of a downtrend. Traders buy the pullback and sell into the recovery.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the close is above the 200-day SMA and the 14-day RSI is below 40.
* **Exit:** sell when the RSI rises above 60.
* **Stop-loss:** none. A stop-loss is an exit that limits the loss of a trade; this strategy has none, and the results show why that matters.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only (it buys, and never sells short).
* **Data:** INFY (NSE) daily bars from January 2021 to 11 November 2026. A bar is one period of prices, here one trading day, with its open, high, low and close.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class RsiPullback(bt.Strategy):
    symbol, exchange, interval = "INFY", "NSE", "D"  # "D": daily bars
    buy_below = 40  # an RSI this low is a pullback
    sell_above = 60  # an RSI this high has recovered

    def init(self):
        # Runs once, before the first bar: the RSI and the 200-day SMA of the closes.
        self.rsi = self.I(ta.rsi, self.close, 14)
        self.sma200 = self.I(ta.sma, self.close, 200)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < 200:  # wait until the 200-day SMA has 200 days
            return
        uptrend = self.close[-1] > self.sma200[-1]  # [-1] is the latest bar
        if self.position.is_flat and uptrend and self.rsi[-1] < self.buy_below:
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.rsi[-1] > self.sell_above:
            self.exit()  # sell everything at the next day's open


result = bt.backtest(RsiPullback, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs -14,867.26
Return       : -14.87%
Max drawdown : -30.53%
Trades       : 6 (50% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2022-01-25 09:15:00+05:30 2022-03-10 09:15:00+05:30             1652.55            1764.90         6544.95
2022-04-12 09:15:00+05:30 2022-07-22 09:15:00+05:30             1682.15            1467.60       -13811.94
2023-10-25 09:15:00+05:30 2023-11-23 09:15:00+05:30             1339.00            1404.30         4290.26
2024-03-06 09:15:00+05:30 2024-06-10 09:15:00+05:30             1534.15            1459.30        -4954.69
2024-10-30 09:15:00+05:30 2024-11-27 09:15:00+05:30             1753.40            1846.50         4657.70
```

## Reading it

* `self.position.is_flat` is true while the strategy holds nothing, and `is_long` while it holds shares. Each trade was decided at a session's close and filled at the next session's open (09:15 IST).
* Half the pullbacks recovered, but the April 2022 one did not: the stock kept falling, the RSI never reached 60 for three months, and with no stop-loss the trade lost more than the next two winners made. That is the risk of buying dips without a stop.
* Like the [golden cross](sma-golden-cross.md), the 200-day average leaves the first ten months of the run without trades.
* The max drawdown is the largest fall of the account from its highest value.

## Try this

* A stop-loss 8 percent below the entry: `self.buy(stop=bt.pct(8))`.
* Deeper pullbacks only: `bt.backtest(..., params={"buy_below": 30})`.
* Another stock: `symbol = "TCS"`.

More: [Orders and Risk](../orders-and-risk.md#stops-targets-and-scale-out), [Indicators: Momentum](../../indicators/momentum.md).
