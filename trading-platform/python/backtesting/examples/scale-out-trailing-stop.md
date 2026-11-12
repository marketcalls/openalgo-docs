# Scale-Out with Two Targets and a Trailing Stop

An intraday trend entry with a layered exit, the way many discretionary traders manage a position:

* enter long when a 5-minute close crosses above its 20-bar EMA, once per day;
* a stop 1 percent below the entry;
* book **half** the position at +1 percent and **30 percent** at +2 percent;
* once the first target fills, move the stop to the entry price (breakeven);
* trail the rest with a stop 1 percent below the best price reached;
* anything left is squared off at 15:00.

All of this is declared on the entry order; the engine manages the levels on every 1-minute bar.

## The complete example

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

# Data: synthetic 1-minute bars for every NSE session in September 2026. Two days in
# three trend up through the day, the third trends down.
frames = []
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-09-01", "2026-09-30")
for day, session in enumerate(sessions.itertuples()):
    minute = np.arange(375)
    direction = 1 if day % 3 else -1
    trend = direction * (6 + 2 * (day % 4)) * np.minimum(minute, 240) / 240
    swing = 2.0 * np.sin(minute / 11 + day)
    close = (400 + 2 * day + trend + swing).round(1)
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


class ScaleOut(bt.Strategy):
    symbol, exchange, interval = "INFY", "NSE", "5m"

    def init(self):
        self.ema = self.I(ta.ema, self.close, 20)
        self.last_entry_day = None

    def on_bar(self, bar):
        if bar.time.date() == self.last_entry_day or not self.position.is_flat:
            return
        if len(self.close) > 20 and self.close.crossed_above(self.ema):
            self.buy(
                qty=300,
                stop=bt.pct(1),
                targets=[(bt.pct(1), 0.5), (bt.pct(2), 0.3)],
                after_first_target="breakeven",
                trail=bt.trail_pct(1),
            )
            self.last_entry_day = bar.time.date()


result = bt.backtest(ScaleOut, data=bars, capital=500_000)

m = result.metrics
print(f"Net profit     Rs {m['net_profit']:,.2f}   trades {m['trades']}   win rate {m['win_rate']:.0%}")
print(f"Average win    Rs {m['average_win']:,.2f}   average loss Rs {m['average_loss']:,.2f}")
print(f"Max drawdown   {m['max_drawdown']:.2%}")
exits = result.fills[result.fills["reason"] != "entry"]
print(exits.groupby("reason")["quantity_units"].agg(["count", "sum"]).to_string())
```

<!-- output -->
```text
Net profit     Rs 6,270.50   trades 20   win rate 65%
Average win    Rs 1,114.21   average loss Rs -1,172.84
Max drawdown   -0.45%
            count     sum
reason
leg_sl         17  2760.0
leg_target     18  2340.0
scheduler       3   900.0
```

## One trade, step by step

The fills and the position history show how the levels moved. Here is the trade of 3 September:

<!-- continues -->
```python
day = result.fills["time"].dt.date.astype(str) == "2026-09-03"
print(result.fills.loc[day, ["time", "side", "quantity_units", "price_rupees", "reason", "target_index"]].to_string(index=False))

levels = result.positions[result.positions["time"].dt.date.astype(str) == "2026-09-03"]
print(levels[["time", "quantity_units", "stop_rupees", "trail_armed"]].head(6).to_string(index=False))
```

<!-- output -->
```text
                     time side  quantity_units  price_rupees     reason  target_index
2026-09-03 10:10:00+05:30  BUY           300.0        407.50      entry           NaN
2026-09-03 11:25:00+05:30 SELL           150.0        411.50 leg_target           0.0
2026-09-03 13:38:00+05:30 SELL            90.0        415.55 leg_target           1.0
2026-09-03 14:13:00+05:30 SELL            60.0        412.15     leg_sl           NaN
                     time  quantity_units  stop_rupees trail_armed
2026-09-03 10:10:00+05:30           300.0       403.45       False
2026-09-03 11:25:00+05:30           150.0       407.55        True
2026-09-03 11:26:00+05:30           150.0       407.65        True
2026-09-03 11:27:00+05:30           150.0       407.75        True
2026-09-03 11:29:00+05:30           150.0       407.85        True
2026-09-03 12:21:00+05:30           150.0       408.15        True
```

Reading it from the top:

1. The entry filled at 407.50 (the 10:10 open plus slippage). The stop sat 1 percent lower, at 403.45, rounded to the tick.
2. At 11:25 the price reached +1 percent. The first target took 150 units, half the position, at 411.50 (its level, 411.60, less slippage). The same move armed the trail, so the stop jumped above the entry price to 407.55 instead of stopping at breakeven, and from then on it followed the best price, 1 percent behind.
3. At 13:38 the second target (+2 percent) took 90 units, 30 percent of the position.
4. At 14:13 the price fell back to the trailing stop, which closed the last 60 units at 412.15.

Rules to remember: target fractions refer to the original position and add up to at most 1; when one bar reaches both the stop and a target, the stop wins; and a stop only ever moves in your favour. On delivery (CNC) or carry-forward (NRML) positions the same rules are held as GTT orders, which fill differently after a gap (see [GTT orders](../orders-and-risk.md#gtt-orders-for-positional-trades)).

## With data from OpenAlgo

<!-- requires-server -->
```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
result = bt.backtest(ScaleOut, client, start="2026-09-01", end="2026-09-30", capital=500_000)
print(result.trades["exit_reason"].value_counts())
```
