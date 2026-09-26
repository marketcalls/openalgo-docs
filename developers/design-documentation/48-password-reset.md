# 48 - Password Reset

## Overview

OpenAlgo provides a secure multi-step password reset flow that supports both email-based reset tokens and TOTP verification for accounts with 2FA enabled.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-password-reset-flow.png" alt="Password reset sequence: email step, TOTP or emailed-link verification stored as hashed tokens in the Flask session, then password step that rehashes and clears sessions"><figcaption></figcaption></figure>

## Database Schema

There is no password-reset table. No `password_reset_tokens` table and no `PasswordResetToken` model exist anywhere in the codebase. Reset state lives entirely in the signed Flask session cookie for the duration of that session:

| Session key | Holds |
|---|---|
| `reset_email` | The email the flow is bound to |
| `reset_method` | `totp` or `email` |
| `reset_token` | `sha256()` of the token minted by the TOTP or email step |
| `email_reset_token` | `sha256()` of the token carried in the emailed link |

The only durable write a reset performs is the new Argon2 hash on `users.password_hash` and the removal of that user's `active_sessions` rows. See "Actual Token Handling" below.

## Actual Token Handling

### Secure Token Creation

Both reset paths mint the same kind of token and keep only its hash in the session. Flask's session is a signed but unencrypted cookie, so storing the raw token there would let the caller who requested the reset read it straight back out of their own cookie without ever seeing the email it was sent to.

```python
# blueprints/auth.py
def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


token = secrets.token_urlsafe(32)          # 256 bits of entropy, 43 chars
session["reset_token"] = _hash_reset_token(token)
session["reset_email"] = email
```

On the TOTP path the raw token is returned in the JSON response, because the caller has already proven possession of the authenticator. On the email path it is embedded in the link built by `build_external_url(url_for("auth.reset_password_email", token=token))`, which is derived from `HOST_SERVER` rather than `url_for(_external=True)` so a poisoned `Host` header cannot redirect the emailed token to an attacker-controlled origin.

Clicking the link hits `GET /auth/reset-password-email/<token>`, which checks the length (43 characters), constant-time compares the hash against `session["reset_token"]`, then sets `session["email_reset_token"]` and redirects to `/reset-password?token=...&email=...&verified=true`.

### Token Validation

```python
# blueprints/auth.py, step == "password"
submitted = _hash_reset_token(token) if token else ""
valid_token = any(
    stored and secrets.compare_digest(submitted, stored)
    for stored in (session.get("reset_token"), session.get("email_reset_token"))
)
if not valid_token or email != session.get("reset_email"):
    return jsonify({"status": "error", "message": "Invalid or expired reset token."}), 400
```

A missing session entry never counts as a match, and the submitted email must equal the one recorded when the token was issued. There is no `expires_at` column and no `used_at` column: the token lives exactly as long as the Flask session that holds its hash.

## Password Security

### Argon2 Hashing with Pepper

Hashing is a method on the `User` model, and `PasswordHasher()` is constructed with the library defaults rather than explicit cost parameters.

```python
# database/user_db.py
ph = PasswordHasher()
PASSWORD_PEPPER = os.getenv("API_KEY_PEPPER")  # import fails if unset or shorter than 32 chars


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

`utils/auth_utils.validate_password_strength` returns on the first failure and yields a single message, not a list. The accepted special characters are exactly `!@#$%^&*`.

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

## TOTP Integration

### Reset with 2FA

TOTP is not an extra check bolted onto one shared path. It is one of two mutually exclusive methods the user picks at `step == "select_totp"` or `step == "select_email"`, and each mints its own token.

```python
# blueprints/auth.py, step == "totp"
user = find_user_by_email(email)
if user and user.verify_totp(totp_code):
    token = secrets.token_urlsafe(32)
    session["reset_token"] = _hash_reset_token(token)
    session["reset_email"] = email
    return jsonify({"status": "success", "message": "TOTP verified", "token": token})
return jsonify({"status": "error", "message": "Invalid TOTP code. Please try again."}), 400
```

The per-user flag `totp_required_for_password_reset` works as a gate on the other direction: at `step == "select_email"`, an account with `user.is_totp_required_for("password_reset")` is refused the email path with a 400 and told to use the authenticator instead. The check runs only for a known email, so an unknown address still falls through to the generic "sent if the account exists" response and account existence is not leaked.

`User.verify_totp()` decrypts the at-rest secret through `get_totp_secret()`. There is no separate `verify_totp(secret, code)` helper.

## API Endpoints

There are no `/api/auth/...` reset endpoints. The whole flow is one step-dispatched route on `auth_bp` (`url_prefix="/auth"`), plus the email-link handler.

| Method / path | Purpose |
|---|---|
| `GET /auth/reset-password` | Redirects to the React page at `/reset-password` |
| `POST /auth/reset-password` | Step-dispatched reset flow, JSON or form encoded |
| `GET /auth/reset-password-email/<token>` | Validates an emailed token and redirects to the React password step |

`POST /auth/reset-password` is rate limited by `RESET_RATE_LIMIT` (env var, code default `15 per hour`) and requires a CSRF token. The `step` field selects the behaviour.

### step: email

```json
{ "step": "email", "email": "user@example.com" }
```

Stores `reset_email` in the session when the account exists, and returns the same `{"status": "success", "message": "Email verified"}` either way so account existence is not disclosed.

### step: select_totp / select_email

```json
{ "step": "select_email", "email": "user@example.com" }
```

`select_totp` records the method and returns immediately. `select_email` refuses accounts that require TOTP for reset, refuses when no SMTP server is configured, and otherwise mints a token, stores its hash, and sends the reset link.

