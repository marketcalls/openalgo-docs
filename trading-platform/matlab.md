# MATLAB

The OpenAlgo MATLAB library connects MATLAB to your OpenAlgo server. From the Command Window, a live script or a scheduled `matlab -batch` job you can place and manage orders, read funds, positions and holdings, pull historical candles into a `timetable`, work with option chains and Greeks, run strategies from the strategy module, and stream live prices and order updates.

Source code: [https://github.com/marketcalls/openalgo-matlab-library](https://github.com/marketcalls/openalgo-matlab-library)

To install the OpenAlgo MATLAB library, download `openalgo-matlab-1.0.0.mltbx` from the [GitHub releases](https://github.com/marketcalls/openalgo-matlab-library/releases) page and double-click it in MATLAB, or install it from the Command Window:

```matlab
matlab.addons.install("openalgo-matlab-1.0.0.mltbx");
```

To work from the source instead, clone the repository and add the folder that contains `+openalgo` to the MATLAB path:

```bash
git clone https://github.com/marketcalls/openalgo-matlab-library
```

```matlab
addpath("C:\path\to\openalgo-matlab-library")   % the folder that contains +openalgo
savepath                                         % optional: keep it for future sessions
```

The library is tested on MATLAB R2026b and uses only base MATLAB, so no toolboxes are needed. A live feed from a hosted server over `wss://` also needs one of .NET (Windows), MATLAB's Python interface or Java; see [Connecting to a Hosted Server](#connecting-to-a-hosted-server-wss). A local `ws://` feed needs none of them.

### Get the OpenAlgo apikey

Make sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey.

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

### Getting Started with OpenAlgo

Create a client with your API key:

```matlab
% Replace 'your_api_key_here' with your actual API key
% Specify the host URL with your hosted domain or ngrok domain.
% If running locally in windows then use the default host value.
client = openalgo.api(api_key="your_api_key_here", host="http://127.0.0.1:5000");
```

To keep the key out of your scripts, read it from an environment variable: `openalgo.api(api_key=getenv("OPENALGO_API_KEY"))`.

The full constructor is:

```matlab
openalgo.api(api_key, host="http://127.0.0.1:5000", version="v1", timeout=120, ...
    ws_port=8765, ws_url=[], verbose=false, auto_reconnect=true)
```

* `api_key` (text): your OpenAlgo API key. Required.
* `host` (text): base URL of your OpenAlgo server. REST calls go to `{host}/api/{version}/`.
* `version` (text): API version. Defaults to `"v1"`.
* `timeout` (number): REST request timeout in seconds. Defaults to `120`.
* `ws_port` (number): WebSocket port. Defaults to `8765`.
* `ws_url` (text): full WebSocket URL. Overrides `host` and `ws_port`. When omitted it is derived from `host`: `ws://<host-name>:<ws_port>` for an `http://` host, so a local install needs no `ws_url` at all, and `wss://<host>/ws` for an `https://` host (see [Connecting to a Hosted Server](#connecting-to-a-hosted-server-wss)).
* `verbose`: feed log level. `0`/`false` silent, `1`/`true` basic, `2` full debug. See [Websockets (Verbose Control)](#websockets-verbose-control).
* `auto_reconnect` (logical): defaults to `true`. The client reconnects, re-authenticates and replays every active subscription after a drop, with increasing delays. Set to `false` for manual reconnect handling.

The arguments can also be given by position in this order, for example `openalgo.api("your_api_key_here", "http://127.0.0.1:5000")`.

Displaying the client never shows your API key; it prints the endpoints and the feed state only:

```matlab
>> client

client = 
  openalgo.api client
    base_url: http://127.0.0.1:5000/api/v1/
    ws_url:   ws://127.0.0.1:8765
    feed:     not connected
```

Call `client.close()` when you are done with the REST methods; any REST call after that returns an error struct. Call `client.disconnect()` when you are done with the live feed.

#### Name=value arguments

Methods are called on the client with `.`, using **name=value arguments**:

```matlab
response = client.placeorder(strategy="Test Strategy", symbol="NHPC", action="BUY", ...
    exchange="NSE", price_type="MARKET", product="MIS", quantity=1);
```

* **Names are exact and case-sensitive.** `Exchange="NSE"` is not `exchange="NSE"`: an unknown name is sent as an extra field, so the required `exchange` is reported missing. The older `"name", value` form works too: `client.quotes("symbol", "RELIANCE", "exchange", "NSE")`.
* **A required parameter that is missing stops the script** with an error such as `placeorder() missing 1 required keyword-only argument: 'exchange'`, before anything reaches the broker.
* **A few methods also take their main value without a name**: `client.analyzertoggle(true)`, `client.holidays(2026)`, `client.timings("2025-12-19")`, `client.whatsapp("NIFTY crossed 26000!")`, `client.telegramstats(30)`, `client.telegrampreferences(123456789)`, `client.updatetelegrampreferences(123456789, daily_summary=true)`, and on the webhook sender `s.start("sandbox")`, `s.signal("long_entry", leg_id=1)` and `s.send(payload)`.
* **`[]` means "not set".** An optional parameter left at `[]` is not sent.
* **Extra name=value pairs are sent to the server as additional fields**, for example `price=16`, `trigger_price=0` or `disclosed_quantity=0` on `placeorder`. Methods that take no extra fields refuse them with `openalgo:unexpectedArgument`.
* **`strategy` is optional on the order methods.** Pass your own strategy name so your orders are easy to find in the OpenAlgo order book.
* **Records and lists**: a record is a scalar struct (`struct("symbol", "RELIANCE", "exchange", "NSE")`); a list of records is a cell array of structs (`{struct(...), struct(...)}`) or a struct array (`struct("symbol", {"RELIANCE", "TCS"}, "exchange", "NSE")`); a list of texts is a cell array or a string array (`["919876543210" "919812345678"]`). Lists are always sent as JSON arrays, even with one element.

Numbers can be passed as numbers. Fields the server expects as text are converted for you (`1` is sent as `"1"`, `16.5` as `"16.5"`), with the shortest digits that read back as the same number (a price of `1180.05` is sent as `1180.05`, a computed `0.1 + 0.2` as `0.30000000000000004`). Large whole numbers are never written in exponent form (`100000`, not `1e+05`). A whole number is sent without a decimal point, so `price=50.0` sends `"50"`; write `price="50.0"` when the exact text matters. Pass order ids as text: they are longer than a double can hold exactly.

#### Reading responses

Every REST method returns the server's JSON answer as a MATLAB struct, so you read a field with `.`:

```matlab
>> response = client.placeorder(strategy="Test Strategy", symbol="NHPC", action="BUY", ...
       exchange="NSE", price_type="MARKET", product="MIS", quantity=1)

response =

  struct with fields:

    orderid: '250408000989443'
     status: 'success'

>> response.orderid

ans =

    '250408000989443'
```

The examples below show each response as the JSON the server returns, because it is shorter to read. The MATLAB value has the same structure, decoded with `jsondecode`:

* JSON objects are structs and JSON text is a character vector.
* A list of records with the same fields is a **struct array** (`response.results(2)`); a list of records with different fields is a **cell array** (`response.results{2}`). A one-element list of records is a 1x1 struct.
* A list of texts is a cell array of character vectors (`response.data{1}`), and a list of numbers is a column vector.
* JSON `null` is `[]`, so test it with `isempty`.
* Keys that are not valid MATLAB names are renamed: `"1"` becomes `x1`, `"d-e"` becomes `d_e`.

When a list can hold records of different shapes (for example one leg that failed and carries a `message` field), loop over it in a way that works for both forms:

```matlab
items = response.results;
if isstruct(items)
    items = num2cell(items);    % struct array -> cell array
end
for k = 1:numel(items)
    item = items{k};
    % ...
end
```

To see a response as JSON text, use `jsonencode(response, PrettyPrint=true)`. `history` returns a `timetable` and `instruments` a `table` instead of a struct.

### Check OpenAlgo Version

```matlab
>> openalgo.version()

ans =

    '1.0.0'
```

### Help Pages

Every method has its own MATLAB help text with its parameters, the request it sends, its return value and examples:

```matlab
help openalgo                      % overview and calling convention
help openalgo.api                  % the client and the full method list
help openalgo.api/placeorder
help openalgo.api/history
help openalgo.FeedAPI              % the WebSocket feed
help openalgo.FeedAPI/subscribe_ltp
help openalgo.Strategy             % the strategy webhook sender
doc openalgo.api                   % the same, in the Help browser
```

### Examples

Please refer to the documentation on [order constants](../api-documentation/v1/order-constants.md), and consult the API reference for details on optional parameters.

### Ping Example

Run this at the start of a script, before it trades: it confirms that the API key is valid and that your broker session is logged in.

```matlab
response = client.ping();
disp(response)
```

#### Ping Response

```json
{
  "status": "success",
  "data": {
    "message": "pong",
    "broker": "yourbroker"
  }
}
```

`broker` is the broker your OpenAlgo server is connected to. An invalid API key, or a broker session that is missing or has expired, is answered with HTTP 403, which the client returns as an `http_error` struct with `code` 403. A simple pre-flight check:

```matlab
if ~strcmp(client.ping().status, "success")
    error("OpenAlgo is not ready: check the API key and log in to your broker");
end
```

### PlaceOrder Example

To place a new market order:

```matlab
response = client.placeorder( ...
    strategy="Test Strategy", ...
    symbol="NHPC", ...
    action="BUY", ...
    exchange="NSE", ...
    price_type="MARKET", ...
    product="MIS", ...
    quantity=1);
disp(response)
```

#### Place Market Order Response

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```matlab
response = client.placeorder( ...
    strategy="Test Strategy", ...
    symbol="YESBANK", ...
    action="BUY", ...
    exchange="NSE", ...
    price_type="LIMIT", ...
    product="MIS", ...
    quantity=1, ...
    price=16, ...
    trigger_price=0, ...
    disclosed_quantity=0);
disp(response)
```

#### Place Limit Order Response

```json
{"orderid": "250408001003813", "status": "success"}
```

`price`, `trigger_price` and `disclosed_quantity` are extra fields, sent as text: `"price": "16"`, `"trigger_price": "0"`, `"disclosed_quantity": "0"`.

### PlaceSmartOrder Example

To place a smart order considering the current position size:

```matlab
response = client.placesmartorder( ...
    strategy="Test Strategy", ...
    symbol="TATAMOTORS", ...
    action="SELL", ...
    exchange="NSE", ...
    price_type="MARKET", ...
    product="MIS", ...
    quantity=1, ...
    position_size=5);
disp(response)
```

#### Place Smart Market Order Response

```json
{"orderid": "250408000997543", "status": "success"}
```

### OptionsOrder Example

To place an ATM options order:

```matlab
response = client.optionsorder( ...
    strategy="Test Strategy", ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="28OCT25", ...
    offset="ATM", ...
    option_type="CE", ...
    action="BUY", ...
    quantity=75, ...
    price_type="MARKET", ...
    product="NRML", ...
    splitsize=0);
disp(response)
```

#### Place Options Order Response

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

To place an ITM options order:

```matlab
response = client.optionsorder( ...
    strategy="Test Strategy", ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="28OCT25", ...
    offset="ITM4", ...
    option_type="PE", ...
    action="BUY", ...
    quantity=75, ...
    price_type="MARKET", ...
    product="NRML", ...
    splitsize=0);
disp(response)
```

#### Place Options Order Response

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

To place an OTM options order:

```matlab
response = client.optionsorder( ...
    strategy="Test Strategy", ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="28OCT25", ...
    offset="OTM5", ...
    option_type="CE", ...
    action="BUY", ...
    quantity=75, ...
    price_type="MARKET", ...
    product="NRML", ...
    splitsize=0);
disp(response)
```

#### Place Options Order Response

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

For a LIMIT option order pass `price` as an extra field, for example `price_type="LIMIT", price="50.0"`. `strike_int` is deprecated (the server detects the strike interval itself): passing it still works but warns with the identifier `openalgo:deprecated`.

### OptionsMultiOrder Example

To place an Iron Condor (same expiry):

```matlab
response = client.optionsmultiorder( ...
    strategy="Iron Condor Test", ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="25NOV25", ...
    legs={ ...
        struct("offset", "OTM6", "option_type", "CE", "action", "BUY",  "quantity", 75), ...
        struct("offset", "OTM6", "option_type", "PE", "action", "BUY",  "quantity", 75), ...
        struct("offset", "OTM4", "option_type", "CE", "action", "SELL", "quantity", 75), ...
        struct("offset", "OTM4", "option_type", "PE", "action", "SELL", "quantity", 75)});
disp(response)
```

#### Place OptionsMultiOrder Response

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

To place a Diagonal Spread (different expiry), give each leg its own `expiry_date`:

```matlab
response = client.optionsmultiorder( ...
    strategy="Diagonal Spread Test", ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    legs={ ...
        struct("offset", "ITM2", "option_type", "CE", "action", "BUY", "quantity", 75, ...
               "expiry_date", "30DEC25"), ...
        struct("offset", "OTM2", "option_type", "CE", "action", "SELL", "quantity", 75, ...
               "expiry_date", "25NOV25")});
disp(response)
```

#### Place OptionsMultiOrder Response

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

Check each leg's result rather than only the top-level `status`. A failed leg carries a `message` instead of an `orderid`, which makes `results` a cell array, so convert first:

```matlab
legs = response.results;
if isstruct(legs)
    legs = num2cell(legs);
end
for k = 1:numel(legs)
    fprintf("Leg %d %s %s\n", legs{k}.leg, legs{k}.symbol, legs{k}.status);
end
```

Each leg takes `offset`, `option_type`, `action` and `quantity`, and optionally `expiry_date`, `pricetype`, `product`, `price`, `trigger_price` and `disclosed_quantity`. BUY legs are executed first for margin efficiency, then SELL legs.

### BasketOrder Example

To place a new basket order:

```matlab
basket_orders = { ...
    struct( ...
        "symbol", "BHEL", ...
        "exchange", "NSE", ...
        "action", "BUY", ...
        "quantity", 1, ...
        "pricetype", "MARKET", ...
        "product", "MIS"), ...
    struct( ...
        "symbol", "ZOMATO", ...
        "exchange", "NSE", ...
        "action", "SELL", ...
        "quantity", 1, ...
        "pricetype", "MARKET", ...
        "product", "MIS")};
response = client.basketorder(orders=basket_orders);
disp(response)
```

#### Basket Order Response

```json
{
  "status": "success",
  "results": [
    {"symbol": "BHEL", "status": "success", "orderid": "250408000999544"},
    {"symbol": "ZOMATO", "status": "success", "orderid": "250408000997545"}
  ]
}
```

Numbers inside an order (here `quantity`) are sent as text.

### SplitOrder Example

To place a new split order:

```matlab
response = client.splitorder( ...
    symbol="YESBANK", ...
    exchange="NSE", ...
    action="SELL", ...
    quantity=105, ...
    splitsize=20, ...
    price_type="MARKET", ...
    product="MIS");
disp(response)
```

#### SplitOrder Response

```json
{
  "status": "success",
  "split_size": 20,
  "total_quantity": 105,
  "results": [
    {"order_num": 1, "orderid": "250408001021467", "quantity": 20, "status": "success"},
    {"order_num": 2, "orderid": "250408001021459", "quantity": 20, "status": "success"},
    {"order_num": 3, "orderid": "250408001021466", "quantity": 20, "status": "success"},
    {"order_num": 4, "orderid": "250408001021470", "quantity": 20, "status": "success"},
    {"order_num": 5, "orderid": "250408001021471", "quantity": 20, "status": "success"},
    {"order_num": 6, "orderid": "250408001021472", "quantity": 5, "status": "success"}
  ]
}
```

### ModifyOrder Example

To modify an existing order:

```matlab
response = client.modifyorder( ...
    order_id="250408001002736", ...
    strategy="Test Strategy", ...
    symbol="YESBANK", ...
    action="BUY", ...
    exchange="NSE", ...
    price_type="LIMIT", ...
    product="CNC", ...
    quantity=1, ...
    price=16.5);
disp(response)
```

#### Modify Order Response

```json
{"orderid": "250408001002736", "status": "success"}
```

Pass order ids as text. `disclosed_quantity` and `trigger_price` default to `"0"`.

### CancelOrder Example

To cancel an existing order:

```matlab
response = client.cancelorder( ...
    order_id="250408001002736", ...
    strategy="Test Strategy");
disp(response)
```

#### CancelOrder Response

```json
{"orderid": "250408001002736", "status": "success"}
```

### CancelAllOrder Example

To cancel all open orders and trigger pending orders:

```matlab
response = client.cancelallorder(strategy="Test Strategy");
disp(response)
```

#### CancelAllOrder Response

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

To close all open positions across various exchanges:

```matlab
response = client.closeposition(strategy="Test Strategy");
disp(response)
```

#### ClosePosition Response

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

### OrderStatus Example

To get the current order status:

```matlab
response = client.orderstatus( ...
    order_id="250828000185002", ...
    strategy="Test Strategy");
disp(response)
```

#### OrderStatus Response

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

```matlab
>> response.data.order_status

ans =

    'complete'
```

### OpenPosition Example

To get the current open position:

```matlab
response = client.openposition( ...
    strategy="Test Strategy", ...
    symbol="YESBANK", ...
    exchange="NSE", ...
    product="MIS");
disp(response)
```

#### OpenPosition Response

```json
{"quantity": "-10", "status": "success"}
```

The quantity comes back as text, as the server sends it. Use `str2double(response.quantity)` to compute with it.

### PlaceGTTOrder Example

A GTT (Good Till Triggered) order is a price trigger that sits with the broker until LTP crosses your level, then places the underlying order automatically.

There are two shapes, and picking the wrong one is the usual mistake:

| Type | Use when | Triggers | Orders fired |
|------|----------|----------|--------------|
| `SINGLE` | One entry or exit at a level | 1 | 1 |
| `OCO` | You hold a position and want both a stoploss and a target, whichever hits first | 2 | 1 of 2, the other is auto-cancelled |

For a **SINGLE**, exactly one of `triggerprice_sl` / `triggerprice_tg` carries your level and the other stays `0`. Pick by where the trigger sits relative to LTP: `triggerprice_sl` for a level **below** LTP (sell stop-loss, buy the dip), `triggerprice_tg` for one **above** (breakout buy, sell at target). A SINGLE has no stoploss leg, so the suffix is only a directional hint.

For an **OCO**, the suffix is a real role and all four fields are required: `triggerprice_sl` with its `stoploss` limit, and `triggerprice_tg` with its `target` limit, where `triggerprice_sl < triggerprice_tg`.

GTT accepts `CNC` and `NRML` only (the default is `CNC`). `MIS` is refused: a GTT can sit for days and MIS is squared off the same session. GTT prices and quantities are sent as JSON numbers, and for a SINGLE the `stoploss` and `target` fields are sent as `null`.

```matlab
% SINGLE: "Buy IDEA if it dips to 9.55, with a LIMIT order at 9.50"
% LTP is above 9.55, so the trigger sits below it: triggerprice_sl
response = client.placegttorder( ...
    strategy="My GTT Strategy", ...
    symbol="IDEA", ...
    action="BUY", ...
    exchange="NSE", ...
    product="CNC", ...
    quantity=1, ...
    price_type="LIMIT", ...
    price=9.50, ...
    triggerprice_sl=9.55);
disp(response)
```

```matlab
% SINGLE: "Buy RELIANCE at MARKET if it breaks above 1450"
% LTP is below 1450, so the trigger sits above it: triggerprice_tg
response = client.placegttorder( ...
    strategy="My GTT Strategy", ...
    symbol="RELIANCE", ...
    action="BUY", ...
    exchange="NSE", ...
    product="CNC", ...
    quantity=1, ...
    price_type="MARKET", ...
    price=0, ...
    triggerprice_tg=1450);
```

```matlab
% OCO: "I am short 5 INFY. Stop me out at 1480, take profit at 1620"
% price is 0: OCO prices each leg separately through stoploss and target
response = client.placegttorder( ...
    strategy="Bracket OCO", ...
    trigger_type="OCO", ...
    symbol="INFY", ...
    action="SELL", ...
    exchange="NSE", ...
    product="CNC", ...
    quantity=5, ...
    price_type="LIMIT", ...
    price=0, ...
    triggerprice_sl=1480, ...
    stoploss=1478, ...
    triggerprice_tg=1620, ...
    target=1622);
```

#### PlaceGTTOrder Response

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Save the `trigger_id`: modify and cancel both need it.

### ModifyGTTOrder Example

Modify is a **full replacement**, not a patch. Every field on the trigger is replaced by what the call sends, so pass everything you want to keep rather than only the values that changed.

```matlab
response = client.modifygttorder( ...
    trigger_id="23132604291205", ...
    strategy="My GTT Strategy", ...
    symbol="IDEA", ...
    action="BUY", ...
    exchange="NSE", ...
    product="CNC", ...
    quantity=1, ...
    price_type="LIMIT", ...
    price=9.60, ...             % was 9.50
    triggerprice_sl=9.65);      % was 9.55
disp(response)
```

#### ModifyGTTOrder Response

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Trigger prices, limit prices, quantity and price type are modifiable. `trigger_type`, `symbol`, `exchange` and `action` are not: cancel and re-place instead. Only active GTTs can be modified; triggered, cancelled and expired ones are immutable.

### CancelGTTOrder Example

```matlab
response = client.cancelgttorder( ...
    trigger_id="23132604291205", ...
    strategy="My GTT Strategy");
disp(response)
```

#### CancelGTTOrder Response

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Cancelling an OCO removes both legs atomically; there is no per-leg cancel.

### GTTOrderBook Example

By default this lists **active** triggers only, the ones that can still fire. Pass `status="all"` to include the history as well (triggered, cancelled, expired, rejected), ordered active first; in analyzer mode a fired leg also carries the `triggered_order_id` of the sandbox order it placed.

```matlab
% Active triggers only (default)
response = client.gttorderbook();
disp(response)

% Active triggers first, then the triggered / cancelled / expired history
response = client.gttorderbook(status="all");
book = response.data;
if isstruct(book)
    book = num2cell(book);
end
for k = 1:numel(book)
    gtt = book{k};
    fprintf("%s %s %s %s\n", gtt.trigger_id, gtt.status, gtt.symbol, ...
        mat2str(gtt.trigger_prices'));
end
```

#### GTTOrderBook Response

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

The library refuses an impossible trigger spec before anything leaves the machine, and returns the refusal in the same shape as an API error:

```matlab
>> % SINGLE with no trigger price at all
>> e = client.placegttorder(symbol="IDEA", action="BUY", exchange="NSE", ...
       product="CNC", quantity=1, price=9.50)

e =

  struct with fields:

        status: 'error'
       message: 'SINGLE GTT requires a positive triggerprice_sl or triggerprice_tg.'
    error_type: 'validation_error'
```

API reference: [PlaceGTTOrder](../api-documentation/v1/orders-api/placegttorder.md), [ModifyGTTOrder](../api-documentation/v1/orders-api/modifygttorder.md), [CancelGTTOrder](../api-documentation/v1/orders-api/cancelgttorder.md), [GTTOrderBook](../api-documentation/v1/orders-api/gttorderbook.md).

### Quotes Example

```matlab
response = client.quotes(symbol="RELIANCE", exchange="NSE");
disp(response)
```

#### Quotes Response

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

```matlab
>> response.data.ltp

ans =

   1.1878e+03
```

MATLAB's default `format short` shows `1.1878e+03`; the value is exactly `1187.75` (`format long g` displays it in full).

### MultiQuotes Example

```matlab
response = client.multiquotes(symbols={ ...
    struct("symbol", "RELIANCE", "exchange", "NSE"), ...
    struct("symbol", "TCS", "exchange", "NSE"), ...
    struct("symbol", "INFY", "exchange", "NSE")});
disp(response)
```

#### MultiQuotes Response

```json
{
  "status": "success",
  "results": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "data": {
        "open": 1542.3, "high": 1571.6, "low": 1540.5, "ltp": 1569.9,
        "prev_close": 1539.7, "ask": 1569.9, "bid": 0, "oi": 0, "volume": 14054299
      }
    },
    {
      "symbol": "TCS",
      "exchange": "NSE",
      "data": {
        "open": 3118.8, "high": 3178, "low": 3117, "ltp": 3162.9,
        "prev_close": 3119.2, "ask": 0, "bid": 3162.9, "oi": 0, "volume": 2508527
      }
    },
    {
      "symbol": "INFY",
      "exchange": "NSE",
      "data": {
        "open": 1532.1, "high": 1560.3, "low": 1532.1, "ltp": 1557.9,
        "prev_close": 1530.6, "ask": 0, "bid": 1557.9, "oi": 0, "volume": 7575038
      }
    }
  ]
}
```

`results` is a 3x1 struct array:

```matlab
>> for k = 1:numel(response.results)
       item = response.results(k);
       fprintf("%s %g\n", item.symbol, item.data.ltp);
   end
RELIANCE 1569.9
TCS 3162.9
INFY 1557.9
```

The same symbols can be given as a struct array: `struct("symbol", {"RELIANCE", "TCS", "INFY"}, "exchange", "NSE")`.

### Depth Example

```matlab
response = client.depth(symbol="SBIN", exchange="NSE");
disp(response)
```

#### Depth Response

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
      {"price": 769.6,  "quantity": 767},
      {"price": 769.65, "quantity": 115},
      {"price": 769.7,  "quantity": 162},
      {"price": 769.75, "quantity": 1121},
      {"price": 769.8,  "quantity": 430}
    ],
    "bids": [
      {"price": 769.4,  "quantity": 886},
      {"price": 769.35, "quantity": 212},
      {"price": 769.3,  "quantity": 351},
      {"price": 769.25, "quantity": 343},
      {"price": 769.2,  "quantity": 399}
    ]
  }
}
```

```matlab
>> response.data.bids(1).price

ans =

  769.4000

>> [response.data.bids.price]

ans =

  769.4000  769.3500  769.3000  769.2500  769.2000
```

### History Example

Download data directly from broker API:

```matlab
df = client.history( ...
    symbol="SBIN", ...
    exchange="NSE", ...
    interval="5m", ...
    start_date="2025-04-01", ...
    end_date="2025-04-08", ...
    source="api");
head(df, 5)
```

Download data from Historify DuckDB (stored data):

```matlab
df = client.history( ...
    symbol="SBIN", ...
    exchange="NSE", ...
    interval="5m", ...
    start_date="2025-04-01", ...
    end_date="2025-04-08", ...
    source="db");
```

#### History Response

`history` returns a `timetable`:

```text
>> head(df, 5)
            timestamp            close      high      low       open       volume
    _________________________    ______    ______    ______    ______    __________

    2025-04-01 09:15:00+05:30     772.5       774     763.2     766.5    3.1862e+05
    2025-04-01 09:20:00+05:30     773.2    774.95     772.1    772.45    1.9719e+05
    2025-04-01 09:25:00+05:30    775.15     775.6     772.6     773.2    2.2754e+05
    2025-04-01 09:30:00+05:30    777.35     777.5    774.85    775.15     1.346e+05
    2025-04-01 09:35:00+05:30       778       778    776.25     777.5    1.4538e+05

>> tail(df, 5)
            timestamp            close      high      low       open       volume
    _________________________    ______    ______    ______    ______    __________

    2025-04-08 14:00:00+05:30    768.25     770.7    767.85     768.5    1.4248e+05
    2025-04-08 14:05:00+05:30     769.1     769.8     766.6    768.15    1.2828e+05
    2025-04-08 14:10:00+05:30    769.05    769.85     768.4     769.1    1.1908e+05
    2025-04-08 14:15:00+05:30    770.05     770.5    769.05    769.05     1.583e+05
    2025-04-08 14:20:00+05:30    769.95     770.5     769.4    770.05    1.2548e+05

>> height(df)

ans =

   437
```

The row times are named `timestamp`:

* For intraday intervals they are `datetime` values in the Asia/Kolkata time zone. MATLAB reports that zone under its canonical alias, so `df.Properties.RowTimes.TimeZone` shows `'Asia/Calcutta'`. It is the same zone.
* For `D`, `W` and `M` they carry no time zone.

Rows are sorted by time and duplicate timestamps are removed (the first is kept). The other columns keep the server's names (`open`, `high`, `low`, `close`, `volume`, and `oi` where the server sends it). The volume is stored exactly; `3.1862e+05` is only MATLAB's short display format.

When something goes wrong, `history` returns the usual error struct instead of a timetable, so check the type before using it:

```matlab
if istimetable(df)
    df.returns = [NaN; diff(log(df.close))];
    plot(df.timestamp, df.close)
else
    fprintf("History failed: %s\n", df.message);
end
```

With `source="db"` the server builds custom intervals (for example `2m`, `3h`, `W`, `2W`, `M`, `Q`) from its stored 1 minute and daily candles.

### Ticker Example

Historical candles for one symbol, straight from the broker, as JSON records or as plain text rows. `history` returns the same candles as a timetable and is usually the better choice for analysis in MATLAB; `ticker` is useful when you want the text rows, for example to write a file another program imports.

```matlab
response = client.ticker(symbol="RELIANCE", exchange="NSE", interval="D", ...
    start_date="2026-07-01", end_date="2026-07-31");
disp(response)
```

#### Ticker Response

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

With `format="txt"` a successful call returns the body as one character vector, one comma separated row per candle (`Ticker,Date,Open,High,Low,Close,Volume`, with the time after the date for intraday intervals). A failed call is the usual error struct, so test with `ischar`:

```matlab
rows = client.ticker(symbol="RELIANCE", exchange="NSE", interval="5m", ...
    start_date="2026-07-30", end_date="2026-07-31", format="txt");
if ischar(rows)
    writelines(rows, "RELIANCE_5m.txt");
end
```

`interval` defaults to `"D"`. The server limits the date range by interval: up to 10 years for `D`, `W` and `M`, and 30 days for intraday intervals.

### Intervals Example

```matlab
response = client.intervals();
disp(response)
```

#### Intervals Response

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

```matlab
>> response.data.minutes

ans =

  6x1 cell array

    {'10m'}
    {'15m'}
    {'1m' }
    {'30m'}
    {'3m' }
    {'5m' }
```

`client.interval()` is the legacy name for the same call, kept for compatibility.

### OptionChain Example

Note: To fetch the entire option chain for an expiry, omit the `strike_count` parameter.

```matlab
chain = client.optionchain( ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="30DEC25", ...
    strike_count=10);
```

#### OptionChain Response

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
        "symbol": "NIFTY30DEC2526100CE", "label": "ITM2",
        "ltp": 490, "bid": 490, "ask": 491,
        "open": 540, "high": 571, "low": 444.75,
        "prev_close": 496.8, "volume": 1195800, "oi": 0,
        "lotsize": 75, "tick_size": 0.05
      },
      "pe": {
        "symbol": "NIFTY30DEC2526100PE", "label": "OTM2",
        "ltp": 193, "bid": 191.2, "ask": 193,
        "open": 204.1, "high": 229.95, "low": 175.6,
        "prev_close": 215.95, "volume": 1832700, "oi": 0,
        "lotsize": 75, "tick_size": 0.05
      }
    },
    {
      "strike": 26200.0,
      "ce": {
        "symbol": "NIFTY30DEC2526200CE", "label": "ATM",
        "ltp": 427, "bid": 425.05, "ask": 427,
        "open": 449.95, "high": 503.5, "low": 384,
        "prev_close": 433.2, "volume": 2994000, "oi": 0,
        "lotsize": 75, "tick_size": 0.05
      },
      "pe": {
        "symbol": "NIFTY30DEC2526200PE", "label": "ATM",
        "ltp": 227.4, "bid": 227.35, "ask": 228.5,
        "open": 251.9, "high": 269.15, "low": 205.95,
        "prev_close": 251.9, "volume": 3745350, "oi": 0,
        "lotsize": 75, "tick_size": 0.05
      }
    }
  ]
}
```

Print one line per strike. A side that does not exist is `null` in the JSON, so it is empty in MATLAB:

```matlab
>> for k = 1:numel(chain.chain)
       item = chain.chain(k);
       ce = "-"; pe = "-";
       if ~isempty(item.ce), ce = string(item.ce.ltp); end
       if ~isempty(item.pe), pe = string(item.pe.ltp); end
       fprintf("Strike: %g | CE: %s | PE: %s\n", item.strike, ce, pe);
   end
Strike: 26100 | CE: 490 | PE: 193
Strike: 26200 | CE: 427 | PE: 227.4
```

### Symbol Example

```matlab
response = client.symbol( ...
    symbol="NIFTY30DEC25FUT", ...
    exchange="NFO");
disp(response)
```

#### Symbol Response

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
    "lotsize": 75,
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

```matlab
response = client.search(query="NIFTY 26000 DEC CE", exchange="NFO");
disp(response)
```

#### Search Response

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
      "lotsize": 75,
      "name": "NIFTY",
      "strike": 26000,
      "symbol": "NIFTY30DEC2526000CE",
      "tick_size": 5,
      "token": "NSE_FO|71399"
    }
  ],
  "message": "Found 7 matching symbols",
  "status": "success"
}
```

`exchange` is optional; leave it out to search every exchange.

### OptionSymbol Example

ATM Option:

```matlab
response = client.optionsymbol( ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="30DEC25", ...
    offset="ATM", ...
    option_type="CE");
