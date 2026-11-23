# RUST

## OpenAlgo Rust SDK

To install the OpenAlgo Rust library, use cargo:

```bash
cargo add openalgo tokio --features tokio/full
```

Or add to your `Cargo.toml`:

```toml
[dependencies]
openalgo = "1.1.0"
tokio = { version = "1", features = ["full"] }
```

#### Get the OpenAlgo apikey

Make Sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

#### Getting Started with OpenAlgo

First, import the OpenAlgo client and initialize it with your API key:

```rust
use openalgo::OpenAlgo;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Replace 'your_api_key_here' with your actual API key
    // Default host is http://127.0.0.1:5000
    let client = OpenAlgo::new("your_api_key_here");

    // Or with custom host
    let client = OpenAlgo::with_config(
        "your_api_key_here",
        "http://127.0.0.1:5000",
        "v1",
        "ws://127.0.0.1:8765"
    );

    Ok(())
}
```

#### Check OpenAlgo Version

```rust
use openalgo::VERSION;
println!("OpenAlgo version: {}", VERSION);
```

#### Examples

Please refer to the documentation on [order constants](https://docs.openalgo.in/api-documentation/v1/order-constants), and consult the API reference for details on optional parameters

#### PlaceOrder example

To place a new market order:

```rust
let response = client.place_order(
    "Rust",         // strategy
    "NHPC",         // symbol
    "BUY",          // action
    "NSE",          // exchange
    "MARKET",       // pricetype
    "MIS",          // product
    "1",            // quantity
    None            // disclosed_quantity (Option<&str>)
).await?;
println!("{:?}", response);
```

Place Market Order Response

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```rust
let response = client.place_limit_order(
    "Rust",         // strategy
    "YESBANK",      // symbol
    "BUY",          // action
    "NSE",          // exchange
    "MIS",          // product
    "1",            // quantity
    "16",           // price
    None            // disclosed_quantity (Option<&str>)
).await?;
println!("{:?}", response);
```

Place Limit Order Response

```json
{"orderid": "250408001003813", "status": "success"}
```

#### PlaceSmartOrder Example

To place a smart order considering the current position size:

```rust
let response = client.place_smart_order(
    "Rust",         // strategy
    "TATAMOTORS",   // symbol
    "SELL",         // action
    "NSE",          // exchange
    "MARKET",       // pricetype
    "MIS",          // product
    "1",            // quantity
    "5"             // position_size
).await?;
println!("{:?}", response);
```

Place Smart Market Order Response

```json
{"orderid": "250408000997543", "status": "success"}
```

#### OptionsOrder Example

To place ATM options order

```rust
let response = client.options_order(
    "Rust",         // strategy
    "NIFTY",        // underlying
    "NSE_INDEX",    // exchange (the underlying's exchange, not NFO)
    "ATM",          // offset
    "CE",           // option_type
    "BUY",          // action
    "65",           // quantity
    "MARKET",       // pricetype
    "NRML",         // product (options accept MIS or NRML only)
    Some("28OCT25"),// expiry_date (Option<&str>, DDMMMYY)
    None,           // strike_int (Option<i32>)
    None            // extra (Option<HashMap<String, serde_json::Value>>)
).await?;
println!("{:?}", response);
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

```rust
let response = client.options_order(
    "Rust",         // strategy
    "NIFTY",        // underlying
    "NSE_INDEX",    // exchange
    "ITM4",         // offset
    "PE",           // option_type
    "BUY",          // action
    "65",           // quantity
    "MARKET",       // pricetype
    "NRML",         // product
    Some("28OCT25"),// expiry_date
    None,           // strike_int
    None            // extra
).await?;
println!("{:?}", response);
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

```rust
use openalgo::OptionsLeg;

let legs = vec![
    OptionsLeg::new("OTM6", "CE", "BUY", "65"),
    OptionsLeg::new("OTM6", "PE", "BUY", "65"),
    OptionsLeg::new("OTM4", "CE", "SELL", "65"),
    OptionsLeg::new("OTM4", "PE", "SELL", "65"),
];

let response = client.options_multi_order(
    "Iron Condor Test",
    "NIFTY",
    "NSE_INDEX",
    "25NOV25",
    legs
).await?;
println!("{:?}", response);
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

#### BasketOrder example

To place a new basket order:

```rust
use openalgo::BasketOrderItem;

let orders = vec![
    BasketOrderItem::new("BHEL", "NSE", "BUY", 1, "MARKET", "MIS"),
    BasketOrderItem::new("ZOMATO", "NSE", "SELL", 1, "MARKET", "MIS"),
];

let response = client.basket_order("Rust", orders).await?;
println!("{:?}", response);
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

```rust
let response = client.split_order(
    "Rust",
    "YESBANK",
    "SELL",
    "NSE",
    105,
    20,
    "MARKET",
    "MIS"
).await?;
println!("{:?}", response);
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

```rust
let response = client.modify_order(
    "250408001002736",  // orderid
    "Rust",             // strategy
    "YESBANK",          // symbol
    "BUY",              // action
    "NSE",              // exchange
    "LIMIT",            // pricetype
    "CNC",              // product
    "1",                // quantity
    "16.5",             // price
    Some("0"),          // disclosed_quantity (Option<&str>)
    Some("0"),          // trigger_price (Option<&str>)
    None                // extra
).await?;
println!("{:?}", response);
```

The `/modifyorder` endpoint requires every one of `apikey`, `strategy`, `exchange`, `symbol`, `orderid`, `action`, `product`, `pricetype`, `price`, `quantity`, `disclosed_quantity` and `trigger_price`. `None` omits the field from the JSON body, so pass `Some("0")` rather than `None` for `disclosed_quantity` and `trigger_price`.

**Modify Order Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelOrder Example

To cancel an existing order:

```rust
let response = client.cancel_order(
    "250408001002736",
    "Rust"
).await?;
println!("{:?}", response);
```

**CancelOrder Response**

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelAllOrder Example

To cancel all open orders and trigger pending orders

```rust
let response = client.cancel_all_order("Rust").await?;
println!("{:?}", response);
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

```rust
let response = client.close_position("Rust").await?;
println!("{:?}", response);
```

**ClosePosition Response**

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

#### OrderStatus Example

To Get the Current OrderStatus

```rust
let response = client.order_status(
    "250828000185002",
    "Test Strategy"
).await?;
println!("{:?}", response);
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

```rust
let response = client.open_position(
    "Test Strategy",
    "YESBANK",
    "NSE",
    "MIS"
).await?;
println!("{:?}", response);
```

**OpenPosition Response**

```json
{"quantity": "-10", "status": "success"}
```

#### Quotes Example

```rust
let response = client.quotes("RELIANCE", "NSE").await?;
println!("{:?}", response);
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

```rust
let response = client.multi_quotes(&[
    ("RELIANCE", "NSE"),
    ("TCS", "NSE"),
    ("INFY", "NSE")
]).await?;
println!("{:?}", response);
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

```rust
let response = client.depth("SBIN", "NSE").await?;
println!("{:?}", response);
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

```rust
let response = client.history_range(
    "SBIN",
    "NSE",
    "5m",
    "2025-04-01",
    "2025-04-08"
).await?;
println!("{:?}", response);
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

```rust
let response = client.intervals().await?;
println!("{:?}", response);
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

`expiry_date` is mandatory on `/optionchain`. `option_chain` returns the entire chain for that expiry; to limit it to a window around the ATM strike use `client.data.option_chain_strikes`, which adds a `strike_count` (1 to 100).

```rust
// Entire chain for the expiry
let response = client.option_chain(
    "NIFTY",
    "NSE_INDEX",
    "30DEC25"
).await?;
println!("{:?}", response);

// 10 strikes above and below ATM
let response = client.data.option_chain_strikes(
    "NIFTY",
    "NSE_INDEX",
    "30DEC25",
    10
).await?;
println!("{:?}", response);
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

```rust
let response = client.symbol("NIFTY30DEC25FUT", "NFO").await?;
println!("{:?}", response);
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

```rust
let response = client.search("NIFTY 26000 DEC CE", Some("NFO"), None).await?;
println!("{:?}", response);
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

```rust
let response = client.option_symbol(
    "NIFTY",          // underlying
    "NSE_INDEX",      // exchange
    "ATM",            // offset
    "CE",             // option_type
    Some("30DEC25"),  // expiry_date (Option<&str>)
    None,             // strategy (deprecated, Option<&str>)
    None,             // strike_int (Option<i32>)
    None              // extra
).await?;
println!("{:?}", response);
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

```rust
let response = client.option_symbol(
    "NIFTY",
    "NSE_INDEX",
    "ITM3",
    "PE",
    Some("30DEC25"),
    None,
    None,
    None
).await?;
println!("{:?}", response);
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

```rust
let response = client.option_symbol(
    "NIFTY",
    "NSE_INDEX",
    "OTM4",
    "CE",
    Some("30DEC25"),
    None,
    None,
    None
).await?;
println!("{:?}", response);
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

```rust
let response = client.synthetic_future(
    "NIFTY",
    "NSE_INDEX",
    "25NOV25"
).await?;
println!("{:?}", response);
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

```rust
let response = client.option_greeks(
    "NIFTY25NOV2526000CE", // symbol
    "NFO",                 // exchange
    Some(0.00),            // interest_rate (Option<f64>)
    None,                  // forward_price (Option<f64>)
    Some("NIFTY"),         // underlying_symbol (Option<&str>)
    Some("NSE_INDEX"),     // underlying_exchange (Option<&str>)
    None,                  // expiry_time (Option<&str>, HH:MM)
    None                   // extra
).await?;
println!("{:?}", response);
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

```rust
let response = client.expiry("NIFTY", "NFO", "options").await?;
println!("{:?}", response);
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

```rust
let response = client.instruments(Some("NSE")).await?;
println!("{:?}", response);
```

`/instruments` is the one v1 market-data endpoint that is a GET rather than a POST; it takes `apikey`, an optional `exchange` and an optional `format` (`json` or `csv`) as query parameters. Passing `None` for the exchange makes the SDK loop over every supported exchange and combine the results client-side.

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

```rust
let response = client.telegram(
    "<openalgo_loginid>",
    "NIFTY crossed 26000!"
).await?;
println!("{:?}", response);
```

**Telegram Alert Response**

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

With priority:

```rust
let response = client.telegram_priority(
    "<openalgo_loginid>",
    "Urgent: NIFTY crossed 26000!",
    10
).await?;
println!("{:?}", response);
```

#### Funds Example

```rust
let response = client.funds().await?;
println!("{:?}", response);
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

```rust
use openalgo::MarginPosition;

let positions = vec![
    MarginPosition::new("NIFTY25NOV2525000CE", "NFO", "BUY", "NRML", "MARKET", "65"),
    MarginPosition::new("NIFTY25NOV2525500CE", "NFO", "SELL", "NRML", "MARKET", "65"),
];

let response = client.margin(positions).await?;
println!("{:?}", response);
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

```rust
let response = client.orderbook().await?;
println!("{:?}", response);
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

```rust
let response = client.tradebook().await?;
println!("{:?}", response);
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

```rust
let response = client.positionbook().await?;
println!("{:?}", response);
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

```rust
let response = client.holdings().await?;
println!("{:?}", response);
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

```rust
let response = client.holidays(Some(2026)).await?;
println!("{:?}", response);
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

```rust
let response = client.timings(Some("2025-12-19")).await?;
println!("{:?}", response);
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

```rust
let response = client.analyzer_status().await?;
println!("{:?}", response);
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

```rust
// Switch to analyze mode (simulated responses)
let response = client.analyzer_toggle(true).await?;
println!("{:?}", response);
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

#### Endpoints not wrapped by the SDK

The Rust SDK does not expose helpers for the GTT endpoints, `multioptiongreeks` or `ping`. Reach them by posting to the REST endpoint directly at `http://127.0.0.1:5000/api/v1/<endpoint>`, passing the same `apikey` field the SDK sends.

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

The proxy listens on `ws://127.0.0.1:8765`. Every client authenticates with its OpenAlgo API key before subscribing, and a connection that has not authenticated within 15 seconds is closed. Subscriptions carry a mode: `1` for LTP, `2` for Quote and `3` for Depth. The strings `LTP`, `Quote` and `Depth` are accepted as well and are matched case-insensitively; Quote is the default when the field is omitted. LTP updates are throttled to one per symbol per 50 ms, so a fast-moving symbol still delivers at most 20 LTP messages a second.

#### LTP Data (Streaming WebSocket)

`client.websocket()` returns an `OpenAlgoWebSocket`. Calling `connect()` opens the socket to `ws://127.0.0.1:8765`, sends the `{"action": "authenticate", "api_key": ...}` handshake for you, and hands back a command sender plus a data receiver. Wrap the sender in a `WsSubscriber` to subscribe, and read ticks off the receiver as `WsData` values. There is no callback closure form.

```rust
use openalgo::{OpenAlgo, WsData, WsInstrument};
use openalgo::websocket::WsSubscriber;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = OpenAlgo::new("your_api_key");

    // Create the WebSocket client, connect and authenticate
    let ws = client.websocket();
    let (cmd_tx, mut data_rx) = ws.connect().await?;
    let subscriber = WsSubscriber::new(cmd_tx);

    // Define instruments to subscribe
    let instruments = vec![
        WsInstrument::new("NSE", "RELIANCE"),
        WsInstrument::new("NSE", "INFY"),
    ];

    // Subscribe to LTP updates
    subscriber.subscribe_ltp(instruments.clone()).await?;

    // Read updates off the data channel
    tokio::spawn(async move {
        while let Some(data) = data_rx.recv().await {
            if let WsData::Ltp(ltp) = data {
                println!("LTP Update: {:?}", ltp);
            }
        }
    });

    // Run for 10 seconds
    sleep(Duration::from_secs(10)).await;

    // Unsubscribe and disconnect
    subscriber.unsubscribe_ltp(instruments).await?;
    subscriber.disconnect().await?;

    Ok(())
}
```

LTP ticks are throttled by the proxy to one update per symbol per 50 ms.

#### Quotes (Streaming WebSocket)

```rust
use openalgo::{OpenAlgo, WsData, WsInstrument};
use openalgo::websocket::WsSubscriber;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = OpenAlgo::new("your_api_key");

    let ws = client.websocket();
    let (cmd_tx, mut data_rx) = ws.connect().await?;
    let subscriber = WsSubscriber::new(cmd_tx);

    let instruments = vec![
        WsInstrument::new("NSE", "RELIANCE"),
        WsInstrument::new("NSE", "INFY"),
    ];

    subscriber.subscribe_quote(instruments.clone()).await?;

    tokio::spawn(async move {
        while let Some(data) = data_rx.recv().await {
            if let WsData::Quote(quote) = data {
                println!("Quote Update: {:?}", quote);
            }
        }
    });

    sleep(Duration::from_secs(10)).await;

    subscriber.unsubscribe_quote(instruments).await?;
    subscriber.disconnect().await?;

    Ok(())
}
```

#### Depth (Streaming WebSocket)

```rust
use openalgo::{OpenAlgo, WsData, WsInstrument};
use openalgo::websocket::WsSubscriber;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = OpenAlgo::new("your_api_key");

    let ws = client.websocket();
    let (cmd_tx, mut data_rx) = ws.connect().await?;
    let subscriber = WsSubscriber::new(cmd_tx);

    let instruments = vec![
        WsInstrument::new("NSE", "RELIANCE"),
        WsInstrument::new("NSE", "INFY"),
    ];

    subscriber.subscribe_depth(instruments.clone()).await?;

    tokio::spawn(async move {
        while let Some(data) = data_rx.recv().await {
            if let WsData::Depth(depth) = data {
                println!("Market Depth Update: {:?}", depth);
            }
        }
    });

    sleep(Duration::from_secs(10)).await;

    subscriber.unsubscribe_depth(instruments).await?;
    subscriber.disconnect().await?;

    Ok(())
}
```

#### Cached Snapshots

`OpenAlgoWebSocket` also keeps a local snapshot cache, updated as ticks arrive. Pass `None` for both arguments to get every cached entry.

```rust
let ltp = ws.get_ltp(Some("NSE"), Some("RELIANCE"));
let quotes = ws.get_quotes(Some("NSE"), Some("RELIANCE"));
let depth = ws.get_depth(Some("NSE"), Some("RELIANCE"));
```

#### Order Updates (Streaming WebSocket)

The same proxy on port 8765 also carries account-scoped order updates. The Rust SDK does not wrap them, so send the raw frames on your own WebSocket connection: authenticate first, then subscribe.

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
