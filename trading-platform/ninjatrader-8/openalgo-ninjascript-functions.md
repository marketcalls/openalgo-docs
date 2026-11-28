# OpenAlgo NinjaScript Functions

To install the OpenAlgo NinjaScript SDK, download **[OpenAlgo-NT8-v1.0.0.zip](https://github.com/marketcalls/openalgo-nt8-connector/releases/download/v1.0.0/OpenAlgo-NT8-v1.0.0.zip)** and copy its folders into `Documents\NinjaTrader 8\bin\Custom`, as described in [Download & Install](download-and-install.md). Newer versions are on the [releases page](https://github.com/marketcalls/openalgo-nt8-connector/releases).

### Get the OpenAlgo apikey

Make sure that your OpenAlgo application is running. Log in to OpenAlgo with valid credentials and copy the OpenAlgo apikey from the API Key page. NinjaTrader needs no extra setting to reach OpenAlgo: the SDK uses the .NET HTTP client that NinjaScript already references.

For detailed function parameters refer to the [API Documentation](../../api-documentation/v1/README.md).

### Getting Started with OpenAlgo

Add the using line to your script and create the client with your API key:

```csharp
using NinjaTrader.NinjaScript.AddOns.OpenAlgo;

// Replace 'your_api_key_here' with your actual API key.
// Use your hosted domain or ngrok domain as the host.
// If NinjaTrader and OpenAlgo run on the same Windows computer, keep the default host.
api client = new api(api_key: "your_api_key_here", host: "http://127.0.0.1:5000", owner: this);
```

`owner: this` is the calling strategy or indicator: it switches on the safety guard that refuses requests during backtests and Market Replay. The full constructor, the strategy pattern (create the client in `State.Realtime`, close it in `State.Terminated`) and how to read responses are on [Using the Add-On](using-the-addon.md).

### Check the SDK version

```csharp
Print(OpenAlgoSdk.Version);   // 1.0.0
```

### How Python calls map to C#

Every method has the Python name and the Python parameter names, and C# named arguments let you write a call the way you write the Python keyword call. Five rules follow from that:

1. **Named arguments read like Python keywords.** `client.splitorder(symbol: "YESBANK", exchange: "NSE", action: "SELL", quantity: 105, splitsize: 20)` is the Python call with `=` written as `:`. The order of named arguments does not matter.
2. **Required parameters come first.** The Python methods are keyword-only, so there is no positional order to keep. C# lists the required parameters first (in Python order), then the optional ones with Python's defaults. That is why the `placeorder` signature starts with `symbol`, `action` and `exchange`, and `strategy = "Python"` follows them. With named arguments you never need to know this.
3. **Python `**kwargs` fields are explicit optional parameters.** `price`, `trigger_price`, `disclosed_quantity` and `splitsize` are named parameters like any other.
4. **"Not passed" is `null`.** Python `None` is C# `null`: an optional parameter left at `null` (a string, or a nullable number such as `double?`, `int?` or `bool?`) is left out of the request, exactly as Python leaves out `None`.
5. **Lists and dicts are ordinary C# objects.** Where Python takes a list of dicts (`orders`, `legs`, `symbols`, `positions`, `instruments`, `holdings`), pass an array of anonymous objects, a list, a dictionary or an `OAJson` array. See [Building lists for a request](using-the-addon.md#building-lists-for-a-request).

The JSON sent to OpenAlgo is the same as Python's: `placeorder` sends `"quantity": "1"` as a JSON string, as Python's `str(quantity)` does, and prices never lose precision (`2450.05 * 1.1` is sent as `2695.0550000000003`, exactly as Python sends it).

### Reading the examples

Each function below shows its C# signature, an example call with the same values as the [Python SDK page](../python/README.md), and the example response from the Python page or the API documentation. Every example assumes the `client` from Getting Started and prints the answer with `Print(r.ToString())` (one line) or `Print(r.Pretty())` (indented). JSON keys can come back in a different order from the examples, so always read values by name, for example `r.Str("orderid")`.

The examples call the client directly to keep them short. Such a call waits until OpenAlgo answers, so inside `OnBarUpdate` or `OnStateChange` put it on the client's queue instead: `client.enqueue(c => c.placeorder(...), r => Print(r.ToString()));`. See [Calls that wait, and the ordered queue](using-the-addon.md#calls-that-wait-and-the-ordered-queue).

Where Python returns a pandas DataFrame (`history`, `instruments`), C# returns the API's JSON with the rows as an array.

Please refer to the documentation on [order constants](../../api-documentation/v1/order-constants.md), and consult the API reference for details on optional parameters.

## Order API

### PlaceOrder Example

Places a regular order. `price`, `trigger_price` and `disclosed_quantity` are left out of the request when they are `null`.

```csharp
OAJson placeorder(string symbol, string action, string exchange, string strategy = "Python",
    string price_type = "MARKET", string product = "MIS", double quantity = 1,
    double? price = null, double? trigger_price = null, int? disclosed_quantity = null);
```

To place a new market order:

```csharp
OAJson r = client.placeorder(strategy: "Python", symbol: "NHPC", action: "BUY", exchange: "NSE",
                             price_type: "MARKET", product: "MIS", quantity: 1);
Print(r.ToString());
```

**Place Market Order Response**

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```csharp
OAJson r = client.placeorder(strategy: "Python", symbol: "YESBANK", action: "BUY", exchange: "NSE",
                             price_type: "LIMIT", product: "MIS", quantity: 1, price: 16,
                             trigger_price: 0, disclosed_quantity: 0);
Print(r.ToString());
```

**Place Limit Order Response**

```json
{"orderid": "250408001003813", "status": "success"}
```

Every call returns a new response object, so you can keep it: `string order_id = r.Str("orderid");`.

### PlaceSmartOrder Example

Places an order that brings your open position in that symbol, exchange and product to `position_size`. OpenAlgo compares the target with your current position and trades only the difference: `5` means "be long 5", `-5` "be short 5", `0` "be flat". `position_size` is required, so it follows `exchange` in the signature.

```csharp
OAJson placesmartorder(string symbol, string action, string exchange, double position_size,
    string strategy = "Python", string price_type = "MARKET", string product = "MIS", double quantity = 1,
    double? price = null, double? trigger_price = null, int? disclosed_quantity = null);
```

To place a smart order considering the current position size:

```csharp
OAJson r = client.placesmartorder(strategy: "Python", symbol: "TATAMOTORS", action: "SELL", exchange: "NSE",
                                  price_type: "MARKET", product: "MIS", quantity: 1, position_size: 5);
Print(r.ToString());
```

**Place Smart Market Order Response**

```json
{"orderid": "250408000997543", "status": "success"}
```

### BasketOrder Example

Places several orders in one request. Each order uses the API field name `pricetype`, not `price_type`. As in Python, every number in an order is sent as a string.

```csharp
OAJson basketorder(object orders, string strategy = "Python");
```

To place a new basket order:

```csharp
OAJson r = client.basketorder(orders: new[] {
    new { symbol = "BHEL",   exchange = "NSE", action = "BUY",  quantity = 1, pricetype = "MARKET", product = "MIS" },
    new { symbol = "ZOMATO", exchange = "NSE", action = "SELL", quantity = 1, pricetype = "MARKET", product = "MIS" } });
Print(r.Pretty());
```

**Basket Order Response**

```json
{
  "status": "success",
  "results": [
    {
      "symbol": "BHEL",
      "status": "success",
      "orderid": "250408000999544"
    },
    {
      "symbol": "ZOMATO",
      "status": "success",
      "orderid": "250408000997545"
    }
  ]
}
```

### SplitOrder Example

Splits a large order into child orders of `splitsize` each. The last child takes the remainder, and one call places at most 100 child orders.

```csharp
OAJson splitorder(string symbol, string action, string exchange, double quantity, int splitsize,
    string strategy = "Python", string price_type = "MARKET", string product = "MIS",
    double? price = null, double? trigger_price = null, int? disclosed_quantity = null);
```

To place a new split order:

```csharp
OAJson r = client.splitorder(symbol: "YESBANK", exchange: "NSE", action: "SELL", quantity: 105, splitsize: 20,
                             price_type: "MARKET", product: "MIS");
Print(r.Pretty());
```

**SplitOrder Response**

```json
{
  "status": "success",
  "split_size": 20,
  "total_quantity": 105,
  "results": [
    {
      "order_num": 1,
      "orderid": "250408001021467",
      "quantity": 20,
      "status": "success"
    },
    {
      "order_num": 2,
      "orderid": "250408001021459",
      "quantity": 20,
      "status": "success"
    },
    {
      "order_num": 3,
      "orderid": "250408001021466",
      "quantity": 20,
      "status": "success"
    },
    {
      "order_num": 4,
      "orderid": "250408001021470",
      "quantity": 20,
      "status": "success"
    },
    {
      "order_num": 5,
      "orderid": "250408001021471",
      "quantity": 20,
      "status": "success"
    },
    {
      "order_num": 6,
      "orderid": "250408001021472",
      "quantity": 5,
      "status": "success"
    }
  ]
}
```

### ModifyOrder Example

Modifies an open order. OpenAlgo needs the full order, so send every field, not only the one that changes. `price_type` defaults to `"LIMIT"` here, and `disclosed_quantity` and `trigger_price` are always sent (`0` unless you pass them).

```csharp
OAJson modifyorder(string order_id, string symbol, string action, string exchange, string product,
    double quantity, double price, string strategy = "Python", string price_type = "LIMIT",
    int disclosed_quantity = 0, double trigger_price = 0);
```

To modify an existing order:

```csharp
OAJson r = client.modifyorder(order_id: "250408001002736", strategy: "Python", symbol: "YESBANK", action: "BUY",
                              exchange: "NSE", price_type: "LIMIT", product: "CNC", quantity: 1, price: 16.5);
Print(r.ToString());
```

**Modify Order Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

### CancelOrder Example

Cancels one open order.

```csharp
OAJson cancelorder(string order_id, string strategy = "Python");
```

To cancel an existing order:

```csharp
OAJson r = client.cancelorder(order_id: "250408001002736", strategy: "Python");
Print(r.ToString());
```

**Cancelorder Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

### CancelAllOrder Example

Cancels every open and trigger-pending order of the account.

{% hint style="warning" %}
This is account-wide. `strategy` is only a label for the log; it does not filter which orders are cancelled, and stop-loss orders that protect other positions are cancelled too. To cancel a single order, use `cancelorder`.
{% endhint %}

```csharp
OAJson cancelallorder(string strategy = "Python");
```

To cancel all open orders and trigger pending orders:

```csharp
OAJson r = client.cancelallorder(strategy: "Python");
Print(r.Pretty());
```

**Cancelallorder Response**

```json
{
  "status": "success",
  "message": "Canceled 5 orders. Failed to cancel 0 orders.",
  "canceled_orders": [
    "250408001042620",
    "250408001042667",
    "250408001042642",
    "250408001043015",
    "250408001043386"
  ],
  "failed_cancellations": []
}
```

### ClosePosition Example

Squares off every open position of the account, across exchanges.

{% hint style="warning" %}
This is account-wide. `strategy` is only a label; it does not limit the square-off to one strategy. To exit a single position, send an opposite order, or a `placesmartorder` with `position_size: 0`.
{% endhint %}

```csharp
OAJson closeposition(string strategy = "Python");
```

To close all open positions across various exchanges:

```csharp
OAJson r = client.closeposition(strategy: "Python");
Print(r.ToString());
```

**ClosePosition Response**

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

### OrderStatus Example

Returns the current status of one order.

```csharp
OAJson orderstatus(string order_id, string strategy = "Python");
```

To get the current order status:

```csharp
OAJson r = client.orderstatus(order_id: "250828000185002", strategy: "Test Strategy");
Print(r.Pretty());
```

**Orderstatus Response**

```json
{
  "data": {
    "action": "BUY",
    "average_price": 18.95,
    "exchange": "NSE",
    "order_status": "complete",
    "orderid": "250828000185002",
    "price": 0,
    "pricetype": "MARKET",
    "product": "MIS",
    "quantity": "1",
    "symbol": "YESBANK",
    "timestamp": "28-Aug-2025 09:59:10",
    "trigger_price": 0
  },
  "status": "success"
}
```

### OpenPosition Example

Returns the net open quantity for one symbol, exchange and product.

```csharp
OAJson openposition(string symbol, string exchange, string product, string strategy = "Python");
```

To get the current open position:

```csharp
OAJson r = client.openposition(strategy: "Test Strategy", symbol: "YESBANK", exchange: "NSE", product: "MIS");
Print(r.ToString());
```

**OpenPosition Response**

```json
{"quantity": "-10", "status": "success"}
```

With no position the quantity comes back as the number `0` rather than a string, so read it with `r.Num("quantity")`, which handles both.

## GTT Orders

A GTT (Good Till Triggered) order is a price trigger that sits with the broker until LTP crosses your level, then places the underlying order automatically. Support and OCO behaviour differ between brokers; review [broker-specific GTT behaviour](../../api-documentation/v1/orders-api/placegttorder.md#broker-specific-behaviour) before using OCO.

| Type | Use when | Triggers | Orders fired |
| --- | --- | --- | --- |
| `SINGLE` | One entry or exit at a level | 1 | 1 |
| `OCO` | Stoploss and target intent; broker-specific behaviour applies | 2 | Native OCO cancels the other leg; not universal |

For a **SINGLE**, set your level in one of `triggerprice_sl` or `triggerprice_tg` and leave the other at `0`: `triggerprice_sl` for a level **below** LTP (sell stop-loss, buy the dip), `triggerprice_tg` for a level **above** it (breakout buy, sell at target).

For an **OCO**, all four fields are required: `triggerprice_sl` with its `stoploss` limit, and `triggerprice_tg` with its `target` limit, where `triggerprice_sl < triggerprice_tg`.

GTT accepts `CNC` and `NRML` only. `MIS` is refused: a GTT can sit for days and MIS is squared off the same session.

### PlaceGTTOrder Example

Places a GTT trigger. `stoploss` and `target` default to `null` (not sent) and are used by OCO only.

```csharp
OAJson placegttorder(string symbol, string action, string exchange, string strategy = "Python",
    string trigger_type = "SINGLE", string product = "CNC", double quantity = 1, string price_type = "LIMIT",
    double price = 0, double triggerprice_sl = 0, double triggerprice_tg = 0,
    double? stoploss = null, double? target = null, string expires_at = null);
```

```csharp
// SINGLE: "Buy IDEA if it dips to 9.55, with a LIMIT order at 9.50"
// LTP is above 9.55, so the trigger sits below it: triggerprice_sl
OAJson r = client.placegttorder(strategy: "My GTT Strategy", symbol: "IDEA", action: "BUY", exchange: "NSE",
                                product: "CNC", quantity: 1, price_type: "LIMIT", price: 9.50, triggerprice_sl: 9.55);
Print(r.ToString());
```

```csharp
// SINGLE: "Buy RELIANCE at MARKET if it breaks above 1450"
// LTP is below 1450, so the trigger sits above it: triggerprice_tg
OAJson r = client.placegttorder(strategy: "My GTT Strategy", symbol: "RELIANCE", action: "BUY", exchange: "NSE",
                                product: "CNC", quantity: 1, price_type: "MARKET", price: 0, triggerprice_tg: 1450);
```

```csharp
// OCO: "I hold 5 INFY. Stop me out at 1480, take profit at 1620"
// price is 0: OCO prices each leg separately through stoploss and target
OAJson r = client.placegttorder(strategy: "Bracket OCO", trigger_type: "OCO", symbol: "INFY", action: "SELL",
                                exchange: "NSE", product: "CNC", quantity: 5, price_type: "LIMIT", price: 0,
                                triggerprice_sl: 1480, stoploss: 1478, triggerprice_tg: 1620, target: 1622);
```

**PlaceGTTOrder Response**

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Save the `trigger_id`: modify and cancel both need it. In analyzer mode (sandbox) the response adds `"mode": "analyze"` and the `trigger_id` starts with `GTT-`.

### ModifyGTTOrder Example

Modify is a **full replacement**, not a patch. Every field on the trigger is replaced by what the call sends, so pass everything you want to keep. `trigger_type`, `symbol`, `exchange` and `action` cannot change: cancel and place a new GTT instead.

```csharp
OAJson modifygttorder(string trigger_id, string symbol, string action, string exchange,
    string strategy = "Python", string trigger_type = "SINGLE", string product = "CNC", double quantity = 1,
    string price_type = "LIMIT", double price = 0, double triggerprice_sl = 0, double triggerprice_tg = 0,
    double? stoploss = null, double? target = null);
```

```csharp
// price was 9.50, triggerprice_sl was 9.55
OAJson r = client.modifygttorder(trigger_id: "23132604291205", strategy: "My GTT Strategy", symbol: "IDEA",
                                 action: "BUY", exchange: "NSE", product: "CNC", quantity: 1, price_type: "LIMIT",
                                 price: 9.60, triggerprice_sl: 9.65);
Print(r.ToString());
```

**ModifyGTTOrder Response**

```json
{"status": "success", "trigger_id": "23132604291205"}
```

### CancelGTTOrder Example

Cancels an active GTT. Cancelling an OCO removes both legs where the broker supports it.

```csharp
OAJson cancelgttorder(string trigger_id, string strategy = "Python");
```

```csharp
OAJson r = client.cancelgttorder(trigger_id: "23132604291205", strategy: "My GTT Strategy");
Print(r.ToString());
```

**CancelGTTOrder Response**

```json
{"status": "success", "trigger_id": "23132604291205"}
```

### GTTOrderBook Example

Lists your GTT triggers. By default only **active** triggers, the ones that can still fire. Pass `status: "all"` to include the history as well (triggered, cancelled, expired, rejected), active first.

```csharp
OAJson gttorderbook(string status = null);
```

```csharp
// Active triggers only (default)
OAJson r = client.gttorderbook();
Print(r.Pretty());

// Active triggers first, then the triggered / cancelled / expired history
r = client.gttorderbook(status: "all");
foreach (OAJson gtt in r["data"])
    Print(gtt.Str("trigger_id") + " " + gtt.Str("status") + " " + gtt.Str("symbol") + " " + gtt.Str("trigger_prices"));
```

**GTTOrderBook Response**

```json
{
  "status": "success",
  "data": [
    {
      "trigger_id": "23132604291205",
      "trigger_type": "single",
      "status": "active",
      "symbol": "IDEA",
      "exchange": "NSE",
      "trigger_prices": [9.55],
      "last_price": 9.50,
      "legs": [
        {
          "action": "BUY",
          "quantity": 1,
          "price": 9.50,
          "pricetype": "LIMIT",
          "product": "CNC"
        }
      ],
      "created_at": "2026-04-29 12:18:42",
      "updated_at": "",
      "expires_at": ""
    }
  ]
}
```

`trigger_prices` is sorted ascending: a SINGLE has one element and one leg, an OCO has two of each with the stoploss first.

The SDK refuses an impossible trigger before anything leaves NinjaTrader, as the Python SDK does, and returns the refusal in the same shape as an API error:

```csharp
// SINGLE with no trigger price at all
OAJson r = client.placegttorder(symbol: "IDEA", action: "BUY", exchange: "NSE", product: "CNC", quantity: 1, price: 9.50);
// {"status":"error",
//  "message":"SINGLE GTT requires a positive triggerprice_sl or triggerprice_tg.",
//  "error_type":"validation_error"}
```

API reference: [PlaceGTTOrder](../../api-documentation/v1/orders-api/placegttorder.md), [ModifyGTTOrder](../../api-documentation/v1/orders-api/modifygttorder.md), [CancelGTTOrder](../../api-documentation/v1/orders-api/cancelgttorder.md), [GTTOrderBook](../../api-documentation/v1/orders-api/gttorderbook.md).

## Options

Expiry dates use the compact `DDMMMYY` form, for example `28OCT25`. `strike_int` is deprecated: leave it at `null`, so it is left out and OpenAlgo reads the real strikes from the master contract (passing it prints a deprecation line at `verbose: 1`).

### OptionsOrder Example

Places an option order. You name the underlying, expiry and offset (`ATM`, `ITM1` to `ITM50`, `OTM1` to `OTM50`), and OpenAlgo resolves the actual contract. Product is `MIS` or `NRML`; `CNC` is rejected for options.

```csharp
OAJson optionsorder(string underlying, string exchange, string offset, string option_type,
    string action, double quantity, string strategy = "Python", int? strike_int = null,
    string expiry_date = null, string price_type = "MARKET", string product = "MIS",
    int? splitsize = null, double? price = null, double? trigger_price = null, int? disclosed_quantity = null);
```

To place ATM options order:

```csharp
OAJson r = client.optionsorder(strategy: "python", underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "28OCT25",
                               offset: "ATM", option_type: "CE", action: "BUY", quantity: 65, price_type: "MARKET",
                               product: "NRML", splitsize: 0);
Print(r.Pretty());
```

**Place Options Order Response**

```json
{
  "exchange": "NFO",
  "offset": "ATM",
  "option_type": "CE",
  "orderid": "25102800000006",
  "status": "success",
  "symbol": "NIFTY28OCT2525950CE",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05
}
```

To place ITM options order:

```csharp
OAJson r = client.optionsorder(strategy: "python", underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "28OCT25",
                               offset: "ITM4", option_type: "PE", action: "BUY", quantity: 65, price_type: "MARKET",
                               product: "NRML", splitsize: 0);
Print(r.Pretty());
```

**Place Options Order Response**

```json
{
  "exchange": "NFO",
  "offset": "ITM4",
  "option_type": "PE",
  "orderid": "25102800000007",
  "status": "success",
  "symbol": "NIFTY28OCT2526150PE",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05
}
```

To place OTM options order:

```csharp
OAJson r = client.optionsorder(strategy: "python", underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "28OCT25",
                               offset: "OTM5", option_type: "CE", action: "BUY", quantity: 65, price_type: "MARKET",
                               product: "NRML", splitsize: 0);
Print(r.Pretty());
```

**Place Options Order Response**

```json
{
  "exchange": "NFO",
  "mode": "analyze",
  "offset": "OTM5",
  "option_type": "CE",
  "orderid": "25102800000008",
  "status": "success",
  "symbol": "NIFTY28OCT2526200CE",
  "underlying": "NIFTY28OCT25FUT",
  "underlying_ltp": 25966.05
}
```

`"mode": "analyze"` marks an order placed while OpenAlgo was in analyzer mode (sandbox). With a `splitsize` above 0 the order is split, and `orderid` is replaced by `total_quantity`, `split_size` and `results`.

### OptionsMultiOrder Example

Places 1 to 20 option legs on one underlying in a single request; BUY legs are executed first. Each leg needs `offset`, `option_type`, `action` and `quantity`, and may carry its own `expiry_date` for calendar and diagonal spreads.

```csharp
OAJson optionsmultiorder(string strategy, string underlying, string exchange, object legs,
    string expiry_date = null, int? strike_int = null);
```

To place Iron options order (Same Expiry):

```csharp
OAJson r = client.optionsmultiorder(strategy: "Iron Condor Test", underlying: "NIFTY", exchange: "NSE_INDEX",
                                    expiry_date: "25NOV25", legs: new[] {
    new { offset = "OTM6", option_type = "CE", action = "BUY",  quantity = 65 },
    new { offset = "OTM6", option_type = "PE", action = "BUY",  quantity = 65 },
    new { offset = "OTM4", option_type = "CE", action = "SELL", quantity = 65 },
    new { offset = "OTM4", option_type = "PE", action = "SELL", quantity = 65 } });
Print(r.Pretty());
```

**Place OptionsMultiOrder Response**

```json
{
  "status": "success",
  "underlying": "NIFTY",
  "underlying_ltp": 26050.45,
  "results": [
    {
      "action": "BUY",
      "leg": 1,
      "mode": "analyze",
      "offset": "OTM6",
      "option_type": "CE",
      "orderid": "25111996859688",
      "status": "success",
      "symbol": "NIFTY25NOV2526350CE"
    },
    {
      "action": "BUY",
      "leg": 2,
      "mode": "analyze",
      "offset": "OTM6",
      "option_type": "PE",
      "orderid": "25111996042210",
      "status": "success",
      "symbol": "NIFTY25NOV2525750PE"
    },
    {
      "action": "SELL",
      "leg": 3,
      "mode": "analyze",
      "offset": "OTM4",
      "option_type": "CE",
      "orderid": "25111922189638",
      "status": "success",
      "symbol": "NIFTY25NOV2526250CE"
    },
    {
      "action": "SELL",
      "leg": 4,
      "mode": "analyze",
      "offset": "OTM4",
      "option_type": "PE",
      "orderid": "25111919252668",
      "status": "success",
      "symbol": "NIFTY25NOV2525850PE"
    }
  ]
}
```

To place Diagonal Spread options order (Different Expiry):

```csharp
OAJson r = client.optionsmultiorder(strategy: "Diagonal Spread Test", underlying: "NIFTY", exchange: "NSE_INDEX",
                                    legs: new[] {
    new { offset = "ITM2", option_type = "CE", action = "BUY",  quantity = 65, expiry_date = "30DEC25" },
    new { offset = "OTM2", option_type = "CE", action = "SELL", quantity = 65, expiry_date = "25NOV25" } });
Print(r.Pretty());
```

**Place OptionsMultiOrder Response**

```json
{
  "results": [
    {
      "action": "BUY",
      "leg": 1,
      "mode": "analyze",
      "offset": "ITM2",
      "option_type": "CE",
      "orderid": "25111933337854",
      "status": "success",
      "symbol": "NIFTY30DEC2525950CE"
    },
    {
      "action": "SELL",
      "leg": 2,
      "mode": "analyze",
      "offset": "OTM2",
      "option_type": "CE",
      "orderid": "25111957475473",
      "status": "success",
      "symbol": "NIFTY25NOV2526150CE"
    }
  ],
  "status": "success",
  "underlying": "NIFTY",
  "underlying_ltp": 26052.65
}
```

A leg without `offset`, `option_type`, `action` or `quantity` sends nothing and returns `error_type` `unknown_error` with the error the Python SDK raises.

### OptionSymbol Example

Resolves an option symbol, with lot size and tick size, from the underlying, expiry and offset, without placing an order. `strategy` is deprecated and ignored by the server: leave it at `null`.

```csharp
OAJson optionsymbol(string underlying, string exchange, string offset, string option_type,
    string strategy = null, int? strike_int = null, string expiry_date = null);
```

ATM Option

```csharp
OAJson r = client.optionsymbol(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "30DEC25", offset: "ATM",
                               option_type: "CE");
Print(r.Pretty());
```

**OptionSymbol Response**

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2525950CE",
  "exchange": "NFO",
  "lotsize": 65,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

ITM Option

```csharp
OAJson r = client.optionsymbol(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "30DEC25", offset: "ITM3",
                               option_type: "PE");
Print(r.Pretty());
```

**OptionSymbol Response**

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2526100PE",
  "exchange": "NFO",
  "lotsize": 65,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

OTM Option

```csharp
OAJson r = client.optionsymbol(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "30DEC25", offset: "OTM4",
                               option_type: "CE");
Print(r.Pretty());
```

**OptionSymbol Response**

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2526150CE",
  "exchange": "NFO",
  "lotsize": 65,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

A handy use in a strategy: read `r.Int("lotsize")` to size an order in whole lots.

### OptionChain Example

Returns the option chain of one expiry with quotes for every strike. `strike_count` is the number of strikes above and below ATM; leave it at `null` to fetch the entire chain for the expiry. `with_greeks: true` adds implied volatility and Greeks to every leg.

```csharp
OAJson optionchain(string underlying, string exchange, string expiry_date = null,
    int? strike_count = null, bool? with_greeks = null, double? interest_rate = null);
```

```csharp
OAJson r = client.optionchain(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "30DEC25", strike_count: 10);
Print(r.Pretty());
```

**OptionChain Response**

```json
{
    "status": "success",
    "underlying": "NIFTY",
    "underlying_ltp": 26215.55,
    "expiry_date": "30DEC25",
    "atm_strike": 26200.0,
    "chain": [
        {
            "strike": 26100.0,
            "ce": {
                "symbol": "NIFTY30DEC2526100CE",
                "label": "ITM2",
                "ltp": 490,
                "bid": 490,
                "ask": 491,
                "open": 540,
                "high": 571,
                "low": 444.75,
                "prev_close": 496.8,
                "volume": 1195800,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            },
            "pe": {
                "symbol": "NIFTY30DEC2526100PE",
                "label": "OTM2",
                "ltp": 193,
                "bid": 191.2,
                "ask": 193,
                "open": 204.1,
                "high": 229.95,
                "low": 175.6,
                "prev_close": 215.95,
                "volume": 1832700,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            }
        },
        {
            "strike": 26150.0,
            "ce": {
                "symbol": "NIFTY30DEC2526150CE",
                "label": "ITM1",
                "ltp": 460.5,
                "bid": 452.9,
                "ask": 463,
                "open": 475.8,
                "high": 535.7,
                "low": 414.6,
                "prev_close": 461.05,
                "volume": 183525,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            },
            "pe": {
                "symbol": "NIFTY30DEC2526150PE",
                "label": "OTM1",
                "ltp": 208.5,
                "bid": 207.85,
                "ask": 210.1,
                "open": 218.2,
                "high": 248.8,
                "low": 190.75,
                "prev_close": 233.7,
                "volume": 332100,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            }
        },
        {
            "strike": 26200.0,
            "ce": {
                "symbol": "NIFTY30DEC2526200CE",
                "label": "ATM",
                "ltp": 427,
                "bid": 425.05,
                "ask": 427,
                "open": 449.95,
                "high": 503.5,
                "low": 384,
                "prev_close": 433.2,
                "volume": 2994000,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            },
            "pe": {
                "symbol": "NIFTY30DEC2526200PE",
                "label": "ATM",
                "ltp": 227.4,
                "bid": 227.35,
                "ask": 228.5,
                "open": 251.9,
                "high": 269.15,
                "low": 205.95,
                "prev_close": 251.9,
                "volume": 3745350,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            }
        },
        {
            "strike": 26250.0,
            "ce": {
                "symbol": "NIFTY30DEC2526250CE",
                "label": "OTM1",
                "ltp": 398,
                "bid": 395.4,
                "ask": 400.5,
                "open": 442.1,
                "high": 468.5,
                "low": 355.75,
                "prev_close": 401.9,
                "volume": 407100,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            },
            "pe": {
                "symbol": "NIFTY30DEC2526250PE",
                "label": "ITM1",
                "ltp": 243.85,
                "bid": 243.6,
                "ask": 246.15,
                "open": 264.25,
                "high": 288,
                "low": 222.15,
                "prev_close": 269.7,
                "volume": 487575,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            }
        },
        {
            "strike": 26300.0,
            "ce": {
                "symbol": "NIFTY30DEC2526300CE",
                "label": "OTM2",
                "ltp": 367.55,
                "bid": 364,
                "ask": 367.55,
                "open": 378,
                "high": 437.4,
                "low": 327.25,
                "prev_close": 371.45,
                "volume": 2416350,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            },
            "pe": {
                "symbol": "NIFTY30DEC2526300PE",
                "label": "ITM2",
                "ltp": 266,
                "bid": 264.2,
                "ask": 266.5,
                "open": 263.1,
                "high": 311.55,
                "low": 240,
                "prev_close": 289.85,
                "volume": 2891100,
                "oi": 0,
                "lotsize": 65,
                "tick_size": 0.05
            }
        }
    ]
}
```

Reading the ATM call premium from the chain:

```csharp
OAJson r = client.optionchain(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "30DEC25", strike_count: 10);
foreach (OAJson row in r["chain"])
    if (row.Str("ce.label") == "ATM")
        Print("ATM call " + row.Str("ce.symbol") + " ltp " + row.Num("ce.ltp"));
```

### OptionGreeks Example

Returns the Black-76 Greeks (delta, gamma, theta, vega, rho) and implied volatility of one option. `interest_rate` is the annual rate in percent; `forward_price` left at `null` is not sent.

```csharp
OAJson optiongreeks(string symbol, string exchange, double? interest_rate = null,
    double? forward_price = null, string underlying_symbol = null, string underlying_exchange = null,
    string expiry_time = null);
```

```csharp
OAJson r = client.optiongreeks(symbol: "NIFTY25NOV2526000CE", exchange: "NFO", interest_rate: 0.00,
                               underlying_symbol: "NIFTY", underlying_exchange: "NSE_INDEX");
Print(r.Pretty());
```

**OptionGreeks Response**

```json
{
  "days_to_expiry": 28.5071,
  "exchange": "NFO",
  "expiry_date": "25-Nov-2025",
  "greeks": {
    "delta": 0.4967,
    "gamma": 0.000352,
    "rho": 9.733994,
    "theta": -7.919,
    "vega": 28.9489
  },
  "implied_volatility": 15.6,
  "interest_rate": 0.0,
  "option_price": 435,
  "option_type": "CE",
  "spot_price": 25966.05,
  "status": "success",
  "strike": 26000.0,
  "symbol": "NIFTY25NOV2526000CE",
  "underlying": "NIFTY"
}
```

For up to 50 options in one request, see [MultiOptionGreeks](#multioptiongreeks-example).

### SyntheticFuture Example

Calculates the synthetic future price from the ATM call and put (strike + call premium - put premium). It is a calculation only; no order is placed.

```csharp
OAJson syntheticfuture(string underlying, string exchange, string expiry_date);
```

```csharp
OAJson r = client.syntheticfuture(underlying: "NIFTY", exchange: "NSE_INDEX", expiry_date: "25NOV25");
Print(r.Pretty());
```

**SyntheticFuture Response**

```json
{
  "atm_strike": 25900.0,
  "expiry": "25NOV25",
  "status": "success",
  "synthetic_future_price": 25980.05,
  "underlying": "NIFTY",
  "underlying_ltp": 25910.05
}
```

## Market Data

### Quotes Example

Returns the latest quote of one symbol: OHLC, LTP, bid, ask, previous close and volume.

```csharp
OAJson quotes(string symbol, string exchange);
```

```csharp
OAJson r = client.quotes(symbol: "RELIANCE", exchange: "NSE");
Print(r.Pretty());
Print("RELIANCE ltp " + r.Num("data.ltp"));
```

**Quotes Response**

```json
{
  "status": "success",
  "data": {
    "open": 1172.0,
    "high": 1196.6,
    "low": 1163.3,
    "ltp": 1187.75,
    "ask": 1188.0,
    "bid": 1187.85,
    "prev_close": 1165.7,
    "volume": 14414545
  }
}
```

### MultiQuotes Example

Returns quotes for several symbols in one request. Each entry carries `data`, or `error` for a symbol that failed.

```csharp
OAJson multiquotes(object symbols);
```

```csharp
OAJson r = client.multiquotes(symbols: new[] {
    new { symbol = "RELIANCE", exchange = "NSE" },
    new { symbol = "TCS", exchange = "NSE" },
    new { symbol = "INFY", exchange = "NSE" } });
Print(r.Pretty());
```

**MultiQuotes Response**

```json
{
  "status": "success",
  "results": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "data": {
        "open": 1542.3,
        "high": 1571.6,
        "low": 1540.5,
        "ltp": 1569.9,
        "prev_close": 1539.7,
        "ask": 1569.9,
        "bid": 0,
        "oi": 0,
        "volume": 14054299
      }
    },
    {
      "symbol": "TCS",
      "exchange": "NSE",
      "data": {
        "open": 3118.8,
        "high": 3178,
        "low": 3117,
        "ltp": 3162.9,
        "prev_close": 3119.2,
        "ask": 0,
        "bid": 3162.9,
        "oi": 0,
        "volume": 2508527
      }
    },
    {
      "symbol": "INFY",
      "exchange": "NSE",
      "data": {
        "open": 1532.1,
        "high": 1560.3,
        "low": 1532.1,
        "ltp": 1557.9,
        "prev_close": 1530.6,
        "ask": 0,
        "bid": 1557.9,
        "oi": 0,
        "volume": 7575038
      }
    }
  ]
}
```

### Depth Example

Returns the market depth (order book) of one symbol, with five levels of bids and asks.

```csharp
OAJson depth(string symbol, string exchange);
```

```csharp
OAJson r = client.depth(symbol: "SBIN", exchange: "NSE");
Print(r.Pretty());
Print("best bid " + r.Num("data.bids.0.price") + " best ask " + r.Num("data.asks.0.price"));
```

**Depth Response**

```json
{
  "status": "success",
  "data": {
    "open": 760.0,
    "high": 774.0,
    "low": 758.15,
    "ltp": 769.6,
    "ltq": 205,
    "prev_close": 746.9,
    "volume": 9362799,
    "oi": 161265750,
    "totalbuyqty": 591351,
    "totalsellqty": 835701,
    "asks": [
      {
        "price": 769.6,
        "quantity": 767
      },
      {
        "price": 769.65,
        "quantity": 115
      },
      {
        "price": 769.7,
        "quantity": 162
      },
      {
        "price": 769.75,
        "quantity": 1121
      },
      {
        "price": 769.8,
        "quantity": 430
      }
    ],
    "bids": [
      {
        "price": 769.4,
        "quantity": 886
      },
      {
        "price": 769.35,
        "quantity": 212
      },
      {
        "price": 769.3,
        "quantity": 351
      },
      {
        "price": 769.25,
        "quantity": 343
      },
      {
        "price": 769.2,
        "quantity": 399
      }
    ]
  }
}
```

### History Example

Returns historical OHLCV candles. `source` is `"api"` (the broker, default) or `"db"` (data stored by Historify). Python returns a DataFrame; C# returns the candles as a JSON array under `data`, sorted by time with duplicates dropped, as pandas does. `timestamp` is Unix epoch seconds (UTC).

```csharp
OAJson history(string symbol, string exchange, string interval, string start_date, string end_date,
    string source = "api");
```

Download Data Directly from Broker API

```csharp
OAJson r = client.history(symbol: "SBIN", exchange: "NSE", interval: "5m", start_date: "2025-04-01",
                          end_date: "2025-04-08", source: "api");
```

Download Data Directly from Historify DuckDB (Stored Data)

```csharp
OAJson r = client.history(symbol: "SBIN", exchange: "NSE", interval: "5m", start_date: "2025-04-01",
                          end_date: "2025-04-08", source: "db");
```

Walking the candles, with the time in IST:

```csharp
OAJson r = client.history(symbol: "SBIN", exchange: "NSE", interval: "5m", start_date: "2025-04-01",
                          end_date: "2025-04-08", source: "api");
foreach (OAJson bar in r["data"])
{
    DateTimeOffset ist = DateTimeOffset.FromUnixTimeSeconds(bar.Int("timestamp")).ToOffset(TimeSpan.FromHours(5.5));
    Print(ist.ToString("yyyy-MM-dd HH:mm") + "  O " + bar.Num("open") + "  H " + bar.Num("high") + "  L " + bar.Num("low")
          + "  C " + bar.Num("close") + "  V " + bar.Int("volume"));
}
```

**History Response** (the first candles; the full answer holds 437 rows)

```json
{
  "status": "success",
  "data": [
    {
      "timestamp": 1743480300,
      "open": 766.50,
      "high": 774.00,
      "low": 763.20,
      "close": 772.50,
      "volume": 318625,
      "oi": 0
    },
    {
      "timestamp": 1743480600,
      "open": 772.45,
      "high": 774.95,
      "low": 772.10,
      "close": 773.20,
      "volume": 197189,
      "oi": 0
    },
    {
      "timestamp": 1743480900,
      "open": 773.20,
      "high": 775.60,
      "low": 772.60,
      "close": 775.15,
      "volume": 227544,
      "oi": 0
    }
  ]
}
```

`1743480300` is 2025-04-01 09:15 IST, the same first candle as the Python DataFrame.

As in Python, a period without candles returns `{"status": "error", "message": "No data available for the specified period", "error_type": "no_data"}`.

### Intervals Example

Returns the history intervals your broker supports. `interval()` is a legacy alias that returns the same answer.

```csharp
OAJson intervals();
OAJson interval();
```

```csharp
OAJson r = client.intervals();
Print(r.Pretty());
```

**Intervals Response**

```json
{
  "status": "success",
  "data": {
    "months": [],
    "weeks": [],
    "days": ["D"],
    "hours": ["1h"],
    "minutes": ["10m", "15m", "1m", "30m", "3m", "5m"],
    "seconds": []
  }
}
```

### Symbol Example

Returns the details of one symbol: broker symbol, token, lot size, tick size, expiry and strike.

```csharp
OAJson symbol(string symbol, string exchange);
```

```csharp
OAJson r = client.symbol(symbol: "NIFTY30DEC25FUT", exchange: "NFO");
Print(r.Pretty());
```

**Symbol Response**

```json
{
  "data": {
    "brexchange": "NSE_FO",
    "brsymbol": "NIFTY FUT 30 DEC 25",
    "exchange": "NFO",
    "expiry": "30-DEC-25",
    "freeze_qty": 1800,
    "id": 57900,
    "instrumenttype": "FUT",
    "lotsize": 65,
    "name": "NIFTY",
    "strike": 0,
    "symbol": "NIFTY30DEC25FUT",
    "tick_size": 10,
    "token": "NSE_FO|49543"
  },
  "status": "success"
}
```

### Search Example

Searches the instrument master. `exchange` is an optional filter; `null` searches every exchange.

```csharp
OAJson search(string query, string exchange = null);
```

```csharp
OAJson r = client.search(query: "NIFTY 26000 DEC CE", exchange: "NFO");
Print(r.Pretty());
```

**Search Response**

```json
{
  "data": [
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 30 DEC 25",
      "exchange": "NFO",
      "expiry": "30-DEC-25",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY30DEC2526000CE",
      "tick_size": 5,
      "token": "NSE_FO|71399"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 29 DEC 26",
      "exchange": "NFO",
      "expiry": "29-DEC-26",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY29DEC2626000CE",
      "tick_size": 5,
      "token": "NSE_FO|71505"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 26 DEC 28",
      "exchange": "NFO",
      "expiry": "26-DEC-28",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY26DEC2826000CE",
      "tick_size": 5,
      "token": "NSE_FO|67786"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 28 DEC 27",
      "exchange": "NFO",
      "expiry": "28-DEC-27",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY28DEC2726000CE",
      "tick_size": 5,
      "token": "NSE_FO|53628"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "FINNIFTY 26000 CE 30 DEC 25",
      "exchange": "NFO",
      "expiry": "30-DEC-25",
      "freeze_qty": 1200,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "FINNIFTY",
      "strike": 26000,
      "symbol": "FINNIFTY30DEC2526000CE",
      "tick_size": 5,
      "token": "NSE_FO|61709"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 24 DEC 29",
      "exchange": "NFO",
      "expiry": "24-DEC-29",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY24DEC2926000CE",
      "tick_size": 5,
      "token": "NSE_FO|61778"
    },
    {
      "brexchange": "NSE_FO",
      "brsymbol": "NIFTY 26000 CE 23 DEC 25",
      "exchange": "NFO",
      "expiry": "23-DEC-25",
      "freeze_qty": 1800,
      "instrumenttype": "CE",
      "lotsize": 65,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY23DEC2526000CE",
      "tick_size": 5,
      "token": "NSE_FO|57005"
    }
  ],
  "message": "Found 7 matching symbols",
  "status": "success"
}
```

### Expiry Example

Returns the expiry dates of an underlying's futures or options. `instrumenttype` is `"futures"` or `"options"`, in lowercase.

```csharp
OAJson expiry(string symbol, string exchange, string instrumenttype);
```

```csharp
OAJson r = client.expiry(symbol: "NIFTY", exchange: "NFO", instrumenttype: "options");
Print(r.Pretty());
```

**Expiry Response**

```json
{
  "data": [
    "10-JUL-25",
    "17-JUL-25",
    "24-JUL-25",
    "31-JUL-25",
    "07-AUG-25",
    "28-AUG-25",
    "25-SEP-25",
    "24-DEC-25",
    "26-MAR-26",
    "25-JUN-26",
    "31-DEC-26",
    "24-JUN-27",
    "30-DEC-27",
    "29-JUN-28",
    "28-DEC-28",
    "28-JUN-29",
    "27-DEC-29",
    "25-JUN-30"
  ],
  "message": "Found 18 expiry dates for NIFTY options in NFO",
  "status": "success"
}
```

The dates come as `DD-MMM-YY`. The option calls want `DDMMMYY`, so remove the hyphens before passing the nearest expiry on:

```csharp
OAJson r = client.expiry(symbol: "NIFTY", exchange: "NFO", instrumenttype: "options");
string expiry_date = r.Str("data.0").Replace("-", "");   // "10-JUL-25" becomes "10JUL25"
```

### Instruments Example

Downloads the instrument master of one exchange. Pass an exchange whenever you can: `null` downloads nine exchanges one by one and merges them, as Python does, which is a large download. Python returns a DataFrame; C# returns the rows as a JSON array under `data`.

```csharp
OAJson instruments(string exchange = null);
```

```csharp
OAJson r = client.instruments(exchange: "NSE");
Print("instruments: " + r["data"].Count);
```

**Instruments Response** (row format from the [Instruments API](../../api-documentation/v1/data-api/instruments.md) page)

```json
{
  "status": "success",
  "message": "Found 1 instruments",
  "data": [
    {
      "symbol": "NIFTY30JUL2625000CE",
      "brsymbol": "NIFTY26JUL25000CE",
      "name": "NIFTY",
      "exchange": "NFO",
      "brexchange": "NFO",
      "token": "12345",
      "expiry": "30-JUL-26",
      "strike": 25000,
      "lotsize": 65,
      "instrumenttype": "CE",
      "tick_size": 0.05
    }
  ]
}
```

## Account

### Ping Example

Checks that the API key is valid and returns the broker OpenAlgo is logged in to.

```csharp
OAJson ping();
```

```csharp
OAJson r = client.ping();
Print(r.ToString());
```

**Ping Response**

```json
{
  "data": {
    "broker": "broker_name",
    "message": "pong"
  },
  "status": "success"
}
```

An unknown API key, or a broker session that was logged out, is answered by OpenAlgo with HTTP 403. The SDK returns it as the Python SDK does, with the server's text in the message and the status in `code`:

```json
{"status": "error", "message": "HTTP 403: {\"message\":\"Invalid openalgo apikey\",\"status\":\"error\"}\n", "code": 403, "error_type": "http_error"}
```

### Funds Example

Returns the funds and margin details of the trading account. The values are strings; `r.Num("data.availablecash")` reads them as numbers.

```csharp
OAJson funds();
```

```csharp
OAJson r = client.funds();
Print(r.Pretty());
```

**Funds Response**

```json
{
  "status": "success",
  "data": {
    "availablecash": "320.66",
    "collateral": "0.00",
    "m2mrealized": "3.27",
    "m2munrealized": "-7.88",
    "utiliseddebits": "679.34"
  }
}
```

### Margin Example

Returns the margin required for a basket of 1 to 50 positions. As in Python, an empty list or more than 50 positions is refused before anything is sent (`validation_error`).

```csharp
OAJson margin(object positions);
```

```csharp
OAJson r = client.margin(positions: new[] {
    new { symbol = "NIFTY25NOV2525000CE", exchange = "NFO", action = "BUY", product = "NRML",
          pricetype = "MARKET", quantity = "65" },
    new { symbol = "NIFTY25NOV2525500CE", exchange = "NFO", action = "SELL", product = "NRML",
          pricetype = "MARKET", quantity = "65" } });
Print(r.Pretty());
```

**Margin Response**

```json
{
    "status": "success",
    "data": {
      "total_margin_required": 91555.7625,
      "span_margin": 0.0,
      "exposure_margin": 91555.7625
    }
}
```

### Charges Example

Returns the brokerage and statutory charges for one order, before it is placed. Quantity is in units (one NIFTY lot of 65 is 65) and price is per unit: the premium for an option, the last traded price for a MARKET order. The figures are OpenAlgo's estimate under the brokerage plan saved on its `/sandbox/commissions` page; see the [Charges API](../../api-documentation/v1/accounts-api/charges.md).

```csharp
OAJson charges(string symbol, string exchange, string action, string product, double quantity, double price);
```

```csharp
OAJson r = client.charges(symbol: "RELIANCE", exchange: "NSE", action: "BUY", product: "CNC", quantity: 50, price: 1350);
Print(r.Pretty());
```

**Charges Response**

```json
{
  "status": "success",
  "data": {
    "symbol": "RELIANCE",
    "exchange": "NSE",
    "product": "CNC",
    "action": "BUY",
    "quantity": 50,
    "price": 1350.0,
    "segment": "Equity Delivery",
    "trade_value": 67500.0,
    "charges": {
      "total": 104.13,
      "brokerage": 20.0,
      "taxes": {
        "gst": 3.99,
        "stt": 68.0,
        "stamp_duty": 10.0
      },
      "other_charges": {
        "transaction": 2.0,
        "clearing": 0.0,
        "ipft": 0.07,
        "sebi_turnover": 0.07
      }
    }
  }
}
```

### OrderBook Example

Returns every order of the trading day, with statistics.

```csharp
OAJson orderbook();
```

```csharp
OAJson r = client.orderbook();
Print(r.Pretty());
```

**OrderBook Response**

```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "action": "BUY",
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "orderid": "250408000989443",
        "product": "MIS",
        "quantity": "1",
        "price": 1186.0,
        "pricetype": "MARKET",
        "order_status": "complete",
        "trigger_price": 0.0,
        "timestamp": "08-Apr-2025 13:58:03"
      },
      {
        "action": "BUY",
        "symbol": "YESBANK",
        "exchange": "NSE",
        "orderid": "250408001002736",
        "product": "MIS",
        "quantity": "1",
        "price": 16.5,
        "pricetype": "LIMIT",
        "order_status": "cancelled",
        "trigger_price": 0.0,
        "timestamp": "08-Apr-2025 14:13:45"
      }
    ],
    "statistics": {
      "total_buy_orders": 2.0,
      "total_sell_orders": 0.0,
      "total_completed_orders": 1.0,
      "total_open_orders": 0.0,
      "total_rejected_orders": 0.0
    }
  }
}
```

### TradeBook Example

Returns every executed trade (fill) of the trading day. One order can have several rows.

```csharp
OAJson tradebook();
```

```csharp
OAJson r = client.tradebook();
Print(r.Pretty());
```

**TradeBook Response**

```json
{
  "status": "success",
  "data": [
    {
      "action": "BUY",
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "orderid": "250408000989443",
      "product": "MIS",
      "quantity": 1.0,
      "average_price": 1180.1,
      "timestamp": "13:58:03",
      "trade_value": 1180.1
    },
    {
      "action": "SELL",
      "symbol": "NHPC",
      "exchange": "NSE",
      "orderid": "250408001086129",
      "product": "MIS",
      "quantity": 1.0,
      "average_price": 83.74,
      "timestamp": "14:28:49",
      "trade_value": 83.74
    }
  ]
}
```

### PositionBook Example

Returns every position of the day, closed ones included (quantity `"0"`). A row can carry `average_price_basis` when `average_price` is not an entry price; see [PositionBook](../../api-documentation/v1/accounts-api/positionbook.md).

```csharp
OAJson positionbook();
```

```csharp
OAJson r = client.positionbook();
Print(r.Pretty());
```

**PositionBook Response**

```json
{
  "status": "success",
  "data": [
    {
      "symbol": "NHPC",
      "exchange": "NSE",
      "product": "MIS",
      "quantity": "-1",
      "average_price": "83.74",
      "ltp": "83.72",
      "pnl": "0.02"
    },
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "product": "MIS",
      "quantity": "0",
      "average_price": "0.0",
      "ltp": "1189.9",
      "pnl": "5.90"
    },
    {
      "symbol": "YESBANK",
      "exchange": "NSE",
      "product": "MIS",
      "quantity": "-104",
      "average_price": "17.2",
      "ltp": "17.31",
      "pnl": "-10.44"
    }
  ]
}
```

### Holdings Example

Returns your delivery holdings with P\&L and portfolio statistics.

```csharp
OAJson holdings();
```

```csharp
OAJson r = client.holdings();
Print(r.Pretty());
```

**Holdings Response**

```json
{
  "status": "success",
  "data": {
    "holdings": [
      {
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "product": "CNC",
        "quantity": 1,
        "pnl": -149.0,
        "pnlpercent": -11.1
      },
      {
        "symbol": "TATASTEEL",
        "exchange": "NSE",
        "product": "CNC",
        "quantity": 1,
        "pnl": -15.0,
        "pnlpercent": -10.41
      },
      {
        "symbol": "CANBK",
        "exchange": "NSE",
        "product": "CNC",
        "quantity": 5,
        "pnl": -69.0,
        "pnlpercent": -13.43
      }
    ],
    "statistics": {
      "totalholdingvalue": 1768.0,
      "totalinvvalue": 2001.0,
      "totalprofitandloss": -233.15,
      "totalpnlpercentage": -11.65
    }
  }
}
```

### Analyzer Status Example

Tells you whether OpenAlgo is in analyzer mode (sandbox), where orders are simulated.

```csharp
OAJson analyzerstatus();
```

```csharp
OAJson r = client.analyzerstatus();
Print(r.ToString());
if (!r.Bool("data.analyze_mode"))
    Print("LIVE mode: orders go to the broker");
```

**Analyzer Status Response**

```json
{"data": {"analyze_mode": true, "mode": "analyze", "total_logs": 2}, "status": "success"}
```

### Analyzer Toggle Example

Switches analyzer mode (sandbox) on (`true`, simulated orders) or off (`false`, live orders).

```csharp
OAJson analyzertoggle(bool mode);
```

```csharp
// Switch to analyze mode (simulated responses)
OAJson r = client.analyzertoggle(mode: true);
Print(r.Pretty());
```

**Analyzer Toggle Response**

```json
{
  "data": {
    "analyze_mode": true,
    "message": "Analyzer mode switched to analyze",
    "mode": "analyze",
    "total_logs": 2
  },
  "status": "success"
}
```

## Utilities

### Holidays Example

Returns the market holidays of a year, with every exchange's status. Leave `year` at `null` for the current year. Times are epoch milliseconds.

```csharp
OAJson holidays(int? year = null);
```

```csharp
OAJson r = client.holidays(year: 2026);
Print(r.Pretty());
```

**Holidays Response** (from the [Holidays API](../../api-documentation/v1/utilities-api/holidays.md) page)

```json
{
  "status": "success",
  "year": 2026,
  "timezone": "Asia/Kolkata",
  "data": [
    {
      "date": "2026-01-26",
      "description": "Republic Day",
      "holiday_type": "TRADING_HOLIDAY",
      "closed_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "BCD", "MCX"],
      "open_exchanges": []
    },
    {
      "date": "2026-02-19",
      "description": "Chhatrapati Shivaji Maharaj Jayanti",
      "holiday_type": "SETTLEMENT_HOLIDAY",
      "closed_exchanges": [],
      "open_exchanges": []
    },
    {
      "date": "2026-03-10",
      "description": "Holi",
      "holiday_type": "TRADING_HOLIDAY",
      "closed_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "BCD"],
      "open_exchanges": [
        {
          "exchange": "MCX",
          "start_time": 1741624200000,
          "end_time": 1741677900000
        }
      ]
    },
    {
      "date": "2026-08-15",
      "description": "Independence Day",
      "holiday_type": "TRADING_HOLIDAY",
      "closed_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "BCD", "MCX"],
      "open_exchanges": []
    }
  ]
}
```

### Timings Example

Returns the market timings of every exchange for one date (`YYYY-MM-DD`). `null` sends today's date. Times are epoch milliseconds; a full holiday returns an empty `data`.

```csharp
OAJson timings(string date = null);
```

```csharp
OAJson r = client.timings(date: "2025-12-19");
Print(r.Pretty());
```

**Timings Response** (from the [Timings API](../../api-documentation/v1/utilities-api/timings.md) page)

```json
{
  "status": "success",
  "data": [
    {
      "exchange": "NSE",
      "start_time": 1766115900000,
      "end_time": 1766138400000
    },
    {
      "exchange": "BSE",
      "start_time": 1766115900000,
      "end_time": 1766138400000
    },
    {
      "exchange": "NFO",
      "start_time": 1766115900000,
      "end_time": 1766139000000
    },
    {
      "exchange": "BFO",
      "start_time": 1766115900000,
      "end_time": 1766139000000
    },
    {
      "exchange": "MCX",
      "start_time": 1766115000000,
      "end_time": 1766168700000
    },
    {
      "exchange": "BCD",
      "start_time": 1766115000000,
      "end_time": 1766143800000
    },
    {
      "exchange": "CDS",
      "start_time": 1766115000000,
      "end_time": 1766143800000
    },
    {
      "exchange": "NCO",
      "start_time": 1766115000000,
      "end_time": 1766168700000
    },
    {
      "exchange": "CRYPTO",
      "start_time": 1766082600000,
      "end_time": 1766168999000
    }
  ]
}
```

## Alerts

### Telegram Alert Example

Sends a message to an OpenAlgo user linked to the Telegram bot. `username` is the OpenAlgo login name, not the Telegram handle. The bot must be running. With `wait_for_delivery` left at `null` the message is queued and the reply reads `Notification queued for delivery`; with `true` OpenAlgo tries to deliver it first, and the reply reads `Notification sent successfully` when that works, as in the response below.

```csharp
OAJson telegram(string username, string message, int priority = 5, bool? wait_for_delivery = null);
```

```csharp
OAJson r = client.telegram(username: "<openalgo_loginid>", message: "NIFTY crossed 26000!");
Print(r.ToString());
```

**Telegram Alert Response**

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

### WhatsApp Alert Example

Sends a WhatsApp message through the device paired on OpenAlgo's `/whatsapp` page: text, image, document, to yourself, to one number or to up to 5 numbers. Image and document paths are read from the OpenAlgo server's disk and must lie under `WHATSAPP_ATTACHMENT_ROOTS`. `to` takes one number as a string, or an array of up to 5 numbers for a small broadcast.

```csharp
OAJson whatsapp(string message = null, object to = null, string username = null, string image = null,
    string document = null, string caption = null, string filename = null, bool wait_for_delivery = true);
```

**Send to yourself (simplest case)**

```csharp
OAJson r = client.whatsapp("NIFTY crossed 26000!");
Print(r.Pretty());
```

**WhatsApp Alert Response** (`wait_for_delivery` true, the default)

```json
{
  "status": "success",
  "message": "Delivered to 1, failed 0",
  "data": {
    "sent":    ["<self>"],
    "failed":  [],
    "skipped": 0
  }
}
```

With `wait_for_delivery: false` the reply is `{"status": "success", "message": "Queued for 1 recipient(s)", "queued": 1}`.

**Send to a single phone number**

```csharp
OAJson r = client.whatsapp("Order placed: BUY RELIANCE x 10 @ MARKET", to: "919876543210");
```

**Small broadcast (up to 5 recipients)**

```csharp
OAJson r = client.whatsapp("Server maintenance starting in 10 minutes",
                           to: new[] { "919876543210", "919812345678", "919900112233" });
```

**Send an image with caption**

```csharp
OAJson r = client.whatsapp(to: "919876543210", image: "/srv/charts/nifty_eod.png", caption: "NIFTY end-of-day chart");
```

**Send a document (PDF, CSV, ...)**

```csharp
OAJson r = client.whatsapp("Daily P&L report attached.", to: "919876543210", document: "/srv/reports/2026-05-17.pdf",
                           filename: "DailyPnL.pdf");
```

**Fire-and-forget (skip the delivery report)**

```csharp
OAJson r = client.whatsapp("Stop-loss hit on BANKNIFTY!", wait_for_delivery: false);
```

**Send to a linked OpenAlgo user**

```csharp
OAJson r = client.whatsapp("Position update: BANKNIFTY 48000 CE now at +21% P&L.", username: "alice");
```

### Discord Alert Example

Posts to the Discord channel webhook saved on OpenAlgo's `/discord` page, while Discord is switched on at `/alerts`. At most 2000 characters. The message is queued by default; `wait_for_delivery: true` posts it first and reports whether Discord accepted it. 30 requests per minute.

```csharp
OAJson discord(string message, bool wait_for_delivery = false);
```

```csharp
OAJson r = client.discord("**NIFTY** crossed 26000!");
Print(r.ToString());
```

**Discord Alert Response**

```json
{
  "status": "success",
  "message": "Notification queued."
}
```

A refusal comes back with the server's message and the HTTP status in `code`:

```json
{
  "status": "error",
  "message": "Discord alerts are turned off. Turn them on from the Alerts page in OpenAlgo.",
  "code": 409
}
```

### Slack Alert Example

Posts to the Slack incoming webhook saved on OpenAlgo's `/slack` page, while Slack is switched on at `/alerts`. At most 4000 characters; the server escapes `&`, `<` and `>`, so send the message as written. Queued by default, or posted first with `wait_for_delivery: true`. 30 requests per minute.

```csharp
OAJson slack(string message, bool wait_for_delivery = false);
```

```csharp
OAJson r = client.slack("*NIFTY* crossed 26000!", wait_for_delivery: true);
Print(r.ToString());
```

**Slack Alert Response**

```json
{
  "status": "success",
  "message": "Message sent to Slack."
}
```

## Strategy Module

OpenAlgo's `/strategy` module runs multi-leg options strategies with end-to-end risk management, plus a signal-driven mode for chart and scanner alerts. Two surfaces reach it, and they take different credentials:

| Surface | Credential | Use for |
| --- | --- | --- |
| `client.strategy...` methods | Your OpenAlgo API key | Lifecycle and reads: list, status, start, stop, close_all, close_leg, runs, orders, events |
| `OAStrategy` class | The strategy's `oaws_` webhook token | The public webhook at `/strategy/webhook/<token>`, which is what alert senders post to |

Building a strategy stays in the browser wizard at `/strategy`. Nothing on the API key surface can create a strategy, edit its configuration, enable live trading, rotate a webhook token or delete anything.

Four rules worth knowing before you call anything:

1. **`mode` on start is required and is never defaulted**, in the SDK or on the server.
2. **Live is opt-in per strategy.** A strategy is created sandbox-only, and `mode: "live"` is refused with a 409 until the operator enables live trading on the strategy page.
3. **An accepted stop is not proof of flatness.** Read `stop_pending` and the per-leg outcomes; never infer flatness from the HTTP status.
4. **A strategy that is not yours answers 404**, identical to one that does not exist.

The strategy and leg ids are `long` values. The accepted words are available as `api.RUN_MODES` (`live`, `sandbox`), `api.STRATEGY_STATUSES` and `api.EVENT_SEVERITIES`. A refusal comes back as OpenAlgo's own JSON answer with the HTTP status in `code`. See [Strategy RMS Engine](../../strategy-management.md) for the module itself.

### StrategyList Example

Lists the strategies this API key owns, newest first. `status` filters by `"stopped"`, `"running"`, `"paused"` or `"errored"`; `q` filters by part of the name.

```csharp
OAJson strategylist(string status = null, string q = null);
```

```csharp
OAJson r = client.strategylist();
Print(r.Pretty());

// Optional filters. An out-of-vocabulary status is a 400, not an empty list.
r = client.strategylist(status: "running");
r = client.strategylist(q: "NIFTY");
```

**StrategyList Response**

```json
{
  "status": "success",
  "data": [
    {
      "id": 7,
      "name": "NIFTY Short Straddle",
      "strategy_kind": "batch",
      "direction": "both",
      "underlying": "NIFTY",
      "underlying_exchange": "NSE_INDEX",
      "strategy_type": "intraday",
      "entry_time": "09:20",
      "exit_time": "15:10",
      "product": "NRML",
      "pricetype": "MARKET",
      "overall_sl_mtm": -5000.0,
      "overall_target_mtm": 8000.0,
      "live_enabled": false,
      "status": "running",
      "current_run_id": 42,
      "last_finalized_run": {"id": 41, "pnl_realized": 1250.0, "stopped_at": "2026-08-29T09:40:11.482913+00:00"}
    }
  ]
}
```

The list omits `legs`; call `strategystatus` for one strategy's legs.

### StrategyStatus Example

Returns one strategy's configuration, legs and current run. `run` is `null` when the strategy has no current run.

```csharp
OAJson strategystatus(long strategy_id);
```

```csharp
OAJson r = client.strategystatus(strategy_id: 7);
Print(r.Pretty());
```

**StrategyStatus Response**

```json
{
  "status": "success",
  "data": {
    "id": 7,
    "name": "NIFTY Short Straddle",
    "status": "running",
    "current_run_id": 42,
    "legs": [
      {"id": 1, "segment": "options", "position": "S", "lots": 1, "option_type": "CE",
       "strike_mode": "atm", "atm_offset": "ATM", "expiry": "weekly",
       "sl_pts": 30, "target_pts": 60, "trail": {"x": 10, "y": 5}}
    ]
  },
  "run": {
    "id": 42,
    "mode": "sandbox",
    "broker": "sandbox",
    "started_at": "2026-08-30T03:50:11.402118+00:00",
    "stopped_at": null,
    "stop_reason": null,
    "stop_requested_at": null,
    "stop_requested_reason": null,
    "pnl_realized": 0.0,
    "pnl_peak": 0.0,
    "pnl_trough": 0.0,
    "trigger_source": "manual",
    "resolved_expiries": {"1": "04-SEP-26", "2": "04-SEP-26"}
  }
}
```

### StrategyStart Example

Starts a **batch** strategy: every leg's entry order is placed. `mode` is `"live"` or `"sandbox"`, exactly as written.

```csharp
OAJson strategystart(long strategy_id, string mode);
```

```csharp
OAJson r = client.strategystart(strategy_id: 7, mode: "sandbox");
Print(r.Pretty());

// Partial success is a 200. Check each leg rather than assuming they all reached the market.
foreach (OAJson leg in r["legs"])
    if (!leg.Bool("ok"))
        Print("leg " + leg.Int("leg_id") + " rejected: " + leg.Str("error"));
```

**StrategyStart Response**

```json
{
  "status": "success",
  "run_id": 42,
  "mode": "sandbox",
  "legs": [
    {"leg_id": 1, "ok": true, "acknowledged": true,
     "symbol": "NIFTY04SEP2624500CE", "broker_order_id": "26083004118201", "error": null},
    {"leg_id": 2, "ok": true, "acknowledged": true,
     "symbol": "NIFTY04SEP2624500PE", "broker_order_id": "26083004118244", "error": null}
  ]
}
```

A second start against a running strategy answers 409, so two triggers firing at once cannot both place a full set of entries.

### StrategyStop Example

Stops the current run, exiting every owned position at market.

```csharp
OAJson strategystop(long strategy_id);
```

```csharp
OAJson r = client.strategystop(strategy_id: 7);
Print(r.Pretty());
```

**StrategyStop Response**

```json
{
  "status": "success",
  "run_id": 42,
  "stop_pending": true,
  "exits": [
    {"leg_id": 1, "ok": true, "position_ref": "969bc536b1c14d15992f730c2c136d7a",
     "exit_owner": "live", "error": null}
  ]
}
```

`stop_pending: true` means the request is durable and its exits were accepted, but the run stays open and managed until fills prove every position is flat. A 409 can also carry `stop_pending: true`; retry the stop in that case.

### StrategyCloseAll Example

Same stop mechanics as `strategystop`, with a different audit trail: a `close_all_manual` event is written first, which records that an operator asked for a flatten.

```csharp
OAJson strategycloseall(long strategy_id);
```

```csharp
OAJson r = client.strategycloseall(strategy_id: 7);
Print(r.Pretty());
```

**StrategyCloseAll Response** (from the [Close All API](../../api-documentation/v1/strategy-rms-api/close-all.md) page)

```json
{
  "status": "success",
  "run_id": 42,
  "stop_pending": true,
  "exits": [
    {
      "leg_id": 1,
      "ok": true,
      "position_ref": "969bc536b1c14d15992f730c2c136d7a",
      "exit_owner": "live",
      "error": null
    }
  ]
}
```

### StrategyCloseLeg Example

Exits one leg at market; the run continues with the other legs. `leg_id` is the leg's id within the strategy (`data.legs[].id` from `strategystatus`), not an order id.

```csharp
OAJson strategycloseleg(long strategy_id, long leg_id);
```

```csharp
OAJson r = client.strategycloseleg(strategy_id: 7, leg_id: 2);
Print(r.Pretty());
```

**StrategyCloseLeg Response**

```json
{
  "status": "success",
  "run_id": 42,
  "leg_id": 2,
  "run_stopped": false,
  "exits": [
    {"leg_id": 2, "ok": true, "position_ref": "80bb5fc9333f4922a582229f06a0fe45",
     "exit_owner": "live", "error": null}
  ]
}
```

A `leg_id` that names no open leg is a 409, not a 404.

### StrategyRuns Example

Returns every activation of a strategy, newest first. `limit` is 1 to 500; `null` leaves it to the server default.

```csharp
OAJson strategyruns(long strategy_id, int? limit = null);
```

```csharp
OAJson r = client.strategyruns(strategy_id: 7, limit: 10);
Print(r.Pretty());
```

**StrategyRuns Response**

```json
{
  "status": "success",
  "data": [
    {
      "id": 42,
      "strategy_id": 7,
      "mode": "sandbox",
      "broker": "sandbox",
      "started_at": "2026-08-30T03:50:11.402118+00:00",
      "stopped_at": "2026-08-30T09:40:02.771905+00:00",
      "stop_reason": "eod",
      "pnl_realized": 3140.5,
      "pnl_peak": 4880.0,
      "pnl_trough": -1220.25,
      "trigger_source": "manual",
      "resolved_expiries": {"1": "04-SEP-26", "2": "04-SEP-26"}
    }
  ]
}
```

### StrategyOrders Example

Returns every order the engine placed, oldest first, so an entry always precedes its exit. `run_id` narrows the list to one run; `null` means all runs.

```csharp
OAJson strategyorders(long strategy_id, long? run_id = null);
```

```csharp
OAJson r = client.strategyorders(strategy_id: 7);

// Narrow a long history to one run.
r = client.strategyorders(strategy_id: 7, run_id: 42);
Print(r.Pretty());
```

**StrategyOrders Response**

```json
{
  "status": "success",
  "data": [
    {
      "id": 318,
      "run_id": 42,
      "leg_id": 1,
      "kind": "entry",
      "position_ref": "969bc536b1c14d15992f730c2c136d7a",
      "broker_order_id": "26083004118201",
      "symbol": "NIFTY04SEP2624500CE",
      "exchange": "NFO",
      "action": "SELL",
      "qty": 65,
      "product": "NRML",
      "pricetype": "MARKET",
      "price": 0.0,
      "status": "complete",
      "placed_at": "2026-08-30T03:50:11.610224+00:00",
      "filled_at": "2026-08-30T03:50:12.004881+00:00",
      "avg_fill_price": 142.35,
      "filled_qty": 65,
      "reject_reason": null
    }
  ]
}
```

A row is written **before** the broker answers, so an order can appear with `status: "pending"` and a null `broker_order_id`.

### StrategyEvents Example

Returns the risk-event audit trail, newest first. Filters: `run_id`, `kind`, `severity` (`"info"`, `"warn"` or `"critical"`) and `limit` (1 to 1000); each one left at `null` is not sent.

```csharp
OAJson strategyevents(long strategy_id, long? run_id = null, string kind = null,
    string severity = null, int? limit = null);
```

```csharp
OAJson r = client.strategyevents(strategy_id: 7, limit: 100);

// Filters. An out-of-vocabulary kind or severity is a 400, not an empty list.
r = client.strategyevents(strategy_id: 7, run_id: 42);
r = client.strategyevents(strategy_id: 7, severity: "critical");
r = client.strategyevents(strategy_id: 7, kind: "run_stop_failed");
```

**StrategyEvents Response**

```json
{
  "status": "success",
  "data": [
    {
      "id": 2041,
      "run_id": 42,
      "strategy_id": 7,
      "ts": "2026-08-30T06:21:40.104112+00:00",
      "kind": "leg_sl_hit",
      "severity": "warn",
      "leg_id": 1,
      "message": "stop loss hit: last price 172.8 is at or above the stop 172.35 on a short position",
      "payload": null
    }
  ]
}
```

Events an operator should not ignore:

| Kind | Severity | Meaning |
| --- | --- | --- |
| `run_stop_requested` | info | The stop is durable and new signal entries are gated. Not proof the broker is flat |
| `run_stop_failed` | critical | The broker refused a stop's exits and the run is **still holding** those positions |
| `order_ack_unrecorded` | critical | The broker accepted an order but its acknowledgement could not be written; it reconciles itself |
| `leg_expiry_fallback` | warn | The chain did not list the expiry rank the leg asked for, so a nearer one was used |
| `flip_outgoing_exit_rejected` | critical | The outgoing side of a signal flip is still held |

## Strategy Webhook

The public webhook at `/strategy/webhook/<token>` is what charting and scanner alert senders post to. It is not under `/api/v1` and takes no API key: the `oaws_` token in the URL is the whole credential, so treat it like a password. `OAStrategy` is the NinjaScript version of the Python `Strategy` class; it is called `OAStrategy` because `Strategy` is NinjaTrader's own strategy base class.

Every documented outcome is returned, not raised: read `result` (`ok`, `rejected_dedupe`, `rejected_cooling_off`, `rejected_live_disabled` and so on). See [Strategy RMS From Python](../python/strategy-management.md) for the full webhook guide and the [Webhook API](../../api-documentation/v1/strategy-rms-api/webhook.md) for every result code.

### OAStrategy Constructor

`webhook_token` is the strategy's `oaws_` token. `webhook_id` is an older name for the same value; when both are given, `webhook_token` wins. The first four parameters are Python's; `owner`, `allow_historical`, `allow_playback`, `verbose` and `log` work as on the `api` client, with the same safety guard. The constructor throws an `ArgumentException` when no token is given, as Python raises a `ValueError`.

```csharp
OAStrategy(string host_url, string webhook_id = null, string webhook_token = null, double timeout = 30.0,
    object owner = null, bool allow_historical = false, bool allow_playback = false, int verbose = 0,
    Action<string> log = null);
```

```csharp
OAStrategy strategy = new OAStrategy(host_url: "http://127.0.0.1:5000", webhook_token: "oaws_your_webhook_token_here",
                                     owner: this);
Print(strategy.start(mode: "sandbox").ToString());
```

The examples below use this `strategy` object.

In a NinjaScript, create the object in `State.Realtime` and close it in `State.Terminated`, like the `api` client. Check that the token input is filled in first, because the constructor throws without one:

```csharp
private OAStrategy hook;

protected override void OnStateChange()
{
    if (State == State.SetDefaults)
    {
        Name = "MyWebhookStrategy";
        WebhookToken = "";
    }
    else if (State == State.Realtime && !string.IsNullOrEmpty(WebhookToken))
    {
        hook = new OAStrategy(host_url: "http://127.0.0.1:5000", webhook_token: WebhookToken, owner: this);
    }
    else if (State == State.Terminated && hook != null)
    {
        hook.close();
        hook = null;
    }
}

[PasswordPropertyText(true)]
[Display(Name = "Webhook token", GroupName = "OpenAlgo", Order = 1)]
public string WebhookToken { get; set; }
```

### Start and Stop Example

`start` starts a **batch** strategy, entering every leg. `mode` (`"live"` or `"sandbox"`) is required. `stop` exits every owned position at market.

```csharp
OAJson start(string mode);
OAJson stop();
```

```csharp
OAJson r = strategy.start(mode: "sandbox");   // batch: mode is required, never defaulted
Print(r.ToString());
r = strategy.stop();
Print(r.ToString());
```

**Start Response**

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy start accepted",
  "strategy_id": 7,
  "run_id": 42
}
```

**Stop Response**

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy stop accepted",
  "strategy_id": 7,
  "run_id": 42,
  "stop_pending": true,
  "exits": [
    {
      "leg_id": 1,
      "ok": true,
      "position_ref": "969bc536b1c14d15992f730c2c136d7a",
      "exit_owner": "live",
      "error": null
    }
  ]
}
```

Two identical starts within 60 seconds count as one signal (`rejected_dedupe`, still a success); a start within 30 seconds of a stop answers 409 `rejected_cooling_off`.

### Signal Example

For a **signal** strategy, one alert moves one leg. Name the leg by its id, or by symbol and exchange. `long_entry`, `long_exit`, `short_entry` and `short_exit` are shortcuts for `signal` with that action.

```csharp
OAJson signal(string action, long? leg_id = null, string symbol = null, string exchange = null);
OAJson long_entry(long? leg_id = null, string symbol = null, string exchange = null);
OAJson long_exit(long? leg_id = null, string symbol = null, string exchange = null);
OAJson short_entry(long? leg_id = null, string symbol = null, string exchange = null);
OAJson short_exit(long? leg_id = null, string symbol = null, string exchange = null);
```

```csharp
OAJson r = strategy.long_entry(leg_id: 1);                       // signal: one alert moves one leg
r = strategy.short_exit(symbol: "RELIANCE", exchange: "NSE");    // the leg named by symbol and exchange
r = strategy.signal(action: "long_exit", leg_id: 1);             // the same as strategy.long_exit(leg_id: 1)
```

**Signal Response** (the API documentation shows no signal response; this is the shape the server returns)

```json
{
  "status": "success",
  "result": "ok",
  "message": "Signal accepted",
  "strategy_id": 7,
  "run_id": 42
}
```

A signal that changes nothing is still a success with a note, for example `Signal accepted (already_long)`.

### Send Example

Posts any JSON payload to the webhook, for actions the shortcuts do not cover.

```csharp
OAJson send(object payload);
```

```csharp
OAJson r = strategy.send(payload: new { action = "start", mode = "sandbox" });
Print(r.ToString());
```

The response is the same as for `start`.

### Webhook URL, Responses and Close

```csharp
OAJson response();
int last_status();
string last_raw();
void enqueue(Func<OAStrategy, OAJson> call, Action<OAJson> on_done = null);
Task<OAJson> run_async(Func<OAStrategy, OAJson> call);
void close();
```

* `strategy.webhook_url` is `<host>/strategy/webhook/<token>`. It contains the token, so never print it to a shared log. `strategy.ToString()` shows `<redacted>` in place of the token.
* `response()`, `last_status()` and `last_raw()` return the last response, its HTTP status (`-1` when the request never reached the server) and the raw text, as on the `api` client.
* `enqueue` and `run_async` queue calls on the object's own background thread, in order, as on the `api` client: `strategy.enqueue(s => s.long_entry(leg_id: 1), r => Print(r.ToString()));`.
* `close()` releases the object; later calls return `error_type` `unknown_error` and are never sent.

### StrategyOrder (removed)

The webhook that `strategyorder` posted to no longer exists. The method is marked obsolete as an error, so code that calls it does not compile. Use `start()` and `stop()` for a batch strategy, or the signal shortcuts for a signal strategy.

```csharp
OAJson strategyorder(string symbol, string action, double? position_size = null);
```

## API-only Endpoints

These OpenAlgo endpoints have no Python SDK method. The NinjaScript SDK covers them too, with method names taken from the endpoint path, the same set as the MQL5 SDK.

### Ticker Example

Returns broker history in a ticker-compatible shape, as JSON or plain text. `symbol` is `EXCHANGE:SYMBOL` with exactly one colon; anything else returns a `validation_error` without sending. `interval` left at `null` gives daily candles. `format: "txt"` returns the text rows as `{"status": "success", "data": "<text>"}`.

```csharp
OAJson ticker(string symbol, string from, string to, string interval = null, string format = "json");
```

```csharp
OAJson r = client.ticker(symbol: "NSE:RELIANCE", interval: "D", from: "2026-07-01", to: "2026-07-10");
Print(r.Pretty());

r = client.ticker(symbol: "NSE:RELIANCE", interval: "D", from: "2026-07-01", to: "2026-07-10", format: "txt");
Print(r.Str("data"));
```

**Ticker Response** (from the [Ticker API](../../api-documentation/v1/data-api/ticker.md) page)

```json
{
  "status": "success",
  "data": [
    {
      "timestamp": 1783296000,
      "open": 1510.5,
      "high": 1532.0,
      "low": 1504.1,
      "close": 1528.4,
      "volume": 6234100
    }
  ]
}
```

### PnL Symbols Example

Returns today's realized and unrealized P\&L of open sandbox positions, by symbol. Analyzer mode (sandbox) only: in live mode OpenAlgo answers HTTP 400.

```csharp
OAJson pnlsymbols();
```

```csharp
OAJson r = client.pnlsymbols();
Print(r.Pretty());
```

**PnL Symbols Response** (from the [P\&L by Symbol API](../../api-documentation/v1/accounts-api/pnl-symbols.md) page)

```json
{
  "status": "success",
  "data": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "product": "MIS",
      "quantity": 10,
      "pnl": 125.5,
      "unrealized_pnl": 100.0,
      "today_realized_pnl": 25.5,
      "total_pnl_today": 125.5
    }
  ],
  "total_pnl": 125.5,
  "total_unrealized_pnl": 100.0,
  "total_today_realized_pnl": 25.5,
  "total_pnl_today": 125.5,
  "mode": "analyze"
}
```

### Chart Preferences Example

Reads or updates the stored chart (TradingView workspace) preferences of your API key. Without an argument `chart()` reads; with an object it updates. An update is partial: only the keys you send are written.

```csharp
OAJson chart(object preferences = null);
```

```csharp
OAJson r = client.chart();
Print(r.Pretty());

r = client.chart(preferences: new { tv_theme = "dark", tv_chart_layout = new { interval = "15m" } });
Print(r.ToString());
```

**Chart Read Response** (from the [Chart Preferences API](../../api-documentation/v1/accounts-api/chart-preferences.md) page)

```json
{
  "status": "success",
  "data": {
    "tv_theme": "dark",
    "tv_chart_layout": {"interval": "15m"}
  }
}
```

**Chart Update Response**

```json
{
  "status": "success",
  "message": "Preferences updated successfully"
}
```

### MultiOptionGreeks Example

Returns Greeks and implied volatility for 1 to 50 options in one request. The top-level `status` is `success`, `partial` or `error`, all with HTTP 200, so read `summary` and each item's `status`.

```csharp
OAJson multioptiongreeks(object symbols, double? interest_rate = null, string expiry_time = null);
```

```csharp
OAJson r = client.multioptiongreeks(symbols: new[] {
    new { symbol = "NIFTY30JUL2625000CE", exchange = "NFO" },
    new { symbol = "NIFTY30JUL2625000PE", exchange = "NFO" } }, interest_rate: 7.0, expiry_time: "15:30");
Print(r.Pretty());
```

**MultiOptionGreeks Response** (from the [Multi Option Greeks API](../../api-documentation/v1/data-api/multioptiongreeks.md) page)

```json
{
  "status": "success",
  "data": [
    {
      "status": "success",
      "symbol": "NIFTY30JUL2625000CE",
      "exchange": "NFO",
      "underlying": "NIFTY",
      "strike": 25000.0,
      "option_type": "CE",
      "expiry_date": "30-Jul-2026",
      "days_to_expiry": 28.5071,
      "spot_price": 25966.05,
      "option_price": 435,
      "interest_rate": 7.0,
      "implied_volatility": 15.25,
      "greeks": {
        "delta": 0.52,
        "gamma": 0.0001,
        "theta": -4.97,
        "vega": 30.76,
        "rho": 0.001
      }
    },
    {
      "status": "success",
      "symbol": "NIFTY30JUL2625000PE",
      "exchange": "NFO",
      "underlying": "NIFTY",
      "strike": 25000.0,
      "option_type": "PE",
      "expiry_date": "30-Jul-2026",
      "days_to_expiry": 28.5071,
      "spot_price": 25966.05,
      "option_price": 128.4,
      "interest_rate": 7.0,
      "implied_volatility": 14.9,
      "greeks": {
        "delta": -0.48,
        "gamma": 0.0001,
        "theta": -4.12,
        "vega": 30.41,
        "rho": -0.001
      }
    }
  ],
  "summary": {"total": 2, "success": 2, "failed": 0}
}
```

### Telegram Bot Management Example

Manage the OpenAlgo Telegram bot from NinjaScript: read or change its configuration, start and stop it, list linked users, broadcast, read statistics and manage a user's notification preferences. `telegramconfig` and `telegrampreferences` read without their object argument and update with it. The [Telegram REST API](../../api-documentation/v1/utilities-api/telegram.md) page lists these routes; it shows no example responses, so the responses below are the shapes the server returns.

```csharp
OAJson telegramconfig(object config = null);
OAJson telegramstart();
OAJson telegramstop();
OAJson telegramusers(string broker = null, bool? notifications_enabled = null);
OAJson telegrambroadcast(string message);
OAJson telegramstats(int days = 7);
OAJson telegrampreferences(long telegram_id, object preferences = null);
```

```csharp
// Read the bot configuration. The reply carries the bot token: never print it to a shared log.
OAJson r = client.telegramconfig();

// Change the configuration: token, webhook_url, polling_mode, broadcast_enabled, rate_limit_per_minute
r = client.telegramconfig(config: new { polling_mode = true });   // {"status":"success","message":"Bot configuration updated"}

r = client.telegramstart();                 // {"status":"success","message":"<message from the bot service>"}
r = client.telegramstop();                  // telegram() is refused with HTTP 409 while the bot is stopped

r = client.telegramusers();                 // every linked user
r = client.telegramusers(broker: "broker_name", notifications_enabled: true);

r = client.telegrambroadcast(message: "Market opens in 5 minutes");
r = client.telegramstats(days: 7);

r = client.telegrampreferences(telegram_id: 123456789);
r = client.telegrampreferences(telegram_id: 123456789, preferences: new { daily_summary = false });
// {"status":"success","message":"Preferences updated successfully"}
```

**TelegramUsers Response**

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "telegram_id": 123456789,
      "openalgo_username": "openalgo-user",
      "first_name": "...",
      "last_name": "...",
      "telegram_username": "...",
      "broker": "broker_name",
      "notifications_enabled": true,
      "created_at": "...",
      "last_command_at": "..."
    }
  ],
  "count": 1
}
```

**TelegramBroadcast Response** (the server validates the request but currently delivers to nobody)

```json
{
  "status": "success",
  "message": "Broadcast sent to 0 users, failed for 0 users",
  "success_count": 0,
  "fail_count": 0
}
```

**TelegramStats Response**

```json
{
  "status": "success",
  "data": {
    "total_commands": 42,
    "commands_by_type": {"orderbook": 20, "positions": 22},
    "active_users": 1,
    "top_users": [["my_handle", 42]],
    "period_days": 7
  }
}
```

**TelegramPreferences Read Response**

```json
{
  "status": "success",
  "data": {
    "order_notifications": true,
    "trade_notifications": true,
    "pnl_notifications": true,
    "daily_summary": true,
    "summary_time": "18:00",
    "language": "en",
    "timezone": "Asia/Kolkata"
  }
}
```

### SIP Frequencies Example

Lists the SIP schedules the backtester accepts. No API key is needed or sent.

```csharp
OAJson sipfrequencies();
```

```csharp
OAJson r = client.sipfrequencies();
Print(r.Pretty());
```

**SIP Frequencies Response** (the [SIP Backtest API](../../api-documentation/v1/utilities-api/sip-backtest.md) page lists the four values)

```json
{
  "status": "success",
  "data": [
    {"value": "monthly", "label": "Monthly"},
    {"value": "fortnightly", "label": "Fortnightly"},
    {"value": "weekly", "label": "Weekly"},
    {"value": "quarterly", "label": "Quarterly"}
  ]
}
```

### SIP Backtest Example

Backtests a systematic investment plan on history and compares it with a lumpsum over the same window. It never places orders. With `source: "db"` (the default) it reads data stored by Historify.

```csharp
OAJson sipbacktest(string symbol, string start_date, string end_date, double amount,
    string exchange = "NSE", string frequency = "monthly", int day_of_month = 1, double step_up_percent = 0,
    string cost_model = "indian_equity", string cost_exchange = "NSE", double brokerage_percent = 0,
    double brokerage_flat = 0, object charges = null, double? gst_rate = null, double cost_bps = 0,
    double slippage = 0, string benchmark = null, string benchmark_exchange = "NSE_INDEX",
    string source = "db", bool include_grids = true);
