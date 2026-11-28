# NinjaTrader 8

NinjaTrader 8 is where many traders chart, build indicators and run automated strategies, but its own order routing talks to the brokers NinjaTrader supports, not to an Indian broker. The OpenAlgo NinjaScript SDK closes that gap. Your strategy, indicator or add-on keeps doing its analysis in NinjaTrader, and every order, data request or alert goes to your own OpenAlgo server, which sends it on to the Indian broker you connected there.

**Download:** [OpenAlgo-NT8-v1.0.0.zip](https://github.com/marketcalls/openalgo-nt8-connector/releases/download/v1.0.0/OpenAlgo-NT8-v1.0.0.zip) (version 1.0.0, MIT license). Later versions are published on the [releases page](https://github.com/marketcalls/openalgo-nt8-connector/releases). Installation is covered in [Download & Install](download-and-install.md).

### What it does for you

* Turns a NinjaTrader signal into a broker order: place, modify and cancel orders, smart orders that bring a position to a target size, basket and split orders, GTT triggers, and option orders picked by offset (ATM, ITM2, OTM3) instead of a hard-coded strike.
* Reads your account from inside NinjaTrader: funds, order book, trade book, positions, holdings, margin and charges.
* Fetches market data: quotes, market depth, historical candles, option chains, Greeks, expiry dates and symbol lookups.
* Streams live ticks (LTP, quotes, depth) and your own order updates over the OpenAlgo WebSocket feed.
* Sends alerts to Telegram, WhatsApp, Discord or Slack.
* Controls OpenAlgo's Strategy RMS module, by strategy id with your API key or through a strategy's webhook token.

The broker login, symbol mapping, analyzer mode (sandbox), order logging and rate limits all stay in OpenAlgo. NinjaTrader only sends requests and reads the answers. No NinjaTrader order is placed: the position lives in your broker account, and you read it back with `openposition`, `positionbook` or the order feed.

### Same calls as the Python SDK

The SDK is the NinjaTrader 8 twin of the [OpenAlgo Python SDK](../python/README.md), as the [MQL5 SDK](../metatrader-5/README.md) is its MetaTrader 5 twin. It uses the same method names and the same parameter names, and sends the same JSON to OpenAlgo, checked request by request against the Python SDK. C# has named arguments, so a call reads like the Python call.

Python:

```python
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')
client.placeorder(strategy="Python", symbol="NHPC", action="BUY", exchange="NSE",
                  price_type="MARKET", product="MIS", quantity=1)
```

NinjaScript (C#):

```csharp
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;

api client = new api(api_key: "your_api_key_here", host: "http://127.0.0.1:5000", owner: this);
OAJson response = client.placeorder(strategy: "Python", symbol: "NHPC", action: "BUY", exchange: "NSE",
                                    price_type: "MARKET", product: "MIS", quantity: 1);
Print(response.ToString());   // {"orderid":"250408000989443","status":"success"}
```

`owner: this` hands the client your strategy or indicator, which switches on the safety guard described below. [OpenAlgo NinjaScript Functions](openalgo-ninjascript-functions.md) lists every call with an example and its response.

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
| WebSocket feed | `connect`, `connect_async`, `subscribe_ltp`, `subscribe_quote`, `subscribe_depth`, `subscribe_orders`, `get_ltp`, `get_quotes`, `get_depth`, connection hooks |
| Client | `enqueue` and `run_async` (the ordered background queue), `post` and `get` (raw calls), `close` |

That is every REST endpoint in the [OpenAlgo API documentation](../../api-documentation/v1/README.md) that an application calls, plus the WebSocket feed. Endpoints that the Python SDK does not wrap (ticker, P\&L by symbol, chart preferences, multi-option Greeks, Telegram bot management, SIP backtest, portfolio analytics and sector rotation) are included too, named after their endpoint path, the same set the MQL5 SDK added. The Telegram bot's inbound webhook is the one route left out, because only Telegram's servers call it.

### Calls never have to block your chart

A call waits until OpenAlgo answers. Inside `OnBarUpdate` or `OnStateChange` that would hold up NinjaTrader's own thread for the instrument, so the client also has an ordered background queue:

```csharp
client.enqueue(c => c.placesmartorder(strategy: "NinjaTrader", symbol: "RELIANCE", action: "BUY", exchange: "NSE",
                   price_type: "MARKET", product: "MIS", quantity: 1, position_size: 1),
               r => Print("order: " + r.ToString()));
```

* Queued calls run one at a time, in the order you queued them, on one background thread of the client. Two orders queued one after the other reach OpenAlgo in that order.
* The callback (`r => ...`) runs on that background thread. `Print` is fine there; charts, series and drawings are not. [Using the Add-On](using-the-addon.md#calls-that-wait-and-the-ordered-queue) shows how to hand a result back to your script.
* The client is thread-safe and keeps one pooled connection to OpenAlgo. Every call returns a new response object, and no call throws for a network, HTTP or server error: failures come back as an error response, exactly as in Python.

### Built-in safety

* **Backtests and Market Replay:** with `owner: this`, every request is refused while your script processes historical data (the historical bars of a chart, Strategy Analyzer backtests, optimizations and walk-forward runs) and while the Playback connection is in use. The refusal comes back with `error_type` `historical_blocked` or `playback_blocked`, and the WebSocket feed opens no connection. A backtest or a replay can never reach your live account. `allow_historical: true` and `allow_playback: true` lift the guard; leave them off unless you are sure.
* **Analyzer mode:** run new code with OpenAlgo in analyzer mode (sandbox) first, so orders are simulated. Switch it from the OpenAlgo dashboard or with `client.analyzertoggle(mode: true)`, and check it with `client.analyzerstatus()`.
* **Opt-in samples:** the sample strategy only prints its signals until **Enable orders** is ticked, and the order examples strategy sends nothing until **Confirm live orders** is ticked, and then only while OpenAlgo is in analyzer mode unless **Allow live mode** is ticked as well.
* **Account-wide calls:** `closeposition` and `cancelallorder` act on the whole account, not on one strategy.
* **Secrets:** the API key is never printed, not even in the most detailed log. The samples mask it in the property grid, but NinjaTrader saves strategy and indicator inputs in your workspace and template files like any other input, so keep those files private.

### Before you start

* NinjaTrader 8 desktop (the SDK is built and checked against 8.1.9.1). Nothing else to install: the SDK is plain NinjaScript source that uses only .NET Framework assemblies NinjaTrader already references.
* OpenAlgo installed, running and logged in to your broker.
* Your OpenAlgo API key from the API Key page of the OpenAlgo dashboard. This is not your broker's API key.
* The URL where NinjaTrader can reach OpenAlgo: `http://127.0.0.1:5000` when both run on the same computer, otherwise your domain, for example `https://yourdomain.com`.
* For streaming, the WebSocket address: `ws://127.0.0.1:8765` on a local install, `wss://yourdomain.com/ws` behind TLS. The SDK works this out from the URL above.
* Symbols written in the OpenAlgo format: `SBIN` for equities (no `-EQ` suffix), `NIFTY30DEC25FUT` for futures, `NIFTY30DEC2526000CE` for options. See [Symbol Format](../../symbol-format.md). The chart in NinjaTrader can show any instrument: it produces the signal, and the order goes to the OpenAlgo symbol you name.

### In this section

* [Download & Install](download-and-install.md): get the release zip, copy it into NinjaTrader, compile it and run the self-test.
* [Using the Add-On](using-the-addon.md): the using line, creating the client in a strategy, inputs, reading responses and the background queue.
* [OpenAlgo NinjaScript Functions](openalgo-ninjascript-functions.md): every call with its C# signature, an example and its response.
* [Sample Strategy](sample-strategy.md): a complete EMA crossover strategy that trades through OpenAlgo.
* [WebSocket Feed](websocket-feed.md): streaming LTP, quotes, depth and order updates into a strategy or indicator.

Source code, issues and release notes: [github.com/marketcalls/openalgo-nt8-connector](https://github.com/marketcalls/openalgo-nt8-connector).
