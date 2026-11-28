# Sample Strategy

This EMA crossover strategy trades through OpenAlgo. It ships in the release zip as `Strategies\OpenAlgo\OpenAlgoEMACrossover.cs`, so once the [SDK is installed](download-and-install.md) and compiled you can add it to a chart straight away.

### What it does

The strategy watches two exponential moving averages, a fast one and a slow one, on the chart it runs on:

* When the fast EMA closes above the slow EMA, it asks for a **long** position of `Quantity`.
* When the fast EMA closes below the slow EMA, it asks for a **short** position of `Quantity`, or for a **flat** position when **Allow short** is off.

It sends these orders with `placesmartorder`. Instead of "buy 1" or "sell 1", a smart order states the position you want to end up with (`position_size`). OpenAlgo compares that target with your current position and trades only the difference. With `Quantity = 1`:

| Your position | Signal | Target sent | What OpenAlgo does |
| --- | --- | --- | --- |
| Flat | Bullish cross | +1 | Buys 1 |
| Short 1 | Bullish cross | +1 | Buys 2, reversing in one order |
| Long 1 | Bearish cross, Allow short on | -1 | Sells 2 |
| Long 1 | Bearish cross, Allow short off | 0 | Sells 1 |
| Long 1 | Bullish cross again | +1 | Nothing: the position already matches |

Because every order states a target position, a restarted strategy or a repeated signal cannot double your position.

No NinjaTrader order is placed. The position lives in your broker account through OpenAlgo, so NinjaTrader shows the strategy itself as flat; check the position on the OpenAlgo dashboard or with `positionbook`.

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| API key | empty | Your OpenAlgo API key. Without it the strategy prints a message and sends nothing. |
| Host | `http://127.0.0.1:5000` | Your OpenAlgo URL. |
| Strategy label | `NinjaTrader EMA Crossover` | The strategy name OpenAlgo records against every order. |
| OpenAlgo symbol | `RELIANCE` | The OpenAlgo symbol the orders go to. |
| OpenAlgo exchange | `NSE` | The OpenAlgo exchange. |
| Product | `MIS` | `MIS`, `CNC` or `NRML`. |
| Quantity | `1` | Shares, or lots times lot size for futures and options (one NIFTY lot of 65 is 65). |
| Fast EMA | `9` | Fast EMA period. |
| Slow EMA | `21` | Slow EMA period, larger than the fast one; otherwise the strategy sends nothing. |
| Allow short | on | On a bearish cross: on goes short, off goes flat. |
| Enable orders | off | Off prints the signals and sends no order. |

The first seven inputs are in the **OpenAlgo** group of the strategy's properties, the last four in the **Signal** group. The API key is masked in the property grid and never appears in the strategy's label.

### The chart and the traded symbol

The EMAs are calculated on the chart's own instrument and bar type, but the orders go to **OpenAlgo symbol** on **OpenAlgo exchange** through OpenAlgo. NinjaTrader and OpenAlgo do not share symbol names, so the strategy cannot connect the two for you. Run it on a chart of the instrument you trade, when your NinjaTrader data connection offers it; otherwise the signal comes from one instrument and the order goes to another.

### How it avoids repeated orders

* It acts only on bars that close in real time (`State.Realtime`). The chart's historical bars never trade, so a cross that happened before you enabled the strategy is not traded.
* It works once per closed bar (`Calculate.OnBarClose`). If you change **Calculate** to on each tick or on price change, it acts on the first tick of the next bar and still reads the bar that just closed, so a cross that appears and disappears inside a forming bar never trades.
* It remembers the last bar it signalled on and never acts on the same bar twice.
* It waits until there are enough bars for the slow EMA and for **Bars required to trade** (20).
* Orders go through `client.enqueue`: `OnBarUpdate` never waits for the network, and two signals reach OpenAlgo in the order they happened.

One request per bar at most also keeps the strategy far inside OpenAlgo's order rate limits.

### Run it safely

1. Switch OpenAlgo to analyzer mode (sandbox), so orders are simulated.
2. Make sure the SDK compiled: **New > NinjaScript Editor**, then **F5**.
3. Open a chart, right-click it and choose **Strategies...**. Add **OpenAlgoEMACrossover**, enter your **API key**, check the other inputs and leave **Enable orders** off. Tick **Enabled** and click **OK**.
4. Open **New > NinjaScript Output**. When the strategy reaches real time it prints its settings and `EnableOrders is false: signals are printed, no order is sent.` On every cross it prints the signal, for example `OpenAlgoEMACrossover: 2026-11-27 10:15:00 bullish cross: BUY RELIANCE, target position 1`.
5. When the signals look right, tick **Enable orders** and enable the strategy again. It then prints which mode OpenAlgo is in, for example `OpenAlgo mode is analyze (analyzer mode: orders are simulated)` or `(LIVE: orders reach your broker)`, and the order id of every accepted order.
6. Move OpenAlgo to live mode only after the sandbox results satisfy you.

