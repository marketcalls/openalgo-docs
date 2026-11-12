# Futures

A futures strategy names the **underlying** it trades, such as NIFTY, rather than a contract. The engine picks the contract, rolls the position to the next contract before expiry, charges both legs of every roll, marks the position to market every day, and gives your indicators one continuous price series across the rolls. You test a futures idea the way you trade it: "long NIFTY futures while above the 10-day average", not "long NIFTY29SEP26FUT, then NIFTY27OCT26FUT, then ...".

## Declaring a futures strategy

| Class attribute | Meaning |
|---|---|
| `underlying` | The underlying, such as `"NIFTY"`, with a derivatives `exchange` (`"NFO"`, `"BFO"`, `"MCX"`, `"CDS"` or `"BCD"`) |
| `symbols` | Several underlyings instead, such as `("HDFCBANK", "ICICIBANK")` on NFO. Every name must be an underlying; mixing underlyings and contract symbols is not built yet |
| `expiry` | The contract rank: `"current_month"` (the default, the nearest monthly contract) or `"next_month"` (the second nearest) |

The contracts come from `instrument=` when you pass them (an `Instrument` for each contract, with its expiry and last trading day), or else from the [reference tables](support-functions/reference-data.md): the monthly expiry schedule with each contract's real last trading day, and each contract's lot size by its own expiry, tick size and freeze quantity. With your own data, pass the bars as a dict keyed by contract symbol.

Inside the strategy everything is addressed by the underlying: `self.close` is the continuous series, `self.position` and `self.positions["NIFTY"]` the position whatever contract holds it, and `self.instrument()` the contract traded at that moment. Orders are placed in lots or units as usual (`self.buy(lots=1)`).

