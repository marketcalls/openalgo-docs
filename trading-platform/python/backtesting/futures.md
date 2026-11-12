# Futures

A futures strategy names the **underlying** it trades, such as NIFTY, never a contract. The engine picks the contract, rolls the position to the next contract before expiry, charges both legs of every roll, marks the position to market every day, and gives your indicators one continuous price series across the rolls. You test a futures idea the way you trade it: "long NIFTY futures while above the 10-day average", not "long NIFTY29SEP26FUT, then NIFTY27OCT26FUT, then ...".

## Declaring a futures strategy

| Class attribute | Meaning |
|---|---|
| `underlying` | The underlying, such as `"NIFTY"`, with a derivatives `exchange` (`"NFO"`, `"BFO"`, `"MCX"`, `"CDS"` or `"BCD"`) |
| `symbols` | Several underlyings instead, such as `("HDFCBANK", "ICICIBANK")` on NFO. Every name must be an underlying; mixing underlyings and contract symbols is not built yet |
| `expiry` | The contract rank: `"current_month"` (the default, the nearest monthly contract) or `"next_month"` (the second nearest) |

The contracts come from `instrument=` when you pass them (an `Instrument` for each contract, with its expiry and last trading day), or else from the [reference tables](support-functions/reference-data.md): the monthly expiry schedule with each contract's real last trading day, and each contract's lot size by its own expiry, tick size and freeze quantity. With your own data, pass the bars as a dict keyed by contract symbol.

Inside the strategy everything is addressed by the underlying: `self.close` is the continuous series, `self.position` and `self.positions["NIFTY"]` the position whatever contract holds it, and `self.instrument()` the contract traded at that moment. Orders are placed in lots or units as usual (`self.buy(lots=1)`).

## The roll

`bt.backtest(roll=1)` is the default: a position rolls to the next contract **one session before** the expiring contract's last trading day, at that session's first open. `roll=N` rolls N sessions before, `roll=0` on the last trading day itself.

* The near leg is closed first, then the next contract is bought (or sold). Both legs are fills with the reason `roll`, and both are charged and pay slippage.
* The trade is split at the roll: the expiring contract's trade ends with exit reason `roll` and a new trade starts on the next contract.
* The stop, target, trail, breakeven and the best price seen so far move by the **spread** between the two contracts' opens, so the levels keep the same distance to the market. A level the expiring contract had already crossed at its open exits there instead of rolling.
* On a CNC or NRML position the GTT orders that hold those levels are cancelled on the expiring contract and placed again on the next one.
* A roll is not a loss for the daily loss limit: it does not end a run.

`roll=None` holds the position to expiry instead: it is settled at the close of the last trading day (fill reason `expiry`, flagged `filled_at_last_close`, not charged), and the strategy trades the next contract from the next session. The `"next_month"` rank is never held to its own expiry, so it needs `roll=N`.

## The series your strategy reads

`on_bar`, every series view (`self.close`, `self.high`, ...) and every `self.I` indicator read **one back-adjusted series per underlying**: the contract traded at each bar, with all earlier bars moved by the spread at every roll, so the series does not jump at a roll and the current contract's prices are exact. The adjustment is as known at each decision: a strategy deciding on 24 September sees the history adjusted by the rolls up to then, never by a later one, and the look-ahead checks of the indicators run the same way, point in time. Volume is not adjusted.

The `bar` passed to `on_bar` is the traded contract's own bar, so the prices you log or act on are real prices.

## Mark to market and settlement

A futures position is marked to market at every session close, as the exchange does. `result.settlements` has one row per futures position per session: the `date`, the `symbol`, the units held after the close, the settlement price, `last_close_used` (True when the data has no settlement price, so the last close stands in), the day's cash flow `amount_rupees`, and `kind`, `"daily"` or `"expiry"` for a contract settled on its last trading day. The postings add up to the gross P&L of the positions.

`result.rolls` has one row per switch of a series from one contract to the next: the `time`, `from_symbol`, `to_symbol`, the `spread_rupees` that back-adjusts the series, and `rolls_positions` (False with `roll=None`, where positions are settled instead).

## Margin and tick size

