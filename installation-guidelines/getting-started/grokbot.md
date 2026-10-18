---
description: Install and run OpenAlgo from scratch inside a Grok Bot computer
---

# GrokBot

Grok Bot is an AI assistant that comes with its own persistent Linux computer (called the box). You can ask Grok Bot to install OpenAlgo on that computer, connect your broker every morning, keep OpenAlgo up to date, download market data on a schedule, and then use OpenAlgo's charts, API and Python SDK for research and Sandbox (analyzer mode) trading on your command.

This page explains the full installation from scratch, the daily and weekly routines, and how to fix the common problems. You can follow it yourself in the Grok Bot terminal, or simply ask Grok Bot to "install OpenAlgo following the GrokBot guide on docs.openalgo.in".

{% hint style="info" %}
The OpenAlgo repository also ships a Grok Bot skill (`.claude/skills/grokbot-setup/`) that contains these same steps for the assistant itself. When you ask Grok Bot to set up OpenAlgo, it reads that skill.
{% endhint %}

{% hint style="warning" %}
**Static IP.** The Grok Bot computer does not have a static IP. Under the SEBI retail algo trading rules, Indian brokers reject live API orders that do not come from a registered static IP. On the Grok Bot computer you can log in, stream data, use charts, run backtests, build Flows and run strategies in Sandbox mode. For live orders, run OpenAlgo on a server with a registered static IP. See [Static IP](../../static-ip.md).
{% endhint %}

### What you need before you start

* A Grok Bot account with its computer available.
* Your broker's API credentials (API key and secret, and for some brokers a separate market data key and secret). Create the broker app by following your broker's page under [Connect Brokers](../../connect-brokers/brokers/README.md).
* The redirect URL to register in your broker's developer console: `http://127.0.0.1:5000/<broker>/callback`, where `<broker>` is the broker code used by OpenAlgo (the folder name under `broker/` in the OpenAlgo repository).
* A username, email and strong password for your OpenAlgo account.
* For the automated daily login: whatever your broker asks for every morning (user ID, password or PIN) and your **TOTP secret** (the base32 setup key shown when you enabled TOTP at the broker, not a 6-digit code). See [TOTP Configuration](../../getting-started/totp-configuration.md).

{% hint style="danger" %}
Never paste passwords, API keys or TOTP secrets into an ordinary chat message. Grok Bot collects them through its secure forms and stores them on its computer with owner-only permissions (`chmod 600`). It never repeats them in chat, logs or reports.
{% endhint %}

### Step 1: Prerequisites (git and uv)

OpenAlgo needs **Python 3.12 or newer** and uses **uv** to manage Python and its packages. You do not need to install Python separately: uv downloads the version pinned by the repository (3.13).

Check what is already installed:

```bash
git --version
uv --version
```

If uv is missing, install it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

The Grok Bot computer is shared by all of your Grok Bot assistants. Before installing, check that OpenAlgo is not already installed or running:

```bash
ls /workspace/repos/openalgo 2>/dev/null && git -C /workspace/repos/openalgo log -1 --oneline
ss -ltn | grep -E ':5000|:8765'
```

If either command shows something, use the existing installation instead of creating a second one.

### Step 2: Clone OpenAlgo

```bash
mkdir -p /workspace/repos && cd /workspace/repos
git clone https://github.com/marketcalls/openalgo.git
cd openalgo
```

### Step 3: Install the dependencies

```bash
uv sync --locked
```

This creates a `.venv` inside the repository with every dependency from the lock file. Always use `uv sync`, `uv run` and `uv add`; do not use `pip` or a bare `python`. The web frontend (`frontend/dist/`) is already built on `main`, so Node.js is not needed.

### Step 4: Create the .env file

```bash
cp .sample.env .env
chmod 600 .env
```

{% hint style="danger" %}
Run `cp .sample.env .env` **only on a new installation**. On an existing installation it erases your broker keys and your `API_KEY_PEPPER`, which locks you out of your account.
{% endhint %}

**Generate the security keys before the first start.** `APP_KEY`, `API_KEY_PEPPER` and `FERNET_SALT` ship as placeholders. Replace them with fresh random values using a script, so the values never appear on screen:

