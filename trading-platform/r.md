# R

## OpenAlgo R SDK

The OpenAlgo R SDK lets you trade through OpenAlgo from R, RStudio or a scheduled `Rscript` job. If you already analyse markets in R, you can now place and manage orders, read your positions and funds, pull historical candles straight into a `data.frame`, work with option chains and Greeks, run strategies from the strategy module, and stream live prices and order updates, all from the same R session. Every order goes through your own OpenAlgo server and your connected broker, exactly as it does from TradingView, Amibroker or Python.

The R SDK is a port of the [OpenAlgo Python SDK](python/README.md): the same function names, the same parameter names and the same requests, so anything you learn from the Python documentation carries over. The Python SDK's technical indicators are not part of the R SDK.

The R SDK also does a few things the Python SDK does not. These additions are marked as such wherever they appear below:

* **Additional endpoints**: `ping()` to check that your broker session is logged in, `pnlsymbols()` for today's P&L per symbol in sandbox mode, `multioptiongreeks()` for the Greeks of up to 50 options at once, `ticker()` for candles as JSON or text rows, chart preferences and Telegram bot management. See "Additional Endpoints (beyond the Python SDK)" below.
* **Hosted servers**: if your OpenAlgo runs on your own domain over HTTPS, give the client `https://yourdomain.com` and the live feed connects to `wss://yourdomain.com/ws` by itself.
* **Deeper market depth** (20, 30 or 50 levels where your broker supports it) and the feed methods `unsubscribe_all()`, `get_broker_info()`, `get_supported_brokers()` and `ws_ping()`.