disp(response)
```

#### OptionSymbol Response

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2525950CE",
  "exchange": "NFO",
  "lotsize": 75,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

ITM Option:

```matlab
response = client.optionsymbol( ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="30DEC25", ...
    offset="ITM3", ...
    option_type="PE");
disp(response)
```

#### OptionSymbol Response

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2526100PE",
  "exchange": "NFO",
  "lotsize": 75,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

OTM Option:

```matlab
response = client.optionsymbol( ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="30DEC25", ...
    offset="OTM4", ...
    option_type="CE");
disp(response)
```

#### OptionSymbol Response

```json
{
  "status": "success",
  "symbol": "NIFTY30DEC2526150CE",
  "exchange": "NFO",
  "lotsize": 75,
  "tick_size": 5,
  "freeze_qty": 1800,
  "underlying_ltp": 25966.4
}
```

The `strategy` and `strike_int` parameters of `optionsymbol` are deprecated: they are still sent when given, with an `openalgo:deprecated` warning.

### SyntheticFuture Example

```matlab
response = client.syntheticfuture( ...
    underlying="NIFTY", ...
    exchange="NSE_INDEX", ...
    expiry_date="25NOV25");
disp(response)
```

#### SyntheticFuture Response

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

```matlab
>> basis = response.synthetic_future_price - response.underlying_ltp

