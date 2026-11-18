# Limits

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

What to know before a live session: the OpenAlgo server you need, a limit of the exchange's that no setting avoids, and what openalgo 2.3.0 cannot do yet.

## Your OpenAlgo server

**Use OpenAlgo 2.0.2.6 or later** ([released 23 September 2026](../../../change-log/release/version-2.0.2.6-released.md)). Older servers break a session in three ways:

* **A freeze quantity of 1.** From version 1.0.0.41 to 2.0.2.5, OpenAlgo's symbol details give a freeze quantity of 1 unit for every symbol it has no freeze figure for: every share on NSE and BSE, and every BFO, MCX and CDS contract. The session takes it as the exchange's limit (its banner shows `SBIN: freeze quantity 1`) and rejects every entry above one unit (`freeze_qty`): the first lesson's buy of 10 shares is never sent.
* **No freeze quantity.** Before 1.0.0.41, OpenAlgo gives none. For index futures and options (NIFTY, BANKNIFTY, SENSEX and the other indices) the session then uses the SDK's own table of freeze quantities, with a warning in its banner. For stock futures and options it knows no limit, so it cannot keep a position below the exchange's, and the stop or the exit of a larger position, each one order, is rejected by the exchange.
* **Telegram.** The builds from 23 September to 27 October 2025 (versions 1.0.0.33 to 1.0.0.35) answered every Telegram alert as sent without sending it. The session's test alert would then pass, and a live session would trade with no alert ever reaching your phone. [Version 1.0.0.36](../../../change-log/release/version-1.0.0.36-launched.md) (31 October 2025) was the first release with the fix.

OpenAlgo streams order updates (fills, rejections, cancellations) as they happen, for the brokers that send them. The session follows its orders on that stream. With a broker whose updates OpenAlgo does not stream, it reads each order's status instead, about once a second from 2 seconds after sending it, and confirms fills from the trade book: it learns of a fill a little later. Keep OpenAlgo up to date.

## NSE stock options during a cooling-off

When a share hits its price band, NSE can put it in a **cooling-off** period. During it, NSE sets a floor under the sell orders of the share's options in the direction of the move (calls when the share falls, puts when it rises): a sell's limit price may not be more than 15 percent below the option's price when the cooling-off began (Rs 7.50 for an option priced up to Rs 50).

The session's stop on an option is a stop-limit order with its limit 5 percent below the trigger, and when it sells an option at a limit (a stop the price ran through, an exit after the stop) the limit is 5 percent below the price. For an option priced above Rs 50, once it has fallen about 10.5 percent from its price at the start of the cooling-off, those limits are under the floor: the exchange rejects the triggered stop and the session's limit sells alike. No setting avoids it. The session then follows its rules for rejected stops and exits ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#when-the-broker-rejects-a-stop)) and alerts you at each step, but no sale below the floor can go through until the cooling-off ends or the price is back above the floor. Index options have no such floor.

## What openalgo 2.3.0 does not do yet

* **Intraday MIS only.** No daily bars, no CNC or NRML positions held overnight, and the other strategies listed in [What openalgo 2.3.0 refuses](README.md#what-openalgo-230-refuses).
* **One order at a time per symbol.** While an order of a symbol is working (other than its resting stop), a new entry or add on that symbol is rejected (reject code `live_in_flight`), and the strategy sees the rejection in `on_order`. A strategy that rests two limit entries on one symbol has the second rejected.
* **No position above the freeze quantity.** One stop order and one exit order must cover a position, and the exchange takes no single order above the instrument's freeze quantity, so an entry or add that would pass it is rejected (`freeze_qty`). The start banner shows each instrument's freeze quantity.
* **One session per OpenAlgo account.** Run all the strategies of an account in one `bt.live` call.
* **No watchdog.** If the program stops, nothing watches the targets, the trailing stop or the daily loss until you restart it; the stop at your broker protects the position meanwhile ([Restarts and Results](06-restarts-and-results.md#when-the-session-stops-unexpectedly)).
* **Slippage is not measured.** The daily summary's Slippage line reads `n/a`.
* **The computer's clock.** Bars are cut by your computer's clock. Through some brokers' feeds (zerodha's among them) the session cannot compare that clock with the exchange's, and the banner warns so: keep the clock synchronised with internet time.
* **fivepaisa** cannot be used for live trading: its trade book names each trade by an order number its orders do not carry, so a fill cannot be matched to its order. The session's checks refuse it.
* **No public replay of recorded ticks.** `bt.record` saves them; 2.3.0 has no public function to read them back.

## What you learned

* Use OpenAlgo 2.0.2.6 or later: older servers give the session a wrong freeze quantity, or none.
* Stock options in a cooling-off can refuse every sale below a floor: the session cannot avoid it.
* A live session trades intraday MIS, one order at a time per symbol, below the freeze quantity, one session per account.
