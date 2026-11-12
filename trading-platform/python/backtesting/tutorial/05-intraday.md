# Trade Intraday

So far every trade was held for days or weeks. In this lesson you buy and sell within the same day, on 5-minute bars, with a popular intraday strategy: the opening range breakout. You will learn what MIS and square-off mean, and how to take entries only in the morning.

* **MIS** is the intraday product: a position bought as MIS must be closed the same day. It is the opposite of CNC (delivery), which you held overnight in the earlier lessons.
* **Square-off** is the forced close of every MIS position near the end of the session. Your broker does it if you do not, and so does the engine: for NSE stocks it accepts no new entries from 14:50 and squares off whatever is still open at 15:00 (the times in force since 3 August 2026).

The engine picks MIS by itself when the bars are shorter than a day.

## The strategy

* **Opening range:** the highest high and the lowest low of the first 15 minutes, 09:15 to 09:30: the first three 5-minute bars of the day.
* **Entry:** buy when a 5-minute bar closes above the range high. Only in the morning, before 11:00, and only one trade a day.
* **Stop-loss:** at the range low.
* **Exit:** the stop-loss, or the square-off at 15:00.
* **Data:** SBIN 5-minute bars from 1 August to 11 November 2026, with Rs 1,00,000.

## The code

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`.

<!-- requires-server -->
```python
# Load the backtesting engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class groups the strategy's settings and steps under one name.
class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: the engine trades MIS

    # init runs once, before the first bar. (def starts a method: steps that belong to the class.)
    def init(self):
        self.traded_today = True  # no trade until the first opening range is known

    # on_bar runs at the close of every 5-minute bar.
    def on_bar(self, bar):
        clock = bar.close_time.strftime("%H:%M")  # the time this bar closed, as text such as "09:30"
        if clock == "09:30":  # the first three bars are done: the opening range is known
            self.range_high = max(self.high[-3:])  # highest high of the last 3 bars
            self.range_low = min(self.low[-3:])  # lowest low of the last 3 bars
            self.traded_today = False  # a new day: one trade allowed
        # Times written "HH:MM" compare in clock order: this is 09:35 to 10:55.
        elif "09:30" < clock < "11:00" and not self.traded_today:
            if bar.close > self.range_high:  # the bar closed above the range: a breakout
                self.buy(stop=bar.close - self.range_low)  # stop-loss: the distance down to the range low
                self.traded_today = True


# Run the backtest on SBIN 5-minute bars, 1 August to 11 November 2026, with Rs 1,00,000.
result = bt.backtest(OpeningRangeBreakout, client, start="2026-08-01", end="2026-11-11", capital=100_000)

# Print the summary. f"..." is an f-string: the values in braces are filled in.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
```

<!-- output -->
```text
Net profit   : Rs -4,648.41
Return       : -4.65%
Max drawdown : -11.18%
Trades       : 27 (41% won)
```

## Line by line

* `interval = "5m"` asks for 5-minute bars. Because they are intraday bars of a stock, the engine trades MIS and squares off at 15:00 without being told.
* `bar.close_time` is the time the bar closed. `.strftime("%H:%M")` turns it into text such as `"09:30"`, which is easy to compare.
* `self.high[-3:]` is the highs of the last three bars (`[-3:]` means "the last three"), and `max(...)` picks the largest.
* `self.traded_today` is a note the strategy keeps for itself: `True` once it has traded today, so it trades at most once a day.
* `stop=` takes a distance from the buying price, so `bar.close - self.range_low` puts the stop about at the range low.

## What happened

* The strategy bought on the 27 mornings SBIN broke above its opening range, and lost Rs 4,648.41 over these three months. 8 trades were sold at the stop-loss and 19 at the 15:00 square-off; 41 percent of them made money.
* A losing result is still a useful one: you learned it without risking money. The next lesson tries the other side of the range.
* Each order was decided at a bar's close and filled at the next bar's open, with intraday charges and slippage.
* When your OpenAlgo server has 1-minute bars for the whole period, the engine checks the stop on them, so a stop is hit at the minute the price reaches it.

## More options

* Let the engine enforce the morning window instead of the code: add `entry_until = "11:00"` to the class; an entry after it is rejected.
* An earlier square-off: `bt.backtest(..., square_off="14:30")`. See [Intraday entry window and square-off](../orders-and-risk.md#intraday-entry-window-and-square-off).
* A target twice the size of the range: add `target=2 * (self.range_high - self.range_low)` to `self.buy(...)`.
* Another stock: `symbol = "RELIANCE"`; 15-minute bars: `interval = "15m"`.
* The full strategy, long and short: [Opening Range Breakout](../examples/opening-range-breakout.md).

## What you learned

* Intraday bars (`"5m"`) make the engine trade MIS, which accepts no new entries from 14:50 and squares off everything at 15:00.
* `bar.close_time` tells you the time of day, so you can trade only in a part of the session.
* A strategy keeps its own notes in `self`, such as the range and whether it has traded today.

## Next lesson

[Go Short](06-going-short.md): sell first and buy back later, to gain when the price falls.
