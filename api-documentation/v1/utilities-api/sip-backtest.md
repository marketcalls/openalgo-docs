# SIP Backtest

Backtest a systematic investment plan against historical data and compare it with a lumpsum investment over the same window.

Two endpoints make up this resource: `GET /api/v1/sip/frequencies` lists the schedules the backtester accepts, and `POST /api/v1/sip/backtest` runs the simulation.

## Endpoint URLs

```http
Local Host   :  GET  http://127.0.0.1:5000/api/v1/sip/frequencies
                POST http://127.0.0.1:5000/api/v1/sip/backtest
Ngrok Domain :  https://<your-ngrok-domain>.ngrok-free.app/api/v1/sip/...
Custom Domain:  https://<your-custom-domain>/api/v1/sip/...
```

***

## List Frequencies

```http
GET /api/v1/sip/frequencies
```

Returns the four schedules the backtester supports.

```bash
curl --get 'http://127.0.0.1:5000/api/v1/sip/frequencies'
```

| Frequency | Meaning |
| --- | --- |
| `monthly` | One installment per month, the default |
| `fortnightly` | One installment every two weeks |
| `weekly` | One installment per week |
| `quarterly` | One installment every three months |

{% hint style="warning" %}
This list needs no API key and reads no account data. `/sectorrotation/options` is another unauthenticated metadata list. The backtest itself always verifies the OpenAlgo API key.
{% endhint %}

***

## Run a Backtest

```http
POST /api/v1/sip/backtest
```

### Sample Request

```json
{
  "apikey": "<your_app_apikey>",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "start_date": "2020-01-01",
  "end_date": "2025-01-01",
  "amount": 10000,
  "frequency": "monthly",
  "day_of_month": 1,
  "step_up_percent": 10,
  "benchmark": "NIFTY",
  "benchmark_exchange": "NSE_INDEX"
}
```

### Sample cURL Request

```bash
curl -X POST http://127.0.0.1:5000/api/v1/sip/backtest \
  -H 'Content-Type: application/json' \
  -d '{
  "apikey": "<your_app_apikey>",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "start_date": "2020-01-01",
  "end_date": "2025-01-01",
  "amount": 10000,
  "frequency": "monthly"
}'
```

### Request Body

#### The SIP itself

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `apikey` | string | Mandatory | - | Your OpenAlgo API key |
| `symbol` | string | Mandatory | - | Instrument to invest in, 1 to 64 characters |
| `exchange` | string | Optional | `NSE` | `NSE` or `BSE` only |
| `start_date` | string | Mandatory | - | `YYYY-MM-DD`, exactly 10 characters |
| `end_date` | string | Mandatory | - | `YYYY-MM-DD`, exactly 10 characters |
| `amount` | number | Mandatory | - | Installment amount, 1 to 10,000,000 |
| `frequency` | string | Optional | `monthly` | `monthly`, `fortnightly`, `weekly` or `quarterly` |
| `day_of_month` | integer | Optional | `1` | Installment day, **1 to 28** |
| `step_up_percent` | number | Optional | `0` | Annual increase in the installment, 0 to 100 percent |

{% hint style="info" %}
`day_of_month` is capped at 28 rather than 31 by design. A SIP dated the 31st does not exist in every month, and silently shifting it would produce a schedule you did not ask for.

Monthly and quarterly schedules target `day_of_month` on or after `start_date`; weekly and fortnightly schedules anchor on `start_date`. Requested dates move to the next available trading session. The response preserves both requested and executed dates.
{% endhint %}

#### Costs

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `cost_model` | string | Optional | `indian_equity` | `indian_equity` for the full statutory charge model, or `flat_bps` |
| `cost_exchange` | string | Optional | `NSE` | Exchange whose charge schedule applies, `NSE` or `BSE` |
| `brokerage_percent` | number | Optional | `0` | Percentage brokerage, 0 to 5 |
| `brokerage_flat` | number | Optional | `0` | Flat brokerage per order, 0 to 10,000 |
| `charges` | object | Optional | `null` | Override individual statutory charges |
| `gst_rate` | number | Optional | `null` | Override the GST rate, 0 to 1 |
| `cost_bps` | number | Optional | `0` | Basis points, used when `cost_model` is `flat_bps`, 0 to 1000 |
| `slippage` | number | Optional | `0` | Slippage as a fraction, 0 to 0.1 |

The `indian_equity` model matches the portfolio backtester, so the same trade costs the same in both tools.

#### Benchmark and data

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `benchmark` | string | Optional | `null` | Index symbol to compare against, max 64 characters |
| `benchmark_exchange` | string | Optional | `NSE_INDEX` | Index exchanges only |
| `source` | string | Optional | `db` | `db` for stored Historify data, or `api` for the broker |
| `include_grids` | boolean | Optional | `true` | Include the start-date sensitivity grids in the response |

{% hint style="info" %}
A benchmark must be an **index**. A benchmark is not something you can hold, so comparing a SIP against a single stock would not be meaningful.

`source` defaults to `db`, so a backtest reads locally stored history. Download the range you need with [Historify](../../../new-features/historify.md) first, or set `source` to `api` to pull from the broker.
{% endhint %}

The supported date span is at most 30 years. `brokerage_percent` uses percentage points (0–5), whereas portfolio `brokerage_pct` uses a fraction. `charges` follows the [portfolio charge override format](../portfolio.md#request-fields).

### Response

The response reports what the SIP would have returned, what the same money invested as a lumpsum would have returned, and, when `include_grids` is true, how sensitive the result is to the start date.

Key figures include XIRR, the effect of rupee-cost averaging, total invested, final value and total charges.

***

## Notes

* This resource backtests and never places an order. `source="api"` reads historical data through the broker session; `source="db"` reads local Historify data.
* Results depend on the history available locally. A range with gaps produces a schedule with fewer installments than you expect rather than an error.
* `step_up_percent` compounds annually, so a 10 percent step-up on a 10,000 monthly SIP invests 11,000 a month in year two.

## Related

* [Portfolio Backtester and Analyzer](../../../new-features/portfolio-analytics.md)
* [Historify](../../../new-features/historify.md)
* [History](../data-api/history.md) for the underlying candle data

---

**Back to**: [API Documentation](../README.md)
