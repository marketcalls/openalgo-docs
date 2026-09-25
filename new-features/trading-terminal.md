# Chart Trading Terminal

The `/trading` route is OpenAlgo's multi-chart trading workspace. It combines historical and live market data, chart analysis, drawings, market depth, and order entry in one React interface.

<figure><img src="../.gitbook/assets/openalgo-ui-trading-terminal.png" alt="Chart trading terminal with candlestick chart, drawing tools and order widget"><figcaption></figcaption></figure>

## Layouts and State

Seven persisted layouts are available:

* one chart;
* two charts side by side;
* two charts stacked;
* a three-chart `1 + 2` layout with one large pane;
* a `2×2` four-chart grid;
* a six-chart `3×2` grid;
* an eight-chart `4×2` grid.

Each pane retains its own symbol and chart state. Layout choice and supported chart preferences persist in the browser or application preference store so returning to the terminal restores the workspace.

## Charts and History

The terminal supports candles, bars, line/area variants, Heikin Ashi, Renko, Range Bars, and Line Break views. Scrolling to the left edge requests older history so analysis is not limited to the initial window.

Indicators are loaded from the chart library catalog. Multiple instances can be added and configured per pane. Volume and grid display can be adjusted independently from the primary price scale.

## Drawing Tools

One drawing rail controls the active pane and includes line, channel, Fibonacci/Gann, shape, cycle, forecast, measurement, and text tools. Drawings support styling, locking, magnet mode, undo/redo, and per-pane persistence.

The shared rail deliberately targets only the active pane. Confirm the highlighted pane before adding, editing, or removing a drawing in a multi-chart layout.

## Symbols, Market Data, and Orders

Symbol search is ranked and debounced and can be opened independently for every pane. The terminal receives live ticks from OpenAlgo's raw WebSocket proxy, with REST quote fallback where required. The same market-data manager is shared across the page rather than opening one Gunicorn request thread per chart.

The order dialog supports inline order entry and market-depth review. Account-level order updates arrive through the order-update stream when the active broker provides a push adapter; Groww uses the server's explicit orderbook-polling fallback.

## Operational Boundaries

* Historical range, live fields, depth levels, and order-update latency depend on the active broker and account entitlement.
* Market data uses the raw WebSocket proxy on port `8765` (normally exposed as `/ws` behind the production reverse proxy); it is separate from Flask-SocketIO application events.
* A displayed quote or analytical drawing is not a guarantee of execution price.
* Test order entry in Analyzer mode before using the terminal with live capital.

See [WebSocket API](../api-documentation/v1/websockets.md) for the underlying market-data and order-update protocol.
