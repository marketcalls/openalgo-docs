# Futures

A futures strategy is written like a stock strategy: the same class, the same indicators and the same orders, placed in lots. The engine applies the contract's lot size, its margin, the daily mark to market and, when you name the underlying, the roll from one contract to the next.

## Your first futures strategy

A **futures contract** is an agreement to buy or sell NIFTY on a set date, its **expiry**; its price moves with the NIFTY index. `NIFTY23NOV26FUT` is the contract that expires on 23 November 2026. It trades in **lots**: one NIFTY lot is 65 units.

The strategy is the EMA crossover: buy one lot when the 20-bar EMA (an average of closing prices that weighs recent bars more) crosses above the 50-bar EMA, sell when it crosses back below. It runs on **15-minute bars** (one bar, or candle, per 15 minutes), so the engine trades it **MIS** (intraday): no new entry from 15:00, and every open position is closed (squared off) at 15:10.

Your broker serves a contract's history only while the contract trades, so the run covers 1 October to 11 November 2026. After 23 November 2026, switch to the current contract (for example `NIFTY29DEC26FUT`) and dates inside its life.

Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`. Run this block first: the other blocks on this page continue from it.

<!-- requires-server -->
```python
# Imports: the backtest engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server: the price history comes from it.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# A function ("def") is a named piece of code you can run again: print_summary(result).
def print_summary(result):
    m = result.metrics  # a dict: the figures of the run, looked up by name
    # f"..." fills in each {value}: ":,.2f" is rupees with commas, ":.2%" a percent.
    print(f"Net profit   : Rs {m['net_profit']:,.2f}")
    print(f"Return       : {m['total_return']:.2%}")
    print(f"Max drawdown : {m['max_drawdown']:.2%}")
    print(f"Trades       : {m['trades']} ({m['win_rate']:.0%} won)")


# The strategy. A class bundles settings and functions; inside it, "self" is the strategy itself.
class NiftyFuturesEma(bt.Strategy):
    symbol, exchange, interval = "NIFTY23NOV26FUT", "NFO", "15m"  # the November contract, 15-minute bars
    fast = 20  # bars in the fast EMA
    slow = 50  # bars in the slow EMA

    # init runs once, before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every 15-minute bar: buy, sell or wait.
    def on_bar(self, bar):
        if len(self.close) < self.slow:  # warm-up: wait until the slow EMA has 50 bars
            return
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(lots=1)  # one lot: 65 units
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell the lot


# Run it from 1 October to 11 November 2026 with Rs 5,00,000, enough for the margin of one lot.
result = bt.backtest(NiftyFuturesEma, client, start="2026-10-01", end="2026-11-11", capital=500_000)
print_summary(result)
```

<!-- output -->
```text
Net profit   : Rs 31,722.48
Return       : 6.34%
Max drawdown : -1.54%
Trades       : 4 (100% won)
```

The **max drawdown** is the largest fall of the account from its highest value. The [futures lesson](tutorial/07-futures.md) walks through this strategy step by step.

## What is a lot?

A lot is the fixed number of units one contract trades in: 65 for this NIFTY contract. Order in lots with `lots=` (`self.buy(lots=2)` buys 130 units), or in units with `qty=`, which must then be a whole number of lots (an order of 100 NIFTY units is rejected with `quantity_rule`). The lot size, the tick size and the expiry come from the engine's reference tables, by the contract's own expiry.

<!-- continues -->
<!-- requires-server -->
```python
# Each trade: when it opened and closed, how many units, and its profit after charges.
trades = result.trades[["entry_time", "exit_time", "entry_units", "net_pnl_rupees"]]
print(trades.to_string(index=False, float_format="%.2f"))  # 2 decimals, no row numbers
```

<!-- output -->
```text
               entry_time                 exit_time  entry_units  net_pnl_rupees
2026-10-09 13:15:00+05:30 2026-10-09 15:10:00+05:30        65.00          762.54
2026-10-13 10:30:00+05:30 2026-10-13 15:10:00+05:30        65.00        10343.47
2026-10-26 13:15:00+05:30 2026-10-26 15:10:00+05:30        65.00         6249.03
2026-10-29 09:30:00+05:30 2026-10-29 15:10:00+05:30        65.00        14368.12
```

Every trade was one lot, 65 units, and every one was closed by the 15:10 square-off.

## How do I hold a position overnight?

Set `product = "NRML"`, the product for futures held overnight. The position is then kept across days until the strategy exits.

<!-- continues -->
<!-- requires-server -->
```python
# "class Overnight(NiftyFuturesEma)" copies the strategy; only the product changes.
class Overnight(NiftyFuturesEma):
    product = "NRML"  # held overnight, no square-off


