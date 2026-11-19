# Stopping a Session

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

A session ends by itself after the day's square-off. To stop it earlier you press **Ctrl+C**. This lesson shows what Ctrl+C does with open positions, how to keep them instead, what a second Ctrl+C does, and the one rule of live trading: never close or change a position by hand while a session runs.

## Ctrl+C: the safe stop

Press Ctrl+C once. The session then:

1. takes no new entries, and cancels any entry order still waiting;
2. closes every open position: it reads OpenAlgo's books to check the position is still there, cancels the position's stop-loss at the broker, then sells (or buys back) at market;
3. waits until every position is closed, for at most 60 seconds;
4. prints the daily summary and returns the result, with `result.stopped_by` set to `"ctrl_c"`.

[Your First Sandbox Session](01-first-sandbox-session.md#stop-it-with-ctrlc) shows the lines it prints.

If a position is still open after 60 seconds (the broker keeps rejecting the sale, say), the session stops trying to sell it and places its stop at the broker again. Once the broker confirms that stop, the session ends with the position left open and protected. While a position has no confirmed stop, the session keeps running: every 60 seconds it prints a reminder and sends an ERROR alert naming the position, until the position is closed or protected, you press Ctrl+C a second time, or five minutes have passed after the exchange's close.

A few details:

* **During the 10-second countdown** of a fresh start, nothing has been sent yet: Ctrl+C ends the session with no order placed. On a [restart](06-restarts-and-results.md#restart-run-the-same-script-again) that resumed positions, the countdown is no longer a free exit: Ctrl+C there is the safe stop above, so with `on_stop="flatten"` (the default) it sells the resumed positions at market, and with `on_stop="keep"` it leaves them open with their stops.
* **During the checks before the banner**, Ctrl+C stops Python with `KeyboardInterrupt`: no order was sent.
* **Run `bt.live` from your main program**, not from a thread: Ctrl+C reaches only Python's main thread, so `bt.live` refuses to start anywhere else (`LiveError`).
* On Windows, Ctrl+Break is a safe stop too; on Linux and macOS so is the stop signal a service manager sends (SIGTERM).

## Keep the positions: `on_stop="keep"`

`on_stop` chooses what Ctrl+C does with open positions, for each run:

* `on_stop="flatten"` (the default): close them, as above.
* `on_stop="keep"`: leave them open, each with its stop-loss at the broker.

Any other value is refused before the session starts. The script of the first lesson, with `on_stop="keep"`:

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


# Trade it through OpenAlgo today. With on_stop="keep", Ctrl+C leaves an open position
# with its stop at the broker instead of selling it.
result = bt.live(EmaCrossover, client, capital=100_000, max_daily_loss=2_000, on_stop="keep")

# Print the session's result in one line.
print(result)
```

The output below comes from a run of this code against a simulated OpenAlgo server; your prices, times and order numbers will differ. The strategy bought 10 SBIN at 10:12, and Ctrl+C was pressed at 10:20:

```text
EmaCrossover SBIN NSE 10 units: stop 26111136724000 confirmed at the broker: it protects the position, so cancel the stop before any sale by hand
DAILY SUMMARY: Session of 2026-11-11 (IST): SANDBOX mode, broker zerodha
Strategies  : EmaCrossover
Trades      : 0 closed
Gross P&L   : Rs 12.00
Charges     : Rs 3.45 (modelled)
Net P&L     : Rs 8.55
Slippage    : Rs 2.50 better than the backtest
Rejected    : 0 orders
Unprotected : 3 s without a stop at the broker
Reconcile   : 0 mismatches
End state   : not flat: a position is still open
SessionResult(SANDBOX 2026-11-11, broker zerodha, stopped by ctrl_c, 0 closed trades, net P&L Rs 8.55, 1 positions open)
```

* The first line names each position left open, its stop order at the broker, whether the broker confirmed that stop, and what to do before a sale by hand. `result.open_positions` lists the same, as a table.
* The P&L counts the open position at the last price; no trade is closed yet.
* The position is now yours. It is an MIS position, so your broker squares it off near the close at its own time if you do nothing. To close it yourself, cancel its stop in OpenAlgo first, then sell.

Choose `"keep"` when you trust the stop at the broker and want the trade to run on after you stop the program. Choose the default, `"flatten"`, when you want nothing left open.

## A second Ctrl+C

If the session does not end quickly enough (a sale the broker keeps rejecting, OpenAlgo not answering), press Ctrl+C again. The second Ctrl+C asks for nothing more: no new sale and no retry. It makes sure each open position has its stop-loss at the broker (placing it again where it can), waits at most 5 seconds for the last answers, prints one line for each position left open, and stops.

The first lesson's script, with Ctrl+C pressed at 10:20 and again two seconds later. The first had cancelled the stop for the sale; the second withdrew the sale before it was sent and placed the stop again, so the line names a new stop order:

```text
EmaCrossover SBIN NSE 10 units: stop 26111137205000 confirmed at the broker: it protects the position, so cancel the stop before any sale by hand
```

Two presses in quick succession, before the session has read OpenAlgo's books, send no sale at all: the position keeps the stop it had. The session sells only after a book read confirms the position is still there, and a second Ctrl+C asks to stop now.

## Never close or change a position by hand while a session runs

While a session runs, it holds a stop at your broker and sends its own exits (the strategy's sale, a target, the 15:00 square-off). It compares its positions with OpenAlgo's books every 30 seconds, and 3 seconds after each fill: its own, and any other fill on a symbol it trades that OpenAlgo's order stream reports. So a sale by hand is seen within seconds: once two comparisons in a row show it, the session takes the sale as closing its position, cuts its stop down (or cancels it), locks the strategy's new entries and alerts you ([Risk Limits and Locks](04-risk-limits-and-locks.md#the-locks) shows a run). It never trades to undo it.

Those few seconds are still a risk, and so is a broker whose order updates OpenAlgo does not stream, where the sale waits for the next 30-second check. Until the session has seen the sale:

* Its next exit can sell the same shares again. You would then have sold more than you held: a short position you never wanted.
* Its stop is still at the broker, for shares you no longer hold. If the price falls to it, it sells them again, with the same result.
* If you cancel its stop by hand, the session sees a stop that ended without its asking, and places it again.

To close a position yourself:

1. **End the session first**: Ctrl+C, and a second Ctrl+C if it does not end.
2. **Read its last lines.** Each position left open is named with its stop order.
3. **In OpenAlgo, cancel that stop first, then close the position.**

## Other ways a session ends

* **The end of the day.** After the square-off, once everything is closed, the session ends by itself: `result.stopped_by` is `"session_end"`.
* **OpenAlgo's mode changed** during the session: it sends nothing more and alerts you. Ctrl+C then stops it at once; left alone it ends five minutes after the exchange closes. `result.stopped_by` is `"mode_breach"` ([Risk Limits and Locks](04-risk-limits-and-locks.md#the-locks)).
* **An error in your strategy's code** (in `on_bar`, say): an ERROR alert, then the same safe stop as Ctrl+C (by `on_stop`), then `bt.live` raises your error again.

## What you learned

* One Ctrl+C is a safe stop: no new entries, and by default every position closed before the session returns.
* `on_stop="keep"` leaves open positions at the broker with their stops; the closing lines name each one.
* A second Ctrl+C stops within seconds, after making sure each open position has its stop.
* Never sell or change a session's position by hand while it runs: end the session, cancel its stop, then close.

## Next lesson

[Stop-Loss at the Broker](03-stop-loss-at-the-broker.md): the stop your broker holds, trailing it, and what happens when the broker rejects an order.
