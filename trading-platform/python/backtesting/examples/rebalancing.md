# Equal-Weight Rebalancing

The simplest portfolio a long-term investor runs: a few stocks in equal parts. Once a quarter, sell a little of the stocks that rose and buy a little of those that fell, to bring each back to its share: that is rebalancing. NIFTY is the yardstick (the benchmark): do the four stocks beat simply holding the index?

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Stocks:** RELIANCE, HDFCBANK, INFY and TCS (NSE), 25 percent each.
* **Rebalance:** on the first trading day of every quarter; the orders fill at the next day's open. 2 percent stays in cash for the charges.
* **Size:** Rs 1,00,000 at the start, in whole shares.
* **Product:** CNC (delivery: the shares are held overnight, for as long as you want), long only.
* **Data:** daily bars from 1 January 2021 to 11 November 2026, compared with NIFTY. A bar is one period of prices, here one trading day.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class EqualWeight(bt.Strategy):
    symbols = ("RELIANCE", "HDFCBANK", "INFY", "TCS")  # several stocks: "symbols", not "symbol"
    exchange, interval = "NSE", "D"  # NSE, daily bars

    # init runs once, before the first bar: call rebalance_now on the first
    # trading day of every quarter.
    def init(self):
        self.every("quarter", self.rebalance_now)

    # Trade every stock back to 25 percent. {...} is a dict: each stock with its percent.
    def rebalance_now(self):
        self.rebalance({"RELIANCE": 25, "HDFCBANK": 25, "INFY": 25, "TCS": 25})


# Run the backtest in whole shares ("venue"), with NIFTY as the yardstick.
result = bt.backtest(EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     quantity_mode="venue", benchmark="NIFTY")

# Print the summary. m is a dict too; f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%} (NIFTY {m['benchmark_total_return']:.2%})")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Orders       : {len(result.orders)}")

# What the portfolio holds at the end, and each stock's percent of it.
end = result.final_positions[["symbol", "quantity_units", "value_rupees", "weight_pct"]]
print(end.round(2).to_string(index=False))
```

<!-- output -->
```text
Net profit   : Rs 11,055.12
Return       : 11.06% (NIFTY 80.63%)
Max drawdown : -33.98%
Orders       : 69
  symbol  quantity_units  value_rupees  weight_pct
HDFCBANK            33.0       26617.8       23.97
    INFY            23.0       26565.0       23.92
RELIANCE            20.0       26708.0       24.05
     TCS            11.0       27193.1       24.49
```

Four stocks that went mostly sideways: the portfolio made 11.06 percent while NIFTY gained 80.63 percent, and it fell 34 percent from its peak on the way (the max drawdown: the largest fall from the highest value). Rebalancing cannot turn a weak basket into a strong one; it only keeps each stock near its share. The 69 orders are the quarterly trims and top-ups (a change smaller than one share sends no order), and at the end each stock is near 24.5 percent: 25 percent of the 98 percent invested.

A rebalance trims and tops up holdings but never sells one out, so the run has no closed trades: read `result.orders` (every rebalance order is tagged `rebalance`) and `result.final_positions` instead of `result.trades`.

## Try this

* Other weights: `self.rebalance({"RELIANCE": 40, "HDFCBANK": 20, "INFY": 20, "TCS": 20})`. A stock left out is sold.
* Rebalance once a year: `self.every("year", self.rebalance_now)`.
* Keep 5 percent in cash instead of 2: `self.rebalance({...}, cash_buffer=5)`.

More: [Rebalance a Portfolio](../tutorial/10-portfolio-rebalancing.md), [Writing Strategies: several symbols](../writing-strategies.md#how-do-i-trade-several-stocks).
