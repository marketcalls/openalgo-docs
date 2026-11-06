# Concepts and Execution Model

Understanding how a run actually proceeds is the difference between a
strategy that fires once and one that fires twice.

## Nodes, edges, handles

A workflow is a set of **nodes** joined by **edges**. Every node has an `id`,
a `type`, a canvas `position`, and a `data` object holding its configuration.

```json
{ "id": "n2", "type": "getQuote", "position": { "x": 0, "y": 100 },
  "data": { "symbol": "RELIANCE", "exchange": "NSE", "outputVariable": "q" } }
```

Edges connect a `source` node to a `target` node:

```json
{ "id": "e1", "source": "n1", "target": "n2" }
```

The complete contract for that JSON, every required key, what is validated
and when, and copy-pasteable workflows, is in the
[Workflow JSON Format](json-format.md).

Condition nodes have **two output handles**. An edge leaving one carries a
`sourceHandle`:

```json
[
  { "id": "e2", "source": "cond", "sourceHandle": "true",  "target": "buy" },
  { "id": "e3", "source": "cond", "sourceHandle": "false", "target": "skip" }
]
```

An edge from a condition **without** a `sourceHandle` is a *pass-through*:
it is followed no matter which way the condition went. This is how you attach
logging or alerting that should see every evaluation.

> Handle vocabulary differs by node: `positionCheck`, `fundCheck`,
> `priceCondition`, `timeWindow`, `varCondition`, `andGate`, `orGate` and
> `priceAlert` use `"true"`/`"false"`, while `timeCondition` and `notGate` use
> `"yes"`/`"no"`. The executor treats them as synonyms, but match the node's
> own vocabulary so saved graphs read cleanly. A `sourceHandle` on any other
> node type is rejected: those nodes emit a single unnamed output, so a named
> handle points at a socket that does not exist.

## Variables and interpolation

Most data nodes accept an `outputVariable`. Set it, and the node's whole
result is stored under that name for every downstream node to read with
`{{...}}`.

```json
{ "type": "getQuote", "data": { "symbol": "RELIANCE", "exchange": "NSE", "outputVariable": "q" } }
```

Downstream: `{{q.data.ltp}}`, `{{q.data.open}}`, `{{q.data.prev_close}}`.

Path syntax:

| Form | Example |
| --- | --- |
| Nested keys | `{{order.data.orderid}}` |
| Array index (positive only) | `{{expiries.data[0]}}` |
| Combined | `{{chain.data.results[0].ce.ltp}}` |

Built-ins are always available:

| Variable | Example | Notes |
| --- | --- | --- |
| `{{date}}` | `2026-07-30` | Server calendar date |
| `{{session_date}}` | `2026-07-30` | Trading session date. Differs from `{{date}}` between midnight and the 03:00 IST rollover. |
| `{{time}}`, `{{timestamp}}`, `{{iso_timestamp}}` | | |
| `{{hour}}`, `{{minute}}`, `{{second}}` | | |
| `{{day}}`, `{{month}}`, `{{year}}` | | |
| `{{weekday}}` | `Thursday` | A name, so it cannot be compared numerically |
| `{{weekday_num}}` | `4` | 1 = Monday. Use this in a condition. |
| `{{quarter}}` | `3` | 1 through 4 |
| `{{week_of_year}}`, `{{day_of_year}}` | `31`, `211` | ISO week, day of year |

For "has a new day, week, month or quarter started", use the
[`calendar` node](node-reference.md) rather than comparing these, it accounts
for weekends and exchange holidays, which a `{{day}} == 1` test does not.

**If a path does not resolve, the literal `{{...}}` text is passed through.**
The workflow does not stop. This is deliberate, it makes typos visible in
the execution log rather than crashing a live strategy, but it means you
should read your logs after the first run.

Two places refuse that leniency, because a wrong value there routes a branch
or places a trade:

- A `varCondition` whose operand does not resolve to a number refuses to
  evaluate rather than treating the text as zero, and takes neither branch.
- An **order node** fails outright when one of its order-defining fields still
  holds an unresolved reference, rather than falling back to a field default.
  A missing `{{webhook.qty}}` used to become quantity `1`, and an unresolved
  `priceType` used to fall through to `MARKET`. The full list of protected
  fields is in [Workflow JSON Format](json-format.md).

## Execution order

A run starts at the single trigger node and walks the graph **depth-first**,
following each outgoing edge in order. Nodes within one run do not execute in parallel: one finishes before the next begins. A schedule can trigger a run, and gthread can move longer-wait executions off the triggering HTTP request without changing their sequential traversal.

Three consequences matter:

**1. Order of nodes is the order you wire them.** If a `varCondition` reads
`{{rsi.latest.value}}`, the `indicator` node producing `rsi` must be an
*ancestor*, not a sibling.

**2. Logic gates wait, then fire once.** An `andGate` with two inputs is
reached first by whichever input finishes first. The gate detects that its
other input has not been evaluated yet and skips, leaving a log line:

