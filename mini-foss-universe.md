# Mini FOSS Universe

The **OpenAlgo Mini FOSS Universe** is a curated collection of open-source projects, SDKs, libraries, and integrations that extend the OpenAlgo ecosystem across languages, platforms, and workflows.

Whether you’re building trading strategies, data pipelines, dashboards, or AI-driven systems, OpenAlgo provides open-source tools that integrate seamlessly into every modern trading workflow.

This ecosystem is designed to be:

* **Modular**: use only what you need
* **Extensible**: customize and build on top of existing components
* **Language-agnostic**: work in the stack you’re most comfortable with
* **Production-ready**: stable APIs with long-term support

All projects in the Mini FOSS Universe are community-driven and built with real-world trading and automation use cases in mind.

***

### Core Project

| Component            | Repository                                                                         |
| -------------------- | ---------------------------------------------------------------------------------- |
| **OpenAlgo Core**    | [https://github.com/marketcalls/openalgo](https://github.com/marketcalls/openalgo) |

**OpenAlgo Core** is the central heartbeat of the ecosystem, powering the API service, authentication, routing, and platform logic.\
\
All SDKs, libraries, and integrations interact with the API endpoints exposed by OpenAlgo Core.

***

### Libraries and SDKs

OpenAlgo provides official SDKs and libraries to help developers interact with the OpenAlgo API without making raw HTTP calls. These packages handle authentication, request formatting, and response parsing, allowing you to focus on strategy and logic.

#### API Version

The current stable version of the OpenAlgo API is **v1**.

* All SDKs and integrations listed below are built against **API v1**
* v1 is stable, backward-compatible, and recommended for production use
* Future versions will be introduced without breaking existing v1 integrations

***

### SDKs

SDKs are officially supported client packages intended for application development and system-level integrations.

| Language / Platform | Repository                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Python              | [https://github.com/marketcalls/openalgo-python-library](https://github.com/marketcalls/openalgo-python-library) |
| Node.js             | [https://github.com/marketcalls/openalgo-node](https://github.com/marketcalls/openalgo-node)                     |
| Java                | [https://github.com/marketcalls/openalgo-java](https://github.com/marketcalls/openalgo-java)                     |
| RUST                | [https://github.com/marketcalls/openalgo-rust](https://github.com/marketcalls/openalgo-rust)                     |
| .NET / C#           | [https://github.com/marketcalls/openalgo.NET](https://github.com/marketcalls/openalgo.NET)                       |
| Go                  | [https://github.com/marketcalls/openalgo-go](https://github.com/marketcalls/openalgo-go)                         |

***

### Libraries and Platform Integrations

These libraries and tools extend OpenAlgo support to popular trading platforms, analysis tools, and user interfaces.

| Platform / Tool                 | Repository                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Excel Add-in**                | [https://github.com/marketcalls/OpenAlgo-Excel](https://github.com/marketcalls/OpenAlgo-Excel)       |
| **Amibroker Plugin**            | [https://github.com/marketcalls/OpenAlgoPlugin](https://github.com/marketcalls/OpenAlgoPlugin)       |
| **Backtrader Integration**      | [https://github.com/p2c2e/openalgo-backtrader](https://github.com/p2c2e/openalgo-backtrader)         |
| **AI Agents (TradingAgent)**    | [https://github.com/marketcalls/TradingAgent](https://github.com/marketcalls/TradingAgent)           |
| **AlgoMirror**                  | [https://github.com/marketcalls/algomirror](https://github.com/marketcalls/algomirror)               |
| **MCP / AI Agents**             | [https://github.com/marketcalls/openalgo-mcp](https://github.com/marketcalls/openalgo-mcp)           |
| **OpenAlgo CLI**                | [https://github.com/marketcalls/openalgo-cli](https://github.com/marketcalls/openalgo-cli)           |
| **OpenAlgo Mobile (Flutter)**   | [https://github.com/marketcalls/openalgo-mobile](https://github.com/marketcalls/openalgo-mobile)     |
| **Web Portal**                  | [https://github.com/marketcalls/openalgo-webpage](https://github.com/marketcalls/openalgo-webpage)   |
| **Chrome Extension**            | [https://github.com/marketcalls/openalgo-chrome](https://github.com/marketcalls/openalgo-chrome)     |
| **Fast Scalper (Rust + Tauri)** | [https://github.com/marketcalls/fastscalper-tauri](https://github.com/marketcalls/fastscalper-tauri) |
| **OpenAlgo Charts**             | [https://github.com/marketcalls/openalgo-charts](https://github.com/marketcalls/openalgo-charts)     |
| **OpenStatz**                   | [https://github.com/marketcalls/openstatz](https://github.com/marketcalls/openstatz)                 |
| **OpenAlgo Heatmap**            | [https://github.com/marketcalls/openalgo-heatmap](https://github.com/marketcalls/openalgo-heatmap)   |
| **OpenQuest**                   | [https://github.com/marketcalls/openquest](https://github.com/marketcalls/openquest)                 |
| **Marginism**                   | [https://github.com/marketcalls/marginism](https://github.com/marketcalls/marginism)                 |
| **OpenScript**                  | [https://github.com/marketcalls/openscript](https://github.com/marketcalls/openscript)               |
| **OpenGreeks**                  | [https://github.com/marketcalls/opengreeks](https://github.com/marketcalls/opengreeks)               |
| **OpenBull**                    | [https://github.com/marketcalls/openbull](https://github.com/marketcalls/openbull)                   |
| **PineTS**                      | [https://github.com/marketcalls/openalgo-pinets](https://github.com/marketcalls/openalgo-pinets)     |
| **OpenAlgo chart**              | [https://github.com/crypt0inf0/openalgo-chart](https://github.com/crypt0inf0/openalgo-chart)         |
| **Historify (standalone)**      | [https://github.com/marketcalls/historify](https://github.com/marketcalls/historify)                 |
| **OpenAlgo Helm Chart**         | [https://github.com/p2c2e/openalgo\_helm](https://github.com/p2c2e/openalgo_helm)                    |

Two of these deserve a note, because the feature also exists inside OpenAlgo Core:

* **MCP.** Core ships its own Model Context Protocol server at `mcp/mcpserver.py`, with a local stdio transport and an optional OAuth-protected remote HTTP transport. The separate `openalgo-mcp` repository is the older standalone server and its documentation. Prefer the built-in one, and see [MCP](mcp/README.md).
* **Historify.** Core ships Historify as a built-in DuckDB history store at `/historify`. The standalone `historify` repository is the separate full-stack application. See [Historify](new-features/historify.md).

***

### Agent Skills

Skills are installable instruction packages that teach an AI coding agent how to drive OpenAlgo. They install through [skills.sh](https://github.com/vercel-labs/skills) with `npx skills add <repo>` and work across Claude Code, Cursor, Codex, OpenCode, Cline, Windsurf, and other agents.

| Skill package                    | Repository                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **OpenAlgo Skills (execution)**   | [https://github.com/marketcalls/openalgo-skills](https://github.com/marketcalls/openalgo-skills)                                     |
| **Indicator Skills**              | [https://github.com/marketcalls/openalgo-indicator-skills](https://github.com/marketcalls/openalgo-indicator-skills)                 |
| **VectorBT Backtesting Skills**   | [https://github.com/marketcalls/vectorbt-backtesting-skills](https://github.com/marketcalls/vectorbt-backtesting-skills)             |
| **Execution Skills (dual-mode)**  | [https://github.com/marketcalls/openalgo-execution-skills](https://github.com/marketcalls/openalgo-execution-skills)                 |
| **Claude Code Plugin**            | [https://github.com/marketcalls/openalgo-claude-plugin](https://github.com/marketcalls/openalgo-claude-plugin)                       |

See [Skills](skills/README.md) for what each package installs and how to use it.

***

### Documentation and Examples

Each SDK and integration has dedicated documentation that includes installation steps, configuration guidance, and working examples:

* Python: [https://docs.openalgo.in/trading-platform/python](https://docs.openalgo.in/trading-platform/python)
* Node.js: [https://docs.openalgo.in/trading-platform/nodejs](https://docs.openalgo.in/trading-platform/nodejs)
* Java: [https://docs.openalgo.in/trading-platform/java](https://docs.openalgo.in/trading-platform/java)
* .NET: [https://docs.openalgo.in/trading-platform/.net](https://docs.openalgo.in/trading-platform/.net)
* Go: [https://docs.openalgo.in/trading-platform/go](https://docs.openalgo.in/trading-platform/go)
* RUST: https://docs.openalgo.in/trading-platform/rust
* Excel: [https://docs.openalgo.in/trading-platform/excel](https://docs.openalgo.in/trading-platform/excel)
* Amibroker Plugin: [https://docs.openalgo.in/trading-platform/amibroker/amibroker-plugin](https://docs.openalgo.in/trading-platform/amibroker/amibroker-plugin)
* Chrome Extension: [https://docs.openalgo.in/trading-platform/chrome-extension](https://docs.openalgo.in/trading-platform/chrome-extension)
* MCP / AI Agents: [https://docs.openalgo.in/mcp](https://docs.openalgo.in/mcp)
* OpenAlgo CLI: [https://docs.openalgo.in/cli](https://docs.openalgo.in/cli)
* Skills: [https://docs.openalgo.in/skills](https://docs.openalgo.in/skills)

***

### Philosophy

The Mini FOSS Universe reflects OpenAlgo’s core philosophy:\
**open standards, transparent design, and tools that adapt to how traders actually work**.

You can use these projects independently, combine them into larger systems, or fork and extend them to suit your own trading infrastructure.

