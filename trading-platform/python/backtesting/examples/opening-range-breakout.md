# Opening Range Breakout

The opening range is the high and low of the first 15 minutes of the session. A break above it often starts the day's move up, and a break below it the move down. Intraday traders take the first break either way, with the stop-loss at the other side of the range, and are out before the close.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Range:** the high and low of the first three 5-minute bars, 09:15 to 09:30. A bar is one period of prices, here 5 minutes.
* **Entry:** buy when a bar closes above the range; sell short (sell first, buy back later, to gain from a fall) when one closes below it. One trade a day.
* **Exit:** the stop-loss (an exit that limits a trade's loss) at the other side of the range, or the square-off (the forced close of intraday positions): at 15:10 until 31 July 2026, at 15:00 from 3 August 2026.
* **Size:** all the capital, Rs 1,00,000, no leverage.
* **Product:** MIS (intraday: every position is closed before the session ends), long and short.
* **Data:** SBIN (NSE) 5-minute bars from 1 November 2025 to 11 November 2026, a year of sessions.

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

    # init runs before the first bar.
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


# Run the backtest from 1 November 2025 to 11 November 2026 with Rs 1,00,000.
result = bt.backtest(OpeningRangeBreakout, client, start="2025-11-01", end="2026-11-11", capital=100_000)

# Print the summary.
print(result.summary())  # net profit, return, drawdown and trades

# How the trades ended: the number of trades for each exit reason.
# trade_list() is the table of closed trades, one row each.
print(result.trade_list()["exit_reason"].value_counts().to_string())
```

<!-- output -->
```text
Net profit   : Rs -37,526.74
Return       : -37.53%
Max drawdown : -38.51%
Trades       : 241 (38% won)
Overfitting  : quick checks: 3 not judged, 1 informational; see result.robustness()
exit_reason
scheduler    165
leg_sl        76
```

`exit_reason` says how a trade ended: 76 hit the stop-loss (`leg_sl`) and 165 were closed by the square-off (`scheduler`). The engine applied the NSE intraday rules by itself, intraday charges and slippage included. Its times follow the date: no new entry from 15:00 and square-off at 15:10 until 31 July 2026, then 14:50 and 15:00 from 3 August 2026, when NSE changed them. The max drawdown is the largest fall of the account from its highest value.

Over the year the strategy lost Rs 37,526.74: about Rs 19,700 on the trades themselves and Rs 17,820 in charges, because it trades almost every day with all the capital. It lost money in every month but August 2026. Run on August to November 2026 alone, it loses about 5 percent, which looks like a small setback; the year shows a breakout taken every day, either way, does not pay its intraday costs on SBIN. That is why a test needs a long stretch of data: a few months cannot show how a strategy does through a year.

The Overfitting line judges nothing here: its checks need a run that made money, and the trade reshuffle only reports ([Overfitting checks](../results-and-reports.md#overfitting-checks)).

## Try this

* Long only: `bt.backtest(..., params={"shorts": False})`. Short only: `params={"longs": False}`.
* A target twice the range: add `target=2 * (self.range_high - self.range_low)` to `buy` and `sell`. A target closes the trade once the price has moved that far in your favour.
* Another stock: `symbol = "RELIANCE"`.

More: [Orders and Risk](../orders-and-risk.md#when-is-an-intraday-position-closed), [Data](../data.md#which-bars-stops-are-tested-on).