```
andGate: waiting for 1 more input(s) before evaluating
```

When the second input completes, its traversal reaches the gate again, now
with a full set, and the gate evaluates exactly once:

```
AND Gate: [True, True] -> True
```

**3. A condition also evaluates once per run.** A condition node is
combinational in exactly the same way a gate is, so it is evaluated the first
time the walk reaches it and its result is reused afterwards. Reachable by two
paths, a condition used to run twice and follow its branch each time, so a
diamond placed two orders from a single trigger. The second traversal now
returns immediately, which skips nothing: the branch was already followed.

## Wiring gates correctly

**A wire into a gate carries a value, not control flow.** The gate reads each
input's stored boolean, so a `False` condition reaches it exactly as a `True`
one does and the gate's own `false` branch works. Pass-through wiring is the
clearest way to say that:

```json
[
  { "id": "e3", "source": "c1", "target": "gate", "targetHandle": "input-0" },
  { "id": "e4", "source": "c2", "target": "gate", "targetHandle": "input-1" }
]
```

An edge that also carries `sourceHandle: "true"` behaves the same way when its
target is a gate, so an older graph wired that way is not broken. Prefer the
pass-through form anyway: it reads as what the executor does, and it makes the
difference from a real branch edge obvious.

Always pin gate inputs with `targetHandle: "input-0"`, `"input-1"`, and so on
up to `inputCount - 1`. A slot number the gate does not have is rejected at
import, because the gate would wait for an input that can never arrive.

Two things stop a gate answering on a partial picture:

**`inputCount` is enforced.** A gate configured for three inputs and wired for
two errors rather than evaluating on part of the condition. Deleting one edge
of a three-input AND used to silently downgrade it to a two-input AND, with
the canvas still showing three slots.

**An errored input leaves the gate pending.** A condition that could not be
evaluated has no trustworthy result, so nothing is recorded for it and the
gate never fires. It is not read as `False`. Previously an AND gate saw that
placeholder `False`, computed a result, and drove its FALSE branch into a real
order before the run was marked failed.

## A node that cannot get an answer does not invent one

`priceCondition`, `positionCheck` and `fundCheck` never checked whether the
broker read succeeded, so a failed lookup gave `ltp = 0.0` or a zero-quantity
position and the node still reported success. "If LTP < 100 then BUY" fired on
an expired session, and a `positionCheck` with no symbol answered `not_exists`
unconditionally, opening the gate it was there to guard.

They now **error and take neither branch** when the read fails, and a
condition node whose `field`, `operator` or `condition` is not one it
recognises does the same. `false` is a real answer that routes the graph down
the false path, which is not what "the check never ran" means.

| Situation | What happens |
| --- | --- |
| A condition's broker read fails | The node errors and takes neither branch. Pass-through edges still run, so the failure is visible. |
| A condition cannot be evaluated | Neither branch, and any gate wired to it stays pending. |
| A gate has fewer edges wired than `inputCount` | It errors instead of evaluating. |
| An order field holds an unresolved `{{reference}}` | The node fails before the broker call. |
| Any node returns an error | Its branch stops, and the run is recorded as `failed`. |

The message is the broker's or the service's own text, insufficient funds, RMS
blocked, symbol not found, in the run record and in the webhook reply. Every
broker rejection used to surface as the literal string `node failed`.

## Triggers

A workflow must contain exactly one trigger, and it must be one of:

| Trigger | Fires when |
| --- | --- |
| `start` | A schedule elapses (`once`, `daily`, `weekly`, `interval`) |
| `webhookTrigger` | An external system POSTs to the workflow's webhook URL |
| `priceAlert` | A polled LTP condition is met (one-shot by default) |
| `orderUpdateTrigger` | A matching order changes status (fill, reject, cancel) |

**Strict validation rejects a second trigger** with a `multiple_triggers`
error, so **Run Now**, activation, and import all refuse the graph. A
partially edited workflow can still be saved with two triggers, and if one
ever reached the executor it would walk from the first trigger it found and
silently skip the second and everything downstream of it. If part of your
graph mysteriously never executes, count the triggers first.

Because one trigger drives the whole graph, every branch shares the data nodes
above it. That is also the cheapest layout: one `getQuote` feeding six
branches is one broker call, whereas six separate workflows make six. Quotes
and the order book are not cached, so the split layout is what trips a rate
limit first.

Triggers are entry points, so **their configuration cannot reference
`{{variables}}`**: there is no upstream node to resolve against. The
`orderUpdateTrigger` rejects an interpolated Order ID with a clear 400 rather
than storing a placeholder that could never match.

`marketHoursOnly: true` on a `start` node pauses the schedule outside the
trading session. No time is hardcoded: the window comes from OpenAlgo's own
exchange calendar, so weekends, trading holidays, muhurat and other special
sessions, and per-exchange hours are all inherited. MCX running to 23:55 and
CRYPTO never closing are handled correctly.

