# Tool References

## OpenAlgo MCP: Tool Reference & Prompt Examples

Companion reference to the main MCP setup guide. Once the MCP server is wired into Claude Desktop, Cursor, Windsurf, Antigravity, or any other MCP-capable client, you can ask for these operations in plain English; the client decides which tool to call.

The 49 tools declared in the shared registry are grouped below. Example symbols/expiries are illustrative; resolve an available contract and its lot/freeze limits before placing an order. The live MCP `tools/list` response is authoritative for the exact registry and schemas exposed by a running version. Each entry includes:

* What the tool does
* Key parameters (required / optional)
* Example prompts you can paste directly into Claude / Cursor / Antigravity / Windsurf

### Conventions

* **Default strategy tag**: `python mcp`. Every MCP-triggered order is tagged so you can filter MCP activity in OpenAlgo logs and the Analyzer. Override by saying _"use strategy 'my scalper'"_ in the prompt.
* **Product type defaults**: `MIS` for equity. Use `NRML` for F\&O carry; `CNC` for delivery.
* **Exchange codes**: `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`, `NCDEX` + `NSE_INDEX` / `BSE_INDEX` for index values.
* **Toolsets**: every tool belongs to exactly one of `orders`, `account`, `marketdata`, `research`, or `utility`. Those five names are the only values `OPENALGO_MCP_TOOLSETS` accepts. The section headings below group tools by task, which does not always match the toolset: `close_all_positions` and `analyzer_toggle` are in `orders`, `calculate_margin` and `analyzer_status` are in `account`, and the calendar and instrument tools are in `marketdata`.
* **Lot size**: ask the assistant to resolve the exact contract using `get_option_symbol`, `get_option_chain` or `get_symbol_info`, then check `quantity = lots × lotsize` and the applicable freeze limit before sending. A prompt is not a guarantee the assistant performs that lookup.

***

### Responses and order outcomes

Tool replies use a trust envelope, `{"_openalgo_mcp_security": {...}, "data": {...}}`; broker-relayed text is data, not an instruction to the assistant. Failures can include a structured `error` object. A timed-out write can include `retry_safe: false`, `verify_first: true` and `verify_with`; verify broker books before retrying because an order may already exist. A broker reply lost after sending can also surface the REST possible-placement error. There is no universal client idempotency key.

