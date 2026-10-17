# 33 - Broker Folder Explanations

## Overview

Each broker in OpenAlgo follows a standardized folder structure with consistent interfaces for authentication, order management, data retrieval, and symbol mapping.

## Broker Directory Structure

```
broker/
├── zerodha/                          # Example broker
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth_api.py               # authenticate_broker()
│   │   ├── order_api.py              # place_order_api(), books, positions
│   │   ├── data.py                   # class BrokerData
│   │   ├── funds.py                  # get_margin_data()
│   │   ├── margin_api.py             # order margin preview (optional)
│   │   └── gtt_api.py                # GTT lifecycle (Dhan and Zerodha only)
│   ├── mapping/
│   │   ├── transform_data.py         # OpenAlgo request to broker request
│   │   ├── order_data.py             # broker response to OpenAlgo shape
│   │   ├── margin_data.py
│   │   └── gtt_data.py
│   ├── database/
│   │   └── master_contract_db.py     # master_contract_download()
│   ├── streaming/
│   │   ├── __init__.py
│   │   ├── zerodha_adapter.py        # ZerodhaWebSocketAdapter
│   │   ├── zerodha_order_adapter.py  # order-update ingestion
│   │   ├── zerodha_mapping.py
│   │   └── zerodha_websocket.py
│   └── plugin.json                   # name, type, exchanges, leverage flag
├── dhan/
│   └── ... (same shape)
├── angel/
│   └── ... (same shape)
└── ... (37 broker plugins total)
```

The streaming files are named after the broker, so Angel uses `broker/angel/streaming/angel_adapter.py` and so on. Not every plugin ships every optional module: `gtt_api.py` exists only for Dhan and Zerodha, and `<broker>_order_adapter.py` only where the broker pushes order updates. `mapping/` and `database/` have no `__init__.py` in most plugins.

## File Explanations

### 1. api/auth_api.py

Handles broker authentication/OAuth flow.

```python
# Required function

def authenticate_broker(request_token):
    """
    Exchange the broker's request token (or OAuth code) for an access token.
    Returns (auth_token, error_message).
    OAuth-code brokers use the signature authenticate_broker(code).
    """
    pass

# Optional, present only where the broker needs it

def get_feed_token():
    """Return a separate market-data feed token"""
    pass
```

### 2. api/order_api.py

Order management operations. All 37 plugins expose the same set.

```python
# Required functions

def place_order_api(data, auth):
    """Place new order"""
    # Transform data to broker format
    # Make API call
    # Return (response, response_data, order_id)
    pass

def place_smartorder_api(data, auth):
    """Place order sized against the current position"""
    pass

def modify_order(data, auth):
    """Modify existing order"""
    pass

def cancel_order(orderid, auth):
    """Cancel order"""
    pass

def cancel_all_orders_api(data, auth):
    """Cancel every open order"""
    pass

def close_all_positions(current_api_key, auth):
    """Close all positions"""
    pass

def get_open_position(tradingsymbol, exchange, product, auth):
    """Get net quantity for a single position"""
    pass

# Book retrieval also lives here, not in funds.py

def get_order_book(auth): ...
def get_trade_book(auth): ...
def get_positions(auth): ...
def get_holdings(auth): ...
```

### 3. api/data.py

Market data retrieval. Every plugin exposes a `BrokerData` class constructed with the
auth token, rather than module-level functions.

```python
class BrokerData:
    def __init__(self, auth_token):
        self.auth_token = auth_token

    def get_quotes(self, symbol, exchange):
        """Get real-time quote"""
        pass

    def get_depth(self, symbol, exchange):
        """Get market depth (order book)"""
        pass

    def get_market_depth(self, symbol, exchange):
        """Full depth payload"""
        pass

    def get_history(self, symbol, exchange, interval, start_date, end_date):
        """Get historical OHLC data"""
        pass
```

### 4. api/funds.py

