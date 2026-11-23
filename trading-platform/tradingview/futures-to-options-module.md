# Futures to Options Module

The "Futures to Options Execution Module" is a highly modular and extensible Pine Script template designed for advanced TradingView users, particularly those interested in automating options trading based on futures signals. Here’s a concise overview of the template and how traders can build on it:

<figure><img src="../../.gitbook/assets/image (4) (1).png" alt=""><figcaption></figcaption></figure>

#### Sample Template Overview

This module is structured into 8 distinct blocks, each with a specific function:

1. **OpenAlgo API Controls**: Connects to OpenAlgo for live execution, allowing integration with real trading APIs.
2. **Backtesting & Risk Controls**: Defines trading timeframes, and configurable risk parameters including Stoploss/Target (fixed, percentage, or ATR-based).
3. **Trading Strategy Block**: Users can plug in any logic here. The default implementation includes a HalfTrend + ATR channel-based strategy.
4. **Signal Mapping & Intraday Filtering**: Converts strategy conditions into buy/sell signals and handles intraday session logic.
5. **Option Symbol Generation & API Messaging**: Frames CE/PE option symbols dynamically based on spot price, expiry, and strike intervals.
6. **Trade Execution Logic**: Executes trades based on signal, handles square-off and mode control (Enable, Long-only, Short-only).
7. **SL/TP Visualization**: Plots stoploss and target markers based on the selected risk model.
8. **Trading Dashboard**: Displays real-time trade info (entry/exit signals) on the chart using tables.

