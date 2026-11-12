# How do I ...?

Short answers to the questions traders ask most often. Each answer has a small example that runs on real NSE data from your OpenAlgo server, and a link to the page with the details.

## The strategy the answers use

Every answer builds on one simple strategy: an EMA crossover on SBIN.

* An **EMA** (exponential moving average) is the average closing price of the last few days, with the recent days counting more.
* The strategy **buys** when the 10-day EMA rises above the 30-day EMA: the price has started to trend up. It **sells** when the 10-day EMA falls back below the 30-day EMA.
* It runs on **daily bars**. A bar is one period of prices, here one trading day, with its open, high, low and close.
* A stock on daily bars trades as **CNC** (delivery): the shares are held overnight, for as long as the strategy wants.

The backtest covers 1 January 2021 to 11 November 2026 with Rs 1,00,000. The engine applies Indian charges, slippage (the small amount every fill loses to the market), tick size and session times without being asked.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line. Run this block first: every block below continues from it.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")  # your OpenAlgo server


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # "D": daily bars
    fast = 10  # days in the fast EMA
    slow = 30  # days in the slow EMA

    def init(self):
        # Runs once, before the first bar: the two EMAs of the closing prices.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) <= self.slow:  # let the slow EMA warm up first
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell everything at the next day's open


