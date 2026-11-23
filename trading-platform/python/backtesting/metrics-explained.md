# Metrics Explained

A backtest reports up to 120 figures: what the strategy made, how far it fell on the way, how its trades went and how it compared with NIFTY. This page explains each figure in plain words, shows its value for one real run, and says how to tell a good value from a bad one. [Metric Definitions](metric-definitions.md) gives the exact formula of each figure.

{% hint style="info" %}
A backtest shows what a strategy would have done on past prices. No figure here predicts what it will do next. Use the figures to compare strategies and to see their risks before you trade one.
{% endhint %}

## The example run

Every value on this page comes from the EMA crossover of [Your First Backtest](tutorial/01-first-backtest.md): SBIN daily bars from 1 January 2021 to 11 November 2026, Rs 1,00,000 of capital, and NIFTY 50 as the benchmark (the index the strategy is compared with). It is the run of [Read the Results](tutorial/02-read-the-results.md). Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

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


# Run the backtest: 1 January 2021 to 11 November 2026, starting with Rs 1,00,000.
# benchmark="NIFTY" also measures NIFTY 50 over the same dates, to compare with.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000,
                     benchmark="NIFTY")

# Print the summary.
print(result.summary())   # net profit, return, drawdown, trades and NIFTY's return
```

<!-- output -->
```text
Net profit   : Rs 53,485.86
Return       : 53.49%
Max drawdown : -29.42%
Trades       : 11 (36% won)
Overfitting  : too few trades to judge (11 closed, 30 needed)
Benchmark    : 80.63% return (NIFTY)
```

## Where the figures are

* `result.metrics["cagr"]` gives one figure by its name in code (its key, such as `"cagr"`).
* `result.metrics_table()` lists every figure with its group, label, value, unit and definition: see [Every figure at once](tutorial/02-read-the-results.md#every-figure-at-once).
* The tearsheet (`result.tearsheet("sbin.html")`) shows them all in its Metrics section, with NIFTY's figure beside each.

In code, a percent is kept as a fraction of 1: 0.0759 is 7.59 percent, and `f"{value:.2%}"` prints it as a percent. Money is in rupees. On this page every percent is written as a percent.

Two words come up again and again below:

* A **session** is one trading day of the exchange.
* **Equity** is the value of the account at a moment: its cash plus its open positions at the current price.

## Start with these eight

Out of 120 figures, eight tell you most of what you need. This block continues the one above and prints them:

<!-- requires-server -->
<!-- continues -->
```python
# result.metrics holds every figure by name; f"..." fills each value into the text.
m = result.metrics
print(f"Net profit    : Rs {m['net_profit']:,.2f}")  # :,.2f writes rupees with commas and two decimals
print(f"CAGR          : {m['cagr']:.2%}")  # :.2% writes a fraction as a percent
print(f"Max drawdown  : {m['max_drawdown']:.2%}")
print(f"Sharpe ratio  : {m['sharpe']:.2f}")  # :.2f writes a plain number with two decimals
print(f"Profit factor : {m['profit_factor']:.2f}")
print(f"Win rate      : {m['win_rate']:.0%} (payoff ratio {m['payoff_ratio']:.2f})")
print(f"Exposure      : {m['exposure']:.0%}")
print(f"Beta to NIFTY : {m['beta']:.2f}")
```

<!-- output -->
```text
Net profit    : Rs 53,485.86
CAGR          : 7.59%
Max drawdown  : -29.42%
Sharpe ratio  : 0.47
Profit factor : 1.93
Win rate      : 36% (payoff ratio 3.38)
Exposure      : 66%
Beta to NIFTY : 0.71
```

1. **Net profit** (Rs 53,485.86): what the strategy made after every charge. It is the first question, but never the only one.
2. **CAGR** (7.59 percent): the return per year. A total return of 53.49 percent over almost six years is 7.59 percent a year, compounded. Compare it with what you could earn elsewhere: a fixed deposit, or simply holding NIFTY, which returned 80.63 percent over the same dates.
3. **Max drawdown** (-29.42 percent): the deepest fall of the account from a high to a later low. Here the account once stood 29.42 percent below its best value. Ask whether you would have kept trading through that fall: most traders stop a strategy long before it recovers.
4. **Sharpe ratio** (0.47): the return per unit of ups and downs, per year. It lets you compare a calm strategy with a wild one. As a rough guide, below 0.5 is weak, 0.5 to 1 is fair, above 1 is good, and above 2 in a backtest is so rare that you should look for a mistake first.
5. **Profit factor** (1.93): the rupees won for every rupee lost, over all trades. Above 1 the strategy made money; here it won Rs 1.93 for each Re 1 it lost.
6. **Win rate and payoff ratio** (36 percent, 3.38): the share of trades that made money, and how much bigger the average win was than the average loss. Read them together. This strategy lost 7 of its 11 trades, but its wins were 3.4 times the size of its losses, so it still made money. A high win rate with a low payoff ratio can lose money too.
7. **Exposure** (66 percent): the share of the time a position was open. The rest of the time the money sat in cash. A strategy with low exposure takes less market risk, and its capital could do other work meanwhile.
8. **Beta** (0.71): how much the strategy moved with NIFTY. On an average day when NIFTY moved 1 percent, this strategy moved about 0.71 percent the same way. A beta near 1 means the strategy mostly follows the market; near 0, it moves on its own.

Read together, this run made money but did not beat simply holding NIFTY, and it fell almost 30 percent on the way. The sections below explain every other figure, group by group, in the order `result.metrics_table()` lists them.

## Run

The basic facts of the run: when it ran and what the account was worth at each end.

| Figure | This run | What it tells you |
|---|---|---|
| Start (`start`) | 1 Jan 2021, 09:15 IST | When the run began: the first session's open, with your capital in cash. |
| End (`end`) | 11 Nov 2026, 15:30 IST | When the run ended: the last session's close. |
| Elapsed (`elapsed_days`) | 2,140.26 days | Calendar days from start to end, about 5.9 years. The yearly figures (CAGR and others) are worked out over this time. |
| Sessions (`sessions`) | 1,453 | Trading days in the run. |
| Missing sessions (`missing_sessions`) | 0 | Trading days on which the exchange was open but the data had no bar. 0 is what you want; more means gaps in the data. |
| Start equity (`start_equity`) | Rs 1,00,000.00 | The capital you started with. |
| End equity (`end_equity`) | Rs 1,53,485.86 | What the account was worth at the end: cash plus any open position at the last close. |
| Net cash flows (`net_cash_flows`) | Rs 0.00 | Money added to or taken out of the account during the run. A normal backtest has none. |
| Net profit (`net_profit`) | Rs 53,485.86 | End equity minus start equity minus cash flows: what the strategy made after every charge. |

## Returns and risk

How fast the account grew, and how bumpy the ride was.

| Figure | This run | What it tells you |
|---|---|---|
| Total return (`total_return`) | 53.49% | Net profit as a percent of the start: the growth over the whole run. |
| CAGR (`cagr`) | 7.59% | Compound annual growth rate: the steady yearly return that would have grown Rs 1,00,000 into Rs 1,53,485.86 over the same time. Use it to compare runs of different lengths. |
| Volatility (`volatility`) | 19.96% | How much the daily returns swing, scaled to a year. Lower is a smoother ride. A single stock usually swings more than an index such as NIFTY 50. |
| Sharpe ratio (`sharpe`) | 0.47 | Return per unit of volatility, per year. Higher is better; see the rough guide in the eight figures above. |
| Sortino ratio (`sortino`) | 0.67 | Like the Sharpe ratio, but it counts only the falls, not the rises: traders mind losses, not gains. Higher is better. |
| Calmar ratio (`calmar`) | 0.26 | CAGR divided by the max drawdown (7.59 / 29.42). It weighs the yearly return against the worst fall. Above 1, a year's return is bigger than the worst fall; 0.26 means the worst fall took almost four years of return. |
| Exposure (`exposure`) | 66.14% | The share of the time a position was open. |
| Risk-free rate (`risk_free_rate`) | 0% | A yearly return you could earn without risk, such as a treasury bill. The Sharpe ratio and others measure only the return above it. Backtests use 0 unless you give a rate to [`metrics.analyse`](support-functions/metrics.md). |
| Risk-free per session (`risk_free_per_session`) | 0% | That rate for one trading day. |
| Sessions per year (`sessions_per_year`) | 247.89 | Trading days in a year, counted from the NSE calendar of the years the run covers. It turns daily figures into yearly ones. |
| Annualisation years (`annualisation_years`) | 2021 to 2026 | The calendar years counted for that. |
| Calendar coverage (`annualisation_coverage`) | sourced | Where those years' holiday lists come from: `sourced` (exchange circulars) is what you want; `unverified` or `template` mean the count of trading days is less certain. |
| Template-only years (`annualisation_template_years`) | (empty) | Years for which no holiday list is known. Empty is what you want. |

## Drawdown

A **drawdown** is a fall of the account from its highest value so far. These figures say how deep the falls went and how long they lasted. A drawdown is always zero or negative.

| Figure | This run | What it tells you |
|---|---|---|
| Maximum drawdown (`max_drawdown`) | -29.42% | The deepest fall from a high to a later low, in percent. The single best measure of how painful a strategy is to hold. |
| Maximum drawdown amount (`max_drawdown_amount`) | Rs -63,967.44 | The largest fall in rupees. |
| Drawdown peak (`max_drawdown_peak`) | 23 Feb 2026 | The high from which the deepest fall began. |
| Drawdown trough (`max_drawdown_trough`) | 8 Sep 2026 | The low of that fall. |
| Drawdown recovery (`max_drawdown_recovery`) | None | The day the account got back to that high. `None`: by 11 November 2026 it had not. |
| Maximum drawdown length (`max_drawdown_days`) | 261 days | Calendar days from that high to its recovery, or to the end of the run when it has not recovered, as here. |
| Longest drawdown (`longest_drawdown_days`) | 906.84 days | The longest time the account spent below an earlier high: about two and a half years. A long drawdown tests your patience even when it is shallow. |
| Longest drawdown start (`longest_drawdown_start`) | 4 Nov 2021, 19:15 IST | The high it began from: the close of that year's Diwali Muhurat session, which ran in the evening. |
| Longest drawdown end (`longest_drawdown_end`) | 29 Apr 2024 | When the account got back above that high. |
| Longest drawdown recovered (`longest_drawdown_recovered`) | True | Whether it got back before the end of the run. |
| Ruined (`ruined`) | False | Whether the account fell to zero or below. |
| Ruin (`ruin_time`) | None | When it did, or `None`. |

## Trades

A **trade** is a round trip: a buy and the sell that closed it (or a short sale and the buy that closed it). These figures count closed trades only.

| Figure | This run | What it tells you |
|---|---|---|
| Trades (`trades`) | 11 | Closed trades. Fewer than about 30 trades is a small sample: luck can decide the result. |
| Open trades (`open_trades`) | 0 | Trades still open at the end. Their profit is in the net profit but not in the trade figures. |
| Winning trades (`winning_trades`) | 4 | Trades that made money after their charges. |
| Losing trades (`losing_trades`) | 7 | Trades that lost money after their charges. |
| Win rate (`win_rate`) | 36.36% | The share of trades that made money. Trend strategies often win less than half their trades and still make money, because their wins are large. |
| Average win (`average_win`) | Rs 27,687.29 | The average profit of a winning trade. |
| Average loss (`average_loss`) | Rs -8,180.47 | The average loss of a losing trade. |
| Profit factor (`profit_factor`) | 1.93 | All the money won divided by all the money lost. Above 1 makes money; many traders look for 1.5 or more. |
| Expectancy (`expectancy`) | Rs 4,862.35 | The average profit per trade: what one more trade like these would earn on average. |
| Payoff ratio (`payoff_ratio`) | 3.38 | The average win divided by the average loss. Here a win was 3.4 times the size of a loss. |
| Largest win (`largest_win`) | Rs 40,408.62 | The best trade. |
| Largest loss (`largest_loss`) | Rs -16,939.16 | The worst trade. Compare it with your capital: could you take it again? |
| Consecutive wins (`max_consecutive_wins`) | 1 | The longest run of winning trades in a row. |
| Consecutive losses (`max_consecutive_losses`) | 2 | The longest run of losing trades in a row. Expect a longer losing run than this one in real trading, and decide in advance whether you would keep going. |
| Average holding time (`average_holding_seconds`) | 1,10,12,072.73 seconds | How long a trade was held on average. Divide by 86,400 for days: about 127 days here. |
| Gross P&L (`gross_pnl`) | Rs 57,322.80 | The trades' profit before charges. |
| Costs (`total_costs`) | Rs 3,836.94 | The trades' charges: brokerage, STT, exchange charges, SEBI fee, stamp duty, GST and the DP charge, with each trade's share of the rounding on each day's contract note (STT and stamp duty are rounded to whole rupees there). |
| Net P&L (`net_pnl`) | Rs 53,485.86 | The trades' profit after their charges. With no position left open at the end, as here, it equals the net profit: the trades add up to what your account made. |
| Costs / gross P&L (`cost_share_of_gross_pnl`) | 6.69% | The share of the gross profit that charges took. A strategy that trades often can lose most of its profit to charges; watch this figure for intraday strategies. |
| Turnover (`turnover`) | Rs 28,28,322.30 | The total value of every buy and every sell. |
| Turnover ratio (`turnover_ratio`) | 20.97 | Turnover divided by the average equity: the account was traded about 21 times over. Higher turnover means more charges and more slippage. |

## Excursions and trading cost

How far the trades went against you and in your favour while they were open, and what trading cost them. A trade's **MAE** (maximum adverse excursion) is the worst its profit stood at while it was open, before charges: its deepest open loss, zero or negative. Its **MFE** (maximum favourable excursion) is the best: its highest open profit, zero or positive. Only prices the trade could have seen count: the high and low of each bar it was held through, and its own fill prices. The percents are of the trade's **capital at work**: its entry price times the most shares it held.

| Figure | This run | What it tells you |
|---|---|---|
| Average MAE (`average_mae`) | -5.10% | How far a trade was down at its worst, on average. Compare it with your stop-loss: a stop much tighter than this would have closed most trades early. |
| Average MFE (`average_mfe`) | 20.56% | How far a trade was up at its best, on average. |
| Worst MAE (`worst_mae`) | Rs -16,503.10 | The deepest open loss of any trade, in rupees: here trade 10, which closed at that loss. Could you sit through it again? |
| Best MFE (`best_mfe`) | Rs 80,823.00 | The highest open profit of any trade: here trade 9, which closed Rs 40,811.70 up before charges, half of it. |
| Edge ratio (`edge_ratio`) | 4.03 | Average MFE divided by the size of the average MAE (without its minus sign). Above 1, the trades moved further in your favour than against you after the entry: here four times as far. Near 1, the price moved about as far either way after the entries. |
| Profit kept (`profit_kept`) | 52.09% | The winners' profit before charges divided by their MFE: the share of their best open profit they kept. Low means the exits are late. Here the winners kept about half. |
| Turnover of closed trades (`closed_turnover`) | Rs 28,28,322.30 | The value of every buy and every sell of the closed trades. The trading cost of turnover below is measured against it. It equals the turnover here because no trade was open at the end. |
| Slippage (`total_slippage`) | Rs 705.80 | What slippage cost the closed trades: each fill's price against its price before slippage. It is already inside the fill prices, so it is already in the gross and net P&L: it is shown, never taken off a second time. |
| Trading cost (`trading_cost`) | Rs 4,542.74 | Charges plus slippage: everything trading cost the closed trades. |
| Trading cost / gross P&L (`trading_cost_share_of_gross_pnl`) | 7.92% | The share of the profit before charges that the trading cost took. |
| Trading cost of turnover (`trading_cost_bps`) | 16.06 bps | The trading cost per rupee traded, in basis points (one basis point is 0.01 percent): Rs 161 on every Rs 1,00,000 bought or sold. A trade pays it on its buy and on its sell, so it has to move about 0.32 percent just to cover its cost. |

## Benchmark

How the strategy compared with the benchmark, here NIFTY 50. This group is there only when the run has a benchmark, such as `benchmark="NIFTY"`; without one a run has 111 figures.

| Figure | This run | What it tells you |
|---|---|---|
| Benchmark return (`benchmark_total_return`) | 80.63% | What simply holding NIFTY 50 returned over the same dates. If the strategy made less, as here, ask what it offers instead: a smaller fall, less time in the market, or money free for other uses. |
| Benchmark sessions (`benchmark_sessions`) | 1,453 | Trading days with both a strategy return and a NIFTY return; the comparisons below use only these. |
| Alpha (`alpha`) | 1.50% | The return per year beyond what the strategy's link to the market explains. Positive is good: here the strategy earned 1.50 percent a year more than its beta alone would give. |
| Beta (`beta`) | 0.71 | How much the strategy moved with NIFTY: about 0.71 percent for each 1 percent NIFTY moved. |
| Correlation (`correlation`) | 0.50 | How closely the daily moves lined up, from -1 (always opposite) through 0 (unrelated) to 1 (always together). |
| R squared (`r_squared`) | 0.25 | The share of the strategy's daily ups and downs that NIFTY explains: about a quarter here. |
| Tracking error (`tracking_error`) | 17.81% | How far the strategy's return strayed from NIFTY's, per year. |
| Information ratio (`information_ratio`) | -0.10 | The yearly return above NIFTY's divided by the tracking error. Negative here, because the strategy trailed NIFTY. |
| Treynor ratio (`treynor_ratio`) | 0.13 | The yearly return per unit of beta: the reward for the market risk taken. Higher is better. |

## Risk-adjusted ratios

More ways to weigh the return against the risk. Each one is a variation on the Sharpe ratio or on the drawdown; for all of them, higher is better.

| Figure | This run | What it tells you |
|---|---|---|
| Smart Sharpe (`smart_sharpe`) | 0.50 | The Sharpe ratio corrected for days that follow each other: the plain ratio assumes one day's return says nothing about the next. Close to the Sharpe ratio here. |
| Smart Sortino (`smart_sortino`) | 0.71 | The Sortino ratio with the same correction. |
| Adjusted Sortino (`adjusted_sortino`) | 0.47 | The Sortino ratio divided by 1.41 (the square root of 2), so that it reads on the same scale as the Sharpe ratio. |
| Probabilistic Sharpe (`probabilistic_sharpe`) | 86.80% | The chance that the strategy's true Sharpe ratio is above zero, given how many days were measured and how unusual they were. It asks whether the edge could be luck. 95 percent is a common bar. |
| Probabilistic Sortino (`probabilistic_sortino`) | 94.35% | The same chance for the Sortino ratio. |
| Probabilistic adjusted Sortino (`probabilistic_adjusted_sortino`) | 87.02% | The same chance for the adjusted Sortino ratio. |
| Autocorrelation (`autocorrelation`) | -0.06 | Whether a day's return tends to repeat the day before (positive) or reverse it (negative). Near 0, as here, means the days were nearly independent. |
| Autocorrelation penalty (`autocorrelation_penalty`) | 0.94 | The correction the Smart ratios divide by. 1 means no correction. |
| Omega ratio (`omega`) | 1.11 | All the daily gains added up, divided by all the daily losses. Above 1, the gains outweighed the losses. |
| Gain to pain (`gain_to_pain`) | 0.49 | All the monthly returns added up, divided by the losing months added up. Above 1 is considered good: the gains more than paid for the pain. |
| Risk-return ratio (`risk_return_ratio`) | 0.03 | The average daily return divided by its daily swing: a Sharpe ratio for one day, before it is scaled to a year. |
| Return over exposure (`risk_adjusted_return`) | 11.47% | CAGR divided by exposure: the yearly growth for the time the money was actually in the market. |
| Ulcer index (`ulcer_index`) | 15.93% | How deep and how long the falls were, taken together. Lower is calmer. |
| Ulcer performance index (`ulcer_performance_index`) | 0.48 | CAGR divided by the ulcer index: return per unit of that pain. |
| Serenity index (`serenity_index`) | 0.34 | Return weighed against the falls, with an extra penalty for the deepest ones. |
| Recovery factor (`recovery_factor`) | 0.84 | Net profit divided by the largest fall in rupees. Below 1, as here, the whole profit was smaller than the worst fall. |

## Session returns

The account's return day by day, month by month and year by year.

| Figure | This run | What it tells you |
|---|---|---|
| Expected return (`expected_return`) | 0.0295% | The steady daily return that compounds to the total return. |
| Average session return (`average_session_return`) | 0.0376% | The plain average of the daily returns. It is higher than the expected return because ups and downs cost growth: a 10 percent fall needs an 11.1 percent rise to get back. |
| Best session (`best_session`) | 8.95% | The best day. |
| Worst session (`worst_session`) | -14.23% | The worst day. One day can take a large bite out of the account. |
| Best month (`best_month`) | 18.06% | The best calendar month. |
| Worst month (`worst_month`) | -16.20% | The worst calendar month. |
| Best year (`best_year`) | 26.70% | The best calendar year. |
| Worst year (`worst_year`) | -13.58% | The worst calendar year. Could you sit through a year like it? |
| Winning sessions (`winning_sessions`) | 502 | Days the account rose. |
| Losing sessions (`losing_sessions`) | 453 | Days the account fell. On the other days it was flat, mostly because it held only cash. |
| Session win rate (`session_win_rate`) | 52.57% | Rising days out of the days that moved. |
| Average winning session (`average_winning_session`) | 1.11% | The average rise on a rising day. |
| Average losing session (`average_losing_session`) | -1.11% | The average fall on a falling day. |
| Consecutive winning sessions (`max_consecutive_winning_sessions`) | 9 | The longest run of rising days. |
| Consecutive losing sessions (`max_consecutive_losing_sessions`) | 7 | The longest run of falling days. |
| Rolling window (`rolling_window_sessions`) | 124 | The length, in trading days (about six months), of the window behind the rolling charts of the tearsheet. |

## Tail risk

The **tails** are the rare, extreme days. These figures say how big and how frequent they were. Several of them use a **percentile**: the 5th percentile of the daily returns is the value that only 5 percent of days fell below.

| Figure | This run | What it tells you |
|---|---|---|
| Skew (`skew`) | -0.62 | Whether the big days were more often falls (negative) or rises (positive). Negative here: the large moves were more often down. |
| Excess kurtosis (`kurtosis`) | 15.63 | How often extreme days happened compared with a normal bell curve, which has 0. 15.63 means many more very large days than a bell curve predicts. |
| Value at risk (95%) (`value_at_risk`) | -1.86% | On 95 days out of 100, the account lost no more than 1.86 percent in a day; on the worst 5 in 100 it lost more. |
| Expected shortfall (CVaR 95%) (`expected_shortfall`) | -2.92% | The average loss on those worst 5 days in 100. It says how bad the bad days are. |
| Conditional drawdown (95%) (`conditional_drawdown`) | -28.00% | The average of the deepest 5 percent of the daily drawdown readings: how deep the worst stretches went. |
| Tail ratio (`tail_ratio`) | 1.14 | The size of the big rising days divided by the size of the big falling days (95th percentile over 5th). Above 1, the big rises were bigger than the big falls. |
| Outlier win ratio (`outlier_win_ratio`) | 3.23 | How big a rare best day was (the 99th percentile: only 1 day in 100 rose more), compared with an average rising day. |
| Outlier loss ratio (`outlier_loss_ratio`) | 3.08 | How big a rare worst day was (the 1st percentile: only 1 day in 100 fell more), compared with an average falling day. |

## Trade ratios

Ratios built from the trade figures.

| Figure | This run | What it tells you |
|---|---|---|
| Win/loss ratio (`win_loss_ratio`) | 0.57 | Winning trades for each losing trade (4 for 7). |
| Kelly criterion (`kelly_criterion`) | 17.56% | The share of capital per trade that would have grown the account fastest, if future trades looked exactly like these. It assumes a lot; traders who use it take a fraction of it. |
| Risk of ruin (`risk_of_ruin`) | 3.71% | An estimate of the chance of losing the whole capital, if trades like these kept coming in a random order at the same size. Lower is better. |
| CPC index (`cpc_index`) | 2.38 | Profit factor times win rate times payoff ratio. Above 1 is considered good. |
| Common sense ratio (`common_sense_ratio`) | 2.21 | Profit factor times tail ratio: the trades' edge times the days' edge. Above 1 is considered good. |

## More options

* The exact formula of each figure: [Metric Definitions](metric-definitions.md).
* A risk-free rate, other benchmarks and the series behind the figures (drawdowns, monthly returns, rolling statistics): [Results and Reports](results-and-reports.md#more-options) and [Metrics](support-functions/metrics.md).
* Rank many runs by any of these figures: [Optimization](optimization.md).
