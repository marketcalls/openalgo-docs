# Opening Range Breakout

The opening range is the high and low of the first minutes of the session. A break above it often starts the day's move up, and a break below it the move down. Intraday traders take the first break, in either direction, with the stop at the other side of the range, and are out before the close.

## Rules

* **Range:** the high and low of the first 15 minutes (09:15 to 09:30 IST, three 5-minute bars).
* **Entry:** buy when a 5-minute bar closes above the range high; sell short when one closes below the range low. One trade a day.
* **Stop:** at the other side of the range.
* **Exit:** the stop, or the engine's square-off at 15:00.
* **Size:** all the capital (Rs 1,00,000), no leverage.
* **Product:** MIS (intraday), long and short, on SBIN (NSE) 5-minute bars from 1 August to 11 November 2026.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: MIS by default
    longs = True  # buy a breakout above the range
    shorts = True  # sell short a breakdown below the range

    def init(self):
        self.traded_today = True  # no trade until the first opening range is known

    def on_bar(self, bar):
        clock = bar.time.strftime("%H:%M")  # the IST time this 5-minute bar opened
        if clock == "09:25":  # the third bar closes at 09:30: the range is complete
            self.range_high = max(self.high[-3:])
            self.range_low = min(self.low[-3:])
            self.traded_today = False
        elif clock > "09:25" and self.position.is_flat and not self.traded_today:
            if self.longs and bar.close > self.range_high:
                self.buy(stop=bar.close - self.range_low)  # stop near the range low
                self.traded_today = True
            elif self.shorts and bar.close < self.range_low:
                self.sell(stop=self.range_high - bar.close)  # stop near the range high
                self.traded_today = True


result = bt.backtest(OpeningRangeBreakout, client, start="2026-08-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "direction", "entry_price_rupees", "exit_price_rupees", "exit_reason"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

```text
Net profit   : Rs -5,207.41
Return       : -5.21%
Max drawdown : -10.79%
Trades       : 62 (45% won)
               entry_time direction  entry_price_rupees  exit_price_rupees exit_reason
2026-08-03 09:40:00+05:30      long             1040.45            1037.05   scheduler
2026-08-04 13:00:00+05:30     short             1033.25            1035.15   scheduler
2026-08-05 09:35:00+05:30      long             1047.55            1052.15   scheduler
2026-08-06 09:40:00+05:30      long             1063.85            1085.65   scheduler
2026-08-07 09:35:00+05:30      long             1087.15            1098.05   scheduler
```

The stop is a distance in rupees from the entry, so the code passes the gap between the breakout close and the other side of the range. `exit_reason` says how each trade ended: `leg_sl` is the stop and `scheduler` the engine's 15:00 square-off. The engine applied the NSE intraday defaults by itself: no new entries after 14:50 (a later breakout order is rejected with the reject code `entry_window`, which `result.orders` lists), everything squared off at 15:00, intraday charges and slippage. With 1-minute history available for the whole run, it tested the stops on 1-minute bars, so a stop is hit at the minute it is reached.

## Try this

* Long only: `bt.backtest(..., params={"shorts": False})`.
* Short only: `bt.backtest(..., params={"longs": False})`.
* A target twice the range: add `target=2 * (self.range_high - self.range_low)` to `buy` and `sell`.
* Another stock: `symbol = "RELIANCE"`.

More: [Orders and Risk](../orders-and-risk.md#intraday-entry-window-and-square-off), [Data](../data.md#which-bars-stops-are-tested-on).