result = bt.backtest(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(f"Net profit Rs {result.metrics['net_profit']:,.2f} from {result.metrics['trades']} trades")
```

<!-- output -->
```text
Net profit Rs 71,912.03 from 23 trades
```

`self.position.is_flat` is true while the strategy holds nothing, and `is_long` while it holds shares. `result` holds everything the backtest did; the answers below read from it.

## Long only, short only, or long and short?

A **long** trade buys first and gains when the price rises. A **short** trade sells first, buys back later, and gains when the price falls. A strategy trades only the side you tell it to:

| You want | In `on_bar` | As conditions in `init` |
|---|---|---|
| Long only | `self.buy()` to enter, `self.exit()` to leave | `self.entry_when(...)`, `self.exit_when(...)` |
| Short only | `self.sell()` to enter, `self.exit()` to cover | `self.short_when(...)`, `self.cover_when(...)` |
| Long and short | Both | All four |

`EmaCross` is long only.

**Shorting stocks.** In the Indian cash market a short cannot be held overnight in delivery (CNC), so on daily bars of a stock a sell that would open a short is rejected (reject code `product_rule` in `result.orders`). Short a stock intraday instead. On intraday bars, such as 15-minute bars, the engine trades **MIS**, the intraday product, and squares off (closes) every position before the session ends. To hold a short overnight, trade [futures](futures.md).

The strategy below is long or short on 15-minute bars of SBIN. `self.target(qty=50)` means "be long 50 shares": when the strategy is short, it buys back the short and buys 50 more in one order. `self.target(qty=-50)` means "be short 50 shares". For futures, give `lots=` instead of `qty=`.

<!-- continues -->
<!-- requires-server -->
```python
class LongAndShort(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"  # 15-minute bars: MIS, closed every session

    def init(self):
        self.fast = self.I(ta.ema, self.close, 9)
        self.slow = self.I(ta.ema, self.close, 21)

    def on_bar(self, bar):
        if len(self.close) < 21:  # let the slow EMA warm up first
            return
        if self.fast.crossed_above(self.slow):
            self.target(qty=50)  # be long 50: covers a short first, in the same order
        elif self.fast.crossed_below(self.slow):
            self.target(qty=-50)  # be short 50: sells a long first, in the same order


both = bt.backtest(LongAndShort, client, start="2026-01-01", end="2026-11-11", capital=100_000)
print(both.trades["direction"].value_counts().to_dict())
```

<!-- output -->
```text
{'long': 101, 'short': 94}
```

The result counts the long trades and the short trades. With `sell` instead of `target`, a sell larger than the long you hold needs `reverse=True`, for example `self.sell(lots=2, reverse=True)` while long one lot.

More: [Orders and Risk](orders-and-risk.md#adds-partial-exits-and-reverse), [Condition strategies](writing-strategies.md#condition-strategies).

## Stop-loss, target and trailing stop?

* A **stop-loss** (or stop) closes a trade when the price moves a set distance against you, so one trade cannot lose too much.
* A **target** closes it when the price has moved a set distance in your favour.
* A **trailing stop** follows the price: as the price rises, the stop rises with it, and it never moves back down.

Give them on the order that opens the position. Distances are measured from your average buy price:

| Form | Distance |
|---|---|
| `bt.pct(2)` | 2 percent |
| `bt.points(5)`, or a plain `5` | 5 rupees of price |
| `bt.atr(2)` | 2 times the ATR (average true range: the average size of a bar's move) over 14 bars, at the entry |
| `bt.trail_pct(1)`, `bt.trail_points(5)`, `bt.trail_atr(3)` | A trailing stop: once the price has moved that far in your favour, the stop follows the best price at that distance |
| `bt.breakeven(5)` | Moves the stop to the entry price after a 5-point gain |

On CNC positions (and NRML, the futures product held overnight) the stop and target are held as GTT orders. A GTT (good till triggered) order is one your broker keeps open across days until its price is reached. On MIS the engine holds them, and what is still open is squared off at the end of the session. If one bar reaches both the stop and the target, the stop wins: the engine cannot tell which came first, so it assumes the worse.

This version of `EmaCross` adds a 2 percent stop, a 4 percent target and a 1 percent trailing stop to every buy:

<!-- continues -->
<!-- requires-server -->
```python
class EmaWithStops(EmaCross):  # EmaCross with a new on_bar
    def on_bar(self, bar):
        if len(self.close) <= self.slow:
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.pct(2), target=bt.pct(4), trail=bt.trail_pct(1))
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


stops = bt.backtest(EmaWithStops, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(stops.trades["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
{'leg_sl': 21, 'leg_target': 3}
```

The output counts the trades by how they closed. `leg_sl` is the stop (fixed or trailed) and `leg_target` the target. Here they closed every trade before the opposite crossover came; a trade closed by `self.exit()` shows `signal`. More: [Stops, targets and scale-out](orders-and-risk.md#stops-targets-and-scale-out), [Trailing stops](orders-and-risk.md#trailing-stops).

## Position sizing?

Position sizing decides how much each trade buys. With no quantity, `self.buy()` on a stock uses the whole equity (the cash plus the value of what the strategy holds) less the estimated charges. It buys fractional shares, so the result does not depend on the share price; pass `quantity_mode="venue"` to `bt.backtest` for whole shares. On futures and options it buys one lot: a lot is the fixed number of units a contract trades in, 65 for NIFTY futures.

To size otherwise, give one of these on the order, or set a sizer once as the class attribute `size`:

| On the order | Quantity |
|---|---|
| `qty=100` | 100 units (shares, or units of a contract; never lots) |
| `lots=2` | 2 lots (futures and options) |
| `size=bt.size.value(50_000)` | Rs 50,000 worth |
| `size=bt.size.percent(50)` | 50 percent of equity |
| `size=bt.size.fixed_risk(1), stop=bt.pct(2)` | As many as lose 1 percent of equity if the stop is hit |
| `size=bt.size.atr_risk(1, 2)` | The same, with the stop distance taken as 2 times the ATR |
| `size=my_sizer` | Your own function `my_sizer(ctx, order)` that returns units |
| `self.target(percent=50)` instead of `buy` | Trade to a position worth 50 percent of equity |

Two class attributes act on every sizer: `size_caps = bt.size.caps(position=bt.pct(50))` keeps any position at or below half the equity, and `reinvest = False` sizes from the starting capital instead of the current equity.

Here every buy takes half the equity. The output shows the shares bought and the price of the first three trades:

<!-- continues -->
<!-- requires-server -->
```python
class HalfCapital(EmaCross):
    size = bt.size.percent(50)  # every buy() without a quantity takes 50 percent of equity


half = bt.backtest(HalfCapital, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(half.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(3).round(2).to_string(index=False))
```

<!-- output -->
```text
               entry_time  entry_units  entry_price_rupees
2021-05-11 09:15:00+05:30       138.24              356.95
2021-09-07 09:15:00+05:30       125.13              431.15
2022-01-07 09:15:00+05:30       114.49              493.55
```

More: [Sizing](costs-slippage-and-margin.md#sizing), [Reinvest and size caps](costs-slippage-and-margin.md#reinvest-and-size-caps), [the position sizing example](examples/position-sizing.md).

## Use NIFTY as the benchmark?

A benchmark is what you compare the strategy with. NIFTY is the usual one: would simply holding the index have done better? Pass `benchmark="NIFTY"`, and the engine reads NIFTY's daily closes (on NSE_INDEX) from your OpenAlgo server. For SENSEX pass `benchmark=("SENSEX", "BSE_INDEX")`. The benchmark never trades. It adds figures such as alpha (the return the index does not explain) and beta (how strongly the strategy moved with the index) to `result.metrics`, and the index's line to the tearsheet. Missing index data is a warning, never a stop.

<!-- continues -->
<!-- requires-server -->
```python
vs_nifty = bt.backtest(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000, benchmark="NIFTY")
m = vs_nifty.metrics
print(f"Strategy {m['total_return']:.1%}, NIFTY {m['benchmark_total_return']:.1%}, beta {m['beta']:.2f}")
```

<!-- output -->
```text
Strategy 71.9%, NIFTY 80.6%, beta 0.61
```

The crossover on SBIN made less than holding NIFTY, and a beta of 0.61 means it moved about 0.6 times as much as the index. More: [A benchmark](results-and-reports.md#a-benchmark).

## Make a tearsheet?

A tearsheet is the report of a backtest: its figures and charts on one HTML page that opens in any browser, with no internet needed. `result.tearsheet("report.html")` writes it. `mode="basic"` gives a shorter report, `mode="metrics"` only the figures with their definitions and `mode="charts"` only the charts; `log_scale=True` draws the growth of a long run on a log scale.

The full report of the NIFTY run above, with the NIFTY comparison:

<!-- continues -->
<!-- requires-server -->
```python
path = vs_nifty.tearsheet("sbin_ema.html")
print("open", path, "in your browser")
```

<!-- output -->
```text
open sbin_ema.html in your browser
```

The same figures are in `result.metrics`, a Python dictionary, and in `result.metrics_table()`, a table with a label and a definition for each:

<!-- continues -->
<!-- requires-server -->
```python
table = vs_nifty.metrics_table()
print(table.loc[["net_profit", "cagr", "max_drawdown", "sharpe", "win_rate"], ["label", "value"]])
```

<!-- output -->
```text
                         label         value
key
net_profit          Net profit  71912.034709
cagr                      CAGR      0.096874
max_drawdown  Maximum drawdown     -0.236526
sharpe            Sharpe ratio      0.577846
win_rate              Win rate      0.391304
```

Returns are fractions: a CAGR (compound annual growth rate) of 0.0969 is 9.7 percent a year, and a maximum drawdown of -0.2365 is a fall of 23.7 percent from the highest equity.

A Monte Carlo study asks how the run might have gone with the same days in another order. `result.monte_carlo()` shuffles the sessions 1,000 times; the 5th, 50th and 95th percentiles show a bad, a typical and a good outcome:

<!-- continues -->
<!-- requires-server -->
```python
study = vs_nifty.monte_carlo(simulations=1000, seed=1)
print(study.percentiles.loc[[0.05, 0.5, 0.95]].round(3))
```

<!-- output -->
```text
            final_return   cagr  max_drawdown  sharpe
percentile
0.05              -0.236 -0.045        -0.509  -0.131
0.50               0.730  0.098        -0.298   0.591
0.95               2.752  0.253        -0.184   1.273
```

More: [The HTML tearsheet](results-and-reports.md#the-html-tearsheet), [Metric Definitions](metric-definitions.md), [Monte Carlo](results-and-reports.md#monte-carlo).

## Get the trade list?

`result.trades` has one row per trade (a buy and the sell that closed it), with the times in IST:

<!-- continues -->
<!-- requires-server -->
```python
trades = result.trades
columns = ["symbol", "direction", "entry_time", "exit_time", "entry_units", "entry_price_rupees",
           "exit_price_rupees", "net_pnl_rupees", "exit_reason"]
print(trades[columns].head(3).round(2).to_string(index=False))
```

<!-- output -->
```text
symbol direction                entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees exit_reason
  SBIN      long 2021-05-11 09:15:00+05:30 2021-08-20 09:15:00+05:30       279.82              356.95              414.9        15960.07      signal
  SBIN      long 2021-09-07 09:15:00+05:30 2021-11-29 09:15:00+05:30       268.63              431.15              469.9        10124.68      signal
  SBIN      long 2022-01-07 09:15:00+05:30 2022-02-24 09:15:00+05:30       255.16              493.55              479.9        -3775.97      signal
```

Each trade was decided at a session's close and filled at the next session's open, 09:15 IST. `trades.to_csv("trades.csv", index=False)` saves the list for a spreadsheet.

* `exit_reason` says why each trade closed: `signal` (your own exit), `leg_sl` (the stop, fixed or trailed), `leg_target` (a target), `scheduler` (the intraday square-off), `eod` (an MIS position closed at the session's last close), `daily_loss_limit`, `drawdown_halt` and `time_exit` (the strategy risk rules), and `roll` and `expiry` (futures).
* Also useful: `gross_pnl_rupees` (before charges), `costs_rupees` (the charges) and `max_units` (the largest position during the trade). Columns such as `entry_ts`, `entry_slice` and `instrument` are for the engine; you can ignore them.
* A position still open at the end is not a trade yet; it is in `result.final_positions`.
* The other tables: `result.fills` (every execution), `result.orders` (every order, the rejected ones with their `reject_code`) and `result.contract_notes` (the charges of each day).

More: [The tables](results-and-reports.md#the-tables), [Exit reasons](orders-and-risk.md#exit-reasons).

## Optimize a strategy's parameters?

A parameter is a number in the strategy you could change, such as the 10 and 30 of `EmaCross`: every class attribute with a number default is one. `bt.optimize` backtests every combination of the values you list and ranks them. Here it tries 5 fast and 8 slow lengths on 2021 to 2024 and ranks the pairs by the Sharpe ratio (the return per unit of risk; higher is better):

<!-- continues -->
<!-- requires-server -->
```python
opt = bt.optimize(EmaCross, client, start="2021-01-01", end="2024-12-31", capital=100_000,
                  fast=range(5, 30, 5), slow=range(20, 100, 10), objective="sharpe", workers=1)
print(opt.best)
```

<!-- output -->
```text
{'fast': 5, 'slow': 20}
```

The Sharpe ratio of every pair as a grid, fast lengths across and slow lengths down:

<!-- continues -->
<!-- requires-server -->
```python
print(opt.heatmap("fast", "slow").round(2))
```

<!-- output -->
```text
fast    5     10    15    20    25
slow
20    0.87  0.80  0.53   NaN  0.70
30    0.74  0.54  0.55  0.45  0.54
40    0.61  0.48  0.60  0.51  0.39
50    0.64  0.48  0.51  0.48  0.42
60    0.55  0.55  0.53  0.48  0.22
70    0.48  0.63  0.52  0.24  0.09
80    0.30  0.34  0.29  0.23  0.17
90    0.18  0.17  0.29  0.21  0.21
```

`NaN` means no value: two EMAs of the same length (20 and 20) never cross, so that pair made no trades to rate.

Then check the chosen values on later data the sweep did not see:

<!-- continues -->
<!-- requires-server -->
```python
later = bt.backtest(EmaCross, client, start="2025-01-01", end="2026-11-11", capital=100_000, params=opt.best)
print(f"Sharpe from 2025: {later.metrics['sharpe']:.2f}")
```

<!-- output -->
```text
Sharpe from 2025: 0.47
```

* `opt.table` has one row per combination, `opt.best` the best parameters, and `opt.select(fast=10, slow=40)` the full result of one combination, so `.tearsheet()` and `.trades` work on it.
* `objective=` takes any [metric](metric-definitions.md) name (the default is `net_profit`), with `maximize=False` for one where lower is better.
* `workers=1` runs the sweep in this process, which works anywhere, a notebook included. Leave it out to use every CPU core (the table is the same): the sweep then starts worker processes that import your file, so run it from a `.py` file with the sweep under `if __name__ == "__main__":`.

**Do not trust the single best cell.** Among many combinations one will look good by luck. Prefer values in a region of the heatmap where the neighbours are good too, and check them on a later period the sweep did not see, as the last block does.

More: [Optimization](optimization.md), [the optimization example](examples/ema-crossover-optimization.md).

## Backtest older years?

Charges are built in from 1 July 2020: every fill is charged at the rates in force on its own trade date (exchange charges, STT, stamp duty, the SEBI fee and GST). A run that starts earlier stops with a `CostError` before it begins, and the message says from which date charges are available. Two ways to go further back:

* `costs=bt.costs.CostModel(backfill=True)` charges every fill dated before 1 July 2020 at the oldest rates the engine has (those of 1 July 2020), and a warning counts the fills it charged that way. Fills from 1 July 2020 on are charged at their own dates' rates as usual.
* `costs=None` runs with no charges at all; every result and report then warns that the profit is overstated.

<!-- continues -->
<!-- requires-server -->
```python
older = bt.backtest(EmaCross, client, start="2019-01-01", end="2026-11-11", capital=100_000,
                    costs=bt.costs.CostModel(backfill=True))
print([text for text in older.warnings if "backfilled" in text])
```

<!-- output -->
```text
['charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2020-07-01 are backfilled for 9 fills, from 2019-03-13']
```

More: [Charges](costs-slippage-and-margin.md#charges).

## Rebalance a buy-and-hold portfolio?

Rebalancing brings each stock of a portfolio back to its share, by selling a little of the stocks that rose and buying a little of those that fell. Declare the stocks with `symbols`, and in `on_bar` call `self.rebalance(weights)` whenever your schedule says so. The weights are percent of equity by symbol. The engine sends one order per stock for the difference, sales first so the buys can use their money, and keeps 2 percent of equity in cash for charges (`cash_buffer=` changes it). The example holds four stocks in equal parts and rebalances at the first session of every quarter:

<!-- continues -->
<!-- requires-server -->
```python
class EqualWeight(bt.Strategy):
    symbols, exchange, interval, product = ("RELIANCE", "HDFCBANK", "INFY", "TCS"), "NSE", "D", "CNC"

    def init(self):
        self.quarter = None  # the quarter of the last rebalance

    def on_bar(self, bars):
        quarter = (self.now.year, (self.now.month - 1) // 3)
        if quarter != self.quarter:  # the first session of a new quarter
            self.quarter = quarter
            self.rebalance({s: 25 for s in self.symbols})  # 25 percent of equity each


portfolio = bt.backtest(EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000)
holdings = portfolio.final_positions
value = holdings["quantity_units"] * holdings["mark_rupees"]
weights = (100 * value / portfolio.equity["equity_rupees"].iloc[-1]).round(1)
print("rebalance orders:", len(portfolio.orders), "| closed trades:", portfolio.metrics["trades"])
print("weights on 11 November 2026:", dict(zip(holdings["symbol"], weights)))
```

<!-- output -->
```text
rebalance orders: 96 | closed trades: 0
weights on 11 November 2026: {'HDFCBANK': 23.9, 'INFY': 24.4, 'RELIANCE': 24.5, 'TCS': 25.5}
```

A rebalance trims and tops up holdings but never closes one, so the run has no closed trades: look at `result.orders`, `result.fills` and `result.final_positions` instead. Between rebalances the weights drift with the prices. More: [the rebalancing example](examples/rebalancing.md).

## Use my own data or yfinance data?

The examples on these pages take their data from your OpenAlgo server, with the client. The engine also reads bars you bring yourself:

* **Your own data:** pass a DataFrame or a CSV file of open, high, low, close and volume with `data=` instead of the client. No server is needed. See [Your own data](data.md#your-own-data).
* **yfinance data:** download it, then pass the DataFrame the same way; [Backtest on yfinance Data](examples/yfinance-data.md) shows the steps.

## Export everything to Excel or CSV?

`result.to_excel("backtest.xlsx")` writes every table of the run (fills, orders, trades, positions, equity, events, charges and contract notes) to one workbook, a sheet per table. It needs `pip install openpyxl`, which the SDK does not install. `result.to_csv("results")` writes the same tables as CSV files into the folder `results`, one file per table. Both write the times as plain IST date-times, which Excel shows as they are.

<!-- continues -->
<!-- requires-server -->
```python
paths = result.to_csv("results")
print([path.name for path in paths])
```

<!-- output -->
```text
['fills.csv', 'orders.csv', 'trades.csv', 'positions.csv', 'equity.csv', 'events.csv', 'stale_marks.csv', 'costs.csv', 'contract_notes.csv']
```
