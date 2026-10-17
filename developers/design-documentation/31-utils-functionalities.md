# 31 - Utils Functionalities

## Overview

The utils directory contains shared utility functions used across the OpenAlgo platform for authentication, logging, configuration, and common operations.

## Utils Directory Structure

```
utils/
├── auth_utils.py             # Broker auth handoff, token revoke, password rules
├── session.py                # Protected-route session validity
├── security_middleware.py    # Pre-Flask IP ban enforcement
├── logging.py                # Centralized logging setup and filters
├── traffic_logger.py         # HTTP traffic logging middleware
├── ip_helper.py              # Trusted client-IP resolution
├── httpx_client.py           # Shared pooled HTTP client
├── socketio_error_handler.py # Socket.IO error suppression
├── latency_monitor.py        # Per-endpoint latency tracking
├── health_monitor.py         # Background health monitoring daemon
├── api_analyzer.py           # Analyzer dashboard statistics
├── event_bus.py              # In-process EventBus and the bus singleton
├── db_sessions.py            # Scoped-session registry and teardown
├── mpp_slab.py               # Market price protection slabs
├── number_formatter.py       # Indian number formatting
├── constants.py              # Exchanges, products, price types, required fields
├── config.py                 # Config helpers
├── env_config.py             # Environment-derived settings
├── env_check.py              # Startup environment validation
├── symbol_utils.py           # Symbol parsing helpers
├── trading_calendar.py       # Market session and holiday helpers
├── version.py                # Single source of truth for VERSION
├── plugin_loader.py          # Broker plugin and capability discovery
├── mcp_tool_registry.py      # MCP tool definitions and scopes
├── oauth_codes.py            # Remote MCP authorization codes
├── oauth_keys.py             # Remote MCP signing keys
├── oauth_tokens.py           # Remote MCP access and refresh tokens
├── email_utils.py            # SMTP sending
├── email_debug.py            # SMTP diagnostics
└── ngrok_manager.py          # Ngrok tunnel lifecycle
```

## Key Utilities

### 1. Authentication Utilities (auth_utils.py)

```python
# Password validation
def validate_password_strength(password):
    """Check password meets security requirements"""
    if len(password) < 8:
        return False, "Minimum 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Need uppercase"
    if not re.search(r'[a-z]', password):
        return False, "Need lowercase"
    if not re.search(r'[0-9]', password):
        return False, "Need number"
    if not re.search(r'[!@#$%^&*]', password):
        return False, "Need special character"
    return True, "Valid"

# Credential masking
def mask_api_credential(credential, show_chars=4):
    """Mask credentials for display"""
    # "abc123def456" → "abc1***f456"

# AJAX detection
def is_ajax_request():
    """Detect React/AJAX requests"""

# Master contract download
def async_master_contract_download(broker):
    """Background contract download"""
```

### 2. Session Management (session.py)

```python
# Session expiry
def get_session_expiry_time():
    """Get session expiry (default: 3 AM IST)"""

# Session validation decorator
@check_session_validity
def protected_route():
    """Only accessible with valid session"""

# Token revocation
def revoke_user_tokens(revoke_db_tokens=True):
    """Revoke all auth tokens on logout or daily rollover"""

# Crypto/24-7 brokers can switch expiry off entirely
def is_session_expiry_disabled():
    """True when DISABLE_SESSION_EXPIRY is set"""
```

### 3. IP Helper (ip_helper.py)

```python
def get_real_ip():
    """Get client IP from request"""
    # TRUST_PROXY_HEADERS defaults to FALSE: forwarded headers are
    # ignored entirely and request.remote_addr is returned, so a client
    # reaching gunicorn directly cannot spoof its source IP.
    #
    # TRUST_PROXY_HEADERS=TRUE walks the headers in priority order:
    # 1. CF-Connecting-IP (Cloudflare)
    # 2. True-Client-IP
    # 3. X-Real-IP (nginx)
    # 4. X-Forwarded-For (first IP)
    # 5. X-Client-IP
    # 6. remote_addr

def get_real_ip_from_environ(environ):
    """Same resolution for WSGI/WebSocket environs without a Flask request"""
```

### 4. HTTP Client (httpx_client.py)

```python
def get_httpx_client():
    """Get connection-pooled HTTP client (module-level singleton)"""
    # Features:
    # - HTTP/2 when APP_MODE is not 'standalone', HTTP/1.1 always
    # - Connection pooling (40 keepalive, 100 max, 30s keepalive expiry)
    # - 120-second timeout
    # - Latency tracking hooks

def request(method, url, **kwargs):
    """Make HTTP request with timing"""

def get(url, **kwargs):
    """HTTP GET shortcut"""

def post(url, **kwargs):
    """HTTP POST shortcut"""

def put(url, **kwargs):
    """HTTP PUT shortcut"""

def delete(url, **kwargs):
    """HTTP DELETE shortcut"""

def cleanup_httpx_client():
    """Close the shared client on shutdown"""
```

### 5. Logging (logging.py)

```python
# Get logger instance
logger = get_logger(__name__)

# Colored console output
# Level-based formatting
# Sensitive data filtering

# Startup banner
def log_startup_banner(logger, title, url):
    """Display startup banner"""
```

### 6. Market Price Protection (mpp_slab.py)

```python
def calculate_protected_price(price, action, symbol, instrument_type, tick_size):
    """Convert MARKET to protected LIMIT price"""

# Protection slabs:
# Equity/Futures: < 100 (2%), 100-500 (1%), > 500 (0.5%)
# Options: < 10 (5%), 10-100 (3%), 100-500 (2%), > 500 (1%)

def round_to_tick_size(price, tick_size):
    """Round to valid tick size"""
```

