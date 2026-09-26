# Forgot Password

## OpenAlgo Password Reset System

### Overview

OpenAlgo provides a comprehensive dual-mode password reset system that allows users to recover their accounts through either:

1. **TOTP (Time-based One-Time Password)** authentication
2. **Email verification** (requires SMTP configuration)

This system is designed with security best practices and provides fallback options for different scenarios.

### Table of Contents

* System Architecture
* Authentication Methods
* Setup Requirements
* User Flow
* Configuration Guide
* Security Features
* Troubleshooting
* API Endpoints
* Rate Limiting

### System Architecture

The password reset system follows a secure token-based approach with multiple verification methods:

<figure><img src="../.gitbook/assets/diagram-forgot-password-reset-overview.png" alt="Password reset flow: enter email, choose TOTP or email link, receive one-time reset token, set new password, sessions revoked"><figcaption></figcaption></figure>

### Authentication Methods

#### 1. TOTP Authentication (Recommended)

**Advantages:**

* Works offline
* No external dependencies
* Immediate verification
* Always available

**Requirements:**

* User must have TOTP configured
* Authenticator app (Google Authenticator, Authy, etc.)

**Flow:**

1. User enters email address
2. User selects "TOTP Authentication"
3. User enters TOTP code from authenticator app
4. System validates code and allows password reset

#### 2. Email Verification

**Advantages:**

* User-friendly
* No additional app required
* Secure email delivery

**Requirements:**

* SMTP configuration must be completed
* User has access to their email

**Flow:**

1. User enters email address
2. User selects "Email Verification"
3. System sends reset link to user's email
4. User clicks link and resets password

### Setup Requirements

#### TOTP Setup (Always Available)

TOTP is automatically configured during account creation. Each user gets:

* Unique TOTP secret key
* QR code for easy setup
* Backup secret for manual entry

#### SMTP Configuration (Required for Email Reset)

**Personal Gmail Configuration:**

```
SMTP Server: smtp.gmail.com
Port: 587 (STARTTLS) or 465 (SSL/TLS)
Username: your-email@gmail.com
Password: [App Password - NOT regular password]
HELO Hostname: smtp.gmail.com
Use TLS: Yes
```

**Gmail Workspace Configuration:**

```
SMTP Server: smtp-relay.gmail.com
Port: 465 (SSL/TLS)
Username: your-email@yourdomain.com
Password: [App Password]
HELO Hostname: smtp.gmail.com
Use TLS: Yes
```

**App Password Setup for Gmail:**

1. Go to Google Account Settings
2. Navigate to Security → 2-Step Verification
3. Select "App passwords"
4. Generate a new app password for "Mail"
5. Use this password in SMTP configuration

### User Flow

#### Password Reset Process

1. **Initial Request**
   * User visits `/auth/reset-password`
   * Enters email address
   * System validates email format (client-side and server-side)
2. **Method Selection**
   * System presents two verification options:
     * TOTP Authentication (always available)
     * Email Verification (if SMTP configured)
   * User selects preferred method
3. **TOTP Verification Path**
   * User enters TOTP code from authenticator app
   * System validates code against user's TOTP secret
   * If valid, generates secure reset token
   * User proceeds to password reset form
4. **Email Verification Path**
   * System generates secure reset token
   * Sends password reset email with secure link
   * User clicks link in email
   * System validates token and shows password reset form
