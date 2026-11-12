# Rebalance a Portfolio

Not every strategy times entries and exits. Many investors simply hold a few good stocks in equal parts. In this lesson you hold four stocks at 25 percent each and rebalance them every quarter, then read how much of each the portfolio holds at the end.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Four stocks, 25 percent each

**Rebalancing** means bringing every stock back to its share. Over three months the stocks that rose grow past 25 percent and those that fell shrink below it. On the first trading day of every quarter the strategy sells a little of the winners and buys a little of the losers, so each is back to 25 percent.

* The stocks: SBIN, RELIANCE, INFY and ITC on NSE, on daily bars (one bar of prices per trading day), held in delivery (CNC: the shares are kept overnight, for as long as you want).
* `self.rebalance(...)` takes each stock's percent of the portfolio and sends the orders. 2 percent of the money stays in cash for the charges.
* `self.every("quarter", ...)` calls a function of yours on the first trading day of every quarter. The orders fill at the next day's open.
* `quantity_mode="venue"` buys whole shares only, the way your broker trades them.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class EqualWeight(bt.Strategy):
    symbols = ("SBIN", "RELIANCE", "INFY", "ITC")  # several stocks: "symbols", not "symbol"
    exchange, interval = "NSE", "D"  # NSE, daily bars

    # init runs once, before the first bar: call rebalance_now on the first
    # trading day of every quarter.
    def init(self):
        self.every("quarter", self.rebalance_now)

    # Trade every stock back to 25 percent. {...} is a dict: each stock with its percent.
    def rebalance_now(self):
        self.rebalance({"SBIN": 25, "RELIANCE": 25, "INFY": 25, "ITC": 25})


# Run the backtest in whole shares, with NIFTY as the yardstick.
result = bt.backtest(EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     quantity_mode="venue", benchmark="NIFTY")

# Print the summary. m is a dict too; f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%} (NIFTY {m['benchmark_total_return']:.2%})")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Orders       : {len(result.orders)}")

# What the portfolio holds at the end: shares, their value in rupees, and percent of the portfolio.
end = result.final_positions[["symbol", "quantity_units", "value_rupees", "weight_pct"]]
print(end.round(2).to_string(index=False))
```

<!-- output -->
```text
Net profit   : Rs 79,625.78
Return       : 79.63% (NIFTY 80.63%)
Max drawdown : -24.91%
Orders       : 87
  symbol  quantity_units  value_rupees  weight_pct
    INFY            38.0       43890.0       24.43
     ITC           153.0       43605.0       24.28
RELIANCE            33.0       44068.2       24.53
    SBIN            41.0       43509.2       24.22
```

* The four stocks made 79.63 percent, almost exactly NIFTY's 80.63 percent. The max drawdown, the largest fall of the portfolio from its highest value, was 24.91 percent.
* The first orders bought all four on 4 January 2021; every quarter after that, small sales and buys brought them back to 25 percent. That is 87 orders, fewer than 24 quarters x 4 stocks, because a change smaller than one share sends no order.
* At the end each stock is close to 24.5 percent: 25 percent of the 98 percent invested, moved a little by the prices since the last rebalance in October 2026. `weight_pct` is the stock's value in percent of the whole portfolio, cash included.

## What you learned

* `self.rebalance({...})` trades a portfolio to the percent you give each stock; `self.every("quarter", ...)` decides when.
* A rebalance trims and tops up holdings but never sells one out, so the run has orders but no closed trades: read `result.orders` and `result.final_positions` instead of `result.trades`.
* `result.final_positions` shows the end of the run: `quantity_units` (shares), `value_rupees` and `weight_pct` (percent of the portfolio).

## More options

* Other weights: `self.rebalance({"SBIN": 40, "RELIANCE": 20, "INFY": 20, "ITC": 20})`. A stock you leave out is sold.
* Rebalance once a year: `self.every("year", self.rebalance_now)`, or every month with `"month"`.
* Keep 5 percent in cash instead of 2: `self.rebalance({...}, cash_buffer=5)`.
* Strategies on several symbols in detail: [Writing Strategies](../writing-strategies.md#several-symbols).

**Next lesson:** [Use Your Own Data](11-your-own-data.md)
