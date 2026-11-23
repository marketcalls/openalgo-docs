# NodeJS

## NodeJS

To install the OpenAlgo Node.js library, use npm:

```bash
npm install openalgo
```

#### Get the OpenAlgo apikey

Make Sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

#### Getting Started with OpenAlgo

First, import the OpenAlgo class from the library and initialize it with your API key:

```javascript
import OpenAlgo from 'openalgo';

// Replace 'your_api_key_here' with your actual API key
// Specify the host URL with your hosted domain or ngrok domain.
// If running locally in windows then use the default host value.
const client = new OpenAlgo('your_api_key_here', 'http://127.0.0.1:5000');
```

#### Check OpenAlgo Version

```javascript
import { version } from 'openalgo';
console.log(version);
```

#### Examples

Please refer to the documentation on [order constants](https://docs.openalgo.in/api-documentation/v1/order-constants), and consult the API reference for details on optional parameters

#### PlaceOrder example

To place a new market order:

```javascript
const response = await client.placeOrder({
    strategy: "NodeJS",
    symbol: "NHPC",
    action: "BUY",
    exchange: "NSE",
    priceType: "MARKET",
    product: "MIS",
    quantity: 1
});
console.log(response);
```

Place Market Order Response

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```javascript
const response = await client.placeOrder({
    strategy: "NodeJS",
    symbol: "YESBANK",
    action: "BUY",
    exchange: "NSE",
    priceType: "LIMIT",
    product: "MIS",
    quantity: 1,
    price: 16,
    triggerPrice: 0,
    disclosedQuantity: 0
});
console.log(response);
```

Place Limit Order Response

```json
{"orderid": "250408001003813", "status": "success"}
```

#### PlaceSmartOrder Example

To place a smart order considering the current position size:

```javascript
const response = await client.placeSmartOrder({
    strategy: "NodeJS",
    symbol: "TATAMOTORS",
    action: "SELL",
    exchange: "NSE",
    priceType: "MARKET",
    product: "MIS",
    quantity: 1,
    positionSize: 5
});
console.log(response);
```

Place Smart Market Order Response

```json
{"orderid": "250408000997543", "status": "success"}
```

#### OptionsOrder Example

To place ATM options order

```javascript
const response = await client.optionsOrder({
    strategy: "NodeJS",
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "28OCT25",
    offset: "ATM",
    optionType: "CE",
    action: "BUY",
    quantity: 65,
    priceType: "MARKET",
    product: "NRML",
    splitSize: 0
});
console.log(response);
```

Place Options Order Response

```json
{
  "exchange": "NFO",
  "offset": "ATM",
  "option_type": "CE",
  "orderid": "25102800000006",
  "status": "success",
  "symbol": "NIFTY28OCT2525950CE",
  "underlying": "NIFTY",
  "underlying_ltp": 25966.05
}
```

To place ITM options order

```javascript
const response = await client.optionsOrder({
    strategy: "NodeJS",
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "28OCT25",
    offset: "ITM4",
    optionType: "PE",
    action: "BUY",
    quantity: 65,
    priceType: "MARKET",
    product: "NRML",
    splitSize: 0
});
console.log(response);
```

Place Options Order Response

```json
{
  "exchange": "NFO",
  "offset": "ITM4",
  "option_type": "PE",
  "orderid": "25102800000007",
  "status": "success",
  "symbol": "NIFTY28OCT2526150PE",
  "underlying": "NIFTY",
  "underlying_ltp": 25966.05
}
```

To place OTM options order

```javascript
const response = await client.optionsOrder({
    strategy: "NodeJS",
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "28OCT25",
    offset: "OTM5",
    optionType: "CE",
    action: "BUY",
    quantity: 65,
    priceType: "MARKET",
    product: "NRML",
    splitSize: 0
});
console.log(response);
```

Place Options Order Response

```json
{
  "exchange": "NFO",
  "mode": "analyze",
  "offset": "OTM5",
  "option_type": "CE",
  "orderid": "25102800000008",
  "status": "success",
  "symbol": "NIFTY28OCT2526200CE",
  "underlying": "NIFTY",
  "underlying_ltp": 25966.05
}
```

#### OptionsMultiOrder Example

To place Iron Condor options order (Same Expiry)

```javascript
const response = await client.optionsMultiOrder({
    strategy: "Iron Condor Test",
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "25NOV25",
    legs: [
        { offset: "OTM6", optionType: "CE", action: "BUY", quantity: 65 },
        { offset: "OTM6", optionType: "PE", action: "BUY", quantity: 65 },
        { offset: "OTM4", optionType: "CE", action: "SELL", quantity: 65 },
        { offset: "OTM4", optionType: "PE", action: "SELL", quantity: 65 }
    ]
});
console.log(response);
```

Place OptionsMultiOrder Response

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

To place Diagonal Spread options order (Different Expiry)

```javascript
const response = await client.optionsMultiOrder({
    strategy: "Diagonal Spread Test",
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    legs: [
        { offset: "ITM2", optionType: "CE", action: "BUY", quantity: 65, expiryDate: "30DEC25" },
        { offset: "OTM2", optionType: "CE", action: "SELL", quantity: 65, expiryDate: "25NOV25" }
    ]
});
console.log(response);
```

Place OptionsMultiOrder Response

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

#### BasketOrder example

To place a new basket order:

```javascript
const basketOrders = [
    {
        symbol: "BHEL",
        exchange: "NSE",
        action: "BUY",
        quantity: 1,
        pricetype: "MARKET",
        product: "MIS"
    },
    {
        symbol: "ZOMATO",
        exchange: "NSE",
        action: "SELL",
        quantity: 1,
        pricetype: "MARKET",
        product: "MIS"
    }
];
const response = await client.basketOrder({ orders: basketOrders });
console.log(response);
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

#### SplitOrder example

To place a new split order:

```javascript
const response = await client.splitOrder({
    symbol: "YESBANK",
    exchange: "NSE",
    action: "SELL",
    quantity: 105,
    splitSize: 20,
    priceType: "MARKET",
    product: "MIS"
});
console.log(response);
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

#### ModifyOrder Example

To modify an existing order:

```javascript
const response = await client.modifyOrder({
    orderId: "250408001002736",
    strategy: "NodeJS",
    symbol: "YESBANK",
    action: "BUY",
    exchange: "NSE",
    priceType: "LIMIT",
    product: "CNC",
    quantity: 1,
    price: 16.5
});
console.log(response);
```

**Modify Order Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelOrder Example

To cancel an existing order:

```javascript
const response = await client.cancelOrder({
    orderId: "250408001002736",
    strategy: "NodeJS"
});
console.log(response);
```

**Cancelorder Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelAllOrder Example

To cancel all open orders and trigger pending orders

```javascript
const response = await client.cancelAllOrder({
    strategy: "NodeJS"
});
console.log(response);
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

#### ClosePosition Example

To close all open positions across various exchanges

```javascript
const response = await client.closePosition({
    strategy: "NodeJS"
});
console.log(response);
```

**ClosePosition Response**

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

#### OrderStatus Example

To Get the Current OrderStatus

```javascript
const response = await client.orderStatus({
    orderId: "250828000185002",
    strategy: "Test Strategy"
});
console.log(response);
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

#### OpenPosition Example

To Get the Current OpenPosition

```javascript
const response = await client.openPosition({
    strategy: "Test Strategy",
    symbol: "YESBANK",
    exchange: "NSE",
    product: "MIS"
});
console.log(response);
```

OpenPosition Response

```json
{"quantity": "-10", "status": "success"}
```

#### Quotes Example

```javascript
const response = await client.quotes({ symbol: "RELIANCE", exchange: "NSE" });
console.log(response);
```

**Quotes response**

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

#### MultiQuotes Example

```javascript
const response = await client.multiQuotes({
    symbols: [
        { symbol: "RELIANCE", exchange: "NSE" },
        { symbol: "TCS", exchange: "NSE" },
        { symbol: "INFY", exchange: "NSE" }
    ]
});
console.log(response);
```

**MultiQuotes response**

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

#### Depth Example

```javascript
const response = await client.depth({ symbol: "SBIN", exchange: "NSE" });
console.log(response);
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
      { "price": 769.6, "quantity": 767 },
      { "price": 769.65, "quantity": 115 },
      { "price": 769.7, "quantity": 162 },
      { "price": 769.75, "quantity": 1121 },
      { "price": 769.8, "quantity": 430 }
    ],
    "bids": [
      { "price": 769.4, "quantity": 886 },
      { "price": 769.35, "quantity": 212 },
      { "price": 769.3, "quantity": 351 },
      { "price": 769.25, "quantity": 343 },
      { "price": 769.2, "quantity": 399 }
    ]
  }
}
```

#### History Example

```javascript
const response = await client.history({
    symbol: "SBIN",
    exchange: "NSE",
    interval: "5m",
    startDate: "2025-04-01",
    endDate: "2025-04-08"
});
console.log(response);
```

The REST endpoint answers with `{"status": "success", "data": [...]}`; `history()` unwraps it and hands back the candle array directly, returning the raw error object instead when the call fails. Every candle carries an `oi` field, populated for F&O exchanges and `0` elsewhere.

**History Response**

```json
[
  {
    "timestamp": 1759290300,
    "open": 772.5,
    "high": 774.0,
    "low": 763.2,
    "close": 766.5,
    "volume": 318625
  },
  {
    "timestamp": 1759290600,
    "open": 773.2,
    "high": 774.95,
    "low": 772.1,
    "close": 772.45,
    "volume": 197189
  }
]
```

#### Intervals Example

```javascript
const response = await client.intervals();
console.log(response);
```

**Intervals response**

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

`intervals` reports only what the connected broker supports. The `interval` field of `/history` accepts this full set, and rejects anything else: `1s`, `5s`, `10s`, `15s`, `30s`, `45s`, `1m`, `2m`, `3m`, `5m`, `10m`, `15m`, `20m`, `30m`, `1h`, `2h`, `3h`, `4h`, `D`, `W`, `M`, `Q`, `Y`.

#### OptionChain Example

Note: To fetch entire option chain for an expiry, remove the strikeCount (optional) parameter

```javascript
const response = await client.optionChain({
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "30DEC25",
    strikeCount: 10
});
console.log(response);
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
        }
    ]
}
```

#### Symbol Example

```javascript
const response = await client.symbol({
    symbol: "NIFTY30DEC25FUT",
    exchange: "NFO"
});
console.log(response);
```

**Symbols Response**

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

#### Search Example

```javascript
const response = await client.search({ query: "NIFTY 26000 DEC CE", exchange: "NFO" });
console.log(response);
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
    }
  ],
  "message": "Found 7 matching symbols",
  "status": "success"
}
```

#### OptionSymbol Example

ATM Option

```javascript
const response = await client.optionSymbol({
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "30DEC25",
    offset: "ATM",
    optionType: "CE"
});
console.log(response);
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

```javascript
const response = await client.optionSymbol({
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "30DEC25",
    offset: "ITM3",
    optionType: "PE"
});
console.log(response);
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

```javascript
const response = await client.optionSymbol({
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "30DEC25",
    offset: "OTM4",
    optionType: "CE"
});
console.log(response);
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

#### SyntheticFuture Example

```javascript
const response = await client.syntheticFuture({
    underlying: "NIFTY",
    exchange: "NSE_INDEX",
    expiryDate: "25NOV25"
});
console.log(response);
```

SyntheticFuture **Response**

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

#### OptionGreeks Example

```javascript
const response = await client.optionGreeks({
    symbol: "NIFTY25NOV2526000CE",
    exchange: "NFO",
    interestRate: 0.00,
    underlyingSymbol: "NIFTY",
    underlyingExchange: "NSE_INDEX"
});
console.log(response);
```

OptionGreeks **Response**

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

#### Expiry Example

```javascript
const response = await client.expiry({
    symbol: "NIFTY",
    exchange: "NFO",
    instrumenttype: "options"
});
console.log(response);
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

#### Instruments Example

```javascript
const response = await client.instruments({ exchange: "NSE" });
console.log(response);
```

`/instruments` is the one v1 market-data endpoint that is a GET rather than a POST. It takes `apikey`, an optional `exchange` and an optional `format` (`json` or `csv`) as query parameters:

```http
GET http://127.0.0.1:5000/api/v1/instruments?apikey=<your_app_apikey>&exchange=NSE&format=json
```

The Node.js SDK currently POSTs to this endpoint, which the server answers with HTTP 405. Until that is fixed, fetch the instrument master with a plain GET.

Instruments **Response**

```json
{
  "status": "success",
  "data": [
    {
      "brexchange": "NSE",
      "brsymbol": "NSE:NEOGEN-EQ",
      "exchange": "NSE",
      "expiry": null,
      "instrumenttype": "EQ",
      "lotsize": 1,
      "name": "NEOGEN CHEMICALS LIMITED",
      "strike": -1.0,
      "symbol": "NEOGEN",
      "tick_size": 0.10,
      "token": "10100000009917"
    }
  ]
}
```

#### Telegram Alert Example

```javascript
const response = await client.telegram({
    username: "<openalgo_loginid>",
    message: "NIFTY crossed 26000!"
});
console.log(response);
```

**Telegram Alert Response**

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

#### WhatsApp Alert Example

`whatsapp()` posts to `/whatsapp/notify`. Give it a `username`, a `to` (a phone number in E.164 digits, or an array of up to five for a small broadcast), or neither, in which case the message goes to the paired device's own number.

```javascript
const response = await client.whatsapp({
    username: "<openalgo_loginid>",
    message: "NIFTY crossed 26000!"
});
console.log(response);
```

The device must already be paired from the `/whatsapp` page in OpenAlgo; an unpaired device returns HTTP 409 rather than queueing the message.


#### Funds Example

```javascript
const response = await client.funds();
console.log(response);
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

#### Margin Example

```javascript
const response = await client.margin({
    positions: [
        {
            symbol: "NIFTY25NOV2525000CE",
            exchange: "NFO",
            action: "BUY",
            product: "NRML",
            priceType: "MARKET",
            quantity: "65"
        },
        {
            symbol: "NIFTY25NOV2525500CE",
            exchange: "NFO",
            action: "SELL",
            product: "NRML",
            priceType: "MARKET",
            quantity: "65"
        }
    ]
});
console.log(response);
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

#### OrderBook Example

```javascript
const response = await client.orderbook();
console.log(response);
```

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

#### TradeBook Example

```javascript
const response = await client.tradebook();
console.log(response);
```

TradeBook Response

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

#### PositionBook Example

```javascript
const response = await client.positionbook();
console.log(response);
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

#### Holdings Example

```javascript
const response = await client.holdings();
console.log(response);
```

Holdings Response

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

#### Holidays Example

```javascript
const response = await client.holidays({ year: 2026 });
console.log(response);
```

**Holidays Response**

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
        {
          "end_time": 1741677900000,
          "exchange": "MCX",
          "start_time": 1741624200000
        }
      ]
    }
  ],
  "status": "success"
}
```

#### Timings Example

```javascript
const response = await client.timings({ date: "2025-12-19" });
console.log(response);
```

**Timings Response**

```json
{
  "data": [
    { "end_time": 1766138400000, "exchange": "NSE", "start_time": 1766115900000 },
    { "end_time": 1766138400000, "exchange": "BSE", "start_time": 1766115900000 },
    { "end_time": 1766138400000, "exchange": "NFO", "start_time": 1766115900000 },
    { "end_time": 1766138400000, "exchange": "BFO", "start_time": 1766115900000 },
    { "end_time": 1766168700000, "exchange": "MCX", "start_time": 1766115000000 },
    { "end_time": 1766143800000, "exchange": "BCD", "start_time": 1766115000000 },
    { "end_time": 1766143800000, "exchange": "CDS", "start_time": 1766115000000 }
  ],
  "status": "success"
}
```

#### Analyzer Status Example

```javascript
const response = await client.analyzerstatus();
console.log(response);
```

Analyzer Status Response

```json
{
  "data": { "analyze_mode": true, "mode": "analyze", "total_logs": 2 },
  "status": "success"
}
```

#### Analyzer Toggle Example

```javascript
// Switch to analyze mode (simulated responses)
const response = await client.analyzertoggle({ mode: true });
console.log(response);
```

Analyzer Toggle Response

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

#### Endpoints not wrapped by the SDK

The Node.js SDK does not expose helpers for the GTT endpoints, `multioptiongreeks` or `ping`. Reach them by posting to the REST endpoint directly at `http://127.0.0.1:5000/api/v1/<endpoint>`, passing the same `apikey` field the SDK sends.

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

#### WebSocket connection notes

The proxy listens on `ws://127.0.0.1:8765`. Every client authenticates with its OpenAlgo API key before subscribing, and a connection that has not authenticated within 15 seconds is closed. Subscriptions carry a mode: `1` for LTP, `2` for Quote and `3` for Depth. The strings `LTP`, `Quote` and `Depth` are accepted as well and are matched case-insensitively; Quote is the default when the field is omitted. LTP updates are throttled to one per symbol per 50 ms, so a fast-moving symbol delivers at most 20 LTP messages a second.

#### LTP Data (Streaming Websocket)

```javascript
import OpenAlgo from 'openalgo';

// Initialize OpenAlgo client
const client = new OpenAlgo(
    'your_api_key',                   // Replace with your actual OpenAlgo API key
    'http://127.0.0.1:5000',          // REST API host
    'v1',                             // API version
    'ws://127.0.0.1:8765'             // WebSocket host
);

// Define instruments to subscribe for LTP
const instruments = [
    { exchange: "NSE", symbol: "RELIANCE" },
    { exchange: "NSE", symbol: "INFY" }
];

// Callback function for LTP updates
function onLTP(data) {
    console.log("LTP Update Received:");
    console.log(data);
}

async function runLTPTest() {
    try {
        // Connect and subscribe
        await client.connect();
        client.subscribe_ltp(instruments, onLTP);

        // Run for 10 seconds to receive data
        console.log('Listening for 10 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } finally {
        // Unsubscribe and disconnect
        client.unsubscribe_ltp(instruments);
        client.disconnect();
        console.log('\nTest completed - Disconnected');
    }
}

runLTPTest();
```

#### Quotes (Streaming Websocket)

```javascript
import OpenAlgo from 'openalgo';

// Initialize OpenAlgo client
const client = new OpenAlgo(
    'your_api_key',                   // Replace with your actual OpenAlgo API key
    'http://127.0.0.1:5000',          // REST API host
    'v1',                             // API version
    'ws://127.0.0.1:8765'             // WebSocket host
);

// Instruments list
const instruments = [
    { exchange: "NSE", symbol: "RELIANCE" },
    { exchange: "NSE", symbol: "INFY" }
];

// Callback for Quote updates
function onQuote(data) {
    console.log("Quote Update Received:");
    console.log(data);
}

async function runQuoteTest() {
    try {
        // Connect and subscribe to quote stream
        await client.connect();
        client.subscribe_quote(instruments, onQuote);

        // Keep the script running to receive data
        console.log('Listening for 10 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } finally {
        client.unsubscribe_quote(instruments);
        client.disconnect();
        console.log('\nTest completed - Disconnected');
    }
}

runQuoteTest();
```

#### Depth (Streaming Websocket)

```javascript
import OpenAlgo from 'openalgo';

// Initialize OpenAlgo client
const client = new OpenAlgo(
    'your_api_key',                   // Replace with your actual OpenAlgo API key
    'http://127.0.0.1:5000',          // REST API host
    'v1',                             // API version
    'ws://127.0.0.1:8765'             // WebSocket host
);

// Instruments list for depth
const instruments = [
    { exchange: "NSE", symbol: "RELIANCE" },
    { exchange: "NSE", symbol: "INFY" }
];

// Callback for market depth updates
function onDepth(data) {
    console.log("Market Depth Update Received:");
    console.log(data);
}

async function runDepthTest() {
    try {
        // Connect and subscribe to depth stream
        await client.connect();
        client.subscribe_depth(instruments, onDepth);

        // Run for 10 seconds to collect data
        console.log('Listening for 10 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } finally {
        client.unsubscribe_depth(instruments);
        client.disconnect();
        console.log('\nTest completed - Disconnected');
    }
}

runDepthTest();
```

#### Order Updates (Streaming WebSocket)

The same proxy on port 8765 also carries account-scoped order updates. The Node.js SDK does not wrap them, so send the raw frames on your own WebSocket connection: authenticate first, then subscribe.

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

Please refer to the documentation and consult the API reference for details on optional parameters:

* [API Documentation](https://docs.openalgo.in/api-documentation/v1)
* [Order Constants](https://docs.openalgo.in/api-documentation/v1/order-constants)
