---
description: OpenAlgo - Model Context Protocol
---

# MCP

OpenAlgo exposes trading, account, market-data, calendar, and research functions through the Model Context Protocol. Local and remote transports use the same tool implementation.

| Transport | Intended client | Authentication | Default |
|---|---|---|---|
| Local stdio | Claude Desktop, Cursor, Windsurf, or another local MCP host | OpenAlgo API key passed to the local process | Available |
| Remote HTTP/SSE | Hosted clients that connect over HTTPS | OAuth 2.1 bearer token and per-tool scope | Disabled |

Enabling Remote MCP does not change the local stdio setup.

## Prerequisites

1. Run OpenAlgo and complete broker authentication.
2. Generate an application API key from **Profile -> API Keys**.
3. Locate the Python executable in the OpenAlgo virtual environment and the absolute path to `mcp/mcpserver.py`.

Node.js is not required for the Python MCP server.

## Local Stdio Setup

Add an MCP server entry to the local client's configuration. Replace all placeholders with paths and values for the machine running OpenAlgo.

```json
{
  "mcpServers": {
    "openalgo": {
      "command": "/absolute/path/to/openalgo/.venv/bin/python3",
      "args": [
        "/absolute/path/to/openalgo/mcp/mcpserver.py",
        "YOUR_OPENALGO_API_KEY",
        "http://127.0.0.1:5000"
      ]
    }
  }
}
```

On Windows, use the virtual-environment executable ending in `.venv\\Scripts\\python.exe` and Windows-style absolute paths. The server requires the API key as the first argument and the OpenAlgo host as the second argument.

Common configuration locations include:

| Client | macOS/Linux | Windows |
|---|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS | `%APPDATA%\\Claude\\claude_desktop_config.json` |
| Windsurf | `~/.config/windsurf/mcp_config.json` | `%APPDATA%\\Windsurf\\mcp_config.json` |
| Cursor | Client-specific MCP settings | Client-specific MCP settings |

Restart the MCP client after changing its configuration. Confirm that OpenAlgo is running and that the broker session is valid before calling account or trading tools.

{% embed url="https://www.youtube.com/watch?v=oczs8KOrxIo" %}

## Remote Setup

Hosted clients connect to:

```text
https://<your-openalgo-domain>/mcp
```

Remote MCP requires HTTPS, OAuth configuration, and deliberate review of approval and write-scope controls. It is disabled by default. See [Remote MCP](remote-mcp.md) for installation, OAuth consent, client setup, audit, and revocation guidance.

## Tool Groups

The current shared registry contains **49 tools**.

The shared registry includes:

- Regular, smart, options, basket, split, modify, cancel, and close operations.
- Orders, trades, positions, holdings, funds, and margin reads.
- Quotes, batches, depth, history, option-chain, symbol, expiry, and instrument lookup.
- Analyzer-mode controls, market holidays and timings, and Telegram notifications.
- Technical indicators, scanners, and multi-timeframe research helpers.

See [Tool References](tool-references.md) for parameters and prompt examples. A client should rely on the tool schemas returned by the running server when a static example differs from the installed version.

The registered `check_holiday` tool is currently unavailable because it calls the absent `/api/v1/checkholiday` REST route. Use `get_timings` for one date or `get_holidays` for the yearly holiday list.

## Safety

- Start order workflows in Analyzer mode and inspect the result before using live mode.
- Local stdio configuration contains the OpenAlgo API key. Restrict access to the client configuration file.
- Remote read and write scopes are separate. Do not grant `write:orders` unless the client is intended to trade.
- Review symbol, exchange, product, quantity, order type, and current application mode before confirming an order tool.
- Broker access and risk checks remain authoritative; a successful MCP tool call does not bypass broker validation.

## Order-result interpretation

In Semi-Auto mode, success can mean an eligible entry was saved for Action Center approval (`mode: "semi_auto"`, `pending_order_id`), not sent to the broker. A placement acknowledgement is not proof of a fill. If a write times out or its broker reply is lost, verify broker books before retrying; a second send can duplicate an order. Check basket/split results per child.

`cancel_all_orders` and `close_all_positions` operate across the active account. Their `strategy` argument records who initiated the request; it does not restrict which orders or positions are affected. See the [tool reference](tool-references.md#responses-and-order-outcomes) for response envelopes and reconciliation.

## Troubleshooting

| Symptom | Check |
|---|---|
| MCP process exits immediately | Python path, script path, API-key argument, and host argument |
| Authentication error | API key validity and OpenAlgo application state |
| Account tools fail | Current broker login and broker session |
| Tool is unavailable | Tool list returned by the installed server and client-side tool permissions |
| Remote connector cannot authorize | Remote MCP enablement, public URL, OAuth settings, and client approval state |
