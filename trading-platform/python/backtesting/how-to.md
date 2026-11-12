# How do I ...?

Short answers to the questions traders ask most often, each with a small example on real NSE data from your OpenAlgo server. Every answer links to the page with the details.

## The strategy the answers use

The snippets share one setup: an OpenAlgo client and an EMA crossover on SBIN daily bars (buy when the 10-day EMA crosses above the 30-day EMA, sell when it crosses back), backtested from 1 January 2021 to 11 November 2026 with Rs 1,00,000. Replace `your_api_key` with the API key from your OpenAlgo dashboard and run it first; every snippet below continues from it. Indian charges, slippage, tick size and session times are applied without being asked for.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # daily bars of a stock: delivery (CNC)
    fast = 10
    slow = 30

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) <= self.slow:  # let the slow EMA warm up first
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


result = bt.backtest(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000)
```

## Long only, short only, or long and short?

A strategy trades only the side you tell it to:

| You want | In `on_bar` | As conditions in `init` |
|---|---|---|
| Long only | `self.buy()` to enter, `self.exit()` to leave | `self.entry_when(...)`, `self.exit_when(...)` |
| Short only | `self.sell()` to enter, `self.exit()` to cover | `self.short_when(...)`, `self.cover_when(...)` |
| Long and short | Both | All four |

`EmaCross` is long only. To flip between long and short, say the position you want, as the snippet below does: `self.target(qty=-50)` closes a long and opens the short at the same open (`lots=` for futures). With `sell` you need `reverse=True` and the old quantity plus the new one, for example `self.sell(lots=2, reverse=True)` while long one lot. For signal arrays you computed yourself: `bt.from_arrays(entries, exits, shorts=shorts, covers=covers, symbol="SBIN", exchange="NSE", interval="15m")`.

**Shorting stocks.** A delivery (CNC) short is not allowed in Indian cash markets, so on daily bars of a stock a sell that would open a short is rejected (reject code `product_rule` in `result.orders`). Short a stock intraday (MIS, the default on intraday bars, squared off every session), or trade [futures](futures.md) to hold a short overnight.

<!-- continues -->
<!-- requires-server -->
```python
class LongAndShort(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "15m"  # intraday bars: MIS, squared off every session

    def init(self):
        self.fast = self.I(ta.ema, self.close, 9)
        self.slow = self.I(ta.ema, self.close, 21)

    def on_bar(self, bar):
        if self.fast.crossed_above(self.slow):
            self.target(qty=50)  # be long 50: covers a short first, in the same order
        elif self.fast.crossed_below(self.slow):
            self.target(qty=-50)  # be short 50: sells a long first, in the same order


both = bt.backtest(LongAndShort, client, start="2026-01-01", end="2026-11-11", capital=100_000)
print(both.trades["direction"].value_counts().to_dict())
```

<!-- output -->
```text
{'long': 102, 'short': 94}
```

More: [Orders and Risk](orders-and-risk.md#adds-partial-exits-and-reverse), [Condition strategies](writing-strategies.md#condition-strategies).

## Stop-loss, target and trailing stop?

Give them on the order that opens the position. Distances are measured from your average fill price:

| Form | Distance |
|---|---|
| `bt.pct(2)` | 2 percent |
| `bt.points(5)`, or a plain `5` | 5 rupees of price |
| `bt.atr(2)` | 2 times the 14-bar ATR at the entry (the ATR needs 14 bars first) |
| `bt.trail_pct(1)`, `bt.trail_points(5)`, `bt.trail_atr(3)` | A trailing stop: once the price has moved that far in your favour, the stop follows the best price at that distance |
| `bt.breakeven(5)` | Moves the stop to the entry price after a 5-point gain |

On CNC and NRML positions the stop and target are held as GTT orders, the way your broker holds them overnight. On MIS the engine holds them, and what is still open is squared off at the session end. If one bar reaches both the stop and the target, the stop wins. A condition strategy takes the same arguments in `entry_when` and `short_when`.

<!-- continues -->
<!-- requires-server -->
```python
class EmaWithStops(EmaCross):
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

`leg_sl` is the stop (fixed or trailed) and `leg_target` the target. Here they closed every trade before the opposite crossover came; an exit by `self.exit()` shows `signal`. More: [Stops, targets and scale-out](orders-and-risk.md#stops-targets-and-scale-out), [Trailing stops](orders-and-risk.md#trailing-stops).

## Position sizing?

With no quantity, `self.buy()` on a stock uses the whole equity less the estimated charges (in fractional shares; pass `quantity_mode="venue"` to `bt.backtest` for whole shares), and on futures and options one lot. To size otherwise, give one of these on the order, or set a sizer once as the class attribute `size`:

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

Two class attributes act on every sizer: `size_caps = bt.size.caps(position=bt.pct(50))` keeps any position at or below half the equity (it also takes `leverage=` and `risk=`), and `reinvest = False` sizes from the starting capital instead of the current equity.

<!-- continues -->
<!-- requires-server -->
```python
class HalfCapital(EmaCross):
    size = bt.size.percent(50)  # every buy() without a quantity takes 50 percent of equity


half = bt.backtest(HalfCapital, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(half.trades[["entry_time", "entry_units", "entry_price_rupees"]].head(3).round(2))
```

More: [Sizing](costs-slippage-and-margin.md#sizing), [Reinvest and size caps](costs-slippage-and-margin.md#reinvest-and-size-caps), [the position sizing example](examples/position-sizing.md).

## Use NIFTY as the benchmark?

Pass `benchmark="NIFTY"`. The engine reads NIFTY's daily closes on NSE_INDEX from your OpenAlgo data, the same way it reads the strategy's bars. For SENSEX pass `benchmark=("SENSEX", "BSE_INDEX")`; for your own index pass a pandas Series of closes. The benchmark never trades. It adds alpha, beta, correlation, R squared, tracking error, the information ratio and the Treynor ratio to `result.metrics`, and the benchmark lines and the yearly comparison to the tearsheet. Missing index data is a warning, never a stop.

<!-- continues -->
<!-- requires-server -->
```python
vs_nifty = bt.backtest(EmaCross, client, start="2021-01-01", end="2026-11-11", capital=100_000, benchmark="NIFTY")
m = vs_nifty.metrics
print(f"Strategy {m['total_return']:.1%}, NIFTY {m['benchmark_total_return']:.1%}, beta {m['beta']:.2f}")
```

More: [A benchmark](results-and-reports.md#a-benchmark).

## Make a tearsheet?

`result.tearsheet("report.html")` writes one self-contained HTML report; open it in any browser, no internet needed. `mode="basic"` gives a shorter report, `mode="metrics"` only the figures with their definitions and `mode="charts"` only the charts; `log_scale=True` draws the growth of a long run on a log scale. The same figures are in `result.metrics` (a dictionary), `result.metrics_table()` (a table with labels and definitions) and `result.monte_carlo()` (how the run might have gone with its sessions in another order).

<!-- continues -->
<!-- requires-server -->
```python
vs_nifty.tearsheet("sbin_ema.html")  # the full report, with the NIFTY comparison
vs_nifty.tearsheet("sbin_ema_basic.html", mode="basic", log_scale=True)

table = vs_nifty.metrics_table()
print(table.loc[["net_profit", "cagr", "max_drawdown", "sharpe", "win_rate"], ["label", "value"]])

study = vs_nifty.monte_carlo(simulations=1000, seed=1)
print(study.percentiles.loc[[0.05, 0.5, 0.95]].round(3))
```

More: [The HTML tearsheet](results-and-reports.md#the-html-tearsheet), [Metric Definitions](metric-definitions.md), [Monte Carlo](results-and-reports.md#monte-carlo).

## Get the trade list?

`result.trades` has one row per round trip, with the times in IST:

<!-- continues -->
<!-- requires-server -->
```python
trades = result.trades
columns = ["symbol", "direction", "entry_time", "exit_time", "entry_units", "entry_price_rupees",
           "exit_price_rupees", "net_pnl_rupees", "exit_reason"]
print(trades[columns].head(3).round(2).to_string(index=False))
trades.to_csv("trades.csv", index=False)
```

<!-- output -->
```text
symbol direction                entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees exit_reason
  SBIN      long 2021-05-11 09:15:00+05:30 2021-08-20 09:15:00+05:30       279.82              356.95              414.9        15960.07      signal
  SBIN      long 2021-09-07 09:15:00+05:30 2021-11-29 09:15:00+05:30       268.63              431.15              469.9        10124.68      signal
  SBIN      long 2022-01-07 09:15:00+05:30 2022-02-24 09:15:00+05:30       255.16              493.55              479.9        -3775.97      signal
```

Each trade was decided at a session close and filled at the next session's open, 09:15 IST.

* `exit_reason` says why each trade closed: `signal` (your own exit), `leg_sl` (the stop, fixed or trailed), `leg_target` (a target), `scheduler` (the intraday square-off), `eod` (an MIS position closed at the session's last close), `daily_loss_limit`, `drawdown_halt` and `time_exit` (the strategy risk rules), and `roll` and `expiry` (futures).
* Also useful: `gross_pnl_rupees` (before charges), `costs_rupees`, `max_units` (the largest position during the trade) and `r_multiple`. `entry_ts` and `exit_ts` repeat the times as UTC nanoseconds, and `entry_slice`, `exit_slice` and `instrument` are internal; you can ignore them.
* A position still open at the end is not a trade yet; it is in `result.final_positions`.
* The other tables: `result.fills` (every execution), `result.orders` (every order, the rejected ones with their `reject_code`), `result.contract_notes` (the charges of each day), `result.r_summary` (the trades in R-multiples) and `result.to_dataframes()` (all of them at once).

More: [The tables](results-and-reports.md#the-tables), [Exit reasons](orders-and-risk.md#exit-reasons).

## Optimize a strategy's parameters?

Class attributes with a number default are parameters (`fast = 10` and `slow = 30` in `EmaCross`). Name them in `bt.optimize` with the values to try:

<!-- continues -->
<!-- requires-server -->
```python
opt = bt.optimize(EmaCross, client, start="2021-01-01", end="2024-12-31", capital=100_000,
                  fast=range(5, 30, 5), slow=range(20, 100, 10), objective="sharpe", workers=1)
print(opt.best)
print(opt.heatmap("fast", "slow").round(2))

# Check the chosen values on later data the sweep did not see.
later = bt.backtest(EmaCross, client, start="2025-01-01", end="2026-11-11", capital=100_000, params=opt.best)
print(f"Sharpe from 2025: {later.metrics['sharpe']:.2f}")
```

* `opt.table` has one row per combination (the parameters, `objective`, `net_profit`, `total_return`, `max_drawdown`, `sharpe`, `trades`), `opt.best` the best parameters, and `opt.select(fast=10, slow=40)` the full `Result` of one combination, so `.tearsheet()` and `.trades` work on it.
* `objective=` takes any [metric](metric-definitions.md) name (the default is `net_profit`), with `maximize=False` for one where lower is better, or your own function of the `Result`.
* `workers=1` runs the sweep in this process, which works anywhere, a notebook included. Leave it out to use every CPU core (the table is the same): the sweep then starts worker processes that import your file, so run it from a `.py` file with the sweep under `if __name__ == "__main__":`.

**Do not trust the single best cell.** Among many combinations one will look good by luck. Prefer values in a region of the heatmap where the neighbours are good too, and check them on a later period the sweep did not see, as the last lines do.

More: [Optimization](optimization.md), [the optimization example](examples/ema-crossover-optimization.md).

## Backtest older years?

Charges are built in from 1 July 2020: every fill is charged at the rates in force on its own trade date, from the dated schedules of exchange charges, STT, stamp duty, the SEBI fee and GST. A run that starts earlier stops with a `CostError` before it begins, and the message says from which date charges are available. Two ways to go further back:

* `costs=bt.costs.CostModel(backfill=True)` charges every fill dated before 1 July 2020 at the rates of the first schedule (`IN-2020-07-01`), as if those rates had applied then, and a warning counts the fills it charged that way. Fills from 1 July 2020 on are charged at their own dates' rates as usual.
* `costs=None` runs with no charges at all; every result and report then warns that the P&L is overstated.

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

Declare the stocks with `symbols`, and in `on_bar` call `self.rebalance(weights)` whenever your schedule says so. The weights are percent of equity by symbol. The engine sends one order per stock for the difference, sales first so the buys can use their proceeds, and keeps 2 percent of equity in cash for charges and the move to the next open (`cash_buffer=` changes it). The example holds four stocks in equal parts and rebalances at the first session of every quarter:

<!-- continues -->
<!-- requires-server -->
```python
class EqualWeight(bt.Strategy):
    symbols, exchange, interval, product = ("RELIANCE", "HDFCBANK", "INFY", "TCS"), "NSE", "D", "CNC"

    def init(self):
        self.quarter = None

    def on_bar(self, bars):
        quarter = (self.now.year, (self.now.month - 1) // 3)
        if quarter != self.quarter:
            self.quarter = quarter
            self.rebalance({s: 25 for s in self.symbols})   # percent of equity; 2% kept as cash


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

* **Your own data:** pass a DataFrame or a CSV file of open, high, low, close and volume with `data=` instead of the client, and give its time zone with `tz=` when its times have none. No server is needed. See [Your own data](data.md#your-own-data).
* **yfinance data:** download it, then pass the DataFrame the same way; [Backtest on yfinance Data](examples/yfinance-data.md) shows the steps.

<!-- continues -->
<!-- requires-server -->
```python
bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")
bars.to_csv("sbin_daily.csv")  # stands in for your own file

own = bt.backtest(EmaCross, data="sbin_daily.csv", tz="Asia/Kolkata", capital=100_000)
print("same fills as from the server:", own.fills.equals(result.fills))
```

<!-- output -->
```text
same fills as from the server: True
```

## Export everything to Excel or CSV?

`result.to_excel("backtest.xlsx")` writes every table of the run (fills, orders, trades, positions, equity, events, charges and contract notes) to one workbook, a sheet per table. It needs `pip install openpyxl`, which the SDK does not install. `result.to_csv("results")` writes the same tables as CSV files into the folder `results`, one file per table. Both write the times as plain IST date-times, which Excel shows as they are; the `_ts` columns stay UTC nanoseconds.

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
