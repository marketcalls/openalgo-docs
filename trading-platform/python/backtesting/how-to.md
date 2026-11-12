# How do I ...?

Short answers to the questions traders ask most, each with one small example on real data from your OpenAlgo server. Each answer links to the tutorial lesson that explains it step by step.

## The strategy the answers use

Every answer changes one thing in the first strategy of this section, the EMA crossover from [Your First Backtest](tutorial/01-first-backtest.md):

* An **EMA** (exponential moving average) is the average closing price of recent days, with the latest days counting most.
* The strategy **buys** SBIN when its 20-day EMA rises above its 50-day EMA, and **sells** when the 20-day EMA falls back below.
* It runs on **daily bars**: one bar (or candle) per trading day, with its open, high, low and close price. A share on daily bars trades as **CNC** (delivery): the shares are held overnight, as long as the strategy wants.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`. Run this block first: every answer below continues from it, in the same Python session.

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

    # init runs once, before the first bar: it sets up the two EMAs
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # self.I keeps the indicator up to date bar by bar
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: it decides whether to buy or sell
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # wait until there are 50 days of prices for the slow EMA
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):  # no shares, fast EMA just rose above slow
            self.buy()  # buy with all the capital at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):  # holding, fast EMA just fell below slow
            self.exit()  # sell all the shares at the next day's open


# A function (def) is a named piece of code you can call again. This one prints
# the summary of any result. An f-string (f"...") fills the values in {} into the text.
def summary(result):
    m = result.metrics
    print(f"Net profit   : Rs {m['net_profit']:,.2f}")
    print(f"Return       : {m['total_return']:.2%}")
    print(f"Max drawdown : {m['max_drawdown']:.2%}")
    print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")


# Run the backtest on SBIN's daily bars from 2021 to 11 November 2026, with Rs 1,00,000
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
summary(result)
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

## Stop-loss, target and trailing stop?

A **stop-loss** closes a trade when the price moves a set distance against you, so one trade cannot lose too much. A **target** closes it when the price has moved a set distance in your favour. Give both on the buy: `bt.pct(5)` means 5 percent from your buy price.

<!-- requires-server -->
<!-- continues -->
```python
# A new class that takes everything from EmaCrossover and changes only on_bar
class EmaWithStop(EmaCrossover):
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # the same warm-up
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(stop=bt.pct(5), target=bt.pct(10))  # stop 5 percent below the buy price, target 10 percent above
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# Run it, then print the summary and how the trades closed
stopped = bt.backtest(EmaWithStop, client, start="2021-01-01", end="2026-11-11", capital=100_000)
summary(stopped)
print(stopped.trades["exit_reason"].value_counts().to_dict())  # how many trades closed each way
```

<!-- output -->
```text
Net profit   : Rs -10,238.77
Return       : -10.24%
Max drawdown : -23.85%
Trades       : 11 (27% won)
{'leg_sl': 7, 'leg_target': 3, 'signal': 1}
```

`leg_sl` is the stop-loss, `leg_target` the target and `signal` the strategy's own `self.exit()`. On SBIN's daily swings a 5 percent stop closed 7 of the 11 trades early, and this run lost money: always test a stop distance before you trust it. A **trailing stop** follows the price up and never moves down: add `trail=bt.trail_pct(3)` to the buy. Lesson: [Stop-Loss and Target](tutorial/03-stop-loss-and-target.md).

## Position sizing?

Position sizing decides how much each trade buys. With no quantity, `self.buy()` invests all the capital. Set `size` once on the class to change it for every buy:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy, but every buy takes half of the account value
class HalfCapital(EmaCrossover):
    size = bt.size.percent(50)  # 50 percent of the account on each buy()


# Run it and print the summary
half = bt.backtest(HalfCapital, client, start="2021-01-01", end="2026-11-11", capital=100_000)
summary(half)
```

<!-- output -->
```text
Net profit   : Rs 27,236.41
Return       : 27.24%
Max drawdown : -17.62%
Trades       : 11 (36% won)
```

