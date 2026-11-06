# Tutorials

Twelve complete strategies, from a first workflow to a live 1-minute
Supertrend reversal.

**Every JSON on this page imports cleanly and every "Verified output" block
is real output**, captured from a run against a live broker connection in
Analyzer mode, not illustration.

## How to run these

1. Open `/flow`, click **Import**
2. Paste the JSON (or save it as a `.json` file and use the file picker)
3. Click **Save**, then **Run** to execute once
4. Read the execution log panel, every node reports what it did

Turn **Analyzer mode on** first. Orders will be simulated.

**Check a workflow before you import it.** Flow ignores a `data` key that no
node reads, so `strikeOffset` where the field is `offset` imports cleanly,
runs successfully, and silently uses the default. Nothing in the run says so.
The `flow-builder` skill in the OpenAlgo repo ships a checker that calls the
importer's own validator and then flags exactly those keys:

```
uv run python .claude/skills/flow-builder/validate.py my_workflow.json
```

Every JSON below passes it with no errors and no warnings.

---

## 1. Quotes, maths, and variables

The smallest useful workflow: read a quote, compute the percentage move, log
it. This teaches `outputVariable` and `{{...}}` interpolation.

```json
{
  "name": "T1 quote and variables",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "daily", "time": "09:20", "marketHoursOnly": true,
                "marketHoursStart": "09:15", "marketHoursEnd": "15:15", "marketHoursExchange": "NSE" } },
    { "id": "q", "type": "getQuote", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "RELIANCE", "exchange": "NSE", "outputVariable": "q" } },
    { "id": "m", "type": "mathExpression", "position": { "x": 0, "y": 200 },
      "data": { "expression": "({{q.data.ltp}} - {{q.data.prev_close}}) / {{q.data.prev_close}} * 100", "outputVariable": "chgPct" } },
    { "id": "l", "type": "log", "position": { "x": 0, "y": 300 },
      "data": { "message": "RELIANCE ltp={{q.data.ltp}} open={{q.data.open}} prevClose={{q.data.prev_close}} change={{chgPct}}%", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "q" },
    { "id": "e2", "source": "q", "target": "m" },
    { "id": "e3", "source": "m", "target": "l" }
  ]
}
```

**Key points.**

* `mathExpression` supports `+ - * / % **` and parentheses over interpolated
  values. It cannot do date arithmetic or call functions.
* The four `marketHours*` fields on `start` are the gate that keeps a schedule
  off weekends and holidays. `marketHoursOnly` defaults to on, and the window
  defaults to 09:15 to 15:15 on the NSE calendar. The window sets the clock
  only: it never reopens a day the exchange is shut, and the calendar is the
  real one, so MCX running to 23:55 and CRYPTO never closing are both
  inherited rather than restated.

---

## 2. Indicator conditions and branching

Compute RSI, then take a different path depending on its value.

```json
{
  "name": "T2 RSI check",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "interval", "intervalValue": 5, "intervalUnit": "minutes", "marketHoursOnly": true } },
    { "id": "r", "type": "indicator", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "RELIANCE", "exchange": "NSE", "interval": "D", "source": "api",
                "indicatorName": "rsi", "params": "{\"period\":14}",
                "lookbackBars": 100, "tailBars": 5, "offsetBars": 0, "outputVariable": "rsi" } },
    { "id": "c", "type": "varCondition", "position": { "x": 0, "y": 200 },
      "data": { "leftValue": "{{rsi.latest.value}}", "operator": "<", "rightValue": "70" } },
    { "id": "y", "type": "log", "position": { "x": 0, "y": 300 },
      "data": { "message": "RSI {{rsi.latest.value}} below 70 - entry allowed", "level": "info" } },
    { "id": "n", "type": "log", "position": { "x": 250, "y": 300 },
      "data": { "message": "RSI {{rsi.latest.value}} too hot - skip", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "r" },
    { "id": "e2", "source": "r", "target": "c" },
    { "id": "e3", "source": "c", "sourceHandle": "true",  "target": "y" },
    { "id": "e4", "source": "c", "sourceHandle": "false", "target": "n" }
  ]
}
```

Verified output:

```
Computing rsi for RELIANCE (D, 100 bars)
rsi latest: {'value': 43.385612}
Var check: 43.385612 < 70.0 = True
[LOG] RSI 43.385612 below 70 - entry allowed
```

**Key point.** `varCondition` compares any two interpolated values. Unlike
`priceCondition` (which always re-fetches a live quote field), it works on
indicator outputs, previous-period levels, and literals. If an operand does
not resolve to a number it **refuses to evaluate and takes neither branch**:
a typo cannot silently route your else-path into a trade.

---

## 3. Crossovers

There is no crossover node, `crossover` needs two series. Build it from two
indicator nodes and an `andGate`.

A golden cross means: fast is above slow **now**, and fast was at or below
slow **on the previous bar**.

