# Risk Limits and Locks

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

A live session never trades without limits. This lesson covers the money limits you set (capital, the daily loss of each strategy and of the whole account), the **kill switch**, and the **locks**: the session's own brakes, which stop new entries when something is wrong.

## Capital and the daily loss limit

Both are required by `bt.live`, in sandbox and live mode alike:

* `capital`: the rupees set aside for each strategy. A plain `self.buy()` sizes from it, and never for more than the cash your account has (read at the start, and again each time the session checks OpenAlgo's books). Give one number for every strategy, or a dict by strategy class name: `capital={"EmaCrossover": 100_000, "InfyCrossover": 50_000}`.
* `max_daily_loss`: the most a strategy may lose today, in rupees (or `bt.rupees(...)`), one value or a dict by class name. It is checked on every price: today's closed trades plus the open position, before charges (`risk_basis="net"` counts the modelled charges too). When the loss reaches it, the session exits every position of that strategy and takes no new entries for it for the rest of the day.

A `max_daily_loss` set on the strategy class is not enough in a live session: the limit you pass to `bt.live` is the one used, and a class value that differs from it stops the start with a `ConfigError`.

The other risk settings work as in a backtest, with the same defaults: `drawdown_halt`, `cooldown`, `max_positions`, `entry_from`, `entry_until` and `square_off` ([Orders and Risk](../backtesting/orders-and-risk.md)).

## Several strategies and the account's limit

One session runs every strategy of one OpenAlgo account: pass them as a list, each on its own symbol. A second `bt.live` for the same account, or the same OpenAlgo server, is refused at its checks while the first runs. `account_max_daily_loss` limits the loss of all the strategies together:

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


# The same strategy on INFY: a copy of the class with another symbol.
class InfyCrossover(EmaCrossover):
    symbol = "INFY"


# Trade both in one session: Rs 1,00,000 and a Rs 2,000 daily loss limit for each,
# and at most Rs 3,000 lost by the two together.
result = bt.live(
    [EmaCrossover, InfyCrossover],
    client,
    capital=100_000,
    max_daily_loss=2_000,
    account_max_daily_loss=3_000,
)

# Print the session's result in one line.
print(result)
```

`class InfyCrossover(EmaCrossover)` makes a copy of the strategy with only the symbol changed. The start banner lists each strategy and the account's limit (from a run of this code against a simulated OpenAlgo server):

```text
EmaCrossover: NSE:SBIN every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 14:50 IST, square-off 15:00 IST
SBIN: freeze quantity none
InfyCrossover: NSE:INFY every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 14:50 IST, square-off 15:00 IST
INFY: freeze quantity none
Stops: an entry placed with stop= gets its stop at the broker as it fills; one placed without has none until a trail or breakeven sets one (allowed), and the session warns at the first such position
Account daily loss limit: Rs 3,000.00
```

## The kill switch

When the loss of all the strategies together reaches `account_max_daily_loss`, the session fires the **kill switch** for every strategy:

1. New entries are locked for the rest of the day, and entry orders still waiting are cancelled.
2. Each position is closed through its exit (its stop cancelled first), but only when OpenAlgo's position book shows the broker holding at least the strategy's shares on the same side. If it shows fewer, the session sends nothing and reads the book again (every 2 seconds, then every 30 seconds once it has alerted), with an ERROR alert from the second read in a row that disagrees.
3. An ERROR alert reports each strategy once it is flat.

Only the account limit fires the kill switch. A difference between the session and OpenAlgo's books locks entries and alerts you, but never closes a position.

## The locks

A lock stops **new entries** (and adds to a position). Exits, stops and targets go on, except under the first two locks, which stop every order.

| Lock | When | What it stops | Until |
|---|---|---|---|
| Mode change | OpenAlgo's analyzer switch changes during the session, or its semi-auto mode is turned on | Every order of the session (entries, exits, stops, changes, cancels) and every read of the books | The session ends: Ctrl+C, or five minutes after the exchange's close |
| OpenAlgo not answering | An order call timed out or its connection dropped | Every order; the session asks OpenAlgo every 2 seconds while a stop or an exit waits, with an ERROR alert after 10 seconds | OpenAlgo answers again |
| Dead feed | No price for any instrument for 10 seconds while the market is open | New entries of every strategy; prices of open positions are read by quote every 2 seconds, so stops, targets and the daily loss stay watched | One whole minute of prices after the feed returns |
| Reconciliation | The session's position and OpenAlgo's books differ in two checks in a row | New entries of that strategy | The end of the session |
| Exit failed | A sale rejected five times ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#when-the-broker-rejects-an-exit)) | New entries of that strategy | The end of the session |
| Daily loss | The strategy's `max_daily_loss` | New entries of that strategy | The next day |
| Account daily loss | `account_max_daily_loss` | New entries of every strategy | The next day |
| Ctrl+C | The safe stop | New entries | The end of the session |

`result.locks` lists the locks of the session, each with when it was set and when it lifted. A session restarted the same day locks again what lasts the day (reconciliation, exit failed, the daily loss limits).

The output below comes from runs of the first lesson's script, with alerts on, against a simulated OpenAlgo server.

**A mode change.** The session started in sandbox mode with 10 SBIN bought; at 10:16 OpenAlgo's analyzer switch was turned off (live mode):

```text
MODE BREACH: OpenAlgo's analyzer switch changed during the session: it started in SANDBOX mode and LIVE mode was seen in the analyzerstatus poll at 2026-11-11 10:16 IST. Orders sent after the change (since the mode was last confirmed): none. The session sends nothing more. Start it again in the mode you want.
ERROR: OpenAlgo's mode changed: the session sends nothing more. Positions as last known: EmaCrossover SBIN NSE 10 units, stop 26111136724000 confirmed at the broker. The broker's MIS square-off closes what is left; stop the session with Ctrl+C
```

After the switch changes, every order would go to the other mode's book: a sale meant for the sandbox position would trade at your broker. So the session sends nothing at all, not even an exit. Press Ctrl+C; the positions stay as the alert lists them, with their stops. Put the switch back to see them in OpenAlgo, and start a new session in the mode you want.

**A dead feed.** At 10:16 OpenAlgo's price feed stopped for 40 seconds:

```text
FEED DEAD: no tick on any instrument for 10 s: entries are locked until the feed has ticked for a whole minute again; REST quotes of SBIN NSE every 2 s keep the targets and the daily loss watched
```

Check OpenAlgo's WebSocket server and your broker login. When prices flow again, the lock lifts by itself.

A single quiet symbol (an option that does not trade for a while) is not a dead feed **while another instrument of the session ticks**: its position is priced by quote, and nothing is locked. A session whose instruments are all options, such as one strategy on one bought option, has nothing else to tell a quiet market from a dead feed: 10 seconds without a price from the feed lock its entries and send its open positions to quotes, as above. Its start banner warns so:

```text
Warning: every instrument of the session is an option: a quiet market cannot be told from a dead feed, so a long quiet spell locks entries and asks for REST quotes
```

**A reconciliation mismatch.** At 10:16 another program sold the 10 SBIN the session held:

```text
RECONCILE MISMATCH: EmaCrossover SBIN NSE: the engine holds 10 units, OpenAlgo's books show 0; other orders 26111136960000: trades of other orders closed it at the broker: the engine takes them as its own and asks for a stop of the leg to be cancelled with them. Entries of the strategy are locked for the rest of the session
```

A fill of an order the session did not send (another program's, or yours by hand) on a symbol it trades makes it compare its books 3 seconds after OpenAlgo's order stream reports the fill, instead of at its next 30-second check: in this run the sale filled at 10:16:00, the first comparison, at 10:16:04, saw the difference, and the second, at 10:16:08, confirmed it. The session then found the sale in OpenAlgo's trade book, took it as closing its position, cancelled its own stop and locked the strategy's entries. It corrects only what can never add to a position: its own books, its own orders, its stop's quantity. It never trades to make the broker match it.

For those 8 seconds the stop at the broker still covered 10 shares that were already sold: had SBIN fallen to it, the stop would have sold them a second time, leaving you short, and so would an exit of the session sent before the first comparison (from it on, the session sends no exit for more shares than OpenAlgo's books show). That is why you never close a position by hand while a session runs ([Stopping a Session](02-stopping-a-session.md#never-close-or-change-a-position-by-hand-while-a-session-runs)).

## What you learned

* `capital` and `max_daily_loss` are required for every strategy; `account_max_daily_loss` limits all of them together and fires the kill switch.
* Several strategies run in one session as a list, one session per OpenAlgo account.
* Locks stop new entries; only a mode change and a silent OpenAlgo stop every order.
* A mismatch with OpenAlgo's books locks entries and alerts you; the session never trades to fix it.

## Next lesson

[Alerts](05-alerts.md): every alert on your phone through OpenAlgo's Telegram bot, and what each asks you to do.