Source code: [https://github.com/marketcalls/openalgo-R-library](https://github.com/marketcalls/openalgo-R-library)

To install the OpenAlgo R library from GitHub (it is not on CRAN), run this in R:

```r
install.packages("remotes")
remotes::install_github("marketcalls/openalgo-R-library")
```

It needs R 4.1 or newer. The packages it depends on (`R6`, `curl`, `jsonlite`, `websocket` and `later`) are installed automatically.

#### Get the OpenAlgo apikey

Make Sure that your OpenAlgo Application is running. Login to OpenAlgo Application with valid credentials and get the OpenAlgo apikey

For detailed function parameters refer to the [API Documentation](https://docs.openalgo.in/api-documentation/v1)

#### Getting Started with OpenAlgo

Load the library and create a client with your API key:

```r
library(openalgo)

# Replace 'your_api_key_here' with your actual API key
# Specify the host URL with your hosted domain or ngrok domain.
# If running locally in windows then use the default host value.
client <- api(api_key = "your_api_key_here", host = "http://127.0.0.1:5000")
```

`api()` also accepts `version` (default `"v1"`), `timeout` (seconds, default `120`), `ws_port` (default `8765`), `ws_url` (a full WebSocket URL such as `"ws://127.0.0.1:8765"`), `verbose` (`FALSE`, `TRUE` or `2`, for feed logging) and `auto_reconnect` (default `TRUE`). Printing the client never shows your API key.

When `ws_url` is not given, the client works it out from `host`: `http://127.0.0.1:5000` gives `ws://127.0.0.1:8765` (as in the Python SDK), and a hosted server such as `https://yourdomain.com` gives `wss://yourdomain.com/ws`. See "Connecting to a Hosted Server (wss)" under WebSocket Feed.

#### Check OpenAlgo Version

```r
packageVersion("openalgo")
#> [1] '1.0.0'
```

Version 1.0.0 matches Python SDK 2.0.5.

#### Help Pages

Every function has its own R help page with its arguments, return value and examples:

```r
?api            # the client and the full list of methods
?placeorder
?history
?subscribe_ltp
?Strategy
```

#### How to Call the Functions

Functions are called on the client with `$`, using **named arguments** with the same names as the Python SDK:

```r
client$placeorder(strategy = "Python", symbol = "NHPC", action = "BUY",
                  exchange = "NSE", price_type = "MARKET", product = "MIS",
                  quantity = 1)
```

* **Name every argument.** An unnamed argument is refused with `extra arguments must be named (they are sent as payload fields)`.
* **Extra named arguments are sent to the server as additional fields**, for example `price = 16` or `trigger_price = 0` on `placeorder`.
* **The default strategy name is `"Python"`**, the same as the Python SDK. Pass your own `strategy` to tell your orders apart in the OpenAlgo order book.
* **Python values map to R values**: a Python `dict` is a named list (`list(symbol = "RELIANCE", exchange = "NSE")`), a list of dicts is a list of named lists, `True`/`False`/`None` are `TRUE`/`FALSE`/`NULL`, and a pandas DataFrame is a `data.frame`.
* Numbers can be passed as numbers. Fields the server expects as text are converted for you (`1` is sent as `"1"`, `16.5` as `"16.5"`). Pass order ids as strings.
* Decimal values are sent exactly as the Python SDK sends them: the shortest form that reads back as the same number. A price of `1180.05` is sent as `1180.05`, and a computed `0.1 + 0.2` as `0.30000000000000004`, the same digits Python sends, so an order reaches the server with the same numbers from R as from Python.

#### Reading Responses

Every function returns the server's answer as a named list, so you read a field with `$`:

```r
response <- client$placeorder(strategy = "Python", symbol = "NHPC", action = "BUY",
                              exchange = "NSE", price_type = "MARKET",
                              product = "MIS", quantity = 1)
response
#> $orderid
#> [1] "250408000989443"
#>
#> $status
#> [1] "success"

response$orderid
#> [1] "250408000989443"
```

The examples below show each response as the JSON the server returns, because it is shorter to read. The R value has exactly the same structure: JSON objects are named lists, JSON arrays are unnamed lists and `null` is `NULL`. `history()` and `instruments()` return a `data.frame` instead.

### Examples

Please refer to the documentation on [order constants](https://docs.openalgo.in/api-documentation/v1/order-constants),
and consult the API reference for details on optional parameters.

#### PlaceOrder example

To place a new market order:

```r
response <- client$placeorder(
  strategy = "Python",
  symbol = "NHPC",
  action = "BUY",
  exchange = "NSE",
  price_type = "MARKET",
  product = "MIS",
  quantity = 1
)
print(response)
```

Place Market Order Response:

```json
{"orderid": "250408000989443", "status": "success"}
```

To place a new limit order:

```r
response <- client$placeorder(
  strategy = "Python",
  symbol = "YESBANK",
  action = "BUY",
  exchange = "NSE",
  price_type = "LIMIT",
  product = "MIS",
  quantity = 1,
  price = 16,
  trigger_price = 0,
  disclosed_quantity = 0
)
print(response)
```

Place Limit Order Response:

```json
{"orderid": "250408001003813", "status": "success"}
```

#### PlaceSmartOrder Example

To place a smart order considering the current position size:

```r
response <- client$placesmartorder(
  strategy = "Python",
  symbol = "TATAMOTORS",
  action = "SELL",
  exchange = "NSE",
  price_type = "MARKET",
  product = "MIS",
  quantity = 1,
  position_size = 5
)
print(response)
```

Place Smart Market Order Response:

```json
{"orderid": "250408000997543", "status": "success"}
```

#### OptionsOrder Example

To place an ATM options order:

```r
response <- client$optionsorder(
  strategy = "Python",
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "28OCT25",
  offset = "ATM",
  option_type = "CE",
  action = "BUY",
  quantity = 75,
  price_type = "MARKET",
  product = "NRML",
  splitsize = 0
)
print(response)
```

Place Options Order Response:

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

```r
response <- client$optionsorder(
  strategy = "Python",
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "28OCT25",
  offset = "ITM4",
  option_type = "PE",
  action = "BUY",
  quantity = 75,
  price_type = "MARKET",
  product = "NRML",
  splitsize = 0
)
print(response)
```

Place Options Order Response:

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

```r
response <- client$optionsorder(
  strategy = "Python",
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "28OCT25",
  offset = "OTM5",
  option_type = "CE",
  action = "BUY",
  quantity = 75,
  price_type = "MARKET",
  product = "NRML",
  splitsize = 0
)
print(response)
```

Place Options Order Response:

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

#### OptionsMultiOrder Example

To place an Iron Condor (same expiry):

```r
response <- client$optionsmultiorder(
  strategy = "Iron Condor Test",
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "25NOV25",
  legs = list(
    list(offset = "OTM6", option_type = "CE", action = "BUY", quantity = 75),
    list(offset = "OTM6", option_type = "PE", action = "BUY", quantity = 75),
    list(offset = "OTM4", option_type = "CE", action = "SELL", quantity = 75),
    list(offset = "OTM4", option_type = "PE", action = "SELL", quantity = 75)
  )
)
print(response)
```

Place OptionsMultiOrder Response:

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

```r
response <- client$optionsmultiorder(
  strategy = "Diagonal Spread Test",
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  legs = list(
    list(offset = "ITM2", option_type = "CE", action = "BUY", quantity = 75,
         expiry_date = "30DEC25"),
    list(offset = "OTM2", option_type = "CE", action = "SELL", quantity = 75,
         expiry_date = "25NOV25")
  )
)
print(response)
```

Place OptionsMultiOrder Response:

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

Check each leg's result rather than only the top-level `status`:

```r
for (leg in response$results) {
  cat("Leg", leg$leg, leg$symbol, leg$status, "\n")
}
```

#### BasketOrder example

To place a new basket order:

```r
basket_orders <- list(
  list(
    symbol = "BHEL",
    exchange = "NSE",
    action = "BUY",
    quantity = 1,
    pricetype = "MARKET",
    product = "MIS"
  ),
  list(
    symbol = "ZOMATO",
    exchange = "NSE",
    action = "SELL",
    quantity = 1,
    pricetype = "MARKET",
    product = "MIS"
  )
)
response <- client$basketorder(orders = basket_orders)
print(response)
```

Basket Order Response:

```json
{
  "status": "success",
  "results": [
    {"symbol": "BHEL", "status": "success", "orderid": "250408000999544"},
    {"symbol": "ZOMATO", "status": "success", "orderid": "250408000997545"}
  ]
}
```

#### SplitOrder example

To place a new split order:

```r
response <- client$splitorder(
  symbol = "YESBANK",
  exchange = "NSE",
  action = "SELL",
  quantity = 105,
  splitsize = 20,
  price_type = "MARKET",
  product = "MIS"
)
print(response)
```

SplitOrder Response:

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

```r
response <- client$modifyorder(
  order_id = "250408001002736",
  strategy = "Python",
  symbol = "YESBANK",
  action = "BUY",
  exchange = "NSE",
  price_type = "LIMIT",
  product = "CNC",
  quantity = 1,
  price = 16.5
)
print(response)
```

Modify Order Response:

```json
{"orderid": "250408001002736", "status": "success"}
```

Pass order ids as strings. They are longer than R can hold exactly as a number.

#### CancelOrder Example

To cancel an existing order:

```r
response <- client$cancelorder(
  order_id = "250408001002736",
  strategy = "Python"
)
print(response)
```

CancelOrder Response:

```json
{"orderid": "250408001002736", "status": "success"}
```

#### CancelAllOrder Example

To cancel all open orders and trigger pending orders:

```r
response <- client$cancelallorder(strategy = "Python")
print(response)
```

CancelAllOrder Response:

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

To close all open positions across various exchanges:

```r
response <- client$closeposition(strategy = "Python")
print(response)
```

ClosePosition Response:

```json
{"message": "All Open Positions Squared Off", "status": "success"}
```

#### OrderStatus Example

To get the current order status:

```r
response <- client$orderstatus(
  order_id = "250828000185002",
  strategy = "Test Strategy"
)
print(response)
```

OrderStatus Response:

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

```r
response$data$order_status
#> [1] "complete"
```

#### OpenPosition Example

To get the current open position:

```r
response <- client$openposition(
  strategy = "Test Strategy",
  symbol = "YESBANK",
  exchange = "NSE",
  product = "MIS"
)
print(response)
```

OpenPosition Response:

```json
{"quantity": "-10", "status": "success"}
```

The quantity comes back as a string, as the server sends it. Use
`as.numeric(response$quantity)` to compute with it.

#### Quotes Example

```r
response <- client$quotes(symbol = "RELIANCE", exchange = "NSE")
print(response)
```

Quotes Response:

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

```r
response$data$ltp
#> [1] 1187.75
```

#### MultiQuotes Example

```r
response <- client$multiquotes(symbols = list(
  list(symbol = "RELIANCE", exchange = "NSE"),
  list(symbol = "TCS", exchange = "NSE"),
  list(symbol = "INFY", exchange = "NSE")
))
print(response)
```

MultiQuotes Response:

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

```r
for (item in response$results) {
  cat(item$symbol, item$data$ltp, "\n")
}
#> RELIANCE 1569.9
#> TCS 3162.9
#> INFY 1557.9
```

#### Depth Example

```r
response <- client$depth(symbol = "SBIN", exchange = "NSE")
print(response)
```

Depth Response:

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

```r
response$data$bids[[1]]$price
#> [1] 769.4
```

#### History Example

Download data directly from broker API:

```r
df <- client$history(
  symbol = "SBIN",
  exchange = "NSE",
  interval = "5m",
  start_date = "2025-04-01",
  end_date = "2025-04-08",
  source = "api"
)
head(df, 5)
```

Download data from Historify DuckDB (stored data):

```r
df <- client$history(
  symbol = "SBIN",
  exchange = "NSE",
  interval = "5m",
  start_date = "2025-04-01",
  end_date = "2025-04-08",
  source = "db"
)
```

History Response (a `data.frame`):

```text
> head(df, 5)
            timestamp  close   high    low   open volume
1 2025-04-01 09:15:00 772.50 774.00 763.20 766.50 318625
2 2025-04-01 09:20:00 773.20 774.95 772.10 772.45 197189
3 2025-04-01 09:25:00 775.15 775.60 772.60 773.20 227544
4 2025-04-01 09:30:00 777.35 777.50 774.85 775.15 134596
5 2025-04-01 09:35:00 778.00 778.00 776.25 777.50 145385

> tail(df, 5)
              timestamp  close   high    low   open volume
433 2025-04-08 14:00:00 768.25 770.70 767.85 768.50 142478
434 2025-04-08 14:05:00 769.10 769.80 766.60 768.15 128283
435 2025-04-08 14:10:00 769.05 769.85 768.40 769.10 119084
436 2025-04-08 14:15:00 770.05 770.50 769.05 769.05 158299
437 2025-04-08 14:20:00 769.95 770.50 769.40 770.05 125485

> nrow(df)
[1] 437
```

R data frames have no index, so where the Python SDK puts the timestamp in the pandas
index, the R result has `timestamp` as its **first column**. It is a `POSIXct` in the
`Asia/Kolkata` time zone for intraday intervals, and in `UTC` for `D`, `W` and `M` (so the
date is the trading date the server sent). Rows are sorted by time, duplicate timestamps
are dropped and row names run from 1.

When something goes wrong, `history()` returns the usual error list instead of a data
frame, so check the type before using it:

```r
if (is.data.frame(df)) {
  df$returns <- c(NA, diff(log(df$close)))
} else {
  message("History failed: ", df$message)
}
```

With `source = "db"` the server builds custom intervals (for example `2m`, `3h`, `W`,
`2W`, `M`, `Q`) from its stored 1 minute and daily candles.

#### Intervals Example

```r
response <- client$intervals()
print(response)
```

Intervals Response:

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

```r
unlist(response$data$minutes)
#> [1] "10m" "15m" "1m"  "30m" "3m"  "5m"
```

`client$interval()` is the legacy name for the same call, kept for compatibility.

#### OptionChain Example

Note: To fetch the entire option chain for an expiry, omit the `strike_count` parameter.

```r
chain <- client$optionchain(
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "30DEC25",
  strike_count = 10
)
```

OptionChain Response:

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

Print one line per strike:

```r
for (item in chain$chain) {
  ce_ltp <- if (is.null(item$ce)) "-" else item$ce$ltp
  pe_ltp <- if (is.null(item$pe)) "-" else item$pe$ltp
  cat("Strike:", item$strike, "| CE:", ce_ltp, "| PE:", pe_ltp, "\n")
}
#> Strike: 26100 | CE: 490 | PE: 193
#> Strike: 26200 | CE: 427 | PE: 227.4
```

#### Symbol Example

```r
response <- client$symbol(
  symbol = "NIFTY30DEC25FUT",
  exchange = "NFO"
)
print(response)
```

Symbol Response:

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

#### Search Example

```r
response <- client$search(query = "NIFTY 26000 DEC CE", exchange = "NFO")
print(response)
```

Search Response:

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

#### OptionSymbol Example

ATM Option:

```r
response <- client$optionsymbol(
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "30DEC25",
  offset = "ATM",
  option_type = "CE"
)
print(response)
```

OptionSymbol Response:

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

```r
response <- client$optionsymbol(
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "30DEC25",
  offset = "ITM3",
  option_type = "PE"
)
print(response)
```

OptionSymbol Response:

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

```r
response <- client$optionsymbol(
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "30DEC25",
  offset = "OTM4",
  option_type = "CE"
)
print(response)
```

OptionSymbol Response:

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

#### SyntheticFuture Example

```r
response <- client$syntheticfuture(
  underlying = "NIFTY",
  exchange = "NSE_INDEX",
  expiry_date = "25NOV25"
)
print(response)
```

SyntheticFuture Response:

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

```r
basis <- response$synthetic_future_price - response$underlying_ltp
basis
#> [1] 70
```

#### OptionGreeks Example

```r
response <- client$optiongreeks(
  symbol = "NIFTY25NOV2526000CE",
  exchange = "NFO",
  interest_rate = 0.00,
  underlying_symbol = "NIFTY",
  underlying_exchange = "NSE_INDEX"
)
print(response)
```

OptionGreeks Response:

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

Optional arguments: `interest_rate` (percent), `forward_price` (price against a custom
forward instead of fetching the underlying), `underlying_symbol`, `underlying_exchange`
and `expiry_time` (`"HH:MM"`). Leave any of them out (or `NULL`) and it is not sent.

#### Expiry Example

```r
response <- client$expiry(
  symbol = "NIFTY",
  exchange = "NFO",
  instrumenttype = "options"
)
print(response)
```

Expiry Response:

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

```r
expiries <- unlist(response$data)
expiries[1]
#> [1] "10-JUL-25"
```

#### Instruments Example

```r
nse <- client$instruments(exchange = "NSE")
tail(nse[, c("symbol", "name", "lotsize", "tick_size", "token")], 5)
```

Instruments Response (a `data.frame`):

```text
         symbol                     name lotsize tick_size          token
3042     NEOGEN NEOGEN CHEMICALS LIMITED       1      0.10 10100000009917
3043    ALANKIT          ALANKIT LIMITED       1      0.01 10100000009921
3044 EVERESTIND   EVEREST INDUSTRIES LTD       1      0.05  1010000000993
3045  VIKASLIFE   VIKAS LIFECARE LIMITED       1      0.01 10100000009931
3046   ONEPOINT    ONE POINT ONE SOL LTD       1      0.01 10100000009939
```

The columns are `symbol`, `brsymbol`, `name`, `exchange`, `token`, `expiry`, `strike`,
`lotsize`, `instrumenttype` and `tick_size`. Call `client$instruments()` with no exchange
to download every exchange and combine them into one data frame.

```r
equities <- nse[nse$instrumenttype == "EQ", ]
write.csv(nse, "nse_instruments.csv", row.names = FALSE)
```

#### Telegram Alert Example

```r
response <- client$telegram(
  username = "<openalgo_loginid>",
  message = "NIFTY crossed 26000!"
)
print(response)
```

Telegram Alert Response:

```json
{
  "message": "Notification sent successfully",
  "status": "success"
}
```

`priority` (1 to 10, default 5) marks how urgent the alert is. The username is your
OpenAlgo login, not your Telegram handle, and the account must be linked with `/link` in
the OpenAlgo Telegram bot.

#### WhatsApp Alert Example

The OpenAlgo server must already be paired with WhatsApp from its `/whatsapp` page.
With no recipient the message goes to yourself:

```r
response <- client$whatsapp("NIFTY crossed 26000!")
print(response)
```

WhatsApp Alert Response:

```json
{
  "status": "success",
  "message": "Delivered to 1, failed 0",
  "data": {"sent": ["<self>"], "failed": [], "skipped": 0}
}
```

Other forms:

```r
# One number (E.164 digits)
client$whatsapp("Are you free for a quick call?", to = "919876543210")

# A small broadcast (up to 5 numbers)
client$whatsapp("Server maintenance in 10 minutes",
                to = c("919876543210", "919812345678"))

# An OpenAlgo user linked to WhatsApp
client$whatsapp("Daily P&L report attached", username = "alice",
                document = "/srv/reports/2026-05-17.pdf", filename = "summary.pdf")

# An image with a caption (the path is on the OpenAlgo server, not uploaded)
client$whatsapp("NIFTY end-of-day chart", image = "/srv/charts/nifty_eod.png")

# Fire and forget: returns as soon as the message is queued
client$whatsapp("Stop-loss hit on BANKNIFTY!", wait_for_delivery = FALSE)
```

With `wait_for_delivery = FALSE` the response is
`{"status": "success", "message": "Queued for 1 recipient(s)", "queued": 1}`.

#### Funds Example

```r
response <- client$funds()
print(response)
```

Funds Response:

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

```r
as.numeric(response$data$availablecash)
#> [1] 320.66
```

#### Margin Example

```r
response <- client$margin(positions = list(
  list(
    symbol = "NIFTY25NOV2525000CE",
    exchange = "NFO",
    action = "BUY",
    product = "NRML",
    pricetype = "MARKET",
    quantity = "75"
  ),
  list(
    symbol = "NIFTY25NOV2525500CE",
    exchange = "NFO",
    action = "SELL",
    product = "NRML",
    pricetype = "MARKET",
    quantity = "75"
  )
))
print(response)
```

Margin Response:

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

`positions` must be an unnamed list of 1 to 50 positions. An empty list or more than 50
positions is refused before anything is sent, with `error_type = "validation_error"`.

#### OrderBook Example

```r
response <- client$orderbook()
print(response)
```

OrderBook Response:

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

```r
response <- client$tradebook()
print(response)
```

TradeBook Response:

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

```r
response <- client$positionbook()
print(response)
```

PositionBook Response:

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

A list of records turns into a data frame in one line when every record has the same
fields:

```r
positions <- do.call(rbind, lapply(response$data, as.data.frame))
positions[, c("symbol", "quantity", "pnl")]
#>     symbol quantity    pnl
#> 1     NHPC       -1   0.02
#> 2 RELIANCE        0   5.90
#> 3  YESBANK     -104 -10.44
```

#### Holdings Example

```r
response <- client$holdings()
print(response)
```

Holdings Response:

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

#### Holidays Example

```r
response <- client$holidays(year = 2026)
print(response)
```

Holidays Response:

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

#### Timings Example

```r
response <- client$timings(date = "2025-12-19")
print(response)
```

Timings Response:

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

Times are epoch milliseconds. Leave `date` out for today. An empty `data` list means the
market is closed that day. To convert a time:

```r
as.POSIXct(response$data[[1]]$start_time / 1000, tz = "Asia/Kolkata")
#> [1] "2025-12-19 09:15:00 IST"
```

#### Analyzer Status Example

```r
response <- client$analyzerstatus()
print(response)
```

Analyzer Status Response:

```json
{
  "data": {"analyze_mode": true, "mode": "analyze", "total_logs": 2},
  "status": "success"
}
```

#### Analyzer Toggle Example

```r
# Switch to analyze mode (simulated responses)
response <- client$analyzertoggle(mode = TRUE)
print(response)
```

Analyzer Toggle Response:

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

### GTT (Good Till Triggered) Orders

A GTT order is a price trigger that sits with the broker until LTP crosses your level,
then places the underlying order automatically.

There are two shapes, and picking the wrong one is the usual mistake:

| Type | Use when | Triggers | Orders fired |
|------|----------|----------|--------------|
| `SINGLE` | One entry or exit at a level | 1 | 1 |
| `OCO` | You hold a position and want both a stoploss and a target, whichever hits first | 2 | 1 of 2, the other is auto-cancelled |

For a **SINGLE**, exactly one of `triggerprice_sl` / `triggerprice_tg` carries your level
and the other stays `0`. Pick by where the trigger sits relative to LTP: `triggerprice_sl`
for a level **below** LTP (sell stop-loss, buy the dip), `triggerprice_tg` for one
**above** (breakout buy, sell at target). A SINGLE has no stoploss leg, so the suffix is
only a directional hint.

For an **OCO**, the suffix is a real role and all four fields are required:
`triggerprice_sl` with its `stoploss` limit, and `triggerprice_tg` with its `target`
limit, where `triggerprice_sl < triggerprice_tg`.

GTT accepts `CNC` and `NRML` only. `MIS` is refused: a GTT can sit for days and MIS is
squared off the same session. GTT prices and quantities are sent as JSON numbers, not
strings.

#### PlaceGTTOrder Example

```r
# SINGLE: "Buy IDEA if it dips to 9.55, with a LIMIT order at 9.50"
# LTP is above 9.55, so the trigger sits below it: triggerprice_sl
response <- client$placegttorder(
  strategy = "My GTT Strategy",
  symbol = "IDEA",
  action = "BUY",
  exchange = "NSE",
  product = "CNC",
  quantity = 1,
  price_type = "LIMIT",
  price = 9.50,
  triggerprice_sl = 9.55
)
print(response)
```

```r
# SINGLE: "Buy RELIANCE at MARKET if it breaks above 1450"
# LTP is below 1450, so the trigger sits above it: triggerprice_tg
response <- client$placegttorder(
  strategy = "My GTT Strategy",
  symbol = "RELIANCE",
  action = "BUY",
  exchange = "NSE",
  product = "CNC",
  quantity = 1,
  price_type = "MARKET",
  price = 0,
  triggerprice_tg = 1450
)
```

```r
# OCO: "I am short 5 INFY. Stop me out at 1480, take profit at 1620"
# price is 0: OCO prices each leg separately through stoploss and target
response <- client$placegttorder(
  strategy = "Bracket OCO",
  trigger_type = "OCO",
  symbol = "INFY",
  action = "SELL",
  exchange = "NSE",
  product = "CNC",
  quantity = 5,
  price_type = "LIMIT",
  price = 0,
  triggerprice_sl = 1480,
  stoploss = 1478,
  triggerprice_tg = 1620,
  target = 1622
)
```

PlaceGTTOrder Response:

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Save the `trigger_id`: modify and cancel both need it.

#### ModifyGTTOrder Example

Modify is a **full replacement**, not a patch. Every field on the trigger is replaced by
what the call sends, so pass everything you want to keep rather than only the values that
changed.

```r
response <- client$modifygttorder(
  trigger_id = "23132604291205",
  strategy = "My GTT Strategy",
  symbol = "IDEA",
  action = "BUY",
  exchange = "NSE",
  product = "CNC",
  quantity = 1,
  price_type = "LIMIT",
  price = 9.60,           # was 9.50
  triggerprice_sl = 9.65  # was 9.55
)
print(response)
```

ModifyGTTOrder Response:

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Trigger prices, limit prices, quantity and price type are modifiable. `trigger_type`,
`symbol`, `exchange` and `action` are not: cancel and re-place instead. Only active GTTs
can be modified; triggered, cancelled and expired ones are immutable.

#### CancelGTTOrder Example

```r
response <- client$cancelgttorder(
  trigger_id = "23132604291205",
  strategy = "My GTT Strategy"
)
print(response)
```

CancelGTTOrder Response:

```json
{"status": "success", "trigger_id": "23132604291205"}
```

Cancelling an OCO removes both legs atomically; there is no per-leg cancel.

#### GTTOrderBook Example

By default this lists **active** triggers only, the ones that can still fire. Pass
`status = "all"` to include the history as well (triggered, cancelled, expired,
rejected), ordered active first; in analyzer mode a fired leg also carries the
`triggered_order_id` of the sandbox order it placed.

```r
# Active triggers only (default)
response <- client$gttorderbook()
print(response)

# Active triggers first, then the triggered / cancelled / expired history
response <- client$gttorderbook(status = "all")
for (gtt in response$data) {
  cat(gtt$trigger_id, gtt$status, gtt$symbol, unlist(gtt$trigger_prices), "\n")
}
```

GTTOrderBook Response:

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

`trigger_prices` is sorted ascending: a SINGLE has one element and one leg, an OCO has two
of each with the stoploss first.

The SDK refuses an impossible trigger spec before anything leaves the machine, and
returns the refusal in the same shape as an API error:

```r
# SINGLE with no trigger price at all
str(client$placegttorder(symbol = "IDEA", action = "BUY", exchange = "NSE",
                         product = "CNC", quantity = 1, price = 9.50))
#> List of 3
#>  $ status    : chr "error"
#>  $ message   : chr "SINGLE GTT requires a positive triggerprice_sl or triggerprice_tg."
#>  $ error_type: chr "validation_error"
```

### Strategy Module

OpenAlgo's `/strategy` module runs multi-leg options strategies with end-to-end risk
management, plus a signal-driven mode for TradingView alerts. Two surfaces reach it, and
they take different credentials:

| Surface | Credential | Use for |
|---------|-----------|---------|
| `api(api_key = ...)` | Your OpenAlgo API key | Lifecycle and reads: list, status, start, stop, close_all, close_leg, runs, orders, events |
| `Strategy(...)` | The strategy's `oaws_` webhook token | The public webhook at `/strategy/webhook/<token>`, which is what TradingView posts to |

Building a strategy stays in the browser wizard at `/strategy`. The API-key surface is
lifecycle plus reads only: nothing on it can create a strategy, edit its configuration,
enable live trading, rotate a webhook token, or delete anything.

Two strategy kinds, and each refuses the other's vocabulary:

- **batch**: a multi-leg spread entered and exited as a unit. `start` / `stop`.
- **signal**: one alert moves one leg. `long_entry` / `long_exit` / `short_entry` /
  `short_exit`. There is no start and no mode: the first signal after the platform
  session boundary opens the run.

Four rules worth knowing before you call anything:

1. **`mode` on start is required and is never defaulted**, in the SDK or on the server.
   Omitting it is an R error (`argument "mode" is missing, with no default`) rather than
   a live order.
2. **Live is opt-in per strategy.** A strategy is created sandbox-only, and
   `mode = "live"` is refused with a 409 until the operator enables live trading on the
   strategy page.
3. **An accepted stop is not proof of flatness.** Read `stop_pending` and the per-leg
   outcomes; never infer flatness from the HTTP status.
4. **A strategy that is not yours answers 404**, identical to one that does not exist,
   so the id space cannot be probed.

When the server answers with an HTTP error, the strategy methods return its JSON body
with the status code attached as `code`, because that body holds the part you must act
on.

#### StrategyList Example

```r
response <- client$strategylist()
print(response)

# Optional filters. An out-of-vocabulary status is a 400, not an empty list.
client$strategylist(status = "running")
client$strategylist(q = "NIFTY")
```

StrategyList Response:

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

The list form omits `legs`; call `strategystatus` for one strategy's legs. For a stopped
strategy, `last_finalized_run$pnl_realized` is the durable final P&L.

#### StrategyStatus Example

```r
response <- client$strategystatus(strategy_id = 7)
print(response)
```

StrategyStatus Response:

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

`run` is `NULL` whenever the strategy has no current run, which is the normal state of a
stopped strategy. Prefer it over the strategy's own `status` when you need to know
whether anything is actually open:

```r
if (is.null(response$run)) {
  cat("Nothing open\n")
}
```

A populated `stop_requested_reason` means a stop is durable but not yet confirmed flat:
the run is still current and still managed.

#### StrategyStart Example

Starts a **batch** strategy: every leg's entry order is placed.

```r
response <- client$strategystart(strategy_id = 7, mode = "sandbox")
print(response)

# Partial success is a 200. Check each leg rather than assuming they all
# reached the market.
for (leg in response$legs) {
  if (!isTRUE(leg$ok)) {
    cat(sprintf("leg %s rejected: %s\n", leg$leg_id, leg$error))
  }
}
```

StrategyStart Response:

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

`ok = TRUE` with `acknowledged = FALSE` is a real broker order whose id could not be
written back, not a rejection: it reconciles itself. A second start against a running
strategy answers 409, so two triggers firing at once cannot both place a full set of
entries.

#### StrategyStop Example

Exits every owned position at market.

```r
response <- client$strategystop(strategy_id = 7)
print(response)
```

StrategyStop Response:

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

`stop_pending = TRUE` means the request is durable and its exits were accepted, but the
run stays open, subscribed and managed until fills prove every position is flat. A 409
can also carry `stop_pending = TRUE` when an unfilled entry or a refused exit still needs
management: retry the stop in that case.

#### StrategyCloseAll Example

Same stop mechanics as `strategystop`, different audit intent: a `close_all_manual`
event is written first, which proves an operator asked for a flatten.

```r
response <- client$strategycloseall(strategy_id = 7)
print(response)
```

The response has the same shape as `strategystop`.

#### StrategyCloseLeg Example

Exits one leg at market; the run continues with the rest. `leg_id` is the id the wizard
assigned within the strategy, the same value that appears in `legs[[i]]$id` on
`strategystatus`. It is not an order id.

```r
response <- client$strategycloseleg(strategy_id = 7, leg_id = 2)
print(response)
```

StrategyCloseLeg Response:

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

`run_stopped` reports only what this call could prove. A live broker normally
acknowledges before its fill, so even the last accepted exit returns `FALSE` and the fill
finalises the run later. A `leg_id` that names no open leg is a 409, not a 404.

#### StrategyRuns Example

Every activation of a strategy, newest first.

```r
response <- client$strategyruns(strategy_id = 7, limit = 10)
print(response)
```

StrategyRuns Response:

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

`limit` is 1 to 500 and is bounded rather than clamped: a value outside the range is a
400, so you learn it was refused. An overall threshold triggers an exit, it does not
promise the result: market exits fill at the available bid/ask, so `pnl_realized` can
differ from the threshold that caused the stop.

#### StrategyOrders Example

Every order the engine placed, oldest first, so an entry always precedes its exit.

```r
response <- client$strategyorders(strategy_id = 7)

# Narrow a long history to one run. A run belonging to another strategy matches
# nothing rather than leaking its orders.
response <- client$strategyorders(strategy_id = 7, run_id = 42)
print(response)
```

StrategyOrders Response:

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

A row is written **before** the broker answers, so an order can appear with
`status = "pending"` and a `NULL` `broker_order_id`. That is deliberate: an order that
reached the broker but was never recorded would be invisible to crash recovery.

#### StrategyEvents Example

The risk-event audit trail, newest first. The trail is append-only.

```r
response <- client$strategyevents(strategy_id = 7, limit = 100)

# Filters. An out-of-vocabulary kind or severity is a 400, not an empty list.
client$strategyevents(strategy_id = 7, run_id = 42)
client$strategyevents(strategy_id = 7, severity = "critical")
client$strategyevents(strategy_id = 7, kind = "run_stop_failed")
```

StrategyEvents Response:

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

### Strategy Webhook

The public webhook is what TradingView and other alert senders post to. It is not under
`/api/v1` and takes no API key: the `oaws_` token in the URL is the whole credential. It
is shown exactly once, in the browser, when the strategy is created or its token is
rotated; no endpoint returns it. Treat it as a password, and keep it out of scripts you
share (for example read it with `Sys.getenv("OPENALGO_WEBHOOK_TOKEN")`).

```r
library(openalgo)

strategy <- Strategy(
  host_url = "http://127.0.0.1:5000",
  webhook_token = "oaws_your_webhook_token_here"
)

# Batch strategy: mode is required on start and never defaulted
print(strategy$start(mode = "sandbox"))
print(strategy$stop())
```

Webhook Start Response:

```json
{
  "status": "success",
  "result": "ok",
  "message": "Strategy start accepted",
  "strategy_id": 7,
  "run_id": 42
}
```

```r
# Signal strategy: one alert moves one leg. Name the leg by id, or by symbol
# and exchange. leg_id wins when both are given.
strategy$long_entry(leg_id = 1)
strategy$long_exit(leg_id = 1)
strategy$short_entry(symbol = "RELIANCE", exchange = "NSE")
strategy$short_exit(symbol = "RELIANCE", exchange = "NSE")
```

Every documented outcome is **returned, not raised**, because the `result` label is the
contract:

```r
response <- strategy$start(mode = "sandbox")
result <- if (is.null(response$result)) "" else response$result

if (result == "ok") {
  cat("accepted, run", response$run_id, "\n")
} else if (result == "rejected_dedupe") {
  cat("duplicate delivery within 60s, already handled\n")   # HTTP 200
} else if (result == "rejected_cooling_off") {
  cat("stopped within the last 30s, try again shortly\n")   # HTTP 409
} else if (result == "rejected_live_disabled") {
  cat("enable live trading on the strategy page first\n")   # HTTP 403
}
```

A signal that does nothing is a **success with a note**, not a failure:
`Signal accepted (already_long)`. The notes are `already_long`, `already_short`,
`no_matching_position`, `outside_entry_window` and `outside_trading_window`. Reporting a
no-op as a failure invites a retry, and a retry on an order path is how one alert becomes
two positions. Being *refused* is different: a signal blocked by the strategy's
direction, or naming a leg that does not exist, answers `rejected_invalid_action` with the
engine's own message.

Other members of the webhook object:

- `strategy$signal(action, leg_id = , symbol = , exchange = )` sends any of the four
  signal actions by name.
- `strategy$send(payload)` posts a raw named list.
- `strategy$webhook_url` is the full URL. It embeds the token, so do not log it.
- `strategy$close()` releases the pooled connection.
- Printing the object never shows the token:
  `Strategy(host_url='http://127.0.0.1:5000', webhook_token=<redacted>)`.
- `Strategy()` with no token is an error. The legacy argument name `webhook_id` is still
  accepted; `webhook_token` wins when both are given.
- `strategy$strategyorder()` was removed (the webhook it posted to no longer exists) and
  always raises an error naming the replacements.

### Additional Endpoints (beyond the Python SDK)

The OpenAlgo REST API has a few documented endpoints that the Python SDK does not wrap.
The R SDK adds a method for each of them. **These methods are additions: they are not in
the Python SDK**, so the Python documentation does not cover them and a Python script
cannot call them through the SDK. They follow the same rules as every other method: named
arguments, extra named arguments sent to the server as additional fields (as query
parameters for the GET endpoints), and failures returned as error lists, never raised.
Each one has its own help page, for example `?ping`, `?ticker` or `?telegramstats`.

| Method | Endpoint | What it is for |
|--------|----------|----------------|
| `ping()` | `POST /api/v1/ping` | Check that the API key works and the broker session is logged in |
| `pnlsymbols()` | `POST /api/v1/pnl/symbols` | Today's P&L per symbol, in sandbox mode |
| `multioptiongreeks(symbols, interest_rate, expiry_time)` | `POST /api/v1/multioptiongreeks` | IV and Greeks for 1 to 50 options in one request |
| `ticker(symbol, exchange, interval, start_date, end_date, format)` | `GET /api/v1/ticker/EXCHANGE:SYMBOL` | Historical candles as JSON or as plain text rows |
| `chart()`, `updatechart(...)` | `GET` and `POST /api/v1/chart` | Read and store chart workspace preferences |
| `telegramconfig()`, `updatetelegramconfig(...)` | `GET` and `POST /api/v1/telegram/config` | Read and change the Telegram bot configuration |
| `telegramstart()`, `telegramstop()` | `POST /api/v1/telegram/start`, `/stop` | Start and stop the Telegram bot |
| `telegramusers(broker, notifications_enabled)` | `GET /api/v1/telegram/users` | List the Telegram users linked to OpenAlgo |
| `telegrambroadcast(message, filters)` | `POST /api/v1/telegram/broadcast` | Broadcast a message to the linked users |
| `telegramstats(days)` | `GET /api/v1/telegram/stats` | Bot command statistics |
| `telegrampreferences(telegram_id)`, `updatetelegrampreferences(telegram_id, ...)` | `GET` and `POST /api/v1/telegram/preferences` | Read and change one user's notification preferences |

#### Ping Example

Run this at the start of a script, before it trades: it confirms that the API key is
valid and that your broker session is logged in.

```r
response <- client$ping()
print(response)
```

Ping Response (from a live server in sandbox mode):

```json
{
  "status": "success",
  "data": {
    "message": "pong",
    "broker": "yourbroker"
  }
}
```

`broker` is the broker your OpenAlgo server is connected to. This is not an anonymous
health check: an invalid API key, or a broker session that is missing or has expired, is
answered with HTTP 403, which the client returns as an `http_error` list with
`code = 403`. A simple pre-flight check:

```r
if (!identical(client$ping()$status, "success")) {
  stop("OpenAlgo is not ready: check the API key and log in to your broker")
}
```

#### PnLSymbols Example

Today's realized and unrealized P&L of the open sandbox positions, one entry per symbol.
It works only while analyzer (sandbox) mode is on; in live mode the server answers
HTTP 400 ("This endpoint is only available in sandbox/analyzer mode").

```r
response <- client$pnlsymbols()
print(response)
```

PnLSymbols Response:

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

```r
response$total_pnl_today
#> [1] 125.5
```

#### MultiOptionGreeks Example

Implied volatility and Greeks (Black-76) for up to 50 options in one request, for example
both legs of a straddle or a whole strike ladder. Use `optiongreeks()` for a single option.

```r
response <- client$multioptiongreeks(
  symbols = list(
    list(symbol = "NIFTY30JUL2625000CE", exchange = "NFO"),
    list(symbol = "NIFTY30JUL2625000PE", exchange = "NFO")
  ),
  interest_rate = 7.0
)
print(response)
```

MultiOptionGreeks Response:

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

The options can also be given as a data frame, one option per row:

```r
legs <- data.frame(symbol = c("NIFTY30JUL2625000CE", "NIFTY30JUL2625000PE"),
                   exchange = "NFO")
greeks <- client$multioptiongreeks(symbols = legs, interest_rate = 7.0)
sapply(greeks$data, function(x) x$greeks$delta)
#> [1]  0.52 -0.48
```

- Each option needs `symbol` and `exchange` (NFO, BFO, CDS, MCX or CRYPTO);
  `underlying_symbol` and `underlying_exchange` are optional overrides.
  `expiry_time = "HH:MM"` sets the expiry time for every option (for example `"23:30"`
  for MCX).
- The client checks the list before sending, as the server does: 1 to 50 options, each
  with a `symbol` and an `exchange`. Otherwise it returns a `validation_error` list
  without calling the server.
- One option can fail while the rest succeed. The top-level `status` is then `"partial"`
  and the response is returned as is, so read `summary` and each item's `status` rather
  than the top-level status alone. When every option fails the server answers
  `"status": "error"`, which the client returns as an `api_error` list with the server's
  message.

#### Ticker Example

Historical candles for one symbol, straight from the broker, as JSON records or as plain
text rows. `history()` returns the same candles as a `data.frame` and is usually the
better choice for analysis in R; `ticker()` is useful when you want the text rows, for
example to write a file another program imports.

```r
response <- client$ticker(symbol = "RELIANCE", exchange = "NSE", interval = "D",
                          start_date = "2026-07-01", end_date = "2026-07-31")
print(response)
```

Ticker Response:

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

With `format = "txt"` a successful call returns the body as one character string, one
comma separated row per candle (`Ticker,Date,Open,High,Low,Close,Volume`, with the time
after the date for intraday intervals). A failed call is the usual error list, so test
with `is.character()`:

```r
rows <- client$ticker(symbol = "RELIANCE", exchange = "NSE", interval = "5m",
                      start_date = "2026-07-30", end_date = "2026-07-31",
                      format = "txt")
if (is.character(rows)) writeLines(rows, "RELIANCE_5m.txt")
```

The server limits the date range by interval: up to 10 years for `D`, `W` and `M`, and
30 days for intraday intervals.

#### Chart Preferences Example

The chart workspace preferences OpenAlgo stores for your API key. Every named argument of
`updatechart()` is one preference; only the preferences you pass are changed.

```r
client$updatechart(tv_theme = "dark", tv_chart_layout = list(interval = "15m"))
```

UpdateChart Response:

```json
{
  "status": "success",
  "message": "Preferences updated successfully"
}
```

```r
response <- client$chart()
print(response)
```

Chart Response:

```json
{
  "status": "success",
  "data": {
    "tv_theme": "dark",
    "tv_chart_layout": {"interval": "15m"}
  }
}
```

`updatechart()` needs 1 to 50 preferences with names of at most 50 characters; anything
else is returned as a `validation_error` list without calling the server.

#### Telegram Bot Management Examples

`telegram()` sends you an alert. These methods manage the OpenAlgo Telegram bot itself:
its configuration, starting and stopping it, the linked users and their preferences.

```r
# Read the configuration (the server masks the bot token)
client$telegramconfig()

# Change only the fields you pass
client$updatetelegramconfig(polling_mode = TRUE, rate_limit_per_minute = 30)

# Start and stop the bot
client$telegramstart()
client$telegramstop()
```

TelegramConfig Response:

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

`updatetelegramconfig()`, `telegramstart()` and `telegramstop()` answer with a status and
a message, for example `{"status": "success", "message": "Bot started successfully"}`.
`updatetelegramconfig()` accepts `token`, `webhook_url`, `polling_mode`,
`broadcast_enabled` and `rate_limit_per_minute` (1 to 120). `telegramstart()` needs a bot
token in the configuration. A stopped bot also stops the automatic order alerts and
refuses `telegram()` notifications.

```r
# Linked users, optionally filtered by broker or notification setting
client$telegramusers()
client$telegramusers(notifications_enabled = TRUE)
```

TelegramUsers Response:

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

```r
# Bot command statistics for the last 30 days (the server uses 7 when days is not given)
client$telegramstats(days = 30)
```

TelegramStats Response:

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

```r
# One user's notification preferences
client$telegrampreferences(telegram_id = 123456789)

# Change only the preferences you pass
client$updatetelegrampreferences(telegram_id = 123456789,
                                 daily_summary = TRUE, summary_time = "16:00")
```

TelegramPreferences Response:

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

`updatetelegrampreferences()` accepts `order_notifications`, `trade_notifications`,
`pnl_notifications`, `daily_summary`, `summary_time` (`"HH:MM"`), `language` and
`timezone`, and answers `{"status": "success", "message": "Preferences updated successfully"}`.

```r
client$telegrambroadcast(message = "Markets open in 15 minutes")
```

TelegramBroadcast Response:

```json
{
  "status": "success",
  "message": "Broadcast sent to 0 users, failed for 0 users",
  "success_count": 0,
  "fail_count": 0
}
```

The current server validates a broadcast but does not deliver it yet, so it reports zero
deliveries. A message can be up to 4096 characters, the server allows 5 broadcasts per
minute, and it refuses them (HTTP 403) when broadcasting is disabled in the bot
configuration. `filters` (a named list) is passed through for user filtering.

### WebSocket Feed

The feed streams live prices from the OpenAlgo WebSocket proxy (port 8765 by default):
LTP, full quotes, market depth, and the account's order updates.

#### Connecting to a Hosted Server (wss)

When OpenAlgo runs on your own domain behind HTTPS (a cloud server with a domain name and
a TLS certificate), the WebSocket feed is served on the same domain at the path `/ws`,
over secure WebSocket (`wss://`), not on port 8765. Give the client the `https://`
address and the feed URL follows from it:

```r
client <- api(api_key = "your_api_key", host = "https://yourdomain.com")
```

```r
> client
<OpenAlgoAPI>
  base_url: https://yourdomain.com/api/v1/
  ws_url:   wss://yourdomain.com/ws
  feed:     not connected
```

| `host` | Feed URL the client derives |
|--------|-----------------------------|
| `http://127.0.0.1:5000` | `ws://127.0.0.1:8765` (as in the Python SDK; `ws_port` sets the port) |
| `https://yourdomain.com` | `wss://yourdomain.com/ws` (`ws_port` is not used) |
| `https://yourdomain.com:8443` | `wss://yourdomain.com:8443/ws` |

This is an addition: the Python SDK always builds `ws://<host>:8765` from the host, so a
Python script talking to a hosted server has to pass the WebSocket URL itself. If your
server serves the feed at a different address, pass `ws_url`; it always wins over `host`
and `ws_port`:

```r
client <- api(api_key = "your_api_key", host = "https://yourdomain.com",
              ws_url = "wss://feed.yourdomain.com/ws")
```

#### How the feed runs in R

R is single threaded. Where the Python SDK runs the WebSocket on a background thread, the
R client runs it on the event loop of the `later` package, and your callbacks run on the
main R thread. Two consequences:

- **In the interactive console** the loop runs whenever the console is idle, so data
  arrives and callbacks fire on their own after `client$connect()`.
- **In a script** (`Rscript`, a scheduled job) the loop only advances while it is pumped.
  Call `client$wait(seconds)` wherever a Python script would call `time.sleep()`.
  `connect()` and the `get_*()` snapshot methods also pump the loop briefly.

Do not call `client$wait()` or `client$connect()` from inside a feed callback; the loop
cannot be pumped from there. Keep callbacks short.

#### LTP Data (Streaming WebSocket)

```r
library(openalgo)

# Initialize OpenAlgo client
client <- api(
  api_key = "your_api_key",                # Replace with your actual OpenAlgo API key
  host = "http://127.0.0.1:5000",          # REST API host
  ws_url = "ws://127.0.0.1:8765"           # WebSocket host
)

# Define instruments to subscribe for LTP
instruments <- list(
  list(exchange = "NSE", symbol = "RELIANCE"),
  list(exchange = "NSE", symbol = "INFY")
)

# Callback function for LTP updates
on_ltp <- function(data) {
  cat("LTP Update Received:", data$exchange, data$symbol, data$data$ltp, "\n")
}

# Connect and subscribe
client$connect()
client$subscribe_ltp(instruments, on_data_received = on_ltp)

# Run for a few seconds to receive data
tryCatch(
  client$wait(10),
  finally = {
    client$unsubscribe_ltp(instruments)
    client$disconnect()
  }
)
```

Each LTP update passed to the callback looks like this:

```json
{
  "type": "market_data",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "mode": 1,
  "data": {"ltp": 1424.5, "timestamp": 1760592345123}
}
```

#### Quotes (Streaming WebSocket)

```r
library(openalgo)

client <- api(
  api_key = "your_api_key",
  host = "http://127.0.0.1:5000",
  ws_url = "ws://127.0.0.1:8765"
)

instruments <- list(
  list(exchange = "NSE", symbol = "RELIANCE"),
  list(exchange = "NSE", symbol = "INFY")
)

on_quote <- function(data) {
  q <- data$data
  cat("Quote Update Received:", data$symbol,
      "O:", q$open, "H:", q$high, "L:", q$low, "LTP:", q$ltp, "Vol:", q$volume, "\n")
}

client$connect()
client$subscribe_quote(instruments, on_data_received = on_quote)

tryCatch(
  client$wait(10),
  finally = {
    client$unsubscribe_quote(instruments)
    client$disconnect()
  }
)
```

The quote `data` carries `open`, `high`, `low`, `close`, `ltp`, `volume`,
`last_trade_quantity`, `avg_trade_price`, `change`, `change_percent` and `timestamp`.

#### Depth (Streaming WebSocket)

```r
library(openalgo)

client <- api(
  api_key = "your_api_key",
  host = "http://127.0.0.1:5000",
  ws_url = "ws://127.0.0.1:8765"
)

instruments <- list(
  list(exchange = "NSE", symbol = "RELIANCE"),
  list(exchange = "NSE", symbol = "INFY")
)

on_depth <- function(data) {
  best_bid <- data$data$depth$buy[[1]]
  best_ask <- data$data$depth$sell[[1]]
  cat("Market Depth Update Received:", data$symbol,
      "bid", best_bid$price, "x", best_bid$quantity,
      "ask", best_ask$price, "x", best_ask$quantity, "\n")
}

client$connect()
client$subscribe_depth(instruments, on_data_received = on_depth)

tryCatch(
  client$wait(10),
  finally = {
    client$unsubscribe_depth(instruments)
    client$disconnect()
  }
)
```

The depth `data` carries `ltp`, `timestamp` and `depth`, where `depth$buy` and
`depth$sell` are lists of levels with `price`, `quantity` and `orders`. Five levels are
requested by default, as in the Python SDK.

**Deeper market depth (20, 30 or 50 levels).** `subscribe_depth()` takes a `depth`
argument to request a deeper order book. This is an addition: the Python SDK always
requests 5 levels.

```r
client$subscribe_depth(instruments, on_data_received = on_depth, depth = 20)
```

Which levels work (5, 20, 30 or 50) depends on your broker. With `verbose = 1` the
subscription reply shows, per symbol, the level the broker actually serves, or the reason
it refused:

```text
[SUB]    NSE:RELIANCE | Mode: Depth | Status: success | Depth: 20
```

The level is remembered per instrument, so an automatic reconnect replays each depth
subscription with the level it was made with. `get_depth()` returns every level received
(books keyed `"1"` to `"20"` in this example). A `depth` that is not a positive whole
number is refused locally: `subscribe_depth()` returns `FALSE` and logs the reason.

#### Order Updates (Streaming WebSocket)

Order updates are an account-level stream: fills, partial fills, rejections and
cancellations pushed by the broker (or by the sandbox engine in analyzer mode) after an
order is placed. No symbols are involved.

```r
library(openalgo)

client <- api(api_key = "your_api_key", host = "http://127.0.0.1:5000")

on_order_update <- function(update) {
  cat(update$orderid, update$symbol, update$order_status,
      "filled", update$filled_quantity, "of", update$quantity, "\n")
}

client$connect()
client$subscribe_orders(on_order_update = on_order_update)

client$placeorder(strategy = "Python", symbol = "NHPC", action = "BUY",
                  exchange = "NSE", price_type = "MARKET", product = "MIS",
                  quantity = 1)

tryCatch(
  client$wait(30),
  finally = {
    client$unsubscribe_orders()
    client$disconnect()
  }
)
```

Each update passed to the callback:

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

`client$get_orders()$orders` returns the updates received so far, most recent first
(at most 500).

#### Polling Snapshots

Callbacks are optional. The client also keeps the latest value per instrument, which you
can poll:

```r
client$connect()
client$subscribe_quote(instruments)

for (i in 1:5) {
  client$wait(1)
  quotes <- client$get_quotes()
  for (exch in names(quotes$quote)) {
    for (sym in names(quotes$quote[[exch]])) {
      cat(sprintf("  %s:%s = %s\n", exch, sym, quotes$quote[[exch]][[sym]]$ltp))
    }
  }
}
```

| Method | Returns |
|--------|---------|
| `client$get_ltp(exchange = NULL, symbol = NULL)` | `list(ltp = list(NSE = list(RELIANCE = list(timestamp, ltp))))` |
| `client$get_quotes(exchange = NULL, symbol = NULL)` | `list(quote = list(NSE = list(RELIANCE = list(timestamp, open, high, low, close, ltp, volume, ...))))` |
| `client$get_depth(exchange = NULL, symbol = NULL)` | `list(depth = list(NSE = list(SBIN = list(timestamp, ltp, buyBook, sellBook))))`, each book keyed `"1"` to `"5"` (or up to the number of levels received, such as `"20"`) with `price`, `qty`, `orders` |
| `client$get_orders()` | `list(orders = list(...))`, most recent first |

```r
client$get_ltp(exchange = "NSE", symbol = "RELIANCE")$ltp$NSE$RELIANCE$ltp
#> [1] 1424.5

book <- client$get_depth(exchange = "NSE", symbol = "SBIN")
book$depth$NSE$SBIN$buyBook[["1"]]$price
#> [1] 769.4
```

`subscribe_*()` and `unsubscribe_*()` return `TRUE` when the request was sent and `FALSE`
otherwise (for example when not connected). `connect()` returns `TRUE` once the
connection is authenticated. Instruments can also be given as a single named list or as a
data frame with `exchange` and `symbol` columns.

#### Feed Methods beyond the Python SDK

The OpenAlgo WebSocket server understands a few actions that the Python SDK does not
send. The R SDK adds a method for each. **These are additions, not in the Python SDK.**

| Method | What it does |
|--------|--------------|
| `client$unsubscribe_all()` | Drop every LTP, quote and depth subscription in one request |
| `client$get_broker_info(timeout = 5)` | Ask which broker serves this feed session |
| `client$get_supported_brokers(timeout = 5)` | Ask which brokers the server is configured for |
| `client$ws_ping(timeout = 5)` | Measure the round trip to the feed server, in milliseconds |

```r
client$connect()

client$get_broker_info()$broker
#> [1] "yourbroker"

unlist(client$get_supported_brokers()$brokers)
#> [1] "yourbroker"    "anotherbroker"

client$ws_ping()$latency_ms
#> [1] 4

client$unsubscribe_all()
#> [1] TRUE
```

The replies, as JSON:

```json
{"type": "broker_info", "status": "success", "broker": "yourbroker",
 "adapter_status": "connected", "user_id": "<openalgo_loginid>"}

{"type": "supported_brokers", "status": "success",
 "brokers": ["yourbroker", "anotherbroker"], "count": 2}

{"type": "pong", "status": "success", "server_timestamp": 1760592345127,
 "client_timestamp": 1760592345123, "latency_ms": 4}
```

- `unsubscribe_all()` forgets every LTP, quote and depth subscription and clears the
  cached data, so an automatic reconnect does not replay them. The order-update stream is
  not affected; stop it with `unsubscribe_orders()`. It returns `TRUE` when the request
  was sent; the local subscriptions are cleared even when it could not be sent.
- `get_broker_info()`, `get_supported_brokers()` and `ws_ping()` wait up to `timeout`
  seconds for the server's reply. While they wait the event loop keeps running, so market
  data keeps arriving and callbacks keep firing. Do not call them from inside a feed
  callback. Without a connection they return a `connection_error` list, without a reply in
  time a `timeout_error` list, and a server error reply (for example
  `"code": "NOT_AUTHENTICATED"`) is returned as is.
- `count` in the supported brokers reply is the number of brokers enabled on the server.
  `latency_ms` in the `ws_ping()` reply is added by the client: the measured round trip
  in milliseconds. The method is called `ws_ping()` because `ping()` is the REST endpoint.

#### Verbose Levels

| Level | Value | Output |
|-------|-------|--------|
| Silent | `FALSE` or `0` | Nothing from the SDK, not even errors (default) |
| Basic | `TRUE` or `1` | Connection, authentication, subscription and unsubscribe replies, server error frames and other error messages |
| Debug | `2` | Everything in Basic, plus every LTP, quote, depth and order update |

`verbose` only controls what the SDK prints. Your callbacks always run, and every method
still returns its result. Set `verbose = 1` while you are wiring up a feed: at level `0`
a failed authentication or a rejected subscription is silent.

Sample output with `verbose = TRUE`:

```text
[WS]     Connected to ws://127.0.0.1:8765
[AUTH]   Authenticating with API key: bf1267a1...7cf9169f
[AUTH]   Success | Broker: yourbroker | User: <openalgo_loginid>
[SUB]    Subscribing NSE_INDEX:NIFTY Quote...
[SUB]    Subscribing NSE:INFY Quote...
[SUB]    NSE_INDEX:NIFTY | Mode: Quote | Status: success
[SUB]    NSE:INFY | Mode: Quote | Status: success
```

With `verbose = 2` each update is printed as well, for example
`[LTP]    NSE:RELIANCE         | LTP: 1424.5` and
`[QUOTE]  NSE:INFY             | O: 1532.1     H: 1560.3     L: 1532.1     C: 1530.6     LTP: 1557.9`.

At `verbose = 1` the R client also prints two things the Python SDK does not: error
frames sent by the server, and the server's acknowledgement of every unsubscribe
(including `unsubscribe_all()`), one line per symbol:

```text
[UNSUB]  NSE:INFY | Mode: Quote | Status: success
[UNSUB]  Unsubscribe | Status: success
[ERROR]  Server error NOT_AUTHENTICATED: You must authenticate first
```

#### Auto Reconnect

`auto_reconnect` defaults to `TRUE`. After a dropped connection the client reconnects
with backoff (1, 2, 5, 10, 30, then 60 seconds), re-authenticates, and replays every
active LTP, quote and depth subscription plus the order-update subscription. Your
callbacks are kept, so they resume firing without extra code. The reconnect timers run on
the same event loop, so a script must keep calling `client$wait()`. `disconnect()` is a
graceful shutdown and does not reconnect.

```r
# Opt out and handle reconnects yourself
client <- api(api_key = "your_api_key", host = "http://127.0.0.1:5000",
              auto_reconnect = FALSE)
```

With `verbose = 1` or higher the reconnect attempts and the replayed subscriptions are
logged under the `[WS]` and `[SUB]` tags. The Python SDK's `ping_interval` and
`ping_timeout` settings have no R equivalent: the R `websocket` package does not expose
them.

### Error Handling

Like the Python SDK, the client **returns** failures instead of raising them, so a trading
loop handles a failed order the same way it handles a successful one. A failure is a named
list with `status = "error"`, a `message` and an `error_type`:

```r
response <- client$funds()
response
#> $status
#> [1] "error"
#>
#> $message
#> [1] "Failed to connect to the server. Please check if the server is running."
#>
#> $error_type
#> [1] "connection_error"
```

| `error_type` | Cause |
|--------------|-------|
| `connection_error` | The server could not be reached |
| `timeout_error` | The server did not answer within `timeout` seconds |
| `http_error` | A non-200 HTTP status or a transport failure (with `code` where known) |
| `api_error` | The server answered `status = "error"` (its `message`, plus `code`) |
| `json_error` | The server's answer was not valid JSON (with `raw_response`) |
| `validation_error` | Refused locally before sending (GTT trigger rules, margin positions, the option list of `multioptiongreeks()`, the preferences of `updatechart()`) |
| `no_data` | `history()` or `instruments()` returned nothing |
| `processing_error` | Candles or instruments could not be converted to a data frame (with `raw_data`) |
| `unknown_error` | Anything else |

A typical check:

```r
response <- client$placeorder(strategy = "Python", symbol = "NHPC", action = "BUY",
                              exchange = "NSE", price_type = "MARKET",
                              product = "MIS", quantity = 1)

if (identical(response$status, "success")) {
  cat("Order placed:", response$orderid, "\n")
} else {
  message("Order failed (", response$error_type, "): ", response$message)
}
```

Programming mistakes are R errors, the way the Python SDK raises `TypeError`, so they
stop a script instead of reaching the broker:

```r
client$placeorder(symbol = "NHPC", action = "BUY")
#> Error in client$placeorder(symbol = "NHPC", action = "BUY") :
#>   argument "exchange" is missing, with no default

client$quotes("RELIANCE", "NSE")
#> Error: extra arguments must be named (they are sent as payload fields)

client$strategystart(strategy_id = 7)
#> Error in client$strategystart(strategy_id = 7) :
#>   argument "mode" is missing, with no default
```

Wrap a call in `tryCatch()` if a script must survive such a mistake.

### Sandbox (Analyzer) Mode

OpenAlgo's analyzer mode (sandbox mode) simulates orders instead of sending them to the
broker, with sandbox capital. Responses then carry `"mode": "analyze"`. Check and switch
it from R:

```r
client$analyzerstatus()$data$mode
#> [1] "live"

client$analyzertoggle(mode = TRUE)    # simulated orders from now on
client$analyzertoggle(mode = FALSE)   # back to live orders
```

Always confirm analyzer mode before running a test script against a broker-connected
server. Simulated MARKET orders need a live price, so they fail while the market is
closed; use LIMIT orders to test on holidays. GTT triggers placed in analyzer mode carry a
`GTT-...` trigger id and fire against live LTP exactly as they would at the broker.

### Differences from the Python SDK

The R package replicates the Python SDK's REST, webhook and feed surface. It differs in
two ways: where R itself requires it, and where it adds methods for documented server
features that the Python SDK does not cover.

**Differences that R requires:**

| Python | R |
|--------|---|
| `from openalgo import api` | `library(openalgo)` |
| `client.placeorder(...)` | `client$placeorder(...)` |
| Keyword arguments | Named arguments (unnamed extras are an error) |
| `**kwargs` extra fields | Extra named arguments |
| `dict`, list of `dict` | Named list, list of named lists |
| `True` / `False` / `None` | `TRUE` / `FALSE` / `NULL` |
| `history()` returns a pandas DataFrame indexed by timestamp | `history()` returns a `data.frame` with `timestamp` as the first column (`POSIXct`, `Asia/Kolkata` intraday, `UTC` for D/W/M) |
| `instruments()` returns a pandas DataFrame | `instruments()` returns a `data.frame` |
| Feed on a background thread, `time.sleep()` keeps it running | Feed on the `later` event loop, `client$wait(seconds)` in scripts (R-only method) |
| `ping_interval` / `ping_timeout` | Not configurable |
| `with api(...) as client:` | `client$close()` releases the pooled HTTP connections |
| `openalgo.__version__` | `packageVersion("openalgo")` |
| `from openalgo import Strategy` | `Strategy(...)`, methods called as `strategy$start(mode = ...)` |
| `from openalgo import ta` (indicators) | Not included |
| Docstrings | `?placeorder`, `?history` and so on |

**Additions in the R SDK (not in the Python SDK):**

| Python SDK | R SDK |
|------------|-------|
| No methods for these documented REST endpoints | `ping()`, `pnlsymbols()`, `multioptiongreeks()`, `ticker()`, `chart()`, `updatechart()`, `telegramconfig()`, `updatetelegramconfig()`, `telegramstart()`, `telegramstop()`, `telegramusers()`, `telegrambroadcast()`, `telegramstats()`, `telegrampreferences()`, `updatetelegrampreferences()` (see Additional Endpoints above) |
| Feed URL always `ws://<host>:8765`, also for an `https://` host | `https://yourdomain.com` gives `wss://yourdomain.com/ws`; an `http://` host gives `ws://<host>:<ws_port>` as in Python |
| `subscribe_depth()` always requests 5 levels | `subscribe_depth(..., depth = 20)` requests 20, 30 or 50 levels where the broker supports it |
| No feed methods for these server actions | `unsubscribe_all()`, `get_broker_info()`, `get_supported_brokers()`, `ws_ping()` |
| Server error frames and unsubscribe acknowledgements are not printed | Printed at `verbose = 1` |

Everything else is the same: method names, parameter names and defaults (including the
default strategy name `"Python"`), the JSON payloads sent to the server (decimal values
included, sent with the same digits as Python's `json.dumps`), the response shapes, the
error lists and their `error_type` values, the GTT and margin validation rules, the
webhook result labels, the feed's subscription replay and its verbose log lines.

### Testing

The tests come in two kinds:

- **Mock tests** run against local mock servers (`webfakes` for HTTP and an in-process
  `httpuv` server for the WebSocket feed). They need no OpenAlgo installation, no API key
  and no network, and they are CRAN-safe.
- **Live tests** (`tests/testthat/test-live.R`) talk to a real OpenAlgo server. They run
  only when the `OPENALGO_API_KEY` environment variable is set, and they read the server
  address from `OPENALGO_HOST` (default `http://127.0.0.1:5000`). Tests that place orders
  run only when the server reports analyzer (sandbox) mode, so no live order is ever
  placed. At the end they print a table of every endpoint exercised, each one marked
  passed, tolerated (a legitimate server answer such as a closed market) or failed.

The live tests and a few slow mock tests (timeouts and refused connections take several
seconds) call `testthat::skip_on_cran()`, so they run only when `NOT_CRAN=true` is set.
A plain `R CMD check` runs the CRAN-safe set:

```bash
R CMD build .

# Mock tests only (CRAN-safe)
R CMD check openalgo_1.0.0.tar.gz --no-manual

# Mock tests including the slow ones
NOT_CRAN=true R CMD check openalgo_1.0.0.tar.gz --no-manual

# Everything, including the live tests against your own server in sandbox mode
NOT_CRAN=true OPENALGO_API_KEY=your_api_key OPENALGO_HOST=http://127.0.0.1:5000 \
  R CMD check openalgo_1.0.0.tar.gz --no-manual
```

Or, from an R session in the repository:

```r
Sys.setenv(NOT_CRAN = "true")                       # include the slow tests
Sys.setenv(OPENALGO_API_KEY = "your_api_key",       # include the live tests
           OPENALGO_HOST = "http://127.0.0.1:5000")
testthat::test_local()
```

Switch the server to analyzer mode before running the live tests, so that no test can
place a real order.

### Links

* Source code and issues: [https://github.com/marketcalls/openalgo-R-library](https://github.com/marketcalls/openalgo-R-library)
* [API Documentation](https://docs.openalgo.in/api-documentation/v1)
* [Order Constants](https://docs.openalgo.in/api-documentation/v1/order-constants)
