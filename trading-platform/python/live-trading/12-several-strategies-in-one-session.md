# Several Strategies in One Session

{% hint style="info" %}
**New in openalgo 2.4.0.** Every per-strategy setting by name, the daily trade and profit limits, the account's trade cap and profit target, and `SessionResult.portfolio` need openalgo 2.4.0 or later: run `pip install -U openalgo`.
{% endhint %}

One session runs every strategy of one OpenAlgo account: you pass the strategies as a list, and the session trades them together, with one connection to OpenAlgo, one order queue and one set of limits for the account. This lesson gives each strategy its own settings by name, sets the account's daily limits, shows what the **kill switch** does when one of them is reached, and reads the strategies' day as one account.

## The code

Two strategies: the first lesson's EMA crossover on SBIN, and the same crossover on INFY. Each setting can be one value for every strategy, or a dict that names each strategy by its class name:

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


# Trade both in one session. A dict gives each strategy its own value, by class name;
# a single value applies to every strategy.
result = bt.live(
    [EmaCrossover, InfyCrossover],
    client,
    capital={"EmaCrossover": 100_000, "InfyCrossover": 50_000},  # rupees set aside for each
    max_daily_loss={"EmaCrossover": 2_000, "InfyCrossover": 1_000},  # each one's daily loss limit
    max_trades_per_day=5,  # at most 5 entries a day, for each strategy
    entry_until={"EmaCrossover": "14:30", "InfyCrossover": "14:00"},  # each one's last entry time
    account_max_daily_loss=2_500,  # the most both together may lose today
    account_daily_profit_target=4_000,  # stop both for the day at this profit together
    account_max_trades_per_day=8,  # at most 8 entries a day, both together
)

# Print the session's result in one line.
print(result)
```

The settings that take a dict by class name: `capital`, `max_daily_loss`, `params`, `after_risk_exit`, `max_positions`, `drawdown_halt`, `cooldown`, `entry_from`, `entry_until`, `square_off`, `max_trades_per_day`, `daily_profit_target` and `max_order_value`. A dict must name every strategy of the session and no other: a name missing or misspelt stops the call before anything is sent, with a `ConfigError` that names it. A class attribute of the same name, such as `entry_until = "14:30"` in the class, still wins over the argument. `params` alone may leave a strategy out, which then keeps its own settings.

The `account_` settings are for all the strategies together. [Risk Limits and Locks](04-risk-limits-and-locks.md) explains each strategy's own limits.

## The start banner

From a run of this code against a simulated OpenAlgo server, the banner names each strategy with its own settings, then the account's:

```text
EmaCrossover: NSE:SBIN every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 14:30 IST, square-off 15:00 IST
EmaCrossover daily limits: at most 5 trades a day
SBIN: freeze quantity none
InfyCrossover: NSE:INFY every 1m, capital Rs 50,000.00, daily loss limit Rs 1,000.00, entries until 14:00 IST, square-off 15:00 IST
InfyCrossover daily limits: at most 5 trades a day
INFY: freeze quantity none
Versions: EmaCrossover eb5c92ff0caa, InfyCrossover 80a539947c70
Stops: an entry placed with stop= gets its stop at the broker as it fills; one placed without has none until a trail or breakeven sets one (allowed), and the session warns at the first such position
Account daily loss limit: Rs 2,500.00
Account trade cap: 8 trades a day
Account daily profit target: Rs 4,000.00
Order rate: at most 8 order calls a second (place, modify and cancel together); stops and exits go first
```

* Each strategy has its line, with its own capital, daily loss limit and last entry time, then a line of its daily limits (`at most 5 trades a day`), and each symbol's freeze quantity.
* **Versions**: each strategy's version id, the record of exactly what code and settings placed its orders ([Audit a Session](10-audit-a-session.md#the-strategy-version-on-every-order)).
* **Account daily loss limit**, **Account trade cap** and **Account daily profit target**: the limits for both strategies together.
* **Order rate**: the most order calls the session makes in any second ([Limits](08-limits.md#the-order-rate)).

## The account's limits and the kill switch

The account has three limits of its own, each off unless you set it:

| Setting | When it is reached | What the session does |
|---|---|---|
| `account_max_daily_loss` | The loss of all the strategies today, together, reaches it | Fires the kill switch |
| `account_daily_profit_target` | Their profit today, together, reaches it | Fires the kill switch |
| `account_max_trades_per_day` | Their entries today, together, reach it | Refuses every further entry (`account_trade_limit`); nothing is closed |

The day's loss or profit is the strategies' trades closed today plus their open positions, before charges, checked on every price from the live feed. The **kill switch** stops the whole account for the day:

1. New entries of every strategy are locked for the rest of the day, and entry orders still waiting are cancelled.
2. Each position is closed through its exit (its stop at the broker cancelled first), once OpenAlgo's position book shows the broker holding the strategy's shares. If it shows fewer, the session sends nothing and reads the book again, with an ERROR alert.
3. An ERROR alert reports each strategy once it is flat.

The trades it closes record the exit reason `account_loss_limit` or `account_profit_target`, as a backtest records them. A restart the same day keeps the locks and the day's trade counts: the account stays stopped.

From a run of this code against a simulated OpenAlgo server in which SBIN rose fast after the buy, and the account's profit target was set to Rs 100 so that it fired within minutes:

```text
ENTRY: EmaCrossover BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
ERROR: the account's daily profit Rs 101.00 is at or past its target Rs 100.00: every strategy's entries are locked for the day and the kill switch exits every strategy's position
ERROR: kill switch (account_profit): InfyCrossover is flat in INFY NSE, flat at the broker too; its entries stay locked for the day
EXIT: EmaCrossover SELL 10 SBIN NSE at 827.65 (risk_exit: kill switch at the account daily profit target, order 26111137379000)
ERROR: kill switch (account_profit): EmaCrossover is flat in SBIN NSE, flat at the broker too; its entries stay locked for the day
```

* The first ERROR: the strategies' profit of the day together reached the target, so every strategy's entries are locked and the kill switch exits every position.
* InfyCrossover held nothing: it was flat at once, and its ERROR line says so.
* EmaCrossover's stop at the broker was cancelled and its 10 shares sold. The EXIT line names why: the kill switch at the account's daily profit target. Its last ERROR line confirms it flat.

A strategy's own `max_daily_loss` or `daily_profit_target` acts on that strategy alone, in the same way (exit, then no new entries for the day), without the kill switch.

## The strategies as one account: `result.portfolio`

`result.portfolio` is the session's strategies as one account, a portfolio result like the one a backtest of [several strategies](../backtesting/several-strategies.md) gives. This block continues the script: add it below, in the same file.

<!-- requires-server -->
<!-- continues -->
```python
# The session's strategies as one account: the summary of both together.
pf = result.portfolio
print(pf.summary())

