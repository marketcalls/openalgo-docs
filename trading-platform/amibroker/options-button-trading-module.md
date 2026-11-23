# Options Button Trading Module

This AFL script is an advanced interactive trading tool designed for AmiBroker, specifically to facilitate manual execution of options trades via a graphical interface connected to the OpenAlgo bridge API. It calculates key strike prices (ATM, ITM, OTM) for Call (CE) and Put (PE) options based on parameters such as the underlying spot, expiry, strike intervals, and offsets relative to the spot price (which can be based on previous open, close, or today’s open). It constructs standard option symbols for execution and visually displays the Algo status on the chart. The script also maintains static variables to track open trades and ensures strike recalculations align with user-selected inputs.

### Internet Method (Modern Method)

```cpp
// Rajandran R - Creator of OpenAlgo
// website - openalgo.in / marketcalls.in
// OpenAlgo - Amibroker Options Button Trading Module (Modern GUI) v2.1
// Date - 21/11/2025
// 
// Features:
// - Separate CE and PE button sections with grid layout
// - BUY/SELL Mode: Trade options in BUY mode (long) or SELL mode (short/writing)
// - Smart Exit: Uses placesmartorder with quantity=0 and position_size=0 for clean exits
// - Modern Internet Functions (no VBScript)
// - Static variable tracking for order management
// - Real-time order status display
// - Close All positions with single button

_SECTION_BEGIN("OpenAlgo Options Button Trading Module");

/* Note: This AFL requires AmiBroker 6.35 or higher */

/* --------------------------------------------------------------------------
   Version Check Variable
   -------------------------------------------------------------------------- */
ReqVer = 6.35;

/* --------------------------------------------------------------------------
   Global Variables
   -------------------------------------------------------------------------- */
global IDset;
IDset = 0;

/* --------------------------------------------------------------------------
   Helper Functions - Defined at Global Scope
   -------------------------------------------------------------------------- */

/* Function to post option order to OpenAlgo API */
function PostOptionOrder(offset_val, opt_type, act, qty, apikey_val, strategy_val, underlying_val, exchange_val, expiry_val, pricetype_val, product_val, price_val, trigger_val, host_val, ver_val)
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
           "\"price\": \"" + NumToStr(price_val, 1.2) + "\", " +
           "\"trigger_price\": \"" + NumToStr(trigger_val, 1.2) + "\", " +
           "\"disclosed_quantity\": \"0\"}";
    
    _TRACEF("OpenAlgo OptionsOrder Request: %s", body);
    
    /* Set headers exactly like working solution */
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

/* Function to exit position using placesmartorder with quantity=0 and position_size=0 
   This API call will close any existing position for the given symbol.
   COPIED FROM WORKING SMART CHART MODULE - ExitOrder function */
function ExitPosition(sym, exch, product_type, apikey_val, strategy_val, host_val, ver_val)
{
    /* Build postData exactly like working solution */
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
    
    /* Build URL exactly like working solution */
    bridgeurl = host_val + "/api/" + ver_val;
    ih = InternetPostRequest(bridgeurl + "/placesmartorder", postData);

    if (ih) {
        response = "";
        while ((line = InternetReadString(ih)) != "") {
            response += line;
        }
        _TRACEF("Exit Order Response: %s", response);
        InternetClose(ih);
    } else {
        _TRACE("Failed to place exit order.");
    }
    
    return response;
}

/* Function to close all positions */
function CloseAllPositions(apikey_val, strategy_val, host_val, ver_val)
{
    url = host_val + "/api/" + ver_val + "/closeposition";
    
    body = "{\"apikey\": \"" + apikey_val + "\", " +
           "\"strategy\": \"" + strategy_val + "\"}";
    
    _TRACEF("OpenAlgo CloseAllPositions Request: %s", body);
    
    /* Set headers exactly like working solution */
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
        _TRACEF("OpenAlgo CloseAllPositions Response: %s", response);
        InternetClose(ih);
    }
    else
    {
        _TRACE("OpenAlgo HTTP post failed");
    }
    
    return response;
}

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

/* --------------------------------------------------------------------------
   Version Check and Main Code
   -------------------------------------------------------------------------- */
if ( Version() < ReqVer )
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
       Global Settings and Initialization
       -------------------------------------------------------------------------- */
    RequestTimedRefresh(1, False);
    EnableTextOutput(False);
    SetOption("StaticVarAutoSave", 30);
    
    /* --------------------------------------------------------------------------
       Parameters
       -------------------------------------------------------------------------- */
    apikey = ParamStr("OpenAlgo API Key", "******");
    strategy = ParamStr("Strategy Name", "OptionButtons");
    
    host = ParamStr("Host", "http://127.0.0.1:5000");
    ver = ParamStr("API Version", "v1");
    
    underlying = ParamStr("Underlying Symbol", "NIFTY");
    exchange = ParamList("Exchange", "NSE_INDEX|BSE_INDEX|NFO|BFO", 0);
    expiry = ParamStr("Expiry Date (DDMMMYY)", "25NOV25");
    
    /* Offset Parameters */
    ATM_offset = ParamStr("ATM Offset", "ATM");
    ITM_offset = ParamStr("ITM Offset", "ITM2");
    OTM_offset = ParamStr("OTM Offset", "OTM2");
    
    /* Order Parameters */
    trade_mode = ParamList("Trade Mode", "BUY|SELL", 0);
    LotSize = Param("Lot Size", 65, 1, 10000, 1);
    quantity = Param("Quantity (Lots)", 1, 0, 100) * LotSize;
    pricetype = ParamList("Order Type", "MARKET|LIMIT|SL|SL-M", 0);
    product = ParamList("Product", "NRML|MIS", 0);
    
    price = Param("Limit Price", 0, 0, 100000, 0.05);
    trigger_price = Param("Trigger Price", 0, 0, 100000, 0.05);
    
    EnableAlgo = ParamList("Enable Trading", "Disable|Enable", 0);
    VoiceAlert = ParamList("Voice Alert", "Disable|Enable", 1);
    
    /* --------------------------------------------------------------------------
       Static Variable Names for Tracking Orders
       -------------------------------------------------------------------------- */
    static_base = Name() + GetChartID() + interval(2) + strategy;
    static_algo_status = static_base + "_algostatus";
    
    /* CE Orders */
    static_ATM_CE_order = static_base + "_ATM_CE_order";
    static_ITM_CE_order = static_base + "_ITM_CE_order";
    static_OTM_CE_order = static_base + "_OTM_CE_order";
    
    static_ATM_CE_symbol = static_base + "_ATM_CE_symbol";
    static_ITM_CE_symbol = static_base + "_ITM_CE_symbol";
    static_OTM_CE_symbol = static_base + "_OTM_CE_symbol";
    
    static_ATM_CE_exchange = static_base + "_ATM_CE_exchange";
    static_ITM_CE_exchange = static_base + "_ITM_CE_exchange";
    static_OTM_CE_exchange = static_base + "_OTM_CE_exchange";
    
    /* PE Orders */
    static_ATM_PE_order = static_base + "_ATM_PE_order";
    static_ITM_PE_order = static_base + "_ITM_PE_order";
    static_OTM_PE_order = static_base + "_OTM_PE_order";
    
    static_ATM_PE_symbol = static_base + "_ATM_PE_symbol";
    static_ITM_PE_symbol = static_base + "_ITM_PE_symbol";
    static_OTM_PE_symbol = static_base + "_OTM_PE_symbol";
    
    static_ATM_PE_exchange = static_base + "_ATM_PE_exchange";
    static_ITM_PE_exchange = static_base + "_ITM_PE_exchange";
    static_OTM_PE_exchange = static_base + "_OTM_PE_exchange";
    
    /* --------------------------------------------------------------------------
       GUI Layout and Buttons
       -------------------------------------------------------------------------- */
    
    GfxSetTextColor(colorWhite);
    GfxSetBkColor(colorBlack);
    GfxSelectFont("Arial", 12, 700);
    
    /* Display Algo Status */
    x0 = 20;
    y0 = 20;
    
    if (EnableAlgo == "Enable")
    {
        AlgoStatus = "Algo Enabled";
        GfxSetTextColor(colorGreen);
        GfxTextOut("Trading : " + AlgoStatus, x0, y0);
        
        if (Nz(StaticVarGet(static_algo_status), 0) != 1)
        {
            _TRACE("Algo Status: Enabled");
            StaticVarSet(static_algo_status, 1);
        }
    }
    else
    {
        AlgoStatus = "Algo Disabled";
        GfxSetTextColor(colorRed);
        GfxTextOut("Trading : " + AlgoStatus, x0, y0);
        
        if (Nz(StaticVarGet(static_algo_status), 0) != 0)
        {
            _TRACE("Algo Status: Disabled");
            StaticVarSet(static_algo_status, 0);
        }
    }
    
    /* Display Current Settings */
    GfxSetTextColor(colorWhite);
    GfxSelectFont("Arial", 10, 400);
    GfxTextOut("Underlying: " + underlying + " | Expiry: " + expiry, x0, y0 + 25);
    GfxTextOut("Quantity: " + NumToStr(quantity, 1.0) + " | Product: " + product + " | Price Type: " + pricetype, x0, y0 + 42);
    
    /* Trade Mode Display - Large and Prominent */
    GfxSelectFont("Arial", 22, 900);  /* Extra large and bold */
    if (trade_mode == "BUY")
    {
        GfxSetTextColor(colorBrightGreen);
    }
    else
    {
        GfxSetTextColor(colorRed);
    }
    GfxTextOut("MODE: " + trade_mode, x0, y0 + 60);
    
    /* Button Layout */
    btnY = y0 + 95;  /* Adjusted to accommodate larger MODE display */
    btnW = 110;
    btnH = 40;
    btnGap = 15;
    
    /* --------------------------------------------------------------------------
       Create GUI Buttons - Grid Layout
       -------------------------------------------------------------------------- */
    
    if (EnableAlgo == "Enable")
    {
        /* ========== CALL OPTION (CE) BUTTONS ========== */
        
        /* Row 1: CE Entry Buttons */
        GuiButton("ATM CE", ++IDset, x0, btnY, btnW, btnH, notifyClicked);
        btnATM_CE = IDset;
        GuiSetColors(btnATM_CE, btnATM_CE, 1, colorWhite, colorGreen, colorWhite);
        
        GuiButton("ITM CE", ++IDset, x0 + (btnW + btnGap), btnY, btnW, btnH, notifyClicked);
        btnITM_CE = IDset;
        GuiSetColors(btnITM_CE, btnITM_CE, 1, colorWhite, colorRed, colorWhite);
        
        GuiButton("OTM CE", ++IDset, x0 + (btnW + btnGap) * 2, btnY, btnW, btnH, notifyClicked);
        btnOTM_CE = IDset;
        GuiSetColors(btnOTM_CE, btnOTM_CE, 1, colorWhite, colorBlue, colorWhite);
        
        /* Row 2: CE Exit Buttons */
        GuiButton("x ATM CE", ++IDset, x0, btnY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitATM_CE = IDset;
        GuiSetColors(btnExitATM_CE, btnExitATM_CE, 1, colorWhite, colorGreen, colorWhite);
        
        GuiButton("x ITM CE", ++IDset, x0 + (btnW + btnGap), btnY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitITM_CE = IDset;
        GuiSetColors(btnExitITM_CE, btnExitITM_CE, 1, colorWhite, colorRed, colorWhite);
        
        GuiButton("x OTM CE", ++IDset, x0 + (btnW + btnGap) * 2, btnY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitOTM_CE = IDset;
        GuiSetColors(btnExitOTM_CE, btnExitOTM_CE, 1, colorWhite, colorBlue, colorWhite);
        
        /* ========== PUT OPTION (PE) BUTTONS ========== */
        
        peY = btnY + (btnH + btnGap) * 2 + 20;
        
        /* Row 3: PE Entry Buttons */
        GuiButton("ATM PE", ++IDset, x0, peY, btnW, btnH, notifyClicked);
        btnATM_PE = IDset;
        GuiSetColors(btnATM_PE, btnATM_PE, 1, colorWhite, colorGreen, colorWhite);
        
        GuiButton("ITM PE", ++IDset, x0 + (btnW + btnGap), peY, btnW, btnH, notifyClicked);
        btnITM_PE = IDset;
        GuiSetColors(btnITM_PE, btnITM_PE, 1, colorWhite, colorRed, colorWhite);
        
        GuiButton("OTM PE", ++IDset, x0 + (btnW + btnGap) * 2, peY, btnW, btnH, notifyClicked);
        btnOTM_PE = IDset;
        GuiSetColors(btnOTM_PE, btnOTM_PE, 1, colorWhite, colorBlue, colorWhite);
        
        /* Row 4: PE Exit Buttons */
        GuiButton("x ATM PE", ++IDset, x0, peY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitATM_PE = IDset;
        GuiSetColors(btnExitATM_PE, btnExitATM_PE, 1, colorWhite, colorGreen, colorWhite);
        
        GuiButton("x ITM PE", ++IDset, x0 + (btnW + btnGap), peY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitITM_PE = IDset;
        GuiSetColors(btnExitITM_PE, btnExitITM_PE, 1, colorWhite, colorRed, colorWhite);
        
        GuiButton("x OTM PE", ++IDset, x0 + (btnW + btnGap) * 2, peY + btnH + btnGap, btnW, btnH, notifyClicked);
        btnExitOTM_PE = IDset;
        GuiSetColors(btnExitOTM_PE, btnExitOTM_PE, 1, colorWhite, colorBlue, colorWhite);
        
        /* ========== CLOSE ALL BUTTON ========== */
        
        closeY = peY + (btnH + btnGap) * 2 + 20;
        GuiButton("CLOSE ALL", ++IDset, x0, closeY, btnW + 20, btnH, notifyClicked);
        btnCloseAll = IDset;
        GuiSetColors(btnCloseAll, btnCloseAll, 1, colorWhite, colorDarkRed, colorWhite);
        
        /* Display Order Status */
        statusY = closeY + btnH + 30;
        GfxSelectFont("Arial", 16, 900); 
        GfxSetTextColor(colorYellow);
        GfxTextOut("Order Status:", x0, statusY);
        
        GfxSetTextColor(colorWhite);
        ATM_CE_status = WriteIf(Nz(StaticVarGet(static_ATM_CE_order), 0) == 1, "ACTIVE", "NONE");
        ITM_CE_status = WriteIf(Nz(StaticVarGet(static_ITM_CE_order), 0) == 1, "ACTIVE", "NONE");
        OTM_CE_status = WriteIf(Nz(StaticVarGet(static_OTM_CE_order), 0) == 1, "ACTIVE", "NONE");
        
        ATM_PE_status = WriteIf(Nz(StaticVarGet(static_ATM_PE_order), 0) == 1, "ACTIVE", "NONE");
        ITM_PE_status = WriteIf(Nz(StaticVarGet(static_ITM_PE_order), 0) == 1, "ACTIVE", "NONE");
        OTM_PE_status = WriteIf(Nz(StaticVarGet(static_OTM_PE_order), 0) == 1, "ACTIVE", "NONE");
        
        GfxTextOut("CE Orders - ATM: " + ATM_CE_status + " | ITM: " + ITM_CE_status + " | OTM: " + OTM_CE_status, x0, statusY + 20);
        GfxTextOut("PE Orders - ATM: " + ATM_PE_status + " | ITM: " + ITM_PE_status + " | OTM: " + OTM_PE_status, x0, statusY + 40);
        
        /* --------------------------------------------------------------------------
           Event Loop - Process Button Clicks
           -------------------------------------------------------------------------- */
        
        for (i = 0; (cid = GuiGetEvent(i, 0)) > 0; i++)
        {
            if (GuiGetEvent(i, 1) == notifyClicked)
            {
                /* ========== CALL OPTION (CE) ENTRIES ========== */
                
                /* ATM CE Entry */
                if (cid == btnATM_CE AND Nz(StaticVarGet(static_ATM_CE_order), 0) == 0)
                {
                    _TRACE("Placing ATM CE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(ATM_offset, "CE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes that might have been extracted */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    _TRACEF("Cleaned Symbol: [%s]", symbol_resolved);
                    _TRACEF("Cleaned Exchange: [%s]", exchange_resolved);
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_ATM_CE_order, 1);
                        StaticVarSetText(static_ATM_CE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_ATM_CE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("ATM CE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("ATM CE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("ATM CE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("ATM CE Order Failed");
                        }
                    }
                }
                
                /* ITM CE Entry */
                if (cid == btnITM_CE AND Nz(StaticVarGet(static_ITM_CE_order), 0) == 0)
                {
                    _TRACE("Placing ITM CE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(ITM_offset, "CE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_ITM_CE_order, 1);
                        StaticVarSetText(static_ITM_CE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_ITM_CE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("ITM CE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("ITM CE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("ITM CE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("ITM CE Order Failed");
                        }
                    }
                }
                
                /* OTM CE Entry */
                if (cid == btnOTM_CE AND Nz(StaticVarGet(static_OTM_CE_order), 0) == 0)
                {
                    _TRACE("Placing OTM CE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(OTM_offset, "CE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_OTM_CE_order, 1);
                        StaticVarSetText(static_OTM_CE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_OTM_CE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("OTM CE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("OTM CE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("OTM CE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("OTM CE Order Failed");
                        }
                    }
                }
                
                /* ========== CALL OPTION (CE) EXITS ========== */
                
                /* ATM CE Exit */
                if (cid == btnExitATM_CE AND Nz(StaticVarGet(static_ATM_CE_order), 0) == 1)
                {
                    exit_symbol = StaticVarGetText(static_ATM_CE_symbol);
                    exit_exchange = StaticVarGetText(static_ATM_CE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        _TRACE("Placing ATM CE Exit Order");
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_ATM_CE_order, 0);
                            StaticVarSetText(static_ATM_CE_symbol, "");
                            StaticVarSetText(static_ATM_CE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("ATM CE Exit Placed");
                            }
                            _TRACE("ATM CE Exit Success");
                        }
                        else
                        {
                            _TRACE("ATM CE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("ATM CE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("ATM CE Exit Failed - No symbol information");
                    }
                }
                
                /* ITM CE Exit */
                if (cid == btnExitITM_CE AND Nz(StaticVarGet(static_ITM_CE_order), 0) == 1)
                {
                    _TRACE("Placing ITM CE Exit Order using PlaceSmartOrder");
                    
                    exit_symbol = StaticVarGetText(static_ITM_CE_symbol);
                    exit_exchange = StaticVarGetText(static_ITM_CE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_ITM_CE_order, 0);
                            StaticVarSetText(static_ITM_CE_symbol, "");
                            StaticVarSetText(static_ITM_CE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("ITM CE Exit Placed");
                            }
                            _TRACE("ITM CE Exit Success");
                        }
                        else
                        {
                            _TRACE("ITM CE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("ITM CE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("ITM CE Exit Failed - No symbol information");
                        if (VoiceAlert == "Enable")
                        {
                            Say("No ITM CE Position Found");
                        }
                    }
                }
                
                /* OTM CE Exit */
                if (cid == btnExitOTM_CE AND Nz(StaticVarGet(static_OTM_CE_order), 0) == 1)
                {
                    _TRACE("Placing OTM CE Exit Order using PlaceSmartOrder");
                    
                    exit_symbol = StaticVarGetText(static_OTM_CE_symbol);
                    exit_exchange = StaticVarGetText(static_OTM_CE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_OTM_CE_order, 0);
                            StaticVarSetText(static_OTM_CE_symbol, "");
                            StaticVarSetText(static_OTM_CE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("OTM CE Exit Placed");
                            }
                            _TRACE("OTM CE Exit Success");
                        }
                        else
                        {
                            _TRACE("OTM CE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("OTM CE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("OTM CE Exit Failed - No symbol information");
                        if (VoiceAlert == "Enable")
                        {
                            Say("No OTM CE Position Found");
                        }
                    }
                }
                
                /* ========== PUT OPTION (PE) ENTRIES ========== */
                
                /* ATM PE Entry */
                if (cid == btnATM_PE AND Nz(StaticVarGet(static_ATM_PE_order), 0) == 0)
                {
                    _TRACE("Placing ATM PE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(ATM_offset, "PE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_ATM_PE_order, 1);
                        StaticVarSetText(static_ATM_PE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_ATM_PE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("ATM PE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("ATM PE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("ATM PE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("ATM PE Order Failed");
                        }
                    }
                }
                
                /* ITM PE Entry */
                if (cid == btnITM_PE AND Nz(StaticVarGet(static_ITM_PE_order), 0) == 0)
                {
                    _TRACE("Placing ITM PE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(ITM_offset, "PE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_ITM_PE_order, 1);
                        StaticVarSetText(static_ITM_PE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_ITM_PE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("ITM PE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("ITM PE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("ITM PE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("ITM PE Order Failed");
                        }
                    }
                }
                
                /* OTM PE Entry */
                if (cid == btnOTM_PE AND Nz(StaticVarGet(static_OTM_PE_order), 0) == 0)
                {
                    _TRACE("Placing OTM PE Entry Order - Mode: " + trade_mode);
                    response = PostOptionOrder(OTM_offset, "PE", trade_mode, quantity, apikey, strategy, underlying, exchange, expiry, pricetype, product, price, trigger_price, host, ver);
                    
                    symbol_resolved = ExtractJsonValue(response, "symbol");
                    exchange_resolved = ExtractJsonValue(response, "exchange");
                    
                    /* Clean up any trailing quotes */
                    symbol_resolved = StrReplace(symbol_resolved, "\"", "");
                    exchange_resolved = StrReplace(exchange_resolved, "\"", "");
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success AND symbol_resolved != "")
                    {
                        StaticVarSet(static_OTM_PE_order, 1);
                        StaticVarSetText(static_OTM_PE_symbol, symbol_resolved, True);
                        StaticVarSetText(static_OTM_PE_exchange, exchange_resolved, True);
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("OTM PE " + trade_mode + " Order Placed");
                        }
                        _TRACEF("OTM PE Order Success: %s on %s", symbol_resolved, exchange_resolved);
                    }
                    else
                    {
                        _TRACE("OTM PE Order Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("OTM PE Order Failed");
                        }
                    }
                }
                
                /* ========== PUT OPTION (PE) EXITS ========== */
                
                /* ATM PE Exit */
                if (cid == btnExitATM_PE AND Nz(StaticVarGet(static_ATM_PE_order), 0) == 1)
                {
                    _TRACE("Placing ATM PE Exit Order using PlaceSmartOrder");
                    
                    exit_symbol = StaticVarGetText(static_ATM_PE_symbol);
                    exit_exchange = StaticVarGetText(static_ATM_PE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_ATM_PE_order, 0);
                            StaticVarSetText(static_ATM_PE_symbol, "");
                            StaticVarSetText(static_ATM_PE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("ATM PE Exit Placed");
                            }
                            _TRACE("ATM PE Exit Success");
                        }
                        else
                        {
                            _TRACE("ATM PE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("ATM PE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("ATM PE Exit Failed - No symbol information");
                        if (VoiceAlert == "Enable")
                        {
                            Say("No ATM PE Position Found");
                        }
                    }
                }
                
                /* ITM PE Exit */
                if (cid == btnExitITM_PE AND Nz(StaticVarGet(static_ITM_PE_order), 0) == 1)
                {
                    _TRACE("Placing ITM PE Exit Order using PlaceSmartOrder");
                    
                    exit_symbol = StaticVarGetText(static_ITM_PE_symbol);
                    exit_exchange = StaticVarGetText(static_ITM_PE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_ITM_PE_order, 0);
                            StaticVarSetText(static_ITM_PE_symbol, "");
                            StaticVarSetText(static_ITM_PE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("ITM PE Exit Placed");
                            }
                            _TRACE("ITM PE Exit Success");
                        }
                        else
                        {
                            _TRACE("ITM PE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("ITM PE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("ITM PE Exit Failed - No symbol information");
                        if (VoiceAlert == "Enable")
                        {
                            Say("No ITM PE Position Found");
                        }
                    }
                }
                
                /* OTM PE Exit */
                if (cid == btnExitOTM_PE AND Nz(StaticVarGet(static_OTM_PE_order), 0) == 1)
                {
                    _TRACE("Placing OTM PE Exit Order using PlaceSmartOrder");
                    
                    exit_symbol = StaticVarGetText(static_OTM_PE_symbol);
                    exit_exchange = StaticVarGetText(static_OTM_PE_exchange);
                    
                    if (exit_symbol != "" AND exit_exchange != "")
                    {
                        response = ExitPosition(exit_symbol, exit_exchange, product, apikey, strategy, host, ver);
                        
                        has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                        
                        if (has_success)
                        {
                            StaticVarSet(static_OTM_PE_order, 0);
                            StaticVarSetText(static_OTM_PE_symbol, "");
                            StaticVarSetText(static_OTM_PE_exchange, "");
                            
                            if (VoiceAlert == "Enable")
                            {
                                Say("OTM PE Exit Placed");
                            }
                            _TRACE("OTM PE Exit Success");
                        }
                        else
                        {
                            _TRACE("OTM PE Exit Failed");
                            if (VoiceAlert == "Enable")
                            {
                                Say("OTM PE Exit Failed");
                            }
                        }
                    }
                    else
                    {
                        _TRACE("OTM PE Exit Failed - No symbol information");
                        if (VoiceAlert == "Enable")
                        {
                            Say("No OTM PE Position Found");
                        }
                    }
                }
                
                /* ========== CLOSE ALL POSITIONS ========== */
                
                if (cid == btnCloseAll)
                {
                    _TRACE("Closing All Positions");
                    response = CloseAllPositions(apikey, strategy, host, ver);
                    
                    has_success = StrFind(response, "\"status\":\"success\"") >= 0;
                    
                    if (has_success)
                    {
                        /* Reset all CE order tracking */
                        StaticVarSet(static_ATM_CE_order, 0);
                        StaticVarSet(static_ITM_CE_order, 0);
                        StaticVarSet(static_OTM_CE_order, 0);
                        
                        StaticVarSetText(static_ATM_CE_symbol, "");
                        StaticVarSetText(static_ITM_CE_symbol, "");
                        StaticVarSetText(static_OTM_CE_symbol, "");
                        
                        StaticVarSetText(static_ATM_CE_exchange, "");
                        StaticVarSetText(static_ITM_CE_exchange, "");
                        StaticVarSetText(static_OTM_CE_exchange, "");
                        
                        /* Reset all PE order tracking */
                        StaticVarSet(static_ATM_PE_order, 0);
                        StaticVarSet(static_ITM_PE_order, 0);
                        StaticVarSet(static_OTM_PE_order, 0);
                        
                        StaticVarSetText(static_ATM_PE_symbol, "");
                        StaticVarSetText(static_ITM_PE_symbol, "");
                        StaticVarSetText(static_OTM_PE_symbol, "");
                        
                        StaticVarSetText(static_ATM_PE_exchange, "");
                        StaticVarSetText(static_ITM_PE_exchange, "");
                        StaticVarSetText(static_OTM_PE_exchange, "");
                        
                        if (VoiceAlert == "Enable")
                        {
                            Say("All Positions Closed");
                        }
                        _TRACE("Close All Success");
                    }
                    else
                    {
                        _TRACE("Close All Failed");
                        if (VoiceAlert == "Enable")
                        {
                            Say("Close All Failed");
                        }
                    }
                }
            }
        }
    }
    
    /* --------------------------------------------------------------------------
       Chart Display
       -------------------------------------------------------------------------- */
    
    SetChartOptions(0, chartShowArrows | chartShowDates);
    Plot(Close, "Close", colorDefault, styleNoTitle | ParamStyle("Style") | GetPriceStyle());
    
    _N(Title = StrFormat("{{NAME}} - {{INTERVAL}} {{DATE}} Open %g, Hi %g, Lo %g, Close %g (%.1f%%) {{VALUES}}", 
        O, H, L, C, SelectedValue(ROC(C, 1))));
}

_SECTION_END();

```

