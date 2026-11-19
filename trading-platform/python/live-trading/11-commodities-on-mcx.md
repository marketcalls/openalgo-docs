# Commodities on MCX

{% hint style="info" %}
**New in openalgo 2.3.0.** Live trading (`bt.live`) and tick recording (`bt.record`, `bt.read_ticks`) need openalgo 2.3.0 or later: run `pip install -U openalgo`. With an earlier version `bt.live` raises `NotImplementedError`.
{% endhint %}

A session trades MCX commodity futures the way it trades NSE shares: one strategy class per contract, intraday (MIS), on bars built from the live prices. This lesson shows what is different on MCX: how a contract is named, lots and units, the evening hours, the start banner's warnings, and what 2.3.0 cannot trade yet. Its examples come from a sandbox session on MCX on 19 November 2026.

## The code

Two strategies in one session: an EMA crossover on crude oil mini with a trailing stop, and a breakout on gold mini with a stop-loss and a target.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# Crude oil mini: the EMA 9/21 crossover on 1-minute bars, one lot, a stop that trails.
class CrudeTrend(bt.Strategy):
    symbol, exchange, interval = "CRUDEOILM18DEC26FUT", "MCX", "1m"  # the December contract

    # init runs once, before the first bar.
    def init(self):
        self.fast = self.I(ta.ema, self.close, 9)  # 9-bar EMA of the closes
        self.slow = self.I(ta.ema, self.close, 21)  # 21-bar EMA of the closes

    # on_bar runs at the close of every 1-minute bar.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast.crossed_above(self.slow):
            # one lot (10 barrels), a stop 0.5 percent below that trails 0.5 percent below the highest price
            self.buy(lots=1, stop=bt.pct(0.5), trail=bt.trail_pct(0.5))
        elif self.position.is_long and self.fast.crossed_below(self.slow):
            self.exit()  # sell the lot


# Gold mini: buy when a 5-minute bar closes above the highest high of the 12 bars before it.
class GoldBreakout(bt.Strategy):
    symbol, exchange, interval = "GOLDM04DEC26FUT", "MCX", "5m"  # the December contract

    # init: the highest high of the last 12 bars, this bar included.
    def init(self):
        self.high12 = self.I(ta.highest, self.high, 12)

    # on_bar: [-2] is the value at the bar before this one, so the 12 bars before it.
    def on_bar(self, bar):
        if self.position.is_flat and bar.close > self.high12[-2]:
            self.buy(lots=1, stop=bt.pct(0.3), target=bt.pct(0.5))  # one lot (100 grams)


# Trade both in one session, each with its own capital and daily loss limit,
# and at most Rs 6,000 lost by the two together.
result = bt.live(
    [CrudeTrend, GoldBreakout],
    client,
    capital={"CrudeTrend": 100_000, "GoldBreakout": 500_000},
    max_daily_loss={"CrudeTrend": 2_000, "GoldBreakout": 5_000},
    account_max_daily_loss=6_000,
)

