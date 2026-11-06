# Security Architecture

OpenAlgo is a self-hosted trading application. Its controls protect the application boundary, but operators remain responsible for host security, TLS, proxy configuration, secret handling, backups, and broker-account controls.

### Authentication and Sessions

* Application passwords are Argon2-hashed with the installation pepper.
* TOTP can be required independently for login, Remote MCP write authorization, and password reset.
* Application sessions use HTTP-only, SameSite cookies; the Secure attribute is enabled for HTTPS deployments.
* A user can have at most five active application sessions.
* Session-status polling refreshes `last_seen` no more than once every 30 seconds.
* Broker-session expiry preserves a valid application session and redirects the user to reconnect the broker.
* Password changes revoke active device sessions.

The application session and the installation-wide active broker session are distinct.

### API Keys and Broker Tokens

OpenAlgo generates one current 64-character hexadecimal API key per user. The database stores an Argon2 hash for verification and an encrypted copy for authenticated retrieval. Regenerating the key invalidates the previous value immediately.

Broker authentication/feed tokens and broker keys saved through **Broker Configuration** are encrypted before database storage. A configured `.env` broker still takes precedence for its own keys, and those file values are not database-encrypted secrets; protect `.env` with host permissions and exclude it from source control and support bundles. Back up the original installation secrets with the database.

Broker login begins with a CSRF-protected server request and a single-use pending login. The return must match that started login, using the browser marker or broker-returned state as required. A failed new login leaves the existing broker session in place; a completed switch ends the old broker session. See [Broker Configuration](../connect-brokers/broker-configuration.md).

Most `/api/v1` routes require `apikey` in the JSON body. The REST namespace is exempt from browser CSRF because it uses API-key authentication, while session-authenticated state-changing routes retain CSRF protection unless explicitly exempted for a documented callback or webhook.

### Request Boundary and IP Controls

`SecurityMiddleware` checks the resolved client IP against bans stored in `logs.db` before Flask handles a request. Automatic banning is disabled by default. Current persisted defaults are:

| Setting | Default |
| --- | ---: |
| 404 threshold in 24 hours | 100 |
| 404 ban duration | 0 hours (permanent) |
| Invalid-key threshold in 24 hours | 100 |
| Invalid-key ban duration | 0 hours (permanent) |
| Repeat-offender limit | 2 bans |

The dashboard can change these values and enable automatic banning. Localhost addresses are excluded from automatic bans.

`TRUST_PROXY_HEADERS` is false by default. Enable it only when a controlled reverse proxy is the sole route to OpenAlgo; otherwise a direct client can spoof forwarded IP headers. The application does not implement a CIDR allowlist.

### Browser and Transport Controls

OpenAlgo configures CSRF, CORS, CSP, referrer, permissions, frame, and related response headers in the application. Public deployments should terminate TLS at a maintained reverse proxy and restrict direct access to Flask, WebSocket, and ZeroMQ ports.

Security cookies become HTTPS-only when the configured public URL uses HTTPS. A misconfigured HTTP deployment does not gain transport security merely because the application supports secure-cookie settings.

### Traffic and Audit Data

Traffic logging stores metadata: timestamp, client IP, method, path, status, duration, host, optional middleware error, and user ID when available. It does not store request bodies, response bodies, headers, user agents, or a processing timeline.

Order, analyzer, login, MCP, latency, health, and notification domains have their own event or persistence paths. No single traffic table is a complete audit trail of every application action.

### WebSocket and MCP Boundaries

The public market-data WebSocket requires an OpenAlgo API-key authentication message within the configured grace period. Subscription capacity, queue size, ping interval, and timeout are bounded by configuration. The internal ZeroMQ endpoint is unauthenticated and must remain private.

Remote MCP is opt-in. Its OAuth implementation uses exact redirect-URI validation, S256-only PKCE, signed access tokens, refresh-token rotation, and token-family revocation when refresh-token reuse is detected. `.sample.env` keeps the transport off but has approval off and write scope enabled if only the master switch is changed; the Docker helper applies the stricter inverse. Write scope can require fresh TOTP.

### Data Stores

OpenAlgo uses five SQLite databases and one DuckDB store. Isolation limits unrelated lock contention and persistence scope; it is not database-wide encryption. Back up and protect all six stores together with `.env`, Fernet salt/key material, and MCP signing keys.

### Operational Baseline

1. Use the supported installer and keep OpenAlgo, the OS, reverse proxy, and dependencies updated.
2. Enable TLS and TOTP before exposing a deployment publicly.
3. Keep `TRUST_PROXY_HEADERS` off unless the proxy boundary is enforced.
4. Protect `.env`, databases, keys, strategy files, and backups.
5. Review `/logs/security`, `/logs/traffic`, login activity, and broker activity after unexpected events.
6. Test automatic-ban thresholds before enabling permanent bans.
7. Retain direct access to the broker terminal and host console for incident response.
