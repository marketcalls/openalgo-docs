# Order History

Read the durable orders placed by Strategy RMS across an owned strategy's runs, optionally narrowed to one run.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/strategy/orders
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/strategy/orders
Custom Domain:  POST https://<your-custom-domain>/api/v1/strategy/orders
```

## Sample API Request

```json
{
  "apikey": "<your_app_apikey>",
  "strategy_id": 7,
  "run_id": 42
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/strategy/orders \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "strategy_id": 7,
  "run_id": 42
}'
```

## Sample API Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 318,
      "run_id": 42,
      "leg_id": 1,
      "kind": "entry",
      "position_ref": "969bc536b1c14d15992f730c2c136d7a",
      "broker_order_id": "26083004118201",
      "symbol": "NIFTY04SEP2624500CE",
      "exchange": "NFO",
      "action": "SELL",
      "qty": 65,
      "product": "NRML",
      "pricetype": "MARKET",
      "price": 0.0,
      "trigger_price": 0.0,
      "status": "complete",
      "placed_at": "2026-08-30T03:50:11.610224+00:00",
      "filled_at": "2026-08-30T03:50:12.004881+00:00",
      "avg_fill_price": 142.35,
      "filled_qty": 65,
      "reject_reason": null
    }
  ]
}
```

## Request Body

| Parameter | Description | Mandatory/Optional | Default Value |
|---|---|---|---|
| `apikey` | Your OpenAlgo API key | Mandatory | - |
| `strategy_id` | Positive Strategy RMS id | Mandatory | - |
| `run_id` | Positive run id to filter the result | Optional | `null` |

## Response Fields

| Field | Type | Description |
|---|---|---|
| `status` | string | `success` or `error` |
| `data` | array | Strategy orders, oldest first by placement time |

### Order Object Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Strategy order record id |
| `run_id`, `leg_id` | integer | Owning run and configured leg |
| `kind` | string | Reason for the order, such as `entry`, `exit_sl`, or `exit_overall_target` |
| `position_ref` | string or null | Exact durable position owner |
| `broker_order_id` | string or null | Broker/sandbox order reference |
| `symbol`, `exchange`, `action`, `qty` | string/integer | Order sent by the engine |
| `product` | string or null | Product actually sent to the venue |
| `pricetype` | string | `MARKET` |
| `price`, `trigger_price` | number | `0` for Strategy RMS MARKET orders |
| `status` | string | `pending`, `open`, `complete`, `cancelled`, or `rejected` |
| `placed_at`, `filled_at` | string or null | ISO 8601 UTC timestamps |
| `avg_fill_price`, `filled_qty` | number or null | Broker fill facts |
| `reject_reason` | string or null | Engine or broker rejection context |

## Notes

- The intent row is written before the broker answers. A `pending` row with no broker id can therefore be a real, recoverable order.
- A positive `filled_qty` means exposure exists even if a working order later becomes `cancelled` or `rejected`; partial fills are real fills.
- A missing `avg_fill_price` means valuation is unavailable, not zero.
- A run id owned by another strategy returns no rows and leaks no data. There is no limit parameter; filter by `run_id` when needed.

---

**Back to**: [Strategy RMS API](README.md)
