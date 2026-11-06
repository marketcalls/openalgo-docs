# Workflow JSON Format

Flow exports and imports a whole workflow as a single JSON object. That makes
a strategy a file: reviewable in a diff, shareable, and writable by hand or by
a generator without opening the canvas.

This page is the contract that JSON has to satisfy. It covers the envelope,
the node and edge shapes, the one-trigger rule, the handle vocabulary that
drives branching, the `{{variable}}` grammar, and what is checked at import
versus at save. Per-node fields are not repeated here, they are in the
[Node Reference](node-reference.md).

---

## The envelope

```json
{
  "name": "My Workflow",
  "description": "Optional one-line summary",
  "nodes": [],
  "edges": []
}
```

| Key | Required at import | Notes |
| --- | --- | --- |
| `name` | yes | Must be a non-empty string. The importer stores it with ` (imported)` appended. |
| `description` | no | Free text. |
| `nodes` | yes | Array. May be empty when saving, but a workflow with no nodes cannot be imported or run. |
| `edges` | yes | Array. May be empty. |
| `viewport` | no | Accepted and discarded. The importer stores only name, description, nodes and edges. |

Any other top-level shape is rejected. The import dialog checks
`name`, `Array.isArray(nodes)` and `Array.isArray(edges)` before it posts, and
the server re-checks the same thing because the endpoint is reachable
directly.

These shapes do not import:

```jsonc
{ "strategy": {}, "settings": {} }              // no name/nodes/edges
{ "workflow": { "name": "x", "nodes": [] } }    // nested one level too deep
{ "name": "x", "nodes": [ { "type": "Decision" } ] }  // invented type, no id/position/data
{ "name": "x", "nodes": [], "edges": [], }      // trailing comma, not valid JSON
```

Two different error messages, and they mean different things:

* **"Invalid workflow format. Must have name, nodes, and edges."** The text
  parsed as JSON but a required top-level key is missing or the wrong type.
* **"Invalid JSON format. Please check the workflow data."** `JSON.parse`
  itself failed. Usually smart quotes substituted by a chat client or word
  processor, a BOM or zero-width character, a trailing comma, or a real
  newline inside a string value (write `\n`, never a literal line break inside
  `"..."`). When pasting keeps failing, save the JSON to a `.json` file and
  use the file upload button in the import dialog, which bypasses the
  clipboard entirely.

There are hard size limits: 500 nodes and 1000 edges.

## Node shape

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Non-empty and unique within the workflow. Any string works. The editor writes `node_1`, `node_2`. |
| `type` | string | yes | Case-sensitive, and must be one of the values listed below. |
| `position` | `{ "x": number, "y": number }` | yes | Canvas coordinates. Both axes must be numbers. Space nodes about 100 to 200 px apart so the graph is readable. |
| `data` | object | yes | Per-node configuration. May be `{}` for a node that takes no fields. |

A minimal node:

```json
{ "id": "node_1", "type": "start", "position": { "x": 0, "y": 0 },
  "data": { "scheduleType": "daily", "time": "09:15" } }
```

Every node's `data` also accepts an optional `label` string, used only as a
display override on the canvas. Exports carry extra per-node keys such as
`measured`, `dragging` and `selected`; they are UI state and can be dropped.
Only `id`, `type`, `position` and `data` are read.

`data` keys are camelCase (`expiryType`, `triggerPrice`, `outputVariable`).
The one exception is the `expiry` node's `instrumenttype`, which is lowercase
to match the OpenAlgo REST API.

### Valid `type` values

Node types are fixed. An unrecognised one is rejected as
`unknown_node_type`, because the editor cannot render it and the executor
cannot dispatch it. Copy them verbatim:

```
Triggers   start  priceAlert  webhookTrigger  orderUpdateTrigger

Actions    placeOrder  smartOrder  optionsOrder  optionsMultiOrder
           basketOrder  splitOrder  modifyOrder  cancelOrder
           cancelAllOrders  closePositions

Conditions positionCheck  fundCheck  priceCondition  varCondition
           timeWindow  timeCondition  andGate  orGate  notGate

Data       getQuote  multiQuotes  getDepth  history  indicator
           priorPeriodOhlc  barOffset  strategyPnl  openPosition
           getOrderStatus  orderBook  tradeBook  positionBook  holdings
           funds  margin  symbol  optionSymbol  expiry  intervals
           optionChain  syntheticFuture  holidays  timings  calendar

Streaming  subscribeLtp  subscribeQuote  subscribeDepth  unsubscribe

Utility    log  telegramAlert  whatsappAlert  variable  mathExpression
           httpRequest  delay  waitUntil  group
```

