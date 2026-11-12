# NIFTY Futures: Opening Range Breakout

The opening range breakout marks the high and low of the first 15 minutes and trades the first close outside that range: a close above it is a buy, a close below it a short sale. Intraday traders use it on index futures, where the first minutes of the session often set the direction for the day. Futures can be sold short intraday (MIS) and overnight (NRML), so this strategy takes breakouts both ways.

## Rules

* **Instrument:** NIFTY futures (the November 2026 contract), 5-minute bars, MIS (intraday).
* **Opening range:** the high and low of the first three 5-minute bars, 09:15 to 09:30.
* **Entry:** buy one lot (65 units) when a 5-minute bar closes above the range; sell one lot short when one closes below it. At most one trade a day.
* **Stop and target:** the stop is one range width from the entry, the target two range widths.
* **Exit:** the stop, the target or the 15:10 square-off, whichever comes first.

## Code

Your broker serves history only for contracts still trading, so the example tests NIFTY23NOV26FUT, the November 2026 contract, from 1 October 2026, when it was already the next-month contract and traded actively, to 11 November 2026. The engine applies its defaults without being told: Zerodha charges, the default slippage, the contract's lot and tick size, a margin of 20 percent of the contract value (one lot blocks about Rs 3 lakh, hence the Rs 5 lakh capital) and the MIS rules (no new entries after 15:00, square-off at 15:10).

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class NiftyOpeningRange(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV26FUT", "NFO", "5m"  # the November 2026 contract
    longs, shorts = True, True  # trade breakouts both ways

    def init(self):
        self.day = None

    def on_bar(self, bar):
        if bar.time.date() != self.day:  # the first bar of a new session
            self.day, self.bars_today, self.traded = bar.time.date(), 0, False
        self.bars_today += 1
        if self.bars_today == 3:  # three 5-minute bars: the range from 09:15 to 09:30
            self.range_high, self.range_low = max(self.high[-3:]), min(self.low[-3:])
        if self.bars_today <= 3 or self.traded or not self.position.is_flat:
            return
        width = self.range_high - self.range_low
        if self.longs and bar.close > self.range_high:  # breakout above the range: buy
            self.buy(lots=1, stop=bt.points(width), target=bt.points(2 * width))
            self.traded = True
        elif self.shorts and bar.close < self.range_low:  # breakdown below it: sell short
            self.sell(lots=1, stop=bt.points(width), target=bt.points(2 * width))
            self.traded = True


result = bt.backtest(NiftyOpeningRange, client, start="2026-10-01", end="2026-11-11", capital=500_000)

m = result.metrics
print(f"Net profit    Rs {m['net_profit']:,.2f} after Rs {m['total_costs']:,.2f} of charges")
print(f"Trades        {m['trades']}, win rate {m['win_rate']:.0%}")
print(f"Max drawdown  {m['max_drawdown']:.2%}")
trades = result.trades[["entry_time", "direction", "entry_price_rupees", "exit_price_rupees", "exit_reason", "net_pnl_rupees"]]
print(trades.head(5).round({"net_pnl_rupees": 2}).to_string(index=False))
```

## Output

NIFTY23NOV26FUT expires on 23 November 2026. After that your broker no longer serves its history, so switch to the current contract and its dates (see Try this).

<!-- output -->
```text
Net profit    Rs 76,864.15 after Rs 24,343.55 of charges
Trades        27, win rate 63%
Max drawdown  -3.69%
               entry_time direction  entry_price_rupees  exit_price_rupees exit_reason  net_pnl_rupees
2026-10-01 10:05:00+05:30      long             22800.6            22722.5      leg_sl        -5959.21
2026-10-05 09:35:00+05:30      long             22799.1            22726.0      leg_sl        -5634.33
2026-10-06 09:35:00+05:30      long             22785.2            22875.3  leg_target         4968.64
2026-10-07 09:40:00+05:30     short             22745.9            22790.4      leg_sl        -3775.98
2026-10-08 09:45:00+05:30     short             22604.4            22432.9  leg_target        10269.83
```

`leg_sl` and `leg_target` are the stop and the target, and `scheduler` is the 15:10 square-off. The charges come to about Rs 900 a round trip, most of it the 0.05 percent STT on the sell side.

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trail the stop: add `trail=bt.trail_points(width)` to the `self.buy` and `self.sell` lines.
* After 23 November 2026: the current contract and dates inside its life, for example `"NIFTY29DEC26FUT"` with `start="2026-11-01"` and `end` the last session before the day you run it.

[Futures](../futures.md) explains how the engine handles contracts, and [Orders and Risk](../orders-and-risk.md) covers stops, targets and the square-off.
