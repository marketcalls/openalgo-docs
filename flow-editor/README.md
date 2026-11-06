# Flow Editor

Flow is OpenAlgo's node-graph strategy builder at `/flow`. You wire market
data into indicators, indicators into conditions, and conditions into order
execution, no Python required.

This section is the **technical reference**. It assumes you are building a
real strategy and want to know exactly what each node does, what the
execution model guarantees, and where the boundaries are.

* [Concepts and Execution Model](concepts.md): nodes, edges, variables, how a run actually proceeds
* [Node Reference](node-reference.md): all 61 nodes, their fields and their outputs
* [JSON Format](json-format.md): the import contract, field by field, and how to check a workflow before importing it
* [Market Data and Timeframes](market-data.md): quotes, history, lookback, bar limits
* [Indicators](indicators.md): all 116 indicators, which bar `latest` is, tuple outputs, nesting
* [Tutorials](tutorials.md): twelve complete strategies, ending with a live 1-minute Supertrend reversal
* [Limitations and Gotchas](limitations.md): read this before going live

---

## What Flow can do

| Capability | Nodes |
| --- | --- |
| Trigger on a schedule, a webhook, a price level, or an order fill | `start`, `webhookTrigger`, `priceAlert`, `orderUpdateTrigger` |
| Run a schedule on the clock, inside a configurable market-hours window | `start` (`marketHoursOnly`, `marketHoursStart/End/Exchange`) |
| Read live quotes and market depth | `getQuote`, `multiQuotes`, `getDepth`, `subscribeLtp/Quote/Depth`, `unsubscribe` |
| Read historical OHLCV at any supported timeframe | `history`, `barOffset`, `priorPeriodOhlc` |
| Compute any of 116 technical indicators | `indicator` |
| Branch on price, time, position, funds, or any computed value | `priceCondition`, `timeWindow`, `timeCondition`, `positionCheck`, `fundCheck`, `varCondition` |
| Combine conditions | `andGate`, `orGate`, `notGate` |
| Place equity, futures, and options orders | `placeOrder`, `smartOrder`, `optionsOrder`, `optionsMultiOrder`, `basketOrder`, `splitOrder` |
| Drive **every** order field from the alert that triggered the run, not just `symbol` | any order node, using `{{webhook.*}}` on `exchange`, `action`, `quantity`, `product`, `priceType`, `price`, `triggerPrice`, `offset`, `optionType`, `expiryType`, `positionSize`, `splitSize` |
| Manage open orders and positions | `modifyOrder`, `cancelOrder`, `cancelAllOrders`, `closePositions` |
| Resolve option symbols, expiries, and chains, by relative expiry or an exact `DDMMMYY` date | `optionSymbol`, `expiry`, `optionChain`, `syntheticFuture` |
| Look up contract details and supported intervals | `symbol`, `intervals` |
| Alert and log | `telegramAlert`, `whatsappAlert`, `log`, `httpRequest` |
| Track P&L for one strategy, not the account | `strategyPnl` |
| Read the account: orders, trades, positions, holdings, funds, margin | `orderBook`, `tradeBook`, `positionBook`, `openPosition`, `holdings`, `funds`, `margin`, `getOrderStatus` |
| Check exchange holidays and market timings | `holidays`, `timings` |
| Detect a new day, week, month, quarter or year | `calendar` |
| Pause within a run | `delay`, `waitUntil` |
| Arithmetic and state within a run | `mathExpression`, `variable` |

61 node types in total, every one documented in the
[Node Reference](node-reference.md), with the JSON each one expects in the
[JSON Format](json-format.md) reference. Every order node calls the same
service functions as `/api/v1/`, so Analyzer (sandbox) mode, Action Center
approval, and Telegram or WhatsApp alerts all behave identically to an
API-placed order.

A workflow can be checked before it is imported. The `flow-builder` skill in
the OpenAlgo repo runs the importer's own validator and then flags the
mistakes that import cleanly and misbehave later, chiefly a `data` key that no
node reads:

```
uv run python .claude/skills/flow-builder/validate.py my_workflow.json
```

## Save, Run and Activate

Palette buttons add nodes without dragging. **Save** persists edits; **Run Now** executes the stored graph in the current Live/Analyze mode. The editor saves dirty changes before Run Now and Activate, and refuses the action if saving cannot complete. Verify mode and quantity first.

A response with `status: "accepted"` from a longer-wait run is not a final result. Open execution history to see its eventual outcome. Check order/trade/position books before treating a placement as a fill or retrying an unclear send.

## What Flow cannot do

These are hard boundaries, not oversights. [Limitations](limitations.md)
covers each in detail with workarounds.

| Limitation | Practical effect |
| --- | --- |
| **No state across runs** | `variable` values reset every run. "Have I already entered today?" must be answered from the broker (`positionCheck`, `orderBook`), not a counter. Period boundaries are the exception: `calendar` answers "is a new week/month/quarter" from the exchange calendar, no memory needed. |
| **`delay` and `waitUntil` block the run** | They hold the workflow execution slot. Eventlet keeps the triggering request; gthread can run longer waits in bounded background pools (see [Limitations](limitations.md#delay-is-capped-at-300-seconds-waituntil-at-30-minutes)). `delay` is silently capped at 300 seconds and then continues, so a workflow written as "wait 30 minutes" exits after five. `waitUntil` is capped at 30 minutes and **errors** beyond that rather than waiting. Waiting out a session means a second workflow on its own schedule. |
| **No loops** | You cannot iterate a symbol list. One workflow handles one symbol; clone it per symbol, or drive one workflow from `{{webhook.symbol}}`, see [Tutorial 11](tutorials.md#11-driving-an-order-from-the-webhook-payload). |
| **No backtesting** | Flow runs forward only. Use an external Python backtesting library or an [OpenScript chart backtest](../new-features/openscript.md#backtest); the Python host and SDK do not add a built-in backtester. |
| **No pandas objects** | Variables are JSON. You get arrays of records and single values, not a `pandas.Series`. |
| **Max 200 bars per fetch** | Deep history (10 years of 1-minute data) is refused by design. See [Market Data](market-data.md). |
| **Triggers cannot read upstream data** | A trigger is the entry point, so its fields cannot contain `{{variables}}`. |
| **Indicators need one symbol** | `correlation`, `beta`, `crossover`, `crossunder` need two independent series and are not available as a single `indicator` node. Crossovers are built from two indicator nodes, see [Tutorial 3](tutorials.md#3-crossovers). |
| **`closePositions` ignores its filter in live trading** | It honours symbol, exchange and product in Analyzer mode and squares off the **entire book** live, so a filtered node looks correct in sandbox testing. For a scoped smart-order exit, use `positionSize: 0` with `quantity: 0` and reconcile current positions; a positive quantity can open an order when already flat. |
| **An unknown `data` key is silently ignored** | `strikeOffset` where the field is `offset` imports cleanly, runs successfully, and leaves the node on its default. Nothing in the run says so. Check the workflow before importing it. |

## Live vs Analyzer mode

Flow does not have its own sandbox-mode switch. It inherits the global
**Analyzer** toggle:

* **Analyzer on**: orders are simulated by the Sandbox engine. Order ids are
  real-looking, `mode` is `analyze`, and nothing reaches your broker.
* **Analyzer off**: orders go to the live broker.

Always build and validate a strategy with Analyzer on. Every run log quoted in
this section was captured in Analyzer mode against a live broker connection.

One thing behaves *differently* between the two, and it is the one place where
Analyzer testing can mislead: `closePositions` honours its symbol, exchange
and product filter in Analyzer mode and ignores it live.
