# Restarts and Results

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

A session writes down everything it does, so that a crash costs as little as possible and a restart the same day picks up where it stopped. This lesson shows where those files are, what happens when the program or the computer stops, how to restart, and what the result holds.

## Where the session keeps its files

Each OpenAlgo account has a folder, `.openalgo/live/<account>` in your home folder (on Windows `C:\Users\<you>\.openalgo\live\<account>`). The account is your broker's name, as OpenAlgo reports it, unless you pass `account="..."` (give each account its own name when you have two at one broker). In it:

* `journal.sqlite`, the **journal**: a small database file. Every order is written to it before it is sent, then every answer and fill, each position's stop at the broker, the strategy's risk figures, and your strategy's `self.state`.
* `logs/<day>.log`: the day's log, everything the session did, in plain text.
* `logs/<day>.events.jsonl`: the same events, one per line, for programs to read.

`result.paths` gives the three paths. To keep them elsewhere, pass `live_dir="..."` (an absolute folder) or set the environment variable `OPENALGO_LIVE_DIR`. Never delete a journal during a trading day: a restart needs it.

Values your strategy keeps in `self.state` (a dict) are saved in the journal, separately for sandbox and live mode, and given back to the strategy at its next start, a restart or the next day's session: the saved values replace what `init` set.

## When the session stops unexpectedly

A crash, a power cut or a closed terminal ends the program where it stands. What still protects you is the **stop-loss at your broker**: it is a real order and works without the session. While the program is down:

* the targets, the trailing stop and the daily loss limit are not watched (the session watches them);
* the stop at the broker still works, and your broker still squares off MIS positions near the close;
* fills that happen meanwhile are not lost: the session finds them in OpenAlgo's books when it restarts.

## Restart: run the same script again

Start the same script again, the same day. Before it trades, the session:

1. settles any order whose answer it never got, by reading OpenAlgo's order book;
2. reads OpenAlgo's position, order and trade books, and compares each position with the journal;
3. resumes each position with its stop: it checks that the stop still works at the broker, or places it again; a position found after the square-off time is closed at once;
4. gives the strategy its saved `self.state`, and locks again what lasts the day (see [the locks](04-risk-limits-and-locks.md#the-locks));
5. prints its banner, saying it restarted.

From a run against a simulated OpenAlgo server: the first lesson's session bought 10 SBIN at 10:12 and crashed at 10:16; the same script, started again, printed:

```text
OpenAlgo is in SANDBOX mode: orders are simulated
Restarted: start 2 of the day
EmaCrossover: resumed 10 SBIN NSE, stop 26111136724000 confirmed at the broker
Funds available: Rs 10,000,000.00
```

The second line counts the starts of the day; the third names each position it resumed, and its stop. The rest of the banner and the countdown follow as usual, with one difference: a Ctrl+C during this countdown is the safe stop, not a free exit. With the default `on_stop="flatten"` it sells the resumed positions at market; with `on_stop="keep"` it leaves them with their stops ([Stopping a Session](02-stopping-a-session.md#ctrlc-the-safe-stop)).

The session refuses to start, with a `LiveError` and nothing sent, when OpenAlgo's books and the journal disagree in a way no trade explains: a position on one of its symbols that the journal does not know, or a position in the journal that the broker no longer holds. Check the account in OpenAlgo, close or keep the position by hand, then start again.

## The result

`bt.live` returns a `SessionResult` when the session ends. `print(result)` gives one line; the rest are fields to read. The first block below is the first lesson's script; the second continues it: add it below the script, in the same file.

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


# Trade it through OpenAlgo today, until the end of the day or Ctrl+C.
result = bt.live(EmaCrossover, client, capital=100_000, max_daily_loss=2_000)

# Print the session's result in one line.
print(result)
```

<!-- requires-server -->
<!-- continues -->
```python
# The day's figures, as the DAILY SUMMARY alert sent them.
print(result.summary_text())

# Every order the session placed through OpenAlgo (to_string() prints every row).
columns = ["created", "purpose", "action", "price_type", "quantity", "trigger_price", "status"]
print(result.orders[columns].to_string())

# The strategy's closed trades, as a backtest lists them.
trades = result.results["EmaCrossover"].trade_list()
columns = ["entry_time", "exit_time", "quantity", "entry_price", "exit_price", "gross_pnl"]
print(trades[columns].to_string(float_format="%.2f"))

# Each time a position had no confirmed stop at the broker, and why.
print(result.unprotected[["from", "to", "seconds", "reason"]].to_string())

# The strategy's Result adds up to its trades. f"..." fills each {value} into the text,
# and :,.2f writes it with commas and 2 decimals.
r = result.results["EmaCrossover"]
print(f"Result net profit : Rs {r.metrics['net_profit']:,.2f}")
print(f"Trades' net P&L   : Rs {trades['net_pnl'].sum():,.2f}")

# The day's contract note, whose charges the Result pays.
columns = ["date", "fills", "charged_total", "posted", "adjustment"]
print(r.contract_notes[columns].to_string())
```

From a run of this code against a simulated OpenAlgo server, with Ctrl+C at 10:20, the second block printed:

```text
Session of 2026-11-11 (IST): SANDBOX mode, broker zerodha
Strategies  : EmaCrossover
Trades      : 1 closed
Gross P&L   : Rs 12.00
Charges     : Rs 8.70 (modelled)
Net P&L     : Rs 3.30
Slippage    : Rs 2.50 better than the backtest (1 MARKET fill not compared: no bar of its decision)
Rejected    : 0 orders
Unprotected : 7 s without a stop at the broker
Reconcile   : 0 mismatches
End state   : flat
                    created    purpose action price_type  quantity  trigger_price    status
0 2026-11-11 10:12:01+05:30      entry    BUY     MARKET        10           0.00    Filled
1 2026-11-11 10:12:03+05:30       stop   SELL       SL-M        10         809.35  Canceled
2 2026-11-11 10:20:03+05:30  risk_exit   SELL     MARKET        10           0.00    Filled
                     entry_time                 exit_time  quantity  entry_price  exit_price  gross_pnl
trade                                                                                                  
1     2026-11-11 10:12:00+05:30 2026-11-11 10:20:00+05:30     10.00       817.55      818.75      12.00
                       from                        to  seconds            reason
0 2026-11-11 10:12:02+05:30 2026-11-11 10:12:05+05:30      3.0  stop unconfirmed
1 2026-11-11 10:20:01+05:30 2026-11-11 10:20:05+05:30      4.0           exiting
Result net profit : Rs 3.59
Trades' net P&L   : Rs 3.59
         date  fills  charged_total  posted  adjustment
0  2026-11-11      2           8.41     8.7       -0.29
```

* **The orders**: the buy, the stop the broker held (an SL-M sell, triggered at 809.35) and cancelled at Ctrl+C, and the sale.
* **The trade list**: the trades as a backtest lists them. Its times are the minutes of the session's bars; `result.fills` has the second each fill was heard (10:12:02 and 10:20:04 here).
* **Unprotected**: the 7 seconds of the summary, in two windows: 3 seconds from the buy's fill until the broker confirmed the stop, and 4 seconds from the stop's cancel at Ctrl+C until the sale filled.
* **The Result adds up**: the strategy's `Result` settles its day as a backtest does, so its net profit (Rs 3.59) is its trades' net P&L, plus the value of any position still open less its charges.
* **Two charges figures**: the daily summary adds each fill's modelled charges, rounded to the paisa, so the day's figure adds up across restarts: Rs 8.70, the `posted` column. The `Result` pays the day's contract note instead, which rounds STT and stamp duty once for the whole note, as your broker does: Rs 8.41 (`charged_total`). The `adjustment` (Rs -0.29) is that rounding, and the only difference between the summary's Net P&L (Rs 3.30) and the Result's net profit (Rs 3.59).
* **Slippage**: the buy filled Rs 2.50 better than a backtest of the same bars; the Ctrl+C sale is not compared, because the session ended before the next minute's first trade ([the first lesson](01-first-sandbox-session.md#stop-it-with-ctrlc) explains the line).

Everything in the result:

| Field | What it holds |
|---|---|
| `mode` | `"sandbox"` or `"live"`, as OpenAlgo's switch was when the session started |
| `broker`, `account`, `day` | The broker, the account name, and the trading day (IST) |
| `started`, `ended` | When this start of the session began and ended (IST) |
| `stopped_by` | `"session_end"`, `"ctrl_c"`, `"mode_breach"` or `"error"` |
| `restarts` | How many times the session of this day and mode was started before this start |
| `strategies` | The strategy names, in the order given |
| `results` | Each strategy's backtest `Result`, by name: its trades, metrics, contract notes and tearsheet (`result.results["EmaCrossover"].tearsheet("session.html")`), for this start of the session; its net profit adds up to its trades |
| `summary`, `summary_text()` | The day's figures over every start of the day, as the daily summary; `summary.slippage` is in rupees (negative when live did better than the backtest, `None` when no fill could be compared) |
| `orders` | Every order the session placed through OpenAlgo |
| `fills` | Every fill, with where the session heard of it |
| `drift` | Each of the broker's one-minute candles against the bar the session built from the live prices |
| `unprotected` | Each time a position had no confirmed stop at the broker, and why |
| `locks` | Each entry lock: why, when it was set and lifted |
| `reconciliations` | Each comparison with OpenAlgo's books that differed, and what was done |
| `skipped_decisions` | Bars whose `on_bar` was skipped because prices were missing |
| `open_positions` | Positions still open at the end, each with its stop at the broker and a note on what to do |
| `mode_breach` | What the session saw when OpenAlgo's mode changed, else `None` |
| `warnings` | Everything you should know, the mode first |
| `paths` | The journal, the day's log and the event file |
| `unconfirmed_legs` | The positions the close could not confirm, in words: OpenAlgo's books and the session disagreed on them, or no read of the books confirmed them. A warning names each too; check them in OpenAlgo |
| `flat` | `True` only when the session ended with nothing open and no position in `unconfirmed_legs` |

## The day across restarts

The daily summary (`result.summary`, `summary_text()`) counts the whole trading day across every start, so a day split by a crash or a Ctrl+C reads like one session. `result.results` covers this start only: after a restart, each strategy's `Result` begins at the restart. A position carried across the restart keeps its whole trade there, but trades closed in an earlier start, and their charges, are only in the summary.

## What you learned

* The journal in `.openalgo/live/<account>` records every order before it is sent; a restart reads it.
* While the program is down, the stop at your broker protects an open position; targets, trailing and the daily loss wait for the restart.
* Running the same script again the same day resumes the positions with their stops, and the banner says so.
* `result.summary` covers the whole day; `result.results` holds each strategy's backtest-style `Result` for this start.

## Next lesson

[Recording Ticks](07-recording-ticks.md): keep the live prices with `bt.record`.
