# 55 - Portfolio Analytics

Portfolio analytics is an authenticated, synchronous, read-only subsystem. It loads historical prices and, for the Analyzer, current broker holdings. It does not call order placement, modification, or cancellation services.

## Request Path

<figure><img src="../../.gitbook/assets/diagram-portfolio-analytics-request-path.png" alt="Portfolio analytics request path: React to /api/v1/portfolio checks, portfolio_service, portfolio package modules and openstatz, with Historify DuckDB or history service and holdings service to broker APIs"><figcaption></figcaption></figure>

The API returns the complete analysis in one response so every results tab reads the same simulation generation.

## Data Sources

| Source | Path | Operational property |
|---|---|---|
| `db` | Direct multi-symbol read from Historify DuckDB | Deterministic and not broker-rate-limited; requires ingestion |
| `api` | One history-service call per symbol | Sequential, rate-limited, and broker/session dependent |

The loader supports NSE/BSE cash instruments. Benchmarks are restricted to `NSE_INDEX`, `BSE_INDEX`, and `GLOBAL_INDEX`; choices come from the active instrument master.

A process-local, lock-protected LRU cache holds up to 16 loaded price matrices. Historify ingestion clears that cache before newly ingested bars can be observed. `HISTORIFY_DATABASE_PATH` configures the DuckDB file and defaults to `db/historify.duckdb`.

## Simulation Model

* Long-only and fully invested; weights are normalized and no cash sleeve is modeled.
* A request contains at most 50 unique holdings.
* Missing requested history raises a data error instead of silently changing the portfolio.
* Rebalance rules are `never`, `monthly`, `quarterly`, and `yearly`; a drift band may trigger between calendar rebalances.
* Costs apply only to realized traded value. The default is an itemized Indian delivery-equity schedule; callers can override components or choose flat basis points. Slippage is separate.
* Returns are price-only. Dividends and user cash flows are not reconstructed.

## Analysis Products

The service serializes equity, benchmark, contribution, correlation, concentration, allocation, costs, and rebalancing data, then adds rolling and drawdown analytics, walk-forward and Monte Carlo robustness, policy comparison, attribution, co-movement structure, crisis windows, a transparent health score, and deterministic findings.

NaN and infinity become JSON `null`; keys remain present so the response shape does not silently change when a statistic is undefined.

## Current-Holdings Adapter

The holdings workflow calls the normalized broker holdings service, parses usable quantity and price fields, and weights assets by current market value. It then runs today's allocation over historical prices with `rebalance="never"`. The response states this counterfactual basis and reports unsupported exchanges separately.

## Resource and Failure Boundaries

* Backtests are synchronous and hold a full close-price matrix in memory; the 50-symbol cap bounds one request.
* Broker-source runs scale with symbol count and may be slow or rate-limited.
* Missing or incompatible data returns 422; invalid configuration returns 400; authentication/session failures return 403.
* Tearsheet generation has a separate rate limit because embedded-chart rendering is heavier than JSON serialization.

See [Portfolio Backtester and Analyzer](../../new-features/portfolio-analytics.md) and the [Portfolio API](../../api-documentation/v1/portfolio.md).