### step: totp

```json
{ "step": "totp", "email": "user@example.com", "totp_code": "123456" }
```

**Response on success:**
```json
{
    "status": "success",
    "message": "TOTP verified",
    "token": "43-character-url-safe-token"
}
```

### step: password

```json
{
    "step": "password",
    "email": "user@example.com",
    "token": "43-character-url-safe-token",
    "password": "NewSecurePass123!"
}
```

The field is `password`, not `new_password`, and there is no `confirm_password`: the React page checks the confirmation client side.

**Response:**
```json
{
    "status": "success",
    "message": "Your password has been reset successfully."
}
```

## Reset Flow Implementation

### Full Reset Service

```python
# blueprints/auth.py, step == "email"
user = find_user_by_email(email)          # exact match on User.email, no .lower()
if user:
    session["reset_email"] = email
return jsonify({"status": "success", "message": "Email verified"})


# blueprints/auth.py, step == "password", after the token check above
is_valid, error_message = validate_password_strength(password)
if not is_valid:
    return jsonify({"status": "error", "message": error_message}), 400

user = find_user_by_email(email)
if user:
    user.set_password(password)
    db_session.commit()

    # A reset means no other active session for this account can be trusted.
    clear_user_sessions(user.username)
    socketio.emit("force_logout", {
        "message": "Your password was reset. Please log in again with the new password.",
    })

    session.pop("reset_token", None)
    session.pop("reset_email", None)
    session.pop("reset_method", None)
    session.pop("email_reset_token", None)

    return jsonify(
        {"status": "success", "message": "Your password has been reset successfully."}
    )
```

Behaviour the running code does **not** implement:

- No per-email or per-user token counting. The only throttle is the route-level `RESET_RATE_LIMIT`.
- No "must differ from the current password" check.
- No confirmation email after a successful reset.
- No `updated_at` column on `User`.
- Email lookup is an exact match, so the address must be entered with the same case it was registered with.

## Security Measures

### Rate Limiting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Rate Limiting, as implemented                        │
│                                                                             │
│  @limiter.limit(RESET_RATE_LIMIT) on POST /auth/reset-password              │
│  RESET_RATE_LIMIT = os.getenv("RESET_RATE_LIMIT", "15 per hour")            │
│                                                                             │
│  Keyed by remote address through flask_limiter get_remote_address,          │
│  counted in process memory, moving window.                                  │
│                                                                             │
│  There is no per-email counter and no global counter.                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

The limit covers every step of the flow, because all five steps post to the same route. `RESET_RATE_LIMIT` is not in the list `utils/env_check.py` validates, so a malformed value is not caught at startup.

### Audit Logging

There is no `AuditLog` model and password-reset steps are not written to any audit table. The `login_attempts` table exists and is populated by `log_login_attempt()`, but only from the login and TOTP-login paths, not from the reset flow. What a reset leaves behind is:

- Application log lines, for example `Password reset email sent to {email}` and any send failure.
- A `traffic_logs` row per request, carrying the client IP, method, path, status, and duration.
- The removal of every `active_sessions` row for the user, visible on the security dashboard.

### Token Security

| Measure | Implementation |
|---------|---------------|
| Token entropy | 256 bits, `secrets.token_urlsafe(32)`, 43 characters |
| Token storage | SHA-256 hash only, held in the signed Flask session, never in a database |
| Comparison | `secrets.compare_digest`, and a missing session entry never matches |
| Binding | The submitted email must equal `session["reset_email"]` |
| Expiration | No explicit expiry. The token dies with the Flask session that holds its hash |
| Single use | Not marked used. The session keys are popped after a successful reset |
| Link integrity | The emailed URL is built from `HOST_SERVER`, so a poisoned `Host` header cannot redirect it |
| IP logging | Not recorded against the token. Only the generic traffic log captures the IP |
| Throttling | `RESET_RATE_LIMIT`, code default `15 per hour`, keyed on the remote address |

## Frontend Components

### Forgot Password Form

```typescript
function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const csrfToken = await fetchCSRFToken();
    await fetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ step: 'email', email }),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h2>Check Your Email</h2>
        <p>If an account exists with {email}, you'll receive a reset link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}
```

### Reset Password Form

The real page is a single component, `frontend/src/pages/ResetPassword.tsx`, driving a local `Step` state machine of `'email' | 'method' | 'totp' | 'email_sent' | 'password'`. Arriving from an email link with `?token=...&email=...&verified=true` jumps straight to the password step.

```typescript
function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // The confirmation match is checked client side only
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const csrfToken = await fetchCSRFToken();
    await fetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ step: 'password', email, token, password }),
    });

    toast.success('Password reset successful');
    navigate('/login');
  };

  return (
    <form onSubmit={handleSubmit}>
      <PasswordInput
        value={password}
        onChange={setPassword}
        showRequirements
      />
      <PasswordInput
        value={confirmPassword}
        onChange={setConfirmPassword}
        label="Confirm Password"
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `blueprints/auth.py` | Reset endpoints and core logic |
| `database/user_db.py` | User model with password hash |
| `utils/email_utils.py` | Password reset email sending |
| `database/settings_db.py` | SMTP settings for email |
| `frontend/src/pages/ResetPassword.tsx` | Request, TOTP, email-link, and password steps |

> **Note**: Password reset logic is implemented directly in `blueprints/auth.py`. There are no separate `password_reset_db.py` or `password_reset_service.py` files, no `PasswordResetToken` model, and no `password_reset_tokens` table. Only the SHA-256 hash of the token is stored, in the signed Flask session, under `reset_token` for the freshly minted token and `email_reset_token` once an emailed link has been opened.
