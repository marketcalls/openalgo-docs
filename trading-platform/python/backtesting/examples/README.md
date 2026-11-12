# Examples

Four complete strategies you can copy and run. Each builds synthetic bars in its first lines, so it runs anywhere with only the `openalgo` package and no OpenAlgo server, and each shows the output to expect. Each page ends with the same strategy on data from your OpenAlgo server.

| Example | What it shows |
|---|---|
| [EMA Crossover on Daily Bars](ema-crossover.md) | A positional delivery (CNC) strategy, the engine's default sizing and charges, the tearsheet, and the same strategy written as conditions |
| [Opening Range Breakout](opening-range-breakout.md) | An intraday (MIS) strategy on 1-minute data with a stop, a target, the dated square-off, and longs and shorts |
| [Scale-Out with Two Targets and a Trailing Stop](scale-out-trailing-stop.md) | Booking part of a position at two targets, moving the stop to breakeven, and trailing the rest |
| [Optimizing the EMA Crossover](ema-crossover-optimization.md) | A parameter sweep in worker processes, the heatmap, and an out-of-sample check |

The synthetic prices are smooth waves, chosen so that every rule fires at least once. Their figures say nothing about how a strategy does on real prices; run the OpenAlgo version of each page for that.