5. **Password Reset**
   * User enters new password
   * System validates password meets requirements:
     * Minimum 8 characters
     * At least 1 uppercase letter (A-Z)
     * At least 1 lowercase letter (a-z)
     * At least 1 number (0-9)
     * At least 1 special character (@#$%^&\*)
   * Password is hashed and stored securely
   * All reset tokens are invalidated

### Configuration Guide

#### SMTP Configuration

Access SMTP settings at `/auth/change` → "SMTP Configuration" tab:

1. **Server Settings**
   * Enter SMTP server hostname
   * Set appropriate port (587 for STARTTLS, 465 for SSL/TLS)
   * Configure HELO hostname
2. **Authentication**
   * Enter username (usually email address)
   * Enter App Password (not regular password for Gmail)
   * Set from email address
3. **Security**
   * Enable TLS/SSL encryption
   * Test configuration before saving
4. **Testing**
   * Use "Send Test" to verify configuration
   * Use "Debug" for detailed connection diagnostics

#### TOTP Configuration

Access TOTP settings at `/auth/change` → "TOTP Authentication" tab:

1. **QR Code Setup**
   * Scan QR code with authenticator app
   * Or manually enter the secret key
2. **Supported Apps**
   * Google Authenticator
   * Authy
   * Microsoft Authenticator
   * 1Password
   * Bitwarden
3. **Backup**
   * Save secret key in secure location
   * Test TOTP generation before relying on it

### Security Features

#### Token Security

* **Cryptographically secure tokens**: 32-byte URL-safe tokens
* **Session-based validation**: Tokens stored in server-side sessions
* **Single-use tokens**: Tokens invalidated after successful use
* **Time-limited validity**: Email tokens expire with session
* **Secure transmission**: HTTPS-only token delivery

#### Anti-Enumeration Protection

* **Consistent responses**: Same response regardless of email existence
* **Information leakage prevention**: No indication if email is registered
* **Rate limiting**: Prevents brute force attacks

#### Additional Security Measures

* **CSRF protection**: All forms protected with CSRF tokens
* **Input validation**: Email format and password strength validation
* **Secure password hashing**: Bcrypt with proper salt rounds
* **Session security**: Secure session cookie configuration

### Troubleshooting

#### Common SMTP Issues

**Gmail Authentication Failed**

```
Error: SMTP Authentication failed
Solution: Use App Password instead of regular password
Steps: Google Account → Security → 2-Step Verification → App passwords
```

**Gmail Workspace Relay Denied**

```
Error: Mail relay denied
Solution 1: Register server IP in Google Admin Console
Solution 2: Switch to personal Gmail settings (smtp.gmail.com:587)
```

**Connection Timeout**

```
Error: Connection timeout
Check: Firewall blocking SMTP ports (587, 465)
Check: Network connectivity to SMTP server
```

**SSL/TLS Errors**

```
Error: SSL handshake failed
Solution: Verify port configuration (587=STARTTLS, 465=SSL/TLS)
Check: Certificate validation settings
```

#### Common TOTP Issues

**Invalid TOTP Code**

```
Issue: Code not accepted
Check: Time synchronization on device
Check: Code not expired (30-second window)
Solution: Manually sync time in authenticator app
```

**Lost Authenticator Device**

```
Issue: Cannot generate TOTP codes
Solution: Use backup secret key to reconfigure
Fallback: Contact administrator for manual reset
```

#### Email Delivery Issues

**Email Not Received**

```
Check: Spam/junk folder
Check: Email address typos
Check: SMTP server logs
Verify: Test email functionality works
```

**Reset Link Expired**

```
Issue: "Invalid or expired reset link"
Cause: Session expired or link already used
Solution: Request new password reset
```

### Locked Out: Command-Line Password Reset

#### Try this first

If you cannot log in and you have neither working SMTP nor an enrolled authenticator app, OpenAlgo ships a command-line reset. It sets a new password without touching any of your data:

```bash
cd openalgo
uv run python upgrade/reset_admin_password.py
```

Stop OpenAlgo before running it. A live process caches the user row for 30 seconds and keeps accepting the old password until that expires.

Use `--list` to see the accounts on the install, and `--username` to pick one:

```bash
uv run python upgrade/reset_admin_password.py --list
uv run python upgrade/reset_admin_password.py --username yourname
```

If the script reports that stored secrets no longer decrypt, your `API_KEY_PEPPER` changed after the account was created. The reset still gets you logged in, but broker tokens, the stored API key and TOTP secrets were encrypted under the old pepper and cannot be recovered: log in to the broker again and regenerate the API key at `/apikey`. If you still have a backup of the original `.env`, restoring its `API_KEY_PEPPER` and `FERNET_SALT` lines recovers everything instead, including the old password.

#### Diagnose the database first

If something looks wrong beyond the password itself, run the diagnostic. It is safe to run at any time and changes nothing that already exists:

```bash
uv run python upgrade/init_db.py
```

It reports which database file the install is actually using, whether a relative `DATABASE_URL` plus an unexpected working directory has produced a second empty database, whether the tables and an account exist, and whether stored credentials still decrypt with the current `API_KEY_PEPPER` and `FERNET_SALT`. A pepper mismatch is the usual cause of "Invalid credentials" on a password you know is correct, and it is invisible from the login page.

Stop OpenAlgo first. Historify is DuckDB and allows a single writer, so that one check reports a lock failure while the app is running.

### Last Resort: Complete Database Reset

#### When All Else Fails

Only if the command-line reset above cannot help (for example the database file itself is corrupt): \
\
1\)stop openalgo application \
2\)Locate the file openalgo.db from the db folder\
3\)delete the openalgo.db database file form the /db folder \
4\)restart the openalgo application\
5\)Start signup with openalgo fresh\
6\)Ensure Gmail SMTP Settings or TOTP Authenticator is Configured

