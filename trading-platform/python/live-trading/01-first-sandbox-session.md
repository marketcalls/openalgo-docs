# Your First Sandbox Session

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

In this lesson you run the EMA crossover of the [backtesting tutorial](../backtesting/tutorial/01-first-backtest.md) on today's prices, in **sandbox mode**: OpenAlgo simulates every order at real market prices, and nothing reaches your broker. You start the session, watch it trade, stop it with Ctrl+C and read the result.

## Before you start

1. **Turn sandbox mode on in OpenAlgo.** Sandbox mode is OpenAlgo's analyzer mode: use the mode control in OpenAlgo ([API Analyzer](../../../new-features/api-analyzer.md)). Your code never chooses the mode; the session reads it when it starts.
2. **Log OpenAlgo in to your broker.** Even in sandbox mode the prices come from your broker.
3. **Run it on a trading day, before 15:30 IST.** Started before 09:15, the session waits for the market to open. Started after 14:50, it takes no new entries and only manages and closes what it holds. After the close it does not start.

## The strategy

The strategy is lesson 1's EMA crossover with three changes:

* `interval = "1m"`: one-minute bars. Intraday bars make it an **MIS** (intraday) strategy, the only product a live session trades: every position is closed the same day.
* `qty=10`: a fixed 10 shares. Start small, even in sandbox mode.
* `stop=bt.pct(1)`: a stop-loss 1 percent below the buying price. A **stop-loss** is an order that sells if the price falls to a set level. In a live session your broker holds it as a real order ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md)).

Backtest it on one-minute bars first, for example `bt.backtest(EmaCrossover, client, start="2026-11-02", end="2026-11-11", capital=100_000)`, to see how often it trades.

## The code

Copy the code into a file such as `first_session.py`, put your API key (from the API Key page of your OpenAlgo dashboard) in place of `OPENALGO_API_KEY`, and run `python first_session.py` from a terminal while the market is open.

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

The class is exactly what you would backtest. Only the last lines differ: `bt.live` instead of `bt.backtest`, with no dates (a session trades today) and two required limits:

* `capital=100_000`: the rupees set aside for this strategy. A plain `self.buy()` sizes from it, never above the cash your account has.
* `max_daily_loss=2_000`: the most this strategy may lose today, in rupees. At that loss the session closes its positions and takes no new entries for the rest of the day.

Both are risk limits, not a mode choice: the session asks for them in sandbox and live mode alike.

## What you see when it starts

The output on this page comes from a run of this code against a simulated OpenAlgo server, on 11 November 2026. Your prices, times and order numbers will differ, and so will the broker's name, which is the one your OpenAlgo is logged in to.

