# Limits

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`. The order rate limit and the daily limits are new in openalgo 2.4.0.
{% endhint %}

What to know before a live session: the OpenAlgo server you need, how fast the session sends orders, the limits you can set for the day, a limit of the exchange's that no setting avoids, and what openalgo cannot do yet.

## Your OpenAlgo server

**Use OpenAlgo 2.0.2.6 or later** ([released 23 September 2026](../../../change-log/release/version-2.0.2.6-released.md)). Older servers break a session in three ways:

* **A freeze quantity of 1.** From version 1.0.0.41 to 2.0.2.5, OpenAlgo's symbol details give a freeze quantity of 1 unit for every symbol it has no freeze figure for: every share on NSE and BSE, and every BFO, MCX and CDS contract. The session takes it as the exchange's limit (its banner shows `SBIN: freeze quantity 1`) and rejects every entry above one unit (`freeze_qty`): the first lesson's buy of 10 shares is never sent.
* **No freeze quantity.** Before 1.0.0.41, OpenAlgo gives none. For index futures and options (NIFTY, BANKNIFTY, SENSEX and the other indices) the session then uses the SDK's own table of freeze quantities, with a warning in its banner. For stock futures and options it knows no limit, so it cannot keep a position below the exchange's, and the stop or the exit of a larger position, each one order, is rejected by the exchange.
* **Telegram.** The builds from 23 September to 27 October 2025 (versions 1.0.0.33 to 1.0.0.35) answered every Telegram alert as sent without sending it. The session's test alert would then pass, and a live session would trade with no alert ever reaching your phone. [Version 1.0.0.36](../../../change-log/release/version-1.0.0.36-launched.md) (31 October 2025) was the first release with the fix.

OpenAlgo streams order updates (fills, rejections, cancellations) as they happen, for the brokers that send them. The session follows its orders on that stream. With a broker whose updates OpenAlgo does not stream, it reads each order's status instead, about once a second from 2 seconds after sending it, and confirms fills from the trade book: it learns of a fill a little later. Keep OpenAlgo up to date.

## The order rate

OpenAlgo accepts at most 10 order calls a second by default (placing, changing and cancelling orders counted together). A session sends at most `max_orders_per_second` of them in any second, 8 by default, leaving 2 for orders you place yourself on the same server, on symbols the session does not trade (never trade a session's symbol by hand while it runs: [Stopping a Session](02-stopping-a-session.md#never-close-or-change-a-position-by-hand-while-a-session-runs)):

* A call beyond the limit waits its turn. Stops and exits go first, then entries and adds.
* A call that has waited 2 seconds writes the event `order_throttled` and sends one alert per session start.
* An entry or add that has waited 5 seconds is not sent, with the reason `order_rate`; an exit is never dropped.
* An entry still waiting when its strategy's entries are locked, for any reason (a profit target, the kill switch, Ctrl+C, a dead feed, a reconciliation mismatch), is withdrawn, not placed.

Give a higher figure only when your OpenAlgo server is set to accept more: for a server set to 20 order calls a second, `bt.live(..., max_orders_per_second=18)`. The start banner's Order rate line shows the figure.

## Limits you set for the day

Besides the daily loss limit, each strategy can have a trade cap, a profit target and an order value cap, and the account a trade cap and a profit target. Each is off unless you set it:

| Setting | What it does | Refused with |
|---|---|---|
| `max_trades_per_day` | At most this many entries today for the strategy; nothing is exited | `trade_limit` |
| `daily_profit_target` | At this profit today the strategy exits and takes no new entries for the day | `daily_profit_gate` |
| `max_order_value` | An entry or add worth more is refused before it is sent; exits never are | `order_value_limit` |
| `account_max_trades_per_day` | At most this many entries today for all strategies together | `account_trade_limit` |
| `account_daily_profit_target` | At this profit today, together, the kill switch stops every strategy for the day | |

[Risk Limits and Locks](04-risk-limits-and-locks.md#daily-trade-and-profit-limits) shows them in a session, and [Several Strategies in One Session](12-several-strategies-in-one-session.md#the-accounts-limits-and-the-kill-switch) the account's.

## NSE stock options during a cooling-off

When a share hits its price band, NSE can put it in a **cooling-off** period. During it, NSE sets a floor under the sell orders of the share's options in the direction of the move (calls when the share falls, puts when it rises): a sell's limit price may not be more than 15 percent below the option's price when the cooling-off began (Rs 7.50 for an option priced up to Rs 50).

The session's stop on an option is a stop-limit order with its limit 5 percent below the trigger, and when it sells an option at a limit (a stop the price ran through, an exit after the stop) the limit is 5 percent below the price. For an option priced above Rs 50, once it has fallen about 10.5 percent from its price at the start of the cooling-off, those limits are under the floor: the exchange rejects the triggered stop and the session's limit sells alike. No setting avoids it. The session then follows its rules for rejected stops and exits ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#when-the-broker-rejects-a-stop)) and alerts you at each step, but no sale below the floor can go through until the cooling-off ends or the price is back above the floor. Index options have no such floor.

## What openalgo 2.4.0 does not do yet

* **Intraday MIS only.** No daily bars, no CNC or NRML positions held overnight, and the other strategies listed in [What openalgo 2.4.0 refuses](README.md#what-openalgo-240-refuses).
* **One order at a time per strategy and symbol.** While a strategy's order of a symbol is working (other than its resting stop), a new entry or add of that strategy on that symbol is rejected (reject code `live_in_flight`), and the strategy sees the rejection in `on_order`. A strategy that rests two limit entries on one symbol has the second rejected.
* **No position above the freeze quantity.** One stop order and one exit order must cover a position, and the exchange takes no single order above the instrument's freeze quantity, so an entry or add that would pass it is rejected (`freeze_qty`). The start banner shows each instrument's freeze quantity.
* **One session per OpenAlgo account.** Run all the strategies of an account in one `bt.live` call.
* **No watchdog.** If the program stops, nothing watches the targets, the trailing stop or the daily loss until you restart it; the stop at your broker protects the position meanwhile ([Restarts and Results](06-restarts-and-results.md#when-the-session-stops-unexpectedly)).
* **LIMIT fills are not compared with a backtest.** The daily summary's Slippage line sets each MARKET fill against the price a backtest fills the same order at ([Your First Sandbox Session](01-first-sandbox-session.md#stop-it-with-ctrlc)), and its Stop fills line each fill of a stop at the broker against its trigger ([Audit a Session](10-audit-a-session.md#live-fills-against-a-backtest-of-the-same-bars)). LIMIT orders are not compared, and a fill with no bar to compare it with (a Ctrl+C sale before the next minute's first trade) is counted as not compared.
* **The computer's clock.** Bars are cut by your computer's clock. Through some brokers' feeds (zerodha's among them) the session cannot compare that clock with the exchange's, and the banner warns so: keep the clock synchronised with internet time.
* **fivepaisa** cannot be used for live trading: its trade book names each trade by an order number its orders do not carry, so a fill cannot be matched to its order. The session's checks refuse it.
* **pocketful and mstock** can be used, with a warning. The session matches each trade in the trade book to its order by the order number, and that their trade books carry the same numbers as their orders has not been checked yet. The start banner (and `result.warnings`) says so; from a run against a simulated OpenAlgo server logged in to pocketful:

```text
Warning: bt.live trades through pocketful, but the session matches the trade book's trades to its orders by order ID, and that the two IDs agree has not been checked for pocketful: watch the RECONCILE alerts, which name a fill the session could not match to its order
```

* **Unchecked candle times.** The SDK has checked how only some brokers (zerodha among them) stamp the time of their one-minute candles. With the others, pocketful and mstock included, the banner also warns `the timestamp convention of broker 'pocketful' is not verified in the broker table; this series passed the session calendar check`. It means the session compared the candles' times with the trading calendar (the market's hours, Indian time) and found them in place, so it goes on: there is nothing to do.
* **No replay of recorded ticks yet.** `bt.record` saves them and `bt.read_ticks` reads a day back as a table ([Recording Ticks](07-recording-ticks.md#read-the-ticks-back)), but openalgo cannot yet run a backtest or a session on them.

## What you learned

* Use OpenAlgo 2.0.2.6 or later: older servers give the session a wrong freeze quantity, or none.
* Stock options in a cooling-off can refuse every sale below a floor: the session cannot avoid it.
* A session sends at most 8 order calls a second by default (`max_orders_per_second`), stops and exits first.
* A trade cap, a profit target and an order value cap limit a strategy's day; the account has its own trade cap and profit target.
* A live session trades intraday MIS, one order at a time per symbol, below the freeze quantity, one session per account.

## Next lesson

[Inside a Session](09-inside-a-session.md): when the strategy decides and the protection acts, why nothing repaints, and how the session handles its orders, from a real sandbox session.
