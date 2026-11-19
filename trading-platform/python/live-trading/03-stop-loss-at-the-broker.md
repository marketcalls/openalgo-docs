# Stop-Loss at the Broker

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
{% endhint %}

In a backtest the engine checks the stop-loss itself. In a live session your **broker holds it**, as a real order, so it protects the position even if your computer, your internet or the session stops. This lesson shows how the stop is placed, how a trailing stop moves it, how targets work, what the session does when the broker rejects a stop or an exit, and what changes when an entry has no stop.

## How the stop is placed

Give the entry a stop, as in a backtest: `self.buy(qty=10, stop=bt.pct(1))`. As soon as the buy fills, the session places the stop at the broker, for the shares filled, as the order your segment accepts:

* **Stocks and futures:** an **SL-M** order (stop-loss market): when the price reaches the trigger, the broker sells at market.
* **Options:** an **SL** order (stop-loss limit) with its limit 5 percent beyond the trigger, because NFO and BFO take no SL-M order for options. A sell stop triggered at 120.30 gets the limit 114.25 (5 percent below, rounded down to the tick). OpenAlgo's sandbox takes SL-M on any instrument, but the session sends an option's stop as SL there too, so sandbox and live work the same way.

If the buy fills in parts, or the strategy adds to the position, the session changes the stop's quantity to cover every share.

The stop counts as **confirmed** once the broker has answered that it is working. Until then the position is **unprotected**, and the seconds are counted (the Unprotected line of the daily summary). If the broker accepted the stop but has not confirmed it within 10 seconds, the session cancels it and sells at market.

## A trailing stop: the session moves the broker's stop

A trailing stop follows the price up and never moves down. In a live session the session moves the broker's stop by modifying the order. The first lesson's script, with a trailing stop added to the buy:

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy: the EMA crossover, with a trailing stop.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1m"  # SBIN on NSE, 1-minute bars
    fast = 20  # bars in the fast EMA
    slow = 50  # bars in the slow EMA

    # init runs once, before the first bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # 20-bar EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, self.slow)  # 50-bar EMA of the closes

    # on_bar runs at the close of every 1-minute bar and decides what to do.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            # buy 10 shares with a stop 1 percent below; once the price is 0.5 percent
            # above the buying price, the stop follows it, 0.5 percent below the highest
            self.buy(qty=10, stop=bt.pct(1), trail=bt.trail_pct(0.5))
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares


# Trade it through OpenAlgo today, until the end of the day or Ctrl+C.
result = bt.live(EmaCrossover, client, capital=100_000, max_daily_loss=2_000)