Other ways: `self.buy(qty=100)` for 100 shares, `size = bt.size.value(50_000)` for Rs 50,000 a trade, and `size = bt.size.fixed_risk(1)` with a stop-loss to risk 1 percent of the account per trade. Lesson: [How Much to Buy](tutorial/04-how-much-to-buy.md).

## Trade intraday?

Give the strategy intraday bars, such as `"15m"` (15 minutes). The engine then trades **MIS**, the intraday product: it stops new entries at 14:50 and squares off (closes) every open position at 15:00 IST (the NSE times from 3 August 2026). Brokers keep a limited intraday history, so the run covers a recent stretch:

<!-- requires-server -->
<!-- continues -->
```python
# The same strategy on 15-minute bars
class IntradayEma(EmaCrossover):
    interval = "15m"  # 15-minute bars: intraday (MIS)


# Run it from August 2026, then print the summary and how the trades closed
intraday = bt.backtest(IntradayEma, client, start="2026-08-01", end="2026-11-11", capital=100_000)
summary(intraday)
print(intraday.trades["exit_reason"].value_counts().to_dict())  # "scheduler": closed by the square-off
```

<!-- output -->
```text
Net profit   : Rs -1,128.76
Return       : -1.13%
Max drawdown : -3.82%
Trades       : 9 (56% won)
{'scheduler': 8, 'signal': 1}
```

Lesson: [Trade Intraday](tutorial/05-intraday.md).

## Long only, short only, or long and short?

A **long** trade buys first and gains when the price rises. A **short** trade sells first, buys back later, and gains when the price falls. A share cannot be held short overnight, so short it intraday (MIS), or trade futures. `self.target(qty=-50)` means "be short 50 shares":

<!-- requires-server -->
<!-- continues -->
```python
# Long when the fast EMA crosses above, short when it crosses below, on 15-minute bars
class LongAndShort(EmaCrossover):
    interval = "15m"  # intraday: shorts are allowed

    def on_bar(self, bar):
        if len(self.close) < self.slow:
            return
        if self.fast_ema.crossed_above(self.slow_ema):
            self.target(qty=50)  # be long 50 shares (buys back a short first, in the same order)
        elif self.fast_ema.crossed_below(self.slow_ema):
            self.target(qty=-50)  # be short 50 shares (sells the long first, in the same order)


# Run it, then print the summary and the count of long and short trades
both = bt.backtest(LongAndShort, client, start="2026-08-01", end="2026-11-11", capital=100_000)
summary(both)
print(both.trades["direction"].value_counts().to_dict())  # long and short trades
```

<!-- output -->
```text
Net profit   : Rs -859.89
Return       : -0.86%
Max drawdown : -2.25%
Trades       : 20 (50% won)
{'short': 11, 'long': 9}
```

For short only, use `self.sell(qty=50)` to enter and `self.exit()` to buy back. Lesson: [Go Short](tutorial/06-going-short.md).

## Get the trade list?

`result.trades` has one row per closed trade, with times in Indian time (IST):

<!-- requires-server -->
<!-- continues -->
```python
# The columns to show, as a list of names, then the first three trades
columns = ["entry_time", "exit_time", "entry_units", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]
print(result.trades[columns].head(3).round(2).to_string(index=False))  # head(3): the first three rows
```

<!-- output -->
```text
               entry_time                 exit_time  entry_units  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-05-12 09:15:00+05:30 2021-12-21 09:15:00+05:30       275.23              362.90             456.95        25619.92
2022-01-11 09:15:00+05:30 2022-03-04 09:15:00+05:30       249.37              503.15             460.20       -10994.83
2022-04-06 09:15:00+05:30 2022-05-06 09:15:00+05:30       225.75              507.15             470.90        -8445.92
```

Each trade was decided at a day's close and filled at the next day's open, 09:15. `result.trades.to_csv("trades.csv", index=False)` saves the list for a spreadsheet. Lesson: [Read the Results](tutorial/02-read-the-results.md).

## Make a tearsheet?

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

