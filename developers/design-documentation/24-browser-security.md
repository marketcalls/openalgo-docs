# 24 - Browser Security

## Overview

OpenAlgo implements browser-side security measures including session management, CSRF protection, secure cookies, and content security policies.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-browser-security-layers.png" alt="Browser request path: WSGI IP-ban middleware, CSRFProtect, session expiry check, session route, security headers, secure cookies"><figcaption></figcaption></figure>

## Session Management

### Session Lifecycle

<figure><img src="../../.gitbook/assets/diagram-browser-security-session-lifecycle.png" alt="Session lifecycle: password login, optional TOTP, broker auth or resume, active validation per request, expiry at daily boundary or logout clears session"><figcaption></figcaption></figure>

### Session Expiry Configuration

```bash
# .env
SESSION_EXPIRY_TIME = '03:00'      # daily expiry, IST (code default 03:00)
DISABLE_SESSION_EXPIRY = 'false'   # 'true' for 24/7 crypto deployments
```

`is_session_valid()` in `utils/session.py` expires a session when the current IST time is past today's boundary and the login happened before it. `app.py` also registers a `check_session_expiry` `before_request` guard that skips static assets, `/assets/`, `/api/`, and the public routes.

### Session Validation

```python
from utils.session import check_session_validity

@bp.route('/dashboard')
@check_session_validity
def dashboard():
    # Only accessible with valid session
    return render_template('dashboard.html')
```

## Cookie Security

### Secure Cookie Settings

```python
# app.py
USE_HTTPS = HOST_SERVER.startswith("https://")
session_cookie_name = os.getenv("SESSION_COOKIE_NAME", "session")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,      # No JavaScript access
    SESSION_COOKIE_SAMESITE="Lax",     # CSRF protection
    SESSION_COOKIE_SECURE=USE_HTTPS,   # Secure only when HOST_SERVER is https
    SESSION_COOKIE_NAME=session_cookie_name,
)

if USE_HTTPS:
    app.config["SESSION_COOKIE_NAME"] = f"__Secure-{session_cookie_name}"
```

`PERMANENT_SESSION_LIFETIME` is not a fixed 24 hours: `handle_auth_success()` sets it per login from `get_session_expiry_time()`, so the cookie expires at the next `SESSION_EXPIRY_TIME` boundary. The CSRF cookie mirrors the same flags: `WTF_CSRF_COOKIE_HTTPONLY`, `WTF_CSRF_COOKIE_SAMESITE="Lax"`, `WTF_CSRF_COOKIE_SECURE=USE_HTTPS`, name from `CSRF_COOKIE_NAME` (default `csrf_token`, prefixed `__Secure-` on HTTPS). CSRF protection itself is toggled by `CSRF_ENABLED` (default `TRUE`) and `CSRF_TIME_LIMIT` is unlimited unless set.

### Cookie Flags Explained

| Flag | Purpose |
|------|---------|
| Secure | Only sent over HTTPS, and only enabled when `HOST_SERVER` is an `https://` URL |
| HttpOnly | Cannot be read by JavaScript |
| SameSite=Lax | Prevents CSRF in most cases |
| `__Secure-` name prefix | Added automatically on HTTPS installs |

## Password Security

### Argon2 Hashing

Hashing lives on the `User` model in `database/user_db.py`. The pepper is the full `API_KEY_PEPPER` value, not a slice of `APP_KEY`, and `PasswordHasher()` is used with its library defaults.

```python
# database/user_db.py
ph = PasswordHasher()
PASSWORD_PEPPER = os.getenv("API_KEY_PEPPER")  # module refuses to import if unset or < 32 chars


class User(Base):
    def set_password(self, password):
        self.password_hash = ph.hash(password + PASSWORD_PEPPER)

    def check_password(self, password):
        try:
            ph.verify(self.password_hash, password + PASSWORD_PEPPER)
            if ph.check_needs_rehash(self.password_hash):
                self.set_password(password)
                db_session.commit()
            return True
        except VerifyMismatchError:
            return False
```

### Password Requirements

```python
# utils/auth_utils.py
def validate_password_strength(password):
    """Returns (is_valid, error_message or None)"""
    if not password:
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least 1 uppercase letter (A-Z)"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least 1 lowercase letter (a-z)"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least 1 number (0-9)"
    if not re.search(r"[!@#$%^&*]", password):
        return False, "Password must contain at least 1 special character (!@#$%^&*)"
    return True, None
```

The accepted special characters are exactly `!@#$%^&*`. On success the second element is `None`, not a message.

## Login Rate Limiting

### Configuration

```bash
# .env
LOGIN_RATE_LIMIT_MIN = "5 per minute"    # code default: 5 per minute
LOGIN_RATE_LIMIT_HOUR = "25 per hour"    # code default: 25 per hour
RESET_RATE_LIMIT = "15 per hour"         # code default: 15 per hour
```

