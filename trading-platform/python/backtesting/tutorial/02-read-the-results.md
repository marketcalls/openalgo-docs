# Read the Results

In this lesson you look inside the result of your first backtest: the short summary, any single figure by its name, the list of every trade, a full report you open in your browser, and what the engine assumed for you.

The first block runs the EMA crossover of [lesson 1](01-first-backtest.md) again, this time measured against NIFTY 50. The blocks after it continue from it: add them below it in the same file (or run them in the same notebook). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

## Run the backtest

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy of lesson 1. A class groups the strategy's settings and steps under one name.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        # self.I(...) makes an indicator line that the strategy can read at every bar.
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # 20-day EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, self.slow)  # 50-day EMA of the closes

    # on_bar runs at the close of every bar (here once a day) and decides what to do.
    def on_bar(self, bar):
        # Buy when holding nothing (is_flat) and the fast EMA crosses above the slow EMA.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        # Sell when holding shares (is_long) and the fast EMA crosses back below.
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.
# benchmark="NIFTY" also measures NIFTY 50 over the same dates, to compare with.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     benchmark="NIFTY")

# Print the summary.
print(result.summary())   # net profit, return, drawdown, trades and NIFTY's return
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Benchmark    : 80.63% return (NIFTY)
```

## What the summary says

* **Net profit** (Rs 53,941.09) is what the strategy made after every charge. A position still open on the last day would count too, valued at that day's close; here the last trade had already closed.
* **Return** (53.94 percent) is the net profit as a percent of the starting capital, Rs 1,00,000.
* **Max drawdown** (-29.35 percent) is the largest fall of the account from its highest value to a later low. At its worst moment, the account was 29.35 percent below the best value it had reached. Ask yourself whether you would have kept the strategy running through that fall: if not, the profit at the end does not help you.
* **Trades** (11) counts the round trips: a buy and the sell that closed it. The **win rate** (36 percent won) is the share of trades that made money, here 4 of 11. A trend strategy often wins less than half its trades: many small losses, and a few large wins that pay for them. The profit matters more than how often you win.
* **Benchmark** (80.63 percent) is what simply holding NIFTY 50 returned over the same dates. Here the index did better than the strategy; [Compare with NIFTY](08-compare-with-nifty.md) looks at that closely.

## One figure by its name

The summary is for reading. To use a figure in your own code, take it from `result.metrics`. It is a dict: a set of values, each looked up by its name in square brackets. `result.metrics["cagr"]` is the **CAGR**, the average return per year:

<!-- requires-server -->
<!-- continues -->
```python
# result.metrics holds every figure of the run by name. "cagr" is the return per year.
cagr = result.metrics["cagr"]
# f"..." is an f-string: the value in braces is filled in, and :.2% writes it as a percent.
print(f"Return per year: {cagr:.2%}")
```

<!-- output -->
```text
Return per year: 7.64%
```

The figures in `result.metrics` are plain numbers: a percent is kept as a fraction (0.0764 is 7.64 percent), and money is in rupees. The other names, such as `"net_profit"`, `"max_drawdown"` and `"sharpe"`, and what each one means, are in [Metric Definitions](../metric-definitions.md).

## Every trade

`result.trade_list()` gives the closed trades as a table (a pandas DataFrame), one row per trade, numbered from 1. The block below picks six of its columns and prints every row:

<!-- requires-server -->
<!-- continues -->
```python
# The closed trades as a table, one row each.
trades = result.trade_list()
# The columns to show: when each trade was bought and sold, the shares, the prices and the profit or loss.
columns = ["entry_time", "exit_time", "quantity", "entry_price", "exit_price", "net_pnl"]
print(trades[columns].to_string(float_format="%.2f"))  # every row, with two decimals
```

<!-- output -->
```text
                     entry_time                 exit_time  quantity  entry_price  exit_price   net_pnl
