# Webhooks and the Built-in ngrok Tunnel

TradingView, GoCharting and Chartink send their alerts from their own servers
on the internet. They cannot reach `127.0.0.1` on your computer, so OpenAlgo
Desktop needs a public `https://` address for them. A tunnel gives it one.

Your own scripts, Amibroker and Excel on the same computer do not need a
tunnel: they use `http://127.0.0.1:5000` directly.

## The built-in ngrok tunnel (version 1.0.3 and later)

OpenAlgo Desktop has ngrok built in. Nothing else to install, and no separate
ngrok program to keep running.

### What you need

A free ngrok account gives you two things, both from the
[ngrok dashboard](https://dashboard.ngrok.com):

* **Your authtoken**, under **Your Authtoken**.
* **Your free domain**, under **Domains** (one free static domain per account, for example `something.ngrok-free.app`).

The domain is required. The tunnel always opens on that one domain, never on a
random address, so the webhook addresses you paste into TradingView, Chartink
and GoCharting never change.

### Turn it on

1. In OpenAlgo, open the profile menu, **Profile**, then the **Broker** tab.
2. In the **Server Configuration** card, paste the authtoken and the domain and choose **Save authtoken and domain**. The authtoken is kept encrypted and never shown again.
3. Tick **Enable Ngrok Tunnel** and choose **Save Ngrok Settings**.

The card shows the tunnel's state: **Connecting**, then **Online** with its
`https://` address.

### What changes when it is on

* Your **Host Server URL** becomes `https://<your domain>`, whether the tunnel is online at that moment or not.
* The webhook addresses on the **TradingView**, **GoCharting** and **Chartink** pages, and on each strategy, use it. Copy them from there.
* The automatic broker redirect URL becomes `https://<your domain>/<broker>/callback`, as on OpenAlgo web. Register that address with your broker, or keep a fixed local redirect URL (`http://127.0.0.1:5000/<broker>/callback`) on **Broker Configuration**. A broker sign-in that arrives through the tunnel is passed back to OpenAlgo on your computer, so it finishes in the window you started it from.

### When it runs

* It opens each time you sign in to OpenAlgo, and closes when you log out or quit.
* It reconnects by itself if the connection drops.
* If it shows **Error**, the message says why and what to do: a mistyped authtoken, a domain that is not on your ngrok account, another ngrok agent already using your domain, or no internet. It never falls back to another address.

A free ngrok domain can be online in only one place at a time. If OpenAlgo web
or the ngrok program uses the same domain elsewhere, stop it there first.

### What is reachable through it

Only what an internet service needs to reach:

| Through the tunnel | Protected by |
| --- | --- |
| The REST API (`/api/v1`) | Your API key |
| Strategy webhooks and Chartink webhooks | The secret in the webhook address |
| MCP for AI clients | An MCP token, and only with **Admin**, **Remote MCP** turned on |

The OpenAlgo pages and the sign-in page stay on your computer: opening the
tunnel's address in a browser shows a short notice instead of the app.

The tunnel also limits how long each request may take and how many can be
open at once, so a stranger who learns the address cannot hold it open; when
too many arrive at once, the extra ones are turned away immediately rather
than queued.

## Or: a tunnel you run yourself

You can also use Cloudflare Tunnel, VS Code Dev Tunnels or the ngrok program
yourself:

1. Point it at the desktop's app port, for example `cloudflared tunnel --url http://127.0.0.1:5000`, and copy the `https://` address it prints.
2. In the **Server Configuration** card, enter it in **Host Server URL** (just `https://` and the host name, nothing after it) and choose **Save Ngrok Settings**. It applies at once.
3. Leave **Enable Ngrok Tunnel** off: that switch starts the built-in tunnel.

Requests through a tunnel whose address is not entered there are refused
("Request blocked."). When you stop using the tunnel, choose **Use automatic
address** under the field (or clear it) and save.

A tunnel you run yourself makes the OpenAlgo sign-in page reachable from the
internet (the built-in one does not). Use a strong password and turn on
two-factor sign-in (**Profile**, **TOTP** tab).

## Good practice

* Your API key travels inside each TradingView alert. Keep your alerts private, and regenerate the key on the **API Key** page if it leaks.
* Test new alerts with analyzer mode on, so they go to the sandbox first.
* Keep the app open and the computer awake while alerts should be traded.
* Wrong API keys arriving through the tunnel are counted per key tried, so a stranger's attempts never block your correct key.
