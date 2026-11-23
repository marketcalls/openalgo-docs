# GO

## Go

To install the OpenAlgo Go library, use go get:

```bash
go get github.com/marketcalls/openalgo-go
```

#### Get the OpenAlgo apikey

Make Sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

#### Getting Started with OpenAlgo

First, import the openalgo package and initialize the client with your API key:

```go
package main

import (
    "fmt"
    "github.com/marketcalls/openalgo-go/openalgo"
)

func main() {
    // Replace 'your_api_key_here' with your actual API key
    // Default host is http://127.0.0.1:5000
    client := openalgo.NewClient("your_api_key_here", "http://127.0.0.1:5000")

    // Or with an explicit API version and WebSocket URL:
    // client := openalgo.NewClient("your_api_key_here", "http://127.0.0.1:5000", "v1", "ws://127.0.0.1:8765")
    _ = client
}
```

`NewClient` takes the API key and host, then optional strings and integers. Version defaults to `v1` and the WebSocket port to `8765`, so the WebSocket URL is derived from the host as `ws://127.0.0.1:8765` unless you pass one explicitly.

#### Check OpenAlgo Version

```go
import "github.com/marketcalls/openalgo-go/openalgo"

fmt.Println("OpenAlgo version:", openalgo.Version)
```

#### Examples

