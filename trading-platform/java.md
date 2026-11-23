# Java

## OpenAlgo Java SDK

OpenAlgo Java SDK for algorithmic trading - Java client library for OpenAlgo API. Supports order placement, market data, options trading, and real-time WebSocket streaming.

### Installation

#### Maven

Add the following dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>in.openalgo</groupId>
    <artifactId>openalgo</artifactId>
    <version>1.1.0</version>
</dependency>
```

#### Gradle

Add the following to your `build.gradle`:

```groovy
implementation 'in.openalgo:openalgo:1.1.0'
```

### Compatibility

| Java Version | Support                               |
| ------------ | ------------------------------------- |
| Java 11      | LTS (Long Term Support)               |
| Java 17      | LTS (Long Term Support)               |
| Java 21      | LTS (Long Term Support) - Recommended |

### Get the OpenAlgo apikey

Make Sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

### Getting Started with OpenAlgo Java SDK

First, import the `OpenAlgo` class and initialize it with your API key:

```java
import in.openalgo.OpenAlgo;
import com.google.gson.JsonObject;

// Replace 'your_api_key_here' with your actual API key
// Specify the host URL with your hosted domain or ngrok domain.
// If running locally in windows then use the default host value.
OpenAlgo client = new OpenAlgo("your_api_key_here");

// Or with custom host
OpenAlgo client = new OpenAlgo("your_api_key_here", "http://127.0.0.1:5000");
```

### Examples

Please refer to the documentation on [order constants](https://docs.openalgo.in/api-documentation/v1/order-constants), and consult the API reference for details on optional parameters

***

## API Reference

### PlaceOrder Example

To place a new market order (simplest form):

```java
// Minimal - uses defaults (MARKET, MIS, qty=1)
JsonObject response = client.placeorder("YESBANK", "BUY", "NSE");

// With quantity
JsonObject response = client.placeorder("YESBANK", "BUY", "NSE", 10);

// With priceType, product, quantity
JsonObject response = client.placeorder("YESBANK", "BUY", "NSE", "MARKET", "CNC", 1);