basis =

   70.0000
```

### OptionGreeks Example

```matlab
response = client.optiongreeks( ...
    symbol="NIFTY25NOV2526000CE", ...
    exchange="NFO", ...
    interest_rate=0.00, ...
    underlying_symbol="NIFTY", ...
    underlying_exchange="NSE_INDEX");
disp(response)
```

#### OptionGreeks Response

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

Optional arguments: `interest_rate` (percent), `forward_price` (price against a custom forward instead of fetching the underlying), `underlying_symbol`, `underlying_exchange` and `expiry_time` (`"HH:MM"`). Leave any of them out (or `[]`) and it is not sent.

### MultiOptionGreeks Example

Implied volatility and Greeks (Black-76) for up to 50 options in one request, for example both legs of a straddle or a whole strike ladder. Use `optiongreeks` for a single option.

```matlab
response = client.multioptiongreeks( ...
    symbols={ ...
        struct("symbol", "NIFTY30JUL2625000CE", "exchange", "NFO"), ...
        struct("symbol", "NIFTY30JUL2625000PE", "exchange", "NFO")}, ...
    interest_rate=7.0);
disp(response)
```

#### MultiOptionGreeks Response

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
      "greeks": {"delta": 0.52, "gamma": 0.0001, "theta": -4.97, "vega": 30.76, "rho": 0.001}
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
      "greeks": {"delta": -0.48, "gamma": 0.0001, "theta": -4.12, "vega": 30.41, "rho": -0.001}
    }
  ],
  "summary": {"total": 2, "success": 2, "failed": 0}
}
```

