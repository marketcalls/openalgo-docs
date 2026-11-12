# Backtesting

{% hint style="warning" %}
**Preview.** The backtesting engine (`openalgo.backtest`) is available in the next release of the OpenAlgo Python SDK. It is an unreleased preview: names and arguments may still change before the backtest beta. The pages in this section describe the engine as it is built today.
{% endhint %}

## What it does for you

A backtest replays your strategy on past price bars and shows what it would have done: every order, fill, trade, the equity curve, the charges you would have paid and the usual performance figures. The OpenAlgo engine is built for Indian markets, so the things that usually make a backtest look better than real trading are applied for you:

* **Charges** on every fill: brokerage (Zerodha's rates by default), STT, exchange and IPFT charges, SEBI fee, stamp duty, GST and the DP charge on delivery sells, at the rates in force on each trade date.
* **Slippage** on every fill, from a dated table per instrument class.
* **Lot size, tick size and freeze quantity** of futures and options, from dated reference tables.
* **The futures roll**: a futures strategy names an underlying, and its position rolls to the next contract the session before expiry, with daily mark to market.
* **Session times and holidays** of NSE, BSE, NFO, BFO, MCX, CDS and BCD, including the dated intraday entry cut-off and square-off for MIS.
* **Margin**: an order that needs more margin than your free cash is rejected, as a broker would. Futures block 20 percent of the contract value by default, or your broker's figures with `margin=`.
* **Splits and bonuses**: OpenAlgo history may not be adjusted for them, so the bars of NSE and BSE shares are checked for an overnight gap that looks like an unadjusted split or bonus. The run stops with the date and what to do, instead of trading on a fall in price that never happened (see [Data](data.md#splits-and-bonuses)).

You write the strategy once as a small Python class. The engine runs it bar by bar, decides at each bar close and fills at the next bar's open, so a strategy can never trade on a price it could not have seen.

The calculations (fills, positions, charges, the ledger, the metrics) run in a compiled Rust core, so the same inputs always give the same result (see [Speed and repeatable results](#speed-and-repeatable-results)).

## Two ways to run a strategy

| Function | What it does | Status |
|---|---|---|
| `bt.backtest(Strategy, ...)` | Runs the strategy on past bars and returns a `Result` | Available |
| `bt.live(Strategy, client, ...)` | Will trade the same strategy class through your OpenAlgo server | Planned |

With `bt.live`, whether orders are simulated or sent to your broker will be decided inside OpenAlgo by the analyzer mode switch (sandbox mode), never by an argument in your code. The same switch you already use for API orders decides it. `bt.live` is not available yet; calling it raises `NotImplementedError`.

## What is applied by default

You can run a backtest with only a strategy, data and capital. Everything else has a default for Indian markets, and the result lists every value it used (the Assumptions block).

| Aspect | Default | Change it with |
|---|---|---|
| Product | MIS for intraday intervals; CNC for daily equity; NRML for daily F&O | `product=` |
| Fill timing | Decide at the bar close, fill at the next bar's open | (fixed for now) |
| Charges | Zerodha brokerage plus all statutory and exchange charges, at the rates of each trade date | `costs=` |
| Slippage | The dated default table: 2 basis points for cash equity, ticks for futures, a percent of premium for options | `slippage=` |
| Quantity | 1x the capital (net of estimated charges) for cash equity, one lot for futures and options | `qty=`, `lots=`, `size=` |
| Instrument | Cash equity: lot 1, tick 0.05, no freeze quantity. Futures and options: lot, tick and freeze quantity from the reference tables | `instrument=` |
| Intraday times (MIS) | Entries stop and positions are squared off at the dated exchange defaults (NSE cash from 3 August 2026: 14:50 and 15:00 IST) | `entry_until=`, `square_off=` |
| Stops and targets | For an intraday strategy, tested on 1-minute bars when 1-minute data covers the whole run, otherwise on the strategy bars; daily bars for a daily strategy | `base=` |
| Calendar | Built-in holiday lists for 2019 to 2026 and dated session hours | `calendar=` |
| Futures | The current-month contract, rolled one session before expiry | `expiry` (class), `roll=` |
| Futures margin | 20 percent of the contract value (5x), for every underlying and date | `margin=` |
| Benchmark | None: no alpha, beta or other benchmark figures | `benchmark=` |

See [Orders and Risk](orders-and-risk.md) and [Costs, Slippage and Margin](costs-slippage-and-margin.md) for the details.

## Speed and repeatable results

The engine is fast enough to sweep parameters over years of 1-minute bars on a desktop computer. Measured on one core of a current desktop with the speed benchmark in the SDK repository (`benchmark/backtest_speed.py`):

| Run | Time |
|---|---|
| A strategy with `on_bar`, one call per bar | About 575,000 bars a second: 1.75 microseconds per bar for the whole run, of which about 1 microsecond is the Python call itself |
| A [condition strategy](writing-strategies.md#condition-strategies) on 1,000,000 one-minute bars, with the default charges and slippage, about 9,300 round trips and every metric | About 1.1 seconds (the target is 2 seconds) |

Adding trades adds time in proportion (about 17 microseconds per round trip), and so does adding bars, so a long run costs what its length suggests. Your own `on_bar` code and indicators add their own time on top.

**Results repeat exactly.** The same strategy on the same data and settings gives the same result every time, bit for bit, on the same platform. The equity curve and the trade table use only exact arithmetic (prices in whole price units, the ledger in paise), so they are identical on every platform. The metrics also use the platform's math library (logarithms, exponentials and powers for CAGR, annualised figures and the distribution figures), so on another operating system a metric can differ in its last digits, always within one part in a billion (1e-9). The SDK's test suite pins four reference runs (an intraday strategy, a condition strategy, a futures strategy across a roll and a GTT positional strategy) to these rules.

## Install

The engine ships inside the `openalgo` package; nothing else is needed. It needs Python 3.12 or newer.

```bash
pip install -U openalgo
```

A backtest on your own data needs no OpenAlgo server, no API key and no other package. To backtest on history from your OpenAlgo server (broker history or Historify), pass an `openalgo.api` client instead of data.

## Your first backtest in five minutes

The example below builds a few months of daily bars (synthetic prices, so it runs anywhere), defines an EMA crossover strategy and runs it with Rs 1,00,000. Replace the data step with your own DataFrame of open, high, low, close and volume to test real prices.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

# 1. Daily bars, one per NSE session from 1 April to 6 November 2026 (synthetic prices).
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-04-01", "2026-11-06")
k = np.arange(len(sessions))
close = (1000 + k + 60 * np.sin(k / 6) + 10 * np.sin(k / 1.3)).round(1)
open_ = (close - 4 * np.sin(1.3 * k)).round(1)
bars = pd.DataFrame(
    {
        "open": open_,
        "high": np.maximum(open_, close) + 6,
        "low": np.minimum(open_, close) - 6,
        "close": close,
        "volume": 50_000,
    },
    index=pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata"),
)


# 2. The strategy: long while the 5-day EMA is above the 20-day EMA.
class EmaCross(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"
    fast = 5
    slow = 20

    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    def on_bar(self, bar):
        if len(self.close) <= self.slow:  # let the slow EMA warm up first
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()


# 3. Run it with Rs 1,00,000 and print the headline figures.
result = bt.backtest(EmaCross, data=bars, capital=100_000)
m = result.metrics
print(f"Net profit    : Rs {m['net_profit']:,.2f}")
print(f"Total return  : {m['total_return']:.2%}")
print(f"Max drawdown  : {m['max_drawdown']:.2%}")
print(f"Trades        : {m['trades']} ({m['win_rate']:.0%} won)")
print(f"Charges       : Rs {m['total_costs']:,.2f}")
```

<!-- output -->
```text
Net profit    : Rs 4,688.28
Total return  : 4.69%
Max drawdown  : -7.20%
Trades        : 3 (67% won)
Charges       : Rs 728.20
```

What happened, in plain words:

* `self.buy()` with no quantity bought as many shares as the capital allowed after estimated charges, at the open of the session after the crossover (plus 2 basis points of slippage).
* The position is CNC (delivery), because the strategy is daily and SBIN is cash equity. Delivery charges, including the DP charge on each sell, were deducted.
* No stop was set, so each trade ended on the opposite crossover.

### The same backtest on data from OpenAlgo

To use real history, pass an OpenAlgo client and the dates instead of `data=`. The engine fetches the bars (from Historify when it holds the whole range, otherwise from your broker), caches them locally and tells you what it obtained.

<!-- requires-server -->
```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
result = bt.backtest(EmaCross, client, start="2025-01-01", end="2025-12-31", capital=100_000)
print(result)
```

## Reading the result

`print(result)` shows the Assumptions block (every setting the run used, defaults resolved), the gross and net P&L and the warnings. Here it is for the first backtest:

<!-- continues -->
```python
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
  indicator_checks: window tolerance 1e-06 (relative); ema(SBIN.close, 5): truncation passed at 4 cuts, warm-up 32 bars
  gross P&L: 5417.25 (realized 5417.25)
  charges: 728.97; net P&L: 4688.28
  warning: SBIN: generic cash-equity instrument assumed (lot 1, tick 0.05)
```

A few lines worth knowing:

* `base_rule` says which bars stops are tested on and where fills happen. A daily strategy uses daily bars.
* `indicator_checks` reports the look-ahead check every indicator passes before the run (see [Writing Strategies](writing-strategies.md#indicators-and-look-ahead-checks)).
* `gross P&L` is before charges and includes any position still open at the end, marked at the last close. `charges` are what the contract notes charged at each session close, so `net P&L` is exactly the change in equity. The `Charges` figure printed earlier is the metric `total_costs`, the sum of the closed trades' charges before contract-note rounding. The two differ slightly because a contract note rounds STT and stamp duty to the rupee.
* `entry_from`, `entry_until` and `square_off` apply to MIS runs and are stated as they applied over the whole run: one clock time, a rule such as "20 minutes before each session's close" (MCX), or dated periods when a default changed during the run (NSE cash on 3 August 2026). This daily CNC run has none.
* `leverage` and the scale-in limits (`max_adds`, `max_position`, `min_spacing`, `max_risk`, `allow_averaging_down`) are listed even when unset, so you see that no limit applied. So are `reinvest` (whether sizes compound with the equity) and `size_caps` (see [Sizing](costs-slippage-and-margin.md#reinvest-and-size-caps)).
* `benchmark` names what the run is compared with and where its closes came from; `None` means no benchmark figures (see [A benchmark](results-and-reports.md#a-benchmark)).
* The last line is a warning you will see on every cash-equity backtest without `instrument=`: the engine used the generic lot 1 and tick 0.05.

No setting is accepted and then ignored. Every class attribute and every `bt.backtest` argument either works, raises an error (`ConfigError` for a value that cannot be used, `NotImplementedError` for a feature not built yet), or, when it does nothing in this particular run, is named in `result.warnings` with the reason (for example `pyramiding` on a strategy with `on_bar`, `client=` together with `data=`, or intraday times on a CNC run).

[Results and Reports](results-and-reports.md) explains every table and figure.

## Where to go next

* [Writing Strategies](writing-strategies.md): the strategy class, indicators, other timeframes, positions, timers, and condition strategies that run without a Python call per bar.
* [Orders and Risk](orders-and-risk.md): orders, target positions, stops, targets, trailing stops, intraday times and the strategy risk rules.
* [Costs, Slippage and Margin](costs-slippage-and-margin.md): what is charged and how to change it, margin, and sizing (your own sizing function, size caps).
* [Futures](futures.md): futures strategies by underlying, the roll, mark to market and settlement.
* [Data](data.md): OpenAlgo history, your own data, time zones, quality checks, splits and bonuses, and the cache.
* [Results and Reports](results-and-reports.md): the tables, the performance figures, a benchmark, Monte Carlo, R-multiples, the HTML tearsheet in four modes and reruns; [Metric Definitions](metric-definitions.md) defines every figure.
* [Optimization](optimization.md): parameter sweeps.
* [Support Functions](support-functions/README.md): the calendar, cost calculator, reference data, resampling, data loading and metrics on their own.
* [Examples](examples/README.md): four complete strategies you can run.

## Not available yet

The following are part of the design but not built. Each raises `NotImplementedError` with a message that says it is not supported in this version and what to do instead, so nothing is ignored silently. Pages for them will be added as they land.

* `bt.live`: trading a strategy through OpenAlgo in sandbox or live mode.
* `fill="close"` (filling at the decision bar's close).
* Walk-forward optimization (`bt.walk_forward`).
* Several strategies in one run, pairs (`pair_long`, `pair_short`), portfolio rebalancing (`bt.rebalance`), and strategies declared on a `universe`.
* Condition strategies on a futures underlying, and other intervals of a futures series (`self.data[underlying, "15m"]`).
* The combined rules `combined_stop`, `combined_target`, `lock_profit` and `trail_sl_to_entry`, and `after_risk_exit="allow_reentry"`, which only they would use.
* `cooldown` and `max_hold` given as a time (such as `"30m"`); give them in bars.
* One indicator over two symbols or two intervals, and open interest in strategy bars.
* Selling an option to open a short position (short-option margin).
* Holding a position or a GTT order across a split or bonus that the bars are not adjusted for (declared with `corporate_actions=`); supply adjusted bars or run on other dates.
