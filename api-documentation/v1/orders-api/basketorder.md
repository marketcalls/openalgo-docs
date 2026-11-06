# BasketOrder

Place multiple orders simultaneously in a single API call. Ideal for portfolio rebalancing, multi-stock strategies, or executing correlated trades.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/basketorder
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/basketorder
Custom Domain:  POST https://<your-custom-domain>/api/v1/basketorder
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "Python",
  "orders": [
    {
      "symbol": "BHEL",
      "exchange": "NSE",
      "action": "BUY",
      "quantity": "1",
      "pricetype": "MARKET",
      "product": "MIS"
    },
    {
      "symbol": "ZOMATO",
      "exchange": "NSE",
      "action": "SELL",
      "quantity": "1",
      "pricetype": "MARKET",
      "product": "MIS"
    },
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "action": "BUY",
      "quantity": "1",
      "pricetype": "LIMIT",
      "product": "MIS",
      "price": "1180"
    }
  ]
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/basketorder \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "strategy": "Python",
  "orders": [
    {
      "symbol": "BHEL",
      "exchange": "NSE",
      "action": "BUY",
      "quantity": "1",
      "pricetype": "MARKET",
      "product": "MIS"
    },
    {
      "symbol": "ZOMATO",
      "exchange": "NSE",
      "action": "SELL",
      "quantity": "1",
      "pricetype": "MARKET",
      "product": "MIS"
    },
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "action": "BUY",
      "quantity": "1",
      "pricetype": "LIMIT",
      "product": "MIS",
      "price": "1180"
    }
  ]
}'
```

## Sample API Response

```json
{
  "status": "success",
  "results": [
    {
      "symbol": "BHEL",
      "exchange": "NSE",
      "product": "MIS",
      "status": "success",
      "orderid": "250408000999544"
    },
    {
      "symbol": "ZOMATO",
      "exchange": "NSE",
      "product": "MIS",
      "status": "success",
      "orderid": "250408000997545"
    },
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "product": "MIS",
      "status": "success",
      "orderid": "250408000997546"
    }
  ]
}
```

Failed legs carry only `symbol`, `status`, and `message`; `exchange`, `product`, and `orderid` are omitted. In analyzer mode the top level also carries `"mode": "analyze"`.

## Request Body

| Parameter | Description | Mandatory/Optional | Default Value |
|-----------|-------------|-------------------|---------------|
| apikey | Your OpenAlgo API key | Mandatory | - |
| strategy | Strategy identifier | Mandatory | - |
| orders | Array of order objects | Mandatory | - |

### Order Object Fields

| Parameter | Description | Mandatory/Optional | Default Value |
|-----------|-------------|-------------------|---------------|
| symbol | Trading symbol | Mandatory | - |
| exchange | Exchange code accepted by the shared validation constants | Mandatory | - |
| action | Order action: BUY or SELL | Mandatory | - |
| quantity | Positive numeric order quantity | Mandatory | - |
| pricetype | Price type: MARKET, LIMIT, SL, SL-M | Optional | MARKET |
| product | Product type: MIS, CNC, NRML | Optional | MIS |
| price | Order price (for LIMIT orders) | Optional | 0 |
| trigger_price | Trigger price (for SL orders) | Optional | 0 |
| disclosed_quantity | Disclosed quantity for iceberg orders | Optional | 0 |

The top-level body accepts only `apikey`, `strategy`, and `orders`; each item in `orders` accepts only the eight fields above. Any other key, at either level, returns HTTP 400. In particular there is no per-order `strategy` field.

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | "success" if at least one order succeeded |
| results | array | Array of individual order results |

### Results Array Fields

| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Trading symbol. Always present |
| status | string | "success" or "error". Always present |
| exchange | string | Exchange for the leg. Success entries only |
| product | string | Product for the leg. Success entries only |
| orderid | string | Order ID from broker. Success entries only |
| message | string | Error message. Failure entries only |

## Approval and execution outcomes

In Semi-Auto mode this request can return HTTP `200`, `status: "success"`, `mode: "semi_auto"` and `pending_order_id` after queuing for Action Center approval. It has not yet placed a broker order. In Auto/analyzer execution, inspect the placement result and confirm fills separately. See [order outcomes and retries](../README.md#order-outcomes-and-retries).

Inspect every child result even on HTTP `200`. A child that reports a lost broker reply may already exist at the broker; reconcile before retrying. Resending the complete batch can duplicate successful or ambiguous children.

## Notes

- BUY orders are processed before SELL orders. Live execution uses concurrent batches of 10 with a one-second delay between batches.
- Analyzer execution prefetches quotes and sends the ordered basket through the sandbox path.
- If some orders fail, others still execute (partial success possible)
- Each order in the basket is independent
- Fractional quantities are accepted only for `CRYPTO`; non-crypto quantities must be whole numbers.
- **Rate limit**: `API_RATE_LIMIT`, not `ORDER_RATE_LIMIT`
- Use for:
  - **Portfolio rebalancing**: Buy/sell multiple stocks together
  - **Pair trading**: Simultaneous long/short positions
  - **Index tracking**: Replicating index constituents

## Example Use Cases

### Portfolio Rebalancing
```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "Rebalance",
  "orders": [
    {"symbol": "TCS", "exchange": "NSE", "action": "BUY", "quantity": "5", "pricetype": "MARKET", "product": "CNC"},
    {"symbol": "INFY", "exchange": "NSE", "action": "BUY", "quantity": "10", "pricetype": "MARKET", "product": "CNC"},
    {"symbol": "WIPRO", "exchange": "NSE", "action": "SELL", "quantity": "8", "pricetype": "MARKET", "product": "CNC"}
  ]
}
```

### Pair Trading
```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "PairTrade",
  "orders": [
    {"symbol": "SBIN", "exchange": "NSE", "action": "BUY", "quantity": "100", "pricetype": "MARKET", "product": "MIS"},
    {"symbol": "BANKBARODA", "exchange": "NSE", "action": "SELL", "quantity": "200", "pricetype": "MARKET", "product": "MIS"}
  ]
}
```

---

**Back to**: [API Documentation](../README.md)
