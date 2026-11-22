# Restarts and Results

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
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

What a restart can pick up is what the session saved. It writes each order to the journal before sending it, and saves each strategy's state (its positions, its stops, the trailing stop's highest price, its daily figures and `self.state`) before each order it sends, after every minute's bar, and once more when a Ctrl+C ends the session. So:

* **After a crash**, at most the last minute of the trailing stop's progress can be lost: a new high reached since the last save is not known at the restart, and the trail goes on from the high saved before it. **After a Ctrl+C** nothing is lost.
* **Prices while the program is down do not move the trailing stop.** At the restart the bars it missed only bring the indicators up to date: no decision is taken on them, and no high of theirs moves the trail.
* **To stop on purpose and carry a position on**, start with `on_stop="keep"`: Ctrl+C then leaves the position with its stop at the broker, and running the script again resumes it with its trailing stop. With the default `on_stop="flatten"`, Ctrl+C sells it ([Stopping a Session](02-stopping-a-session.md#keep-the-positions-on_stopkeep)).

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
Funds available: Rs 1,00,00,000.00
```

The second line counts the starts of the day; the third names each position it resumed, and its stop. The rest of the banner and the countdown follow as usual, with one difference: a Ctrl+C during this countdown is the safe stop, not a free exit. With the default `on_stop="flatten"` it sells the resumed positions at market; with `on_stop="keep"` it leaves them with their stops ([Stopping a Session](02-stopping-a-session.md#ctrlc-the-safe-stop)).

The session refuses to start, with a `LiveError` and nothing sent, when OpenAlgo's books and the journal disagree in a way no trade explains: a position on one of its symbols that the journal does not know, or a position in the journal that the broker no longer holds. Check the account in OpenAlgo, close or keep the position by hand, then start again.

## A crash and a restart in a real session

From a sandbox session on MCX on 19 November 2026 ([Inside a Session](09-inside-a-session.md) describes its strategies): at 18:30:46 the program was ended on purpose, as a crash would end it, while CrudeBigTrend held one lot of crude oil (100 barrels, bought at 7,701) with its trailing stop moved up to 7,765. OpenAlgo's books eight seconds before, read with a short script (`analyze` is OpenAlgo's word for sandbox mode):

```text
BEFORE CRASH 18:30:38 | mode analyze
orders in the book: 8
  WORKING 26111962641261 CRUDEOIL18DEC26FUT SELL 100 SL-M trigger 7765.0
  POSITION CRUDEOIL18DEC26FUT 100 avg 7701.0 ltp 7789.0
```

The same script, started again at once, printed:

```text
OpenAlgo is in SANDBOX mode: orders are simulated
Restarted: start 4 of the day
CrudeBigTrend: resumed 100 CRUDEOIL18DEC26FUT MCX, stop 26111962641261 confirmed at the broker
Funds available: Rs 9,921,817.85
```

* The restart found the stop still working at the broker, the same order with the same trigger, and kept it. It sent nothing while it restarted: OpenAlgo's book held the same 8 orders before and after, and the session was trading again at 18:31:01.
* `start 4 of the day` counts every start of the day, the earlier sessions of that evening included.
* At 18:40 the strategy's own exit closed the lot, cancelling the resumed stop first:

```text
EXIT: SELL 100 CRUDEOIL18DEC26FUT MCX at 7785.00 (exit, order 26111967201224)
```

## A restart needs the same names on the same contracts

A restart finds each strategy's saved state by its class name. Under one name, the restart expects the same contract and the same capital as before; when either differs, `bt.live` stops with a `LiveError` before anything is sent. From a run against a simulated OpenAlgo server: the first lesson's script ran until Ctrl+C at 10:20, then the same script with `"INFY"` in place of `"SBIN"` was started the same day:

```text
LiveError: EmaCrossover: its saved state is of SBIN on NSE, and this session trades INFY on NSE: the restart cannot resume it, and does not start it afresh, since a saved state may hold working orders. For a new instrument or contract, give the strategy class a new name (its state is saved under its name); to resume it, keep its symbol SBIN on NSE. Check its positions and orders in OpenAlgo
```

The same refusal met the sandbox session on MCX on 19 November 2026, when a class name used earlier that evening for crude oil mini was given the crude oil contract. When you change a strategy's contract or its capital during a day, give the class a new name, such as `CrudeBigTrend` instead of reusing `CrudeTrend`, but only once the old strategy is flat. A new name starts afresh: it does not take over a position the old name still holds. After an `on_stop="keep"`, that position stays at the broker with only its stop: no trailing, no targets, no square-off by the session (your broker's own MIS square-off near the close still applies), and the new start's banner does not mention it (only its closing summary does, for example `earlier today: EmaCrossover (10 units of SBIN NSE open at its last save)` and `End state : not flat`). So close it first: run the old script once more and stop it with Ctrl+C, which with the default `on_stop="flatten"` resumes the position, cancels its stop and sells it ([Stopping a Session](02-stopping-a-session.md#ctrlc-the-safe-stop)). The old name's saved state then stays in the journal, flat and unused.

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
Strategies  : EmaCrossover (version eb5c92ff0caa)
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
| `portfolio` | The strategies as one account, for this start of the session: summary, metrics and the combined tearsheet ([Several Strategies in One Session](12-several-strategies-in-one-session.md#the-strategies-as-one-account-resultportfolio); openalgo 2.4.0) |
| `versions` | Each strategy's run manifest by name: its code, its parameters and every setting the session used, of which the code and parameters make its version id ([Audit a Session](10-audit-a-session.md#the-strategy-version-on-every-order); openalgo 2.4.0) |
| `summary`, `summary_text()` | The day's figures over every start of the day, as the daily summary; `summary.slippage` is in rupees (negative when live did better than the backtest, `None` when no fill could be compared), and `summary.slippage_not_compared` counts the MARKET fills with no bar to compare; `summary.stop_slippage` is the same for the fills of the stops at the broker |
| `orders` | Every order the session placed through OpenAlgo, with the strategy and its version id |
| `fill_comparison` | Each fill of the day against the price a backtest of the session's bars fills the same order at ([Audit a Session](10-audit-a-session.md#live-fills-against-a-backtest-of-the-same-bars); openalgo 2.4.0) |
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

The daily summary (`result.summary`, `summary_text()`) counts the whole trading day across every start, so a day split by a crash or a Ctrl+C reads like one session. `result.results` covers this start only: after a restart, each strategy's `Result` begins at the restart. A position carried across the restart keeps its whole trade there, but trades closed in an earlier start, and their charges, are only in the summary. The tables `orders`, `fills`, `unprotected`, `reconciliations` and `drift` also begin at this start (`orders` with the orders it resumed, such as a working stop); the event stream holds the whole day, and [Audit a Session](10-audit-a-session.md) reads it.

## What you learned

* The journal in `.openalgo/live/<account>` records every order before it is sent; a restart reads it.
* While the program is down, the stop at your broker protects an open position; targets, trailing and the daily loss wait for the restart.
* Running the same script again the same day resumes the positions with their stops, and the banner says so.
* The state is saved before each order, every minute and at a Ctrl+C: a crash can lose at most a minute of the trailing stop's progress, a Ctrl+C nothing.
* A restart needs each class name on the same contract with the same capital: rename the class when you change them during a day, once the old strategy is flat.
* `result.summary` covers the whole day; `result.results` holds each strategy's backtest-style `Result` for this start.

## Next lesson

[Recording and Replaying Ticks](07-recording-ticks.md): keep the live prices with `bt.record`, read them back with `bt.read_ticks`, and replay a recorded day in a backtest.
