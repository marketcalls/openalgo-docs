# 00 - Directory Structure

## Architectural Boundaries

```text
openalgo/
|-- app.py                     Flask factory, blueprint registration, startup
|-- extensions.py              Shared Flask-SocketIO instance
|-- limiter.py                 Shared Flask-Limiter instance
|-- cors.py                    CORS configuration and init
|-- csp.py                     CSP and security-header after_request middleware
|-- restx_api/                 External `/api/v1` resources and schemas
|-- blueprints/                Session UI APIs, webhooks, React route serving
|-- services/                  Business logic and mode routing
|-- broker/                    38 metadata-driven broker plugins
|-- websocket_proxy/           Standalone asyncio WebSocket server and adapters
|-- database/                  SQLAlchemy/DuckDB models and persistence helpers
|-- sandbox/                   Analyzer execution, positions, funds, settlement
|-- portfolio/                 Portfolio analytics, attribution, crisis studies
|-- sip/                       SIP scheduling, XIRR and backtest analytics
|-- events/                    Typed EventBus payloads
|-- subscribers/               Logging, Socket.IO, Telegram, WhatsApp consumers
|-- utils/                     Cross-cutting helpers, middleware, monitors
|-- mcp/                       Local stdio MCP server
|-- frontend/                  React 19 + TypeScript + Vite application
|-- upgrade/                   Database bootstrap and migration scripts
|-- install/                   Bare-metal, Docker and multi-instance installers
|-- scripts/                   Maintenance, benchmark and generator scripts
|-- download/                  Historify bulk downloaders and symbol seeds
|-- docs/                      API, BDD, design, PRD, guides, audits, releases
|-- okf/                       Open Knowledge Format bundle for agents
|-- test/                      Python tests, including sandbox tests
|-- examples/                  Python, Go, and Node.js integration examples
|-- collections/               Bruno and Postman request collections
|-- audit/                     Point-in-time compatibility and leak audits
|-- data/                      Static seed data such as `qtyfreeze.csv`
|-- db/                        Runtime SQLite and DuckDB files (not source)
|-- log/                       Optional runtime log files (not source)
|-- keys/                      Remote MCP OAuth signing keys (runtime, not source)
|-- workspace/                 Gitignored personal scratch area
`-- strategies/                User strategy scripts and runtime content
```

## Request Layers

| Layer | Owns | Must not own |
|---|---|---|
| `restx_api/` | JSON/query parsing, Marshmallow validation, HTTP response | Broker-specific business rules |
| `blueprints/` | Session-authenticated app APIs, webhooks, feature routes | Reusable broker execution logic |
| `services/` | API-key verification, mode routing, normalized orchestration | Flask page rendering |
| `broker/<key>/` | Broker authentication, request mapping, data transforms, streaming | Cross-broker product policy |
| `database/` | Persistence models, migrations, queries, cache invalidation | HTTP contracts |
| `sandbox/` | Simulated execution and account state | Live broker calls |

## Backend Inventory

`restx_api/__init__.py` exposes 74 registered method/path pairs under `/api/v1`. Blueprint and service inventories change as features are added; read the source tree rather than using old fixed module counts. Public REST documentation is maintained in the [API reference](../../api-documentation/v1/README.md).

The service directory currently includes order, account, market-data, option, calendar, Flow, Historify, messaging, charting, analytics, arbitrage, custom straddle, and scalping risk services. Use `rg --files services` for the live inventory instead of copying a long file list into architecture documents.

## Broker Plugin Shape

Every configured broker has `broker/<key>/plugin.json`. Common optional subtrees are:

```text
broker/<key>/
|-- plugin.json                Name, type, supported exchanges, leverage flag
|-- api/
|   |-- auth_api.py            `authenticate_broker(...)`
|   |-- order_api.py           `place_order_api(...)` and order lifecycle calls
|   |-- data.py                Quotes, depth, history, intervals
|   |-- funds.py               Margin and funds
|   |-- margin_api.py          Order margin preview
|   `-- gtt_api.py             GTT lifecycle (six broker implementations)
|-- mapping/
|   |-- transform_data.py      OpenAlgo request to broker request
|   |-- order_data.py          Broker response to OpenAlgo shape
|   |-- margin_data.py
|   `-- gtt_data.py
|-- database/
|   `-- master_contract_db.py  Symbol master download and `symtoken` load
`-- streaming/
    |-- <key>_adapter.py       Market-data WebSocket adapter
    |-- <key>_order_adapter.py Order-update ingestion
    `-- <key>_mapping.py
```

Modules are imported lazily by name, not by a registry: `services/place_order_service.py` calls `importlib.import_module(f"broker.{broker_name}.api.order_api")` on each request, and `utils/plugin_loader.py` returns a `_LazyBrokerAuthDict` that imports `broker.<key>.api.auth_api` only on first access. Not every broker implements every optional file. Live GTT modules currently exist for Angel One, Dhan, Fyers, Rupeezy, Upstox and Zerodha. Their supported trigger and product semantics differ.

## Frontend Shape

```text
frontend/src/
|-- main.tsx                   Vite entry point
|-- App.tsx                    Lazy routes and auth gates
|-- app/providers.tsx          Query, theme, tooltip, Socket.IO providers
|-- api/                       Typed HTTP clients by feature
|-- pages/                     Top-level and grouped route pages
|-- components/                Layout, trading, tools, Flow, scalping, UI
|-- hooks/                     Market data, Socket.IO, visibility, risk helpers
|-- stores/                    Zustand auth, broker, session, theme, Flow state
|-- contexts/                  React contexts shared across feature trees
|-- lib/                       MarketDataManager, plotting, math, helpers
|-- utils/                     Formatting and small pure helpers
|-- config/                    Build-time and runtime front-end configuration
|-- types/                     Feature contracts
|-- assets/                    Static assets bundled by Vite
`-- test/                      Vitest setup and accessibility helpers
```

## Persistence Shape

The deployment uses six primary configured stores: main `openalgo.db`, traffic `logs.db`, latency `latency.db`, health `health.db`, sandbox `sandbox.db`, and Historify `historify.duckdb`. Scalping tables use the main database URL. See [18 Database Structure](18-database-structure.md).

## Documentation Shape

| Directory | Purpose |
|---|---|
| `docs/api` | External REST and WebSocket contracts |
| `docs/bdd` | Gherkin specifications and inventories |
| `docs/design` | Implemented architecture |
| `docs/prd` | Current and subsystem product requirements |
| `docs/audit` | Point-in-time reviews |
| `docs/releases` | Release notes |
| `docs/userguide` | End-user guides, including Remote MCP |
| `docs/installation-guidelines` | Platform-specific install notes |
| `docs/migration` | Upgrade and data-migration notes |
| `docs/benchmarks` | Recorded benchmark runs |
