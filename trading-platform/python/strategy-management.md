# Strategy RMS From Python

OpenAlgo's Strategy RMS runs multi-leg options strategies with end-to-end risk management, plus a signal-driven mode that reacts to individual alerts. Two surfaces reach it from Python, and they take different credentials:

| Surface | Credential | Use for |
| --- | --- | --- |
| `Strategy(...)` | The strategy's `oaws_` webhook token | The public webhook at `/strategy/webhook/<token>`, the same endpoint TradingView posts to. Batch `start` / `stop`, signal `long_entry` / `long_exit` / `short_entry` / `short_exit`. |
| `api(api_key=...)` | Your OpenAlgo API key | Lifecycle and reads under `/api/v1/strategy/`: list, status, start, stop, close all, close one leg, runs, orders, events. |

Both need **openalgo 2.0.4 or newer** (`pip install -U openalgo`). Building a strategy stays in the browser wizard at `/strategy`: neither surface can create a strategy, edit its configuration, enable live trading, rotate a webhook token, or delete anything.

Two strategy kinds, and each refuses the other's vocabulary:

* **batch**: a multi-leg spread entered and exited as a unit. `start` and `stop`.
* **signal**: one alert moves one leg. `long_entry`, `long_exit`, `short_entry`, `short_exit`. There is no start and no mode: the first signal after the platform session boundary opens the run, and the mode comes from the strategy's own live opt-in.

Four rules that cost money if you get them wrong:

1. **`mode` is required on start and is never defaulted**, in the SDK or on the server. `Strategy.start()` and `client.strategystart()` both take it as a required argument, so omitting it is a `TypeError` rather than a live order.
2. **Live is opt-in per strategy.** A strategy is created sandbox-only. `mode="live"` is refused until the operator enables live trading on the strategy page.
3. **An accepted stop is not proof of flatness.** Read `stop_pending` and the per-leg outcomes; never infer flatness from the HTTP status.
4. **The webhook token is the whole credential.** It is shown once, in the browser, at creation and at rotation; no endpoint returns it. Keep it in a secret manager or environment variable, never in source control, alert JSON, logs or screenshots.

## Webhook: batch strategy

```python
import os
from openalgo import Strategy

strategy = Strategy(
    host_url=os.environ["OPENALGO_URL"],
    webhook_token=os.environ["OPENALGO_STRATEGY_WEBHOOK_TOKEN"]
)

# mode is required. Use "sandbox" until the strategy is enabled for live trading.
response = strategy.start("sandbox")
print(response)
```

Start response:

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy start accepted",
  "strategy_id": 7,
  "run_id": 42
}
```

To request a stop:

```python
response = strategy.stop()
print(response)

if response.get("stop_pending"):
    print("Exits accepted but not yet confirmed flat; watch strategystatus / strategyevents")
```

Stop response:

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy stop accepted",
  "strategy_id": 7,
  "run_id": 42,
  "stop_pending": true,
  "exits": [
    {"leg_id": 1, "ok": true, "position_ref": "969bc536b1c14d15992f730c2c136d7a", "exit_owner": "live", "error": null}
  ]
}
```

"Strategy stop accepted" means the durable request reached the engine, not that the broker is flat. `stop_pending: true` keeps the run current, subscribed and managed until exit fills confirm every owner is flat.

## Webhook: signal strategy

One alert moves one leg. Name the leg by its configured `leg_id`, or by `symbol` and `exchange`; `leg_id` wins when both are given.

```python
strategy.long_entry(leg_id=1)
strategy.long_exit(leg_id=1)
strategy.short_entry(symbol="RELIANCE", exchange="NSE")
strategy.short_exit(symbol="RELIANCE", exchange="NSE")

# The generic form, for a dispatcher that maps alert text to actions
strategy.signal("long_entry", leg_id=1)
```

