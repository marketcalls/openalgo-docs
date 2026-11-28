# Include the Header File

Every program that talks to OpenAlgo starts the same way: one include line, one client object, and a few inputs for your API key and trade settings. This page shows that pattern and how to read the answers OpenAlgo sends back.

### The include line

```cpp
#include <OpenAlgo/OpenAlgo.mqh>
```

This single line brings in the whole SDK: the `api` client, the `OAStrategy` webhook class, the `OAJson` value type and both transports. Include `OpenAlgo.mqh` itself, not the module files (`Orders.mqh`, `Data.mqh` and so on) on their own.

Three optional switches go **before** the include:

| Define | Effect |
| --- | --- |
| `#define OPENALGO_USE_WININET` | Send requests through `wininet.dll` instead of `WebRequest()`. Needs Allow DLL imports; also works in indicators. |
| `#define OPENALGO_WININET_IGNORE_CERT` | With WinINet only: accept a self-signed certificate. Use it for a test server, never for a live one. |
| `#define OPENALGO_ALLOW_IN_TESTER` | Let requests and the feed run in the Strategy Tester. They then reach your real OpenAlgo server, so leave this out unless you mean it. |

The SDK version is available as `OPENALGO_MQL5_VERSION` (`"1.0.0"` for this release).

### Create the client

```cpp
api client("your_api_key_here", "http://127.0.0.1:5000");
```

Use your OpenAlgo API key and the URL of your OpenAlgo server: the default `http://127.0.0.1:5000` when MetaTrader and OpenAlgo run on the same computer, or your domain, for example `https://yourdomain.com`.

The full constructor mirrors the Python `api(...)` constructor:

```cpp
api(const string api_key, const string host = "http://127.0.0.1:5000",
    const string version = "v1", const double timeout = 120.0, const int ws_port = 0,
    const string ws_url = "", const int verbose = 0, const bool auto_reconnect = true)
```

| Parameter | Meaning |
| --- | --- |
| `api_key` | Your OpenAlgo API key. The SDK never prints it. |
| `host` | URL of your OpenAlgo server. REST calls go to `host` + `/api/` + `version` + `/`. |
| `version` | API version, `"v1"`. |
| `timeout` | Request timeout in seconds. |
| `ws_port` | WebSocket port. `0` means "not passed": the feed uses port 8765, or `wss://<host>/ws` when `host` starts with `https://`. |
| `ws_url` | Full WebSocket URL. `""` means "not passed": the URL is worked out from `host` and `ws_port`. |
| `verbose` | Log level: `0` silent, `1` connection and failure lines, `2` every request and every feed update. The API key is masked in every line. |
| `auto_reconnect` | After a drop the feed reconnects and replays your subscriptions by itself (driven by `poll()`, see [WebSocket Feed](websocket-feed.md)). |

How the feed address is worked out from `host`:

| `host` | Feed URL |
| --- | --- |
| `http://127.0.0.1:5000` | `ws://127.0.0.1:8765` |
| `https://yourdomain.com` | `wss://yourdomain.com/ws` |
| `https://yourdomain.com` with `ws_port` 8765 | `ws://yourdomain.com:8765` |
| any, with `ws_url` set | `ws_url` as given |

Only the REST part of the SDK needs `host`. If you never use the feed, the last four parameters can stay at their defaults. A client with a custom feed URL and basic logging looks like this:

```cpp
api client(ApiKey, Host, "v1", 120.0, 0, "ws://127.0.0.1:8765", 1);
```

### Inputs and the client in an Expert Advisor

Put everything a trader might change into `input` variables, so it shows up in the EA's Inputs tab. Create the client in `OnInit` with `new` and delete it in `OnDeinit`. MetaTrader runs `OnDeinit` and `OnInit` again when you change an input, so a client built in `OnInit` always uses the current API key and URL.

```cpp
#include <OpenAlgo/OpenAlgo.mqh>

input string ApiKey        = "";                        // OpenAlgo API key
input string Host          = "http://127.0.0.1:5000";   // OpenAlgo server URL
input string Strategy      = "MT5 EMA Crossover";       // Strategy name sent to OpenAlgo
input string TradingSymbol = "RELIANCE";                // OpenAlgo symbol to trade
input string Exchange      = "NSE";                     // OpenAlgo exchange
input string Product       = "MIS";                     // Product: MIS, CNC or NRML
input double Quantity      = 1;                         // Quantity (shares or lots x lot size)

api *client = NULL;

int OnInit(void)
  {
   if(ApiKey == "")
     {
      Print("Enter your OpenAlgo API key in the ApiKey input.");
      return INIT_PARAMETERS_INCORRECT;
     }
   client = new api(ApiKey, Host);
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   if(client != NULL)
     {
      client.close();
      delete client;
      client = NULL;
     }
  }
```

Calls then look the same whether `client` is a pointer in an EA or a plain object in a script:

```cpp
OAJson *r = client.placesmartorder(Strategy, TradingSymbol, "BUY", Exchange, "MARKET", Product, Quantity, Quantity);
```

In a script, a local client in `OnStart` is enough:

```cpp
void OnStart(void)
  {
   api client(ApiKey, Host);
   Print(client.funds().ToString());
  }
```

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

`TradingSymbol` is the OpenAlgo symbol, not the MetaTrader or broker symbol. Equities carry no suffix (`SBIN`, `RELIANCE`, never `SBIN-EQ`). Futures are `[Symbol][DD][MMM][YY]FUT`, for example `NIFTY30DEC25FUT`. Options are `[Symbol][DD][MMM][YY][Strike][CE/PE]`, for example `NIFTY30DEC2526000CE`. See [Symbol Format](../../symbol-format.md).

