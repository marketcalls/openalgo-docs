# Common Tasks

Short recipes for the tasks traders do most often, each with one small example on real data from your OpenAlgo server. Each recipe links to the tutorial lesson that explains it step by step.

## The strategy the examples use

Every example changes one thing in the first strategy of this section, the EMA crossover from [Your First Backtest](tutorial/01-first-backtest.md):

* An **EMA** (exponential moving average) is the average closing price of recent days, with the latest days counting most.
* The strategy **buys** SBIN when its 20-day EMA rises above its 50-day EMA, and **sells** when the 20-day EMA falls back below.
* It runs on **daily bars**: one bar (or candle) per trading day, with its open, high, low and close price. A share on daily bars trades as **CNC** (delivery): the shares are held overnight, as long as the strategy wants.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`. Run this block first: every example below continues from it, in the same Python session.

<!-- requires-server -->
```python
# Load the backtest engine, the OpenAlgo client and the indicators (ta)
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class is a recipe; the engine follows it on every bar.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs before the first bar: it sets up the two EMAs
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I keeps the indicator up to date bar by bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: it decides whether to buy or sell
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):  # no shares, fast EMA just rose above slow
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):  # holding, fast EMA just fell below slow
            self.exit()  # sell all the shares at the next day's open


# Run the backtest on SBIN's daily bars from 2021 to 11 November 2026, with Rs 1,00,000
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(result.summary())   # net profit, return, drawdown and trades
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
```

The engine loads SBIN's daily bars from before 1 January 2021 by itself, so both EMAs are ready on the first day: the strategy needs no waiting code.

## Print a short summary

`print(result.summary())` prints the net profit, the return, the max drawdown (the largest fall of the account from its highest value) and the trades with the share that made money. A run with `benchmark="NIFTY"` adds a line with NIFTY's return, and a run with no closed trade says `no closed trades`. For one figure in your own code, look it up by name in `result.metrics`:

<!-- requires-server -->
<!-- continues -->
```python
# result.metrics holds every figure by name; f"..." fills the value into the text, :.2% as a percent
print(f"Return per year (CAGR): {result.metrics['cagr']:.2%}")
```

<!-- output -->
```text
Return per year (CAGR): 7.64%
```

`print(result)` prints the long version: every setting the run used and its warnings. Lesson: [Read the Results](tutorial/02-read-the-results.md); every figure: [Metric Definitions](metric-definitions.md).

## Get the trade list as a table

`result.trade_list()` gives the closed trades as a pandas table, one row per trade, with times in Indian time (IST), the quantity in shares and the money in rupees:

<!-- requires-server -->
<!-- continues -->
```python
# The closed trades as a table; pick the columns to show, then print the first three trades
trades = result.trade_list()
columns = ["entry_time", "exit_time", "quantity", "entry_price", "exit_price", "net_pnl"]
print(trades[columns].head(3).round({"net_pnl": 2}).to_string())  # head(3): the first three rows
```

<!-- output -->
```text
                     entry_time                 exit_time  quantity  entry_price  exit_price   net_pnl
