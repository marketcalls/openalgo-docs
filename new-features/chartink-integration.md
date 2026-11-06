# Chartink Integration

OpenAlgo turns a Chartink scanner alert into orders. Configure the strategy at `/chartink`, point the Chartink alert at the strategy's webhook URL, and an eligible active scan queues work for its configured symbols. Queue acceptance is separate from broker acceptance and fills.

## How a Scan Becomes an Order

The action is read from the payload's **`scan_name`** field, not a separate action field. The name must contain one of four keywords:

| Keyword in scan name | Action sent | Order type | Treated as |
| --- | --- | --- | --- |
| `BUY` | BUY | `placeorder` | Entry |
| `SHORT` | SELL | `placeorder` | Entry |
| `SELL` | SELL | `placesmartorder` with `position_size: 0` | Exit |
| `COVER` | BUY | `placesmartorder` with `position_size: 0` | Exit |

A scan name containing none of these is rejected with HTTP 400. Use exactly one keyword: the parser checks BUY, SELL, SHORT and COVER in that order.

Exits use a smart order with both `quantity: 0` and a zero target position, so the broker's own net position decides the exit quantity. You do not have to track how much is open.

## Dual Queue and Rate Limiting

Orders do not go to the broker straight from the webhook. They are queued and drained by a background worker:

* Entry orders (`BUY`, `SHORT`) go to the regular queue and are released at up to 10 per second.
* Exit orders (`SELL`, `COVER`) go to the smart-order queue, which is drained first and paced at one per second.

Exits therefore take priority over entries when both arrive in the same scan.

The webhook route itself is rate-limited by `WEBHOOK_RATE_LIMIT`, which defaults to 100 requests per minute.

## Strategy Configuration

Each strategy holds its own symbol list. Per symbol you configure the exchange, quantity, and product type. Chartink strategies are **cash-market only**: the valid exchanges are `NSE` and `BSE`, and the product type is `MIS` for intraday or `CNC` for delivery.

Symbols can be added one at a time or pasted in bulk as `SYMBOL,EXCHANGE,QUANTITY,PRODUCT` lines.

A symbol returned by the scan but absent from the strategy's mapping is skipped.

## Trading Hours and Auto Square-off

An intraday strategy has three times, all IST:

| Setting | Effect |
| --- | --- |
| Start time | Nothing is placed before this, entries or exits |
| End time | Entry orders (`BUY`, `SHORT`) are refused after this |
| Square-off time | Nothing is placed after this, and a scheduled job flattens every mapped symbol |

The square-off job issues a smart order with `quantity: 0` and `position_size: 0` for each mapped symbol, queued like any other order so the pacing still applies.

Positional strategies skip all three checks.

## Setting Up the Alert

1. Create the strategy at `/chartink` and add its symbols.
2. Copy the generated webhook URL.
3. In Chartink, create the scan and name it so the name contains `BUY`, `SELL`, `SHORT`, or `COVER`.
4. Set the alert's webhook to the copied URL.
5. Activate the strategy in OpenAlgo. An inactive strategy accepts the webhook and does nothing.

Test in Analyzer mode first. Chartink orders use the same service layer as the REST API, so Analyzer mode and Action Center approval apply to them exactly as they do to an API order.

## Related

* [Strategy RMS Engine](strategy-rms-engine.md) for the separate `/strategy` webhook used by alert senders. Batch strategies accept `start` and `stop`; signal strategies accept `long_entry`, `long_exit`, `short_entry`, and `short_exit` from the JSON payload. Chartink remains a separate integration that derives its action from the scan name.
* [ChartInk](../trading-platform/chartink.md) for the platform-side setup.


## Verify the Outcome

Keep the generated webhook URL private: its identifier selects the strategy and the receiver retrieves the saved account API key itself. Check logs and order/trade/position books after a test. A successful queue response is not a completed fill, and repeated entry scans can submit repeated orders. Reconcile ambiguous responses before sending replacements.
