# WebSocket Feed

A REST call such as `client.quotes(...)` gives you a snapshot at the moment you ask. The WebSocket feed works the other way round: OpenAlgo pushes every tick to your Expert Advisor as it happens. Use it for logic that has to react to live prices, such as a trailing stop or a price trigger, and to hear about your own fills, rejections and cancellations the moment the broker reports them, instead of polling the order book.

### What you need

* An Expert Advisor or a script. MetaTrader allows sockets only there, not in indicators.
* The feed address on the WebRequest list: **Tools > Options > Expert Advisors > Allow WebRequest for listed URL**, for example `ws://127.0.0.1:8765` on a local install. Sockets use the same list as `WebRequest`, also in DLL mode.
* OpenAlgo running and logged in to your broker.
* A live chart: in the Strategy Tester the feed opens no connection.

The feed address is worked out from the `host` you give the client, as in Python: `http://127.0.0.1:5000` streams from `ws://127.0.0.1:8765`, and `https://yourdomain.com` from `wss://yourdomain.com/ws`. Pass `ws_url` to the constructor to use another address; see [Include the Header File](include-the-header-file.md#create-the-client).

### Why you call poll()

MetaTrader runs your program on a single thread, so nothing can happen in the background the way it does in the Python SDK. You give the feed its turn by calling `client.poll()` regularly, normally every 100 ms from `OnTimer`. Each call:

* reads the ticks that have arrived and runs your callbacks,
* updates the latest-value caches (`get_ltp`, `get_quotes`, `get_depth`),
* answers the server's pings and sends its own keepalive pings,
* reconnects after a drop (waiting 1, 2, 5, 10, 30, then 60 seconds between attempts) and sends your subscriptions again.

Without `poll()` no data arrives, and the server drops a connection whose pings go unanswered for 20 seconds.

### A complete streaming EA

This EA streams the LTP of RELIANCE and INFY and prints every tick:

```cpp
#include <OpenAlgo/OpenAlgo.mqh>

input string ApiKey = "";
input string Host   = "http://127.0.0.1:5000";

api   *client = NULL;
OAJson watch_list;

void OnLtp(OAJson &data)
  {
   // {"type":"market_data","symbol":"RELIANCE","exchange":"NSE","mode":1,
   //  "data":{"ltp":1424.0,"timestamp":1712345678901}}
   Print(data.Str("symbol"), " ", data.Dbl("data.ltp"));
  }

int OnInit()
  {
   client = new api(ApiKey, Host);          // feed: ws://127.0.0.1:8765
   client.connect();
   watch_list.Clear();
   watch_list.Add().SetString("exchange", "NSE").SetString("symbol", "RELIANCE");
   watch_list.Add().SetString("exchange", "NSE").SetString("symbol", "INFY");
   client.subscribe_ltp(watch_list, OnLtp);
   EventSetMillisecondTimer(100);
   return INIT_SUCCEEDED;
  }

void OnTimer() { client.poll(); }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   client.unsubscribe_ltp(watch_list);
   client.disconnect();
   delete client;
  }
```

Step by step:

1. `new api(ApiKey, Host)` creates the client. The same client serves REST calls and the feed.
2. `connect()` opens the socket and sends your API key. It waits at most about 10 seconds and returns `true` once OpenAlgo has accepted the key. If it returns `false`, `poll()` keeps retrying in the background.
3. `subscribe_ltp(watch_list, OnLtp)` asks for LTP updates of the instruments in `watch_list` and names the function that receives them. The request is remembered even while the socket is down and is sent again after every reconnect.
4. `EventSetMillisecondTimer(100)` makes MetaTrader call `OnTimer` every 100 ms, and `OnTimer` calls `poll()`.
5. `OnDeinit` unsubscribes, disconnects and deletes the client when you remove the EA or change its inputs.

`watch_list` is a global, and MetaTrader keeps globals when it re-runs `OnInit` after an input change, so the EA empties it with `Clear()` before adding the instruments again. Name the list something other than `instruments`, which is an SDK parameter name.

### The ready-made feed EA

The release ships this pattern as `MQL5\Experts\OpenAlgo\OpenAlgoFeedLTP.mq5`. It streams one instrument, prints every tick with its time in IST, reports connection changes and errors, and prints the last cached LTP when you remove it. It never places an order.

| Input | Default | Meaning |
| --- | --- | --- |
| `ApiKey` | empty | Your OpenAlgo API key |
| `Host` | `http://127.0.0.1:5000` | Your OpenAlgo URL |
| `WsUrl` | empty | Feed address; empty works it out from `Host` |
| `TradingSymbol` | `RELIANCE` | OpenAlgo symbol to stream |
| `Exchange` | `NSE` | OpenAlgo exchange |
| `PollMs` | `100` | Timer period in milliseconds |
| `Verbose` | `1` | Feed log level: `0` silent, `1` connection and subscription lines, `2` every update |

Compile it in MetaEditor, add the feed address to the WebRequest list, drag it from **Navigator > Expert Advisors > OpenAlgo** onto any chart, enter your API key and watch the **Experts** tab.

### Quotes and depth

Quotes (mode 2) add open, high, low, close, volume and more to the LTP. Depth (mode 3) adds the order book. The instruments list has the same format for all three modes.

```cpp
void OnQuote(OAJson &data)
  {
   Print(data.Str("symbol"), " ltp ", data.Dbl("data.ltp"), " open ", data.Dbl("data.open"),
         " volume ", data.Int("data.volume"), " change % ", data.Dbl("data.change_percent"));
  }

void OnDepth(OAJson &data)
  {
   Print(data.Str("symbol"), " best bid ", data.Dbl("data.depth.buy.0.price"),
         " best ask ", data.Dbl("data.depth.sell.0.price"));
  }

client.subscribe_quote(watch_list, OnQuote);
client.subscribe_depth(watch_list, OnDepth);
```

Which fields arrive depends on your broker. A quote field the server did not send reads `0`, so treat a zero as "not available" rather than as a price. See [field availability](../../api-documentation/v1/websockets.md#field-availability).

### Order updates

`subscribe_orders` streams the order events of your whole account; no symbol list is needed:

```cpp
void OnOrderUpdate(OAJson &message)
  {
   string status = message.Str("order_status");
   Print(message.Str("orderid"), " ", message.Str("symbol"), " ", message.Str("action"), " ", status);
   if(status == "rejected")
      Print("rejected: ", message.Str("rejection_reason"));
  }

client.subscribe_orders(OnOrderUpdate);
```

Each message carries `orderid`, `symbol`, `exchange`, `action`, `quantity`, `price`, `order_status`, `filled_quantity`, `pending_quantity`, `average_price`, `rejection_reason` and `mode` (`"live"` or `"analyze"`). Brokers can report the same event more than once, so act on a status change rather than on every message, and reconcile with `orderbook()` when it matters. `client.get_orders()` returns the updates received so far, most recent first.

### Reading the latest value without a callback

The feed keeps the latest LTP, quote and depth of every subscribed instrument in memory. Reading it sends no request, so it is cheap enough for `OnTick`:

```cpp
void OnTick(void)
  {
   double ltp = client.get_ltp("NSE", "RELIANCE").Dbl("ltp.NSE.RELIANCE.ltp");
   if(ltp > 0)
      Comment("RELIANCE ", ltp);
  }
```

The callback argument of `subscribe_ltp`, `subscribe_quote` and `subscribe_depth` is optional, so you can subscribe without one and only read the cache. The cache is updated inside `poll()`, so the timer must keep running.

### Connection events

Hooks tell your EA when the feed comes up, goes down or is restored, and pass on every error the feed catches:

```cpp
void OnFeedConnect(OAJson &event)
  {
   Print("feed live (connection ", event.Int("seq"), event.Bool("reconnect") ? ", reconnect" : "", ")");
  }

void OnFeedDisconnect(OAJson &event)
  {
   Print("feed down (", event.Str("reason"), ")", event.Bool("will_reconnect") ? ", reconnecting" : "");
  }

void OnFeedError(OAJson &error, OAJson &context)
  {
   Print("feed error (", context.Str("kind"), "): ", error.Str("text"));
  }

// in OnInit, before connect()
client.on_connect(OnFeedConnect);
client.on_disconnect(OnFeedDisconnect);
client.on_error(OnFeedError);
```

After a drop the SDK reconnects, signs in again and repeats your subscriptions by itself. OpenAlgo does not replay the ticks or order updates that were missed while the connection was down, so refresh anything important with a REST call (`quotes`, `positionbook`, `orderbook`) from your `on_reconnect` hook.

### Good to know

* `connect()` returns `true` once the feed is live. `subscribe_*` return whether the request could be sent, not whether OpenAlgo accepted every symbol; a refused symbol reaches your `on_error` hook.
* Callbacks run inside `poll()`. Keep them short: a slow REST call inside a callback holds up every tick queued behind it.
* `disconnect()` stops the automatic reconnect and forgets your subscriptions. After a new `connect()`, subscribe again.
* The `verbose` constructor argument (`1` or `2`) prints connection, subscription and update lines to the Experts log. The API key is never printed.

Every feed call, with its declaration and an example, is listed under [WebSocket Feed in OpenAlgo MQL5 Functions](openalgo-mql5-functions.md#websocket-feed). The raw protocol is described in the [WebSocket API](../../api-documentation/v1/websockets.md).
