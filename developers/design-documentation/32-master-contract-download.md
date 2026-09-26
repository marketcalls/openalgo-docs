# 32 - Master Contract Download

## Overview

Master contracts contain symbol mappings between OpenAlgo's standardized format and broker-specific formats. They are downloaded at most once per day, on broker login, and cached in the `symtoken` table plus an in-memory cache for fast symbol resolution.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-master-contract-download-flow.png" alt="Master contract download: login or Force Download triggers, a check for a missing or stale symbol list (first run, broker change, new day or a download before the 08:00 IST cutoff, 00:00 UTC for crypto), background thread running the broker master_contract_db, symtoken, status table and memory cache"><figcaption></figcaption></figure>

## Download Process

### 1. Trigger on Broker Login

```python
# utils/auth_utils.py - inside handle_auth_success(...)

def handle_auth_success(auth_token, user_session_key, broker, feed_token=None, user_id=None):
    init_broker_status(broker)

    # Smart download: skip the download if cached data is still valid for today
    should_download, reason = should_download_master_contract(broker)

    if should_download:
        Thread(target=async_master_contract_download, args=(broker,), daemon=True).start()
    else:
        Thread(target=load_existing_master_contract, args=(broker,), daemon=True).start()
```

### 2. Background Download

```python
def async_master_contract_download(broker):
    """Run the broker's master contract download and record status/statistics"""
    update_status(broker, "downloading", "Master contract download in progress")

    module_path = f"broker.{broker}.database.master_contract_db"
    master_contract_module = importlib.import_module(module_path)

    master_contract_module.master_contract_download()

    # Normalise derivative underlyings, refresh the memory cache and record stats
    normalize_derivative_underlyings()
    update_status(broker, "success", "Master contract download completed successfully",
                  get_symbol_count())
```

### 3. Broker-Specific Download

Every broker plugin exposes the same entry point, `master_contract_download()`.

```python
# broker/zerodha/database/master_contract_db.py

def master_contract_download():
    """Download Zerodha master contract"""
    output_path = 'tmp/zerodha.csv'

    # Fetch https://api.kite.trade/instruments and save to output_path
    download_csv_zerodha_data(output_path)

    # Parse the CSV and map it into the OpenAlgo symtoken schema
    token_df = process_zerodha_csv(output_path)
    delete_zerodha_temp_data(output_path)

    # Replace the existing symbol set with the freshly downloaded one
    delete_symtoken_table()
    copy_from_dataframe(token_df)

    return socketio.emit('master_contract_download',
                         {'status': 'success', 'message': 'Successfully Downloaded'})
```

## Symbol Database Schema

### symtoken Table

```
┌─────────────────────────────────────────────────────────────────────┐
│                           symtoken table                            │
├────────────────┬────────────┬───────────────────────────────────────┤
│ Column         │ Type       │ Description                           │
├────────────────┼────────────┼───────────────────────────────────────┤
│ id             │ Integer PK │ Auto-increment                        │
│ symbol         │ String     │ OpenAlgo symbol, not null, indexed    │
│ brsymbol       │ String     │ Broker symbol, not null, indexed      │
│ name           │ String     │ Instrument name                       │
│ exchange       │ String     │ OpenAlgo exchange code, indexed       │
│ brexchange     │ String     │ Broker exchange code, indexed         │
│ token          │ String     │ Broker instrument token, indexed      │
│ expiry         │ String     │ Expiry as DDMMMYY for F&O             │
│ strike         │ Float      │ Strike price for options              │
│ lotsize        │ Integer    │ Lot size                              │
│ instrumenttype │ String     │ EQ, FUT, CE, PE, INDEX                │
│ tick_size      │ Float      │ Minimum price tick                    │
│ contract_value │ Float      │ Contract multiplier, crypto contracts │
└────────────────┴────────────┴───────────────────────────────────────┘
```

## Symbol Mapping

### OpenAlgo to Broker

