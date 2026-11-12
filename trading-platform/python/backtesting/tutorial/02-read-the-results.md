# Read the Results

In this lesson you look inside the result of your first backtest: what the four summary numbers mean, the list of every trade, a full report you open in your browser, and what the engine assumed for you.

The first block runs the EMA crossover of [lesson 1](01-first-backtest.md) again. The blocks after it continue from it: add them below it in the same file (or run them in the same notebook). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

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
        if len(self.close) < self.slow:  # warm-up: wait until there are 50 days for the slow EMA
            return
        # Buy when holding nothing (is_flat) and the fast EMA crosses above the slow EMA.
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all the capital, at the next day's open
        # Sell when holding shares (is_long) and the fast EMA crosses back below.
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest: 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)

# Print the summary. f"..." is an f-string: the values in braces are filled in.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

## What the four numbers mean

* **Net profit** (Rs 53,267.29) is what the strategy made after every charge. A position still open on the last day would count too, valued at that day's close; here the last trade had already closed.
* **Return** (53.27 percent) is the net profit as a percent of the starting capital, Rs 1,00,000.
* **Max drawdown** (-29.82 percent) is the largest fall of the account from its highest value to a later low. At its worst moment, the account was 29.82 percent below the best value it had reached. Ask yourself whether you would have kept the strategy running through that fall: if not, the profit at the end does not help you.
* **Trades** (11) counts the round trips: a buy and the sell that closed it. The **win rate** (36 percent) is the share of trades that made money, here 4 of 11. A trend strategy often wins less than half its trades: many small losses, and a few large wins that pay for them. The profit matters more than how often you win.

## Every trade

`result.trades` is the list of trades, one row per trade. It is a table (a pandas DataFrame); the block below picks five of its columns and prints every row:

<!-- requires-server -->
<!-- continues -->
```python
# The columns to show: when each trade was bought and sold, the prices, and its profit or loss.
columns = ["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]
# Print those columns for every trade, without row numbers, with two decimals.
print(result.trades[columns].to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-05-12 09:15:00+05:30 2021-12-21 09:15:00+05:30              362.90             456.95        25619.92
2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30              503.15             460.20       -10994.83
2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30              507.15             470.90        -8445.92
2022-07-13 09:15:00+05:30 2023-01-30 09:15:00+05:30              487.85             535.85        10171.56
2023-04-28 09:15:00+05:30 2023-08-17 09:15:00+05:30              567.95             565.60         -755.01
2023-09-15 09:15:00+05:30 2023-10-19 09:15:00+05:30              599.50             569.65        -6015.90
2023-12-07 09:15:00+05:30 2024-08-14 09:15:00+05:30              610.15             800.75        33895.47
2024-11-05 09:15:00+05:30 2025-01-01 09:15:00+05:30              830.05             795.35        -6318.88
2025-04-03 09:15:00+05:30 2026-03-30 09:15:00+05:30              770.20            1004.75        41356.49
2026-04-27 09:15:00+05:30 2026-05-11 09:15:00+05:30             1111.20            1006.75       -17154.75
2026-07-03 09:15:00+05:30 2026-09-08 09:15:00+05:30             1055.25            1004.65        -8094.06
```

* Each row is one trade: bought at `entry_time` and sold at `exit_time`, both in IST (`+05:30`). 09:15 is the market open, when every order of this daily strategy filled.
* The prices are per share and include slippage. `net_pnl_rupees` is the trade's profit or loss after its own charges.
* The first trade, bought in May 2021 at 362.90 and sold in December 2021 at 456.95, made Rs 25,619.92. A few long trends like that one paid for the many short losses.

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

Open the file in any browser; it needs no internet. It shows:

* the **equity curve**, the value of your account day by day, with the drawdowns underneath;
* the return of each month and each year;
* every figure with a one-line definition;
* the trade list, the charges paid and the settings the run used.

## What the engine assumed for you

You gave only the strategy, the dates and the capital. Everything else had a default for Indian markets:

* **Product:** CNC (delivery), because the bars are daily and SBIN is a stock.
* **Fills:** each order is decided at a bar's close and filled at the next bar's open.
* **Quantity:** all the equity less the estimated charges. **Equity** is your cash plus the value of the shares you hold. The engine buys fractional shares (275.23 shares in the first trade), so the result does not depend on the share price.
* **Charges:** brokerage plus every statutory and exchange charge (STT, exchange and IPFT charges, SEBI fee, stamp duty, GST, and the DP charge on a delivery sell), at the rates in force on each trade date.
* **Slippage:** every fill is 2 basis points (0.02 percent) worse than the price.
* **Sessions:** NSE trading hours and holidays.

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
  quantity_mode: fractional
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
  benchmark: None
  indicator_checks: window tolerance 1e-06 (relative); ema(SBIN.close, 20): truncation passed at 4 cuts, warm-up 128 bars
  gross P&L: 56627.86 (realized 56627.86)
  charges: 3360.57; net P&L: 53267.29
  warning: SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
```

A few lines worth knowing:

* `product: CNC` and `fill: next_open` are the first two defaults above; `costs` and `slippage` name the charges and the slippage used.
* `gross P&L` is the profit before charges, `charges` is what the charges came to, and `net P&L` is what was left: the net profit.
* Read the `warning:` lines at the end after every run. Here the only one says the engine assumed SBIN trades in single shares with a price step (tick) of 0.05 rupees. An order the engine refused, or a charge rate not yet checked against its source, would be listed here too.
* The other lines are settings this lesson does not use; `None` means not set.

## More options

* Every other figure (CAGR, Sharpe ratio, profit factor and more) is in `result.metrics`: see [Metric Definitions](../metric-definitions.md).
* A shorter report: `result.tearsheet("sbin.html", mode="basic")`. See [The HTML tearsheet](../results-and-reports.md#the-html-tearsheet).
* Save the trade list for a spreadsheet: `result.trades.to_csv("trades.csv", index=False)`.
* Every order, every fill and the account value day by day: `result.orders`, `result.fills`, `result.equity`. See [The tables](../results-and-reports.md#the-tables).

## What you learned

* Net profit and return say how much the strategy made; max drawdown says how deep the worst fall was on the way.
* `result.trades` lists every trade, and `result.tearsheet(...)` writes the full report.
* The engine applies Indian charges, slippage, the product and session times by default, and `print(result)` lists them.

## Next lesson

[Stop-Loss and Target](03-stop-loss-and-target.md): limit the loss of each trade, book profits, and follow a rising price with a trailing stop.
