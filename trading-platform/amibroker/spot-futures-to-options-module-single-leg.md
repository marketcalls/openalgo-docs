# Spot/Futures to Options Module (Single Leg)

This tutorial provides instructions on how to utilize simple buy and sell trading signals in Spot/Future charts to place option orders (including ATM, ITM, and OTM options) on the OpenAlgo platform. Implementing this system can help traders mitigate risk, particularly in the event of unexpected market movements that may result in significant losses. Additionally, implementing ATM or ITM option buying strategies, as opposed to futures, may help to reduce the risk of extreme black swan events and significantly mitigate the potential for large gap up or gap down risks when carrying forward positions.

**Features of the Options Execution Module**

1\)Simple Drag and Drop Module on top of any Amibroker trading strategy with the proper buy,sell,short,cover defined variables.\
2\)Place Smart Option Orders to intelligent send orders by manipulating the current existing positions.\
3\)Option Strike calculation at Amibroker end (Trades can configure the Underlying symbol as Spot./Futures) based on their trading requirement) accordingly, options strikes will be calculated.

### Internet Function Method (Modern Method)

```c
/* 
OpenAlgo - Modern Spot/Futures to Options Trading Module v2.0
Created By: Rajandran R (Founder - Marketcalls / Creator OpenAlgo) 
Original: 24 Nov 2025
Updated: Uses OptionsOrder API for server-side strike calculations
Added: Static Memory Refresh Button
Website: www.marketcalls.in / www.openalgo.in 
*/

_SECTION_BEGIN("OpenAlgo - Spot/Futures to Options Module v2.0");

/* --------------------------------------------------------------------------
   Version Check Variable
   -------------------------------------------------------------------------- */
ReqVer = 6.35;

/* --------------------------------------------------------------------------
   Global Variables for GUI
   -------------------------------------------------------------------------- */
global IDset;
IDset = 0;

/* --------------------------------------------------------------------------
   Helper Functions - Defined at Global Scope
   -------------------------------------------------------------------------- */

/* Simple JSON value extractor */
function ExtractJsonValue(json_str, key_name)
{
    result = "";
    
    /* Find the key in JSON */
    search_key = "\"" + key_name + "\":";
    pos = StrFind(json_str, search_key);
    
    if (pos >= 0)
    {
        /* Move past the key */
        start = pos + StrLen(search_key);
        
        /* Skip whitespace */
        while (start < StrLen(json_str) AND StrMid(json_str, start, 1) == " ")
        {
            start = start + 1;
        }
        
        /* Check if value is quoted string */
        if (StrMid(json_str, start, 1) == "\"")
        {
            start = start + 1;  /* Skip opening quote */
            end = start;
            /* Find closing quote */
            while (end < StrLen(json_str) AND StrMid(json_str, end, 1) != "\"")
            {
                end = end + 1;
            }
            /* Extract value WITHOUT the closing quote */
            result = StrMid(json_str, start, end - start);
        }
        else
        {
            /* Numeric or boolean value */
            end = start;
            while (end < StrLen(json_str))
            {
                ch = StrMid(json_str, end, 1);
                if (ch == "," OR ch == "}" OR ch == " ")
                {
                    break;
                }
                end = end + 1;
            }
            result = StrMid(json_str, start, end - start);
        }
    }
    
    return result;
}

/* Function to post option order using OptionsOrder API */
function PostOptionOrder(offset_val, opt_type, act, qty, apikey_val, strategy_val, underlying_val, exchange_val, expiry_val, pricetype_val, product_val, host_val, ver_val)
{
    url = host_val + "/api/" + ver_val + "/optionsorder";
    
    /* Construct JSON request body */
    body = "{\"apikey\": \"" + apikey_val + "\", " +
           "\"strategy\": \"" + strategy_val + "\", " +
           "\"underlying\": \"" + underlying_val + "\", " +
           "\"exchange\": \"" + exchange_val + "\", " +
           "\"expiry_date\": \"" + expiry_val + "\", " +
           "\"offset\": \"" + offset_val + "\", " +
           "\"option_type\": \"" + opt_type + "\", " +
           "\"action\": \"" + act + "\", " +
           "\"quantity\": \"" + NumToStr(qty, 1.0) + "\", " +
           "\"pricetype\": \"" + pricetype_val + "\", " +
           "\"product\": \"" + product_val + "\", " +
           "\"price\": \"0\", " +
           "\"trigger_price\": \"0\", " +
           "\"disclosed_quantity\": \"0\"}";
    
    _TRACEF("OpenAlgo OptionsOrder Request: %s", body);
    
    /* Set headers */
    headers = "Content-Type: application/json\r\n" +
              "Accept-Encoding: gzip, deflate\r\n";
    InternetSetHeaders(headers);
    
    ih = InternetPostRequest(url, body);
    
    response = "";
    if (ih)
    {
        while ((line = InternetReadString(ih)) != "")
        {
            response = response + line;
        }
        _TRACEF("OpenAlgo OptionsOrder Response: %s", response);
        InternetClose(ih);
    }
    else
    {
        _TRACE("OpenAlgo HTTP post failed");
    }
    
    return response;
}

/* Function to exit position using placesmartorder with quantity=0 and position_size=0 */
function ExitPosition(sym, exch, product_type, apikey_val, strategy_val, host_val, ver_val)
{
    /* Build postData for smart exit */
    postData = "{\"apikey\": \"" + apikey_val + "\", " +
               "\"strategy\": \"" + strategy_val + "\", " +
               "\"symbol\": \"" + sym + "\", " +
               "\"action\": \"SELL\", " +
               "\"exchange\": \"" + exch + "\", " +
               "\"pricetype\": \"MARKET\", " +
               "\"product\": \"" + product_type + "\", " +
               "\"quantity\": \"0\", " +
               "\"position_size\": \"0\"}";

    headers = "Content-Type: application/json\r\n" +
              "Accept-Encoding: gzip, deflate\r\n";
    InternetSetHeaders(headers);

    _TRACE("Exit Order Request Sent: " + postData);
    
    /* Build URL */
    bridgeurl = host_val + "/api/" + ver_val;
    ih = InternetPostRequest(bridgeurl + "/placesmartorder", postData);

    response = "";
    if (ih) 
    {
        while ((line = InternetReadString(ih)) != "") 
        {
            response = response + line;
        }
        _TRACEF("Exit Order Response: %s", response);
        InternetClose(ih);
    } 
    else 
    {
        _TRACE("Failed to place exit order.");
    }
    
    return response;
}

/* --------------------------------------------------------------------------
   Version Check and Main Code
   -------------------------------------------------------------------------- */
if (Version() < ReqVer)
{
    SetChartOptions(0, chartShowDates);
    GfxSetBkMode(1);
    GfxSetBkColor(colorBlack);
    GfxSetTextColor(colorRed);
    GfxSelectFont("Arial", 16, 700);
    GfxTextOut("This AFL needs AmiBroker 6.35 or later", 40, 40);
}
else
{
    /* --------------------------------------------------------------------------
       Parameter Definitions
       -------------------------------------------------------------------------- */
    RequestTimedRefresh(1, False);
    EnableTextOutput(False);
    SetOption("StaticVarAutoSave", 30);

    apikey = ParamStr("OpenAlgo API Key", "******");
    strategy = ParamStr("Strategy Name", "SpotToOptions");
    
    /* Underlying and Exchange Settings */
    underlying = ParamList("Underlying Symbol", "NIFTY|BANKNIFTY|FINNIFTY|SENSEX|CRUDEOILM");
    exchange = ParamList("Exchange", "NSE_INDEX|BSE_INDEX|NFO|BFO|MCX", 0);
    expiry = ParamStr("Expiry Date (DDMMMYY)", "30DEC25");
    
    /* Strike Offset Settings - Now using string-based offsets */
    CE_offset = ParamStr("CE Offset", "ATM");   /* ATM, ITM1, ITM2, OTM1, OTM2, etc. */
    PE_offset = ParamStr("PE Offset", "ATM");   /* ATM, ITM1, ITM2, OTM1, OTM2, etc. */
    
    /* Order Settings */
    LotSize = Param("Lot Size", 65, 1, 10000, 1);
    quantity = Param("Quantity (Lots)", 1, 0, 100) * LotSize;
    pricetype = ParamList("Order Type", "MARKET", 0);
    product = ParamList("Product", "NRML|MIS", 0);
    tradetype = ParamList("Option Trade Type", "BUY|SELL", 0);  /* Option Buyer - Option Seller */
    
    /* Connection Settings */
    host = ParamStr("Host", "http://127.0.0.1:5000");
    ver = ParamStr("API Version", "v1");
    
    /* Alert and Timing Settings */
    VoiceAlert = ParamList("Voice Alert", "Disable|Enable", 1);
    EntryDelay = Param("Entry Delay", 0, 0, 1, 1);
    ExitDelay = Param("Exit Delay", 0, 0, 1, 1);
    EnableAlgo = ParamList("AlgoStatus", "Disable|Enable|LongOnly|ShortOnly", 0);

    /* --------------------------------------------------------------------------
       Chart Settings
       -------------------------------------------------------------------------- */
    SetChartOptions(0, chartShowArrows | chartShowDates);
    _N(Title = StrFormat("{{NAME}} - {{INTERVAL}} {{DATE}} Open %g, Hi %g, Lo %g, Close %g (%.1f%%) {{VALUES}}", O, H, L, C, SelectedValue(ROC(C, 1))));
    Plot(Close, "Close", colorDefault, styleNoTitle | ParamStyle("Style") | GetPriceStyle());

    /* --------------------------------------------------------------------------
       Static Variable Names for Tracking
       -------------------------------------------------------------------------- */
    static_name_ = Name() + GetChartID() + interval(2) + strategy;
    static_name_algo = static_name_ + "_algostatus";
    
    /* Entry tracking - CE positions */
    static_CE_order = static_name_ + "_CE_order";
    static_CE_symbol = static_name_ + "_CE_symbol";
    static_CE_exchange = static_name_ + "_CE_exchange";
    
    /* Entry tracking - PE positions */
    static_PE_order = static_name_ + "_PE_order";
    static_PE_symbol = static_name_ + "_PE_symbol";
    static_PE_exchange = static_name_ + "_PE_exchange";

    /* --------------------------------------------------------------------------
       OpenAlgo Dashboard Display
       -------------------------------------------------------------------------- */
    GfxSelectFont("BOOK ANTIQUA", 14, 100);
    GfxSetBkMode(1);
    
    if (EnableAlgo == "Enable")
    {
        AlgoStatus = "Algo Enabled";
        GfxSetTextColor(colorGreen);
        GfxTextOut("Algostatus : " + AlgoStatus, 20, 40);
        if (Nz(StaticVarGet(static_name_algo), 0) != 1)
        {
            _TRACE("Algo Status : Enabled");
            StaticVarSet(static_name_algo, 1);
        }
    }
    else if (EnableAlgo == "Disable")
    {
        AlgoStatus = "Algo Disabled";
        GfxSetTextColor(colorRed);
        GfxTextOut("Algostatus : " + AlgoStatus, 20, 40);
        if (Nz(StaticVarGet(static_name_algo), 0) != 0)
        {
            _TRACE("Algo Status : Disabled");
            StaticVarSet(static_name_algo, 0);
        }
    }
    else if (EnableAlgo == "LongOnly")
    {
        AlgoStatus = "Long Only";
        GfxSetTextColor(colorYellow);
        GfxTextOut("Algostatus : " + AlgoStatus, 20, 40);
    }
    else if (EnableAlgo == "ShortOnly")
    {
        AlgoStatus = "Short Only";
        GfxSetTextColor(colorOrange);
        GfxTextOut("Algostatus : " + AlgoStatus, 20, 40);
    }
    
    /* Display Trade Mode */
    GfxSelectFont("BOOK ANTIQUA", 16, 700);
    if (tradetype == "BUY")
    {
        GfxSetTextColor(colorBrightGreen);
    }
    else
    {
        GfxSetTextColor(colorRed);
    }
    GfxTextOut("Trade Mode : " + tradetype, 20, 65);
    
    /* Display Current Settings */
    GfxSelectFont("BOOK ANTIQUA", 10, 400);
    GfxSetTextColor(colorWhite);
    GfxTextOut("Underlying: " + underlying + " | Expiry: " + expiry + " | CE Offset: " + CE_offset + " | PE Offset: " + PE_offset, 20, 90);
    GfxTextOut("Quantity: " + NumToStr(quantity, 1.0) + " | Product: " + product, 20, 108);
    
    /* Display Position Status */
    GfxSelectFont("BOOK ANTIQUA", 10, 400);
    GfxSetTextColor(colorYellow);
    CE_status = WriteIf(Nz(StaticVarGet(static_CE_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_CE_symbol), "NONE");
    PE_status = WriteIf(Nz(StaticVarGet(static_PE_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_PE_symbol), "NONE");
    GfxTextOut("CE Position: " + CE_status, 20, 126);
    GfxTextOut("PE Position: " + PE_status, 20, 144);

    /* --------------------------------------------------------------------------
       Refresh Memory Button
       -------------------------------------------------------------------------- */
    btnRefreshY = 170;
    btnRefreshW = 150;
    btnRefreshH = 35;
    
    GuiButton("REFRESH MEMORY", ++IDset, 20, btnRefreshY, btnRefreshW, btnRefreshH, notifyClicked);
    btnRefreshMemory = IDset;
    GuiSetColors(btnRefreshMemory, btnRefreshMemory, 1, colorWhite, colorDarkTeal, colorWhite);
    
    /* Process Button Click Events */
    for (i = 0; (cid = GuiGetEvent(i, 0)) > 0; i++)
    {
        if (GuiGetEvent(i, 1) == notifyClicked)
        {
            if (cid == btnRefreshMemory)
            {
                _TRACE("=== REFRESH MEMORY BUTTON CLICKED ===");
                
                /* Clear CE Position Tracking */
                StaticVarSet(static_CE_order, 0);
                StaticVarSetText(static_CE_symbol, "");
                StaticVarSetText(static_CE_exchange, "");
                
                /* Clear PE Position Tracking */
                StaticVarSet(static_PE_order, 0);
                StaticVarSetText(static_PE_symbol, "");
                StaticVarSetText(static_PE_exchange, "");
                
                /* Clear All Signal Tracking Variables */
                StaticVarSet(static_name_ + "buyCoverAlgo", 0);
                StaticVarSetText(static_name_ + "buyCoverAlgo_barvalue", "");
                
                StaticVarSet(static_name_ + "buyAlgo", 0);
                StaticVarSetText(static_name_ + "buyAlgo_barvalue", "");
                
                StaticVarSet(static_name_ + "sellAlgo", 0);
                StaticVarSetText(static_name_ + "sellAlgo_barvalue", "");
                
                StaticVarSet(static_name_ + "ShortSellAlgo", 0);
                StaticVarSetText(static_name_ + "ShortSellAlgo_barvalue", "");
                
                StaticVarSet(static_name_ + "ShortAlgo", 0);
                StaticVarSetText(static_name_ + "ShortAlgo_barvalue", "");
                
                StaticVarSet(static_name_ + "CoverAlgo", 0);
                StaticVarSetText(static_name_ + "CoverAlgo_barvalue", "");
                
                _TRACE("All Static Variables Cleared Successfully");
                
                if (VoiceAlert == "Enable")
                {
                    Say("Memory Refreshed");
                }
            }
        }
    }

    /* --------------------------------------------------------------------------
       Trading Signal Variables
       -------------------------------------------------------------------------- */
    AlgoBuy = LastValue(Ref(Buy, -EntryDelay));
    AlgoSell = LastValue(Ref(Sell, -ExitDelay));
    AlgoShort = LastValue(Ref(Short, -EntryDelay));
    AlgoCover = LastValue(Ref(Cover, -ExitDelay));

    /* --------------------------------------------------------------------------
       Trading Logic
       -------------------------------------------------------------------------- */
    if (EnableAlgo != "Disable")
    {
        lasttime = StrFormat("%0.f", LastValue(BarIndex()));
        SetChartBkColor(colorDarkGrey);

        /* ========================================================================
           BUY SIGNAL PROCESSING
           ======================================================================== */
        
        /* Buy + Cover (Reversal from Short to Long) */
        if (AlgoBuy == True AND AlgoCover == True AND StaticVarGet(static_name_ + "buyCoverAlgo") == 0 AND StaticVarGetText(static_name_ + "buyCoverAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "LongOnly")
            {
                /* Exit existing PE position first */
                exit_symbol = StaticVarGetText(static_PE_symbol);
                exit_exchange = StaticVarGetText(static_PE_exchange);
                
                if (exit_symbol != "" AND Nz(StaticVarGet(static_PE_order), 0) == 1)
                {
                    _TRACE("Exiting PE Position for Reversal: " + exit_symbol);
                    response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    if (has_success)
                    {
                        StaticVarSet(static_PE_order, 0);
                        StaticVarSetText(static_PE_symbol, "");
                        StaticVarSetText(static_PE_exchange, "");
                        _TRACE("PE Exit Success");
                    }
                }
                
                /* Place new CE entry */
                if (tradetype == "BUY")
                {
                    /* Option Buyer: Buy CE */
                    response = PostOptionOrder(CE_offset, "CE", "BUY", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                else
                {
                    /* Option Seller: Sell PE */
                    response = PostOptionOrder(PE_offset, "PE", "SELL", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                
                symbol_resolved = StrReplace(ExtractJsonValue(response, "symbol"), "\"", "");
                exchange_resolved = StrReplace(ExtractJsonValue(response, "exchange"), "\"", "");
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success AND symbol_resolved != "")
                {
                    StaticVarSet(static_CE_order, 1);
                    StaticVarSetText(static_CE_symbol, symbol_resolved, True);
                    StaticVarSetText(static_CE_exchange, exchange_resolved, True);
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Cover Order Placed");
                    }
                    _TRACEF("Buy Cover Order Success: %s", symbol_resolved);
                }
                
                StaticVarSet(static_name_ + "buyCoverAlgo", 1);
                StaticVarSetText(static_name_ + "buyCoverAlgo_barvalue", lasttime);
            }
        }
        else if (AlgoBuy != True OR AlgoCover != True)
        {
            StaticVarSet(static_name_ + "buyCoverAlgo", 0);
            StaticVarSetText(static_name_ + "buyCoverAlgo_barvalue", "");
        }

        /* Buy Only (Fresh Long Entry) */
        if (AlgoBuy == True AND AlgoCover != True AND StaticVarGet(static_name_ + "buyAlgo") == 0 AND StaticVarGetText(static_name_ + "buyAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "LongOnly")
            {
                if (tradetype == "BUY")
                {
                    /* Option Buyer: Buy CE */
                    response = PostOptionOrder(CE_offset, "CE", "BUY", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                else
                {
                    /* Option Seller: Sell PE */
                    response = PostOptionOrder(PE_offset, "PE", "SELL", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                
                symbol_resolved = StrReplace(ExtractJsonValue(response, "symbol"), "\"", "");
                exchange_resolved = StrReplace(ExtractJsonValue(response, "exchange"), "\"", "");
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success AND symbol_resolved != "")
                {
                    StaticVarSet(static_CE_order, 1);
                    StaticVarSetText(static_CE_symbol, symbol_resolved, True);
                    StaticVarSetText(static_CE_exchange, exchange_resolved, True);
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Order Placed");
                    }
                    _TRACEF("Buy Order Success: %s", symbol_resolved);
                }
                
                StaticVarSet(static_name_ + "buyAlgo", 1);
                StaticVarSetText(static_name_ + "buyAlgo_barvalue", lasttime);
            }
        }
        else if (AlgoBuy != True)
        {
            StaticVarSet(static_name_ + "buyAlgo", 0);
            StaticVarSetText(static_name_ + "buyAlgo_barvalue", "");
        }

        /* ========================================================================
           SELL SIGNAL PROCESSING (Exit Long)
           ======================================================================== */
        
        if (AlgoSell == True AND AlgoShort != True AND StaticVarGet(static_name_ + "sellAlgo") == 0 AND StaticVarGetText(static_name_ + "sellAlgo_barvalue") != lasttime)
        {
            exit_symbol = StaticVarGetText(static_CE_symbol);
            exit_exchange = StaticVarGetText(static_CE_exchange);
            
            if (exit_symbol != "" AND Nz(StaticVarGet(static_CE_order), 0) == 1)
            {
                _TRACE("Exiting CE Position: " + exit_symbol);
                response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    StaticVarSet(static_CE_order, 0);
                    StaticVarSetText(static_CE_symbol, "");
                    StaticVarSetText(static_CE_exchange, "");
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Sell Exit Order Placed");
                    }
                    _TRACE("CE Exit Success");
                }
            }
            
            StaticVarSet(static_name_ + "sellAlgo", 1);
            StaticVarSetText(static_name_ + "sellAlgo_barvalue", lasttime);
        }
        else if (AlgoSell != True)
        {
            StaticVarSet(static_name_ + "sellAlgo", 0);
            StaticVarSetText(static_name_ + "sellAlgo_barvalue", "");
        }

        /* ========================================================================
           SHORT SIGNAL PROCESSING
           ======================================================================== */
        
        /* Short + Sell (Reversal from Long to Short) */
        if (AlgoShort == True AND AlgoSell == True AND StaticVarGet(static_name_ + "ShortSellAlgo") == 0 AND StaticVarGetText(static_name_ + "ShortSellAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "ShortOnly")
            {
                /* Exit existing CE position first */
                exit_symbol = StaticVarGetText(static_CE_symbol);
                exit_exchange = StaticVarGetText(static_CE_exchange);
                
                if (exit_symbol != "" AND Nz(StaticVarGet(static_CE_order), 0) == 1)
                {
                    _TRACE("Exiting CE Position for Reversal: " + exit_symbol);
                    response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    if (has_success)
                    {
                        StaticVarSet(static_CE_order, 0);
                        StaticVarSetText(static_CE_symbol, "");
                        StaticVarSetText(static_CE_exchange, "");
                        _TRACE("CE Exit Success");
                    }
                }
                
                /* Place new PE entry */
                if (tradetype == "BUY")
                {
                    /* Option Buyer: Buy PE */
                    response = PostOptionOrder(PE_offset, "PE", "BUY", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                else
                {
                    /* Option Seller: Sell CE */
                    response = PostOptionOrder(CE_offset, "CE", "SELL", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                
                symbol_resolved = StrReplace(ExtractJsonValue(response, "symbol"), "\"", "");
                exchange_resolved = StrReplace(ExtractJsonValue(response, "exchange"), "\"", "");
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success AND symbol_resolved != "")
                {
                    StaticVarSet(static_PE_order, 1);
                    StaticVarSetText(static_PE_symbol, symbol_resolved, True);
                    StaticVarSetText(static_PE_exchange, exchange_resolved, True);
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Sell Order Placed");
                    }
                    _TRACEF("Short Sell Order Success: %s", symbol_resolved);
                }
                
                StaticVarSet(static_name_ + "ShortSellAlgo", 1);
                StaticVarSetText(static_name_ + "ShortSellAlgo_barvalue", lasttime);
            }
        }
        else if (AlgoShort != True OR AlgoSell != True)
        {
            StaticVarSet(static_name_ + "ShortSellAlgo", 0);
            StaticVarSetText(static_name_ + "ShortSellAlgo_barvalue", "");
        }

        /* Short Only (Fresh Short Entry) */
        if (AlgoShort == True AND AlgoSell != True AND StaticVarGet(static_name_ + "ShortAlgo") == 0 AND StaticVarGetText(static_name_ + "ShortAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "ShortOnly")
            {
                if (tradetype == "BUY")
                {
                    /* Option Buyer: Buy PE */
                    response = PostOptionOrder(PE_offset, "PE", "BUY", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                else
                {
                    /* Option Seller: Sell CE */
                    response = PostOptionOrder(CE_offset, "CE", "SELL", quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, host, ver);
                }
                
                symbol_resolved = StrReplace(ExtractJsonValue(response, "symbol"), "\"", "");
                exchange_resolved = StrReplace(ExtractJsonValue(response, "exchange"), "\"", "");
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success AND symbol_resolved != "")
                {
                    StaticVarSet(static_PE_order, 1);
                    StaticVarSetText(static_PE_symbol, symbol_resolved, True);
                    StaticVarSetText(static_PE_exchange, exchange_resolved, True);
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Order Placed");
                    }
                    _TRACEF("Short Order Success: %s", symbol_resolved);
                }
                
                StaticVarSet(static_name_ + "ShortAlgo", 1);
                StaticVarSetText(static_name_ + "ShortAlgo_barvalue", lasttime);
            }
        }
        else if (AlgoShort != True)
        {
            StaticVarSet(static_name_ + "ShortAlgo", 0);
            StaticVarSetText(static_name_ + "ShortAlgo_barvalue", "");
        }

        /* ========================================================================
           COVER SIGNAL PROCESSING (Exit Short)
           ======================================================================== */
        
        if (AlgoCover == True AND AlgoBuy != True AND StaticVarGet(static_name_ + "CoverAlgo") == 0 AND StaticVarGetText(static_name_ + "CoverAlgo_barvalue") != lasttime)
        {
            exit_symbol = StaticVarGetText(static_PE_symbol);
            exit_exchange = StaticVarGetText(static_PE_exchange);
            
            if (exit_symbol != "" AND Nz(StaticVarGet(static_PE_order), 0) == 1)
            {
                _TRACE("Exiting PE Position: " + exit_symbol);
                response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    StaticVarSet(static_PE_order, 0);
                    StaticVarSetText(static_PE_symbol, "");
                    StaticVarSetText(static_PE_exchange, "");
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Cover Exit Order Placed");
                    }
                    _TRACE("PE Exit Success");
                }
            }
            
            StaticVarSet(static_name_ + "CoverAlgo", 1);
            StaticVarSetText(static_name_ + "CoverAlgo_barvalue", lasttime);
        }
        else if (AlgoCover != True)
        {
            StaticVarSet(static_name_ + "CoverAlgo", 0);
            StaticVarSetText(static_name_ + "CoverAlgo_barvalue", "");
        }
    }
}

_SECTION_END();
```

