# What is OpenAlgo?

OpenAlgo is a free, open source, self hosted algorithmic trading platform that bridges trading ideas with execution. Built with Python Flask and a modern React frontend, it provides a unified API layer across 36 broker plugins: 34 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin for paper trading. It supports automation from Amibroker, TradingView, GoCharting, N8N, ChartInk, MetaTrader 5, Excel, Google Sheets, and a Chrome extension, with six official SDKs: Python, Node.js, Java, .NET, Go, and Rust.

### Overview

**OpenAlgo** is an **open-source, self-hosted algorithmic trading platform** that makes it easy to build, test, and run trading strategies across multiple Indian brokers using a **single, consistent interface**.

Beyond execution, OpenAlgo empowers traders to completely own their trading infrastructure. Traders can effortlessly build algorithmic strategies, indicators, and custom trading dashboards using AI agentic coding tools, connect with their favorite trading platforms, and deploy strategies without being tied to any single broker or vendor. By standardizing broker APIs into one consistent trading layer, OpenAlgo allows strategies to work the same way across brokers, making automation faster, scalable, and fully under the trader’s control.

{% embed url="https://www.youtube.com/watch?v=S5myMo9WUdQ" %}

***

### What Problem Does OpenAlgo Solve?

OpenAlgo is built around one core idea: effortlessly create trading strategies using AI tools and run and monitor them like never before. Instead of learning multiple broker APIs and documentation, AI agentic coding tools such as Codex, Claude Code, Antigravity, and OpenCode understand OpenAlgo directly. Traders can build strategies faster, create their own algo features, design custom trading alerts, connect to any trading platform of their choice, store historical data, and run analytics or backtesting within a fully self hosted environment. There are no code tool offerings available, and you completely own your data and infrastructure.

Most brokers expose their own APIs with different authentication methods, order parameters, market data structures, and operational limitations. OpenAlgo reduces this friction with common request and response shapes. Exchange coverage, authentication, market-data entitlement, GTT support, and other optional capabilities still vary by plugin and broker account.

{% embed url="https://www.youtube.com/watch?v=ImQS-tz_GIo" %}

***

### Who Should Use OpenAlgo?

#### Traders

OpenAlgo is suitable for traders who want to:

* Automate rule-based or discretionary strategies
* Execute TradingView, ChartInk, or Amibroker alerts
* Test strategies safely using sandbox testing
* Monitor orders, positions, and profit/loss in real time
* Maintain full control over execution and data

No coding expertise is required to get started, though advanced users can extend it further.

***

#### Developers

OpenAlgo is designed for developers who need:

* A stable and well-documented REST and WebSocket API
* Uniform request and response formats across brokers
* SDKs in multiple programming languages
* A self-hosted, extensible trading backend
* Support for advanced use cases such as AI-driven execution

{% embed url="https://www.youtube.com/watch?v=es6UUTWtG8Q" %}

***

### Key Capabilities

#### Unified Trading API

OpenAlgo exposes a standardized API that allows you to:

* Place, modify, and cancel orders
* Fetch positions, holdings, and funds
* Access orderbook and tradebook
* Retrieve real-time and historical market data

Broker plugins follow the common API structure for the operations they support.

***

#### Multiple Ways to Run Strategies

OpenAlgo supports different strategy workflows:

* **Hosted Python strategies** running directly inside OpenAlgo as separate processes, on an exchange-aware schedule
* **Visual Flow strategies** built from 61 node types on a no-code canvas, with schedule, price-alert, webhook, and order-update triggers
* **External signals** from TradingView, Amibroker, ChartInk, GoCharting, MetaTrader 5, N8N, Excel, or Google Sheets
* **AI agents** connected through the built-in MCP server over local stdio or an OAuth-protected remote HTTP transport

This flexibility allows users to choose the approach that best fits their experience level.

***

#### Portfolio Analysis

OpenAlgo includes two authenticated, read-only portfolio workflows:

* **Portfolio Backtester** simulates a target NSE/BSE allocation using Historify or broker history, with rebalancing, drift bands, costs, benchmarks, robustness analysis, and a downloadable HTML tearsheet.
* **Portfolio Analyzer** loads current broker holdings and evaluates how today's market-value allocation would have behaved over a selected historical lookback.

Neither workflow places or modifies orders. See [Portfolio Backtester and Analyzer](new-features/portfolio-analytics.md).

***

#### Chart Trading Terminal

The `/trading` terminal provides seven persisted layouts, from a single chart to an eight-chart `4×2` grid. Each pane supports its own symbol, interval, chart type, indicators, drawings, history backfill, market depth, and order entry while sharing one drawing toolbar and the application's real-time market-data connection.

<figure><img src=".gitbook/assets/openalgo-ui-trading-terminal.png" alt="Chart trading terminal showing AXISBANK 15-minute candles with the HalfTrend indicator and its buy and sell signals"><figcaption></figcaption></figure>

See [Chart Trading Terminal](new-features/trading-terminal.md).

