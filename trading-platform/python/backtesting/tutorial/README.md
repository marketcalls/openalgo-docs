# Tutorial

Eleven short lessons that take you from your first backtest to a portfolio, one idea at a time. Each lesson builds on the one before it, runs on real prices from your OpenAlgo server, and ends with what you learned and a link to the next. Start with lesson 1.

Before you start, you need a running OpenAlgo server, your API key and `pip install openalgo`: see [What you need](../README.md#what-you-need).

1. [Your First Backtest](01-first-backtest.md): an EMA crossover on SBIN, explained line by line.
2. [Read the Results](02-read-the-results.md): net profit, drawdown and win rate, the trade list and the HTML report.
3. [Stop-Loss and Target](03-stop-loss-and-target.md): a stop-loss, a target and a trailing stop, each one argument of `self.buy()`.
4. [How Much to Buy](04-how-much-to-buy.md): a fixed quantity, a percent of your capital, or a size set by the risk to the stop.
5. [Trade Intraday](05-intraday.md): an opening range breakout on 5-minute bars, with MIS and the square-off.
6. [Go Short](06-going-short.md): sell first and buy back later, intraday, and flip between long and short.
7. [Trade Futures](07-futures.md): a strategy on futures, sized in lots.
8. [Compare with NIFTY](08-compare-with-nifty.md): did the strategy beat simply holding the index?
9. [Find Better Settings](09-find-better-settings.md): try many EMA lengths at once, and check the choice on later data.
10. [Rebalance a Portfolio](10-portfolio-rebalancing.md): hold several stocks in fixed shares and rebalance them.
11. [Use Your Own Data](11-your-own-data.md): backtest on price bars you bring yourself.

When you have finished, the [examples](../examples/README.md) show more complete strategies (SMA, MACD, Supertrend, RSI and futures), and [How do I ...?](../how-to.md) answers the common questions in a few lines each.
