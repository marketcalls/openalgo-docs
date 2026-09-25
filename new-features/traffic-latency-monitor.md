# Traffic and Latency Monitoring

OpenAlgo provides separate views for HTTP traffic metadata and measured API/order latency.

### Traffic Monitor

Open **Logs > Traffic** or visit `/logs/traffic`.

The traffic table stores:

* timestamp;
* client IP;
* HTTP method and path;
* response status;
* middleware duration;
* request host;
* an unhandled error field, when present.

It does **not** store request bodies, response bodies, headers, user agents, or a processing timeline. This avoids persisting API keys and order payloads in the traffic table.

Summary panels show total requests, errors, average duration, and selected endpoint statistics. Filters can limit the view to all traffic or `/api/v1` traffic and to all, successful, or error responses. CSV export contains the same stored metadata.

Traffic rows live in `logs.db`. `TRAFFIC_LOG_RETENTION_DAYS` defaults to 30 days in `.sample.env`, and expired rows are purged when logging initializes.

### Latency Monitor

Open the Latency page to review timing records produced by instrumented OpenAlgo operations. The view is useful for comparing observed request durations and identifying changes on the actual deployment.

<figure><img src="../.gitbook/assets/openalgo-ui-latency.png" alt="Order latency monitor"><figcaption></figcaption></figure>

Latency depends on host load, network distance, broker response time, market conditions, connection reuse, and the operation being measured. The monitor reports observations; it does not guarantee an execution time or isolate exchange latency from every other component.

### Security Boundary

Both dashboards require an authenticated application session. Proxy-derived client IPs are trusted only when `TRUST_PROXY_HEADERS` is enabled; use that setting only behind a controlled reverse proxy.
