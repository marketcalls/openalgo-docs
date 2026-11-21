# Inside a Session

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
{% endhint %}

This lesson looks inside a running session: when your strategy decides and when the protection acts, why a decision is never redrawn, why the bars are built from live prices, how the session hears about its orders, how it exits, and how it trails a stop.

The examples are real. They come from a sandbox session on MCX on 19 November 2026, run through an OpenAlgo server in sandbox mode with three strategies, one lot each:

* **CrudeFast**: the EMA 3 and EMA 5 crossover on crude oil mini (`CRUDEOILM18DEC26FUT`, 10 barrels a lot), 1-minute bars, a stop-loss 0.5 percent below the buying price.
* **CrudeBigTrend**: the EMA 9 and EMA 21 crossover on crude oil (`CRUDEOIL18DEC26FUT`, 100 barrels a lot), 1-minute bars, a stop-loss 0.5 percent below that trails 0.5 percent below the highest price.
* **GoldBreakout**: gold mini (`GOLDM04DEC26FUT`), 5-minute bars: buy when a bar closes above the highest high of the 12 bars before it, with a stop-loss and a target.

Times are Indian time (IST) to the millisecond, from the session's own log and event stream ([where the session keeps its files](06-restarts-and-results.md#where-the-session-keeps-its-files)). [Commodities on MCX](11-commodities-on-mcx.md) shows the code of the first session that evening.

## When things happen

A session runs on two clocks:

* **Decisions at the bar's close.** A 1-minute bar covers one whole minute, such as 17:22:00 to 17:23:00. The session waits one more second for prices still on their way (the **close grace**), closes the bar at 17:23:01 and runs `on_bar` at once. An entry or an exit your strategy asks for goes to OpenAlgo in that same moment: a plain `self.buy()` or `self.exit()` as a market order. A 5-minute strategy decides at 17:25:01, 17:30:01, and so on.
* **Protection within the bar, on every price.** The stop-loss is an order resting at your broker from the moment the entry fills: SL-M for futures and stocks, a stop-limit for NFO and BFO options ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md)). Targets, the trailing stop, breakeven and the daily loss limits are checked by the session on every price from the live feed, between the bar closes.

From a sandbox session on MCX on 19 November 2026, CrudeFast's first trade, from its event stream:

| Time (IST) | What happened |
|---|---|
| 17:22:00 to 17:23:00 | The bar on whose close the EMA 3 crossed above the EMA 5 |
| 17:23:01.012 | One second after the close, `on_bar` bought: the buy of one lot (10 barrels) at market went out |
| 17:23:01.336 | OpenAlgo accepted it as order 26111962581192 |
| 17:23:01.341 | OpenAlgo's order stream reported it filled at 7,695 |
| 17:23:01.345 | The stop-loss went out: an SL-M sell of 10, triggered at 7,657 |
| 17:23:01.491 | The order stream reported the stop resting at the broker: the position was protected |

A minute later CrudeBigTrend's buy went out at 17:24:01.009, again one second after its bar closed. Each time the stop was resting at the broker within 0.15 seconds of the fill.

## Nothing repaints

A signal **repaints** when it appears on a chart and then changes or vanishes as later prices come in. A session never redraws a decision:

* **The strategy sees closed bars only.** `on_bar` runs after its bar has closed, and every indicator made with `self.I` is worked out from closed bars. `crossed_above` compares the values at the bar that just closed and at the bar before it: a cross is decided once, at the close.
* **A late price does not change a closed bar.** A price that reaches the session after its minute's close plus the 1-second grace is dropped and counted, never added to the closed bar. The session's log warns once per symbol, because it may mean that this computer's clock runs ahead of the exchange's.
* **Indicators that look ahead are refused.** An indicator whose value on a bar depends on later bars, such as `ta.fractals`, stops `bt.live` before the session starts, as it stops a backtest ([Writing Strategies](../backtesting/writing-strategies.md#why-was-my-indicator-refused)).

What can differ is the bar itself. The session builds each bar from the prices of the live feed, which sends price updates rather than every trade; your broker builds its 1-minute candle from every trade at the exchange. A few seconds after each close the session reads the broker's candle of that minute, records the difference (`result.drift`, and a `drift` line in the event stream), and keeps it as a check. From openalgo 2.4.0 the strategy keeps deciding on the bars built from the live prices: a candle read after a decision no longer replaces the bar in the strategy's history or its indicators, so a crossing between the session's bar and a later candle of the same minute is seen by exactly one decision, never by none and never twice. A candle is the bar only of a minute with no live prices (the feed was dead, or watching began in it), and after a restart the minutes before it come from the broker's candles. (In openalgo 2.3.0 the candle replaced the session's bar in the strategy's history.) The decision already taken on the session's bar stands.

In the sandbox session on MCX on 19 November 2026, from 17:06 to 18:30 the session checked 233 one-minute bars of its contracts against the broker's candles. On the two crude oil contracts, whose prices move in steps of Re 1 (the **tick**), the median difference was nothing on the open, the high and the low and Rs 2 on the close; in 85 minutes out of 100 no price differed by more than Rs 6, and the largest difference was Rs 15; the volume differed by a median of 32 in the broker's volume figures. Gold mini's prices differed more, by up to Rs 39.

So a backtest on the broker's candles can disagree with a session about a crossover decided by a hair: when the two lines are a tick apart at the close, one bar can cross and the other not. Fast settings, such as EMA 3 and 5, decide by a hair most often. A backtest of the bars the session decided on takes the same decisions as the session; the SDK's tests check that it does.

## Why the bars are built from live prices

The broker's history still has its part: its candles give the strategy's warm-up (the bars before today its indicators need), the minutes of today before the session started, and the check of every bar above. The bar that closes now comes from the live prices because:

* **It is ready at the close.** The broker's candle of the minute that just closed comes seconds later: the session asks for it first 2 seconds after the close, then at 4 and 7 seconds while it is missing, and until the broker has finished it, it can still change. A decision on the live bar comes one second after the close.
* **Every symbol's candle is wanted at the same moment.** All of a session's bars close together, on the minute. The session reads history at most 2 requests a second, under OpenAlgo's pace of about 3 a second for the whole server, which your other scripts share. Deciding on candles, a session of 10 symbols would read its last candle about 5 seconds after its first, and later still when a candle needs the retries at 4 and 7 seconds: the more symbols a session trades, the later its decisions would come.
* **The live prices are needed anyway.** Targets, the trailing stop and the daily loss limits are checked on every price, so the session follows the live feed whether or not it builds its bars from it.
* **It keeps deciding when history is slow.** The candle checks run on their own; a slow answer from your broker's history delays the check, never a decision.

`bars="candles"`, decisions on the broker's candles, is refused in openalgo 2.3.0 ([What openalgo 2.4.0 refuses](README.md#what-openalgo-240-refuses)).

## How the session hears about its orders

The session follows its orders on OpenAlgo's order stream, asks for an order's status when the stream is silent ([Limits](08-limits.md#your-openalgo-server)), and compares its positions with OpenAlgo's books every 30 seconds and 3 seconds after each fill ([Stopping a Session](02-stopping-a-session.md#never-close-or-change-a-position-by-hand-while-a-session-runs)). `result.fills` says where the session heard of each fill, in its `source` column: `stream`, `poll` (it asked OpenAlgo for the order's status), `reconcile` (it found the fill in OpenAlgo's books) or `external` (a fill of an order the session did not place, which it adopted, such as a sale by hand).

In the sandbox session on MCX on 19 November 2026 every order update came from the stream: each fill, each stop resting at the broker, each cancel. From 17:20 to 18:30 the session read OpenAlgo's books 141 times and compared the position of each of its three strategies each time: 423 comparisons, none differing.

## An exit cancels the stop first

Every exit (the strategy's `self.exit()`, a target, a daily loss limit, the square-off, Ctrl+C) cancels the stop at the broker first, waits for the cancel's confirmation and only then sells, so the stop and the sale never both fill ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#targets-and-the-daily-loss-watched-on-every-price)). The time between the cancel and the sale's fill counts in the Unprotected line of the daily summary. From a sandbox session on MCX on 19 November 2026, CrudeFast's exit, from its event stream:

| Time (IST) | What happened |
|---|---|
| 17:59:01.008 | The EMA 3 crossed below the EMA 5 at the close of the 17:58 bar: the session asked to cancel the stop, order 26111962581468 |
| 17:59:01.059 | The order stream confirmed the stop cancelled |
| 17:59:01.066 | Only then the sale went out: SELL 10 at market |
| 17:59:01.266 | The order stream reported the sale filled at 7,757, order 26111964741193 |

The lot was without a stop for about a quarter of a second.

## A trailing stop is one order, modified

When a trailing stop moves, the session modifies the stop order already at the broker; it never places a second one. So at no moment are there two stops, or none.

In the sandbox session on MCX on 19 November 2026, CrudeBigTrend bought one lot of crude oil (100 barrels) at 7,701 at 17:24, with `stop=bt.pct(0.5)` and `trail=bt.trail_pct(0.5)`. The stop started 0.5 percent below the buying price, at 7,662. Once the price was 0.5 percent above the buying price the trail took over, which is why its first move was to 7,701, the buying price. From then on it keeps the stop 0.5 percent of the buying price (about Rs 38.50) below the highest price since the buy, and never moves it down. These are CrudeBigTrend's lines on the session's screen (the lines of the other strategies between them left out), from a sandbox session on MCX on 19 November 2026:

```text
ENTRY: BUY 100 CRUDEOIL18DEC26FUT MCX at 7701.00 (entry, order 26111962641149)
STOP MOVED: CrudeBigTrend: stop of CRUDEOIL18DEC26FUT MCX moved to 7701.00 (order 26111962641261)
STOP MOVED: CrudeBigTrend: stop of CRUDEOIL18DEC26FUT MCX moved to 7722.00 (order 26111962641261)
STOP MOVED: CrudeBigTrend: stop of CRUDEOIL18DEC26FUT MCX moved to 7742.00 (order 26111962641261)
STOP MOVED: CrudeBigTrend: stop of CRUDEOIL18DEC26FUT MCX moved to 7765.00 (order 26111962641261)
```

* Every move is the same order, 26111962641261, modified: at 17:34:47, 17:50:30, 17:56:35 and 18:24:19. OpenAlgo accepted each modification 22 to 40 milliseconds after the session sent it.
* Between moves the stop waits: the session modifies it only when the new level is at least 0.25 percent from the one the broker confirmed, and at most once every 5 seconds ([Stop-Loss at the Broker](03-stop-loss-at-the-broker.md#a-trailing-stop-the-session-moves-the-brokers-stop)).
* At 18:30 this position and its stop went through a crash and a restart, and kept the stop: [Restarts and Results](06-restarts-and-results.md#a-crash-and-a-restart-in-a-real-session).

## What you learned

* Decisions come at each bar's close plus one second; between closes the stop at the broker and the session's checks on every price protect the position.
* The strategy decides on closed bars only and a decision is never redrawn. The session's bars can differ from the broker's candles by a few ticks, which `result.drift` records.
* The bar closing now comes from the live prices; the broker's candles give the warm-up and check every bar.
* Order updates come from OpenAlgo's order stream, checked against OpenAlgo's books every 30 seconds and after each fill.
* An exit cancels the stop first, then sells; a trailing stop is one order, modified.

## Next lesson

[Audit a Session](10-audit-a-session.md): set the session's records against OpenAlgo's books, with a short script.
