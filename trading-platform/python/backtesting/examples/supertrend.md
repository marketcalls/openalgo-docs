# Supertrend

Supertrend is a line drawn a set distance away from the price: below the price in an uptrend, above it in a downtrend. The distance is a multiple of the ATR (average true range: how far the price moves in a typical day). The line flips to the other side when the price closes through it. Trend followers use it to stay in a move for as long as it lasts and to step out when it turns; the line works like a trailing stop that widens when the stock gets more volatile.

The code runs on your OpenAlgo server: put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY` in the `client = ...` line.

## Rules

* **Entry:** buy when Supertrend (10-day ATR, multiplier 3) shows an uptrend.
* **Exit:** sell when it turns to a downtrend.
* **Stop-loss:** none apart from the flip. A stop-loss is an exit that limits the loss of a trade; here the flip of the line plays that part.
* **Size:** all the capital (Rs 1,00,000 at the start).
* **Product:** CNC (delivery: the shares are held overnight, for as long as the trade lasts), long only (it buys, and never sells short).
* **Data:** SBIN (NSE) daily bars from January 2021 to 11 November 2026. A bar is one period of prices, here one trading day, with its open, high, low and close.

## The code

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


class SupertrendFollow(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # "D": daily bars
    period = 10  # days of ATR
    multiplier = 3

    def init(self):
        # ta.supertrend returns two series: the line, and the direction (-1 up, 1 down).
        self.line, self.direction = self.I(ta.supertrend, self.high, self.low, self.close, self.period, self.multiplier)

    def on_bar(self, bar):
        # Runs at the close of every bar, here once a day.
        if len(self.close) < self.period:  # wait until the ATR has enough days
            return
        uptrend = self.direction[-1] < 0  # [-1] is the latest bar; -1 means price above the line
        if self.position.is_flat and uptrend:
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and not uptrend:
            self.exit()  # sell everything at the next day's open


result = bt.backtest(SupertrendFollow, client, start="2021-01-01", end="2026-11-11", capital=100_000)

m = result.metrics
print(f"Net profit   : Rs {m['net_profit']:,.2f}")
print(f"Return       : {m['total_return']:.2%}")
print(f"Max drawdown : {m['max_drawdown']:.2%}")
print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")
trades = result.trades[["entry_time", "exit_time", "entry_price_rupees", "exit_price_rupees", "net_pnl_rupees"]]
print(trades.head().to_string(index=False, float_format="%.2f"))
```

<!-- output -->
```text
Net profit   : Rs 45,036.07
Return       : 45.04%
Max drawdown : -30.26%
Trades       : 23 (48% won)
               entry_time                 exit_time  entry_price_rupees  exit_price_rupees  net_pnl_rupees
2021-02-02 09:15:00+05:30 2021-03-18 09:15:00+05:30              315.10             371.40        17589.14
2021-05-14 09:15:00+05:30 2021-08-20 09:15:00+05:30              370.10             414.90        13924.45
2021-09-16 09:15:00+05:30 2021-11-29 09:15:00+05:30              444.95             469.90         7049.19
2022-01-06 09:15:00+05:30 2022-02-25 09:15:00+05:30              487.80             479.90        -2563.51
2022-03-17 09:15:00+05:30 2022-05-05 09:15:00+05:30              499.10             484.90        -4179.46
```

## Reading it

* `self.position.is_flat` is true while the strategy holds nothing, and `is_long` while it holds shares. Each flip was decided at a session's close and filled at the next session's open (09:15 IST).
* The strategy holds SBIN while the direction is -1. Its winners are the long trends of 2021.
* The max drawdown, the largest fall of the account from its highest value, is about 30 percent: the price of staying in until the line is crossed.

## Try this

* A tighter line that flips sooner: `bt.backtest(..., params={"period": 7, "multiplier": 2})`.
* Another stock: `symbol = "TATASTEEL"`.
* A stop-loss 5 percent below the entry, in case the trend breaks with a gap: `self.buy(stop=bt.pct(5))`.

More: [Writing Strategies](../writing-strategies.md), [Indicators: Trend](../../indicators/trend.md).