**Strategy Analyzer and Market Replay:** this sample acts only on bars that close in real time, so a Strategy Analyzer backtest prints no signals. In a strategy of your own that does call OpenAlgo while backtesting, the SDK refuses every request (`error_type` `historical_blocked`), and on the Playback connection it refuses them as well (`playback_blocked`), so a backtest or a replay can never reach your account.

### The code

```csharp
// OpenAlgo NinjaScript SDK sample strategy: an EMA crossover that trades through OpenAlgo.
//
// Copyright (c) 2026 OpenAlgo. MIT licensed, see LICENSE.
//
// The EMAs are computed on the chart's instrument and bar type. When a bar closes in real
// time, the last two closed bars are compared:
//   fast EMA crosses above the slow EMA: placesmartorder BUY with position_size = +Quantity
//   fast EMA crosses below the slow EMA: placesmartorder SELL with position_size = -Quantity
//   (short), or 0 (flat) when AllowShort is false
// placesmartorder trades only the difference between the current OpenAlgo position and
// position_size, so a reversal from short to long is one order.
//
// The orders go to OpenAlgoSymbol on OpenAlgoExchange through your OpenAlgo server, which
// routes them to your broker. The chart instrument only produces the signal, and no
// NinjaTrader order is placed.
//
// SAFETY
// - EnableOrders is false by default: the strategy prints its signals and sends no order.
//   Run it with OpenAlgo in analyzer mode (sandbox) first.
// - It acts only on bars that close in real time (State.Realtime), at most once per bar.
// - The client is created with owner: this, so while the strategy processes historical
//   data, runs in the Strategy Analyzer or runs on the Playback connection, every request
//   is refused (historical_blocked, playback_blocked) and nothing reaches the account.
// - Orders go through client.enqueue: OnBarUpdate never waits for the network, and two
//   signals reach OpenAlgo in the order they happened.
#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Windows.Media;
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;
using NinjaTrader.NinjaScript.Indicators;
#endregion

// The namespace follows the folder: bin/Custom/Strategies/OpenAlgo.
namespace NinjaTrader.NinjaScript.Strategies.OpenAlgo
{
	/// <summary>EMA crossover that sends OpenAlgo smart orders. Prints signals only until EnableOrders is true.</summary>
	public class OpenAlgoEMACrossover : Strategy
	{
		private EMA emaFast;
		private EMA emaSlow;
		private api client;
		private int lastSignalBar = -1;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Description					= "EMA crossover that places OpenAlgo smart orders (placesmartorder). Prints signals only until EnableOrders is true.";
				Name						= "OpenAlgoEMACrossover";
				Calculate					= Calculate.OnBarClose;
				BarsRequiredToTrade			= 20;
				IsExitOnSessionCloseStrategy = false;

				ApiKey						= "";
				HostUrl						= "http://127.0.0.1:5000";
				StrategyLabel				= "NinjaTrader EMA Crossover";
				OpenAlgoSymbol				= "RELIANCE";
				OpenAlgoExchange			= "NSE";
				OpenAlgoProduct				= "MIS";
				Quantity					= 1;
				FastPeriod					= 9;
				SlowPeriod					= 21;
				AllowShort					= true;
				EnableOrders				= false;
			}
			else if (State == State.DataLoaded)
			{
				emaFast = EMA(FastPeriod);
				emaSlow = EMA(SlowPeriod);
				emaFast.Plots[0].Brush = Brushes.Goldenrod;
				emaSlow.Plots[0].Brush = Brushes.SeaGreen;
				AddChartIndicator(emaFast);
				AddChartIndicator(emaSlow);
			}
			else if (State == State.Realtime)
			{
				// Historical bars are done: from here on a closed bar may produce an order.
				if (string.IsNullOrEmpty(ApiKey))
				{
					Print(Name + ": enter your OpenAlgo API key in the API key input. Nothing is sent.");
					return;
				}
				if (FastPeriod >= SlowPeriod)
				{
					Print(Name + ": the fast EMA period must be smaller than the slow one. Nothing is sent.");
					return;
				}
				// owner: this turns on the safety guard (no request while historical or on Playback)
				client = new api(ApiKey, HostUrl, owner: this);
				Print(Name + ": EMA " + FastPeriod + "/" + SlowPeriod + " on " + Instrument.FullName + ", trading "
					+ OpenAlgoExchange + ":" + OpenAlgoSymbol + " " + OpenAlgoProduct + " x " + Num(Quantity)
					+ " as \"" + StrategyLabel + "\" through " + HostUrl + " (OpenAlgo NinjaScript SDK " + OpenAlgoSdk.Version + ")");
				if (!EnableOrders)
				{
					Print(Name + ": EnableOrders is false: signals are printed, no order is sent.");
				}
				else
				{
					string name = Name;
					// read-only: tell the user whether the orders are simulated
					client.enqueue(c => c.analyzerstatus(), r =>
					{
						if (r.Str("status") == "success")
							Print(name + ": OpenAlgo mode is " + r.Str("data.mode")
								+ (r.Bool("data.analyze_mode") ? " (analyzer mode: orders are simulated)" : " (LIVE: orders reach your broker)"));
						else
							Print(name + ": analyzerstatus failed: " + r.ToString());
					});
				}
			}
			else if (State == State.Terminated)
			{
				if (client != null)
				{
					// close() does not wait for an order in flight and does not abort it: its
					// on_done still prints OpenAlgo's answer. Queued orders that have not
					// started are not sent; their on_done prints the closed-client error.
					client.close();
					client = null;
				}
			}
		}

		protected override void OnBarUpdate()
		{
			if (BarsInProgress != 0 || State != State.Realtime || client == null)
				return;

			// With Calculate.OnBarClose the bar that just closed is [0]. If Calculate was changed to
			// OnEachTick or OnPriceChange, act on the first tick of a new bar and read the closed bar [1].
			int closedAgo = Calculate == Calculate.OnBarClose ? 0 : 1;
			if (closedAgo == 1 && !IsFirstTickOfBar)
				return;
			int closedBar = CurrentBar - closedAgo;
			if (CurrentBar < Math.Max(BarsRequiredToTrade, SlowPeriod) + closedAgo + 1 || closedBar <= lastSignalBar)
				return;

			double fastNow = emaFast[closedAgo];
			double slowNow = emaSlow[closedAgo];
			double fastBefore = emaFast[closedAgo + 1];
			double slowBefore = emaSlow[closedAgo + 1];
			bool bullish = fastNow > slowNow && fastBefore <= slowBefore;
			bool bearish = fastNow < slowNow && fastBefore >= slowBefore;
			if (bullish)
				Signal(closedBar, closedAgo, "BUY", Quantity, "bullish cross");
			else if (bearish)
				Signal(closedBar, closedAgo, "SELL", AllowShort ? -Quantity : 0, AllowShort ? "bearish cross" : "bearish cross (go flat)");
		}

		// Prints the signal and, with EnableOrders, queues the smart order. Never repeats a bar.
		private void Signal(int closedBar, int closedAgo, string action, double positionSize, string reason)
		{
			lastSignalBar = closedBar;
			string name = Name;
			Print(name + ": " + Time[closedAgo].ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) + " "
				+ reason + ": " + action + " " + OpenAlgoSymbol + ", target position " + Num(positionSize));
			if (!EnableOrders)
				return;

			string label = StrategyLabel;
			string symbol = OpenAlgoSymbol;
			string exchange = OpenAlgoExchange;
			string product = OpenAlgoProduct;
			double quantity = Quantity;
			// Python: client.placesmartorder(strategy=..., symbol=..., action=..., exchange=...,
			//         price_type="MARKET", product=..., quantity=..., position_size=...)
			client.enqueue(
				c => c.placesmartorder(strategy: label, symbol: symbol, action: action, exchange: exchange,
					price_type: "MARKET", product: product, quantity: quantity, position_size: positionSize),
				r =>
				{
					// runs on the client's queue thread: only Print here, no series or orders
					if (r.Str("status") == "success")
						Print(name + ": order accepted, orderid " + r.Str("orderid") + " " + r.Str("message"));
					else
						Print(name + ": order failed: " + r.ToString());
				});
		}

		private static string Num(double value)
		{
			return OANumbers.NumStr(value);
		}

		#region Properties
		[PasswordPropertyText(true)]
		[Display(Name = "API key", Description = "Your OpenAlgo API key (OpenAlgo web UI, API Key page). Saved with the workspace like any input.", GroupName = "OpenAlgo", Order = 1)]
		public string ApiKey { get; set; }

		[Display(Name = "Host", Description = "OpenAlgo server URL, e.g. http://127.0.0.1:5000 or https://yourdomain.com.", GroupName = "OpenAlgo", Order = 2)]
		public string HostUrl { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Strategy label", Description = "The strategy name sent to OpenAlgo with each order.", GroupName = "OpenAlgo", Order = 3)]
		public string StrategyLabel { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "OpenAlgo symbol", Description = "The OpenAlgo symbol to trade, e.g. RELIANCE or NIFTY30DEC25FUT.", GroupName = "OpenAlgo", Order = 4)]
		public string OpenAlgoSymbol { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "OpenAlgo exchange", Description = "NSE, BSE, NFO, BFO, CDS, BCD or MCX.", GroupName = "OpenAlgo", Order = 5)]
		public string OpenAlgoExchange { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Product", Description = "MIS (intraday), CNC (delivery) or NRML (carry forward F&O).", GroupName = "OpenAlgo", Order = 6)]
		public string OpenAlgoProduct { get; set; }

		[NinjaScriptProperty]
		[Range(1, double.MaxValue)]
		[Display(Name = "Quantity", Description = "Shares, or lots times the lot size for F&O.", GroupName = "OpenAlgo", Order = 7)]
		public double Quantity { get; set; }

		[NinjaScriptProperty]
		[Range(1, int.MaxValue)]
		[Display(Name = "Fast EMA", GroupName = "Signal", Order = 1)]
		public int FastPeriod { get; set; }

		[NinjaScriptProperty]
		[Range(2, int.MaxValue)]
		[Display(Name = "Slow EMA", GroupName = "Signal", Order = 2)]
		public int SlowPeriod { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Allow short", Description = "Bearish cross: true goes short, false goes flat.", GroupName = "Signal", Order = 3)]
		public bool AllowShort { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Enable orders", Description = "false: print signals only, send no order. Test with OpenAlgo in analyzer mode (sandbox) first.", GroupName = "Signal", Order = 4)]
		public bool EnableOrders { get; set; }
		#endregion
	}
}
```