A signal that does nothing is a **success with a note**, not a failure: `Signal accepted (already_long)`. The notes are `already_long`, `already_short`, `no_matching_position`, `outside_entry_window` and `outside_trading_window`. Reporting a no-op as a failure invites a retry, and a retry on an order path is how one alert becomes two positions. Being *refused* is different: a signal blocked by the strategy's direction, or naming a leg that does not exist, answers `rejected_invalid_action` with the engine's own message.

An opposite entry squares the existing side first, then opens. A signal leg on a derivatives exchange must name an exact listed contract; a base symbol plus an expiry rank is refused, not guessed.

## Handling webhook results

Every documented outcome is **returned, not raised**, because the `result` label is the contract: a 200 `rejected_dedupe` and a 409 `rejected_cooling_off` both need reading rather than a traceback. Non-200 answers carry the HTTP `code`; only a transport failure or a non-JSON answer produces a locally built error dict.

```python
response = strategy.start("sandbox")
result = response.get("result")

if result == "ok":
    print(f"accepted, run {response['run_id']}")
elif result == "rejected_dedupe":
    print("duplicate delivery within 60s, already handled")    # HTTP 200
elif result == "rejected_cooling_off":
    print("stopped within the last 30s, try again shortly")    # HTTP 409
elif result == "rejected_live_disabled":
    print("enable live trading on the strategy page first")    # HTTP 403
elif result == "rejected_token":
    print("unknown or rotated token")                          # HTTP 404
else:
    print(f"refused: {result}: {response.get('message')}")
```

| Result | HTTP | Cause |
| --- | --- | --- |
| `ok` | 200 | Accepted and handed to the engine. For a signal strategy this includes a no-op |
| `rejected_token` | 404 | Token malformed, unknown or rotated |
| `rejected_locked` | 403 | The strategy's webhook kill switch is engaged |
| `rejected_ip` | 403 | Caller outside the strategy's IP allowlist |
| `rejected_payload` | 400 | Body empty, not JSON, not an object, or over 16384 bytes |
| `rejected_invalid_action` | 400 | Action not accepted by this strategy kind, `start` without a valid `mode`, or a configuration mismatch |
| `rejected_live_disabled` | 403 | `mode: "live"` on a strategy not enabled for live |
| `rejected_dedupe` | 200 | Identical signal already handled within 60 seconds. Reported as a success |
| `rejected_cooling_off` | 409 | The strategy stopped within the last 30 seconds, so a `start` is held off |
| `rejected_engine_error` | 500 | The engine refused the signal or raised |
| `rate_limited` | 429 | The route's rate limiter refused the request |

Duplicate suppression and cooling-off apply to batch strategies only. Signal actions skip both windows: they are idempotent by meaning, and a 60 second window would suppress a genuine long, short, long sequence.

The `Strategy` class keeps one pooled connection for repeated posts and supports `with Strategy(...) as strategy:`. Its `repr()` never shows the token.

## API key: lifecycle and reads

The same client you use for orders drives the strategy module with the API key:

```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")

# Resolve a name to the strategy_id every other call needs
for s in client.strategylist()["data"]:
    print(s["id"], s["strategy_kind"], s["status"], s["live_enabled"], s["name"])

# Configuration including legs, plus the current run (null when stopped)
status = client.strategystatus(strategy_id=7)
run = status["run"]

# Start a batch strategy. mode is required, never defaulted.
started = client.strategystart(strategy_id=7, mode="sandbox")
for leg in started["legs"]:
    if not leg["ok"]:
        print(f"leg {leg['leg_id']} rejected: {leg['error']}")

# Exit one leg, or everything
client.strategycloseleg(strategy_id=7, leg_id=2)
stopped = client.strategystop(strategy_id=7)
if stopped.get("stop_pending"):
    print("exits are working; the run is still managed")

# History
runs = client.strategyruns(strategy_id=7, limit=10)             # newest first
orders = client.strategyorders(strategy_id=7, run_id=42)         # oldest first
events = client.strategyevents(strategy_id=7, severity="critical")
```

