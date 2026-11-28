# Using the Add-On

Every NinjaScript that talks to OpenAlgo starts the same way: one using line, one client created when the script reaches real time, and a few inputs for your API key and trade settings. This page shows that pattern, how to read the answers OpenAlgo sends back, and how to keep network calls off NinjaTrader's own threads.

The SDK lives in `bin\Custom\AddOns\OpenAlgo`, but it is not an add-on window you open. It is a library that your own strategies, indicators and add-ons use.

### The using line

```csharp
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;
```

Put it in the `#region Using declarations` block at the top of your script. It brings in the whole SDK: the `api` client, the `OAStrategy` webhook class, the `OAJson` response type and `OpenAlgoSdk` with the version numbers.

```csharp
Print(OpenAlgoSdk.Version);            // 1.0.0
Print(OpenAlgoSdk.PythonSdkVersion);   // 2.4.1, the Python SDK whose calls it mirrors
```

### Create the client

```csharp
api client = new api("your_api_key_here", "http://127.0.0.1:5000", owner: this);
```

Use your OpenAlgo API key and the URL of your OpenAlgo server: the default `http://127.0.0.1:5000` when NinjaTrader and OpenAlgo run on the same computer, or your domain, for example `https://yourdomain.com`. `owner: this` passes the calling strategy, indicator or add-on to the client, which switches on the safety guard and sends the SDK's log lines to that script's Output tab.

The full constructor mirrors the Python `api(...)` constructor; the last four parameters are the NinjaTrader additions:

```csharp
api(string api_key, string host = "http://127.0.0.1:5000", string version = "v1", double timeout = 120.0,
    int? ws_port = null, string ws_url = null, int verbose = 0, bool auto_reconnect = true,
    object owner = null, bool allow_historical = false, bool allow_playback = false, Action<string> log = null);
```

| Parameter | Meaning |
| --- | --- |
| `api_key` | Your OpenAlgo API key. The SDK never prints it. |
| `host` | URL of your OpenAlgo server. REST calls go to `host` + `/api/` + `version` + `/`. A trailing slash is removed. |
| `version` | API version, `"v1"`. |
| `timeout` | Request timeout in seconds. |
| `ws_port` | WebSocket port. `null` means "not passed": the feed uses port 8765, or `wss://<host>/ws` when `host` starts with `https://`. |
| `ws_url` | Full WebSocket URL. `null` means "not passed": the URL is worked out from `host` and `ws_port`. |
| `verbose` | Log level: `0` silent, `1` connection and failure lines, `2` every request and every feed message. The API key is masked in every line. |
| `auto_reconnect` | After a drop the feed reconnects and replays your subscriptions by itself. |
| `owner` | The calling NinjaScript (`this`). Turns on the safety guard and routes log lines to its Output tab. |
| `allow_historical` | `true` lets requests through while the owner processes historical data, Strategy Analyzer runs included. Leave it `false`. |
| `allow_playback` | `true` lets requests through while the Playback connection (Market Replay) is in use. Leave it `false`. |
| `log` | Your own log sink. When set, every log line goes there instead of the Output window. |

How the feed address is worked out from `host`:

| `host` | Feed URL |
| --- | --- |
| `http://127.0.0.1:5000` | `ws://127.0.0.1:8765` |
| `https://yourdomain.com` | `wss://yourdomain.com/ws` |
| `https://yourdomain.com` with `ws_port: 8765` | `ws://yourdomain.com:8765` |
| any, with `ws_url` set | `ws_url` as given |

Only the REST part of the SDK needs `host`. If you never use the feed, `ws_port`, `ws_url` and `auto_reconnect` can stay at their defaults. With named arguments you pass only what you change, in any order:

```csharp
api client = new api("your_api_key_here", "http://127.0.0.1:5000", ws_url: "ws://127.0.0.1:8765", verbose: 1, owner: this);
```

### The client in a strategy

Create the client when the script reaches real time, and close it when the script ends. NinjaTrader calls `OnStateChange` for instances that never run (the property grid and the strategy list create them), so never create a client in `State.SetDefaults`.

