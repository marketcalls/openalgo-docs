# OptionsOrder

Place an options order by specifying offset (ATM/ITM/OTM) instead of exact strike price. The API automatically resolves the correct option symbol based on the current underlying price.

## Endpoint URL

```http
Local Host   :  POST http://127.0.0.1:5000/api/v1/optionsorder
Ngrok Domain :  POST https://<your-ngrok-domain>.ngrok-free.app/api/v1/optionsorder
Custom Domain:  POST https://<your-custom-domain>/api/v1/optionsorder
```

## Sample API Request (ATM Option)

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "python",
  "underlying": "NIFTY",
  "exchange": "NSE_INDEX",
  "expiry_date": "28OCT25",
  "offset": "ATM",
  "option_type": "CE",
  "action": "BUY",
  "quantity": "65",
  "pricetype": "MARKET",
  "product": "NRML",
  "splitsize": "0"
}
```

## Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/optionsorder \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "strategy": "python",
  "underlying": "NIFTY",
  "exchange": "NSE_INDEX",
  "expiry_date": "28OCT25",
  "offset": "ATM",
  "option_type": "CE",
  "action": "BUY",
  "quantity": "65",
  "pricetype": "MARKET",
  "product": "NRML",
  "splitsize": "0"
}'
```

## Sample API Response (ATM Option)

```json
{
  "exchange": "NFO",
  "offset": "ATM",
  "option_type": "CE",
  "orderid": "25102800000006",
  "status": "success",
  "symbol": "NIFTY28OCT2525950CE",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05
}
```

## Sample API Request (ITM Option)

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "python",
  "underlying": "NIFTY",
  "exchange": "NSE_INDEX",
  "expiry_date": "28OCT25",
  "offset": "ITM4",
  "option_type": "PE",
  "action": "BUY",
  "quantity": "65",
  "pricetype": "MARKET",
  "product": "NRML",
  "splitsize": "0"
}
```

## Sample API Response (ITM Option)

```json
{
  "exchange": "NFO",
  "offset": "ITM4",
  "option_type": "PE",
  "orderid": "25102800000007",
  "status": "success",
  "symbol": "NIFTY28OCT2526150PE",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05
}
```

## Sample API Request (OTM Option)

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "python",
  "underlying": "NIFTY",
  "exchange": "NSE_INDEX",
  "expiry_date": "28OCT25",
  "offset": "OTM5",
  "option_type": "CE",
  "action": "BUY",
  "quantity": "65",
  "pricetype": "MARKET",
  "product": "NRML",
  "splitsize": "0"
}
```

## Offset Values

| Offset | Description |
|--------|-------------|
| ATM | At-The-Money (strike closest to current price) |
| ITM1 to ITM50 | In-The-Money (1-50 strikes away) |
| OTM1 to OTM50 | Out-of-The-Money (1-50 strikes away) |

### Understanding ITM/OTM for CE and PE

| Option Type | ITM Direction | OTM Direction |
|-------------|---------------|---------------|
| CE (Call) | Lower strikes | Higher strikes |
| PE (Put) | Higher strikes | Lower strikes |

## Request Body

| Parameter | Description | Mandatory/Optional | Default Value |
|-----------|-------------|-------------------|---------------|
| apikey | Your OpenAlgo API key | Mandatory | - |
| strategy | Strategy identifier | Mandatory | - |
| underlying | Underlying symbol (NIFTY, BANKNIFTY, etc.) or a futures symbol that already carries the expiry | Mandatory | - |
| exchange | Underlying's exchange. Any value in the shared `VALID_EXCHANGES` list passes validation; the practical values are NSE_INDEX, NSE, BSE_INDEX, BSE, NFO, BFO | Mandatory | - |
| expiry_date | Expiry date in DDMMMYY format (e.g., 30JUL26) | Optional | Derived when `underlying` includes expiry |
| strike_int | Strike interval, positive integer or `null`. Omit it so the actual strikes in the instrument master are used, which is the recommended and more accurate path | Optional | Derived from the instrument master |
| offset | Strike offset: ATM, ITM1-ITM50, OTM1-OTM50 | Mandatory | - |
| option_type | Option type: CE or PE (lowercase accepted) | Mandatory | - |
| action | Order action: BUY or SELL (lowercase accepted) | Mandatory | - |
| quantity | Order quantity, positive integer | Mandatory | - |
| splitsize | Split order into chunks (0 = no split) | Optional | 0 |
| pricetype | Price type: MARKET, LIMIT, SL, SL-M | Optional | MARKET |
| product | Product type: MIS or NRML. CNC is rejected for options | Optional | MIS |
| price | Limit price (for LIMIT orders) | Optional | 0 |
| trigger_price | Trigger price (for SL orders) | Optional | 0 |
| disclosed_quantity | Disclosed quantity | Optional | 0 |

These fifteen fields are the complete `OptionsOrderSchema`. Any other field returns HTTP 400. Note that this endpoint takes `underlying` and `offset`, never `symbol` or `strike`.

## Split Response Shape

When `splitsize` is greater than zero the response replaces `orderid` with the split summary. The resolved-symbol fields stay the same:

```json
{
  "status": "success",
  "symbol": "NIFTY28OCT2525950CE",
  "exchange": "NFO",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05,
  "offset": "ATM",
  "option_type": "CE",
  "total_quantity": 195,
  "split_size": 65,
  "results": [
    {"order_num": 1, "quantity": 65, "status": "success", "orderid": "25102800000006"},
    {"order_num": 2, "quantity": 65, "status": "success", "orderid": "25102800000007"},
    {"order_num": 3, "quantity": 65, "status": "success", "orderid": "25102800000008"}
  ]
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | "success" or "error" |
| orderid | string | Unique order ID from broker |
| symbol | string | Resolved option symbol |
| exchange | string | Exchange where order was placed (NFO/BFO) |
| offset | string | Offset used for resolution |
| option_type | string | CE or PE |
| underlying | string | Underlying futures symbol used for price reference |
| underlying_ltp | number | Last traded price of underlying |
| mode | string | "analyze" for sandbox execution, "semi_auto" when queued for approval; absent on ordinary live execution |
| total_quantity | number | Split responses only: total quantity processed |
| split_size | number | Split responses only: size used for splitting |
| results | array | Split responses only: per-child `order_num`, `quantity`, `status`, `orderid` |

## Approval and execution outcomes

In Semi-Auto mode this request can return HTTP `200`, `status: "success"`, `mode: "semi_auto"` and `pending_order_id` after queuing for Action Center approval. It has not yet placed a broker order. In Auto/analyzer execution, inspect the placement result and confirm fills separately. See [order outcomes and retries](../README.md#order-outcomes-and-retries).

## Notes

- The **underlying** is used to fetch the current price for ATM calculation
- For **NSE_INDEX** or **BSE_INDEX** exchange, the order is placed on NFO/BFO respectively
- The **expiry_date** must be in DDMMMYY format (e.g., 28OCT25, 25NOV25)
- Use **splitsize** to break large orders into smaller chunks (max 100 child orders per split)
- The API uses the synthetic futures price or spot price to determine ATM strike
- Quantity is a positive integer. Offset is `ATM`, `ITM1`-`ITM50`, or `OTM1`-`OTM50`.
- Leave **strike_int** out unless you have a specific reason to override the strike ladder. The service reads the real strikes from the instrument master when it is absent, which handles irregular ladders correctly.
- **Rate limit**: `ORDER_RATE_LIMIT`, default 10 requests per second

---

**Back to**: [API Documentation](../README.md)
