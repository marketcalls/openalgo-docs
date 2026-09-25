# Why to Build with OpenAlgo?

_"Why should I use OpenAlgo when I can just build my strategy directly on top of the broker's SDK or API?"_

It's a common question. Many start with broker SDKs because it feels quick, just wire your signals and send orders. But soon, the pain points show up:

* How do you monitor trades in real-time?
* Where do you store and replay logs?
* How do you test webhooks or strategies before going live?
* How do you manage symbols, expiries, and contracts across brokers?
* What happens when you want to switch from Broker A to Broker B?
* Who builds the option chain, the Greeks, the payoff diagram, the scalping keys?

That's when you realize the SDK is not enough.

**OpenAlgo takes care of the heavy lifting.**

It's not just an API wrapper. It's a **full-stack, open-source trading platform** you run on your own machine: a complete trading desk, not only an execution layer.

<figure><img src=".gitbook/assets/image (123).png" alt=""><figcaption></figcaption></figure>

***

### At a Glance

| | |
| --- | --- |
| **36 broker plugins** | 34 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin |
| **6 official SDKs** | Python, Node.js, Java, .NET, Go, Rust |
| **53 node types** | In the Flow visual strategy builder |
| **90+ indicators** | In the built-in charting terminal |
| **18 options tools** | Chain, Greeks, OI, max pain, vol surface, GEX and more |
| **100% open source** | AGPL-3.0, self-hosted, zero data collection |

***

### Trade From the Platform Itself

Earlier versions of OpenAlgo were mostly a bridge between your strategy and your broker. That is no longer the whole story. OpenAlgo now ships its own trading surfaces, so you can trade directly from it without any external charting package.

#### Chart Trading Terminal

Fire and manage orders from the chart itself, on streaming broker WebSocket data, with **90+ indicators** available on real market data.

See [Chart Trading Terminal](new-features/trading-terminal.md).

#### Scalping Terminal

A keyboard-driven terminal built for speed: arrow keys fire CE and PE orders, **F6 flattens every position** and **F7 cancels every pending order**. There is also **FastScalper**, a separate lightweight desktop build in Rust and Tauri.

See [Scalping Terminal](new-features/fast-scalper.md).

#### Options Analytics

A full options desk is built in, with real-time Greeks and payoff diagrams:

| Tool | Tool | Tool |
| --- | --- | --- |
| Strategy Builder | Strategy Portfolio | Option Chain |
| Option Greeks | OI Tracker and Range | Max Pain |
| Straddle Chart | Straddle PnL | OI Profile |
| Vol Surface | IV Smile | GEX Dashboard |
| Gamma Density | Futures Arbitrage Scanner | Portfolio Backtester |
| SIP Backtester | | |

<figure><img src=".gitbook/assets/openalgo-ui-tools-hub.png" alt="Tools page grid of options and analytics tools"><figcaption></figcaption></figure>

#### Action Center

Square off, cancel, and manage open exposure from one screen, with exchange-aligned auto square-off.

See [Action Center](new-features/action-center.md).

***

### What Makes OpenAlgo Different?

#### Strategy Management and Hosting

Host your **Python strategies directly inside OpenAlgo**, alongside strategies from TradingView, Amibroker, ChartInk, MetaTrader, Excel, or custom webhooks. Start, pause, schedule, monitor, and analyze, all from a central control plane.

| Capability | Description |
| --- | --- |
| **Python Strategy Hosting** | Upload and run Python scripts with scheduling |
| **Flow Visual Builder** | Drag-and-drop canvas wiring 53 node types from triggers to indicators, conditions and orders |
| **Multi-Platform Support** | TradingView, Amibroker, ChartInk, Excel, and more |
| **Centralized Control** | Manage all strategies from one dashboard |
| **Process Isolation** | Hosted strategies run in separate processes |

See [Python Strategy Hosting](new-features/python-strategy-hosting.md) and [Flow](new-features/flow-visual-strategy-builder.md).

#### Sandbox Testing and API Analyzer

The **Analyzer Mode** works like a local sandbox: test signals, APIs, and strategies with 1 crore default sandbox capital without sending simulated orders to the broker. Market prices can still come from broker data services.

| Feature | Benefit |
| --- | --- |
| **Sandbox Capital** | 1 crore to test freely |
| **Real Market Prices** | Realistic simulation with live data |
| **Margin Calculations** | Actual margin requirements enforced |
| **Position Tracking** | Full position and holdings management |
| **Execution Isolation** | Sandbox orders stay in the sandbox store |

See [API Analyzer](new-features/api-analyzer.md).

#### Historical Data and Backtesting