```bash
uv run python - <<'PY'
import re, secrets, pathlib
p = pathlib.Path(".env")
t = p.read_text()
for key, n in (("APP_KEY", 32), ("API_KEY_PEPPER", 32), ("FERNET_SALT", 16)):
    t = re.sub(rf"^{key}\s*=.*$", f"{key} = '{secrets.token_hex(n)}'", t, count=1, flags=re.M)
p.write_text(t)
PY
grep -c PLACEHOLDER .env   # expect 0
```

* `APP_KEY` signs login sessions. Changing it later only logs everyone out.
* `API_KEY_PEPPER` and `FERNET_SALT` protect your password, API key and broker tokens. **Never change them after the account is created**, and keep a backup of `.env`.

**Fill in the broker section** of `.env`:

```
BROKER_API_KEY = 'your_broker_api_key'
BROKER_API_SECRET = 'your_broker_api_secret'

# Only for brokers that use separate market data credentials
BROKER_API_KEY_MARKET = 'your_market_data_api_key'
BROKER_API_SECRET_MARKET = 'your_market_data_api_secret'

REDIRECT_URL = 'http://127.0.0.1:5000/<broker>/callback'
```

OpenAlgo picks the active broker from `REDIRECT_URL`, so the broker code must match exactly what you registered with the broker. Leave `VALID_BROKERS` as shipped.

**Host and ports.** Keep the defaults. Everything stays on the local machine:

```
HOST_SERVER = 'http://127.0.0.1:5000'
FLASK_HOST_IP='127.0.0.1'
FLASK_PORT='5000'
WEBSOCKET_HOST='127.0.0.1'
WEBSOCKET_PORT='8765'
```

**Crypto brokers only.** Crypto markets run 24/7, so the daily session expiry is switched off:

```
DISABLE_SESSION_EXPIRY = 'true'
CRYPTO_MASTER_CONTRACT_CUTOFF_TIME = '00:00'
```

Indian brokers keep the defaults (`SESSION_EXPIRY_TIME = '03:00'`, `DISABLE_SESSION_EXPIRY = 'false'`).

### Step 5: First run

Start OpenAlgo in the background so it keeps running after the terminal closes:

```bash
cd /workspace/repos/openalgo
nohup setsid script -qfec "uv run app.py" app.log >/dev/null 2>&1 &
```

Why not just `nohup uv run app.py &`? OpenAlgo's real-time server refuses to start without a terminal attached, so that command exits immediately. `script` gives the app a terminal and writes its output to `app.log`, and `setsid` detaches it from the shell.

Wait until it is up, then check both ports:

```bash
for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:5000/auth/app-info && break; sleep 2
done
ss -ltn | grep -E '127.0.0.1:(5000|8765)'
```

`/auth/app-info` returns `"status":"success"` and the OpenAlgo version. Port 5000 serves the web app and API, and port 8765 serves the WebSocket.

### Step 6: Create the admin account

Open `http://127.0.0.1:5000/setup` in the Grok Bot browser and create your account with your username, email and password. The password needs at least 8 characters with an uppercase letter, a lowercase letter, a digit and a special character.

`/setup` works only once. OpenAlgo has one user per installation; afterwards the page redirects to the login page.

### Step 7: Broker login

1. Log in at `http://127.0.0.1:5000/login`.
2. Open `/broker`, select your broker and click **Connect Account**.
3. Complete the broker's own login page. You can type your credentials and TOTP yourself on the Grok Bot screen, or give the 6-digit code to Grok Bot through a secure form. Codes are valid for about 30 seconds, so submit right away.
4. After the redirect, `/dashboard` shows your broker as connected.

### Step 8: Master contract

Right after a successful broker login, OpenAlgo downloads the broker's master contract (the list of every tradable symbol). Wait until the dashboard shows the master contract as ready before searching symbols or calling the API. This happens automatically after every login.

### Step 9: API key

`/setup` already created an API key for your account. Open `/apikey` to view it. Regenerate it only if you need to, because that breaks every script that uses the old key.

For Python scripts, keep the key in a separate project's `.env` file rather than in your code:

```bash
mkdir -p /workspace/pyenv && cd /workspace/pyenv
uv init --python 3.13 --name pyenv .
uv add openalgo
install -m 600 /dev/null .env
# then add these two lines to .env (Grok Bot writes them for you):
# OPENALGO_API_KEY=<your api key>
# OPENALGO_HOST=http://127.0.0.1:5000
```

Test the key and the broker session together. `ping` fails if either is wrong:

```bash
set -a; . /workspace/pyenv/.env; set +a
curl -s -X POST http://127.0.0.1:5000/api/v1/ping \
  -H 'Content-Type: application/json' -d "{\"apikey\":\"$OPENALGO_API_KEY\"}"
```

A successful reply contains `"message":"pong"`.

A first Python call:

```python
# quote.py
import os
from openalgo import api

client = api(api_key=os.environ["OPENALGO_API_KEY"], host=os.environ["OPENALGO_HOST"])
print(client.quotes(symbol="RELIANCE", exchange="NSE"))
```

```bash
uv run --env-file /workspace/pyenv/.env python quote.py
```

### Step 10: Daily 8:00 AM login routine (Indian brokers)

Indian broker sessions expire every day at about **3:00 AM IST**. After that the API, charts, Flow and strategies all need a fresh broker login. Grok Bot can do this for you with a **routine** (a scheduled task) every day at **8:00 AM IST**:

1. Make sure OpenAlgo is running (start it with the Step 5 command if not).
2. Log in to OpenAlgo, open `/broker` and click **Connect Account**.
3. Fill the broker's login fields and a fresh TOTP code generated from your stored TOTP secret with `pyotp`.
4. Confirm the dashboard shows the broker connected and the master contract loaded.
5. Report one line to you: connected or not, and the reason if not.

Notes:

* Your login details and TOTP secret are stored on the Grok Bot computer in a folder only the owner can read (directory `chmod 700`, files `chmod 600`).
* Brokers that connect with an API key and secret alone need no TOTP; the routine only clicks Connect.
* Brokers that send an SMS or email OTP cannot be automated. Log in manually each day.
* **Crypto brokers need no daily routine.** With `DISABLE_SESSION_EXPIRY = 'true'`, connect once and reconnect only after a restart or if the dashboard shows the broker disconnected.
* Make the 8:00 AM routine the only place where the broker login happens, so other routines do not log you in and out repeatedly.

Ask Grok Bot: "Create a daily 8 AM IST routine that logs in to my broker in OpenAlgo and tells me if it worked."

### Step 11: Weekly upgrade routine (Sunday 6:00 AM IST)

OpenAlgo is updated often. A routine every **Sunday at 6:00 AM IST** keeps the installation current while markets are closed. It follows the procedure in the OpenAlgo repository's `CLAUDE.md` and `upgrade/README.md` (re-read on every run in case it changed):

1. **Check.** The repository must be on `main` with no modified tracked files; otherwise stop and report without changing anything.
2. **Stop the app** and wait until port 5000 is free.
3. **Back up** `.env` and every database in `db/` (`openalgo.db`, `logs.db`, `latency.db`, `health.db`, `sandbox.db`, `historify.duckdb`) to a dated folder.
4. **Pull** the latest code: `git pull --ff-only origin main`.
5. **Update dependencies:** `uv sync --locked`.
6. **Run migrations:** `cd upgrade && uv run migrate_all.py && cd ..`.
7. **Add new settings.** Copy only the keys that are new in `.sample.env` into `.env`. Never overwrite existing values, and never touch `APP_KEY`, `API_KEY_PEPPER`, `FERNET_SALT` or the broker credentials.
8. **Restart** with the Step 5 command and check `/auth/app-info` shows the new version.
9. **Reconnect the broker** and confirm the dashboard, `ping` and a quote work.
10. **Report** the old and new version and any new settings added (names only).

If any step after the backup fails, the routine restores the previous commit and the backed-up `.env` and databases together, restarts and reports the error. The full manual procedure for every installation type is on the [Upgrade](../../getting-started/upgrade.md) page.

### Step 12: Historify daily data scheduling

[Historify](../../new-features/historify.md) stores historical OHLCV data in a local database (`db/historify.duckdb`) for research and backtests.