## Edge shape

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Non-empty and unique. The editor writes `edge-<unix-millis>`. |
| `source` | string | yes | An existing node `id`. |
| `target` | string | yes | An existing node `id`. |
| `sourceHandle` | string or null | conditional | Which branch of a branching node this edge leaves from. See below. |
| `targetHandle` | string or null | conditional | Only gates use it: `"input-0"`, `"input-1"`, and so on. |
| `type` | string | no | UI styling hint. The editor saves `"insertable"`. Omit it. |
| `animated` | boolean | no | UI only. Omit it. |

A minimal edge:

```json
{ "id": "edge-1", "source": "node_1", "target": "node_2" }
```

An edge pointing at a node id that does not exist is rejected as
`dangling_edge`. It would render as a broken connection and silently drop
whatever branch it was meant to carry.

## Exactly one trigger

A workflow must contain exactly one trigger node, and it must be one of
`start`, `webhookTrigger`, `priceAlert` or `orderUpdateTrigger`. Every path
of execution starts there.

* No trigger is rejected as `no_trigger`.
* Two or more is rejected as `multiple_triggers`. The executor walks from the
  first trigger it finds, so the rest of the graph would never run and nothing
  would report why.

If a strategy needs two schedules, for example entries every minute and a
square-off at 14:00, express the second as a `timeWindow`-gated branch on the
same trigger, or split it into a second workflow. Splitting costs broker
calls: branches sharing one trigger also share the data nodes above them,
whereas separate workflows each re-fetch.

Trigger configuration cannot contain `{{variables}}`. A trigger is the entry
point, so there is no upstream node to resolve against.

## Branch handles

Nine node types fan out into a truthy and a falsy branch, and an edge leaving
one carries a `sourceHandle` naming which branch it is:

| Node | Handle vocabulary |
| --- | --- |
| `positionCheck`, `fundCheck`, `priceCondition`, `varCondition`, `timeWindow` | `"true"` / `"false"` |
| `andGate`, `orGate` | `"true"` / `"false"` |
| `timeCondition`, `notGate` | `"yes"` / `"no"` |
| `priceAlert` (a trigger that also branches) | `"true"` / `"false"` |

The executor treats the two vocabularies as synonyms: `{yes, true}` is the
truthy branch and `{no, false}` the falsy one. Use the vocabulary the node
itself renders so a saved graph matches the canvas.

```json
[
  { "id": "e2", "source": "cond", "sourceHandle": "true",  "target": "buy" },
  { "id": "e3", "source": "cond", "sourceHandle": "false", "target": "skip" }
]
```

Three rules the validator enforces:

* A `sourceHandle` other than `true`, `false`, `yes` or `no` on a branching
  node is rejected. The edge would never be followed and its branch would be
  silently dropped.
* A `sourceHandle` on any **non**-branching node is rejected. Those nodes
  render a single unnamed output, so a named handle points at a socket that
  does not exist.
* A `targetHandle` of the form `input-N` is only valid on `andGate` and
  `orGate`, and `N` must be less than the gate's `inputCount`. A higher slot
  is never filled, so the gate would wait for an input that can never arrive.

An edge leaving a branching node with **no** `sourceHandle` is a
pass-through: it is followed whichever way the condition went. That is how
you attach logging or alerting that should see every evaluation.

### Wiring a gate

Pin every gate input to a slot:

```json
[
  { "id": "e3", "source": "c1", "target": "gate", "targetHandle": "input-0" },
  { "id": "e4", "source": "c2", "target": "gate", "targetHandle": "input-1" }
]
```

A wire into a gate carries the source condition's **value**, not control
flow. The gate reads each input's stored boolean, so both `True` and `False`
reach it and the gate's own `false` branch works. This holds whether or not
the edge also carries a `sourceHandle`, but pass-through wiring
(`targetHandle` only) is what the behaviour reads as, so prefer it.

A gate fires exactly once per run, after every wired input has been
evaluated. Until then it logs and returns:

```
andGate: waiting for 1 more input(s) before evaluating
```

Two failure modes are deliberate rather than silent:

* A gate configured for more inputs than are wired **errors** instead of
  evaluating on part of the condition. Deleting the third edge of a
  three-input AND used to downgrade it to a two-input AND with the canvas
  still showing three slots.
* An input condition that **errored** has no trustworthy boolean, so it is not
  recorded at all. The gate stays pending and nothing below it fires. It is
  not treated as `False`, which would have driven the gate's FALSE branch into
  a real order.

## Variable interpolation

Any string field in any node's `data` may contain `{{path}}` references.
There are three sources: variables an upstream node produced, the webhook
payload, and the built-ins.

### Output variables

Most data and action nodes accept an `outputVariable`. Set it and the node's
whole result is stored under that name for every downstream node to read.

```json
{ "id": "n2", "type": "getQuote", "position": { "x": 0, "y": 100 },
  "data": { "symbol": "RELIANCE", "exchange": "NSE", "outputVariable": "q" } }
```

Downstream: `{{q.data.ltp}}`, `{{q.data.open}}`, `{{q.data.prev_close}}`.

Data nodes ship with a default name (`orders`, `trades`, `positions`,
`holdings`, `funds`, `quotes`, `response`, `ind`, and so on). Set your own
whenever two nodes of the same type would collide. Leave it blank and the node
still runs, but nothing downstream can read its result. Each node's exact
output shape is in the [Node Reference](node-reference.md).

### Webhook payload

When the trigger is a `webhookTrigger`, the request body is exposed as
`{{webhook.<key>}}`. A TradingView alert posting
`{"symbol": "RELIANCE", "action": "BUY", "qty": 10}` gives
`{{webhook.symbol}}`, `{{webhook.action}}` and `{{webhook.qty}}`.

The body is parsed as JSON whatever `Content-Type` the sender declared,
because the platforms posting here are the ones least able to set a header:

| Body | Becomes |
| --- | --- |
| JSON object, any declared content type | its own keys |
| Form-encoded | its own fields |
| JSON that is not an object (a list, a bare number) | `{{webhook.message}}` plus `{{webhook.payload}}` |
| Anything else | `{{webhook.message}}` holding the raw text |

A secret carried in the payload still requires JSON: plain text has nowhere to
put one, so such a request is refused with 401 and never reaches the workflow.
Send JSON, or switch the webhook to URL auth and pass `?secret=...`.

The `webhookTrigger` node itself carries no instrument. It has only `label`.
Everything the workflow acts on arrives in the request.

The `orderUpdateTrigger` uses the same namespace for the event that fired it:
`{{webhook.orderid}}`, `{{webhook.symbol}}`, `{{webhook.order_status}}`,
`{{webhook.filled_quantity}}`, `{{webhook.average_price}}`,
`{{webhook.rejection_reason}}`.

### Built-in variables

Always available, resolved from the executor clock at the moment the node
fires:

| Token | Example |
| --- | --- |
| `{{timestamp}}` | `2026-04-29 09:15:42` |
| `{{iso_timestamp}}` | `2026-04-29T09:15:42.123456` |
| `{{date}}` | `2026-04-29` |
| `{{time}}` | `09:15:42` |
| `{{year}}` | `2026` |
| `{{month}}` | `04` |
| `{{day}}` | `29` |
| `{{hour}}` | `09` |
| `{{minute}}` | `15` |
| `{{second}}` | `42` |
| `{{weekday}}` | `Wednesday` |

Plus the calendar built-ins: `{{weekday_num}}` (1 = Monday, for numeric
comparison, since `{{weekday}}` is a name), `{{quarter}}`, `{{week_of_year}}`,
`{{day_of_year}}`, and `{{session_date}}` (the trading session date, which
differs from `{{date}}` between midnight and the 03:00 IST rollover).

A built-in resolves only when it is the whole token. `{{date}}` is the date;
`{{date.something}}` is a variable path that will not resolve.

For "has a new day, week, month or quarter started", use the `calendar` node
rather than comparing these. It accounts for weekends and exchange holidays,
which a `{{day}} == 1` test does not.

### Path grammar