```csharp
#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
    public class MyOpenAlgoStrategy : Strategy
    {
        private api client;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name             = "MyOpenAlgoStrategy";
                Calculate        = Calculate.OnBarClose;
                ApiKey           = "";
                HostUrl          = "http://127.0.0.1:5000";
                OpenAlgoSymbol   = "RELIANCE";
                OpenAlgoExchange = "NSE";
                OpenAlgoProduct  = "MIS";
                Quantity         = 1;
                EnableOrders     = false;
            }
            else if (State == State.Realtime)
            {
                if (string.IsNullOrEmpty(ApiKey))
                {
                    Print(Name + ": enter your OpenAlgo API key. Nothing is sent.");
                    return;
                }
                // owner: this refuses every request while the strategy is historical,
                // in the Strategy Analyzer or on the Playback connection
                client = new api(ApiKey, HostUrl, owner: this);

                // a read-only call on the ordered queue: OnStateChange does not wait for it
                string name = Name;
                client.enqueue(c => c.analyzerstatus(),
                               r => Print(name + ": OpenAlgo mode is " + r.Str("data.mode")));
            }
            else if (State == State.Terminated)
            {
                if (client != null)
                {
                    client.close();
                    client = null;
                }
            }
        }

        protected override void OnBarUpdate()
        {
            if (State != State.Realtime || client == null || CurrentBar < 1 || !EnableOrders)
                return;
            if (Close[0] > High[1])
            {
                // copy the inputs: the queued call runs later, on another thread
                string symbol = OpenAlgoSymbol, exchange = OpenAlgoExchange, product = OpenAlgoProduct;
                double quantity = Quantity;
                // target a long position of Quantity; OpenAlgo trades only the difference
                client.enqueue(c => c.placesmartorder(strategy: "NinjaTrader", symbol: symbol, action: "BUY",
                                   exchange: exchange, price_type: "MARKET", product: product,
                                   quantity: quantity, position_size: quantity),
                               r => Print("order: " + r.ToString()));
            }
        }

        [PasswordPropertyText(true)]
        [Display(Name = "API key", GroupName = "OpenAlgo", Order = 1)]
        public string ApiKey { get; set; }

        [Display(Name = "Host", GroupName = "OpenAlgo", Order = 2)]
        public string HostUrl { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "OpenAlgo symbol", GroupName = "OpenAlgo", Order = 3)]
        public string OpenAlgoSymbol { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "OpenAlgo exchange", GroupName = "OpenAlgo", Order = 4)]
        public string OpenAlgoExchange { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Product", GroupName = "OpenAlgo", Order = 5)]
        public string OpenAlgoProduct { get; set; }

        [NinjaScriptProperty]
        [Range(1, double.MaxValue)]
        [Display(Name = "Quantity", GroupName = "OpenAlgo", Order = 6)]
        public double Quantity { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable orders", GroupName = "OpenAlgo", Order = 7)]
        public bool EnableOrders { get; set; }
    }
}
```

