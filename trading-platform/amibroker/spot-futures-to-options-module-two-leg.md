# Spot/Futures to Options Module (Two Leg)

**What is a Two-Legged Options Strategy**?

A two-legged options trading strategy involves buying or selling two options at the same time, typically with different strike prices or expiration dates. The strategy is designed to take advantage of the price difference between the two options and can be used for a variety of purposes, such as hedging, speculation, or income generation.

**Features of the Two-Legged Options Execution Module**

1\)Simple Drag and Drop Module on top of any Amibroker trading strategy with the proper buy, sell, short, and cover defined variables.\
2\)Configure various styles of two-legged options execution strategies. Supports 9 types of two-legged options trading strategies.\
3\)Configure separate options trading strategies for long-entry and short-entry signals in spot/futures charts\
4\)Place Smart Option Orders to intelligent send orders by manipulating the current existing positions.\
5\)Option Strike calculation at Amibroker end (Trades can configure the Underlying symbol as Spot./Futures) based on their trading requirement) accordingly, options strikes will be calculated.

```clike

/* 
OpenAlgo - Smart Spot/Futures to Two Leg Options Trading Module v2.0

Supported Two Leg Strategies:
1) Credit Spread
2) Debit Spread
3) Straddle
4) Strangle
5) Synthetic Futures
6) Diagonal Spread
7) Calendar Spread
8) Ratio Spread
9) Ratio Back Spread

Created By: Rajandran R (Founder - Marketcalls / Creator - OpenAlgo)
Original: 24 Nov 2025
Updated: Uses OptionsMultiOrder API for server-side multi-leg execution
Fixed: ExtractLegValue function for proper API response parsing
Website: www.marketcalls.in / www.openalgo.in
*/

_SECTION_BEGIN("OpenAlgo - Two Leg Options Module v2.0");

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

/* 
   Function to extract leg data from optionsmultiorder API response
   The API returns: {"results":[{"leg":1,"symbol":"...","exchange":"...",...},{"leg":2,...}],"status":"success"}
   leg_num: 1 for first leg, 2 for second leg (matches API "leg" field)
   key_name: the field to extract (symbol, exchange, orderid, status, etc.)
*/
function ExtractLegValue(json_str, leg_num, key_name)
{
    result = "";
    
    /* Build search pattern to find the leg object by "leg":N */
    leg_search = "\"leg\":" + NumToStr(leg_num, 1.0, False);
    
    /* Find position of this leg marker */
    leg_pos = StrFind(json_str, leg_search);
    
    if (leg_pos >= 0)
    {
        /* Find the start of this leg's object by searching backwards for { */
        obj_start = leg_pos;
        while (obj_start > 0 AND StrMid(json_str, obj_start, 1) != "{")
        {
            obj_start = obj_start - 1;
        }
        
        /* Find the end of this leg's object by searching for matching } */
        brace_count = 1;
        obj_end = obj_start + 1;
        while (obj_end < StrLen(json_str) AND brace_count > 0)
        {
            ch = StrMid(json_str, obj_end, 1);
            if (ch == "{")
            {
                brace_count = brace_count + 1;
            }
            else if (ch == "}")
            {
                brace_count = brace_count - 1;
            }
            obj_end = obj_end + 1;
        }
        
        /* Extract the leg object */
        leg_obj = StrMid(json_str, obj_start, obj_end - obj_start);
        
        /* Now extract the requested key from this leg object */
        result = ExtractJsonValue(leg_obj, key_name);
    }
    
    return result;
}

/* Function to post multi-leg option order using OptionsMultiOrder API */
function PostMultiLegOrder(offset1, opttype1, action1, expiry1, qty1, offset2, opttype2, action2, expiry2, qty2, apikey_val, strategy_val, underlying_val, exchange_val, pricetype_val, product_val, host_val, ver_val)
{
    url = host_val + "/api/" + ver_val + "/optionsmultiorder";
    
    /* Construct JSON request body with legs array */
    body = "{\"apikey\": \"" + apikey_val + "\", " +
           "\"strategy\": \"" + strategy_val + "\", " +
           "\"underlying\": \"" + underlying_val + "\", " +
           "\"exchange\": \"" + exchange_val + "\", " +
           "\"legs\": [" +
           "{" +
           "\"offset\": \"" + offset1 + "\", " +
           "\"option_type\": \"" + opttype1 + "\", " +
           "\"action\": \"" + action1 + "\", " +
           "\"expiry_date\": \"" + expiry1 + "\", " +
           "\"quantity\": " + NumToStr(qty1, 1.0) + ", " +
           "\"pricetype\": \"" + pricetype_val + "\", " +
           "\"product\": \"" + product_val + "\"" +
           "}, " +
           "{" +
           "\"offset\": \"" + offset2 + "\", " +
           "\"option_type\": \"" + opttype2 + "\", " +
           "\"action\": \"" + action2 + "\", " +
           "\"expiry_date\": \"" + expiry2 + "\", " +
           "\"quantity\": " + NumToStr(qty2, 1.0) + ", " +
           "\"pricetype\": \"" + pricetype_val + "\", " +
           "\"product\": \"" + product_val + "\"" +
           "}" +
           "]}";
    
    _TRACEF("OpenAlgo OptionsMultiOrder Request: %s", body);
    
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
        _TRACEF("OpenAlgo OptionsMultiOrder Response: %s", response);
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
    strategy = ParamStr("Strategy Name", "TwoLegOptions");
    
    /* Underlying and Exchange Settings */
    underlying = ParamList("Underlying Symbol", "NIFTY|BANKNIFTY|FINNIFTY|SENSEX|CRUDEOILM");
    exchange = ParamList("Exchange", "NSE_INDEX|BSE_INDEX|NFO|BFO|MCX", 0);
    
    /* Expiry Settings for Both Legs */
    expiry_leg1 = ParamStr("Expiry Date Leg1 (DDMMMYY)", "30DEC25");
    expiry_leg2 = ParamStr("Expiry Date Leg2 (DDMMMYY)", "30DEC25");
    
    /* Lot Size */
    LotSize = Param("Lot Size", 65, 1, 10000, 1);
    
    /* ========== BUY SIGNAL LEG CONFIGURATION ========== */
    /* Leg 1 (Buy Signal) */
    opttype_buyleg1 = ParamList("Buy Leg1 Option Type", "CE|PE", 0);
    tradetype_buyleg1 = ParamList("Buy Leg1 Trade Type", "BUY|SELL", 0);
    offset_buyleg1 = ParamStr("Buy Leg1 Offset", "ATM");  /* ATM, ITM1, ITM2, OTM1, OTM2 */
    quantity_leg1 = Param("Buy Leg1 Quantity (Lots)", 1, 0, 100) * LotSize;
    
    /* Leg 2 (Buy Signal) */
    opttype_buyleg2 = ParamList("Buy Leg2 Option Type", "CE|PE", 1);
    tradetype_buyleg2 = ParamList("Buy Leg2 Trade Type", "BUY|SELL", 1);
    offset_buyleg2 = ParamStr("Buy Leg2 Offset", "ATM");  /* ATM, ITM1, ITM2, OTM1, OTM2 */
    quantity_leg2 = Param("Buy Leg2 Quantity (Lots)", 1, 0, 100) * LotSize;
    
    /* ========== SHORT SIGNAL LEG CONFIGURATION ========== */
    /* Leg 1 (Short Signal) */
    opttype_shortleg1 = ParamList("Short Leg1 Option Type", "CE|PE", 1);
    tradetype_shortleg1 = ParamList("Short Leg1 Trade Type", "BUY|SELL", 0);
    offset_shortleg1 = ParamStr("Short Leg1 Offset", "ATM");  /* ATM, ITM1, ITM2, OTM1, OTM2 */
    
    /* Leg 2 (Short Signal) */
    opttype_shortleg2 = ParamList("Short Leg2 Option Type", "CE|PE", 0);
    tradetype_shortleg2 = ParamList("Short Leg2 Trade Type", "BUY|SELL", 1);
    offset_shortleg2 = ParamStr("Short Leg2 Offset", "ATM");  /* ATM, ITM1, ITM2, OTM1, OTM2 */
    
    /* Order Settings */
    pricetype = ParamList("Order Type", "MARKET", 0);
    product = ParamList("Product", "NRML|MIS", 0);
    
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
    
    /* Buy Signal Legs Tracking */
    static_buyleg1_order = static_name_ + "_buyleg1_order";
    static_buyleg1_symbol = static_name_ + "_buyleg1_symbol";
    static_buyleg1_exchange = static_name_ + "_buyleg1_exchange";
    
    static_buyleg2_order = static_name_ + "_buyleg2_order";
    static_buyleg2_symbol = static_name_ + "_buyleg2_symbol";
    static_buyleg2_exchange = static_name_ + "_buyleg2_exchange";
    
    /* Short Signal Legs Tracking */
    static_shortleg1_order = static_name_ + "_shortleg1_order";
    static_shortleg1_symbol = static_name_ + "_shortleg1_symbol";
    static_shortleg1_exchange = static_name_ + "_shortleg1_exchange";
    
    static_shortleg2_order = static_name_ + "_shortleg2_order";
    static_shortleg2_symbol = static_name_ + "_shortleg2_symbol";
    static_shortleg2_exchange = static_name_ + "_shortleg2_exchange";

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
    
    /* Display Strategy Info */
    GfxSelectFont("BOOK ANTIQUA", 10, 400);
    GfxSetTextColor(colorWhite);
    GfxTextOut("Underlying: " + underlying + " | Product: " + product + " | API: OptionsMultiOrder", 20, 65);
    GfxTextOut("Expiry Leg1: " + expiry_leg1 + " | Expiry Leg2: " + expiry_leg2, 20, 83);
    
    /* Display Buy Signal Configuration */
    GfxSetTextColor(colorBrightGreen);
    GfxTextOut("BUY Signal Config:", 20, 105);
    GfxSetTextColor(colorWhite);
    GfxTextOut("Leg1: " + tradetype_buyleg1 + " " + opttype_buyleg1 + " @ " + offset_buyleg1 + " | Qty: " + NumToStr(quantity_leg1, 1.0), 20, 123);
    GfxTextOut("Leg2: " + tradetype_buyleg2 + " " + opttype_buyleg2 + " @ " + offset_buyleg2 + " | Qty: " + NumToStr(quantity_leg2, 1.0), 20, 141);
    
    /* Display Short Signal Configuration */
    GfxSetTextColor(colorRed);
    GfxTextOut("SHORT Signal Config:", 20, 163);
    GfxSetTextColor(colorWhite);
    GfxTextOut("Leg1: " + tradetype_shortleg1 + " " + opttype_shortleg1 + " @ " + offset_shortleg1, 20, 181);
    GfxTextOut("Leg2: " + tradetype_shortleg2 + " " + opttype_shortleg2 + " @ " + offset_shortleg2, 20, 199);
    
    /* Display Position Status */
    GfxSelectFont("BOOK ANTIQUA", 10, 700);
    GfxSetTextColor(colorYellow);
    GfxTextOut("=== POSITION STATUS ===", 20, 225);
    
    GfxSelectFont("BOOK ANTIQUA", 9, 400);
    buyleg1_status = WriteIf(Nz(StaticVarGet(static_buyleg1_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_buyleg1_symbol), "NONE");
    buyleg2_status = WriteIf(Nz(StaticVarGet(static_buyleg2_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_buyleg2_symbol), "NONE");
    shortleg1_status = WriteIf(Nz(StaticVarGet(static_shortleg1_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_shortleg1_symbol), "NONE");
    shortleg2_status = WriteIf(Nz(StaticVarGet(static_shortleg2_order), 0) == 1, "ACTIVE: " + StaticVarGetText(static_shortleg2_symbol), "NONE");
    
    GfxSetTextColor(colorAqua);
    GfxTextOut("Buy Leg1: " + buyleg1_status, 20, 243);
    GfxTextOut("Buy Leg2: " + buyleg2_status, 20, 258);
    GfxSetTextColor(colorOrange);
    GfxTextOut("Short Leg1: " + shortleg1_status, 20, 273);
    GfxTextOut("Short Leg2: " + shortleg2_status, 20, 288);

    /* --------------------------------------------------------------------------
       Refresh Memory Button
       -------------------------------------------------------------------------- */
    btnRefreshY = 310;
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
                
                /* Clear Buy Legs Position Tracking */
                StaticVarSet(static_buyleg1_order, 0);
                StaticVarSetText(static_buyleg1_symbol, "");
                StaticVarSetText(static_buyleg1_exchange, "");
                
                StaticVarSet(static_buyleg2_order, 0);
                StaticVarSetText(static_buyleg2_symbol, "");
                StaticVarSetText(static_buyleg2_exchange, "");
                
                /* Clear Short Legs Position Tracking */
                StaticVarSet(static_shortleg1_order, 0);
                StaticVarSetText(static_shortleg1_symbol, "");
                StaticVarSetText(static_shortleg1_exchange, "");
                
                StaticVarSet(static_shortleg2_order, 0);
                StaticVarSetText(static_shortleg2_symbol, "");
                StaticVarSetText(static_shortleg2_exchange, "");
                
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
           BUY + COVER SIGNAL (Reversal from Short to Long)
           ======================================================================== */
        if (AlgoBuy == True AND AlgoCover == True AND StaticVarGet(static_name_ + "buyCoverAlgo") == 0 AND StaticVarGetText(static_name_ + "buyCoverAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable")
            {
                _TRACE("=== BUY + COVER Signal Triggered (MultiOrder) ===");
                
                /* Exit Short Legs First */
                exit_sym1 = StaticVarGetText(static_shortleg1_symbol);
                exit_exch1 = StaticVarGetText(static_shortleg1_exchange);
                if (exit_sym1 != "" AND Nz(StaticVarGet(static_shortleg1_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym1, exit_exch1, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_shortleg1_order, 0);
                        StaticVarSetText(static_shortleg1_symbol, "");
                        StaticVarSetText(static_shortleg1_exchange, "");
                        _TRACE("Short Leg1 Exit Success");
                    }
                }
                
                exit_sym2 = StaticVarGetText(static_shortleg2_symbol);
                exit_exch2 = StaticVarGetText(static_shortleg2_exchange);
                if (exit_sym2 != "" AND Nz(StaticVarGet(static_shortleg2_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym2, exit_exch2, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_shortleg2_order, 0);
                        StaticVarSetText(static_shortleg2_symbol, "");
                        StaticVarSetText(static_shortleg2_exchange, "");
                        _TRACE("Short Leg2 Exit Success");
                    }
                }
                
                /* Place Multi-Leg Buy Entry Order */
                response = PostMultiLegOrder(
                    offset_buyleg1, opttype_buyleg1, tradetype_buyleg1, expiry_leg1, quantity_leg1,
                    offset_buyleg2, opttype_buyleg2, tradetype_buyleg2, expiry_leg2, quantity_leg2,
                    apikey, strategy, underlying, exchange, pricetype, product, host, ver
                );
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    /* Extract Leg 1 details (API returns "leg":1) */
                    symbol1 = StrReplace(ExtractLegValue(response, 1, "symbol"), "\"", "");
                    exchange1 = StrReplace(ExtractLegValue(response, 1, "exchange"), "\"", "");
                    
                    /* Extract Leg 2 details (API returns "leg":2) */
                    symbol2 = StrReplace(ExtractLegValue(response, 2, "symbol"), "\"", "");
                    exchange2 = StrReplace(ExtractLegValue(response, 2, "exchange"), "\"", "");
                    
                    if (symbol1 != "")
                    {
                        StaticVarSet(static_buyleg1_order, 1);
                        StaticVarSetText(static_buyleg1_symbol, symbol1, True);
                        StaticVarSetText(static_buyleg1_exchange, exchange1, True);
                        _TRACEF("Buy Leg1 Entry Success: %s on %s", symbol1, exchange1);
                    }
                    
                    if (symbol2 != "")
                    {
                        StaticVarSet(static_buyleg2_order, 1);
                        StaticVarSetText(static_buyleg2_symbol, symbol2, True);
                        StaticVarSetText(static_buyleg2_exchange, exchange2, True);
                        _TRACEF("Buy Leg2 Entry Success: %s on %s", symbol2, exchange2);
                    }
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Cover Multi Order Placed");
                    }
                }
                else
                {
                    _TRACE("Buy MultiOrder Failed");
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Order Failed");
                    }
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

        /* ========================================================================
           BUY ONLY SIGNAL (Fresh Long Entry)
           ======================================================================== */
        if (AlgoBuy == True AND AlgoCover != True AND StaticVarGet(static_name_ + "buyAlgo") == 0 AND StaticVarGetText(static_name_ + "buyAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "LongOnly")
            {
                _TRACE("=== BUY Signal Triggered (MultiOrder) ===");
                
                /* Place Multi-Leg Buy Entry Order */
                response = PostMultiLegOrder(
                    offset_buyleg1, opttype_buyleg1, tradetype_buyleg1, expiry_leg1, quantity_leg1,
                    offset_buyleg2, opttype_buyleg2, tradetype_buyleg2, expiry_leg2, quantity_leg2,
                    apikey, strategy, underlying, exchange, pricetype, product, host, ver
                );
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    /* Extract Leg 1 details (API returns "leg":1) */
                    symbol1 = StrReplace(ExtractLegValue(response, 1, "symbol"), "\"", "");
                    exchange1 = StrReplace(ExtractLegValue(response, 1, "exchange"), "\"", "");
                    
                    /* Extract Leg 2 details (API returns "leg":2) */
                    symbol2 = StrReplace(ExtractLegValue(response, 2, "symbol"), "\"", "");
                    exchange2 = StrReplace(ExtractLegValue(response, 2, "exchange"), "\"", "");
                    
                    if (symbol1 != "")
                    {
                        StaticVarSet(static_buyleg1_order, 1);
                        StaticVarSetText(static_buyleg1_symbol, symbol1, True);
                        StaticVarSetText(static_buyleg1_exchange, exchange1, True);
                        _TRACEF("Buy Leg1 Entry Success: %s on %s", symbol1, exchange1);
                    }
                    
                    if (symbol2 != "")
                    {
                        StaticVarSet(static_buyleg2_order, 1);
                        StaticVarSetText(static_buyleg2_symbol, symbol2, True);
                        StaticVarSetText(static_buyleg2_exchange, exchange2, True);
                        _TRACEF("Buy Leg2 Entry Success: %s on %s", symbol2, exchange2);
                    }
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Multi Order Placed");
                    }
                }
                else
                {
                    _TRACE("Buy MultiOrder Failed");
                    if (VoiceAlert == "Enable")
                    {
                        Say("Buy Order Failed");
                    }
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
           SELL ONLY SIGNAL (Exit Long)
           ======================================================================== */
        if (AlgoSell == True AND AlgoShort != True AND StaticVarGet(static_name_ + "sellAlgo") == 0 AND StaticVarGetText(static_name_ + "sellAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "LongOnly")
            {
                _TRACE("=== SELL Signal Triggered ===");
                
                /* Exit Buy Leg 1 */
                exit_sym1 = StaticVarGetText(static_buyleg1_symbol);
                exit_exch1 = StaticVarGetText(static_buyleg1_exchange);
                if (exit_sym1 != "" AND Nz(StaticVarGet(static_buyleg1_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym1, exit_exch1, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_buyleg1_order, 0);
                        StaticVarSetText(static_buyleg1_symbol, "");
                        StaticVarSetText(static_buyleg1_exchange, "");
                        _TRACE("Buy Leg1 Exit Success");
                    }
                }
                
                /* Exit Buy Leg 2 */
                exit_sym2 = StaticVarGetText(static_buyleg2_symbol);
                exit_exch2 = StaticVarGetText(static_buyleg2_exchange);
                if (exit_sym2 != "" AND Nz(StaticVarGet(static_buyleg2_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym2, exit_exch2, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_buyleg2_order, 0);
                        StaticVarSetText(static_buyleg2_symbol, "");
                        StaticVarSetText(static_buyleg2_exchange, "");
                        _TRACE("Buy Leg2 Exit Success");
                    }
                }
                
                if (VoiceAlert == "Enable")
                {
                    Say("Sell Exit Order Placed");
                }
                
                StaticVarSet(static_name_ + "sellAlgo", 1);
                StaticVarSetText(static_name_ + "sellAlgo_barvalue", lasttime);
            }
        }
        else if (AlgoSell != True)
        {
            StaticVarSet(static_name_ + "sellAlgo", 0);
            StaticVarSetText(static_name_ + "sellAlgo_barvalue", "");
        }

        /* ========================================================================
           SHORT + SELL SIGNAL (Reversal from Long to Short)
           ======================================================================== */
        if (AlgoShort == True AND AlgoSell == True AND StaticVarGet(static_name_ + "ShortSellAlgo") == 0 AND StaticVarGetText(static_name_ + "ShortSellAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable")
            {
                _TRACE("=== SHORT + SELL Signal Triggered (MultiOrder) ===");
                
                /* Exit Buy Legs First */
                exit_sym1 = StaticVarGetText(static_buyleg1_symbol);
                exit_exch1 = StaticVarGetText(static_buyleg1_exchange);
                if (exit_sym1 != "" AND Nz(StaticVarGet(static_buyleg1_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym1, exit_exch1, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_buyleg1_order, 0);
                        StaticVarSetText(static_buyleg1_symbol, "");
                        StaticVarSetText(static_buyleg1_exchange, "");
                        _TRACE("Buy Leg1 Exit Success");
                    }
                }
                
                exit_sym2 = StaticVarGetText(static_buyleg2_symbol);
                exit_exch2 = StaticVarGetText(static_buyleg2_exchange);
                if (exit_sym2 != "" AND Nz(StaticVarGet(static_buyleg2_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym2, exit_exch2, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_buyleg2_order, 0);
                        StaticVarSetText(static_buyleg2_symbol, "");
                        StaticVarSetText(static_buyleg2_exchange, "");
                        _TRACE("Buy Leg2 Exit Success");
                    }
                }
                
                /* Place Multi-Leg Short Entry Order */
                response = PostMultiLegOrder(
                    offset_shortleg1, opttype_shortleg1, tradetype_shortleg1, expiry_leg1, quantity_leg1,
                    offset_shortleg2, opttype_shortleg2, tradetype_shortleg2, expiry_leg2, quantity_leg2,
                    apikey, strategy, underlying, exchange, pricetype, product, host, ver
                );
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    /* Extract Leg 1 details (API returns "leg":1) */
                    symbol1 = StrReplace(ExtractLegValue(response, 1, "symbol"), "\"", "");
                    exchange1 = StrReplace(ExtractLegValue(response, 1, "exchange"), "\"", "");
                    
                    /* Extract Leg 2 details (API returns "leg":2) */
                    symbol2 = StrReplace(ExtractLegValue(response, 2, "symbol"), "\"", "");
                    exchange2 = StrReplace(ExtractLegValue(response, 2, "exchange"), "\"", "");
                    
                    if (symbol1 != "")
                    {
                        StaticVarSet(static_shortleg1_order, 1);
                        StaticVarSetText(static_shortleg1_symbol, symbol1, True);
                        StaticVarSetText(static_shortleg1_exchange, exchange1, True);
                        _TRACEF("Short Leg1 Entry Success: %s on %s", symbol1, exchange1);
                    }
                    
                    if (symbol2 != "")
                    {
                        StaticVarSet(static_shortleg2_order, 1);
                        StaticVarSetText(static_shortleg2_symbol, symbol2, True);
                        StaticVarSetText(static_shortleg2_exchange, exchange2, True);
                        _TRACEF("Short Leg2 Entry Success: %s on %s", symbol2, exchange2);
                    }
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Sell Multi Order Placed");
                    }
                }
                else
                {
                    _TRACE("Short MultiOrder Failed");
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Order Failed");
                    }
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

        /* ========================================================================
           SHORT ONLY SIGNAL (Fresh Short Entry)
           ======================================================================== */
        if (AlgoShort == True AND AlgoSell != True AND StaticVarGet(static_name_ + "ShortAlgo") == 0 AND StaticVarGetText(static_name_ + "ShortAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "ShortOnly")
            {
                _TRACE("=== SHORT Signal Triggered (MultiOrder) ===");
                
                /* Place Multi-Leg Short Entry Order */
                response = PostMultiLegOrder(
                    offset_shortleg1, opttype_shortleg1, tradetype_shortleg1, expiry_leg1, quantity_leg1,
                    offset_shortleg2, opttype_shortleg2, tradetype_shortleg2, expiry_leg2, quantity_leg2,
                    apikey, strategy, underlying, exchange, pricetype, product, host, ver
                );
                
                has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                
                if (has_success)
                {
                    /* Extract Leg 1 details (API returns "leg":1) */
                    symbol1 = StrReplace(ExtractLegValue(response, 1, "symbol"), "\"", "");
                    exchange1 = StrReplace(ExtractLegValue(response, 1, "exchange"), "\"", "");
                    
                    /* Extract Leg 2 details (API returns "leg":2) */
                    symbol2 = StrReplace(ExtractLegValue(response, 2, "symbol"), "\"", "");
                    exchange2 = StrReplace(ExtractLegValue(response, 2, "exchange"), "\"", "");
                    
                    if (symbol1 != "")
                    {
                        StaticVarSet(static_shortleg1_order, 1);
                        StaticVarSetText(static_shortleg1_symbol, symbol1, True);
                        StaticVarSetText(static_shortleg1_exchange, exchange1, True);
                        _TRACEF("Short Leg1 Entry Success: %s on %s", symbol1, exchange1);
                    }
                    
                    if (symbol2 != "")
                    {
                        StaticVarSet(static_shortleg2_order, 1);
                        StaticVarSetText(static_shortleg2_symbol, symbol2, True);
                        StaticVarSetText(static_shortleg2_exchange, exchange2, True);
                        _TRACEF("Short Leg2 Entry Success: %s on %s", symbol2, exchange2);
                    }
                    
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Multi Order Placed");
                    }
                }
                else
                {
                    _TRACE("Short MultiOrder Failed");
                    if (VoiceAlert == "Enable")
                    {
                        Say("Short Order Failed");
                    }
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
           COVER ONLY SIGNAL (Exit Short)
           ======================================================================== */
        if (AlgoCover == True AND AlgoBuy != True AND StaticVarGet(static_name_ + "CoverAlgo") == 0 AND StaticVarGetText(static_name_ + "CoverAlgo_barvalue") != lasttime)
        {
            if (EnableAlgo == "Enable" OR EnableAlgo == "ShortOnly")
            {
                _TRACE("=== COVER Signal Triggered ===");
                
                /* Exit Short Leg 1 */
                exit_sym1 = StaticVarGetText(static_shortleg1_symbol);
                exit_exch1 = StaticVarGetText(static_shortleg1_exchange);
                if (exit_sym1 != "" AND Nz(StaticVarGet(static_shortleg1_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym1, exit_exch1, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_shortleg1_order, 0);
                        StaticVarSetText(static_shortleg1_symbol, "");
                        StaticVarSetText(static_shortleg1_exchange, "");
                        _TRACE("Short Leg1 Exit Success");
                    }
                }
                
                /* Exit Short Leg 2 */
                exit_sym2 = StaticVarGetText(static_shortleg2_symbol);
                exit_exch2 = StaticVarGetText(static_shortleg2_exchange);
                if (exit_sym2 != "" AND Nz(StaticVarGet(static_shortleg2_order), 0) == 1)
                {
                    response = ExitPosition(exit_sym2, exit_exch2, product, apikey, strategy, host, ver);
                    if (StrFind(response, "\"status\":\"success\"") >= 0)
                    {
                        StaticVarSet(static_shortleg2_order, 0);
                        StaticVarSetText(static_shortleg2_symbol, "");
                        StaticVarSetText(static_shortleg2_exchange, "");
                        _TRACE("Short Leg2 Exit Success");
                    }
                }
                
                if (VoiceAlert == "Enable")
                {
                    Say("Cover Exit Order Placed");
                }
                
                StaticVarSet(static_name_ + "CoverAlgo", 1);
                StaticVarSetText(static_name_ + "CoverAlgo_barvalue", lasttime);
            }
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

**Here are the Supported two-legged options trading strategies:**

**Credit Spread:** Selling an option at one strike price and buying an option at a lower strike price.

**Debit Spread:** Buying an option at one strike price and selling an option at a higher strike price.

**Straddle:** buying a call and a put option with the same strike price and expiration date.

**Strangle:** buying a call option with a higher strike price and a put option with a lower strike price

**Synthetic Futures:** Buying/Selling a call option and selling/Buying a put option of the same strike price and expiration date

**Diagonal Spread:** Buying a call or put option with a longer expiration date and selling a call or put option with a shorter expiration date and a different strike price.

**Calendar Spread:** Buying a call or put option with a longer expiration date and selling a call or put option with a shorter expiration date.

**Ratio Spread:** Buying a call or put option at one strike price and selling multiple options at a different strike price

**Ratio Back Spread:** Buying multiple options at one strike price and selling an option at a different strike price