The options can also be given as a struct array, one option per element:

```matlab
>> legs = struct("symbol", {"NIFTY30JUL2625000CE", "NIFTY30JUL2625000PE"}, "exchange", "NFO");
>> greeks = client.multioptiongreeks(symbols=legs, interest_rate=7.0);
>> arrayfun(@(x) x.greeks.delta, greeks.data)'

ans =

    0.5200   -0.4800
```

* Each option needs `symbol` and `exchange` (NFO, BFO, CDS, MCX or CRYPTO); `underlying_symbol` and `underlying_exchange` are optional overrides. `expiry_time="HH:MM"` sets the expiry time for every option (for example `"23:30"` for MCX).
* The client checks the list before sending: 1 to 50 options. Otherwise it returns a `validation_error` struct (`'Symbols array cannot be empty'`, `'Maximum 50 symbols allowed'`) without calling the server.
* One option can fail while the rest succeed. The top-level `status` is then `"partial"` and the response is returned as is, so read `summary` and each item's `status` rather than the top-level status alone. A failed item has different fields, which makes `data` a cell array (see [Reading responses](#reading-responses)). When every option fails the server answers `"status": "error"`, which the client returns as an `api_error` struct with the server's message.

### Expiry Example

```matlab
response = client.expiry( ...
    symbol="NIFTY", ...
    exchange="NFO", ...
    instrumenttype="options");
disp(response)
```

#### Expiry Response

```json
{
  "data": [
    "10-JUL-25", "17-JUL-25", "24-JUL-25", "31-JUL-25",
    "07-AUG-25", "28-AUG-25", "25-SEP-25", "24-DEC-25",
    "26-MAR-26", "25-JUN-26", "31-DEC-26", "24-JUN-27",
    "30-DEC-27", "29-JUN-28", "28-DEC-28", "28-JUN-29",
    "27-DEC-29", "25-JUN-30"
  ],
  "message": "Found 18 expiry dates for NIFTY options in NFO",
  "status": "success"
}
```

```matlab
>> response.data{1}

ans =

    '10-JUL-25'
```

`response.data` is an 18x1 cell array of character vectors.

### Instruments Example

`instruments` returns a MATLAB `table`. Omit `exchange` to download every exchange in one call, which is a large download, so pass an exchange when you only need one.

```matlab
nse = client.instruments(exchange="NSE");
tail(nse(:, ["symbol" "name" "lotsize" "tick_size" "token"]), 5)
```

#### Instruments Response

```text
       symbol                  name               lotsize    tick_size         token
    ____________    __________________________    _______    _________    ________________

    "NEOGEN"        "NEOGEN CHEMICALS LIMITED"       1          0.1       "10100000009917"
    "ALANKIT"       "ALANKIT LIMITED"                1         0.01       "10100000009921"
    "EVERESTIND"    "EVEREST INDUSTRIES LTD"         1         0.05       "1010000000993"
    "VIKASLIFE"     "VIKAS LIFECARE LIMITED"         1         0.01       "10100000009931"
    "ONEPOINT"      "ONE POINT ONE SOL LTD"          1         0.01       "10100000009939"
```

The columns are `symbol`, `brsymbol`, `name`, `exchange`, `token`, `expiry`, `strike`, `lotsize`, `instrumenttype` and `tick_size`; text columns are string arrays. With no exchange, `client.instruments()` downloads NSE, BSE, NFO, BFO, MCX, CDS, BCD, NSE_INDEX and BSE_INDEX and combines them into one table; an exchange that fails is skipped.

```matlab
equities = nse(nse.instrumenttype == "EQ", :);
writetable(nse, "nse_instruments.csv");
```

### Telegram Alert Example

```matlab
response = client.telegram( ...
    username="<openalgo_loginid>", ...
    message="NIFTY crossed 26000!");
disp(response)
```

#### Telegram Alert Response

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

`priority` (1 to 10, default 5) marks how urgent the alert is. The username is your OpenAlgo login, not your Telegram handle, and the account must be linked with `/link` in the OpenAlgo Telegram bot. For a message over several lines, build it with `sprintf`: `sprintf("Daily Summary\nWinning Trades: 8\nLosing Trades: 2")`.

### WhatsApp Alert Example

Prerequisites: open `/whatsapp` in the OpenAlgo web UI, click **Pair**, and scan the QR code with your phone. With no recipient the message goes to yourself:

```matlab
response = client.whatsapp("NIFTY crossed 26000!");
disp(response)
```

#### WhatsApp Alert Response

```json
{
  "status": "success",
  "message": "Delivered to 1, failed 0",
  "data": {"sent": ["<self>"], "failed": [], "skipped": 0}
}
```

Other forms:

```matlab
% One number (E.164 digits)
client.whatsapp("Are you free for a quick call?", to="919876543210");

% A small broadcast (up to 5 numbers)
client.whatsapp("Server maintenance in 10 minutes", ...
    to=["919876543210" "919812345678"]);

% An OpenAlgo user linked to WhatsApp
client.whatsapp("Daily P&L report attached", username="alice", ...
    document="/srv/reports/2026-05-17.pdf", filename="summary.pdf");

% An image with a caption (the path is on the OpenAlgo server, not uploaded)
client.whatsapp("NIFTY end-of-day chart", image="/srv/charts/nifty_eod.png");

% Fire and forget: returns as soon as the message is queued
client.whatsapp("Stop-loss hit on BANKNIFTY!", wait_for_delivery=false);
```

With `wait_for_delivery=false` the response is `{"status": "success", "message": "Queued for 1 recipient(s)", "queued": 1}`.

`to` as a list (a cell array, or a string array with more than one element) is always sent as a JSON array, even with one number (`to={"919876543210"}`).

A one-word message followed by exactly one more value is ambiguous in MATLAB: `client.whatsapp("note", "x")` reads as the extra field `note="x"` with no message. Name the message when it is a single word: `client.whatsapp(message="Done", to="919876543210")`.

### Telegram Bot Management Example

`telegram` sends you an alert. These methods manage the OpenAlgo Telegram bot itself: its configuration, starting and stopping it, the linked users and their preferences.

```matlab
% Read the configuration (the server masks the bot token)
client.telegramconfig()

% Change only the fields you pass
client.updatetelegramconfig(polling_mode=true, rate_limit_per_minute=30);

% Start and stop the bot
client.telegramstart();
client.telegramstop();
```

#### TelegramConfig Response

```json
{
  "status": "success",
  "data": {
    "bot_token": "1234567890...",
    "is_active": true,
    "bot_username": "your_openalgo_bot",
    "max_message_length": 4096,
    "rate_limit_per_minute": 30,
    "broadcast_enabled": true
  }
}
```

`updatetelegramconfig`, `telegramstart` and `telegramstop` answer with a status and a message, for example `{"status": "success", "message": "Bot started successfully"}`. `updatetelegramconfig` accepts `token`, `webhook_url`, `polling_mode`, `broadcast_enabled` and `rate_limit_per_minute` (1 to 120). `telegramstart` needs a bot token in the configuration ("Bot token not configured" otherwise). A stopped bot also stops the automatic order alerts, and `telegram()` is refused with HTTP 409 ("Telegram bot is stopped"). These endpoints answer an invalid or missing API key with HTTP 401.

```matlab
% Linked users, optionally filtered by broker or notification setting
client.telegramusers()
client.telegramusers(notifications_enabled=true)
```

#### TelegramUsers Response

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "telegram_id": 123456789,
      "openalgo_username": "<openalgo_loginid>",
      "first_name": "Your",
      "last_name": "Name",
      "telegram_username": "your_telegram_handle",
      "broker": "yourbroker",
      "notifications_enabled": true,
      "created_at": "Tue, 06 Oct 2026 09:12:44 GMT",
      "last_command_at": "Fri, 16 Oct 2026 08:58:10 GMT"
    }
  ],
  "count": 1
}
```

```matlab
% Bot command statistics for the last 30 days (the server uses 7 when days is not given)
client.telegramstats(30)          % or client.telegramstats(days=30)
```

#### TelegramStats Response

```json
{
  "status": "success",
  "data": {
    "total_commands": 42,
    "commands_by_type": {"orderbook": 18, "positions": 15, "pnl": 9},
    "active_users": 1,
    "top_users": [["your_telegram_handle", 42]],
    "period_days": 30
  }
}
```

`top_users` mixes text and numbers, so it decodes to nested cell arrays: `response.data.top_users{1}{1}` is the handle and `response.data.top_users{1}{2}` the count.

```matlab
% One user's notification preferences
client.telegrampreferences(123456789)