```

The API page's sample request (RELIANCE, 10,000 a month from 2020 to 2025, 10 percent annual step-up, compared with NIFTY):

```csharp
OAJson r = client.sipbacktest(symbol: "RELIANCE", exchange: "NSE", start_date: "2020-01-01", end_date: "2025-01-01",
                              amount: 10000, frequency: "monthly", day_of_month: 1, step_up_percent: 10,
                              benchmark: "NIFTY", benchmark_exchange: "NSE_INDEX");
Print(r.Str("status"));
```

**SIP Backtest Response**: the API documentation gives no example. The answer holds `request`, `headline`, `underwater`, `drawdown`, `yearly`, `monthly_heatmap`, `lumpsum`, `charges`, `frequency_comparison`, `curves`, `installments` and `warnings`, plus `rolling_xirr`, `start_date_heatmap`, `crisis` and `sip_date_heatmap` when `include_grids` is true, and `benchmark` when a benchmark was given. Key figures include XIRR, total invested, final value and total charges.

`charges` takes an optional object of charge overrides, for example `charges: new { stt = new { rate = 0.001 } }`; leave it at `null` to use the built-in schedule.

### Portfolio Benchmarks Example

Lists the index symbols usable as a portfolio benchmark, read from the downloaded instrument master (it varies by broker).

```csharp
OAJson portfoliobenchmarks();
```

```csharp
OAJson r = client.portfoliobenchmarks();
Print(r.Pretty());
```

**Portfolio Benchmarks Response** (from the [Portfolio API](../../api-documentation/v1/portfolio.md) page)

```json
{
  "status": "success",
  "data": [
    {"symbol": "NIFTY", "exchange": "NSE_INDEX", "name": "Nifty 50"}
  ]
}
```

### Portfolio Backtest Example

Backtests a weighted portfolio and returns the full analysis. Read-only; it never places orders.

```csharp
OAJson portfoliobacktest(object holdings, string start_date, string end_date, string benchmark = null,
    string benchmark_exchange = "NSE_INDEX", string rebalance = "never", double drift_band = 0,
    string cost_model = "indian_equity", double brokerage_pct = 0, string cost_exchange = "NSE",
    object charges = null, double? gst_rate = null, double cost_bps = 0, double slippage = 0,
    double initial_capital = 100000, double risk_free_rate = 0, string source = "db");