```coffeescript
// This Pine Script™ code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © openalgo

//Trading Block Description

//Block1 : OpenAlgo API controls
//Block2 : Backtesting Controls & Target and Stoploss Controls
//Block3: Trading Strategy and Controls (Write your strategy Block)
//Block4: Intraday Function and Buy and Sell Signal Mapping (Signal Mapping is Required)
//Block5: Framing Option Symbols and API Message Structure
//Block6: Trade Execution Controls
//Block7: Plotting Stoploss and Target
//Block8: Plotting Trading Dashboard

//@version=6
strategy("Futures to Options Execution Module", overlay=true, fill_orders_on_standard_ohlc = true)

//Block1 :  OpenAlgo API controls

// Input controls
apikey = input.string("xxxxxxxxxxxx", title="OpenAlgo API Key", group="OpenAlgo")
strategyType = input.string("Tradingview", title="Strategy", group="OpenAlgo")
Underlying = input.symbol(title = "Underlying Symbol", defval = "NSE:NIFTY", group = "OpenAlgo")
Expiry = input.string(title="Expiry Date",defval="30JAN25",group = "OpenAlgo")
iInterval = input.int(title='Strike Interval',defval = 50, group = "OpenAlgo")
lotsize = input.int(title = "LotSize", defval = 65,group="OpenAlgo")
quantity = input.int(title = "Quantity(Lots)", defval = 1,group="OpenAlgo")
offsetCE = input.int(title = "OffsetCE", defval = 0,minval=-40,maxval=40, step=1, group="OpenAlgo")
offsetPE = input.int(title = "OffsetPE", defval = 0,minval=-40,maxval=40, step=1, group="OpenAlgo")
exchange = input.string("NFO", title="Exchange", options=["NFO", "BFO", "MCX"], group="OpenAlgo")
product = input.string("MIS", title="Product Type", options=["MIS", "NRML"], group="OpenAlgo")
algomode = input.string(title="Algo Mode",defval = "ENABLE",options=['ENABLE',"LONGONLY","SHORTONLY"])

// Hardcoded Price Type
pricetype = "MARKET"

//Get the Strike Interval
SpotC1 = request.security(Underlying,timeframe.period,close)
SpotC = SpotC1[1]

//calculate the ATM/OTM/ITM Options
strike = SpotC % iInterval > iInterval/2 ? SpotC - (SpotC%iInterval) + iInterval : SpotC - (SpotC%iInterval)
strikeCE = strike + (offsetCE * iInterval)
strikePE = strike - (offsetPE * iInterval)


////////////////////////Block 1 Module Ends ///////////////////////////////////////////////////////////////////////


//Block 2 : Backtesting Controls & Target and Stoploss Controls

FromMonth = input.int(defval=9, title='From Month', minval=1, maxval=12, group='Backtesting')
FromDay = input.int(defval=1, title='From Day', minval=1, maxval=31, group='Backtesting')
FromYear = input.int(defval=2018, title='From Year', minval=999, group='Backtesting')
ToMonth = input.int(defval=1, title='To Month', minval=1, maxval=12, group='Backtesting')
ToDay = input.int(defval=1, title='To Day', minval=1, maxval=31, group='Backtesting')
ToYear = input.int(defval=9999, title='To Year', minval=999, group='Backtesting')
start = timestamp(FromYear, FromMonth, FromDay, 00, 00)
finish = timestamp(ToYear, ToMonth, ToDay, 23, 59)
window() =>
    time >= start and time <= finish ? true : false



highlighting = input.bool(title='Highlighter On/Off ?', defval=true, group='Intraday Controls')
barcoloring = input.bool(title='Bar Coloring On/Off ?', defval=true, group='Intraday Controls')

intraday = input.bool(title='Intraday On/Off ?', defval=false, group='Intraday Controls')
marketSession = input.session(title='Market session', defval='0915-1500', confirm=false, group='Intraday Controls')

risk = input.bool(title='Stoploss/Target On/Off', defval=false, group='Stoploss/Target Controls')
itype = input.string(title='Type', defval='FIXED', options=['FIXED', 'PERCENTAGE', 'VOLATILITY'], group='Stoploss/Target Controls')
stop = input.float(defval=10.0, title='Stoploss', group='Stoploss/Target Controls')
target = input.float(defval=20.0, title='Target', group='Stoploss/Target Controls')
TickSz = input.float(defval=0.05, title='TickSize', group='Stoploss/Target Controls')
ATRMultiplier = input.float(title='ATR Multiplier', step=0.1, defval=1.5, group='Stoploss/Target Controls')
ATRLength = input.int(title='ATR Period', defval=20, group='Stoploss/Target Controls')

iATR = ta.atr(ATRLength)

////////////////////////Block 2 Module Ends ///////////////////////////////////////////////////////////////////////


//Block 3 : Trading Strategy and Controls 


amplitude = input(title = 'Amplitude', defval = 2)
channelDeviation = input(title = 'Channel Deviation', defval = 2)
//showArrows = input(title = 'Show Arrows', defval = true)
showChannels = input(title = 'Show Channels', defval = true)

var int trend = 0
var int nextTrend = 0
var float maxLowPrice = nz(low[1], low)
var float minHighPrice = nz(high[1], high)

var float up = 0.0
var float down = 0.0
float atrHigh = 0.0
float atrLow = 0.0
float arrowUp = na
float arrowDown = na

atr2 = ta.atr(100) / 2
dev = channelDeviation * atr2

highPrice = high[math.abs(ta.highestbars(amplitude))]
lowPrice = low[math.abs(ta.lowestbars(amplitude))]
highma = ta.sma(high, amplitude)
lowma = ta.sma(low, amplitude)

if nextTrend == 1
    maxLowPrice := math.max(lowPrice, maxLowPrice)

    if highma < maxLowPrice and close < nz(low[1], low)
        trend := 1
        nextTrend := 0
        minHighPrice := highPrice
        minHighPrice
else
    minHighPrice := math.min(highPrice, minHighPrice)

    if lowma > minHighPrice and close > nz(high[1], high)
        trend := 0
        nextTrend := 1
        maxLowPrice := lowPrice
        maxLowPrice

if trend == 0
    if not na(trend[1]) and trend[1] != 0
        up := na(down[1]) ? down : down[1]
        arrowUp := up - atr2
        arrowUp
    else
        up := na(up[1]) ? maxLowPrice : math.max(maxLowPrice, up[1])
        up
    atrHigh := up + dev
    atrLow := up - dev
    atrLow
else
    if not na(trend[1]) and trend[1] != 1
        down := na(up[1]) ? up : up[1]
        arrowDown := down + atr2
        arrowDown
    else
        down := na(down[1]) ? minHighPrice : math.min(minHighPrice, down[1])
        down
    atrHigh := down + dev
    atrLow := down - dev
    atrLow

ht = trend == 0 ? up : down

var color buyColor = color.blue
var color sellColor = color.red

htColor = trend == 0 ? buyColor : sellColor
htPlot = plot(ht, title = 'HalfTrend', linewidth = 2, color = htColor)

atrHighPlot = plot(showChannels ? atrHigh : na, title = 'ATR High', style = plot.style_circles, color = color.new(sellColor, 0))
atrLowPlot = plot(showChannels ? atrLow : na, title = 'ATR Low', style = plot.style_circles, color = color.new(buyColor, 0))

fill(htPlot, atrHighPlot, title = 'ATR High Ribbon', color = color.new(sellColor, 90))
fill(htPlot, atrLowPlot, title = 'ATR Low Ribbon', color = color.new(buyColor, 90))

longCondition = not na(arrowUp) and trend == 0 and trend[1] == 1
shortCondition = not na(arrowDown) and trend == 1 and trend[1] == 0

////////////////////////Block 3 Module Ends ///////////////////////////////////////////////////////////////////////

//Block 4 : Intraday Function and Buy and Sell Signal Mapping (Signal Mapping is Required)


//Remove the comments to do the long/short signal mapping

buySignal = longCondition
sellSignal = shortCondition

barInSession(sess) =>
    time(timeframe.period, sess) != 0
    
bool intradaySession = barInSession(marketSession)

buy = buySignal
sell = sellSignal

buy1 = buy[1]
sell1 = sell[1]


////////////////////////Block 4 Module Ends ///////////////////////////////////////////////////////////////////////

//Block 5 : Framing Option Symbols and API Message Structure

TSYMce= ta.valuewhen(buy,strikeCE,0)
TSYMpe= ta.valuewhen(sell,strikePE,0)

symbolinfo = str.replace_all(Underlying,"NSE:","")
symbolinfo := str.replace_all(symbolinfo,"1!","")
symbolinfo := str.replace_all(symbolinfo,"2!","")


//Framing a Option Symbols
tradSYMCE=symbolinfo + Expiry + str.tostring(TSYMce)+ 'CE'        
tradSYMPE=symbolinfo + Expiry + str.tostring(TSYMpe)+ 'PE'


//initial declarations
var islong = false
var issell = false
var symCE = ''
var symPE = ''
var exitsymCE = ''
var exitsymPE = ''
var tpslCE = ''
var tpslPE = ''


buy := not islong and buy
sell := not issell and sell

if buy
    islong := true //Buy signal is continuing
    issell := false //reset the sell continue
    symCE := symbolinfo + Expiry + str.tostring(TSYMce)+ 'CE'
    tpslCE := symCE
    exitsymPE := symPE  //storing the PE symbol value for exit
    symPE := ''

if sell
    islong :=false //Buy Signal is no more continuing
    issell :=true //Sell Signal is continuing
    symPE := symbolinfo + Expiry + str.tostring(TSYMpe)+ 'PE'
    tpslPE := symPE
    exitsymCE := symCE  //storing the CE symbol value for exit
    symCE := ''

LongCall = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + symCE + '", "action":"BUY", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'

ExitCall = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + exitsymCE + '", "action":"SELL", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'

SqCall = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + tpslCE + '", "action":"SELL", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'

LongPut = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + symPE + '", "action":"BUY", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'

ExitPut = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + exitsymPE + '", "action":"SELL", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'

SqPut = '{   "apikey":"' + apikey + '", "strategy":"' + strategyType + '", "symbol":"' + tpslPE + '", "action":"SELL", "exchange":"' + exchange + '", "pricetype":"MARKET", "product":"' + product + '", "quantity":"' + str.tostring(quantity * lotsize) + '" }'


 //assign trading signals
if(not intraday)
    buy := buy
    sell := sell

if(intraday)
    buy := buy and intradaySession
    sell := sell and intradaySession 

////////////////////////Block 5 Module Ends ///////////////////////////////////////////////////////////////////////


//Block 6 : Trade Execution Controls


if(algomode=="ENABLE")
    //Buy Fresh Call Option
    if buy and strategy.position_size == 0 and window()
        strategy.entry('LONGCALL', strategy.long, alert_message=LongCall)
    
    //Buy Fresh Put Option
    if sell and strategy.position_size == 0 and window()
        strategy.entry('LONGPUT', strategy.short, alert_message=LongPut)
    
    
    //Exit Old Put Option and Enter Fresh Call Option (Buy)
    if buy and strategy.position_size < 0 and window()
        strategy.close('LONGPUT', alert_message=ExitPut)
        strategy.entry('LONGCALL', strategy.long, alert_message=LongCall)
    
    //Exit Old Call Option and Enter Fresh Put Option (Buy)
    if sell and strategy.position_size > 0 and window()
        strategy.close('LONGCALL' ,alert_message=ExitCall)
        strategy.entry('LONGPUT', strategy.short, alert_message=LongPut)
        
if(algomode=="LONGONLY")
    //Buy Fresh Call Option
    if buy and strategy.position_size == 0 and window()
        strategy.entry('LONGCALL', strategy.long, alert_message=LongCall)
    
    if sell and strategy.position_size > 0 and window()
        strategy.close('LONGCALL' ,alert_message=ExitCall)
        
if(algomode=="SHORTONLY")
    if buy and strategy.position_size < 0 and window()
        strategy.close('LONGPUT', alert_message=ExitPut)
        
    //Buy Fresh Put Option
    if sell and strategy.position_size == 0 and window()
        strategy.entry('LONGPUT', strategy.short, alert_message=LongPut)

if(intraday)
    longsquareOff = not intradaySession and strategy.position_size > 0 
    if(longsquareOff)
        strategy.close(id='LONGCALL', comment='Square-off',alert_message=SqCall)
    shortsquareOff = not intradaySession and strategy.position_size < 0 
    if(shortsquareOff)
        strategy.close(id='LONGPUT', comment='Square-off',alert_message=SqPut)


////////////////////////Block 6 Module Ends ///////////////////////////////////////////////////////////////////////


//Block 7 : Plot Stoploss and Target


buycount = ta.barssince(buySignal)
sellcount = ta.barssince(sellSignal)
color1 = buycount[1] < sellcount[1] ? color.green : buycount[1] > sellcount[1] ? color.red : na
barcolor(barcoloring ? color1 : na)


long_stop_level = ta.valuewhen(buy1, open - stop, 0)
long_profit_level = ta.valuewhen(buy1, open + target, 0)
short_stop_level = ta.valuewhen(sell1, open + stop, 0)
short_profit_level = ta.valuewhen(sell1, open - target, 0)

if(itype=="PERCENTAGE")
    long_stop_level := ta.valuewhen(buy1, open, 0) * (100-stop)/100
    long_profit_level := ta.valuewhen(buy1, open, 0) * (100+target)/100
    long_stop_level := TickSz * math.round(long_stop_level/TickSz)
    long_profit_level := TickSz * math.round(long_profit_level/TickSz)
    short_stop_level := ta.valuewhen(sell1, open, 0) * (100+stop)/100
    short_profit_level := ta.valuewhen(sell1, open, 0) * (100-target)/100
    short_stop_level := TickSz * math.round(short_stop_level/TickSz)
    short_profit_level := TickSz * math.round(short_profit_level/TickSz)
    
if(itype=="VOLATILITY")
    long_stop_level := ta.valuewhen(buy1, open - iATR*ATRMultiplier, 0)
    long_profit_level := ta.valuewhen(buy1, open + iATR*ATRMultiplier, 0)
    short_stop_level := ta.valuewhen(sell1, open + iATR*ATRMultiplier, 0)
    short_profit_level := ta.valuewhen(sell1, open - iATR*ATRMultiplier, 0)

if(risk)
    if(strategy.position_size>0)
        strategy.exit('CALL TP/SL', 'LONGCALL', stop=long_stop_level, limit=long_profit_level,alert_message=SqCall)
    if(strategy.position_size<0)
        strategy.exit('PUT TP/SL', 'LONGPUT', stop=short_stop_level, limit=short_profit_level,alert_message=SqPut)

plot(strategy.position_size <= 0 or not risk ? na : long_stop_level, color=color.new(color.red, 0), style=plot.style_circles, linewidth=2)
plot(strategy.position_size <= 0 or not risk ? na : long_profit_level, color=color.new(color.green, 0), style=plot.style_circles, linewidth=2)
plot(strategy.position_size >= 0 or not risk ? na : short_stop_level, color=color.new(color.red, 0), style=plot.style_circles, linewidth=2)
plot(strategy.position_size >= 0 or not risk ? na : short_profit_level, color=color.new(color.green, 0), style=plot.style_circles, linewidth=2)




////////////////////////Block 7 Module Ends ///////////////////////////////////////////////////////////////////////


//Block8: Plotting Trading Dashboard

entrytext = ''
exittext = ''
if(islong)
    entrytext := 'Long Call : '+symCE
    exittext := 'Exit Put : '+exitsymPE
if(issell)
    entrytext :=  'Exit Call : '+exitsymCE
    exittext := 'Long Put : '+symPE
//Trading Dashboard
var tLog = table.new(position = position.bottom_left, rows = 2, columns = 2, bgcolor = color.black, border_width=1)
table.cell(tLog, row = 0, column = 1, text = entrytext, text_color = color.green)
table.cell_set_text(tLog, row = 0, column = 1, text = entrytext)
table.cell(tLog, row = 1, column = 1, text = exittext, text_color = color.red)
table.cell_set_text(tLog, row = 1, column = 1, text = exittext )

////////////////////////Block 8 Module Ends ///////////////////////////////////////////////////////////////////////

```

