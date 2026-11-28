# Sample Expert Advisor

This EMA crossover Expert Advisor trades through OpenAlgo. It ships in the release zip as `MQL5\Experts\OpenAlgo\OpenAlgoEMACrossover.mq5`, so once the [library is installed](download-and-install-library.md) you can compile it and attach it to a chart straight away.

### What it does

The EA watches two exponential moving averages, a fast one and a slow one, on the chart it is attached to:

* When the fast EMA closes above the slow EMA, it asks for a **long** position of `Quantity`.
* When the fast EMA closes below the slow EMA, it asks for a **short** position of `Quantity`, or for a **flat** position when `AllowShort` is false.

It sends these orders with `placesmartorder`. Instead of "buy 1" or "sell 1", a smart order states the position you want to end up with (`position_size`). OpenAlgo compares that target with your live position and trades only the difference. With `Quantity = 1`:

| Your position | Signal | Target sent | What OpenAlgo does |
| --- | --- | --- | --- |
| Flat | Bullish cross | +1 | Buys 1 |
| Short 1 | Bullish cross | +1 | Buys 2, reversing in one order |
| Long 1 | Bearish cross, `AllowShort` true | -1 | Sells 2 |
| Long 1 | Bearish cross, `AllowShort` false | 0 | Sells 1 |
| Long 1 | Bullish cross again | +1 | Nothing: the position already matches |

Because every order states a target position, a restarted EA or a repeated signal cannot double your position.

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `ApiKey` | empty | Your OpenAlgo API key. The EA refuses to start without it. |
| `Host` | `http://127.0.0.1:5000` | Your OpenAlgo URL. It must be on the WebRequest list. |
| `Strategy` | `MT5 EMA Crossover` | The strategy name OpenAlgo records against every order. |
| `TradingSymbol` | `RELIANCE` | The OpenAlgo symbol the orders go to. |
| `Exchange` | `NSE` | The OpenAlgo exchange. |
| `Product` | `MIS` | `MIS`, `CNC` or `NRML`. |
| `Quantity` | `1` | Shares, or lots times lot size for futures and options (one NIFTY lot of 65 is 65). |
| `FastEMA` | `9` | Fast EMA period. |
| `SlowEMA` | `21` | Slow EMA period, larger than `FastEMA`. |
| `AllowShort` | `true` | On a bearish cross: `true` goes short, `false` goes flat. |
| `EnableOrders` | `false` | `false` prints the signals and sends no order. |

### The chart and the traded symbol

The EMAs are calculated on the chart's own symbol and timeframe, but the orders go to `TradingSymbol` on `Exchange` through OpenAlgo. MetaTrader and OpenAlgo do not share symbol names, so the EA cannot connect the two for you. Attach it to a chart of the same instrument you trade (for example a custom symbol fed with NSE prices); otherwise the signal comes from one instrument and the order goes to another.

### How it avoids repeated orders

* It works once per bar. Every other tick returns at once.
* It compares closed bars only, so a cross that appears and disappears inside a forming bar never trades.
* It ignores the bar it starts on, so a cross that happened before you attached the EA is not traded.
* It waits until both EMAs include the new bar before comparing them.

One request per bar at most also keeps the EA far inside OpenAlgo's order rate limits.

### Run it safely

1. Switch OpenAlgo to analyzer (sandbox) mode, so orders are simulated.
2. Open `OpenAlgoEMACrossover.mq5` in MetaEditor and press **F7** to compile it.
3. Check that the `Host` URL is listed under **Tools > Options > Expert Advisors > Allow WebRequest for listed URL**.
4. Drag the EA from **Navigator > Expert Advisors > OpenAlgo** onto a chart. Enter your `ApiKey`, check the other inputs and leave `EnableOrders` at `false`.
5. Turn on **Algo Trading** in the MetaTrader toolbar.
6. Watch the **Experts** tab. On every cross the EA prints the signal, the symbol and the target position.
7. When the signals look right, set `EnableOrders = true`. The EA then prints which mode OpenAlgo is in when it starts, for example `OpenAlgo mode is analyze (orders are simulated)` or `(LIVE orders)`, and the order id of every accepted order.
8. Move OpenAlgo to live mode only after the sandbox results satisfy you.

**Strategy Tester:** you can test the crossover logic in the Strategy Tester. The SDK refuses every request there (`error_type` `tester_blocked`), so nothing reaches your account. Leave `EnableOrders` at `false` in the tester to see the signals alone.

### The code