% Change only the preferences you pass
client.updatetelegrampreferences(123456789, daily_summary=true, summary_time="16:00");
```

#### TelegramPreferences Response

```json
{
  "status": "success",
  "data": {
    "order_notifications": true,
    "trade_notifications": true,
    "pnl_notifications": true,
    "daily_summary": true,
    "summary_time": "16:00",
    "language": "en",
    "timezone": "Asia/Kolkata"
  }
}
```

`updatetelegrampreferences` accepts `order_notifications`, `trade_notifications`, `pnl_notifications`, `daily_summary`, `summary_time` (`"HH:MM"`), `language` and `timezone`, and answers `{"status": "success", "message": "Preferences updated successfully"}`.

```matlab
client.telegrambroadcast(message="Markets open in 15 minutes")
```

#### TelegramBroadcast Response

```json
{
  "status": "success",
  "message": "Broadcast sent to 0 users, failed for 0 users",
  "success_count": 0,
  "fail_count": 0
}
```

The current server validates a broadcast but does not deliver it yet, so it reports zero deliveries. A message can be up to 4096 characters (an empty or longer one is refused locally as a `validation_error`), the server allows 5 broadcasts per minute, and it refuses them (HTTP 403) when broadcasting is disabled in the bot configuration. `filters` (a struct) is passed through for user filtering.

### Funds Example

```matlab
response = client.funds();
disp(response)
```

#### Funds Response

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

```matlab
>> str2double(response.data.availablecash)

ans =

  320.6600
```

### Margin Example

```matlab
response = client.margin(positions={ ...
    struct( ...
        "symbol", "NIFTY25NOV2525000CE", ...
        "exchange", "NFO", ...
        "action", "BUY", ...
        "product", "NRML", ...
        "pricetype", "MARKET", ...
        "quantity", "75"), ...
    struct( ...
        "symbol", "NIFTY25NOV2525500CE", ...
        "exchange", "NFO", ...
        "action", "SELL", ...
        "product", "NRML", ...
        "pricetype", "MARKET", ...
        "quantity", "75")});
disp(response)
```

#### Margin Response

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

`positions` must be a list of 1 to 50 positions. An empty list or more than 50 positions is refused before anything is sent, with `error_type` `'validation_error'`. `quantity`, `price` and `trigger_price` are sent as text, and a missing `price` or `trigger_price` is sent as `"0"`.

### OrderBook Example

```matlab
response = client.orderbook();
disp(response)
```

#### OrderBook Response

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

`struct2table(response.data.orders)` turns the orders into a table.

### TradeBook Example

```matlab
response = client.tradebook();
disp(response)
```

#### TradeBook Response

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
      "quantity": 0.0,
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
      "quantity": 0.0,
      "average_price": 83.74,
      "timestamp": "14:28:49",
      "trade_value": 83.74
    }
  ]
}
```

### PositionBook Example

```matlab
response = client.positionbook();
disp(response)
```

#### PositionBook Response

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

A list of records with the same fields is a struct array, which turns into a table in one line:

```matlab
>> positions = struct2table(response.data);
>> positions(:, ["symbol" "quantity" "pnl"])

ans =

  3x3 table

       symbol       quantity       pnl
    ____________    ________    __________

    {'NHPC'    }    {'-1'  }    {'0.02'  }
    {'RELIANCE'}    {'0'   }    {'5.90'  }
    {'YESBANK' }    {'-104'}    {'-10.44'}

>> str2double(positions.pnl)'

ans =

    0.0200    5.9000  -10.4400
```

### Holdings Example

```matlab
response = client.holdings();
disp(response)
```

#### Holdings Response

```json
{
  "status": "success",
  "data": {
    "holdings": [
      {"symbol": "RELIANCE",  "exchange": "NSE", "product": "CNC", "quantity": 1, "pnl": -149.0, "pnlpercent": -11.10},
      {"symbol": "TATASTEEL", "exchange": "NSE", "product": "CNC", "quantity": 1, "pnl": -15.0,  "pnlpercent": -10.41},
      {"symbol": "CANBK",     "exchange": "NSE", "product": "CNC", "quantity": 5, "pnl": -69.0,  "pnlpercent": -13.43}
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

### PnLSymbols Example

Today's realized and unrealized P&L of the open sandbox positions, one entry per symbol. It works only while analyzer (sandbox) mode is on; in live mode the server answers HTTP 400 ("This endpoint is only available in sandbox/analyzer mode").

```matlab
response = client.pnlsymbols();
disp(response)
```

#### PnLSymbols Response

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

```matlab
>> response.total_pnl_today

ans =

  125.5000
```

### Holidays Example

```matlab
response = client.holidays(2026);       % or client.holidays(year=2026)
disp(response)
```

#### Holidays Response

```json
{
  "data": [
    {
      "closed_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "BCD", "MCX"],
      "date": "2026-01-26",
      "description": "Republic Day",
      "holiday_type": "TRADING_HOLIDAY",
      "open_exchanges": []
    },
    {
      "closed_exchanges": [],
      "date": "2026-02-19",
      "description": "Chhatrapati Shivaji Maharaj Jayanti",
      "holiday_type": "SETTLEMENT_HOLIDAY",
      "open_exchanges": []
    },
    {
      "closed_exchanges": ["NSE", "BSE", "NFO", "BFO", "CDS", "BCD"],
      "date": "2026-03-10",
      "description": "Holi",
      "holiday_type": "TRADING_HOLIDAY",
      "open_exchanges": [
        {"end_time": 1741677900000, "exchange": "MCX", "start_time": 1741624200000}
      ]
    }
  ]
}
```

Leave `year` out for the current year.

### Timings Example

```matlab
response = client.timings("2025-12-19");    % or client.timings(date="2025-12-19")
disp(response)
```

#### Timings Response

```json
{
  "data": [
    {"end_time": 1766138400000, "exchange": "NSE", "start_time": 1766115900000},
    {"end_time": 1766138400000, "exchange": "BSE", "start_time": 1766115900000},
    {"end_time": 1766138400000, "exchange": "NFO", "start_time": 1766115900000},
    {"end_time": 1766138400000, "exchange": "BFO", "start_time": 1766115900000},
    {"end_time": 1766168700000, "exchange": "MCX", "start_time": 1766115000000},
    {"end_time": 1766143800000, "exchange": "BCD", "start_time": 1766115000000},
    {"end_time": 1766143800000, "exchange": "CDS", "start_time": 1766115000000}
  ],
  "status": "success"
}
```

Times are epoch milliseconds. Leave `date` out for today. An empty `data` list means the market is closed that day. To convert a time:

```matlab
>> datetime(response.data(1).start_time / 1000, ConvertFrom="posixtime", TimeZone="Asia/Kolkata")

ans =

  datetime

   19-Dec-2025 09:15:00
```

### Analyzer Status Example

```matlab
response = client.analyzerstatus();
disp(response)
```

#### Analyzer Status Response

```json
{
  "data": {"analyze_mode": true, "mode": "analyze", "total_logs": 2},
  "status": "success"
}
```

### Analyzer Toggle Example

```matlab
% Switch to analyze mode (simulated responses)
response = client.analyzertoggle(true);     % or client.analyzertoggle(mode=true)
disp(response)
```

#### Analyzer Toggle Response

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

Analyzer mode (sandbox mode) simulates orders instead of sending them to the broker, with sandbox capital, and responses then carry `"mode": "analyze"`. `client.analyzertoggle(false)` switches back to live orders. Always confirm analyzer mode before running a test script against a broker-connected server. Simulated MARKET orders need a live price, so they fail while the market is closed; use LIMIT orders to test on holidays. GTT triggers placed in analyzer mode carry a `GTT-...` trigger id and fire against live LTP exactly as they would at the broker.

### Chart Preferences Example

The chart workspace preferences OpenAlgo stores for your API key. Every name=value pair of `updatechart` is one preference; only the preferences you pass are changed.

```matlab
client.updatechart(tv_theme="dark", tv_chart_layout=struct("interval", "15m"));
```

#### UpdateChart Response

```json
{
  "status": "success",
  "message": "Preferences updated successfully"
}
```

```matlab
response = client.chart();
disp(response)
```

#### Chart Response

```json
{
  "status": "success",
  "data": {
    "tv_theme": "dark",
    "tv_chart_layout": {"interval": "15m"}
  }
}
```

`updatechart` needs 1 to 50 preferences with names of at most 50 characters; anything else is returned as a `validation_error` struct without calling the server. Preference names that are not valid MATLAB names are renamed by `jsondecode` when you read them back with `chart`.

### Error Handling

The client **returns** failures instead of raising them, so a trading loop handles a failed order the same way it handles a successful one. A failure is a struct with `status` `'error'`, a `message` and an `error_type`:

```matlab
>> response = client.funds()

response =

  struct with fields:

        status: 'error'
       message: 'Failed to connect to the server. Please check if the server is running.'
    error_type: 'connection_error'
```

| `error_type` | Cause |
|--------------|-------|
| `connection_error` | The server could not be reached |
| `timeout_error` | The server did not answer within `timeout` seconds |
| `http_error` | A non-200 HTTP status (`'HTTP 403: ...'`, with `code`) or another transport failure |
| `api_error` | The server answered `"status": "error"` (its `message`, plus `code`) |
| `json_error` | The server's answer was not valid JSON (with `raw_response`) |
| `validation_error` | Refused locally before sending (GTT trigger rules, margin positions, the option list of `multioptiongreeks`, the preferences of `updatechart`, the message of `telegrambroadcast`) |
| `no_data` | `history` or `instruments` returned nothing |
| `processing_error` | Candles or instruments could not be converted to a timetable or table (with `raw_data`) |
| `unknown_error` | Anything else, including a call after `client.close()` |

For example, an invalid API key on `ping`:

```matlab
>> response = client.ping()

response =

  struct with fields:

        status: 'error'
       message: 'HTTP 403: {"status":"error","message":"Invalid openalgo apikey"}'
          code: 403
    error_type: 'http_error'
```

A typical check:

```matlab
response = client.placeorder(strategy="Test Strategy", symbol="NHPC", action="BUY", ...
    exchange="NSE", price_type="MARKET", product="MIS", quantity=1);

if strcmp(response.status, "success")
    fprintf("Order placed: %s\n", response.orderid);
else
    fprintf("Order failed (%s): %s\n", response.error_type, response.message);
end
```

`history` and `instruments` return a timetable or table on success, so test them with `istimetable` and `istable` first; `ticker(format="txt")` returns a character vector on success, so test it with `ischar`.

Programming mistakes are MATLAB errors, so they stop a script instead of reaching the broker. Each call below raises an error with the message shown under it:

```matlab
client.placeorder(symbol="NHPC", action="BUY")
% placeorder() missing 1 required keyword-only argument: 'exchange'

client.quotes("RELIANCE", "NSE")
% quotes() missing 2 required keyword-only arguments: 'symbol' and 'exchange'

client.strategystart(strategy_id=7)
% strategystart() missing 1 required keyword-only argument: 'mode'

