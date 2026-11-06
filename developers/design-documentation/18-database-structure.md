# 18 - Database Structure

## Store Inventory

OpenAlgo uses local persistence split by workload. Defaults come from `.sample.env`.

| Store | Configuration | Default | Responsibility |
|---|---|---|---|
| Main | `DATABASE_URL` | `sqlite:///db/openalgo.db` | Users, auth, API keys, settings, strategies, Flow, calendar, messaging config, chart prefs, Action Center, scalping |
| Traffic | `LOGS_DATABASE_URL` | `sqlite:///db/logs.db` | HTTP traffic, 404 activity, IP bans/security data |
| Latency | `LATENCY_DATABASE_URL` | `sqlite:///db/latency.db` | API/broker timing telemetry |
| Health | `HEALTH_DATABASE_URL` | `sqlite:///db/health.db` | FD, memory, DB, WebSocket, thread metrics |
| Sandbox | `SANDBOX_DATABASE_URL` | `sqlite:///db/sandbox.db` | Simulated orders, trades, positions, holdings, funds, config, GTT tables |
| Historify | `HISTORIFY_DATABASE_PATH` | `db/historify.duckdb` | Candles, catalog, watchlist, jobs, metadata, schedules |

The Historify key is a plain filesystem path, not a SQLAlchemy URL. `database/historify_db.py` and `upgrade/migrate_historify.py` both read `HISTORIFY_DATABASE_PATH` and fall back to `db/historify.duckdb`. Note that `.sample.env` still ships the older `HISTORIFY_DATABASE_URL` spelling, which `blueprints/system_permissions.py` still reads; it is not a runtime alias, so a deployment that needs a non-default location must set `HISTORIFY_DATABASE_PATH` explicitly.

## Engine Policy

`database/engine_factory.py` exposes a single function, `create_db_engine(database_url=None)`. When the URL contains `sqlite` it builds `create_engine(url, poolclass=NullPool, connect_args={"check_same_thread": False})`; otherwise it builds a pooled engine with `pool_size=50, max_overflow=100, pool_timeout=10`.

`NullPool` is the rule for every SQLite engine. Each scoped session gets a short-lived connection instead of retaining file descriptors across long-running worker lifetimes. `StaticPool` is explicitly forbidden because it produces "bad parameter or other API misuse" and commit failures under concurrency. `check_same_thread=False` allows scoped use across the app's thread model, but callers still must not share a SQLAlchemy session concurrently.

New SQLite engines must use `database.engine_factory.create_db_engine()` and its `NullPool` policy. Some existing modules retain equivalent inline engine branches; do not copy an old module as a reason to add another engine policy. Non-SQLite pool settings are workload-specific and should be read from the owning module.

SQLite pragmas are registered once, process wide, by a `@event.listens_for(Engine, "connect")` listener in `database/__init__.py`, so they apply to every engine no matter which module created it:

- `PRAGMA journal_mode=WAL`
- `PRAGMA synchronous=NORMAL`
- `PRAGMA busy_timeout=15000`

Each pragma is wrapped in its own `try`/`except sqlite3.OperationalError` so one failure never breaks the connection. `upgrade/_pragmas.py` registers the identical listener for migration scripts, which run as separate subprocesses and never import the `database` package.

`database/db_init_helper.py` provides `init_db_with_logging(base, engine, db_name, logger)`, used by most `database/` modules. It creates the SQLite parent directory first, diffs declared tables against `inspector.get_table_names()`, runs `create_all`, and on an `OperationalError` containing "already exists" drops orphaned indexes and retries once. That self-heal is what makes an interrupted first initialization recoverable.

`app.py` registers `@app.teardown_appcontext shutdown_database_sessions`, which calls `remove_all_scoped_sessions()` from `utils/db_sessions.py`. Adding a new scoped session requires adding it to that inventory or using a context-managed pattern that closes it reliably.

## Main Database Domains

`database/broker_keys_db.py` adds `broker_keys` for encrypted per-broker application keys and `broker_login_states` for one-use pending-login digests. Both share the main database; broker-key encrypted columns are included in salt/pepper rotation. See [broker configuration](51-broker-and-system-config.md).

| Module | Main tables/concern |
|---|---|
| `auth_db.py`, `user_db.py` | `auth`, `api_keys`, `active_sessions`, `login_attempts`, `users` |
| `symbol.py`, `token_db.py`, `token_db_enhanced.py` | `symtoken` master contract plus the in-process broker symbol cache |
| `apilog_db.py`, `analyzer_db.py` | `order_logs` and `analyzer_logs` written by `subscribers/log_subscriber.py` |
| `settings_db.py`, `leverage_db.py` | `settings` (analyzer mode, SMTP, security thresholds), `leverage_config` |
| `strategy_module_db.py`, `chartink_db.py`, `flow_db.py` | Strategy RMS, Chartink, and Flow definitions and executions |
| `strategy_book_db.py` | `strategy_order_tags`, `strategy_pending_fills`, `strategy_positions` |
| `action_center_db.py` | `pending_orders` for semi-auto requests and approval outcome |
| `market_calendar_db.py`, `qty_freeze_db.py` | `market_holidays`, `market_holiday_exchanges`, `market_timings`, `qty_freeze` |
| `telegram_db.py`, `whatsapp_db.py` | Bot configuration, linked users, notification state |
| `oauth_db.py` | `oauth_clients`, `oauth_refresh_tokens`, `oauth_signing_keys` for Remote MCP |
| `chart_prefs_db.py`, `strategy_portfolio_db.py` | Workspace and portfolio state |
| `scalping_db.py` | `scalping_sl_state`, `scalping_tracked_symbol` |
| `master_contract_status_db.py` | `master_contract_status`, keyed by broker |
| `apscheduler_jobstore_db.py` | `flow_apscheduler_jobs`, `historify_apscheduler_jobs` |

