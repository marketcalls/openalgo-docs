# Portfolio API

**Base path:** `/api/v1/portfolio`

All four resources require a valid OpenAlgo API key. Portfolio analysis is read-only and never places orders.

## Endpoints

| Method | Path | Authentication | Success response |
|---|---|---|---|
| GET | `/benchmarks?apikey=...` | Valid API key | JSON benchmark inventory |
| POST | `/backtest` | `apikey` in JSON | Full JSON analysis |
| POST | `/tearsheet` | `apikey` in JSON | Downloadable HTML |
| POST | `/holdings` | `apikey` in JSON plus active broker session | Current-holdings summary and analysis |

The heavier JSON endpoints use `PORTFOLIO_API_RATE_LIMIT`, which defaults to `10 per minute`. Tearsheet rendering uses `PORTFOLIO_TEARSHEET_RATE_LIMIT`, which defaults to `5 per minute`. `/benchmarks` uses the shared API limit.

## GET `/benchmarks`

Reads available index symbols from the downloaded instrument master. The list therefore varies by broker and master-contract coverage.

```json
{
  "status": "success",
  "data": [
    {"symbol": "NIFTY", "exchange": "NSE_INDEX", "name": "Nifty 50"}
  ]
}
```

## POST `/backtest`

```json
{
  "apikey": "YOUR_OPENALGO_API_KEY",
  "holdings": [
    {"symbol": "INFY", "exchange": "NSE", "weight": 40},
    {"symbol": "HDFCBANK", "exchange": "NSE", "weight": 60}
  ],
  "start_date": "2021-01-01",
  "end_date": "2026-01-01",
  "benchmark": "NIFTY",
  "benchmark_exchange": "NSE_INDEX",
  "rebalance": "quarterly",
  "drift_band": 0.05,
  "cost_model": "indian_equity",
  "cost_exchange": "NSE",
  "slippage": 0.0005,
  "initial_capital": 100000,
  "risk_free_rate": 0.06,
  "source": "db"
}
```

### Request fields

| Field | Required | Contract | Default |
|---|---|---|---|
| `apikey` | Yes | Valid OpenAlgo API key | - |
| `holdings` | Yes | 1-50 unique holdings | - |
| `holdings[].symbol` | Yes | 1-64 characters, normalized uppercase | - |
| `holdings[].exchange` | No | `NSE` or `BSE` | `NSE` |
| `holdings[].weight` | Yes | Non-negative number; weights are normalized by ratio | - |
| `start_date`, `end_date` | Yes | Date strings accepted by the history layer | - |
| `benchmark` | No | Index symbol or `null` | `null` |
| `benchmark_exchange` | No | `NSE_INDEX`, `BSE_INDEX`, or `GLOBAL_INDEX` | `NSE_INDEX` |
| `rebalance` | No | `never`, `monthly`, `quarterly`, or `yearly` | `never` |
| `drift_band` | No | Fraction from `0` through `0.99` | `0` |
| `cost_model` | No | `indian_equity` or `flat_bps` | `indian_equity` |
| `brokerage_pct` | No | Brokerage as a fraction from `0` through `0.05` | `0` |
| `cost_exchange` | No | `NSE` or `BSE`; which exchange's transaction charge applies | `NSE` |
| `charges` | No | Per-charge overrides, for example `{"brokerage":{"flat":10,"cap":20},"stt":{"rate":0.001}}`; nested `rate`, `flat`, `cap` values are non-negative or `null` | `{}` |
| `gst_rate` | No | GST as a fraction from `0` through `1`, or `null` to use the built-in rate | `null` |
| `cost_bps` | No | Flat cost from 0 through 1000 basis points | `0` |
| `slippage` | No | Fraction from `0` through `0.1` | `0` |
| `initial_capital` | No | At least 1 | `100000` |
| `risk_free_rate` | No | Fraction from `0` through `0.5` | `0` |
| `source` | No | `db` or `api` | `db` |

`PortfolioBacktestSchema` does not allow unknown fields: any key outside this list returns HTTP 400.

`charges` keys for the Indian-equity schedule are `brokerage`, `stt`, `exchange_txn`, `sebi` and `stamp_duty`. Rates are fractions of the applicable basis; `flat` and `cap` are rupee amounts per order where applicable. Unknown charge keys are ignored. Leave overrides out to use the built-in schedule, and check the rates applicable to the market/period being modelled.

`source=db` reads local Historify data and still requires a valid OpenAlgo API key. `source=api` also requires an active broker session and calls broker history sequentially.

The success response keeps analysis fields at the top level, not under `data`. `meta.total_return_basis` is `"price"`; dividends are not included. Read `meta.data_warnings` and benchmark availability alongside the results. It contains including equity, benchmark, metrics, holding contributions, correlations, diversification, allocation, costs, rebalancing, walk-forward, Monte Carlo, crisis, health, and insight sections.

## POST `/tearsheet`

Accepts the same request shape as `/backtest`. Success returns a self-contained HTML attachment:

```text
Content-Type: text/html; charset=utf-8
Content-Disposition: attachment; filename="portfolio-tearsheet.html"
```

## POST `/holdings`

```json
{
  "apikey": "YOUR_OPENALGO_API_KEY",
  "lookback_days": 365,
  "benchmark": "NIFTY",
  "benchmark_exchange": "NSE_INDEX",
  "risk_free_rate": 0.06,
  "source": "db"
}
```

`/holdings` uses its own schema, which accepts only these six fields; anything else returns HTTP 400.

| Field | Required | Contract | Default |
|---|---|---|---|
| `apikey` | Yes | Valid OpenAlgo API key | - |
| `lookback_days` | No | Integer from 60 through 3650 | `365` |
| `benchmark` | No | Index symbol or `null` | `NIFTY` |
| `benchmark_exchange` | No | `NSE_INDEX`, `BSE_INDEX`, or `GLOBAL_INDEX` | `NSE_INDEX` |
| `risk_free_rate` | No | Fraction from `0` through `0.5` | `0` |
| `source` | No | `db` or `api` | `db` |

Unlike `/backtest`, `benchmark` here defaults to `NIFTY` rather than `null`. There is no `holdings` array: the positions come from the broker. This endpoint always needs an active broker session to read current holdings. Historical prices then come from the selected `db` or `api` source.

The result is a historical scenario for today's market-value allocation, not the account's actual performance. The holdings response does not contain purchase dates or cash flows, so the service cannot reconstruct realized returns.

## Errors

| Status | Meaning |
|---|---|
| 400 | Invalid schema, duplicate symbols, weights, dates, or cost policy |
| 403 | Invalid API key or required broker session absent |
| 422 | Missing/incompatible history or no usable current holdings |
| 429 | Configured rate limit exceeded |
| 500 | Unexpected internal failure |

A missing benchmark can leave benchmark-relative sections empty without invalidating an otherwise usable portfolio simulation.