```

The API page's sample request (INFY 40 and HDFCBANK 60, quarterly rebalance, against NIFTY):

```csharp
OAJson r = client.portfoliobacktest(holdings: new[] {
        new { symbol = "INFY", exchange = "NSE", weight = 40 },
        new { symbol = "HDFCBANK", exchange = "NSE", weight = 60 } },
    start_date: "2021-01-01", end_date: "2026-01-01", benchmark: "NIFTY", benchmark_exchange: "NSE_INDEX",
    rebalance: "quarterly", drift_band: 0.05, slippage: 0.0005, initial_capital: 100000, risk_free_rate: 0.06,
    source: "db");
Print(r.Str("status"));
```

**Portfolio Backtest Response**: the analysis fields sit at the top level, not under `data`: `meta` (with `total_return_basis` `"price"` and `data_warnings`), equity, benchmark, metrics, holding contributions, correlations, diversification, allocation, costs, rebalancing, walk-forward, Monte Carlo, crisis, health and insight sections. The API documentation gives no full example.

### Portfolio Tearsheet Example

Takes the same request as `portfoliobacktest` and answers with a self-contained HTML tearsheet, returned as `{"status": "success", "data": "<!DOCTYPE html>..."}`. Limited to 5 requests per minute.

```csharp
OAJson portfoliotearsheet(object holdings, string start_date, string end_date, string benchmark = null,
    string benchmark_exchange = "NSE_INDEX", string rebalance = "never", double drift_band = 0,
    string cost_model = "indian_equity", double brokerage_pct = 0, string cost_exchange = "NSE",
    object charges = null, double? gst_rate = null, double cost_bps = 0, double slippage = 0,
    double initial_capital = 100000, double risk_free_rate = 0, string source = "db");
