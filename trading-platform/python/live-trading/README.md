# Live Trading

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

## What is live trading?

You wrote a strategy and backtested it on past prices. Live trading runs **the same strategy class** on today's prices, through your OpenAlgo server: OpenAlgo's live price feed builds a new bar every minute, your `on_bar` decides at each bar's close, and the orders go through OpenAlgo. Where a backtest is `bt.backtest(EmaCrossover, client, ...)`, a live session is one call, `bt.live(EmaCrossover, client, capital=100_000, max_daily_loss=2_000)`.

A **session** is one run of `bt.live`. It trades until the end of the trading day, or until you press **Ctrl+C**, and then returns a result: the trades, the day's profit or loss, and what happened along the way.

## Sandbox first

OpenAlgo has two modes, chosen by its **analyzer switch**:

* **Sandbox mode** (analyzer mode): OpenAlgo simulates every order at real market prices. Nothing reaches your broker and no money moves. Always start here.
* **Live mode**: the orders go to your broker and trade with your money.

Your code never chooses the mode. The session reads the analyzer switch when it starts, prints the mode on the first line of its start banner (`OpenAlgo is in SANDBOX mode: orders are simulated`), and never changes the switch. `bt.live` has no `mode=` or `confirm=` argument: passing one is refused before anything is sent. To trade live, you turn the switch off inside OpenAlgo and start the session again; see [API Analyzer](../../../new-features/api-analyzer.md) for the switch.

If someone changes the switch while a session runs, the session sends nothing more and alerts you ([Risk Limits and Locks](04-risk-limits-and-locks.md#the-locks)).

Run a strategy in sandbox mode for several days, compare what it did with its backtest, and only then think about live mode.

## What you need

1. **A running OpenAlgo server**, version 1.0.0.36 or later, logged in to your broker ([Limits](08-limits.md#your-openalgo-server) says why that version). See [Getting Started](../../../getting-started/README.md) to install it.
2. **Your API key**, from the API Key page of your OpenAlgo dashboard. The code on these pages writes `OPENALGO_API_KEY` where your key goes.
3. **Python 3.12 or newer, and openalgo 2.3.0:**

```bash
pip install -U openalgo
```

4. **For live mode, alerts on your phone**: OpenAlgo's Telegram bot, linked to your OpenAlgo user ([Alerts](05-alerts.md)). A live session does not start without them.

## What openalgo 2.3.0 runs live

* A `bt.Strategy` class that decides in `on_bar`, as in a backtest, on one symbol (`symbol` and `exchange` in the class). Several strategies can run in one session, as a list, each on its own symbol.
* **Intraday only**: bars of a minute or more within the day (`"1m"`, `"5m"`, `"15m"`), built from OpenAlgo's live price feed, and the **MIS** product. MIS is the intraday product: every MIS position is closed the same day. The session stops new entries and closes what is open at the exchange's MIS times (for NSE stocks, no new entries from 14:50 and the **square-off**, the forced close, at 15:00).
* Stocks, a futures contract named by its symbol (such as `NIFTY23NOV26FUT` on NFO), and bought options.
* A stop-loss (`stop=`), targets (`target=`, `targets=`), a trailing stop (`trail=`) and a breakeven stop (`breakeven=`). The stop-loss is held by your broker as a real order ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md)).
* The risk settings of a backtest: `max_daily_loss` (required), `drawdown_halt`, `cooldown`, `max_positions`, `entry_from`, `entry_until`, `square_off`, plus `account_max_daily_loss` for all strategies together ([Risk Limits and Locks](04-risk-limits-and-locks.md)).

## What openalgo 2.3.0 refuses

These raise `NotImplementedError` before anything is sent to OpenAlgo, with a message that says what to do instead:

* Daily or longer bars, and the CNC and NRML products (a position held overnight needs GTT orders, which the live session does not place yet).
* Condition strategies (`entry_when`, `exit_when`, `short_when`, `cover_when`): write the rules in `on_bar`.
* `bt.from_signals` and `bt.from_arrays` strategies.
* A strategy on several symbols (`symbols=`) or a `universe`, and a futures series (`underlying` with `expiry`): name the contract as the symbol instead.
* Two strategies on one symbol, or two strategy classes with the same name, in one session.
* `bars="candles"` (bars from your broker's candles instead of the live feed).

For example, the daily EMA crossover of the backtesting tutorial (`interval = "D"`) is refused with:

```text
NotImplementedError: a D strategy interval in a live session is not supported in this version: trade an intraday interval, such as '5m'
```

Arguments of `bt.backtest` that mean nothing live (`data`, `start`, `end`, `slippage`, `margin`, `product`, `quantity_mode` and the rest) raise `ConfigError` naming why: the session trades today, on your broker's prices, whole shares and lots, MIS. Selling an option to open a short position is not supported, as in a backtest.

## The lessons

1. [Your First Sandbox Session](01-first-sandbox-session.md): the EMA crossover on SBIN, one-minute bars, in sandbox mode: the call, the start banner, Ctrl+C and the result.
2. [Stopping a Session](02-stopping-a-session.md): what Ctrl+C does, `on_stop="flatten"` or `"keep"`, a second Ctrl+C, and why you never close a position by hand while a session runs.
3. [Stop-Loss at the Broker](03-stop-loss-at-the-broker.md): the stop your broker holds, trailing it, targets, and what happens when an order is rejected.
4. [Risk Limits and Locks](04-risk-limits-and-locks.md): capital, the daily loss limits, the kill switch, and the locks that stop new entries.
5. [Alerts](05-alerts.md): every alert on your phone through OpenAlgo's Telegram bot, and what each asks you to do.
6. [Restarts and Results](06-restarts-and-results.md): a crash and a restart on the same day, and everything in the result.
7. [Recording Ticks](07-recording-ticks.md): keep the live prices with `bt.record`.
8. [Limits](08-limits.md): the OpenAlgo server version you need, and what 2.3.0 cannot do yet.
