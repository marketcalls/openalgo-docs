# PlaceSmartOrder

Place Order Smartly by analyzing the current open position. It matches the Position Size with the given position book. Buy/Sell Signal Orders will be traded accordingly to the Position Size.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/placesmartorder
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/placesmartorder
Custom Domain:  POST https://<your-custom-domain>/api/v1/placesmartorder
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "Test Strategy",
  "exchange": "NSE",
  "symbol": "IDEA",
  "action": "BUY",
  "product": "MIS",
  "pricetype": "MARKET",
  "quantity": "1",
  "position_size": "5",
  "price": "0",
  "trigger_price": "0",
  "disclosed_quantity": "0"
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/placesmartorder \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "strategy": "Test Strategy",
  "exchange": "NSE",
  "symbol": "IDEA",
  "action": "BUY",
  "product": "MIS",
  "pricetype": "MARKET",
  "quantity": "1",
  "position_size": "5",
  "price": "0",
  "trigger_price": "0",
  "disclosed_quantity": "0"
}'
```

## Sample API Response

```json
{
  "orderid": "240307000616990",
  "status": "success"
}
```

## Parameters Description

| Parameters | Description | Mandatory/Optional | Default Value |
|------------|-------------|-------------------|---------------|
| apikey | App API key | Mandatory | - |
| strategy | Strategy name | Mandatory | - |
| exchange | Exchange code | Mandatory | - |
| symbol | Trading symbol | Mandatory | - |
| action | Action (BUY/SELL) | Mandatory | - |
| product | Product type | Optional | MIS |
| pricetype | Price type | Optional | MARKET |
| quantity | Signal quantity. Unlike PlaceOrder, `0` is accepted here: it means "only reconcile to `position_size`" | Mandatory | - |
| position_size | Target net position, signed. Positive is long, negative is short, `0` is flat | Mandatory | - |
| price | Price | Optional | 0 |
| trigger_price | Trigger price | Optional | 0 |
| disclosed_quantity | Disclosed quantity | Optional | 0 |

These twelve fields are the complete `SmartOrderSchema`. Any other field returns HTTP 400.

## How PlaceSmartOrder API Works?

**Video Tutorial**: [Watch on YouTube](https://www.youtube.com/watch?v=bC46E1GV4gY)

PlaceSmartOrder API function allows traders to build intelligent trading systems that can automatically place orders based on existing trade positions in the position book.

| Action | Qty (API) | Pos Size (API) | Current Open Pos | Action by OpenAlgo |
|--------|-----------|----------------|------------------|-------------------|
| BUY | 100 | 0 | 0 | No Open Pos Found. Buy +100 qty |
| BUY | 100 | 100 | -100 | BUY 200 to match Open Pos in API Param |
| BUY | 100 | 100 | 100 | No Action. Position matched |
| BUY | 100 | 200 | 100 | BUY 100 to match Open Pos in API Param |
| SELL | 100 | 0 | 0 | No Open Pos Found. SELL 100 qty |
| SELL | 100 | -100 | +100 | SELL 200 to match Open Pos in API Param |
| SELL | 100 | -100 | -100 | No Action. Position matched |
| SELL | 100 | -200 | -100 | SELL 100 to match Open Pos in API Param |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | "success" or "error" |
| orderid | string | Unique order ID from broker (on success) |
| message | string | Error message or "No action needed" if position already at target |
| mode | string | `"analyze"` for sandbox execution, `"semi_auto"` when queued for approval; absent on the ordinary live placement result |

## Approval and execution outcomes

In Semi-Auto mode this request can return HTTP `200`, `status: "success"`, `mode: "semi_auto"` and `pending_order_id` after queuing for Action Center approval. It has not yet placed a broker order. In Auto/analyzer execution, inspect the placement result and confirm fills separately. See [order outcomes and retries](../README.md#order-outcomes-and-retries).

A detected lost broker reply can return `502` after the order may have been sent. Check broker order/position books before retrying. A gthread broker-queue refusal returns `429` before sending; it is a different outcome.

## Notes

- Smart orders are ideal for **position-based strategies** where you want to maintain a specific position size
- The **position_size** represents the absolute target position:
  - Positive values = Long position
  - Negative values = Short position
  - Zero = Exit an existing position; when already flat, a nonzero BUY/SELL signal quantity can open a new position as shown above
- A matched nonzero target needs no order. `position_size=0` with nonzero `quantity` can have signal-style behavior when already flat; use `quantity=0` for reconciliation-only intent
- Support depends on the active broker's exchanges/products
- A failed position-book read is unknown, not a zero position; a smart order must not proceed by assuming the account is flat
- Fractional quantities are accepted only for `CRYPTO`; non-crypto quantities must be whole numbers.
- **Rate limit**: `SMART_ORDER_RATE_LIMIT`, default 10 requests per second

---

**Back to**: [API Documentation](../README.md)