```cpp
//+------------------------------------------------------------------+
//|                                         OpenAlgoEMACrossover.mq5 |
//|                                    Copyright 2024-2026, OpenAlgo |
//|                                          https://www.openalgo.in |
//+------------------------------------------------------------------+
//| EMA crossover Expert Advisor that trades through OpenAlgo.       |
//|                                                                  |
//| The EMAs are computed on the chart's symbol and timeframe. On    |
//| each new bar the last two closed bars are compared:              |
//|  - fast EMA crosses above slow EMA: placesmartorder BUY with     |
//|    position_size = +Quantity (long)                              |
//|  - fast EMA crosses below slow EMA: placesmartorder SELL with    |
//|    position_size = -Quantity (short), or 0 (flat) when           |
//|    AllowShort is false                                           |
//| placesmartorder trades only the difference between the current   |
//| OpenAlgo position and position_size, so a reversal from short to |
//| long is one order.                                               |
//|                                                                  |
//| SAFETY: EnableOrders is false by default, so the EA only prints  |
//| its signals. Run it with OpenAlgo in analyzer (sandbox) mode     |
//| first. In the Strategy Tester the SDK refuses every request, so  |
//| a backtest never reaches the account.                            |
//|                                                                  |
//| Before attaching: add the Host URL in Tools, Options, Expert     |
//| Advisors, "Allow WebRequest for listed URL".                     |
//|                                                                  |
//| MIT licensed.                                                    |
//+------------------------------------------------------------------+
#property copyright   "Copyright 2024-2026, OpenAlgo"
#property link        "https://www.openalgo.in"
#property version     "1.00"
#property description "EMA crossover EA that places OpenAlgo smart orders. Prints signals only until EnableOrders is true."

#include <OpenAlgo/OpenAlgo.mqh>

input string ApiKey        = "";                        // OpenAlgo API key
input string Host          = "http://127.0.0.1:5000";   // OpenAlgo server URL
input string Strategy      = "MT5 EMA Crossover";       // Strategy name sent to OpenAlgo
input string TradingSymbol = "RELIANCE";                // OpenAlgo symbol to trade
input string Exchange      = "NSE";                     // OpenAlgo exchange
input string Product       = "MIS";                     // Product: MIS, CNC or NRML
input double Quantity      = 1;                         // Quantity (shares or lots x lot size)
input int    FastEMA       = 9;                         // Fast EMA period
input int    SlowEMA       = 21;                        // Slow EMA period
input bool   AllowShort    = true;                      // Bearish cross: true goes short, false goes flat
input bool   EnableOrders  = false;                     // false: print signals only, send no order

api     *client = NULL;
int      fast_handle = INVALID_HANDLE;
int      slow_handle = INVALID_HANDLE;
datetime last_bar = 0;

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit(void)
  {
   if(ApiKey == "")
     {
      Print("OpenAlgoEMACrossover: enter your OpenAlgo API key in the ApiKey input.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(FastEMA < 1 || SlowEMA <= FastEMA || Quantity <= 0)
     {
      Print("OpenAlgoEMACrossover: need 1 <= FastEMA < SlowEMA and Quantity > 0.");
      return INIT_PARAMETERS_INCORRECT;
     }

   fast_handle = iMA(_Symbol, _Period, FastEMA, 0, MODE_EMA, PRICE_CLOSE);
   slow_handle = iMA(_Symbol, _Period, SlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   if(fast_handle == INVALID_HANDLE || slow_handle == INVALID_HANDLE)
     {
      Print("OpenAlgoEMACrossover: could not create the EMA indicators, error ", GetLastError());
      return INIT_FAILED;
     }

   client = new api(ApiKey, Host);
   last_bar = iTime(_Symbol, _Period, 0);   // act on the next new bar, not on the current one

   Print("OpenAlgoEMACrossover: EMA ", FastEMA, "/", SlowEMA, " on ", _Symbol, " ", EnumToString(_Period),
         ", trading ", Exchange, ":", TradingSymbol, " ", Product, " x ", Quantity, " as \"", Strategy, "\"");
   if(!EnableOrders)
      Print("OpenAlgoEMACrossover: EnableOrders is false: signals are printed, no order is sent.");
   else
     {
      OAJson *r = client.analyzerstatus();
      if(r.Str("status") == "success")
         Print("OpenAlgoEMACrossover: OpenAlgo mode is ", r.Str("data.mode"),
               r.Bool("data.analyze_mode") ? " (orders are simulated)" : " (LIVE orders)");
      else
         Print("OpenAlgoEMACrossover: analyzerstatus failed: ", r.ToString());
     }
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(fast_handle != INVALID_HANDLE)
      IndicatorRelease(fast_handle);
   if(slow_handle != INVALID_HANDLE)
      IndicatorRelease(slow_handle);
   fast_handle = INVALID_HANDLE;
   slow_handle = INVALID_HANDLE;
   if(client != NULL)
     {
      client.close();
      delete client;
      client = NULL;
     }
  }

//+------------------------------------------------------------------+
//| Sends the smart order for a signal (or only prints it).          |
//+------------------------------------------------------------------+
void Trade(const string action, const double position_size, const string reason)
  {
   Print("OpenAlgoEMACrossover: ", reason, ": ", action, " ", TradingSymbol, ", target position ", position_size);
   if(!EnableOrders)
      return;
   //--- Python: client.placesmartorder(strategy=..., symbol=..., action=...,
   //---         exchange=..., price_type="MARKET", product=..., quantity=...,
   //---         position_size=...)
   OAJson *r = client.placesmartorder(Strategy, TradingSymbol, action, Exchange, "MARKET", Product, Quantity,
                                      position_size);
   if(r.Str("status") == "success")
      Print("OpenAlgoEMACrossover: order accepted, orderid ", r.Str("orderid"), " ", r.Str("message"));
   else
      Print("OpenAlgoEMACrossover: order failed: ", r.ToString());
  }

//+------------------------------------------------------------------+
//| Expert tick                                                      |
//+------------------------------------------------------------------+
void OnTick(void)
  {
   //--- new-bar detection: work once per bar, on closed bars only
   datetime bar = iTime(_Symbol, _Period, 0);
   if(bar == 0 || bar == last_bar)
      return;
   if(last_bar == 0)
     {
      //--- the history was not ready in OnInit: this bar is the one the EA
      //--- started on, so do not act on a cross that happened before it
      last_bar = bar;
      return;
     }
   //--- the EMAs must already include the new bar, or index 1 would still be
   //--- the bar before the one that just closed
   int bars = Bars(_Symbol, _Period);
   if(BarsCalculated(fast_handle) < bars || BarsCalculated(slow_handle) < bars)
      return;   // not recalculated yet: try again on the next tick

   double fast[];
   double slow[];
   ArraySetAsSeries(fast, true);
   ArraySetAsSeries(slow, true);
   //--- index 0 is the bar that just opened, 1 and 2 the last two closed bars
   if(CopyBuffer(fast_handle, 0, 0, 3, fast) < 3 || CopyBuffer(slow_handle, 0, 0, 3, slow) < 3)
      return;   // indicator not ready: try again on the next tick
   last_bar = bar;

   bool bullish = (fast[1] > slow[1] && fast[2] <= slow[2]);
   bool bearish = (fast[1] < slow[1] && fast[2] >= slow[2]);
   if(bullish)
      Trade("BUY", Quantity, "bullish cross");
   else
      if(bearish)
         Trade("SELL", AllowShort ? -Quantity : 0, AllowShort ? "bearish cross" : "bearish cross (go flat)");
  }
//+------------------------------------------------------------------+
```

