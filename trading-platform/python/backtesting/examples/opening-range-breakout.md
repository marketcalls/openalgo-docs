# Opening Range Breakout

An intraday strategy: mark the high and low of the first 15 minutes, buy when a 5-minute bar closes above that range, sell short when one closes below it. Each trade has a stop one range-width away and a target two range-widths away, and anything still open is squared off at the exchange default. At most one trade per day.

The run is MIS (intraday), on 1-minute data, so the stop and target are tested on every minute and the square-off happens at the dated NSE default: for October 2026, entries stop at 14:50 and positions are squared off at 15:00.

## The complete example

The data step builds synthetic 1-minute bars for every NSE session in October 2026: days that trend up, days that trend down, all with a swing. The version that loads real bars from OpenAlgo is further down.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt

# Data: synthetic 1-minute bars, 09:15 to 15:29 IST, for every NSE session in October 2026.
frames = []
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-10-01", "2026-10-30")
for day, session in enumerate(sessions.itertuples()):
    minute = np.arange(375)
    trend = (-1) ** day * (2 + day % 3) * np.minimum(minute, 200) / 100
    swing = 1.5 * np.sin(minute / 9 + day)
    close = (500 + day + trend + swing).round(1)
    open_ = np.r_[close[0] - 0.4, close[:-1]]
    opens_at = pd.Timestamp(session.open, tz="UTC").tz_convert("Asia/Kolkata")
    frames.append(
        pd.DataFrame(
            {
                "open": open_,
                "high": np.maximum(open_, close) + 0.3,
                "low": np.minimum(open_, close) - 0.3,
                "close": close,
                "volume": 1_000,
            },
            index=opens_at + pd.to_timedelta(minute, unit="min"),
        )
    )
bars = pd.concat(frames)


class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "RELIANCE", "NSE", "5m"
    range_bars = 3  # three 5-minute bars: 09:15 to 09:30
    quantity = 100

    def init(self):
        self.day = None

    def on_bar(self, bar):
        if bar.time.date() != self.day:  # the first bar of a new session
            self.day, self.bars_today, self.traded = bar.time.date(), 0, False
        self.bars_today += 1
        if self.bars_today == self.range_bars:
            self.range_high = max(self.high[-self.range_bars:])
            self.range_low = min(self.low[-self.range_bars:])
            return
        if self.bars_today < self.range_bars or self.traded or not self.position.is_flat:
            return
        width = self.range_high - self.range_low
        exits = {"stop": bt.points(width), "target": bt.points(2 * width)}
        if bar.close > self.range_high:
            self.buy(qty=self.quantity, **exits)
            self.traded = True
        elif bar.close < self.range_low:
            self.sell(qty=self.quantity, **exits)
            self.traded = True


result = bt.backtest(OpeningRangeBreakout, data=bars, capital=500_000)

a = result.assumptions
print("product", a["product"], "| entries until", a["entry_until"], "| square-off", a["square_off"])
m = result.metrics
print(f"Net profit     Rs {m['net_profit']:,.2f} after Rs {m['total_costs']:,.2f} of charges")
print(f"Trades         {m['trades']}, win rate {m['win_rate']:.0%}, profit factor {m['profit_factor']:.2f}")
print(f"Average win    Rs {m['average_win']:,.2f}   average loss Rs {m['average_loss']:,.2f}")
print(f"Max drawdown   {m['max_drawdown']:.2%}")
print(result.trades["exit_reason"].value_counts().to_string())
print(result.trades[["entry_time", "direction", "entry_price_rupees", "exit_price_rupees", "exit_reason"]].head(4).to_string(index=False))
```

<!-- output -->
```text
product MIS | entries until 14:50 | square-off 15:00
Net profit     Rs 438.33 after Rs 1,083.21 of charges
Trades         20, win rate 65%, profit factor 1.25
Average win    Rs 173.45   average loss Rs -257.58
Max drawdown   -0.18%
exit_reason
leg_target    7
leg_sl        7
scheduler     6
               entry_time direction  entry_price_rupees  exit_price_rupees exit_reason
2026-10-01 10:20:00+05:30      long              502.55             504.55   scheduler
2026-10-05 09:35:00+05:30     short              500.35             497.25  leg_target
2026-10-06 09:35:00+05:30     short              501.35             503.50      leg_sl
2026-10-07 10:00:00+05:30      long              503.75             501.00      leg_sl
```

What to look at:

* **Exit reasons.** `leg_target` and `leg_sl` are the engine-held target and stop; `scheduler` is the 15:00 square-off of trades that reached neither.
* **Entry times.** A breakout decided at the 09:30 close (the bar from 09:30 to 09:35) fills at the 09:35 open of the 1-minute data.
* **Charges.** Intraday equity pays Zerodha's 0.03 percent or Rs 20 per order, STT on the sell side and the other charges: about Rs 54 per round trip here, which takes most of the gross profit. Try `costs=None` to see how much a cost-free backtest would have overstated it.

## Variations

* Change the defaults: `bt.backtest(..., entry_until="13:00", square_off="14:30")`, or set them as class attributes.
* Add a daily loss limit: `max_daily_loss=2_000` closes everything and blocks entries for the rest of the day once the day's loss reaches Rs 2,000.
* Trail the stop once the trade works: `trail=bt.trail_points(width)` with the stop.
* Size by risk instead of a fixed quantity: `size=bt.size.fixed_risk(0.5)` with the stop risks 0.5 percent of equity per trade.

## With data from OpenAlgo

Use your server's 1-minute history for the base bars; the engine builds the 5-minute strategy bars from it. Broker history for 1-minute bars is usually short, so download a longer range into Historify first and use `source="db"` for it.

<!-- requires-server -->
```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
result = bt.backtest(
    OpeningRangeBreakout, client, start="2026-08-03", end="2026-10-30", capital=500_000, source="db"
)
print(result.assumptions["base_rule"])
print(result.warnings)
```

Check `base_rule` in the Assumptions: it says whether 1-minute data covered the whole run (stops tested on 1-minute ranges) or the engine fell back to 5-minute bars.