Account margin information. This module holds one function only.

```python
# Required function

def get_margin_data(auth_token):
    """Get account balance, margin used and available margin"""
    pass
```

### 5. mapping/transform_data.py

Convert OpenAlgo format to broker format.

```python
from database.token_db import get_br_symbol

def transform_data(data):
    """Transform order data to broker format"""
    return {
        "tradingsymbol": get_br_symbol(data['symbol'], data['exchange']),
        "exchange": data['exchange'],
        "transaction_type": data['action'].upper(),
        "order_type": map_order_type(data['pricetype']),
        "quantity": data['quantity'],
        "product": map_product_type(data['product']),
        "price": data.get('price', "0"),
        "trigger_price": data.get('trigger_price', "0"),
        "validity": "DAY",
        "tag": "openalgo"
    }

def transform_modify_order_data(data):
    """Transform a modify request to broker format"""
    return {
        "order_type": map_order_type(data['pricetype']),
        "quantity": data['quantity'],
        "price": data['price'],
        "trigger_price": data['trigger_price']
    }
```

Response mapping lives in `mapping/order_data.py`, which supplies `map_order_data`,
`transform_order_data`, `map_trade_data`, `transform_tradebook_data`,
`map_position_data`, `transform_positions_data`, `map_portfolio_data`,
`transform_holdings_data`, `calculate_order_statistics` and
`calculate_portfolio_statistics`.

### 6. database/master_contract_db.py

Symbol/token database management. Rows are written into the shared `symtoken` table
defined by `SymToken` in `database/symbol.py`.

```python
def master_contract_download():
    """Download, transform and store symbol mappings"""
    pass

def delete_symtoken_table():
    """Clear the existing symbol set before a fresh load"""
    pass

def copy_from_dataframe(df):
    """Bulk insert the transformed DataFrame into symtoken"""
    pass

def search_symbols(symbol, exchange):
    """Search the symbol table for this broker"""
    pass
```

### 7. streaming/{broker}_adapter.py

Real-time data streaming adapter. The class name follows
`<Broker>WebSocketAdapter` (capitalised broker key) and subclasses
`BaseBrokerWebSocketAdapter` from `websocket_proxy/base_adapter.py`, which is how
`websocket_proxy/broker_factory.py` resolves it dynamically.

```python
from websocket_proxy.base_adapter import BaseBrokerWebSocketAdapter

class ZerodhaWebSocketAdapter(BaseBrokerWebSocketAdapter):
    def __init__(self):
        super().__init__()

    def initialize(self, broker_name, user_id, auth_data=None):
        """Resolve credentials and prepare the upstream client"""
        pass

    def connect(self):
        """Establish WebSocket connection"""
        pass

    def disconnect(self):
        """Tear down the connection"""
        pass

    def subscribe(self, symbol, exchange, mode=2, depth_level=5):
        """Subscribe to symbol updates"""
        pass

    def unsubscribe(self, symbol, exchange, mode=2):
        """Unsubscribe from symbols"""
        pass
```

Ticks are normalised by the adapter and published on the shared ZeroMQ bus with
`publish_market_data(topic, data)` inherited from the base class.

### 8. plugin.json

Broker metadata plus a small amount of capability configuration.

```json
{
    "Plugin Name": "zerodha",
    "Plugin URI": "https://openalgo.in",
    "Description": "Zerodha OpenAlgo Plugin",
    "Version": "1.0",
    "Author": "Rajandran R",
    "Author URI": "https://openalgo.in",
    "supported_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "MCX", "NCO",
                            "NSE_INDEX", "BSE_INDEX", "MCX_INDEX", "GLOBAL_INDEX"],
    "broker_type": "IN_stock",
    "leverage_config": false
}
```