### VB Script Module (Legacy Method)



```cpp
//Rajandran R - Creator of OpenAlgo
//website - openalgo.in / marketcalls.in
//OpenAlgo - Amibroker Options Button Trading Module v1.0
//Date - 20/08/2024



_SECTION_BEGIN("OpenAlgo Options Button Trading");

RequestTimedRefresh(1,False);

EnableTextOutput(False);

SetOption("StaticVarAutoSave", 30 );


apikey = ParamStr("OpenAlgo API Key", "******");

strategy = ParamStr("Strategy Name", "Test Strategy");

spot = Paramlist("Spot Symbol","NIFTY|BANKNIFTY|FINNIFTY|SENSEX|CRUDEOILM");  //OpenAlgo Underlying Symbol - used for Formulation of OpenAlgo Option Symbols
expiry = ParamStr("Expiry Date","17JUL25");

exchange = ParamList("Exchange","NFO|BFO|MCX",0); 
Symbol = ParamStr("Underlying Symbol(Data Vendor Symbol)","NIFTY"); // Amibroker Symbol - Data Vendors Symbol
iInterval= Param("Strike Interval",50,1,10000,1);
StrikeCalculation = Paramlist("Strike Calculation","PREVOPEN|PREVCLOSE|TODAYSOPEN",0);
LotSize = Param("Lot Size",65,1,10000,1);

ATMoffsetCE = Param("ATM CE Offset",0,-40,40,1);
ITMoffsetCE = Param("ITM CE Offset",-2,-40,-1,1);
OTMoffsetCE = Param("OTM CE Offset",4,1,40,1);

ATMoffsetPE = Param("ATM PE Offset",0,-40,40,1);
ITMoffsetPE = Param("ITM PE Offset",-2,-40,-1,1);
OTMoffsetPE = Param("OTM PE Offset",4,1,40,1);

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


EnableAlgo = ParamList("AlgoStatus","Disable|Enable",0);


bridgeurl = host+"/api/"+ver;
resp = "";


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

if(StrikeCalculation=="PREVOPEN")
{
SetForeign(Symbol);
spotC = LastValue(Ref(OPEN,-1));
RestorePriceArrays();
}

if(StrikeCalculation=="PREVCLOSE")
{
SetForeign(Symbol);
spotC = LastValue(Ref(Close,-1));
RestorePriceArrays();
}

if(StrikeCalculation=="TODAYSOPEN")
{
SetForeign(Symbol);
spotC = LastValue(TimeFrameGetPrice("O",inDaily));
RestorePriceArrays();
}

//Maintain Array to Store ATM Strikes for each and every bar
strike = IIf(spotC % iInterval > iInterval/2, spotC - (spotC%iInterval) + iInterval,
			spotC - (spotC%iInterval));
			
//ATM/ITM/OTM Entry/Exit Strikes	
		
ATMstrikeCE = strike + (ATMoffsetCE * iInterval);
ATMstrikePE = strike - (ATMoffsetPE * iInterval);

ITMstrikeCE = strike + (ITMoffsetCE * iInterval);
ITMstrikePE = strike - (ITMoffsetPE * iInterval);

OTMstrikeCE = strike + (OTMoffsetCE * iInterval);
OTMstrikePE = strike - (OTMoffsetPE * iInterval);

//ATM/ITM/OTM OpenAlgoSymbol Format

ATMsymbolCE = spot+expiry+ATMstrikeCE+"CE";
ATMsymbolPE = spot+expiry+ATMstrikePE+"PE";

ITMsymbolCE = spot+expiry+ITMstrikeCE+"CE";
ITMsymbolPE = spot+expiry+ITMstrikePE+"PE";

OTMsymbolCE = spot+expiry+OTMstrikeCE+"CE";
OTMsymbolPE = spot+expiry+OTMstrikePE+"PE";


printf("\nATMsymbolCE = "+ATMsymbolCE);
printf("\nATMsymbolPE = "+ATMsymbolPE);

printf("\nITMsymbolCE = "+ITMsymbolCE);
printf("\nITMsymbolPE = "+ITMsymbolPE);

printf("\nOTMsymbolCE = "+OTMsymbolCE);
printf("\nOTMsymbolPE = "+OTMsymbolPE);

printf("\n ------Internal Memory-------");
printf("\n ATMsymbolCE is : " + StaticVarGetText(static_name_+"ATMsymbolCE"));
printf("\n ITMsymbolCE is : " + StaticVarGetText(static_name_+"ITMsymbolCE"));
printf("\n OTMsymbolCE is : " + StaticVarGetText(static_name_+"OTMsymbolCE"));

printf("\n ATMsymbolPE is : " + StaticVarGetText(static_name_+"ATMsymbolPE"));
printf("\n ITMsymbolPE is : " + StaticVarGetText(static_name_+"ITMsymbolPE"));
printf("\n OTMsymbolPE is : " + StaticVarGetText(static_name_+"OTMsymbolPE"));




_SECTION_BEGIN("OpenAlgo Bridge Controls");

EnableScript("VBScript"); 
<%
Public Sub PlaceOrder(symbol,action, quantity)
	
    Dim oXMLHTTP
    Dim oStream
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    ' Define variables with the specified values
    Dim apikey, strategy , exchange, pricetype, product
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
    
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


Public Sub ExitOrder(symbol)
    Dim oXMLHTTP
    Dim oStream
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    ' Define variables with the specified values
    Dim apikey, strategy , exchange, pricetype, product
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
    
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
    """,""action"":""" & "SELL" & _
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



Public Sub SquareoffAll()
    Dim oXMLHTTP
    Dim oStream
    Set oXMLHTTP = CreateObject("Msxml2.XMLHTTP")
    ' Define variables with the specified values
    Dim apikey, strategy
    apikey = AFL.Var("apikey")
    strategy = AFL.Var("strategy")
      
    
    ' Construct the JSON string for the POST message
    Dim jsonRequestBody
    jsonRequestBody = "{""apikey"":""" & apikey & _
    """,""strategy"":""" & strategy & """}"
    
    ' Set the URL
    Dim url
    url = AFL.Var("bridgeurl")&"/closeposition"
    
    ' Configure the HTTP request for POST method
    oXMLHTTP.Open "POST", url, False
    oXMLHTTP.setRequestHeader "Content-Type", "application/json"
    oXMLHTTP.setRequestHeader "Cache-Control", "no-cache"
    oXMLHTTP.setRequestHeader "Pragma", "no-cache"
    
    ' Send the request with the JSON body
    oXMLHTTP.Send jsonRequestBody
    
    api_parameters = "Strategy :" & strategy & " api_url :" & url

    
    AFL("sq_api_request") = api_parameters  
    AFL("sq_api_response") = oXMLHTTP.responseText
    
    
    ' Optionally, handle the response here
    ' Dim response
    ' response = oXMLHTTP.responseText
    ' Response handling code...
End Sub


%>


openalgo = GetScriptObject();




_SECTION_BEGIN("Button Trading -  For Old Amibroker Versions");

X0 = 20;
Y0 = 100;
X1 = 60;

X2 = 20;
Y2 = 240;
X3 = 60;

LBClick = GetCursorMouseButtons() == 9;	// Click
MouseX  = Nz(GetCursorXPosition(1));		// 
MouseY  = Nz(GetCursorYPosition(1));		//

procedure DrawButton (Text, x1, y1, x2, y2, colorFrom, colorTo)
{
	GfxSetOverlayMode(0);
	GfxSelectFont("Verdana", 9, 700);
	GfxSetBkMode(1);
	GfxGradientRect(x1, y1, x2, y2, colorFrom, colorTo);
	GfxDrawText(Text, x1, y1, x2, y2, 32|1|4|16);
}
GfxSetTextColor(colorWhite);

if(EnableAlgo == "Enable")
{  

	DrawButton("ATM CE", X0, Y0, X0+X1+50, Y0+50, colorGreen, colorGreen);
	CursorInATMCEButton = MouseX >= X0 AND MouseX <= X0+X1+50 AND MouseY >= Y0 AND MouseY <= Y0+50;
	ATMCEButtonClick = CursorInATMCEButton AND LBClick;
	
	DrawButton("ITM CE", X0+115, Y0, X0+X1+165, Y0+50, colorRed, colorRed);
	CursorInITMCEButton = MouseX >= X0+115 AND MouseX <= X0+X1+165 AND MouseY >= Y0 AND MouseY <= Y0+50;
	ITMCEButtonClick = CursorInITMCEButton AND LBClick;
	
	DrawButton("OTM CE", X0+230, Y0, X0+X1+280, Y0+50, colorBlue, colorBlue);
	CursorInOTMCEButton = MouseX >= X0+230 AND MouseX <= X0+X1+280 AND MouseY >= Y0 AND MouseY <= Y0+50;
	OTMCEButtonClick = CursorInOTMCEButton AND LBClick;
	
	DrawButton("x ATM CE", X0, Y0+55, X0+X1+50, Y0+105, colorGreen, colorGreen);
	xCursorInATMCEButton = MouseX >= X0 AND MouseX <= X0+X1+50 AND MouseY >= Y0+55 AND MouseY <= Y0+105;
	xATMCEButtonClick = xCursorInATMCEButton AND LBClick;
	
	DrawButton("x ITM CE", X0+115, Y0+55, X0+X1+165, Y0+105, colorRed, colorRed);
	xCursorInITMCEButton = MouseX >= X0+115 AND MouseX <= X0+X1+165 AND MouseY >= Y0+55 AND MouseY <= Y0+105;
	xITMCEButtonClick = xCursorInITMCEButton AND LBClick;
	
	DrawButton("x OTM CE", X0+230, Y0+55, X0+X1+280, Y0+105, colorBlue, colorBlue);
	xCursorInOTMCEButton = MouseX >= X0+230 AND MouseX <= X0+X1+280 AND MouseY >= Y0+55 AND MouseY <= Y0+105;
	xOTMCEButtonClick = xCursorInOTMCEButton AND LBClick;
	
	
	DrawButton("ATM PE", X2, Y2, X2+X3+50, Y2+50, colorGreen, colorGreen);
	CursorInATMPEButton = MouseX >= X2 AND MouseX <= X2+X3+50 AND MouseY >= Y2 AND MouseY <= Y2+50;
	ATMPEButtonClick = CursorInATMPEButton AND LBClick;
	
	DrawButton("ITM PE", X2+115, Y2, X2+X3+165, Y2+50, colorRed, colorRed);
	CursorInITMPEButton = MouseX >= X2+115 AND MouseX <= X2+X3+165 AND MouseY >= Y2 AND MouseY <= Y2+50;
	ITMPEButtonClick = CursorInITMPEButton AND LBClick;
	
	DrawButton("OTM PE", X2+230, Y2, X2+X3+280, Y2+50, colorBlue, colorBlue);
	CursorInOTMPEButton = MouseX >= X2+230 AND MouseX <= X2+X3+280 AND MouseY >= Y2 AND MouseY <= Y2+50;
	OTMPEButtonClick = CursorInOTMPEButton AND LBClick;
	
	DrawButton("x ATM PE", X2, Y2+55, X2+X3+50, Y2+105, colorGreen, colorGreen);
	xCursorInATMPEButton = MouseX >= X2 AND MouseX <= X2+X3+50 AND MouseY >= Y2+55 AND MouseY <= Y2+105;
	xATMPEButtonClick = xCursorInATMPEButton AND LBClick;
	
	DrawButton("x ITM PE", X2+115, Y2+55, X2+X3+165, Y2+105, colorRed, colorRed);
	xCursorInITMPEButton = MouseX >= X2+115 AND MouseX <= X2+X3+165 AND MouseY >= Y2+55 AND MouseY <= Y2+105;
	xITMPEButtonClick = xCursorInITMPEButton AND LBClick;
	
	DrawButton("x OTM PE", X2+230, Y2+55, X2+X3+280, Y2+105, colorBlue, colorBlue);
	xCursorInOTMPEButton = MouseX >= X2+230 AND MouseX <= X2+X3+280 AND MouseY >= Y2+55 AND MouseY <= Y2+105;
	xOTMPEButtonClick = xCursorInOTMPEButton AND LBClick;
	
	
	DrawButton("CLOSE ALL", X0, Y0+270, X0+X1+65, Y0+320, colorRed, colorRed);
	CursorInCXButton = MouseX >= X0 AND MouseX <= X0+X1+65 AND MouseY >= Y0+270 AND MouseY <= Y0+320;
	CXButtonClick = CursorInCXButton AND LBClick;
	
	
	
	// Logic for all buttons
	// ATM CE entry and exit logic
	if (ATMCEButtonClick AND StaticVarGet(static_name_ + "ATMCEAlgo") == 0) {
		_TRACE("Placing ATM CE Entry Order");
		openalgo.placeorder(ATMsymbolCE, tradetype, quantity);
		StaticVarSetText(static_name_+"ATMsymbolCE",ATMsymbolCE,True);
		if (VoiceAlert == "Enable") { Say("ATM CE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "ATMCEAlgo", 1);
	} else { StaticVarSet(static_name_ + "ATMCEAlgo", 0); }

	if (xATMCEButtonClick AND StaticVarGet(static_name_ + "xATMCEAlgo") == 0) {
		_TRACE("Placing ATM CE Exit Order");
		exitsymbol = StaticVarGetText(static_name_+"ATMsymbolCE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"ATMsymbolCE","");
		if (VoiceAlert == "Enable") { Say("Exit ATM CE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xATMCEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xATMCEAlgo", 0); }

	// ITM CE entry and exit logic
	if (ITMCEButtonClick AND StaticVarGet(static_name_ + "ITMCEAlgo") == 0) {
		_TRACE("Placing ITM CE Entry Order");
		openalgo.placeorder(ITMsymbolCE, tradetype, quantity);
		StaticVarSetText(static_name_+"ITMsymbolCE",ITMsymbolCE,True);
		if (VoiceAlert == "Enable") { Say("ITM CE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "ITMCEAlgo", 1);
	} else { StaticVarSet(static_name_ + "ITMCEAlgo", 0); }

	if (xITMCEButtonClick AND StaticVarGet(static_name_ + "xITMCEAlgo") == 0) {
		_TRACE("Placing ITM CE Exit Order");
		exitsymbol = StaticVarGetText(static_name_+"ITMsymbolCE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"ITMsymbolCE","");
		if (VoiceAlert == "Enable") { Say("Exit ITM CE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xITMCEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xITMCEAlgo", 0); }

	// OTM CE entry and exit logic
	if (OTMCEButtonClick AND StaticVarGet(static_name_ + "OTMCEAlgo") == 0) {
		_TRACE("Placing OTM CE Entry Order");
		openalgo.placeorder(OTMsymbolCE, tradetype, quantity);
		StaticVarSetText(static_name_+"OTMsymbolCE",OTMsymbolCE,True);
		if (VoiceAlert == "Enable") { Say("OTM CE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "OTMCEAlgo", 1);
	} else { StaticVarSet(static_name_ + "OTMCEAlgo", 0); }

	if (xOTMCEButtonClick AND StaticVarGet(static_name_ + "xOTMCEAlgo") == 0) {
		_TRACE("Placing OTM CE Exit Order");
		exitsymbol = StaticVarGetText(static_name_+"OTMsymbolCE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"OTMsymbolCE","");
		if (VoiceAlert == "Enable") { Say("Exit OTM CE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xOTMCEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xOTMCEAlgo", 0); }

	// ATM PE entry and exit logic
	if (ATMPEButtonClick AND StaticVarGet(static_name_ + "ATMPEAlgo") == 0) {
		_TRACE("Placing ATM PE Entry Order");
		openalgo.placeorder(ATMsymbolPE, tradetype, quantity);
		StaticVarSetText(static_name_+"ATMsymbolPE",ATMsymbolPE,True);
		if (VoiceAlert == "Enable") { Say("ATM PE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "ATMPEAlgo", 1);
	} else { StaticVarSet(static_name_ + "ATMPEAlgo", 0); }

	if (xATMPEButtonClick AND StaticVarGet(static_name_ + "xATMPEAlgo") == 0) {
		_TRACE("Placing ATM PE Exit Order");
		exitsymbol = StaticVarGetText(static_name_+"ATMsymbolPE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"ATMsymbolPE","");
		if (VoiceAlert == "Enable") { Say("Exit ATM PE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xATMPEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xATMPEAlgo", 0); }

	// ITM PE entry and exit logic
	if (ITMPEButtonClick AND StaticVarGet(static_name_ + "ITMPEAlgo") == 0) {
		_TRACE("Placing ITM PE Entry Order");
		openalgo.placeorder(ITMsymbolPE, tradetype, quantity);
		StaticVarSetText(static_name_+"ITMsymbolPE",ITMsymbolPE,True);
		if (VoiceAlert == "Enable") { Say("ITM PE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "ITMPEAlgo", 1);

	} else { StaticVarSet(static_name_ + "ITMPEAlgo", 0); }

	if (xITMPEButtonClick AND StaticVarGet(static_name_ + "xITMPEAlgo") == 0) {
		_TRACE("Placing ITM PE Exit Order");
				exitsymbol = StaticVarGetText(static_name_+"ITMsymbolPE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"ITMsymbolPE","");
		if (VoiceAlert == "Enable") { Say("Exit ITM PE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xITMPEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xITMPEAlgo", 0); }

	// OTM PE entry and exit logic
	if (OTMPEButtonClick AND StaticVarGet(static_name_ + "OTMPEAlgo") == 0) {
		_TRACE("Placing OTM PE Entry Order");
		openalgo.placeorder(OTMsymbolPE, tradetype, quantity);
		StaticVarSetText(static_name_+"OTMsymbolPE",OTMsymbolPE,True);
		if (VoiceAlert == "Enable") { Say("OTM PE Order Triggered"); }
		_TRACE("API Request : " + api_request);
		_TRACE("API Response : " + api_response);
		StaticVarSet(static_name_ + "OTMPEAlgo", 1);
	} else { StaticVarSet(static_name_ + "OTMPEAlgo", 0); }

	if (xOTMPEButtonClick AND StaticVarGet(static_name_ + "xOTMPEAlgo") == 0) {
		_TRACE("Placing OTM PE Exit Order");
		exitsymbol = StaticVarGetText(static_name_+"OTMsymbolPE");
		if(exitsymbol!="")
		{
		openalgo.exitorder(exitsymbol);
		StaticVarSetText(static_name_+"OTMsymbolPE","");
		if (VoiceAlert == "Enable") { Say("Exit OTM PE Order Triggered"); }
		_TRACE("API Request : " + ex_api_request);
		_TRACE("API Response : " + ex_api_response);
		StaticVarSet(static_name_ + "xOTMPEAlgo", 1);
		}
		else
		{
		Say("No Open Orders to Exit");
		_TRACE("No Open Orders to Exit");
		}
	} else { StaticVarSet(static_name_ + "xOTMPEAlgo", 0); }


	
	
	if( CXButtonClick AND StaticVarGet(Name()+GetChartID()+"CXAlgo")==0 ) 
	{
		openalgo.Squareoffall();
		if(VoiceAlert == "Enable"){
				Say("Squareoff All Triggered");  	
			}
		_TRACE("API Request : "+sq_api_request);
		_TRACE("API Response : "+sq_api_response);
		StaticVarSet(Name()+GetChartID()+"CXAlgo",1); 
	}
	else
	{
		StaticVarSet(Name()+GetChartID()+"CXAlgo",0);
	}
	
	
}

_SECTION_END();


_SECTION_BEGIN("Candlestick Charts with Date & Time Axis");

//Enable the Date & Time Axis
SetChartOptions(0, chartShowArrows | chartShowDates);

//Plotting Candlestick charts
Plot(Close,"Candle",colorDefault,styleCandle);


_SECTION_END();

```