```json
{
  "name": "T3 EMA golden cross",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "once", "executeAt": "2099-01-01", "marketHoursOnly": false } },
    { "id": "f", "type": "indicator", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "D", "source": "api",
                "indicatorName": "ema", "params": "{\"period\":9}",
                "lookbackBars": 120, "tailBars": 3, "outputVariable": "fast" } },
    { "id": "s", "type": "indicator", "position": { "x": 0, "y": 200 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "D", "source": "api",
                "indicatorName": "ema", "params": "{\"period\":21}",
                "lookbackBars": 120, "tailBars": 3, "outputVariable": "slow" } },
    { "id": "c1", "type": "varCondition", "position": { "x": 0, "y": 300 },
      "data": { "leftValue": "{{fast.latest.value}}", "operator": ">", "rightValue": "{{slow.latest.value}}" } },
    { "id": "c2", "type": "varCondition", "position": { "x": 250, "y": 300 },
      "data": { "leftValue": "{{fast.previous.value}}", "operator": "<=", "rightValue": "{{slow.previous.value}}" } },
    { "id": "and", "type": "andGate", "position": { "x": 120, "y": 400 }, "data": { "inputCount": 2 } },
    { "id": "log", "type": "log", "position": { "x": 120, "y": 500 },
      "data": { "message": "GOLDEN CROSS: fast={{fast.latest.value}} slow={{slow.latest.value}} (prev fast={{fast.previous.value}} slow={{slow.previous.value}})", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "f" },
    { "id": "e2", "source": "f", "target": "s" },
    { "id": "e3", "source": "s", "target": "c1" },
    { "id": "e4", "source": "s", "target": "c2" },
    { "id": "e5", "source": "c1", "target": "and", "targetHandle": "input-0" },
    { "id": "e6", "source": "c2", "target": "and", "targetHandle": "input-1" },
    { "id": "e7", "source": "and", "sourceHandle": "true", "target": "log" }
  ]
}
```

Verified output, a genuine EMA9/EMA21 cross on NIFTY daily:

```
ema latest: {'value': 24055.354181}     <- fast
ema latest: {'value': 24045.22283}      <- slow
Var check: 24055.354181 > 24045.22283 = True
andGate: waiting for 1 more input(s) before evaluating
Var check: 24008.692726 <= 24025.545113 = True
AND Gate: [True, True] -> True
[LOG] GOLDEN CROSS: fast=24055.354181 slow=24045.22283 ...
```

**For a death cross**, flip both operators: `<` on latest, `>=` on previous.

**To detect a cross on an earlier bar**, add `offsetBars` to both indicators
and compare `{{fast.at_offset.value}}` against `{{slow.at_offset.value}}`.

---

## 4. Multi-timeframe filter

Trade only when the daily trend and the 15-minute momentum agree.

```json
{
  "name": "T4 multi-timeframe filter",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "interval", "intervalValue": 15, "intervalUnit": "minutes", "marketHoursOnly": true } },
    { "id": "d", "type": "indicator", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "D", "source": "api",
                "indicatorName": "ema", "params": "{\"period\":20}", "lookbackBars": 100, "tailBars": 3, "outputVariable": "emaD" } },
    { "id": "i", "type": "indicator", "position": { "x": 0, "y": 200 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "15m", "source": "api",
                "indicatorName": "rsi", "params": "{\"period\":14}", "lookbackBars": 100, "tailBars": 3, "outputVariable": "rsi15" } },
    { "id": "q", "type": "getQuote", "position": { "x": 0, "y": 300 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "outputVariable": "q" } },
    { "id": "c1", "type": "varCondition", "position": { "x": 0, "y": 400 },
      "data": { "leftValue": "{{q.data.ltp}}", "operator": ">", "rightValue": "{{emaD.latest.value}}" } },
    { "id": "c2", "type": "varCondition", "position": { "x": 250, "y": 400 },
      "data": { "leftValue": "{{rsi15.latest.value}}", "operator": ">", "rightValue": "50" } },
    { "id": "g", "type": "andGate", "position": { "x": 120, "y": 500 }, "data": { "inputCount": 2 } },
    { "id": "y", "type": "log", "position": { "x": 0, "y": 600 },
      "data": { "message": "Daily uptrend + 15m momentum: ltp={{q.data.ltp}} emaD={{emaD.latest.value}} rsi15={{rsi15.latest.value}}", "level": "info" } },
    { "id": "n", "type": "log", "position": { "x": 260, "y": 600 },
      "data": { "message": "Filter not aligned - no trade", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "d" },
    { "id": "e2", "source": "d", "target": "i" },
    { "id": "e3", "source": "i", "target": "q" },
    { "id": "e4", "source": "q", "target": "c1" },
    { "id": "e5", "source": "q", "target": "c2" },
    { "id": "e6", "source": "c1", "target": "g", "targetHandle": "input-0" },
    { "id": "e7", "source": "c2", "target": "g", "targetHandle": "input-1" },
    { "id": "e8", "source": "g", "sourceHandle": "true",  "target": "y" },
    { "id": "e9", "source": "g", "sourceHandle": "false", "target": "n" }
  ]
}
```

Verified output:

```
ema latest: {'value': 24047.893645}     <- daily EMA20
rsi latest: {'value': 60.174092}        <- 15-minute RSI
Var check: 24250.2 > 24047.893645 = True
AND Gate: [True, True] -> True
[LOG] Daily uptrend + 15m momentum: ltp=24250.2 emaD=24047.893645 rsi15=60.174092
```

**Key point.** Two indicator nodes on the same symbol at *different*
intervals are two distinct fetches, the cache only collapses identical
requests. That is correct and unavoidable.

