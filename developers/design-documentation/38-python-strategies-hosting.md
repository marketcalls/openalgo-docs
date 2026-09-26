# 38 - Python Strategies Hosting

## Overview

OpenAlgo provides a cross-platform Python strategy hosting system that allows users to upload, run, schedule, and manage trading strategies. Each strategy runs in a separate process for complete isolation with support for Windows, Linux, and macOS.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-pystrategy-hosting-architecture.png" alt="Python strategy hosting: React /python pages call python_strategy_bp, which with APScheduler launches one subprocess per strategy that logs to log/strategies and calls the OpenAlgo REST API"><figcaption></figcaption></figure>

## Directory Structure

```
openalgo/
├── strategies/
│   ├── scripts/           # User uploaded strategy files
│   │   ├── my_strategy.py
│   │   └── scalper.py
│   └── strategy_configs.json  # Configuration persistence
├── log/
│   └── strategies/        # Log output from strategies
│       ├── my_strategy.log
│       └── scalper.log
└── blueprints/
    └── python_strategy.py  # Strategy hosting blueprint
```

## Key Features

### Process Isolation

Each strategy runs in a separate subprocess, launched by `start_strategy_process()`:

```python
RUNNING_STRATEGIES = {}  # {strategy_id: {'process': subprocess.Popen, 'started_at': datetime}}
PROCESS_LOCK = threading.RLock()  # Reentrant lock for nested process operations

def start_strategy_process(strategy_id):
    """Start a strategy in a new process - cross-platform implementation"""
    with PROCESS_LOCK:
        config = STRATEGY_CONFIGS.get(strategy_id)
        file_path = Path(config["file_path"])

        # One timestamped log file per run
        ist_now = get_ist_time()
        log_file = LOGS_DIR / f"{strategy_id}_{ist_now.strftime('%Y%m%d_%H%M%S')}_IST.log"
        log_handle = open(log_file, "w", encoding="utf-8", buffering=1)

        subprocess_args = create_subprocess_args()   # platform specific flags
        subprocess_args["stdout"] = log_handle
        subprocess_args["stderr"] = subprocess.STDOUT
        subprocess_args["cwd"] = str(Path.cwd())

        # Environment injected into every strategy process
        strategy_env = os.environ.copy()
        strategy_env["STRATEGY_ID"] = strategy_id
        strategy_env["STRATEGY_NAME"] = config.get("name", strategy_id)
        strategy_env["OPENALGO_STRATEGY_EXCHANGE"] = normalize_exchange(config.get("exchange"))
        strategy_env.setdefault("OPENALGO_HOST", "http://127.0.0.1:5000")
        # OPENALGO_API_KEY is added from the owner's stored key when available
        subprocess_args["env"] = strategy_env

        # Unbuffered so output reaches the log file immediately
        cmd = [get_python_executable(), "-u", str(file_path.absolute())]
        process = subprocess.Popen(cmd, **subprocess_args)

        RUNNING_STRATEGIES[strategy_id] = {
            "process": process,
            "pid": process.pid,
            "started_at": ist_now,
            "log_file": str(log_file),
        }
```

The parent side closes its copy of the log handle right after the fork so a long running strategy does not pin an extra file descriptor. Starting a strategy is refused if the master contracts are not ready.

### Strategy Environment Variables

| Variable | Value |
|----------|-------|
| `STRATEGY_ID` | The generated strategy ID |
| `STRATEGY_NAME` | The user supplied strategy name |
| `OPENALGO_STRATEGY_EXCHANGE` | Normalized exchange from the strategy config |
| `OPENALGO_HOST` | Inherited if already set, otherwise `http://127.0.0.1:5000` |
| `OPENALGO_API_KEY` | The owner's decrypted API key, when one exists |

### Cross-Platform Support

`create_subprocess_args()` returns the platform-specific `subprocess.Popen` keyword arguments:

| Platform | Support | Notes |
|----------|---------|-------|
| Windows | Full | `creationflags=CREATE_NEW_PROCESS_GROUP` plus a `STARTUPINFO` that suppresses the console window. No resource limits. |
| Linux | Full | `start_new_session=True` plus `preexec_fn=set_resource_limits` |
| macOS | Full | `start_new_session=True` plus `preexec_fn=set_resource_limits` |

```python
OS_TYPE = platform.system().lower()  # 'windows', 'linux', 'darwin'
IS_WINDOWS = OS_TYPE == 'windows'
IS_MAC = OS_TYPE == 'darwin'
IS_LINUX = OS_TYPE == 'linux'
```

## Strategy Lifecycle

<figure><img src="../../.gitbook/assets/diagram-pystrategy-lifecycle.png" alt="Python strategy lifecycle: scheduled, running, paused on closed exchange days, manually stopped, error after failed restart, and deleted"><figcaption></figcaption></figure>