### Implementation

```python
# limiter.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    strategy="moving-window",
)

# blueprints/auth.py
LOGIN_RATE_LIMIT_MIN = os.getenv("LOGIN_RATE_LIMIT_MIN", "5 per minute")
LOGIN_RATE_LIMIT_HOUR = os.getenv("LOGIN_RATE_LIMIT_HOUR", "25 per hour")


@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit(LOGIN_RATE_LIMIT_MIN)
@limiter.limit(LOGIN_RATE_LIMIT_HOUR)
def login():
    ...
```

The limiter keys on `get_remote_address`, which is Werkzeug's `request.remote_addr`, not on the `TRUST_PROXY_HEADERS`-aware `get_real_ip()` helper used by the IP-ban and audit paths. `POST /auth/login/totp` and `POST /auth/broker` carry the same two login limits.

## TOTP Two-Factor Authentication

### Setup Flow

<figure><img src="../../.gitbook/assets/diagram-browser-security-totp-setup.png" alt="TOTP setup: secret generated and encrypted at account setup, QR first shown on the Profile page after login, 2FA enabled via POST /auth/2fa/configure with a valid current code"><figcaption></figcaption></figure>

### TOTP Validation

```python
# database/user_db.py
class User(Base):
    def get_totp_secret(self):
        """Decrypt the at-rest Fernet ciphertext. The only supported reader."""
        return safe_decrypt_token(self.totp_secret) or self.totp_secret

    def verify_totp(self, token):
        return pyotp.TOTP(self.get_totp_secret()).verify(token)
```

The `totp_secret` column holds Fernet ciphertext, so `pyotp` must be handed `get_totp_secret()` rather than the raw column. See `50-totp-configuration.md` for the master switch and the three purpose flags.

## Token Revocation

### On Logout

```python
# utils/session.py
def revoke_user_tokens(revoke_db_tokens=True):
    """Revoke auth tokens for the current user when the session expires.

    revoke_db_tokens=False clears local caches only, preserving the API key.
    """
    username = session.get("user")

    # 1. Drop the auth and feed token cache entries first
    # 2. Multi-device guard: if another device re-authenticated after today's
    #    rollover, drop only this device's active_sessions row and return,
    #    so the shared broker token and its WebSocket feed survive
    # 3. Publish ZeroMQ cache invalidation for the WebSocket proxy process
    # 4. Clear the symbol cache, revoke in the DB, broadcast force_logout
```

The teardown is deliberately conditional. A stale cookie hitting the daily rollover must not revoke a broker token that a second device has already refreshed, so `_has_fresher_session()` short-circuits the global teardown.

### On Session Expiry

```python
@check_session_validity
def protected_route():
    """Automatically revokes tokens if session expired"""
    pass
```

## React Frontend Security

### API Key Handling

```typescript
// Never expose API key in browser
// Use session-based auth for web UI
// API keys only for external integrations

// Secure API call
const response = await fetch('/api/v1/positionbook', {
    method: 'POST',
    credentials: 'include',  // Send session cookie
    headers: {
        'Content-Type': 'application/json'
    }
});
```

### AJAX Request Detection

```python
# utils/auth_utils.py
def is_ajax_request():
    """Check if the current request is an AJAX/fetch request from React."""
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return True
    if "application/json" in request.headers.get("Accept", ""):
        return True
    if request.method == "POST" and "multipart/form-data" in request.headers.get("Content-Type", ""):
        # React form submissions use FormData
        return True
    return False
```

`check_session_validity` uses its own slightly wider test (it also accepts `request.is_json` and an `application/json` content type) to decide between a 401 JSON body and a redirect to the login page.

## Security Headers

### Recommended Headers

`csp.py` installs a single `after_request` hook that applies both the CSP header and the fixed header set.

```python
# csp.py, get_security_headers()
headers["X-Frame-Options"] = "DENY"                # hard-coded, not SAMEORIGIN
headers["X-Content-Type-Options"] = "nosniff"      # hard-coded
headers["X-XSS-Protection"] = "1; mode=block"      # hard-coded
headers["Referrer-Policy"] = os.getenv("REFERRER_POLICY", "strict-origin-when-cross-origin")
headers["Permissions-Policy"] = os.getenv(
    "PERMISSIONS_POLICY",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), "
    "screen-wake-lock=(), web-share=()",
)
```

`REFERRER_POLICY` and `PERMISSIONS_POLICY` are read from the environment but are not listed in `.sample.env`, so most installs run on the code defaults above.

### Content Security Policy

`CSP_ENABLED` defaults to `TRUE`. When `CSP_REPORT_ONLY=TRUE` the policy is emitted as `Content-Security-Policy-Report-Only` instead. A CSP already set by the route handler is left alone, which is what lets the Remote MCP `/oauth/authorize` consent page widen `form-action` to the registered redirect origin.