### VBScript (Legacy Method)

```c

/*
OpenAlgo - Smart Spot/Futures to Options Trading Module
Created By : Rajandran R(Founder - Marketcalls / Creator OpenAlgo )
Created on : 31 MAY 2024.
Website : www.marketcalls.in / www.openalgo.in
*/


_SECTION_BEGIN("Openalgo - Spot/Futures to Options Module");


// Send orders even if Amibroker is minimized or Chart is not active
RequestTimedRefresh(1, False); 
EnableTextOutput(False);


apikey = ParamStr("OpenAlgo API Key", "******");

strategy = ParamStr("Strategy Name", "Test Strategy");

spot = Paramlist("Spot Symbol","NIFTY|BANKNIFTY|FINNIFTY|SENSEX");
expiry = ParamStr("Expiry Date","06JUN24");

exchange = ParamList("Exchange","NFO|BFO|MCX",0); 
Symbol = ParamStr("Underlying Symbol","NIFTY");
iInterval= Param("Strike Interval",50,1,10000,1);
StrikeCalculation = Paramlist("Strike Calculation","PREVOPEN|PREVCLOSE|TODAYSOPEN",0);
LotSize = Param("Lot Size",65,1,10000,1);

offsetCE = Param("CE Offset",0,-40,40,1);
offsetPE = Param("PE Offset",0,-40,40,1);

pricetype = ParamList("Order Type","MARKET",0);
product = ParamList("Product","MIS|NRML",1);
tradetype = ParamList("Option Trade Type","BUY|SELL",0);

quantity = Param("quanity(Lot Size)",1,0,10000)*LotSize;
price = 0; 
disclosed_quantity = 0;
trigger_price = 0;

host = ParamStr("host","http://127.0.0.1:5000");
ver = ParamStr("API Version","v1");


VoiceAlert = ParamList("Voice Alert","Disable|Enable",1);

Entrydelay = Param("Entry Delay",0,0,1,1);
Exitdelay = Param("Exit Delay",0,0,1,1);
EnableAlgo = ParamList("AlgoStatus","Disable|Enable|LongOnly|ShortOnly",0);


bridgeurl = host+"/api/"+ver;
resp = "";


//Static Variables for Order protection

static_name_ = Name()+GetChartID()+interval(2)+strategy;
static_name_algo = Name()+GetChartID()+interval(2)+strategy+"algostatus";


AlgoBuy = lastvalue(Ref(Buy,-Entrydelay));
AlgoSell = lastvalue(Ref(Sell,-Exitdelay));
AlgoShort = lastvalue(Ref(Short,-Entrydelay));
AlgoCover = lastvalue(Ref(Cover,-Exitdelay));

//Plots Dashboard

GfxSelectFont( "BOOK ANTIQUA", 14, 100 );
GfxSetBkMode( 1 );
if (EnableAlgo != "")
{
AlgoStatus = EnableAlgo;
GfxSetTextColor( IIf(EnableAlgo == "Enable", colorGreen, 
					IIf(EnableAlgo == "LongOnly",colorYellow,
						IIf(EnableAlgo == "ShortOnly",colorOrange,colorRed)) ));
GfxTextOut( "Algostatus : "+AlgoStatus , 20, 40);
StaticVarSet(static_name_algo, IIf(EnableAlgo == "Enable", 1,
IIf(EnableAlgo == "LongOnly", 2, IIf(EnableAlgo == "ShortOnly", 3, 0))));
//_TRACE("Algo Status : "+EnableAlgo);
}





//optionCEtype = WriteIf(offsetCE == 0, "ATM CE", WriteIf(offsetCE<0,"ITM"+abs(offsetCE)+" CE","OTM"+abs(offsetCE)+" CE"));
//optionPEtype = WriteIf(offsetPE == 0, "ATM PE", WriteIf(offsetPE<0,"ITM"+abs(offsetPE)+" PE","OTM"+abs(offsetPE)+" PE"));

if(StrikeCalculation=="PREVOPEN")
{
SetForeign(Symbol);
spotC = Ref(OPEN,-1);
RestorePriceArrays();
}

if(StrikeCalculation=="PREVCLOSE")
{
SetForeign(Symbol);
spotC = Ref(Close,-1);
RestorePriceArrays();
}

if(StrikeCalculation=="TODAYSOPEN")
{
SetForeign(Symbol);
spotC = TimeFrameGetPrice("O",inDaily);
RestorePriceArrays();
}

//Maintain Array to Store ATM Strikes for each and every bar
strike = IIf(spotC % iInterval > iInterval/2, spotC - (spotC%iInterval) + iInterval,
			spotC - (spotC%iInterval));
			
//Entry Strikes	
		
strikeCE = strike + (offsetCE * iInterval);
strikePE = strike - (offsetPE * iInterval);

buycontinue = Flip(Buy,Sell);
shortcontinue  = Flip(Short,Cover);


ExitStrikeCE = "";
ExitStrikePE = "";
entryoptions = "";
exitoptons = "";

//Exit Strikes
if(tradetype=="BUY")
{
ExitStrikeCE = ValueWhen(Ref(Buy,-Entrydelay),strikeCE); 
ExitStrikePE = ValueWhen(Ref(Short,-Entrydelay),strikePE);

entryoptions = WriteIf(Buy,spot+expiry+strikeCE+"CE", WriteIf(Short,spot+expiry+strikePE+"PE",""));
exitoptons = WriteIf(sell,spot+expiry+ExitStrikeCE+"CE", WriteIf(cover,spot+expiry+ExitStrikePE+"PE",""));


}
if(tradetype=="SELL")
{
ExitStrikeCE = ValueWhen(Ref(Short,-Entrydelay),strikeCE); 
ExitStrikePE = ValueWhen(Ref(Buy,-Entrydelay),strikePE);

entryoptions = WriteIf(Buy,spot+expiry+strikePE+"PE", WriteIf(Short,spot+expiry+strikeCE+"CE",""));
exitoptons = WriteIf(sell,spot+expiry+ExitStrikePE+"PE", WriteIf(cover,spot+expiry+ExitStrikeCE+"CE",""));

}

printf("\n\n\nEntry Symbol : "+entryoptions);
printf("\nExit Symbol : "+exitoptons);


_SECTION_END();




_SECTION_BEGIN("OpenAlgo Bridge Controls");

EnableScript("VBScript"); 
<%
Public Sub PlaceOrder(action, OptionType, quantity)
	
    Dim oXMLHTTP
    Dim oStream
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    ' Define variables with the specified values
    Dim apikey, strategy, symbol , exchange, pricetype, product
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
    

	
    
    symbol = AFL.Var("entryoptions")
    
    exchange = AFL.Var("exchange")
    pricetype = AFL.Var("pricetype")
    product = AFL.Var("product")
   
    
    ' Construct the JSON string for the POST message
    Dim jsonRequestBody
    jsonRequestBody = "{""apikey"":""" & apikey & _
    """,""strategy"":""" & strategy & _
    """,""symbol"":""" & symbol & _
    """,""action"":""" & action & _
    """,""exchange"":""" & exchange & _
    """,""pricetype"":""" & pricetype & _
    """,""product"":""" & product & _
    """,""quantity"":""" & quantity & """}"
    
    ' Set the URL
    Dim url
    url = AFL.Var("bridgeurl")&"/placeorder"
    
    ' MsgBox "API Request: " & jsonRequestBody, vbInformation, "API Information"
    
    ' Configure the HTTP request for POST method
    oXMLHTTP.Open "POST", url, False
    oXMLHTTP.setRequestHeader "Content-Type", "application/json"
    oXMLHTTP.setRequestHeader "Cache-Control", "no-cache"
    oXMLHTTP.setRequestHeader "Pragma", "no-cache"
    
    ' Send the request with the JSON body
    oXMLHTTP.Send jsonRequestBody
    
    api_parameters = "Strategy :" & strategy & " Symbol :" & symbol & " Exchange :" & exchange & _
                 " Action :" & action & " Pricetype :" & pricetype & _
                 " Product :" & product & " Quantity:" & quantity & _
                 " api_url :" & url

    
    ' MsgBox "API Request: " & oXMLHTTP.responseText, vbInformation, "API Information"
    
    
    AFL("api_request") = api_parameters  
    AFL("api_response") = oXMLHTTP.responseText
    
    
    ' Optionally, handle the response here
    ' Dim response
    ' response = oXMLHTTP.responseText
    ' Response handling code...
End Sub


Public Sub ExitOrder(action, OptionType)
    Dim oXMLHTTP
    Dim oStream
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    ' Define variables with the specified values
    Dim apikey, strategy, symbol , exchange, pricetype, product
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
   	
    
	symbol = AFL.Var("exitoptons")
    
    exchange = AFL.Var("exchange")
    pricetype = AFL.Var("pricetype")
    product = AFL.Var("product")
    position_size = "0"
    quantity = "0"
   
    
    ' Construct the JSON string for the POST message
    Dim jsonRequestBody
    jsonRequestBody = "{""apikey"":""" & apikey & _
    """,""strategy"":""" & strategy & _
    """,""symbol"":""" & symbol & _
    """,""action"":""" & action & _
    """,""exchange"":""" & exchange & _
    """,""pricetype"":""" & pricetype & _
    """,""product"":""" & product & _
    """,""quantity"":""" & quantity & _
    """,""position_size"":""" & position_size & """}"
    
    ' Set the URL
    Dim url
    url = AFL.Var("bridgeurl")&"/placesmartorder"
    
    ' Configure the HTTP request for POST method
    oXMLHTTP.Open "POST", url, False
    oXMLHTTP.setRequestHeader "Content-Type", "application/json"
    oXMLHTTP.setRequestHeader "Cache-Control", "no-cache"
    oXMLHTTP.setRequestHeader "Pragma", "no-cache"
    
    ' Send the request with the JSON body
    oXMLHTTP.Send jsonRequestBody
    
    api_parameters = "Strategy :" & strategy & " Symbol :" & symbol & " Exchange :" & exchange & _
                 " Action :" & action & " Pricetype :" & pricetype & _
                 " Product :" & product & " Quantity:" & quantity & _
                 " Position Size :" & position_size & " api_url :" & url

    
    AFL("ex_api_request") = api_parameters  
    AFL("ex_api_response") = oXMLHTTP.responseText
    
    
    ' Optionally, handle the response here
    ' Dim response
    ' response = oXMLHTTP.responseText
    ' Response handling code...
End Sub

%>

openalgo = GetScriptObject();



_SECTION_END();


if(EnableAlgo != "Disable")
    {
        lasttime = StrFormat("%0.f",LastValue(BarIndex()));
        
       
        
        SetChartBkColor(colorDarkGrey);
        if(EnableAlgo == "Enable")
        {   
			
			
            if (AlgoBuy==True AND AlgoCover == True AND StaticVarGet(static_name_+"buyCoverAlgo")==0 AND StaticVarGetText(static_name_+"buyCoverAlgo_barvalue") != lasttime )
            {
            
				if(tradetype=="BUY")
				{
				
				
				
				//Long Call and Exit Long Put Option
				openalgo.ExitOrder("SELL", "PE"); 
				openalgo.PlaceOrder("BUY", "CE",quantity);

				
				
				}
				
				if(tradetype=="SELL")
				{
				//Short Put and Exit Short Call Option
				openalgo.ExitOrder("BUY" , "CE"); 
				openalgo.PlaceOrder("SELL" ,"PE",quantity);
				
				
				
				}
				
				_TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);
				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
                StaticVarSetText(static_name_+"buyCoverAlgo_barvalue",lasttime);  
                StaticVarSet(static_name_+"buyCoverAlgo",1); //Algo Order was triggered, no more order on this bar
                
        
            }
            else if ((AlgoBuy != True OR AlgoCover != True))
            {   
                StaticVarSet(static_name_+"buyCoverAlgo",0);
                StaticVarSetText(static_name_+"buyCoverAlgo_barvalue","");
            }
            
            if (AlgoBuy==True AND AlgoCover != True AND StaticVarGet(static_name_+"buyAlgo")==0 AND StaticVarGetText(static_name_+"buyAlgo_barvalue") != lasttime)
            {
            
				if(tradetype=="BUY")
				{
				//Long Call and Exit Long Put Option
				openalgo.PlaceOrder("BUY","CE",quantity);

				
				}
				
				if(tradetype=="SELL")
				{
				//Short Put
				openalgo.PlaceOrder("SELL","PE",quantity);
				
					
				}
				
				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
                StaticVarSetText(static_name_+"buyAlgo_barvalue",lasttime); 
                StaticVarSet(static_name_+"buyAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoBuy != True)
            {   
                StaticVarSet(static_name_+"buyAlgo",0);
                StaticVarSetText(static_name_+"buyAlgo_barvalue","");
                
            }
            if (AlgoSell==true AND AlgoShort != True AND StaticVarGet(static_name_+"sellAlgo")==0 AND StaticVarGetText(static_name_+"sellAlgo_barvalue") != lasttime)
            {     
				
				if(tradetype=="BUY")
				{
				//Exit Long Call Option
				
				openalgo.ExitOrder("SELL","CE"); 
				
				}
				
				if(tradetype=="SELL")
				{
				//Exit Short Put Option
				openalgo.ExitOrder("BUY","PE"); 
				
				}
                
                _TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);

                StaticVarSetText(static_name_+"sellAlgo_barvalue",lasttime);
                StaticVarSet(static_name_+"sellAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoSell != True )
            {   
                StaticVarSet(static_name_+"sellAlgo",0);
                StaticVarSetText(static_name_+"sellAlgo_barvalue","");
            }
            if (AlgoShort==True AND AlgoSell==True AND  StaticVarGet(static_name_+"ShortSellAlgo")==0 AND StaticVarGetText(static_name_+"ShortSellAlgo_barvalue") != lasttime)
            {
            
				if(tradetype=="BUY")
				{
				//Long Put and Exit Long Call Option
				openalgo.ExitOrder("SELL","CE"); 
				openalgo.PlaceOrder("BUY","PE",quantity);
				
				
				}
				
				if(tradetype=="SELL")
				{
				//Short Call and Exit Short Put Option
				openalgo.ExitOrder("BUY","PE");
				openalgo.PlaceOrder("SELL","CE",quantity);
				 
				
				}
				
				_TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);
				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
				
                StaticVarSetText(static_name_+"ShortsellAlgo_barvalue",lasttime);
                StaticVarSet(static_name_+"ShortSellAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if ((AlgoShort != True OR AlgoSell != True))
            {   
                StaticVarSet(static_name_+"ShortSellAlgo",0);
                StaticVarSetText(static_name_+"ShortsellAlgo_barvalue","");
            }
                
            if (AlgoShort==True  AND  AlgoSell != True AND StaticVarGet(static_name_+"ShortAlgo")==0 AND  StaticVarGetText(static_name_+"ShortAlgo_barvalue") != lasttime)
            {
				if(tradetype=="BUY")
				{
				//Long Put
				openalgo.PlaceOrder("BUY","PE",quantity);
				
				
				}
				
				if(tradetype=="SELL")
				{
				//Short Call
				openalgo.PlaceOrder("SELL","CE",quantity);
							
				}
				
				

				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
                StaticVarSetText(static_name_+"ShortAlgo_barvalue",lasttime); 
                StaticVarSet(static_name_+"ShortAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoShort != True )
            {   
                StaticVarSet(static_name_+"ShortAlgo",0);
                StaticVarSetText(static_name_+"ShortAlgo_barvalue","");
            }
            if (AlgoCover==true AND AlgoBuy != True AND StaticVarGet(static_name_+"CoverAlgo")==0 AND StaticVarGetText(static_name_+"CoverAlgo_barvalue") != lasttime)
            {
				
				if(tradetype=="BUY")
				{
				//Exit Long Put Option
				
				openalgo.ExitOrder("SELL","PE"); 
				
				}
				
				if(tradetype=="SELL")
				{
				//Exit Short Call Option
				openalgo.ExitOrder("BUY","CE"); 
				
				}
               
               
				_TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);

				
                StaticVarSetText(static_name_+"CoverAlgo_barvalue",lasttime); 
                StaticVarSet(static_name_+"CoverAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoCover != True )
            {   
                StaticVarSet(static_name_+"CoverAlgo",0);
                StaticVarSetText(static_name_+"CoverAlgo_barvalue","");
            }
        }
        
      else if(EnableAlgo == "LongOnly")
        {
        
			 if (AlgoBuy==True AND StaticVarGet(static_name_+"buyAlgo")==0 AND StaticVarGetText(static_name_+"buyAlgo_barvalue") != lasttime)
            {
            
				if(tradetype=="BUY")
				{
				//Long Call and Exit Long Put Option
				openalgo.PlaceOrder("BUY","CE",quantity);
				
				
				}
				
				if(tradetype=="SELL")
				{
				//Short Put
				openalgo.PlaceOrder("SELL","PE",quantity);
					
				}
				

				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
                StaticVarSetText(static_name_+"buyAlgo_barvalue",lasttime);
                StaticVarSet(static_name_+"buyAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            
            
            else if (AlgoBuy != True )
            {  
                StaticVarSet(static_name_+"buyAlgo",0);
                StaticVarSetText(static_name_+"buyAlgo_barvalue","");
            
            }
            
             if (AlgoSell==True AND StaticVarGet(static_name_+"sellAlgo")==0 AND StaticVarGetText(static_name_+"sellAlgo_barvalue") != lasttime)
            { 
            
				if(tradetype=="BUY")
				{
				//Exit Long Call Option
				
				openalgo.ExitOrder("SELL","CE"); 
				
				}
				
				if(tradetype=="SELL")
				{
				//Exit Short Put Option
				openalgo.ExitOrder("BUY","PE"); 
				
				}
				
				_TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);

                StaticVarSet(static_name_+"sellAlgo",1);
                StaticVarSetText(static_name_+"sellAlgo_barvalue",lasttime);
            }
            else if (AlgoSell != True )
            {  
                StaticVarSet(static_name_+"sellAlgo",0);
                StaticVarSetText(static_name_+"sellAlgo_barvalue","");
            
            }
            
        } 
        else if(EnableAlgo == "ShortOnly")
        {
            if (AlgoShort==True AND StaticVarGet(static_name_+"ShortAlgo")==0 AND StaticVarGetText(static_name_+"ShortAlgo_barvalue") != lasttime)
            {
				if(tradetype=="BUY")
				{
				//Long Put
				openalgo.PlaceOrder("BUY","PE",quantity);
				
				
				}
				
				if(tradetype=="SELL")
				{
				//Short Call
				openalgo.PlaceOrder("SELL","CE",quantity);
							
				}
				

				_TRACE("API Request : "+api_request);
				_TRACE("API Response : "+api_response);
                StaticVarSetText(static_name_+"ShortAlgo_barvalue",lasttime); 
                StaticVarSet(static_name_+"ShortAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoShort != True )
            {   
                StaticVarSet(static_name_+"ShortAlgo",0);
                StaticVarSetText(static_name_+"ShortAlgo_barvalue","");
            }
            if (AlgoCover==true AND StaticVarGet(static_name_+"CoverAlgo")==0 AND StaticVarGetText(static_name_+"CoverAlgo_barvalue") != lasttime)
            {
            
				if(tradetype=="BUY")
				{
				//Exit Long Put Option
				
				openalgo.ExitOrder("SELL","PE"); 
				
				}
				
				if(tradetype=="SELL")
				{
				//Exit Short Call Option
				openalgo.ExitOrder("BUY","CE"); 
				
				}
               
               
				_TRACE("Exit API Request : "+ex_api_request);
				_TRACE("Exit API Response : "+ex_api_response);

				
                StaticVarSetText(static_name_+"CoverAlgo_barvalue",lasttime); 
                StaticVarSet(static_name_+"CoverAlgo",1); //Algo Order was triggered, no more order on this bar
                
            }
            else if (AlgoCover != True)
            {   
                StaticVarSet(static_name_+"CoverAlgo",0);
                StaticVarSetText(static_name_+"CoverAlgo_barvalue","");
            }
        } 
        
    }
    
  
_SECTION_END();

```