## Scheduling with APScheduler

### Scheduler Configuration

```python
IST = pytz.timezone('Asia/Kolkata')

def init_scheduler():
    """Initialize the APScheduler with IST timezone"""
    global SCHEDULER
    if SCHEDULER is None:
        SCHEDULER = BackgroundScheduler(daemon=True, timezone=IST)
        SCHEDULER.start()

        # Daily trading day check - runs at 00:01 IST
        SCHEDULER.add_job(
            func=daily_trading_day_check,
            trigger=CronTrigger(hour=0, minute=1, timezone=IST),
            id='daily_trading_day_check',
            replace_existing=True
        )

        # Market hours enforcer - runs every minute
        SCHEDULER.add_job(
            func=market_hours_enforcer,
            trigger='interval',
            minutes=1,
            id='market_hours_enforcer',
            replace_existing=True
        )

        # Dead-process reaper - runs every 60 seconds
        SCHEDULER.add_job(
            func=cleanup_dead_processes,
            trigger='interval',
            seconds=60,
            id='reap_dead_strategies',
            replace_existing=True
        )
```

### Schedule Options

Scheduling is mandatory. Every strategy is created with `is_scheduled = True` and `/python/unschedule/<strategy_id>` deliberately returns HTTP 400. Only the times and days can be changed.

`schedule_strategy(strategy_id, start_time, stop_time, days)` registers two APScheduler `CronTrigger` jobs in IST, `start_<strategy_id>` and `stop_<strategy_id>`, both restricted to `day_of_week`.

| Field | Description | Default |
|-------|-------------|---------|
| `schedule_start` | Daily start time (HH:MM IST) | `09:00`, or `00:00` for a crypto exchange |
| `schedule_stop` | Daily stop time (HH:MM IST) | `16:00`, or `23:59` for a crypto exchange |
| `schedule_days` | Days the cron jobs fire | `mon,tue,wed,thu,fri`, or all seven days for a crypto exchange |
| `exchange` | Drives holiday and session awareness | `NSE` (also backfilled onto legacy configs) |

Valid day tokens are `mon`, `tue`, `wed`, `thu`, `fri`, `sat` and `sun`. Weekend days are allowed so special sessions such as Muhurat trading can be scheduled. The schedule cannot be edited while the strategy is running.

### Market-Aware Scheduling

Both jobs are exchange aware: they read each strategy's own `exchange` and call `get_market_status(exchange)`, so an MCX strategy keeps running on an NSE holiday and a CRYPTO strategy never stops. Both return immediately when `is_trading_day_enforcement_enabled()` is false.

```python
def daily_trading_day_check():
    """00:01 IST. Stop each scheduled strategy whose exchange has no session today."""
    if not is_trading_day_enforcement_enabled():
        return

    for strategy_id, config in list(STRATEGY_CONFIGS.items()):
        if not config.get("is_scheduled"):
            continue

        exch = normalize_exchange(config.get("exchange"))
        status = get_market_status(exch)
        if status.get("is_trading"):
            continue
        if not _is_strategy_running(strategy_id, config):
            continue

        stop_strategy_process(strategy_id)
        config["paused_reason"] = status.get("reason") or "holiday"
        config["paused_message"] = status.get("message", f"{exch} closed today")
```

`market_hours_enforcer()` runs every minute and does the mirror job: it stops scheduled strategies whose exchange has no session today, and it resumes a strategy that was paused for `weekend`, `holiday`, `before_market` or `after_market` once the exchange is trading again, provided the strategy was not stopped manually, today is in `schedule_days` and the current time falls inside the schedule window. It deliberately does not stop on time-of-day boundaries. That is the `stop_<strategy_id>` cron job's responsibility.

## User Ownership & Security

### Strategy Ownership Verification

```python
def verify_strategy_ownership(strategy_id, user_id, return_config=False):
    """Verify that a user owns a strategy"""

    # Reject path traversal attempts
    if not strategy_id or '..' in strategy_id or '/' in strategy_id or '\\' in strategy_id:
        return False, (jsonify({'status': 'error', 'message': 'Invalid strategy ID'}), 400)

    if strategy_id not in STRATEGY_CONFIGS:
        return False, (jsonify({'status': 'error', 'message': 'Strategy not found'}), 404)

    config = STRATEGY_CONFIGS[strategy_id]
    # Allow access if user_id matches or if strategy has no owner (legacy)
    strategy_owner = config.get('user_id')
    if strategy_owner and strategy_owner != user_id:
        return False, (
            jsonify({'status': 'error', 'message': 'Unauthorized access to strategy'}),
            403,
        )

    if return_config:
        return True, config
    return True, None
```