> **Important**: `plugin.json` carries identity plus the three capability keys
> `supported_exchanges`, `broker_type` and `leverage_config`. It does NOT contain API
> URLs, credentials or rate limits. Authentication methods, API endpoints and WebSocket
> URLs are handled directly in the broker's Python code. Of the 37 plugins, only
> `deltaexchange` declares `"broker_type": "crypto"` with `"leverage_config": true`;
> the other 36 declare `"broker_type": "IN_stock"` with `"leverage_config": false`.

## Adding a New Broker

### Step 1: Create Directory Structure

```bash
mkdir -p broker/newbroker/{api,mapping,database,streaming}
touch broker/newbroker/{api,mapping,database,streaming}/__init__.py
```

### Step 2: Implement Required Files

1. `api/auth_api.py` - Authentication (`authenticate_broker`)
2. `api/order_api.py` - Orders and books
3. `api/data.py` - Market data (`BrokerData` class)
4. `api/funds.py` - Margin data (`get_margin_data`)
5. `mapping/transform_data.py` and `mapping/order_data.py` - Request and response mapping
6. `database/master_contract_db.py` - Master-contract download into the shared `symtoken` table
7. `streaming/newbroker_adapter.py` - `NewbrokerWebSocketAdapter` (optional, needed for WebSocket feeds)
8. `plugin.json` - Metadata plus `supported_exchanges`, `broker_type`, `leverage_config`

### Step 3: Register Broker

```bash
# .env
VALID_BROKERS = 'zerodha,dhan,angel,newbroker'
```

`VALID_BROKERS` in `.sample.env` currently lists all 37 plugins.

## Field Mapping Examples

### Price Type Mapping

| OpenAlgo | Zerodha | Dhan | Angel |
|----------|---------|------|-------|
| MARKET | MARKET | MARKET | MARKET |
| LIMIT | LIMIT | LIMIT | LIMIT |
| SL | SL | STOP_LOSS | STOPLOSS_LIMIT |
| SL-M | SL-M | STOP_LOSS_MARKET | STOPLOSS_MARKET |

### Product Type Mapping

| OpenAlgo | Zerodha | Dhan | Angel |
|----------|---------|------|-------|
| CNC | CNC | CNC | DELIVERY |
| MIS | MIS | INTRADAY | INTRADAY |
| NRML | NRML | MARGIN | CARRYFORWARD |

### Exchange Mapping

| OpenAlgo | Zerodha | Dhan | Angel |
|----------|---------|------|-------|
| NSE | NSE | NSE_EQ | NSE |
| NFO | NFO | NSE_FNO | NFO |
| BSE | BSE | BSE_EQ | BSE |
| MCX | MCX | MCX_COMM | MCX |

## Reference Implementations

### Best Examples

| Broker | Strength |
|--------|----------|
| zerodha | Request-token exchange with SHA-256 checksum |
| dhan | Consent flow plus direct access token (`get_direct_access_token`) |
| angel | Full feature set |
| nubra | gRPC-based streaming, `protos` directory |
| deltaexchange | Crypto derivatives, `broker_type: crypto`, leverage config |
| dhan_sandbox | Paper trading against Dhan sandbox endpoints |

### Code Reference

```python
# See broker/zerodha/ for complete example
# See broker/dhan/ for the consent-based auth flow
# See broker/angel/ for alternative patterns
```

## Key Files Reference

| Component | File Pattern |
|-----------|--------------|
| Auth | `broker/*/api/auth_api.py` |
| Orders | `broker/*/api/order_api.py` |
| Data | `broker/*/api/data.py` |
| Funds | `broker/*/api/funds.py` |
| Request mapping | `broker/*/mapping/transform_data.py` |
| Response mapping | `broker/*/mapping/order_data.py` |
| Symbols | `broker/*/database/master_contract_db.py` |
| WebSocket | `broker/*/streaming/*_adapter.py` |
| Metadata | `broker/*/plugin.json` |
| Adapter base class | `websocket_proxy/base_adapter.py` |
| Adapter resolution | `websocket_proxy/broker_factory.py` |