client.holidays(2026, foo=1)
% holidays() got an unexpected keyword argument 'foo'
```

(`client.quotes("RELIANCE", "NSE")` reads `"RELIANCE"` as a parameter name, so both required parameters are missing. Use `client.quotes(symbol="RELIANCE", exchange="NSE")`.)

Every error has an identifier you can test in `try`/`catch`:

| Identifier | Raised when |
|------------|-------------|
| `openalgo:missingArgument` | A required parameter is missing |
| `openalgo:unexpectedArgument` | An unknown name on a method that takes no extra fields |
| `openalgo:duplicateArgument` | The same parameter is given twice |
| `openalgo:invalidArguments` | The argument list cannot be parsed (for example too many positional values) |
| `openalgo:typeError` | A value of the wrong kind, for example `orders` that is not a list |
| `openalgo:valueError` | An invalid value, for example `openalgo.Strategy` without a token |
| `openalgo:clientClosed` | `send` on a closed `openalgo.Strategy` |
| `openalgo:notImplemented` | The removed `Strategy.strategyorder` |
| `openalgo:FeedAPI:badArgument`, `openalgo:FeedAPI:missingArgument` | Wrong arguments to a feed method |

```matlab
try
    response = client.placeorder(symbol="NHPC", action="BUY");
catch ME
    if strcmp(ME.identifier, "openalgo:missingArgument")
        fprintf("Fix the call: %s\n", ME.message);
    else
        rethrow(ME);
    end
end
```

Deprecated parameters (`strike_int` on the option methods and `strategy` on `optionsymbol`) still work and warn with the identifier `openalgo:deprecated`. Silence the warning with `warning("off", "openalgo:deprecated")`.

### Strategy Module

OpenAlgo's `/strategy` module runs multi-leg options strategies with end-to-end risk management, plus a signal-driven mode for TradingView alerts. Two surfaces reach it, and they take different credentials:

| Surface | Credential | Use for |
|---------|-----------|---------|
| `openalgo.api(api_key=...)` | Your OpenAlgo API key | Lifecycle and reads: list, status, start, stop, close_all, close_leg, runs, orders, events |
| `openalgo.Strategy(...)` | The strategy's `oaws_` webhook token | The public webhook at `/strategy/webhook/<token>`, which is what TradingView posts to |

Building a strategy stays in the browser wizard at `/strategy`. The API-key surface is lifecycle plus reads only: nothing on it can create a strategy, edit its configuration, enable live trading, rotate a webhook token, or delete anything.

Two strategy kinds, and each refuses the other's vocabulary:

* **batch**: a multi-leg spread entered and exited as a unit. `start` / `stop`.
* **signal**: one alert moves one leg. `long_entry` / `long_exit` / `short_entry` / `short_exit`. There is no start and no mode: the first signal after the platform session boundary opens the run.

Four rules worth knowing before you call anything:

1. **`mode` on start is required and is never defaulted**, in the library or on the server. Omitting it raises `openalgo:missingArgument` (`strategystart() missing 1 required keyword-only argument: 'mode'`) rather than placing a live order.
2. **Live is opt-in per strategy.** A strategy is created sandbox-only, and `mode="live"` is refused with a 409 until the operator enables live trading on the strategy page.
3. **An accepted stop is not proof of flatness.** Read `stop_pending` and the per-leg outcomes; never infer flatness from the HTTP status.
4. **A strategy that is not yours answers 404**, identical to one that does not exist, so the id space cannot be probed.

When the server answers with an HTTP error, the strategy methods return its JSON body with the status code attached as `code`, because that body holds the part you must act on:

```matlab
>> r = client.strategystart(strategy_id=7, mode="sandbox")

r =

  struct with fields:

          status: 'error'
         message: 'Strategy is already running'
    stop_pending: 0
            code: 409
```

### StrategyList Example

```matlab
response = client.strategylist();
disp(response)

% Optional filters. An out-of-vocabulary status is a 400, not an empty list.
client.strategylist(status="running");
client.strategylist(q="NIFTY");
```

#### StrategyList Response

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

The list form omits `legs`; call `strategystatus` for one strategy's legs. For a stopped strategy, `last_finalized_run.pnl_realized` is the durable final P&L.

### StrategyStatus Example

```matlab
response = client.strategystatus(strategy_id=7);
disp(response)
```

#### StrategyStatus Response

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

`run` is empty (`[]`, JSON `null`) whenever the strategy has no current run, which is the normal state of a stopped strategy. Prefer it over the strategy's own `status` when you need to know whether anything is actually open:

```matlab
if isempty(response.run)
    disp("Nothing open")
end
```

A populated `stop_requested_reason` means a stop is durable but not yet confirmed flat: the run is still current and still managed. The keys of `resolved_expiries` are leg ids, which are not valid MATLAB names, so `jsondecode` renames them: leg 1 is `response.run.resolved_expiries.x1`.

### StrategyStart Example

Starts a **batch** strategy: every leg's entry order is placed.

```matlab
response = client.strategystart(strategy_id=7, mode="sandbox");
disp(response)

% Partial success is a 200. Check each leg rather than assuming they all
% reached the market.
legs = response.legs;
if isstruct(legs)
    legs = num2cell(legs);
end
for k = 1:numel(legs)
    if ~isequal(legs{k}.ok, true)
        fprintf("leg %d rejected: %s\n", legs{k}.leg_id, legs{k}.error);
    end
end
```

#### StrategyStart Response

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

`ok = true` with `acknowledged = false` is a real broker order whose id could not be written back, not a rejection: it reconciles itself. A second start against a running strategy answers 409, so two triggers firing at once cannot both place a full set of entries.

### StrategyStop Example

Exits every owned position at market.

```matlab
response = client.strategystop(strategy_id=7);
disp(response)
```

#### StrategyStop Response

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

`stop_pending = true` means the request is durable and its exits were accepted, but the run stays open, subscribed and managed until fills prove every position is flat. A 409 can also carry `stop_pending = true` when an unfilled entry or a refused exit still needs management: retry the stop in that case.

```matlab
if isfield(response, "stop_pending") && response.stop_pending
    % exits accepted but not yet filled
end
```

### StrategyCloseAll Example

Same stop mechanics as `strategystop`, different audit intent: a `close_all_manual` event is written first, which proves an operator asked for a flatten.

```matlab
response = client.strategycloseall(strategy_id=7);
disp(response)
```

The response has the same shape as `strategystop`.

### StrategyCloseLeg Example

Exits one leg at market; the run continues with the rest. `leg_id` is the id the wizard assigned within the strategy, the same value that appears in `legs(i).id` on `strategystatus`. It is not an order id.

```matlab
response = client.strategycloseleg(strategy_id=7, leg_id=2);
disp(response)
```

#### StrategyCloseLeg Response

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

`run_stopped` reports only what this call could prove. A live broker normally acknowledges before its fill, so even the last accepted exit returns `false` and the fill finalises the run later. A `leg_id` that names no open leg is a 409, not a 404.

### StrategyRuns Example

Every activation of a strategy, newest first.

```matlab
response = client.strategyruns(strategy_id=7, limit=10);
disp(response)
```

#### StrategyRuns Response

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

`limit` is 1 to 500 and is bounded rather than clamped: a value outside the range is a 400, so you learn it was refused. An overall threshold triggers an exit, it does not promise the result: market exits fill at the available bid/ask, so `pnl_realized` can differ from the threshold that caused the stop.

### StrategyOrders Example

Every order the engine placed, oldest first, so an entry always precedes its exit.

```matlab
response = client.strategyorders(strategy_id=7);

% Narrow a long history to one run. A run belonging to another strategy matches
% nothing rather than leaking its orders.
response = client.strategyorders(strategy_id=7, run_id=42);
disp(response)
```

#### StrategyOrders Response

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
      "qty": 75,
      "product": "NRML",
      "pricetype": "MARKET",
      "price": 0.0,
      "status": "complete",
      "placed_at": "2026-08-30T03:50:11.610224+00:00",
      "filled_at": "2026-08-30T03:50:12.004881+00:00",
      "avg_fill_price": 142.35,
      "filled_qty": 75,
      "reject_reason": null
    }
  ]
}
```

A row is written **before** the broker answers, so an order can appear with `status = "pending"` and an empty `broker_order_id`. That is deliberate: an order that reached the broker but was never recorded would be invisible to crash recovery.

### StrategyEvents Example

The risk-event audit trail, newest first. The trail is append-only.

```matlab
response = client.strategyevents(strategy_id=7, limit=100);

% Filters. An out-of-vocabulary kind or severity is a 400, not an empty list.
client.strategyevents(strategy_id=7, run_id=42);
client.strategyevents(strategy_id=7, severity="critical");
client.strategyevents(strategy_id=7, kind="run_stop_failed");
```

#### StrategyEvents Response

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
|------|----------|---------|
| `run_stop_requested` | info | The stop is durable and new signal entries are gated. Not proof the broker is flat |
| `run_stop_failed` | critical | The broker refused a stop's exits and the run is **still holding** those positions |
| `order_ack_unrecorded` | critical | The broker accepted an order but its acknowledgement could not be written; it reconciles itself |
| `leg_expiry_fallback` | warn | The chain did not list the expiry rank the leg asked for, so a nearer one was used |
| `flip_outgoing_exit_rejected` | critical | The outgoing side of a signal flip is still held |

### Strategy Webhook Example

The public webhook at `/strategy/webhook/<token>` is what TradingView and other alert senders post to. It is not under `/api/v1` and takes no API key: the `oaws_` token in the URL is the whole credential. It is shown exactly once, in the browser, when the strategy is created or its token is rotated; no endpoint returns it. Treat it as a password, and keep it out of scripts you share (for example read it with `getenv("OPENALGO_WEBHOOK_TOKEN")`).

`openalgo.Strategy` speaks the webhook's protocol:

```matlab
s = openalgo.Strategy("http://127.0.0.1:5000", ...
    webhook_token="oaws_your_webhook_token_here");

% Batch strategy: mode is required on start and never defaulted
disp(s.start("sandbox"))        % or s.start(mode="sandbox")
disp(s.stop())
```

#### Webhook Start Response

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy start accepted",
  "strategy_id": 7,
  "run_id": 42
}
```

```matlab
% Signal strategy: one alert moves one leg. Name the leg by id, or by symbol
% and exchange. leg_id wins when both are given.
s.long_entry(leg_id=1);
s.long_exit(leg_id=1);
s.short_entry(symbol="RELIANCE", exchange="NSE");
s.short_exit(symbol="RELIANCE", exchange="NSE");
```

Every documented outcome is **returned, not raised**, because the `result` label is the contract:

```matlab
response = s.start("sandbox");
result = "";
if isfield(response, "result")
    result = string(response.result);
end

switch result
    case "ok"
        fprintf("accepted, run %d\n", response.run_id);
    case "rejected_dedupe"
        disp("duplicate delivery within 60s, already handled")    % HTTP 200
    case "rejected_cooling_off"
        disp("stopped within the last 30s, try again shortly")    % HTTP 409
    case "rejected_live_disabled"
        disp("enable live trading on the strategy page first")    % HTTP 403
