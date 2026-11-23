# Excel

## OpenAlgo Excel Add-In


### Overview

OpenAlgo is an Excel Add-In that provides seamless integration with the OpenAlgo API for algorithmic trading. This add-in allows users to fetch market data, resolve symbols, analyse option chains and Greeks, place and manage orders, retrieve historical data, and stream real-time market data directly from Excel.

The add-in exposes **82 worksheet functions** covering **55 of the 57 registered OpenAlgo v1 REST method/path pairs**, plus the full WebSocket streaming protocol.

### Features

* **Account Management**: Funds, order book, trade book, position book, holdings, and pre-trade margin.
* **Market Data**: Real-time quotes, multi-symbol quotes, market depth, historical candles, and supported intervals.
* **Symbol Services**: Symbol metadata, instrument search, and expiry dates.
* **Options Analytics**: Option chain, Black-76 Greeks, batch Greeks, synthetic futures, and option symbol resolution.
* **Order Management**: Place, modify, cancel, and query orders; smart, basket, split, and options orders.
* **GTT Orders**: Place, modify, cancel, and list Good Till Triggered orders, including OCO.
* **Risk Management**: Close all open positions for a strategy, and an explicit trading arm switch.
* **Analyzer Mode**: Toggle between sandbox simulation and live trading, with sandbox P&L per symbol.
* **Market Calendar**: Holidays, trading session timings, and a holiday check.
* **Messaging**: WhatsApp and Telegram notifications.
* **WebSocket Streaming**: Real-time LTP, Quote, Depth, and order updates pushed to individual cells via RTD.
* **Persistent Configuration**: API key and settings are saved to disk and auto-loaded on Excel restart.

---

### Prerequisites

* .NET 8.0 Desktop Runtime installed
* Excel-DNA Add-In (included in the project dependencies)
* Microsoft Excel (Office 365 recommended)
* A running OpenAlgo server

### Install the OpenAlgo Excel Add-In

Before installing, ensure you are selecting the correct version based on your Excel installation.

#### Steps to Check Your Excel Version

1. Open Microsoft Excel
2. Click **File** > **Account**
3. Click **About Excel**
4. Look for **32-bit** or **64-bit** in the version details.

#### Which Version Should You Install?

* If your Excel version is **64-bit** > Install the 64-bit add-in (Recommended)
* If your Excel version is **32-bit** > Install the 32-bit add-in

The installer detects your Excel bitness automatically and installs the matching add-in.

