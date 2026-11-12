# Opening Range Breakout

The opening range is the high and low of the first minutes of the trading session. A break above it often starts the day's move up, and a break below it the move down. Intraday traders take the first break, in either direction, with the stop-loss at the other side of the range, and are out before the close.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Range:** the high and low of the first 15 minutes (09:15 to 09:30 IST): three 5-minute bars. A bar is one period of prices, here 5 minutes, with its open, high, low and close.
* **Entry:** buy when a 5-minute bar closes above the range high. Sell short (sell first, buy back later, to gain from a fall) when one closes below the range low. One trade a day.
* **Stop-loss:** at the other side of the range. A stop-loss is an exit that limits the loss of a trade.
* **Exit:** the stop-loss, or the engine's square-off (the forced close of intraday positions) at 15:00.
* **Size:** all the capital (Rs 1,00,000), no leverage.
* **Product:** MIS (intraday: every position is closed before the session ends), long and short.
* **Data:** SBIN (NSE) 5-minute bars from 1 August to 11 November 2026.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: MIS by default
    longs = True  # buy a breakout above the range
    shorts = True  # sell short a breakdown below the range

    def init(self):
        self.traded_today = True  # no trade until the first opening range is known

    def on_bar(self, bar):
        # Runs at the close of every 5-minute bar.
        clock = bar.time.strftime("%H:%M")  # the IST time this 5-minute bar opened
        if clock == "09:25":  # the third bar closes at 09:30: the range is complete
            self.range_high = max(self.high[-3:])  # the highest high of the last three bars
            self.range_low = min(self.low[-3:])  # the lowest low of the last three bars
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

<!-- output -->
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

## Reading it

* The stop is a distance in rupees from the entry price, so the code passes the gap between the breakout close and the other side of the range.
* `self.position.is_flat` is true while the strategy holds nothing. Each order was decided at a bar's close and filled at the next bar's open.
* `exit_reason` says how each trade ended: `leg_sl` is the stop-loss and `scheduler` the engine's 15:00 square-off.
* The engine applied the NSE intraday rules by itself: no new entries after 14:50 (a later breakout order is rejected with the reject code `entry_window`, and `result.warnings` says how many were), everything squared off at 15:00, intraday charges and slippage (the small amount every fill loses to the market).
* With 1-minute history available for the whole run, the engine tested the stops on 1-minute bars, so a stop is hit at the minute it is reached.
* The max drawdown is the largest fall of the account from its highest value.

## Try this

* Long only: `bt.backtest(..., params={"shorts": False})`.
* Short only: `bt.backtest(..., params={"longs": False})`.
* A target twice the range: add `target=2 * (self.range_high - self.range_low)` to `buy` and `sell`. A target closes the trade once the price has moved that far in your favour.
* Another stock: `symbol = "RELIANCE"`.

More: [Orders and Risk](../orders-and-risk.md#intraday-entry-window-and-square-off), [Data](../data.md#which-bars-stops-are-tested-on).