```

```csharp
OAJson r = client.portfoliotearsheet(holdings: new[] {
        new { symbol = "INFY", exchange = "NSE", weight = 40 },
        new { symbol = "HDFCBANK", exchange = "NSE", weight = 60 } },
    start_date: "2021-01-01", end_date: "2026-01-01", benchmark: "NIFTY");
if (r.Str("status") == "success")
{
    // saved in your Documents folder
    string path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                                         "portfolio-tearsheet.html");
    System.IO.File.WriteAllText(path, r.Str("data"));
}
```

### Portfolio Holdings Example

Analyses the holdings actually held at your broker as a historical scenario of today's allocation. Needs an active broker session.

```csharp
OAJson portfolioholdings(int lookback_days = 365, string benchmark = "NIFTY",
    string benchmark_exchange = "NSE_INDEX", double risk_free_rate = 0, string source = "db");
```

```csharp
OAJson r = client.portfolioholdings(lookback_days: 365, benchmark: "NIFTY", benchmark_exchange: "NSE_INDEX",
                                    risk_free_rate: 0.06, source: "db");
Print(r.Str("status"));
```

**Portfolio Holdings Response**: a current-holdings summary and analysis; the API documentation gives no example. It answers 403 without a broker session and 422 when there are no usable holdings.

### Sector Rotation Options Example

Returns the benchmarks, timeframes, exchanges and sectors the rotation map supports. No API key is needed or sent.

```csharp
OAJson sectorrotationoptions();
```

```csharp
OAJson r = client.sectorrotationoptions();
Print(r.Pretty());
```

**Sector Rotation Options Response** (the [Sector Rotation](../../api-documentation/v1/sectorrotation.md) page lists the keys)

```json
{
  "status": "success",
  "data": {
    "benchmarks": [{"symbol": "NIFTY", "exchange": "NSE_INDEX", "label": "..."}],
    "timeframes": ["daily", "weekly"],
    "exchanges": ["..."],
    "max_instruments": 40,
    "sectors": ["..."],
    "optional_sectors": ["..."],
    "max_tail": 30
  }
}
```

### Sector Rotation Example

Builds a relative rotation map (ratio, momentum, quadrant, run length and trail) of sectors or symbols against a benchmark. Without `instruments` it maps the default NSE sector set; with a list it maps your own list of up to 40 instruments.

```csharp
OAJson sectorrotation(string benchmark = "NIFTY", string timeframe = "daily", string source = "db",
    object instruments = null);
