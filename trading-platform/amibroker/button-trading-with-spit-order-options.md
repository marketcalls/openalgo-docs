# Button Trading with Spit Order (Options)

This OpenAlgo SplitOrder Trading Module for AmiBroker is designed to seamlessly integrate manual button-based trading into an algorithmic workflow. It allows traders to place orders on options (ATM, ITM, OTM for both Calls and Puts) directly from the AmiBroker chart interface by clicking visual buttons. Each button sends orders through the OpenAlgo Bridge using the `/splitorder` endpoint, which intelligently splits large orders into smaller chunks as per the configured split size. The system dynamically calculates the ATM, ITM, and OTM strikes based on live market data, user-defined offsets, and strike intervals, ensuring that the correct option symbols are generated for execution. A graphical dashboard embedded in the chart shows the current calculated strikes, internal memory for each option leg, cumulative quantities traded, and the current algo enable/disable status, providing traders with full visibility and control.

<figure><img src="../../.gitbook/assets/Split Order - Options.png" alt=""><figcaption></figcaption></figure>

Additionally, the module tracks how many shares or lots have been cumulatively ordered through each button. This allows precise exits later by automatically sending exactly the accumulated quantity in the opposite direction, ensuring positions are squared off cleanly. It includes a “Close All” button that closes all open positions for all option legs using the exact quantities stored in memory, and also provides a “Clear Memory” button to reset internal counters without sending any orders. The system can be configured for both option buyers (to initiate long call or put positions) and option sellers (to short calls or puts and later cover), making it highly versatile for different option trading strategies. This entire workflow is designed for intraday or short-term traders who want to streamline order placement, reduce manual errors, and maintain a tight control over their option trades directly from their AmiBroker environment.

