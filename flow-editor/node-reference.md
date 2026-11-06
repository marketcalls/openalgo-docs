# Node Reference

Every node type Flow provides, 61 in total, with its configuration fields,
what it writes to its output variable, and the traps specific to it.

Fields marked **required** must be set or the node fails at run time. Every
data node takes an `outputVariable`; if you leave it blank the node still runs
but nothing downstream can read it.

Text fields accept `{{variable}}` interpolation. **Trigger fields do not**:
a trigger is registered with the scheduler or a monitor at activation, before
anything has been computed, so a `{{reference}}` there has nothing to resolve
against.

**Flow ignores a `data` key that nothing reads.** Writing `strikeOffset` where
the field is `offset` imports cleanly, runs successfully, and silently uses the
default; nothing in the run record says so. Check field names against the
tables below, and validate a hand-written workflow before importing it rather
than after.

---

## Triggers

A workflow must have exactly **one** trigger, and there are exactly four:
`start`, `priceAlert`, `webhookTrigger`, and `orderUpdateTrigger`. A second
trigger is rejected by strict validation with a `multiple_triggers` error, so
**Run Now**, activation, and import all refuse the graph. See
[Concepts](concepts.md#triggers).

### `start`: Schedule

| Field | Values | Notes |
| --- | --- | --- |
| `scheduleType` | `once`, `daily`, `weekly`, `interval`, `manual` | Required. `manual` registers no job at all. The panel offers the first four. |
| `time` | `"HH:MM"` | For `daily` and `weekly`. |
| `days` | `[0,1,2,3,4]` | For `weekly`. **0 = Monday**, 6 = Sunday. |
| `executeAt` | date | For `once`. The editor writes a bare `YYYY-MM-DD`, so a `once` schedule fires at midnight and the panel's Time box does not apply to it. |
| `intervalValue` + `intervalUnit` | number + `seconds` / `minutes` / `hours` | For `interval`. |
| `marketHoursOnly` | boolean, default `true` on a new node | Gates runs to the trading session below. |
| `marketHoursStart` | `"HH:MM"`, default `09:15` | Start of the window. |
| `marketHoursEnd` | `"HH:MM"`, default `15:15` | End of the window. `15:15` leaves room to square off before a 15:30 close. |
| `marketHoursExchange` | exchange code, default `NSE` | Which exchange calendar the window is measured against. |

`intervalMinutes` appears in older exports and is read by nothing. A workflow
relying on it schedules at the default of one minute.

**The window narrows the exchange's own session, it never reopens it.** The
day is resolved through the platform's market calendar, so a weekend, a
trading holiday, or a day the exchange is otherwise shut stays shut whatever
`marketHoursStart` and `marketHoursEnd` say. A workflow cannot configure its
way into trading on Diwali. Within a day the exchange is open, the two times
narrow or widen the clock only.

Set `marketHoursExchange` to what you actually trade. The calendar knows MCX
runs to 23:55 and that CRYPTO never closes; a workflow left on `NSE` inherits
equity hours and stops firing at the equity close.

All four fields are read from the workflow graph on **every run**, so editing
the window applies from the next run without deactivating and reactivating.

**A `start` node saved before these fields existed carries no `marketHoursOnly`
key, and an absent key is read as off.** The panel renders the switch as on in
that case, so the editor and the run disagree. Toggle the switch off and on,
then save, to store the key explicitly.

An `interval` schedule is **anchored to the clock, not to activation**. A
5-minute job lands on :00, :05, :10 whenever the workflow happened to be
switched on, plus a small offset (`FLOW_INTERVAL_ALIGN_OFFSET`, default 2
seconds). The offset is not zero on purpose: firing exactly on the boundary
races the bar that is closing, and whether the feed has opened the next one
changes the answer by a whole candle. Sub-minute intervals are left unaligned,
because there is no meaningful boundary to align to.

Jobs persist in the `flow_apscheduler_jobs` table and survive restarts. The
scheduler uses the server process local timezone for cron and date triggers;
only the market-hours gate is explicitly IST, so run OpenAlgo with the host
clock set to IST.

Overlapping runs are **dropped, not deferred**. The job defaults are
`coalesce: true`, `max_instances: 1`, and a 60-second misfire grace, and
`execute_workflow` takes the per-workflow lock without blocking and returns
`already_running`. A tick that arrives during a slow run is lost.

### `priceAlert`: Price Alert

| Field | Values | Notes |
| --- | --- | --- |
| `symbol`, `exchange` | | Required. |
| `condition` | see below | 13 canonical values. Required. |
| `price` | number | The level to watch. Required for the level and crossing conditions. |
| `priceLower` + `priceUpper` | number | Required for the four channel conditions. `priceLower` must be below `priceUpper`. |
| `percentage` | number | Required for `moving_up_percent` / `moving_down_percent`. |
| `trigger` | `once`, `every_time` | Default `once`. |
| `expiration` | `none`, `1h`, `4h`, `1d`, `1w` | Retires the alert after this window. |

The 13 conditions the monitor evaluates:

| Group | Values | Needs |
| --- | --- | --- |
| Level | `greater_than`, `less_than` | `price` |
| Crossing | `crossing`, `crossing_up`, `crossing_down` | `price` |
| Channel | `entering_channel`, `inside_channel`, `exiting_channel`, `outside_channel` | `priceLower`, `priceUpper` |
| Movement | `moving_up`, `moving_down` | nothing extra |
| Percentage move | `moving_up_percent`, `moving_down_percent` | `percentage` |

`above`, `below`, `crosses_above`, and `crosses_below` are accepted as aliases
of `greater_than`, `less_than`, `crossing_up`, and `crossing_down`.

**A crossing condition can fire on its very first evaluation.** With no
previous tick recorded, `crossing_up` falls back to a plain level test
(`current > target`) rather than returning false. An alert armed while price
is already above its level therefore fires on the next poll, not on the next
genuine crossing.

A `once` alert does not merely remove its own watch when it fires: it
**deactivates the whole workflow**. Reactivate it from the editor to arm it
again.

The `enabled` field exists in older exports and is read by nothing.

### `webhookTrigger`: Webhook

Fires when its URL is POSTed. This is how TradingView, ChartInk, Amibroker and
Excel drive a Flow workflow.

| Field | Values | Notes |
| --- | --- | --- |
| `label` | string | Display name on the canvas. The only field the node has. |

**The trigger carries no instrument.** It used to declare `symbol` and
`exchange`, and this documentation once described `symbol` as a request filter
that rejected non-matching requests. **It never was one.** The executor read
neither field, so they only labelled the node on the canvas. Both are gone.
Everything the workflow acts on arrives in the request body and is read
downstream as `{{webhook.<field>}}`, for example `{{webhook.symbol}}` and
`{{webhook.action}}`.

The URL is not stored on the node either. It is derived from the workflow's own
`webhook_token`, which the editor fetches from
`GET /api/workflows/<id>/webhook`, so there is no `webhookId` or `webhookUrl`
field.

**The body is parsed as JSON whatever the sender declared.** The platforms
posting here are the ones least able to set a `Content-Type`, so the header is
treated as a hint rather than the truth:

| Body | Becomes |
| --- | --- |
| JSON object, any declared content type | its own keys |
| Form-encoded | its own fields |
| JSON that is not an object (a list, a bare number) | `{{webhook.message}}` plus `{{webhook.payload}}` |
| Anything else | `{{webhook.message}}` holding the raw text |

**A secret in the payload still requires JSON.** With `payload` auth the secret
is a field and plain text has nowhere to put one, so such a request is refused
with 401 and never reaches the workflow. Send JSON, or switch the webhook to
URL auth and pass `?secret=...`.

Nothing in the payload is validated for you, so guard on the fields you rely
on with a condition node before acting.

### `orderUpdateTrigger`: Order Update

Fires when an order's status changes, pushed from the same event stream as the
account WebSocket feed, no polling.

| Field | Values | Notes |
| --- | --- | --- |
| `orderId` | string | Watch one order. Must be a literal: `{{...}}` is rejected outright. |
| `symbol` | | Watch a symbol. |
| `exchange` | | Blank matches any exchange; an explicit value must match. |
| `status` | `any`, `open`, `trigger pending`, `complete`, `rejected`, `cancelled` | Default `complete`. |
| `trigger` | `once`, `every_time` | Default `once`. |

**At least one of `orderId` or `symbol` is mandatory.** Activating with both
blank fails with "orderUpdateTrigger needs an Order ID or a Symbol to watch";
there is no "watch every order" mode.

A `once` trigger deactivates the whole workflow when it fires, not just the
watch.

The payload is exposed as `{{webhook.orderid}}`, `{{webhook.symbol}}`,
`{{webhook.order_status}}`, `{{webhook.filled_quantity}}`,
`{{webhook.average_price}}`, `{{webhook.rejection_reason}}`.

### `httpRequest` is not a trigger

`httpRequest` sits beside the triggers in the node list but is a utility node
that calls an external URL mid-graph and stores the response. A workflow whose
only entry point is an `httpRequest` fails validation with `no_trigger`. Its
fields are under [Utilities](#httprequest-http-request).

---

## Order placement

Every order node calls the same service layer as `/api/v1/`, so Analyzer mode,
Action Center approval, rate limiting, and Telegram/WhatsApp alerts behave
exactly as they do for an API order.

### Every order field takes a `{{reference}}`

There is no field on an order node that must be a literal. The editor shows a
picker by default and a small `{ }` toggle swaps it for a text box, but the
stored value is the same either way: a dropdown field holding
`{{webhook.exchange}}` is just a string, and the executor interpolates it like
any other. That includes the fields a form makes look fixed: `exchange`,
`action`, `quantity`, `product`, `priceType`, `price`, `triggerPrice`,
`offset`, `optionType`, `expiryType`, `positionSize` and `splitSize`.

Only the form ever restricted this. The executor has always interpolated these
fields, which is why a webhook-driven order used to be able to name its
instrument and nothing else.

Three rules decide what actually arrives:

* **A field holding exactly one whole token keeps its type.**
  `"quantity": "{{webhook.quantity}}"` against a payload of `{"quantity": 10}`
  arrives as the number `10`, not the string `"10"`. A field mixing a token
  with other text always resolves to a string.
* **Enumerated fields are case-insensitive.** A payload sending `"buy"`,
  `"nse"` or `"limit"` is accepted. `symbol` is additionally upper-cased on the
  order nodes, because the symbol lookup is exact and an alert does not control
  its own casing: TradingView sends whatever the chart's ticker carries. The
  data nodes (`getQuote`, `history`, and the rest) do **not** normalise symbol,
  so send those an upper-case symbol.
* **An unresolved reference fails the node.** It does not fall back to a
  default. This is deliberate: a numeric field could not parse `{{webhook.qty}}`
  and used to take the field default of `1`, and an unresolved `priceType` fell
  through the broker mapping to `MARKET`, so a webhook that simply omitted a key
  placed a successful order for the wrong size at the wrong price type with
  nothing in the run to say so.

Label fields are exempt: `strategy`, `strategyTag` and `outputVariable` still
pass an unresolved reference through as text. When a webhook may legitimately
omit a value, give the node a literal, or branch on a condition node first.

### `product` follows the exchange when you do not set it

`product` is optional on every order and position node. Omit it and the node's
`exchange` decides: a derivative segment (`NFO`, `BFO`, `CDS`, `BCD`, `MCX`,
`NCDEX`, `NCO`) defaults to `NRML`, everything else to `MIS`. A new node in the
editor stores no `product` at all, so switching its exchange to a derivative
segment shows and sends `NRML` while cash stays `MIS`.

Write `product` only to override that. It is used exactly as given, so `MIS` on
an `NFO` order really is an intraday order the broker squares off at the close.
A `product` that is present but blank is an error, not a fallback: that is a
`{{variable}}` that failed to resolve, and the node refuses rather than
guessing.

`optionsOrder` and `optionsMultiOrder` are the exception. Their `exchange`
field names where the *underlying* is quoted, not where the contract trades, so
they default to `NRML` outright.

### `placeOrder`: Place Order

| Field | Values | Notes |
| --- | --- | --- |
| `symbol`, `exchange` | | Required. |
| `action` | `BUY`, `SELL` | Required. |
| `quantity` | number | Required. **Contract units, never lots.** For an NFO order this is lots multiplied by lot size, which you compute yourself. |
| `priceType` | `MARKET`, `LIMIT`, `SL`, `SL-M` | Default `MARKET`. |
| `product` | `CNC`, `NRML`, `MIS` | Defaults by exchange. |
| `price`, `triggerPrice` | number | `price` must be positive for `LIMIT` and `SL`; `triggerPrice` must be positive for `SL` and `SL-M`. A missing or zero required price fails the node rather than reaching the broker. |
| `strategyTag` | string | Overrides the workflow name as the strategy tag on this order. |

Output: `{status, orderid}`

`optionsOrder` and `optionsMultiOrder` are the only nodes that take lots and
multiply by the contract lot size for you. `placeOrder`, `smartOrder`,
`splitOrder`, and `basketOrder` all pass `quantity` through untouched.

`disclosedQuantity` appears in the frontend node type definition but the
executor never sends it, so it is always 0.

### `smartOrder`: Smart Order

Takes everything `placeOrder` takes, plus `positionSize`: the **target** net
position. The order service/plugin reads the current symbol, exchange and product position and requests the difference for a nonzero target.

`positionSize: 0` can close an existing position. When already flat, broker smart-order implementations can place the supplied action/quantity. Use `quantity: 0` for a close-only intention and reconcile the actual outcome; do not repeatedly send a positive quantity assuming a zero target is idempotent.

`quantity` may be `0` on this node, which is the only order node where zero is
valid: it means "let `positionSize` decide the size".

`price` and `triggerPrice` are forwarded, so a `LIMIT` or `SL` smart order is
priced like any other order and is refused if its required price is missing.
(An earlier build dropped both and sent `price: 0`.)

Output: `{status, orderid}`

### `optionsOrder`: Options Order

Resolves the contract for you, then places it.

| Field | Values | Notes |
| --- | --- | --- |
| `underlying` | e.g. `NIFTY` | Required. Decides both exchanges on its own, see below. |
| `expiryType` | a relative type **or** a `DDMMMYY` date | Default `current_week`. See **Expiry** below. |
| `expiryDate` | `DDMMMYY` | The same explicit date under its own key. **Wins over `expiryType`** when both are set. |
| `offset` | `ATM`, `ITM1`-`ITM50`, `OTM1`-`OTM50` | A **string**, not a number. `0` and `2` resolve nothing. |
| `optionType` | `CE`, `PE` | Default `CE`. |
| `action` | `BUY`, `SELL` | Required. |
| `quantity` | number | Required. **Lots.** The node reads the contract lot size from the master contract and multiplies for you. |
| `priceType`, `price`, `triggerPrice` | | Same price rules as `placeOrder`. |
| `product` | `MIS`, `NRML` | Default `NRML`, not derived from `exchange`. |
| `splitSize` | number | Splits into child orders of this size for freeze limits. |
| `exchange` | | A **fallback**, not an override. Read only for an underlying the table below does not name. |

**Expiry.** The editor shows one Expiry control, and the `{ }` toggle swaps its
relative picker for a date or a reference, so both forms arrive under
`expiryType`:

* A relative type (`current_week`, `next_week`, `current_month`, `next_month`)
  is resolved against the listed expiries. `current_week` is the nearest listed
  expiry and `next_week` the second, so on a monthly-only product such as an MCX
  commodity `current_week` is simply the nearest contract. The monthly types
  take the last expiry falling in that calendar month.
* A `DDMMMYY` value such as `28OCT25` is used exactly as given. This is how you
  reach a far contract the four relative choices cannot name.
* `expiryDate` carries the same explicit date under its own key, for callers
  that prefer to send the two apart, and wins when both are set.
* A malformed date is refused with a message naming the expected format. It is
  not silently ignored.

**Underlying and exchange.** The node resolves *two* exchanges: the one whose
price sets the ATM reference, and the one the option contract trades on. The
underlying's name decides both:

| Underlying | ATM reference quoted from | Option trades on |
| --- | --- | --- |
| NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTYNXT50 | `NSE_INDEX` (the index level) | `NFO` |
| SENSEX, BANKEX, SENSEX50 | `BSE_INDEX` (the index level) | `BFO` |
| GOLD, GOLDM, SILVER, SILVERM, CRUDEOIL, CRUDEOILM, NATURALGAS, NATGASMINI, COPPER, ZINC, MCXBULLDEX | `MCX` (the near-month **future**) | `MCX` |
| anything else | from the node's `exchange` field | |

A named underlying always wins over `exchange`. That is why: the node ships
with `exchange` pre-set to `NSE_INDEX` and most authors never touch the
dropdown, so trusting it would send every imported SENSEX or CRUDEOIL order to
NFO. Use `exchange` to reach a stock option
(`"underlying": "SBIN", "exchange": "NFO"`) or a commodity the table does not
list (`"underlying": "MENTHAOIL", "exchange": "MCX"`).

MCX differs from the equity segments in two ways worth knowing when writing a
workflow by hand. There is no separate derivatives exchange, so the future, the
option and the quote all live on `MCX`. And there is no spot instrument, so the
ATM strike is priced off the nearest unexpired future
(`CRUDEOIL21SEP26FUT`), resolved automatically; if no unexpired future exists
the node fails rather than guessing a reference price. Most MCX option
contracts carry a lot size of 1, so one lot is one contract there.

Output when `splitSize` is 0 (the default):
`{status, orderid, symbol, exchange, underlying, underlying_ltp, offset, option_type, mode}`

Output when `splitSize` is greater than 0:
`{status, symbol, exchange, underlying, underlying_ltp, offset, option_type, total_quantity, split_size, results: [...]}`

**The split shape has no `orderid`**, so `{{o.orderid}}` is undefined exactly
when you use the split feature. Read `{{o.results}}` instead. `mode` is
`analyze` in Analyzer mode.

### `optionsMultiOrder`: Options Multi-Order

Places several option legs in one call: spreads, straddles, iron condors,
calendars.

| Field | Notes |
| --- | --- |
| `underlying` | Required. Shared by all legs. Resolves both exchanges exactly as in `optionsOrder`. |
| `quantity` | Required. **Lots per leg.** |
| `strategy` | The **structure** name: `straddle`, `strangle`, `iron_condor`, `bull_call_spread`, `bear_put_spread`, `custom`. This is *not* the strategy tag; use `strategyTag` for that. An absent `strategy` is read as `custom`, which then requires `legs`. |
| `expiryType` | One common expiry for every leg. Takes a relative type or a `DDMMMYY` date, exactly as on `optionsOrder`. |
| `expiryDate` | The same explicit date under its own key. Wins over `expiryType`. A leg may still override both. |
| `action` | Default `SELL`. Applied to generated legs. |
| `product`, `priceType`, `price`, `triggerPrice` | Node-level defaults inherited by every leg. `product` defaults to `NRML`. |
| `strangleWidth` | Default `OTM2`, and must match the `offset` vocabulary. Used by the `strangle` structure. |
| `legs` | Required for `custom`. See below. |

A generated (non-`custom`) structure **rejects `SL` and `SL-M`** outright: its
legs carry no individual trigger price, so there is nothing to send the broker.
Build the legs as custom legs if you need a trigger.

**Custom legs.** A readymade structure positions every leg at an offset from
the money and gives them all one expiry. `strategy: "custom"` lifts both
limits, which is what makes a calendar, a diagonal, a ratio, or a basket pinned
to chosen strikes expressible.

| Leg field | Values | Notes |
| --- | --- | --- |
| `strikeMode` | `OFFSET`, `STRIKE` | Absent is `OFFSET`. A leg carrying `strike` and no mode is read as `STRIKE`. |
| `offset` | `ATM`, `ITM1`-`ITM50`, `OTM1`-`OTM50` | Required unless `strike` is given. Re-resolved against the live underlying on every run. |
| `strike` | number | Required when `strikeMode` is `STRIKE`. An absolute strike, used as given; must be positive and listed for that expiry. |
| `expiry` | `DDMMMYY` | Overrides the node expiry with an exact date. |
| `expiryType` | relative type | Overrides the node expiry with a relative one. Ignored when `expiry` is set. |
| `optionType` | `CE`, `PE` | Required. |
| `action` | `BUY`, `SELL` | Required. The leg's own side, independent of the node `action`. |
| `quantity` | number | Required. **Lots**, multiplied by the lot size like the node-level quantity. |
| `product`, `priceType` (or `pricetype`), `price`, `triggerPrice`, `splitSize` | | Inherit the node's value when omitted. Unlike a generated structure, a custom leg may use `SL` and `SL-M`, because it can carry its own trigger. |

An **omitted** optional field is what tells the executor to inherit, so write
no key at all rather than an empty string. A leg naming neither `offset` nor
`strike` is refused. A leg with no `expiry` and no `expiryType` follows the
node, so a scheduled workflow rolls to the next contract on its own; pinning a
leg's `expiry` is correct for a calendar or diagonal and wrong for anything
that should keep rolling.

**BUY legs are placed before SELL legs** for margin efficiency, and legs are
placed one at a time, so a basket **fails leg by leg**: if leg three is
rejected, legs one and two are already filled. That is why a malformed strike
or expiry is refused at save time rather than at run time.

Output: `{status, underlying, underlying_ltp, results: [{...}]}`

### `basketOrder`: Basket Order

Several unrelated symbols in one submission.

| Field | Notes |
| --- | --- |
| `orders` | Required. The editor writes a newline-delimited **string**, one order per line, `SYMBOL,EXCHANGE,ACTION,QTY`. An array of objects is also accepted, and is interpolated and validated the same way. |
| `product`, `priceType`, `price`, `triggerPrice` | Node-level values applied to every row. |
| `basketName` | Default `flow_basket`. This becomes the strategy tag. |

**A CSV row carries four fields and nothing else**, so per-row product, price
type or price written into the string is not parsed. Only the **array** form
can set them per row, under `product`, `pricetype` (or `priceType`), `price`
and `triggerprice` (or `triggerPrice`); the node-level values fill in whatever a
row omits.

With no `product` on the node, each row follows its **own** exchange's default,
so one basket can mix an `MIS` cash row and an `NRML` commodity row. A
`product` on the node covers every row that does not set its own.

Output: `{status, results: [{symbol, exchange, product, status, orderid}]}`

### `splitOrder`: Split Order

One large order broken into child orders of `splitSize`, to stay under the
exchange freeze quantity. Fields: `symbol`, `exchange`, `action`, `quantity`,
`splitSize` (all required), plus `priceType`, `product`, `price`,
`triggerPrice`. `splitSize` must be at least 1.

Spacing between child orders comes from the global `ORDER_RATE_LIMIT` setting
(`10 per second`, so 100 ms, by default), not from the node. `delayMs` appears
in older exports and is read by nothing here.

Output: `{status, results: [{order_num, quantity, status, orderid}]}`

### `modifyOrder`: Modify Order

| Field | Notes |
| --- | --- |
| `orderId` | Required. Usually `{{prevOrder.orderid}}`. |
| `newQuantity`, `newPrice`, `newTriggerPrice` | Omitted means unchanged. |
| `symbol`, `exchange`, `action`, `product`, `priceType` | **Omit these.** Any value present is treated as a deliberate override. |

The node reads the order back from the order book and changes only the fields
you supply, so "omitted means unchanged" is literal: an omitted quantity keeps
the order's quantity, not `1`. If the order cannot be read, the node fails
rather than sending a guessed value.

Do not set `action` or `product` unless you mean to change them. Several
brokers carry these on a modify, so an `action` of `BUY` on a live SELL order
converts the order, and a `product` of `MIS` on an NRML position makes it
intraday and subject to auto square-off. A `modifyOrder` node should carry
**only** `orderId` plus whichever of the three `new*` fields you are changing.

Pair it with `orderUpdateTrigger` to react to a partial fill.

### `cancelOrder` / `cancelAllOrders` / `closePositions`

`cancelOrder` takes an `orderId` (required). It is the one order node that does
**not** store its result, so an `outputVariable` on it stays undefined.

`cancelAllOrders` takes no input and cancels every open order. It does store
its result under `outputVariable`.

`closePositions` takes `symbol`, `exchange`, `product` and `strategyTag`, and
behaves in two distinct ways:

* With `symbol` blank, it closes **everything**, in every exchange and product,
  including overnight NRML or CNC position rows returned by the broker. `exchange` and `product` filter
  nothing on their own.
* With `symbol` set, the node sends the scoped close: that symbol, that
  exchange, that product, carrying the strategy tag.

**The scoped close only takes effect in Analyzer mode.** In live trading the
underlying service calls the broker's own square-off-everything endpoint and
the symbol, exchange and product are discarded, so the whole book is closed.
The node reads as correct in sandbox testing and is not, which is the trap: see
[Limitations](limitations.md).

`cancelAllOrders` and a symbol-less `closePositions` are account-wide, **not**
strategy-scoped: run in one workflow they affect orders and positions another
workflow placed.

---

## Conditions and logic

A condition node emits a boolean consumed by edge routing, it has **no**
output variable. Reference its *inputs* downstream, not its result.

Each has a `true` and a `false` source handle (`timeCondition` and `notGate`
use `yes` and `no`; the executor treats the two vocabularies as synonyms).

Three rules govern all of them:

* **A condition that errors takes NEITHER branch.** An unrecognised `field`,
  `operator` or `condition`, an operand that does not resolve to a number, or a
  **failed broker read** all produce an error, not a `false`. That matters
  because `false` is a real answer that routes the graph: `priceCondition`,
  `positionCheck` and `fundCheck` used to read a failed lookup as `0` and report
  success, so "if LTP < 100 then BUY" fired on an expired broker session. The
  run is recorded as `failed` and the trigger response carries the reason.
* **A condition evaluates once per run**, however many paths reach it. A
  condition reachable by two paths used to run twice and follow its branch each
  time, placing two orders from one trigger.
* Pass-through edges (no `sourceHandle`, typically a Log or Telegram node) are
  followed on every result including an error, so a failure is still visible.

### `priceCondition`: Price Condition

| Field | Values |
| --- | --- |
| `symbol`, `exchange` | Both required. |
| `field` | `ltp`, `open`, `high`, `low`, `prev_close`, `change_percent`. Default `ltp`. |
| `operator` | `>`, `<`, `>=`, `<=`, `==`, `!=`. Required. |
| `value` | number, or `{{variable}}`. The legacy key `threshold` is still read. |

Those six fields are the whole vocabulary. `close` and `volume` are **not**
valid here and make the node error on every run, taking neither branch. For a
close-based comparison, read it from a `history` or `barOffset` node into a
`varCondition`.

`change_percent` is computed as `(ltp - prev_close) / prev_close * 100`.

### `varCondition`: Variable Condition

Compares any two values, each a literal or `{{path}}`. This is the general
comparison node, use it whenever `priceCondition` is too narrow.

| Field | Notes |
| --- | --- |
| `leftValue` | Required. Literal or `{{path}}`. |
| `operator` | Required. `>`, `<`, `>=`, `<=`, `==`, `!=`. |
| `rightValue` | Literal or `{{path}}`. |

An operand that is blank, unresolved, or not a number errors and takes neither
branch, which is what you want, but it means a silently missing value looks
like "nothing happened". Check the run log.

### `timeWindow`: Time Window

`startTime`, `endTime` (`"HH:MM"`), and `invertCondition` to mean "outside this
window". Defaults are `09:15` and `15:30`.

**A window whose end is before its start spans midnight.** `22:00` to `02:00`
is read as the two halves either side of midnight, which is what an overnight
MCX or crypto guard needs. It used to be an empty window, so such a guard was
always false, and always true once inverted.

`days` appears in older exports and is read by nothing here, so a "weekdays
only" window built from it runs every day. Gate the weekday with
`{{weekday_num}}` in a `varCondition`, or with `marketHoursOnly` on the `start`
trigger.

### `timeCondition`: Time Condition

For "is it past 14:00" style checks against a single time rather than a range.

| Field | Values |
| --- | --- |
| `conditionType` | `entry`, `exit`, `custom`. Purely a label: it never changes the comparison, only the log line and the result payload, which is what makes a graph with several time gates readable. |
| `targetTime` | `"HH:MM"` or `"HH:MM:SS"`. Seconds are honoured. |
| `operator` | `>=`, `<=`, `>`, `<`, `==`. `==` compares at minute precision on purpose: a second-exact equality would almost never fire. |

An unrecognised operator errors and takes neither branch. This node uses
`yes`/`no` source handles rather than `true`/`false`.

### `positionCheck`: Position Check

| Field | Values |
| --- | --- |
| `symbol`, `exchange` | Both required. |
| `condition` | Required. `exists`, `not_exists`, `quantity_above`, `quantity_below`, `pnl_above`, `pnl_below` |
| `product` | Defaults by exchange. |
| `threshold` | number, default 0. Used only by the `quantity_*` and `pnl_*` modes. |

`exists` and `not_exists` are the stored values; the editor labels them "Has
Position" and "No Position". Writing `has_position` or `no_position` into the
JSON makes the node error every run.

The node also **errors when `symbol` is blank** rather than evaluating. A blank
symbol reads back a zero-quantity position, which makes `not_exists`
unconditionally true, so an unconfigured node would open the gate it exists to
guard.

This asks the **broker**, so it is the correct way to answer "am I already in
this trade": Flow keeps no memory between runs.

### `fundCheck`: Fund Check

`minAvailable` is **required**. The node passes when available cash is at least
that much. A node without it cannot guard anything, because the comparison
would be `availablecash >= 0` and true on any balance, so it fails instead of
letting the order behind it through.

A node saved before `minAvailable` existed carries a legacy `threshold` plus
`operator`. A greater-than-style legacy operator is read as a minimum and
logged as such; anything else is refused rather than inverted, because this
node can only express "at least".

### `andGate` / `orGate` / `notGate`

Combine conditions. Connect condition outputs into the gate, and the gate's
output onward.

A gate waits until **every** connected input has been evaluated before it
fires, and fires exactly once per run. `andGate` and `orGate` render `true` and
`false` handles and route their result exactly like a condition, so set
`sourceHandle` on their outgoing edges. `notGate` emits `yes`/`no`.

`andGate` and `orGate` take an `inputCount` (2 to 5, default 2). Two rules
apply to it:

* An edge whose `targetHandle` is `input-N` for N at or beyond the count is a
  hard validation error, so raise `inputCount` before wiring a third input.
* **A gate honours its `inputCount` at run time too.** Configured for three
  inputs and wired for two, it errors rather than evaluating on part of the
  condition. Deleting a third edge used to silently downgrade
  "A AND B AND in-window" to "A AND B" with the canvas still showing three
  slots.

**An errored condition leaves a gate pending**, it does not settle it as
`False`. That is deliberate: an AND gate that saw a placeholder `False` from a
failed condition computed `[False, True] -> False` and drove its FALSE branch
into a real order, and only afterwards was the run marked failed.

Only `notGate` is configuration-free.

---

## Market data

See [Market Data and Timeframes](market-data.md) for the bar limits and
caching behaviour that apply across these nodes.

### `source` is the data source, not the price field

On `indicator`, `barOffset` and `priorPeriodOhlc`, **`source` selects where the
history comes from**: `api` (the broker, the default) or `db` (Historify, which
also resamples locally). It is not a price-field selector. Passing `close` to
`source` fails with a history error that names neither field, which is a
confusing way to learn this. The field that picks a column is `sourceField`,
and it exists only on `indicator`.

The indicator and history nodes reuse a fetch for `FLOW_HISTORY_CACHE_TTL`
seconds, 30 by default. That is well under a 5-minute candle and half of a
1-minute one, so lower it to 2 or 3 for a 1-minute strategy.

### `getQuote`: Get Quote

`symbol`, `exchange` (both required)
→ `{status, data: {ltp, open, high, low, prev_close, volume, oi, bid, ask}}`

`data.high` and `data.low` are **today's session extremes**, which is what
makes stateless "has price already touched this level today" tests possible.

### `multiQuotes`: Multi Quotes

Takes a single comma-separated `symbols` string (required) and one node-level
`exchange` applied to all of them, so every symbol in one node must share an
exchange.

→ `{status, results: [{symbol, exchange, data: {...}}]}`

Prefer this over several `getQuote` nodes: quotes are **not** cached and some
brokers allow only about one quote request per second.

### `getDepth`: Get Depth

`symbol`, `exchange` (both required)
→ `{status, data: {bids: [{price, quantity}], asks: [...], ltp, totalbuyqty, totalsellqty}}`

### `history`: Historical Data

| Field | Notes |
| --- | --- |
| `symbol`, `exchange`, `interval` | All three required. |
| `interval` | A fixed dropdown on this node: `1m`, `5m`, `15m`, `1h`, `1d`. Editor default `1d`. |
| `days` | Calendar days back. Editor default 30, maximum 365. |
| `startDate`, `endDate` | An explicit range. When both are set they **take precedence over `days`**. |

→ `{status, data: [{timestamp, open, high, low, close, volume, oi}]}`

Timestamps are **epoch seconds**, not ISO strings.

The result is capped at 200 bars by `FLOW_MAX_HISTORY_BARS`, which is an
environment default rather than a fixed ceiling. This node has **no `source`
field**, so it always calls the broker; use `indicator`, `barOffset`, or
`priorPeriodOhlc` when you need `source: "db"`.

### `priorPeriodOhlc`: Prior Period OHLC

The completed previous hour/day/week/month, the reliable way to get PDH/PDL
without off-by-one errors from today's partial candle. It never returns a
still-forming candle, and errors when history is too short.

| Field | Values |
| --- | --- |
| `symbol`, `exchange` | Both required. |
| `period` | `previous_hour`, `previous_day`, `previous_week`, `previous_month`. Default `previous_day`. |
| `source` | `api` (default) or `db` (Historify). |

→ `{status, symbol, exchange, period, date, open, high, low, close, volume, pdh, pdl, pdc}`

### `barOffset`: Bar Offset

One specific bar counted back from the latest: "the close 20 hours ago", "the
high 3 bars ago".

| Field | Values |
| --- | --- |
| `symbol`, `exchange` | Both required. |
| `interval` | Free text. Default `D`. |
| `offsetBars` | 0 is the most recent **closed** bar; 1 is the one before it. Today's forming candle is excluded. |
| `source` | `api` (default) or `db` (Historify). |

Because it counts bars rather than calendar time, the same node answers "20
hours ago" with `interval: "1h", offsetBars: 20`.

→ `{status, symbol, exchange, offsetBars, timestamp, open, high, low, close, volume}`

### `indicator`: Technical Indicator

All the single-symbol `openalgo.ta` indicators. Fully covered in
[Indicators](indicators.md).

| Field | Notes |
| --- | --- |
| `indicatorName` | Required. Lowercase, e.g. `ema`, `rsi`, `macd`, `supertrend`. Not validated until the run. |
| `symbol`, `exchange` | Required except in nested mode. |
| `params` | The indicator's own parameters **as a JSON string**, e.g. `"{\"period\": 20}"`. A real JSON object is rejected at import; a stored one from an older graph is normalised with a warning. |
| `interval` | Free text. Default `D`. |
| `source` | `api` (default) or `db` (Historify). The data source, not a price field. |
| `lookbackBars` / `tailBars` | How much history to compute over (capped at 200), and how long the returned `series` is. |
| `offsetBars` | Which past value `at_offset` refers to. 0 is the latest. |
| `sourceSeries` | Feed another indicator's output in, e.g. `{{rsi.series}}` or a raw `{{h.data}}`. This is how nesting works. |
| `sourceField` | **Only used when `sourceSeries` is set**, to pick a key out of each upstream row. Blank means the first of `value`, `out0`, `close`. It has no effect on an ordinary indicator node. |

→ `{status, indicator, nested, inputs, params, outputs, latest, previous, at_offset, series, offset_bars, bars_used}`

**A single-output indicator exposes `value`. A tuple indicator exposes `out0`,
`out1`, and so on, and has no `value` at all.** `supertrend` gives `out0` (the
line) and `out1` (direction); `macd` gives line, signal and histogram; `bbands`
gives upper, middle and lower. Reading `{{ind.latest.value}}` on one of those
resolves to its own literal text, which looks like a condition that never
fires.

An indicator whose every output is null over the bars available returns an
**error**, not a success with nulls, so a too-short warm-up is visible rather
than silent.

Only single-series indicators (sma, ema, rsi, wma, stdev, highest, lowest, and
the like) can be nested through `sourceSeries`. `crossover`, `crossunder`,
`cross`, `correlation` and `beta` need two independent series and are refused;
build a crossover from two `indicator` nodes plus an `andGate`.

### `strategyPnl`: Strategy P&L

Realized, unrealized and total P&L for **one strategy**, not the whole
account, so a workflow can exit on its own performance even when other
strategies hold the same contract.

| Field | Notes |
| --- | --- |
| `strategy` | Defaults to this workflow's name, which is also the tag its order nodes apply. Usually leave blank. |

→ `{status, strategy, realized, today_realized, unrealized, total, today_total, open_quantity, unpriced_legs, legs: [{symbol, exchange, product, quantity, average_price, ltp, realized, today_realized, unrealized}]}`

`total` is realized + unrealized across all sessions; `today_total` is the
intraday equivalent, pairing `today_realized` with the same unrealized figure.

`legs` lists **open legs first**, so whenever `open_quantity` is non-zero,
`{{pnl.legs[0]}}` is an open leg. The book keeps a strategy's flat legs and
resets their `average_price` to 0 when they close, so without that ordering a
positional read would eventually land on a stale closed leg and a percentage
calculation would divide by zero. Guard on `open_quantity` before reading a leg,
and before acting, or an exit re-fires every run once the position is flat and
realized P&L still exceeds the target.

`unpriced_legs` counts open legs with no live price; those are **excluded**
from `unrealized`. A non-zero value means the total is understated.

The book is fed from orders placed **through OpenAlgo carrying a strategy
tag**; a position opened by hand in the broker terminal is invisible to it.

The node returns an **error**, never a zero, when the figures are unknown,
whether the position book is unavailable or the strategy book itself could not
be read. A P&L of zero always means "flat", never "could not tell".

### `openPosition`: Open Position

`symbol`, `exchange` (both required) plus `product` (defaults by exchange)
→ `{status, quantity, pnl}`. `quantity` is signed: negative is short. `pnl` is
what `positionCheck`'s `pnl_above` and `pnl_below` read.

### `calendar`: Calendar

Trading-day facts for a date, and the stateless answer to **"has a new day,
week, month, quarter or year started"**.

| Field | Notes |
| --- | --- |
| `date` | `YYYY-MM-DD`. Blank uses the current trading session date, which differs from the calendar date between midnight and the 03:00 IST rollover. |

→ `{status, date, is_trading_day, is_trading_holiday, is_weekend, is_special_session, weekday, weekday_num, day, month, quarter, year, week_of_year, day_of_year, is_new_day, is_new_week, is_new_month, is_new_quarter, is_new_year, is_last_day_of_week, is_last_day_of_month, is_last_day_of_quarter, is_last_day_of_year, prev_trading_day, next_trading_day, first_trading_day_of_week, first_trading_day_of_month, first_trading_day_of_quarter, last_trading_day_of_week, last_trading_day_of_month, last_trading_day_of_quarter}`

`is_special_session` distinguishes a Muhurat or other special session from an
ordinary trading day.

Flow keeps no state between runs, so a workflow cannot remember the last run's
date. It does not need to: "a new month started" is the same statement as
"today is the first trading day of this month", which the exchange calendar
answers on its own.

That is also **more correct** than the tests you would otherwise write:

| Naive test | Case it gets wrong |
| --- | --- |
| `{{day}} == 1` | 1 Aug 2026 is a Saturday, so the month opens on the 3rd |
| `{{weekday}} == Monday` | 26 Jan 2026 is Republic Day, so that week opens on Tuesday the 27th |

`is_trading_holiday` is distinct from `is_weekend`, so you can tell a closed
weekday from a weekend. Use `is_last_day_of_month` for month-end square-off.

**Not exchange-aware.** A date is a trading holiday if the exchange calendar
lists one; MCX differs from NSE on a few days a year.

### `intervals`: Supported Intervals

→ `{status, data: {seconds, minutes, hours, days, weeks, months}}`

Use it to confirm your broker supports an interval before relying on it. Not
every broker supports every timeframe, and an unsupported one comes back as a
broker error from `history` or `indicator`.

---

## Symbols, expiries and option chains

### `symbol`: Symbol Info

`symbol`, `exchange` (both required)
→ `{status, data: {symbol, brsymbol, lotsize, tick_size, expiry, strike, token, ...}}`

`data.lotsize` is how you size an F&O order correctly on the nodes that take
contract units.

### `expiry`: Expiry Dates

`symbol`, `exchange` (both required) plus `instrumenttype` (`options` /
`futures`, **lowercase**, default `options`; anything else falls back to
`options`)
→ `{status, message, data: ["04-AUG-26", ...]}`, nearest first.

### `optionSymbol`: Option Symbol

Resolves an ATM-relative strike to a tradable symbol without placing anything.

`underlying` and `optionType` are required; `exchange`, `expiryDate` (`DDMMMYY`)
and `offset` (`ATM`, `ITMn`, `OTMn`) are the rest.

→ `{status, symbol, exchange, lotsize, tick_size, freeze_qty, underlying_ltp}`

Note this shape is **flat**, `{{os.symbol}}`, not `{{os.data.symbol}}`.

An unresolved `underlying` or an `expiryDate` that is not `DDMMMYY` fails the
node before the lookup, rather than resolving something else.

### `optionChain`: Option Chain

`underlying` (required), `exchange`, `expiryDate`, `strikeCount`
→ `{status, underlying, underlying_ltp, expiry_date, atm_strike, chain: [{strike, ce: {...}, pe: {...}}]}`

### `syntheticFuture`: Synthetic Future

`underlying` (required), `exchange`, `expiryDate`. This node always needs a
resolved `expiryDate`.

→ `{status, underlying, expiry, atm_strike, synthetic_future_price, underlying_ltp}`

---

## Account and orders

### `funds`: Funds

→ `{status, data: {availablecash, collateral, m2mrealized, m2munrealized, utiliseddebits}}`

### `orderBook`: Order Book

→ `{status, data: {orders: [...], statistics: {...}}}`

`data.statistics.total_buy_orders` is the usual stateless "have I already
entered today" guard: the order book resets daily and keeps the record after
a position closes.

### `tradeBook`: Trade Book

→ `{status, data: [{tradeid, orderid, symbol, average_price, ...}]}`

### `positionBook`: Position Book

→ `{status, data: [{symbol, exchange, product, quantity, average_price, ltp, pnl}]}`

There is **no `total_pnl` key**: `{{pb.total_pnl}}` resolves to its own
literal text. Sum `data[].pnl` yourself, or use `strategyPnl`.

Account-wide and netted per `(symbol, exchange, product)`, it cannot tell you
which strategy opened a position. Use `strategyPnl` for that.

Note the shape asymmetry against `orderBook` and `holdings`, which is a common
source of unresolvable paths: `positionBook` and `tradeBook` put their rows
directly in `data`, the other two nest them a level deeper.

### `holdings`: Holdings

→ `{status, data: {holdings: [...], statistics: {...}}}`

Note the nesting: `{{hd.data.holdings[0].symbol}}`, not `{{hd.data[0].symbol}}`.

### `margin`: Margin Calculator

Pre-trade margin for a proposed order or basket.

| Field | Notes |
| --- | --- |
| `positionsJson` | A JSON **string** describing the legs, one object per position. This is the only field the editor's panel builds. The legacy key `positions` is still accepted. |
| `symbol`, `exchange`, `action`, `quantity`, `product`, `priceType`, `price` | The single-position fallback, read only when no basket key is present. The panel offers no controls for them. |

Each position in the basket needs `symbol`, `exchange`, `action`, `quantity`,
`product` and `pricetype`; `price` and `trigger_price` are optional and follow
the same price rules as an order.

**A present but empty or unparseable `positionsJson` is a hard error, not a
fallback.** A basket was configured, so an empty result means interpolation
dropped it (an unset `{{variable}}`), and quietly pricing the single-position
fields instead would price a different estimate. With neither a basket nor a
`symbol`, the node fails naming what it is missing rather than calling the
broker with an empty symbol. Dropping a malformed entry from a basket is
refused for the same reason: half a basket is not the estimate you asked for.

### `getOrderStatus`: Order Status

`orderId` is required.

→ `{status, data: {order_status, average_price, quantity, ...}}`

The node calls the broker once and returns immediately. `waitForCompletion`
appears in older exports and in the frontend node definition, and is read by
nothing: there is no polling and no wait. To react to a fill, use
`orderUpdateTrigger` in a separate workflow.

### `holidays` / `timings`

`holidays` takes a `year` (blank means the current year) → the exchange holiday
list. `timings` takes a `date` (blank means today) → market open/close for that
day. Use them to avoid firing on a holiday.

---

## Streaming

These maintain a WebSocket subscription and pass the latest tick to their
output variable. If WebSocket is unavailable they fall back to a single REST
call, identical from the workflow's point of view.

All three subscribe nodes require `symbol` and `exchange`, and all three write
a wrapped envelope to their output variable, not the bare value. Read through
the envelope.

| Node | Output variable holds | Read the price as |
| --- | --- | --- |
| `subscribeLtp` | `{status, type: "ltp", symbol, exchange, ltp, source}` | `{{lt.ltp}}` |
| `subscribeQuote` | `{status, type, symbol, exchange, data: {ltp, open, high, low, close, volume, ...}, source}` | `{{q.data.ltp}}` |
| `subscribeDepth` | `{status, type, symbol, exchange, data: {bids, asks, totalbuyqty, totalsellqty, ltp}, source}` | `{{d.data.bids[0].price}}` |

`source` is `websocket` or `rest_api`, so a workflow can tell which path
answered.

`{{lt}}` used as a number and `{{q.ltp}}` are the two mistakes this shape
causes. Neither raises: the unresolved path is passed through as literal
text.

### `unsubscribe`: Unsubscribe

| Field | Values |
| --- | --- |
| `streamType` | `ltp`, `quote`, `depth`, `all`. Default `all`. |
| `symbol` | Required unless `streamType` is `all`. |
| `exchange` | Default `NSE`. |

**A specific stream type with no symbol is refused.** The underlying call for
"no symbol" clears every subscription on the instance, including the ones the
Sandbox engine uses to trigger pending SL and LIMIT orders, so reaching it
because an LTP unsubscribe happened to have no symbol tore down far more than
the author asked for. Name a symbol, or set `streamType` to `all` if you really
do mean everything.

A rejected unsubscribe now returns an error rather than reporting success.

**You do not need an `unsubscribe` node for cleanup.** Deactivating or deleting
a workflow releases everything it subscribed to. That matters because the
WebSocket client is process-wide: a subscription left behind is held for the
life of the worker and counts against the per-broker symbol ceiling that
`/trading` and the Sandbox engine share. Use `unsubscribe` only to drop a
stream mid-run.

---

## Utilities

### `variable`: Variable

| Field | Values |
| --- | --- |
| `variableName` | Required. |
| `operation` | Default `set`. One of the eleven below. |
| `value` | Literal or `{{path}}`. |
| `sourceVariable` | Required for `get` and `stringify`. |
| `jsonPath` | Optional for `get`. Dotted keys and bracketed indexes, e.g. `data.items[0].price`. |

All eleven operations are implemented:

| Operation | Behaviour |
| --- | --- |
| `set` | Stores `value`. A string starting `{` or `[` is parsed as JSON, so structured data can be carried. |
| `get` | Copies the raw value from `sourceVariable`, optionally walking `jsonPath`. |
| `add` / `subtract` / `multiply` / `divide` | Arithmetic against the current value, which initialises to 0 when unset. Division by zero is an error. |
| `increment` / `decrement` | Plus or minus 1, initialising to 0 when unset. |
| `parse_json` | Parses the interpolated `value` as JSON and stores the result. Invalid JSON is an error. |
| `stringify` | JSON-serializes `sourceVariable` into a string. |
| `append` | Appends `value` as text; an unset target starts empty. |

A missing source, an invalid conversion, invalid JSON or a division by zero
returns an error and **leaves the target unchanged** rather than writing a
partial result. There is no `extract` operation.

**Variables do not survive the run.** An `increment` counts within one
execution only; it is reset on the next tick. Anything that must persist has
to come from the broker.

### `mathExpression`: Math Expression

`expression` (required), arithmetic over interpolated values, e.g.
`"{{q.data.ltp}} * 1.02"`. The result goes to `outputVariable`, which defaults
to `result`.

Supported: `+`, `-`, `*`, `/`, `%`, `**`, unary minus and plus, parentheses,
and one function, `floor(...)`. Exponents are capped at 100.

**No comparisons.** `{{a}} > {{b}}` raises "Unsupported expression type:
Compare"; use `varCondition` for that. There is no string manipulation, no date
arithmetic, and no other function call: an attribute access, a keyword argument
or a wrong argument count is rejected.

### `log`: Log

`message` (interpolated) and `level` (`info`, `warn`, `error`). The value is
`warn`, not `warning`: anything else is stored verbatim and rendered at info
severity. Written to the workflow's execution log, the primary way to debug a
run.

### `telegramAlert`: Telegram Alert

`message` (required, interpolated). Requires the Telegram bot to be configured
and the workflow owner's account linked to it.

The panel still shows an "OpenAlgo Username" box, but the executor never reads
it. The recipient is resolved from the workflow's own API key, so the alert
always reaches the workflow owner regardless of what is typed there.

### `whatsappAlert`: WhatsApp Alert

`message` (required, interpolated) and `to` (phone digits, e.g.
`919876543210`). Blank `to` sends to the paired device itself. Requires the
WhatsApp bot to be paired from the `/whatsapp` page.

### `httpRequest`: HTTP Request

| Field | Notes |
| --- | --- |
| `url` | Required. Interpolated. |
| `method` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`. Default `GET`. |
| `headers` | A JSON **string** (a JSON object is also accepted). Parsed first, then each value is interpolated. |
| `body` | Interpolated. Sent on POST, PUT and PATCH. |
| `timeout` | **Milliseconds.** Default 30000, capped at 60000. |
| `outputVariable` | Default `response`. |

→ `{status, statusCode, data}`, where `data` is the parsed JSON body or, if it
is not JSON, the raw text. A non-2xx response sets `status` to `error`, so the
branch below the node stops and the run is marked failed.

Only `http` and `https` are allowed, and the destination must resolve to a
public address: loopback, private, link-local and reserved ranges are rejected,
so a workflow cannot be pointed at this server, at a host on the LAN, or at
cloud metadata on `169.254.169.254`. This matters because `url` interpolates
from workflow variables and a webhook trigger puts its caller's JSON body into
that context. Redirects are not followed, and a logged URL has its query string
redacted so a token in a query parameter is not written to the execution log.

The URL is interpolated exactly once. Headers are parsed before their values
are interpolated, so a substituted value carrying a quote cannot close the
string and add a header the author never wrote.

### `delay`: Delay

`delayValue` + `delayUnit` (`seconds` / `minutes` / `hours`), or `delayMs`.

**Blocking, and silently capped at 300 seconds.** A longer value logs a
warning and waits 300 seconds instead, then continues: the run does not fail,
it just proceeds early. A node configured as "2 hours" waits five minutes.

The run sleeps and holds its execution slot for whatever it does wait. Do not
use it to pace a trading session; use a second workflow on its own schedule.

### `waitUntil`: Wait Until

`targetTime` (required, `"HH:MM"` or `"HH:MM:SS"`; seconds are honoured).
Returns immediately with `{status, waited: false}` if the time has already
passed today.

**Capped at 30 minutes.** A target further away errors and points at a schedule
trigger instead of waiting. The wait retains the workflow lock and execution slot. Under eventlet it also holds the triggering HTTP request; gthread longer-wait runs use bounded background pools (see [Limitations](limitations.md#delay-is-capped-at-300-seconds-waituntil-at-30-minutes)). An uncapped six-hour wait previously pinned a
worker and answered "already running" to every trigger in between. Use a
`start` schedule for a square-off hours later, or split it into its own
workflow.

### `group`: Group

Visual grouping only. `label` and `color` are stored; there is no execution
behaviour, and the node is a no-op when traversed.

---

## Node count by category

| Category | Count | Nodes |
| --- | --- | --- |
| Triggers | 4 | `start`, `priceAlert`, `webhookTrigger`, `orderUpdateTrigger` |
| Order placement | 10 | `placeOrder`, `smartOrder`, `optionsOrder`, `optionsMultiOrder`, `basketOrder`, `splitOrder`, `modifyOrder`, `cancelOrder`, `cancelAllOrders`, `closePositions` |
| Conditions and logic | 9 | `priceCondition`, `varCondition`, `timeWindow`, `timeCondition`, `positionCheck`, `fundCheck`, `andGate`, `orGate`, `notGate` |
| Market data | 11 | `getQuote`, `multiQuotes`, `getDepth`, `history`, `priorPeriodOhlc`, `barOffset`, `indicator`, `strategyPnl`, `openPosition`, `intervals`, `calendar` |
| Symbols and options | 5 | `symbol`, `expiry`, `optionSymbol`, `optionChain`, `syntheticFuture` |
| Account and orders | 9 | `funds`, `orderBook`, `tradeBook`, `positionBook`, `holdings`, `margin`, `getOrderStatus`, `holidays`, `timings` |
| Streaming | 4 | `subscribeLtp`, `subscribeQuote`, `subscribeDepth`, `unsubscribe` |
| Utilities | 9 | `variable`, `mathExpression`, `log`, `telegramAlert`, `whatsappAlert`, `delay`, `waitUntil`, `httpRequest`, `group` |
| **Total** | **61** | |

The sections above group nodes by task. The editor's palette groups them
slightly differently: `calendar`, `holidays`, and `timings` sit under
Utilities there, and `holdings`, `funds`, and `margin` under Risk Management.

For the exact JSON schema of every field, the format an AI needs to generate
an importable workflow, see
[`docs/prompt/flow-import-format.md`](https://github.com/marketcalls/openalgo/blob/main/docs/prompt/flow-import-format.md)
in the main repository.