#### Naming your inputs

* Do not call an input `Symbol`. MQL5 already has a built-in `Symbol()` function and `_Symbol` variable.
* The SDK uses lowercase Python names for its parameters (`symbol`, `exchange`, `quantity`, `instruments`, `strategy`). Give your own global variables and inputs other names, such as `TradingSymbol`, `Exchange` or `watch_list`, otherwise MetaEditor warns that a declaration hides a global variable.

### Reading responses with OAJson

Every request method returns `OAJson *`, a pointer to OpenAlgo's answer:

* It is never `NULL`, so you can read it straight away. Do not `delete` it: the client owns it.
* The next call on the same client **overwrites** it. Read what you need first, or keep a copy with `OAJson keep; keep.Copy(r);`.

Values are read by path. A path uses dots between keys and either `.0` or `[0]` for array positions. A missing value returns the default instead of failing:

```cpp
OAJson *r = client.depth("SBIN", "NSE");
if(r.Str("status") == "success")
  {
   double best_bid = r.Dbl("data.bids.0.price");
   double best_ask = r.Dbl("data.asks[0].price");
   long   volume   = r.Int("data.volume");
   Print("SBIN bid ", best_bid, " ask ", best_ask, " volume ", volume);
  }
else
   Print("depth failed: ", r.Str("message"));
```

The four readers take a path and a default:

```cpp
string            Str(const string path = "", const string def = "") const;
double            Dbl(const string path = "", const double def = 0) const;
long              Int(const string path = "", const long def = 0) const;
bool              Bool(const string path = "", const bool def = false) const;
```

`Str` of a number returns its text, and `Dbl` of a numeric string parses it. Values that the broker sends as strings, such as `"availablecash": "320.66"` in `funds()`, therefore read the same way as real numbers.

Arrays are walked with `Get`, `At` and `Size`:

```cpp
OAJson *r = client.positionbook();
OAJson *rows = r.Get("data");
for(int i = 0; i < rows.Size(); i++)
   Print(rows.At(i).Str("symbol"), "  qty ", rows.At(i).Dbl("quantity"), "  pnl ", rows.At(i).Dbl("pnl"));
```

`Print(r.ToString())` prints the whole answer as one line of JSON, `Print(r.Pretty())` prints it indented. JSON keys can arrive in a different order from the examples in these docs, so always read values by name.

`OAJson` at a glance:

| Purpose | Methods |
| --- | --- |
| Read | `Str`, `Dbl`, `Int`, `Bool`, `Get(key)`, `At(index)`, `Path(path)`, `Size()`, `Has(key)`, `KeyAt(index)` |
| Check the type | `Type()`, `IsNull()`, `IsBool()`, `IsNumber()`, `IsString()`, `IsArray()`, `IsObject()` |
| Build an object (chainable) | `SetString`, `SetDouble`, `SetInt`, `SetBool`, `SetNull`, `SetJson`, `SetNumStr` (a number sent as a JSON string), `SetArray`, `SetObject`, `Remove` |
| Build an array | `Add()` (adds an element and returns it), `Append(value)`, `AppendJson(json)` |
| Whole value | `Parse(text)`, `ToString()`, `Pretty()`, `Copy(src)`, `Clear()` |

Pointers returned by `Get`, `At`, `Path` and `Add` point into the tree: never `delete` them.

#### Building lists for a request

Where Python takes a list of dicts (`orders`, `legs`, `symbols`, `positions`, `instruments`), MQL5 takes an `OAJson` array that you build with `Add()` and the chainable setters:

```cpp
// Python: [{"symbol": "RELIANCE", "exchange": "NSE"}, {"symbol": "TCS", "exchange": "NSE"}]
OAJson symbols;
symbols.Add().SetString("symbol", "RELIANCE").SetString("exchange", "NSE");
symbols.Add().SetString("symbol", "TCS").SetString("exchange", "NSE");
OAJson *r = client.multiquotes(symbols);
```

#### When something goes wrong

The SDK never stops your program with an exception. A failure comes back as a normal response with `status` set to `error`:

```json
{"status": "error", "message": "Failed to connect to the server. Please check if the server is running.", "error_type": "connection_error"}
```

| `error_type` | Meaning |
| --- | --- |
| `permission_error` | The URL is not on the WebRequest list, DLL imports are not allowed, or `WebRequest` was used in an indicator. The message says which. |
| `connection_error`, `timeout_error`, `http_error` | OpenAlgo could not be reached, or did not answer in time. |
| `json_error` | The server did not answer with a JSON object. |
| `validation_error` | A check in the SDK failed before anything was sent (for example a GTT with no trigger price). |
| `tester_blocked` | The program runs in the Strategy Tester, where requests are refused on purpose. |
| `unknown_error` | Anything else, including a call after `close()`. |

When OpenAlgo itself refuses a request, its own answer is returned unchanged, with `status` `error` and the HTTP status added as `code`, for example `{"message": "Invalid openalgo apikey", "status": "error", "code": 403}`.

Three client methods help when you debug:

| Method | Returns |
| --- | --- |
| `client.response()` | The last response, the same object the last call returned |
| `client.last_status()` | The HTTP status of the last call, or `-1` when the request never reached the server |
| `client.last_raw()` | The raw text OpenAlgo sent |

Next: [OpenAlgo MQL5 Functions](openalgo-mql5-functions.md) lists every call.