```clike
//Rajandran R - Creator of OpenAlgo
//OpenAlgo - Amibroker SplitOrder Module with cumulative qty & explicit current strikes
//Date: 07/07/2025

_SECTION_BEGIN("OpenAlgo Options SplitOrder Trading");

RequestTimedRefresh(1,False);
EnableTextOutput(False);
SetOption("StaticVarAutoSave", 30 );

apikey     = ParamStr("OpenAlgo API Key", "******");
strategy   = ParamStr("Strategy Name", "Test Strategy");
spot       = Paramlist("Spot Symbol","NIFTY|BANKNIFTY|FINNIFTY|SENSEX|CRUDEOILM");
expiry     = ParamStr("Expiry Date","17JUL25");
exchange   = ParamList("Exchange","NFO|BFO|MCX",0);
Symbol     = ParamStr("Underlying Symbol(Data Vendor Symbol)","NIFTY");
iInterval  = Param("Strike Interval",50,1,10000,1);
StrikeCalculation = Paramlist("Strike Calculation","TODAYSOPEN",0);
LotSize    = Param("Lot Size",65,1,10000,1);

ATMoffsetCE = Param("ATM CE Offset",0,-40,40,1);
ITMoffsetCE = Param("ITM CE Offset",-2,-40,-1,1);
OTMoffsetCE = Param("OTM CE Offset",4,1,40,1);
ATMoffsetPE = Param("ATM PE Offset",0,-40,40,1);
ITMoffsetPE = Param("ITM PE Offset",-2,-40,-1,1);
OTMoffsetPE = Param("OTM PE Offset",4,1,40,1);

pricetype  = ParamList("Order Type","MARKET",0);
product    = ParamList("Product","MIS|NRML",1);
tradetype  = ParamList("Option Trade Type","BUY|SELL",0);

quantity   = Param("Total Quantity(Lot Size)",1,0,10000,1)*LotSize;
splitsize  = Param("Split Size",25,1,10000,1);

host       = ParamStr("host","http://127.0.0.1:5000");
ver        = ParamStr("API Version","v1");
VoiceAlert = ParamList("Voice Alert","Disable|Enable",1);
EnableAlgo = ParamList("AlgoStatus","Disable|Enable",0);

bridgeurl = host+"/api/"+ver;


//Static Variables for Order protection
static_name_ = Name()+GetChartID()+interval(2)+strategy;
static_name_algo = Name()+GetChartID()+interval(2)+strategy+"algostatus";

//OpenAlgo Dashboard

GfxSelectFont( "BOOK ANTIQUA", 14, 100 );
GfxSetBkMode( 1 );
if(EnableAlgo == "Enable")
{
AlgoStatus = "Algo Enabled";
GfxSetTextColor( colorGreen ); 
GfxTextOut( "Algostatus : "+AlgoStatus , 20, 40); 
if(Nz(StaticVarGet(static_name_algo),0)!=1)
{
_TRACE("Algo Status : Enabled");
StaticVarSet(static_name_algo, 1);
}
}
if(EnableAlgo == "Disable")
{
AlgoStatus = "Algo Disabled";
GfxSetTextColor( colorRed ); 
GfxTextOut( "Algostatus : "+AlgoStatus , 20, 40); 
if(Nz(StaticVarGet(static_name_algo),0)!=0)
{
_TRACE("Algo Status : Disabled");
StaticVarSet(static_name_algo, 0);
}
}

GfxSetTextColor( colorWhite ); 

// Strike Calculation
if(StrikeCalculation=="PREVOPEN"){ SetForeign(Symbol); spotC = LastValue(Ref(OPEN,-1)); RestorePriceArrays();}
if(StrikeCalculation=="PREVCLOSE"){ SetForeign(Symbol); spotC = LastValue(Ref(Close,-1)); RestorePriceArrays();}
if(StrikeCalculation=="TODAYSOPEN"){ SetForeign(Symbol); spotC = LastValue(TimeFrameGetPrice("O",inDaily)); RestorePriceArrays();}

strike = IIf(spotC % iInterval > iInterval/2, spotC - (spotC%iInterval) + iInterval, spotC - (spotC%iInterval));

ATMstrikeCE = strike + (ATMoffsetCE * iInterval);
ATMstrikePE = strike - (ATMoffsetPE * iInterval);
ITMstrikeCE = strike + (ITMoffsetCE * iInterval);
ITMstrikePE = strike - (ITMoffsetPE * iInterval);
OTMstrikeCE = strike + (OTMoffsetCE * iInterval);
OTMstrikePE = strike - (OTMoffsetPE * iInterval);

ATMsymbolCE = spot+expiry+ATMstrikeCE+"CE";
ATMsymbolPE = spot+expiry+ATMstrikePE+"PE";
ITMsymbolCE = spot+expiry+ITMstrikeCE+"CE";
ITMsymbolPE = spot+expiry+ITMstrikePE+"PE";
OTMsymbolCE = spot+expiry+OTMstrikeCE+"CE";
OTMsymbolPE = spot+expiry+OTMstrikePE+"PE";

// Interpretation Print - current strikes
printf("\n ------ Current Strikes ------");
printf("\n ATM CE = " + ATMsymbolCE);
printf("\n ATM PE = " + ATMsymbolPE);
printf("\n ITM CE = " + ITMsymbolCE);
printf("\n ITM PE = " + ITMsymbolPE);
printf("\n OTM CE = " + OTMstrikeCE);
printf("\n OTM PE = " + OTMstrikePE);

printf("\n ------ Memory State ------");
printf("\n ATMsymbolCE = " + StaticVarGetText(static_name_+"ATMsymbolCE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"ATMsymbolCE_qty")),1.0));
printf("\n ITMsymbolCE = " + StaticVarGetText(static_name_+"ITMsymbolCE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"ITMsymbolCE_qty")),1.0));
printf("\n OTMsymbolCE = " + StaticVarGetText(static_name_+"OTMsymbolCE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"OTMsymbolCE_qty")),1.0));
printf("\n ATMsymbolPE = " + StaticVarGetText(static_name_+"ATMsymbolPE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"ATMsymbolPE_qty")),1.0));
printf("\n ITMsymbolPE = " + StaticVarGetText(static_name_+"ITMsymbolPE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"ITMsymbolPE_qty")),1.0));
printf("\n OTMsymbolPE = " + StaticVarGetText(static_name_+"OTMsymbolPE") + " | Qty: " + NumToStr(Nz(StaticVarGet(static_name_+"OTMsymbolPE_qty")),1.0));

_SECTION_BEGIN("OpenAlgo Bridge SplitOrder Controls");

EnableScript("VBScript");
<%
Public Sub PlaceSplitOrder(symbol,action, quantity, splitsize)
    Dim oXMLHTTP
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    Dim apikey, strategy, exchange, pricetype, product
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
    exchange = AFL.Var("exchange")
    pricetype = AFL.Var("pricetype")
    product = AFL.Var("product")

    Dim jsonRequestBody
    jsonRequestBody = "{""apikey"":""" & apikey & _
    """,""strategy"":""" & strategy & _
    """,""symbol"":""" & symbol & _
    """,""action"":""" & action & _
    """,""exchange"":""" & exchange & _
    """,""pricetype"":""" & pricetype & _
    """,""product"":""" & product & _
    """,""quantity"":""" & quantity & _
    """,""splitsize"":""" & splitsize & """}"

    Dim url
    url = AFL.Var("bridgeurl") & "/splitorder"

    oXMLHTTP.Open "POST", url, False
    oXMLHTTP.setRequestHeader "Content-Type", "application/json"
    oXMLHTTP.Send jsonRequestBody

    AFL("api_request") = jsonRequestBody
    AFL("api_response") = oXMLHTTP.responseText
End Sub
%>
openalgo = GetScriptObject();
_SECTION_END();

// Global TryClose
procedure TryClose(sym)
{
    exitSymbol = StaticVarGetText(static_name_+sym);
    totalQty = Nz(StaticVarGet(static_name_+sym+"_qty"),0);
    if(exitSymbol!="" AND totalQty>0)
    {
        openalgo.PlaceSplitOrder(exitSymbol, "SELL", totalQty, splitsize);
        _TRACE("CloseAll - " + sym + " API Request : " + api_request);
        _TRACE("CloseAll - " + sym + " API Response : " + api_response);
    }
    StaticVarSetText(static_name_+sym, "");
    StaticVarSet(static_name_+sym+"_qty", 0);
}

// Universal helpers
X0=20; Y0=100; X1=60;
LBClick = GetCursorMouseButtons() == 9;
MouseX  = Nz(GetCursorXPosition(1));
MouseY  = Nz(GetCursorYPosition(1));

procedure DrawButton (Text, x1, y1, x2, y2, colorFrom, colorTo)
{
	GfxSetOverlayMode(0);
	GfxSelectFont("Verdana", 9, 700);
	GfxSetBkMode(1);
	GfxGradientRect(x1, y1, x2, y2, colorFrom, colorTo);
	GfxDrawText(Text, x1, y1, x2, y2, 32|1|4|16);
}

procedure HandleTrade(symbolVar, memoryKey, buyText, exitText, x, y)
{
    DrawButton(buyText, x, y, x+X1+50, y+50, colorGreen, colorGreen);
    cursorInBuy = MouseX>=x AND MouseX<=x+X1+50 AND MouseY>=y AND MouseY<=y+50;
    btnClickBuy = cursorInBuy AND LBClick;

    if(btnClickBuy AND StaticVarGet(static_name_+memoryKey+"E")==0)
    {
        openalgo.PlaceSplitOrder(symbolVar, tradetype, quantity, splitsize);
        _TRACE("API Request : " + api_request);
        _TRACE("API Response : " + api_response);

        StaticVarSetText(static_name_+memoryKey, symbolVar, True);
        prevQty = Nz(StaticVarGet(static_name_+memoryKey+"_qty"), 0);
        StaticVarSet(static_name_+memoryKey+"_qty", prevQty + quantity);

        if(VoiceAlert=="Enable"){ Say(buyText+" Order"); }
        StaticVarSet(static_name_+memoryKey+"E",1);
    }
    else { StaticVarSet(static_name_+memoryKey+"E",0); }

    DrawButton(exitText, x, y+55, x+X1+50, y+105, colorRed, colorRed);
    cursorInExit = MouseX>=x AND MouseX<=x+X1+50 AND MouseY>=y+55 AND MouseY<=y+105;
    btnClickExit = cursorInExit AND LBClick;

    if(btnClickExit AND StaticVarGet(static_name_+"x"+memoryKey)==0)
    {
        exitSymbol = StaticVarGetText(static_name_+memoryKey);
        totalQty   = Nz(StaticVarGet(static_name_+memoryKey+"_qty"),0);

        if(exitSymbol!="" AND totalQty>0)
        {
            openalgo.PlaceSplitOrder(exitSymbol, "SELL", totalQty, splitsize);
            _TRACE("API Request : " + api_request);
            _TRACE("API Response : " + api_response);
            if(VoiceAlert=="Enable"){ Say("Exit "+exitText); }
        }
        StaticVarSetText(static_name_+memoryKey, "");
        StaticVarSet(static_name_+memoryKey+"_qty", 0);
        StaticVarSet(static_name_+"x"+memoryKey, 1);
    }
    else { StaticVarSet(static_name_+"x"+memoryKey, 0); }
}

_SECTION_BEGIN("Buttons with close all & clear memory");

if(EnableAlgo == "Enable")
{
    HandleTrade(ATMsymbolCE, "ATMsymbolCE", "ATM CE", "x ATM CE", 20, 100);
    HandleTrade(ITMsymbolCE, "ITMsymbolCE", "ITM CE", "x ITM CE", 140, 100);
    HandleTrade(OTMsymbolCE, "OTMsymbolCE", "OTM CE", "x OTM CE", 260, 100);

    HandleTrade(ATMsymbolPE, "ATMsymbolPE", "ATM PE", "x ATM PE", 20, 240);
    HandleTrade(ITMsymbolPE, "ITMsymbolPE", "ITM PE", "x ITM PE", 140, 240);
    HandleTrade(OTMsymbolPE, "OTMsymbolPE", "OTM PE", "x OTM PE", 260, 240);

    DrawButton("Close All", 20, 380, 200, 430, colorRed, colorRed);
    closeAll = MouseX>=20 AND MouseX<=200 AND MouseY>=380 AND MouseY<=430 AND LBClick;
    if(closeAll)
    {
        TryClose("ATMsymbolCE"); TryClose("ITMsymbolCE"); TryClose("OTMsymbolCE");
        TryClose("ATMsymbolPE"); TryClose("ITMsymbolPE"); TryClose("OTMsymbolPE");
        Say("All Positions Closed and Memory Cleared");
    }

    DrawButton("Clear Memory", 220, 380, 400, 430, colorBlue, colorBlue);
    clearMem = MouseX>=220 AND MouseX<=400 AND MouseY>=380 AND MouseY<=430 AND LBClick;
    if(clearMem)
    {
        StaticVarSetText(static_name_+"ATMsymbolCE",""); StaticVarSet(static_name_+"ATMsymbolCE_qty",0);
        StaticVarSetText(static_name_+"ITMsymbolCE",""); StaticVarSet(static_name_+"ITMsymbolCE_qty",0);
        StaticVarSetText(static_name_+"OTMsymbolCE",""); StaticVarSet(static_name_+"OTMsymbolCE_qty",0);
        StaticVarSetText(static_name_+"ATMsymbolPE",""); StaticVarSet(static_name_+"ATMsymbolPE_qty",0);
        StaticVarSetText(static_name_+"ITMsymbolPE",""); StaticVarSet(static_name_+"ITMsymbolPE_qty",0);
        StaticVarSetText(static_name_+"OTMsymbolPE",""); StaticVarSet(static_name_+"OTMsymbolPE_qty",0);
        Say("Internal Memory Cleared");
    }
}
_SECTION_END();

_SECTION_BEGIN("Candlestick Charts");
SetChartOptions(0, chartShowArrows|chartShowDates);
Plot(Close,"Candle",colorDefault,styleCandle);
_SECTION_END();

```