The session first checks everything it needs (the API key, the broker login, funds, SBIN's details, the trading day), then prints its **start banner**:

```text
OpenAlgo is in SANDBOX mode: orders are simulated
Funds available: Rs 10,000,000.00
EmaCrossover: NSE:SBIN every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 14:50 IST, square-off 15:00 IST
SBIN: freeze quantity none
Stops: an entry placed with stop= gets its stop at the broker as it fills; one placed without has none until a trail or breakeven sets one (allowed), and the session warns at the first such position
Charges modelled with: zerodha
SANDBOX: OpenAlgo simulates the fills at its own prices; nothing reaches the broker
Warning: the test alert was not delivered: this SANDBOX session runs without alerts, and a LIVE session will need them
Warning: the clock against the exchange cannot be checked through zerodha's feed (its last trade time is the OpenAlgo server's own clock): keep this computer's clock synchronised
Starting in 10 seconds. Press Ctrl+C to stop.
Starting in 9 seconds. Press Ctrl+C to stop.
Starting in 8 seconds. Press Ctrl+C to stop.
Starting in 7 seconds. Press Ctrl+C to stop.
Starting in 6 seconds. Press Ctrl+C to stop.
Starting in 5 seconds. Press Ctrl+C to stop.
Starting in 4 seconds. Press Ctrl+C to stop.
Starting in 3 seconds. Press Ctrl+C to stop.
Starting in 2 seconds. Press Ctrl+C to stop.
Starting in 1 second. Press Ctrl+C to stop.
```

Read it line by line:

* **The first line is the mode.** Check it every time. `SANDBOX` means simulated orders. In live mode it reads `OpenAlgo is in LIVE mode: orders go to` and your broker's name.
* **Funds available**: the cash OpenAlgo reports. In sandbox mode it is the sandbox's own funds, not your broker account's.
* **The strategy line**: the symbol and bar interval, the capital and daily loss limit, and the MIS times: no new entries from 14:50, and the **square-off** (the forced close of every MIS position) at 15:00.
* **Freeze quantity**: the largest single order the exchange takes for the symbol. A session never lets a position grow past it.
* **Stops**: the rule for stop-losses: an entry with `stop=` gets its stop at the broker as soon as it fills.
* **Charges modelled with**: the cost model for brokerage and taxes (`costs="zerodha"` by default, as in a backtest), because the broker's trade book does not report charges. OpenAlgo's sandbox charges nothing, so the modelled charges show what a live trade would pay.
* **Warning: the test alert was not delivered**: the call gave no Telegram user, so alerts appear only on this screen. Fine in sandbox mode; a live session needs them ([Alerts](05-alerts.md)).
* **Warning: the clock ...**: with some brokers the session cannot compare your computer's clock with the exchange's. Bars are cut by your computer's clock, so keep it synchronised with internet time.
* **The countdown**: 10 seconds to stop before anything is sent. Ctrl+C now ends the session with no order placed.

## While it runs

At the close of every minute the session builds the bar from the live prices and calls `on_bar`. Each order that fills prints a line. In this run the EMAs crossed at 10:12 and the strategy bought:

```text
ENTRY: BUY 10 SBIN NSE at 817.55 (entry, order 26111136722000)
```

As the buy filled, the session placed the stop-loss at the broker: an SL-M sell order for the 10 shares, triggered at 809.35, 1 percent below the buying price. The screen shows only fills, alerts and warnings; the session's full log is in a file ([Restarts and Results](06-restarts-and-results.md#where-the-session-keeps-its-files)).

Keep the terminal open while the session runs, and stop it with Ctrl+C. Closing the window or shutting the computer down can end the program before its safe stop has finished; the stop-loss at your broker still protects an open position ([Restarts and Results](06-restarts-and-results.md)).

## Stop it with Ctrl+C

At 10:20 Ctrl+C was pressed once. The session took no new entries, cancelled the stop at the broker, sold the 10 shares at market, waited until the position was closed, then printed the **daily summary** and returned the result:

```text
EXIT: SELL 10 SBIN NSE at 818.75 (risk_exit, order 26111137204000)
DAILY SUMMARY: Session of 2026-11-11 (IST): SANDBOX mode, broker zerodha
Strategies  : EmaCrossover
Trades      : 1 closed
Gross P&L   : Rs 12.00
Charges     : Rs 8.70 (modelled)
Net P&L     : Rs 3.30
Slippage    : n/a (no backtest to compare with)
Rejected    : 0 orders
Unprotected : 7 s without a stop at the broker
Reconcile   : 0 mismatches
End state   : flat
SessionResult(SANDBOX 2026-11-11, broker zerodha, stopped by ctrl_c, 1 closed trades, net P&L Rs 3.30, 0 positions open)
```

* **EXIT**: the sale. `risk_exit` marks an exit the session made by itself, here for Ctrl+C; a sale your strategy asks for with `self.exit()` reads `exit`.
* **Trades**: round trips closed today (a buy and the sale that closed it).
* **Gross P&L, Charges, Net P&L**: the profit before charges, the modelled charges, and what is left. The sale earned Rs 12.00 (10 shares, Rs 1.20 each); the charges took Rs 8.70.
* **Slippage**: not measured in 2.3.0.
* **Rejected**: orders the broker or OpenAlgo refused.
* **Unprotected**: the seconds a position had no confirmed stop at the broker: here from the buy's fill until the broker confirmed the stop, and from the stop's cancel until the sale filled. A few seconds per trade is normal.
* **Reconcile**: how often the session's position disagreed with OpenAlgo's books ([Risk Limits and Locks](04-risk-limits-and-locks.md#the-locks)).
* **End state**: `flat` means no position was left open.
* The last line is `print(result)`: the mode, the day, how the session stopped (`ctrl_c`), the trades, the net P&L and the positions left open.

## If you let it run

Left alone, the session trades until the end of the day. From 14:50 it takes no new entries; at 15:00 it squares off: it cancels the stop and sells at market. Once everything is closed it prints the daily summary and ends by itself, and `result.stopped_by` is `"session_end"`.

## More options

* Leave open positions with their stops at Ctrl+C: `on_stop="keep"`. See [Stopping a Session](02-stopping-a-session.md).
* Alerts on your phone: `alerts_to="your_openalgo_username"`. See [Alerts](05-alerts.md).
* A trailing stop: `self.buy(qty=10, stop=bt.pct(1), trail=bt.trail_pct(0.5))`. See [Stop-Loss at the Broker](03-stop-loss-at-the-broker.md).
* Several strategies in one session, and a loss limit for all of them: see [Risk Limits and Locks](04-risk-limits-and-locks.md).

## What you learned

* `bt.live` runs the same strategy class as `bt.backtest`, on today's one-minute bars, as an MIS strategy.
* Sandbox or live is OpenAlgo's analyzer switch: the first line of the banner tells you which.
* `capital` and `max_daily_loss` are required; `qty=` and `stop=` keep the first sessions small and protected.
* Ctrl+C stops the session safely: no new entries, open positions sold, then the daily summary.

## Next lesson

[Stopping a Session](02-stopping-a-session.md): what Ctrl+C does with open positions, and why you never close one by hand while a session runs.
