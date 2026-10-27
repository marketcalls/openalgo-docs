# Ports and Server Settings

OpenAlgo Desktop runs a small local server while its window is open. SDKs,
Amibroker, Excel, MCP clients and webhooks reach it through two ports:

| What | Default | Changed in |
| --- | --- | --- |
| App, REST API (`/api/v1`), broker redirects, MCP | `127.0.0.1:5000` | Profile menu, **Server Settings**, **App port** |
| Market data WebSocket | `127.0.0.1:8765` | Profile menu, **Server Settings**, **Market data port** |

These are the same defaults as OpenAlgo web, so tools and broker redirect URLs
carry over unchanged.

## Changing the ports

Open the profile menu, then **Server Settings**:

| Field | Default | Takes effect |
| --- | --- | --- |
| **App port** | 5000 | When you restart OpenAlgo Desktop |
| **App address** | `127.0.0.1` | When you restart OpenAlgo Desktop |
| **Market data port** | 8765 | Within a few seconds; connected tools are disconnected and must reconnect |
| **Allow access from other devices** | Off | The app address after a restart; the market data address within a few seconds |

* Ports must be between 1024 and 65535, and the app port and the market data port must differ.
* Server Settings says which of your changes is waiting for a restart.
* The settings are stored inside the app's database, not in a file: there is no `.env` or config file to edit.

**After changing the App port**, use the new port everywhere a tool talks to
the desktop:

| Setting | Example with App port 5001 and Market data port 8766 |
| --- | --- |
| SDK `host` | `http://127.0.0.1:5001` |
| SDK `ws_url` | `ws://127.0.0.1:8766` |
| Broker app redirect URL | `http://127.0.0.1:5001/<broker>/callback` |
| MCP client URL | `http://127.0.0.1:5001` |

## If port 5000 is already in use

If another program holds port 5000 when OpenAlgo starts, the app opens on a
page that says "OpenAlgo could not start because port 5000 is already used by
another program", with a **Port** box and a **Try again** button.

* **On a Mac this is usually AirPlay Receiver.** Open **System Settings**, **General**, **AirDrop & Handoff**, turn off **AirPlay Receiver**, then choose **Try again**.
* **OpenAlgo web, or a second copy of OpenAlgo Desktop**, may be running. Close it and choose **Try again**.
* **Or use another port.** Type a free port (for example `5001`) in the **Port** box and choose **Try again**. OpenAlgo remembers it. Then update your broker's redirect URL and your tools as in the table above.

If port 8765 (market data) is taken, the app still opens, but live market data
for your SDK and trading platforms does not start. **Server Settings** shows
"Live market data is not running" with the reason. Close the other program,
or choose another **Market data port** there.

## Running OpenAlgo Desktop next to OpenAlgo web

Both use ports 5000 and 8765 by default, so only one can have them.

**Simplest: run one at a time.** Stop OpenAlgo web before you open OpenAlgo
Desktop, and the other way round. Your tools, broker redirect URLs and SDK
scripts then work with both unchanged.

**Side by side:** give OpenAlgo Desktop its own ports.

1. Open OpenAlgo Desktop while OpenAlgo web runs. It opens on the port page. Type a free port, for example `5001`, and choose **Try again**.
2. Sign in, open the profile menu, then **Server Settings**. Change **Market data port** to a free port, for example `8766`, and choose **Save**.
3. Use the desktop's ports wherever a tool talks to the desktop (table above).
4. A broker app usually has one redirect URL. If OpenAlgo web uses the same broker app on port 5000, create a second app at your broker for the desktop, or run one at a time.

Only one copy of OpenAlgo Desktop can run at a time.

## Using it from another device on your network

By default OpenAlgo Desktop accepts connections only from the same computer.
To use the dashboard or the API from another device on your home or office
network:

1. Turn on **Allow access from other devices** in Server Settings and save.
2. Restart OpenAlgo Desktop.
3. From the other device, open `http://<this computer's IP address>:5000`.

Your computer's firewall may ask whether to allow OpenAlgo Desktop on the
network; allow it on private networks only. Do not expose these ports directly
to the internet. For alerts from TradingView and other internet services, use
a tunnel instead: see
[Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md).

## The dashboard in a browser

While the app runs, the same dashboard opens in any browser on the same
computer at `http://127.0.0.1:5000` (or your App port). It is the same
account and the same data as the app window.