// With strategy
JsonObject response = client.placeorder("YESBANK", "BUY", "NSE", "MARKET", "CNC", 1, "MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**Place Market Order Response**

```json
{
  "mode": "analyze",
  "orderid": "25122301278383",
  "status": "success"
}
```

To place a new limit order:

```java
// LIMIT order with price
JsonObject response = client.placeorder("YESBANK", "BUY", "NSE", "CNC", 1, "16");

System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**Place Limit Order Response**

```json
{
  "status": "success",
  "orderid": "250408001003813"
}
```

### PlaceSmartOrder Example

To place a smart order considering the current position size:

```java
// Minimal - uses defaults (MARKET, MIS, qty=1)
JsonObject response = client.placesmartorder("TATAMOTORS", "SELL", "NSE", 5);

// With priceType, product, quantity
JsonObject response = client.placesmartorder("TATAMOTORS", "SELL", "NSE", 5, "MARKET", "MIS", 1);

// With strategy
JsonObject response = client.placesmartorder("TATAMOTORS", "SELL", "NSE", 5, "MARKET", "MIS", 1, "MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**Place Smart Market Order Response**

```json
{
  "status": "success",
  "orderid": "250408000997543"
}
```

### BasketOrder Example

To place a new basket order:

```java
List<Map<String, Object>> orders = new ArrayList<>();
orders.add(Map.of(
    "symbol", "BHEL",
    "exchange", "NSE",
    "action", "BUY",
    "quantity", 1,
    "pricetype", "MARKET",
    "product", "MIS"
));
orders.add(Map.of(
    "symbol", "ZOMATO",
    "exchange", "NSE",
    "action", "SELL",
    "quantity", 1,
    "pricetype", "MARKET",
    "product", "MIS"
));

// Without strategy (uses default "Java")
JsonObject response = client.basketorder(orders);

// With strategy
JsonObject response = client.basketorder(orders, "MyStrategy");
System.out.println("Status: " + response.get("status").getAsString());
```

**Basket Order Response**

```json
{
  "status": "success",
  "results": [
    {"orderid": "250408000999544", "status": "success", "symbol": "BHEL"},
    {"orderid": "250408000997545", "status": "success", "symbol": "ZOMATO"}
  ]
}
```

### SplitOrder Example

To place a new split order:

```java
// Minimal - uses defaults (MARKET, MIS)
JsonObject response = client.splitorder("YESBANK", "SELL", "NSE", 105, 20);

System.out.println("Status: " + response.get("status").getAsString());
```

**SplitOrder Response**

```json
{
  "status": "success",
  "split_size": "20",
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

```java
JsonObject response = client.modifyorder(
    "250408001002736",  // orderId
    "YESBANK",          // symbol
    "BUY",              // action
    "NSE",              // exchange
    "CNC",              // product
    1,                  // quantity
    "16.5"              // price
);
System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**Modify Order Response**

```json
{
  "status": "success",
  "orderid": "250408001002736"
}
```

### CancelOrder Example

To cancel an existing order:

```java
// Without strategy (uses default)
JsonObject response = client.cancelorder("250408001002736");

// With strategy
JsonObject response = client.cancelorder("250408001002736", "MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**CancelOrder Response**

```json
{
  "status": "success",
  "orderid": "250408001002736"
}
```

### CancelAllOrder Example

To cancel all open orders and trigger pending orders:

```java
// Without strategy (uses default)
JsonObject response = client.cancelallorder();

// With strategy
JsonObject response = client.cancelallorder("MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
```

**CancelAllOrder Response**

```json
{
  "status": "success",
  "message": "Canceled 5 orders. Failed to cancel 0 orders.",
  "canceled_orders": ["250408001042620", "250408001042667", "250408001042642"]
}
```

### ClosePosition Example

To close all open positions across various exchanges:

```java
// Without strategy (uses default)
JsonObject response = client.closeposition();

// With strategy
JsonObject response = client.closeposition("MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
```

**ClosePosition Response**

```json
{
  "status": "success",
  "message": "All Open Positions Squared Off"
}
```

### OrderStatus Example

To get the current order status:

```java
// Without strategy (uses default)
JsonObject response = client.orderstatus("250828000185002");

// With strategy
JsonObject response = client.orderstatus("250828000185002", "MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
if (response.has("data")) {
    JsonObject data = response.getAsJsonObject("data");
    System.out.println("Order Status: " + data.get("order_status").getAsString());
    System.out.println("Symbol: " + data.get("symbol").getAsString());
}
```

**OrderStatus Response**

```json
{
  "status": "success",
  "data": {
    "action": "BUY",
    "exchange": "NSE",
    "order_status": "complete",
    "orderid": "250828000185002",
    "price": 18.95,
    "quantity": 1,
    "symbol": "YESBANK",
    "timestamp": "28-Aug-2025 09:59:10"
  }
}
```

### OpenPosition Example

To get the current open position:

```java
// Without strategy (uses default)
JsonObject response = client.openposition("YESBANK", "NSE", "MIS");

// With strategy
JsonObject response = client.openposition("YESBANK", "NSE", "MIS", "MyStrategy");

System.out.println("Status: " + response.get("status").getAsString());
System.out.println("Quantity: " + response.get("quantity").getAsInt());
```

**OpenPosition Response**

```json
{
  "status": "success",
  "quantity": -10
}
```

### Quotes Example

```java
JsonObject response = client.quotes("RELIANCE", "NSE");
System.out.println("Status: " + response.get("status").getAsString());
if (response.has("data")) {
    JsonObject data = response.getAsJsonObject("data");
    System.out.println("Open: " + data.get("open").getAsDouble());
    System.out.println("High: " + data.get("high").getAsDouble());
    System.out.println("Low: " + data.get("low").getAsDouble());
    System.out.println("LTP: " + data.get("ltp").getAsDouble());
    System.out.println("Volume: " + data.get("volume").getAsLong());
}
```

**Quotes Response**

```json
{
  "status": "success",
  "data": {
    "ask": 1575.4,
    "bid": 0.0,
    "high": 1577.5,
    "low": 1565.3,
    "ltp": 1575.4,
    "oi": 179211500,
    "open": 1573.5,
    "prev_close": 1565.1,
    "volume": 10184852
  }
}
```

### Depth Example

```java
JsonObject response = client.depth("SBIN", "NSE");
System.out.println("Status: " + response.get("status").getAsString());
```

**Depth Response**

```json
{
  "status": "success",
  "data": {
    "ltp": 827.45,
    "open": 825.00,
    "high": 829.35,
    "low": 824.55,
    "volume": 9362799,
    "totalbuyqty": 591351,
    "totalsellqty": 835701,
    "bids": [
      {"price": 827.40, "quantity": 886},
      {"price": 827.35, "quantity": 212}
    ],
    "asks": [
      {"price": 827.45, "quantity": 767},
      {"price": 827.50, "quantity": 115}
    ]
  }
}
```

### History Example

```java
JsonObject response = client.history("SBIN", "NSE", "5m", "2025-12-20", "2025-12-22");
System.out.println("Status: " + response.get("status").getAsString());
if (response.has("data")) {
    JsonArray data = response.getAsJsonArray("data");
    System.out.println("Total Candles: " + data.size());
    // Print first candle
    JsonObject candle = data.get(0).getAsJsonObject();
    System.out.println("Open: " + candle.get("open").getAsDouble());
    System.out.println("High: " + candle.get("high").getAsDouble());
    System.out.println("Low: " + candle.get("low").getAsDouble());
    System.out.println("Close: " + candle.get("close").getAsDouble());
    System.out.println("Volume: " + candle.get("volume").getAsLong());
}
```

**History Response**

```json
{
  "status": "success",
  "data": [
    {
      "close": 981.5,
      "high": 982.0,
      "low": 980.0,
      "open": 981.1,
      "timestamp": 1766375100,
      "volume": 131984
    },
    {
      "close": 981.75,
      "high": 982.6,
      "low": 981.15,
      "open": 981.5,
      "timestamp": 1766375400,
      "volume": 122471
    }
  ]
}
```

### Intervals Example

```java
JsonObject response = client.intervals();
System.out.println("Status: " + response.get("status").getAsString());
```

**Intervals Response**

```json
{
  "status": "success",
  "data": {
    "days": ["D"],
    "hours": ["1h"],
    "minutes": ["1m", "3m", "5m", "10m", "15m", "30m"]
  }
}
```

`intervals` reports only what the connected broker supports. The `interval` field of `/history` accepts this full set, and rejects anything else: `1s`, `5s`, `10s`, `15s`, `30s`, `45s`, `1m`, `2m`, `3m`, `5m`, `10m`, `15m`, `20m`, `30m`, `1h`, `2h`, `3h`, `4h`, `D`, `W`, `M`, `Q`, `Y`.

### Symbol Example

```java
JsonObject response = client.symbol("NIFTY30DEC25FUT", "NFO");
System.out.println("Status: " + response.get("status").getAsString());
```

**Symbol Response**

```json
{
  "status": "success",
  "data": {
    "symbol": "NIFTY30DEC25FUT",
    "name": "NIFTY",
    "exchange": "NFO",
    "instrumenttype": "FUT",
    "lotsize": 65,
    "expiry": "30-DEC-25",
    "freeze_qty": 1800
  }
}
```

### Search Example

```java
JsonObject response = client.search("NIFTY 26000 DEC CE", "NFO");
System.out.println("Status: " + response.get("status").getAsString());
```

**Search Response**

```json
{
  "status": "success",
  "message": "Found 7 matching symbols",
  "data": [
    {
      "symbol": "NIFTY30DEC2526000CE",
      "exchange": "NFO",
      "expiry": "30-DEC-25",
      "lotsize": 65
    }
  ]
}
```

### MultiQuotes Example

```java
List<Map<String, String>> symbols = new ArrayList<>();
symbols.add(Map.of("symbol", "RELIANCE", "exchange", "NSE"));
symbols.add(Map.of("symbol", "TCS", "exchange", "NSE"));

JsonObject response = client.multiquotes(symbols);
System.out.println("Status: " + response.get("status").getAsString());
```

**MultiQuotes Response**

```json
{
  "status": "success",
  "results": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "data": {"open": 1542.3, "high": 1571.6, "low": 1540.5, "ltp": 1569.9, "volume": 14054299}
    },
    {
      "symbol": "TCS",
      "exchange": "NSE",
      "data": {"open": 3118.8, "high": 3178, "low": 3117, "ltp": 3162.9, "volume": 2508527}
    }
  ]
}
```

### Expiry Example

`instrumenttype` is `futures` or `options`, and the exchange must be a derivatives exchange: NFO, BFO, MCX, CDS, NCO, BCD, NCDEX or CRYPTO.

```java
JsonObject response = client.expiry("NIFTY", "NFO", "options");
System.out.println("Status: " + response.get("status").getAsString());
```

**Expiry Response**

```json
{
  "status": "success",
  "message": "Found 18 expiry dates for NIFTY options in NFO",
  "data": ["10-JUL-25", "17-JUL-25", "24-JUL-25", "31-JUL-25", "07-AUG-25"]
}
```

### OptionSymbol Example

```java
// Nearest expiry
JsonObject response = client.optionsymbol("NIFTY", "NSE_INDEX", "ATM", "CE");

// With an explicit expiry in DDMMMYY format
JsonObject response = client.optionsymbol("NIFTY", "NSE_INDEX", "ATM", "CE", "30DEC25");

System.out.println("Symbol: " + response.get("symbol").getAsString());
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

### SyntheticFuture Example

```java
JsonObject response = client.syntheticfuture("NIFTY", "NSE_INDEX", "25NOV25");
System.out.println("Status: " + response.get("status").getAsString());
```

**SyntheticFuture Response**

```json
{
  "status": "success",
  "underlying": "NIFTY",
  "underlying_ltp": 25910.05,
  "expiry": "25NOV25",
  "atm_strike": 25900.0,
  "synthetic_future_price": 25980.05
}
```

### Instruments Example

```java
// One exchange
JsonObject response = client.instruments("NSE");

// Every exchange, combined client-side
JsonObject response = client.instruments();

System.out.println("Status: " + response.get("status").getAsString());
```

`/instruments` is the one v1 market-data endpoint that is a GET rather than a POST. It takes `apikey`, an optional `exchange` and an optional `format` (`json` or `csv`) as query parameters, and the SDK issues that GET for you.

**Instruments Response**

```json
{
  "status": "success",
  "message": "Found 2500 instruments",
  "data": [
    {
      "symbol": "RELIANCE",
      "brsymbol": "NSE:RELIANCE-EQ",
      "name": "RELIANCE INDUSTRIES LTD",
      "exchange": "NSE",
      "brexchange": "NSE",
      "token": "10100000002885",
      "expiry": null,
      "strike": -1.0,
      "lotsize": 1,
      "instrumenttype": "EQ",
      "tick_size": 0.05
    }
  ]
}
```

### Margin Example

Up to 50 positions per request. `quantity`, `price` and `trigger_price` go over the wire as strings.

```java
List<Map<String, Object>> positions = new ArrayList<>();
positions.add(Map.of(
    "symbol", "NIFTY25NOV2525000CE",
    "exchange", "NFO",
    "action", "BUY",
    "product", "NRML",
    "pricetype", "MARKET",
    "quantity", "65"
));
positions.add(Map.of(
    "symbol", "NIFTY25NOV2525500CE",
    "exchange", "NFO",
    "action", "SELL",
    "product", "NRML",
    "pricetype", "MARKET",
    "quantity", "65"
));

JsonObject response = client.margin(positions);
System.out.println("Status: " + response.get("status").getAsString());
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

### OptionsOrder Example

To place ATM options order:

```java
JsonObject response = client.optionsorder(
    "NIFTY",      // underlying
    "NSE_INDEX",  // exchange
    "ATM",        // offset
    "CE",         // optionType
    "BUY",        // action
    65            // quantity
);
System.out.println("Status: " + response.get("status").getAsString());
System.out.println("OrderId: " + response.get("orderid").getAsString());
```

**OptionsOrder Response**

```json
{
  "status": "success",
  "orderid": "25102800000006",
  "symbol": "NIFTY30DEC2526200CE",
  "exchange": "NFO",
  "underlying": "NIFTY",
  "underlying_ltp": 26215.55
}
```

### OptionsMultiOrder Example

To place multi-leg options strategy (e.g., Bull Call Spread):

```java
List<Map<String, Object>> legs = new ArrayList<>();

// Leg 1: Buy ATM CE
Map<String, Object> leg1 = new HashMap<>();
leg1.put("offset", "ATM");
leg1.put("option_type", "CE");
leg1.put("action", "BUY");
leg1.put("quantity", 65);
leg1.put("product", "NRML");
legs.add(leg1);

// Leg 2: Sell OTM1 CE
Map<String, Object> leg2 = new HashMap<>();
leg2.put("offset", "OTM1");
leg2.put("option_type", "CE");
leg2.put("action", "SELL");
leg2.put("quantity", 65);
leg2.put("product", "NRML");
legs.add(leg2);

// Place multi-leg order with expiry.
// The exchange is the UNDERLYING's exchange (NSE_INDEX here), not NFO.
JsonObject response = client.optionsmultiorder("MyStrategy", "NIFTY", "NSE_INDEX", legs, "30DEC25");

// Or without expiry (uses nearest expiry)
JsonObject response = client.optionsmultiorder("MyStrategy", "NIFTY", "NSE_INDEX", legs);

System.out.println("Status: " + response.get("status").getAsString());
```

**OptionsMultiOrder Response**

```json
{
  "status": "success",
  "mode": "analyze",
  "underlying": "NIFTY",
  "underlying_ltp": 26172.4,
  "results": [
    {
      "leg": 1,
      "action": "BUY",
      "offset": "ATM",
      "option_type": "CE",
      "symbol": "NIFTY30DEC2526150CE",
      "exchange": "NFO",
      "orderid": "25122337669355",
      "status": "success"
    },
    {
      "leg": 2,
      "action": "SELL",
      "offset": "OTM1",
      "option_type": "CE",
      "symbol": "NIFTY30DEC2526200CE",
      "exchange": "NFO",
      "orderid": "25122347595003",
      "status": "success"
    }
  ]
}
```

### OptionChain Example

```java
JsonObject response = client.optionchain("NIFTY", "NSE_INDEX", "30DEC25", 10);
System.out.println("Status: " + response.get("status").getAsString());
System.out.println("Underlying: " + response.get("underlying").getAsString());
System.out.println("ATM Strike: " + response.get("atm_strike").getAsInt());
```

**OptionChain Response**

```json
{
  "status": "success",
  "underlying": "NIFTY",
  "underlying_ltp": 26215.55,
  "expiry_date": "30DEC25",
  "atm_strike": 26200,
  "chain": [
    {
      "strike": 26100,
      "ce": {"symbol": "NIFTY30DEC2526100CE", "label": "ITM2", "ltp": 490},
      "pe": {"symbol": "NIFTY30DEC2526100PE", "label": "OTM2", "ltp": 193}
    }
  ]
}
```

### OptionGreeks Example

```java
JsonObject response = client.optiongreeks("NIFTY25NOV2526000CE", "NFO");
System.out.println("Status: " + response.get("status").getAsString());
```

**OptionGreeks Response**

```json
{
  "status": "success",
  "symbol": "NIFTY25NOV2526000CE",
  "spot_price": 25966.05,
  "option_price": 435,
  "implied_volatility": 15.6,
  "days_to_expiry": 28.51,
  "greeks": {
    "delta": 0.4967,
    "gamma": 0.000352,
    "theta": -7.919,
    "vega": 28.9489
  }
}
```

### Funds Example

```java
JsonObject response = client.funds();
System.out.println("Status: " + response.get("status").getAsString());
if (response.has("data")) {
    JsonObject data = response.getAsJsonObject("data");
    System.out.println("Available Cash: " + data.get("availablecash").getAsString());
}
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

### OrderBook Example

```java
JsonObject response = client.orderbook();
System.out.println("Status: " + response.get("status").getAsString());
```

**OrderBook Response**

```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "action": "BUY",
        "exchange": "NSE",
        "order_status": "complete",
        "orderid": "250408000989443",
        "symbol": "RELIANCE"
      }
    ],
    "statistics": {
      "total_buy_orders": 2,
      "total_completed_orders": 1
    }
  }
}
```

### TradeBook Example

```java
JsonObject response = client.tradebook();
System.out.println("Status: " + response.get("status").getAsString());
```

**TradeBook Response**

```json
{
  "status": "success",
  "data": [
    {
      "action": "BUY",
      "average_price": "1180.1",
      "exchange": "NSE",
      "orderid": "250408000989443",
      "symbol": "RELIANCE",
      "trade_value": "1180.1"
    }
  ]
}
```

### PositionBook Example

```java
JsonObject response = client.positionbook();
System.out.println("Status: " + response.get("status").getAsString());
```

**PositionBook Response**

```json
{
  "status": "success",
  "data": [
    {
      "symbol": "NHPC",
      "exchange": "NSE",
      "quantity": -1,
      "ltp": 83.72,
      "pnl": 0.02
    }
  ]
}
```

### Holdings Example

```java
JsonObject response = client.holdings();
System.out.println("Status: " + response.get("status").getAsString());
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
        "quantity": 1,
        "pnl": -149,
        "pnlpercent": -11.1
      }
    ],
    "statistics": {
      "totalholdingvalue": 1768,
      "totalprofitandloss": -233.15,
      "totalpnlpercentage": -11.65
    }
  }
}
```

### Telegram Alert Example

```java
JsonObject response = client.telegram("<openalgo_loginid>", "NIFTY crossed 26000!", 5);
System.out.println("Status: " + response.get("status").getAsString());
```

**Telegram Alert Response**

```json
{
  "status": "success",
  "message": "Notification sent successfully"
}
```

### Holidays Example

```java
JsonObject response = client.holidays(2025);
System.out.println("Status: " + response.get("status").getAsString());
```

**Holidays Response**

```json
{
  "status": "success",
  "data": [
    {"date": "2025-02-26", "description": "Maha Shivaratri", "holiday_type": "TRADING_HOLIDAY"},
    {"date": "2025-03-14", "description": "Holi", "holiday_type": "TRADING_HOLIDAY"}
  ]
}
```

### Timings Example

```java
JsonObject response = client.timings("2025-12-19");
System.out.println("Status: " + response.get("status").getAsString());
```

**Timings Response**

```json
{
  "status": "success",
  "data": [
    {"exchange": "NSE", "start_time": 1734584100000, "end_time": 1734606600000},
    {"exchange": "BSE", "start_time": 1734584100000, "end_time": 1734606600000}
  ]
}
```

### Analyzer Status Example

```java
JsonObject response = client.analyzerstatus();
System.out.println("Status: " + response.get("status").getAsString());
```

**Analyzer Status Response**

```json
{
  "status": "success",
  "data": {
    "analyze_mode": true,
    "mode": "analyze",
    "total_logs": 2
  }
}
```

### Analyzer Toggle Example

```java
// Switch to analyze mode (simulated responses)
JsonObject response = client.analyzertoggle(true);
System.out.println("Status: " + response.get("status").getAsString());
```

**Analyzer Toggle Response**

```json
{
  "status": "success",
  "data": {
    "analyze_mode": true,
    "mode": "analyze",
    "message": "Analyzer mode switched to analyze",
    "total_logs": 2
  }
}
```

***

### Endpoints not wrapped by the SDK

The Java SDK does not expose helpers for the GTT endpoints, `multioptiongreeks` or `ping`. Reach them by posting to the REST endpoint directly at `http://127.0.0.1:5000/api/v1/<endpoint>`, passing the same `apikey` field the SDK sends.

**GTT (Good Till Triggered)**

Four endpoints, all POST with a flat JSON body: `placegttorder`, `modifygttorder`, `cancelgttorder` and `gttorderbook`. `trigger_type` is `SINGLE` or `OCO`, and `product` accepts only `CNC` or `NRML`; `MIS` is rejected because a GTT can sit with the broker for days.

SINGLE, buy IDEA if it dips to 9.55:

```json
{
  "apikey": "<your_app_apikey>",
  "strategy": "My GTT Strategy",
  "trigger_type": "SINGLE",
  "exchange": "NSE",
  "symbol": "IDEA",
  "action": "BUY",
  "product": "CNC",
  "quantity": 1,
  "pricetype": "LIMIT",
  "price": 9.50,
  "triggerprice_sl": 9.55,
  "triggerprice_tg": 0,
  "stoploss": null,
  "target": null
}
```

```json
{"status": "success", "trigger_id": "23132604291205"}
```

For SINGLE send exactly one of `triggerprice_sl` (trigger sits below LTP) or `triggerprice_tg` (trigger sits above LTP) and leave the other at `0`. For OCO send all four of `triggerprice_sl`, `stoploss`, `triggerprice_tg` and `target`, with `triggerprice_sl` strictly less than `triggerprice_tg`. `modifygttorder` takes the same body plus `trigger_id`, `cancelgttorder` takes `apikey`, `strategy` and `trigger_id`, and `gttorderbook` takes `apikey` alone and returns the active triggers under `data`.

**MultiOptionGreeks**

`optiongreeks` prices one symbol at a time. `multioptiongreeks` prices 1 to 50 option symbols in a single call, with `interest_rate` and `expiry_time` set once for the whole batch:

```json
{
  "apikey": "<your_app_apikey>",
  "symbols": [
    {"symbol": "NIFTY30DEC2526000CE", "exchange": "NFO"},
    {"symbol": "NIFTY30DEC2526000PE", "exchange": "NFO"}
  ],
  "interest_rate": 7.0
}
```

Individual items can fail while the batch still returns `"status": "success"`, so inspect each entry in `data` and the `summary` block.

**Ping**

`ping` confirms the API key is valid and reports the connected broker:

```json
{"apikey": "<your_app_apikey>"}
```

```json
{"data": {"broker": "zerodha", "message": "pong"}, "status": "success"}
```

## WebSocket Streaming

### LTP Data (Streaming WebSocket)

```java
import in.openalgo.OpenAlgo;
import java.util.*;

// Initialize OpenAlgo client with WebSocket URL
OpenAlgo client = new OpenAlgo.Builder("your_api_key")
    .host("http://127.0.0.1:5000")
    .wsUrl("ws://127.0.0.1:8765")
    .build();

// Define instruments to subscribe for LTP
List<Map<String, String>> instruments = new ArrayList<>();
instruments.add(Map.of("exchange", "MCX", "symbol", "CRUDEOIL16JAN26FUT"));

// Connect and subscribe
client.connect();
client.subscribeLtp(instruments, data -> {
    System.out.println("LTP Update: " + data);
});

// Wait for data
Thread.sleep(3000);

// Get cached LTP data
Map<String, Object> ltpData = client.getLtp("MCX", "CRUDEOIL16JAN26FUT");
System.out.println("LTP Data: " + ltpData);

// Unsubscribe and disconnect
client.unsubscribeLtp(instruments);
client.disconnect();
```

**LTP Response**

```json
{
  "ltp": {
    "MCX": {
      "CRUDEOIL16JAN26FUT": {
        "ltp": 5218.0,
        "timestamp": 1703328453123
      }
    }
  }
}
```

### Quotes (Streaming WebSocket)

```java
// Subscribe to quote stream
client.connect();
client.subscribeQuote(instruments, data -> {
    System.out.println("Quote Update: " + data);
});

// Get cached Quote data
Map<String, Object> quoteData = client.getQuotes("MCX", "CRUDEOIL16JAN26FUT");
```

**Quote Response**

```json
{
  "quote": {
    "MCX": {
      "CRUDEOIL16JAN26FUT": {
        "open": 5124.0,
        "high": 5246.0,
        "low": 5114.0,
        "ltp": 5218.0,
        "volume": 14537,
        "timestamp": 1703328453123
      }
    }
  }
}
```

### Depth (Streaming WebSocket)

```java
// Subscribe to depth stream
client.connect();
client.subscribeDepth(instruments, data -> {
    System.out.println("Depth Update: " + data);
});

// Get cached Depth data
Map<String, Object> depthData = client.getDepth("MCX", "CRUDEOIL16JAN26FUT");
```

**Depth Response**

```json
{
  "depth": {
    "MCX": {
      "CRUDEOIL16JAN26FUT": {
        "ltp": 5218.0,
        "timestamp": 1703328453123,
        "depth": {
          "buy": [
            {"price": 5217.0, "quantity": 2, "orders": 2},
            {"price": 5216.0, "quantity": 16, "orders": 8}
          ],
          "sell": [
            {"price": 5218.0, "quantity": 5, "orders": 3},
            {"price": 5219.0, "quantity": 13, "orders": 7}
          ]
        }
      }
    }
  }
}
```

***

### WebSocket connection notes

The proxy listens on `ws://127.0.0.1:8765`. Every client authenticates with its OpenAlgo API key before subscribing, and a connection that has not authenticated within 15 seconds is closed. Subscriptions carry a mode: `1` for LTP, `2` for Quote and `3` for Depth. The strings `LTP`, `Quote` and `Depth` are accepted as well and are matched case-insensitively; Quote is the default when the field is omitted. LTP updates are throttled to one per symbol per 50 ms, so a fast-moving symbol delivers at most 20 LTP messages a second.

### Order Updates (Streaming WebSocket)

The same proxy on port 8765 also carries account-scoped order updates. The Java SDK does not wrap them, so send the raw frames on your own WebSocket connection: authenticate first, then subscribe.

```json
{"action": "authenticate", "api_key": "<your_app_apikey>"}
```

```json
{"action": "subscribe_orders"}
```

The server acknowledges the subscription:

```json
{"type": "subscribe_orders", "status": "success", "message": "Subscribed to order updates"}
```

Every subsequent status change on any order in the account then arrives as:

```json
{
  "type": "order_update",
  "user_id": "<openalgo_loginid>",
  "mode": "live",
  "broker": "zerodha",
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

`{"action": "unsubscribe_orders"}` stops the stream. Unlike a market-data subscription there is no symbol, exchange or mode: the subscription covers the whole account.

***

### Error Handling

```java
JsonObject response = client.placeorder("INVALID", "BUY", "NSE");

if (!"success".equals(response.get("status").getAsString())) {
    System.out.println("Error: " + response.get("message").getAsString());
}
```

***

### Complete API Reference

#### Order Management

| Method              | Description                              |
| ------------------- | ---------------------------------------- |
| `placeorder()`      | Place a new order                        |
| `placesmartorder()` | Place a smart order with position sizing |
| `modifyorder()`     | Modify an existing order                 |
| `cancelorder()`     | Cancel a specific order                  |
| `cancelallorder()`  | Cancel all open orders                   |
| `closeposition()`   | Close all open positions                 |
| `orderstatus()`     | Get status of a specific order           |
| `openposition()`    | Get current open position quantity       |

#### Basket & Split Orders

| Method          | Description                               |
| --------------- | ----------------------------------------- |
| `basketorder()` | Place multiple orders in a single request |
| `splitorder()`  | Split large order into smaller chunks     |

#### Options Trading

| Method                | Description                      |
| --------------------- | -------------------------------- |
| `optionsorder()`      | Place ATM/ITM/OTM option order   |
| `optionsmultiorder()` | Place multi-leg option strategy  |
| `optionsymbol()`      | Get option symbol by offset      |
| `optionchain()`       | Get full option chain data       |
| `optiongreeks()`      | Calculate option Greeks          |
| `syntheticfuture()`   | Calculate synthetic future price |
| `expiry()`            | Get expiry dates for symbol      |

#### Market Data

| Method          | Description                       |
| --------------- | --------------------------------- |
| `quotes()`      | Get real-time quotes for a symbol |
| `multiquotes()` | Get quotes for multiple symbols   |
| `depth()`       | Get market depth (order book)     |
| `history()`     | Get historical OHLCV data         |
| `intervals()`   | Get supported time intervals      |

#### Symbol & Search

| Method          | Description              |
| --------------- | ------------------------ |
| `symbol()`      | Get symbol details       |
| `search()`      | Search for symbols       |
| `instruments()` | Download all instruments |

#### Account & Portfolio

| Method           | Description                   |
| ---------------- | ----------------------------- |
| `funds()`        | Get funds and margin details  |
| `margin()`       | Calculate margin requirements |
| `orderbook()`    | Get order book                |
| `tradebook()`    | Get trade book                |
| `positionbook()` | Get position book             |
| `holdings()`     | Get stock holdings            |

#### Utilities

| Method             | Description                     |
| ------------------ | ------------------------------- |
| `holidays()`       | Get trading holidays for a year |
| `timings()`        | Get exchange timings for a date |
| `telegram()`       | Send Telegram alert message     |
| `analyzerstatus()` | Get analyzer mode status        |
| `analyzertoggle()` | Toggle analyze/live mode        |

#### WebSocket Streaming

| Method               | Description                 |
| -------------------- | --------------------------- |
| `connect()`          | Connect to WebSocket server |
| `disconnect()`       | Disconnect from WebSocket   |
| `subscribeLtp()`     | Subscribe to LTP updates    |
| `unsubscribeLtp()`   | Unsubscribe from LTP        |
| `subscribeQuote()`   | Subscribe to Quote updates  |
| `unsubscribeQuote()` | Unsubscribe from Quote      |
| `subscribeDepth()`   | Subscribe to Depth updates  |
| `unsubscribeDepth()` | Unsubscribe from Depth      |
| `getLtp()`           | Get cached LTP data         |
| `getQuotes()`        | Get cached Quote data       |
| `getDepth()`         | Get cached Depth data       |

***

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Links

* [OpenAlgo Platform](https://openalgo.in/)
* [API Documentation](https://docs.openalgo.in/api-documentation/v1)
* [Order Constants](https://docs.openalgo.in/api-documentation/v1/order-constants)
