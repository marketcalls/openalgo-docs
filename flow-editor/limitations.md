# Limitations and Gotchas

Read this before running a Flow strategy with real money. Most items have a
workaround; a few are hard boundaries.

## Read this first: closePositions ignores its filter in live trading

`closePositions` with a symbol set does **not** close only that symbol on a
live broker account. It squares off the whole book: every symbol, every
exchange, every product, including overnight NRML or CNC position rows returned by the broker.

The node reads `symbol`, `exchange` and `product` and passes them to the
close-position service. The service uses them only in Analyzer mode. In live
mode it calls the broker's own square-off-everything endpoint, which accepts
no filter at all (`services/close_position_service.py`). The panel, the
node's canvas badge and the run log all report a scoped close, because they
describe what was asked for, not what the broker did.

That gives the bug the worst possible shape: **it passes sandbox testing and
misbehaves only with real money.** In Analyzer mode the sandbox honours the
filter exactly as advertised, so a workflow verified end to end in Analyzer
looks correct and then flattens the account on its first live run.

Until this is fixed, treat `closePositions` as account-wide, always.

* Use it only where the intent genuinely is "flatten everything", and only on
  an account holding nothing you did not put there.
* To exit one position, place the opposite side yourself. `smartOrder` with
  `positionSize: 0` and `quantity: 0` can request an exit in that symbol. A positive quantity with a zero target can open an order when already flat. Reconcile the actual position, or read the
  quantity with `openPosition` and send a matching `placeOrder`.
* Never wire `closePositions` behind a per-symbol stop-loss or target
  condition. That is exactly the case where the filter looks essential and
  does nothing.

---

## Hard limitations

### No state between runs

`variable` values live for one run only. A counter incremented on Monday is
back to zero on Tuesday, and back to zero on the very next run, minutes
later.

**Do not** use a variable to answer "have I already entered today?".

**Instead**, ask the broker, which is the real source of truth:

* `positionCheck` with `condition: "not_exists"`: no open position
* `orderBook` and inspect `{{orders.data.orders[0]...}}`
* `openPosition` for a specific symbol's quantity