**Download the OpenAlgo Excel Add-In**: [GitHub Releases](https://github.com/marketcalls/OpenAlgo-Excel/releases)

#### .NET 8 Desktop Runtime is Required

OpenAlgo Excel Add-In is built using **Excel-DNA**, which requires the **.NET 8 Desktop Runtime** to run.

If the add-in is not working or Excel does not recognize it, install the .NET 8 Desktop Runtime from:
[Download .NET 8 Desktop Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)

After installing the runtime, restart your system and try loading the add-in again.

---

### Configuration

#### Setting API Key, Version, and Host URL

**Function:** `oa_api(APIKey, [APIVersion], [HostURL])`

This function must be called once to configure the API connection. The configuration is **persisted to disk** at `%LOCALAPPDATA%\OpenAlgo\config.json`, so you only need to call it once. On subsequent Excel sessions, the saved API key is automatically loaded.

All other functions use these stored credentials.

| Parameter  | Required | Default                   | Description                |
| ---------- | -------- | ------------------------- | -------------------------- |
| `api_key`  | Yes      | -                         | API key for authentication |
| `version`  | No       | `"v1"`                    | API version                |
| `HostURL` | No       | `"http://127.0.0.1:5000"` | OpenAlgo server URL        |

```
=oa_api("your_api_key")
=oa_api("your_api_key", "v1", "http://127.0.0.1:5000")
```

---

#### Check the Add-In Version and Configuration

**Function:** `oa_version()`

Returns the add-in version and the configuration in force: host URL, API version, REST base, WebSocket URL, timeouts, and whether an API key is set. Makes no network call, so quote this first when reporting a problem.

```
=oa_version()
```

---

#### Verify the Connection

**Function:** `oa_ping()`

Verifies the API key resolves to an active broker session and names the broker. This is an authenticated check, not a process health probe: a revoked key or a logged-out broker fails it.

```
=oa_ping()
```

---

#### Trading Safety Switch (optional)

**Function:** `oa_trading_enabled([Enable])`

Order functions work out of the box, so nothing needs to be enabled before placing an order. This switch is an **optional** guard you can turn on if you want it.

A worksheet formula re-evaluates whenever the sheet recalculates, so an order formula sitting in a cell can fire again on a full rebuild (Ctrl+Alt+F9). Setting the switch to FALSE makes every order function refuse to send until you set it back.

```
=oa_trading_enabled()        Read the current state
=oa_trading_enabled(FALSE)   Block order functions from sending
=oa_trading_enabled(TRUE)    Allow them again (the default)
```

The setting lives for the current Excel session only and is not saved.

Functions it controls: `oa_placeorder`, `oa_placesmartorder`, `oa_basketorder`, `oa_splitorder`, `oa_modifyorder`, `oa_cancelorder`, `oa_cancelallorder`, `oa_closeposition`, `oa_placegttorder`, `oa_modifygttorder`, `oa_cancelgttorder`, `oa_optionsorder`, `oa_optionsmultiorder`.

---

#### Generic Endpoint Access

**Function:** `oa_request(Method, Path, [JSONBody])`

Raw call to any OpenAlgo endpoint, returning the JSON response in a single cell. The API key is added for you: do not put `apikey` in the body.

**Function:** `oa_json(JSONText, Path)`

Pulls a value out of JSON text with a JSONPath expression. Objects and arrays come back as compact JSON, scalars as numbers, booleans, or text.

```
=oa_request("POST", "ping")
=oa_json(A1, "data.broker")
=oa_json(A1, "data[0].symbol")
```

Use these to reach any endpoint the add-in does not wrap directly, such as `POST /telegram/webhook`.

---

### Account Functions

#### Retrieve Funds

**Function:** `oa_funds()`

Account funds: available cash, collateral, realised and unrealised M2M, and utilised margin. Returns a two-column table.

```
=oa_funds()
```

---

#### Retrieve Order Book

**Function:** `oa_orderbook()`

All orders placed today, one row per order: order id, symbol, exchange, action, quantity, price, trigger price, price type, product, status, and timestamp.

**Function:** `oa_orderbook_stats()`

Order book summary counts: buy, sell, completed, open, and rejected orders.

```
=oa_orderbook()
=oa_orderbook_stats()
```

---

#### Retrieve Trade Book

**Function:** `oa_tradebook()`

Executed trades for today, one row per fill: order id, symbol, exchange, action, quantity, average price, product, timestamp, and trade value.

```
=oa_tradebook()
```

---

#### Retrieve Position Book

**Function:** `oa_positionbook()`

Open and closed positions for today with live P&L: symbol, exchange, product, quantity, average price, LTP, and PnL. A quantity of 0 means the position was closed and the row carries the realised P&L.

```
=oa_positionbook()
```

---

#### Retrieve Holdings

**Function:** `oa_holdings()`

Delivery holdings with P&L: symbol, exchange, product, quantity, PnL, and PnL percent.

**Function:** `oa_holdings_stats()`

Portfolio totals: current market value, invested value, total P&L, and total P&L percentage.

```
=oa_holdings()
=oa_holdings_stats()
```

---

#### Calculate Pre-Trade Margin

**Function:** `oa_margin(Positions, [Exchange], [Product], [PriceType])`

Pre-trade margin for a basket of up to 50 positions, including hedging benefit. Reads the basket from a range and returns total margin required, SPAN, exposure, and margin benefit.

| Parameter    | Required | Description                                                        |
| ------------ | -------- | ------------------------------------------------------------------ |
| `Positions`  | Yes      | Range of positions. With a header row, columns are matched by name |
| `Exchange`   | No       | Default exchange applied to rows that do not specify one           |
| `Product`    | No       | Default product                                                     |
| `PriceType` | No       | Default price type                                                  |

```
=oa_margin(A2:E5)
=oa_margin(A2:E5, "NFO", "NRML")
```

---

### Market Data Functions

#### Get Last Traded Price

**Function:** `oa_ltp(Symbol, Exchange)`

Last traded price as a single number. This is the most convenient function for building a watchlist column.

```
=oa_ltp("RELIANCE", "NSE")
```

---

#### Get a Single Quote Field

**Function:** `oa_field(Symbol, Exchange, Field)`

One named field of a market quote as a single value. Parallels the streaming `oa_ws_field`.

Supported fields: `ltp`, `open`, `high`, `low`, `prev_close`, `bid`, `ask`, `volume`, `oi`, plus the computed `change` and `changepct`.

```
=oa_field("RELIANCE", "NSE", "high")
=oa_field("RELIANCE", "NSE", "changepct")
```

---

#### Get Market Quotes

**Function:** `oa_quotes(Symbol, Exchange)`

Full market quote for a symbol as a key/value table, including computed Change and Change %.

```
=oa_quotes("RELIANCE", "NSE")
```

---

#### Get Quotes for Multiple Symbols

**Function:** `oa_multiquotes(Symbols, DefaultExchange)`

Quotes for a range of symbols, one row per symbol. Far more efficient than one `oa_quotes` call per symbol.

| Parameter          | Required | Description                                                                    |
| ------------------ | -------- | ------------------------------------------------------------------------------ |
| `Symbols`          | Yes      | Range: one column of symbols, or two columns of symbol and exchange            |
| `DefaultExchange` | No       | Exchange applied when the range has no exchange column (default `NSE`)         |

Returns Symbol, Exchange, LTP, Open, High, Low, Prev Close, Change, Change %, Bid, Ask, OI, Volume, and an Error column for symbols the server could not resolve.

```
=oa_multiquotes(A2:A20)
=oa_multiquotes(A2:B20)
=oa_multiquotes(A2:A20, "NSE")
```

---

#### Get Market Depth

**Function:** `oa_depth(Symbol, Exchange)`

Order book depth with the day summary. Returns the five-level bid and ask ladder plus LTP, Volume, Open, High, Low, Prev Close, LTQ, OI, Total Buy Qty, and Total Sell Qty.

```
=oa_depth("RELIANCE", "NSE")
```

---

#### Fetch Historical Data

**Function:** `oa_history(Symbol, Exchange, Interval, StartDate, EndDate, [Source])`

| Parameter    | Required | Description                                                             |
| ------------ | -------- | ----------------------------------------------------------------------- |
| `Symbol`     | Yes      | Trading symbol                                                          |
| `Exchange`   | Yes      | Exchange                                                                |
| `Interval`   | Yes      | Candle interval, for example `"1m"`, `"5m"`, `"15m"`, `"D"`             |
| `StartDate` | Yes      | Start date, `YYYY-MM-DD` or a real Excel date cell                      |
| `EndDate`   | Yes      | End date, `YYYY-MM-DD` or a real Excel date cell                        |
| `Source`     | No       | `"api"` for the broker (default) or `"db"` for Historify stored data    |

Returns a table with Ticker, Date (a real Excel date serial), Time (IST), Open, High, Low, Close, Volume, and OI when the payload carries it.

```
=oa_history("RELIANCE", "NSE", "5m", "2026-04-01", "2026-04-08")
=oa_history("RELIANCE", "NSE", "D", "2025-01-01", "2026-01-01", "db")
```

---

#### Get Supported Intervals

**Function:** `oa_intervals()`

Candle intervals supported by the connected broker, grouped by category.

```
=oa_intervals()
```

---

### Symbol Functions

#### Get Symbol Metadata

**Function:** `oa_symbol(Symbol, Exchange)`

Instrument metadata: name, broker symbol, instrument type, expiry, strike, lot size, tick size, freeze quantity, and token.

```
=oa_symbol("RELIANCE", "NSE")
```

---

#### Get Lot Size and Token

**Function:** `oa_lotsize(Symbol, Exchange)` returns the lot size as a single number, which is what you need when sizing an F&O order from a sheet.

**Function:** `oa_token(Symbol, Exchange)` returns the broker instrument token as text.

```
=oa_lotsize("NIFTY25AUG26FUT", "NFO")
=oa_token("RELIANCE", "NSE")
```

---

#### Search Instruments

**Function:** `oa_search(Query, [Exchange])`

Searches instruments by name, strike, month, or option type. The tradable symbol is the first column so another formula can reference it directly.

Returns Symbol, Name, Exchange, Instrument Type, Expiry, Strike, Lot Size, Tick Size, Freeze Qty, Broker Symbol, Broker Exchange, and Token.

```
=oa_search("NIFTY 25000 CE")
=oa_search("RELIANCE", "NSE")
```

This is the fastest way to find the correct OpenAlgo symbol format for an F&O contract.

---

#### Get Expiry Dates

**Function:** `oa_expiry(Symbol, Exchange, InstrumentType, [ExpiryType])`

| Parameter         | Required | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `Symbol`          | Yes      | Underlying symbol, for example `NIFTY`                               |
| `Exchange`        | Yes      | F&O exchange: `NFO`, `BFO`, `MCX`, `CDS`, `CRYPTO`                   |
| `InstrumentType` | Yes      | `"futures"` or `"options"`                                            |
| `ExpiryType`     | No       | `"monthly"`, `"weekly"`, or `"all"`. Applied locally, see note below |

Returns Expiry (in the `DD-MMM-YY` form the API expects back), Date (an Excel serial), and Type.

> **Note:** `expirytype` is not a parameter the OpenAlgo server accepts. `ExpirySchema` declares only `apikey`, `symbol`, `exchange`, and `instrumenttype`, and rejects unknown fields, so sending it returns HTTP 400. This add-in applies the filter locally after fetching the full list.

```
=oa_expiry("NIFTY", "NFO", "options")
=oa_expiry("NIFTY", "NFO", "options", "monthly")
```

---

### Options Functions

#### Option Chain

**Function:** `oa_optionchain(Underlying, Exchange, Expiry, [StrikeCount], [WithGreeks], [InterestRate])`

| Parameter       | Required | Description                                                                  |
| --------------- | -------- | ---------------------------------------------------------------------------- |
| `Underlying`    | Yes      | Underlying symbol, for example `NIFTY`, `BANKNIFTY`, `SENSEX`                |
| `Exchange`      | Yes      | Underlying exchange: `NSE_INDEX` or `BSE_INDEX`                              |
| `Expiry`        | Yes      | Expiry in `DDMMMYY` format, for example `25AUG26`                            |
| `StrikeCount`  | No       | Strikes above and below ATM, 1 to 100. Default is all strikes                 |
| `WithGreeks`   | No       | TRUE to attach IV and Greeks to every leg. Default TRUE, costs no extra call  |
| `InterestRate` | No       | Risk-free rate as an annualised percent, Greeks only. Default 0               |

**Layout:** row 1 carries the context (Underlying, Spot, Prev Close, ATM Strike, Expiry, Forward, Strike count). Row 2 carries column headers. From row 3, one row per strike, laid out **calls on the left, strike in the centre, puts on the right**, mirrored around the strike so the ladder reads outward from the money.

Per side: LTP, Bid, Bid Qty, Ask, Ask Qty, IV, Delta, Gamma, Theta, Vega, Volume, OI, Open, High, Low, Prev Close, Lot Size, Tick Size, Symbol. Width is 41 columns with Greeks, 31 without.

```
=oa_optionchain("NIFTY", "NSE_INDEX", "25AUG26")
=oa_optionchain("NIFTY", "NSE_INDEX", "25AUG26", 10)
=oa_optionchain("BANKNIFTY", "NSE_INDEX", "25AUG26", 15, FALSE)
```

---

#### Option Greeks

**Function:** `oa_optiongreeks(Symbol, Exchange, [InterestRate], [ExpiryTime], [UnderlyingSymbol], [UnderlyingExchange], [ForwardPrice])`

Black-76 Greeks and implied volatility for one option. Returns IV plus delta, gamma, theta, vega, and rho.

```
=oa_optiongreeks("NIFTY25AUG2625000CE", "NFO")
=oa_optiongreeks("NIFTY25AUG2625000CE", "NFO", 7.0, "15:30")
```

---

#### Batch Option Greeks

**Function:** `oa_multioptiongreeks(Symbols, [InterestRate], [ExpiryTime])`

Greeks and IV for up to 50 options in one call.

The range accepts one column (symbols, exchange defaults to `NFO`), two columns (symbol, exchange), or four columns adding per-item `underlying_symbol` and `underlying_exchange` overrides.

Row 1 is the batch summary (Total, Success, Failed). Then one row per contract: Symbol, Exchange, Status, IV, Delta, Gamma, Theta, Vega, Rho, Error.

> Individual items can fail while the batch still reports success, so check the Status and Error columns per row.

```
=oa_multioptiongreeks(A2:A20)
=oa_multioptiongreeks(A2:B20, 7.0)
```

---

#### Resolve an Option Symbol

**Function:** `oa_optionsymbol(Underlying, Exchange, Expiry, StrikeOffset, OptionType)`

Resolves an option trading symbol from underlying, expiry, and strike offset. `strike_offset` is `ATM`, `ITM1` to `ITM50`, or `OTM1` to `OTM50`. `option_type` is `CE` or `PE`.

The resolved symbol is the first data row, so `INDEX(range, 2, 2)` feeds it into another formula.

```
=oa_optionsymbol("NIFTY", "NSE_INDEX", "25AUG26", "ATM", "CE")
=oa_optionsymbol("NIFTY", "NSE_INDEX", "25AUG26", "OTM2", "PE")
```

---

#### Synthetic Future

**Function:** `oa_syntheticfuture(Underlying, Exchange, Expiry)`

Synthetic futures price for an expiry, derived from ATM options using put-call parity. Also reports the Basis (synthetic minus spot).

```
=oa_syntheticfuture("NIFTY", "NSE_INDEX", "25AUG26")
```

---

#### Place an Option Order

**Function:** `oa_optionsorder(Strategy, Underlying, Exchange, Expiry, StrikeOffset, OptionType, Action, Quantity, [PriceType], [Product], [Price], [TriggerPrice], [SplitSize])`

Places an option order by strike offset rather than by resolved symbol.

| Parameter       | Required | Default  | Description                                        |
| --------------- | -------- | -------- | -------------------------------------------------- |
| `Strategy`      | Yes      | -        | Strategy identifier recorded against the order     |
| `Underlying`    | Yes      | -        | Underlying symbol                                  |
| `Exchange`      | Yes      | -        | `NSE_INDEX`, `BSE_INDEX`, `NFO`, or `BFO`          |
| `Expiry`        | Yes      | -        | Expiry in `DDMMMYY` format                         |
| `StrikeOffset` | Yes      | -        | `ATM`, `ITM1` to `ITM50`, `OTM1` to `OTM50`        |
| `OptionType`   | Yes      | -        | `CE` or `PE`                                        |
| `Action`        | Yes      | -        | `BUY` or `SELL`                                     |
| `Quantity`      | Yes      | -        | Quantity in units, not lots                        |
| `PriceType`     | No       | `MARKET` | `MARKET`, `LIMIT`, `SL`, `SL-M`                    |
| `Product`       | No       | `MIS`    | `MIS` or `NRML`                                     |
| `Price`         | No       | 0        | Limit price for `LIMIT` and `SL`                   |
| `TriggerPrice` | No       | 0        | Trigger price for `SL` and `SL-M`                  |
| `SplitSize`    | No       | 0        | Split into chunks of this size, 0 for no split     |

```
=oa_optionsorder("MyStrategy", "NIFTY", "NSE_INDEX", "25AUG26", "ATM", "CE", "BUY", 65)
```

---

#### Place a Multi-Leg Option Strategy

**Function:** `oa_optionsmultiorder(Strategy, Underlying, Exchange, Expiry, Legs)`

Places a multi-leg option strategy from a table of legs (1 to 20).

The `legs` range needs a header row. Recognised columns: `Offset`, `Option Type`, `Action`, `Quantity` (required), and optionally `Expiry`, `PriceType`, `Product`, `SplitSize`, `Price`, `TriggerPrice`. Annotation columns such as `Leg`, `Notes`, and `Remarks` are ignored.

Returns one row per leg with its own Symbol, Order ID, Status, and Message, so a failed leg inside an otherwise successful strategy is visible.

Example sheet layout for a short strangle:

| Offset | Option Type | Action | Quantity |
| ------ | ----------- | ------ | -------- |
| OTM3   | CE          | SELL   | 75       |
| OTM3   | PE          | SELL   | 75       |

```
=oa_optionsmultiorder("Strangle", "NIFTY", "NSE_INDEX", "25AUG26", A1:D3)
```

---

### Order Functions

#### Place an Order

**Function:** `oa_placeorder(Strategy, Symbol, Action, Exchange, PriceType, Product, [Quantity], [Price], [TriggerPrice], [DisclosedQuantity])`

| Parameter            | Required | Description                        |
| -------------------- | -------- | ---------------------------------- |
| `Strategy`           | Yes      | Trading strategy name              |
| `Symbol`             | Yes      | Trading symbol                     |
| `Action`             | Yes      | `BUY` or `SELL`                    |
| `Exchange`           | Yes      | Exchange code                      |
| `PriceType`          | Yes      | `MARKET`, `LIMIT`, `SL`, `SL-M`    |
| `Product`            | Yes      | `MIS`, `CNC`, `NRML`               |
| `Quantity`           | No       | Order quantity                     |
| `Price`              | No       | Limit price                        |
| `TriggerPrice`      | No       | Trigger price                      |
| `DisclosedQuantity` | No       | Disclosed quantity                 |

Returns a Status / Order ID / Message table.

```
=oa_placeorder("MyStrategy", "RELIANCE", "BUY", "NSE", "MARKET", "MIS", 10)
```

---

#### Place a Smart Order

**Function:** `oa_placesmartorder(Strategy, Symbol, Action, Exchange, PriceType, Product, [Quantity], [PositionSize], [Price], [TriggerPrice], [DisclosedQuantity])`

Places an order that targets a desired net position size rather than a raw quantity.

```
=oa_placesmartorder("MyStrategy", "RELIANCE", "BUY", "NSE", "MARKET", "MIS", 10, 50)
```

---

#### Place a Basket Order

**Function:** `oa_basketorder(Strategy, Orders)`

Places several orders in one call from a range. A header row is detected and skipped.

Column order: Symbol, Exchange, Action, Quantity, and optionally PriceType, Product, Price, TriggerPrice, DisclosedQuantity.

Returns one row per leg: Symbol, Status, Order ID, Message.

```
=oa_basketorder("MyStrategy", A2:D5)
```

---

#### Place a Split Order

**Function:** `oa_splitorder(Strategy, Symbol, Action, Exchange, [Quantity], [SplitSize], PriceType, Product, [Price], [TriggerPrice], [DisclosedQuantity])`

Splits a large quantity into chunks. Returns one row per child order: Order Num, Order ID, Quantity, Status, Message.

```
=oa_splitorder("MyStrategy", "RELIANCE", "BUY", "NSE", 100, 25, "MARKET", "MIS")
```

---

#### Modify an Order

**Function:** `oa_modifyorder(Strategy, OrderID, Symbol, Action, Exchange, [Quantity], PriceType, Product, [Price], [TriggerPrice], [DisclosedQuantity])`

> The server schema marks `price`, `quantity`, `trigger_price`, `disclosed_quantity`, `pricetype`, and `product` as required for a modify, so all of them are sent even when left blank.

```
=oa_modifyorder("MyStrategy", "250820000012345", "RELIANCE", "BUY", "NSE", 20, "LIMIT", "MIS", 1250)
```

---

#### Cancel an Order

**Function:** `oa_cancelorder(Strategy, OrderID)`

```
=oa_cancelorder("MyStrategy", "250820000012345")
```

---

#### Cancel All Orders

**Function:** `oa_cancelallorder(Strategy)`

Cancels all open orders for a strategy. Returns Order ID, Result, and Reason rows so failed cancellations are visible.

```
=oa_cancelallorder("MyStrategy")
```

---

#### Close All Open Positions

**Function:** `oa_closeposition(Strategy)`

```
=oa_closeposition("MyStrategy")
```

---

#### Get Order Status

**Function:** `oa_orderstatus(Strategy, OrderID)`

Returns the full order record as a key/value table.

```
=oa_orderstatus("MyStrategy", "250820000012345")
```

---

#### Get Open Position

**Function:** `oa_openposition(Strategy, Symbol, Exchange, Product)`

Returns the net open position quantity as a single number, so it can feed a formula directly.

```
=oa_openposition("MyStrategy", "RELIANCE", "NSE", "MIS")
```

---

### GTT Order Functions

Good Till Triggered orders rest at the broker until their trigger fires. Both `SINGLE` and `OCO` trigger types are supported.

#### Place a GTT Order

**Function:** `oa_placegttorder(Strategy, Symbol, Exchange, Action, Product, TriggerType, Quantity, [PriceType], [Price], [TriggerPriceSL], [TriggerPriceTG], [StopLoss], [Target])`

| Trigger type | Fields to supply                                                          |
| ------------ | ------------------------------------------------------------------------- |
| `SINGLE`     | One of `trigger_price_sl` or `trigger_price_tg`, plus `price` for a LIMIT |
| `OCO`        | All four: `trigger_price_sl`, `stoploss`, `trigger_price_tg`, `target`     |

For `OCO`, `trigger_price_sl` must be below `trigger_price_tg`. Validation happens locally before any network call.

```
=oa_placegttorder("MyStrategy", "RELIANCE", "NSE", "SELL", "CNC", "SINGLE", 10, "LIMIT", 1300, , 1300)
=oa_placegttorder("MyStrategy", "RELIANCE", "NSE", "SELL", "CNC", "OCO", 10, "LIMIT", , 1150, 1300, 1145, 1305)
```

---

#### Modify a GTT Order

**Function:** `oa_modifygttorder(Strategy, TriggerID, Symbol, Exchange, Action, Product, TriggerType, Quantity, [PriceType], [Price], [TriggerPriceSL], [TriggerPriceTG], [StopLoss], [Target])`

> A modify replaces the whole trigger, so send every field you want to keep.

```
=oa_modifygttorder("MyStrategy", "12345678", "RELIANCE", "NSE", "SELL", "CNC", "SINGLE", 10, "LIMIT", 1320, , 1320)
```

---

#### Cancel a GTT Order

**Function:** `oa_cancelgttorder(Strategy, TriggerID)`

Cancelling an OCO removes both legs.

```
=oa_cancelgttorder("MyStrategy", "12345678")
```

---

#### Retrieve the GTT Order Book

**Function:** `oa_gttorderbook()`

One row per trigger with its legs flattened into blocks. A book of only SINGLE triggers is 15 columns wide; a book containing an OCO widens to 21 with `Leg 1` and `Leg 2` prefixes.

```
=oa_gttorderbook()
```

---

### Analyzer Functions

Analyzer mode simulates orders in a sandbox instead of sending them to the broker. **Check this before arming a strategy.**

#### Get Analyzer Status

**Function:** `oa_analyzerstatus()`

Reports whether orders are simulated or sent live, and how many orders the analyzer has logged.

```
=oa_analyzerstatus()
```

---

#### Toggle Analyzer Mode

**Function:** `oa_analyzertoggle(Mode)`

Accepts TRUE/FALSE or `"analyze"`/`"live"`. The returned table states the resulting mode in its first row.

> **Warning:** switching to live means every order function sends real orders to the broker.

```
=oa_analyzertoggle(TRUE)      Sandbox
=oa_analyzertoggle("live")    Live trading
```

---

#### Sandbox P&L by Symbol

**Function:** `oa_pnl_symbols()`

Sandbox P&L per symbol with realised, unrealised, and today totals. Analyzer mode only: in live mode the API answers HTTP 400 and this function says so.

```
=oa_pnl_symbols()
```

---

### Market Calendar Functions

#### Market Holidays

**Function:** `oa_holidays([Year], [Exchange])`

Market holidays for a year: date, description, holiday type, the exchanges that are closed, and any special sessions. Times shown in IST.

```
=oa_holidays()
=oa_holidays(2026, "NSE")
```

---

#### Trading Timings

**Function:** `oa_timings([Date])`

Trading sessions for a date, one row per exchange, with IST start and end times. Defaults to today. An empty schedule means the market is closed that day.

```
=oa_timings()
=oa_timings("2026-08-15")
```

---

#### Holiday Check

**Function:** `oa_isholiday(Date, [Exchange])`

Returns TRUE when the market is closed on the date.

> Derived from `/market/timings`, since OpenAlgo has no `/checkholiday` endpoint: an empty session schedule means a weekend or holiday. With an exchange given, TRUE means that exchange has no session that day, so an MCX evening session on an NSE holiday correctly returns FALSE for MCX and TRUE for NSE.

```
=oa_isholiday("2026-08-15")
=oa_isholiday(TODAY(), "NSE")
```

---

### Chart Preferences

**Function:** `oa_chart()` reads the chart workspace preferences stored for this API key. The first column holds the exact preference key, so it can be fed straight back into `oa_chart_set`.

**Function:** `oa_chart_set(Key, Value)` updates one preference. A value that parses as JSON is sent as JSON, anything else as text. Keys are limited to 50 characters.

```
=oa_chart()
=oa_chart_set("tv_theme", "dark")
=oa_chart_set("tv_chart_layout", "{""interval"":""15m""}")
```

---

### Messaging Functions

#### WhatsApp

**Function:** `oa_whatsapp([Message], [Recipient], [RecipientType], [ImagePath], [DocumentPath], [Caption], [Filename], [WaitForDelivery])`

Sends a WhatsApp text, image, or document to yourself, a linked username, one phone number, or up to 5.

| Parameter           | Required | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `Message`           | No*      | Text body, max 4096 characters                                               |
| `Recipient`         | No       | Username, phone number, or a range of up to 5 phone numbers                  |
| `RecipientType`    | No       | `self`, `username`, `phone`, or `phones`. Inferred when omitted              |
| `ImagePath`        | No       | Server-local path to an image                                                 |
| `DocumentPath`     | No       | Server-local path to a document                                               |
| `Caption`           | No       | Caption for the image                                                         |
| `Filename`          | No       | Override the document's display name                                          |
| `WaitForDelivery` | No       | TRUE to block and return a per-recipient delivery report                     |

\* `Message` is optional only when `ImagePath` or `DocumentPath` is supplied.

> Exactly one recipient form is required; combining them is not supported. Attachments are read from the **OpenAlgo server's filesystem**, never uploaded from Excel, and must sit inside the directories listed in `WHATSAPP_ATTACHMENT_ROOTS`. The 5-recipient cap is a terms-of-service guardrail. Limit 30 calls per minute.
>
> `POST /whatsapp/notify` is the entire public WhatsApp REST surface. Pairing, start/stop, config, users, broadcast, stats, and preferences are admin-only behind the web session cookie and are deliberately not reachable with an API key.

```
=oa_whatsapp("Strategy armed", , "self")
=oa_whatsapp("Order filled", "919876543210", "phone")
=oa_whatsapp("EOD chart", "rajan", "username", "/srv/charts/nifty.png")
```

---

#### Telegram

**Function:** `oa_telegram(Username, Message, [WaitForDelivery], [Priority])`

Sends a Telegram message to one linked OpenAlgo user. Mirrors `client.telegram(username=..., message=...)` in the Python SDK.

| Parameter           | Required | Description                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| `Username`          | Yes      | OpenAlgo username already linked to a Telegram ID                        |
| `Message`           | Yes      | Message text, max 4096 characters                                        |
| `WaitForDelivery` | No       | TRUE to attempt delivery immediately instead of queueing                 |
| `Priority`          | No       | 1 to 10                                                                   |

> By default the call returns as soon as the message is **queued**, so success means queued, not delivered. Pass TRUE to `WaitForDelivery` to attempt it immediately. Limit 30 calls per minute.

```
=oa_telegram("rajan", "NIFTY crossed 26000")
=oa_telegram("rajan", "Position opened", TRUE)
```

The Telegram management endpoints (bot config, start, stop, linked users, broadcast, stats, per-user preferences) are deliberately **not** wrapped, matching the SDK, which exposes only the notification call. Reach them with `oa_request` when needed:

```
=oa_request("GET", "telegram/stats")
=oa_request("POST", "telegram/start")
```

---

### WebSocket Functions (Real-Time Streaming)

#### How It Works

Each streaming cell registers as its own **RTD topic**. When a tick arrives for that symbol, only the cells watching it update. Nothing is volatile, and the add-in never asks Excel to recalculate, so the rest of your workbook is untouched and Excel stays responsive.

The data functions **auto-subscribe**: just type the formula and the subscription is created in the background. A cell shows `Subscribing...` then `Waiting for data...` before the first tick arrives.

#### Connection Management

##### Connect to WebSocket

**Function:** `oa_ws_connect([WebSocketURL])`

Connects and authenticates using the API key set with `oa_api()`. The URL defaults to the saved value (`ws://127.0.0.1:8765`) and any URL you pass is persisted.

```
=oa_ws_connect()
=oa_ws_connect("wss://yourdomain.com/ws")
```

Subscriptions are restored automatically after a reconnect.

##### Disconnect

**Function:** `oa_ws_disconnect()`

Unsubscribes everything and closes the connection.

```
=oa_ws_disconnect()
```

##### Connection Status

| Function | Returns |
| --- | --- |
| `oa_ws_status()` | The current connection state |
| `oa_ws_ping()` | Round trip to the server in milliseconds |
| `oa_ws_brokers()` | Brokers supported by the connected server |
| `oa_ws_brokerinfo()` | Broker and adapter status for the authenticated session |

```
=oa_ws_status()
=oa_ws_ping()
=oa_ws_brokers()
=oa_ws_brokerinfo()
```

---

#### Streaming Data Functions

##### LTP

**Function:** `oa_ws_ltp(Symbol, Exchange)`

Streams the last traded price as a single number.

```
=oa_ws_ltp("RELIANCE", "NSE")
```

##### Quote

**Function:** `oa_ws_quote(Symbol, Exchange)`

Streams the full quote as a two-column key/value table.

```
=oa_ws_quote("RELIANCE", "NSE")
```

##### Depth

**Function:** `oa_ws_depth(Symbol, Exchange, [DepthLevel])`

Streams the order book as a seven-column table: Bid Orders, Bid Qty, Bid Price, LTP, Ask Price, Ask Qty, Ask Orders.

```
=oa_ws_depth("RELIANCE", "NSE")
=oa_ws_depth("RELIANCE", "NSE", 20)
```

##### Single Field

**Function:** `oa_ws_field(Symbol, Exchange, Field, [Mode])`

Streams one named field as a single value. `mode` defaults to 2 (Quote).

```
=oa_ws_field("RELIANCE", "NSE", "ltp")
=oa_ws_field("RELIANCE", "NSE", "volume", 2)
```

##### Order Updates

**Function:** `oa_ws_orders([MaxRows])`

Streams real-time order updates for the account as a table, newest first. Buffered up to 200 entries.

**Function:** `oa_ws_unsubscribe_orders()` stops the stream.

```
=oa_ws_unsubscribe_orders()
```

```
=oa_ws_orders()
=oa_ws_orders(20)
```

---

#### Update Rate

There are **two independent throttles** between a tick arriving and a cell changing. Both must be open for real-time updates.

| Throttle | Owned by | Default | Set with |
| --- | --- | --- | --- |
| How often the add-in pushes a topic | This add-in | 0 (every tick) | `oa_ws_throttle()` |
| How often Excel collects pushed values | Excel | **2000 ms** | `oa_rtd_interval()` |

##### Excel's RTD interval

**Function:** `oa_rtd_interval([Milliseconds])`

Excel applies its own limit, `Application.RTD.ThrottleInterval`, to every RTD server. It ships at **2000 ms**, so a streaming cell repaints only once every two seconds no matter how fast data arrives. Broker feeds run at roughly 1 to 11 updates per second, so Excel's default discards most of them and live data looks frozen.

The add-in sets this to 0 on load and again on `oa_ws_connect()`. Use this function to read or change it.

```
=oa_rtd_interval()      Read the value Excel is using
=oa_rtd_interval(0)     Update as soon as data arrives (default)
=oa_rtd_interval(2000)  Excel's own default
=oa_rtd_interval(-1)    Freeze streaming until a manual recalculation
```

This is a per-user Excel setting, not a workbook setting, and Excel persists it. `oa_version()` reports the live value, so a reading of 2000 there explains a sheet that looks stalled.

##### The add-in's own throttle

**Function:** `oa_ws_throttle([Milliseconds])`

Sets the minimum gap between two pushed updates for one streaming cell. Omit the argument to read the current value. The setting is persisted.

```
=oa_ws_throttle()       Read the current value
=oa_ws_throttle(0)      Default: push every tick
=oa_ws_throttle(250)    At most 4 updates per second per cell
```

The throttle is **leading plus trailing edge**. Its guarantee: *the last value the server sent for a topic always reaches the cell, at most `throttle` milliseconds late.* A tick held back by the throttle is released by a trailing flush rather than dropped, so the final print of an illiquid strike, or a closing price, never sits stale in the sheet.

Leave it at 0 for real-time behaviour. Raise it only if a very large sheet on a fast feed starts to feel heavy.

---

#### Subscription Management

##### Subscribe Manually

**Function:** `oa_ws_subscribe(Symbol, Exchange, Mode, [DepthLevel])`

```
=oa_ws_subscribe("RELIANCE", "NSE", 1)
=oa_ws_subscribe("RELIANCE", "NSE", 3, 20)
```

Per-mode shorthands matching the Python SDK's `subscribe_ltp`, `subscribe_quote` and `subscribe_depth`:

| Function | Equivalent to |
| --- | --- |
| `oa_ws_subscribe_ltp(symbol, exchange)` | `oa_ws_subscribe(..., 1)` |
| `oa_ws_subscribe_quote(symbol, exchange)` | `oa_ws_subscribe(..., 2)` |
| `oa_ws_subscribe_depth(symbol, exchange, [depth_level])` | `oa_ws_subscribe(..., 3)` |

```
=oa_ws_subscribe_ltp("RELIANCE", "NSE")
=oa_ws_subscribe_quote("RELIANCE", "NSE")
=oa_ws_subscribe_depth("RELIANCE", "NSE", 20)
```

##### Unsubscribe

| Function                                      | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `oa_ws_unsubscribe(symbol, exchange, mode)`    | One symbol and mode         |
| `oa_ws_unsubscribe_ltp(symbol, exchange)`      | LTP only                    |
| `oa_ws_unsubscribe_quote(symbol, exchange)`    | Quote only                  |
| `oa_ws_unsubscribe_depth(symbol, exchange)`    | Depth only                  |
| `oa_ws_unsubscribe_all()`                      | Everything                  |

```
=oa_ws_unsubscribe("RELIANCE", "NSE", 1)
=oa_ws_unsubscribe_ltp("RELIANCE", "NSE")
=oa_ws_unsubscribe_quote("RELIANCE", "NSE")
=oa_ws_unsubscribe_depth("RELIANCE", "NSE")
=oa_ws_unsubscribe_all()
```

After a manual unsubscribe the cell shows `Unsubscribed` and does **not** auto-resubscribe.

##### View Active Subscriptions

**Function:** `oa_ws_subscriptions()`

```
=oa_ws_subscriptions()
```

##### Debug

**Function:** `oa_ws_debug(Symbol, Exchange, Mode)`

Shows subscription status and cached data keys.

```
=oa_ws_debug("RELIANCE", "NSE", 1)
```

---

#### WebSocket Data Modes

| Mode | Name  | Contents                                      |
| ---- | ----- | --------------------------------------------- |
| 1    | LTP   | Last traded price only, lightest              |
| 2    | Quote | OHLC, volume, LTP, change                     |
| 3    | Depth | Full order book, 5 to 50 levels by broker     |

---

#### WebSocket Quick Start Example

```
A1: =oa_api("your_api_key")
A2: =oa_ws_connect()
A3: =oa_ws_status()

A5: =oa_ws_ltp("RELIANCE", "NSE")
A6: =oa_ws_ltp("TCS", "NSE")
A7: =oa_ws_ltp("INFY", "NSE")

A9: =oa_ws_depth("RELIANCE", "NSE")
```

---

### Debugging and Logs

| Location                                       | Contents                                  |
| ---------------------------------------------- | ----------------------------------------- |
| `%LOCALAPPDATA%\OpenAlgo\websocket.log`        | WebSocket connection and subscription log |
| `%LOCALAPPDATA%\OpenAlgo\config.json`          | Saved API key, host URL, and settings     |

Start any troubleshooting with `=oa_version()` and `=oa_ping()`.

---

### Notes

* All functions require `oa_api()` to be configured first. The key is persisted, so this is normally a one-time step.
* Order functions send as soon as they are called. `oa_trading_enabled(FALSE)` is an optional guard against a recalculation re-placing an order.
* Streaming functions (`oa_ws_ltp`, `oa_ws_quote`, `oa_ws_depth`, `oa_ws_field`, `oa_ws_orders`) update by RTD push. They are **not** volatile and do not trigger workbook recalculation.
* If streaming looks frozen, check `oa_rtd_interval()`. Excel caps RTD collection at 2000 ms by default; the add-in lowers it to 0, but a policy or another add-in can raise it again.
* **REST functions cache their result.** Excel-DNA keys the async result on the function name plus its arguments, so a function such as `oa_funds()` fetches once and keeps returning the same value. Press **Ctrl+Alt+F9** to force a full rebuild and refetch, or edit the formula.
* Cells show `#N/A` while a request is in flight.
* Order IDs and instrument tokens are returned as **text**, so they keep their exact digits. Reference them directly rather than retyping.
* Timestamps are converted to IST. `oa_history` returns a real Excel date serial that charts directly.
* Functions are grouped in the Excel function wizard under categories beginning with `OpenAlgo`.
* The add-in ships IntelliSense, so argument names and descriptions appear as you type.

---

### Function Index

| Category           | Functions                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration      | `oa_api`, `oa_version`, `oa_ping`, `oa_trading_enabled`, `oa_request`, `oa_json`                                                                                                                                        |
| Account            | `oa_funds`, `oa_orderbook`, `oa_orderbook_stats`, `oa_tradebook`, `oa_positionbook`, `oa_holdings`, `oa_holdings_stats`, `oa_margin`                                                                                    |
| Market Data        | `oa_ltp`, `oa_field`, `oa_quotes`, `oa_multiquotes`, `oa_depth`, `oa_history`, `oa_intervals`                                                                                                                           |
| Symbols            | `oa_symbol`, `oa_search`, `oa_expiry`, `oa_lotsize`, `oa_token`                                                                                                                                       |
| Options            | `oa_optionchain`, `oa_optiongreeks`, `oa_multioptiongreeks`, `oa_optionsymbol`, `oa_syntheticfuture`, `oa_optionsorder`, `oa_optionsmultiorder`                                                                         |
| Orders             | `oa_placeorder`, `oa_placesmartorder`, `oa_basketorder`, `oa_splitorder`, `oa_modifyorder`, `oa_cancelorder`, `oa_cancelallorder`, `oa_closeposition`, `oa_orderstatus`, `oa_openposition`                              |
| GTT                | `oa_placegttorder`, `oa_modifygttorder`, `oa_cancelgttorder`, `oa_gttorderbook`                                                                                                                                         |
| Analyzer           | `oa_analyzerstatus`, `oa_analyzertoggle`, `oa_pnl_symbols`                                                                                                                                                                   |
| Calendar           | `oa_holidays`, `oa_timings`, `oa_isholiday`                                                                                                                                                                             |
| Chart              | `oa_chart`, `oa_chart_set`                                                                                                                                                                                              |
| Messaging          | `oa_whatsapp`, `oa_telegram`                                                                                                                                                                                         |
| WebSocket          | `oa_ws_connect`, `oa_ws_disconnect`, `oa_ws_status`, `oa_ws_ping`, `oa_ws_brokers`, `oa_ws_brokerinfo`, `oa_ws_ltp`, `oa_ws_quote`, `oa_ws_depth`, `oa_ws_field`, `oa_ws_orders`, `oa_ws_throttle`, `oa_rtd_interval`, `oa_ws_subscribe`, `oa_ws_subscribe_ltp`, `oa_ws_subscribe_quote`, `oa_ws_subscribe_depth`, `oa_ws_unsubscribe`, `oa_ws_unsubscribe_ltp`, `oa_ws_unsubscribe_quote`, `oa_ws_unsubscribe_depth`, `oa_ws_unsubscribe_orders`, `oa_ws_unsubscribe_all`, `oa_ws_subscriptions`, `oa_ws_debug` |

---

### Support and Contributions

* **Issues**: Report issues at the [repository's issue tracker](https://github.com/marketcalls/OpenAlgo-Excel/issues).
* **Contributions**: PRs are welcome to improve features, documentation, or bug fixes.
* **License**: OpenAlgo is open-source and distributed under the **AGPL-3.0 License**.

### References

* [OpenAlgo API Docs](https://docs.openalgo.in/api-documentation/v1/)
* [OpenAlgo Excel Add-In on GitHub](https://github.com/marketcalls/OpenAlgo-Excel)
* [Excel-DNA Documentation](https://excel-dna.net/)
* [Download .NET 8 Desktop Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)

### Disclaimer

The creators of this add-in are not responsible for any issues, losses, or damages that may arise from its use. It is strongly recommended to test all functionalities in OpenAlgo Analyzer Mode before applying them to live trading. Always verify API responses and exercise caution while executing trades.