***

#### Scalping Terminal

The `/scalping` workspace is keyboard driven. Arrow keys fire call and put orders, F6 flattens every scalping position, and F7 cancels every pending scalping order. A server-side risk monitor evaluates stops, targets, and trailing steps on live ticks, so protection survives closing the browser.

See [Scalping Terminal](new-features/fast-scalper.md).

***

#### Options and Analytics Tools

The `/tools` page collects 18 analytical surfaces:

* strategy builder and strategy portfolio;
* portfolio backtester, portfolio analyzer, and SIP backtester;
* option chain, option Greeks, and option symbol resolution;
* OI tracker, OI range, OI profile, and max pain;
* straddle chart and straddle PnL;
* volatility surface, IV smile, GEX dashboard, and gamma density;
* a futures arbitrage scanner.

Coverage of a given underlying still depends on the active broker's option-chain and history entitlement.

<figure><img src=".gitbook/assets/openalgo-ui-tools-hub.png" alt="Tools page grid of options and analytics tools"><figcaption></figcaption></figure>

***

#### Sandbox Testing Environment

OpenAlgo includes a fully isolated **sandbox testing environment** for validating strategies before live deployment.

Sandbox testing provides:

* Live market data
* Configurable **sandbox capital**
* Configurable sandbox margin and order behavior
* Configurable MIS square-off schedules
* Simulated order and account state isolated from live broker execution

<figure><img src=".gitbook/assets/openalgo-ui-sandbox.png" alt="Sandbox configuration page"><figcaption></figcaption></figure>

***

#### Order Control and Safety

OpenAlgo offers optional order approval workflows:

* Automatic execution for fully automated strategies
* Manual approval for supervised or discretionary trading
* Full audit trail of all actions

This helps reduce execution risk and improves transparency.

<figure><img src=".gitbook/assets/openalgo-ui-action-center.png" alt="Action Center with Pending, Approved and Rejected tabs"><figcaption></figcaption></figure>

***

#### Security and Privacy

Security and data ownership are core principles of OpenAlgo:

* Broker session tokens are encrypted; `.env` credentials must be protected by the operator
* Passwords are securely hashed
* TOTP two-factor authentication can be enforced independently for dashboard sign-in, remote MCP authorization, and password reset
* API access is rate-limited, and traffic and latency are logged locally
* No user data is collected or shared

All data remains on infrastructure controlled by the user.

***

### Deployment and Usage

OpenAlgo is designed to be self-hosted:

* Run on a local machine
* Deploy on a VPS or cloud server
* Suitable for personal, professional, and team use

Once installed, it can serve as a central execution engine for all trading strategies.

### What OpenAlgo is NOT

Let's be clear about what OpenAlgo doesn't do:

| Misconception         | Reality                                              |
| --------------------- | ---------------------------------------------------- |
| Get-rich-quick scheme | It's a tool - profitability depends on your strategy |
| Strategy provider     | You need your own trading ideas                      |
| Financial advisor     | You're responsible for trading decisions             |
| Black box             | 100% open source - verify every line of code         |
| Cloud service         | Self-hosted - you control everything                 |

### System Requirements

| Component   | Minimum                               | Recommended                  |
| ----------- | ------------------------------------- | ---------------------------- |
| **OS**      | Windows 10, macOS 10.15, Ubuntu 20.04 | Latest versions              |
| **Python**  | 3.12+                                 | 3.12+                        |
| **RAM**     | 2 GB                                  | 2 GB+                        |
| **Storage** | 2 GB                                  | 10 GB+ (for historical data) |
| **Network** | Stable internet                       | Low latency connection       |



### Summary

| Aspect                | OpenAlgo                                         |
| --------------------- | ------------------------------------------------ |
| **Cost**              | Free (Open Source, AGPL License)                 |
| **Brokers**           | 36 plugins: 34 securities brokers, Delta Exchange (crypto), Dhan Sandbox |
| **Exchanges**         | NSE, NFO, BSE, BFO, MCX, CDS, BCD, NCDEX, NCO, plus index and crypto segments |
| **SDKs**              | Python, Node.js, Java, .NET, Go, Rust            |
| **Signal Sources**    | TradingView, Amibroker, ChartInk, GoCharting, MetaTrader 5, N8N, Excel, Google Sheets, Python, AI agents |
| **Strategy Building** | Flow (61 visual node types), Python Hosting, External Webhooks |
| **Sandbox Trading**   | Analyzer Mode with ₹1 Crore sandbox capital      |
| **Historical Data**   | Historify with DuckDB storage                    |
| **Real-Time Data**    | WebSocket streaming for quotes, depth, and order updates |
| **Options Analytics** | 18 tools at `/tools`                             |
| **Notifications**     | Telegram bot, WhatsApp bot, WebSocket updates    |
| **Data Privacy**      | 100% - self-hosted on your infrastructure        |
| **Skill Required**    | Basic trading knowledge                          |

***
