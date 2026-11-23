# Intraday Rolling Straddles

### **Overview**

This sample strategy implements an **intraday rolling short straddle** for NIFTY index options using OpenAlgo Python APIs. The bot sells an at-the-money (ATM) NIFTY straddle at a configurable time, then automatically rolls (closes and reopens a new straddle) whenever the NIFTY spot moves ±0.4% from the last entry reference, up to a user-defined daily limit. All open positions are force-closed (squared off) at a specified time before market close.

***

### **Key Features**

* **Instrument:** NIFTY Index Options (customizable)
* **Fixed Expiry:** All option orders use the expiry you set (e.g., `19JUN25`)
* **Entry:** Places the first ATM straddle at a configurable time (e.g., 10:00 a.m.)
* **Rolling Trigger:** Monitors the NIFTY spot price; rolls to a new ATM straddle on every 0.4% move from the last reference point
* **Order Limit:** Limits the number of rolling straddles per day (default: 3, can be changed)
* **Exit:** Squares off all open legs at a configurable EOD time (e.g., 3:15 p.m.)
* **All times in IST** (Asia/Kolkata timezone)
* **No database or persistent logs**: actions are printed to the console for full transparency
* **Parameter-based configuration:** Change any key value by simply editing the variable at the top of the script

### **Python Strategy**