end
```

A signal that does nothing is a **success with a note**, not a failure: `Signal accepted (already_long)`. The notes are `already_long`, `already_short`, `no_matching_position`, `outside_entry_window` and `outside_trading_window`. Reporting a no-op as a failure invites a retry, and a retry on an order path is how one alert becomes two positions. Being *refused* is different: a signal blocked by the strategy's direction, or naming a leg that does not exist, answers `rejected_invalid_action` with the engine's own message.

Other members of the webhook object:

* `openalgo.Strategy(host_url, webhook_id)` also takes the token by position; `webhook_token` (name=value only) wins when both are given. `timeout` (name=value, default 30 seconds) sets the request timeout.
* `s.signal(action, leg_id=..., symbol=..., exchange=...)` sends any of the four signal actions by name, for example `s.signal("long_entry", leg_id=1)`.
* `s.send(payload)` posts a raw struct.
* `s.webhook_url` is the full URL. It embeds the token, so do not log it.
* `s.close()` releases the sender; a later `send` raises `openalgo:clientClosed`.
* `openalgo.Strategy` with no token raises `openalgo:valueError`, and `s.start()` with no mode raises `openalgo:missingArgument`.
* `s.strategyorder()` was removed (the webhook it posted to no longer exists) and always raises `openalgo:notImplemented`, naming the replacements.
* Displaying the object never shows the token:

```matlab
>> s

s =

  Strategy(host_url='http://127.0.0.1:5000', webhook_token=<redacted>)
```

See the [Strategy RMS API](../api-documentation/v1/strategy-rms-api/README.md) for every field of the nine strategy methods above.

### Streaming WebSocket Feed

The feed streams live data from the OpenAlgo WebSocket server (port 8765 by default): LTP, full quotes, market depth, and the account's order updates.

MATLAB runs your code on one thread. The client reads the WebSocket from a MATLAB `timer` every 0.05 seconds, and your callbacks run on the main MATLAB thread:

* **At the command prompt** the timer runs whenever MATLAB is idle, so data arrives and callbacks fire on their own after `client.connect()`.
* **In a script or function**, callbacks fire during `pause`, so `pause(10)` keeps receiving data for ten seconds. `client.wait(10)` does the same and also runs a due reconnect attempt; use either one in `matlab -batch` scripts. A long computation without `pause` delays the feed until it finishes.
* **Call `client.disconnect()` when you are done.** The feed timers hold a reference to the client until then.

Keep callbacks short, and do not call `wait`, `connect`, `get_broker_info`, `get_supported_brokers` or `ws_ping` from inside a callback. An error inside a callback is caught so the feed keeps running; it is logged as `[ERROR]  LTP callback error: ...` at `verbose=1` and is silent at `verbose=0`.

To make sure the feed is closed even when a script stops with an error or Ctrl+C, run it inside a function with an `onCleanup` object:

```matlab
function runFeed()
    client = openalgo.api(api_key=getenv("OPENALGO_API_KEY"));
    cleanup = onCleanup(@() client.disconnect());
    client.connect();
    client.subscribe_ltp({struct("exchange", "NSE", "symbol", "RELIANCE")}, ...
        @(d) fprintf("%s %g\n", d.symbol, d.data.ltp));
    client.wait(60);
end
```

`connect()` returns `true` once the connection is authenticated. `subscribe_*` and `unsubscribe_*` return `true` when the request was sent and `false` otherwise (for example when not connected). Instruments are a cell array of structs or a struct array with `exchange` and `symbol` fields (`struct("exchange", {"NSE", "NSE"}, "symbol", {"RELIANCE", "INFY"})`); an `exchange_token` field is used as the symbol when `symbol` is empty.

### Connecting to a Hosted Server (wss)

When OpenAlgo runs on your own domain behind HTTPS (a cloud server with a domain name and a TLS certificate), the WebSocket feed is served on the same domain at the path `/ws`, over secure WebSocket (`wss://`), not on port 8765. Give the client the `https://` address and the feed URL follows from it:

```matlab
>> client = openalgo.api(api_key="your_api_key", host="https://yourdomain.com");
>> client.ws_url

ans =

    'wss://yourdomain.com/ws'
```

| `host` | Feed URL the client derives |
|--------|-----------------------------|
| `http://127.0.0.1:5000` | `ws://127.0.0.1:8765` (`ws_port` sets the port) |
| `https://yourdomain.com` | `wss://yourdomain.com/ws` (`ws_port` is not used) |
| `https://yourdomain.com:8443` | `wss://yourdomain.com:8443/ws` |

If your server serves the feed at a different address, pass `ws_url`; it always wins over `host` and `ws_port`:

```matlab
client = openalgo.api(api_key="your_api_key", host="https://yourdomain.com", ...
    ws_url="wss://feed.yourdomain.com/ws");
```

For `wss://` the library uses the first available TLS provider:

1. **.NET** on Windows (the default there). Nothing to install.
2. **MATLAB's Python interface** with Python 3.9 to 3.13, used on macOS and Linux. Point MATLAB at it once with `pyenv(Version="/usr/bin/python3.12")`.
3. **Java**, when MATLAB runs with the JVM (the normal desktop and `-batch` sessions; not `-nojvm`).

The server certificate and host name are always verified, with every provider. A local `ws://` feed needs none of these. To force one provider, set `client.tls_transport = "dotnet"` (or `"python"`, `"java"`) before `connect()`. When none is available, `connect()` returns `false` and, at `verbose=1`, logs which options exist.

If your server's certificate comes from a private CA (not one the operating system trusts), give the client that CA as a PEM file before `connect()`. It is trusted in addition to the system trust store, and the host name is still checked:

```matlab
client.tls_ca_file = "C:\certs\my-private-ca.pem";
client.connect();
```

### LTP Data (Streaming Websocket)

```matlab
% Initialize OpenAlgo client
client = openalgo.api( ...
    api_key="your_api_key", ...                 % Replace with your actual OpenAlgo API key
    host="http://127.0.0.1:5000", ...           % REST API host
    ws_url="ws://127.0.0.1:8765");              % WebSocket host

% Define instruments to subscribe for LTP
instruments = { ...
    struct("exchange", "NSE", "symbol", "RELIANCE"), ...
    struct("exchange", "NSE", "symbol", "INFY")};

% Callback function for LTP updates
onLtp = @(data) fprintf("LTP Update Received: %s %s %g\n", ...
    data.exchange, data.symbol, data.data.ltp);

% Connect and subscribe
client.connect();
client.subscribe_ltp(instruments, onLtp);   % or on_data_received=onLtp

% Run for a few seconds to receive data
pause(10);

client.unsubscribe_ltp(instruments);
client.disconnect();
```

Each LTP update passed to the callback is a struct; as JSON:

```json
{
  "type": "market_data",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "mode": 1,
  "data": {"ltp": 1424.5, "timestamp": 1760592345123}
}
```

`data.data` also carries `ltt` (last trade time) when the server sends it.

### Quotes (Streaming Websocket)

```matlab
client = openalgo.api( ...
    api_key="your_api_key", ...
    host="http://127.0.0.1:5000", ...
    ws_url="ws://127.0.0.1:8765");

instruments = { ...
    struct("exchange", "NSE", "symbol", "RELIANCE"), ...
    struct("exchange", "NSE", "symbol", "INFY")};

onQuote = @(data) fprintf("Quote Update Received: %s O: %g H: %g L: %g LTP: %g Vol: %g\n", ...
    data.symbol, data.data.open, data.data.high, data.data.low, data.data.ltp, data.data.volume);

client.connect();
client.subscribe_quote(instruments, onQuote);

pause(10);

client.unsubscribe_quote(instruments);
client.disconnect();
```

The quote `data` carries `open`, `high`, `low`, `close`, `ltp`, `volume`, `last_trade_quantity`, `avg_trade_price`, `change`, `change_percent` and `timestamp`.

### Depth (Streaming Websocket)

```matlab
client = openalgo.api( ...
    api_key="your_api_key", ...
    host="http://127.0.0.1:5000", ...
    ws_url="ws://127.0.0.1:8765");

instruments = { ...
    struct("exchange", "NSE", "symbol", "RELIANCE"), ...
    struct("exchange", "NSE", "symbol", "INFY")};

client.connect();
client.subscribe_depth(instruments, @onDepth);

pause(10);

client.unsubscribe_depth(instruments);
client.disconnect();

function onDepth(data)
    bestBid = data.data.depth.buy{1};
    bestAsk = data.data.depth.sell{1};
    fprintf("Market Depth Update Received: %s bid %g x %g ask %g x %g\n", ...
        data.symbol, bestBid.price, bestBid.quantity, bestAsk.price, bestAsk.quantity);
end
```

(A local function such as `onDepth` goes at the end of the script file.)

The depth `data` carries `ltp`, `timestamp` and `depth`, where `depth.buy` and `depth.sell` are cell arrays of levels with `price`, `quantity` and `orders`. Five levels are requested by default.

#### Deeper Market Depth (20, 30 or 50 levels)

`subscribe_depth` takes a `depth` argument to request a deeper order book:

```matlab
client.subscribe_depth(instruments, @onDepth, 20);
client.subscribe_depth(instruments, depth=20);      % without a callback
```

Which levels work (5, 20, 30 or 50) depends on your broker. With `verbose=1` the subscription reply shows, per symbol, whether the broker accepted the level, and the reason when it refused:

```text
[SUB]    NSE:RELIANCE | Mode: Depth | Status: success
[ERROR]  Subscription failed for NSE:RELIANCE: Depth level 50 is not supported by this broker
```

The level is remembered per instrument, so an automatic reconnect replays each depth subscription with the level it was made with. `get_depth` returns every level received (`buyBook` and `sellBook` are 1x20 struct arrays in this example). A `depth` that is not a positive whole number raises `openalgo:FeedAPI:badArgument` before anything is sent.

### Order Updates (Streaming Websocket)

Stream real-time order status changes (fills, partial fills, rejections and cancellations) into MATLAB through the OpenAlgo WebSocket feed. This is an **account-level** stream: unlike LTP, Quote and Depth there are no instruments to subscribe; one call covers every order in the connected broker account (and sandbox orders in analyzer mode).

| Method | Purpose |
|--------|---------|
| `subscribe_orders(on_order_update)` | Start the stream; optional callback per update |
| `unsubscribe_orders()` | Stop the stream |
| `get_orders()` | Cached updates received so far, most recent first, capped at 500 |

`subscribe_orders` needs an authenticated connection, so call `client.connect()` first; it returns `false` if the client is not connected and authenticated. The subscription survives reconnects: auto reconnect replays it after re-authentication, like the market data subscriptions.

```matlab
client = openalgo.api(api_key="your_api_key", host="http://127.0.0.1:5000");

onOrderUpdate = @(u) fprintf("%s | %s | %s | filled %g/%g @ %g\n", u.orderid, u.symbol, ...
    u.order_status, u.filled_quantity, u.quantity, u.average_price);

client.connect();
client.subscribe_orders(onOrderUpdate);     % or on_order_update=onOrderUpdate

% ... place orders from anywhere (API, web UI, mobile app) ...
client.placeorder(strategy="Test Strategy", symbol="NHPC", action="BUY", ...
    exchange="NSE", price_type="MARKET", product="MIS", quantity=1);

pause(60);

client.unsubscribe_orders();
client.disconnect();
```

Each update passed to the callback is a struct in OpenAlgo's common order format, the same constants used by the REST order APIs; as JSON:

```json
{
  "type": "order_update",
  "user_id": "<openalgo_loginid>",
  "mode": "live",
  "broker": "yourbroker",
  "orderid": "250408000989443",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "action": "BUY",
  "quantity": 1,
  "price": 0,
  "trigger_price": 0,
  "pricetype": "MARKET",
  "product": "MIS",
  "order_status": "complete",
  "filled_quantity": 1,
  "pending_quantity": 0,
  "average_price": 1180.1,
  "rejection_reason": null
}
```