| Form | Example |
| --- | --- |
| Dotted keys | `{{order.data.orderid}}` |
| Bracketed index | `{{expiries.data[0]}}` |
| Combined | `{{chain.data.results[0].ce.ltp}}` |

Indices must be positive. `[-1]` is read as a dictionary key named `-1` and
will not resolve, so count from the front.

### Exactly one whole token keeps its type

A field holding exactly one whole `{{token}}` and nothing else resolves to the
stored object itself, not to its text. Against a payload of
`{"quantity": 10}`:

```json
{"quantity": "{{webhook.quantity}}"}
```

arrives as the number `10`, not the string `"10"`. The same rule is what lets
a whole list or object be handed from one node to another without a lossy
round-trip through `str()`.

A field that mixes a token with any other text always resolves to a string, so
`"qty is {{webhook.quantity}}"` is text. Built-ins are always text.

### Every order field takes a reference

There is no field on an order node that has to be a literal. The editor shows
a picker by default and a `{ }` toggle swaps it for a text box, but the stored
value is the same either way: a dropdown field holding
`{{webhook.exchange}}` is just a string, and the executor interpolates it like
any other.

| Field | The reference must resolve to |
| --- | --- |
| `exchange` | `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`, `NCDEX`, `NCO` |
| `action` | `BUY` or `SELL` |
| `quantity`, `splitSize`, `positionSize` | a whole number |
| `product` | `CNC`, `NRML`, `MIS` |
| `priceType` | `MARKET`, `LIMIT`, `SL`, `SL-M` |
| `price`, `triggerPrice` | a number, read only for the price types that use them |
| `optionType` | `CE` or `PE` |
| `offset` | `ATM`, `ITM1` to `ITM50`, `OTM1` to `OTM50` |
| `expiryType` | a relative type, or a `DDMMMYY` date such as `28OCT25` |

Enumerated fields are matched case-insensitively, so a payload carrying
`"action": "buy"` is accepted. `symbol` is upper-cased on order nodes,
because the symbol lookup is exact and an alert does not control its own
casing. Data nodes (`getQuote`, `history`, and the rest) do not normalise
symbol, so send those an upper-case one.

### Unresolved references

If a path does not resolve, the literal `{{...}}` text is passed through and
the workflow keeps going. That is deliberate: it makes a typo visible in the
execution log rather than crashing a live strategy. Read the log after the
first run.

There are two exceptions, both because a wrong value there routes a branch or
places a trade.

**`varCondition`** refuses to evaluate when either operand does not resolve to
a number. It takes neither branch rather than treating the text as zero.

**Order nodes fail** rather than falling back to a field default. A numeric
field cannot parse `{{webhook.qty}}`, so it used to take the default of `1`,
and an unresolved `priceType` fell through the broker mapping to `MARKET`: a
webhook that simply omitted a key placed a successful order for the wrong size
at the wrong price type, with nothing in the run to say so. Now the node
fails, the run is marked `failed`, and nothing downstream of it executes.

This check covers `placeOrder`, `smartOrder`, `optionsOrder`,
`optionsMultiOrder`, `basketOrder`, `splitOrder`, `modifyOrder`,
`cancelOrder` and `closePositions`, on these order-critical fields:

```
symbol  exchange  action  quantity  product  priceType  pricetype
price  triggerPrice  splitSize  positionSize  underlying  strike
optionType  expiryDate  orderId  newQuantity  newPrice
newTriggerPrice  orders  legs
```

Label fields are exempt on purpose: `strategy`, `strategyTag` and
`outputVariable` still pass an unresolved reference through as text.

When a webhook may legitimately omit a value, give the node a literal instead
of a variable, or branch on a condition node first.

## What is validated, and when

Validation runs at two levels, because the editor saves continuously while a
graph is still being wired.

**Always checked (structure).** A graph failing these cannot be rendered,
however unfinished the work is:

* top-level `nodes` and `edges` are arrays, within the 500 node / 1000 edge caps
* every node has a unique non-empty `id`, a known `type`, a numeric
  `position.x` / `position.y`, and a `data` object
* every edge has a unique non-empty `id` and `source` / `target` ids that
  exist
* `sourceHandle` and `targetHandle` name a handle the node actually renders

**Value checks also run at every level**, not only the strict one, because a
field holding an invalid constant is wrong however incomplete the graph is:

* `exchange`, `action`, `product` and `priceType` must be real order constants
  (case-insensitive). Several broker mappers substitute a default for an
  unrecognised value rather than refusing it, so `"LIMT"` would have become a
  MARKET order.
* `quantity` and `splitSize` must be positive numbers, except that
  `smartOrder.quantity` may be zero when `positionSize` drives the target
  position.
* `httpRequest` `headers` must be a JSON object (as an object or as a string
  holding one), and `timeout` must be between 1000 and 60000 milliseconds.

A value containing `{{...}}` is skipped by these checks, because it is only
knowable at run time. Order nodes check it separately, immediately before the
broker call.

**Strict only (completeness).** Enforced at import, at Replace from JSON, at
activation, on Run Now, and on every trigger that reaches the executor.
Skipped on save so a half-built graph stays savable:

* every node has the fields it cannot execute without (for example
  `placeOrder` needs `symbol`, `exchange`, `action` and `quantity`;
  `positionCheck` needs `symbol`, `exchange` and `condition`; `fundCheck`
  needs `minAvailable`, or the legacy `threshold` an older export carries)
* exactly one trigger
* no cycles: the executor caps depth and visits rather than detecting a loop,
  so a cycle burns the budget and truncates the run instead of reporting
  anything
* every node reachable from the trigger. A node the trigger cannot reach never
  runs and nothing at run time says so. `group` nodes are exempt, they are
  visual containers.

Because completeness is re-checked at execution and not only at activation, a
workflow edited into an invalid state after it was activated is stopped rather
than run.

## Worked examples

All three examples below import as they stand.

### Scheduled entry with a guard

Every weekday at 09:20 IST, buy 10 RELIANCE if there is no existing position,
and log the skip if there is. This is the shape of most strategies: trigger,
guard, two branches.

```json
{
  "name": "Daily RELIANCE Buy",
  "description": "Buy 10 RELIANCE at 09:20 unless a position already exists",
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "scheduleType": "daily",
        "time": "09:20",
        "days": [0, 1, 2, 3, 4],
        "marketHoursOnly": true,
        "marketHoursExchange": "NSE"
      }
    },
    {
      "id": "node_2",
      "type": "positionCheck",
      "position": { "x": 100, "y": 220 },
      "data": {
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "product": "MIS",
        "condition": "not_exists"
      }
    },
    {
      "id": "node_3",
      "type": "placeOrder",
      "position": { "x": 0, "y": 340 },
      "data": {
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "action": "BUY",
        "quantity": 10,
        "priceType": "MARKET",
        "product": "MIS",
        "outputVariable": "buyOrder"
      }
    },
    {
      "id": "node_4",
      "type": "log",
      "position": { "x": 260, "y": 340 },
      "data": { "message": "Skipped: RELIANCE position already open", "level": "info" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "node_1", "target": "node_2" },
    { "id": "e2", "source": "node_2", "sourceHandle": "true", "target": "node_3" },
    { "id": "e3", "source": "node_2", "sourceHandle": "false", "target": "node_4" }
  ]
}
```

### Webhook driving every order field

TradingView posts
`{"symbol": "RELIANCE", "exchange": "NSE", "action": "BUY", "qty": 10}`.
Nothing about the instrument is configured on the node: symbol, exchange,
action and quantity all come from the payload. Because each of those fields
holds exactly one whole token, `qty` arrives as the number `10`. If the alert
omits any of them the order node fails rather than substituting a default.

```json
{
  "name": "TradingView Passthrough Order",
  "description": "Place an order entirely from the alert payload, then audit it",
  "nodes": [
    {
      "id": "node_1",
      "type": "webhookTrigger",
      "position": { "x": 100, "y": 80 },
      "data": { "label": "TradingView Alert" }
    },
    {
      "id": "node_2",
      "type": "placeOrder",
      "position": { "x": 0, "y": 220 },
      "data": {
        "symbol": "{{webhook.symbol}}",
        "exchange": "{{webhook.exchange}}",
        "action": "{{webhook.action}}",
        "quantity": "{{webhook.qty}}",
        "priceType": "MARKET",
        "product": "MIS",
        "outputVariable": "ord"
      }
    },
    {
      "id": "node_3",
      "type": "telegramAlert",
      "position": { "x": 260, "y": 220 },
      "data": {
        "message": "{{webhook.action}} {{webhook.qty}} {{webhook.symbol}} -> order {{ord.orderid}} at {{time}} IST"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "node_1", "target": "node_2" },
    { "id": "e2", "source": "node_2", "target": "node_3" }
  ]
}
```