`mode="basic"` gives a shorter report. Lesson: [Read the Results](tutorial/02-read-the-results.md); every part of the report: [Results and Reports](results-and-reports.md#the-html-tearsheet).

## Use NIFTY as the benchmark?

A benchmark is what you compare the strategy with: would simply holding NIFTY 50 have done better? Pass `benchmark="NIFTY"`, and the engine reads NIFTY's daily closes from your OpenAlgo server:

<!-- requires-server -->
<!-- continues -->
```python
# The same backtest, compared with NIFTY 50
vs_nifty = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000, benchmark="NIFTY")

# The strategy's return, NIFTY's return over the same days, and beta
m = vs_nifty.metrics
print(f"Strategy {m['total_return']:.2%} | NIFTY {m['benchmark_total_return']:.2%} | beta {m['beta']:.2f}")
```

<!-- output -->
```text
Strategy 53.27% | NIFTY 80.63% | beta 0.72
```

Beta says how strongly the strategy moved with the index (1 is in step with it). For SENSEX pass `benchmark=("SENSEX", "BSE_INDEX")`. Lesson: [Compare with NIFTY](tutorial/08-compare-with-nifty.md).

## Trade futures?

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
summary(futures)
```

<!-- output -->
```text
Net profit   : Rs 156,617.14
Return       : 31.32%
Max drawdown : -5.50%
Trades       : 3 (33% won)
```

NIFTY23NOV26FUT expires on 23 November 2026, and your broker serves a contract's history only while it trades: after that, use the current contract and recent dates. Lesson: [Trade Futures](tutorial/07-futures.md).

## Optimize a strategy's parameters?

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

## Use my own data?

Pass a DataFrame of bars with `data=` instead of the client. Here the bars come from `client.history`; `tz="Asia/Kolkata"` says their dates are Indian time:

<!-- requires-server -->
<!-- continues -->
```python
# Fetch SBIN's daily bars yourself: a pandas DataFrame, one row per day
sbin = client.history(symbol="SBIN", exchange="NSE", interval="D", start_date="2021-01-01", end_date="2026-11-11")

# Run the strategy on those bars instead of letting the engine fetch them
own = bt.backtest(EmaCrossover, data=sbin, tz="Asia/Kolkata", capital=100_000)
summary(own)
```

<!-- output -->
```text
Net profit   : Rs 53,267.29
Return       : 53.27%
Max drawdown : -29.82%
Trades       : 11 (36% won)
```

The same bars give the same result. Lesson: [Use Your Own Data](tutorial/11-your-own-data.md); more on columns and time zones: [Data](data.md#your-own-data).

## Backtest older years?

Charges are built in from 1 July 2020, and a run that starts earlier stops with a `CostError`. `costs=bt.costs.CostModel(backfill=True)` charges older fills at the oldest rates the engine has, and a warning counts them:

<!-- requires-server -->
<!-- continues -->
```python
# From 2019, charging fills before 1 July 2020 at the oldest built-in rates
older = bt.backtest(EmaCrossover, client, start="2019-01-01", end="2026-11-11", capital=100_000,
                    costs=bt.costs.CostModel(backfill=True))
summary(older)
print([text for text in older.warnings if "backfilled" in text])  # the warning about older fills
```

<!-- output -->
```text
Net profit   : Rs 106,083.19
Return       : 106.08%
Max drawdown : -35.52%
Trades       : 17 (29% won)
['charges: the NSE_EQ_DELIVERY rates of cost schedule IN-2020-07-01 are backfilled for 6 fills, from 2019-03-20']
```

`costs=None` runs with no charges at all; the result then warns that the profit is overstated. More: [Charges](costs-slippage-and-margin.md#charges).

## Rebalance a buy-and-hold portfolio?

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


# Run it, then print the profit and how many orders the rebalances sent
portfolio = bt.backtest(EqualWeight, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(f"Net profit   : Rs {portfolio.metrics['net_profit']:,.2f}")
print("rebalance orders:", len(portfolio.orders))
```

<!-- output -->
```text
Net profit   : Rs 10,511.19
rebalance orders: 96
```

A rebalance trims and tops up holdings but never closes one, so the run has no closed trades: read `result.orders` and `result.final_positions`. Lesson: [Rebalance a Portfolio](tutorial/10-portfolio-rebalancing.md).

## Export everything to Excel or CSV?

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
