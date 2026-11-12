# Equal-Weight Rebalancing

The simplest portfolio a long-term investor runs: buy a few stocks in equal parts and hold them. Once a quarter, sell a little of the stocks that rose and buy a little of those that fell, to bring every stock back to its share. This is rebalancing. It keeps one stock from taking over the portfolio and books part of each rally. NIFTY is the yardstick (the benchmark): do the four stocks beat simply holding the index?

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Stocks:** RELIANCE, HDFCBANK, INFY and TCS (NSE), 25 percent of equity each. Equity is the cash plus the value of the shares held.
* **Rebalance:** at the close of the first session (trading day) of every quarter, trade each stock back to 25 percent; the orders fill at the next session's open.
* **Cash:** 2 percent of equity stays in cash for the charges and the move to the next open (the engine default).
* **Size:** Rs 1,00,000 at the start.
* **Product:** CNC (delivery: the shares are held overnight, for as long as the strategy wants), long only.
* **Data:** daily bars from January 2021 to 11 November 2026, compared with NIFTY. A bar is one period of prices, here one trading day, with its open, high, low and close.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class EqualWeight(bt.Strategy):
    symbols, exchange, interval, product = ("RELIANCE", "HDFCBANK", "INFY", "TCS"), "NSE", "D", "CNC"  # "D": daily bars

    def init(self):
        self.quarter = None  # the quarter of the last rebalance

    def on_bar(self, bars):
        # Runs at the close of every bar, here once a day; bars holds one bar per stock.
        quarter = (self.now.year, (self.now.month - 1) // 3)
        if quarter != self.quarter:  # the first session of a new quarter
            self.quarter = quarter
            self.rebalance({s: 25 for s in self.symbols})  # percent of equity; 2% kept as cash


result = bt.backtest(
    EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000, benchmark="NIFTY"
)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%} (NIFTY {m['benchmark_total_return']:.2%})")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Orders       : {len(result.orders)}")
holdings = result.final_positions
value = holdings["quantity_units"] * holdings["mark_rupees"]
weights = (100 * value / result.equity["equity_rupees"].iloc[-1]).round(1)
print("Weights now  :", dict(zip(holdings["symbol"], weights)))
```

<!-- output -->
```text
Net profit   : Rs 10,511.19
Return       : 10.51% (NIFTY 80.63%)
Max drawdown : -35.12%
Orders       : 96
Weights now  : {'HDFCBANK': 23.9, 'INFY': 24.4, 'RELIANCE': 24.5, 'TCS': 25.5}
```

Four stocks that went sideways for most of these six years: the portfolio made 10.5 percent while NIFTY gained 80.6 percent, and it fell 35 percent from its peak on the way (the max drawdown). Rebalancing cannot turn a weak basket into a strong one; it keeps each stock near its share and stops one of them from taking over. The 96 orders are 24 quarterly rebalances of four stocks; the weights have drifted a little since the last one, decided on 1 October 2026 and filled at the open of 5 October.

A rebalance trims and tops up holdings but never closes one, so the run has no closed trades (`result.trades` is empty). Read `result.orders` (every rebalance order is tagged `rebalance`), `result.fills` and `result.final_positions` instead. The engine fills the sales before the buys at each open, so the buys can use the sales' money, and a buy the cash cannot cover is rejected and reported in `result.warnings`; none was here.

## Try this

* Other weights: `self.rebalance({"RELIANCE": 40, "HDFCBANK": 20, "INFY": 20, "TCS": 20})`; a stock left out is sold.
* Rebalance once a year: track `self.now.year` instead of the quarter.
* Keep 5 percent in cash instead of 2: `self.rebalance({s: 25 for s in self.symbols}, cash_buffer=5)`.

More: [Writing Strategies: several symbols](../writing-strategies.md#several-symbols), [A benchmark](../results-and-reports.md#a-benchmark).
