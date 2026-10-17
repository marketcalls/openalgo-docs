# Environmental Variables

OpenAlgo reads its configuration from a `.env` file in the application directory. Create it from the `.sample.env` that shipped with the OpenAlgo release you checked out:

```bash
cd openalgo
cp .sample.env .env
```

The checked-out `.sample.env` is the authoritative list of variables. Do not paste an environment block from a blog post, an older guide, or another machine. The current template declares `ENV_CONFIG_VERSION = '1.0.7'` and contains 97 active keys.

{% hint style="danger" %}
Never copy an `APP_KEY`, `API_KEY_PEPPER` or `FERNET_SALT` value out of documentation, out of `.sample.env`, or out of another installation. `.sample.env` ships deliberate placeholders:

```dotenv
APP_KEY = 'OPENALGO_PLACEHOLDER_APP_KEY_REGENERATE_BEFORE_USE'
API_KEY_PEPPER = 'OPENALGO_PLACEHOLDER_API_KEY_PEPPER_REGENERATE_BEFORE_USE'
FERNET_SALT = 'OPENALGO_PLACEHOLDER_FERNET_SALT_REGENERATE_BEFORE_USE'
```

On first run OpenAlgo detects these placeholders, generates fresh values with `secrets.token_hex(32)`, writes them back to your `.env`, and prints a one-time `[OpenAlgo first-run setup]` message. The install scripts do the same thing. In normal use you never edit these three lines by hand.
{% endhint %}

### What you must edit

#### Broker credentials

```dotenv
BROKER_API_KEY = 'YOUR_BROKER_API_KEY'
BROKER_API_SECRET = 'YOUR_BROKER_API_SECRET'
REDIRECT_URL = 'http://127.0.0.1:5000/<broker>/callback'
```

Replace `<broker>` in `REDIRECT_URL` with your broker's key, for example `http://127.0.0.1:5000/zerodha/callback`, and register the same URL in your broker's developer console.

XTS-based brokers (`fivepaisaxts`, `compositedge`, `ibulls`, `iifl`, `jainamxts`, `rmoney`, `wisdom`) also need a separate market-data login:

```dotenv
BROKER_API_KEY_MARKET = 'YOUR_BROKER_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_BROKER_MARKET_API_SECRET'
```

Leave these at their placeholder values for every other broker.

### Defaults you normally leave alone

#### Application and realtime endpoints

```dotenv
HOST_SERVER = 'http://127.0.0.1:5000'
FLASK_HOST_IP='127.0.0.1'
FLASK_PORT='5000'
FLASK_DEBUG='False'
FLASK_ENV='development'

WEBSOCKET_HOST='127.0.0.1'
WEBSOCKET_PORT='8765'
WEBSOCKET_URL='ws://127.0.0.1:8765'

ZMQ_HOST='127.0.0.1'
ZMQ_PORT='5555'
```

The Flask app listens on port 5000 and the WebSocket proxy on port 8765. `WEBSOCKET_HOST` is pinned to `127.0.0.1` for macOS compatibility, and `ZMQ_HOST` must stay on loopback: ZeroMQ is the unauthenticated internal bus between the broker adapters and the WebSocket proxy, so binding it to `0.0.0.0` would publish the raw tick feed to anything that can reach the port.

`FLASK_DEBUG='True'` enables the Werkzeug interactive debugger, which executes arbitrary Python for anyone who can reach it. OpenAlgo refuses to start if `FLASK_DEBUG='True'` is combined with a non-loopback `FLASK_HOST_IP`.

#### Databases

```dotenv
DATABASE_URL = 'sqlite:///db/openalgo.db'
LATENCY_DATABASE_URL = 'sqlite:///db/latency.db'
LOGS_DATABASE_URL = 'sqlite:///db/logs.db'
HEALTH_DATABASE_URL = 'sqlite:///db/health.db'
SANDBOX_DATABASE_URL = 'sqlite:///db/sandbox.db'
HISTORIFY_DATABASE_URL = 'db/historify.duckdb'
```

Historical data lives in DuckDB, everything else in SQLite. The `db/` directory is created for you on first start.

#### Rate limits

```dotenv
LOGIN_RATE_LIMIT_MIN = "5 per minute"
LOGIN_RATE_LIMIT_HOUR = "25 per hour"
RESET_RATE_LIMIT = "15 per hour"
API_RATE_LIMIT="50 per second"
ORDER_RATE_LIMIT="10 per second"
SMART_ORDER_RATE_LIMIT="10 per second"
WEBHOOK_RATE_LIMIT="100 per minute"
STRATEGY_RATE_LIMIT="200 per minute"
```

#### Session behaviour

```dotenv
SESSION_EXPIRY_TIME = '03:00'
DISABLE_SESSION_EXPIRY = 'false'
```

Sessions expire daily at 03:00 IST because Indian broker tokens do. Set `DISABLE_SESSION_EXPIRY = 'true'` only for a 24/7 crypto broker such as Delta Exchange.

#### Ngrok

```dotenv
NGROK_ALLOW = 'FALSE'
```

Set to `'TRUE'` and point `HOST_SERVER` at your Ngrok domain if you tunnel the instance. See [Ngrok Config](ngrok-config.md).

### Broker allowlist

`VALID_BROKERS` is a comma-separated list of enabled broker plugin keys. The release template enables all 37:

```dotenv
VALID_BROKERS = 'fivepaisa,fivepaisaxts,aliceblue,angel,arrow,compositedge,dhan,dhan_sandbox,definedge,deltaexchange,firstock,flattrade,fyers,groww,hdfcsecurities,hdfcsky,ibulls,iifl,iiflcapital,indmoney,jainamxts,kotak,motilal,mstock,nubra,paytm,pocketful,rmoney,rupeezy,samco,shoonya,tradejini,tradesmart,upstox,wisdom,zebu,zerodha'
```

A broker being listed does not guarantee every optional exchange, GTT, historical-data or streaming capability. See [Brokers](../../connect-brokers/brokers/README.md).

### Updating an existing installation

1. Back up `.env` before every upgrade: `cp .env .env.backup`.
2. Compare `ENV_CONFIG_VERSION` in your `.env` against the new `.sample.env`.
3. Copy across only the new lines. Never run `cp .sample.env .env` over a working installation: it discards your broker credentials and replaces `API_KEY_PEPPER` and `FERNET_SALT`, which permanently invalidates every stored password hash and every encrypted broker token.
4. Restart OpenAlgo and read the startup configuration check before enabling automation.

Never commit `.env`, paste it into an issue, or include it in a screenshot. It holds broker credentials, application secrets and deployment policy.