To test one contract over its own life instead, name it as `symbol`, like any other instrument: `symbol = "NIFTY23NOV26FUT"`. The engine takes its terms from the reference tables (or from `instrument=`) and marks it to market every day, but never rolls it, so keep the run inside the contract's life. Your broker serves a contract's history from its listing until it expires, about three months for a NIFTY monthly contract, so this is the way to backtest futures on broker history alone. The [futures examples](examples/README.md#futures) work this way.

## The roll

A roll needs the history of the expiring contract. Brokers stop serving a contract's history once it expires, so a backtest across a roll needs contract data you stored while the contracts were trading: in Historify (`source="db"`) or in your own files (`data=`, a dict keyed by contract symbol). With broker history alone, a run that starts before the last expiry stops with a `DataError` from the history request, such as `Symbol 'NIFTY27OCT26FUT' not found for exchange 'NFO'`.

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

* **Margin.** Every futures contract blocks 20 percent of its contract value (5x) by default, on any exchange, underlying and date. Give your broker's figures with `margin=` (see [Your own margin](#your-own-margin)).
* **Tick size.** Some NFO and BFO contracts take their tick from a price slab, fixed each month by a reference close (an index future's by the index close on the previous month's last trading day). The engine reads that close from the run's own data: the underlying's bars when the source has them (with your own data, the index's bars under its name, such as `data["NIFTY"]`), otherwise the contract's own close that day. The Assumptions line of each contract says which close set its tick. It still asks for `instrument=` when the data has neither.

## Example

A positional trend trade on NIFTY futures with data from your OpenAlgo server: long while the 15-minute close is above its 50-bar average, held overnight (NRML), with a 2 percent stop. Your broker serves history only for contracts still trading, so the run starts on the session after the October expiry (27 October 2026) and ends on 11 November 2026, inside the November contract's life.

<!-- requires-server -->
```python
import openalgo.backtest as bt
from openalgo import api, ta

client = api(api_key="your_api_key", host="http://127.0.0.1:5000")


class TrendFutures(bt.Strategy):
    underlying, exchange, interval = "NIFTY", "NFO", "15m"  # expiry: the current month
    product = "NRML"  # positional: held overnight

    def init(self):
        self.mean = self.I(ta.sma, self.close, 50)  # about two sessions of 15-minute bars

    def on_bar(self, bar):
        if len(self.close) < 50:
            return
        if self.position.is_flat and self.close[-1] > self.mean[-1]:
            self.buy(lots=1, stop=bt.pct(2))
        elif self.position.is_long and self.close[-1] < self.mean[-1]:
            self.exit()


# From the session after the last monthly expiry (27 October): the October contract has expired.
result = bt.backtest(TrendFutures, client, start="2026-10-28", end="2026-11-11", capital=500_000)

print(result.assumptions["instruments"])
print(result.fills[["time", "symbol", "side", "quantity_units", "price_rupees", "reason"]].to_string(index=False))
print(result.positions[["time", "symbol", "quantity_units", "stop_rupees"]].to_string(index=False))
settled = result.settlements
print(settled[["date", "symbol", "quantity_units", "price_rupees", "amount_rupees", "kind"]].head(4).to_string(index=False))
print("postings", round(settled["amount_rupees"].sum(), 2), "= gross P&L", round(result.gross_pnl["total"], 2))
print(result.assumptions["futures_margin"], "| margin blocked:", result.equity["margin_rupees"].max())
```

NIFTY23NOV26FUT expires on 23 November 2026. After that your broker no longer serves its history, so to run the example later, set `start` to the session after the latest monthly expiry and `end` to a session before you run it.

<!-- output -->
```text
NIFTY23NOV26FUT: lot 65, tick 0.1 by the price slab of the NIFTY close on 2026-09-30 (22620.45), freeze 3510, from the reference tables
                     time          symbol side  quantity_units  price_rupees reason
2026-10-29 15:15:00+05:30 NIFTY23NOV26FUT  BUY            65.0       23044.6  entry
                     time          symbol  quantity_units  stop_rupees
2026-10-29 15:15:00+05:30 NIFTY23NOV26FUT            65.0      22583.7
      date          symbol  quantity_units  price_rupees  amount_rupees  kind
2026-10-29 NIFTY23NOV26FUT            65.0       23053.0          546.0 daily
2026-10-30 NIFTY23NOV26FUT            65.0       23101.4         3146.0 daily
2026-11-02 NIFTY23NOV26FUT            65.0       23415.3        20403.5 daily
2026-11-03 NIFTY23NOV26FUT            65.0       23780.0        23705.5 daily
postings 142376.0 = gross P&L 142376.0
NIFTY 20 percent of contract value (default) | margin blocked: 299578.5
```

What happened:

* The engine picked NIFTY23NOV26FUT, the current month from 28 October, from the reference tables: lot 65, and a tick of 0.1 set by the NIFTY index close on 30 September, which it fetched from your server.
* The position opened at 15:15 on 29 October. Its 2 percent stop, 22,583.70, is held as a GTT order because the position is NRML.
* The position was marked to market at every session close: each row of `result.settlements` is one day's cash flow, and together they add up to the gross P&L. The position was still open when the run ended, so no trade had closed.
* The last line is the futures margin the run used: the default, 20 percent of the contract value. One lot blocked Rs 2,99,578.50 of the Rs 5,00,000 capital.

## Your own margin

Real futures margins differ by underlying and change every day, so the engine does not guess them. Every futures contract, on any exchange, underlying and date, blocks **20 percent of its contract value (5x)** unless you pass `margin=` to `bt.backtest` or `bt.optimize`:

| `margin=` | Margin blocked |
|---|---|
| `None` (default) | 20 percent of the contract value for every futures contract |
| `bt.pct(x)` | x percent of the contract value for every futures contract (above 0, at most 100) |
| `bt.rupees(x)` | x rupees per lot of the contract traded, the figure a broker's margin calculator shows for one lot |
| `{"NIFTY": bt.rupees(200_000), "CRUDEOIL": bt.pct(30)}` | A value per underlying; an underlying the dict does not name keeps the default |

* A bare number is refused, because it could be read as a percent or as rupees; so are a percent above 100, a contract symbol (name the underlying) and a lower-case name. Each raises `ConfigError` saying what to write.
* Rupees per lot count the lots of the contract traded, so after a roll that changed the lot size the next contract's lots count.
* An underlying the run does not trade, or `margin=` on a run without futures, is named in `result.warnings` as unused.
* The Assumptions block states the margin of each underlying traded and whether it is the default or yours; the manifest records it and `rerun()` repeats it.
* It is a backtest assumption only. In live trading your broker computes the margin.

The rerun below continues the example above, so it needs the server too.

<!-- continues -->
<!-- requires-server -->
```python
# One NIFTY lot at the margin a broker's calculator shows, and BANKNIFTY at 12 percent.
own_margin = result.rerun(margin={"NIFTY": bt.rupees(200_000), "BANKNIFTY": bt.pct(12)})
print(own_margin.assumptions["futures_margin"])
print("largest margin:", own_margin.equity["margin_rupees"].max())
print(own_margin.warnings)

try:
    result.rerun(margin=15)
except bt.errors.ConfigError as error:
    print(str(error).split(";")[0])
```

<!-- output -->
```text
NIFTY 200000 rupees per lot (margin=)
largest margin: 200000.0
['margin= names BANKNIFTY, which this run does not trade as futures; its value is unused']
margin=: a bare number could be a percent or rupees
```

BANKNIFTY is not traded in this run, so its value is unused and the warning says so.

## Not available yet

* MCX futures from the reference tables: they do not list MCX monthly contracts yet, so pass each MCX contract with `instrument=` (the [CRUDEOIL example](examples/crudeoil-futures-macd.md) reads its terms from the master contract).
* Condition strategies (`entry_when` and the others) on an underlying, and other intervals of a futures series (`self.data["NIFTY", "15m"]`); both raise `NotImplementedError`.
* `symbols` that mix underlyings and contract symbols.