* **Margin** comes from the dated table on [Costs, Slippage and Margin](costs-slippage-and-margin.md#margin): NSE index and stock futures, BSE BANKEX and 30 MCX commodities, each a percent of the value. These rows are one day's observation of a broker's public margin page, marked unverified, so a run that uses one names it in `result.warnings`. An instrument with no row (SENSEX and SENSEX50 futures today) stops the run before any data is loaded.
* **Tick size.** Some NFO and BFO contracts take their tick from a price slab, fixed each month by a reference close (an index future's by the index close on the previous month's last trading day). The engine reads that close from the run's own data: the underlying's bars when the source has them (with your own data, the index's bars under its name, such as `data["NIFTY"]`), otherwise the contract's own close that day. The Assumptions line of each contract says which close set its tick. It still asks for `instrument=` when the data has neither.

## Example

Three synthetic NIFTY futures, September to November 2026, priced at a small premium to a synthetic index that decays to expiry. The strategy is long while the close is above its 10-day average, with a 3 percent stop, which on these NRML positions is held as a GTT order.

```python
import numpy as np
import pandas as pd

import openalgo.backtest as bt
from openalgo import ta

# A synthetic NIFTY index on every NSE session from August to early November 2026.
sessions = bt.calendar.default_calendar().sessions("NSE", "2026-08-03", "2026-11-06")
days = pd.DatetimeIndex(sessions["date"]).tz_localize("Asia/Kolkata")
k = np.arange(len(days))
index_close = (25_000 + 8 * k + 300 * np.sin(k / 7)).round(1)

# Each contract trades at a premium to the index that shrinks to zero at its expiry.
data = {"NIFTY": pd.DataFrame(
    {"open": index_close, "high": index_close + 60, "low": index_close - 60, "close": index_close, "volume": 0.0},
    index=days,
)}
for symbol, expiry in {"NIFTY29SEP26FUT": "2026-09-29", "NIFTY27OCT26FUT": "2026-10-27",
                       "NIFTY23NOV26FUT": "2026-11-23"}.items():
    days_left = (pd.Timestamp(expiry).tz_localize("Asia/Kolkata") - days).days.to_numpy()
    price = (index_close * (1 + 0.00015 * days_left)).round(1)
    bars = pd.DataFrame(
        {"open": price - 10, "high": price + 70, "low": price - 70, "close": price, "volume": 100_000.0},
        index=days,
    )
    data[symbol] = bars[days_left >= 0]


class TrendFutures(bt.Strategy):
    underlying, exchange, interval = "NIFTY", "NFO", "D"  # expiry: the current month

    def init(self):
        self.mean = self.I(ta.sma, self.close, 10)

    def on_bar(self, bar):
        if len(self.close) < 10:
            return
        if self.position.is_flat and self.close[-1] > self.mean[-1]:
            self.buy(lots=1, stop=bt.pct(3))
        elif self.position.is_long and self.close[-1] < self.mean[-1]:
            self.exit()


result = bt.backtest(TrendFutures, data=data, capital=500_000, start="2026-09-01", end="2026-11-06")

print(result.assumptions["instruments"].split("; ")[0])
print(result.fills[["time", "symbol", "side", "quantity_units", "price_rupees", "reason"]].to_string(index=False))
print(result.rolls[["time", "from_symbol", "to_symbol", "spread_rupees"]].to_string(index=False))
print(result.positions[["time", "symbol", "quantity_units", "stop_rupees"]].to_string(index=False))
```

<!-- output -->
```text
NIFTY29SEP26FUT: lot 65, tick 0.1 by the price slab of the NIFTY close on 2026-08-31 (25244.2), freeze 1800, from the reference tables
                     time          symbol side  quantity_units  price_rupees reason
2026-09-24 09:15:00+05:30 NIFTY29SEP26FUT  BUY            65.0       25052.9  entry
2026-09-28 09:15:00+05:30 NIFTY29SEP26FUT SELL            65.0       25109.8   roll
2026-09-28 09:15:00+05:30 NIFTY27OCT26FUT  BUY            65.0       25215.5   roll
2026-10-26 09:15:00+05:30 NIFTY27OCT26FUT SELL            65.0       25737.4   roll
2026-10-26 09:15:00+05:30 NIFTY23NOV26FUT  BUY            65.0       25841.8   roll
2026-10-29 09:15:00+05:30 NIFTY23NOV26FUT SELL            65.0       25792.3 signal
                     time     from_symbol       to_symbol  spread_rupees
2026-09-28 09:15:00+05:30 NIFTY29SEP26FUT NIFTY27OCT26FUT          105.5
2026-10-26 09:15:00+05:30 NIFTY27OCT26FUT NIFTY23NOV26FUT          104.2
                     time          symbol  quantity_units  stop_rupees
2026-09-24 09:15:00+05:30 NIFTY29SEP26FUT            65.0      24301.3
2026-09-28 09:15:00+05:30 NIFTY29SEP26FUT             0.0          NaN
2026-09-28 09:15:00+05:30 NIFTY27OCT26FUT            65.0      24406.8
2026-10-26 09:15:00+05:30 NIFTY27OCT26FUT             0.0          NaN
2026-10-26 09:15:00+05:30 NIFTY23NOV26FUT            65.0      24511.0
2026-10-29 09:15:00+05:30 NIFTY23NOV26FUT             0.0          NaN
```

What happened:

* The contracts came from the reference tables: lot 65, and a tick of 0.1 set by the NIFTY close on 31 August (from `data["NIFTY"]`).
* The position opened on 24 September in the September contract and rolled on 28 September, the session before the 29 September expiry, and again on 26 October; each roll is a pair of fills with the reason `roll`.
* The stop moved by each roll's spread (24,301.30, then 24,406.80, then 24,511.00), so it kept the same distance below the market across each roll.

<!-- continues -->
```python
print(result.trades[["symbol", "exit_reason", "gross_pnl_rupees", "net_pnl_rupees"]].round(2).to_string(index=False))
settled = result.settlements
print(settled[["date", "symbol", "quantity_units", "price_rupees", "amount_rupees", "kind"]].head(4).to_string(index=False))
print("postings", round(settled["amount_rupees"].sum(), 2), "= gross P&L", result.gross_pnl["total"])
print(result.warnings[0][:60])
```

<!-- output -->
```text
         symbol exit_reason  gross_pnl_rupees  net_pnl_rupees
NIFTY29SEP26FUT        roll            3698.5         2728.41
NIFTY27OCT26FUT        roll           33923.5        32931.63
NIFTY23NOV26FUT      signal           -3217.5        -4212.98
      date          symbol  quantity_units  price_rupees  amount_rupees  kind
2026-09-24 NIFTY29SEP26FUT            65.0       25062.8          643.5 daily
2026-09-25 NIFTY29SEP26FUT            65.0       25092.7         1943.5 daily
2026-09-28 NIFTY29SEP26FUT             0.0       25119.9         1111.5 daily
2026-09-28 NIFTY27OCT26FUT            65.0       25225.4          643.5 daily
postings 34404.5 = gross P&L 34404.5
margin row FUT_NIFTY/1, used from 2026-09-24, is unverified:
```

The last line is the margin warning: the NIFTY futures margin row is an unverified observation. Python also shows a `ReferenceDataWarning` from this run, because the expiry calendar it looks up reaches past the date the reference tables were last checked.

## With data from OpenAlgo

With a client, the engine loads each contract's bars for the sessions it is traded, from Historify when it holds them (expired contracts are only there) or from your broker.

<!-- requires-server -->
```python
from openalgo import api

client = api(api_key="your_api_key_here", host="http://127.0.0.1:5000")
result = bt.backtest(TrendFutures, client, start="2025-01-01", end="2025-12-31", capital=500_000, source="db")
print(result.rolls)
print(result.warnings)
```

## Not available yet

* MCX futures from the reference tables: they do not list MCX monthly contracts yet, so pass each MCX contract with `instrument=`.
* Condition strategies (`entry_when` and the others) on an underlying, and other intervals of a futures series (`self.data["NIFTY", "15m"]`); both raise `NotImplementedError`.
* `symbols` that mix underlyings and contract symbols.
* The margin of SENSEX and SENSEX50 futures (no row in the margin table).