* `State.Realtime` comes after the chart's historical bars are processed, so the client only exists while the strategy can act on new bars. `State.DataLoaded` works too; while the strategy then processes its historical bars, the safety guard refuses every request.
* NinjaTrader runs `State.Terminated` whenever the script is removed, disabled or reloaded, so `client.close()` there releases the connection, and the next run builds a fresh client with the current inputs.
* The chart's instrument produces the signal; the order goes to the OpenAlgo symbol you name. No NinjaTrader order is placed: the position lives in your broker account, so read it with `openposition`, `positionbook` or the order feed.
* `OnBarUpdate` never waits for the network: the order goes through `client.enqueue`, described [below](#calls-that-wait-and-the-ordered-queue).

#### Inputs

Put everything a trader might change into public properties with a `[Display]` attribute, so they show up in the strategy's properties:

* Mark the API key with `[PasswordPropertyText(true)]`, so the property grid shows dots instead of the key.
* Do not put `[NinjaScriptProperty]` on the API key or the host. That attribute adds an input to the strategy's label on the chart and in the Strategies tab, which would print it for anyone to see. Use it for trade settings (symbol, quantity), which then appear in the label and can be optimized.
* NinjaTrader saves inputs in your workspace and template files, the API key included, so keep those files private.

#### Values for exchange, product and price type

These are plain strings, exactly as in the Python SDK and the REST API. The full list is on [Order Constants](../../api-documentation/v1/order-constants.md).

| Parameter | Values |
| --- | --- |
| `exchange` | `NSE`, `NFO`, `CDS`, `BSE`, `BFO`, `BCD`, `MCX`, `NCDEX`, `NCO`, `NSE_INDEX`, `BSE_INDEX`, `MCX_INDEX`, `GLOBAL_INDEX`, `CRYPTO` |
| `product` | `CNC` (delivery), `NRML` (futures and options carry), `MIS` (intraday) |
| `price_type` | `MARKET`, `LIMIT`, `SL`, `SL-M` |
| `action` | `BUY`, `SELL` |

Quantity is always in units, never lots: one NIFTY lot of 65 is a quantity of 65.

#### Symbols

The symbol you send is the OpenAlgo symbol, not the NinjaTrader instrument name or the broker symbol. Equities carry no suffix (`SBIN`, `RELIANCE`, never `SBIN-EQ`). Futures are `[Symbol][DD][MMM][YY]FUT`, for example `NIFTY30DEC25FUT`. Options are `[Symbol][DD][MMM][YY][Strike][CE/PE]`, for example `NIFTY30DEC2526000CE`. See [Symbol Format](../../symbol-format.md).

#### Naming your inputs

* Name inputs after what they hold in OpenAlgo, for example `OpenAlgoSymbol`, `OpenAlgoExchange` and `OpenAlgoProduct`, as the samples do. NinjaScript already has members such as `Name`, `Description`, `Instrument` and `Calculate`, and `Strategy` is the base class of every strategy, so avoid those names.
* The SDK's parameters are the lowercase Python names (`symbol`, `exchange`, `quantity`, `strategy`). C# tells `symbol` and `Symbol` apart, so an input never clashes with a parameter, and a named argument always says which parameter it fills: `symbol: OpenAlgoSymbol`.

### Reading responses with OAJson

Every request method returns an `OAJson`, OpenAlgo's answer:

* It is never `null`, and each call returns a new object. Keep it as long as you like; the next call does not change it.
* Reading never throws. A missing value returns the default you pass (or `""`, `0`, `false`).
* Reading never changes the object, so several threads can read one response at the same time, for example one stored by a queued call and read in `OnBarUpdate`.

Values are read by path. A path uses dots between keys and either `.0` or `[0]` for array positions:

```csharp
OAJson r = client.depth(symbol: "SBIN", exchange: "NSE");
if (r.Str("status") == "success")
{
    double bestBid = r.Num("data.bids.0.price");
    double bestAsk = r.Num("data.asks[0].price");
    long volume = r.Int("data.volume");
    Print("SBIN bid " + bestBid + " ask " + bestAsk + " volume " + volume);
}
else
    Print("depth failed: " + r.Str("message"));
```

The readers take a path and a default:

```csharp
string Str(string path = "", string def = "");
double Num(string path = "", double def = 0);
double Dbl(string path = "", double def = 0);
long Int(string path = "", long def = 0);
bool Bool(string path = "", bool def = false);
```

`Str` of a number returns its text exactly as OpenAlgo sent it, and `Num` of a numeric string parses it. Values that the broker sends as strings, such as `"availablecash": "320.66"` in `funds()`, therefore read the same way as real numbers, and a long order id never loses a digit. `Dbl` is the same as `Num` (the MQL5 SDK's name).

Arrays and objects can be walked with `foreach`, or with an index and `Count`:

```csharp
OAJson r = client.positionbook();
foreach (OAJson row in r["data"])
    Print(row.Str("symbol") + "  qty " + row.Num("quantity") + "  pnl " + row.Num("pnl"));
```

`Print(r.ToString())` prints the whole answer as one line of JSON, `Print(r.Pretty())` prints it indented. JSON keys can arrive in a different order from the examples in these docs, so always read values by name.

`OAJson` at a glance:

| Purpose | Members |
| --- | --- |
| Read | `Str`, `Num`, `Dbl`, `Int`, `Bool`, `Path(path)`, indexers `r["key"]` and `r[0]`, `Has(key)`, `Count` and `Size()`, `Keys`, `Members`, `KeyAt(i)`, `foreach` |
| Check the type | `Type`, `IsNull`, `IsBool`, `IsNumber`, `IsString`, `IsArray`, `IsObject`, `IsMissing` |
| Build | `OAJson.NewObject()`, `OAJson.NewArray()`, `OAJson.From(value)`, `Set(key, value)`, `SetOpt`, `SetStr`, `SetObject`, `SetArray`, `Add(value)`, `AddObject()`, `AddArray()`, `Remove`, `RemoveAt`, `Clear`, `Clone` |
| Text | `OAJson.Parse(text)`, `OAJson.TryParse(text, out value)`, `ToString()` (one line), `Pretty()` (indented) |
| Transport | `HttpStatus` (the HTTP status, `-1` when no answer arrived, `0` when nothing was sent), `RawBody` (the raw answer) |

#### Building lists for a request

Where Python takes a list of dicts (`orders`, `legs`, `symbols`, `positions`, `instruments`, `holdings`), the C# parameter is an `object`, and the SDK turns whatever you pass into JSON. The shortest form is an array of anonymous objects, whose property names become the JSON keys:

```csharp
// Python: [{"symbol": "RELIANCE", "exchange": "NSE"}, {"symbol": "TCS", "exchange": "NSE"}]
OAJson r = client.multiquotes(symbols: new[] {
    new { symbol = "RELIANCE", exchange = "NSE" },
    new { symbol = "TCS", exchange = "NSE" } });
```

All entries of a `new[] { ... }` array must have the same properties in the same order. When they differ, write `new object[] { ... }`:

```csharp
OAJson r = client.sectorrotation(benchmark: "NIFTY", timeframe: "daily", source: "db", instruments: new object[] {
    new { symbol = "NIFTYIT", exchange = "NSE_INDEX", label = "IT" },
    new { symbol = "RELIANCE", exchange = "NSE" } });
```

Lists, dictionaries, your own classes (their public properties) and `OAJson` arrays work as well, which helps when the list is built in a loop:

```csharp
var watch = new List<Dictionary<string, object>>();
foreach (string name in new[] { "RELIANCE", "TCS", "INFY" })
    watch.Add(new Dictionary<string, object> { { "symbol", name }, { "exchange", "NSE" } });
OAJson quotes = client.multiquotes(symbols: watch);

OAJson symbols = OAJson.NewArray();
symbols.AddObject().Set("symbol", "RELIANCE").Set("exchange", "NSE");
symbols.AddObject().Set("symbol", "TCS").Set("exchange", "NSE");
OAJson more = client.multiquotes(symbols: symbols);
```

The SDK reads your list and never changes it, so the same list can be passed again.

### Calls that wait, and the ordered queue

A call such as `client.funds()` waits until OpenAlgo answers, up to `timeout` seconds (120 by default). That is fine on a thread of your own, but `OnBarUpdate`, `OnStateChange` and the other NinjaScript events run on NinjaTrader's threads: a slow answer there freezes the chart or delays the next bar. The client therefore has an ordered background queue:

```csharp
void enqueue(Func<api, OAJson> call, Action<OAJson> on_done = null);
Task<OAJson> run_async(Func<api, OAJson> call);
```

```csharp
// fire and forget, with an optional callback
client.enqueue(c => c.placeorder(strategy: "Python", symbol: "NHPC", action: "BUY", exchange: "NSE",
                   price_type: "MARKET", product: "MIS", quantity: 1),
               r => Print("order: " + r.Str("orderid")));

// a Task, for code that checks back later
Task<OAJson> t = client.run_async(c => c.orderstatus(order_id: "250828000185002", strategy: "Test Strategy"));
```

* Queued calls run one at a time, in submission order, on one background thread of the client, so two orders queued in sequence reach OpenAlgo in that sequence.
* `on_done` runs on that background thread. `Print` is fine there. Do not touch series, `Draw` objects, plots or NinjaTrader orders from it.
* A queued call that throws completes with `error_type` `unknown_error`; a `run_async` task never faults.
* The safety guard is checked when the call is queued and again when it is sent, so a call queued while the script was historical stays refused even when it runs later.
* `client.queue_count` tells you how many queued calls have not finished yet.

The simplest way to use a result in your script is to store it and read it in the next `OnBarUpdate`. Reading an `OAJson` from two threads is safe, and a `volatile` field makes the new value visible at once:

```csharp
private volatile OAJson lastFunds;   // written by the queue thread, read in OnBarUpdate

private void RefreshFunds()
{
    client.enqueue(c => c.funds(), r => lastFunds = r);
}

protected override void OnBarUpdate()
{
    OAJson funds = lastFunds;
    if (funds != null && funds.Str("status") == "success")
        Print("available cash " + funds.Str("data.availablecash"));
}
```

When the result has to reach the script at once, hand it to the script's own thread with `TriggerCustomEvent`, which runs your code with the bars and series of the script in sync. The script may be shutting down when a late answer arrives, so guard the call:

```csharp
private void RefreshQuote()
{
    client.enqueue(c => c.quotes(symbol: "RELIANCE", exchange: "NSE"), r =>
    {
        double ltp = r.Num("data.ltp", double.NaN);
        try
        {
            // runs on the script's thread, where series and Print may be used
            TriggerCustomEvent(o => Print("RELIANCE ltp " + (double)o), ltp);
        }
        catch (Exception)
        {
            // the script is being removed: nothing left to update
        }
    });
}
```

A `run_async` task can be checked from a later `OnBarUpdate` without waiting. Read `Result` only once `IsCompleted` is true:

```csharp
private Task<OAJson> statusTask;

private void AskForStatus()
{
    statusTask = client.run_async(c => c.orderstatus(order_id: "250828000185002", strategy: "Test Strategy"));
}

protected override void OnBarUpdate()
{
    if (statusTask != null && statusTask.IsCompleted)
    {
        Print("order status " + statusTask.Result.Str("data.order_status"));
        statusTask = null;
    }
}
```

Three rules keep the queue safe:

* Never call `.Result` or `.Wait()` on a task that has not completed from `OnBarUpdate` or `OnStateChange`: that blocks NinjaTrader's thread, which the queue exists to avoid.
* Never wait for a `run_async` task inside a queued call or an `on_done` callback: the queue's one thread would wait for itself.
* Copy inputs into local variables before you queue a call, as the strategy above does. The queued call then uses the values of the moment you queued it.

### When something goes wrong

The SDK does not stop your script with an exception. A failure comes back as a normal response with `status` set to `error`, in the same shape as the Python SDK:

```json
{"status": "error", "message": "Failed to connect to the server. Please check if the server is running.", "error_type": "connection_error"}
```

| `error_type` | Meaning |
| --- | --- |
| `connection_error`, `timeout_error` | OpenAlgo could not be reached, or did not answer in time. |
| `http_error` | OpenAlgo answered with an HTTP error status. The message starts with `HTTP <code>:` and `code` holds the status. |
| `api_error` | OpenAlgo answered with HTTP 200 and `"status": "error"`. |
| `json_error` | The server did not answer with JSON. |
| `validation_error` | A check the Python SDK also makes failed before anything was sent (for example a GTT with no trigger price). |
| `historical_blocked`, `playback_blocked` | Refused by the safety guard: the owner processes historical data, or the Playback connection is in use. Nothing was sent. |
| `unknown_error` | Anything else, including a call made after `close()`, which is never sent. |

When OpenAlgo refuses a request, most calls return the error the way the Python SDK builds it, with the server's text after `HTTP <code>:`. This is a wrong API key on `ping`:

```json
{"status": "error", "message": "HTTP 403: {\"message\":\"Invalid openalgo apikey\",\"status\":\"error\"}\n", "code": 403, "error_type": "http_error"}
```

GTT orders, the Strategy RMS calls, `charges`, `discord`, `slack` and the API-only endpoints return OpenAlgo's own JSON answer instead, with `code` added, as the Python SDK does for them:

```json
{"message": "Invalid openalgo apikey", "status": "error", "code": 403}
```

Two places raise an `ArgumentException` instead of returning an error, because Python raises there too: creating an `OAStrategy` without a webhook token, and passing something that is not a list of instruments to a feed subscription.

To look closer at a call, every response carries `HttpStatus` and `RawBody`, and the client remembers the last completed request:

```csharp
OAJson response();
int last_status();
string last_raw();
```

```csharp
OAJson r = client.ping();
Print(r.HttpStatus + " " + r.RawBody);
Print(client.last_status() + " " + client.base_url);
```

`HttpStatus` and `last_status()` are the HTTP status, `-1` when the request never got an answer, and `0` when nothing was sent (a validation error or the safety guard).

### Logging

The client is silent by default. With `verbose: 1` it prints connection and failure lines, with `verbose: 2` every request as well. Lines go to the owner's NinjaScript Output tab, or to your own sink when you pass `log:`. The API key is masked as `***` in every line.

```csharp
api client = new api("your_api_key_here", "http://127.0.0.1:5000", verbose: 2, owner: this);
client.ping();
```

```
OpenAlgo [SDK]    OpenAlgo NinjaScript SDK 1.0.0, REST http://127.0.0.1:5000/api/v1/, feed ws://127.0.0.1:8765
OpenAlgo [HTTP]   POST http://127.0.0.1:5000/api/v1/ping {"apikey":"***"}
OpenAlgo [HTTP]   HTTP 403 from ping, 55 chars in 58 ms
```

`client.verbose` can be changed at any time, for example `client.verbose = 0;` once a strategy runs smoothly.

### Closing the client

`client.close()` (also `Dispose()`) releases the HTTP connection and disconnects the WebSocket feed. Call it in `State.Terminated`.

* It does not wait for requests in flight. A request already sent is not cut off, because OpenAlgo may already have placed the order: it finishes and returns OpenAlgo's real answer to its caller or `on_done`.
* Calls that start after `close()`, queued calls that have not started included, return `unknown_error` with the message `An unexpected error occurred: Cannot send a request, as the client has been closed.` and are never sent.
* If the feed is connected, `close()` waits up to 2 seconds for it to close.

Next: [OpenAlgo NinjaScript Functions](openalgo-ninjascript-functions.md) lists every call.