# Print the session's result in one line.
print(result)
```

Nothing in the code is special to MCX but the symbols: the same classes, the same `bt.live` call, sandbox or live chosen inside OpenAlgo as always.

## Name the contract, trade in lots

* **The symbol is the contract.** `CRUDEOILM18DEC26FUT` is crude oil mini expiring on 18 December 2026; `GOLDM04DEC26FUT` is gold mini expiring on 4 December 2026. Name one contract per strategy, on `"MCX"`.
* **Lots, counted in units.** A **lot** is the fixed quantity one contract trades in. `lots=1` buys one lot, and the session's lines and results count **units**: a crude oil mini lot is 10 units (10 barrels), so its buy reads `BUY 10 CRUDEOILM18DEC26FUT`; a gold mini lot is 100 units (100 grams). `qty=` takes units, a whole number of lots.
* **What a rupee is worth.** Crude oil is priced per barrel, so a rise of Re 1 makes Rs 10 on a crude oil mini lot, and Rs 100 on a crude oil lot of 100 barrels. Gold mini is priced per 10 grams, so Re 1 on its price is Rs 10 on a lot of 100 grams.
* **Start with the mini contracts.** Crude oil mini is a tenth of crude oil, and gold mini a tenth of gold (1 kg): small lots for your first sessions.
* **Not on its expiry day.** On 19 November 2026 the November crude oil contract (`CRUDEOIL19NOV26FUT`) expired, so the session traded the December contracts. Choose a contract that does not expire today; a futures backtest that names the underlying, for the same reason, rolls to the next contract one session before the last trading day by default ([Futures](../backtesting/futures.md#what-happens-when-the-contract-expires)).

## The evening hours

MCX trades from 09:00 to 23:55, or to 23:30 while the United States is on daylight saving time (from March to early November). The session stops new MIS entries 30 minutes before the close and squares off 20 minutes before it, from the engine's trading calendar: on 19 November 2026, no new entries from 23:25 and the square-off at 23:35 (in the summer timing, 23:00 and 23:10). The start banner's strategy lines show both times for the day.

## The start banner

From a sandbox session on MCX on 19 November 2026: the start banner of this code, started at 17:06 (that session also passed `on_stop="keep"` and its own folder for its files, which the banner does not show):

```text
OpenAlgo is in SANDBOX mode: orders are simulated
Funds available: Rs 9,997,977.85
CrudeTrend: MCX:CRUDEOILM18DEC26FUT every 1m, capital Rs 100,000.00, daily loss limit Rs 2,000.00, entries until 23:25 IST, square-off 23:35 IST
CRUDEOILM18DEC26FUT: freeze quantity none
GoldBreakout: MCX:GOLDM04DEC26FUT every 5m, capital Rs 500,000.00, daily loss limit Rs 5,000.00, entries until 23:25 IST, square-off 23:35 IST
GOLDM04DEC26FUT: freeze quantity none
Stops: an entry placed with stop= gets its stop at the broker as it fills; one placed without has none until a trail or breakeven sets one (allowed), and the session warns at the first such position
Account daily loss limit: Rs 6,000.00
Charges modelled with: zerodha
SANDBOX: OpenAlgo simulates the fills at its own prices; nothing reaches the broker
Warning: MCX trades today, 2026-11-19, from 09:00 to 23:55 IST, but the calendar's holiday data for 2026 is not confirmed by an exchange document: check that today is not a holiday of MCX; today's session hours of MCX are not confirmed by an exchange document: check them
Warning: the local clock cannot be measured against OpenAlgo's server, which runs on this computer (127.0.0.1) and so tells this computer's own time: the session checks the clock against the exchange times of the feed's ticks instead. Keep it right: synchronise this computer's clock with an internet time server
Warning: the test alert was not delivered: this SANDBOX session runs without alerts, and a LIVE session will need them
Warning: charges: the MCX_FUT rates of cost schedule IN-2026-04-01 used for 2026-11-19 are verified only up to an earlier date, so the charges may be off. Verified on 2026-11-12; later trade dates are charged at these rates and flagged unverified. The start date is the day the Finance Act 2026 F&O STT rates took effect; no other change between that day and the snapshot is known. NSE rows keep the calculator's split between transaction charge and IPFT (NSE circular NSE/FA/73061 moved all but Rs 0.01 per crore of IPFT into the transaction charge in March 2026); the sum is what is charged. Unverified rows say why in their own notes: BSE groups X and SS, BSE options other than Sensex and Bankex. MCX CASTORSEED, RBDPMOLEIN, PEPPER and KAPAS pay the uniform Rs 2.10 per lakh of MCX/F&A/631/2024, not the contract-specific rates of the snapshot, which predate 2024-10-01.
Warning: CRUDEOILM18DEC26FUT: OpenAlgo has no freeze quantity configured for CRUDEOILM, so the reference tables' 10000 is used for the session
Warning: GOLDM04DEC26FUT: OpenAlgo has no freeze quantity configured for GOLDM, so the reference tables' 10000 is used for the session
Warning: the clock against the exchange cannot be checked through zerodha's feed (its last trade time is the OpenAlgo server's own clock): keep this computer's clock synchronised
```

The lines to read on MCX:

* **`entries until 23:25 IST, square-off 23:35 IST`**: the evening times of the day, as above.
* **`freeze quantity none`, then `OpenAlgo has no freeze quantity configured for CRUDEOILM, so the reference tables' 10000 is used`**: the **freeze quantity** is the largest single order the exchange takes. OpenAlgo configures none for MCX, so the first line shows none; the session then uses the figure of the SDK's reference tables, 10,000 units, and keeps every order under it.
* **`MCX trades today ... not confirmed by an exchange document`**: the engine's MCX holiday list and hours for the year are not checked against an MCX document yet. Check on the MCX website that the exchange is open and closes when the banner says.