`telegram_db.py`, `whatsapp_db.py` and `master_contract_status_db.py` create their tables at import time rather than through the startup init thread, so importing them is enough to touch the main database file.

Other stores hold a small fixed set of tables: traffic `logs.db` holds `traffic_logs`, `ip_bans`, `error_404_tracker` and `invalid_api_key_tracker`; `latency.db` holds `order_latency`; `health.db` holds `health_metrics` and `health_alerts`.

## Caches In Front Of The Database

Shared TTL reads and writes are synchronized under gthread and development threads. Generation-fenced fills prevent a read begun before invalidation from restoring stale cached state after a commit.

`database/auth_db.py` fronts the auth tables with `utils.thread_safe_cache.LockedTTLCache` instances:

| Cache | maxsize | TTL |
|---|---|---|
| `auth_cache` | 1024 | derived from `SESSION_EXPIRY_TIME`, clamped to 300 to 86400 seconds |
| `feed_token_cache` | 1024 | same derived TTL |
| `broker_cache` | 1024 | 3000 seconds |
| `verified_api_key_cache` | 1024 | 36000 seconds |
| `invalid_api_key_cache` | 512 | 300 seconds |
| `order_mode_cache` | 128 | 60 seconds |

Symbol lookups do not use a TTL cache. `database/token_db_enhanced.py` builds a `BrokerSymbolCache`, a multi-index in-memory structure loaded once by `load_all_symbols(broker)` and reset daily at `SESSION_EXPIRY_TIME`. `database/token_db.py` is a re-export shim over it. `database/cache_restoration.py` repopulates both the auth caches and the symbol cache at startup; `database/cache_invalidation.py` publishes `CACHE_INVALIDATE_*` messages on the shared ZeroMQ publisher so the out-of-process WebSocket proxy clears its own copies.

## Sandbox Database

`database/sandbox_db.py` declares nine models: `SandboxOrders`, `SandboxTrades`, `SandboxPositions`, `SandboxHoldings`, `SandboxFunds`, `SandboxDailyPnL`, `SandboxConfig`, `SandboxGTT` and `SandboxGTTLeg`.

Sandbox initialization is self-healing: startup must ensure every required table exists even if a prior initialization was partial. The `sandbox_gtt` and `sandbox_gtt_legs` tables back a working analyzer GTT implementation in `sandbox/gtt_manager.py`, reached through `services/sandbox_service.py`.

The sandbox managers own execution, order state, position netting, holdings/T+1 behavior, funds/margin, square-off, and settlement. No live broker order call belongs in this database layer.

## Historify DuckDB

Historify is columnar rather than SQLAlchemy/SQLite. `database/historify_db.py` imports `duckdb` directly, connects through a retrying `get_connection()` context manager (DuckDB takes an exclusive file lock, so there is a single writer process), and creates its schema with plain `CREATE TABLE IF NOT EXISTS` statements. There is no declarative model layer. It stores eight tables:

- `market_data` and its indexes for OHLCV/OI queries.
- `watchlist` and `data_catalog`.
- `download_jobs` and `job_items`.
- `symbol_metadata`.
- `historify_schedules` and `historify_schedule_executions`.

The history REST service reads it only when `source="db"`; default history remains broker API data.

## Time And Secrets

- Persist timezone-aware values where the model supports them; user-facing market/session behavior is generally IST.
- Never log or copy decrypted API keys, broker tokens, TOTP secrets, bot tokens, or OAuth credentials.
- Encryption helpers are module-specific because not every store derives Fernet keys identically.

`database/auth_db.py` is the reference implementation. Broker auth tokens, feed tokens and TOTP secrets are Fernet-encrypted with a key derived by `PBKDF2HMAC(SHA256, length=32, salt=FERNET_SALT, iterations=100000)` over `API_KEY_PEPPER`. API keys are hashed with Argon2 (`argon2.PasswordHasher`) after appending the pepper, and stored a second time Fernet-encrypted so the plaintext can be shown once in the UI. SHA-256 appears only as a cache key, never as credential storage. The module raises at import time if `API_KEY_PEPPER` is missing or shorter than 32 characters.

## Schema Changes

Every schema change requires an idempotent upgrade script registered in `upgrade/migrate_all.py`, in addition to safe startup initialization. A startup-only repair does not upgrade every existing install. Scripts support `--status`, preserve customized values and backfill from existing data. Test against a populated copy with the old schema as well as a fresh file.

`upgrade/migrate_all.py` runs the individual migration scripts in a fixed order, each as its own `subprocess.run` with the project root as the working directory. Legacy migrations retain best-effort "completed with warnings" behavior, but a required migration returns a failure to the runner and makes its final exit non-zero. `migrate_strategy_module.py` is required: it creates the six `sm_` tables and applies compatible missing Strategy RMS columns/indexes on an existing database. `upgrade/rotate_pepper.py` and `upgrade/reset_admin_password.py` are deliberately excluded from that list because they are destructive and must be run by an operator.

`upgrade/init_db.py` is a diagnostic and repair entry point rather than part of automatic startup. It reports the resolved absolute path of every configured store, flags a relative `DATABASE_URL` resolved against the wrong working directory, initializes the same table set serially, and decrypts each stored TOTP secret to confirm that `API_KEY_PEPPER` and `FERNET_SALT` still match the values the account was created with.

## Backups

Back up all six configured stores before an upgrade. Copying only `openalgo.db` omits traffic/security history, latency/health telemetry, sandbox state, and local historical candles.
