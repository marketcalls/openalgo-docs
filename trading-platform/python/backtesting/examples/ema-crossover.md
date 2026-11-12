# EMA Crossover

The moving average crossover is the classic first trend strategy. An EMA (exponential moving average) is the average closing price of the last few days, with the recent days counting more. When a short EMA rises above a longer one, the price has started to trend up; when it falls back below, the trend has faded. Swing traders use it on daily charts to ride moves that last weeks or months, and to stay out of long falls.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when the 20-day EMA crosses above the 50-day EMA.
* **Exit:** sell when the 20-day EMA crosses back below the 50-day EMA.
* **Stop-loss:** none. A stop-loss is an exit that limits the loss of a trade; here the opposite crossover is the only exit.
* **Size:** all the capital (Rs 1,00,000 at the start), the engine's default.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only (it buys, and never sells short).
* **Data:** SBIN (NSE) daily bars from January 2021 to 11 November 2026. A bar is one period of prices, here one trading day, with its open, high, low and close.

Selling short (selling first and buying back later) is not allowed in delivery (CNC) in the Indian cash market, and the engine rejects such an order (reject code `product_rule`). A stock can be sold short only intraday (MIS, closed before the session ends), as in the [opening range breakout](opening-range-breakout.md).

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # "D": daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    def init(self):
        # Runs once, before the first bar: the two EMAs of the closing prices.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < self.slow:  # wait until the slow EMA has enough days
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

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
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-05-12 09:15:00+05:30 2021-12-21 09:15:00+05:30              362.90             456.95        25619.92
2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30              503.15             460.20       -10994.83
2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30              507.15             470.90        -8445.92
2022-07-13 09:15:00+05:30 2023-01-30 09:15:00+05:30              487.85             535.85        10171.56
2023-04-28 09:15:00+05:30 2023-08-17 09:15:00+05:30              567.95             565.60         -755.01
```

## Reading it

* `self.position.is_flat` is true while the strategy holds nothing, and `is_long` while it holds shares.
* Each crossover was decided at a session's close and filled at the next session's open (09:15 IST).
* The max drawdown is the largest fall of the account from its highest value, here 24.59 percent.
* The engine applied the defaults for Indian markets without being asked: delivery charges at each trade date's rates, slippage of 2 basis points (0.02 percent) on every fill, and NSE session times and holidays.

On SBIN over these six years the crossover made 53 percent: only 4 of its 11 trades won, but a few long trends (May to December 2021, July 2022 to January 2023) paid for the many short false starts.

Python may also print an `UnverifiedScheduleWarning`: some charge rates of the period are not yet verified against their source. The backtest is complete; `result.warnings` lists the fills it affects.

## Try this

* Another stock: `symbol = "TCS"`.
* Another period: `start="2023-01-01"`.
* Faster averages, without editing the class: `bt.backtest(..., params={"fast": 10, "slow": 30})`.
* A stop-loss 5 percent below the entry: `self.buy(stop=bt.pct(5))`. On a CNC position the engine holds it as a GTT order (good till triggered: an order your broker keeps open across days), the way your broker would hold it overnight.
* The full report in your browser: `result.tearsheet("ema_crossover.html")`.

More: [Writing Strategies](../writing-strategies.md), [Orders and Risk](../orders-and-risk.md), [Results and Reports](../results-and-reports.md).
