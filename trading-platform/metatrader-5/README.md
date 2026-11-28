# Metatrader 5

MetaTrader 5 is where many traders chart and run Expert Advisors, but its own order functions talk to a forex or CFD broker, not to an Indian broker. The OpenAlgo MQL5 SDK closes that gap. Your Expert Advisor or script keeps generating signals in MetaTrader 5, and every order, data request or alert goes to your own OpenAlgo server, which sends it on to the Indian broker you connected there.

**Download:** [OpenAlgo-MQL5-v1.0.0.zip](https://github.com/marketcalls/openalgo-mt5-connector/releases/download/v1.0.0/OpenAlgo-MQL5-v1.0.0.zip) (version 1.0.0, MIT license). Later versions are published on the [releases page](https://github.com/marketcalls/openalgo-mt5-connector/releases). Installation is covered in [Download & Install Library](download-and-install-library.md).

### What it does for you

* Turns an EA signal into a broker order: place, modify and cancel orders, smart orders that bring a position to a target size, basket and split orders, GTT triggers, and option orders picked by offset (ATM, ITM2, OTM3) instead of a hard-coded strike.
* Reads your account from inside MetaTrader: funds, order book, trade book, positions, holdings, margin and charges.
* Fetches market data: quotes, market depth, historical candles, option chains, Greeks, expiry dates and symbol lookups.
* Streams live LTP, quotes, depth and your own order updates over the OpenAlgo WebSocket feed.
* Sends alerts to Telegram, WhatsApp, Discord or Slack.
* Controls OpenAlgo's Strategy RMS module, by strategy id with your API key or through a strategy's webhook token.

The broker login, symbol mapping, analyzer (sandbox) mode, order logging and rate limits all stay in OpenAlgo. MetaTrader only sends requests and reads the answers.

### Same calls as the Python SDK

The SDK is the MetaTrader 5 twin of the [OpenAlgo Python SDK](../python/README.md). It uses the same method names, the same parameter names in the same order, and sends the same JSON to OpenAlgo. If you know the Python call, you know the MQL5 call.

Python:

```python
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')
client.placeorder(strategy="Python", symbol="NHPC", action="BUY", exchange="NSE",
                  price_type="MARKET", product="MIS", quantity=1)
```

MQL5:

```cpp
api client("your_api_key_here", "http://127.0.0.1:5000");
client.placeorder("Python", "NHPC", "BUY", "NSE", "MARKET", "MIS", 1);
```

MQL5 has no keyword arguments, so the arguments are passed by position, in the Python order. [OpenAlgo MQL5 Functions](openalgo-mql5-functions.md) explains that rule once and then lists every call with an example and its response.

### What it covers

| Area | Calls |
| --- | --- |
| Orders | `placeorder`, `placesmartorder`, `basketorder`, `splitorder`, `modifyorder`, `cancelorder`, `cancelallorder`, `closeposition`, `orderstatus`, `openposition` |
| GTT orders | `placegttorder`, `modifygttorder`, `cancelgttorder`, `gttorderbook` |
| Options | `optionsorder`, `optionsmultiorder`, `optionsymbol`, `optionchain`, `optiongreeks`, `multioptiongreeks`, `syntheticfuture` |
| Market data | `quotes`, `multiquotes`, `depth`, `history`, `intervals`, `symbol`, `search`, `expiry`, `instruments`, `ticker` |
| Account | `ping`, `funds`, `margin`, `charges`, `orderbook`, `tradebook`, `positionbook`, `holdings`, `analyzerstatus`, `analyzertoggle`, `pnlsymbols`, `chart` |
| Strategy RMS | `strategylist`, `strategystatus`, `strategystart`, `strategystop`, `strategycloseall`, `strategycloseleg`, `strategyruns`, `strategyorders`, `strategyevents`, and the `OAStrategy` webhook class |
| Alerts | `telegram`, `whatsapp`, `discord`, `slack`, and the Telegram bot management calls |
| Utilities and analytics | `holidays`, `timings`, SIP backtest, portfolio backtest and tearsheet, portfolio holdings analysis, sector rotation |
| WebSocket feed | `connect`, `subscribe_ltp`, `subscribe_quote`, `subscribe_depth`, `subscribe_orders`, `get_ltp`, `get_quotes`, `get_depth`, `poll` |

That is every REST endpoint in the [OpenAlgo API documentation](../../api-documentation/v1/README.md) that an application calls, plus the WebSocket feed. Endpoints that the Python SDK does not wrap (ticker, P\&L by symbol, chart preferences, multi-option Greeks, Telegram bot management, SIP backtest, portfolio analytics and sector rotation) are included too, named after their endpoint path. The Telegram bot's inbound webhook is the one route left out, because only Telegram's servers call it.

### Two ways to send requests

The SDK can reach OpenAlgo through either of two transports. Both send exactly the same requests.

| | WebRequest (default) | WinINet |
| --- | --- | --- |
| How to choose it | Nothing to do | `#define OPENALGO_USE_WININET` before the include |
| MetaTrader setting | Add the OpenAlgo URL under **Tools > Options > Expert Advisors > Allow WebRequest for listed URL** | Tick **Allow DLL imports** (Tools > Options > Expert Advisors, and in the program's properties) |
| Expert Advisors and scripts | Yes | Yes |
| Indicators | No, MetaTrader blocks `WebRequest` in indicators | Yes |
| HTTPS | Yes | Yes, with certificate checks |

Use the default unless you need to call OpenAlgo from an indicator. The WebSocket feed always uses MetaTrader's own sockets, works in Expert Advisors and scripts, and needs its host on the same WebRequest list.

### Built-in safety

* **Strategy Tester:** in the Strategy Tester and the optimizer every request is refused with `error_type` `tester_blocked`, and the WebSocket feed opens no connection. A backtest of your EA can never reach your live account. Defining `OPENALGO_ALLOW_IN_TESTER` before the include lifts this.
* **Analyzer mode:** run new code with OpenAlgo in analyzer (sandbox) mode first, so orders are simulated. Switch it from the OpenAlgo dashboard or with `client.analyzertoggle(true)`.
* **Opt-in examples:** the sample EA only prints its signals until you set `EnableOrders = true`, and the order examples script sends nothing until `ConfirmLiveOrders = true`.
* **Secrets:** the API key is never printed, not even in verbose logs.

### Before you start

* MetaTrader 5 desktop terminal with MetaEditor.
* OpenAlgo installed, running and logged in to your broker.
* Your OpenAlgo API key from the API Key page of the OpenAlgo dashboard. This is not your broker's API key.
* The URL where MetaTrader can reach OpenAlgo: `http://127.0.0.1:5000` when both run on the same computer, otherwise your domain, for example `https://yourdomain.com`.
* For live streaming, the WebSocket address: `ws://127.0.0.1:8765` on a local install, `wss://yourdomain.com/ws` behind TLS. The SDK works this out from the URL above.
* Symbols written in the OpenAlgo format: `SBIN` for equities (no `-EQ` suffix), `NIFTY30DEC25FUT` for futures, `NIFTY30DEC2526000CE` for options. See [Symbol Format](../../symbol-format.md).

### Moving from the old six-function library

Version 1.0.0 replaces the earlier library that shipped `OpenAlgoApi.mqh` with six `void` functions. The old calls map one to one onto the new ones:

| Old call (`OpenAlgoApi.mqh`) | New call (`OpenAlgo.mqh`) |
| --- | --- |
| `PlaceOrder("BUY", 10, url, key, "Meta Strategy", "SBIN", NSE, MIS, MARKET)` | `client.placeorder("Meta Strategy", "SBIN", "BUY", "NSE", "MARKET", "MIS", 10)` |
| `PlaceSmartOrder(...)` | `client.placesmartorder(...)` |
| `ModifyOrder(...)` | `client.modifyorder(...)` |
| `CancelOrder(orderid, url, key, strategy)` | `client.cancelorder(orderid, strategy)` |
| `ClosePosition(url, key, strategy)` | `client.closeposition(strategy)` |
| `CancelAllOrders(url, key, strategy)` | `client.cancelallorder(strategy)` |

What changed:

* The URL and API key are given once, when you create the client, instead of on every call.
* The `Exchanges`, `ProductTypes` and `PriceTypes` enums are gone. Exchange, product and price type are plain strings such as `"NSE"`, `"MIS"` and `"SL-M"`.
* Every call returns OpenAlgo's response, so the EA can read the order id or the error instead of searching the Experts log.
* The old library always used `wininet.dll`. The new one uses `WebRequest` by default, so add your OpenAlgo URL to the WebRequest list, or put `#define OPENALGO_USE_WININET` before the include to keep the DLL route.

The old files (`OpenAlgoApi.mqh`, `CommonDefs.mqh`, `UrlParser.mqh`, `WinINet.mqh`) do not clash with the new ones. Delete them once none of your EAs includes `OpenAlgoApi.mqh` any more.

### In this section

* [Download & Install Library](download-and-install-library.md): get the release zip, copy it into MetaTrader and allow the OpenAlgo URL.
* [Include the Header File](include-the-header-file.md): the include line, the client, inputs and reading responses.
* [OpenAlgo MQL5 Functions](openalgo-mql5-functions.md): every call with an example and its response.
* [Sample Expert Advisor](sample-expert-advisor.md): a complete EMA crossover EA that trades through OpenAlgo.
* [WebSocket Feed](websocket-feed.md): streaming LTP, quotes, depth and order updates into an EA.

Source code, issues and release notes: [github.com/marketcalls/openalgo-mt5-connector](https://github.com/marketcalls/openalgo-mt5-connector).