The webhook URL and secret are minted by the server when the workflow is
saved. You cannot hand-write them: import first, then copy the URL from the
trigger's config panel.

### Two conditions into an AND gate

Buy only when the clock is inside the window **and** the price is above a
level. The gate has `inputCount: 2` and both edges pin their slot.

```json
{
  "name": "RELIANCE Long Above 1500 in Window",
  "nodes": [
    { "id": "n1", "type": "start", "position": { "x": 200, "y": 20 },
      "data": { "scheduleType": "interval", "intervalValue": 1, "intervalUnit": "minutes", "marketHoursOnly": true } },
    { "id": "n2", "type": "timeWindow", "position": { "x": 0, "y": 150 },
      "data": { "startTime": "09:30", "endTime": "14:30", "invertCondition": false } },
    { "id": "n3", "type": "priceCondition", "position": { "x": 300, "y": 150 },
      "data": { "symbol": "RELIANCE", "exchange": "NSE", "field": "ltp", "operator": ">", "value": 1500 } },
    { "id": "n4", "type": "andGate", "position": { "x": 150, "y": 280 },
      "data": { "inputCount": 2 } },
    { "id": "n5", "type": "placeOrder", "position": { "x": 150, "y": 400 },
      "data": { "symbol": "RELIANCE", "exchange": "NSE", "action": "BUY", "quantity": 1,
                "priceType": "MARKET", "product": "MIS", "outputVariable": "ord" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n1", "target": "n3" },
    { "id": "e3", "source": "n2", "target": "n4", "targetHandle": "input-0" },
    { "id": "e4", "source": "n3", "target": "n4", "targetHandle": "input-1" },
    { "id": "e5", "source": "n4", "sourceHandle": "true", "target": "n5" }
  ]
}
```

## A `data` key nothing reads is ignored

This is the trap worth its own callout. Flow does not reject unknown keys in
a node's `data`. Writing `strikeOffset` where the field is `offset` imports
cleanly, runs successfully, and silently uses the default. Nothing in the run
record says so.

The same applies to a misspelled `outputVariable`, which leaves every
downstream `{{name.field}}` unresolved and passed through as literal text.

The repository ships a checker that catches both, so a workflow can be
verified before it is imported:

```
uv run python .claude/skills/flow-builder/validate.py my_workflow.json
```

It runs the importer's own validator (imported directly, so it can never
disagree with what the server accepts) and then adds three checks the
importer deliberately does not make, because they are near-certain mistakes
rather than structural errors:

* a `data` key no executor reads
* a `{{reference}}` on an order field whose path nothing in the graph produces
* an order node with no path back to the trigger

Exit code 0 means it will import.

## Updating a workflow that already exists

**Import always creates a new workflow.** That is right for sharing, but
iterating on your own strategy that way leaves copies behind and changes the
webhook URL every time.

To replace an existing workflow's graph in place, keeping its id, its
`/flow/editor/<id>` URL, its webhook token and secret, its stored API key and
its active state:

* **In the editor**, the workflow menu, **Replace from JSON**. Paste or upload
  a file.
* **From a terminal**,
  `uv run python scripts/update_flow_workflow.py --id <id> --file strategy.json`
  (add `--dry-run` to see what would change first).
* **Over HTTP**, `POST /flow/api/workflows/<id>/replace` with the same body an
  import takes.

All three apply the strict rules on this page, so a graph that would be
rejected at import cannot be written through a side door. Legacy fields from
an older export are upgraded on the way in, and the response lists what was
changed.

Node edits apply from the next run, because the graph is re-read every time.
The **trigger** is different: its schedule and any price or order watch are
registered at activation. Change the trigger on an active workflow and it is
re-armed during the save; if that fails the workflow is deactivated rather
than left running a stale registration, and the response carries
`needs_reactivate: true`.

## See also

* [Concepts and Execution Model](concepts.md) for how a run proceeds once the
  JSON is imported
* [Node Reference](node-reference.md) for every node's fields and output shape
* [Limitations and Gotchas](limitations.md) before going live