This is why [Tutorial 5](tutorials.md#5-previous-day-breakout-with-a-gap-filter)
derives "price retested the level today" from the session low in the quote
rather than from a stored flag.

### No loops or iteration

You cannot iterate over a list of symbols. One workflow handles one symbol.

**Workaround.** Export the workflow, edit the symbol, import it under a new
name. Or drive it from outside: have an external scanner POST to a
`webhookTrigger` with the symbol in the payload, and reference
`{{webhook.symbol}}` in the order node.

### No backtesting

Flow executes forward in real time only. There is no historical replay.

**Workaround.** Use an external Python backtesting library with data from the SDK, or an [OpenScript chart backtest](../new-features/openscript.md#backtest). The Python host and SDK do not provide their own historical backtesting engine. Port validated logic into Flow for execution.

### No pandas objects

Flow variables are JSON. `history` returns an array of record objects and
`indicator` returns single values plus a fixed-length array, never a
`pandas.Series`.

You can read individual values (`{{h.data[0].close}}`) and feed an array into
a nested indicator (`sourceSeries`), but you cannot do vectorised series
maths inside Flow.

**Workaround.** The Python Strategy Host gives you real pandas:
`client.history(...)` returns a DataFrame and `df['close']` is a Series.

### Triggers cannot read upstream data

A trigger is the entry point of the graph, so nothing precedes it. Its
configuration fields cannot contain `{{variables}}`.

The practical case: you cannot make an `orderUpdateTrigger` watch
`{{ce.orderid}}` from a previous workflow. The validator refuses a `{{...}}`
reference in `orderId` outright, with a message saying so. Filter by symbol
instead.

### Two-series indicators are unavailable

`crossover`, `crossunder`, `cross`, `correlation`, `beta`, `exrem`,
`flip`, and `valuewhen` need two independent series. The `indicator` node
reads one symbol.

**Workaround.** Build crossovers from two indicator nodes plus an `andGate`; see
[Tutorial 3](tutorials.md#3-crossovers). For correlation between two symbols,
use the Python Strategy Host.

### Only single-series indicators can be nested

`sourceSeries` collapses an upstream indicator to one numeric series, so
anything requiring independent high/low/close (`atr`, `supertrend`, `adx`,
`stochastic`, …) cannot be nested on top of it. You get a clear error, not a
wrong number.

`sma`, `ema`, `rsi`, `wma`, `stdev`, `highest`, `lowest`, and friends nest
fine.

---

## Gotchas that cost money

### A `data` key nothing reads is silently ignored

Flow does not reject unknown keys in a node's `data` object. It ignores them.
Write `strikeOffset` where the field is `offset`, or `sourceField` where the
field is `source`, and the workflow imports cleanly, runs successfully, and
uses the node's default. Nothing in the run log says a field was dropped, so
the only symptom is an order that is subtly not what you configured.

The editor cannot warn you either, because it only ever writes the keys its
own panel knows about. This bites hand-written and AI-generated JSON, which is
most imported workflows.

**Check the file before importing it.** In the OpenAlgo code repo:

```
uv run python .claude/skills/flow-builder/validate.py my_workflow.json
```

It runs the importer's own validator first, so it can never disagree with
what the server accepts, then reports every `data` key no executor reads,
along with the list of keys that node does read. It also flags a
`{{reference}}` whose root nothing in the graph produces.

### Which bar `{{ind.latest.*}}` holds is not fixed

`indicator` computes over exactly what the history fetch returned, and does
not drop a still-forming bar. So:

* If the feed has already opened the current bar, `{{ind.latest.*}}` is that
  forming bar (it repaints) and `{{ind.previous.*}}` is the last closed one.
* If the feed has not opened it yet, `{{ind.latest.*}}` **is** the last closed
  bar and `{{ind.previous.*}}` is the bar before that.

The indicator output carries no timestamp, so nothing in the run tells you
which of the two you got. A candle-close strategy written against `previous`
therefore reads a bar too far back whenever the feed is a little behind, and
one written against `latest` reads a repainting value whenever the feed is
ahead. Both fail intermittently and neither leaves a trace.

`offsetBars` on the `indicator` node inherits the same ambiguity: it counts
back from `latest`, so `offsetBars: 0` and `latest` are the same bar.

**What to do.**

* Prefer a clock-aligned interval schedule. Flow fires interval jobs
  `FLOW_INTERVAL_ALIGN_OFFSET` seconds past the boundary (default 2), and at
  `:02` past the minute the feed's last bar is measurably the just-closed one,
  which puts the closed candle at `latest`.
* When you need certainty rather than a good default, read the bar with
  `barOffset` instead. It explicitly discards a forming bar, so its
  `offsetBars: 0` is always the last closed bar, and it returns a
  `timestamp` you can log.

### The history cache default is half a 1-minute candle

All history-reading nodes share one short-TTL cache. `FLOW_HISTORY_CACHE_TTL`
defaults to **30 seconds**, which suits 5-minute bars and above.

On a 1-minute strategy it is half a candle: a run at 09:31:02 can be served
the fetch made at 09:30:34, so the "latest" bar is one candle stale and the
workflow acts on the wrong candle without any error. Set it to 2 or 3 in
`.env` for 1-minute work:

```
FLOW_HISTORY_CACHE_TTL=3
```

### Supertrend's direction output is inverted

`supertrend` returns a tuple, so its outputs are `out0` (the line) and `out1`
(the direction), not `value`. The direction encoding is the reverse of the
usual convention:

| `{{st.latest.out1}}` | Means |
| --- | --- |
| `-1` | **uptrend**, price above the line |
| `+1` | **downtrend**, price below the line |

A strategy written on the usual assumption (`+1` is bullish) trades backwards:
it buys every downtrend and sells every uptrend, and looks like a working
strategy with an unlucky edge. Verified against 497 real 1-minute bars and
documented the same way in the `openalgo` SDK reference.

Check any tuple indicator's encoding with **Run Now** in Analyzer mode and read
the values before trading it.

### Symbol is upper-cased on order nodes, not on data nodes

Order nodes (`placeOrder`, `smartOrder`, `splitOrder`, `basketOrder`, the
options nodes) upper-case `symbol` before the lookup, because an incoming
alert does not control its own casing and every OpenAlgo symbol is upper case.

**Data nodes do not.** `getQuote`, `getDepth`, `history`, `barOffset`,
`priorPeriodOhlc`, `indicator` and `openPosition` pass the symbol through as
written. So a TradingView alert carrying `reliance` places the order fine and
fails the quote or history fetch in the same workflow, with a "symbol not
found" style error from the broker that reads like a bad instrument rather
than a casing problem.

**Workaround.** Upper-case the symbol at the source (in the alert message), or
hard-code the symbol on the data nodes and reference `{{webhook.symbol}}` only
on the order nodes.

### Quantity units differ by node

| Node | Unit |
| --- | --- |
| `optionsOrder`, `optionsMultiOrder` | **lots** |
| `placeOrder`, `smartOrder`, `splitOrder`, `basketOrder` | **shares** |

`quantity: 1` on an options node is one lot. The same value on `placeOrder`
is one share. This is the most common sizing error. The lot size itself is
resolved from the contract master at run time, so do not hard-code a number
you remember: check the current `lotsize` for the contract you are trading.

### Gates read values, not branches

A wire into a logic gate carries the source condition's boolean, not control
flow. The gate reads each input's stored result and ignores which handle the
wire left from, so a gate fed through `sourceHandle: "true"` edges still
receives a `False` input and can still drive its `false` branch. Pass-through
wiring (`targetHandle` only) does the same thing and reads more clearly.

Two rules do still bite:

* **A gate fires once per run**, after every wired input has been evaluated.
  Until then the log says `waiting for N more input(s) before evaluating`.
* **`inputCount` must match the wiring.** A gate configured for three inputs
  with only two wired errors out rather than evaluating on part of the
  condition. Deleting an edge without lowering the count is the usual cause.

An **errored** condition is the exception: it stores no boolean at all, so
every gate downstream stays pending and nothing below it runs. That is
deliberate. Treating it as `False` used to drive the FALSE branch into a real
order.

See [Concepts](concepts.md#wiring-gates-correctly) for the wiring shapes.

### Unresolved variables behave differently by node

If `outputVariable` is not set on a producer, or a path is misspelled,
interpolation passes the literal `{{name.field}}` text through. What happens
next depends on where it landed:

* **Order nodes refuse to run.** An unresolved reference in any
  order-defining field (`symbol`, `exchange`, `action`, `quantity`,
  `product`, `priceType`, `price`, `triggerPrice`, `orderId`, `legs`, …)
  fails the node before the broker call. It does not fall back to a default.
* **Conditions take neither branch.** `varCondition` and `priceCondition`
  refuse a non-numeric operand and error, so a typo cannot route a trade.
  `positionCheck` and `fundCheck` do the same when the broker read fails.
* **Everything else passes the text through** and keeps running. A `log`,
  `telegramAlert` or `httpRequest` node will happily send the literal
  `{{name.field}}`.

Read the execution log after the first run and look for `{{` in the output.

### Index symbols need index exchanges

`NIFTY` on `NSE` returns nothing. Use `NSE_INDEX` (and `BSE_INDEX` for
SENSEX/BANKEX). Their options trade on `NFO`/`BFO`.

### Offsets count bars, not days

On `barOffset`, `offsetBars: 5` on a daily chart is five *trading* bars, seven
calendar days if a weekend intervenes, more across a holiday. `offsetBars: 0`
is the last *closed* bar; a still-forming candle is excluded.

`offsetBars` on the `indicator` node counts the same way but does **not**
exclude a forming bar. See "Which bar `{{ind.latest.*}}` holds is not fixed"
above.

### Not every broker supports every interval

`interval` is free text on `indicator` and `barOffset` because support varies.
Use the `intervals` node to discover what your broker offers. If an interval is
unsupported, both nodes report the broker's own message and point at the
Historify alternative. `priorPeriodOhlc` has no `interval` field at all: it
picks `1h` or `D` from the `period` you chose. The `history` node is different
again: it has a fixed five-value dropdown (`1m`, `5m`, `15m`, `1h`, `1d`) and
still surfaces the raw broker payload.

For unsupported timeframes, download 1-minute data into Historify and set
`source: "db"` on an `indicator`, `barOffset`, or `priorPeriodOhlc` node. It
resamples any minute/hour interval from 1m, and W/M/Q/Y from D, independent
of broker capability. The `history` node has no `source` field and always
calls the broker.

`source` takes only `api` or `db`. It is not the price field; that is
`sourceField`, and it exists only on `indicator` in nested (`sourceSeries`)
mode. Putting `close` in `source` returns "Source must be either 'api' or
'db'" wrapped in a history-fetch error, which reads like a data problem.

### History is capped at 200 bars

A 10-year 1-minute request is refused by design (~900,000 rows). The cap
applies to the request window, not just the response, so the download never
happens. Raise `FLOW_MAX_HISTORY_BARS` if you genuinely need more, and note
that a second ceiling, `FLOW_MAX_HISTORY_CALENDAR_DAYS` (4000, about 11
years), independently truncates W/M/Q/Y windows. Neither key ships in
`.sample.env`; add them to `.env` yourself.

### Broker rate limits are tight

Dhan allows 5 requests/second on history and 1 request/second on quotes
(error 805 on breach); Flattrade allows 10/second; some Zerodha paths allow
1/second. OpenAlgo also serializes broker history calls behind a process-wide
350 ms gate, about 3 per second.

Identical history requests within the cache TTL collapse to one broker call,
but *distinct* requests (different symbol, or the same symbol at a different
interval) each cost a call and each waits on that gate. A 1-minute schedule
with many indicators across many intervals will feel slow and can trip broker
limits.

Prefer one indicator node per distinct symbol/interval and reuse its
`outputVariable`.

### One run at a time

A second trigger arriving while a workflow is still running returns
`already_running` and is dropped, it is not queued. Keep the schedule
interval comfortably longer than the run takes.

### Analyzer mode is global

There is no per-workflow sandbox-mode switch. Flow inherits the global
Analyzer toggle. Verify which mode you are in before activating a workflow.
The badge is in the header, and order results carry `mode: "analyze"` or
`mode: "live"`.

Analyzer is not a perfect rehearsal of live. `closePositions` is the known
divergence, and the dangerous one: see the top of this page.

### `delay` is capped at 300 seconds, `waitUntil` at 30 minutes

Both retain the per-workflow execution slot while waiting and both are bounded. They fail differently:

* **`delay` is silently clamped.** Configured for longer than 300 seconds it
  logs a warning and waits 300 seconds instead. It does not fail. A workflow
  written as "wait 30 minutes, then exit" therefore exits after five minutes,
  which is the kind of mistake that only shows up in a live position.
* **`waitUntil` errors.** A target time more than 1800 seconds away fails the
  node with a message naming the limit and pointing at a schedule trigger. It
  does not wait a partial 30 minutes and it does not proceed.

The reason for the caps: an unbounded wait pinned a worker for hours and
answered `already_running` to every trigger in between. For a long wait, use a
second workflow on its own schedule rather than a wait inside one run.

**Which request waits depends on the web worker.** Eventlet and the development server run these waits on the triggering request. On opt-in gthread, configured waits totalling more than ten seconds run in a background pool; the trigger responds `status: "accepted"`, and the final result appears in execution history. Shorter waits remain on the request. Up to 16 Delay workflows or four longer Wait Until workflows can use their respective pools; when the relevant pool is full, the trigger is refused before starting and that refusal is recorded.

An accepted response is not a completed run or a fill. Do not resend it merely because its result is not yet visible; inspect execution history and the actual order books.

### Graph and traversal limits

| Limit | Value | What happens on breach |
| --- | --- | --- |
| Nodes per workflow | 500 | Rejected at save/import |
| Edges per workflow | 1000 | Rejected at save/import |
| Node depth per run | 100 | Run aborts with an error |
| Node visits per run | 500 | Run aborts with an error |
| `httpRequest` timeout | 1000 to 60000 ms | Rejected at save/import |

The `httpRequest` timeout field is in **milliseconds**, not seconds. Entering
`30` means 30 milliseconds, and is now refused at save with a message saying
so rather than quietly becoming a request that can only fail. The executor
also clamps at 60000 ms as a backstop for anything stored before that check
existed.

### Indicator names are not validated until the run

The validator only checks that `indicatorName` is present. It never compares
it against the supported list, so a typo, or one of the 11 excluded names
(8 two-series indicators plus `median_bands`, `ulcerindex` and `vi`, which the
installed `openalgo` build cannot compute), saves and imports cleanly and
fails mid-run. Test every new indicator node with **Run Now** in Analyzer mode
before activating.

---

## Strategy P&L: what the book does and does not see

`strategyPnl` reads a per-strategy book that OpenAlgo maintains from its own
order events. That gives it a few boundaries worth knowing before you wire an
exit trigger to it.

* **Only tagged orders count.** The book is fed by orders placed through
  OpenAlgo carrying a `strategy` tag, Flow nodes and `/api/v1/` calls. A
  position opened by hand in the broker terminal is invisible to it.
* **Unrealized needs a live price.** Open legs are marked against the position
  book. A leg with no matching price is excluded and counted in
  `unpriced_legs`; treat a non-zero value as "this total is understated".
* **A broken position book is an error, not a zero.** If the position book
  cannot be read the node returns an error rather than reporting a calm
  `total: 0` that an exit trigger would act on.
* **`realized` accumulates across sessions**; `today_realized` resets at the
  03:00 IST session rollover, matching the broker token cycle.
* **Do not pair it with `closePositions` for a scoped exit.** On a live
  account that node closes the entire book regardless of the symbol you set,
  so a per-strategy P&L stop wired to it flattens every other strategy too.
  See the top of this page.

## Pre-flight checklist

Before activating a workflow against live money:

- [ ] Ran the JSON through `validate.py` if it was written or edited by hand
- [ ] Ran it at least once in **Analyzer mode** and read every log line
- [ ] No `{{...}}` placeholders appear unresolved in the log
- [ ] Order quantity units are right (lots vs shares)
- [ ] Every gate evaluated exactly once, with the expected inputs, and
      `inputCount` matches the wires
- [ ] Any tuple indicator's output encoding was read, not assumed
      (`supertrend` direction is inverted)
- [ ] `FLOW_HISTORY_CACHE_TTL` is below one candle for the interval traded
- [ ] An entry guard exists (`positionCheck` / `fundCheck`) so a repeating
      schedule cannot stack positions
- [ ] The schedule interval is longer than the observed run duration
- [ ] Index symbols use `NSE_INDEX` / `BSE_INDEX`, and every data node's
      symbol is upper case
- [ ] No `closePositions` node sits behind a per-symbol condition
- [ ] Square-off or exit logic exists, or you are managing exits manually