trade
1     2021-05-11 09:15:00+05:30 2021-12-21 09:15:00+05:30     270.0       356.95      456.95  26742.48
2     2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30     246.0       503.15      460.20 -10846.92
3     2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30     222.0       507.15      470.90  -8306.89
```

Each trade was decided at a day's close and filled at the next day's open, 09:15. The table also has `direction`, `product`, `gross_pnl`, `charges`, `return_pct`, `bars_held`, `days_held`, `exit_reason`, `mae` and `mfe` (the worst and the best each trade's profit stood at while it was open), `mae_pct`, `mfe_pct` and `slippage`. `result.trade_list().to_csv("trades.csv")` saves it for a spreadsheet. Lesson: [Read the Results](tutorial/02-read-the-results.md).

## Add a stop-loss, target or trailing stop

A **stop-loss** closes a trade when the price moves a set distance against you, so one trade cannot lose too much. A **target** closes it when the price has moved a set distance in your favour. Give both on the buy: `bt.pct(5)` means 5 percent from your buy price.

<!-- requires-server -->
<!-- continues -->
```python
# A new class that takes everything from EmaCrossover and changes only on_bar
class EmaWithStop(EmaCrossover):
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.pct(5), target=bt.pct(10))  # stop 5 percent below the buy price, target 10 percent above
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it, then print the summary and how the trades closed
stopped = bt.backtest(EmaWithStop, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(stopped.summary())
print(stopped.trade_list()["exit_reason"].value_counts().to_dict())  # how many trades closed each way
```

<!-- output -->
```text
Net profit   : Rs -10,002.82
Return       : -10.00%
Max drawdown : -23.38%
Trades       : 11 (27% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
{'leg_sl': 7, 'leg_target': 3, 'signal': 1}
```

`leg_sl` is the stop-loss, `leg_target` the target and `signal` the strategy's own `self.exit()`. On SBIN's daily swings a 5 percent stop closed 7 of the 11 trades early, and this run lost money: always test a stop distance before you trust it. A **trailing stop** follows the price up and never moves down: add `trail=bt.trail_pct(3)` to the buy. Lesson: [Stop-Loss and Target](tutorial/03-stop-loss-and-target.md).

## Size a position

Position sizing decides how much each trade buys. With no quantity, `self.buy()` buys as many whole shares as 98 percent of the capital pays for (2 percent stays in cash, in case the next open is higher). Set `size` once on the class to change it for every buy:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy, but every buy takes half of the account value
class HalfCapital(EmaCrossover):
    size = bt.size.percent(50)  # 50 percent of the account on each buy()


# Run it and print the summary
half = bt.backtest(HalfCapital, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(half.summary())
```

<!-- output -->
```text
Net profit   : Rs 28,200.50
Return       : 28.20%
Max drawdown : -17.50%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
```

Other ways: `self.buy(qty=100)` for 100 shares, `size = bt.size.value(50_000)` for Rs 50,000 a trade, and `size = bt.size.fixed_risk(1)` with a stop-loss to risk 1 percent of the account per trade. Lesson: [How Much to Buy](tutorial/04-how-much-to-buy.md).

## Buy part shares

The engine buys whole shares by default, the way your broker trades them: a size that works out to 182.6 shares buys 182. For research, `quantity_mode="fractional"` buys the exact part shares instead, with all the capital at the fill price, so the result does not depend on the share price:

<!-- requires-server -->
<!-- continues -->
```python
# The same backtest in part shares, then the shares of its first three trades
part = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                   quantity_mode="fractional")
print(part.trade_list()["quantity"].head(3).round(2).tolist())
```

<!-- output -->
```text
[279.82, 253.53, 229.51]
```

The first trade bought 279.82 part shares, where the whole-share run bought 270. Your broker cannot fill part shares, so keep the default for a result you mean to trade. Lesson: [How Much to Buy](tutorial/04-how-much-to-buy.md).

## Trade intraday

Give the strategy intraday bars, such as `"15m"` (15 minutes). The engine then trades **MIS**, the intraday product: it stops new entries at 14:50 and squares off (closes) every open position at 15:00 IST (the NSE times from 3 August 2026). Brokers keep a limited intraday history, so the run covers a recent stretch:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy on 15-minute bars
class IntradayEma(EmaCrossover):
    interval = "15m"  # 15-minute bars: intraday (MIS)


# Run it from August 2026, then print the summary and how the trades closed
intraday = bt.backtest(IntradayEma, client, start="2026-08-01", end="2026-11-11", capital=100_000)
print(intraday.summary())
print(intraday.trade_list()["exit_reason"].value_counts().to_dict())  # "scheduler": closed by the square-off
```

<!-- output -->
```text
Net profit   : Rs -1,469.38
Return       : -1.47%
Max drawdown : -3.74%
Trades       : 8 (38% won)
Overfitting  : too few trades to judge (8 closed, 30 needed)
{'scheduler': 7, 'signal': 1}
```

Lesson: [Trade Intraday](tutorial/05-intraday.md).

## Trade long only, short only, or both

A **long** trade buys first and gains when the price rises. A **short** trade sells first, buys back later, and gains when the price falls. A share cannot be held short overnight, so short it intraday (MIS), or trade futures. `self.target(qty=-50)` means "be short 50 shares":

<!-- requires-server -->
<!-- continues -->
```python
# Long when the fast EMA crosses above, short when it crosses below, on 15-minute bars
class LongAndShort(EmaCrossover):
    interval = "15m"  # intraday: shorts are allowed

    def on_bar(self, bar):
        if self.fast_ema.crossed_above(self.slow_ema):
            self.target(qty=50)  # be long 50 shares (buys back a short first, in the same order)
        elif self.fast_ema.crossed_below(self.slow_ema):
            self.target(qty=-50)  # be short 50 shares (sells the long first, in the same order)


# Run it, then print the summary and the count of long and short trades
both = bt.backtest(LongAndShort, client, start="2026-08-01", end="2026-11-11", capital=100_000)
print(both.summary())
print(both.trade_list()["direction"].value_counts().to_dict())  # long and short trades
```

<!-- output -->
```text
Net profit   : Rs -1,043.80
Return       : -1.04%
Max drawdown : -2.25%
Trades       : 19 (42% won)
Overfitting  : too few trades to judge (19 closed, 30 needed)
{'short': 11, 'long': 8}
```

For short only, use `self.sell(qty=50)` to enter and `self.exit()` to buy back. Lesson: [Go Short](tutorial/06-going-short.md).

## Read the warning about orders not placed

When the engine refuses or skips orders you did not plan for, the run goes on without them, and at the end Python prints one `OrdersNotPlacedWarning` that counts them and gives the most common reason. A short on daily bars is the usual cause, because a delivery (CNC) short is not allowed:

<!-- requires-server -->
<!-- continues -->
```python
# Sell short on daily bars: CNC, so every sell is refused
class DeliveryShort(EmaCrossover):
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_below(self.slow_ema):
            self.sell()


# Run it and print the summary: no trades
shorts = bt.backtest(DeliveryShort, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(shorts.summary())
```

<!-- output -->
```text
Net profit   : Rs 0.00
Return       : 0.00%
Max drawdown : 0.00%
Trades       : no closed trades
Overfitting  : too few trades to judge (0 closed, 30 needed)
```

On the screen, after the file name and line number:

```text
OrdersNotPlacedWarning: 12 of 12 orders were rejected because a delivery (CNC) short is not allowed in Indian cash markets (reject_code 'product_rule'). See result.warnings.
```

`result.warnings` has the full line with what to do: short a stock intraday (MIS), or trade futures. Orders kept out by a rule you set, such as the 14:50 cut-off for new intraday positions, give no such warning: `result.warnings` only counts them. Lesson: [Go Short](tutorial/06-going-short.md); every reject code: [Orders and Risk](orders-and-risk.md#why-was-my-order-rejected).

## Make a tearsheet

A tearsheet is the report of a backtest: its figures and charts on one HTML page that opens in any browser, with no internet needed.

<!-- requires-server -->
<!-- continues -->
```python
print(result.tearsheet("sbin_ema.html"))  # writes the report and prints its file name
```

<!-- output -->
```text
sbin_ema.html
```

The page has a bar of section links and a light and dark switch at the top, then the sections Overview, Performance, Risk, Monthly, Distribution, Metrics, Trades and Notes. Look first at the cumulative return chart, the worst drawdowns and the trade list. `mode="basic"` gives a shorter report. Lesson: [Read the Results](tutorial/02-read-the-results.md); every part of the report: [Results and Reports](results-and-reports.md#the-html-tearsheet).

## Use NIFTY as the benchmark

A benchmark is what you compare the strategy with: would simply holding NIFTY 50 have done better? Pass `benchmark="NIFTY"`, and the engine reads NIFTY's daily closes from your OpenAlgo server:

<!-- requires-server -->
<!-- continues -->
```python
# The same backtest, compared with NIFTY 50
vs_nifty = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000, benchmark="NIFTY")

# The summary ends with NIFTY's return; then beta, from result.metrics (:.2f: two decimals)
print(vs_nifty.summary())
print(f"Beta         : {vs_nifty.metrics['beta']:.2f}")
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Benchmark    : 80.63% return (NIFTY)
Beta         : 0.71
```

Beta says how strongly the strategy moved with the index (1 is in step with it). For SENSEX pass `benchmark=("SENSEX", "BSE_INDEX")`. Lesson: [Compare with NIFTY](tutorial/08-compare-with-nifty.md).

## Trade futures

Name the contract as the symbol, on NFO. A buy with no quantity buys one **lot**, the fixed number of units a contract trades in (65 for NIFTY). `product = "NRML"` holds the position overnight. Futures block **margin**, money set aside while the position is open (20 percent of the contract value by default), so the run needs more capital:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy on the NIFTY November 2026 future, 15-minute bars, held overnight
class NiftyFutures(EmaCrossover):
    symbol, exchange, interval = "NIFTY23NOV26FUT", "NFO", "15m"
    product = "NRML"  # futures held overnight


# Run it inside the contract's life, with Rs 5,00,000
futures = bt.backtest(NiftyFutures, client, start="2026-10-01", end="2026-11-11", capital=500_000)
print(futures.summary())
```

<!-- output -->
```text
Net profit   : Rs 1,50,448.96
Return       : 30.09%
Max drawdown : -5.57%
Trades       : 4 (25% won), 1 still open
Overfitting  : too few trades to judge (4 closed, 30 needed)
```

NIFTY23NOV26FUT expires on 23 November 2026, and your broker serves a contract's history only while it trades: after that, use the current contract and recent dates. Lesson: [Trade Futures](tutorial/07-futures.md).

## Optimize a strategy's parameters

`bt.optimize` backtests every combination of the numbers you list and ranks them. Here it tries four fast and four slow EMA lengths on 2021 to 2024, and ranks them by the Sharpe ratio (the return for the risk taken; higher is better):

<!-- requires-server -->
<!-- continues -->
```python
# range(10, 30, 5) is 10, 15, 20, 25; range(40, 80, 10) is 40, 50, 60, 70
opt = bt.optimize(EmaCrossover, client, start="2021-01-01", end="2024-12-31", capital=100_000,
                  fast=range(10, 30, 5), slow=range(40, 80, 10), objective="sharpe", workers=1)
print(opt.best)  # the best pair
```

<!-- output -->
```text
{'fast': 10, 'slow': 70}
```

Do not trust the single best pair: among many, one looks good by luck. Check it on later years the sweep did not see (`start="2025-01-01"`). `workers=1` runs in one process, which works anywhere, a notebook included. Lesson: [Find Better Settings](tutorial/09-find-better-settings.md).

## Use your own data

Pass a DataFrame of bars with `data=` instead of the client. Here the bars come from `client.history`. Fetch them from earlier than the day the test starts, so the EMAs are ready on it, and say where the test starts with `start=`. Daily bars need nothing more; intraday bars also need `tz="Asia/Kolkata"`, to say their times are Indian time:

<!-- requires-server -->
<!-- continues -->
```python
# Fetch SBIN's daily bars yourself, from 2018: a pandas DataFrame, one row per day
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2018-01-01", end_date="2026-11-11")

# Run the strategy on those bars from 1 January 2021; the earlier bars get the EMAs ready
own = bt.backtest(EmaCrossover, data=sbin, start="2021-01-01", capital=100_000)
print(own.summary())
```

<!-- output -->
```text
Net profit   : Rs 53,941.09
Return       : 53.94%
Max drawdown : -29.35%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
```

The same bars give the same result. Lesson: [Use Your Own Data](tutorial/11-your-own-data.md); more on columns and time zones: [Data](data.md#your-own-data).

## Understand the wait before the first trade

An indicator needs earlier bars before its value settles: about two years of days for a 50-day EMA. When the engine fetches the bars itself, it loads that history before `start`. When your own bars begin on `start`, or a stock has just listed, there is no earlier history, so the strategy waits inside the run, without trading, until its indicators are ready:

<!-- requires-server -->
<!-- continues -->
```python
# Own bars that begin on the first day of the test: no earlier days for the EMAs
late_bars = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")
late = bt.backtest(EmaCrossover, data=late_bars, capital=100_000)
print(late.summary())
```

<!-- output -->
```text
Net profit   : Rs 30,738.50
Return       : 30.74%
Max drawdown : -29.38%
Trades       : 7 (29% won)
Overfitting  : too few trades to judge (7 closed, 30 needed)
```

Python says so on the screen when the run ends, after the file name and line number:

```text
WarmUpWarning: The strategy waited inside the run for its indicators to warm up and made its first decision at 2023-01-23 15:30 IST (SBIN waited 511 strategy bars): signals before then were not taken. See result.warnings for why.
```

`result.warnings` has the details: the 50-day EMA needs 512 daily bars, and the bars given begin on 1 January 2021. The fix: fetch the bars from an earlier date and pass `start=`, as in [Use your own data](#use-your-own-data) above. Lesson: [Use Your Own Data](tutorial/11-your-own-data.md).

The wait is for history that does not exist. When the history exists but OpenAlgo cannot send it (the server is not running, or the broker login has expired), the run does not wait: it stops with a `ServerError` that says to log in to the broker in OpenAlgo and run the backtest again. Before it stops, the engine asks the server once more for the stock's most recent sessions, without the local cache, so a broker that only refuses older dates does not stop it.

## Understand why `init` runs twice

To learn the warm-up. Before it loads any data, the engine runs `init` on its own reference bars (made-up prices it keeps for this one job) to find how many earlier bars each indicator needs; then it runs `init` again on your bars, with that history loaded. So keep `init` for setting up indicators with `self.I`: a `print` in it shows twice. `self.I` works only in `init`; called in `on_bar`, it stops the run with an `IndicatorOutsideInitError`. More: [Writing Strategies](writing-strategies.md#what-does-each-part-do).

## Backtest older years

Charges are built in from 1 July 2020, and a run that starts earlier stops with a `CostError`. `costs=bt.costs.CostModel(backfill=True)` charges older fills at the oldest rates the engine has, and a warning counts them:

<!-- requires-server -->
<!-- continues -->
```python
# From 2019, charging fills before 1 July 2020 at the oldest built-in rates
older = bt.backtest(EmaCrossover, client, start="2019-01-01", end="2026-11-11", capital=100_000,
                    costs=bt.costs.CostModel(backfill=True))
print(older.summary())
print([text for text in older.warnings if "backfilled" in text])  # the warning about older fills
```

<!-- output -->
```text
Net profit   : Rs 1,04,087.35
Return       : 104.09%
Max drawdown : -35.12%
Trades       : 17 (29% won)
Overfitting  : too few trades to judge (17 closed, 30 needed)
['charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2020-07-01 are backfilled for 6 fills, from 2019-03-19']
```

The 50-day EMA needs 512 daily bars before the start, and here the broker served them: the engine loaded SBIN's bars from 5 December 2016 to 31 December 2018, so the strategy was ready on 1 January 2019 and first bought on 19 March 2019. Its 6 fills before 1 July 2020 were charged at the oldest built-in rates, and Python also prints an `UnverifiedScheduleWarning` that says those charges may be off. A broker keeps only a limited history: when it has too few bars before the start, the strategy waits inside the run and a `WarmUpWarning` says so. Bars you download into Historify, used with `source="db"`, can reach further back.

`costs=None` runs with no charges at all; the result then warns that the profit is overstated. More: [Charges](costs-slippage-and-margin.md#what-am-i-charged-on-each-trade).

## Read the warning about unverified charges

A daily run on NSE shares that starts in early 2021 prints an `UnverifiedScheduleWarning`: the charge rates in force until 31 March 2021 are marked as not verified. In those months NSE charged shares outside the NIFTY 50 and NIFTY Next 50 a lower transaction charge, and the engine does not know which shares belong to those indices. `result.warnings` has the full text:

<!-- requires-server -->
<!-- continues -->
```python
# The full text of the warning about the early-2021 charges
print([text for text in result.warnings if "never verified" in text][0])
```

<!-- output -->
```text
charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2021-01-01 used for 2021-01-01 were never verified against their source, so the charges may be off. Until 2021-03-31 NSE charged EQ-series shares outside the NIFTY 50 and NIFTY Next 50 Rs 2.75 per lakh (NSE/FA/46225) and the shares of those two indices this standard rate. The engine does not know an index's members, so the row is unverified.
```

For a NIFTY 50 or NIFTY Next 50 share, such as SBIN, the charges are right. For another share the transaction charge of fills before 1 April 2021 is a little too high. More: [Charges](costs-slippage-and-margin.md#what-am-i-charged-on-each-trade).

## Rebalance a buy-and-hold portfolio

Rebalancing brings each stock of a portfolio back to its share of the account. Name the stocks with `symbols`, and call `self.rebalance(weights)` with the percent of the account for each. This one holds four stocks in equal parts and rebalances at the first session of every quarter:

<!-- requires-server -->
<!-- continues -->
```python
# The strategy: four stocks, daily bars, delivery (CNC)
class EqualWeight(bt.Strategy):
    symbols, exchange, interval, product = ("RELIANCE", "HDFCBANK", "INFY", "TCS"), "NSE", "D", "CNC"

    # init: no rebalance has happened yet
    def init(self):
        self.quarter = None  # the quarter of the last rebalance

    # on_bar: rebalance on the first session of each quarter
    def on_bar(self, bars):
        quarter = (self.now.year, (self.now.month - 1) // 3)  # year and quarter of today's bar
        if quarter != self.quarter:  # the first session of a new quarter
            self.quarter = quarter
            self.rebalance({s: 25 for s in self.symbols})  # a dict: each stock with 25 percent of the account


# Run it, then print the summary and how many orders the rebalances sent
portfolio = bt.backtest(EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(portfolio.summary())
print("rebalance orders:", len(portfolio.orders))
```

<!-- output -->
```text
Net profit   : Rs 11,055.12
Return       : 11.06%
Max drawdown : -33.98%
Trades       : no closed trades (4 still open)
Overfitting  : too few trades to judge (0 closed, 30 needed)
rebalance orders: 69
```

A rebalance trims and tops up holdings but never closes one, so the run has no closed trades (the summary counts the holdings still open): read `result.orders` and `result.final_positions`. Lesson: [Rebalance a Portfolio](tutorial/10-portfolio-rebalancing.md).

## Export everything to a spreadsheet or CSV

`result.to_csv("results")` writes every table of the run as a CSV file into the folder `results`:

<!-- requires-server -->
<!-- continues -->
```python
# Write the tables, then print the name of each file written
paths = result.to_csv("results")
print([path.name for path in paths])
```

<!-- output -->
```text
['fills.csv', 'orders.csv', 'trades.csv', 'positions.csv', 'equity.csv', 'events.csv', 'stale_marks.csv', 'costs.csv', 'contract_notes.csv']
```

`result.to_excel("backtest.xlsx")` writes the same tables to one workbook, a sheet per table; it needs `pip install openpyxl`. More: [Results and Reports](results-and-reports.md#saving-to-excel-or-csv).
