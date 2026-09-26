# 20 - Design Principles

## Code Is Authoritative

Registered routes, schemas, service behavior, and broker capability metadata are the source of truth. The [API documentation](../../api-documentation/v1/README.md) records the public contract because Flask-RESTX Swagger UI is intentionally disabled.

Examples in design pages explain boundaries; they are not substitute implementations.

## Broker-Agnostic Contract

The public API remains stable across the current 36 broker plugins: 34 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin for paper trading. Each plugin maps OpenAlgo symbols, products, actions, and price types into its broker's contract, then normalizes broker responses back into OpenAlgo shapes.

Plugin presence does not imply that every optional operation, exchange, or WebSocket depth level is supported. `plugin.json` capability metadata and the broker implementation determine the available subset.

## Layer Ownership

<figure><img src="../../.gitbook/assets/diagram-design-principles-layer-ownership.png" alt="Layer ownership: REST resource or session blueprint, validation, service orchestration, then broker, sandbox, database or calculation module, normalized response; Action Center queue and EventBus subscribers as side paths"><figcaption></figcaption></figure>

- Routes own transport concerns: request parsing, authentication, schema errors, and HTTP status.
- Services own mode selection, policy, business sequencing, and normalized results.
- Broker modules own broker-specific request mapping and response transformation.
- Database modules own persistence and query behavior.
- Subscribers own best-effort side effects such as event logging and notifications.

Do not move broker-specific conditionals into shared resources when a plugin mapping or capability can express the difference.

## Mode And Risk Boundaries

Analyzer mode routes supported execution and account state into the sandbox subsystem. Live mode resolves the active broker session. The two persistence domains remain isolated.

Semi-auto mode can queue eligible operations in Action Center instead of executing them immediately. Destructive and unsupported operations must follow each service's explicit policy rather than assuming every order route can be deferred.

Risk-reducing workflows must not create exposure. Close-position and scalping exits derive the opposite action from current position state, and server validation remains authoritative even when the UI has already validated the request.

## Process-Aware State

OpenAlgo's production deployment uses Gunicorn with one eventlet worker per instance, while some components run in a child process or OS thread. Process-local caches, singletons, and the EventBus are not cross-process coordination mechanisms.

Cross-process market data and selected cache invalidation use a fixed ZeroMQ fan-in topology: the proxy SUB socket binds, and publisher sockets connect. Persisted state is used when behavior must survive navigation, restart, or process boundaries.

## Persistence Discipline

OpenAlgo uses six primary configured stores: five SQLite workloads and Historify DuckDB. `database/engine_factory.py` gives every SQLite engine `NullPool` (non-SQLite backends get a normal pool), and scoped sessions are removed during request teardown. New persistence modules must either join the `SCOPED_SESSION_MODULES` inventory in `utils/db_sessions.py` or use a context-managed lifecycle that closes every connection.

Schema changes use idempotent initialization and targeted migrations rather than a general Alembic layer. Changes must work for both fresh and existing databases.

## Security Defaults

- API keys are verified with Argon2 plus `API_KEY_PEPPER`; retrievable key material and broker tokens are encrypted with Fernet-derived helpers.
- Session routes retain CSRF protection except for reviewed broker callbacks, webhooks, broker postbacks, and health exemptions. `auth.logout` is deliberately kept under CSRF protection because it revokes broker tokens and tears down the shared feed.
- Public `/api/v1` routes are CSRF-exempt because they authenticate with the OpenAlgo API key.
- CORS, CSP, cookie security, proxy trust, IP bans, and rate limits are explicit configuration boundaries.
- Secrets, tokens, and full sensitive arguments must not enter normal logs.
- Remote MCP is opt-in, refuses debug mode, and enforces OAuth scopes for each tool.

## Failure Behavior

Validation and policy errors should be returned before broker execution. Broker failures remain visible as normalized errors; they must not be converted into false success. Best-effort notifications or event subscribers may fail without changing an already-determined trading result, but persistence required by the operation is not treated as optional background work.

Background services need explicit start, stop, retry, and cleanup behavior. A task should not be launched from request code when application startup owns its lifecycle.

## Change Rules

1. Add or change schemas before relying on new request fields.
2. Keep the REST inventory and endpoint page synchronized with route registration.
3. Update broker capability metadata when behavior varies by plugin.
4. Cover shared service or schema changes across live and analyzer paths where both apply.
5. Verify teardown and process ownership when introducing caches, sockets, schedulers, or database sessions.
6. Preserve sensitive-field redaction in logs, events, audits, and exceptions.

## Related Pages

- [Backend Architecture](02-backend-architecture.md)
- [Service Layer](27-service-layer.md)
- [Security Architecture](database-layer.md)
- [Database Structure](18-database-structure.md)
- [WebSockets Architecture](authentication-platforms.md)
- [Event Bus](53-event-bus.md)
