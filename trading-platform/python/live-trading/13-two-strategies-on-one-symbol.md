# Two Strategies on One Symbol

{% hint style="info" %}
**New in openalgo 2.4.0.** Two or more strategies of one session on one symbol need openalgo 2.4.0 or later: run `pip install -U openalgo`. Earlier versions refuse a second strategy on a symbol.
{% endhint %}

Two strategies of one session may trade the same symbol. Each keeps its own position and its own stop-loss at the broker, while your broker, and OpenAlgo, hold one **net position** for the symbol: the two strategies' shares added up. This lesson shows the rules that keep that safe: one side at a time, market orders only, each strategy's own stop, what happens when the broker refuses a closing order, and the one thing you must never do.

## The code

Two plainly different ideas on SBIN, on 1-minute bars: a trend follower (the EMA crossover of the first lesson) and a mean reversion strategy that buys after a sharp fall. The **RSI** (relative strength index, 0 to 100) falls after a run of falling bars; below 30 a stock is often called oversold.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The trend follower: buy when the 20-bar EMA crosses above the 50-bar EMA.
class EmaTrend(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1m"  # SBIN on NSE, 1-minute bars

    # init runs once, before the first bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, 20)  # 20-bar EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, 50)  # 50-bar EMA of the closes

    # on_bar runs at the close of every 1-minute bar.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(qty=10, stop=bt.pct(1))  # buy 10 shares, with a stop-loss 1 percent below
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares


# The mean reversion: buy after a sharp fall, take the profit on the recovery.
class RsiDip(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1m"  # the same symbol

    # init: the 14-bar RSI of the closes.
    def init(self):
        self.rsi = self.I(ta.rsi, self.close, 14)

    # on_bar: [-1] is the RSI of the bar that just closed.
    def on_bar(self, bar):
        if self.position.is_flat and self.rsi[-1] < 30:  # oversold
            # buy 10 shares, a stop-loss 1 percent below and a target 1 percent above
            self.buy(qty=10, stop=bt.pct(1), target=bt.pct(1))


# Trade both in one session: Rs 1,00,000 and a Rs 2,000 daily loss limit for each.
result = bt.live([EmaTrend, RsiDip], client, capital=100_000, max_daily_loss=2_000)

# Print the session's result in one line.
print(result)
```

Nothing in the classes is special: each is a strategy you could run alone. The session sees that both trade SBIN in MIS and treats them as a **shared symbol**.

## What the start banner says

From a run of this code against a simulated OpenAlgo server, the banner names the shared symbol and its strategies:

```text
SBIN (NSE, MIS): EmaTrend and RsiDip share one broker position; each holds its own stop; they trade one side at a time and with market orders only
Never trade a session's symbol by hand while it runs
```

SBIN is subscribed to once, and every price, bar and broker candle of it reaches both strategies. Read the last of these lines every time: never trade a shared symbol by hand while the session runs (below).

## Each strategy keeps its own position and stop

From the same run, in which SBIN fell sharply after 10:00 and then rose, with Ctrl+C at 10:35:

```text
ENTRY: RsiDip BUY 10 SBIN NSE at 811.95 (entry, order 26111136302000)
ENTRY: EmaTrend BUY 10 SBIN NSE at 818.90 (entry, order 26111137442000)
EXIT: RsiDip SELL 10 SBIN NSE at 820.10 (exit: target level, order 26111137558000)
EXIT: EmaTrend SELL 10 SBIN NSE at 825.50 (risk_exit: Ctrl+C or a retried exit, order 26111138104000)
```

In a session of several strategies, each ENTRY and EXIT line names the strategy whose order filled, right after the kind. To see every order of the session, the stops at the broker included, add this block below the script, in the same file:

<!-- requires-server -->
<!-- continues -->
```python
# Every order of the session in time order, with the strategy that placed it.
columns = ["created", "strategy", "purpose", "action", "price_type", "quantity", "trigger_price", "status"]
print(result.orders.sort_values("created")[columns].to_string(index=False))
```

From the same run:

```text
                  created strategy   purpose action price_type  quantity  trigger_price   status
2026-11-11 10:05:01+05:30   RsiDip     entry    BUY     MARKET        10           0.00   Filled
2026-11-11 10:05:03+05:30   RsiDip      stop   SELL       SL-M        10         803.85 Canceled
2026-11-11 10:24:01+05:30 EmaTrend     entry    BUY     MARKET        10           0.00   Filled
2026-11-11 10:24:03+05:30 EmaTrend      stop   SELL       SL-M        10         810.70 Canceled
2026-11-11 10:25:57+05:30   RsiDip      exit   SELL     MARKET        10           0.00   Filled
2026-11-11 10:35:03+05:30 EmaTrend risk_exit   SELL     MARKET        10           0.00   Filled
```

Read it as the day's story. RsiDip bought 10 SBIN at 10:05, on the fall, and EmaTrend 10 more at 10:24, when its EMAs crossed: for the next two minutes the two strategies held 20 shares between them, and OpenAlgo's position book showed one SBIN position of 20. At 10:25:57 SBIN reached RsiDip's target, and the session sold RsiDip's 10 (the EXIT line `exit: target level`); Ctrl+C at 10:35 sold EmaTrend's 10.

* Each buy is the strategy's own order, and each strategy got **its own stop-loss at the broker**, for its own shares: two SL-M sell orders for SBIN, one per strategy, each cancelled before its strategy's sale. Each strategy's trailing stop, target and daily loss limit act on its own position only.
* OpenAlgo's position book shows one SBIN position: both strategies' shares together. The session checks that the two strategies' shares add up to it, every 30 seconds and 3 seconds after each fill.
* `result.portfolio.net_positions` shows the net position over the day, as a backtest's portfolio result does ([Two strategies on one symbol](../backtesting/several-strategies.md#two-strategies-on-one-symbol)).

The daily summary has a Shared line for the symbol: OpenAlgo's net position at the last read of its books, the strategies' shares added up, and whether the two agree:

```text
DAILY SUMMARY: Session of 2026-11-11 (IST): SANDBOX mode, broker zerodha
Strategies  : EmaTrend (version f73003f78697), RsiDip (version dfee1b6b9cc1)
Trades      : 2 closed
Gross P&L   : Rs 147.50
Charges     : Rs 17.42 (modelled)
Net P&L     : Rs 130.08
Slippage    : Rs 6.00 better than the backtest (1 MARKET fill not compared: no bar of its decision)
Rejected    : 0 orders
Unprotected : 13 s without a stop at the broker
Reconcile   : 0 mismatches
Shared      : SBIN NSE (EmaTrend and RsiDip): OpenAlgo's net 0 by the last read, their sum 0: they agree
End state   : flat
SessionResult(SANDBOX 2026-11-11, broker zerodha, stopped by ctrl_c, 2 closed trades, net P&L Rs 130.08, 0 positions open)
```

`result.open_positions` also has a row for a shared symbol whose net OpenAlgo shows as a position at the end, named by its strategies ("EmaTrend and RsiDip"), with that net and whether it equals their sum.

## One side at a time

A broker nets a long and a short of one symbol into one smaller position, which would hide both strategies' positions from every check the session makes. So on a shared symbol, the strategies stay on one side:

* While one strategy holds SBIN long, or has a buy working, another strategy's entry that would make it short (a sell from flat, or a reversal) is refused with the reject code `group_other_side`. The same holds the other way round.
* The strategy sees the refusal in `on_order` ([Writing Strategies](../backtesting/writing-strategies.md#more-options)), and `result.warnings` says what to do: exit first, or trade the other side in its own session on another account.
* While another strategy's reversal is working, every entry of the other strategies on the symbol is refused (the lock `group_reversing`, seen in `on_order` as `live_lock`); nothing is queued to be sent later. It lifts once the reversal has filled or ended: decide again on a later bar.
* Exits are never refused.

A backtest of the same two strategies lets them hold opposite sides, with a warning that a live session would refuse the later entry ([Two strategies on one symbol](../backtesting/several-strategies.md#two-strategies-on-one-symbol)).

## Market orders only, on a shared symbol

On a shared symbol a strategy's own resting orders, LIMIT, SL and SL-M, whether to enter, add or exit, are refused with the reject code `shared_resting`. A resting order of one strategy could fill at any moment, so the session could never tell what the net position should be, and its checks against OpenAlgo's books could not run.

What still works, because the session or the broker holds it for the strategy:

* `stop=`, the stop-loss: placed at the broker by the session, for the strategy's shares.
* `target=` and `targets=`: watched by the session on every price, and sold at market when reached. This is the way to take a profit on a shared symbol, and the right way on any symbol (below).
* `trail=` and `breakeven=`: the session modifies the strategy's stop at the broker.
* `self.exit()` and `self.buy()` or `self.sell()` without a price: market orders.

A symbol traded by one strategy alone keeps every order type, as in the earlier lessons.

## Two rules for every live session

Two rules hold on every symbol, shared or not, and in sandbox and live mode alike. A backtest accepts both orders below; a live session does not:

* **`reverse=True` works live only on a MARKET order.** A reversal sent as a resting order (`reverse=True` with `price=` or `trigger_price=`) is refused before it reaches the broker, with the reject code `venue` and a warning. At the broker it would rest beside the position's stop, both on the closing side, and both could fill: a short of 10 with a resting buy of 20 could end long 20 instead of long 10. To reverse at a price, exit and enter separately.
* **A take-profit goes in `target=` (or `targets=`).** A resting LIMIT, SL or SL-M order on the closing side of an open position whose stop already closes it is refused live, with the reject code `venue` and a warning: the stop and that order could both fill and leave a position on the other side. With `target=`, the session cancels the stop first and only then sells, so the two can never both fill ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#targets-and-the-daily-loss-watched-on-every-price)).

## When the broker refuses a closing order

On a shared symbol, when the broker refuses a strategy's stop or exit, the session does not try again until a read of OpenAlgo's books agrees with the strategies. A broker that refuses to close shares (often with a margin message) may not hold the shares the strategy believes it holds: a sale by hand, or a difference the session has not seen yet. Sending the sale again, selling at market or placing the stop again could open a position on the other side. So the session:

1. holds the position: no market exit, no stop placed again and no retry;
2. locks that strategy's entries for the rest of the session (the lock `margin_on_close`; a restart does not keep it);
3. reads OpenAlgo's books at once, to compare the strategies' shares with the broker's;
4. sends one ERROR alert that names the position, the order, the broker's reason and whether a stop still works, and says what to do.

From a run of this code against a simulated OpenAlgo server in which the broker refused EmaTrend's sale at Ctrl+C with a margin message:

```text
ERROR: EmaTrend: the risk_exit order o3 of SBIN NSE was refused for margin by the broker (Insufficient margin: required 8,170.00, available 0.00); it has no stop working, and nothing is sent again for it until OpenAlgo's books agree with the strategies; EmaTrend's entries are locked. The broker may not hold these units: end the session, check the position book and close by hand
REJECT: EmaTrend: SELL 10 SBIN NSE (risk_exit) order refused by OpenAlgo: Insufficient margin: required 8,170.00, available 0.00 (intent 20261111-sandbox-1-EmaTrend-o3)
EXIT: EmaTrend SELL 10 SBIN NSE at 825.60 (risk_exit: Ctrl+C or a retried exit, order 26111138106000)
```

The ERROR line comes first: EmaTrend's position is held, it has no stop working (Ctrl+C had cancelled it to make way for the sale), and its entries are locked. The REJECT line is the refusal itself. In this run the broker did hold the 10 shares, so the next read of OpenAlgo's books agreed with the strategies, and only then did the session send the sale again; it filled (the EXIT line).

When it happens to you, do what the alert says: end the session (Ctrl+C, and a second Ctrl+C if it does not end) and wait until it has ended and printed its daily summary, since until then it may still send the held sale once a read agrees. Then check SBIN in OpenAlgo's position book, cancel any stop still named in the lines it printed for positions left open ([A second Ctrl+C](02-stopping-a-session.md#a-second-ctrlc)), and close what is left by hand. The session's own exits (the square-off, the kill switch, Ctrl+C) go again only after a book read agrees with the strategies, and your broker's MIS square-off near the close is the backstop. A symbol traded by one strategy alone keeps the rules of [Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#when-the-broker-rejects-an-exit): a refused exit is sent again after 1, 2, 5 and 10 seconds, five attempts in all.

## Never trade a shared symbol by hand

The rule of [Stopping a Session](02-stopping-a-session.md#never-close-or-change-a-position-by-hand-while-a-session-runs) matters even more here. A sale by hand of SBIN while the session runs changes the net position of two strategies at once, and the session has to decide whose shares you sold:

* When OpenAlgo's trade book shows the sale, the session shares it out among the strategies it closes, the most recently opened position first, cuts or cancels each one's stop to what it still holds, locks the entries of every strategy on the symbol and alerts you, naming the share each strategy took. Whose profit your sale lands in is decided by that rule, not by you.
* A difference no trade explains locks every strategy on the symbol and alerts you to end the session and close by hand. Nothing is sent to fix it.
* When OpenAlgo shows the symbol on the other side of the strategies (short while they are long, say), the session also cancels every strategy's stop on it, since a stop would only add to that position, and sends one ERROR alert for the symbol. Nothing then protects the position at the broker: end the session and close it by hand at once.
* Until the session has seen your sale, each strategy's stop is still at the broker for shares you no longer hold: a fall to it would sell them a second time.

To close a shared position yourself: end the session first, then cancel the stops its closing lines name, then close the position in OpenAlgo.

## What you learned

* Two strategies of one session may trade one symbol; each keeps its own position and its own stop at the broker, and OpenAlgo holds their sum.
* On a shared symbol the strategies stay on one side (`group_other_side`) and use market orders only (`shared_resting`); stops, targets and trailing stops still work.
* Live, `reverse=True` works only on a MARKET order, and a take-profit goes in `target=`, never in a resting order beside the stop.
* A refused closing order on a shared symbol holds the position and locks the strategy: end the session and close by hand.
* Never trade a session's symbol by hand while it runs.

## Back to the start

[Live Trading](README.md): every lesson of this section.