### Security Features

| Feature | Implementation |
|---------|----------------|
| User isolation | Each user sees only their strategies |
| Path traversal protection | Reject `..`, `/`, `\` in strategy IDs |
| Secure filename | `werkzeug.utils.secure_filename()` |
| Process isolation | Separate subprocess per strategy |

## Server-Sent Events (SSE)

Real-time status updates via SSE:

```python
SSE_SUBSCRIBERS = []  # List of Queue objects for SSE clients

def broadcast_status_update(strategy_id: str, status: str, message: str = None):
    """Broadcast strategy status update to all SSE subscribers"""
    event_data = {
        'strategy_id': strategy_id,
        'status': status,
        'message': message,
        'timestamp': datetime.now(IST).isoformat()
    }

    event = f"data: {json.dumps(event_data)}\n\n"

    with SSE_LOCK:
        # Remove dead subscribers and send to active ones
        active_subscribers = []
        for q in SSE_SUBSCRIBERS:
            try:
                q.put_nowait(event)
                active_subscribers.append(q)
            except Exception:
                pass  # Queue full or dead, skip
        SSE_SUBSCRIBERS.clear()
        SSE_SUBSCRIBERS.extend(active_subscribers)
```

The SSE stream itself lives at `/python/api/events`. It is authenticated, sends `{"type": "connected"}` on connect and a `: heartbeat` comment every 30 seconds of silence.

## API Endpoints

Blueprint: `python_strategy_bp`, `url_prefix="/python"`. Every route is guarded by `@check_session_validity`. No route in this blueprint carries a `@limiter.limit` decorator.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/python/` | GET | Dashboard, lists all strategies |
| `/python/new` | GET/POST | Upload a new strategy (`.py` file) |
| `/python/start/<strategy_id>` | POST | Start a strategy |
| `/python/stop/<strategy_id>` | POST | Stop a strategy |
| `/python/schedule/<strategy_id>` | POST | Set schedule times, days and exchange |
| `/python/unschedule/<strategy_id>` | POST | Disabled, always returns 400 |
| `/python/delete/<strategy_id>` | POST | Delete a strategy |
| `/python/logs/<strategy_id>` | GET | Log viewer page |
| `/python/logs/<strategy_id>/clear` | POST | Delete a strategy's log files |
| `/python/clear-error/<strategy_id>` | POST | Clear a strategy's error state |
| `/python/status` | GET | System-wide status (counts, scheduler, master contracts) |
| `/python/check-contracts` | POST | Recheck master contracts and start pending strategies |
| `/python/edit/<strategy_id>` | GET | Editor page |
| `/python/save/<strategy_id>` | POST | Save edited strategy source |
| `/python/export/<strategy_id>` | GET | Download the strategy file |
| `/python/api/exchanges` | GET | Exchange list for the schedule form |
| `/python/api/strategies` | GET | All strategies as JSON |
| `/python/api/strategy/<strategy_id>` | GET | One strategy as JSON |
| `/python/api/strategy/<strategy_id>/content` | GET | Strategy source as JSON |
| `/python/api/logs/<strategy_id>` | GET | Log file list as JSON |
| `/python/api/logs/<strategy_id>/<log_name>` | GET | One log file's contents |
| `/python/api/events` | GET | SSE status stream |

## Configuration Persistence

```python
CONFIG_FILE = Path('strategies') / 'strategy_configs.json'

def save_configs():
    """Save strategy configurations to file"""
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(STRATEGY_CONFIGS, f, indent=2, default=str)

# Example config structure
{
    "my_strategy": {
        "name": "My Strategy",
        "file_path": "strategies/scripts/my_strategy.py",
        "file_name": "my_strategy.py",
        "exchange": "NSE",
        "is_running": false,
        "is_scheduled": true,
        "created_at": "2024-01-15T09:00:00+05:30",
        "user_id": "admin",
        "schedule_start": "09:00",
        "schedule_stop": "16:00",
        "schedule_days": ["mon", "tue", "wed", "thu", "fri"]
    }
}
```

Additional keys are written at runtime: `pid` and `last_started` on start, `last_stopped` on stop, `is_error` / `error_message` / `error_time` on a crash, `paused_reason` / `paused_message` when the market-hours enforcer pauses a strategy, and `manually_stopped` when the user stops it.

## Operational Guidelines

### Best Practices

1. **Keep strategies stateless** - Don't rely on global state between runs
2. **Use logging** - Write to stdout/stderr for log capture
3. **Handle graceful shutdown** - Catch SIGTERM/SIGINT
4. **Use OpenAlgo API** - Don't bypass the API layer