### Ensure Position Size is handled in the Properties Section

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Ensure Alert Message is Set

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Creating the Alert

Every block in this template builds its payload into an `alert_message` on the `strategy.entry`, `strategy.close` and `strategy.exit` calls. Nothing reaches OpenAlgo until you wire that through a TradingView alert.

1. Add the strategy to the chart, open the alert dialog and choose the strategy (not an indicator condition) as the alert source.
2. In the **Message** box put exactly:

```
{{strategy.order.alert_message}}
```

That placeholder is what pushes the JSON that Block 5 assembled. If you leave TradingView's default message in place, OpenAlgo receives text it cannot parse and no order is placed.

3. Under **Notifications**, tick **Webhook URL** and enter your OpenAlgo placeorder endpoint:

```
https://your-openalgo-domain/api/v1/placeorder
```

The template always sends a plain order for a named option symbol, so `/api/v1/placeorder` is the correct endpoint. Do not point it at `/api/v1/placesmartorder`, which expects a `position_size` field the template never emits.

4. Set the alert to expire as late as TradingView allows, and remember it fires on the strategy's own events, so the alert's trigger condition is driven by the script rather than by a chart condition you pick.

**Things to check before going live**

* Your OpenAlgo instance must be reachable from the internet. TradingView cannot post to `127.0.0.1`. Set `HOST_SERVER` in `.env` to your tunnel or custom domain.
* `Expiry` is the OpenAlgo expiry in DDMMMYY form, for example `30JAN25`. Update it on every rollover, because the script concatenates it into the option symbol verbatim.
* `Quantity(Lots)` is multiplied by `LotSize` before it is sent, so OpenAlgo receives the total number of units. That matches what the API expects. Keep `LotSize` in step with the exchange's current lot size.
* `Strike Interval` must match the underlying, for example 50 for NIFTY and 100 for BANKNIFTY, otherwise the strike arithmetic in Block 1 produces a symbol that does not exist.
* The spot price used for strike selection is taken from the previous bar (`SpotC = SpotC1[1]`), which keeps the symbol stable within the bar but means a fast gap can leave the strike one interval behind.
* Test with the OpenAlgo API Analyzer switched on before sending real orders.

#### How Traders Can Use It

* **Plug-and-Play Strategy Development**: Insert your own logic into Block 3 to test strategies like Moving Average Crossovers, RSI signals, or ML-driven logic.
* **Backtest Ready**: Instantly simulate performance with adjustable historical timeframes.
* **Options Execution**: Automatically converts directional futures signals into options trades with customizable offsets.
* **Risk Management**: Activate dynamic SL/TP configurations for robust risk control.
* **API Alerts**: Sends alert messages structured for API consumption, ready for auto-execution platforms.