Please refer to the documentation on [order constants](https://docs.openalgo.in/api-documentation/v1/order-constants), and consult the API reference for details on optional parameters

#### PlaceOrder example

To place a new market order:

```go
response, err := client.PlaceOrder(
    "Go",           // strategy
    "NHPC",         // symbol
    "BUY",          // action
    "NSE",          // exchange
    "MARKET",       // priceType
    "MIS",          // product
    1,              // quantity
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

Place Market Order Response

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```go
response, err := client.PlaceOrder(
    "Go",           // strategy
    "YESBANK",      // symbol
    "BUY",          // action
    "NSE",          // exchange
    "LIMIT",        // priceType
    "MIS",          // product
    1,              // quantity
    map[string]interface{}{
        "price":         "16",
        "trigger_price": "0",
    },
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

Place Limit Order Response

```json
{"orderid": "250408001003813", "status": "success"}
```

#### PlaceSmartOrder Example

To place a smart order considering the current position size:

```go
response, err := client.PlaceSmartOrder(
    "Go",           // strategy
    "TATAMOTORS",   // symbol
    "SELL",         // action
    "NSE",          // exchange
    "MARKET",       // priceType
    "MIS",          // product
    1,              // quantity
    5,              // positionSize
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

Place Smart Market Order Response

```json
{"orderid": "250408000997543", "status": "success"}
```

#### OptionsOrder Example

To place ATM options order

```go
response, err := client.OptionsOrder(
    "Go",           // strategy
    "NIFTY",        // underlying
    "NSE_INDEX",    // exchange
    "28OCT25",      // expiryDate
    "ATM",          // offset
    "CE",           // optionType
    "BUY",          // action
    65,             // quantity
    "MARKET",       // priceType
    "NRML",         // product
    0,              // splitSize
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.OptionsOrder(
    "Go",           // strategy
    "NIFTY",        // underlying
    "NSE_INDEX",    // exchange
    "28OCT25",      // expiryDate
    "ITM4",         // offset
    "PE",           // optionType
    "BUY",          // action
    65,             // quantity
    "MARKET",       // priceType
    "NRML",         // product
    0,              // splitSize
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### OptionsMultiOrder Example

To place Iron Condor options order (Same Expiry)

```go
legs := []openalgo.OptionsLeg{
    {Offset: "OTM6", OptionType: "CE", Action: "BUY", Quantity: "65"},
    {Offset: "OTM6", OptionType: "PE", Action: "BUY", Quantity: "65"},
    {Offset: "OTM4", OptionType: "CE", Action: "SELL", Quantity: "65"},
    {Offset: "OTM4", OptionType: "PE", Action: "SELL", Quantity: "65"},
}

response, err := client.OptionsMultiOrder(
    "Iron Condor Test",  // strategy
    "NIFTY",             // underlying
    "NSE_INDEX",         // exchange
    "25NOV25",           // expiryDate
    legs,
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
legs := []openalgo.OptionsLeg{
    {Offset: "ITM2", OptionType: "CE", Action: "BUY", Quantity: "65", ExpiryDate: "30DEC25"},
    {Offset: "OTM2", OptionType: "CE", Action: "SELL", Quantity: "65", ExpiryDate: "25NOV25"},
}

response, err := client.OptionsMultiOrder(
    "Diagonal Spread Test",  // strategy
    "NIFTY",                 // underlying
    "NSE_INDEX",             // exchange
    "",                      // expiryDate (empty, using per-leg expiry)
    legs,
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
orders := []map[string]interface{}{
    {
        "symbol":    "BHEL",
        "exchange":  "NSE",
        "action":    "BUY",
        "quantity":  1,
        "pricetype": "MARKET",
        "product":   "MIS",
    },
    {
        "symbol":    "ZOMATO",
        "exchange":  "NSE",
        "action":    "SELL",
        "quantity":  1,
        "pricetype": "MARKET",
        "product":   "MIS",
    },
}

response, err := client.BasketOrder("Go", orders)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.SplitOrder(
    "Go",           // strategy
    "YESBANK",      // symbol
    "NSE",          // exchange
    "SELL",         // action
    105,            // quantity
    20,             // splitSize
    "MARKET",       // priceType
    "MIS",          // product
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**SplitOrder Response**

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

#### ModifyOrder Example

To modify an existing order:

```go
response, err := client.ModifyOrder(
    "250408001002736",  // orderID
    "Go",               // strategy
    "YESBANK",          // symbol
    "BUY",              // action
    "NSE",              // exchange
    "LIMIT",            // priceType
    "CNC",              // product
    1,                  // quantity
    "16.5",             // price
    "0",                // disclosedQuantity
    "0",                // triggerPrice
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**Modify Order Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelOrder Example

To cancel an existing order:

```go
response, err := client.CancelOrder("250408001002736", "Go")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**CancelOrder Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelAllOrder Example

To cancel all open orders and trigger pending orders

```go
response, err := client.CancelAllOrder("Go")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**CancelAllOrder Response**

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

```go
response, err := client.ClosePosition("Go")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**ClosePosition Response**

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

#### OrderStatus Example

To Get the Current OrderStatus

```go
response, err := client.OrderStatus("250828000185002", "Test Strategy")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**OrderStatus Response**

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

```go
response, err := client.OpenPosition("Test Strategy", "YESBANK", "NSE", "MIS")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**OpenPosition Response**

```json
{"quantity": "-10", "status": "success"}
```

#### Quotes Example

```go
response, err := client.Quotes("RELIANCE", "NSE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### MultiQuotes Example

```go
symbols := []map[string]string{
    {"symbol": "RELIANCE", "exchange": "NSE"},
    {"symbol": "TCS", "exchange": "NSE"},
    {"symbol": "INFY", "exchange": "NSE"},
}

response, err := client.MultiQuotes(symbols)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### Depth Example

```go
response, err := client.Depth("SBIN", "NSE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
      {"price": 769.6, "quantity": 767},
      {"price": 769.65, "quantity": 115},
      {"price": 769.7, "quantity": 162},
      {"price": 769.75, "quantity": 1121},
      {"price": 769.8, "quantity": 430}
    ],
    "bids": [
      {"price": 769.4, "quantity": 886},
      {"price": 769.35, "quantity": 212},
      {"price": 769.3, "quantity": 351},
      {"price": 769.25, "quantity": 343},
      {"price": 769.2, "quantity": 399}
    ]
  }
}
```

#### History Example

```go
response, err := client.History("SBIN", "NSE", "5m", "2025-04-01", "2025-04-08")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**History Response**

```json
{
  "status": "success",
  "data": [
    {
      "timestamp": "2025-04-01T09:15:00+05:30",
      "open": 766.5,
      "high": 774.0,
      "low": 763.2,
      "close": 772.5,
      "volume": 318625
    },
    {
      "timestamp": "2025-04-01T09:20:00+05:30",
      "open": 772.45,
      "high": 774.95,
      "low": 772.1,
      "close": 773.2,
      "volume": 197189
    }
  ]
}
```

#### Intervals Example

```go
response, err := client.Intervals()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

`intervals` reports only what the connected broker supports. The `interval` field of `/history` accepts this full set, and rejects anything else: `1s`, `5s`, `10s`, `15s`, `30s`, `45s`, `1m`, `2m`, `3m`, `5m`, `10m`, `15m`, `20m`, `30m`, `1h`, `2h`, `3h`, `4h`, `D`, `W`, `M`, `Q`, `Y`.

#### OptionChain Example

Note: To fetch entire option chain for an expiry, omit the strikeCount parameter

```go
response, err := client.OptionChain("NIFTY", "NSE_INDEX", "30DEC25", 10)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
        }
    ]
}
```

#### Symbol Example

```go
response, err := client.Symbol("NIFTY30DEC25FUT", "NFO")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### Search Example

```go
response, err := client.Search("NIFTY 26000 DEC CE", "NFO")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.OptionSymbol("NIFTY", "NSE_INDEX", "30DEC25", "ATM", "CE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.OptionSymbol("NIFTY", "NSE_INDEX", "30DEC25", "ITM3", "PE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.OptionSymbol("NIFTY", "NSE_INDEX", "30DEC25", "OTM4", "CE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.SyntheticFuture("NIFTY", "NSE_INDEX", "25NOV25")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### OptionGreeks Example

```go
response, err := client.OptionGreeks(
    "NIFTY25NOV2526000CE",  // symbol
    "NFO",                   // exchange
    map[string]interface{}{
        "interest_rate":       0.00,
        "underlying_symbol":   "NIFTY",
        "underlying_exchange": "NSE_INDEX",
    },
)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### Expiry Example

```go
response, err := client.Expiry("NIFTY", "NFO", "options")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
    "25-JUN-26"
  ],
  "message": "Found 18 expiry dates for NIFTY options in NFO",
  "status": "success"
}
```

#### Instruments Example

```go
response, err := client.Instruments("NSE")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

`/instruments` is the one v1 market-data endpoint that is a GET rather than a POST. It takes `apikey`, an optional `exchange` and an optional `format` (`json` or `csv`) as query parameters:

```http
GET http://127.0.0.1:5000/api/v1/instruments?apikey=<your_app_apikey>&exchange=NSE&format=json
```

The Go SDK currently POSTs to this endpoint, which the server answers with HTTP 405. Until that is fixed, fetch the instrument master with a plain GET.

**Instruments Response**

```json
{
  "status": "success",
  "data": [
    {
      "brexchange": "NSE",
      "brsymbol": "NSE:RELIANCE-EQ",
      "exchange": "NSE",
      "expiry": null,
      "instrumenttype": "EQ",
      "lotsize": 1,
      "name": "RELIANCE INDUSTRIES LTD",
      "strike": -1.0,
      "symbol": "RELIANCE",
      "tick_size": 0.05,
      "token": "10100000002885"
    }
  ]
}
```

#### Telegram Alert Example

```go
response, err := client.Telegram("<openalgo_loginid>", "NIFTY crossed 26000!")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**Telegram Alert Response**

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

With priority:

```go
response, err := client.TelegramWithPriority("<openalgo_loginid>", "Urgent: NIFTY crossed 26000!", 10)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

#### Funds Example

```go
response, err := client.Funds()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
positions := []openalgo.MarginPosition{
    {
        Symbol:    "NIFTY25NOV2525000CE",
        Exchange:  "NFO",
        Action:    "BUY",
        Product:   "NRML",
        PriceType: "MARKET",
        Quantity:  "65",
    },
    {
        Symbol:    "NIFTY25NOV2525500CE",
        Exchange:  "NFO",
        Action:    "SELL",
        Product:   "NRML",
        PriceType: "MARKET",
        Quantity:  "65",
    },
}

response, err := client.Margin(positions)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.OrderBook()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.TradeBook()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
      "quantity": 0.0,
      "average_price": 1180.1,
      "timestamp": "13:58:03",
      "trade_value": 1180.1
    }
  ]
}
```

#### PositionBook Example

```go
response, err := client.PositionBook()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
    }
  ]
}
```

#### Holdings Example

```go
response, err := client.Holdings()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