| Field | Values |
|-------|--------|
| `mode` | `live` (broker feed) or `analyze` (sandbox engine) |
| `action` | `BUY` / `SELL` |
| `pricetype` | `MARKET` / `LIMIT` / `SL` / `SL-M` |
| `product` | `CNC` / `NRML` / `MIS` |
| `order_status` | `open` / `trigger pending` / `complete` / `rejected` / `cancelled` (plus broker extras) |
| `rejection_reason` | Populated when `order_status` is `rejected` |

`client.get_orders().orders` returns the updates received so far as a cell array, most recent first: `client.get_orders().orders{1}.order_status`.

Notes:

* Sandbox (analyzer mode) fires the same updates for order placements (open), engine fills, rejections and cancellations, so you can test end-to-end without a live broker.
* Brokers with a push channel stream updates natively. Brokers with no push mechanism are covered by server-side order book polling (`ORDER_POLL_INTERVAL`, default 5 seconds).
* On production deployments the `/postback/<broker>` HTTPS webhook receivers feed the same stream. If both a broker WebSocket and a postback are configured the same transition can arrive twice, so deduplicate on `orderid` + `order_status` + `filled_quantity`.
* The stream is on by default. Set `ORDER_UPDATES_ENABLED=FALSE` in the OpenAlgo server `.env` to disable it; no client-side flag is needed.
* With `verbose=2`, each update is also printed with the `[ORDER]` log tag.

### Polling Snapshots

Callbacks are optional. The client also keeps the latest value per instrument, which you can poll:

```matlab
client.connect();
client.subscribe_quote(instruments);

for i = 1:5
    pause(1);
    q = client.get_quotes();
    exchanges = fieldnames(q.quote);
    for e = 1:numel(exchanges)
        symbols = fieldnames(q.quote.(exchanges{e}));
        for s = 1:numel(symbols)
            fprintf("  %s:%s = %g\n", exchanges{e}, symbols{s}, ...
                q.quote.(exchanges{e}).(symbols{s}).ltp);
        end
    end
end
```

| Method | Returns |
|--------|---------|
| `client.get_ltp(exchange, symbol)` | `r.ltp.NSE.RELIANCE` with fields `timestamp`, `ltp` |
| `client.get_quotes(exchange, symbol)` | `r.quote.NSE.RELIANCE` with fields `timestamp`, `open`, `high`, `low`, `close`, `ltp`, `volume`, `last_trade_quantity`, `avg_trade_price`, `change`, `change_percent` |
| `client.get_depth(exchange, symbol)` | `r.depth.NSE.SBIN` with fields `timestamp`, `ltp`, `buyBook`, `sellBook`; each book is a 1xN struct array (N at least 5, more when a deeper book was received) with `price`, `qty`, `orders`, and `buyBook(1)` is the best bid |
| `client.get_orders()` | `r.orders`, a cell array of order updates, most recent first |

`exchange` and `symbol` are optional filters, by position or name=value (`client.get_ltp(exchange="NSE", symbol="RELIANCE")`). Without data the result is empty (`struct('ltp', struct())`).

```matlab
>> client.get_ltp("NSE", "RELIANCE").ltp.NSE.RELIANCE.ltp

ans =

   1.4245e+03

>> book = client.get_depth("NSE", "SBIN");
>> book.depth.NSE.SBIN.buyBook(1).price

ans =

  769.4000
```

MATLAB field names must be valid identifiers, so exchange and symbol names pass through `matlab.lang.makeValidName`: `M&M` becomes `M_M`, `BAJAJ-AUTO` becomes `BAJAJ_AUTO`, and a name that starts with a digit gets an `x` prefix. The raw data is also kept under the original `'EXCHANGE:SYMBOL'` key in `client.ltp_data`, `client.quotes_data` and `client.depth_data` (`containers.Map` objects), for example `client.ltp_data("NSE:M&M").price`.

### Feed Utilities

| Method | What it does |
|--------|--------------|
| `client.wait(seconds)` | Keep processing the feed for a number of seconds (default 1), for scripts |
| `client.unsubscribe_all()` | Drop every LTP, quote and depth subscription in one request |
| `client.get_broker_info(timeout)` | Ask which broker serves this feed session (default timeout 5 seconds) |
| `client.get_supported_brokers(timeout)` | Ask which brokers the server is configured for |
| `client.ws_ping(timeout)` | Measure the round trip to the feed server, in milliseconds |

```matlab
>> client.connect();
>> client.get_broker_info().broker

ans =

    'yourbroker'

>> client.get_supported_brokers().brokers

ans =

  2x1 cell array

    {'yourbroker'   }
    {'anotherbroker'}

>> client.ws_ping().latency_ms

ans =

    4.1835

>> client.unsubscribe_all()

ans =

  logical

   1
```

The replies, as JSON:

```json
{"type": "broker_info", "status": "success", "broker": "yourbroker",
 "adapter_status": "connected", "user_id": "<openalgo_loginid>"}

{"type": "supported_brokers", "status": "success",
 "brokers": ["yourbroker", "anotherbroker"], "count": 2}

{"type": "pong", "status": "success", "server_timestamp": 1760592345127,
 "client_timestamp": 1760592345123, "latency_ms": 4.1835}
```

* `unsubscribe_all` forgets every LTP, quote and depth subscription and clears the cached data, so an automatic reconnect does not replay them. The order-update stream is not affected; stop it with `unsubscribe_orders`. It returns `true` when the request was sent.
* `get_broker_info`, `get_supported_brokers` and `ws_ping` wait up to `timeout` seconds for the server's reply. While they wait the feed keeps running, so market data keeps arriving and callbacks keep firing. Do not call them from inside a feed callback. Without a connection, or without a reply in time, they return a struct with `status` `'error'` and a `message` (`'Not connected to WebSocket server'`, `'Timed out waiting for the broker_info reply'`); a server error reply (for example `"code": "NOT_AUTHENTICATED"`) is returned as is.
* `count` in the supported brokers reply is the number of brokers enabled on the server. `latency_ms` in the `ws_ping` reply is added by the client: the measured round trip in milliseconds. The method is called `ws_ping` because `ping` is the REST endpoint.

### Websockets (Verbose Control)

The `verbose` parameter controls the library's logging for the WebSocket feed (LTP, Quote, Depth and order updates), from silent to full debug.

| Level | Value | Description |
|-------|-------|-------------|
| **Silent** | `false` or `0` | No library output, not even errors (default) |
| **Basic** | `true` or `1` | Connection, authentication, subscription and unsubscribe replies, server error frames and other error messages |
| **Debug** | `2` | Everything in Basic, plus every LTP, Quote, Depth and order update and the full server replies |

`verbose` only controls what the library prints. Your callbacks always run, and every method still returns its result, so a silent client is not a blind one. Set `verbose=1` while you are wiring up a feed: at level `0` a failed authentication or a rejected subscription is silent. `client.verbose` can also be changed on a live client.

```matlab
% Silent mode (default): no library output
client = openalgo.api(api_key="...", host="...", ws_url="...", verbose=false);

% Basic logging: connection and subscription info
client = openalgo.api(api_key="...", host="...", ws_url="...", verbose=true);

% Full debug: all data updates
client = openalgo.api(api_key="...", host="...", ws_url="...", verbose=2);
```

`ws_url` is optional. When it is omitted the client derives the WebSocket URL from `host`, so a local install can simply use `openalgo.api(api_key="...", verbose=2)`.

Sample output with `verbose=true`:

```text
[WS]     Connected to ws://127.0.0.1:8765
[AUTH]   Authenticating with API key: bf1267a1...7cf9169f
[AUTH]   Success | Broker: yourbroker | User: <openalgo_loginid>
[SUB]    Subscribing NSE_INDEX:NIFTY Quote...
[SUB]    Subscribing NSE:INFY Quote...
[SUB]    NSE_INDEX:NIFTY | Mode: Quote | Status: success
[SUB]    NSE:INFY | Mode: Quote | Status: success
```

Unsubscribe acknowledgements (one line per symbol) and error frames sent by the server are shown at the same level:

```text
[UNSUB]  Unsubscribing NSE:INFY Quote
[UNSUB]  NSE:INFY | Mode: Quote | Status: success
[ERROR]  Server error NOT_AUTHENTICATED: You must authenticate first
```

`unsubscribe_all()` logs `[UNSUB]  Unsubscribing from all symbols`, followed by one acknowledgement line per symbol that was dropped.

With `verbose=2` each update is printed as well, for example `[LTP]    NSE:RELIANCE         | LTP: 1424.5` and `[QUOTE]  NSE:INFY             | O: 1532.1     H: 1560.3     L: 1532.1     C: 1530.6     LTP: 1557.9`, and each depth update is followed by a table of the book:

```text
[DEPTH]  NSE:SBIN             | LTP: 769.6
         BUY                            | SELL
         Price      Qty        Orders   | Price      Qty        Orders
         --------------------------------------------------------------
         769.4      886        12       | 769.6      767        9
         769.35     212        4        | 769.65     115        3
```

| Tag | Meaning |
|-----|---------|
| `[WS]` | WebSocket connection events |
| `[AUTH]` | Authentication requests and responses |
| `[SUB]` | Subscription operations |
| `[UNSUB]` | Unsubscription logs |
| `[LTP]` | LTP updates (verbose=2) |
| `[QUOTE]` | Quote updates (verbose=2) |
| `[DEPTH]` | Market depth updates (verbose=2) |
| `[ORDER]` | Order status updates via `subscribe_orders()` (verbose=2) |
| `[ERROR]` | Error messages (verbose=1 and above) |

### Auto Reconnect

`auto_reconnect` defaults to `true`. After a dropped connection the client reconnects with increasing delays (1, 2, 5, 10, 30, then 60 seconds), re-authenticates, and replays every active LTP, Quote and Depth subscription plus the order-update subscription. Your callbacks are kept, so they resume firing without extra code. The reconnect attempts run on a MATLAB timer, so they happen while MATLAB is idle, during `pause` or during `client.wait`. `disconnect()` is a graceful shutdown and does not reconnect.

```matlab
% Default: transparent reconnect and subscription replay
client = openalgo.api(api_key="your_api_key", host="http://127.0.0.1:5000");

% Opt out and handle reconnects yourself
client = openalgo.api(api_key="your_api_key", host="http://127.0.0.1:5000", ...
    auto_reconnect=false);
```

With `verbose=1` or higher the reconnect attempts and the replayed subscriptions are logged under the `[WS]` and `[SUB]` tags:

```text
[WS]     Disconnected from ws://127.0.0.1:8765
[WS]     Reconnect attempt 1 in 1s...
[WS]     Connected to ws://127.0.0.1:8765
[AUTH]   Authenticating with API key: bf1267a1...7cf9169f
[AUTH]   Success | Broker: yourbroker | User: <openalgo_loginid>
[WS]     Reconnected and re-authenticated.
[SUB]    Replaying 2 Quote subscription(s) after reconnect
```

The client also sends a WebSocket keepalive ping every 20 seconds and treats the connection as dropped when no pong arrives within 10 seconds. Change these through `client.ping_interval` and `client.ping_timeout` before `connect()` if needed.