**Historify** lets you download and store historical market data locally using DuckDB. Use this data for backtesting, analysis, or feeding into your strategy development workflow. A **portfolio backtester** and **SIP backtester** are built in.

| Capability | Description |
| --- | --- |
| **Bulk Downloads** | Download years of OHLCV data |
| **DuckDB Storage** | Efficient columnar storage |
| **Multiple Timeframes** | 1-minute to daily data |
| **Export Options** | CSV, TXT, ZIP, or Parquet |

See [Historify](new-features/historify.md) and [Portfolio Backtester and Analyzer](new-features/portfolio-analytics.md).

#### Multi-Broker, Multi-Platform

OpenAlgo ships **36 broker plugins**: 34 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin for paper trading. The securities plugins share normalized API and WebSocket interfaces, reducing broker-specific strategy code.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Strategy Code                   │
│                       (Write Once)                      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   OpenAlgo Unified API                  │
│         (Common Interface Across Broker Plugins)        │
└───┬─────────┬─────────┬─────────┬─────────┬─────────┬───┘
    │         │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Zerodha│ │ Angel │ │ Dhan  │ │ Fyers │ │Upstox │ │ More  │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

See the full list under [Brokers](connect-brokers/brokers/README.md) and [Delta Exchange](crypto/exchanges/delta-exchange.md).

#### Unified Symbol and Contract Management

With OpenAlgo's **Common Symbol Format**, you don't have to worry about broker-specific quirks. Contracts, expiries, and lot sizes are maintained automatically.

| Broker | Their Format | OpenAlgo Format |
| --- | --- | --- |
| Zerodha | `SBIN` | `SBIN` |
| Angel | `SBIN-EQ` | `SBIN` |
| Dhan | `SBIN` | `SBIN` |

**One OpenAlgo symbol format, subject to each plugin's exchange coverage.**

***

### Speed, Stability, and Control

#### Performance Optimizations

| Feature | Impact |
| --- | --- |
| **HTTPX Connection Pooling** | Reuses outbound connections to reduce setup overhead |
| **WebSocket Broadcast Layer** | One broker stream powers multiple strategies |
| **Symbol Caching** | Instant symbol lookups without repeated API calls |
| **Rate Limit Management** | Automatic throttling to stay within broker limits |

#### Real-Time Monitoring

| Tool | Purpose |
| --- | --- |
| **Latency Monitor** | Track order round-trip times |
| **Traffic Logs** | Request metadata, status, and duration history |
| **P\&L Tracker** | Real-time profit and loss visualization |
| **WebSocket Dashboard** | Monitor live data connections |

See [Traffic/Latency Monitor](new-features/traffic-latency-monitor.md) and [PNL Tracker](new-features/pnl-tracker.md).

#### Notification and Alerts

| Channel | Capabilities |
| --- | --- |
| **Telegram Bot** | Trade notifications, commands, alerts |
| **WhatsApp** | Trade notifications and bot commands |
| **WebSocket Updates** | Real-time order and position changes |
| **Dashboard Alerts** | Visual notifications in UI |

***

### Security by Default

OpenAlgo is production-tested with enterprise-grade security:

| Security Feature | Description |
| --- | --- |
| **CORS & CSP Headers** | Cross-origin and content security policies |
| **CSRF Protection** | Token-based request validation |
| **Rate Limiting** | Per-endpoint request throttling |
| **Two-Factor Auth** | TOTP-based login security |
| **Session Management** | Secure session handling with timeouts |
| **Audit Trails** | Complete logging for compliance |
| **API Key Protection** | Argon2 hashing plus encrypted retrieval copy |
| **Process Isolation** | Hosted strategies run in separate processes |
| **Zero Data Collection** | Your code, your strategies, your data, on your machine |

Deploy locally, in **Docker**, or on cloud servers. Public deployments still require correct TLS, proxy, firewall, secret, and update configuration.

***

### SDKs, Add-ins, and Ecosystem

#### Official SDKs

| Language | Documentation |
| --- | --- |
| **Python** | [`openalgo` on PyPI](trading-platform/python/README.md) |
| **Node.js** | [NodeJS](trading-platform/nodejs.md) |
| **Java** | [Java](trading-platform/java.md) |
| **.NET** | [.NET](trading-platform/.net.md) |
| **Go** | [GO](trading-platform/go.md) |
| **Rust** | [RUST](trading-platform/rust.md) |

The Python SDK also ships an indicator library and visualization helpers. See [Indicators](trading-platform/python/indicators/README.md).

#### Platform Integrations