---

## 5. Previous-day breakout with a gap filter

The classic PDH breakout, with the refinement that a gap-up open should not
trade until price has come back to test the level.

Flow has no memory between runs, so "price returned to PDH earlier today"
cannot be a stored flag. Instead read **today's session low** from the quote:
if the day's low is at or below PDH, price has already visited that level
today. That makes the filter entirely stateless.

```json
{
  "name": "T5 PDH breakout with gap-up retest filter",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "interval", "intervalValue": 1, "intervalUnit": "minutes", "marketHoursOnly": true } },
    { "id": "pd", "type": "priorPeriodOhlc", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "period": "previous_day", "source": "api", "outputVariable": "pd" } },
    { "id": "q", "type": "getQuote", "position": { "x": 0, "y": 200 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "outputVariable": "q" } },
    { "id": "win", "type": "timeWindow", "position": { "x": 0, "y": 300 },
      "data": { "startTime": "09:20", "endTime": "15:00" } },
    { "id": "brk", "type": "varCondition", "position": { "x": 0, "y": 400 },
      "data": { "leftValue": "{{q.data.ltp}}", "operator": ">", "rightValue": "{{pd.pdh}}" } },
    { "id": "retest", "type": "varCondition", "position": { "x": 250, "y": 400 },
      "data": { "leftValue": "{{q.data.low}}", "operator": "<=", "rightValue": "{{pd.pdh}}" } },
    { "id": "pos", "type": "positionCheck", "position": { "x": 500, "y": 400 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "product": "NRML", "condition": "not_exists" } },
    { "id": "g", "type": "andGate", "position": { "x": 250, "y": 500 }, "data": { "inputCount": 4 } },
    { "id": "go", "type": "log", "position": { "x": 150, "y": 600 },
      "data": { "message": "ENTRY: LTP {{q.data.ltp}} broke PDH {{pd.pdh}} (day low {{q.data.low}} confirms retest, PDL {{pd.pdl}})", "level": "info" } },
    { "id": "skip", "type": "log", "position": { "x": 450, "y": 600 },
      "data": { "message": "No entry: ltp={{q.data.ltp}} pdh={{pd.pdh}} dayLow={{q.data.low}}", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "pd" },
    { "id": "e2", "source": "pd", "target": "q" },
    { "id": "e3", "source": "q", "target": "win" },
    { "id": "e4", "source": "win", "target": "brk" },
    { "id": "e5", "source": "win", "target": "retest" },
    { "id": "e6", "source": "win", "target": "pos" },
    { "id": "e7",  "source": "win",    "target": "g", "targetHandle": "input-0" },
    { "id": "e8",  "source": "brk",    "target": "g", "targetHandle": "input-1" },
    { "id": "e9",  "source": "retest", "target": "g", "targetHandle": "input-2" },
    { "id": "e10", "source": "pos",    "target": "g", "targetHandle": "input-3" },
    { "id": "e11", "source": "g", "sourceHandle": "true",  "target": "go" },
    { "id": "e12", "source": "g", "sourceHandle": "false", "target": "skip" }
  ]
}
```

Verified output, the filter correctly declined a gap-up that never retested:

```
previous_day OHLC for NIFTY: H=24041.15 L=23954.6 C=23985.35
Var check: 24250.2 > 24041.15 = True        <- above PDH
Var check: 24136.75 <= 24041.15 = False     <- day low never reached PDH
Position check: qty=0 == 0 = True
AND Gate: [False, True, False, True] -> False
[LOG] No entry: ltp=24250.2 pdh=24041.15 dayLow=24136.75
```

**For the PDL short side**, mirror it: `{{q.data.ltp}} < {{pd.pdl}}` and
`{{q.data.high}} >= {{pd.pdl}}`.

**"One trade per breakout"** is enforced by `positionCheck` with
`not_exists`, it asks the broker, so it survives restarts, unlike a counter
variable.

To actually trade it, replace the `go` log node with the options entry from
Tutorial 7.

---

## 6. Historical lookback

Previous day, previous week, a bar five sessions back, and an indicator value
five bars back, all in one workflow.

```json
{
  "name": "T6 historical lookback",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "once", "executeAt": "2099-01-01", "marketHoursOnly": false } },
    { "id": "pd", "type": "priorPeriodOhlc", "position": { "x": 0, "y": 100 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "period": "previous_day", "source": "api", "outputVariable": "pday" } },
    { "id": "pw", "type": "priorPeriodOhlc", "position": { "x": 0, "y": 200 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "period": "previous_week", "source": "api", "outputVariable": "pweek" } },
    { "id": "b5", "type": "barOffset", "position": { "x": 0, "y": 300 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "D", "source": "api", "offsetBars": 5, "outputVariable": "bar5" } },
    { "id": "st", "type": "indicator", "position": { "x": 0, "y": 400 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "interval": "D", "source": "api",
                "indicatorName": "supertrend", "params": "{\"period\":10,\"multiplier\":3}",
                "lookbackBars": 150, "tailBars": 10, "offsetBars": 5, "outputVariable": "st" } },
    { "id": "l", "type": "log", "position": { "x": 0, "y": 500 },
      "data": { "message": "PDH={{pday.pdh}} PDL={{pday.pdl}} | prevWeekH={{pweek.pdh}} prevWeekL={{pweek.pdl}} | close5BarsAgo={{bar5.close}} | supertrend now={{st.latest.out0}} 5barsAgo={{st.at_offset.out0}} dir={{st.latest.out1}}", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "pd" },
    { "id": "e2", "source": "pd", "target": "pw" },
    { "id": "e3", "source": "pw", "target": "b5" },
    { "id": "e4", "source": "b5", "target": "st" },
    { "id": "e5", "source": "st", "target": "l" }
  ]
}
```

