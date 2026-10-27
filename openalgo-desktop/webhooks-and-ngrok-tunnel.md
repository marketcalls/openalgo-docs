# Webhooks and the Built-in ngrok Tunnel

TradingView, GoCharting and Chartink send their alerts from their own servers
on the internet. They cannot reach `127.0.0.1` on your computer, so OpenAlgo
Desktop needs a public `https://` address for them. A tunnel gives it one.

Your own scripts, Amibroker and Excel on the same computer do not need a
tunnel: they use `http://127.0.0.1:5000` directly.

## The built-in ngrok tunnel (version 1.0.3 and later)

OpenAlgo Desktop has ngrok built in. Nothing else to install, and no separate
ngrok program to keep running.

You need two things from a free ngrok account: your **authtoken** and your
**free domain**. The domain is required. The tunnel always opens on that one
domain, never on a random address, so the webhook addresses you paste into
TradingView, Chartink and GoCharting never change.

### Step 1: Get your authtoken and free domain from ngrok

1. Sign up for a free account at [dashboard.ngrok.com](https://dashboard.ngrok.com/signup) and verify your email address.
2. **Authtoken:** in the ngrok dashboard, open **Your Authtoken** (under Getting Started) and copy the token.
3. **Domain:** open **Domains**. A free account has one free domain listed there, for example `yourname.ngrok-free.app`. If none is listed, create your free domain on that page. Copy the domain name.

Keep the authtoken private: anyone who has it can open tunnels on your ngrok
account.

### Step 2: Enter them in OpenAlgo Desktop

1. Sign in to OpenAlgo Desktop.
2. Open the profile menu (top right), **Profile**, then the **Broker** tab.
3. In the **Server Configuration** card, find **Built-in ngrok tunnel**.
4. Paste the token into **ngrok authtoken** and the domain into **ngrok domain** (just the name, such as `yourname.ngrok-free.app`; a pasted `https://` in front is removed when it is saved).
5. Choose **Save authtoken and domain**. The field then says **An authtoken is saved.** The authtoken is stored encrypted and is never shown again; to change it, paste a new one and save.

### Step 3: Switch the tunnel on

In the same card, tick **Enable Ngrok Tunnel** and choose **Save Ngrok
Settings**. The tunnel's status changes from **Connecting to ngrok.** to
**Online at https://yourname.ngrok-free.app** within a few seconds.

### Step 4: Check that it works

* The status in the card says **Online at** your address.
* Open `https://<your domain>` in a browser. On ngrok's free plan you may first see ngrok's own warning page about visiting the site; continue past it. OpenAlgo then answers: "This address takes alerts and API calls for OpenAlgo Desktop only. To use OpenAlgo, open it on the computer where it is installed." That is correct: the tunnel works, and your OpenAlgo pages and login stay closed to the internet. Alerts from TradingView and similar services are not shown ngrok's warning page.
* The **TradingView**, **GoCharting** and **Chartink** pages in OpenAlgo now show webhook addresses that start with `https://<your domain>`.

### Step 5: Use the addresses in your alert services

Copy each webhook address from its page in OpenAlgo, so it is always exact:

| Service | Where to copy the address | It looks like |
| --- | --- | --- |
| TradingView, strategy alerts | **Platforms**, **TradingView** | `https://<your domain>/api/v1/placesmartorder` |
| TradingView, line alerts | **Platforms**, **TradingView** | `https://<your domain>/api/v1/placeorder` |
| GoCharting | **Platforms**, **GoCharting** | `https://<your domain>/api/v1/placeorder` |
| Chartink | **Platforms**, **Chartink**, the Chartink strategy | `https://<your domain>/chartink/webhook/<secret>` |
| A strategy on the Strategies page | **Strategies**, the strategy's page | `https://<your domain>/strategy/webhook/<secret>` |

Test new alerts with analyzer mode on first, so they go to the sandbox.

### Tunnel status messages and what to do

| The card says | What to do |
| --- | --- |
| The tunnel is off. | Tick **Enable Ngrok Tunnel** and save |
| Add your ngrok authtoken to start the tunnel. | Step 2: paste the authtoken and save |
| Add your ngrok domain: the free domain listed under Domains in your ngrok dashboard. | Step 2: paste the domain and save |
| The tunnel starts when you sign in to OpenAlgo. | Sign in; the tunnel opens by itself |
| Connecting to ngrok. | Wait a few seconds |
| The connection to ngrok was lost. Reconnecting. | Nothing; it reconnects by itself. Check your internet if it stays |
| ngrok did not accept the authtoken... | Copy the token again from **Your Authtoken**, paste it and save |
| Your ngrok account cannot use the domain... | Check the domain under **Domains** in the ngrok dashboard and save exactly that name |
| ngrok offered another address than your domain... | Same as above: save the domain listed under **Domains** |
| ngrok will not start a tunnel for this account... | Sign in to the ngrok dashboard to see why (for example, an email still to verify) |
| Your ngrok domain ... is in use by another ngrok agent... | Stop the other ngrok (OpenAlgo web, the ngrok program, or another computer). OpenAlgo keeps trying |
| Cannot reach ngrok... | Check your internet connection and firewall; OpenAlgo keeps trying |
| Your saved ngrok authtoken could not be read... | Paste the authtoken again and save |

To switch the tunnel off, untick **Enable Ngrok Tunnel** and save.

If you used OpenAlgo Desktop 1.0.2 or earlier with Enable Ngrok Tunnel on and
a tunnel you ran yourself, after updating the card asks for your authtoken and
domain; nothing changes until you add them.

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