```

```csharp
OAJson r = client.sectorrotation(benchmark: "NIFTY", timeframe: "daily", source: "db");

r = client.sectorrotation(benchmark: "NIFTY", timeframe: "daily", source: "db", instruments: new object[] {
    new { symbol = "NIFTYIT", exchange = "NSE_INDEX", label = "IT" },
    new { symbol = "RELIANCE", exchange = "NSE" } });
Print(r.Pretty());
```

**Sector Rotation Response** (the [Sector Rotation](../../api-documentation/v1/sectorrotation.md) page lists the keys)

```json
{
  "status": "success",
  "data": {
    "benchmark": "NIFTY",
    "benchmark_exchange": "NSE_INDEX",
    "benchmark_label": "...",
    "timeframe": "daily",
    "source": "db",
    "as_of": "...",
    "max_tail": 30,
    "instruments": ["..."],
    "unavailable": ["..."]
  }
}
```

Check `unavailable` even on success: a sector without history is listed there instead of failing the whole map.

## Client Methods

These methods belong to the client itself rather than to one endpoint.

```csharp
OAJson post(string endpoint, object payload = null);
OAJson get(string endpoint, object query = null);
OAJson response();
int last_status();
string last_raw();
void enqueue(Func<api, OAJson> call, Action<OAJson> on_done = null);
Task<OAJson> run_async(Func<api, OAJson> call);
void close();
void Dispose();
```

| Method | What it does |
| --- | --- |
| `post` | Sends any JSON payload to any endpoint under `<host>/api/v1/`, adding `apikey` when the payload has none. Use it for an endpoint that a future OpenAlgo version adds before the SDK has a method for it. |
| `get` | The same for a GET endpoint: the query values are added to the URL, with `apikey` first. |
| `response` | Returns the last completed response of this client, on any thread. |
| `last_status` | The HTTP status of the last call, `-1` when the request never reached the server, `0` when nothing was sent. |
| `last_raw` | The raw text OpenAlgo sent. |
| `enqueue` | Queues a call on the client's background thread; calls run one at a time, in order. `on_done` receives the response on that thread. |
| `run_async` | The same, returning a `Task<OAJson>` that completes with the response and never faults. |
| `close`, `Dispose` | Releases the client and disconnects the feed. A request already sent finishes; later calls return `error_type` `unknown_error` and are never sent. |

```csharp
OAJson r = client.post("quotes", new { symbol = "RELIANCE", exchange = "NSE" });   // the same request as client.quotes(...)
Print(client.last_status() + " " + client.base_url);