Two more lines are not about MCX: the charges warning (the same as for NSE in [the first lesson](01-first-sandbox-session.md#what-you-see-when-it-starts): the modelled charges may be slightly off, and the session trades as usual), and `the local clock cannot be measured against OpenAlgo's server, which runs on this computer (127.0.0.1)`, which comes from running OpenAlgo on the same computer as the session: its clock is this computer's own, so the session checks the clock against the times of the feed's prices instead. Keep the clock synchronised with internet time.

Before the banner, Python also prints two `ReferenceDataWarning`s for each contract, each after a file name and line number, and an `UnverifiedScheduleWarning` for the charges. The two for crude oil mini:

```text
ReferenceDataWarning: reference data: mcx_contracts[CRUDEOILM MCX] 2025-01-01 to open (builtin, unverified) is unverified (source: No MCX document read; terms of the 2025 contracts (MCX/TRD/479/2024) carried forward). Confirm it against the exchange circular, or override it with a user file or a symbol-master snapshot.
ReferenceDataWarning: reference data: mcx_contracts[CRUDEOILM MCX] 2025-01-01 to open (builtin, unverified) was last checked on 2026-03-31 and is being used for 2026-11-19. The exchange may have changed it since: update openalgo, or supply a user file or a symbol-master snapshot.
```

The contract's terms in the SDK's tables (its lot size, tick and freeze quantity among them) are carried forward from an earlier MCX circular and not yet checked for this contract. The session takes the lot size and the tick from OpenAlgo itself, and the rest from these tables. The user file or snapshot the warnings offer does not reach `bt.live` or `bt.backtest` in 2.3.0: both read the SDK's own tables.

## Entries repeat

GoldBreakout buys whenever it is flat and a bar closes above the highest high of the 12 bars before it. After its stop or its target closes a trade, it can buy again at the next bar that breaks out, as many times a day as the rule holds; the level it watches moves as old bars leave the 12-bar window. Its stop and target are set once, from the buying price, and its buy is a market order at the bar's close, not an order waiting at the level. To trade once a day, or a few times, see [Does my strategy trade only once a day?](../backtesting/how-to.md#does-my-strategy-trade-only-once-a-day).

## What 2.3.0 cannot trade on MCX yet

* **Silver mini and silver micro** (`SILVERM`, `SILVERMIC`): the SDK's tables have no freeze quantity for them, and OpenAlgo configures none, so they are refused in backtests and live sessions alike: `bt.live` stops before anything is sent, and `bt.backtest` before it runs, with `ReferenceDataError: No 'mcx_contracts' reference row covers underlying=SILVERM, exchange=MCX on ... with a freeze_qty value`. The error suggests a user file for `load_tables`, but neither run reads one. A backtest can take the contract's terms you give it with `instrument=` ([Reference Data](../backtesting/support-functions/reference-data.md)); `bt.live` takes no `instrument=`. A later version adds them.
* **A series of contracts** (`underlying = "CRUDEOIL"` with an expiry rule): name the contract instead, as above ([What openalgo 2.3.0 refuses](README.md#what-openalgo-230-refuses)).
* **Positions held overnight** (NRML): a session trades MIS only, closed before the evening close.

## What you learned

* Name the MCX contract as the symbol; `lots=1` buys one lot, and every quantity is in units (10 barrels, 100 grams).
* On 19 November 2026 MCX traded until 23:55: entries until 23:25, square-off at 23:35, from the engine's calendar.
* The banner warns that OpenAlgo has no freeze quantity for MCX (the reference tables' is used) and that the MCX holiday data is not confirmed.
* Silver mini and micro are refused in backtests and live sessions alike in 2.3.0; avoid a contract on its expiry day.

## Back to the start

[Live Trading](README.md): every lesson of this section.