### How the code works

* **`OnStateChange`, `State.SetDefaults`** sets the name, `Calculate.OnBarClose`, `BarsRequiredToTrade = 20` and the default inputs. No client is created here: NinjaTrader runs this state for instances that never trade.
* **`State.DataLoaded`** creates the two EMA indicators on the chart's bars and adds them to the chart.
* **`State.Realtime`** checks the inputs, builds the OpenAlgo client with `new api(ApiKey, HostUrl, owner: this)` and prints the settings. With **Enable orders** on, it queues `analyzerstatus()` and prints whether OpenAlgo is simulating orders or sending them to the broker.
* **`State.Terminated`** closes the client. `close()` does not wait for an order in flight and does not cut it off: its callback still prints OpenAlgo's answer. Queued orders that have not started are not sent.
* **`OnBarUpdate`** returns unless the bar belongs to the chart's own series, the strategy is in real time and the client exists. It then compares the EMAs on the bar that just closed and the bar before it: `fastNow > slowNow && fastBefore <= slowBefore` is bullish, the mirror image is bearish.
* **`Signal`** records the bar, prints the signal and, with **Enable orders** on, queues `c.placesmartorder(strategy: label, symbol: symbol, action: action, exchange: exchange, price_type: "MARKET", product: product, quantity: quantity, position_size: positionSize)`. The inputs are copied into local variables first, so the queued call uses the values of the moment of the signal. The callback runs on the client's queue thread and only prints the order id, or the whole response when the order failed.
* **`Num`** prints a number the way the Python SDK sends it (`1`, not `1.0`).

