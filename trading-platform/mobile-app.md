# Mobile App

**OpenAlgo Mobile** is the OpenAlgo app for Android phones. It connects to the
OpenAlgo server you already run, with the server's address and an API key, and
needs no changes on the server. It is a **frontend only** application: it
holds no broker credentials of its own, stores no data centrally, and talks
only to your server.

* Repository: [marketcalls/openalgo-mobile](https://github.com/marketcalls/openalgo-mobile)
* Latest release: [0.1.0](https://github.com/marketcalls/openalgo-mobile/releases/tag/v0.1.0) (26 November 2026), an Android APK
* Built with React Native and Expo for Android and iPhone. The iPhone build is not distributed yet.
* Works with OpenAlgo 2.0.0.0 or later. OpenAlgo Desktop is not supported yet: see [Network Access and OpenAlgo Mobile](../openalgo-desktop/network-access-and-openalgo-mobile.md#openalgo-mobile).
* Licence: AGPL-3.0

Version 0.1.0 is a new app, rebuilt from scratch, and replaces the earlier
Flutter app. It installs alongside the old app, because its app ID is
different. The old app's watchlist is not carried over.

***

## What It Does

### Market data

| Feature | Description |
| --- | --- |
| **Watchlists** | Several named lists stored on your phone, with live prices. Add symbols from search, swipe to remove, reorder, open a buy or sell ticket in one tap, and back up or restore the lists to a file |
| **Index strip** | NIFTY and SENSEX by default; choose up to four from NIFTY, BANKNIFTY, SENSEX and INDIAVIX. Tap an index for its open, high, low and previous close, and your funds |
| **Market depth** | 5 levels, or 20 where your broker supports them. Tap a level to start a limit order at that price |

### Trading

| Feature | Description |
| --- | --- |
| **Order ticket** | BUY or SELL; MIS, CNC or NRML; MARKET, LIMIT, SL or SL-M. Quantity in lots for F&O, prices snapped to the tick size, stop-price checks, orders above the exchange freeze limit split automatically, and an optional margin preview |
| **Review before every order** | The review always shows whether your server is in **LIVE** or **ANALYZE** mode, and the app checks the mode again just before sending |
| **No duplicate orders** | An order is never sent again automatically. If the server's reply is unclear, the app checks the order book and tells you what it found |
| **Orders** | Open orders, all orders and trades, with modify, cancel and **Cancel all** |
| **Portfolio** | Positions with live P&L, close one or **Close all**, holdings with **Sell**, and funds |
| **Analyzer mode** | The **LIVE**/**ANALYZE** switch changes the mode of the whole OpenAlgo server, and the app warns you before it does. In Semi-Auto mode it shows when orders are waiting for approval, with a link to the Action Center |

### Security and diagnostics

| Feature | Description |
| --- | --- |
| **API key storage** | Kept in the Android Keystore on the phone only and never backed up. It is shown masked, and screenshots are blocked on the screen that shows it |
| **App lock** | On by default: fingerprint or device passcode on start and after 5 minutes in the background (1, 5 or 15 minutes under **Account**, **Lock after**; the phone needs a passcode). Optionally, a fingerprint confirmation before every live order |
| **Diagnostics** | Shows what your server supports and why |

Not in 0.1.0 yet: charts and the tools pages, push notifications, and the
iPhone build.

***

## Prerequisites

* A running **OpenAlgo server, version 2.0.0.0 or later**, logged in to your broker. Install it from [Getting Started](../getting-started/README.md), or use a server you already run.
* An **API key** from the `/apikey` page of that server.

The app is a client; it cannot trade on its own. Try it with your server in
**analyzer mode** first.

***

## Install

1. Download **`openalgo-mobile-0.1.0.apk`** from the [release page](https://github.com/marketcalls/openalgo-mobile/releases/tag/v0.1.0).
2. Open it on your phone and allow your browser or file manager to install apps.
3. Open **OpenAlgo**.

The release page lists the file's SHA-256 and the signing certificate's
fingerprint, to check the download. Later releases are signed with the same
key and install over this one.

***

## Connecting

The first run takes you through three screens:

1. **Connect to OpenAlgo**: type your server's address as you open it in a browser, for example `https://algo.example.com`, or `192.168.1.20` for a server on your home network. Choose **Continue**. The app checks that the server is OpenAlgo 2.0.0.0 or later.
2. **API key**: paste the key from your server's `/apikey` page (**Where do I find this?** opens it) and choose **Continue**. The app checks the key and your broker session.
3. **Live feed**: the feed address is filled in from the server address: `wss://<your domain>/ws` for an https server, `ws://<address>:8765` for a home-network address. Choose **Test live feed**, then **Save**. If the test fails, the app still works, and prices refresh every few seconds instead of streaming.

You can change both later under **Account**: **Server settings** and **Change
API key**.

**Address rules:**

* **https is required** for any server on the internet.
* **Plain http** is accepted only for home-network addresses, such as `192.168.x.x`, `10.x.x.x` and names ending in `.local`, after a "Not encrypted" warning that you accept with **I understand**. A home-network address typed without `http://` gets `http://` added, and port 5000 if you typed no port.
* **`localhost` and `127.0.0.1` are the phone itself**, not your computer: use the computer's network address.

### Where your server runs

| Server | What to do |
| --- | --- |
| **A VPS from the OpenAlgo installers** (native or Docker, with nginx and TLS) | Works as is: `https://<your domain>`, live feed `wss://<your domain>/ws` |
| **Docker on a computer at home** (docker-compose or `docker-build.sh`) | Works as is: `http://<the computer's IP address>:5000`, live feed `ws://<address>:8765`, with a "Not encrypted" badge |
| **Docker started with `install/docker-run.sh`** | The app works; for the live feed set `WEBSOCKET_HOST='0.0.0.0'` in `.env` and restart the container |
| **OpenAlgo web installed natively on a computer at home** | It listens only on `127.0.0.1` with the default `.env`. Set `FLASK_HOST_IP='0.0.0.0'` and `WEBSOCKET_HOST='0.0.0.0'`, restart OpenAlgo, and use `http://<the computer's IP address>:5000` in the app |
| **Through the built-in ngrok, a cloudflared quick tunnel or Dev Tunnels** | Works, but prices refresh every few seconds instead of streaming. A named cloudflared tunnel that routes `/ws` to port 8765 streams live: the app's **Setup help** shows the rule |
| **OpenAlgo Desktop** | Not supported yet. Use the dashboard in your phone's browser instead: see [Network Access and OpenAlgo Mobile](../openalgo-desktop/network-access-and-openalgo-mobile.md) |

{% hint style="warning" %}
Over plain http, anyone on the same Wi-Fi can capture your API key. Use a
home-network address only on a network you trust. Anything you expose to the
internet needs https and the usual hardening: the API key is the credential
that resolves your broker session.
{% endhint %}

***

## Security Model

The app follows the same principle as the rest of OpenAlgo: **your broker
credentials never leave your server.**

* The app holds an **OpenAlgo API key**, not broker credentials
* The server resolves that key to the active broker session
* Revoking the key from the dashboard cuts the app off without touching your broker account
* No trading data passes through any third party

**If you lose your phone**, regenerate the key on the `/apikey` page, then log
out of your broker or restart OpenAlgo.

***

## Related

* [Network Access and OpenAlgo Mobile](../openalgo-desktop/network-access-and-openalgo-mobile.md) to use OpenAlgo Desktop from a phone
* [Chrome Extension](chrome-extension.md) for browser-based order entry
* [Mini FOSS Universe](../mini-foss-universe.md) for the rest of the ecosystem
* [Getting Started](../getting-started/README.md) to set up the server the app connects to
