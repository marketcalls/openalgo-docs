# The gthread Web Server (Optional)

OpenAlgo runs inside a web server called Gunicorn, and Gunicorn can run it in two ways. **eventlet** is the default and stays the default. **gthread** is opt-in: you choose it per installation, and nothing changes on your server until you do.

This page explains what gthread is, who should try it, how to switch on Ubuntu and on Docker, how to check that it works, and how to switch back.

{% hint style="warning" %}
**gthread is opt-in.**

It is part of `main` since 30 September 2026 ([pull request #2117](https://github.com/marketcalls/openalgo/pull/2117)), and off unless you turn it on. A normal update leaves you on eventlet with no change in behaviour. Only follow this page if you are willing to test it and report what you find.
{% endhint %}

***

### What gthread is, and why it matters

* **eventlet** lets one request wait while others run, but some kinds of waiting can hold everything up. Several past problems, such as "the first order works, the next one hangs the app", came from eventlet and ordinary threads meeting inside OpenAlgo. Gunicorn has also announced that it will drop eventlet in its next major version.
* **gthread** gives every request its own thread from a fixed pool of 64, so one request waiting on a broker does not stop the others.

Both run the same OpenAlgo. Orders, strategies, Flow, the charting and scalping terminals, Telegram and WhatsApp alerts work the same way on either.

***

### Current status

* **In `main`, off by default.** An update brings the code; nothing changes until you switch.
* **CI is configured to check changes**: tests on several Python versions, startup under eventlet/gthread, container builds for AMD64/ARM64 and frontend tests. These checks do not certify every broker or promise unattended uptime.
* **Verified on a live instance with Upstox**: a full trading day on 29 September 2026 with no errors after login, the overnight login expiry and recovery after the next login, read-only broker calls passing under parallel load, and restarts completing in about 10 seconds.
* **Still wanted**: other brokers, more trading days, and Docker and multi-instance installations running a full day.

***

### Installing and choosing a platform

gthread is built into Gunicorn; keep the project's pinned dependencies, including eventlet for rollback. Use a checkout/image containing the launcher and switch script. A setting alone cannot add them to an older image.

| Installation | How to select it |
|---|---|
| Fresh Ubuntu/single-instance installer | Finish the normal eventlet install, then run the switch commands below; there is no worker question |
| Fresh numbered multi-instance install | Finish installation, then switch the intended service or use `--all` |
| Docker Compose | Set `OPENALGO_WORKER_CLASS='gthread'`, set `stop_grace_period: 45s`, rebuild/recreate |
| Multi-instance Docker with custom SSL | Choose the worker at its per-instance prompt |
| Docker runners | Set the variable in the mounted `.env` and restart using a current image; runners allow 45 seconds to stop |
| `uv run app.py` on any OS | Development server; ignores this setting |

Windows needs Docker or Linux under WSL2 for this Gunicorn path. macOS can use Docker. On Raspberry Pi, use 64-bit Linux and ARM64 packages; automated ARM64 checks do not establish a particular Pi's memory/thermal limits or a full trading day.

Keep the host awake and network-connected, use service/container restart supervision, and rehearse a trading day, broker rollover and rollback on the actual deployment before relying on it live.

### Who should try it now

Try it if you:

* are comfortable running a few commands over SSH and reading a log;
* can switch at a quiet time, after 23:30 IST (see below);
* use a broker already verified on gthread, or are happy to be the first to verify yours and report how it went.

Wait for now if you run strategies that must never pause, or if you run many OpenAlgo instances on a small server: each gthread instance uses 64 request threads.

***

### When to switch

**After 23:30 IST and before 09:00 IST, never during the trading day.** The trading day runs until 23:30 IST because of MCX's evening session. Switching restarts OpenAlgo: orders already at your broker are not touched, but strategies, the market data feed and open browser pages pause for up to a minute.

The switch script refuses to restart OpenAlgo between 09:00 and 23:30 IST. It goes by the clock, so it refuses on weekends and holidays too. Add `--force` only when you are sure nothing is trading.

***

### Step 1: Update OpenAlgo

{% hint style="danger" %}
Take a backup first. On Ubuntu, `install/update.sh` backs up your databases before it updates. On Docker, copy your `.env` and back up the `db` volume yourself.
{% endhint %}

**Ubuntu, one installation made by `install.sh`:**

```bash
cd /var/python/openalgo
sudo bash install/update.sh
```

The updater pulls the latest `main`, installs its dependencies, runs the database upgrades and restarts OpenAlgo, still on eventlet. Your `.env` is not tracked by git and is kept as it is.

**Several instances made by `install-multi.sh`:** run the same command inside each instance's folder, for example `/var/python/openalgo-flask/openalgo1`, one instance at a time.

**Docker (installed with `install-docker.sh`, in `/opt/openalgo`):**

```bash
cd /opt/openalgo
sudo git pull
```

The image is rebuilt in Step 2.

***

### Step 2: Switch

#### Ubuntu, one installation

```bash
cd /var/python/openalgo
sudo bash install/switch-worker.sh --to gthread --dry-run
sudo bash install/switch-worker.sh --to gthread
```

The first command shows what would change without changing anything. The second:

* writes `OPENALGO_WORKER_CLASS = 'gthread'` into `.env`;
* saves a copy of your service file next to it, as `/etc/systemd/system/openalgo.service.pre-launcher-<date>`;
* points the service at the launcher `install/openalgo-gunicorn.sh` and restarts OpenAlgo;
* checks that the service is running, the OpenAlgo page answers, the live update channel the browser uses answers, and OpenAlgo is running on the web server `.env` asks for.

If any check fails, it puts back the previous service file, restarts, checks again and shows the last lines of the log. If that restart also fails, it says so and prints the command to recover by hand; check it before you trade.

The script only switches a service that `install.sh` or `install-multi.sh` wrote. If you edited the service's `ExecStart` line by hand, it leaves the service alone and tells you why.

**Updating later.** Keep using `sudo bash install/update.sh`. If `.env` asks for gthread and the service does not use the launcher yet, the updater switches it at the end, with the same checks and the same automatic restore.

#### Several instances

Each instance has its own folder, service (`openalgo1`, `openalgo2`, ...) and `.env`, so each chooses its own web server.

```bash
# One instance
cd /var/python/openalgo-flask/openalgo1
sudo bash install/switch-worker.sh --service openalgo1 --to gthread

# Every instance, one at a time. It stops at the first one that fails, after putting that one back.
sudo bash install/switch-worker.sh --all --to gthread
```

At the end it tells you how many request threads the gthread instances use together, 64 each.

#### Docker

1. Add this line to the `.env` file next to your `docker-compose.yaml`:

   ```
   OPENALGO_WORKER_CLASS = 'gthread'
   ```

2. Give the OpenAlgo service 45 seconds to stop, in the same `docker-compose.yaml`:

   ```yaml
   services:
     openalgo:
       stop_grace_period: 45s
   ```

   This is required. gthread gives open requests up to 30 seconds to finish and tells running Python strategies to stop at the same moment. Docker forces a container to stop after 10 seconds unless told otherwise, which would cut that short. A normal stop is not slower: the container still stops as soon as OpenAlgo has finished.

3. After 23:30 IST, rebuild and restart:

   ```bash
   docker compose up -d --build --force-recreate
   ```

   `--build` matters. Without it Docker reuses the old image, which quietly keeps running on eventlet.

4. The container log shows `Starting application on port 5000 with gthread`.

On Railway or another platform that sets environment variables for you, set `OPENALGO_WORKER_CLASS=gthread` there, and set the platform's stop timeout to 45 seconds if it has one. The Docker runners `install/docker-run.sh` and `install/docker-run.bat` already allow 45 seconds.

***

### Step 3: Check that it works

1. **The system report.** Open **Admin**, then **Diagnostics**, and choose **Download .md**. Under *Runtime* it should say:
   * *Web server:* gthread
   * *Request threads:* 64
   * *Started by launcher:* True

   Any *Note* lines there are written for you, for example that `.env` asks for a web server this server has not switched to yet, or that almost every request slot is busy.

2. **The log.** `sudo journalctl -u openalgo -n 50` shows `Starting the gthread web server with 64 request threads`. On several instances use the instance's service name, for example `-u openalgo1`. On Docker use `docker compose logs --tail 50`.

3. **Your broker.** The broker check only reads (funds, positions, order book, trade book, holdings, quotes, multiquotes, depth, history and intervals) and prints a table of what passed and how long each call took. Log in to OpenAlgo and your broker first: after about 03:00 IST the broker login has expired and every call fails.

   On Docker, run it on the server against the local address:

   ```bash
   cd /opt/openalgo
   python3 scripts/gthread_broker_smoke.py --url http://127.0.0.1:5000 --repeat 3 --parallel 4
   ```

   On Ubuntu OpenAlgo has no local address of its own, so run it on the server against your domain:

   ```bash
   cd /var/python/openalgo
   python3 scripts/gthread_broker_smoke.py --url https://your-openalgo-domain --repeat 3 --parallel 4
   ```

   It asks for your API key when you leave out `--apikey`, which keeps the key out of your shell history.

   {% hint style="info" %}
   **If every row says "answered 403"**, the check was stopped before it reached OpenAlgo, usually by Cloudflare, which turns away scripts that are not browsers. OpenAlgo has not failed. On the server, point your domain at the server itself for the run by adding a line `127.0.0.1 your-openalgo-domain` to `/etc/hosts`, run the check, then remove the line.
   {% endhint %}

   Add `--order-check` only while OpenAlgo is in analyzer (sandbox) mode. It then places one small LIMIT buy far below the market in the sandbox and cancels it straight away. In live mode it refuses.

4. **The next trading day.** Keep an eye on the Diagnostics page and on the error log, `log/errors.jsonl` in your OpenAlgo folder. On Docker it lives inside the container's log volume:

   ```bash
   docker compose exec openalgo tail -n 50 /app/log/errors.jsonl
   ```

***

### Switching back to eventlet

* **Ubuntu, after 23:30 IST:**

  ```bash
  sudo bash install/switch-worker.sh --to eventlet
  ```

  On several instances add `--service openalgo1`, or `--all`. You can also set `OPENALGO_WORKER_CLASS = 'eventlet'` in `.env` and restart the service.

* **Put the original service file back entirely:** `sudo bash install/switch-worker.sh --restore`. It also sets `.env` back to eventlet, so the next update does not switch the service over again.

* **Going back to an older OpenAlgo release** (one from before 30 September 2026): run `sudo bash install/switch-worker.sh --restore` **first**, while the script is still there. A switched service starts OpenAlgo through `install/openalgo-gunicorn.sh`, which older releases do not have. A service switched with the current script still starts if you forget, on eventlet exactly as before the switch, and says so in `journalctl -u openalgo`. A service switched with an earlier copy of the script cannot start after the rollback; to give it the same safety net, run `--restore` and then switch again, after 23:30 IST.

  If the service already will not start after a rollback: in `/etc/systemd/system`, copy back the file named in the comment just above the service's `ExecStart` line (it ends in `.pre-launcher-<date>`), set `OPENALGO_WORKER_CLASS = 'eventlet'` in `.env`, then run `sudo systemctl daemon-reload` and restart the service.

* **Docker:** set `OPENALGO_WORKER_CLASS = 'eventlet'` in `.env` (or delete the line) and recreate the container.

***

### Known limits

* **A fixed budget of 64 request threads per instance.** It is not a setting. Most requests take a thread for a moment, but some hold one for as long as they are open: each browser tab keeps one live update connection, shared by every page in it, and each open Python Strategies page, agent chat and remote MCP connection holds one while it is open. Five devices with two tabs each use about 10. If the system report says almost every request slot is busy, close tabs you are not using; if it keeps happening during trading, switch back to eventlet.
* **Stopping takes a little longer.** gthread lets open requests finish before it stops, for up to 30 seconds.
* **The market data service** is shown in the system report as *Market data proxy*. On Ubuntu it runs as a separate process started by the web server, on gthread as on eventlet, and gthread starts it again if it stops. On Docker the container starts it and, on gthread, starts it again if it stops, after 1 second and then longer, up to 30 seconds, if it keeps stopping.
* **The development server is not affected.** `uv run app.py`, including on Windows, ignores this setting.

***

### What gthread refuses that eventlet waits for

Under eventlet some kinds of waiting simply take as long as they take. gthread has a fixed number of request threads and waiting occupies one, so a few waits are cut short instead, with a message saying what happened and what to do. None of these is a setting, and none happens on eventlet.

* **A busy broker.** When a broker's rate limit would keep a request waiting more than about 10 seconds, the request is refused and nothing is sent to the broker. A smart order refused this way places nothing. An order that did reach the broker and then timed out is different: check your broker's order book before repeating it.
* **Two orders for the same symbol at once.** A smart order or a sandbox order that waits more than 30 seconds for another one on the same symbol to finish is refused with a message asking you to try again. Check your positions first.
* **Switching between live and sandbox mode.** A switch that waits more than 30 seconds for another switch still in progress is refused, and so is a sandbox reset behind one.
* **Reloading or clearing the symbol cache** while the master contract is still downloading is refused until the download finishes.
* **Flow workflows that wait.** A workflow whose Delay and Wait Until steps add up to more than 10 seconds runs in the background and answers at once. Up to 16 workflows waiting on a Delay, and separately up to 4 waiting on a Wait Until, can run at the same time; the next one is refused without placing any order, and the refusal appears in that workflow's execution history.
* **Python Strategies page live status.** At most eight windows get live status at once. The next one shows "Too many windows are showing live strategy status" and still works, without live updates. An open page reconnects by itself every ten minutes.
* **Remote MCP and the agent.** At most four remote MCP streams stay open, each for up to five minutes, and at most eight MCP tool calls run at once. At most six agent chats stream at once, and one reply ends after 15 minutes.
* **OI Profile** spends at most 60 seconds loading the previous day's open interest for the daily change. If it runs out of time, the page says how many contracts it covered.
* **Email.** A mail server that does not answer within 20 seconds is reported as unreachable.
* **Sandbox square-off.** A square-off check that waits more than 120 seconds for one already running is skipped, and the next minute's check runs it.

{% hint style="info" %}
**For API and webhook callers.** These refusals reach programs as HTTP status codes: 429 for a busy broker, the Flow caps and the other limits above, 409 for a mode switch or symbol cache reload that has to wait, 503 for the Python Strategies live status cap, and 202 when a waiting Flow workflow has been accepted to run in the background. A caller that retries on 429 should wait before it does.
{% endhint %}

***

### Brokers verified on gthread

A broker moves to *Verified* once somebody has run a full trading day on gthread with it and the broker check passed.

| Broker | Status |
| --- | --- |
| Upstox | Verified on 29 September 2026: a full trading day on a live instance, the overnight login expiry and recovery, and read-only broker calls passing under parallel load |

All other brokers are not yet verified: aliceblue, angel, arrow, compositedge, definedge, deltaexchange, dhan, dhan_sandbox, firstock, fivepaisa, fivepaisaxts, flattrade, fyers, groww, hdfcsecurities, hdfcsky, ibulls, iifl, iiflcapital, indmoney, jainamxts, kotak, motilal, mstock, nubra, paytm, pocketful, rmoney, samco, shoonya, tradejini, tradesmart, wisdom, zebu and zerodha.

***

### How to report a result

Open an issue at [github.com/marketcalls/openalgo/issues](https://github.com/marketcalls/openalgo/issues) titled `gthread verified: <broker>` or `gthread problem: <broker>`, and include:

* the table printed by the broker check (`--repeat 3 --parallel 4`);
* the *Runtime* section of the system report;
* whether you ran a full trading day, and with what (strategies, Flow, TradingView alerts, the scalping terminal);
* anything unusual from `log/errors.jsonl`, with anything private removed.

**Never post your API key, broker credentials or `.env`.**

***

### FAQ

**Will this speed up OpenAlgo?**
That is not the goal. Expect similar speed. The point is a web server Gunicorn will keep supporting, and fewer ways for one slow request to hold up the rest.

**Do I need to change my strategies?**
No. Python strategies run as separate processes, not inside the web server.

**Does this affect the market data service or ZeroMQ?**
No. The market data service runs as its own process on port 8765, and the ZeroMQ bus is unchanged.

**Do I need Node.js or a frontend rebuild?**
No. `main` carries the built frontend, so a plain update brings it.

**Can I run one instance on gthread and another on eventlet?**
Yes. The setting is per instance, and comparing the two on one server is a useful test.

**Is my data at risk?**
The switch does not change any database. The update runs the normal database upgrades, and Historify gains internal ID counters that it checks on every start, so going back to an older release and returning is safe for its watchlist and downloads. Take a backup before any upgrade.
