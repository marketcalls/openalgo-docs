# Technology Stack

This page explains, for traders, what OpenAlgo Desktop is made of and what
that means for you. A separate guide for developers will follow.

## In one sentence

OpenAlgo Desktop is the OpenAlgo web interface you already know, running in
its own window, on top of a new engine written in Rust that does everything
the Python server of OpenAlgo web does, inside one app on your computer.

## The parts

| Part | Built with | What it means for you |
| --- | --- | --- |
| The app window and installers | **Tauri 2** | A small, native app for Windows, macOS and Linux. It uses the web view your system already has (WebView2 on Windows, WebKit on macOS and Linux), so the installers are small: about 18 MB on Windows and 25 MB on macOS and for the Linux `.deb` (the Linux AppImage, which carries its own libraries, is about 95 MB). |
| The engine (server, API, broker connections, sandbox, strategies) | **Rust** | One fast, memory-safe program instead of a Python server, a web server and background workers. Nothing extra to install, and no Python on your computer. |
| The screens | **React 19**, TypeScript, Tailwind CSS, shadcn/ui | The same interface as OpenAlgo web, carried over nearly unchanged, so everything is where you expect it. |
| Charts and the trading terminal | **openalgo-charts**, TradingView Lightweight Charts, Plotly | The `/trading` charting terminal, P&L charts and options analytics charts. |
| Scripting | **OpenScript** (openalgo-script) | Write a study or strategy once; it is backtested and run live on the same engine, so results do not drift. |
| Your data | **SQLite** (three databases: main, logs, sandbox) and **DuckDB** (Historify) | Fast local databases in one folder you can back up by copying it. Sandbox data is kept apart from live data. |
| Security | **Argon2id** and **AES-256-GCM** | Your broker keys, tokens and API key are encrypted, and the key that unlocks them is locked by your OpenAlgo password. |
| AI clients | **MCP server** (rmcp) | Claude Desktop and other AI assistants can use OpenAlgo's tools, with a token you create on the API Key page. |
| Alerts from the internet | **ngrok**, built in (version 1.0.3 and later) | TradingView, Chartink and GoCharting alerts reach your computer without installing anything else. |

## Same API as OpenAlgo web

The engine answers the REST API (`/api/v1`) and the market data WebSocket
exactly as OpenAlgo web does: the same requests, the same responses, the same
error messages, on the same default addresses (`127.0.0.1:5000` and
`127.0.0.1:8765`). That is why the OpenAlgo Python SDK, TradingView,
Amibroker, Chartink, GoCharting, Excel and MCP clients work with the desktop
unchanged. The desktop is checked against recorded answers from OpenAlgo web
on every change.

## How it is built and tested

* Every installer is built by GitHub's build machines from the public source code, for Windows, macOS (Apple Silicon and Intel) and Linux (x64 and ARM64).
* Each change runs thousands of automated tests on Linux (x64 and ARM64), macOS and Windows before it is accepted, and the installers are installed and started on fresh machines, with an account created and signed in.
* Every release lists a `SHA256SUMS.txt` so you can check your download, and in-app updates are signed: the app refuses an update whose signature does not match.

## Licence

OpenAlgo Desktop is free and open source under the AGPL-3.0 licence, like
OpenAlgo web. The source code is at
[github.com/marketcalls/openalgo-desktop](https://github.com/marketcalls/openalgo-desktop).
