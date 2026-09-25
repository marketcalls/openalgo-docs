# Scalping Terminal

The Scalping Terminal is a built-in, session-authenticated OpenAlgo workspace at `/scalping`. It combines contract selection, live prices, market-order entry, order and position books, optional charts, and server-managed stop protection in one browser page. No separate desktop installer or API-key configuration is required.

## Supported Markets

| Market | Exchanges | Products |
|---|---|---|
| Equity | NSE, BSE | MIS, CNC |
| Futures and options | NFO, BFO, MCX, CDS | MIS, NRML |

For derivatives, select an underlying and expiry. Options mode provides independent call and put strike selectors; futures mode resolves the selected futures contract. Equity mode uses symbol search.

## Live Workspace

The terminal shows live LTP and normalized quote fields through OpenAlgo's shared WebSocket feed. When the feed is unavailable, the page identifies its slower REST polling fallback so stale-data risk is visible.

<figure><img src="../.gitbook/assets/openalgo-ui-scalping.png" alt="Scalping terminal with call and put strike selectors and live prices"><figcaption></figcaption></figure>

Charts are optional and disabled by default. Enable them to view 1-minute, 5-minute, or 15-minute candles with volume. The chart toggle and timeframe are saved in the browser.

## Order Entry

All entries are market orders stamped with the `Scalping` strategy name. Configure quantity in shares for equities or lots for derivatives, select the product, and arm One-Click before sending entries.

| Market | Keyboard action |
|---|---|
| Equity or futures | Up/Right buys; Down/Left sells |
| Options | Up buys call; Down sells call; Right buys put; Left sells put |
| All modes | F6 closes scalping positions; F7 cancels open orders |

Held-key auto-repeat is ignored. Entry shortcuts are ignored while typing in an input. F6 and F7 remain risk-reducing actions even when One-Click is off; the on-screen buttons are available when an operating system intercepts function keys.

Server validation limits manual derivative entries to 20 lots and all requests to 100,000 units. Derivative quantity must match the contract lot size. Exit operations derive the reducing side from the actual position and cannot increase exposure.

## Stops And Targets

Predefined stop-loss and target values can be applied to new entries in points or percent. An open leg can also be assigned an exact stop price, optional target, and optional trailing step.

Stop configuration is persisted by symbol, exchange, product, application mode, and position side. The browser displays and edits this state, but a server-side risk monitor evaluates live ticks and sends a reducing exit when a stop or target is breached. Protection therefore continues after leaving the page or closing the browser, provided OpenAlgo and its market-data feed remain running.

Trailing stops move only in the favorable direction. Before an exit, the monitor rechecks the live position and submits whole-lot, freeze-safe reducing orders.

## Books And Mode

The workspace includes current positions, today's scalping orders, and today's scalping trades. Tracked legs remain visible while their persisted stop or tracking state is active.

Live and Analyzer modes are separated in the database. Analyzer mode uses sandbox positions and orders; live mode uses the authenticated broker session. Always confirm the mode badge before arming One-Click.

## Operational Notes

- A broker login and valid OpenAlgo API key are still required by the application, but the terminal resolves the key from the signed-in session.
- The terminal's session APIs are under `/scalping/api`; they are not public `/api/v1` API-key endpoints.
- Closing all positions only targets positions attributed to the scalping strategy. Cancel All cancels eligible open orders.
- If OpenAlgo or the broker feed is stopped, server-side stop evaluation cannot continue.