### How the code works

* **`OnInit`** checks the inputs, creates the two EMA indicators on the chart, builds the OpenAlgo client with `new api(ApiKey, Host)` and remembers the current bar, so the EA acts from the next bar on. With `EnableOrders` on, it calls `analyzerstatus()` and prints whether OpenAlgo is simulating orders or sending them live.
* **`OnTick`** returns unless a new bar has opened and both EMAs have been recalculated for it. It then copies three EMA values (the bar that just opened and the two last closed bars) and checks for a cross between the two closed bars: `fast[1] > slow[1] && fast[2] <= slow[2]` is bullish, the mirror image is bearish.
* **`Trade`** prints the signal and, with `EnableOrders` on, sends `client.placesmartorder(Strategy, TradingSymbol, action, Exchange, "MARKET", Product, Quantity, position_size)`. It reads `status` and `orderid` from the response, or prints the whole response when the order failed.
* **`OnDeinit`** releases the indicators, then closes and deletes the client, so changing an input builds a fresh client with the new values.

All calls used here are described on [OpenAlgo MQL5 Functions](openalgo-mql5-functions.md): [PlaceSmartOrder](openalgo-mql5-functions.md#placesmartorder-example) and [Analyzer Status](openalgo-mql5-functions.md#analyzer-status-example).

### More examples in the release

* `MQL5\Experts\OpenAlgo\OpenAlgoFeedLTP.mq5` streams live LTP ticks for one instrument from the OpenAlgo WebSocket feed and prints them. It places no orders. [WebSocket Feed](websocket-feed.md) explains how it works.
* `MQL5\Scripts\OpenAlgo\OpenAlgoQuickstart.mq5` makes read-only calls (`ping`, `funds`, `quotes`, `depth`, `history`, `positionbook`) and prints each response.
* `MQL5\Scripts\OpenAlgo\OpenAlgoOrderExamples.mq5` runs the order examples of the Python SDK page. It sends nothing unless `ConfirmLiveOrders = true`, and the account-wide `closeposition` and `cancelallorder` also need `RunCloseAndCancelAll = true`.