# Print the session's result in one line.
print(result)
```

The output below comes from a run of this code against a simulated OpenAlgo server, in which SBIN rose steadily after the buy; your prices, times and order numbers will differ. Ctrl+C was pressed at 10:30:

```text
ENTRY: BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 817.55 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 819.75 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 821.90 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 824.05 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 826.25 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 828.40 (order 26111136724000)
STOP MOVED: EmaCrossover: stop of SBIN NSE moved to 830.55 (order 26111136724000)
EXIT: SELL 10 SBIN NSE at 834.65 (risk_exit, order 26111137804000)
```

* The stop started at 809.35, 1 percent below the buying price. Once SBIN was 0.5 percent above the buying price, the trail took over: the stop moved to 817.55, 0.5 percent below the highest price so far, and on up from there.
* Every move is the same order (26111136724000), modified. The session modifies it only when the new trigger is at least 0.25 percent away from the one the broker last confirmed, and at most once every 5 seconds, because brokers limit how often an order may be changed.
* A modification the broker refuses leaves the stop where it was, still protecting the position; the next move tries again.
* A breakeven stop (`breakeven=bt.breakeven(bt.pct(1))`) moves the broker's stop the same way.

## Targets and the daily loss: watched on every price

The session checks targets (`target=`, `targets=`) and the daily loss limit on every price from the live feed, not only at the bar's close. When a target is reached, it never sends a sale next to the stop: it cancels the stop at the broker, waits for the broker to confirm the cancel, and only then sells at market. If the broker answers that the stop had filled instead, the position is closed and nothing more is sent. So the stop and the exit can never both fill.

A partial exit (a target for part of the position, or `self.reduce()`) first cuts the stop down to the shares that stay open, and sends the partial sale once the broker confirms the cut.

## When the broker rejects a stop

If the broker rejects the stop, the session sells the position at market at once, and sends a REJECT alert with the broker's reason. From a run in which the broker refused the stop:

```text
ENTRY: BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
REJECT: EmaCrossover: SELL 10 SBIN NSE (stop) order refused by OpenAlgo: trigger price out of range (intent 20261111-sandbox-1-EmaCrossover-o2)
EXIT: SELL 10 SBIN NSE at 817.60 (risk_exit, order 26111136725000)
```

If the broker cancels a stop by itself (its risk checks, a new price band), the session places it again, once, and sends a REJECT alert naming it. If that stop also ends without filling, the session sells at market.

A stop can be triggered and still not fill, most often an option's stop-limit when the price runs through its limit. The session decides by the price: 2 seconds after the price crossed the trigger with no fill, it changes the stop to a limit at the latest price moved 5 percent against you, so that it can fill, and does that again every 2 seconds, up to 5 times. If the broker refuses a change, or the 5 attempts are used up, the session cancels the stop and sells with a limit order priced the same way, with an ERROR alert.

## When the broker rejects an exit

A rejected sale (the strategy's exit, a target, the square-off, Ctrl+C's) is sent again after 1, 2, 5 and 10 seconds: five attempts in all. While they run the position has no stop at the broker (it was cancelled for the sale) and counts as unprotected. After the fifth rejection the session locks the strategy's new entries for the rest of the session, places the stop at the broker again, and sends an ERROR alert that says what to do. From a run in which the broker refused every sale after Ctrl+C:

```text
REJECT: EmaCrossover: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: RMS: order blocked (intent 20261111-sandbox-1-EmaCrossover-o3)
REJECT: EmaCrossover: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: RMS: order blocked (intent 20261111-sandbox-1-EmaCrossover-o4)
REJECT: EmaCrossover: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: RMS: order blocked (intent 20261111-sandbox-1-EmaCrossover-o5)
REJECT: EmaCrossover: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: RMS: order blocked (intent 20261111-sandbox-1-EmaCrossover-o6)
REJECT: EmaCrossover: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: RMS: order blocked (intent 20261111-sandbox-1-EmaCrossover-o7)
ERROR: exit of SBIN NSE failed 5 times (RMS: order blocked): EmaCrossover's entries are locked; its stop is placed again at the broker and protects the position; to close it by hand, end the session first (Ctrl+C, and a second Ctrl+C if it does not end), then, if its closing lines still show the leg open, cancel that stop: while the session runs, the engine may send its exit or its stop again
EmaCrossover SBIN NSE 10 units: stop 26111136987000 confirmed at the broker: it protects the position, so cancel the stop before any sale by hand
```

The position is protected again by its stop. Read the broker's reason in the REJECT lines, fix it if you can (funds, a blocked symbol), and follow the alert: end the session first, then cancel the stop, then close the position by hand. The last line is the session's closing line for the position left open, after a second Ctrl+C.

## Entries without a stop

An entry without `stop=` is allowed in sandbox and live mode alike: `self.buy(qty=10)`. The start banner's Stops line states the rule, and the first position opened without a stop at the broker prints a warning at once:

```text
ENTRY: BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
Warning: EmaCrossover: a position of 10 SBIN NSE was opened with no stop at the broker (no stop=, or a trail or breakeven not armed yet)
```

The warning is in `result.warnings` too. Such a position has nothing at the broker to protect it if the session stops unexpectedly. A trailing stop or a breakeven given without `stop=` has no stop at the broker until it is armed, so the warning covers that case as well.

## What you learned

* With `stop=`, the broker holds the stop as a real order: SL-M for stocks and futures, SL with a 5 percent limit for options.
* A trailing stop or breakeven moves the broker's stop by modifying it, at most once every 5 seconds and by at least 0.25 percent.
* Targets and the daily loss are watched on every price; an exit always cancels the stop first.
* A rejected stop is replaced by a sale at market; a rejected exit is tried five times, then the stop is placed again and an alert tells you what to do.

## Next lesson

[Risk Limits and Locks](04-risk-limits-and-locks.md): capital, the daily loss limits, the kill switch, and the locks that stop new entries.
