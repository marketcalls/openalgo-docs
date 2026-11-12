# CRUDEOIL Futures: MACD Crossover

MACD is the gap between a 12-bar and a 26-bar EMA, and its signal line is a 9-bar EMA of that gap. A crossover of the two shows momentum turning, and MACD above or below zero shows the trend. Commodity traders use it on MCX crude oil in the evening session, when the international market is most active. This version trades crossovers in the direction of the trend, long and short: futures can be sold short intraday (MIS) and overnight (NRML).

## Rules

* **Instrument:** CRUDEOIL futures on MCX (the November 2026 contract), 5-minute bars, MIS (intraday).
* **Indicator:** MACD (12, 26, 9) from `openalgo.ta`.
* **Long:** buy one lot (100 barrels) when MACD crosses above its signal line while MACD is above zero.
* **Short:** sell one lot short when MACD crosses below its signal line while MACD is below zero.
* **Exit:** the opposite crossover, or the square-off 20 minutes before the session closes (MCX closes at 23:30 or 23:55, depending on the season).
* **Session:** new trades from 17:00, and none in the last 30 minutes.

## Code

The example tests CRUDEOIL19NOV26FUT, the November 2026 contract, from 1 October to 11 November 2026. MCX contracts are not in the engine's reference tables yet, so the code reads the contract's terms from the master contract on your OpenAlgo server with `client.symbol` and passes them with `instrument=`. For this contract it returns lot size 100, tick size 1.0 and expiry 19-NOV-26. `underlying="CRUDEOIL"` tells the engine which commodity it is, so it can charge the non-agricultural commodity rates; without it the run stops with a `CostError`. The meaning of `lotsize` on MCX differs by broker: the engine needs units (100 for one CRUDEOIL lot), so if your server shows 1, write `lot_size=100`. Everything else is the engine's default: Zerodha charges, the default slippage and a margin of 20 percent of the contract value.

<!-- requires-server -->
```python
import datetime as dt

import openalgo.backtest as bt
from openalgo import api, ta
from openalgo.backtest.reference import Instrument

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")

# The November 2026 contract and its terms from the master contract on your server.
contract = "CRUDEOIL19NOV26FUT"
info = client.symbol(symbol=contract, exchange="MCX")["data"]
crude = Instrument(
    symbol=contract, exchange="MCX", kind="future", underlying="CRUDEOIL",
    lot_size=info["lotsize"],  # units in one lot: 100 barrels
    tick_size=info["tick_size"],  # Rs 1
    expiry=dt.datetime.strptime(info["expiry"], "%d-%b-%y").date(),  # "19-NOV-26"
)


class CrudeOilMacd(bt.Strategy):
    symbol, exchange, interval = contract, "MCX", "5m"
    entry_from = "17:00"  # new trades in the evening session only
    longs, shorts = True, True  # trade both ways

    def init(self):
        self.macd, self.signal, _ = self.I(ta.macd, self.close, 12, 26, 9)

    def on_bar(self, bar):
        if self.macd.crossed_above(self.signal):  # momentum turns up
            self.exit()  # close a short, if any
            if self.longs and self.macd[-1] > 0:  # and the trend is up: buy one lot
                self.buy(lots=1)
        elif self.macd.crossed_below(self.signal):  # momentum turns down
            self.exit()  # close a long, if any
            if self.shorts and self.macd[-1] < 0:  # and the trend is down: sell short
                self.sell(lots=1)


result = bt.backtest(
    CrudeOilMacd, client, start="2026-10-01", end="2026-11-11", capital=300_000, instrument=crude
)

m = result.metrics
print(f"Net profit    Rs {m['net_profit']:,.2f} after Rs {m['total_costs']:,.2f} of charges")
print(f"Trades        {m['trades']}, win rate {m['win_rate']:.0%}")
print(f"Max drawdown  {m['max_drawdown']:.2%}")
trades = result.trades[["entry_time", "direction", "entry_price_rupees", "exit_price_rupees", "exit_reason", "net_pnl_rupees"]]
print(trades.head(5).round({"net_pnl_rupees": 2}).to_string(index=False))
```

## Output

CRUDEOIL19NOV26FUT expires on 19 November 2026. After that your broker no longer serves its history, so switch to the current contract and its dates (see Try this).

<!-- output -->
```text
Net profit    Rs 34,383.92 after Rs 14,018.08 of charges
Trades        70, win rate 37%
Max drawdown  -12.91%
               entry_time direction  entry_price_rupees  exit_price_rupees exit_reason  net_pnl_rupees
2026-10-01 17:25:00+05:30     short              8675.0             8651.0      signal         2203.77
2026-10-05 18:20:00+05:30     short              8594.0             8561.0      signal         3105.20
2026-10-05 19:25:00+05:30     short              8537.0             8564.0      signal        -2894.09
2026-10-06 17:10:00+05:30     short              8371.0             8369.0      signal            8.89
2026-10-06 21:00:00+05:30      long              8455.0             8571.0      signal        11405.98
```

Most exits are `signal`, the opposite crossover; `scheduler` is the square-off at the end of the session. The strategy made money with a win rate of 37 percent because its average win was more than twice its average loss.

## Try this

* Long only: `longs, shorts = True, False`. Short only: `longs, shorts = False, True`.
* Trade the whole day: delete the `entry_from` line.
* After 19 November 2026: the current contract and dates inside its life, for example `contract = "CRUDEOIL18DEC26FUT"` with `start="2026-11-01"` and `end` the last session before the day you run it; `client.symbol` reads its terms.

[Futures](../futures.md) explains how the engine handles contracts, and [Instruments and Reference Data](../support-functions/reference-data.md) describes `Instrument`.