# Run it over the same dates and print the four numbers.
overnight = bt.backtest(Overnight, client, start="2026-10-01", end="2026-11-11", capital=500_000)
print_summary(overnight)
```

<!-- output -->
```text
Net profit   : Rs 156,617.14
Return       : 31.32%
Max drawdown : -5.50%
Trades       : 3 (33% won)
```

Most of this profit is the lot bought on 29 October and still held on 11 November. A position still open at the end is valued at the last close: it counts in the net profit but not in the closed trades.

## What is mark to market?

An overnight futures position is settled every day, as the exchange does: at each session close the day's profit is paid to you, or the day's loss taken from you, in cash. `result.settlements` has one row per position per day.

<!-- continues -->
<!-- requires-server -->
```python
# The first four daily settlements of the overnight run.
settled = overnight.settlements[["date", "symbol", "quantity_units", "price_rupees", "amount_rupees", "kind"]]
print(settled.head(4).to_string(index=False))
```

<!-- output -->
```text
      date          symbol  quantity_units  price_rupees  amount_rupees  kind
2026-10-09 NIFTY23NOV26FUT            65.0       22723.2         2509.0 daily
2026-10-12 NIFTY23NOV26FUT             0.0       22500.0       -12480.0 daily
2026-10-13 NIFTY23NOV26FUT            65.0       22965.0        15463.5 daily
2026-10-14 NIFTY23NOV26FUT            65.0       22760.0       -13325.0 daily
```

`price_rupees` is the day's settlement price, `quantity_units` what was held after the close (0 on 12 October, the day the lot was sold) and `amount_rupees` the day's profit or loss, paid in cash. Together the daily amounts add up to the profit before charges.

## How much margin does one lot block?

**Margin** is the money your broker blocks while you hold a position. It is only part of the contract's value, but your profit or loss is on the full value. Real margins differ by underlying and change every day, so the engine blocks **20 percent of the contract value** unless you give your broker's figure:

| `margin=` | Margin blocked |
|---|---|
| left out | 20 percent of the contract value |
| `bt.rupees(200_000)` | Rs 2,00,000 per lot, the figure your broker's margin calculator shows |
| `bt.pct(15)` | 15 percent of the contract value |
| `{"NIFTY": bt.rupees(200_000), "CRUDEOIL": bt.pct(30)}` | A value per underlying; others keep the default |

<!-- continues -->
<!-- requires-server -->
```python
# The margin the overnight run used, and the most it blocked at any time.
print(overnight.assumptions["futures_margin"])
print(f"Most margin blocked: Rs {overnight.equity['margin_rupees'].max():,.2f}")
```

<!-- output -->
```text
NIFTY 20 percent of contract value (default)
Most margin blocked: Rs 296,595.00
```

One lot worth about Rs 14.8 lakh blocked about Rs 3 lakh of the Rs 5,00,000. A bare number such as `margin=15` is refused, because it could mean a percent or rupees. The margin is a backtest assumption only: in live trading your broker computes it.

## Can I sell futures short?

Yes. A **short** sells first and buys back later, to gain from a fall. `self.sell(lots=1)` opens a short and `self.exit()` buys it back; `self.target(lots=-1)` means "be short one lot" and turns a long into a short in one order. Unlike a stock, a futures short can be held overnight with NRML. See the [lesson Go Short](tutorial/06-going-short.md) and the [BANKNIFTY Supertrend example](examples/banknifty-futures-supertrend.md), which is always long or short.

## What happens when the contract expires?

* **When you name a contract** (`symbol = "NIFTY23NOV26FUT"`), the engine trades that contract only and never rolls it. Keep the run inside the contract's life; after expiry, switch to the current contract. This works on broker history alone.
* **When you name the underlying** (`underlying = "NIFTY"` with `exchange = "NFO"`, instead of `symbol`), the engine trades the nearest monthly contract and **rolls** an open position to the next contract one session before the last trading day: it closes the old contract and opens the new one, both charged. Your indicators read one continuous price series across the rolls.
* A roll needs the history of the expiring contract, which brokers stop serving after expiry. Store it while the contracts trade, in Historify (`source="db"`) or in your own files (`data=`). With broker history alone, a run across a roll stops with a `DataError` such as `Symbol 'NIFTY27OCT26FUT' not found for exchange 'NFO'`.

## More options

* **Next month:** `expiry = "next_month"` trades the second-nearest contract; it is always rolled, so it cannot take `roll=None`.
* **When to roll:** `roll=N` rolls N sessions before the last trading day (`roll=1` is the default); `roll=None` holds to expiry and settles at the last close (fill reason `expiry`).
* **What a roll does:** both legs are charged fills with the reason `roll`; the trade is split there; stop, target and trail levels and GTT orders move to the new contract.
* **The continuous series:** earlier bars are shifted by the spread at each roll, as known at each decision; `bar` in `on_bar` is the traded contract's own bar.
* **Tables:** `result.rolls` lists every roll with its `spread_rupees`; `result.settlements` marks a settlement at expiry with `kind="expiry"`.
* **Several underlyings:** `symbols = ("HDFCBANK", "ICICIBANK")` with `exchange = "NFO"`.
* **Contract terms:** from the reference tables, or from `instrument=`; with your own data, a dict of bars keyed by contract symbol.
* **Margin rules:** a bare number, a percent above 100 or a contract symbol in `margin=` raises a `ConfigError` saying what to write; `result.rerun(margin=...)` repeats a run with another margin.
* **Not available yet:** MCX futures from the reference tables (pass `instrument=`, as the [CRUDEOIL example](examples/crudeoil-futures-macd.md) does); condition strategies on an underlying; `symbols` that mix underlyings and contracts.
