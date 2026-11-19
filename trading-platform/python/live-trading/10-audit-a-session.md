# Audit a Session

{% hint style="warning" %}
**Being released.** These pages describe openalgo 2.3.0, which is being released. Live trading (`bt.live`) and tick recording (`bt.record`) are new in it; with an earlier version `bt.live` raises `NotImplementedError`. Run `pip install -U openalgo` once 2.3.0 is out.
{% endhint %}

A session keeps its own records of what it did, and OpenAlgo keeps its books: the order book, the trade book and the position book. To **audit** a session is to set one against the other. When they agree, the session did exactly what it says it did. This lesson lists what to check, gives a short script that checks it, and shows the audit of a real sandbox session.

## What to check

| Check | The session's record | OpenAlgo's book |
|---|---|---|
| Every order on the symbol was sent by the session | `result.orders` | `client.orderbook()` |
| Every fill matches a trade: the same order, units and price | `result.fills` | `client.tradebook()` |
| Where the session heard of each fill | `result.fills`, column `source` | |
| At most one stop working, and a stop working exactly while a position is open | `result.unprotected`: each time a position had no confirmed stop | `client.orderbook()` and `client.positionbook()` |
| The session's comparisons with OpenAlgo's books agreed | `result.reconciliations` (those that differed) and the event stream (all of them) | |
| The session's bars against the broker's candles | `result.drift` | |

The three book calls only read: they change nothing in OpenAlgo. Run the audit after the session has ended, so that nothing moves while you read.

## The audit script

The first block is the first lesson's script. The second continues it: add it below the script, in the same file, and it runs once the session has ended and `bt.live` has returned its result.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy: the EMA crossover of the backtesting tutorial, on 1-minute bars.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "1m"  # SBIN on NSE, 1-minute bars
    fast = 20  # bars in the fast EMA
    slow = 50  # bars in the slow EMA

    # init runs once, before the first bar.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)  # 20-bar EMA of the closes
        self.slow_ema = self.I(ta.ema, self.close, self.slow)  # 50-bar EMA of the closes

    # on_bar runs at the close of every 1-minute bar and decides what to do.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy(qty=10, stop=bt.pct(1))  # buy 10 shares, with a stop-loss 1 percent below
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares


# Trade it through OpenAlgo today, until the end of the day or Ctrl+C.
result = bt.live(EmaCrossover, client, capital=100_000, max_daily_loss=2_000)

# Print the session's result in one line.
print(result)
```

<!-- requires-server -->
<!-- continues -->
```python
# Audit the session once it has ended: its own records against OpenAlgo's books.
import json  # reads the event stream, one JSON object per line

symbol = "SBIN"  # the symbol the session traded

# OpenAlgo's books of the day, read once. These calls only read; they change nothing.
book = [row for row in client.orderbook()["data"]["orders"] if row["symbol"] == symbol]
trades = [row for row in client.tradebook()["data"] if row["symbol"] == symbol]
held = sum(int(float(row["quantity"])) for row in client.positionbook()["data"] if row["symbol"] == symbol)


# A function (def) that adds up rows of fills or trades: {order ID: (units, average price)}.
def by_order(rows, order, quantity, price):
    units, rupees = {}, {}
    for row in rows:
        key, qty = str(row[order]), float(row[quantity])
        units[key] = units.get(key, 0) + qty
        rupees[key] = rupees.get(key, 0.0) + qty * float(row[price])
    return {key: (units[key], round(rupees[key] / units[key], 2)) for key in units}


# 1. Every order on the symbol in OpenAlgo's book was sent by the session.
sent = set(result.orders["order_id"])
ours = sum(row["orderid"] in sent for row in book)
print(f"Orders in the book      : {len(book)}, sent by the session: {ours}")

# 2. Every fill of the session matches OpenAlgo's trade book, order by order.
fills = result.fills[result.fills["symbol"] == symbol].to_dict("records")
same = by_order(fills, "order_id", "units", "price") == by_order(trades, "orderid", "quantity", "average_price")
print(f"Fills match the trades  : {same}")
print(f"Where fills were heard  : {result.fills['source'].value_counts().to_dict()}")

# 3. At the end: the stops still working at the broker, and the position OpenAlgo shows.
working = [
    row["orderid"]
    for row in book
    if row["pricetype"] in ("SL", "SL-M") and row["order_status"].lower() in ("open", "trigger pending")
]
print(f"Stops working at the end: {working}, position: {held}")

# 4. While it ran: each time a position had no confirmed stop at the broker, and why.
print(result.unprotected[["from", "to", "seconds", "reason"]].to_string())

# 5. The comparisons with OpenAlgo's books: each is a "reconcile" line of the event stream;
#    result.reconciliations lists only those that differed.
with open(result.paths["events"], encoding="utf-8") as events:
    kinds = [json.loads(line)["kind"] for line in events]
print(f"Book comparisons        : {kinds.count('reconcile')}, differing: {len(result.reconciliations)}")

# 6. The bars the session built against the broker's 1-minute candles (candle minus bar).
largest = result.drift[["open", "high", "low", "close"]].abs().max().max()
print(f"Minutes checked         : {len(result.drift)}, largest price difference: Rs {largest:.2f}")
```

From a run of this code against a simulated OpenAlgo server, with Ctrl+C at 10:20 as in [the first lesson](01-first-sandbox-session.md#stop-it-with-ctrlc), the second block printed:

```text
Orders in the book      : 3, sent by the session: 3
Fills match the trades  : True
Where fills were heard  : {'stream': 2}
Stops working at the end: [], position: 0
                       from                        to  seconds            reason