```go
response, err := client.Holidays(2026)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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
    }
  ],
  "status": "success"
}
```

#### Timings Example

```go
response, err := client.Timings("2025-12-19")
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**Timings Response**

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

#### Analyzer Status Example

```go
response, err := client.AnalyzerStatus()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**Analyzer Status Response**

```json
{
  "data": {
    "analyze_mode": true,
    "mode": "analyze",
    "total_logs": 2
  },
  "status": "success"
}
```

#### Analyzer Toggle Example

```go
// Switch to analyze mode (simulated responses)
response, err := client.AnalyzerToggle(true)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
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

#### Ping Example

`Ping` confirms the API key is valid and reports the connected broker.

```go
response, err := client.Ping()
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(response)
```

**Ping Response**

```json
{
  "data": {
    "broker": "zerodha",
    "message": "pong"
  },
  "status": "success"
}
```

#### Endpoints not wrapped by the SDK

The Go SDK does not expose helpers for the GTT endpoints or `multioptiongreeks`. Reach them by posting to the REST endpoint directly at `http://127.0.0.1:5000/api/v1/<endpoint>`, passing the same `apikey` field the SDK sends.

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

#### WebSocket connection notes

The proxy listens on `ws://127.0.0.1:8765`. Every client authenticates with its OpenAlgo API key before subscribing, and a connection that has not authenticated within 15 seconds is closed. Subscriptions carry a mode: `1` for LTP, `2` for Quote and `3` for Depth. The strings `LTP`, `Quote` and `Depth` are accepted as well and are matched case-insensitively; Quote is the default when the field is omitted. LTP updates are throttled to one per symbol per 50 ms, so a fast-moving symbol delivers at most 20 LTP messages a second.

