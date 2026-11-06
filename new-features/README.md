# New Features

Open Algo is constantly evolving to meet the needs of modern traders by introducing innovative features that enhance functionality, security, and user experience. Each new addition focuses on improving performance, streamlining workflows, and enabling more efficient trading strategies. From cutting-edge tools to seamless integrations, these updates are tailored to empower both traders and developers.



The platform's current feature guides cover:

* [Agent](agent/README.md) for the in-platform AI assistant: market data, charts, indicators, options analytics and approval-gated orders, on `/agent` and docked beside the chart on `/trading`.
* [Portfolio Backtester and Analyzer](portfolio-analytics.md) for authenticated, read-only portfolio simulation and current-holdings scenarios.
* [OpenScript on the Chart](openscript.md) for studies, browser backtests and explicit server deployments.
* [Chart Trading Terminal](trading-terminal.md) for multi-chart analysis, drawings, market depth, and order entry.
* [Flow Visual Strategy Builder](flow-visual-strategy-builder.md) for validated node graphs and schedule, webhook, price-alert, and order-update triggers.
* [Python Strategy Hosting](python-strategy-hosting.md) for process-isolated trusted scripts and scheduling.
* [Historify](historify.md) for local DuckDB history ingestion, scheduling, charts, and export.
* [Scalping Terminal](fast-scalper.md) for keyboard-driven entries with server-side stop and target monitoring.
* [API Analyzer](api-analyzer.md) for routing supported order flows into the sandbox instead of the live broker.
* [Action Center](action-center.md) for holding live orders in an approval queue in semi-auto mode.
* [PnL Tracker](pnl-tracker.md) for the intraday MTM and drawdown curve.
* [Chartink Integration](chartink-integration.md) for turning scanner alerts into orders.
* [Traffic and Latency Monitor](traffic-latency-monitor.md) for locally stored request metadata and timing records.
* [Strategy RMS Engine](strategy-rms-engine.md) for durable multi-leg and signal-driven strategy execution with run-level risk controls.

Related feature guides outside this section:

* [Analytics and Options Tools](../analytics-and-options-tools.md) is the catalog of all 20 tools, including Strike Profile and Sector Rotation.
* [Broker Configuration and Login](../connect-brokers/broker-configuration.md) covers saved keys, `.env` precedence and broker switching.
* [Flow Editor](../flow-editor/README.md) is the full technical reference for Flow: the execution model, all 61 nodes, indicators, tutorials, and limitations.
* [MCP](../mcp/README.md) covers the built-in Model Context Protocol server, its tool inventory, and the optional OAuth-protected remote transport.

Feature availability still depends on the active broker's supported exchanges, account entitlement, and market-data/order capabilities.