<figure><img src="../.gitbook/assets/image (112).png" alt=""><figcaption></figcaption></figure>

#### What You Will Lose

**WARNING: This action is irreversible and will permanently delete:**

* **User accounts and passwords**
* **All trading logs and history**
* **API access logs and analytics**
* **Strategy configurations and backtests**
* **SMTP/email settings**
* **Rate limiting history**
* **System settings and preferences**
* **Custom configurations**



#### Prevention for Future

To avoid needing database reset:

1. **Save TOTP Secret Key**: Store authenticator backup codes securely
2. **Configure SMTP Early**: Set up email recovery before you need it
3. **Document Credentials**: Keep encrypted record of important settings
4. **Regular Backups**: Schedule automatic database backups
5. **Test Recovery**: Periodically test password reset functionality

#### Alternative Recovery Methods

Before resorting to database reset, try these:

1. **Command-line reset**: `uv run python upgrade/reset_admin_password.py` (see above). This is the supported path and should be your first move.
2. **Database diagnostic**: `uv run python upgrade/init_db.py` reports whether the real problem is a pepper mismatch or the wrong database file.
3. **TOTP secret recovery**: If you saved the original secret key, re-add it to your authenticator.
4. **Backup restoration**: If you have a recent database backup, restore it along with the `.env` it was created with. The database and its `API_KEY_PEPPER` and `FERNET_SALT` must match.



### Rate Limiting

The password reset system implements rate limiting to prevent abuse:

#### Configuration

```env
# Login rate limits (applied to reset password as well)
LOGIN_RATE_LIMIT_MIN=5 per minute
LOGIN_RATE_LIMIT_HOUR=25 per hour

# Password reset specific limit
RESET_RATE_LIMIT=15 per hour
```

#### Limits Applied

* **Password reset requests**: 15 per hour per IP
* **SMTP test requests**: Inherits from login limits
* **Failed authentication attempts**: Tracked separately

#### Rate Limit Headers

When rate limited, responses include:

* `X-RateLimit-Limit`: Maximum requests allowed
* `X-RateLimit-Remaining`: Requests remaining in window
* `X-RateLimit-Reset`: Time when limit resets

### Best Practices

#### For Users

1. **TOTP Setup**: Always configure TOTP as primary recovery method
2. **Backup Codes**: Save TOTP secret key securely
3. **Email Security**: Use secure email provider with 2FA
4. **Strong Passwords**: Follow password requirements strictly

####