Several code defaults are narrower than the values shipped in `.sample.env`, so an install that copies the sample gets the wider policy.

| Directive | Code default (`csp.py`) | `.sample.env` value |
|-----------|-------------------------|---------------------|
| `default-src` | `'self'` | same |
| `script-src` | `'self' https://cdn.socket.io` | `'self' 'unsafe-inline' https://cdn.socket.io https://static.cloudflareinsights.com` |
| `style-src` | `'self' 'unsafe-inline'` | same |
| `img-src` | `'self' data: blob:` | `'self' data:` |
| `connect-src` | `'self' wss: ws:` | `'self' wss: ws: https://cdn.socket.io` |
| `font-src` | `'self'` | same |
| `object-src` | `'none'` | same |
| `media-src` | `'self'` | `'self' data: https://*.amazonaws.com https://*.cloudfront.net` |
| `frame-src` | `'self'` | same |
| `form-action` | `'self'` | same |
| `base-uri` | `'self'` | same |
| `frame-ancestors` | `'self'` | same |

`child-src`, `report-uri`, and `report-to` have no code default and are emitted only when the matching env var is set. `upgrade-insecure-requests` is added only when `CSP_UPGRADE_INSECURE_REQUESTS=TRUE`, which defaults to `FALSE` in both code and `.sample.env`.

### CORS

`cors.py` applies Flask-CORS to `r"/api/*"` only.

| Setting | Code default (`cors.py`) | `.sample.env` value |
|---------|--------------------------|---------------------|
| `CORS_ENABLED` | `FALSE` | `TRUE` |
| `CORS_ALLOWED_ORIGINS` | unset, so no `origins` key | `http://127.0.0.1:5000` |
| `CORS_ALLOWED_METHODS` | unset | `GET,POST,DELETE,PUT,PATCH` |
| `CORS_ALLOWED_HEADERS` | unset | `Content-Type,Authorization,X-Requested-With` |
| `CORS_EXPOSED_HEADERS` | unset | empty |
| `CORS_ALLOW_CREDENTIALS` | `FALSE` | `FALSE` |
| `CORS_MAX_AGE` | unset | `86400` |

When `CORS_ENABLED` is not `TRUE`, `get_cors_config()` returns an empty dict and Flask-CORS falls back to its own defaults for `/api/*`. Every other key is applied only when the env var is present, so an unset variable means "leave it to Flask-CORS", not "deny".

## Session Storage

### What's Stored

The Flask session is a signed, unencrypted client-side cookie, so everything below is readable by whoever holds the cookie.

```python
session["user"] = username            # set by the password step in blueprints/auth.py
session["logged_in"] = True           # set by handle_auth_success() after broker auth
session["broker"] = broker
session["user_session_key"] = user_session_key
session["session_id"] = secrets.token_hex(32)   # matches the active_sessions row
session["login_time"] = now_ist.isoformat()     # IST ISO string, not a datetime
session["FEED_TOKEN"] = feed_token     # only when the broker returns one
session["USER_ID"] = user_id           # only when the broker returns one
session["totp_verified_at"] = ...      # ISO timestamp, freshness for OAuth consent
session["last_heartbeat"] = ...        # throttles the active-session last_seen write
```

### What's NOT Stored

- Passwords (only Argon2 hashes in the DB)
- API keys (hashed and encrypted in the DB)
- The broker auth token. `handle_auth_success()` carries an explicit note that it must never go in the session cookie; `get_auth_token()` reads the encrypted DB copy instead
- Raw password-reset tokens. Only their SHA-256 hash is stored in the session

## Credential Masking

### Display Masking

```python
# utils/auth_utils.py
def mask_api_credential(credential, show_chars=4):
    """Mask credentials for display, returning a fixed-length output."""
    if not credential:
        return ""
    if len(credential) <= show_chars:
        return "*" * 8
    return credential[:show_chars] + "*" * 8


# Example: "abc123def456" -> "abc1********"
```

The suffix is always eight asterisks and no trailing characters are revealed. The fixed length is intentional: it hides the secret's true length, so a screenshot cannot betray which broker a key belongs to, and it bounds the rendered column width. `blueprints/broker_credentials.mask_secret` mirrors this.

## Key Files Reference

| File | Purpose |
|------|---------|
| `utils/session.py` | Session validity, daily expiry, token revocation |
| `utils/auth_utils.py` | Password strength, credential masking, AJAX detection, login success handling |
| `database/user_db.py` | User model, Argon2 hashing, TOTP |
| `blueprints/auth.py` | Auth routes |
| `csp.py` | CSP and the fixed security headers |
| `cors.py` | CORS configuration for `/api/*` |
| `app.py` | Cookie and CSRF configuration, session-expiry guard |
| `frontend/src/api/` | Secure API calls |