| Platform | Integration Type |
| --- | --- |
| [**TradingView**](trading-platform/tradingview.md) | Webhooks |
| [**Amibroker**](trading-platform/amibroker/README.md) | HTTP calls from AFL, with ready-made trading modules |
| [**ChartInk**](trading-platform/chartink.md) | Scanner webhooks |
| [**GoCharting**](trading-platform/gocharting.md) | Webhooks |
| [**MetaTrader 5**](trading-platform/metatrader-5/README.md) | MQL5 library and Expert Advisors |
| [**Excel**](trading-platform/excel.md) | Excel add-in with native worksheet functions and real-time streaming |
| [**Google Sheets**](trading-platform/google-spreadsheets.md) | Apps Script |
| [**N8N**](trading-platform/n8n.md) | Workflow automation nodes |
| [**Telegram**](trading-platform/telegram.md) | Bot notifications and commands |
| [**WhatsApp**](trading-platform/whatsapp.md) | Notifications and bot commands |
| [**Chrome Extension**](trading-platform/chrome-extension.md) | Browser-based order entry |

#### AI and Agent Integration

| Product | Description |
| --- | --- |
| [**OpenAlgo MCP**](mcp/README.md) | Connect your OpenAlgo account to Claude, Cursor, Windsurf, or ChatGPT |
| [**OpenAlgo Skills**](skills/README.md) | Indicator, execution, and backtesting skills with ready-made strategies across India, US, and crypto markets |

#### Deployment Options

| Option | Best For |
| --- | --- |
| **Local** | Personal desktop trading |
| **Docker** | Clean, reproducible deployments |
| **Cloud Server** | 24/7 automated trading |
| **VPS** | Low-latency remote access |

***

### Why Not Just Use Broker APIs Directly?

With direct broker APIs, you'd have to build:

| Component | What You'd Build | OpenAlgo Provides |
| --- | --- | --- |
| **Strategy Hosting** | Process management, scheduling | Built-in with Python hosting |
| **Visual Strategy Building** | Node editor, execution engine | Flow with 53 node types |
| **Testing Environment** | Sandbox, mock broker | Analyzer Mode with 1 crore capital |
| **Charting** | Charting library, indicator maths | Built-in terminal with 90+ indicators |
| **Options Analytics** | Chain, Greeks, payoff, OI, vol surface | 18 options tools included |
| **Scalping Interface** | Hotkey handling, fast order path | Keyboard scalping terminal |
| **Symbol Management** | Expiry handling, contract mapping | Unified symbol format |
| **Historical Data** | Download, store, query | Historify with DuckDB |
| **Connection Pooling** | HTTP/WebSocket optimization | HTTPX with connection reuse |
| **Trade Dashboard** | React UI, real-time updates | Full React frontend included |
| **Log Storage** | Database, query interface | SQLite with traffic logs |
| **Latency Tracking** | Timing, metrics, alerts | Latency monitor built-in |
| **Multi-Broker Support** | N broker integrations | 36 plugin directories |
| **Security Layer** | Auth, rate limiting, CSRF | Enterprise security included |
| **Notifications** | Telegram, WhatsApp, alerts | Both integrated |

OpenAlgo ships with all this, **pre-wired, tested, and open source**.

***

### Open Source Freedom

Licensed under **AGPL-3.0**, OpenAlgo gives you:

| Freedom | Description |
| --- | --- |
| **Full Source Code** | Inspect, modify, extend |
| **Self-Hosting** | Run on your infrastructure |
| **No OpenAlgo Per-Order Fees** | Broker and exchange charges still apply |
| **No Vendor Lock-in** | Switch or fork anytime |
| **Commercial Use** | Build products on top (with compliance) |
| **Community Support** | Discord, GitHub, documentation |

***

### The Bottom Line

| Aspect | Broker APIs | OpenAlgo |
| --- | --- | --- |
| **Setup Time** | Weeks of development | Hours to deploy |
| **Broker Switching** | Rewrite everything | Change one config |
| **Testing** | Build your own sandbox | Analyzer Mode ready |
| **Charting** | Buy or build | Built in with 90+ indicators |
| **Options Desk** | Build from scratch | 18 tools included |
| **Monitoring** | Build dashboards | Full UI included |
| **Security** | Implement yourself | Production-ready |
| **Maintenance** | You maintain everything | Community maintained |
| **Cost** | Your development time | Free and open source |

**Broker APIs give you&#x20;**_**access**_**.** **OpenAlgo gives you&#x20;**_**infrastructure**_**.**

It doesn't replace your strategy logic. It **amplifies** it with the ecosystem you need to operate, monitor, test, and scale confidently, and it now gives you a place to trade from directly when you don't want to write a strategy at all.

And when you're ready to switch brokers or expand to multi-broker setups, you'll already be on **OpenAlgo's unified, broker-agnostic foundation**.

***

**Previous**: 01 - What is OpenAlgo

**Next**: 03 - Key Concepts