### Example Strategy Template

```python
#!/usr/bin/env python
"""
Example OpenAlgo Strategy
"""
import requests
import time
import signal
import sys

# Configuration
API_KEY = "your_api_key_here"
BASE_URL = "http://localhost:5000/api/v1"

running = True

def signal_handler(sig, frame):
    global running
    print("Shutdown signal received")
    running = False

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

def get_quote(symbol, exchange):
    response = requests.post(
        f"{BASE_URL}/quotes",
        json={
            "apikey": API_KEY,
            "symbol": symbol,
            "exchange": exchange
        }
    )
    return response.json()

def place_order(symbol, exchange, action, quantity):
    response = requests.post(
        f"{BASE_URL}/placeorder",
        json={
            "apikey": API_KEY,
            "symbol": symbol,
            "exchange": exchange,
            "action": action,
            "quantity": quantity,
            "product": "MIS",
            "pricetype": "MARKET"
        }
    )
    return response.json()

def main():
    print("Strategy started")

    while running:
        try:
            # Your trading logic here
            quote = get_quote("SBIN", "NSE")
            print(f"SBIN LTP: {quote.get('ltp')}")

            time.sleep(60)  # Check every minute

        except Exception as e:
            print(f"Error: {e}")
            time.sleep(10)

    print("Strategy stopped")

if __name__ == "__main__":
    main()
```

### Log Monitoring

Each run writes its own timestamped file, `log/strategies/<strategy_id>_<YYYYMMDD>_<HHMMSS>_IST.log`:

```bash
# View live logs for the most recent run
tail -f "$(ls -t log/strategies/my_strategy_*.log | head -1)"

# View recent logs
tail -100 "$(ls -t log/strategies/my_strategy_*.log | head -1)"
```

Log rotation is controlled by three environment variables, with the defaults as written in `blueprints/python_strategy.py`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `STRATEGY_LOG_MAX_FILES` | `10` | Maximum log files kept per strategy, oldest deleted first |
| `STRATEGY_LOG_MAX_SIZE_MB` | `50` | Maximum total log size per strategy in MB |
| `STRATEGY_LOG_RETENTION_DAYS` | `7` | Delete strategy logs older than N days |

## Resource Configuration

### Memory Limits

Each strategy subprocess has a configurable memory limit to prevent runaway strategies from crashing the system. The limits are applied by `set_resource_limits()`, which is passed to `subprocess.Popen` as `preexec_fn`. It uses the `resource` module and is therefore a no-op on Windows:

```python
# Default: 1024MB, configurable via environment variable
STRATEGY_MEMORY_LIMIT_MB = int(os.environ.get('STRATEGY_MEMORY_LIMIT_MB', '1024'))
STRATEGY_CPU_TIME_LIMIT_SEC = 3600  # Max CPU time (1 hour) - resets on each run
```

| Limit | Value |
|-------|-------|
| `RLIMIT_AS` and `RLIMIT_DATA` | `STRATEGY_MEMORY_LIMIT_MB` (default 1024) MB |
| `RLIMIT_CPU` | 3600 seconds of cumulative CPU time |
| `RLIMIT_NOFILE` | 256 open files |
| `RLIMIT_NPROC` | 256 processes |

Recommended values from the comment block in `blueprints/python_strategy.py`:

| Container RAM | Recommended Limit | Concurrent Strategies |
|---------------|-------------------|-----------------------|
| 2GB | 256MB | 5 |
| 4GB | 512MB | 3 |
| 8GB+ | 1024MB (default) | - |

### Thread Limiting for Docker

When running strategies with numerical libraries (NumPy, SciPy, Numba) in Docker, thread limits prevent `RLIMIT_NPROC` exhaustion:

| Variable | Purpose |
|----------|---------|
| `OPENBLAS_NUM_THREADS` | OpenBLAS thread limit |
| `OMP_NUM_THREADS` | OpenMP thread limit |
| `MKL_NUM_THREADS` | Intel MKL thread limit |
| `NUMEXPR_NUM_THREADS` | NumExpr thread limit |
| `NUMBA_NUM_THREADS` | Numba JIT thread limit |

For 2GB containers, set all to `1`. For 4GB+, use `2`. See [Docker Configuration](11-docker-configuration.md) for details.

> **Reference**: [GitHub Issue #822](https://github.com/marketcalls/openalgo/issues/822)

## Key Files Reference

| File | Purpose |
|------|---------|
| `blueprints/python_strategy.py` | Strategy hosting blueprint |
| `strategies/scripts/` | User strategy files |
| `strategies/strategy_configs.json` | Configuration persistence |
| `log/strategies/` | Strategy log output |
| `database/market_calendar_db.py` | Market hours/holidays |