### 7. Number Formatter (number_formatter.py)

```python
def format_indian_number(value):
    """Format using Indian numbering"""
    # 10000000 → 1.00Cr
    # 9978000 → 99.78L

def format_indian_currency(value):
    """Format as Indian currency"""
    # 10000000 → ₹1.00Cr
```

### 8. Constants (constants.py)

```python
# Valid exchanges
VALID_EXCHANGES = [
    'NSE', 'NFO', 'CDS', 'BSE', 'BFO',
    'BCD', 'MCX', 'NCDEX', 'NCO',
    'NSE_INDEX', 'BSE_INDEX', 'MCX_INDEX', 'GLOBAL_INDEX',
    'CRYPTO'
]

# Derivative-capable exchanges, and the crypto family
FNO_EXCHANGES = {'NFO', 'BFO', 'MCX', 'CDS', 'BCD', 'NCDEX', 'NCO', 'CRYPTO'}
CRYPTO_EXCHANGES = {'CRYPTO'}
CRYPTO_BROKERS = {'deltaexchange'}

# Valid products
VALID_PRODUCT_TYPES = ['CNC', 'NRML', 'MIS']

# Valid price types
VALID_PRICE_TYPES = ['MARKET', 'LIMIT', 'SL', 'SL-M']

# Valid actions
VALID_ACTIONS = ['BUY', 'SELL']

# Required fields for orders
REQUIRED_ORDER_FIELDS = [
    'apikey', 'strategy', 'symbol',
    'exchange', 'action', 'quantity'
]
```

### 9. Environment Validation (env_check.py)

```python
def load_and_check_env_variables():
    """Load and validate .env, or exit the process.

    Returns None. On any failure it prints a remediation
    message and calls sys.exit(1); it does not return an
    error list.
    """
    # Checks:
    # - ENV_CONFIG_VERSION against .sample.env
    # - Required variables present
    # - Valid formats (rate limits, ports, times, URLs)
    # - Broker API key formats for 5paisa/Flattrade/Dhan
    # - REDIRECT_URL broker name against VALID_BROKERS
    # Side effects on first run:
    # - Rotates placeholder APP_KEY / API_KEY_PEPPER
    # - Generates FERNET_SALT and re-encrypts stored secrets
```

### 10. Latency Monitor (latency_monitor.py)

```python
class LatencyTracker:
    """Track API latency stage by stage"""

    def start_stage(self, stage_name):
        """Open a named stage: validation, broker_request, broker_response"""

    def end_stage(self):
        """Close the currently open stage"""

    def get_total_time(self):
        """Total elapsed milliseconds"""

    def get_rtt(self):
        """Broker round-trip milliseconds"""

    def get_overhead(self):
        """Total minus broker RTT"""

@track_latency('placeorder')
def api_endpoint():
    """Decorator for latency tracking"""

def init_latency_monitoring(app):
    """Wrap RESTX resources and register the monitoring hooks"""
```

### 11. Plugin Loader (plugin_loader.py)

```python
def load_broker_auth_functions(broker_directory="broker"):
    """Return a lazy dict of broker name -> auth function.

    Discovery only walks the directory. Each broker's
    broker.<name>.api.auth_api module is imported on first
    access, so startup never pays for 37 broker imports.
    """

def load_broker_capabilities(broker_directory="broker"):
    """Cache every broker's plugin.json in memory at startup"""

def get_broker_capabilities(broker_name):
    """Read one broker's cached capability metadata"""
```

### 12. Ngrok Manager (ngrok_manager.py)

```python
def start_ngrok_tunnel(port):
    """Start ngrok tunnel"""
    # Kill existing processes
    # Set auth token
    # Connect with optional custom domain

def get_ngrok_url():
    """Get current ngrok URL"""

def cleanup_ngrok():
    """Gracefully disconnect tunnel"""
```

### 13. Email Utilities (email_utils.py)

```python
def send_test_email(recipient_email, sender_name):
    """Send test email for SMTP verification"""
    # Modern HTML template
    # Returns success/error with details
```

### 14. API Analyzer (api_analyzer.py)

```python
def generate_order_id():
    """Generate sequential order ID"""
    # Format: YYMMDDXXXXX

def validate_symbol(symbol, exchange):
    """Check symbol exists in database"""

def analyze_api_request(order_data):
    """Validate API request before processing"""
```

## Usage Examples

### Using Logger

```python
from utils.logging import get_logger

logger = get_logger(__name__)

logger.info("Order placed successfully")
logger.error("Broker connection failed")
logger.debug("Request data: %s", data)
```

### Using Session Decorator

```python
from utils.session import check_session_validity

@bp.route('/dashboard')
@check_session_validity
def dashboard():
    return render_template('dashboard.html')
```

### Using HTTP Client

```python
from utils.httpx_client import get_httpx_client

client = get_httpx_client()
response = client.post(url, json=data)
```

### Using Constants

```python
from utils.constants import VALID_EXCHANGES, VALID_ACTIONS

def validate_order(data):
    if data['exchange'] not in VALID_EXCHANGES:
        return False, "Invalid exchange"
    if data['action'].upper() not in VALID_ACTIONS:
        return False, "Invalid action"
    return True, "Valid"
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `auth_utils.py` | Authentication helpers |
| `session.py` | Session management |
| `logging.py` | Logging configuration |
| `httpx_client.py` | HTTP client |
| `constants.py` | Order constants |
| `config.py` | Config helpers |
| `ip_helper.py` | IP resolution |
| `latency_monitor.py` | Performance tracking |
