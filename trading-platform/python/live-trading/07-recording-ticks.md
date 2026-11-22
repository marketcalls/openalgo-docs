# Recording and Replaying Ticks

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
{% endhint %}

A **tick** is one price update from OpenAlgo's live feed: a trade, a new best price. Brokers keep one-minute candles of the past, but not the ticks: once the day is over, they cannot be fetched again. `bt.record` saves every tick of the instruments you name, in the order they arrived, so that a day can be studied or replayed later.

## The code

<!-- requires-server -->
```python
# Load the backtesting engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")

# Record every tick of SBIN and INFY from now until 15:30 IST (Ctrl+C stops it earlier).
summary = bt.record(
    client,
    [{"exchange": "NSE", "symbol": "SBIN"}, {"exchange": "NSE", "symbol": "INFY"}],
    until="15:30",
)

# How the recording stopped, and how many ticks of each instrument were saved.
print(summary.stopped_by)
print(summary.ticks)
```

From a run of this code against a simulated feed, started at 15:25 with one tick a second for each instrument:

```text
Stop.STOP_AT
{('NSE', 'SBIN'): 300, ('NSE', 'INFY'): 300}
```

* `Stop.STOP_AT`: it stopped at the `until` time. Other values are `Stop.CLOSE` (the day's close, when no `until` is given) and `Stop.INTERRUPT` (Ctrl+C).
* `summary.ticks`: how many ticks of each instrument were saved. A real feed sends many more, as often as the price changes.

## The arguments

* The instruments: a list of `{"exchange": ..., "symbol": ...}`.
* `until`: when to stop: an IST time of today as `"HH:MM"`, a `datetime`, or nothing for the close of the day's market for those exchanges. One recording covers one day; an `until` before now, or on another day, is refused before it starts.
* `mode`: what each tick holds: `"quote"` (the default), `"ltp"` (the last price only) or `"depth"` (with the order book).
* `cache_dir`: where to keep the files. By default they go in a `ticks` folder inside the backtest cache, `.openalgo/backtest/cache` in your home folder (or the folder named by the environment variable `OPENALGO_BT_CACHE`). A folder you give must be an absolute path.

## Safe on a long day

* The recording writes its ticks to disk at least once a second, in checked blocks. A crash or a power cut costs at most the last second of ticks and never leaves a damaged one; the next recording of the day finishes the files a crashed one left.
* It opens its own connection to the feed, so it never takes over another program's subscriptions. It can run beside a `bt.live` session: start it in a second terminal.
* If ticks cannot be written (a full disk), it stops and raises `LiveError`, naming the files kept. It also raises `LiveError` when the feed does not connect, or when another recording is using the same cache folder.

## Read the ticks back

`bt.read_ticks` reads a recorded day back as one table (a pandas DataFrame), one row per tick, in the exact order the ticks arrived. It needs no OpenAlgo server, so you can run it on any later day, in a new script:

```python
# Load the backtesting engine (bt).
import openalgo.backtest as bt

# Read back the ticks recorded on 11 November 2026, in the order they arrived.
ticks = bt.read_ticks("2026-11-11")

# How many ticks there are, and the first five.
print(len(ticks))
print(ticks.head().to_string())
```

From the recording above (the simulated feed sent each tick's trade time and the day's volume so far):

```text
600
  exchange symbol             exchange_time                  receive_time  exchange_time_given     ltp     volume
0      NSE   SBIN 2026-11-11 15:25:00+05:30 2026-11-11 15:25:00.500+05:30                 True   820.0  1204000.0
1      NSE   INFY 2026-11-11 15:25:00+05:30 2026-11-11 15:25:00.500+05:30                 True  1500.0   845000.0
2      NSE   SBIN 2026-11-11 15:25:01+05:30 2026-11-11 15:25:01.500+05:30                 True   820.0  1204025.0
3      NSE   INFY 2026-11-11 15:25:01+05:30 2026-11-11 15:25:01.500+05:30                 True  1500.0   845010.0
4      NSE   SBIN 2026-11-11 15:25:02+05:30 2026-11-11 15:25:02.500+05:30                 True   820.0  1204050.0
```

* `exchange_time`: when the trade happened, as the feed gave it (Indian time). Where the feed gave none, it is the receive time, and `exchange_time_given` is `False`. Some brokers' feeds (zerodha's among them) give the OpenAlgo server's own clock as the trade time, so there it is not the exchange's time even where `exchange_time_given` is `True` (the clock warning of [the first lesson](01-first-sandbox-session.md#what-you-see-when-it-starts)).
* `receive_time`: when the recording took the tick: the order a live session would have seen the ticks in.
* `ltp`: the last traded price, in rupees. `volume`: the day's traded volume so far, where the feed sent it; an `"ltp"` recording has no `volume` column. A `"depth"` recording adds `bid` and `ask`.
* `bt.read_ticks("2026-11-11", [{"exchange": "NSE", "symbol": "SBIN"}])` reads one instrument only, and `cache_dir=` reads from the folder you recorded to.
* A recording still running is left out until it ends, and one a crash stopped until the next recording of the day finishes its files; `ticks.attrs["left_out"]` lists their recording numbers.
* A day with nothing recorded raises `DataError`, naming the folder it looked in. So does an instrument you name that was not recorded that day, and a damaged file (named). A day that is not a date, instruments it cannot use, or a `cache_dir` that is not an absolute path raise `ConfigError`.

## Replay a recorded day in a backtest

To test a strategy on a day you recorded, make its ticks into 1-minute bars with pandas and give them to `bt.backtest` as your own data. It needs no OpenAlgo server, so you can replay the day as often as you like, with any strategy:

```python
# Load the backtesting engine (bt) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import ta

# Read back the SBIN ticks recorded on 11 November 2026, in the order they arrived.
ticks = bt.read_ticks("2026-11-11", [{"exchange": "NSE", "symbol": "SBIN"}])
prices = ticks.set_index("exchange_time")

# One-minute bars: the open, high, low and close of the price, stamped at the minute's start.
bars = prices["ltp"].resample("1min").ohlc()
# The feed sends the day's volume so far: each minute's volume is what it added.
bars["volume"] = prices["volume"].diff().clip(lower=0).resample("1min").sum()
bars = bars.dropna()
print(len(bars), "bars")
print(bars.head(3).to_string())


# The strategy: buy 100 shares when the 5-minute EMA crosses above the 10-minute one,
# and sell when it crosses back below.
class ReplayEma(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1m"

    def init(self):
        self.fast = self.I(ta.ema, self.close, 5)
        self.slow = self.I(ta.ema, self.close, 10)

    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            self.buy(qty=100)
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()


# Backtest it on the recorded day's bars: no OpenAlgo server is needed.
replay = bt.backtest(ReplayEma, data={"SBIN": bars}, start="2026-11-11", end="2026-11-11",
                     capital=100_000)
print(replay.summary())
print(replay.trade_list()[["entry_time", "entry_price", "exit_time", "exit_price", "net_pnl"]].to_string(index=False))
```

From a recording of SBIN on a simulated feed, one tick a second from 09:15 to 15:30, whose price swings 3 rupees each way around Rs 820 every two hours:

```text
375 bars
                             open    high     low   close  volume
exchange_time
2026-11-11 09:15:00+05:30  820.00  820.15  820.00  820.15  2950.0
2026-11-11 09:16:00+05:30  820.15  820.30  820.15  820.30  3000.0
2026-11-11 09:17:00+05:30  820.30  820.45  820.30  820.45  3000.0
Net profit   : Rs 443.67
Return       : 0.44%
Max drawdown : -0.09%
Trades       : 1 (100% won)
Overfitting  : too few trades to judge (1 closed, 30 needed)
               entry_time  entry_price                 exit_time  exit_price  net_pnl
2026-11-11 12:52:00+05:30        817.4 2026-11-11 13:52:00+05:30       822.6   443.67
```

* `bars` holds one row a minute, stamped at the minute's start, which is how the engine reads your own bars. A minute without a tick has no bar.
* `volume`: the feed sends the day's volume so far, so each minute's volume is what it added. An `"ltp"` recording has no `volume` column: leave that line out.
* The strategy's first decision comes a little after 11:20: its 10-bar EMA needs 128 bars to warm up, and the recording holds only the day's own bars. Record from the open, or the strategy may make no decision at all; the run then warns `WarmUpWarning` and names the bars it needs. To decide from the open, put earlier days' 1-minute bars (from Historify, say) before the recorded ones.
* This replays the day's bars, not each tick: stops, targets and orders at a level are checked on the 1-minute bars, as in any backtest. Matching orders against every recorded tick is not in openalgo 2.4.0.
* The bars follow `exchange_time`. On a feed whose trade times are the OpenAlgo server's own clock (see `exchange_time` above), they follow that clock.

## What you learned

* `bt.record(client, instruments, until="15:30")` saves every tick of a day, which a broker cannot give you later.
* It writes to disk every second, uses its own feed connection, and can run beside a live session.
* `bt.read_ticks(day)` reads a recorded day back as a table, in the order the ticks arrived.
* A recorded day made into 1-minute bars replays in `bt.backtest`, with no server; record from the open so the indicators can warm up.

## Next

[Limits](08-limits.md): the OpenAlgo server version you need, and what 2.3.0 cannot do yet.