```python
from database.token_db import get_br_symbol

# Get broker-specific symbol
broker_symbol = get_br_symbol("SBIN", "NSE")
# Returns: "SBIN-EQ" (for Zerodha)

broker_symbol = get_br_symbol("NIFTY21JAN2521500CE", "NFO")
# Returns: "NIFTY 21JAN25 21500 CE" (for Zerodha)
```

### Get Token

```python
from database.token_db import get_token

# Get broker token for symbol
token = get_token("SBIN", "NSE")
# Returns: "779"
```

### Get Symbol Info

```python
from database.token_db import get_symbol_info

info = get_symbol_info("NIFTY", "NFO")
# Returns: {
#     "symbol": "NIFTY",
#     "lotsize": 65,
#     "tick_size": 0.05,
#     "expiry": "2025-01-30"
# }
```

## Broker Implementations

### Zerodha

```python
# broker/zerodha/database/master_contract_db.py

URL = "https://api.kite.trade/instruments"
FORMAT = "CSV"

def master_contract_download():
    # CSV columns: instrument_token, exchange_token, tradingsymbol,
    #              name, last_price, expiry, strike, tick_size,
    #              lot_size, instrument_type, segment, exchange
    ...
```

### Dhan

```python
# broker/dhan/database/master_contract_db.py

URL = "https://images.dhan.co/api-data/api-scrip-master.csv"
FORMAT = "CSV"
```

### Angel One

```python
# broker/angel/database/master_contract_db.py

URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
FORMAT = "JSON"
```

## Caching Strategy

### In-Memory Cache

`database/token_db.py` is a thin compatibility shim that re-exports everything from
`database/token_db_enhanced.py`, which keeps the whole symbol set (100,000+ rows) in
memory for O(1) lookups instead of expiring individual entries.

```python
# database/token_db.py
from database.token_db_enhanced import (
    get_token, get_symbol, get_oa_symbol, get_br_symbol, get_brexchange,
    get_symbol_info, get_symbol_count, get_tokens_bulk, get_symbols_bulk,
    search_symbols, load_cache_for_broker, clear_cache, get_cache_stats,
)
```

After a successful download, `database/master_contract_cache_hook.py`
(`hook_into_master_contract_download`) reloads the memory cache for the broker.
Every lookup also has a `*_dbquery` twin (`get_token_dbquery`, `get_symbol_dbquery`,
and so on) that bypasses the cache and hits the database directly.

### Database Index

`SymToken` in `database/symbol.py` declares three composite indices, plus single column
indices on `symbol`, `brsymbol`, `exchange`, `brexchange` and `token`.

```sql
CREATE INDEX idx_symbol_exchange ON symtoken(symbol, exchange);
CREATE INDEX idx_symbol_name ON symtoken(symbol, name);
CREATE INDEX idx_brsymbol_exchange ON symtoken(brsymbol, exchange);
```

## Status Tracking

### master_contract_status Table

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          master_contract_status table                          │
├───────────────────────────┬───────────┬────────────────────────────────────────┤
│ Column                    │ Type      │ Description                            │
├───────────────────────────┼───────────┼────────────────────────────────────────┤
│ broker                    │ String PK │ Broker name, primary key               │
│ status                    │ String    │ pending, downloading, success, error   │
│ message                   │ String    │ Human readable status detail           │
│ last_updated              │ DateTime  │ Last status write                      │
│ total_symbols             │ String    │ Symbol count, defaults to "0"          │
│ is_ready                  │ Boolean   │ Symbols usable, defaults to false      │
│ last_download_time        │ DateTime  │ When a download last succeeded         │
│ download_date             │ Date      │ Trading day of the download            │
│ exchange_stats            │ Text      │ JSON, e.g. {"NSE": 2500, "NFO": 85000} │
│ download_duration_seconds │ Integer   │ Download wall time                     │
└───────────────────────────┴───────────┴────────────────────────────────────────┘
```

## Stuck Download Detection

The system auto-detects stuck master contract downloads. If a download stays in 'downloading' state for more than `DOWNLOAD_TIMEOUT_MINUTES` (5 minutes, a module level constant, not an environment variable), it is automatically marked as an error, and the UI enables the "Force Download" button for manual retry.

```python
# database/master_contract_status_db.py
DOWNLOAD_TIMEOUT_MINUTES = 5  # Module level constant

