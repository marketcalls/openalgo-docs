# Custom Tearsheets

{% hint style="info" %}
**New in openalgo 2.4.0.** Custom tearsheets (`layout=` and the `report.Layout` family) need openalgo 2.4.0 or later: run `pip install -U openalgo`.
{% endhint %}

The built-in tearsheet of [The Tearsheet](tearsheet.md) stays the default and does not change: `result.tearsheet("sbin.html")` writes the same page as before. A **custom tearsheet** starts from that page and changes only what you ask: hide the sections you never read, add charts and tables of your own, put the sections in your order and choose the colours. You describe the page once, as a **layout**, and pass it with `layout=`. One layout works for every backtest, so you can keep it in a file and use it for all your strategies.

Everything stays in one HTML file that opens without an internet connection, as the built-in page does.

## The backtest the examples use

The EMA crossover of [Your First Backtest](tutorial/01-first-backtest.md): SBIN daily bars from 1 January 2021 to 11 November 2026, Rs 1,00,000. Put the API key from your OpenAlgo dashboard in place of `OPENALGO_API_KEY`. Run this block first: every example below continues from it, in the same Python session.

<!-- requires-server -->
```python
# Load the backtesting engine (bt), the OpenAlgo client (api) and the indicators (ta).
import openalgo.backtest as bt
from openalgo import api, ta

# report holds the tearsheet and the pieces of a custom one.
from openalgo.backtest import report

# Connect to your OpenAlgo server.
client = api(api_key="OPENALGO_API_KEY", host="http://127.0.0.1:5000")


# The strategy of lesson 1: the EMA 20/50 crossover on SBIN, daily bars.
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
            self.buy()  # with all the capital, at the next day's open
        elif self.position.is_long and self.fast_ema.crossed_below(self.slow_ema):
            self.exit()  # sell all the shares at the next day's open


# Run the backtest and print its summary.
result = bt.backtest(EmaCrossover, client, start="2021-01-01", end="2026-11-11", capital=100_000)
print(result.summary())
```

<!-- output -->
```text
Net profit   : Rs 3,15,635.23
Return       : 315.64%
Max drawdown : -21.98%
Trades       : 13 (38% won), 1 still open
Overfitting  : too few trades to judge (13 closed, 30 needed)
```

## Your first custom tearsheet

A layout that leaves out two sections:

<!-- requires-server -->
<!-- continues -->
```python
# A layout: the full page without the Monthly and Distribution sections.
layout = report.Layout(hide=("monthly", "distribution"))

# Write the page with that layout, and print its file name.
print(result.tearsheet("sbin_short.html", layout=layout))
```

<!-- output -->
```text
sbin_short.html
```

The page has every other section, numbered again in order, with the links in its header to match. Without `layout=`, or with `layout=None`, `result.tearsheet()` writes the built-in page, exactly as before.

## The sections and their parts

Each section of the tearsheet is made of **parts**: a chart, a row of tiles or a table. A layout names them:

| Section | Its parts, in page order |
|---|---|
| `overview` | `overview` |
| `performance` | `cumulative`, `rolling`, `horizons`, `periods` |
| `risk` | `drawdown_chart`, `risk_stats`, `benchmark_stats`, `rolling_beta`, `worst_drawdowns`, `streaks` |
| `monthly` | `monthly_heatmap`, `weekly_heatmap`, `monthly_stats`, `yearly_bars`, `yearly_table` |
| `distribution` | `distribution_stats`, `histogram`, `box_plot` |
| `metrics` | `metrics_table`, `definitions` |
| `trades` | `trade_stats`, `trade_costs`, `excursion_stats`, `excursion_histograms`, `excursion_scatter`, `trade_table`, `costs`, `r_multiples` |
| `overfitting` | `overfitting_checks` |
| `strategies` | `strategies` |
| `portfolio` | `contribution`, `account_margin`, `refused`, `net_positions` |
| `notes` | `method`, `assumptions` |

