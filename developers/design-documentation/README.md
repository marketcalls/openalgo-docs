# OpenAlgo Design Documentation

This directory describes the implemented architecture of OpenAlgo `2.0.2.2`. OpenAlgo is a self-hosted, single-user trading application with a Flask/Flask-RESTX backend, React 19 frontend, broker plugins, a separate WebSocket proxy, sandbox execution, hosted strategies, Flow automation, portfolio analytics, chart trading, and optional local or remote MCP access.

The current inventory is 37 broker plugins: 35 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin for testing without real money. Every one of the 37 has a `plugin.json`. Broker capabilities are metadata-driven; a plugin's presence does not imply every optional broker operation is supported.

## Documentation Policy

- Code and registered routes are authoritative when a design document conflicts with an example.
- The public REST contract lives in the [API documentation](../../api-documentation/v1/README.md).
- Flask-RESTX Swagger/OpenAPI UI is intentionally disabled with `doc=False` in `restx_api/__init__.py`. Do not advertise or re-enable `/api/docs` as part of documentation maintenance.
- These pages describe implemented behavior verified against the application code and registered routes.

## Runtime And Core Architecture

| Module | Description |
|---|---|
| [00 Directory Structure](00-directory-structure.md) | Current repository boundaries and ownership |
| [01 Frontend](architecture.md) | React 19, Vite 8, routing, state, data access |
| [02 Backend](02-backend-architecture.md) | Flask factory, route layers, services, background work |
| [04 Cache Architecture](broker-integerations.md) | In-process caches and invalidation behavior |
| [17 Connection Pooling](17-connection-pooling.md) | HTTP and market-data connection reuse |
| [18 Database Structure](18-database-structure.md) | SQLite and DuckDB stores, `NullPool`, teardown |
| [20 Design Principles](20-design-principles.md) | Local conventions and architectural constraints |
| [27 Service Layer](27-service-layer.md) | Route-to-service-to-broker boundaries |
| [31 Utilities](31-utils-functionalities.md) | Shared auth, config, logging, networking helpers |
| [34 App Startup](34-app-startup.md) | Validation, registration, initialization, server startup |
| [53 Event Bus](53-event-bus.md) | Per-process async side-effect dispatch |

## Authentication And Security

| Module | Description |
|---|---|
| [03 Login And Broker Flow](api-layer.md) | App auth, TOTP, broker selection, session resume |
| [05 Security Architecture](database-layer.md) | Keys, encryption, CSRF, CORS, CSP, middleware |
| [23 IP Security](23-ip-security.md) | IP extraction, bans, proxy trust |
| [24 Browser Security](24-browser-security.md) | Cookies, CSRF, CSP, hardening headers |
| [40 Logout And Session Lifecycle](40-logout-and-session-expiry.md) | Daily expiry, heartbeat, reconnect, multi-session behavior |
| [47 SMTP Configuration](47-smtp-configuration.md) | Mail configuration and diagnostics |
| [48 Password Reset](48-password-reset.md) | Reset flow and password change revocation |
| [50 TOTP Configuration](50-totp-configuration.md) | Per-purpose two-factor policy |

## Trading, Data, And Automation

| Module | Description |
|---|---|
| [06 WebSockets](authentication-platforms.md) | Proxy protocol, ZMQ fan-in, adapters, subscriptions |
| [07 Sandbox](configuration.md) | Analyzer execution engine and isolated state |
| [08 Historify](utilities.md) | DuckDB historical-data subsystem |
| [09 REST API](broker-integration-checklist.md) | Registered v1 architecture; Swagger intentionally disabled |
| [10 Flow](10-flow-architecture.md) | Visual workflow storage and execution |
| [13 Chartink](13-chartink-architecture.md) | Scanner automation |
| [14 TradingView And GoCharting](14-tradingview-and-gocharting.md) | JSON integration surfaces |
| [19 PlaceOrder Flow](19-placeorder-call-flow.md) | Validation, mode routing, Action Center, broker calls |
| [32 Master Contract](32-master-contract-download.md) | Broker instrument downloads and cache policy |
| [33 Broker Folder](33-broker-folder-explanations.md) | Plugin module convention |
| [38 Python Strategies](38-python-strategies-hosting.md) | Hosted-process model and logs |
| [39 Strategy RMS Engine](39-strategy-module.md) | Durable multi-leg and signal lifecycle, RMS, recovery, RESTX, and webhooks |
| [42 Action Center](42-action-center.md) | Semi-auto order approval |
| [54 Scalping Terminal](54-scalping-terminal.md) | Keyboard trading, charts, persisted stops, risk monitor |
| [55 Portfolio Analytics](55-portfolio-analytics.md) | Read-only backtesting and current-holdings scenario analysis |

## UI, Tools, And Integrations

| Module | Description |
|---|---|
| [15 Basic UI And Analytics](15-basic-ui-elements.md) | Current React pages and analytics tools |
| [37 API Key And Playground](37-api-key-and-playground.md) | API key management and WebSocket tester |
| [41 MCP Architecture](41-mcp-architecture.md) | Local stdio and opt-in remote OAuth transport |
| [43 Telegram Bot](43-telegram-bot-configuration.md) | Bot lifecycle, commands, automatic and explicit alerts |
| [44 Toast Notifications](44-toast-notifications-system.md) | Browser notification categories |
| [44 PnL Tracker](44-pnl-tracker.md) | Live P&L charting |
| [46 Search](46-search.md) | Contract and underlying search |
| [49 Themes](49-themes.md) | Theme and accent persistence |
| [51 Broker And System Config](51-broker-and-system-config.md) | Environment and broker configuration boundaries |
| [52 Broker Factory](52-broker-factory-implementation.md) | WebSocket adapter construction |

## Operations And Deployment

| Module | Description |
|---|---|
| [11 Docker](11-docker-configuration.md) | Container build and compose runtime |
| [12 Ubuntu Server](12-ubuntu-server-installation.md) | Host deployment |
| [16 Centralized Logging](16-centralized-logging.md) | Python logs and file retention |
| [21 Admin Section](21-admin-section.md) | Runtime and Remote MCP administration |
| [22 Log Section](22-log-section.md) | Order and analyzer log views |
| [25 Latency Monitor](25-latency-monitor.md) | API timing data |
| [26 Traffic Logs](26-traffic-logs.md) | Request telemetry and ban support |
| [28 Environment Configuration](28-environment-configuration.md) | `.env` contract |
| [29 Ngrok Configuration](29-ngrok-configuration.md) | Tunnel management |
| [30 Upgrade Procedure](30-upgrade-procedure.md) | Upgrade and backup flow |
| [35 Development And Testing](35-development-and-testing-guide.md) | Local checks and CI coverage |
| [36 Rate Limiting](36-rate-limiting-guide.md) | Limiter configuration and endpoint classes |
