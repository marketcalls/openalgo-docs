# Opening Range Breakout

The opening range is the high and low of the first 15 minutes of the session. A break above it often starts the day's move up, and a break below it the move down. Intraday traders take the first break either way, with the stop-loss at the other side of the range, and are out before the close.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Range:** the high and low of the first three 5-minute bars, 09:15 to 09:30. A bar is one period of prices, here 5 minutes.
* **Entry:** buy when a bar closes above the range; sell short (sell first, buy back later, to gain from a fall) when one closes below it. One trade a day.
* **Exit:** the stop-loss (an exit that limits a trade's loss) at the other side of the range, or the square-off (the forced close of intraday positions) at 15:00.
* **Size:** all the capital, Rs 1,00,000, no leverage.
* **Product:** MIS (intraday: every position is closed before the session ends), long and short.
* **Data:** SBIN (NSE) 5-minute bars from 1 August to 11 November 2026.

## The code

<!-- requires-server -->
```python
# Imports: the backtest engine (bt) and the OpenAlgo client (api).
import openalgo.backtest as bt
from openalgo import api

# Connect to your OpenAlgo server: the bars come from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy. A class bundles its settings and its functions (each "def").
class OpeningRangeBreakout(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "5m"  # 5-minute bars: MIS by default
    longs = True  # buy a break above the range
    shorts = True  # sell short a break below the range

    # init runs once, before the first bar.
    def init(self):
        self.traded_today = True  # no trade until the first range is known

    # on_bar runs at the close of every 5-minute bar: decide what to do.
    def on_bar(self, bar):
        clock = bar.time.strftime("%H:%M")  # the time this bar opened, as text such as "09:25"
        if clock == "09:25":  # the third bar closes at 09:30: the range is complete
            self.range_high = max(self.high[-3:])  # the highest high of the last three bars
            self.range_low = min(self.low[-3:])  # the lowest low of the last three bars
            self.traded_today = False
        elif clock > "09:25" and self.position.is_flat and not self.traded_today:
            if self.longs and bar.close > self.range_high:
                self.buy(stop=bar.close - self.range_low)  # stop: this many rupees below, at the range low
                self.traded_today = True
            elif self.shorts and bar.close < self.range_low:
                self.sell(stop=self.range_high - bar.close)  # stop: this many rupees above, at the range high
                self.traded_today = True


# Run the backtest from 1 August to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(OpeningRangeBreakout, client, start="2026-08-01", end="2026-11-11", capital=100_000)

# Print the summary. m is a dict (values looked up by name); f"..." fills in each {value}.
m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")

# How the trades ended: the number of trades for each exit reason.
print(result.trades["exit_reason"].value_counts().to_string())
```

<!-- output -->
```text
Net profit   : Rs -5,207.41
Return       : -5.21%
Max drawdown : -10.79%
Trades       : 62 (45% won)
exit_reason
scheduler    46
leg_sl       16
```

`exit_reason` says how a trade ended: 16 hit the stop-loss (`leg_sl`) and 46 were closed by the 15:00 square-off (`scheduler`). The engine applied the NSE intraday rules by itself: no new entry after 14:50, square-off at 15:00, intraday charges and slippage. The max drawdown is the largest fall of the account from its highest value.

## Try this

* Long only: `bt.backtest(..., params={"shorts": False})`. Short only: `params={"longs": False}`.
* A target twice the range: add `target=2 * (self.range_high - self.range_low)` to `buy` and `sell`. A target closes the trade once the price has moved that far in your favour.
* Another stock: `symbol = "RELIANCE"`.

More: [Orders and Risk](../orders-and-risk.md#when-is-an-intraday-position-closed), [Data](../data.md#which-bars-stops-are-tested-on).
