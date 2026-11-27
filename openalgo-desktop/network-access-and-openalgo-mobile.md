# Network Access and OpenAlgo Mobile

Out of the box, OpenAlgo Desktop accepts connections only from the computer it
runs on. One switch in Server Settings lets other devices on your home or
office network in. A phone, a tablet or another computer can then open the
same dashboard, and scripts on another computer can use the API and the
market data feed.

## What works from another device

| What | From another device on your network |
| --- | --- |
| The dashboard in a browser (phone, tablet, laptop) | Yes, at `http://<this computer's IP address>:5000`, with live prices |
| The REST API (`/api/v1`): Python SDK, Amibroker, Excel, your own code | Yes, with your API key |
| The market data WebSocket | Yes, at `ws://<this computer's IP address>:8765`, with your API key |
| Broker login | Do it on the computer. A broker that sends you back after its login page returns you to `127.0.0.1`, and on another device that is the device itself |
| Creating the OpenAlgo account | Only on the computer where OpenAlgo Desktop is installed |
| **Start fresh**, a forgotten password, resetting the account, restarting into an update | Only in the OpenAlgo Desktop window on the computer |
| The OpenAlgo Mobile app | Not yet: see [OpenAlgo Mobile](#openalgo-mobile) |

## 1. Turn on access from other devices

1. Open the profile menu (top right), then **Server Settings**.
2. Turn on **Allow access from other devices**. **App address** and **Market data address** change from `127.0.0.1` to `0.0.0.0`, which means every network this computer is connected to.
3. Choose **Save**. The market data feed moves within a few seconds; the app address changes when OpenAlgo restarts.
4. Quit OpenAlgo Desktop and open it again.

While the switch is on, Server Settings warns "Anyone on your network can
reach the login page". Read [Keeping it safe](#keeping-it-safe) before you
leave it on.

Keep `0.0.0.0` in both address fields. If you type a single address there,
such as this computer's own IP, OpenAlgo stops listening on `127.0.0.1`. The
desktop window and your tools on this computer connect through `127.0.0.1`,
and OpenAlgo cannot start its server once the router gives the computer a
different address.

## 2. Let it through the firewall

Your computer's firewall may ask whether OpenAlgo Desktop may accept incoming
connections. Allow it on private networks only. If you missed the prompt:

* **Windows:** **Windows Security**, **Firewall & network protection**, **Allow an app through firewall**, and allow OpenAlgo Desktop on **Private**.
* **macOS:** **System Settings**, **Network**, **Firewall**, **Options**, and allow OpenAlgo Desktop.
* **Linux with `ufw`:** `sudo ufw allow from 192.168.1.0/24 to any port 5000`, and the same for port `8765`, with your own network's range.

If you changed the **App port** or the **Market data port**, allow those
instead.

## 3. Find this computer's IP address

Other devices reach the computer by its IPv4 address on your network: four
numbers such as `192.168.1.20`.

| Computer | Where to find it |
| --- | --- |
| Windows | **Settings**, **Network & internet**, **Wi-Fi** (or **Ethernet**), then your network's properties: **IPv4 address**. Or run `ipconfig` in Command Prompt and read **IPv4 Address** |
| macOS | **System Settings**, **Wi-Fi**, **Details** next to your network: **IP address**. Or run `ipconfig getifaddr en0` in Terminal |
| Linux | Run `hostname -I`. The first address is usually the one |

* **Use the IP address, not the computer's name.** A name such as `my-laptop.local` gets "Request blocked.": of the names, only `localhost` is accepted.
* **The address can change** when the router restarts. To keep it, reserve it for this computer in your router's settings, often called DHCP reservation or a static lease.

## 4. Open it on your phone or another computer

1. Connect the device to the same network as the computer. A guest Wi-Fi network usually keeps devices apart, and then nothing connects.
2. In the device's browser, open `http://192.168.1.20:5000`, with your computer's address and your **App port** if you changed it.
3. Sign in with your OpenAlgo username and password, plus the code from your authenticator app if two-factor sign-in is on.

You get the same dashboard, account and data as in the desktop window. Live
prices on the pages connect to the market data feed at the same address by
themselves.

* **OpenAlgo Desktop must be running, and the computer awake.** While the computer sleeps, other devices lose the connection. When it wakes, OpenAlgo reconnects to your broker's feeds.
* **Logout on any device logs out everywhere.** **Logout** on the phone ends every OpenAlgo session, the desktop window's included. It also ends your broker session and locks the API until you sign in again. Log in to your broker again on the computer afterwards.
* **A saved WebSocket URL is used by every device.** If you set **WebSocket URL** under **Profile**, **Broker** tab, **Server Configuration** (for example `ws://127.0.0.1:8765`), the phone uses that address too, and on a phone `127.0.0.1` is the phone itself. Prices then refresh every 5 seconds instead of streaming. To fix it, choose **Use automatic address** there, then **Save Ngrok Settings**.

## 5. Tools on another computer

Point the tool at this computer's address instead of `127.0.0.1`, and use the
API key from the **API Key** page:

| Tool | Setting (computer at 192.168.1.20, default ports) |
| --- | --- |
| Python SDK | `host="http://192.168.1.20:5000"`, `ws_url="ws://192.168.1.20:8765"` |
| Amibroker, Excel, your own code | `http://192.168.1.20:5000/api/v1/...` |
| A WebSocket client | `ws://192.168.1.20:8765`, then authenticate with the API key |

```python
from openalgo import api

client = api(
    api_key="your-api-key",
    host="http://192.168.1.20:5000",
    ws_url="ws://192.168.1.20:8765",
)
```

* **Sign in after every start.** After OpenAlgo Desktop starts, and after a logout, the API answers "Sign in to OpenAlgo to use the API" until you sign in, on the computer or in any device's browser.
* **"Invalid openalgo apikey"** means a wrong key, or no broker logged in. OpenAlgo web answers the same way in both cases.
* **Rate limits** apply per device, as on OpenAlgo web.

## OpenAlgo Mobile

[OpenAlgo Mobile](../trading-platform/mobile-app.md) is the OpenAlgo app for
Android. It connects to an OpenAlgo server with the server's address and an
API key.

**It does not connect to OpenAlgo Desktop yet.** The app first checks the
server's version and needs 2.0.0.0 or later, which is OpenAlgo web's
numbering. OpenAlgo Desktop reports its own version (1.0.x), so the app stops
at its **Update OpenAlgo** screen: "This server runs OpenAlgo 1.0.x. The app
needs 2.0.0.0 or later." Ignore the `install/update.sh` and `docker pull`
steps on that screen: they are for OpenAlgo web, and updating OpenAlgo Desktop
does not change the answer. The app's README and its **Setup help** screen
list OpenAlgo Desktop as not supported yet.

Until that changes, open the dashboard in your phone's browser as in step 4.
It is the full OpenAlgo interface.

## Keeping it safe

* **The connection is not encrypted.** Pages, your password and the API key travel over your network as plain `http`. Turn this on only on a network you trust, never on public or shared Wi-Fi.
* **Never forward these ports on your router to the internet.** For TradingView, Chartink and other internet services, use a tunnel with https: see [Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md). The built-in tunnel carries the API, webhooks and AI clients only, never the dashboard.
* **Use a strong password and two-factor sign-in.** Anyone on the network can reach the sign-in page. On **Profile**, **TOTP** tab, turn on **Enable 2FA** and, under **Apply 2FA to**, **Dashboard sign-in**, then confirm with the code from your authenticator app. **Enable 2FA** alone does not ask for a code at sign-in.
* **Wrong passwords slow down only the device that sends them.** Five wrong attempts are free. After each further one the device waits, 30 seconds at first, doubling up to 5 minutes. This computer has its own count, so a device on the network cannot lock you out of the desktop window.
* **Turn it off when you no longer need it:** turn off **Allow access from other devices**, choose **Save**, and restart OpenAlgo.

## When it does not connect

| What you see | What to do |
| --- | --- |
| The page never loads on the other device | Check that both are on the same network (not a guest network), that the switch is on and OpenAlgo was restarted, that the firewall allows OpenAlgo Desktop, that the IP address is current, and that the computer is awake with OpenAlgo open |
| "Request blocked." | Use the computer's IP address, not its name |
| Prices refresh every few seconds instead of streaming | Clear a saved **WebSocket URL** (step 4), and check that the firewall allows the **Market data port** (8765 by default) |
| "Sign in to OpenAlgo to use the API" | Sign in to OpenAlgo. The API is off after every start and after a logout |
| "Invalid openalgo apikey" | Copy the key again from the **API Key** page, and log in to your broker on the computer |
| "Create your account on the computer where OpenAlgo Desktop is installed." | Create the first account on that computer. After that you can sign in from any device |
| "Sign in once in the OpenAlgo Desktop window on the computer where it is installed" | OpenAlgo is moving keys saved by an older build. Sign in once in the OpenAlgo Desktop window itself (a browser does not count, even on that computer). Other devices work after that |
| OpenAlgo Mobile shows **Update OpenAlgo** | The app does not support OpenAlgo Desktop yet: see [OpenAlgo Mobile](#openalgo-mobile) |

More in [Ports and Server Settings](ports-and-server-settings.md) and
[Troubleshooting and FAQ](troubleshooting-and-faq.md).
