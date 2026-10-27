# Troubleshooting and FAQ

## Installing and opening

| What you see | What to do |
| --- | --- |
| Windows: "Windows protected your PC" | **More info**, then **Run anyway**. The installer is not yet code-signed. See [Install on Windows](install-on-windows.md) |
| Windows: the setup cannot download WebView2 (no internet) | Install Microsoft's WebView2 "Evergreen Standalone Installer" first, then run the setup |
| Windows: "MSVCP140.dll was not found" | Only version 1.0.0 needs it. Install the latest version over it; your data is kept |
| Apple Silicon Mac: "OpenAlgo Desktop is damaged and can't be opened" | Not damaged. In Terminal run `xattr -dr com.apple.quarantine "/Applications/OpenAlgo Desktop.app"`, then open the app again. See [Install on macOS](install-on-macos.md#apple-silicon-mac-openalgo-desktop-is-damaged-and-cant-be-opened) |
| Mac: "cannot be opened because Apple cannot check it" or "unidentified developer" | Right-click the app, **Open**; or **System Settings**, **Privacy & Security**, **Open Anyway** |
| Linux AppImage: FUSE or `libfuse.so.2` missing | `sudo apt install libfuse2` (Ubuntu 24.04 and later: `libfuse2t64`), or use the `.deb` |
| "OpenAlgo could not start because port 5000 is already used by another program" | On a Mac, turn off **AirPlay Receiver** (**System Settings**, **General**, **AirDrop & Handoff**). Otherwise close OpenAlgo web or the other copy, or type another port and choose **Try again**. See [Ports and Server Settings](ports-and-server-settings.md) |
| Server Settings: "Live market data is not running" | Port 8765 is taken. Close the other program, or choose another **Market data port** |
| "OpenAlgo could not open your data" after installing an older version | A newer version has used the data folder. Install the newer version again |

## Signing in and the API

| What you see | Why, and what to do |
| --- | --- |
| Your scripts get "Sign in to OpenAlgo to use the API" | OpenAlgo was restarted or you logged out; the keys that check API keys are locked until you sign in. Sign in to OpenAlgo |
| "Invalid openalgo apikey" in the morning | No broker is logged in yet; without a broker session the API answers that way, as on the web. Log in to your broker from **Select Broker** |
| Broker login fails with a redirect error | The redirect URL in your broker app must match the one on **Broker Configuration** exactly (Upstox refuses even `localhost` in place of `127.0.0.1`). If you changed the App port, update it at the broker |
| "This broker sign-in was not started from OpenAlgo or has expired" | Start again from **Login with** on **Select Broker**, and finish the broker's login within a few minutes |
| A 429 "too many requests" answer | A rate limit (below) or your broker's own limit; wait a moment and try again |
| TradingView alerts do not arrive | The app must be open, signed in, with a broker logged in, and reachable through a tunnel. See [Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md) |
| The ngrok tunnel shows **Error** | The message says why: the authtoken, a domain not on your ngrok account, another ngrok agent already using your domain, or no internet |

## Frequently asked questions

### Is OpenAlgo Desktop free?

Yes. It is open source under the AGPL-3.0 licence, like OpenAlgo web.

### Which brokers are supported?

All 37 brokers of OpenAlgo web, Delta Exchange for crypto among them. Keys for
many brokers can be saved; one is logged in at a time.

### Do I need Python, a `.env` file or a server?

No. The installer is everything. Python is only needed if you write your own
scripts with the OpenAlgo Python SDK.

### Can I run my Python strategies?

Yes, as ordinary scripts that you start yourself, with the OpenAlgo Python SDK
pointed at `http://127.0.0.1:5000` and the desktop's API key. The Python
Strategy Host of OpenAlgo web (upload, schedule and run scripts inside
OpenAlgo) is not in the desktop.

### Does it keep trading when I close it, or when the computer sleeps?

No. OpenAlgo trades only while it is open, signed in and the computer is
awake. Closing it stops the API, the feed, strategies, OpenScript runs and
stop and target tracking. Positions and orders already placed stay at your
broker; use your broker's app to watch them while OpenAlgo is closed.

### Why do I have to log in to my broker every day?

Indian brokers end API sessions every night. OpenAlgo ends the broker session
at about 03:00 IST, and you log in again from **Select Broker**. Your session
from the same trading day resumes when you sign in to OpenAlgo again. Delta
Exchange trades around the clock and stays connected across 03:00 IST.

### Can OpenAlgo web and OpenAlgo Desktop run on the same computer?

Yes, on different ports. Both use 5000 and 8765 by default; change the
desktop's **App port** and **Market data port** in **Server Settings**, or run
one at a time. See [Ports and Server Settings](ports-and-server-settings.md).

### Can several people use one installation?

No. One trader per installation, with one OpenAlgo account.

### Is the API the same as OpenAlgo web's?

Yes, field for field: the same endpoints under `/api/v1`, the same requests,
responses and error messages. The API key goes in the JSON body. Everything in
the [API Documentation](../api-documentation/v1/README.md) applies.

### What are the rate limits?

Fixed in the app, the same as OpenAlgo web's defaults, and from version 1.0.3
each endpoint is counted on its own:

| Limit | Endpoints |
| --- | --- |
| 10 per second | Order placing, modifying and cancelling endpoints (`/placeorder`, `/placesmartorder`, `/modifyorder`, `/cancelorder`, `/optionsorder`, `/optionsmultiorder` and the GTT endpoints) |
| 30 per minute | `/optiongreeks`, `/whatsapp/notify` and most `/telegram/*` endpoints |
| 5 per minute | `/telegram/broadcast` |
| 100 per second | Every other `/api/v1` endpoint |

OpenAlgo also paces orders to your broker at the broker's own limit. A request
whose turn would be more than 10 seconds away is answered at once with 429 and
is not sent.

### Does the desktop support IP allowlisting?

A strategy webhook can carry an IP allowlist, which matches devices on your
network. The Security dashboard bans single addresses, and can ban
automatically after too many invalid keys. Callers through a tunnel share one
identity, so protect webhooks with their secret address.

### Can I backtest?

OpenScript strategies backtest in the charting terminal (`/trading`), over
history from your broker. The pandas backtesters of OpenAlgo web (Portfolio
Backtester, SIP Backtester, Portfolio Analyzer) are not in the desktop.

### Can I connect Claude or another AI assistant?

Yes, through the MCP server. Create a token on the **API Key** page with
**Read only** or **Read and place orders** access; the card shows a ready-made
configuration for Claude Desktop. The token is shown only once.

### Does it use my computer's keychain?

No. Your keys are locked with your OpenAlgo password inside the data folder.
See [Data, Security and Backups](data-security-and-backups.md).

### I forgot my password. Can it be recovered?

No. **Forgot password** on the sign-in page sets a new one; you then enter your
broker keys again, copy the new API key into your tools, and set up two-factor
sign-in, Telegram and WhatsApp again.

### I am moving from OpenAlgo web. What carries over?

Your broker apps (same redirect URL `http://127.0.0.1:5000/<broker>/callback`),
your scripts and tool settings (same addresses), and your TradingView alert
messages. You create a new account in the desktop, enter your broker keys in
**Broker Configuration**, and copy the desktop's new API key into your tools.

Nothing is imported from an OpenAlgo web database. Set these up again in the
desktop:

* Strategies (each gets a new webhook URL; update your TradingView alerts)
* Chartink strategies and their webhook URLs
* Telegram bot token, WhatsApp pairing, SMTP settings
* Sandbox capital and settings (the sandbox starts fresh at 1 crore)
* Historify data (download it again from the Historify page)

## Getting help

* [GitHub Issues](https://github.com/marketcalls/openalgo-desktop/issues) for bugs, with your system, the OpenAlgo Desktop version and what you saw
* [Community Support](../community-support.md) for questions