#### LTP Data (Streaming WebSocket)

```go
package main

import (
    "fmt"
    "time"
    "github.com/marketcalls/openalgo-go/openalgo"
)

func main() {
    client := openalgo.NewClient("your_api_key", "http://127.0.0.1:5000")

    // Connect to WebSocket
    err := client.Connect()
    if err != nil {
        fmt.Println("Error connecting:", err)
        return
    }
    defer client.Disconnect()

    // Define instruments using Instrument struct
    instruments := []openalgo.Instrument{
        {Exchange: "NSE", Symbol: "RELIANCE"},
        {Exchange: "NSE", Symbol: "INFY"},
    }

    // Subscribe to LTP
    client.SubscribeLTP(instruments, func(data interface{}) {
        fmt.Println("LTP Update:", data)
    })

    // Keep running for 10 seconds
    time.Sleep(10 * time.Second)

    // Unsubscribe
    client.UnsubscribeLTP(instruments)
}
```

#### Quotes (Streaming WebSocket)

```go
package main

import (
    "fmt"
    "time"
    "github.com/marketcalls/openalgo-go/openalgo"
)

func main() {
    client := openalgo.NewClient("your_api_key", "http://127.0.0.1:5000")

    err := client.Connect()
    if err != nil {
        fmt.Println("Error connecting:", err)
        return
    }
    defer client.Disconnect()

    instruments := []openalgo.Instrument{
        {Exchange: "NSE", Symbol: "RELIANCE"},
        {Exchange: "NSE", Symbol: "INFY"},
    }

    client.SubscribeQuote(instruments, func(data interface{}) {
        fmt.Println("Quote Update:", data)
    })

    time.Sleep(10 * time.Second)
    client.UnsubscribeQuote(instruments)
}
```

#### Depth (Streaming WebSocket)

```go
package main

import (
    "fmt"
    "time"
    "github.com/marketcalls/openalgo-go/openalgo"
)

func main() {
    client := openalgo.NewClient("your_api_key", "http://127.0.0.1:5000")

    err := client.Connect()
    if err != nil {
        fmt.Println("Error connecting:", err)
        return
    }
    defer client.Disconnect()

    instruments := []openalgo.Instrument{
        {Exchange: "NSE", Symbol: "RELIANCE"},
        {Exchange: "NSE", Symbol: "INFY"},
    }

    client.SubscribeDepth(instruments, func(data interface{}) {
        fmt.Println("Depth Update:", data)
    })

    time.Sleep(10 * time.Second)
    client.UnsubscribeDepth(instruments)
}
```

#### Order Updates (Streaming WebSocket)

The same proxy on port 8765 also carries account-scoped order updates. The Go SDK does not wrap them, so send the raw frames on your own WebSocket connection: authenticate first, then subscribe.

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
