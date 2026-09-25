# API Analyzer

### What Analyzer Mode Does

Analyzer Mode routes supported trading and account operations to OpenAlgo's sandbox instead of the live broker. Simulated orders, trades, positions, holdings, funds, and configuration are stored in the separate `sandbox.db` store.

Market prices still come from the active broker data services. A broker connection and the relevant market-data entitlement may therefore be required. Analyzer Mode is an execution sandbox, not an exchange emulator or portfolio backtesting engine.

### Enable and Verify

Use the mode control in OpenAlgo, or call:

```http
POST /api/v1/analyzer
POST /api/v1/analyzer/toggle
```

Enable with:

```json
{
  "apikey": "<your_app_apikey>",
  "mode": true
}
```

The setting is application-wide for the single-user deployment, not per API key. The toggle API is blocked in semi-auto mode; in that posture the client must change mode from the authenticated UI.

Always verify the current mode before an automated run. Turning Analyzer Mode off returns supported order flows to live broker execution.

### Supported Behavior

* Regular, smart, basket, split, options, and multi-options services use sandbox paths where implemented.
* MARKET orders can complete from current prices; LIMIT, SL, and SL-M orders can remain pending until their conditions are met.
* The execution engine uses WebSocket prices when available and can fall back to polling.
* Position book, holdings, funds, order book, trade book, status, modify, cancel, close, and P&L services use sandbox state where their analyzer branches exist.
* GTT is fully simulated. Place, modify, cancel, and the GTT order book all route to a sandbox GTT engine that holds single-leg and two-leg OCO triggers, blocks margin at placement, and fires a real sandbox order when a leg's trigger price is crossed. HTTP 501 now only appears in live mode, when the active broker ships no GTT module.
* Expired F&O contracts are settled inside the sandbox. `expiry_settlement_timing` chooses between exchange close on expiry day and midnight after expiry, and `option_expiry_settlement` chooses between settling at last traded price (keeping ITM value) and expiring every option worthless.

Broker-specific RMS checks, queue priority, slippage, partial fills, outages, and exchange microstructure can differ from Analyzer results.

### Default Sandbox Configuration

Open `/sandbox` to inspect and update settings. Fresh sandbox databases use:

| Setting | Default |
| --- | ---: |
| Starting capital | INR 10,000,000 |
| Automatic fund reset | Never (disabled) |
| Reset time when enabled | 00:00 IST |
| Pending-order check interval | 5 seconds |
| MTM update interval | 5 seconds |
| NSE/BSE/NFO/BFO MIS square-off | 15:15 IST |
| CDS/BCD MIS square-off | 16:45 IST |
| MCX MIS square-off | 23:30 IST |
| NCDEX MIS square-off | 17:00 IST |
| Equity MIS leverage | 5x |
| Equity CNC leverage | 1x |
| Futures leverage | 10x |
| Option buy leverage | 1x |
| Option sell leverage | 1x |
| Expiry settlement timing | `expiry_day_close` |
| Option expiry settlement price | `ltp` |
| OCO GTT margin mode | `max` (block only the larger leg) |
| GTT claim timeout | 60 seconds |

These values configure the local simulator and can be changed. They are not promises about the active broker's live margin or square-off policy.

<figure><img src="../.gitbook/assets/openalgo-ui-sandbox.png" alt="Sandbox configuration page"><figcaption></figcaption></figure>

### Validation Workflow

1. Confirm `/api/v1/analyzer` reports `analyze_mode: true`.
2. Place one MARKET order and verify order book, trade book, position book, and funds.
3. Place a LIMIT or stop order away from the market and verify pending execution.
4. Exercise modify, cancel, smart, basket, and split flows used by the strategy.
5. Verify square-off and reset configuration instead of assuming defaults.
6. Review sandbox P&L, order events, and errors.
7. Before live use, reduce quantity, verify mode again, and monitor the broker terminal.

<figure><img src="../.gitbook/assets/openalgo-ui-analyzer.png" alt="Sandbox request monitor with request log"><figcaption></figcaption></figure>

### Reset Behavior

The Sandbox page provides manual reset controls and optional scheduled fund resets. A reset affects simulated state only. The default `reset_day` is `Never`, so the system does not perform a weekly reset unless an operator enables one.
