# WebSocket Feed

A REST call such as `client.quotes(...)` gives you a snapshot at the moment you ask. The WebSocket feed works the other way round: OpenAlgo pushes every tick to your strategy or indicator as it happens. Use it for logic that has to react to every tick, such as a trailing stop or a price trigger, and to hear about your own fills, rejections and cancellations the moment the broker reports them, instead of polling the order book.

### What you need

* A strategy, indicator or add-on. The feed works in every kind of NinjaScript and needs no NinjaTrader setting.
* OpenAlgo running and logged in to your broker, with its WebSocket server reachable from NinjaTrader: `ws://127.0.0.1:8765` on a local install, `wss://yourdomain.com/ws` behind TLS.
* Real time: with `owner: this` the feed opens no connection while your script processes historical data, runs in the Strategy Analyzer or runs on the Playback connection.

The feed address is worked out from the `host` you give the client, as in Python: `http://127.0.0.1:5000` streams from `ws://127.0.0.1:8765`, and `https://yourdomain.com` from `wss://yourdomain.com/ws`. Pass `ws_url` to the constructor to use another address; see [Using the Add-On](using-the-addon.md#create-the-client).

### Threads: why there is nothing to poll

The feed runs on background threads of its own, as in the Python SDK. Once you subscribe, your callback is called for every tick, and the SDK keeps the connection alive, reconnects after a drop (waiting 1, 2, 5, 10, 30, then 60 seconds between attempts) and sends your subscriptions again by itself.

That convenience comes with one rule: **callbacks run on a feed thread, never on NinjaTrader's thread for your script.**

* `Print` is fine in a callback.
* Never touch `Close[0]`, series, plots, `Draw` objects or NinjaTrader orders from a callback. In a strategy or indicator, hand the value to the script's own thread with `TriggerCustomEvent(o => { ... }, value)`, or store it and read it in `OnBarUpdate`. An add-on updates its window through its `Dispatcher` (`Dispatcher.InvokeAsync`).
* The cached values (`get_ltp`, `get_quotes`, `get_depth`, `get_orders`, `get_subscriptions`) are thread-safe copies, so `OnBarUpdate` can read them directly.
* Keep callbacks short: the feed processes no ticks while one runs. Callbacks and hooks arrive one at a time, in the order things happened.
* `connect()` waits until OpenAlgo accepts the API key, up to about 10 seconds. In `OnStateChange` call `connect_async()` instead, so NinjaTrader does not wait.
* `close()` in `State.Terminated` disconnects the feed and runs your disconnect hook on that thread before it returns, as Python's `disconnect()` does. A disconnect hook should therefore only print: no waiting and no `TriggerCustomEvent`, because the script is shutting down.

### A complete streaming strategy

This strategy streams the LTP of RELIANCE and INFY and prints every tick:

```csharp
#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
    public class MyOpenAlgoFeed : Strategy
    {
        private api client;
        private readonly object[] watchList =
        {
            new { exchange = "NSE", symbol = "RELIANCE" },
            new { exchange = "NSE", symbol = "INFY" }
        };

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name   = "MyOpenAlgoFeed";
                ApiKey = "";
            }
            else if (State == State.Realtime)
            {
                client = new api(ApiKey, "http://127.0.0.1:5000", owner: this);   // feed: ws://127.0.0.1:8765
                client.subscribe_ltp(watchList, OnLtp);
                client.connect_async();
            }
            else if (State == State.Terminated)
            {
                if (client != null)
                {
                    client.close();   // also disconnects the feed
                    client = null;
                }
            }
        }

        // feed thread: {"type":"market_data","symbol":"RELIANCE","exchange":"NSE","mode":1,
        //               "data":{"ltp":1424.0,"timestamp":1712345678901}}
        private void OnLtp(OAJson data)
        {
            Print(data.Str("symbol") + " " + data.Num("data.ltp"));
        }

        protected override void OnBarUpdate()
        {
        }

        [PasswordPropertyText(true)]
        [Display(Name = "API key", GroupName = "OpenAlgo", Order = 1)]
        public string ApiKey { get; set; }
    }
}
```

Step by step:

1. `new api(ApiKey, "http://127.0.0.1:5000", owner: this)` creates the client in `State.Realtime`. The same client serves REST calls and the feed.
2. `subscribe_ltp(watchList, OnLtp)` asks for LTP updates of the instruments in `watchList` and names the method that receives them. The request is remembered even while the socket is down, and is sent again after every reconnect. Before the feed is connected it returns `false`, which is fine: the subscription goes out as soon as OpenAlgo accepts the key.
3. `connect_async()` opens the socket and sends your API key on a background thread, so `OnStateChange` returns at once.
4. `OnLtp` runs on the feed thread for every tick. It only prints.
5. `client.close()` in `State.Terminated` disconnects the feed and releases the client when you remove the strategy.

`watchList` is an `object[]` because a field cannot hold the anonymous type that `new[] { ... }` would create. Inside a method, `var watch_list = new[] { new { exchange = "NSE", symbol = "RELIANCE" } };` works as well.

### The ready-made feed indicator

The release ships an indicator, `Indicators\OpenAlgo\OpenAlgoFeedLTP.cs`, that streams the LTP of one symbol and plots it in its own panel, tick by tick. It reports connection changes in the NinjaScript Output window and never places an order.

| Input | Default | Meaning |
| --- | --- | --- |
| API key | empty | Your OpenAlgo API key. Without it the feed is not started. |
| Host | `http://127.0.0.1:5000` | Your OpenAlgo URL. |
| WebSocket URL | empty | Feed address; empty works it out from Host. |
| OpenAlgo symbol | `RELIANCE` | OpenAlgo symbol to stream. |
| OpenAlgo exchange | `NSE` | OpenAlgo exchange, for example `NSE`, `NFO` or `NSE_INDEX`. |
| Print ticks | off | Print every LTP update to the Output window. |
| Verbose | `1` | SDK logging: `0` silent, `1` connection and subscription lines, `2` every message. |

To use it, right-click a chart, choose **Indicators...**, add **OpenAlgoFeedLTP**, enter your API key and click **OK**. The plot appears in a panel of its own once the chart reaches real time, and the Output window shows lines such as `OpenAlgoFeedLTP: streaming NSE:RELIANCE from ws://127.0.0.1:8765 (OpenAlgo NinjaScript SDK 1.0.0)` and `OpenAlgoFeedLTP: feed connected to ws://127.0.0.1:8765`. The plot shows the OpenAlgo LTP on the chart's current bar, so it works on a chart of any instrument.

```csharp
// OpenAlgo NinjaScript SDK sample indicator: streams the last traded price (LTP) of one
// OpenAlgo symbol over the OpenAlgo WebSocket feed and plots it in its own panel.
//
// Copyright (c) 2026 OpenAlgo. MIT licensed, see LICENSE.
//
// How it works
// - In State.Realtime the indicator creates the client with owner: this, subscribes to LTP
//   for OpenAlgoExchange:OpenAlgoSymbol and connects with connect_async(), so the chart
//   never waits for the network. The feed URL comes from the host as in Python
//   (http://host gives ws://host:8765, https://host gives wss://host/ws); set WebSocket URL
//   to override it.
// - Feed data callbacks run on a background thread of the feed, never on the chart's
//   thread. The callback only stores the price and calls TriggerCustomEvent, which runs the
//   update on the indicator's own thread, where Value[0] and Print may be used.
// - In State.Terminated the indicator closes the client, which disconnects the feed. The
//   disconnect hook then runs inside that call, on the OnStateChange thread (Python runs
//   it on the thread that calls disconnect() too), so it only prints.
// - While the chart processes historical data or runs on the Playback connection, the
//   safety guard keeps the feed closed (no connection is opened).
//
// The plot shows the OpenAlgo LTP on the chart's current bar, so it works on any chart
// instrument; it reads nothing from the chart's own data.
#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Windows.Media;
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;
#endregion

// The namespace follows the folder: bin/Custom/Indicators/OpenAlgo.
namespace NinjaTrader.NinjaScript.Indicators.OpenAlgo
{
	/// <summary>Plots the OpenAlgo WebSocket LTP of one symbol, updated tick by tick.</summary>
	public class OpenAlgoFeedLTP : Indicator
	{
		private readonly object sync = new object();
		private api client;
		private double latestLtp = double.NaN;
		private volatile bool stopping;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Description					= "Streams the LTP of one OpenAlgo symbol over the OpenAlgo WebSocket feed and plots it.";
				Name						= "OpenAlgoFeedLTP";
				Calculate					= Calculate.OnEachTick;
				IsOverlay					= false;
				DisplayInDataBox			= true;
				DrawOnPricePanel			= false;
				PaintPriceMarkers			= true;
				IsSuspendedWhileInactive	= false;

				ApiKey						= "";
				HostUrl						= "http://127.0.0.1:5000";
				WebSocketUrl				= "";
				OpenAlgoSymbol				= "RELIANCE";
				OpenAlgoExchange			= "NSE";
				PrintTicks					= false;
				Verbose						= 1;

				AddPlot(Brushes.DodgerBlue, "LTP");
			}
			else if (State == State.Realtime)
			{
				if (string.IsNullOrEmpty(ApiKey))
				{
					Print(Name + ": enter your OpenAlgo API key in the API key input. The feed is not started.");
					return;
				}
				stopping = false;
				string name = Name;
				string ws = string.IsNullOrEmpty(WebSocketUrl) ? null : WebSocketUrl;
				// owner: this turns on the safety guard; verbose 1 prints connection lines to this Output tab
				client = new api(ApiKey, HostUrl, ws_url: ws, verbose: Verbose, owner: this);
				client.on_connect(e => Print(name + ": feed connected to " + e.Str("url")));
				client.on_disconnect(e => Print(name + ": feed disconnected (" + e.Str("reason") + ")"
					+ (e.Bool("will_reconnect") ? ", reconnecting" : "")));
				client.on_reconnect(e => Print(name + ": feed session restored (connection " + e.Str("seq") + ")"));
				// Python: client.subscribe_ltp([{"exchange": "NSE", "symbol": "RELIANCE"}], on_data_received=on_ltp)
				client.subscribe_ltp(new[] { new { exchange = OpenAlgoExchange, symbol = OpenAlgoSymbol } }, OnLtp);
				client.connect_async();
				Print(name + ": streaming " + OpenAlgoExchange + ":" + OpenAlgoSymbol + " from " + client.ws_url
					+ " (OpenAlgo NinjaScript SDK " + OpenAlgoSdk.Version + ")");
			}
			else if (State == State.Terminated)
			{
				stopping = true;
				if (client != null)
				{
					// close() also disconnects the feed
					client.close();
					client = null;
				}
			}
		}

		// Feed thread: store the price, then hand the work to the indicator's thread.
		// {"type": "market_data", "symbol": "RELIANCE", "exchange": "NSE", "mode": 1,
		//  "data": {"ltp": 1424.0, "timestamp": 1712345678901}}
		private void OnLtp(OAJson tick)
		{
			if (stopping || !tick["data"].Has("ltp"))
				return;
			double ltp = tick.Num("data.ltp");
			lock (sync)
				latestLtp = ltp;
			try
			{
				TriggerCustomEvent(state => Apply((double)state), ltp);
			}
			catch (Exception)
			{
				// the indicator is being removed: nothing left to update
			}
		}

		// Indicator thread (inside TriggerCustomEvent or OnBarUpdate).
		private void Apply(double ltp)
		{
			if (stopping || CurrentBar < 0)
				return;
			Value[0] = ltp;
			if (PrintTicks)
				Print(Name + ": " + OpenAlgoExchange + ":" + OpenAlgoSymbol + " ltp " + ltp.ToString("0.00##", CultureInfo.InvariantCulture));
		}

		protected override void OnBarUpdate()
		{
			// a new bar of the chart keeps showing the latest OpenAlgo price
			if (State != State.Realtime)
				return;
			double ltp;
			lock (sync)
				ltp = latestLtp;
			if (!double.IsNaN(ltp))
				Value[0] = ltp;
		}

		/// <summary>Shows the streamed symbol in the chart label.</summary>
		public override string DisplayName
		{
			get { return "OpenAlgo LTP " + OpenAlgoExchange + ":" + OpenAlgoSymbol; }
		}

		#region Properties
		[PasswordPropertyText(true)]
		[Display(Name = "API key", Description = "Your OpenAlgo API key (OpenAlgo web UI, API Key page). Saved with the workspace like any input.", GroupName = "OpenAlgo", Order = 1)]
		public string ApiKey { get; set; }

		[Display(Name = "Host", Description = "OpenAlgo server URL, e.g. http://127.0.0.1:5000 or https://yourdomain.com.", GroupName = "OpenAlgo", Order = 2)]
		public string HostUrl { get; set; }

		[Display(Name = "WebSocket URL", Description = "Leave empty to derive it from the host (ws://host:8765, or wss://host/ws for an https host).", GroupName = "OpenAlgo", Order = 3)]
		public string WebSocketUrl { get; set; }

		[Display(Name = "OpenAlgo symbol", Description = "The OpenAlgo symbol to stream, e.g. RELIANCE or NIFTY30DEC25FUT.", GroupName = "OpenAlgo", Order = 4)]
		public string OpenAlgoSymbol { get; set; }

		[Display(Name = "OpenAlgo exchange", Description = "NSE, BSE, NFO, BFO, CDS, BCD, MCX, NSE_INDEX or BSE_INDEX.", GroupName = "OpenAlgo", Order = 5)]
		public string OpenAlgoExchange { get; set; }

		[Display(Name = "Print ticks", Description = "Print every LTP update to the NinjaScript Output window.", GroupName = "OpenAlgo", Order = 6)]
		public bool PrintTicks { get; set; }

		[Range(0, 2)]
		[Display(Name = "Verbose", Description = "SDK logging: 0 silent, 1 connection and subscription lines, 2 every message.", GroupName = "OpenAlgo", Order = 7)]
		public int Verbose { get; set; }
		#endregion
	}
}

#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private OpenAlgo.OpenAlgoFeedLTP[] cacheOpenAlgoFeedLTP;
		public OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP()
		{
			return OpenAlgoFeedLTP(Input);
		}

		public OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP(ISeries<double> input)
		{
			if (cacheOpenAlgoFeedLTP != null)
				for (int idx = 0; idx < cacheOpenAlgoFeedLTP.Length; idx++)
					if (cacheOpenAlgoFeedLTP[idx] != null &&  cacheOpenAlgoFeedLTP[idx].EqualsInput(input))
						return cacheOpenAlgoFeedLTP[idx];
			return CacheIndicator<OpenAlgo.OpenAlgoFeedLTP>(new OpenAlgo.OpenAlgoFeedLTP(), input, ref cacheOpenAlgoFeedLTP);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP()
		{
			return indicator.OpenAlgoFeedLTP(Input);
		}

		public Indicators.OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP(ISeries<double> input )
		{
			return indicator.OpenAlgoFeedLTP(input);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP()
		{
			return indicator.OpenAlgoFeedLTP(Input);
		}

		public Indicators.OpenAlgo.OpenAlgoFeedLTP OpenAlgoFeedLTP(ISeries<double> input )
		{
			return indicator.OpenAlgoFeedLTP(input);
		}
	}
}

#endregion
```

How it works:

* **`State.Realtime`** creates the client with `owner: this`, registers the three connection hooks (they only print), subscribes to the LTP of the chosen symbol with `OnLtp` as the callback, and connects with `connect_async()`, so the chart never waits for the network.
* **`OnLtp`** runs on the feed thread. It stores the price under a lock and calls `TriggerCustomEvent`, which runs `Apply` on the indicator's own thread, where `Value[0]` may be set. The `stopping` flag and the `try`/`catch` cover a tick that arrives while the indicator is being removed.
* **`OnBarUpdate`** carries the latest price onto each new bar of the chart.
* **`State.Terminated`** sets `stopping` and closes the client, which disconnects the feed. The disconnect hook runs inside that call and only prints.
* The block at the end, `NinjaScript generated code`, is the code NinjaTrader generates for every indicator; leave it as it is.

### Quotes and depth

Quotes (mode 2) add open, high, low, close, volume and more to the LTP. Depth (mode 3) adds the order book. The instruments list has the same format for all three modes.

```csharp
var watch_list = new[] {
    new { exchange = "NSE", symbol = "RELIANCE" },
    new { exchange = "NSE", symbol = "INFY" } };

client.subscribe_quote(watch_list, data =>
    Print(data.Str("symbol") + " ltp " + data.Num("data.ltp") + " open " + data.Num("data.open")
          + " volume " + data.Int("data.volume") + " change % " + data.Num("data.change_percent")));

client.subscribe_depth(watch_list, data =>
    Print(data.Str("symbol") + " best bid " + data.Num("data.depth.buy.0.price")
          + " best ask " + data.Num("data.depth.sell.0.price")));
```

Which fields arrive depends on your broker. A quote field the server did not send reads `0`, so treat a zero as "not available" rather than as a price. See [field availability](../../api-documentation/v1/websockets.md#field-availability).

### Order updates

`subscribe_orders` streams the order events of your whole account; no symbol list is needed:

```csharp
client.subscribe_orders(message =>
{
    string status = message.Str("order_status");
    Print(message.Str("orderid") + " " + message.Str("symbol") + " " + message.Str("action") + " " + status);
    if (status == "rejected")
        Print("rejected: " + message.Str("rejection_reason"));
});
```

Each message carries `orderid`, `symbol`, `exchange`, `action`, `quantity`, `pricetype`, `product`, `order_status`, `filled_quantity`, `pending_quantity`, `average_price` and `rejection_reason`, and `mode` (`"live"` or `"analyze"`). Brokers can report the same event more than once, so act on a status change rather than on every message, and reconcile with `orderbook()` when it matters. `client.get_orders()` returns the updates received so far, most recent first.

### Reading the latest value without a callback

The feed keeps the latest LTP, quote and depth of every subscribed instrument in memory. Reading it sends no request and returns a thread-safe copy, so it is cheap enough for `OnBarUpdate`:

```csharp
protected override void OnBarUpdate()
{
    if (client == null)
        return;
    double ltp = client.get_ltp(exchange: "NSE", symbol: "RELIANCE").Num("ltp.NSE.RELIANCE.ltp");
    if (ltp > 0)
        Print("RELIANCE " + ltp);
}
```

The callback argument of `subscribe_ltp`, `subscribe_quote` and `subscribe_depth` is optional, so you can subscribe without one and only read the cache.

### Connection events

Hooks tell your script when the feed comes up, goes down or is restored, and pass on every error the feed catches. Register them before you connect:

```csharp
client.on_connect(e => Print("feed live (connection " + e.Int("seq") + (e.Bool("reconnect") ? ", reconnect" : "") + ")"));
client.on_disconnect(e => Print("feed down (" + e.Str("reason") + ")" + (e.Bool("will_reconnect") ? ", reconnecting" : "")));
client.on_error((error, context) => Print("feed error (" + context.Str("kind") + "): " + error.Message));
client.connect_async();
```

After a drop the SDK reconnects, signs in again and repeats your subscriptions by itself. OpenAlgo does not replay the ticks or order updates that were missed while the connection was down, so refresh anything important with a REST call (`quotes`, `positionbook`, `orderbook`) from an `on_reconnect` hook. Put that call on the queue with `client.enqueue(...)`, so the feed thread does not wait for it.

### Good to know

* `connect()` returns `true` once the feed is live. `subscribe_*` return whether the request could be sent, not whether OpenAlgo accepted every symbol; a refused symbol reaches your `on_error` hook.
* A subscribe call throws an `ArgumentException` when `instruments` is not a list of `{exchange, symbol}` objects, where Python raises too. Every other feed problem is reported through the hooks.
* `disconnect()` stops the automatic reconnect and forgets your subscriptions. After a new `connect()`, subscribe again. `close()` disconnects too.
* `verbose: 1` or `verbose: 2` prints connection, subscription and update lines to the Output window. The API key is never printed.
* Two Windows limits: the .NET WebSocket client cannot send WebSocket pings, so a server that stays reachable but stops answering is not detected (a dead network path is, through TCP keep-alive). And Windows refuses the close codes 1012 to 1014, which the OpenAlgo server sends when the broker session changes; such a close arrives as a lost connection, and the feed reconnects and resubscribes as usual.

Every feed call, with its signature and an example, is listed under [WebSocket Feed in OpenAlgo NinjaScript Functions](openalgo-ninjascript-functions.md#websocket-feed). The raw protocol is described in the [WebSocket API](../../api-documentation/v1/websockets.md).
