# First Run and Broker Login

## 1. Create your account

1. The app opens on the OpenAlgo home page. Choose **Login**.
2. The sign-in card shows **First time? Set up your account**. Choose it.
3. Enter a username, an email and a password, and create the account.

This account exists only on your computer; nothing is sent anywhere. Your API
key is created at the same time: find it on the **API Key** page.

**Choose a password you will remember.** It also locks the encryption key that
protects your broker credentials and API key. It cannot be recovered; a
forgotten password can be replaced, but your broker keys must then be entered
again (see [Data, Security and Backups](data-security-and-backups.md)).

## 2. Sign in

One card: username and password, then the code from your authenticator app if
you turned on two-factor sign-in. If OpenAlgo can resume your broker session
from the same trading day, you go straight to the dashboard; otherwise you go
to **Select Broker**.

Sign in after every start of the app. Until you do, the API, the market data
feed, TradingView and Chartink webhooks, MCP clients and your broker
connection stay off, and programs are told "Sign in to OpenAlgo to use the
API".

## 3. Save your broker's keys

There is no `.env` file. Broker keys are saved in the app, **one set per
broker, for as many brokers as you like**, and **one broker is logged in at a
time**.

1. Open **Broker Configuration** (from **Select Broker**, or the **Broker** tab in **Profile**) and choose your broker.
2. The page asks only for the keys that broker needs, labelled the way the broker names them, with a hint for each and a note on how its login works.
3. Enter the keys from your broker's developer portal and choose **Save**. Saved keys are shown masked (for example `Saved: abc***xyz`) and never in full; leave a field blank to keep the saved value.

How to create the app and get the keys at each broker is described in
[Connect Brokers](../connect-brokers/brokers/README.md). The broker side is the
same for OpenAlgo Desktop and OpenAlgo web; only the redirect URL below
matters.

## 4. The redirect URL

For brokers that sign you in on their own website (Zerodha, Fyers, Upstox,
Dhan and the other OAuth brokers), set the redirect URL of your broker app to:

```
http://127.0.0.1:5000/<broker>/callback
```

for example `http://127.0.0.1:5000/zerodha/callback` or
`http://127.0.0.1:5000/fyers/callback`. This is the same address OpenAlgo web
uses on your computer, so a broker app you already set up for OpenAlgo web on
this computer works as it is.

* If you changed the **App port** (for example to 5001), use that port: `http://127.0.0.1:5001/<broker>/callback`.
* **Broker Configuration** shows the exact address OpenAlgo uses for each broker, and lets you set a different one per broker or go back to the automatic one.
* With the built-in ngrok tunnel switched on (version 1.0.3 and later), the automatic address becomes `https://<your ngrok domain>/<broker>/callback`, as on OpenAlgo web. Register that one with your broker, or keep a fixed local address on Broker Configuration. See [Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md).

## 5. Log in to your broker

On **Select Broker**, choose **Login with** on your broker's card. Depending on
the broker this:

* **takes you to the broker's login page and back**: Zerodha, Fyers, Upstox, Dhan, Arrow, Paytm Money, Pocketful, HDFC Sky, HDFC Securities, IIFL Capital, Alice Blue, CompositEdge, RMoney, Flattrade, Shoonya, Zebu, TradeSmart and Rupeezy. The redirect URL in your broker app must match the one on Broker Configuration exactly; Upstox refuses even `localhost` in place of `127.0.0.1`. Always start from **Login with** in OpenAlgo, and finish the broker's login within a few minutes;
* **opens a small login card in the app** for the codes your broker asks each time (they are not saved): Angel One (client ID, PIN, TOTP), Kotak Securities (mobile number, TOTP, MPIN), 5 Paisa, Firstock, Motilal Oswal, mStock, Tradejini, Nubra (texted OTP), IndMoney (MPIN, TOTP), Definedge (OTP) and Groww; or
* **signs you in with one click from the saved keys**: the Symphony XTS brokers (5 Paisa XTS, JainamXts, Ibulls, IIFL, Wisdom Capital), Delta Exchange and Dhan (Sandbox).

If a login fails, the reason shows on that broker's card.

After the login, the **master contract** (the list of symbols) downloads; the
Master Contract indicator on the dashboard shows its progress. Wait for it
before placing orders.

Your broker session is resumed when you sign in again on the same trading day,
until the broker's daily cut-off (around 03:00 IST). After that, log in to the
broker again, as on OpenAlgo web.

## Switching brokers

Choose **Login with** on another configured broker. While a broker is logged
in, OpenAlgo asks first: "Signing in to Y ends your X session. Open positions
and orders stay with X." X's session ends only when the sign-in to Y
completes; if it fails, X stays connected.

A switch is refused while Live strategies, OpenScript runs or scalping
protection still run on X, or while orders there are not yet settled. The
keys of the broker you leave stay saved, so switching back needs only a
login. No restart is needed.

**Forget this broker** on Broker Configuration removes that broker's keys from
this computer after you confirm.

## 6. Try sandbox mode first

Sandbox mode (analyzer mode) lets you test strategies, webhooks and API
clients with simulated money and real market prices. Turn it on with the mode
switch in the top bar; the badge shows **Live Mode** or **Analyze Mode**.

While analyzer mode is on, every order from the app, the API, webhooks and MCP
clients goes to the sandbox instead of your broker. The sandbox:

* starts with 1 crore of simulated capital and blocks margin like a broker,
* fills market orders at the live price, and limit and stop orders from live ticks,
* settles CNC positions to holdings the next day and squares off MIS positions at the exchange cut-off times,
* keeps its data in a separate database, apart from live trading.

Market data still comes from your connected broker, so log in to a broker
before using sandbox mode. **Sandbox** in the profile menu has the capital,
leverage and square-off settings, and **Logs**, **Sandbox Logs** lists every
request made while analyzer mode was on.

## 7. Connect your tools

Copy the API key from the **API Key** page and use the desktop's addresses:

| Tool | Setting |
| --- | --- |
| Python SDK | `host="http://127.0.0.1:5000"`, `ws_url="ws://127.0.0.1:8765"` |
| Amibroker, Excel, your own code on this computer | `http://127.0.0.1:5000/api/v1/...` |
| TradingView, GoCharting, Chartink (they call from the internet) | A tunnel: see [Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md) |
| Claude Desktop and other AI clients (MCP) | Create an MCP token on the **API Key** page; the card shows a ready-made configuration to copy. The token is shown only once |

Next: [Ports and Server Settings](ports-and-server-settings.md).
