# Examples

Real strategies backtested on real market data. Each page gives the rules, one block of code you can copy and run, the output it printed, and a few changes to try. The data comes from your OpenAlgo server: replace `your_api_key` in the code with the API key from your OpenAlgo dashboard.

Every run uses the engine's defaults for Indian markets without being asked: charges at each trade date's rates, slippage, lot and tick sizes, session times and holidays, and the MIS square-off.

## Equity

| Example | Market | Timeframe | In one line |
|---|---|---|---|
| [EMA Crossover](ema-crossover.md) | RELIANCE, NSE, CNC | Daily | Buy when the 20-day EMA crosses above the 50-day, sell when it crosses back. Start here |
| [SMA Golden Cross](sma-golden-cross.md) | HDFCBANK, NSE, CNC | Daily | Hold while the 50-day SMA is above the 200-day |
| [MACD Crossover](macd-crossover.md) | ICICIBANK, NSE, CNC | Daily | Buy when the MACD line crosses above its signal line, sell when it crosses back |
| [Supertrend](supertrend.md) | SBIN, NSE, CNC | Daily | Hold while Supertrend (10, 3) shows an uptrend |
| [RSI Pullback](rsi-pullback.md) | INFY, NSE, CNC | Daily | Buy a low RSI above the 200-day average, sell when the RSI recovers |
| [Opening Range Breakout](opening-range-breakout.md) | SBIN, NSE, MIS | 5 minutes | Trade the first break of the 15-minute opening range, long or short, stop at the other side |
| [Position Sizing](position-sizing.md) | RELIANCE, NSE, CNC | Daily | The EMA crossover with a fixed quantity, a percent of equity and a fixed risk |
| [Tuning a Strategy](ema-crossover-optimization.md) | RELIANCE, NSE, CNC | Daily | Find the best EMA lengths with `bt.optimize` and check them on later data |
| [Backtest on yfinance Data](yfinance-data.md) | RELIANCE.NS | Daily | The EMA crossover on bars downloaded with yfinance, no server needed |

## Futures