| Method | Route | Notes |
| --- | --- | --- |
| `strategylist(status=None, q=None)` | `/strategy/list` | Newest first. An out-of-vocabulary `status` is a 400, not an empty list |
| `strategystatus(strategy_id)` | `/strategy/status` | Full configuration with `legs`, plus `run` or `null`. A populated `run.stop_requested_reason` means a stop is pending, not done |
| `strategystart(strategy_id, mode)` | `/strategy/start` | Batch only. Partial success is a 200: check `legs[].ok`. A second start on a running strategy is a 409 |
| `strategystop(strategy_id)` | `/strategy/stop` | Exits at market. Read `stop_pending`; a 409 can also carry it when a refused exit still needs management, so retry |
| `strategycloseall(strategy_id)` | `/strategy/close_all` | Same mechanics as stop, plus a `close_all_manual` audit event proving an operator asked |
| `strategycloseleg(strategy_id, leg_id)` | `/strategy/close_leg` | `leg_id` is the id in `legs[].id` from status, not an order id. A leg that is not open is a 409 |
| `strategyruns(strategy_id, limit=None)` | `/strategy/runs` | 1 to 500, bounded rather than clamped. `pnl_peak` / `pnl_trough` are authoritative once the run has stopped |
| `strategyorders(strategy_id, run_id=None)` | `/strategy/orders` | Oldest first so an entry precedes its exit. A row can appear as `pending` before the broker answers |
| `strategyevents(strategy_id, run_id=None, kind=None, severity=None, limit=None)` | `/strategy/events` | Append-only, newest first, 1 to 1000. Poll `severity="critical"` and forward it |

Every route is a POST with the identifier in the body; a strategy that is not yours returns 404, identical to one that does not exist. Non-200 answers come back as dicts carrying the server's `message` and the HTTP `code`, so a 409 `This strategy is not running` or a 400 with a per-field `message` object is readable rather than a traceback.

Events an operator must not ignore: `run_stop_requested` (durable, not flat), `run_stop_failed` (**critical**, the run is still holding positions), `order_ack_unrecorded` (**critical**, accepted at the broker but unrecorded; it reconciles itself), `leg_expiry_fallback` (a nearer expiry than configured was used) and `flip_outgoing_exit_rejected` (**critical**, the outgoing side of a signal flip is still held).

## Without the SDK

The webhook is plain HTTP, so any client works. This is exactly what `Strategy.start("sandbox")` sends:

```python
import os
import requests

base_url = os.environ["OPENALGO_URL"].rstrip("/")
token = os.environ["OPENALGO_STRATEGY_WEBHOOK_TOKEN"]

response = requests.post(
    f"{base_url}/strategy/webhook/{token}",
    json={"action": "start", "mode": "sandbox"},
    timeout=10,
)
print(response.status_code, response.json())
```

Do not call `raise_for_status()` before reading the body: the rejections are the interesting part, and each carries its `result` label.

## Security and operations

* The webhook accepts no `apikey`; the URL token is the credential. Anyone who can post to the URL can start or stop the strategy, subject to the kill switch, IP allowlist and live opt-in.
* Do not include the token in alert JSON, exception text, request logs or screenshots. OpenAlgo redacts it from its own logs and traffic database; senders and proxies outside that boundary must protect it themselves.
* Configure a webhook IP allowlist when your sender publishes stable address ranges.
* HTTP 429 is a rate-limit response. Retry only with bounded backoff, and never resend a business alert that may already have been handled.
* If a token may have leaked, rotate it on the strategy page. The old token stops working immediately.

The `Strategy.strategyorder(symbol, action, position_size)` helper from earlier releases posted to a webhook that no longer exists. In 2.0.4 it raises `NotImplementedError` naming the replacements above; there is no automatic mapping, because `BUY` is `long_entry` on a flat leg and `short_exit` on a short one.

See [Public Strategy Webhook](../../api-documentation/v1/strategy-rms-api/webhook.md) for every result code and [Strategy RMS API](../../api-documentation/v1/strategy-rms-api/README.md) for the authenticated lifecycle and audit calls.