Three optional fields on the same node narrow or move that window:

| Field | Effect |
| --- | --- |
| `marketHoursExchange` | Which calendar to consult (default NSE) |
| `marketHoursStart` | `HH:MM` IST override for the session start |
| `marketHoursEnd` | `HH:MM` IST override for the session end |

An override changes the clock, never the calendar: a day the exchange is shut
stays shut. These fields are re-read from the graph on every run, so editing
them takes effect immediately without a deactivate/reactivate cycle. The
trigger's own schedule still needs a reactivation when it changes.

## Interval schedules are anchored to the clock

An `interval` schedule fires on the next clock boundary the interval divides
into, not on a phase set by whenever you switched the workflow on. A 5-minute
job lands on :00, :05, :10, and stays there across restarts. It used to count
from activation time, so "every minute" ran at 11:34:41, 11:35:41, and the
phase changed every time the process came back.

That phase decides real outcomes for anything reading bars: whether the candle
a strategy wants to compare has closed yet is a whole-candle difference.

Runs land a small offset past the boundary, `FLOW_INTERVAL_ALIGN_OFFSET`,
2 seconds by default. Not zero: firing exactly on the boundary races the bar
that is closing, and whether the feed has opened the next one changes the
answer. Sub-minute intervals are left unaligned, there is no meaningful
boundary to align a 10-second job to.

The indicator and history nodes reuse a fetch for `FLOW_HISTORY_CACHE_TTL`
seconds, 30 by default. That is under a 5-minute candle but half of a
1-minute one, so lower it for a 1-minute strategy or the run can act on the
previous bar.

## Streaming subscriptions end with the workflow

A `subscribeLtp` / `subscribeQuote` / `subscribeDepth` node opens a
broker-side subscription against a process-wide WebSocket client, so one left
behind is held for the life of the worker and counts against the per-broker
symbol ceiling that `/trading` and the Sandbox engine share.

**Deactivating or deleting a workflow gives back everything it opened.** You
do not need an `unsubscribe` node for cleanup, only to drop a stream part way
through a run.

`unsubscribe` requires a `symbol` unless `streamType` is `all`. A specific
mode with no symbol is refused, because the underlying call would clear every
subscription on the instance, including the ones the Sandbox engine uses to
trigger pending SL and LIMIT orders.

## Execution limits

| Limit | Value |
| --- | --- |
| Max node depth | 100 |
| Max node visits per run | 500 |
| Concurrent runs of one workflow | 1 (a second trigger returns `already_running`) |
| Max bars per history fetch | 200 (see [Market Data](market-data.md)) |


## Editing a workflow as JSON

The editor exports and re-imports JSON, which is how a strategy can be authored
or reviewed as a file, or generated by an AI from the import spec. The full
contract, the envelope, the node and edge shapes, the interpolation grammar and
worked examples, is in [Workflow JSON Format](json-format.md).

**Import always creates a new workflow.** That is deliberate for sharing, but it
means iterating on your own strategy would leave copies behind and change the
webhook URL every time.

To update a workflow you already have, use **Replace from JSON** in the workflow
menu. It swaps the nodes and edges in place and keeps:

- the workflow id and its `/flow/editor/<id>` URL
- the webhook token and secret, so anything posting to it keeps working
- the active state and the stored API key

It is validated exactly like Import: an incomplete graph is rejected with the
reason rather than saved to fail later, and legacy fields from an older export
are upgraded on the way in.

One thing to watch: node edits apply from the next run, because the graph is
re-read every time. The **trigger** is different - its schedule and any price or
order watch are registered when you activate. A normal Save attempts to register the changed trigger again; a failure deactivates the workflow rather than preserving a stale registration. After Replace from JSON, follow any `needs_reactivate` message and deactivate/reactivate as instructed.

For scripted use there is also
`scripts/update_flow_workflow.py --id <id> --file strategy.json`, with
`--dry-run` to preview.

A workflow can be checked before it is imported. Flow ignores a `data` key
nothing reads, so `strikeOffset` where the field is `offset` imports cleanly,
runs successfully, and silently uses the default. The repository ships a
checker that catches that and a few related near-certain mistakes, see
[Workflow JSON Format](json-format.md).


## Results, Approval and Unclear Sends

Run Now executes in the current Live/Analyze mode. The editor saves dirty changes before Run Now or Activate; it does not knowingly execute an older saved graph behind unsaved quantity changes. A save failure prevents the action.

A placement's success can mean broker acceptance or Action Center queueing, not a fill. A timeout or lost broker response can occur after acceptance. Reconcile orders, trades and positions before sending any replacement. See [Action Center](../new-features/action-center.md) for Sending, Status unclear and recorded-rejected caveats, and [Limitations](limitations.md#delay-is-capped-at-300-seconds-waituntil-at-30-minutes) for gthread's accepted background runs.