The script below builds the option symbol by hand from the base, expiry and strike, which keeps the example self-contained. In production prefer `client.optionsymbol(underlying=..., exchange=..., expiry_date=..., offset="ATM", option_type="CE")` to resolve the exact symbol and lot size from the OpenAlgo master contract, or place the legs directly with `client.optionsorder(...)` or `client.optionsmultiorder(...)`, which resolve the strike from an offset such as `ATM` for you. See the [OptionsOrder](README.md#optionsorder-example) and [OptionSymbol](README.md#optionsymbol-example) examples.

```python
import time as systime
from datetime import datetime, time as dtime
from apscheduler.schedulers.background import BackgroundScheduler
from openalgo import api
import pytz

print("OpenAlgo Python Bot is running.")

# === USER PARAMETERS ===

STRADDLE_ENTRY_HOUR = 10      # 10 for 10:00 AM
STRADDLE_ENTRY_MINUTE = 0     # 0 for 10:00 AM

SQUAREOFF_HOUR = 15           # 15 for 3:15 PM
SQUAREOFF_MINUTE = 15         # 15 for 3:15 PM

MAX_STRADDLES_PER_DAY = 3     # Daily limit on rolling straddles
ROLLING_THRESHOLD_PCT = 0.4   # Threshold for rolling (in percent, e.g. 0.4 means 0.4%)

LOT_SIZE = 65
STRATEGY = "rolling_straddle"
SYMBOL = "NIFTY"
EXPIRY = "19JUN25"
EXCHANGE = "NSE_INDEX"
OPTION_EXCHANGE = "NFO"
STRIKE_INTERVAL = 50

API_KEY = "YOU-OPENALGO-APIKEY"
API_HOST = "http://127.0.0.1:5000"

client = api(api_key=API_KEY, host=API_HOST)

def get_atm_strike(spot):
    return int(round(spot / STRIKE_INTERVAL) * STRIKE_INTERVAL)

def get_spot():
    quote = client.quotes(symbol=SYMBOL, exchange=EXCHANGE)
    print("Quote:", quote)
    data = quote['data']
    if isinstance(data, list):
        data = data[0]
    return data['ltp']

def get_option_symbol(base, expiry, strike, opttype):
    return f"{base}{expiry}{strike}{opttype}"

# --- State ---
last_reference_spot = None
current_leg_symbols = []
straddle_entry_count = 0

def reset_daily_counter():
    global straddle_entry_count
    straddle_entry_count = 0
    print(f"Daily straddle entry counter reset to zero at {datetime.now()}")

def place_straddle():
    global last_reference_spot, current_leg_symbols, straddle_entry_count
    if straddle_entry_count >= MAX_STRADDLES_PER_DAY:
        print(f"Straddle entry limit ({MAX_STRADDLES_PER_DAY}) reached for today.")
        return
    spot = get_spot()
    atm_strike = get_atm_strike(spot)
    ce = get_option_symbol(SYMBOL, EXPIRY, atm_strike, "CE")
    pe = get_option_symbol(SYMBOL, EXPIRY, atm_strike, "PE")
    for sym in [ce, pe]:
        order = client.placeorder(
            strategy=STRATEGY, symbol=sym, action="SELL",
            exchange=OPTION_EXCHANGE, price_type="MARKET",
            product="MIS", quantity=LOT_SIZE
        )
        print(f"Order placed for {sym}: {order}")
    last_reference_spot = spot
    current_leg_symbols = [ce, pe]
    straddle_entry_count += 1
    print(f"Straddle Entry Count updated: {straddle_entry_count}")

def close_straddle():
    for sym in current_leg_symbols:
        order = client.placeorder(
            strategy=STRATEGY, symbol=sym, action="BUY",
            exchange=OPTION_EXCHANGE, price_type="MARKET",
            product="MIS", quantity=LOT_SIZE
        )
        print(f"Order EXIT for {sym}: {order}")

def rolling_monitor():
    global last_reference_spot
    spot = get_spot()
    print(f"Spot: {spot}")
    print(f"Last Reference Spot: {last_reference_spot}")
    threshold = last_reference_spot * (ROLLING_THRESHOLD_PCT / 100.0)
    if abs(spot - last_reference_spot) >= threshold:
        print(f"Rolling: Spot moved {spot} from ref {last_reference_spot} (Threshold: {threshold})")
        close_straddle()
        place_straddle()

def eod_exit():
    print("EOD exit triggered.")
    close_straddle()

# === Scheduler ===
scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
scheduler.add_job(reset_daily_counter, 'cron', day_of_week='mon-fri', hour=STRADDLE_ENTRY_HOUR, minute=STRADDLE_ENTRY_MINUTE)
scheduler.add_job(place_straddle, 'cron', day_of_week='mon-fri', hour=STRADDLE_ENTRY_HOUR, minute=STRADDLE_ENTRY_MINUTE)
scheduler.add_job(eod_exit, 'cron', day_of_week='mon-fri', hour=SQUAREOFF_HOUR, minute=SQUAREOFF_MINUTE)
scheduler.start()

try:
    while True:
        now = datetime.now(pytz.timezone("Asia/Kolkata")).time()
        entry_start = dtime(STRADDLE_ENTRY_HOUR, STRADDLE_ENTRY_MINUTE)
        squareoff_time = dtime(SQUAREOFF_HOUR, SQUAREOFF_MINUTE)
        # Rolling monitor runs during straddle session only
        if entry_start < now < squareoff_time and last_reference_spot:
            rolling_monitor()
        systime.sleep(5)
except (KeyboardInterrupt, SystemExit):
    scheduler.shutdown()

```

***

### **Parameters (Edit at Top of Script)**

| Variable                | Purpose                                           | Example     |
| ----------------------- | ------------------------------------------------- | ----------- |
| `STRADDLE_ENTRY_HOUR`   | Hour to enter first straddle (24h format)         | `10`        |
| `STRADDLE_ENTRY_MINUTE` | Minute to enter first straddle                    | `0`         |
| `SQUAREOFF_HOUR`        | Hour to force square-off all legs                 | `15`        |
| `SQUAREOFF_MINUTE`      | Minute to force square-off all legs               | `15`        |
| `MAX_STRADDLES_PER_DAY` | Max straddles allowed per day                     | `3`         |
| `EXPIRY`                | Expiry date for all option legs (OpenAlgo format) | `"19JUN25"` |
| `LOT_SIZE`              | Number of options per leg (NIFTY = 65 as of 2026) | `65`        |

***

### **Order Format**

All orders use the OpenAlgo symbol format:

* **Call Example:** `NIFTY19JUN2522350CE`
* **Put Example:** `NIFTY19JUN2522350PE`

Orders are placed as:

* **Type:** `MARKET`
* **Action:** `SELL` (entry), `BUY` (exit)
* **Product:** `MIS`
* **Exchange:** `NFO`

***

### **How the Strategy Works**

1. **Start & First Entry:**\
   At your configured entry time (e.g., 10:00 a.m.), the bot sells 1 lot of ATM NIFTY CE and PE for the expiry you set.
2. **Rolling Logic:**\
   Every 5 seconds, the bot checks the latest NIFTY spot. If the spot moves up or down by at least 0.4% from the last entry reference, the bot:
   * Closes both legs of the current straddle
   * Sells a new ATM CE and PE (same expiry, current ATM)
3. **Daily Straddle Limit:**\
   The bot never enters more straddles than the daily limit you set. (Default: 3 per day)
4. **End-of-Day Squareoff:**\
   At your configured squareoff time (e.g., 3:15 p.m.), any open straddle is closed, and no further trades are placed for the day.
5. **Console Logging:**\
   All quotes, trades, entries, exits, and reference changes are clearly printed in real time.

***

### **Usage**

* Edit the parameters at the top of the script as needed (no need for .env or environment variables).
* Run the script. Ensure your OpenAlgo API is running and accessible.
* All actions and errors will be displayed in your terminal or console.

***

### **Limitations and Notes**

* This sample does **not** use persistent order logging or database.
* No explicit risk management or stop loss (can be added if desired).
* Only supports one instrument/expiry at a time.
* Ensure your OpenAlgo symbol format and expiry match your broker's contract details.

***

***
