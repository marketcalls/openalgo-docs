# OpenAlgo Desktop

OpenAlgo Desktop is OpenAlgo as an app on your own computer. You download one
installer, open it, create your account, connect your broker and trade. There
is no server to rent, no Python to install, no `git clone` and no `.env` file:
every setting and every credential is entered inside the app.

It is free and open source (AGPL-3.0), like OpenAlgo web, and it is built for
one trader on one computer.

* Download: [GitHub Releases](https://github.com/marketcalls/openalgo-desktop/releases/latest) or the [OpenAlgo download page](https://www.openalgo.in/download)
* Source code: [github.com/marketcalls/openalgo-desktop](https://github.com/marketcalls/openalgo-desktop)
* Runs on Windows 10 and 11, macOS (Apple Silicon and Intel) and Linux (x64 and ARM64)

{% embed url="https://www.youtube.com/watch?v=DgFwpvuxQr8" %}

## What you get

OpenAlgo Desktop has the same screens, the same API and the same market data
feed as OpenAlgo web, and connects to the same 37 brokers, Delta Exchange for
crypto among them.

* The dashboard, order book, trade book, positions and holdings
* The `/trading` charting terminal with OpenScript and custom indicators
* The scalping terminal, with stop-loss, target and trailing protection
* The strategy module and its risk management (RMS) engine
* The options tools: option chain, Greeks, OI tracker, max pain, straddle and IV charts, GEX, strategy builder and more
* Sandbox mode (analyzer mode), with 1 crore of simulated capital and real market prices
* TradingView, GoCharting, Amibroker and Chartink alerts, and Action Center for semi-automatic orders
* Historify, the Playground, API key management, logs, latency and traffic monitoring
* Telegram and WhatsApp alerts and bots
* An MCP server for AI clients such as Claude Desktop
* A built-in ngrok tunnel for alerts from the internet (from version 1.0.3)

## Works with everything that works with OpenAlgo web

OpenAlgo Desktop listens on the same addresses as OpenAlgo web:

| What | Address |
| --- | --- |
| Dashboard and REST API (`/api/v1`) | `http://127.0.0.1:5000` |
| Market data WebSocket | `ws://127.0.0.1:8765` |
| Broker redirect URL | `http://127.0.0.1:5000/<broker>/callback` |

The REST API accepts the same requests and sends the same responses as the
web, and the WebSocket speaks the same protocol. The OpenAlgo Python SDK,
TradingView, Amibroker, Chartink, GoCharting, Excel and MCP clients work
unchanged: point them at the desktop and use the API key from the desktop's
**API Key** page.

```python
from openalgo import api

client = api(
    api_key="your-desktop-api-key",
    host="http://127.0.0.1:5000",
    ws_url="ws://127.0.0.1:8765",
)
print(client.funds())
```

## OpenAlgo Desktop or OpenAlgo web?

| | OpenAlgo Desktop | OpenAlgo web |
| --- | --- | --- |
| Install | One installer, nothing else | Python, `uv`, a `.env` file, optionally a server and a domain |
| Where it runs | Your Windows, Mac or Linux computer, with its window open | Your computer, a VPS or a Raspberry Pi, as a server |
| Settings and credentials | Entered in the app, stored encrypted | `.env` file plus the app |
| Users | One trader per installation | One trader per installation |
| Brokers | Many saved, one logged in at a time | One per installation |
| Runs when the computer sleeps or the app is closed | No | Yes, on a server that stays on |
| Python Strategy Hosting, Flow, the Agent, pandas backtesters | Not included | Included |
| Raspberry Pi, headless servers, Docker | Not supported | Supported |

Choose OpenAlgo Desktop if you trade from your own computer during market
hours and want the simplest setup. Choose OpenAlgo web if you need automation
to run around the clock on a server, or need the Python Strategy Host, Flow or
the Agent.

## What is not included

* Python Strategy Hosting (`/python`). Your Python strategies still work: run them yourself with the OpenAlgo Python SDK against the desktop's API.
* Flow, the visual strategy builder (`/flow`)
* The Agent (`/agent`) and the Assistant panel in the trading terminal. AI clients connect through the MCP server instead.
* The pandas-based Portfolio Backtester, SIP Backtester and Portfolio Analyzer

The app has no pages or menu entries for them.

## Things to know before you start

* **It trades only while it is open.** Closing the window stops the API, the market data feed, strategies, OpenScript runs and stop and target tracking. Orders already placed stay with your broker.
* **Sleep pauses it too.** Keep the computer awake for as long as automation should run, and check your positions after a long sleep.
* **Sign in after every start.** Until you sign in to OpenAlgo, the API, the market data feed, webhooks and MCP stay off, and programs are told "Sign in to OpenAlgo to use the API".
* **One copy at a time.** Two copies would need the same ports.

## In this section

* [Download and System Requirements](download-and-system-requirements.md)
* [Install on Windows](install-on-windows.md)
* [Install on macOS](install-on-macos.md), including the "damaged" message on Apple Silicon Macs
* [Install on Linux](install-on-linux.md)
* [First Run and Broker Login](first-run-and-broker-login.md)
* [Ports and Server Settings](ports-and-server-settings.md)
* [Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md)
* [Data, Security and Backups](data-security-and-backups.md)
* [Updating and Uninstalling](updating-and-uninstalling.md)
* [Technology Stack](technology-stack.md)
* [Troubleshooting and FAQ](troubleshooting-and-faq.md)