**Key points.**

* `offsetBars: 5` on a daily chart is five *trading* bars, which spans seven
  calendar days across a weekend. Supertrend legitimately holds a flat level
  through a sustained trend, so identical values at different offsets are
  often correct, not a bug, check `out1` (direction) to confirm.
* Supertrend is a **tuple indicator**: it has `out0` (the line) and `out1`
  (direction), and no `value` key at all. `{{st.latest.value}}` resolves to
  nothing.
* **`out1` is inverted**: `-1` is the uptrend, `+1` the downtrend. See
  [Indicators](indicators.md#supertrends-direction-is-inverted).

---

## 7. Risk-guarded ATM options entry

Two guards, available funds and no existing position, before buying a
current-week ATM call.

```json
{
  "name": "T7 risk-guarded ATM option entry",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "once", "executeAt": "2099-01-01", "marketHoursOnly": false } },
    { "id": "f", "type": "fundCheck", "position": { "x": 0, "y": 100 }, "data": { "minAvailable": 1000 } },
    { "id": "p", "type": "positionCheck", "position": { "x": 250, "y": 100 },
      "data": { "symbol": "NIFTY", "exchange": "NSE_INDEX", "product": "NRML", "condition": "not_exists" } },
    { "id": "g", "type": "andGate", "position": { "x": 120, "y": 200 }, "data": { "inputCount": 2 } },
    { "id": "o", "type": "optionsOrder", "position": { "x": 0, "y": 300 },
      "data": { "underlying": "NIFTY", "expiryType": "current_week", "offset": "ATM", "optionType": "CE",
                "action": "BUY", "quantity": 1, "priceType": "MARKET", "product": "NRML", "outputVariable": "ce" } },
    { "id": "l", "type": "log", "position": { "x": 0, "y": 400 },
      "data": { "message": "Placed ATM CE order id={{ce.orderid}}", "level": "info" } },
    { "id": "s", "type": "log", "position": { "x": 300, "y": 300 },
      "data": { "message": "Guard blocked entry", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "f" },
    { "id": "e2", "source": "n1", "target": "p" },
    { "id": "e3", "source": "f", "target": "g", "targetHandle": "input-0" },
    { "id": "e4", "source": "p", "target": "g", "targetHandle": "input-1" },
    { "id": "e5", "source": "g", "sourceHandle": "true", "target": "o" },
    { "id": "e6", "source": "o", "target": "l" },
    { "id": "e7", "source": "g", "sourceHandle": "false", "target": "s" }
  ]
}
```

Verified output (Analyzer mode):

```
Fund check: available=9984452.0 >= 1000.0 = True
andGate: waiting for 1 more input(s) before evaluating
Position check: qty=0 == 0 = True
AND Gate: [True, True] -> True
Resolved expiry: current_week -> 04AUG26
Options order result: {'status': 'success', 'orderid': '26072924089946',
  'symbol': 'NIFTY04AUG2624250CE', 'exchange': 'NFO', 'offset': 'ATM',
  'option_type': 'CE', 'mode': 'analyze'}
```

**Key points.**

* `optionsOrder` resolves the expiry and strike for you: you never hand-write
  `NIFTY04AUG2624250CE`.
* `quantity` here is **in lots**. `placeOrder`, `smartOrder`, `splitOrder`,
  and `basketOrder` take quantity in **shares**. This asymmetry is the single
  most common sizing mistake.
* `expiryType` accepts `current_week`, `next_week`, `current_month`,
  `next_month`.
* `offset` accepts `ATM`, `ITM1`-`ITM50`, `OTM1`-`OTM50`.

---

## 8. Reacting to a fill

`orderUpdateTrigger` fires the moment a matching order changes status, no
polling loop.

```json
{
  "name": "T8 react to a fill",
  "nodes": [
    { "id": "n1", "type": "orderUpdateTrigger", "position": { "x": 0, "y": 0 },
      "data": { "symbol": "NIFTY04AUG2624250CE", "exchange": "NFO", "status": "complete", "trigger": "once" } },
    { "id": "a", "type": "telegramAlert", "position": { "x": 0, "y": 100 },
      "data": { "message": "FILLED {{webhook.symbol}} qty={{webhook.filled_quantity}} avg={{webhook.average_price}}" } }
  ],
  "edges": [ { "id": "e1", "source": "n1", "target": "a" } ]
}
```

The event payload is exposed as `{{webhook.*}}`: `orderid`, `symbol`,
`exchange`, `order_status`, `filled_quantity`, `average_price`,
`rejection_reason`.

**Key points.**

* Set at least one of Order ID or Symbol. An unfiltered watch would fire on
  every order in the account and is rejected.
* Order ID must be a **literal** broker order id, a trigger has no upstream
  node, so `{{ce.orderid}}` cannot be resolved and is rejected with a 400.
  Filter by symbol instead.
* `status` accepts `any`, `open`, `trigger pending`, `complete`, `rejected`,
  `cancelled`.
* `trigger: "once"` stops watching after the first match; `"every_time"`
  keeps watching.
* Watches survive a restart, they are restored from active workflows on boot.
* `telegramAlert` reads **only** `message`. The recipient is resolved from
  the API key the workflow runs under, to that user's linked Telegram
  account, so there is no recipient field on the node. An earlier version of
  this tutorial carried a `username` key, which Flow silently ignored: the
  exact trap the pre-import check catches.

---

## 9. Exit on this strategy's own P&L

The account's position book nets everything and carries no strategy label, so
"am I up 5000 on *this* strategy" cannot be answered from `positionBook` when
another strategy holds the same contract. `strategyPnl` answers it.

```json
{
  "name": "T9 strategy pnl exit",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "interval", "intervalValue": 1, "intervalUnit": "minutes", "marketHoursOnly": true } },
    { "id": "pnl", "type": "strategyPnl", "position": { "x": 0, "y": 100 },
      "data": { "outputVariable": "pnl" } },
    { "id": "hasqty", "type": "varCondition", "position": { "x": 0, "y": 200 },
      "data": { "leftValue": "{{pnl.open_quantity}}", "operator": "!=", "rightValue": "0" } },
    { "id": "target", "type": "varCondition", "position": { "x": 0, "y": 300 },
      "data": { "leftValue": "{{pnl.total}}", "operator": ">=", "rightValue": "5000" } },
    { "id": "flat", "type": "closePositions", "position": { "x": 0, "y": 400 }, "data": {} },
    { "id": "say", "type": "log", "position": { "x": 220, "y": 400 },
      "data": { "message": "Target hit: total={{pnl.total}} realized={{pnl.realized}} unrealized={{pnl.unrealized}}", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "pnl" },
    { "id": "e2", "source": "pnl", "target": "hasqty" },
    { "id": "e3", "source": "hasqty", "target": "target", "sourceHandle": "true" },
    { "id": "e4", "source": "target", "target": "flat", "sourceHandle": "true" },
    { "id": "e5", "source": "target", "target": "say", "sourceHandle": "true" }
  ]
}
```

Verified with one open leg of 75 NIFTY CE bought at 100 and marked at 170:

```
realized=0.0  unrealized=5250.0  total=5250.0  openQty=75.0  unpriced_legs=0
-> total >= 5000, exit branch taken
```

**Key points.**

* Leave `strategy` blank. It defaults to the workflow's own name, which is the
  same tag this workflow's order nodes apply, so entry and exit agree with no
  configuration.
* The `open_quantity != 0` guard first. Without it the workflow re-fires
  `closePositions` every minute after the position is already flat, because
  realized P&L stays above the target for the rest of the session.
* `total` is realized + unrealized. Use `today_realized` for an intraday-only
  target that ignores P&L carried in from previous sessions.
* Swap `>=` for `<=` and a negative number to get a stop-loss instead.
* **`closePositions` squares off the whole book in live trading.** Its
  symbol, exchange and product filter is honoured in Analyzer mode and
  **ignored live**, so a filtered node looks correct in sandbox testing and
  then flattens every other strategy's positions with it. If several
  strategies hold positions at once, close the specific leg with a
  `placeOrder` using a verified current quantity, or a `smartOrder` exit with `positionSize: 0` and `quantity: 0` instead. A positive quantity with a zero target can open an order when already flat. See
  [Limitations](limitations.md).

**Before relying on this.** The strategy book is built from orders placed
**through OpenAlgo with a strategy tag**, Flow nodes and `/api/v1/` calls
that carry `strategy`. A position you opened by hand in the broker terminal is
invisible to it, so its P&L is not counted. Check `unpriced_legs` too: it
counts open legs with no live price, which are excluded from `unrealized`, so
a non-zero value means `total` is understated.

---

## 10. Run only on the first trading day of the month

A monthly rebalance must fire once, on the first day the exchange actually
trades. `{{day}} == 1` gets this wrong whenever the 1st is a weekend or a
holiday. The `calendar` node answers it directly.

```json
{
  "name": "T10 monthly rebalance",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "scheduleType": "daily", "time": "09:20", "marketHoursOnly": true,
                "marketHoursStart": "09:15", "marketHoursEnd": "15:15", "marketHoursExchange": "NSE" } },
    { "id": "cal", "type": "calendar", "position": { "x": 0, "y": 100 },
      "data": { "outputVariable": "cal" } },
    { "id": "isnew", "type": "varCondition", "position": { "x": 0, "y": 200 },
      "data": { "leftValue": "{{cal.is_new_month}}", "operator": "==", "rightValue": "true" } },
    { "id": "go", "type": "log", "position": { "x": 0, "y": 300 },
      "data": { "message": "New month opened on {{cal.date}} ({{cal.weekday}}) - rebalancing. Quarter {{cal.quarter}}, week {{cal.week_of_year}}.", "level": "info" } },
    { "id": "skip", "type": "log", "position": { "x": 260, "y": 300 },
      "data": { "message": "{{cal.date}} is not the first trading day of the month - nothing to do", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "cal" },
    { "id": "e2", "source": "cal", "target": "isnew" },
    { "id": "e3", "source": "isnew", "sourceHandle": "true",  "target": "go" },
    { "id": "e4", "source": "isnew", "sourceHandle": "false", "target": "skip" }
  ]
}
```

**Key points.**

* The schedule runs daily and `marketHoursOnly` drops the days the exchange is
  shut, so in practice it fires on every trading day; the `calendar` node then
  decides whether today is the day. That is deliberate, a monthly schedule
  could not know which date the exchange actually opens on. Do not reach for
  `days` here: it narrows a `weekly` schedule, and a `daily` one ignores it.
* Swap `is_new_month` for `is_new_week`, `is_new_quarter` or `is_new_year`. Use
  `is_last_day_of_month` for a month-end square-off instead.
* Flow keeps no state between runs, so this cannot work by remembering the last
  run. It does not need to: "a new month started" is the same statement as
  "today is the first trading day of this month", and the exchange calendar
  answers that on its own.
* `is_trading_holiday` is distinct from `is_weekend`, so you can log *why* a day
  was skipped.
* Blank `date` uses the current trading session date, which differs from the
  calendar date between midnight and the 03:00 IST rollover.

Real 2026 dates this handles correctly, and the naive tests do not:

| Date | Day | `is_new_month` | `is_new_week` |
| --- | --- | --- | --- |
| 1 Aug | Saturday | false | false |
| 3 Aug | Monday | **true** | **true** |
| 26 Jan (Republic Day) | Monday | false | false |
| 27 Jan | Tuesday | false | **true** |

---

## 11. Driving an order from the webhook payload

One workflow, any instrument. The alert decides the symbol, the exchange, the
side and the size; the graph decides nothing except whether the request looks
sane.

**The `webhookTrigger` node carries no instrument.** It used to have `symbol`
and `exchange` fields; the executor never read them, so they only labelled the
node on the canvas. They are gone. Older documentation described `symbol` as a
filter that rejected requests for other instruments: it never was one. The node
has a `label` and nothing else, and everything the workflow acts on arrives in
the request body as `{{webhook.<field>}}`.

```json
{
  "name": "T11 webhook-driven order",
  "nodes": [
    { "id": "n1", "type": "webhookTrigger", "position": { "x": 0, "y": 0 },
      "data": { "label": "TradingView alert" } },
    { "id": "seen", "type": "log", "position": { "x": 0, "y": 100 },
      "data": { "message": "Alert: {{webhook.action}} {{webhook.quantity}} {{webhook.symbol}} on {{webhook.exchange}}", "level": "info" } },
    { "id": "qty", "type": "varCondition", "position": { "x": 0, "y": 200 },
      "data": { "leftValue": "{{webhook.quantity}}", "operator": ">", "rightValue": "0" } },
    { "id": "o", "type": "placeOrder", "position": { "x": 0, "y": 300 },
      "data": { "symbol": "{{webhook.symbol}}", "exchange": "{{webhook.exchange}}",
                "action": "{{webhook.action}}", "quantity": "{{webhook.quantity}}",
                "product": "MIS", "priceType": "MARKET", "outputVariable": "ord" } },
    { "id": "done", "type": "log", "position": { "x": 0, "y": 400 },
      "data": { "message": "Placed {{ord.orderid}}", "level": "info" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "seen" },
    { "id": "e2", "source": "seen", "target": "qty" },
    { "id": "e3", "source": "qty", "sourceHandle": "true", "target": "o" },
    { "id": "e4", "source": "o", "target": "done" }
  ]
}
```

Enable the webhook from the workflow's Webhook panel, then post to the URL it
shows:

```
POST /flow/webhook/<token>
{ "secret": "<your webhook secret>",
  "symbol": "reliance", "exchange": "NSE", "action": "buy", "quantity": 10 }
```

**Every order field takes a reference, not just `symbol`.** For a long time
only `symbol` did, and that was a limit of the *form*, not the executor: a
dropdown cannot express `{{webhook.exchange}}`. The panel now puts a small
`{ }` toggle on each of these fields, swapping the picker for a text box.

| Fields that accept a `{{reference}}` |
| --- |
| `exchange`, `action`, `quantity`, `product`, `priceType`, `price`, `triggerPrice` |
| `offset`, `optionType`, `expiryType` (options nodes) |
| `positionSize` (smart order), `splitSize` (split order) |

**Key points.**

* **An order field holding exactly one whole token keeps its type.**
  `"quantity": "{{webhook.quantity}}"` against `{"quantity": 10}` reaches the
  order as the number `10`, not the string `"10"`. Surround the token with any
  other text and the whole field becomes a string, so keep order fields to a
  bare reference.
* **Enumerated fields are case-insensitive.** `"buy"`, `"Buy"` and `"BUY"` all
  resolve, so an alert does not have to shout. `symbol` is upper-cased on order
  nodes, because the symbol lookup is exact and an alert rarely controls its
  own casing: `reliance` becomes `RELIANCE`. Data nodes (`getQuote`,
  `history`, …) do **not** normalise symbol yet, so send those upper case.
* **An unresolved reference fails the node.** `{{webhook.exchagne}}` does not
  quietly fall back to NSE; the order node errors and places nothing.
* The `varCondition` guard is belt and braces for the same reason. An alert
  that omits `quantity` leaves `{{webhook.quantity}}` unresolved, and a
  `varCondition` operand that does not resolve to a number takes **neither**
  branch, so the run stops there rather than reaching the order node at all.
* **The body does not have to be declared JSON.** It is parsed as JSON
  whatever the sender's Content-Type, because the platforms posting here are
  the ones least able to set a header. Form-encoded bodies become their own
  fields. A body that is valid JSON but not an object (a list, a bare number)
  arrives as `{{webhook.message}}` plus `{{webhook.payload}}`, and anything
  else as `{{webhook.message}}` holding the raw text.
* **A secret in the payload still requires JSON.** Plain text has nowhere to
  put a `secret` field, so such a request is refused with **401** and never
  reaches the workflow. Send JSON, or switch the webhook to URL auth and pass
  `?secret=...` instead.
* `POST /flow/webhook/<token>/<symbol>` injects the trailing path segment as
  `{{webhook.symbol}}`, which is the shape ChartInk-style senders find easiest.
* The HTTP reply carries the run's own outcome. A broker rejection comes back
  with the real reason (insufficient funds, RMS block, market closed), not the
  literal string `node failed`, so the sender can alert on it. Reconcile any placement outcome before retrying; a failed response does not prove no order was sent.

---

## 12. Non-repainting 1-minute Supertrend, long and short

A complete intraday reversal system: on each 1-minute close, compare
Supertrend(5, 2) direction against the previous bar and act **only when it
changed**. Long on a flip up, short on a flip down, one order per flip, no
order at all in between.

Three things have to be right at once, and each is a place strategies usually
go wrong.

```json
{
  "name": "Supertrend 1m (5, 2) long and short",
  "nodes": [
    { "id": "node_1", "type": "start", "position": { "x": 0, "y": 0 },
      "data": { "label": "Every minute", "scheduleType": "interval", "intervalValue": 1, "intervalUnit": "minutes",
                "marketHoursOnly": true, "marketHoursStart": "09:15", "marketHoursEnd": "15:15", "marketHoursExchange": "NSE" } },
    { "id": "node_2", "type": "indicator", "position": { "x": 0, "y": 120 },
      "data": { "label": "Supertrend 1m (period 5, mult 2)", "symbol": "RELIANCE", "exchange": "NSE",
                "interval": "1m", "indicatorName": "supertrend", "source": "api",
                "lookbackBars": 200, "offsetBars": 1, "params": "{\"period\": 5, \"multiplier\": 2}",
                "outputVariable": "st" } },
    { "id": "node_3", "type": "log", "position": { "x": 0, "y": 240 },
      "data": { "label": "Signal bars", "level": "info",
                "message": "supertrend on close: this={{st.latest.out1}} prev={{st.previous.out1}} line={{st.latest.out0}} bars={{st.bars_used}}" } },
    { "id": "node_4", "type": "varCondition", "position": { "x": 0, "y": 360 },
      "data": { "label": "Direction changed?", "leftValue": "{{st.latest.out1}}", "operator": "!=", "rightValue": "{{st.previous.out1}}" } },
    { "id": "node_5", "type": "varCondition", "position": { "x": 0, "y": 480 },
      "data": { "label": "Flipped to uptrend?", "leftValue": "{{st.latest.out1}}", "operator": "<", "rightValue": "0" } },
    { "id": "node_6", "type": "smartOrder", "position": { "x": -190, "y": 610 },
      "data": { "label": "Reverse to long 1", "symbol": "RELIANCE", "exchange": "NSE", "action": "BUY",
                "quantity": 1, "positionSize": 1, "product": "MIS", "priceType": "MARKET", "outputVariable": "longResult" } },
    { "id": "node_7", "type": "smartOrder", "position": { "x": 190, "y": 610 },
      "data": { "label": "Reverse to short 1", "symbol": "RELIANCE", "exchange": "NSE", "action": "SELL",
                "quantity": 1, "positionSize": -1, "product": "MIS", "priceType": "MARKET", "outputVariable": "shortResult" } }
  ],
  "edges": [
    { "id": "e1", "source": "node_1", "target": "node_2" },
    { "id": "e2", "source": "node_2", "target": "node_3" },
    { "id": "e3", "source": "node_3", "target": "node_4" },
    { "id": "e4", "source": "node_4", "sourceHandle": "true", "target": "node_5" },
    { "id": "e5", "source": "node_5", "sourceHandle": "true", "target": "node_6" },
    { "id": "e6", "source": "node_5", "sourceHandle": "false", "target": "node_7" }
  ]
}
```

Verified output, a real flip that placed the reversing order:

```
Computing supertrend for RELIANCE (1m, 200 bars)
supertrend latest: {'out0': 1283.159073, 'out1': 1.0}
[LOG] supertrend on close: this=1.0 prev=-1.0 line=1283.159073 bars=200
Var check: 1.0 != -1.0 = True
Var check: 1.0 < 0.0 = False
Placing smart order: RELIANCE SELL
Smart order result: {'status': 'success', 'orderid': '26082826142403', 'mode': 'analyze'}
```

and the far more common case, a minute where nothing changed:

```
supertrend latest: {'out0': 1282.210482, 'out1': -1.0}
[LOG] supertrend on close: this=-1.0 prev=-1.0 line=1282.210482 bars=200
Var check: -1.0 != -1.0 = False
```

The run ends there. No broker call is made at all.

### Why it does not repaint

`{{ind.latest.*}}` is normally the bar **still forming**, and a strategy that
reads it changes its mind for the whole period. The `indicator` node does not
drop a forming bar the way `barOffset` and `priorPeriodOhlc` do, so which bar
sits at `latest` depends entirely on when the run happens.

That is what the schedule is for. An interval trigger is anchored to the
clock, not to whenever you switched the workflow on, so a 1-minute job fires
at `HH:MM:00` plus `FLOW_INTERVAL_ALIGN_OFFSET` (default **2** seconds). The
offset is not zero on purpose: firing exactly on the boundary races the bar
that is closing, and whether the feed has opened the next one changes the
answer by a whole candle.

Measured on a live instance, at `:02` past the minute the feed has **not** yet
opened the new minute's bar. So `{{st.latest.*}}` **is** the candle that just
closed and `{{st.previous.*}}` the one before it. Nothing in this workflow
reads a forming bar, and the `log` node is there to prove it, every run prints
the exact pair the conditions used.

Two settings follow from that:

* `lookbackBars: 200` is the ceiling, and Supertrend(5) needs far less, but on
  a 1-minute chart 200 bars is only a little over three hours and the extra
  history costs one fetch either way.
* `FLOW_HISTORY_CACHE_TTL` defaults to **30** seconds, which is half a
  1-minute candle. Lower it to 2 or 3 in `.env` for a 1-minute strategy, or
  two runs a minute apart can be served the same cached bars.

`offsetBars: 1` is set so `{{st.at_offset.*}}` lines up with `previous`, which
is useful while debugging. The conditions themselves do not use it.

### Why `< 0` means uptrend

Supertrend is a **tuple indicator**: `out0` is the line, `out1` is the
direction, and there is no `value` key. Its direction is **inverted** from the
usual convention:

| `{{st.latest.out1}}` | Meaning |
| --- | --- |
| `-1` | Uptrend, price above the line |
| `+1` | Downtrend, price below the line |

So "flipped to uptrend" is `{{st.latest.out1}} < 0`. Write `> 0` there, as the
usual convention would suggest, and the strategy buys every downtrend and
sells every uptrend. Nothing in the run log looks wrong while it does it.

### Why an unchanged direction places nothing

Two conditions in series, not a gate:

1. **"Direction changed?"** compares `{{st.latest.out1}}` against
   `{{st.previous.out1}}` with `!=`. Its false branch is wired to nothing, so
   a minute with no flip simply ends.
2. **"Flipped to uptrend?"** only runs on the true branch, and only decides
   *which* way the flip went.

That ordering is what keeps the broker quiet. Drop the first condition and the
second one still resolves correctly every minute, but it routes to a
`smartOrder` every minute too.

`smartOrder` then makes the reversal itself a single order. It targets an
**absolute** position, not a delta:

* `positionSize: 1` means "end up long 1", whatever you hold now. From flat it
  buys 1; from short 1 it buys 2 and is long 1 in one order.
* `positionSize: -1` means "end up short 1", symmetrically.
* If the position already matches, it places nothing and reports `Positions
  Already Matched. No Action needed.`

So even if a flip were somehow evaluated twice, the second pass would be a
no-op rather than a doubled position.

**Key points.**

* **With a non-zero `positionSize`, the node's own `action` and `quantity` do
  nothing.** Both the side and the size are derived from the gap between the
  current position and the target. They are still required fields, and they
  are still what gets used when `positionSize` is `0` and the position is
  already flat, so set them to something sane, but do not expect `action:
  "BUY"` to make the order a buy. The reversal above is a SELL precisely
  because the target is `-1`. The `Placing smart order: RELIANCE SELL` line
  echoes the node's configured action, not the computed one, so keep the two
  in agreement or the log will mislead you later.
* `positionSize` and `quantity` are both in **shares** here, as they are for
  `placeOrder`, `splitOrder` and `basketOrder`. Only `optionsOrder` and
  `optionsMultiOrder` count in lots. This workflow trades 1 share to prove the
  mechanics, not because 1 share is a position worth holding.
* `marketHoursEnd: "15:15"` leaves room to square off before the 15:30 close.
  The window narrows the clock only, it does not reopen a holiday, and the
  exchange calendar behind it is the real one.
* This has **no stop and no target**. Supertrend's own flip is the exit, which
  is the point of a reversal system, but it also means an open position rides
  through anything until the next flip or the 15:15 cut-off.
* Run it in Analyzer mode for a full session first and read the logs. Every
  minute prints the pair of directions it compared, so a mis-wired branch is
  obvious long before real money is involved.

---

## Where to go next

* [Limitations and Gotchas](limitations.md): read before trading these live
* [Indicators](indicators.md): the full 116-function reference
* [JSON Format](json-format.md): the complete import contract, field by field
* [Market Data](market-data.md): timeframes, the 200-bar ceiling, rate limits