r = client.get("instruments", new { exchange = "NSE" });   // GET instruments?apikey=...&exchange=NSE
```

The client's properties:

| Property | Type | Meaning |
| --- | --- | --- |
| `base_url` | `string` | The REST base URL, for example `http://127.0.0.1:5000/api/v1/` |
| `timeout` | `double` | Request timeout in seconds |
| `verbose` | `int` | Log level; can be changed at any time |
| `owner`, `allow_historical`, `allow_playback` | `object`, `bool`, `bool` | The safety guard settings passed to the constructor |
| `block_reason` | `string` | `null` when requests may go out now, otherwise `historical_blocked` or `playback_blocked` |
| `closed` | `bool` | `true` after `close()` |
| `queue_count` | `int` | Queued calls that have not finished yet |
| `log_sink` | `Action<string>` | The log sink; can be changed at any time |
| `ws_url`, `ws_port`, `ws_host`, `auto_reconnect` | `string`, `int`, `string`, `bool` | The feed settings (see [Feed State](#feed-state-example)) |

## WebSocket Feed

The feed streams live LTP, quotes, depth and your own order updates. It runs on background threads of its own, so there is nothing to poll: once you subscribe, your callbacks are called as ticks arrive. Those callbacks run on a feed thread, never on NinjaTrader's thread for your script. [WebSocket Feed](websocket-feed.md) walks through streaming inside an indicator; this section lists every call.

Callbacks are ordinary C# delegates: `Action<OAJson>` for data and for the connect, disconnect and reconnect hooks, and `Action<Exception, OAJson>` for the error hook. A lambda such as `data => Print(data.ToString())` or a method of your script both work.

### Connect and Disconnect Example

`connect` opens the socket and authenticates with your API key. It waits at most about 10 seconds and returns `true` when the feed is live. `connect_async` does the same on a background thread, so `OnStateChange` does not wait. `disconnect` closes the socket, stops the automatic reconnect and forgets your subscriptions. With `owner: this`, `connect` returns `false` and opens no socket while the safety guard blocks requests.

```csharp
bool connect();
Task<bool> connect_async();
void disconnect();
```

```csharp
if (!client.connect())
    Print("feed not connected yet; with auto_reconnect the SDK keeps retrying");
// ...
client.disconnect();
```

Inside a NinjaScript, call `client.connect_async();` in `State.Realtime` and `client.close()` (which also disconnects the feed) in `State.Terminated`.

### LTP Data (Streaming Websocket)

Subscribes to LTP updates (mode 1). `instruments` is a list of `{exchange, symbol}` objects. The callback is optional; without it, read the cache with `get_ltp`. The subscription is recorded even while the socket is down and is sent again after every reconnect.

```csharp
bool subscribe_ltp(object instruments, Action<OAJson> on_data_received = null);
bool unsubscribe_ltp(object instruments);
```

```csharp
var watch_list = new[] {
    new { exchange = "NSE", symbol = "RELIANCE" },
    new { exchange = "NSE", symbol = "INFY" } };
client.subscribe_ltp(watch_list, data => Print(data.Str("symbol") + " " + data.Num("data.ltp")));
// ... later
client.unsubscribe_ltp(watch_list);
```

**LTP Update Received**

```json
{"type": "market_data", "symbol": "RELIANCE", "exchange": "NSE", "mode": 1,
 "data": {"ltp": 1424.0, "timestamp": 1712345678901}}
```

### Quotes (Streaming Websocket)

Subscribes to quote updates (mode 2): open, high, low, close, LTP, volume and more. A field the server did not send is `0`.

```csharp
bool subscribe_quote(object instruments, Action<OAJson> on_data_received = null);
bool unsubscribe_quote(object instruments);
```

```csharp
var watch_list = new[] {
    new { exchange = "NSE", symbol = "RELIANCE" },
    new { exchange = "NSE", symbol = "INFY" } };
client.subscribe_quote(watch_list, data =>
    Print(data.Str("symbol") + " ltp " + data.Num("data.ltp") + " vol " + data.Int("data.volume")));
```

**Quote Update Received** (the fields the SDK delivers, with zeros standing in for real values)

```json
{"type": "market_data", "symbol": "RELIANCE", "exchange": "NSE", "mode": 2,
 "data": {"open": 0, "high": 0, "low": 0, "close": 0, "ltp": 0, "volume": 0,
          "last_trade_quantity": 0, "avg_trade_price": 0, "change": 0, "change_percent": 0,
          "ltt": 0, "total_buy_quantity": 0, "total_sell_quantity": 0, "oi": 0, "timestamp": 0}}
```

### Depth (Streaming Websocket)

Subscribes to market depth updates (mode 3). The number of levels depends on the broker.

```csharp
bool subscribe_depth(object instruments, Action<OAJson> on_data_received = null);
bool unsubscribe_depth(object instruments);
```

```csharp
var watch_list = new[] {
    new { exchange = "NSE", symbol = "RELIANCE" },
    new { exchange = "NSE", symbol = "INFY" } };
client.subscribe_depth(watch_list, data =>
    Print(data.Str("symbol") + " best bid " + data.Num("data.depth.buy.0.price")
          + " best ask " + data.Num("data.depth.sell.0.price")));
```

**Market Depth Update Received** (the shape the SDK delivers, with zeros standing in for real values)

```json
{"type": "market_data", "symbol": "RELIANCE", "exchange": "NSE", "mode": 3,
 "data": {"ltp": 0, "timestamp": 0,
          "depth": {"buy": [{"price": 0, "quantity": 0, "orders": 0}],
                    "sell": [{"price": 0, "quantity": 0, "orders": 0}]}}}
```

### Account-level order updates

Subscribes to the real-time order updates of your account: fills, partial fills, rejections and cancellations, in analyzer mode (sandbox) too. No symbol list is needed.

```csharp
bool subscribe_orders(Action<OAJson> on_order_update = null);
bool unsubscribe_orders();
```

```csharp
client.subscribe_orders(message => Print(message.Str("orderid") + " " + message.Str("order_status")));
```

**Order Update Received**

```json
{"type": "order_update", "user_id": "openalgo-user", "mode": "live", "broker": "broker_name",
 "orderid": "240221025997024", "symbol": "RELIANCE", "exchange": "NSE", "action": "BUY",
 "quantity": 10, "price": 1424.0, "trigger_price": 0, "pricetype": "LIMIT", "product": "MIS",
 "order_status": "complete", "filled_quantity": 10, "pending_quantity": 0,
 "average_price": 1423.85, "rejection_reason": ""}
```

`mode` is `"live"` or `"analyze"`. The same event can arrive more than once, so deduplicate by `orderid` and status, and reconcile with the order book. See [order-update streaming](../../api-documentation/v1/websockets.md#order-updates).

### Cached Values Example

The feed keeps the latest value of everything you subscribed to. These calls read that memory: they send no request, and each returns a new copy that is safe to read on any thread, `OnBarUpdate` included. `null` means "no filter".

```csharp
OAJson get_ltp(string exchange = null, string symbol = null);
OAJson get_quotes(string exchange = null, string symbol = null);
OAJson get_depth(string exchange = null, string symbol = null);
OAJson get_subscriptions();
OAJson get_orders();
```

```csharp
double ltp = client.get_ltp(exchange: "NSE", symbol: "RELIANCE").Num("ltp.NSE.RELIANCE.ltp");
Print(client.get_subscriptions().ToString());
Print(client.get_orders()["orders"].Count + " order updates so far");
```

| Call | Returns |
| --- | --- |
| `get_ltp` | `{"ltp": {"NSE": {"RELIANCE": {"timestamp": 1712345678901, "ltp": 1424.0}}}}` |
| `get_quotes` | `{"quote": {"NSE": {"RELIANCE": {...quote fields...}}}}` |
| `get_depth` | `{"depth": {"NSE": {"RELIANCE": {"timestamp": ..., "ltp": ..., "buyBook": {"1": {"price": ..., "qty": ..., "orders": ...}, ...}, "sellBook": {...}}}}}` |
| `get_subscriptions` | `{"ltp": [{"symbol": "RELIANCE", "exchange": "NSE"}], "quote": [], "depth": [], "orders": false}` |
| `get_orders` | `{"orders": [...]}`, the order updates received so far, most recent first (at most 500) |

The Python attributes are there too, as read-only copies keyed by `"EXCHANGE:SYMBOL"`: `client.ltp_data`, `client.quotes_data`, `client.depth_data` and `client.order_data`.

### Connection Hooks Example

Hooks tell your script when the feed comes up, goes down, is restored after a drop, or reports an error. Without an error hook, errors are written to the log, which is always shown.

```csharp
Action<OAJson> on_connect(Action<OAJson> callback);
Action<OAJson> on_disconnect(Action<OAJson> callback);
Action<OAJson> on_reconnect(Action<OAJson> callback);
Action<Exception, OAJson> on_error(Action<Exception, OAJson> callback);
bool remove_hook(Delegate callback);
```

```csharp
client.on_connect(e => Print("feed live (connection " + e.Int("seq") + (e.Bool("reconnect") ? ", reconnect" : "") + ")"));
client.on_disconnect(e => Print("feed down (" + e.Str("reason") + ")" + (e.Bool("will_reconnect") ? ", reconnecting" : "")));
client.on_reconnect(e => Print("feed restored: " + e["subscriptions"].ToString()));
client.on_error((error, context) => Print("feed error (" + context.Str("kind") + "): " + error.Message));
```

| Hook | Receives |
| --- | --- |
| `on_connect` | `{"event": "connect", "seq", "url", "reconnect", "broker", "user_id"}`, once per connection, after the server accepted the API key and your subscriptions were sent |
| `on_disconnect` | `{"event": "disconnect", "seq", "url", "code", "reason", "error", "requested", "will_reconnect"}`, once per accepted connection that ends |
| `on_reconnect` | The connect payload with `"event": "reconnect"` plus `"subscriptions"`, after a lost session was restored and the subscriptions replayed |
| `on_error` | The exception and a context whose `kind` is `callback`, `hook`, `frame`, `authentication` or `server` |

Register hooks before `connect()`. `remove_hook` takes the same delegate you registered, so keep it in a variable if you want to remove it later. After a drop the SDK reconnects, signs in again and repeats your subscriptions by itself, waiting 1, 2, 5, 10, 30 and then 60 seconds between attempts. OpenAlgo does not replay the ticks or order updates missed while the connection was down, so refresh anything important with a REST call (`quotes`, `positionbook`, `orderbook`) from your `on_reconnect` hook.

### Callback Threads Example

Data callbacks run on the feed's socket thread, and hooks on a feed thread, never on NinjaTrader's thread for your script. `Print` is fine there. To update a plot, a series or a drawing, hand the value to the script's own thread with `TriggerCustomEvent`, as the [feed indicator](websocket-feed.md) does:

```csharp
private void OnLtp(OAJson tick)
{
    double ltp = tick.Num("data.ltp");
    try
    {
        TriggerCustomEvent(o => { Value[0] = (double)o; }, ltp);   // runs on the indicator's thread
    }
    catch (Exception)
    {
        // the indicator is being removed
    }
}
```

`disconnect()`, and `close()` which calls it, run the disconnect hook on the thread that called them, before they return, as in Python. In `State.Terminated` that is `OnStateChange`, so a disconnect hook must only print: no waiting, no `TriggerCustomEvent`.

### Feed State Example

Read-only versions of the Python attributes, and the settings that came from the constructor:

| Property | Type | Meaning |
| --- | --- | --- |
| `connected` | `bool` | The socket is open |
| `authenticated` | `bool` | The socket is open and the server accepted the API key |
| `feed_state` | `string` | `"idle"`, `"stopped"`, `"connecting"`, `"open"` or `"live"` |
| `ws_url` | `string` | The feed URL |
| `ws_port` | `int` | The feed port (8765 unless one was passed) |
| `ws_host` | `string` | The host the feed URL was worked out from (`null` when `ws_url` was passed) |
| `auto_reconnect` | `bool` | Reconnect after a drop; can be changed at any time |
| `ltp_callback`, `quote_callback`, `depth_callback`, `order_callback` | `Action<OAJson>` | The current data callbacks, set by the subscribe calls |

```csharp
Print("feed " + client.ws_url + " connected " + client.connected + " authenticated " + client.authenticated
      + " state " + client.feed_state);
```
