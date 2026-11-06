# CancelAllOrder

Cancel all open orders and trigger pending orders in a single request.

`strategy` is a tracking label, **not a filter**. This operation can cancel orders created by other strategies or manually in the active account. Analyzer mode uses the user's sandbox account instead.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/cancelallorder
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/cancelallorder
Custom Domain:  POST https://<your-custom-domain>/api/v1/cancelallorder
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "Python"
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/cancelallorder \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "strategy": "Python"
}'
```

## Sample API Response

```json
{
  "status": "success",
  "message": "Canceled 5 orders. Failed to cancel 0 orders.",
  "canceled_orders": [
    "250408001042620",
    "250408001042667",
    "250408001042642",
    "250408001043015",
    "250408001043386"
  ],
  "failed_cancellations": []
}
```

## Sample API Response (Partial Success)

```json
{
  "status": "success",
  "message": "Canceled 3 orders. Failed to cancel 2 orders.",
  "canceled_orders": [
    "250408001042620",
    "250408001042667",
    "250408001042642"
  ],
  "failed_cancellations": [
    "250408001043015",
    "250408001043386"
  ]
}
```

## Sample API Response (Analyzer Mode, Partial Success)

Analyzer mode returns richer failure entries and adds `mode`:

```json
{
  "status": "success",
  "message": "Canceled 1 orders. Failed to cancel 1 orders.",
  "canceled_orders": ["SB-250408001042620"],
  "failed_cancellations": [
    {
      "orderid": "SB-250408001043015",
      "message": "Failed to cancel"
    }
  ],
  "mode": "analyze"
}
```

## Request Body

| Parameter | Description | Mandatory/Optional | Default Value |
|-----------|-------------|-------------------|---------------|
| apikey | Your OpenAlgo API key | Mandatory | - |
| strategy | Tracking label; does not restrict the affected account orders/positions | Mandatory | - |

`CancelAllOrderSchema` declares exactly these two fields and both are required. Omitting `strategy` returns HTTP 400, and any additional field returns HTTP 400 as well.

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | "success" or "error" |
| message | string | Summary of cancellation results |
| canceled_orders | array of strings | Successfully cancelled order IDs |
| failed_cancellations | array | Orders that failed to cancel. See the note below on its element type |
| mode | string | `"analyze"` in analyzer mode; absent in live mode |

### Failed Cancellations Element Type

The element type differs by execution path, so handle both:

| Path | Element |
|------|---------|
| Live broker | A plain order-ID **string** |
| Analyzer/sandbox | An object with `orderid` and `message` |

There is no `reason` key on either shape. The live broker mappers only record which order IDs failed; they do not surface a per-order failure reason.

## Notes

- Cancels **all open orders** including:
  - Open limit orders
  - Pending trigger orders (SL, SL-M)
  - AMO orders (if supported by broker)
- Orders that are **already executed** or **in transit** cannot be cancelled
- The API returns success even if some orders fail to cancel
- The **strategy** value is used for event logging and tracking; it does not filter which orders are cancelled. Every eligible open order is cancelled regardless of which strategy placed it.
- This is a **bulk operation** - use with caution in production
- **Rate limit**: `API_RATE_LIMIT`, not `ORDER_RATE_LIMIT`

## Use Cases

- **Emergency exit**: Cancel all pending orders when market moves unexpectedly
- **End of day cleanup**: Cancel unfilled orders before market close
- **Strategy reset**: Clear all pending orders before starting fresh

---

**Back to**: [API Documentation](../README.md)
