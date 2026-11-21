# Alerts

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
{% endhint %}

A session sends **alerts** to your phone through OpenAlgo's Telegram bot: each fill, each move of a stop, each rejected order, and anything that needs you. Every alert is also printed on the screen, with or without Telegram. A live session does not start without them.

## Set up

1. Set up OpenAlgo's Telegram bot and link your OpenAlgo user to it: see [Telegram](../../telegram.md).
2. Pass your OpenAlgo login name to `bt.live` as `alerts_to`. It is the user name you log in to OpenAlgo with, the one linked to the bot, not your Telegram handle.

The first lesson's script, with alerts:

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy: the EMA crossover of the backtesting tutorial, on 1-minute bars.
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
            self.buy(qty=10, stop=bt.pct(1))  # buy 10 shares, with a stop-loss 1 percent below
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares


# Trade it through OpenAlgo today, with alerts to your Telegram through OpenAlgo.
result = bt.live(
    EmaCrossover,
    client,
    capital=100_000,
    max_daily_loss=2_000,
    alerts_to="your_openalgo_username",  # your OpenAlgo login name, linked to its Telegram bot
)

# Print the session's result in one line.
print(result)
```

## The test alert

Before trading, the session sends a test alert and waits for OpenAlgo to confirm that Telegram took it:

* **In live mode** the session does not start unless the test alert was delivered. Without `alerts_to`, or with alerts that do not arrive, it stops at its checks:

```text
PreflightError: the live session cannot start: 1 preflight check failed. Fix each, then start it again:
- the test alert was not delivered, and a LIVE session needs its alerts: set up the alerts through OpenAlgo's Telegram bot, check that a message reaches you, then start the session again
```

* **In sandbox mode** it starts anyway, with the warning `the test alert was not delivered` in its banner, and the alerts appear on the screen only.

## What reaches your phone

Every alert starts with the session's mode and its strategies, so a message read on a phone can never be taken for the other mode. From a run of the code above against a simulated OpenAlgo server, the first messages on Telegram were the test alert, the start banner's first lines, and the buy:

```text
SANDBOX (EmaCrossover): Test alert from bt.live: the alerts of this session reach you here.
```

```text
SANDBOX (EmaCrossover): OpenAlgo is in SANDBOX mode: orders are simulated
Funds available: Rs 10,000,000.00
EmaCrossover: NSE:SBIN every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 14:50 IST, square-off 15:00 IST
SBIN: freeze quantity none
```

```text
SANDBOX (EmaCrossover): BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
```

On the screen the same alert starts with its kind instead: `ENTRY: BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)`. An EXIT alert also names why the position was closed (openalgo 2.4.0), such as `exit: target level`, `stop: stop level`, `square_off: square-off time` or `risk_exit: kill switch at the account daily loss limit`. The last message of the day is the daily summary, as in [the first lesson](01-first-sandbox-session.md#stop-it-with-ctrlc).

## Every alert, and what it asks of you

| Alert (as the screen shows it) | When | What to do |
|---|---|---|
| SESSION | The session started: the first lines of its banner (on Telegram only; the screen shows the whole banner) | Check the mode on its first line |
| ENTRY, EXIT | An order of the session filled | Nothing |
| STOP MOVED | The broker accepted a move of a trailing or breakeven stop | Nothing |
| REJECT | The broker or OpenAlgo refused an order, or the broker cancelled a stop by itself | Read the reason. The session handles it: a refused stop is replaced by a sale at market, a cancelled stop is placed again, a refused exit is tried again. If rejections repeat, check your funds and the symbol in OpenAlgo |
| MODE BREACH | OpenAlgo's analyzer switch changed, or its semi-auto mode was turned on | Press Ctrl+C. The session sent nothing more; start it again in the mode you want ([Risk Limits and Locks](04-risk-limits-and-locks.md#the-locks)) |
| FEED DEAD | No price for any instrument for 10 seconds | Check OpenAlgo's WebSocket server and your broker login. New entries wait until prices return |
| RECONCILE MISMATCH | The session's position and OpenAlgo's books differ | Do not trade by hand. Check OpenAlgo's position book; the strategy's entries are locked |
| ERROR | Something needs you | Read it: each ERROR says what happened and what to do, such as an exit that failed five times, OpenAlgo not answering for 10 seconds, a position still open after the square-off, or a position left open without a confirmed stop when the session ended |
| DAILY SUMMARY | The session ended | Read the day's figures |

Lines starting `Warning:` are printed on the screen and kept in `result.warnings`. The banner's warnings are not part of the SESSION alert: read them on the screen when the session starts.

## How alerts are sent

* Sending never slows the session down: alerts wait in a queue, and a separate sender posts them, the most urgent first (mode breach, dead feed, mismatch and errors).
* At most 20 posts a minute, and 25 for the most urgent, below OpenAlgo's limit of 30 a minute. Routine alerts that pile up leave together as one message. The same FEED DEAD, RECONCILE MISMATCH or ERROR text is sent at most once a minute.
* A post that fails is tried again for up to 5 minutes. Alerts never delivered are counted, and the daily summary then shows an `Alerts` line with how many.
* Alerts go through your OpenAlgo server. If OpenAlgo itself stops answering, an alert reaches your phone only once it answers again; the session's log file has it at once.

## What you learned

* `alerts_to` is your OpenAlgo login name, linked to OpenAlgo's Telegram bot; live mode needs it, and a delivered test alert.
* Every alert starts with the mode and the strategies, and is also printed on the screen.
* ENTRY, EXIT and STOP MOVED need nothing; MODE BREACH, FEED DEAD, RECONCILE MISMATCH and ERROR need you.

## Next lesson

[Restarts and Results](06-restarts-and-results.md): a crash and a restart on the same day, and everything in the result.