All calls used here are described on [OpenAlgo NinjaScript Functions](openalgo-ninjascript-functions.md): [PlaceSmartOrder](openalgo-ninjascript-functions.md#placesmartorder-example) and [Analyzer Status](openalgo-ninjascript-functions.md#analyzer-status-example). The queue is explained in [Using the Add-On](using-the-addon.md#calls-that-wait-and-the-ordered-queue).

### More examples in the release

* `Indicators\OpenAlgo\OpenAlgoFeedLTP.cs` streams the LTP of one symbol from the OpenAlgo WebSocket feed and plots it in its own panel. It places no orders. [WebSocket Feed](websocket-feed.md) explains how it works.
* `Strategies\OpenAlgo\OpenAlgoSelfTest.cs` makes read-only calls (`ping`, `funds`, `analyzerstatus`, `quotes`) and prints a `PASS` or `FAIL` line for each. See [Download & Install](download-and-install.md#4-run-the-self-test).
* `Strategies\OpenAlgo\OpenAlgoOrderExamples.cs` runs one example of each order call with the values of the Python SDK page: `placeorder` (MARKET, LIMIT, SL, SL-M), `placesmartorder`, `modifyorder`, `cancelorder`, `basketorder`, `splitorder`, `optionsorder`, `optionsmultiorder`, `placegttorder` and `cancelgttorder`. It sends nothing unless **Confirm live orders** is ticked, it refuses to send unless OpenAlgo is in analyzer mode or **Allow live mode** is ticked too, and the account-wide `closeposition` and `cancelallorder` also need **Run close and cancel all**.