def get_status(broker):
    """
    Check download status with stuck detection.
    If status='downloading' and last_updated is older than DOWNLOAD_TIMEOUT_MINUTES,
    auto-mark as error and suggest Force Download.
    """
    status = MasterContractStatus.query.filter_by(broker=broker).first()
    if (status.status == "downloading"
            and datetime.now() - status.last_updated > timedelta(minutes=DOWNLOAD_TIMEOUT_MINUTES)):
        update_status(broker, "error",
            f"Download timed out (stuck for >{DOWNLOAD_TIMEOUT_MINUTES} minutes). "
            "Click Force Download to retry."
        )
```

Force Download is exposed by `blueprints/master_contract_status.py` at
`POST /api/master-contract/download`. The same blueprint serves
`GET /api/master-contract/status`, `GET /api/master-contract/ready` and
`GET /api/master-contract/smart-status`.

## Error Handling

### Download Failures

```python
def master_contract_download():
    try:
        response = client.get(url, timeout=60)
        response.raise_for_status()
        process_data(response.text)
        return socketio.emit('master_contract_download',
                             {'status': 'success', 'message': 'Successfully Downloaded'})
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return socketio.emit('master_contract_download',
                             {'status': 'error', 'message': str(e)})
```

`async_master_contract_download` wraps this call and writes the outcome to the
`master_contract_status` table with `update_status(broker, "success"|"error", message)`.

### Fallback to Cache

If download fails, use existing cached data:

```python
def get_symbol(symbol, exchange):
    result = db_lookup(symbol, exchange)
    if result:
        return result

    # Log warning but don't fail
    logger.warning(f"Symbol not found: {symbol}:{exchange}")
    return None
```

## Daily Refresh

There is no cron job. The refresh is login driven: `should_download_master_contract(broker)`
in `utils/auth_utils.py` compares the last successful download against a per day cutoff
time, so the first login after the cutoff downloads fresh data and every later login on the
same day reuses the cached symbols.

### Cutoff Configuration

| Env Variable | Default in code | Timezone | Applies to |
|--------------|-----------------|----------|------------|
| `MASTER_CONTRACT_CUTOFF_TIME` | `08:00` | IST | Indian exchange brokers |
| `CRYPTO_MASTER_CONTRACT_CUTOFF_TIME` | `00:00` | UTC | Crypto brokers in `CRYPTO_BROKERS` |

`CRYPTO_BROKERS` is defined in `utils/constants.py` and currently contains
`deltaexchange`. The format for both variables is `HH:MM` in 24-hour form.

```python
# utils/auth_utils.py
def should_download_master_contract(broker):
    """
    - Never downloaded before: download
    - Different calendar day in the reference timezone: download
    - Same day but downloaded before the cutoff: download
    - Same day and downloaded after the cutoff: skip and use cached symbols
    - A different broker downloaded more recently: download (symtoken is stale)
    """
```

When the download is skipped, `load_existing_master_contract(broker)` marks the status
ready from the existing `symtoken` rows instead.

## Key Files Reference

| File | Purpose |
|------|---------|
| `broker/*/database/master_contract_db.py` | Broker download (`master_contract_download()`) |
| `database/symbol.py` | `SymToken` model, `symtoken` table |
| `database/token_db.py` | Symbol lookup (re-exports `token_db_enhanced`) |
| `database/token_db_enhanced.py` | Full memory symbol cache |
| `database/master_contract_cache_hook.py` | Cache reload after download |
| `database/master_contract_status_db.py` | Status tracking (`MasterContractStatus`) |
| `blueprints/master_contract_status.py` | Status and Force Download routes |
| `utils/auth_utils.py` | Smart download decision and async trigger |