`report.PARTS` holds the same list in Python ([Check a layout without a server](#check-a-layout-without-a-server) prints it). [The Tearsheet](tearsheet.md) shows each part. A few that are not obvious from the name: `rolling` is the three rolling charts (Sharpe, volatility, win rate), `horizons` the returns and risk over the last 1, 3 and 5 years, `periods` the returns of the latest periods, `benchmark_stats` and `rolling_beta` the figures against the benchmark (only in a run with one), `trade_costs` the Trading Cost row, `excursion_stats`, `excursion_histograms` and `excursion_scatter` the MAE and MFE tiles and charts, `costs` the Charges table, `definitions` the definition beside each figure (in the `"metrics"` mode), and `method` the note on how the figures were computed. The `strategies` and `portfolio` sections appear only on the combined page of [several strategies](several-strategies.md#the-combined-tearsheet).

## Hide what you do not read: `hide=`

`hide` takes part names, section names (all their parts), or both:

<!-- requires-server -->
<!-- continues -->
```python
# The full page without the rolling charts, the weekly heatmap and the losing streaks.
layout = report.Layout(hide=("rolling", "weekly_heatmap", "streaks"))
print(result.tearsheet("sbin_hide.html", layout=layout))
```

<!-- output -->
```text
sbin_hide.html
```

A section whose parts are all hidden is left out, with its link.

## Start from a shorter page: `base=` and `show=`

`base` is the built-in mode the layout starts from: `"full"` (the default), `"basic"`, `"metrics"` or `"charts"`, the same pages as `mode=` ([A shorter report](tearsheet.md#a-shorter-report)). `show` adds parts that mode leaves out:

<!-- requires-server -->
<!-- continues -->
```python
# The basic page, plus the rolling charts and the table of every figure.
layout = report.Layout(base="basic", show=("rolling", "metrics_table"))
print(result.tearsheet("sbin_basic_plus.html", layout=layout))
```

<!-- output -->
```text
sbin_basic_plus.html
```

`report.Layout()` alone is the full page and `report.Layout(base="basic")` the basic page, byte for byte the same as the built-in ones.

## Put the sections in your order: `order=`

`order` names sections in the order you want them. Sections you do not name follow, in their usual order:

<!-- requires-server -->
<!-- continues -->
```python
# Trades first, then the Overview; every other section after them, as usual.
layout = report.Layout(order=("trades", "overview"))
print(result.tearsheet("sbin_trades_first.html", layout=layout))
```

<!-- output -->
```text
sbin_trades_first.html
```

## Add a section of your own

`report.section(name, block, block, ...)` makes a section; give the layout your sections with `sections=`. Each **block** is a chart, a table or some text, made by the block functions below. A block's data can be a pandas table or series, or a function that takes the result and returns one, written with `lambda`: `lambda r: r.trade_list()["days_held"]` is a small function that takes a result `r` and returns the days each of its trades was held. A function is what lets one layout serve every run.

<!-- requires-server -->
<!-- continues -->
```python
# A section after Trades: how long the trades lasted, and whether longer trades paid more.
holding = report.section(
    "Holding time",  # the section's heading, and its link in the page's header
    report.histogram(lambda r: r.trade_list()["days_held"], title="Days held per trade", width="half"),
    report.scatter(lambda r: r.trade_list(), x="days_held", y="return_pct", title="Return against days held",
                   width="half"),
    subtitle="Each closed trade's holding time, in calendar days",
    after="trades",  # the section it follows
)

layout = report.Layout(sections=(holding,))
print(result.tearsheet("sbin_holding.html", layout=layout))
```

<!-- output -->
```text
sbin_holding.html
```

What `report.section` takes:

* `name`: the heading, and the section's link in the header.
* The blocks, in order. `width="half"` puts two blocks side by side, `width="third"` three; `"full"` (the default) takes the whole row.
* `subtitle=`: a line under the heading.
* `after=`: the section it follows, built-in or one of yours listed before it. Without it, it goes just before Notes.
* `printed=False` leaves the section out of Export PDF.

## Add blocks to a built-in section

A section named like a built-in one adds its blocks at the end of that section, instead of making a new one:

<!-- requires-server -->
<!-- continues -->
```python
# Add a table of the five worst trades at the end of the Trades section.
worst = report.section(
    "trades",  # a built-in section's name: the blocks go at its end
    report.table(
        lambda r: r.trade_list().nsmallest(5, "net_pnl")[["entry_time", "exit_time", "quantity", "net_pnl"]],
        title="The five worst trades",
    ),
)
print(result.tearsheet("sbin_worst.html", layout=report.Layout(sections=(worst,))))
```

<!-- output -->
```text
sbin_worst.html
```

Such a section takes no `subtitle` or `after`: it stays where the built-in section is.

## Charts of your own

Five chart blocks draw your data in the tearsheet's own style, with its axes, hover readout and light and dark colours:

<!-- requires-server -->
<!-- continues -->
```python
charts = report.section(
    "My charts",
    # line: a series over time (one line per column of a table). area fills under it.
    report.line(lambda r: r.equity["equity_rupees"], title="Account value", area=True),
    # bar: a value per category, here each year's return (fractions, so percent=True).
    report.bar(lambda r: r.performance.yearly_returns, title="Return by year", percent=True, width="half"),
    # histogram: how values are spread, in about 20 bins.
    report.histogram(lambda r: r.trade_list()["return_pct"], title="Trade returns (%)", bins=20, width="half"),
    # scatter: one column across, another up; group colours the points by a third column.
    report.scatter(lambda r: r.trade_list(), x="mae_pct", y="return_pct", group="exit_reason",
                   title="Worst open loss against the return"),
    # heatmap: a table of numbers as coloured cells, here the month by month returns.
    report.heatmap(lambda r: r.performance.monthly_returns, title="Monthly returns", percent=True),
)
print(result.tearsheet("sbin_charts.html", layout=report.Layout(sections=(charts,))))
```

<!-- output -->
```text
sbin_charts.html
```

| Block | Data | Its own options |
|---|---|---|
| `report.line` | A series, or a table with one line per column, indexed by dates | `area=True` fills under each line, `zero_line=True` draws a dashed line at zero, `log_scale=True` draws growth on a log scale (with `percent=True`) |
| `report.bar` | A series (one bar per category), or a table of grouped bars | `horizontal=True` draws a row per category |
| `report.histogram` | A series or a list of numbers | `bins=` (about 30 by default) |
| `report.scatter` | A table, with the columns named by `x=` and `y=` | `group=` names a column whose values get their own colour and a legend |
| `report.heatmap` | A table of numbers, rows by columns | none |

Every block also takes `title=` (charts and tables need one), `subtitle=`, `width=` (`"full"`, `"half"` or `"third"`) and, on charts, tables and tiles, `percent=True`, which shows fractions as percents (0.0764 as 7.64%). A chart draws at most six lines, groups or bar series (`report.MAX_SERIES`).

## Tables, tiles and text

<!-- requires-server -->
<!-- continues -->
```python
summary = report.section(
    "At a glance",
    # tiles: a dict of label and value, shown as the page's stat tiles; rupees=True shows money.
    report.tiles(lambda r: {"Net profit": r.metrics["net_profit"], "Charges": r.metrics["total_costs"]},
                 title="Rupees", rupees=True, width="half"),
    report.tiles(lambda r: {"Return": r.metrics["total_return"], "Win rate": r.metrics["win_rate"]},
                 title="Rates", percent=True, width="half"),
    # table: any table, in the page's style; rows=10 shows 10 rows a page, sortable by a click.
    report.table(lambda r: r.trade_list()[["entry_time", "exit_time", "net_pnl", "exit_reason"]],
                 title="Every trade", rows=10),
    # text: plain text in the page's note style; a blank line starts a new paragraph.
    report.text("The settings were chosen on 2021 to 2024.\n\nRe-check them every quarter.",
                title="My notes"),
    after="overview",
)
print(result.tearsheet("sbin_glance.html", layout=report.Layout(sections=(summary,))))
```

<!-- output -->
```text
sbin_glance.html
```

* `report.tiles` shows each value as a tile: numbers in Indian notation, as rupees with `rupees=True` or as percents with `percent=True` (not both); text as it is; a missing value as "n/a".
* `report.table` shows numbers in Indian notation and times as "12 Nov 2026 09:15". `rows=` splits a long table into pages with Prev and Next, and `sortable=False` turns off sorting by a click on a heading.
* `report.text` escapes what you write, so it shows exactly as typed.

## Your own HTML or SVG

`report.html` and `report.svg` put a piece of HTML, or an SVG drawing, of your own into the page:

<!-- requires-server -->
<!-- continues -->
```python
# A note with bold text and a link to the top of the page, and a small SVG drawing.
mine = report.section(
    "My notes",
    report.html('<p>Reviewed by <b>me</b> on 12 November 2026. <a href="#top">Back to the top</a></p>'),
    report.svg('<svg viewBox="0 0 120 20" width="240" height="40">'
               '<rect x="0" y="0" width="80" height="20" fill="#0b7a3e"/></svg>'),
)
print(result.tearsheet("sbin_notes.html", layout=report.Layout(sections=(mine,))))
```

<!-- output -->
```text
sbin_notes.html
```

To keep the page one file that opens offline, with no code but its own, every element and attribute is checked against an allow list, and anything else is refused:

* **HTML elements:** `div`, `span`, `p`, `br`, `hr`, `b`, `strong`, `i`, `em`, `small`, `sub`, `sup`, `code`, `pre`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `h3`, `h4`, `table`, `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `figure`, `figcaption`, `blockquote`, `img` and `a`.
* **SVG elements:** `svg`, `g`, `defs`, `title`, `desc`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `linearGradient`, `radialGradient`, `stop`, `clipPath`, `mask`, `marker`, `pattern` and `use`.
* **Attributes:** `class`, `title`, `lang`, `dir`, `colspan`, `rowspan`, `scope`, `id`, `aria-*` and `data-*` on any element, and the SVG drawing attributes (such as `viewBox`, `width`, `height`, `x`, `y`, `d`, `points`, `transform`, `fill`, `stroke`, `stroke-width`, `opacity`, `font-size`, `font-family` and `text-anchor`).
* **Links and images:** `a` links only inside the page (`href="#..."`); `img` only with the picture inside it, as a `data:` PNG, JPEG or SVG in `src`, and its `alt` text.
* **Not allowed:** `script`, `style` elements and `style` attributes, anything fetched from the internet, links to other pages, a few class names and `data-` attributes the page's own code uses, and tags that do not close.

A piece that breaks a rule raises a `ConfigError` that names what is not allowed and the block ([Check a layout without a server](#check-a-layout-without-a-server) shows one). The check keeps the page offline and whole; it is meant for your own HTML, not for text from a source you do not trust.

## Your colours: `report.Theme`

`theme=` sets the page's colours, separately for its light and dark look:

<!-- requires-server -->
<!-- continues -->
```python
# Deeper greens for gains, and two colours of your own for charts with several series.
theme = report.Theme(
    light={"pnl-pos": "#0b7a3e", "accent": "#1f4e79"},
    dark={"pnl-pos": "#4ade80", "accent": "#7cb8ff"},
    series=["#1f77b4", ("#d62728", "#ff9896")],  # one colour for both looks, or a (light, dark) pair
)
print(result.tearsheet("sbin_theme.html", layout=report.Layout(theme=theme)))
```

<!-- output -->
```text
sbin_theme.html
```

* `light` and `dark` map the page's colour names to colours. The names are `bg`, `panel`, `panel-2`, `border`, `border-strong`, `grid`, `text`, `text-muted`, `text-faint`, `accent`, `accent-ink`, `label`, `pnl-pos`, `pnl-neg`, `heat-neg`, `heat-mid`, `heat-pos` and `benchmark`. For example, `bg` is the page's background, `pnl-pos` and `pnl-neg` colour gains and losses, the three `heat-` names the heatmaps, and `benchmark` the benchmark's line. A name you do not give keeps the page's colour.
* `series` sets the colours of your charts with several series, up to six; on the combined page of several strategies they colour the strategies.
* A colour is written `#rgb`, `#rrggbb`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)` or a colour name such as `teal`. Anything else raises a `ConfigError`.

## One layout for every run

The functions in a layout's blocks are called for the result being written, so one layout serves any number of backtests. Put it together once:

<!-- requires-server -->
<!-- continues -->
```python
# One layout: a shorter page, the holding-time section, and the theme.
my_layout = report.Layout(hide=("monthly", "distribution"), sections=(holding,), theme=theme)

# The same layout for two runs: the 20/50 EMAs and the 10/30 EMAs.
faster = result.rerun(fast=10, slow=30)
print(result.tearsheet("sbin_20_50.html", layout=my_layout))
print(faster.tearsheet("sbin_10_30.html", layout=my_layout))
```

<!-- output -->
```text
sbin_20_50.html
sbin_10_30.html
```

A layout is plain data: keep it in a file of your own, such as `my_layouts.py`, and import it in every script.

## A layout for the combined page

The combined page of [several strategies on one account](several-strategies.md#the-combined-tearsheet) takes a layout too. Its blocks' functions receive the portfolio result, the `portfolio` section's parts can be hidden, shown and ordered like any other, and the theme's `series` colours colour the strategies:

<!-- requires-server -->
<!-- continues -->
```python
# A second strategy: the same crossover on INFY.
class InfyCrossover(EmaCrossover):
    symbol = "INFY"


# Both on one account, then the combined page without the net positions part.
pf = bt.backtest([EmaCrossover, InfyCrossover], client, start="2021-01-01", end="2026-11-11", capital=100_000)
layout = report.Layout(
    hide=("net_positions",),
    sections=(report.section("Account", report.line(lambda p: p.account["margin_rupees"], title="Margin blocked")),),
    theme=theme,
)
print(pf.tearsheet("portfolio_custom.html", layout=layout))
```

<!-- output -->
```text
portfolio_custom.html
```

Here `p` is the portfolio result, so `p.account` is the account's table. A layout written for one strategy's `Result` works on the combined page when its functions only read what both have, such as `trade_list()`, `metrics` and `performance`. `equity` differs: a table with an `equity_rupees` column on a `Result`, the account's series on a portfolio result.

## Every option

| Argument | Of | What it does |
|---|---|---|
| `base` | `report.Layout` | The built-in mode it starts from: `"full"` (default), `"basic"`, `"metrics"` or `"charts"` |
| `hide` | `report.Layout` | Parts or whole sections to leave out |
| `show` | `report.Layout` | Parts the base leaves out, to add |
| `order` | `report.Layout` | Sections in the order the page shows them; the rest follow |
| `sections` | `report.Layout` | Your sections (`report.section`); one named like a built-in section adds to its end |
| `theme` | `report.Layout` | A `report.Theme`, or `None` for the page's own colours |
| `subtitle`, `after`, `printed` | `report.section` | A line under the heading, the section it follows, and whether Export PDF prints it |
| `light`, `dark`, `series` | `report.Theme` | The page's colours in each look, and the colours of several series |
| `title`, `subtitle`, `width` | every block | Its title, a line under it, `"full"`, `"half"` or `"third"` of a row, and fractions shown as percents |

`layout=` works in the same way in `result.tearsheet()`, `pf.tearsheet()` and `report.tearsheet(performance, path, layout=...)`, the tearsheet of figures you computed yourself with `metrics.analyse` ([Metrics](support-functions/metrics.md)); there the functions receive the object you passed. With a layout, choose the starting page with `base=` and leave `mode=` out: a layout with a mode other than `"full"` raises a `ConfigError` that says so.

## Check a layout without a server

A layout is checked when it is made, so you can try one before any backtest. These blocks run without a server.

`report.PARTS` lists every section and its parts, in page order:

```python
# Every built-in section of the tearsheet, with the parts it is made of.
from openalgo.backtest import report

for section, parts in report.PARTS.items():  # items(): each section with its parts
    print(f"{section:<13}: {', '.join(parts)}")
```

<!-- output -->
```text
overview     : overview
performance  : cumulative, rolling, horizons, periods
risk         : drawdown_chart, risk_stats, benchmark_stats, rolling_beta, worst_drawdowns, streaks
monthly      : monthly_heatmap, weekly_heatmap, monthly_stats, yearly_bars, yearly_table
distribution : distribution_stats, histogram, box_plot
metrics      : metrics_table, definitions
trades       : trade_stats, trade_costs, excursion_stats, excursion_histograms, excursion_scatter, trade_table, costs, r_multiples
overfitting  : overfitting_checks
strategies   : strategies
portfolio    : contribution, account_margin, refused, net_positions
notes        : method, assumptions
```

A mistake in a layout raises a `ConfigError` when the layout is made, naming the valid choices:

```python
# A misspelt section name: the error lists every section and part.
from openalgo.backtest import report
from openalgo.backtest.errors import ConfigError

try:
    report.Layout(hide=("montly",))
except ConfigError as error:  # except: what to do when that error is raised
    print(error)
```

<!-- output -->
```text
Layout hide: 'montly' is neither a built-in section nor a part; the sections and their parts are overview: overview; performance: cumulative, rolling, horizons, periods; risk: drawdown_chart, risk_stats, benchmark_stats, rolling_beta, worst_drawdowns, streaks; monthly: monthly_heatmap, weekly_heatmap, monthly_stats, yearly_bars, yearly_table; distribution: distribution_stats, histogram, box_plot; metrics: metrics_table, definitions; trades: trade_stats, trade_costs, excursion_stats, excursion_histograms, excursion_scatter, trade_table, costs, r_multiples; overfitting: overfitting_checks; strategies: strategies; portfolio: contribution, account_margin, refused, net_positions; notes: method, assumptions
```

A layout is also refused for an unknown `base`, a name both hidden and shown, two sections of yours with one name, an `after` or `order` that names a section the page does not show, or blocks added to a section the layout hides. A block's data is checked when the block is made (data given directly) or when the page is written (data from a function), and a refusal names the block and its section.

A piece of HTML or SVG that is not on the allow list is refused when its block is made:

```python
# A script is not on the allow list.
from openalgo.backtest import report
from openalgo.backtest.errors import ConfigError

try:
    report.html("<p>Hello</p><script>alert(1)</script>")
except ConfigError as error:
    print(error)
```

<!-- output -->
```text
untitled html block: the element <script> is not on the allow list
```