1. Open `/historify` and add symbols to the watchlist. The bulk add box accepts one `SYMBOL,EXCHANGE` per line, for example:
   ```
   RELIANCE,NSE
   NIFTY,NSE_INDEX
   SENSEX,BSE_INDEX
   ```
2. Run a one-time backfill for the watchlist with the interval you need (daily `D` is usually enough for analysis) and a start date as far back as you want, for example 10 years.
3. Create a Historify schedule: **daily at 18:00 IST**, interval `D`, with a short lookback such as 7 days to cover holidays and missed runs.

The schedule is saved inside OpenAlgo and survives restarts, but it runs only while OpenAlgo is running and the broker is connected (the 8:00 AM login covers the 18:00 run). A run can start a few minutes late. You can also ask Grok Bot to check every evening that the data is up to date and tell you about any missing symbols.

To analyse the data while OpenAlgo is running, read a copy of the database rather than the live file:

```bash
cp db/historify.duckdb /tmp/historify.duckdb
```

### Restarting OpenAlgo

Restart **only the app**, never the whole Grok Bot computer. The computer is shared by your other assistants and routines, and its files, browser logins and schedules stay in place.

```bash
cd /workspace/repos/openalgo
pkill -f "script -qfec uv run app.py"; pkill -f "openalgo/.venv/bin/python app.py"
# wait until port 5000 is free
while ss -ltn | grep -q ':5000 '; do sleep 1; done
nohup setsid script -qfec "uv run app.py" app.log >/dev/null 2>&1 &
```

After a restart, log in to the broker again if the dashboard shows it disconnected.

### Setup checklist

* `.env` has permission `600` and `grep -c PLACEHOLDER .env` returns `0`.
* The broker code in `REDIRECT_URL` matches the redirect URL registered with the broker.
* `curl -s http://127.0.0.1:5000/auth/app-info` returns `"status":"success"`.
* Ports 5000 and 8765 are listening on `127.0.0.1`.
* `/dashboard` shows the broker connected and the master contract loaded.
* `POST /api/v1/ping` returns `pong`.
* Indian broker: the 8:00 AM IST login routine exists. Crypto broker: no daily routine and `DISABLE_SESSION_EXPIRY = 'true'`.
* The Sunday 6:00 AM IST upgrade routine exists.

### Troubleshooting

| Problem | Cause | Fix |
| --- | --- | --- |
| The app exits right after `nohup uv run app.py &` | The real-time server will not start without a terminal | Start with `nohup setsid script -qfec "uv run app.py" app.log >/dev/null 2>&1 &` |
| `curl` to port 5000 fails | The app is not running or is still starting | Read the end of `app.log`, then start or restart the app |
| "Address already in use" on port 5000 or 8765 | Another copy of OpenAlgo is already running | Use the running copy, or stop it before starting again |
| The broker login fails with a redirect or callback error | The broker code in `REDIRECT_URL` does not match the URL registered with the broker | Correct `.env` or the broker app, then restart OpenAlgo |
| "Invalid credentials" with the correct password | `API_KEY_PEPPER` or `FERNET_SALT` changed after the account was created | Restore them from the `.env` backup; see `upgrade/README.md` in the OpenAlgo repository |
| Forgot the OpenAlgo password | No SMTP or authenticator set up | See [Forgot Password](../../getting-started/forgot-password.md) |
| The TOTP code is typed but the broker page does not continue | The page did not submit automatically, or the code expired | Click the submit button; generate a new code if more than about 25 seconds have passed |
| API calls return 403 in the morning | The broker session expired at about 3:00 AM IST | Log in to the broker again, or check that the 8:00 AM routine ran |
| Symbols not found right after login | The master contract is still downloading | Wait until the dashboard shows it ready |
| Live orders are rejected | No registered static IP on the Grok Bot computer | Use Sandbox mode here and a static IP server for live orders ([Static IP](../../static-ip.md)) |
| The Historify schedule did not run | OpenAlgo was stopped or the broker was disconnected at 18:00 | Keep the app running and the broker connected; run a manual download for the missed days |
| The upgrade routine stopped without changes | The repository had local changes or was not on `main` | Review the changes yourself; the routine never discards your work |
