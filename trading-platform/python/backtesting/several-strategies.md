# Several Strategies on One Account

{% hint style="info" %}
**New in openalgo 2.4.0.** Backtesting a list of strategies on one account, the portfolio result, the daily limits and the combined tearsheet need openalgo 2.4.0 or later: run `pip install -U openalgo`.
{% endhint %}

Most traders run more than one strategy from one trading account. This page backtests several strategies together: one call, one account's money, each strategy's own result, and the account's figures for all of them together.

## Two strategies, one account

The two strategies are the EMA crossover of [Your First Backtest](tutorial/01-first-backtest.md) on SBIN and a MACD crossover on INFY. Both run on daily bars (one bar per trading day) and trade **CNC** (delivery: shares held overnight), with Rs 1,00,000 each. Give `bt.backtest` a list of strategy classes instead of one class. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`; run this block first, and the others after it in the same Python session.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The first strategy: lesson 1's EMA 20/50 crossover on SBIN, daily bars.
class EmaCrossover(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # SBIN on NSE, daily bars
    fast = 20  # days in the fast EMA
    slow = 50  # days in the slow EMA

    # init runs before the first bar: the two EMAs of the closing prices.
    def init(self):
        self.fast_ema = self.I(ta.ema, self.close, self.fast)
        self.slow_ema = self.I(ta.ema, self.close, self.slow)

    # on_bar runs at the close of every bar: buy, sell or wait.
    def on_bar(self, bar):
        if self.position.is_flat and self.fast_ema.crossed_above(self.slow_ema):
            self.buy()  # with all of this strategy's capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# The second strategy: the MACD crossover on INFY, daily bars.
class InfyMacd(bt.Strategy):
    symbol, exchange, interval = "INFY", "NSE", "D"  # INFY on NSE, daily bars

    # init: the MACD line and its signal line ("_" drops the third line, the histogram).
    def init(self):
        self.macd, self.signal, _ = self.I(ta.macd, self.close)

    # on_bar: buy when the MACD crosses above its signal, sell when it crosses back below.
    def on_bar(self, bar):
        if self.position.is_flat and self.macd.crossed_above(self.signal):
            self.buy()
        elif self.position.is_long and self.macd.crossed_below(self.signal):
            self.exit()


# Run both on one account: a list of classes, and Rs 1,00,000 for each strategy.
pf = bt.backtest([EmaCrossover, InfyMacd], client, start="2021-01-01", end="2026-11-11", capital=100_000)

# The account's summary: both strategies together.
print(pf.summary())
```

<!-- output -->
```text
Net profit   : Rs 40,004.67
Return       : 20.00%
Max drawdown : -24.68%
Trades       : 63 (41% won), 1 still open
Overfitting  : each strategy's own trades below; none of the account's trades together
  EmaCrossover : too few trades to judge (11 closed, 30 needed)
  InfyMacd     : quick checks: 3 not judged, 1 informational
```

A list gives back a **portfolio result** (`pf` here, a `bt.PortfolioResult`) instead of a `Result`. Its summary reads like one strategy's, for the whole account:

* **Net profit** and **Return**: what the account made, after every charge, on its money. The account's money is the sum of the strategies' capitals unless you say otherwise: Rs 2,00,000 here.
* **Max drawdown**: the largest fall of the account from its highest value (the two strategies' holdings valued together, every day).
* **Trades**: the closed trades of both strategies, and the positions still open at the end.
* **Overfitting**: the quick checks of each strategy's own trades, one line each ([Overfitting checks](results-and-reports.md#overfitting-checks)). None are run on the two strategies' trades together, because their trades overlap in time.

Each strategy is named by its class name, so two strategies of one run need different class names. To run one idea twice, on two stocks or with other settings, make two small classes: `class InfyCrossover(EmaCrossover): symbol = "INFY"`.

## Each strategy's own result

The account holds a full `Result` for each strategy, measured on its own capital, as if it had run alone:

<!-- requires-server -->
<!-- continues -->
```python
# pf.strategies: the class names, in the order of the list. pf.strategy(name): that strategy's Result.
for name in pf.strategies:
    m = pf.strategy(name).metrics  # every figure of that strategy, by name
    print(f"{name:<13}: return {m['total_return']:.2%}, max drawdown {m['max_drawdown']:.2%}, trades {m['trades']}")
```

<!-- output -->
```text
EmaCrossover : return 53.49%, max drawdown -29.42%, trades 11
InfyMacd     : return -13.48%, max drawdown -41.39%, trades 52
```

`pf.strategy("EmaCrossover")` has everything a backtest of one strategy has: its trade list, its metrics, its warnings and its own tearsheet. Its return is on its own capital, Rs 1,00,000, and the strategies' net profits add up to the account's. Whenever the account does not limit them (the next section says when it does), each strategy's figures are exactly those of a backtest of it alone.

The account's maximum drawdown can be smaller than either strategy's, because the account is measured on the money of both: a fall of one strategy is softened by the other when the two do not fall at the same time.

## The account together

The portfolio result has the account's own tables:

<!-- requires-server -->
<!-- continues -->
```python
# How the two strategies' daily returns moved together: 1 is in step, 0 unrelated, -1 opposite.
print(pf.correlation.round(2))

# Each strategy's part in the account's profit.
print(pf.contribution[["net_pnl_rupees", "share_pct"]].round(2))
```

<!-- output -->
```text
              EmaCrossover  InfyMacd
EmaCrossover          1.00      0.08
InfyMacd              0.08      1.00
              net_pnl_rupees  share_pct
strategy
EmaCrossover        53485.86      133.7
InfyMacd           -13481.19      -33.7
```

* `pf.correlation` compares the strategies' daily returns. Two strategies with a correlation near 0 rarely lose on the same days, which is what makes running them together smoother than either alone.
* `pf.contribution` gives each strategy's net profit and its share of the account's, in percent. It also has the strategy's profit or loss during the account's worst drawdown, its margin when the account's margin was highest, and the orders the account refused it.
* `pf.account` is the account itself, one row per bar: its value (`equity_rupees`), its free cash, the margin its positions block and the day's loss. `pf.equity` is its value alone.
* `pf.orders`, `pf.fills` and the other tables of a `Result` hold every strategy's rows in one table, with a `strategy` column; `pf.trade_list()` is indexed by strategy and trade number.

## When does the account refuse an order?

In one account the strategies share the cash. Before an order opens a position, the engine checks two things: that the strategy's own capital pays for it (else the order is refused with `margin`, as for one strategy), and that the account's free cash pays for it too (else it is refused with `account_margin`).

With the defaults, the second check rarely refuses anything. The account's money is the sum of the capitals, and each strategy can spend only its own capital, so together they never ask for more cash than the account has. The account refuses an order only in the rare case where other strategies' open losses have taken its free cash below what the order needs. In the run above it refused nothing:

<!-- requires-server -->
<!-- continues -->
```python
# The orders the account refused: an empty table means none.
print(len(pf.refused), "orders refused by the account")
```

<!-- output -->
```text
0 orders refused by the account
```

The check binds when the account has less money than the strategies together. Here each strategy buys with 60 percent of its own Rs 1,00,000, and `account_capital=100_000` says the account holds only Rs 1,00,000 for both: when one strategy holds its shares, the other's buy does not fit in what is left.

<!-- requires-server -->
<!-- continues -->
```python
# The same two strategies, each buying with 60 percent of its capital.
class SbinSixty(EmaCrossover):
    size = bt.size.percent(60)


class InfySixty(InfyMacd):
    size = bt.size.percent(60)


# Rs 1,00,000 for each strategy, but only Rs 1,00,000 in the account for both.
tight = bt.backtest([SbinSixty, InfySixty], client, start="2021-01-01", end="2026-11-11",
                    capital=100_000, account_capital=100_000)
print(tight.summary())

# The first refusals: which strategy, when, and why.
print(tight.refused[["strategy", "symbol", "side", "time", "reason"]].head(3).to_string(index=False))
```

<!-- output -->
```text
Net profit   : Rs -24,667.04
Return       : -24.67%
Max drawdown : -46.86%
Trades       : 45 (33% won), 1 still open
Overfitting  : each strategy's own trades below; none of the account's trades together
  SbinSixty  : too few trades to judge (7 closed, 30 needed)
  InfySixty  : quick checks: 3 not judged, 1 informational
 strategy symbol side                      time         reason
InfySixty   INFY  BUY 2021-05-24 09:15:00+05:30 account_margin
InfySixty   INFY  BUY 2021-07-30 09:15:00+05:30 account_margin
InfySixty   INFY  BUY 2021-09-27 09:15:00+05:30 account_margin
```

`account_margin` means the strategy's own capital had the cash, but the account's free cash did not: the other strategy held it. A refused buy is a trade the strategy did not take, so each strategy's result is no longer what it would be alone. Python also prints an `OrdersNotPlacedWarning` for each strategy that lost orders this way, and `tight.warnings` explains it with what to do.

Three settings choose how the account works:

* `pool="shared"` (the default): one account, with the two checks above.
* `account_capital=`: the account's money in rupees, by default the sum of the capitals. Give a smaller figure to test an account that has given its strategies more than it holds, such as three strategies of Rs 5,00,000 on Rs 10,00,000.
* `pool="separate"`: each strategy keeps its own fixed capital and no strategy's buy can block another's; the account is only their sum, for the combined figures.

## Two strategies on one symbol

Two strategies may trade the same stock. Here SBIN is traded by two plainly different ideas: the EMA crossover follows trends, and a second strategy buys SBIN after a sharp fall and sells on the recovery. The **RSI** (relative strength index, 0 to 100) falls after several down days; below 30 a stock is often called oversold.

<!-- requires-server -->
<!-- continues -->
```python
# A second idea on SBIN: buy after a sharp fall, sell when the price has recovered.
class RsiDip(bt.Strategy):
    symbol, exchange, interval = "SBIN", "NSE", "D"  # the same stock, daily bars

    # init: the 14-day RSI of the closing prices.
    def init(self):
        self.rsi = self.I(ta.rsi, self.close, 14)

    # on_bar: [-1] is the RSI of the bar that just closed.
    def on_bar(self, bar):
        if self.position.is_flat and self.rsi[-1] < 30:  # oversold: buy
            self.buy()
        elif self.position.is_long and self.rsi[-1] > 50:  # recovered: sell
            self.exit()


# Both strategies on SBIN, in one account.
both = bt.backtest([EmaCrossover, RsiDip], client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(both.summary())

# What a broker would hold: the shares of both strategies together, at each change.
columns = ["time", "net_units", "holders", "EmaCrossover_units", "RsiDip_units"]
print(both.net_positions[columns].tail(4).to_string(index=False))
```

<!-- output -->
```text
Net profit   : Rs 1,01,515.36
Return       : 50.76%
Max drawdown : -17.08%
Trades       : 20 (60% won)
Overfitting  : each strategy's own trades below; none of the account's trades together
  EmaCrossover : too few trades to judge (11 closed, 30 needed)
  RsiDip       : too few trades to judge (9 closed, 30 needed)
                     time  net_units      holders  EmaCrossover_units  RsiDip_units
2026-07-03 09:15:00+05:30      150.0 EmaCrossover               150.0           0.0
2026-09-08 09:15:00+05:30        0.0                              0.0           0.0
2026-09-16 09:15:00+05:30      150.0       RsiDip                 0.0         150.0
2026-10-30 09:15:00+05:30        0.0                              0.0           0.0
```

Each strategy keeps **its own position**: its own buys and sells, its own trades and its own result, as if it traded SBIN alone. Your broker sees one position for SBIN, the sum of the two: `both.net_positions` shows it (`net_units`) with each strategy's shares and who held them (`holders`), a row each time it changed.

A broker nets the two strategies into one position, and a backtest keeps them apart. Where that changes a figure, the backtest says so:

* **Opposite sides.** A backtest lets one strategy be long and the other short at once (with futures, or intraday). A warning then names the symbol, the two strategies and the first time; a live session refuses the later entry ([Two Strategies on One Symbol](../live-trading/13-two-strategies-on-one-symbol.md)).
* **Margin.** Each strategy blocks margin for its own position, where a broker nets a long and a short into one smaller position.
* **Charges.** Each strategy pays the charges of its own trades. A broker's contract note nets one stock's buys and sells of a day across the whole account: when one strategy sells SBIN (CNC) on the day the other buys it, the broker charges that as an intraday trade, not as two delivery trades. A warning names each such day.

`both.assumptions` says the same in words, for the stocks the run shares.

## Daily limits for each strategy and for the account

Limits that stop a strategy, or all of them, for the rest of the day. Each is off unless you set it, and takes one value for every strategy or a dict by strategy class name:

| Setting | For | What it does | Refused with |
|---|---|---|---|
| `max_trades_per_day` | each strategy | At most this many entries in a day. An entry is an order that opens a position from flat, or a reversal; adds and exits never count. A reversal at the cap is cut to its close. Nothing is exited | `trade_limit` |
| `daily_profit_target` | each strategy | When the day's profit reaches it, every position exits (exit reason `daily_profit_target`) and new entries wait for the next day | `daily_profit_gate` |
| `max_order_value` | each strategy | An entry or add worth more than this many rupees is refused. Exits are never refused | `order_value_limit` |
| `max_daily_loss` | each strategy | When the day's loss reaches it, every position exits (`daily_loss_limit`) and new entries wait for the next day | `daily_loss_gate` |
| `account_max_trades_per_day` | the account | At most this many entries in a day by all strategies together. Nothing is exited | `account_trade_limit` |
| `account_daily_profit_target` | the account | When the strategies' profit of the day together reaches it, every strategy exits (`account_profit_target`) and waits for the next day | `account_profit_gate` |
| `account_max_daily_loss` | the account | When the strategies' loss of the day together reaches it, every strategy exits (`account_loss_limit`) and waits for the next day | `account_loss_gate` |

The trade caps and the order value cap only refuse new entries: they never close a position, and the strategy can always exit what it holds. The profit targets and the loss limits close the positions and then refuse entries for the rest of the day. One strategy's own limits are explained on [Orders and Risk](orders-and-risk.md#how-do-i-limit-the-trades-of-a-day).

Daily limits matter most intraday, where a strategy can trade many times a day. The two strategies on 15-minute bars (**MIS**: intraday, every position closed the same day), with a trade cap for each, a trade cap for the account and a loss limit for the account:

<!-- requires-server -->
<!-- continues -->
```python
# The two strategies on 15-minute bars: intraday (MIS).
class SbinIntraday(EmaCrossover):
    interval = "15m"


class InfyIntraday(InfyMacd):
    interval = "15m"


# A year of 15-minute bars, with daily limits.
limited = bt.backtest(
    [SbinIntraday, InfyIntraday],
    client,
    start="2025-11-01",
    end="2026-11-11",
    capital=100_000,
    max_trades_per_day={"SbinIntraday": 2, "InfyIntraday": 1},  # each strategy's cap, by class name
    account_max_trades_per_day=2,  # both strategies together
    account_max_daily_loss=1_500,  # rupees, both strategies together
)
print(limited.summary())

# The orders each limit refused, by strategy and reject code.
orders = limited.orders
refused = orders[orders["reject_code"].isin(["trade_limit", "account_trade_limit", "account_loss_gate"])]
print(refused.groupby(["strategy", "reject_code"]).size().to_string())

# How the trades closed: account_loss_limit is the account's loss limit.
print(limited.trade_list()["exit_reason"].value_counts().to_dict())
```

<!-- output -->
```text
Net profit   : Rs -18,340.21
Return       : -9.17%
Max drawdown : -10.47%
Trades       : 213 (38% won)
Overfitting  : each strategy's own trades below; none of the account's trades together
  SbinIntraday : quick checks: 3 not judged, 1 informational
  InfyIntraday : quick checks: 3 not judged, 1 informational
strategy      reject_code
InfyIntraday  account_loss_gate       1
              trade_limit            31
SbinIntraday  account_trade_limit     1
{'scheduler': 125, 'signal': 84, 'account_loss_limit': 4}
```

The second table counts the refused entries by strategy and code; a code missing from it refused nothing in this run.

* `trade_limit`: entries a strategy wanted after its own cap for the day.
* `account_trade_limit`: entries refused because the two strategies together had reached the account's cap.
* `account_loss_gate`: entries after the account's loss limit fired, until the next day. The trades the limit closed show the exit reason `account_loss_limit`; `scheduler` is the intraday square-off and `signal` the strategy's own exit.

These refusals are the limits working as you asked, so Python prints no warning about them: `limited.warnings` counts them, and `limited.refused` lists the account's (`account_trade_limit`, `account_loss_gate` and the entries its loss limit cancelled). Each limit is named in the run's assumptions (`limited.assumptions`, and each strategy's own in `limited.strategy(name).assumptions`).

A limit changes how often a strategy trades, not whether its rule has an edge: test the strategies without limits first.

## The combined tearsheet

`pf.tearsheet(path)` writes one HTML page for the account:

<!-- requires-server -->
<!-- continues -->
```python
# The account's report, and SBIN's own report.
print(pf.tearsheet("portfolio.html"))
print(pf.strategy("EmaCrossover").tearsheet("sbin.html"))
```

<!-- output -->
```text
portfolio.html
sbin.html
```

The combined page has the sections of [The Tearsheet](tearsheet.md), measured on the account, with these differences:

* **Strategies**: the strategies head to head (each one's return, drawdown and other figures, on its own capital) and the correlation of their returns.
* **Portfolio**: each strategy's contribution to the account's profit and its profit by month, stacked; the account's highest margin and lowest free cash in each session, and each strategy's margin when the account's was highest; the orders the account refused, with their times; and, for a stock two strategies traded, the net position at every change.
* **Overfitting checks**: the quick checks of each strategy, a row per strategy.
* **Trades**: one trade list with a Strategy column. Each strategy numbers its own trades, so a mark of the MAE and MFE charts names its strategy when you hover over it, such as `EmaCrossover trade 1`.

Each strategy's own page, `pf.strategy(name).tearsheet()`, is exactly the page of a backtest of one strategy. [Custom Tearsheets](custom-tearsheets.md#a-layout-for-the-combined-page) shows how to choose the sections of the combined page.

## More options

* **Settings for each strategy:** `capital`, `product`, `base`, `max_daily_loss`, `after_risk_exit`, `max_positions`, `drawdown_halt`, `cooldown`, `entry_from`, `entry_until`, `square_off`, `max_trades_per_day`, `daily_profit_target` and `max_order_value` take one value for every strategy, or a dict by class name that names every strategy: `capital={"EmaCrossover": 1_50_000, "InfyMacd": 50_000}`. A class attribute the class can also set (`product`, `max_daily_loss`, `drawdown_halt`, `cooldown`, `entry_from`, `entry_until`, `square_off`, `max_trades_per_day`, `daily_profit_target`, `max_order_value`), such as `entry_until = "14:30"`, still wins over the argument; `capital`, `base`, `after_risk_exit` and `max_positions` are set only in the call.
* **Parameters:** `params={"EmaCrossover": {"fast": 10, "slow": 30}}` sets one strategy's parameters; a strategy left out keeps its own.
* **Your own data:** `data=` takes a dict of bars by symbol, and each strategy gets the bars of the symbol it trades ([Data](data.md#your-own-data)).
* **Several exchanges:** an NSE strategy, an NFO futures strategy and an MCX strategy can share one account; each keeps its own exchange's sessions and bars.
* **Saving:** `pf.to_csv("results")` and `pf.to_excel("portfolio.xlsx")` write the account's tables and every strategy's, each prefixed with its name.
* **A list of one strategy** also returns a portfolio result. A strategy class on its own runs exactly as before.
* **Not for a list yet:** `bt.optimize`, `bt.robustness` and `bt.walk_forward` take one strategy: run them for each strategy on its own. `pf.strategy(name).rerun()` is refused too, since a rerun alone would not face the account.
* **Live trading:** [Several Strategies in One Session](../live-trading/12-several-strategies-in-one-session.md) runs a list of strategies through OpenAlgo, and [Two Strategies on One Symbol](../live-trading/13-two-strategies-on-one-symbol.md) explains the rules live.
