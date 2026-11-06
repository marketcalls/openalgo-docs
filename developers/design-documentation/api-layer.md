# 03 - Login And Broker Flow

## Two Authentication Layers

OpenAlgo separates the local application session from the broker session.

1. The user authenticates to the self-hosted app with username/password and optional TOTP.
2. The user selects a broker and completes that broker's auth flow, or resumes an existing valid broker token.
3. External `/api/v1` clients use the OpenAlgo API key, which resolves the active broker token server-side.

A broker token can expire while the app cookie remains valid. In that state the UI must offer broker reconnect rather than hard-logging the user out.

## App Login

`blueprints/auth.py` owns setup, password login, TOTP promotion, session status, password changes, and logout. Successful login can resume an existing broker session through `_try_resume_broker_session`; otherwise it sends the user to broker selection.

When login TOTP is required, the password step stores a short-lived `pending_totp_user` rather than establishing `session["user"]`. A correct `/auth/login/totp` request promotes it to an authenticated session and records `totp_verified_at` for sensitive downstream authorization such as Remote MCP write consent.

## Broker Discovery And Auth

`utils/plugin_loader.py` reads `broker/*/plugin.json` and lazy-loads `broker.<key>.api.auth_api`. Generic callbacks are handled by `blueprints/brlogin.py`; specialized routes support brokers that need extra OTP, TOTP, or credential steps.

The current plugin inventory is 38. `GET /api/broker/list` supplies enabled brokers, setup hints, required fields, sign-in method, masked saved values, and active/configured status from `VALID_BROKERS` and `utils/broker_setup_guide.py`.

`/broker` and `/broker/config` work after app sign-in, before broker login. `POST /auth/broker/login` is CSRF-checked and starts the chosen broker's login on the server. Its callback must match a one-use pending login, which expires after ten minutes. `POST /auth/broker/resume` lets another device join the existing broker session after token validation. See [broker keys and configuration](51-broker-and-system-config.md).

Only one broker is active for the installation. A successful new login ends the previous broker session at commit. Running Live Strategy Module/OpenScript runs, and (outside analyzer mode) running Python strategies or protected scalping positions, block a switch until stopped. The same safety applies when replacing or forgetting the active broker's keys.

## Token Storage

| Data | Storage behavior |
|---|---|
| Password | Argon2 hash in the user database |
| OpenAlgo API key | Argon2+pepper verification hash and encrypted retrievable value |
| Saved broker application keys | Fernet ciphertext in `broker_keys`, bound to broker and field |
| Broker auth/feed tokens | Fernet ciphertext derived from installation secrets |
| TOTP secret | Encrypted at rest |
| Browser session | Signed Flask session cookie with host-dependent secure flags |

`upsert_auth()` compares decrypted old and new broker/feed tokens. Fernet encryption is nondeterministic, so ciphertext comparison would be wrong. If the token, feed token, broker, and revoke state are unchanged, a resumed login does not tear down the shared broker WebSocket feed.

## Multi-Session Model

OpenAlgo allows up to five active app sessions for the single configured user. A new row replaces an existing row for the same username and IP; at the cap, the oldest row is removed. Every device shares the installation's one active broker session and server-side market-data feed.

The SPA polls `/auth/session-status`. That route refreshes the current `active_sessions.last_seen` at most once every 30 seconds and reports the current active-session count.

## Broker Expiry And Reconnect

If session status finds a valid app session but no active broker token, it returns:

```json
{
  "status": "success",
  "authenticated": true,
  "logged_in": true,
  "broker_session_expired": true
}
```

It intentionally preserves the app session. Protected dashboard APIs can then return the broker-expired state and the frontend can route the user through `/auth/broker` again.

## Revocation Events

- Logout after broker login ends the shared broker session and clears its active device sessions; pre-broker logout revokes the pre-broker sign-in without ending devices on the active broker session.
- Daily session-expiry handling revokes broker access according to configuration.
- Password change clears every active app session, emits `force_logout`, and clears the current cookie.
- Unchanged multi-device broker resume preserves the shared feed.

See [40 Logout And Session Lifecycle](40-logout-and-session-expiry.md) for the expiry and heartbeat state machine.

## Key Files

| File | Purpose |
|---|---|
| `blueprints/auth.py` | App login, TOTP, session APIs, logout |
| `blueprints/brlogin.py` | Broker callbacks and special login helpers |
| `blueprints/broker_config.py` | Broker list, encrypted key save and forget APIs |
| `blueprints/broker_credentials.py` | Server settings and active-broker capability APIs |
| `utils/broker_keys.py`, `utils/broker_login.py`, `utils/broker_switch.py` | Credential resolution, pending-login validation and safe switching |
| `database/auth_db.py` | Broker tokens, API keys, active sessions, login audit |
| `utils/plugin_loader.py` | Plugin discovery and lazy auth loading |
| `utils/session.py` | Protected-route session validity |
| `frontend/src/components/auth/AuthSync.tsx` | Backend-to-Zustand session synchronization |