HTTP/tool success can mean an eligible entry was queued for Action Center approval (`mode: "semi_auto"`, `pending_order_id`), not sent to the broker. A placement acknowledgement still needs fill confirmation; inspect each basket/split child result. See [REST outcomes](../api-documentation/v1/README.md#order-outcomes-and-retries).

`OPENALGO_MCP_READ_ONLY=1` removes state-changing tools, and `OPENALGO_MCP_TOOLSETS` narrows the registered toolsets at startup. The installed server's tool schemas and annotations remain authoritative.

### Order Management

#### `place_order`

Place a single market / limit / stop-loss order.

| Param                                          | Required | Notes                                             |
| ---------------------------------------------- | -------- | ------------------------------------------------- |
| `symbol`, `quantity`, `action`                 | Yes      | none |
| `exchange`                                     | No       | Default `NSE`                                     |
| `price_type`                                   | No       | `MARKET`, `LIMIT`, `SL`, `SL-M`. Default `MARKET` |
| `product`                                      | No       | `CNC`, `NRML`, `MIS`. Default `MIS`               |
| `strategy`                                     | No       | Default `python mcp`                              |
| `price`, `trigger_price`, `disclosed_quantity` | No       | Use as applicable                                 |

**Prompts:**

* _"Place a market buy for 100 shares of RELIANCE on NSE, intraday"_
* _"Buy 50 INFY at limit 1550, delivery product"_
* _"Sell 25 SBIN with a stop-loss at 765 and trigger 766"_

***

#### `place_smart_order`

Auto-calculates the delta between your current position and the target `position_size`, then sends only the incremental order.

| Param                                           | Required | Notes                                 |
| ----------------------------------------------- | -------- | ------------------------------------- |
| `symbol`, `quantity`, `action`, `position_size` | Yes      | `position_size` = your target net qty |
| Rest                                            | No       | Same defaults as `place_order`        |

**Prompts:**

* _"Square off my TATAMOTORS intraday position to zero"_
* _"Scale my YESBANK position to 100 shares long"_

***

#### `place_basket_order`

Fire multiple orders in one call. Each basket entry carries its own `symbol`, `exchange`, `action`, `quantity`, `pricetype`, `product`.

**Prompts:**

* _"Place a basket: buy 1 BHEL and sell 1 ZOMATO, both market MIS on NSE"_
* _"Build a basket of SBIN, HDFCBANK and ICICIBANK buys, 10 shares each, CNC"_

***

#### `place_split_order`

Break a large order into equal chunks (helpful for low-liquidity names or to avoid freeze limits).

| Param                                                        | Required | Notes                                   |
| ------------------------------------------------------------ | -------- | --------------------------------------- |
| `symbol`, `exchange`, `action`, `quantity`, `split_size`     | Yes      | `split_size` is the size of each slice  |
| `price_type`, `product`, `price`, `trigger_price`, `strategy`| No       | Same as `place_order`                   |

**Prompts:**

* _"Sell 500 YESBANK in slices of 50, market orders"_
* _"Split 1200 NIFTY lots across 100-lot chunks"_

***

#### `place_options_order`

Single-leg option order using offset-based strike selection (ATM / ITM1-ITM50 / OTM1-OTM50). The server resolves the strike against the live option chain.

| Param                                                                   | Required | Notes                                                            |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `underlying`, `exchange`, `offset`, `option_type`, `action`, `quantity` | Yes      | none |
| `expiry_date`                                                           | No       | Optional if underlying includes expiry (e.g., `NIFTY28OCT25FUT`) |
| `price_type`, `product`, `price`, `trigger_price`, `disclosed_quantity`, `strategy` | No       | Same as `place_order`                                            |

> **Lot size note**: if you don't know it, just ask: the assistant will pull `lotsize` from `get_option_symbol` first, then size the quantity correctly.

**Prompts:**

* _"Buy 1 lot NIFTY ATM CE expiring 28NOV25"_
* _"Short 2 lots BANKNIFTY OTM3 PE for next weekly expiry"_

***

#### `place_options_multi_order`

Multi-leg option strategies (up to 20 legs). BUY legs are fired first for margin efficiency, then SELL legs. Supports per-leg overrides for `expiry_date`, `pricetype`, `price`, `product`, etc., perfect for calendar / diagonal spreads.

**Prompts:**

* _"Place an iron condor on NIFTY 28NOV25 at OTM5 and OTM10 strikes, 1 lot each, NRML"_
* _"Build a long straddle on BANKNIFTY ATM for 25NOV25 expiry with limit orders at 250"_
* _"Diagonal NIFTY spread: buy ITM2 CE 30DEC25, sell OTM2 CE 25NOV25, 1 lot"_

***

#### `modify_order`

Change price / quantity / type / trigger on a working order.

| Param                                                                      | Required | Notes                                                                   |
| -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `order_id`, `symbol`, `action`, `exchange`, `product`, `quantity`, `price` | Yes      | `price` is mandatory per the REST spec, use current price if unchanged |
| `price_type`, `trigger_price`, `disclosed_quantity`                        | No       | `price_type` defaults to **`LIMIT`**, unlike every other order tool, which defaults to `MARKET`. Modifying a working `SL-M` order without passing `price_type` converts it to `LIMIT`. `trigger_price` and `disclosed_quantity` default to 0 |

**Prompts:**

* _"Modify order 250408001002736, change limit price to 16.5"_
* _"Increase quantity of my open NIFTY CE buy order to 2 lots"_

***

#### `cancel_order`

**Prompt:** _"Cancel order 250408001002736"_

***

#### `cancel_all_orders`

Cancels eligible pending orders across the active account. `strategy` is a tracking label, not a filter; it can affect manual and other-strategy orders. Analyzer mode uses sandbox orders.

**Prompts:**

* _"Cancel every pending order I have"_
* _"Cancel eligible pending account orders and label the request 'nifty scalper'"_

***

### Positions & Holdings

#### `close_all_positions`

Request a square-off of the active account's eligible positions. `strategy` is a tracking label, not a filter; it can affect manual and other-strategy positions. Verify remaining positions and executions afterwards. Analyzer mode uses sandbox positions.

**Prompt:** _"Close all my open positions now"_

***

#### `get_open_position`

Query the current net quantity for a specific instrument.

**Prompts:**

* _"What's my current position in NHPC NSE MIS?"_
* _"How many NIFTY futures am I long?"_

***

#### `get_position_book`

Every open position across instruments.

**Prompt:** _"Show me all open positions with unrealized P\&L"_

***

#### `get_holdings`

Delivery/CNC holdings with today's P\&L, % move, and aggregate statistics.

**Prompts:**

* _"Show my demat holdings sorted by today's % change"_
* _"What's the total unrealized P\&L on my long-term portfolio?"_

***

#### `get_funds`

Cash, collateral, realized/unrealized M2M, utilized margin.

**Prompt:** _"How much free cash do I have for trading today?"_

***

### Order Tracking

#### `get_order_status`

**Prompt:** _"Check status of order 250828000185002, did it fill?"_

***

#### `get_order_book`

Every order today with statistics (open / complete / cancelled / rejected counts).

**Prompts:**

* _"Show today's order book"_
* _"How many of my orders got rejected today and why?"_

***

#### `get_trade_book`

Only executed fills.

**Prompt:** _"List all my executed trades today with average price"_

***

### Market Data

#### `get_quote`

LTP, bid, ask, OHLC, volume for one symbol.

**Prompts:**

* _"Get the latest quote for RELIANCE"_
* _"What's NIFTY trading at right now?"_

***

#### `get_multi_quotes`

Quotes for many symbols in one round-trip.

**Prompt:** _"Get quotes for RELIANCE, TCS, INFY, HDFCBANK and ICICIBANK"_

***

#### `get_market_depth`

Full 5-level bid/ask book plus total buy/sell qty and OI.

**Prompt:** _"Show the order book depth for SBIN"_

***

#### `get_historical_data`

OHLCV history. Two sources:

* `source="api"` (default) → live fetch from broker API
* `source="db"` → local Historify DuckDB store (1m and D stored physically; other intervals, including custom ones like 2m/3m/W/M/Q/Y, computed on-the-fly via SQL)

> **`bars` defaults to 20.** However wide a date range you ask for, the tool returns only the last 20 rows and sets `truncated: true`. Say how many bars you want ("the last 200 daily bars") or the model will silently work from 20. The same default applies to `calculate_indicator`.

**Prompts:**

* _"Get 5-minute SBIN candles from 1 Apr to 8 Apr 2025"_
* _"Pull NIFTY daily data for the last 6 months from the local Historify DB"_
* _"Give me weekly aggregates of BANKNIFTY for the past year using source=db"_

***

#### `get_option_chain`

Real-time chain with CE/PE data per strike, LTP, bid/ask, OHLC, volume, OI, `lotsize`, moneyness labels. `strike_count=N` returns N strikes **above and** N below ATM, so roughly 2N+1 rows. Valid range is 1 to 100.

**Prompts:**

* _"Show me NIFTY option chain for 30DEC25, 10 strikes around ATM"_
* _"Full BANKNIFTY option chain for this week's expiry"_

***

### Instrument Search & Symbols

#### `search_instruments`

Fuzzy search across exchanges by name or symbol.

**Prompts:**

* _"Search for NIFTY 26000 Dec CE"_
* _"Find all TATA stocks on NSE"_

***

#### `get_symbol_info`

Full metadata for one symbol: `brsymbol`, `lotsize`, `expiry`, `strike`, `tick_size`, `token`.

**Prompts:**

* _"Get symbol info for NIFTY30DEC25FUT on NFO"_
* _"What's the lot size for BANKNIFTY futures?"_

***

#### `get_option_symbol`

Resolve ATM/ITM/OTM offset to the exact option symbol plus `lotsize`, `tick_size`, `underlying_ltp`. Expiry optional if the underlying includes one.

**Prompts:**

* _"Get the ATM CE symbol for NIFTY expiring 28OCT25"_
* _"What's the OTM4 PE for BANKNIFTY next weekly?"_

***

#### `get_option_greeks`

Delta, Gamma, Theta, Vega, Rho + Implied Volatility using Black-76. Underlying is auto-detected, override with `underlying_symbol` / `underlying_exchange`, supply `forward_price` for custom / illiquid underlyings, and `expiry_time` for non-standard MCX contracts. `interest_rate` is the annualized risk-free rate in percent and **defaults to 0**, which materially shifts rho and theta: pass it when those matter.

**Prompts:**

* _"Calculate greeks for NIFTY25NOV2526000CE with 6.5% interest rate"_
* _"What's the delta and IV of the ATM NIFTY CE for 28NOV25?"_

***

#### `get_synthetic_future`

Put-call parity synthetic future price, useful for illiquid futures or weekly expiries that lack a traded future.

**Prompt:** _"What's the NIFTY synthetic future price for 25NOV25?"_

***

#### `get_expiry_dates`

All tradeable expiries for an underlying.

**Prompt:** _"List all NIFTY options expiries available on NFO"_

***

#### `get_available_intervals`

Supported timeframes for `get_historical_data`.

**Prompt:** _"What intraday intervals are supported?"_

***

#### `get_instruments`

Bulk instrument master download for an exchange (or all exchanges when `exchange` is omitted). Output is paginated, default limit 500, with a `truncated` flag.

**Prompts:**

* _"Download the NFO instrument master, first 500 rows"_
* _"Get all MCX instruments available for trading"_

***

#### `get_index_symbols`

Returns the standardized OpenAlgo index-name inventory. The names are shared across brokers, but this inventory does not guarantee that the active broker publishes history/quotes for every listed index. Check symbol availability before requesting data.

**Prompts:**

* _"List all NSE index symbols I can subscribe to"_
* _"Show me the BSE index list, I want to stream SENSEX50"_

***

### Margin

#### `calculate_margin`

SPAN + exposure margin for a hypothetical position set. Accepts an array of legs with `symbol`, `exchange`, `action`, `product`, `pricetype`, `quantity`.

**Prompts:**

* _"Calculate margin for 1 lot NIFTY 25000 CE buy + 1 lot 25500 CE sell, 25NOV25 expiry"_
* _"How much margin do I need for a BANKNIFTY short straddle at ATM for next week?"_

***

### Analyzer

#### `analyzer_status`

Am I in simulated (analyzer) or live mode?

**Prompt:** _"Am I in live or analyzer mode right now?"_

***

#### `analyzer_toggle`

Flip between simulated and live trading. Analyzer mode returns sandbox order IDs in the same `YYMMDD` + sequence shape as a real one, and the response carries `mode: "analyze"`, without touching the broker. Read the `mode` field, not the order ID, to tell simulated from live.

**Prompts:**

* _"Switch to analyzer mode before I test this strategy"_
* _"Turn off analyzer, I want to go live"_

***

### Market Calendar

#### `get_holidays`

Full holiday list for a year (year optional → defaults to current year).

**Prompts:**

* _"What are the trading holidays in 2026?"_
* _"List this year's market holidays"_

***

#### `get_timings`

Exchange open/close epoch timestamps for a given date (date optional → defaults to today).

**Prompt:** _"What are today's market timings across NSE, BFO and MCX?"_

***

#### `check_holiday`

This tool is registered and appears in MCP clients, but it is currently **unavailable**: it calls `/api/v1/checkholiday`, which is not a registered OpenAlgo REST endpoint. Calls return an endpoint error instead of a holiday result. Use `get_timings` for one date or `get_holidays` for the yearly list.

***

### Utilities

#### `get_openalgo_version`

**Prompt:** _"What version of the openalgo library is running?"_

***

#### `validate_order_constants`

Quick cheat-sheet of valid exchanges, product types, price types, actions, and intervals, useful when the model wants to double-check a parameter before sending an order.

**Prompt:** _"Remind me of the valid product types and price types"_

***

#### `send_telegram_alert`

Push a Telegram notification via the OpenAlgo Telegram bot (must be configured in OpenAlgo settings first).

| Param      | Required | Notes                                    |
| ---------- | -------- | ---------------------------------------- |
| `username` | Yes      | Your OpenAlgo login ID. There is no default, so name it in the prompt |
| `message`  | Yes      | Body text                                |
| `priority` | No       | 1 to 10, defaults to 5                   |

This is the one tool annotated as a write that is gated on `read:account`, so a read-only remote session can still send Telegram messages.

**Prompts:**

* _"Send me a Telegram alert: NIFTY crossed 26000, priority 8"_
* _"Ping me on Telegram if my NIFTY CE fills"_

***

### Technical Research

Research tools fetch broker or Historify history and calculate compact results on the OpenAlgo server. Common optional controls are `interval`, `start_date`, `end_date`, `lookback_bars`, `lookback_days`, and `source` (`api` or `db`). `multi_timeframe_analysis` is the exception: it takes a list called `intervals`, not a single `interval`.

#### `calculate_indicator`

Run an `openalgo.ta` indicator by name. Supply `symbol`, `exchange`, and `indicator`; use `params` for indicator arguments, `inputs` when automatic OHLCV input detection is insufficient, and `bars` to limit returned rows.

**Prompt:** _"Calculate RSI(14) and the latest 20 values for RELIANCE daily candles"_

#### `get_trend_snapshot`

Return a one-call trend bundle containing SMA, EMA, Supertrend, ADX/DMI, and Ichimoku values.

**Prompt:** _"Give me a daily trend snapshot for NIFTY"_

#### `get_momentum_snapshot`

Return RSI, MACD, Stochastic, CCI, and Williams %R values for one symbol and interval.

**Prompt:** _"Show a 15-minute momentum snapshot for SBIN"_

#### `get_volatility_snapshot`

Return ATR, NATR, Bollinger, Keltner, Donchian, and historical-volatility values.

**Prompt:** _"Compare the current volatility measures for INFY on daily candles"_

#### `get_support_resistance`

Calculate pivot points, Donchian levels, and rolling highest-high and lowest-low values. `period` defaults to 20.

**Prompt:** _"Find 20-day support and resistance levels for RELIANCE"_

#### `detect_signals`

Find recent bullish and bearish events. `signal_type` selects the rule and defaults to `ema_cross`; valid values are `ema_cross`, `sma_cross`, `macd_cross`, `supertrend_flip`, and `rsi_threshold`. `fast` (20) and `slow` (50) set the crossover lengths, `period` (14) the RSI length, `upper` (70) and `lower` (30) the RSI thresholds, and `limit` (20) bounds the returned events.

**Prompt:** _"Find the latest EMA 20/50 cross signals for TCS"_

#### `screen_instruments`

Evaluate a modest list of `{symbol, exchange}` pairs. `condition` defaults to `rsi_below`; valid values are `rsi_below`, `rsi_above`, `price_above_sma`, `price_below_sma`, `supertrend_bullish`, and `supertrend_bearish`. `value` (30.0) is the threshold and `period` (14) the indicator length. History is fetched per symbol, so keep broker-backed lists small.

**Prompt:** _"Screen RELIANCE, INFY, TCS, and SBIN for RSI below 35"_

#### `multi_timeframe_analysis`

Compute one indicator across several timeframes. The default timeframes are `5m`, `15m`, `1h`, and `D`.

**Prompt:** _"Check RSI confluence for NIFTY across 5m, 15m, 1h, and daily"_

#### `correlation_beta`

Align two symbols on common timestamps and return rolling correlation, rolling beta, linear-regression slope, and full-sample Pearson correlation.

**Prompt:** _"Calculate 60-day correlation and beta for RELIANCE versus NIFTY"_

***

### Worked Multi-Tool Workflows

Real strength shows when the assistant chains tools on its own. Example prompts:

**1. End-to-end iron condor (analyzer mode):**

> _"Set up a NIFTY iron condor for next week's expiry. Find the expiry, pull the option chain, use OTM5 strikes on both sides, calculate the margin required, and, only if margin is under ₹1L, place it in analyzer mode using 1 lot per leg."_

The assistant will chain: `get_expiry_dates` → `get_option_chain` → `get_option_symbol` (for lot size) → `calculate_margin` → `analyzer_status` / `analyzer_toggle` → `place_options_multi_order`.

**2. Pre-market checklist:**

> _"Before I start trading: is the market open today on NSE and MCX, what's my free cash, what's my current position book, and what's NIFTY spot right now?"_

Chains: `get_timings` → `get_funds` → `get_position_book` → `get_quote`.

**3. Options greeks scan:**

> _"Pull the NIFTY option chain for 25NOV25 within 5 strikes of ATM, then compute greeks for the ATM CE and PE with 6.5% interest rate, tell me which has higher vega."_

Chains: `get_option_chain` → `get_option_symbol` (ATM) × 2 → `get_option_greeks` × 2.

**4. Square-off with Telegram confirmation:**

> _"Square off everything, cancel all pending orders, then send me a Telegram alert summarizing what got closed with the realized P\&L."_

Chains: `cancel_all_orders` → `close_all_positions` → `get_trade_book` → `send_telegram_alert`.

***

### Quick Prompt Patterns

| Intent        | Prompt pattern                                                 |
| ------------- | -------------------------------------------------------------- |
| Status check  | _"What's my {thing}?"_                                         |
| Single action | _"{Buy/Sell} {qty} {symbol} at {price}"_                       |
| Multi-leg     | _"Build a {strategy} on {underlying} {expiry} with {offsets}"_ |
| Safety-first  | _"In analyzer mode, {do the thing}"_                           |
| Conditional   | _"Only if {condition}, then {action}"_                         |
| Research      | _"Show me {chain/greeks/history} and recommend {levels}"_      |

***

### Safety Tips

* Start in **analyzer mode** (`analyzer_toggle True`) while you get comfortable. Orders look real but never leave OpenAlgo.
* Use phrases like _"only if margin is under X"_ or _"ask me to confirm before placing"_ and the assistant will pause for your OK.
* Use a unique `strategy` name per use-case (e.g., _"use strategy 'nifty scalper'"_) so MCP-driven activity is cleanly separable from manual orders in logs.
* For live trading, set up the OpenAlgo Telegram bot and ask the assistant to _"send a Telegram alert after every order fill"_. You get a realtime feed without staring at the screen.

***

### Related

* MCP Server Setup Guide: install, configure Claude / Cursor / Windsurf, broker prerequisites
* OpenAlgo Symbol Format: how equity / future / option symbols are constructed
* API Documentation: underlying REST endpoints each MCP tool wraps
