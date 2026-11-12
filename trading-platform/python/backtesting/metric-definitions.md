# Metric Definitions

Every figure in `result.metrics`, in `metrics.analyse(...).metrics` and on the HTML tearsheet, with its key, its label, its unit and its definition. The tables below are `openalgo.backtest.metrics.DEFINITIONS`, grouped as in `openalgo.backtest.metrics.GROUPS`. The engine and the reports take their labels and definitions from the same table, so this page and a report always agree. Every figure is computed in the Rust core.

{% hint style="warning" %}
**Preview.** These figures are part of the backtesting engine, available in the next SDK release; the interface may change before the backtest beta.
{% endhint %}

How to read the units:

| Unit | Meaning |
|---|---|
| fraction | 0.01 is one percent (returns, rates, drawdowns, shares) |
| rupees | Indian rupees |
| ratio | A pure number |
| count | A whole number |
| days | Calendar days, fractional |
| seconds | Elapsed seconds |
| sessions | Sessions per year |
| timestamp | An IST time, or None |
| text | Text |
| flag | True or False |

Conventions that apply throughout:

* **Drawdowns are zero or negative.** `max_drawdown` is a fraction (-0.07 is a fall of 7 percent from the peak) and `max_drawdown_amount` is in rupees (a fall of Rs 500 is -500), and so are the drawdown depths, the conditional drawdown and the drawdowns of the horizon summary and of Monte Carlo. Durations and the ulcer index are zero or positive. A ratio "over the magnitude of the maximum drawdown" divides by its absolute value.
* **From your capital and your start.** With an opening wealth (a backtest's capital), the first equity point is already a mark: its P&L counts, its session has a return from the capital, and a fall below the capital is a drawdown. With an opening time (a backtest's first bar open), the start, the elapsed days, CAGR and exposure count from it. See [Results and Reports](results-and-reports.md#how-the-figures-are-measured).
* **Per session, on the real calendar.** Returns are per IST session date, and every annualised figure uses the sessions per year of the traded exchanges in the years the run touches.
* A figure the data cannot define is NaN; a positive figure over a zero denominator is infinite. The Benchmark group is present only when you give a benchmark.

## Run

| Key | Label | Unit | Definition |
|---|---|---|---|
| `start` | Start | timestamp | The opening time when one is given (the instant the run opened with its capital); else the time of the first equity point: the starting equity, or with an opening wealth the first mark after it (the opening is then counted from here). |
| `end` | End | timestamp | Time of the last equity point. |
| `elapsed_days` | Elapsed | days | Calendar days from start to end; CAGR is annualised over them. |
| `sessions` | Sessions | count | IST session dates with an equity point after the start (every point, with an opening wealth); one return each, the first one from the start equity. |
| `missing_sessions` | Missing sessions | count | Calendar sessions of the traded exchanges, between the first and last session date, with no equity point; each one's move is folded into the next return. |
| `start_equity` | Start equity | rupees | The opening wealth (the capital before the first point) when one is given, else the equity at the first point. |
| `end_equity` | End equity | rupees | Equity at the last point. |
| `net_cash_flows` | Net cash flows | rupees | Deposits minus withdrawals in the run. |
| `net_profit` | Net profit | rupees | End equity minus start equity minus net cash flows. |

## Returns and risk

| Key | Label | Unit | Definition |
|---|---|---|---|
| `total_return` | Total return | fraction | Time-weighted: the product of (1 + session return), minus 1, so measured from the start equity. Cash flows are not returns. |
| `cagr` | CAGR | fraction | (1 + total return) ^ (365.25 / elapsed days) - 1. NaN below 28 elapsed days, -1 after ruin. |
| `volatility` | Volatility | fraction | Sample standard deviation of session returns, times sqrt(sessions per year). |
| `sharpe` | Sharpe ratio | ratio | Mean excess session return over its sample standard deviation, times sqrt(sessions per year). NaN when the deviation is zero. |
| `sortino` | Sortino ratio | ratio | Mean excess session return over the downside deviation sqrt(sum(min(excess, 0)^2) / n), times sqrt(sessions per year). |
| `calmar` | Calmar ratio | ratio | CAGR over the magnitude of the maximum drawdown. |
| `exposure` | Exposure | fraction | Share of the equity series' bars during which a position was open. A bar runs from one equity point to the next; with an opening time the first bar runs from it to the first point, else time before the first point is not a bar. |
| `risk_free_rate` | Risk-free rate | fraction | The annual risk-free rate supplied. |
| `risk_free_per_session` | Risk-free per session | fraction | (1 + annual rate) ^ (1 / sessions per year) - 1, subtracted from every session. |
| `sessions_per_year` | Sessions per year | sessions | Sessions of the traded exchanges (union calendar) in the whole calendar years the run touches, scaled to 365.25 days. |
| `annualisation_years` | Annualisation years | text | The calendar years counted for sessions per year. |
| `annualisation_coverage` | Calendar coverage | text | Weakest holiday-data coverage of those years: sourced, unverified or template. |
| `annualisation_template_years` | Template-only years | text | Exchange-years with no holiday list; sessions per year is overstated by them. |

## Drawdown

| Key | Label | Unit | Definition |
|---|---|---|---|
| `max_drawdown` | Maximum drawdown | fraction | Deepest fall of the time-weighted wealth index from its running peak, on every equity point. The peak starts at the start equity, so a first point below an opening wealth is a fall. Zero or negative. |
| `max_drawdown_amount` | Maximum drawdown amount | rupees | Largest fall of cumulative P&L (equity less the start equity and cash flows) from its running peak, which starts at 0. Zero or negative: a fall of 500 rupees is -500. |
| `max_drawdown_peak` | Drawdown peak | timestamp | Peak before the maximum drawdown; the start when the peak is the opening wealth (a drawdown from the opening is timed from the start). |
| `max_drawdown_trough` | Drawdown trough | timestamp | Lowest point of it. |
| `max_drawdown_recovery` | Drawdown recovery | timestamp | First point back at the peak, or None when not recovered. |
| `max_drawdown_days` | Maximum drawdown length | days | Calendar days from its peak to its recovery, or to the end when unrecovered. |
| `longest_drawdown_days` | Longest drawdown | days | Calendar days of the longest time below a peak, recovered or not. |
| `longest_drawdown_start` | Longest drawdown start | timestamp | Its peak; the start when that is the opening wealth. |
| `longest_drawdown_end` | Longest drawdown end | timestamp | Its recovery, or the last point when unrecovered. |
| `longest_drawdown_recovered` | Longest drawdown recovered | flag | Whether it ended. |
| `ruined` | Ruined | flag | Whether equity before cash flows reached zero or below. |
| `ruin_time` | Ruin | timestamp | When it did, or None. |

## Trades

| Key | Label | Unit | Definition |
|---|---|---|---|
| `trades` | Trades | count | Closed round trips. |
| `open_trades` | Open trades | count | Trades with no exit; not in trade statistics. |
| `winning_trades` | Winning trades | count | Closed trades with net P&L above zero. |
| `losing_trades` | Losing trades | count | Closed trades with net P&L below zero. |
| `win_rate` | Win rate | fraction | Winning trades over closed trades. |
| `average_win` | Average win | rupees | Mean net P&L of winning trades. |
| `average_loss` | Average loss | rupees | Mean net P&L of losing trades (negative). |
| `profit_factor` | Profit factor | ratio | Sum of winning net P&L over the magnitude of the sum of losing net P&L. |
| `expectancy` | Expectancy | rupees | Mean net P&L per closed trade. |
| `payoff_ratio` | Payoff ratio | ratio | Average win over the magnitude of average loss. |
| `largest_win` | Largest win | rupees | Highest net P&L of a winning trade. |
| `largest_loss` | Largest loss | rupees | Lowest net P&L of a losing trade. |
| `max_consecutive_wins` | Consecutive wins | count | Longest run of wins in exit order; a breakeven trade breaks a run. |
| `max_consecutive_losses` | Consecutive losses | count | Longest run of losses. |
| `average_holding_seconds` | Average holding time | seconds | Mean of exit time minus entry time over closed trades. |
| `gross_pnl` | Gross P&L | rupees | Sum of closed trades' P&L before costs. |
| `total_costs` | Costs | rupees | Sum of closed trades' costs. |
| `net_pnl` | Net P&L | rupees | Sum of closed trades' P&L after costs. |
| `cost_share_of_gross_pnl` | Costs / gross P&L | fraction | Costs over gross P&L; NaN when gross P&L is zero or negative. |
| `turnover` | Turnover | rupees | Traded value: \|price\| x quantity of every entry and every exit. |
| `turnover_ratio` | Turnover ratio | ratio | Turnover over mean equity. |

## Benchmark

These are present only when you give a benchmark to `metrics.analyse`.

| Key | Label | Unit | Definition |
|---|---|---|---|
| `benchmark_total_return` | Benchmark return | fraction | Product of (1 + benchmark session return) over the sessions that have one, minus 1; NaN when no session has a benchmark return. A session has a benchmark return only when it and the session before it (the start, for the first) both have a close of their own: a missing session is never filled from a neighbouring day, so the moves into and out of it are not counted. With no session missing this is the benchmark's close at the end over its close at the start, minus 1. The horizon summary and benchmark_comparison take each span's benchmark return by the same rule. |
| `benchmark_sessions` | Benchmark sessions | count | Sessions with both a strategy and a benchmark return: the only sessions alpha, beta, correlation, R squared, tracking error, information ratio, Treynor ratio and rolling beta use. |
| `alpha` | Alpha | fraction | Jensen's alpha per year: (mean(s - rf) - beta * mean(b - rf)) x sessions per year. |
| `beta` | Beta | ratio | cov(strategy, benchmark) / var(benchmark), per session. |
| `correlation` | Correlation | ratio | Pearson correlation of session returns. |
| `r_squared` | R squared | ratio | Square of the correlation: the share of the strategy's session variance the benchmark explains. |
| `tracking_error` | Tracking error | fraction | Sample standard deviation of (strategy - benchmark) session returns, times sqrt(sessions per year). |
| `information_ratio` | Information ratio | ratio | Mean active session return over its standard deviation, times sqrt(sessions per year) (Grinold and Kahn). |
| `treynor_ratio` | Treynor ratio | ratio | Mean excess session return x sessions per year, over beta (Treynor 1965). |

## Risk-adjusted ratios

| Key | Label | Unit | Definition |
|---|---|---|---|
| `smart_sharpe` | Smart Sharpe | ratio | Sharpe ratio divided by the autocorrelation penalty (Lo 2002): annualising by sqrt(sessions per year) assumes independent sessions. |
| `smart_sortino` | Smart Sortino | ratio | Sortino ratio divided by the same penalty. |
| `adjusted_sortino` | Adjusted Sortino | ratio | Sortino ratio / sqrt(2) (Schwager), to read on the Sharpe ratio's scale. |
| `probabilistic_sharpe` | Probabilistic Sharpe | fraction | Probability that the true Sharpe ratio is above 0 (Bailey and Lopez de Prado 2012): Phi(S sqrt(n - 1) / sqrt(1 - g1 S + (g2 + 2) / 4 S^2)) with S the per-session ratio, n sessions, g1 and g2 the skewness and excess kurtosis moment ratios. |
| `probabilistic_sortino` | Probabilistic Sortino | fraction | The same probability for the per-session Sortino ratio. |
| `probabilistic_adjusted_sortino` | Probabilistic adjusted Sortino | fraction | The same probability for the per-session adjusted Sortino ratio. |
| `autocorrelation` | Autocorrelation | ratio | Lag-1 sample autocorrelation of session returns. NaN below three sessions. |
| `autocorrelation_penalty` | Autocorrelation penalty | ratio | sqrt(1 + 2 sum((1 - k/q) rho^k, k = 1..q-1)), rho the autocorrelation and q the sessions per year rounded; 1 for independent sessions. |
| `omega` | Omega ratio | ratio | Sum of session returns above the per-session risk-free rate over the sum of the shortfalls below it (Keating and Shadwick 2002). |
| `gain_to_pain` | Gain to pain | ratio | Sum of monthly returns over the magnitude of the sum of the losing months (Schwager). |
| `risk_return_ratio` | Risk-return ratio | ratio | Mean session return over its sample standard deviation, per session, with no risk-free rate. |
| `risk_adjusted_return` | Return over exposure | fraction | CAGR divided by exposure: the yearly growth per unit of time in the market. |
| `ulcer_index` | Ulcer index | fraction | Root mean square of the drawdowns at session closes (Martin and McCann 1989); zero or positive. |
| `ulcer_performance_index` | Ulcer performance index | ratio | (CAGR - risk-free rate) / ulcer index: the Martin ratio. |
| `serenity_index` | Serenity index | ratio | (CAGR - risk-free rate) / (ulcer index x pitfall), with the pitfall indicator -conditional drawdown / annualised volatility (the published serenity ratio). |
| `recovery_factor` | Recovery factor | ratio | Net profit over the magnitude of the maximum drawdown amount, both in rupees. |

## Session returns

| Key | Label | Unit | Definition |
|---|---|---|---|
| `expected_return` | Expected return | fraction | Geometric mean session return: (product of (1 + r)) ^ (1 / sessions) - 1, the per-session rate that compounds to the total return. |
| `average_session_return` | Average session return | fraction | Arithmetic mean of the session returns, flat sessions included. |
| `best_session` | Best session | fraction | Highest session return. |
| `worst_session` | Worst session | fraction | Lowest session return. |
| `best_month` | Best month | fraction | Highest compounded calendar-month return (a first or last month may be partial). |
| `worst_month` | Worst month | fraction | Lowest compounded calendar-month return. |
| `best_year` | Best year | fraction | Highest compounded calendar-year return. |
| `worst_year` | Worst year | fraction | Lowest compounded calendar-year return. |
| `winning_sessions` | Winning sessions | count | Sessions with a return above zero. |
| `losing_sessions` | Losing sessions | count | Sessions with a return below zero. |
| `session_win_rate` | Session win rate | fraction | Winning sessions over the sessions that won or lost; flat sessions are left out. |
| `average_winning_session` | Average winning session | fraction | Mean return of the winning sessions. |
| `average_losing_session` | Average losing session | fraction | Mean return of the losing sessions (negative). |
| `max_consecutive_winning_sessions` | Consecutive winning sessions | count | Longest run of winning sessions; a flat session breaks a run. |
| `max_consecutive_losing_sessions` | Consecutive losing sessions | count | Longest run of losing sessions. |
| `rolling_window_sessions` | Rolling window | count | Sessions in each window of the rolling statistics. |

## Tail risk

| Key | Label | Unit | Definition |
|---|---|---|---|
| `skew` | Skew | ratio | Adjusted Fisher-Pearson skewness G1 of session returns (Joanes and Gill 1998). NaN below three sessions. |
| `kurtosis` | Excess kurtosis | ratio | Sample excess kurtosis G2 of session returns (Joanes and Gill 1998); about 0 for normal returns. NaN below four sessions. |
| `value_at_risk` | Value at risk (95%) | fraction | Historical: the 5th percentile of session returns (linear interpolation between order statistics). A loss is negative. |
| `expected_shortfall` | Expected shortfall (CVaR 95%) | fraction | Mean of the session returns at or below the value at risk (Rockafellar and Uryasev 2002). |
| `conditional_drawdown` | Conditional drawdown (95%) | fraction | Mean of the drawdowns at session closes at or below their 5th percentile (Chekhlov, Uryasev and Zabarankin 2005). Zero or negative. |
| `tail_ratio` | Tail ratio | ratio | 95th percentile of session returns over the magnitude of the 5th. |
| `outlier_win_ratio` | Outlier win ratio | ratio | 99th percentile of session returns over the mean winning session. |
| `outlier_loss_ratio` | Outlier loss ratio | ratio | 1st percentile of session returns over the mean losing session. |

## Trade ratios

| Key | Label | Unit | Definition |
|---|---|---|---|
| `win_loss_ratio` | Win/loss ratio | ratio | Winning trades over losing trades (counts). |
| `kelly_criterion` | Kelly criterion | fraction | p - (1 - p) / payoff ratio, p the share of wins among trades that won or lost (Kelly 1956): the stake per trade, as a share of capital, that maximises growth. |
| `risk_of_ruin` | Risk of ruin | fraction | Lundberg bound exp(-g x start equity) on losing the capital, trades drawn independently from the run's net P&L at fixed size; g > 0 solves mean(exp(-g x net P&L)) = 1. 1 when the mean trade is not positive. |
| `cpc_index` | CPC index | ratio | Profit factor x win rate x payoff ratio. |
| `common_sense_ratio` | Common sense ratio | ratio | Profit factor (trades) x tail ratio (session returns). |
