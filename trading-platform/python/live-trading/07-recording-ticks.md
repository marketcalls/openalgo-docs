# Recording Ticks

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
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

openalgo 2.3.0 records the ticks and keeps them; it has no public function yet to read them back.

## What you learned

* `bt.record(client, instruments, until="15:30")` saves every tick of a day, which a broker cannot give you later.
* It writes to disk every second, uses its own feed connection, and can run beside a live session.

## Next

[Limits](08-limits.md): the OpenAlgo server version you need, and what 2.3.0 cannot do yet.