trade
1     2021-05-11 09:15:00+05:30 2021-12-21 09:15:00+05:30    270.00       356.95      456.95  26741.28
2     2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30    246.00       503.15      460.20 -10846.48
3     2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30    222.00       507.15      470.90  -8305.91
4     2022-07-13 09:15:00+05:30 2023-01-30 09:15:00+05:30    217.00       487.85      535.85  10153.35
5     2023-04-28 09:15:00+05:30 2023-08-17 09:15:00+05:30    204.00       567.95      565.60   -752.78
6     2023-09-15 09:15:00+05:30 2023-10-19 09:15:00+05:30    191.00       599.50      569.65  -5966.26
7     2023-12-07 09:15:00+05:30 2024-08-14 09:15:00+05:30    178.00       610.15      800.75  33633.80
8     2024-11-05 09:15:00+05:30 2025-01-01 09:15:00+05:30    170.00       830.05      795.35  -6222.16
9     2025-04-03 09:15:00+05:30 2026-03-30 09:15:00+05:30    174.00       770.20     1004.75  40455.86
10    2026-04-27 09:15:00+05:30 2026-05-11 09:15:00+05:30    159.00      1111.20     1006.75 -16998.74
11    2026-07-03 09:15:00+05:30 2026-09-08 09:15:00+05:30    150.00      1055.25     1004.65  -7949.63
```

* Each row is one trade: bought at `entry_time` and sold at `exit_time`, both in IST (`+05:30`). 09:15 is the market open, when every order of this daily strategy filled.
* `quantity` is the number of shares bought: whole shares, as many as 98 percent of the account could pay for. Later trades bought fewer, because each share cost more.
* The prices are per share, in rupees, and include slippage. `net_pnl` is the trade's profit or loss in rupees, after its own charges.
* The first trade, bought in May 2021 at 356.95 and sold in December 2021 at 456.95, made Rs 26,741.28. A few long trends like that one paid for the many short losses.
* The table has more columns: `direction` (long or short), `product`, `gross_pnl` (before charges), `charges`, `return_pct` (the trade's return in percent), `bars_held` and `days_held` (how long it was held) and `exit_reason` (why it was sold; `signal` is your own `self.exit()`).

## The HTML report

A tearsheet is the full report of a backtest on one HTML page. `result.tearsheet("sbin.html")` writes it to the file `sbin.html` in the folder you ran the code from, and returns the file's name:

<!-- requires-server -->
<!-- continues -->
```python
# Write the full report to sbin.html, then print where it is.
path = result.tearsheet("sbin.html")
print("Open", path, "in your browser")
```

<!-- output -->
```text
Open sbin.html in your browser
```

Open the file in any browser; it needs no internet. A bar at the top links to each section and switches the page between light and dark. The sections, in order:

* **Overview:** the headline figures as tiles (return, CAGR, Sharpe ratio, max drawdown and more), each with NIFTY's figure under it.
* **Performance:** the strategy's cumulative return drawn against NIFTY's, and how its return and risk changed over time.
* **Risk:** the drawdown chart, the ten worst drawdowns with when each started and recovered, and how closely the strategy moved with NIFTY.
* **Monthly:** the return of every month, week and year, as coloured grids.
* **Distribution:** how the daily returns were spread, from the worst day to the best.
* **Metrics:** every figure in one table, with NIFTY's beside it.
* **Trades:** the trade list (the same rows as `result.trade_list()`) and the charges by kind.
* **Notes:** how the figures were computed, and the settings and warnings of the run.

What to look at first:

1. **The cumulative return chart** (Performance): did the strategy end above or below NIFTY, and did it climb steadily or in a few big jumps?
2. **The worst drawdowns** (Risk): how deep the worst fall was, and how long the account took to recover from it.
3. **The trade list** (Trades): did the profit come from many trades or from a few?

## What the engine assumed for you

You gave only the strategy, the dates, the capital and the benchmark. Everything else had a default for Indian markets:

* **Product:** CNC (delivery), because the bars are daily and SBIN is a stock.
* **Fills:** each order is decided at a bar's close and filled at the next bar's open.
* **Quantity:** whole shares, as many as 98 percent of the equity pays for at the close of the day the order is decided, after the estimated charges (270 shares in the first trade). The 2 percent kept in cash covers a higher price at the next open, so the order is not refused for want of money. **Equity** is your cash plus the value of the shares you hold.
* **Charges:** brokerage plus every statutory and exchange charge (STT, exchange and IPFT charges, SEBI fee, stamp duty, GST, and the DP charge on a delivery sell), at the rates in force on each trade date.
* **Slippage:** every fill is 2 basis points (0.02 percent) worse than the price.
* **Sessions:** NSE trading hours and holidays.
* **Warm-up:** the earlier daily bars needed to get the EMAs ready by the start date, loaded by the engine.

`print(result)` lists every setting the run used, the profit before and after charges, and the warnings:

<!-- requires-server -->
<!-- continues -->
```python
# Print the settings the run used, the profit before and after charges, and the warnings.
print(result)
```

<!-- output -->
```text
Result(SBIN)
  base: D
  product: CNC
  entry_from: None
  entry_until: None
  square_off: None
  fill: next_open
  quantity_mode: venue
  sizing: whole shares and whole lots; an order with no quantity is sized at the decision close and keeps 2 percent of its budget in cash for the move to the next open (the engine's cash buffer, the same in live trading), then takes off its estimated charges; bt.size sizers and target() keep no buffer, and rebalance keeps its own cash_buffer
  costs: zerodha (contract-note rounding)
  slippage: default table
  capital: 100000.0
  max_daily_loss: None
  risk_basis: gross
  after_risk_exit: lock_session
  drawdown_halt: None
  cooldown: None
  max_positions: None
  max_hold: None
  leverage: None
  max_adds: None
  max_position: None
  min_spacing: None
  max_risk: None
  allow_averaging_down: False
  reinvest: True
  size_caps: None
  base_rule: base D (a daily or longer strategy): stops are tested on the day's range and fill at the stop level, or at the open on a gap; combined and daily-loss exits fill at the day's close
  instruments: SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05, no freeze quantity, NSE equity costs); pass instrument= for its own terms
  benchmark: NIFTY on NSE_INDEX: 1454 daily closes from the broker (zerodha, source='api'), 2020-12-31 to 2026-11-11
  indicator_checks: window tolerance 1e-06 (relative); ema(SBIN.close, 20): truncation passed at 4 cuts, warm-up 128 bars; ema(SBIN.close, 50): truncation passed at 4 cuts, warm-up 512 bars
  warm_up: automatic: no decision before start, nor before every self.I indicator has closed its warm-up of bars (its window-stability length on the engine's reference bars, the same for any data and in live trading; bars before start count); ema(SBIN.close, 50) needs 512 D bars of SBIN; history before start: SBIN 512 strategy bars from 2018-12-10 to 2020-12-31 (asked from 2018-10-28); ready at start
  gross P&L: 57264.00 (realized 57264.00)
  charges: 3322.91; net P&L: 53941.09
  warning: SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
  warning: charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2021-01-01 used for 2021-01-01 were never verified against their source, so the charges may be off. Until 2021-03-31 NSE charged EQ-series shares outside the NIFTY 50 and NIFTY Next 50 Rs 2.75 per lakh (NSE/FA/46225) and the shares of those two indices this standard rate. The engine does not know an index's members, so the row is unverified.
```

A few lines worth knowing:

* `product: CNC` and `fill: next_open` are the first two defaults above, `quantity_mode: venue` is the whole-shares rule, and `sizing` says how a buy with no quantity is sized, with the 2 percent kept in cash. `costs` and `slippage` name the charges and the slippage used.
* `benchmark` says where NIFTY's daily closes came from.
* `warm_up` says that the 50-day EMA needs 512 daily bars, which earlier days the engine loaded for it (from 10 December 2018 to 31 December 2020), and `ready at start` that both EMAs were ready on the first day.
* `gross P&L` is the profit before charges, `charges` is what the charges came to, and `net P&L` is what was left: the net profit.
* Read the `warning:` lines at the end after every run. Here the first says the engine assumed SBIN trades in single shares with a price step (tick) of 0.05 rupees, and the second is the note about early-2021 charges from [lesson 1](01-first-backtest.md). An order the engine refused would be listed here too.
* The other lines are settings this lesson does not use; `None` means not set.

## More options

* A shorter report: `result.tearsheet("sbin.html", mode="basic")`. See [The HTML tearsheet](../results-and-reports.md#the-html-tearsheet).
* Save the trade list for a spreadsheet: `result.trade_list().to_csv("trades.csv")`.
* Every order, every fill and the account value day by day: `result.orders`, `result.fills`, `result.equity`. See [The tables](../results-and-reports.md#the-tables).

## What you learned

* `print(result.summary())` shows the net profit, return, max drawdown and trades, and with `benchmark="NIFTY"` also NIFTY's return.
* `result.metrics["cagr"]` gives one figure by its name; `result.trade_list()` lists every trade.
* `result.tearsheet(...)` writes the full report. Look first at the return against NIFTY, the worst drawdowns and the trade list.
* The engine applies Indian charges, slippage, the product, session times and the warm-up by default, and `print(result)` lists them.

## Next lesson

[Stop-Loss and Target](03-stop-loss-and-target.md): limit the loss of each trade, book profits, and follow a rising price with a trailing stop.
