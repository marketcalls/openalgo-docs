# Upgrade

Follow the steps for **your installation method**. The procedure differs depending on how you installed OpenAlgo.

{% hint style="info" %}
**Changed OpenAlgo's source code?** Follow [Maintaining a Custom Repository](maintaining-a-custom-repository.md) before updating. Merge official updates into your custom branch, test them, and push that branch to your fork first. The native update scripts pull `origin` on the current branch; they do not merge the official repository into your fork, and stashed local changes are not restored automatically.
{% endhint %}

{% hint style="danger" %}
**Never run `cp .sample.env .env` on an existing installation.** It erases your broker keys and replaces your `API_KEY_PEPPER`, which permanently invalidates every stored password hash and encrypted broker token. Your `.env` is not tracked by git, so `git pull` always preserves it. When an update introduces new environment variables, copy **only those new lines** from `.sample.env` into your existing `.env` (see "Handling new environment variables" below).
{% endhint %}

***

### Option 1: Ubuntu Server (installed via install.sh)

Your installation lives at `/var/python/openalgo` and runs as the systemd service `openalgo`. Use the bundled update script, it performs the entire upgrade safely in one command:

```bash
cd /var/python/openalgo
sudo bash install/update.sh
```

The script automatically:

1. Stops the `openalgo` service
2. **Backs up all databases** (openalgo, logs, latency, sandbox, historify) to a timestamped `db/backup_<timestamp>/` folder
3. Pulls the latest code (`git pull`)
4. Compares your `.env` against `.sample.env` and **lists any new variables** you should add (it never overwrites your `.env`)
5. Updates Python dependencies
6. Runs all database migrations
7. Restarts the service

Legacy multi-deployment installs (`/var/python/openalgo-flask/<name>/openalgo/`) are detected automatically and the correct `openalgo-<name>` service is updated.

{% hint style="warning" %}
`update.sh` does **not** detect instances created by the current `install/install-multi.sh`, which lays them out as `/var/python/openalgo-flask/openalgo1`, `openalgo2` and so on with services named `openalgo1`, `openalgo2`. Update those by hand:

```bash
cd /var/python/openalgo-flask/openalgo1
sudo cp -r db db-backup-$(date +%Y%m%d)
sudo git pull
sudo uv pip install --python venv/bin/python -r requirements-nginx.txt
sudo bash -c "source venv/bin/activate && python upgrade/migrate_all.py"
sudo systemctl restart openalgo1
```
{% endhint %}

***

### Pre-built images on Docker Hub

CI publishes a multi-architecture image (amd64 and arm64) on every push to
`main`:

* [`marketcalls/openalgo`](https://hub.docker.com/r/marketcalls/openalgo) on Docker Hub
* `marketcalls/openalgo:latest`, the current `main`
* `marketcalls/openalgo:<commit-sha>`, every build, so you can pin or roll back to an exact version

**Which upgrade path applies to you depends on how you installed:**

| Install method | Image source | Upgrade |
| --- | --- | --- |
| `docker-run.sh` (Desktop) | Pulls `marketcalls/openalgo:latest` | `./docker-run.sh pull` then `./docker-run.sh restart` |
| `install-docker.sh` (custom domain) | **Builds locally** from the repo | `git pull` then rebuild, Option 2a |
| `install-docker-multi-custom-ssl.sh` | **Builds locally** per instance | Re-run the installer in update mode, Option 2b |
| Manual clone | **Builds locally** | Option 2 |

The server install scripts build locally rather than pulling, so a `docker pull`
alone will not update them. If you would rather pull than build, it is much
faster, since no build step runs, see "Using the pre-built image instead of
building" below.

***

### Option 2: Docker: manual clone (no custom domain)

Use this if you cloned OpenAlgo yourself and run it with `docker compose`.

```bash
# From the folder where you cloned openalgo
cd ~/openalgo

# Pull the latest code (includes the pre-built frontend)
git pull

# Rebuild and restart the container
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d

# Watch startup logs
sudo docker compose logs -f
```

Your `.env` file and the named volumes persist across the rebuild, no reconfiguration needed. Database migrations run automatically on container startup.

{% hint style="warning" %}
**If you installed with `install-docker.sh` or `install-docker-multi-custom-ssl.sh`, your installation is NOT in `~/openalgo`.** It is under `/opt/openalgo`. Use Option 2a or 2b below instead.
{% endhint %}

***

### Option 2a: Docker + Custom Domain (single instance)

For installations created with **`install-docker.sh`**, which sets up nginx, a Let's Encrypt certificate and your domain.

**Your installation lives at `/opt/openalgo`.**

```bash
cd /opt/openalgo

# 1. Back up the database volume first (see "Backing up" below)

# 2. Pull the latest code
sudo git pull

# 3. Rebuild and restart
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d

# 4. Watch it come up
sudo docker compose logs -f
```

**What is preserved automatically, and why:**

| Item | Location | Survives because |
| --- | --- | --- |
| Your `.env` | `/opt/openalgo/.env` | Not tracked by git, bind-mounted into the container |
| Database, logs, strategies, keys | Docker named volumes | Volumes are independent of the image |
| nginx site configuration | `/etc/nginx/sites-available/<domain>` | Outside the repository entirely |
| SSL certificate | `/etc/letsencrypt/live/<domain>/` | Outside the repository entirely |

Because nginx and the certificate live outside the repo, **a Docker upgrade cannot break your domain or SSL.** You do not need to re-run certbot, and you do not need to touch nginx.

You also do **not** need to change your broker's redirect URL, it stays `https://<your-domain>/<broker>/callback`.

***

### Option 2b: Docker + Custom Domain (multi-instance)

For installations created with **`install-docker-multi-custom-ssl.sh`**, where each domain is its own instance under `/opt/openalgo/<domain>`.

**The installer doubles as the upgrade script.** Re-run it and choose update mode:

```bash
cd /opt/openalgo
sudo bash install-docker-multi-custom-ssl.sh
```

When it finds an existing instance it asks:

```
Instance for yourdomain.com already exists. Update code only? (y=update, n=skip, r=reinstall):
```

Answer **`y`**. It pulls the latest code and **preserves your existing configuration**, broker keys, API secrets and domain settings are read back out of the instance's `.env` and reused. Answer `n` to skip an instance you do not want to touch.

To upgrade a single instance by hand instead:

```bash
cd /opt/openalgo/yourdomain.com
sudo git pull
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```

{% hint style="info" %}
Each instance has its own directory, its own `.env`, its own volumes and its own nginx site. Upgrading one does not affect the others, which is also why you must repeat the steps for each domain you want on the new version.
{% endhint %}

***

### Using the pre-built image instead of building

Optional. Building locally takes several minutes and needs build tooling on the
server; pulling the published image takes seconds. The trade-off is that you
give up local modifications to the source.

Edit `docker-compose.yaml` in your install directory:

```yaml
services:
  openalgo:
    image: marketcalls/openalgo:latest    # was: openalgo:latest
    # build:                              # comment out or delete this block
    #   context: .
    #   dockerfile: Dockerfile
```

Then upgrades become:

```bash
cd /opt/openalgo
sudo docker compose pull
sudo docker compose up -d
```

**Pinning to an exact version** is the main practical benefit, it makes
rollback immediate and unambiguous:

```yaml
    image: marketcalls/openalgo:a1b2c3d    # a specific commit SHA
```

```bash
sudo docker compose pull && sudo docker compose up -d
```

{% hint style="info" %}
Keep `git pull` in your routine even when using the pre-built image. The
repository still supplies `docker-compose.yaml`, the installer scripts and the
migration files, and you want those current alongside the image.
{% endhint %}

{% hint style="warning" %}
Only `main` is published as `latest`. If you are testing a branch, you must
build locally, there is no published image for it.
{% endhint %}

***

### Backing up before a Docker upgrade

Named volumes are not touched by `docker compose build`, but take a copy before any upgrade.

**The simplest method, copy straight out of the running container:**

```bash
cd /opt/openalgo
sudo docker compose cp openalgo:/app/db ./db-backup-$(date +%Y%m%d)
```

Here `openalgo` is the compose **service** name, not the container name.

**If you prefer to archive the volume itself, look up its real name first:**

```bash
sudo docker volume ls | grep db
```

Docker Compose prefixes volume names with the project name, which is taken from
the directory. An install in `/opt/openalgo` produces `openalgo_openalgo_db`,
while `/opt/openalgo/yourdomain.com` produces something different. Always read
the name rather than assuming it:

```bash
VOL=$(sudo docker volume ls --format '{{.Name}}' | grep 'openalgo_db$' | head -1)
echo "Backing up volume: $VOL"

sudo docker run --rm \
  -v "$VOL":/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz -C /data .
```

{% hint style="warning" %}
**Check that your backup is not empty.** If you pass a volume name that does not
exist, Docker silently creates a new empty volume and the archive succeeds with
nothing in it:

```bash
ls -lh db-backup-*.tar.gz     # a few KB means it is empty
tar tzf db-backup-*.tar.gz | head    # should list openalgo.db and friends
```
{% endhint %}

Also copy your `.env`, which is the only file that cannot be regenerated:

```bash
sudo cp /opt/openalgo/.env /opt/openalgo/.env.backup-$(date +%Y%m%d)
```

***

### Rolling back a Docker upgrade

```bash
cd /opt/openalgo

# Go back to the previous commit
sudo git log --oneline -5          # find the commit you were on
sudo git checkout <previous-commit>

sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```

Restore the database only if the upgrade actually migrated it and you need the earlier schema, migrations are forward-only, so a rollback of code without the matching database can fail to start.

***

### After a Docker + custom domain upgrade

Check these in order:

```bash
# Container healthy
sudo docker compose ps

# App answering locally
curl -I http://127.0.0.1:5000/auth/check-setup

# Domain and certificate still good
curl -I https://yourdomain.com

# Certificate expiry unchanged
sudo certbot certificates
```

Then in the browser: log in, confirm the dashboard loads, and confirm live data updates, a working page with frozen prices means the WebSocket upgrade through nginx is not working, which is the one thing worth checking specifically on a custom-domain setup.

***

### Option 3: Desktop / Local: Update Scripts (Recommended)

OpenAlgo runs cross-platform, Windows, macOS and Linux desktops all have a one-command update path using the bundled scripts.

#### Windows

```bat
cd openalgo
install\update.bat
```

#### macOS / Linux

```bash
cd openalgo
bash install/update.sh
```

Both scripts detect a local (non-server) installation automatically and perform the same safe sequence: **back up all databases** (openalgo, logs, latency, sandbox, historify) to a timestamped `db\backup_<timestamp>\` folder → `git pull` → report any new `.env` variables → update dependencies via uv → run all database migrations. Your `.env` is never touched.

After the script finishes, start OpenAlgo as usual:

```bash
uv run app.py
```

You should see the configuration check pass and all databases initialize:

```
Configuration version check passed
INFO in telegram_db: Telegram database initialized successfully
INFO in base: Scheduler started
INFO in traffic_db: Initializing Traffic Logs DB at: sqlite:///db/logs.db
INFO in latency_db: Initializing Latency DB at: sqlite:///db/latency.db
INFO in auth_db: Initializing Auth DB
INFO in symbol: Initializing Master Contract DB
```

***

### Option 4: Manual Upgrade (any platform)

If you prefer to run the steps yourself, only the backup step differs by platform, everything else is identical on Windows, macOS and Linux.

#### 1. Backup the databases

**Windows (PowerShell):**

```powershell
cd openalgo
New-Item -ItemType Directory -Force db\backup | Out-Null
Copy-Item db\*.db db\backup\
Copy-Item db\historify.duckdb db\backup\ -ErrorAction SilentlyContinue
```

**macOS / Linux:**

```bash
cd openalgo
mkdir -p db/backup
cp db/*.db db/backup/ 2>/dev/null
cp db/historify.duckdb db/backup/ 2>/dev/null
```

#### 2. Pull the latest application code

```bash
git pull
```

#### 3. Update dependencies

```bash
uv sync
```

(Legacy pip setups: `pip install -r requirements.txt` inside your virtual environment.)

#### 4. Run the migration script

Migrations are idempotent, safe to run on every upgrade. From the project root:

```bash
uv run upgrade/migrate_all.py
```

Or use the equivalent command from the upgrade directory:

```bash
cd upgrade
uv run migrate_all.py
```

The Strategy RMS migration is required on releases that include it. It creates the `sm_` strategy tables on an older installation and adds compatible nullable columns/indexes to an earlier Strategy RMS schema. Existing rows are retained; unknown historical values are not invented. If this required migration fails, the runner exits non-zero: do not start the updated application until the failure is resolved.

#### 5. Start OpenAlgo

```bash
uv run app.py
```

***

### Handling new environment variables

Newer releases often introduce new environment variables that OpenAlgo needs to function. **Do not recreate your `.env` from the sample**, merge instead:

1. Open `.sample.env` and check `ENV_CONFIG_VERSION` at the top. If it is newer than the version in your `.env`, new variables were added.
2. On startup, OpenAlgo's configuration check reports exactly which variables are missing.
3. Copy **only the missing lines** from `.sample.env` into your `.env` and set appropriate values, keeping all your existing settings (broker keys, `APP_KEY`, `API_KEY_PEPPER`, domain configuration) untouched.

The update scripts (`install/update.sh` on Linux/macOS, `install\update.bat` on Windows) print this comparison for you automatically.

{% hint style="warning" %}
**Never copy `APP_KEY` or `API_KEY_PEPPER` values from documentation or `.sample.env` into a real installation.** Generate your own:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

And never change `API_KEY_PEPPER` on an installation that already has users or broker logins, it is used to hash passwords and encrypt broker tokens, and rotating it makes that data unrecoverable. If you genuinely need to rotate it, use the dedicated migration: `uv run python upgrade/rotate_pepper.py`.
{% endhint %}

***

### Post-Upgrade Checklist

* Configuration version check passes on startup (no missing variable warnings)
* All databases initialize correctly
* Scheduler, WebSocket proxy (port 8765) and ZeroMQ services are running
* Broker login works and the master contract downloads
* API requests and strategies function normally

If anything fails after an upgrade, check `log/errors.jsonl` first, it contains structured error details including full tracebacks.

***

### Optional: testing the gthread worker

OpenAlgo currently runs on Gunicorn's **eventlet** worker, which Gunicorn has announced it will drop in its next major version. An experimental switch to Gunicorn's threaded **gthread** worker is part of OpenAlgo since 30 September 2026, for those who want to test it.

It is **opt-in and not the default**: a normal upgrade leaves you on eventlet with no change in behaviour.

If you would like to help test it, see [Migrating to gthread (Experimental)](gthread-migration.md).

####