# Each strategy's part in the account's profit, and the account's report.
print(pf.contribution[["net_pnl_rupees", "share_pct"]].round(2))
print(pf.tearsheet("session.html"))
```

From the same run as the banner, with Ctrl+C at 10:20:

```text
Net profit   : Rs 3.59
Return       : 0.00%
Max drawdown : 0.00%
Trades       : 1 (100% won)
Overfitting  : each strategy's own trades below; none of the account's trades together
  EmaCrossover  : too few trades to judge (1 closed, 30 needed)
  InfyCrossover : too few trades to judge (0 closed, 30 needed)
               net_pnl_rupees  share_pct
strategy
EmaCrossover             3.59      100.0
InfyCrossover            0.00        0.0
session.html
```

* `pf.summary()`, `pf.metrics` and `pf.tearsheet()` measure the account on the sum of the strategies' capitals, Rs 1,50,000 here, so a profit of a few rupees reads as a return of 0.00%. The tearsheet is the combined page of [several strategies](../backtesting/several-strategies.md#the-combined-tearsheet).
* `pf.strategy("InfyCrossover")` is that strategy's own `Result`, the same as `result.results["InfyCrossover"]`.
* `pf.refused` lists the entries the account's trade cap refused (`account_trade_limit`). An entry locked out after the kill switch fired is in that strategy's orders with the code `live_lock`, and `result.locks` names the lock.
* `pf.net_positions` shows the net position of a symbol two strategies share ([Two Strategies on One Symbol](13-two-strategies-on-one-symbol.md)).

Like `result.results`, the portfolio covers this start of the session only: after a restart it begins at the restart. The day's figures across every start are in `result.summary` and the daily summary. The account's margin and free cash in it are the engines' own model, not your broker's figures; its assumptions say so, and name the funds OpenAlgo reported at the start.

## What you learned

* One session runs every strategy of an account, as a list; one per OpenAlgo account.
* Every per-strategy setting takes one value for all, or a dict by class name that names every strategy.
* The account's daily loss limit and profit target fire the kill switch: every strategy exits and stops for the day. The account's trade cap only refuses new entries.
* `result.portfolio` reads the strategies' day as one account, with the combined tearsheet.

## Next lesson

[Two Strategies on One Symbol](13-two-strategies-on-one-symbol.md): two strategies of one session on SBIN, and the rules that keep their positions and stops safe at the broker.
