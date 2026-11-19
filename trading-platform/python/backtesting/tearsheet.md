# The Tearsheet

A **tearsheet** is the full report of a backtest on one page that you open in your browser: every figure, every chart and every trade, with NIFTY's figures beside the strategy's when the run has a benchmark. This page makes the tearsheet of one real backtest and walks through it section by section, with a screenshot of each part.

## Make the tearsheet

The run is the EMA crossover of [Your First Backtest](tutorial/01-first-backtest.md): SBIN daily bars from 1 January 2021 to 11 November 2026, Rs 1,00,000 of capital, and NIFTY 50 as the benchmark (the index the strategy is compared with). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

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

    # init runs before the first bar. (def starts a method: steps that belong to the class.)
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


# Run the backtest, with NIFTY 50 as the benchmark.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     benchmark="NIFTY")

# Write the tearsheet to the file sbin.html, in the folder you ran this code from.
path = result.tearsheet("sbin.html")
print("Open", path, "in your browser")
```

<!-- output -->
```text
Open sbin.html in your browser
```

Open `sbin.html` with a double-click, or drag it into your browser. Everything is inside the one file: it opens without an internet connection, and you can email it or keep it with your notes. It holds the results and the settings of the run, never your API key.

The page has eight numbered sections, one under the other. The rest of this page shows each of them for this run. To learn what a figure means, see [Metrics Explained](metrics-explained.md).

## The header and the Overview

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-top.png" alt="The top of the tearsheet: the header with the section links, Export PDF and the theme switch, the strategy name EmaCrossover with its dates, and the twelve Overview tiles from cumulative return 53.94 percent to time in market 66.14 percent, each with NIFTY's figure under it"><figcaption><p>The header and the Overview</p></figcaption></figure>

The **header** stays at the top of the window while you scroll:

* The section names (Overview, Performance, Risk and so on) jump to each section.
* **Export PDF** opens your browser's print window; choose "Save as PDF" there to keep a PDF copy. The header is left out of the printout.
* The round button on the right switches the page between light and dark.

Under the header are the strategy's name (its class name, `EmaCrossover`), the dates of the run, the number of trading days (sessions) and the benchmark.

The **Overview** has twelve tiles, the headline figures of the run. The large number is the strategy's; the small line under it, such as "NIFTY 80.63%", is the same figure for simply holding NIFTY over the same dates. Green is a gain and red a loss.

Here the tiles already tell the story of this run. The strategy returned 53.94 percent, 7.64 percent a year, while NIFTY returned 80.63 percent, 10.62 percent a year. Its worst fall was -29.35 percent against NIFTY's -17.23 percent, and its Sharpe ratio was 0.47 against NIFTY's 0.79. It spent 66.14 percent of the time in the market ("Time in market") and the rest in cash.

## Performance

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-performance.png" alt="The Performance section: the cumulative return chart, the strategy as a black line with grey shading and NIFTY as a blue line, and below it the rolling Sharpe, rolling volatility and rolling win rate charts"><figcaption><p>Performance: the cumulative return and the rolling charts</p></figcaption></figure>

**Cumulative Return** is the most important chart of the report. It shows how much the account had grown since the start, in percent, day by day:

* The **black line** (with grey shading under it) is the strategy; the **blue line** is NIFTY.
* A flat stretch of the black line is a time the strategy held no shares, only cash.
* Here the strategy climbed to about 120 percent early in 2026, then fell back to 53.94 percent. That fall is the max drawdown of the Overview.

Hover over a chart with the mouse to read its values on any day.

The three charts below it are **rolling** figures: each point is measured over the 124 trading days (about six months) before it, so you can see how the strategy behaved at different times:

* **Rolling Sharpe:** the return per unit of ups and downs over each half year. Above 0, that half year made money.
* **Rolling Volatility:** how much the account swung over each half year.
* **Rolling Win Rate:** the share of days on which the account rose.

A strategy whose rolling Sharpe is high in one short stretch and low everywhere else made its money in that one stretch: ask whether it would happen again.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-horizons.png" alt="The Return and Risk by Horizon table: CAGR, max drawdown and Sharpe for the last 1 year, 3 years, 5 years and all-time"><figcaption><p>Performance: return and risk over the last 1, 3 and 5 years</p></figcaption></figure>

**Return & Risk by Horizon** gives the CAGR (return per year), the max drawdown and the Sharpe ratio over the last year, the last 3 and 5 years, and the whole run. Here the last year lost 9.52 percent with a Sharpe of -0.42, while the last 3 years made 11.51 percent a year. A strategy that did well over the whole run but badly in the latest year is worth a closer look before you trade it.

## Risk

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-risk.png" alt="The Risk section: the red drawdown chart, the risk tiles such as max drawdown -29.35 percent and longest drawdown 903 days, and the tiles compared with NIFTY such as beta 0.71 and correlation 0.50"><figcaption><p>Risk: the drawdown chart and the risk figures</p></figcaption></figure>

The red **Drawdown** chart shows how far the account was below its highest value so far, every day. At 0 the account stood at a new high; the deeper the red, the bigger the fall. The two deep valleys here are the falls of late 2021 to 2023 and of 2026.

The tiles under it are the risk figures: the max drawdown, the conditional drawdown (the average of the deepest falls), the longest drawdown in days (903 here, against NIFTY's 463), the value at risk and expected shortfall of a single day, the volatility, the risk of ruin, the skew, the kurtosis and the tail ratio. The row "VS BENCHMARK - NIFTY" compares the strategy with NIFTY: beta, alpha, correlation, R squared, information ratio and Treynor ratio. Alpha is shown as a fraction: 0.02 is about 2 percent a year (1.55 percent before rounding).

Below the tiles, **Rolling Beta** draws the beta over each half year: how closely the strategy followed NIFTY at each time.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-worst-drawdowns.png" alt="The Worst Drawdowns table: the ten deepest falls with the day each started, the day it recovered or Not yet, its length in days and its depth, the worst -29.35 percent from 23 February 2026"><figcaption><p>Risk: the ten worst drawdowns</p></figcaption></figure>

**Worst Drawdowns** lists the ten deepest falls: when each started, when the account got back to its earlier high ("Not yet" when it has not), how many days that took, and how deep it went. Here the worst fall, -29.35 percent, began on 23 February 2026 and had not recovered by the end of the run. The second, -28.06 percent, began on 4 November 2021 and took 903 days to recover. Read this table as a question: could you have waited two and a half years for the account to recover?

At the end of the section, **Consecutive Losing Streaks** counts how often the account fell on 1, 2, 3 or more days in a row. Here the longest run of falling days was 7.

## Monthly

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-monthly.png" alt="The Monthly section: the monthly returns heatmap with a row per year from 2021 to 2026, the weekly returns of 2026, and tiles for the best month 18.08 percent, the worst month -16.15 percent, gain to pain, win days and the average winning and losing day"><figcaption><p>Monthly: the month and week heatmaps</p></figcaption></figure>

**Monthly Returns** is a heatmap: one row per year, one cell per month, with the month's return in percent. Green cells are gains and red cells losses; the stronger the colour, the bigger the move. A 0.0 cell is a month the strategy spent in cash. Look for patterns: a strategy that makes all its money in two or three months has had a lucky streak, not a steady edge.

**Weekly Returns** shows every week of one year the same way. Pick the year from the list at its top right.

The tiles under them give the best and worst month, the gain to pain ratio, the share of rising days ("Win days") and the average rising and falling day, each with NIFTY's figure.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-annual.png" alt="The Annual Returns chart: a black bar for the strategy and a blue bar for NIFTY in each year from 2021 to 2026, a dashed red line at the strategy's average year, and a table of each year's return"><figcaption><p>Monthly: each year against NIFTY</p></figcaption></figure>

**Annual Returns** compares each calendar year: the black bar is the strategy and the blue bar NIFTY. The dashed red line is the strategy's average year. The table under it gives the numbers. Here 2023 stands out: the strategy lost 13.50 percent while NIFTY gained 20.03 percent.

## Distribution

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-distribution.png" alt="The Distribution section: tiles for the best day 8.93 percent, the worst day -14.20 percent, skew, kurtosis and the outlier ratios, a histogram of the daily returns and box plots of the daily and monthly returns"><figcaption><p>Distribution: how the daily returns were spread</p></figcaption></figure>

This section shows how big the daily moves were:

* The tiles give the best and worst day (8.93 and -14.20 percent here, against NIFTY's 4.74 and -5.93), the skew, the kurtosis and the outlier ratios. [Metrics Explained](metrics-explained.md#tail-risk) explains them.
* **Daily Returns** is a histogram: each bar counts the days whose return fell in its range, green above zero and red below. The tall bar at 0 is the many days spent in cash. The dashed line marks the average day.
* **Returns Spread** draws the daily and the monthly returns as box plots. The line runs from the lowest to the highest value, the box holds the middle half of the days (or months), and the mark inside it is the middle one, the median. A green box has a median above zero, a red one below.

## Metrics

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-metrics.png" alt="The Metrics section: a table with one row per figure, from Start and End to Sharpe ratio and Exposure, with a column for NIFTY and a column for the strategy EmaCrossover"><figcaption><p>Metrics: every figure, NIFTY beside the strategy</p></figcaption></figure>

**Metrics** lists every figure of the run in one table, 120 here, with NIFTY's value in one column and the strategy's in the next. "n/a" means the figure does not apply to the index, such as the exposure of a buy-and-hold. Click a column heading to sort the table by it. The figures are the same as in `result.metrics_table()`; [Metrics Explained](metrics-explained.md) explains each one.

## Trades

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-trades.png" alt="The top of the Trades section: twelve tiles for the closed trades, from 11 trades, win rate 36.36 percent, profit factor 1.95, payoff ratio 3.40, expectancy Rs 4,904 and average holding 127 days 10 hours to the average and largest win and loss, gross P&L Rs 57,264 and net P&L Rs 53,941"><figcaption><p>Trades: the trade figures</p></figcaption></figure>

The tiles sum up the closed trades: how many, the win rate, the profit factor, the payoff ratio, the expectancy (the average profit per trade), the average holding time (127 days and 10 hours here), the average and largest win and loss, and the P&L before charges (gross) and after them (net).

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-trading-cost.png" alt="The Trading Cost row: six tiles, turnover of closed trades Rs 28,32,598, charges Rs 3,323, slippage Rs 706.85, trading cost Rs 4,030, cost over gross P&L 7.04 percent and cost over turnover 14.2 basis points"><figcaption><p>Trades: what trading cost the closed trades</p></figcaption></figure>

The **Trading Cost** row puts the two costs of trading side by side. A tile shows whole rupees from Rs 1,000 up and paise below, which is why slippage reads Rs 706.85 and the trading cost Rs 4,030. The figures below are as the tiles show them; `result.metrics` and the Charges table give them to the paisa.

* **Turnover** (Rs 28,32,598): the value of every buy and every sell of the closed trades. The last tile measures the cost against it.
* **Charges** (Rs 3,323): brokerage, STT and the other charges, itemised in the Charges table below.
* **Slippage** (Rs 706.85): what the fills lost to slippage, each fill's price against its price before slippage. It is already inside the fill prices, so it is already in the gross and net P&L: the tile shows it, nothing takes it off a second time.
* **Trading cost** (Rs 4,030): charges plus slippage, everything trading cost these trades.
* **Cost / gross P&L** (7.04 percent): the share of the profit before charges that the trading cost took.
* **Cost / turnover** (14.2 basis points; a basis point is 0.01 percent): Rs 142 of cost on every Rs 1,00,000 bought or sold. A trade pays it on its buy and on its sell, so it has to move about 0.28 percent just to pay its way. Watch this tile for a strategy that trades often.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-mae-mfe.png" alt="The MAE and MFE block: six tiles (average MAE -5.10 percent, average MFE 20.56 percent, worst MAE Rs -16,608, best MFE Rs 80,823, edge ratio 4.03 and profit kept 52.08 percent), a red histogram of each trade's MAE and a green histogram of each trade's MFE in percent of capital at work, with the number of trades on the left axis, and two scatter charts of MAE and of MFE against each trade's return, with winners as green circles and the other trades as red crosses"><figcaption><p>Trades: how far each trade went against you and in your favour</p></figcaption></figure>

While a trade is open, its profit rises and falls. **MAE** (maximum adverse excursion) is the worst it stood at: its deepest open loss, before charges, zero or negative. **MFE** (maximum favourable excursion) is the best: its highest open profit, zero or positive. Only prices the trade could have seen count: the high and low of each day it was held through, and its own fill prices. The percents are of the trade's capital at work: its entry price times the most shares it held.

The six tiles:

* **Avg MAE** (-5.10 percent) and **Avg MFE** (20.56 percent): on average a trade was at worst 5.10 percent down and at best 20.56 percent up.
* **Worst MAE** (Rs -16,608): the deepest open loss of any trade. It was trade 10, which closed at that very loss.
* **Best MFE** (Rs 80,823): the highest open profit of any trade. It was trade 9, which closed Rs 40,811.70 up before charges: it gave back half.
* **Edge ratio** (4.03): the average MFE over the size of the average MAE (without its minus sign). Above 1, the trades moved further in your favour than against you; here four times as far.
* **Profit kept** (52.08 percent): the winners' profit before charges over their best open profit. The four winners kept about half of what they had at their best.

The four charts show each trade:

* **MAE Distribution** and **MFE Distribution** count the trades by their MAE and by their MFE: the height of each bar, read on the axis at the left, is the number of trades in its range, and the dashed line is the average. Here no trade went more than 9.40 percent against, and seven of the 11 never got more than 10 percent ahead while four ran 29 to 60 percent ahead.
* **MAE vs Return** puts each trade's MAE across and its return up: a green circle is a winner, a red cross a loser (or a flat trade). Read it against your stop-loss. A loser whose MAE is much deeper than its stop says the stop is not where the trades end: the price gapped through it and the exit filled beyond it, or (for an option or a GTT) the stop's limit order did not fill. A winner far to the left says a tighter stop would have cut it: trade 9 was 5.22 percent down at one point and still made 30.19 percent, so a stop closer than about 5 percent would have stopped it out. This strategy has no stop-loss, and most of its losers closed near their MAE, when the EMAs crossed back. The return is after charges and the MAE before them, so a loser that closed at its worst returned a little less than its MAE: trade 2 was 8.54 percent down at worst and returned -8.76 percent.
* **MFE vs Return** puts each trade's MFE across and its return up. A winner that gave back most of its MFE says the exits are late. Here trades 1, 7 and 9 were 49 to 60 percent up at their best but closed 28 to 31 percent up: the crossover exit waits for the fast EMA to cross back, and they gave back a third to a half of each large rise. Trade 4 gave back the largest share: it was 29.05 percent up at its best and closed 9.59 percent up, about two thirds of its MFE gone. A target or a trailing stop ([Stop-Loss and Target](tutorial/03-stop-loss-and-target.md)) is the usual way to keep more of it.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-trade-list.png" alt="The Trade List: one row per closed trade with its entry and exit times, each written as the date over the time, quantity, entry and exit price, gross P&L, charges, net P&L, return, MAE and MFE in rupees, bars and days held, and the exit reason signal in the last column"><figcaption><p>Trades: the trade list, with each trade's MAE and MFE</p></figcaption></figure>

The **Trade List** has one row per closed trade, the same rows as `result.trade_list()`: when each trade was bought and sold (in IST), the quantity, the prices, the profit before charges (gross P&L), the charges, the profit after them (net P&L), the return, the MAE and MFE in rupees, how long it was held in bars and in days, and why it closed (`signal` is the strategy's own `self.exit()`). Each time is written as the date over the time, so in a window 1,280 pixels wide, as in the picture, every column fits, the exit reason included. On a narrower screen, scroll the table sideways to reach the last columns. Click a column heading to sort the trades by it, for example by net P&L to see the best and worst trades first, or by MAE to see the deepest open losses. A long list is split into pages; Prev and Next at the bottom move between them.

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-charges.png" alt="The Charges table: brokerage, STT, exchange transaction charge, SEBI fee, stamp duty, GST, the DP charge and the contract-note rounding, each in rupees and as a share of the total, then the total charges Rs 3,322.91, the slippage in fill prices Rs 706.85, the trading cost Rs 4,029.76, gross P&L, net P&L and charges as a share of gross P&L"><figcaption><p>Trades: the charges, item by item</p></figcaption></figure>

**Charges** splits what the trades paid into each charge, in rupees and as a share of the total. For delivery (CNC) trades like these, STT is most of it: Rs 2,832.60 of Rs 3,322.91. The last item, **Contract-note rounding** (Rs 1.26 here), is what the rounding on each day's contract note added: STT and stamp duty are rounded to whole rupees there, and each trade pays its share. With it the trades add up to the account, so the net P&L here equals the net profit of the run. Under the total, **Slippage (in fill prices)** and **Trading cost** repeat the figures of the Trading Cost row; the slippage is already in the gross and net P&L below them. In all, charges took 5.80 percent of the gross profit.

When a strategy opens trades with a stop-loss, this section also has an **R-multiples** table: each trade's profit or loss in units of what its stop-loss risked.

## Overfitting checks

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-overfitting.png" alt="The Overfitting checks section: the Quick checks card with 0 passed, 0 failed, 4 not judged, how to read the checks, the line Too few trades to judge: 11 closed trades; the checks need 30 to judge, and a table of the four checks (random out of sample, trade reshuffle, trade resample and variance) with each one's question, figure n/a, rule and verdict not judged"><figcaption><p>Overfitting checks: the quick checks of the closed trades</p></figcaption></figure>

This section comes after Trades, in the full report and in `mode="basic"`. It shows the four quick checks of the closed trades: random out of sample, trade reshuffle, trade resample and variance, each with its figure, its rule and its verdict, a count of how many passed, failed or could not be judged, and a few lines on how to read them. [Overfitting checks](results-and-reports.md#overfitting-checks) explains each check.

The checks need at least 30 closed trades. This run closed 11, so the section says "Too few trades to judge: 11 closed trades; the checks need 30 to judge" and judges nothing. Run a strategy with more trades to see the verdicts. A failed check means the edge did not hold up under it, not that the strategy is proven overfitted. The line at the end of the section points to `result.robustness()`, the full set of seventeen checks with their own HTML report: see [Robustness and Overfitting](robustness.md).

## Notes

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-notes.png" alt="The Notes section: how the figures were computed, and the start of the Assumptions table with base D, product CNC, fill next_open and quantity_mode venue"><figcaption><p>Notes: how the figures were worked out, and the settings of the run</p></figcaption></figure>

**How the figures were computed** says how returns are measured, how they are turned into yearly figures (here with 247.89 trading days a year from the NSE calendar) and the risk-free rate used.

**Assumptions** lists every setting the run used, the same lines as `print(result)` ([Read the Results](tutorial/02-read-the-results.md#what-the-engine-assumed-for-you) explains them), and ends with every warning of the run, in red. Read the warnings before you trust the figures.

## Light and dark

<figure><img src="../../../.gitbook/assets/backtest-tearsheet-dark.png" alt="The top of the same tearsheet in the dark theme: the header, the Overview tiles and the cumulative return chart on a dark background"><figcaption><p>The same tearsheet in the dark theme</p></figcaption></figure>

The tearsheet first follows your computer's light or dark setting. The round button at the top right switches it.

## A shorter report

`mode=` writes only a part of the page. This block continues the one at the top:

<!-- requires-server -->
<!-- continues -->
```python
# A shorter report with the headline sections only.
path = result.tearsheet("sbin_basic.html", mode="basic")
print("Open", path, "in your browser")
```

<!-- output -->
```text
Open sbin_basic.html in your browser
```

| `mode=` | What the page holds |
|---|---|
| `"full"` (the default) | Every section |
| `"basic"` | The Overview, the cumulative return and the returns by horizon, the drawdown chart and the worst drawdowns, the monthly heatmap and the yearly returns, the trades, the trading cost, the MAE and MFE histograms and the charges, and the Notes |
| `"metrics"` | Every figure with its value and definition, and the settings the run used |
| `"charts"` | Every chart and nothing else, the MAE and MFE histograms and scatter charts included |

## What to look at first

1. **The Overview tiles:** the return, the CAGR and the max drawdown, each against NIFTY.
2. **The cumulative return chart:** did the account grow steadily, or in one lucky stretch?
3. **The worst drawdowns:** how deep the falls went and how long they took to recover. Could you have held on?
4. **The annual returns:** did the strategy make money in most years, or in one or two?
5. **The trade list:** did the profit come from many trades or from a few?
6. **The MAE and MFE charts:** did the losers end near your stop, and did the winners keep most of their best open profit?
7. **The warnings** at the end of the Notes.

## More options

* `log_scale=True` draws the cumulative return on a log scale, which reads better on long runs with large gains.
* Without a path, `result.tearsheet()` returns the page as text instead of writing a file.
* A tearsheet of figures you computed yourself: `openalgo.backtest.report.tearsheet(performance, path)`. See [Metrics](support-functions/metrics.md).
* Every table behind the tearsheet, as pandas DataFrames: [Results and Reports](results-and-reports.md).