0 2026-11-11 10:12:02+05:30 2026-11-11 10:12:05+05:30      3.0  stop unconfirmed
1 2026-11-11 10:20:01+05:30 2026-11-11 10:20:05+05:30      4.0           exiting
Book comparisons        : 42, differing: 0
Minutes checked         : 19, largest price difference: Rs 0.00
```

Read it check by check:

1. **Orders**: OpenAlgo's book holds 3 orders on SBIN (the buy, its stop and the Ctrl+C sale), and the session sent all 3. A number that differs means an order the session did not send: one placed by hand, or by another program.
2. **Fills**: the session's fills and OpenAlgo's trades agree, order by order, on units and average price. All of them came from OpenAlgo's order stream (`stream`); the other sources are `poll` (the session asked for the order's status) and `reconcile` (it found the fill in OpenAlgo's books).
3. **The end**: no stop is still working and OpenAlgo shows no position: the session ended flat. After `on_stop="keep"` you would see one working stop for each position left open, and that position.
4. **No stop**: the two moments a position had no confirmed stop: from the buy's fill until the broker confirmed the stop, and from the stop's cancel at Ctrl+C until the sale filled. They add up to the summary's `Unprotected : 7 s`.
5. **Comparisons**: the session compared its position with OpenAlgo's books 42 times in its 20 minutes (every 30 seconds, and 3 seconds after each fill), and none differed. The event stream holds every comparison of the day, across restarts.
6. **Bars**: the 19 bars the session built were checked against the broker's candles. The simulated server's candles equal its live prices, so the difference is zero; with a real broker expect a tick or so ([Inside a Session](09-inside-a-session.md#nothing-repaints)).

To audit a session of several strategies, run the checks once for each symbol.

## The audit of a real session

From a sandbox session on MCX on 19 November 2026: the same checks for crude oil mini (`CRUDEOILM18DEC26FUT`, the CrudeFast strategy of [Inside a Session](09-inside-a-session.md)), made at 18:05 while the session ran, from OpenAlgo's books and the session's records:

```text
PASS: every OpenAlgo order on the symbol was sent by the session
PASS: fill of 26111962581192 (10 @ 7695.0) matches OpenAlgo's trade book
PASS: fill of 26111964741193 (10 @ 7757.0) matches OpenAlgo's trade book
PASS: fill of 26111964981160 (10 @ 7769.0) matches OpenAlgo's trade book
PASS: at most one stop working (working stops: ['26111964981296'])
PASS: a working stop exactly when a position is open (position 10)
PASS: book comparisons agree (91 comparisons, 0 not agreeing)
```

OpenAlgo's order book for the contract at that moment:

| Time (IST) | Order | Side | Quantity | Type | Trigger | Status |
|---|---|---|---|---|---|---|
| 17:23:01 | 26111962581192 | BUY | 10 | MARKET | | complete |
| 17:23:01 | 26111962581468 | SELL | 10 | SL-M | 7657 | cancelled |
| 17:59:01 | 26111964741193 | SELL | 10 | MARKET | | complete |
| 18:03:01 | 26111964981160 | BUY | 10 | MARKET | | complete |
| 18:03:01 | 26111964981296 | SELL | 10 | SL-M | 7730 | trigger pending |

Read it as the day's story: a lot bought at 17:23 with its stop; at 17:59 the stop cancelled and the lot sold; a lot bought again at 18:03 with a new stop, working when the audit ran (`trigger pending` is the sandbox's word for a stop waiting for its trigger; in live mode the book can show it as `open`, which the script counts too). One stop at a time, and a stop exactly while a lot was held. The same audit of crude oil (`CRUDEOIL18DEC26FUT`, CrudeBigTrend) at 18:07 passed every check, with 95 comparisons, none differing.

## The session's own files

`result.paths` names the session's files ([Restarts and Results](06-restarts-and-results.md#where-the-session-keeps-its-files)). Two are for you to read:

* `result.paths["log"]`, the day's log, in plain text, each line with its time to the millisecond. From a sandbox session on MCX on 19 November 2026:

```text
2026-11-19 17:23:01.336 IST INFO intent 20261119-sandbox-3-CrudeFast-o1 is order 26111962581192
2026-11-19 17:23:01.341 IST INFO alert entry: SANDBOX (CrudeFast, CrudeBigTrend, GoldBreakout): BUY 10 CRUDEOILM18DEC26FUT MCX at 7695.00 (entry, order 26111962581192)
```

* `result.paths["events"]`, the event stream: one JSON object per line, for programs to read. Each has its time in UTC nanoseconds (`ts_ns`) and its `kind`, such as `request` (an order handed over to be sent), `sent` (OpenAlgo's answer), `news` (an order update), `fill`, `unprotected`, `reconcile` (a comparison with OpenAlgo's books) and `drift` (a bar against the broker's candle). From a sandbox session on MCX on 19 November 2026, the fill of the first buy:

```text
{"ts_ns": 1795089181341663800, "kind": "fill", "strategy": "CrudeFast", "order_id": "26111962581192", "units": 10, "price": 7695.0, "source": "stream", "derived_from_average": false, "estimated": false}
```

The third file, `result.paths["journal"]`, is the session's working record for a restart. Read the session through its result, its log and its event stream instead, and never edit or delete the journal during a trading day.

## What you learned

* An audit sets the session's records (`result.orders`, `result.fills`, `result.unprotected`, `result.reconciliations`, `result.drift`) against OpenAlgo's order, trade and position books.
* Every order on the symbol should be the session's, every fill should match a trade, and a stop should work exactly while a position is open.
* The log and the event stream (`result.paths`) hold the session's every step, with its time.

## Next lesson

[Commodities on MCX](11-commodities-on-mcx.md): crude oil and gold futures in a live session, and what the start banner says about them.
