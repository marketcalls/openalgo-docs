# Environmental Variables

OpenAlgo reads configuration from `.env` in the application directory. Create it from the `.sample.env` shipped with the same OpenAlgo release:

```powershell
Copy-Item .sample.env .env
```

Do not copy an old environment block from documentation or another server. The checked-out `.sample.env` is the authoritative list; the current application template contains 97 active keys and declares `ENV_CONFIG_VERSION = '1.0.7'`.

## Required Setup

At minimum, review these groups before starting OpenAlgo:

### Broker Credentials

```dotenv
BROKER_API_KEY = 'YOUR_BROKER_API_KEY'
BROKER_API_SECRET = 'YOUR_BROKER_API_SECRET'
BROKER_API_KEY_MARKET = 'YOUR_XTS_MARKET_API_KEY_IF_REQUIRED'
BROKER_API_SECRET_MARKET = 'YOUR_XTS_MARKET_API_SECRET_IF_REQUIRED'
REDIRECT_URL = 'http://127.0.0.1:5000/<broker>/callback'
```

The market-data credentials are used only by the XTS-based brokers (`fivepaisaxts`, `compositedge`, `ibulls`, `iifl`, `jainamxts`, `rmoney`, `wisdom`), which need a separate market-data login. Replace `<broker>` in `REDIRECT_URL` with the active plugin's callback path and use the public HTTPS host for remote deployments.

### Security Secrets

`.sample.env` ships these three keys as explicit placeholders:

```dotenv
APP_KEY = 'OPENALGO_PLACEHOLDER_APP_KEY_REGENERATE_BEFORE_USE'
API_KEY_PEPPER = 'OPENALGO_PLACEHOLDER_API_KEY_PEPPER_REGENERATE_BEFORE_USE'
FERNET_SALT = 'OPENALGO_PLACEHOLDER_FERNET_SALT_REGENERATE_BEFORE_USE'
```

On first run OpenAlgo detects the placeholders, generates fresh values with `secrets.token_hex(32)`, writes them back to `.env`, and prints a one-time `[OpenAlgo first-run setup]` message. The install scripts do the same. You normally never edit these three lines by hand.

Never reuse values copied from examples, documentation, another installation, or a public repository. And never change `API_KEY_PEPPER` or `FERNET_SALT` on an installation that already has users or broker logins: they feed the password hashing and the Fernet key derivation, so rotating them makes stored passwords and encrypted broker tokens unrecoverable. If you genuinely need to rotate the pepper, use `uv run python upgrade/rotate_pepper.py`, which re-encrypts as it goes.

### Application and Realtime URLs

```dotenv
HOST_SERVER = 'http://127.0.0.1:5000'
FLASK_HOST_IP = '127.0.0.1'
FLASK_PORT = '5000'
WEBSOCKET_HOST = '127.0.0.1'
WEBSOCKET_PORT = '8765'
WEBSOCKET_URL = 'ws://127.0.0.1:8765'
ZMQ_HOST = '127.0.0.1'
ZMQ_PORT = '5555'
```

For a public deployment, terminate TLS at the supported reverse proxy, set `HOST_SERVER` to the public `https://` URL, and expose the raw WebSocket proxy through the documented `/ws` route. Keep ZeroMQ on loopback; it is not an authenticated public protocol.

### Database Paths

```dotenv
DATABASE_URL = 'sqlite:///db/openalgo.db'
LATENCY_DATABASE_URL = 'sqlite:///db/latency.db'
LOGS_DATABASE_URL = 'sqlite:///db/logs.db'
HEALTH_DATABASE_URL = 'sqlite:///db/health.db'
SANDBOX_DATABASE_URL = 'sqlite:///db/sandbox.db'
HISTORIFY_DATABASE_URL = 'db/historify.duckdb'
```

Historify is DuckDB rather than SQLite, so its value is a plain file path and not a SQLAlchemy URL. The key is spelled `HISTORIFY_DATABASE_URL` in `.sample.env`; keep it exactly as the template has it.

## Broker Allowlist

`VALID_BROKERS` is a comma-separated list of enabled plugin keys. The release template contains all 37 installed plugins:

```dotenv
VALID_BROKERS = 'fivepaisa,fivepaisaxts,aliceblue,angel,arrow,compositedge,dhan,dhan_sandbox,definedge,deltaexchange,firstock,flattrade,fyers,groww,hdfcsecurities,hdfcsky,ibulls,iifl,iiflcapital,indmoney,jainamxts,kotak,motilal,mstock,nubra,paytm,pocketful,rmoney,rupeezy,samco,shoonya,tradejini,tradesmart,upstox,wisdom,zebu,zerodha'
```

Broker presence does not guarantee every optional exchange, GTT, historical-data, or streaming capability. See [Brokers](../../connect-brokers/brokers/README.md).

## Updating an Existing Installation

1. Back up `.env` securely (`Copy-Item .env .env.backup`).
2. Compare its `ENV_CONFIG_VERSION` with the new `.sample.env`.
3. Add new keys and review changed defaults; do not overwrite working broker credentials or generated secrets.
4. Never run `Copy-Item .sample.env .env` over a working installation. It discards your broker credentials and replaces `API_KEY_PEPPER` and `FERNET_SALT`, which permanently invalidates every stored password hash and every encrypted broker token.
5. Restart OpenAlgo and read startup validation errors before enabling automation.

Do not commit `.env`, paste it into an issue, or include it in a screenshot. It contains broker credentials, application secrets, and deployment policy.
