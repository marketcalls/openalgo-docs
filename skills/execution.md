# Execution

### OpenAlgo Execution Agentic Skills for Agentic Coding Tools

A comprehensive agent-skill package covering the full OpenAlgo Python SDK surface, trading execution, custom limit-order algorithms, scanners, visualization, backtesting, charting, real-time WebSocket streaming, and Telegram / WhatsApp alerts for Indian markets (NSE, BSE, NFO, BFO, CDS, BCD, MCX, NCO). Works with **40+ AI coding agents** via [skills.sh](https://github.com/vercel-labs/skills), including Claude Code, Cursor, Codex, OpenCode, Cline, Windsurf, GitHub Copilot, Gemini CLI, Roo Code, and more.

Broker-agnostic by design: one Python SDK targets the common interface exposed by 37 broker plugins (35 securities brokers, Delta Exchange for crypto derivatives, and a Dhan sandbox plugin). Optional capabilities still depend on the active plugin and account. The skill is **response-aware**: every reference doc and example demonstrates how to chain endpoints together (e.g. place order → poll status → read fill price → compute SL → attach SL+target → alert) so the agent can write complete strategies, not just isolated API calls.

#### Quick Install

Install the skill into your project using [npx skills](https://github.com/vercel-labs/skills). The CLI auto-detects your AI coding agent and installs skills to the correct directory.

```bash
# GitHub shorthand
npx skills add marketcalls/openalgo-skills

# Full GitHub URL
npx skills add https://github.com/marketcalls/openalgo-skills
```

Install the bundled skill explicitly:

```bash
npx skills add marketcalls/openalgo-skills -s openalgo
```

List available skills before installing:

```bash
npx skills add marketcalls/openalgo-skills -l
```

Install globally (available across all projects):

```bash
npx skills add marketcalls/openalgo-skills -g
```

**Supported AI Coding Agents**

Skills are installed via [skills.sh](https://github.com/vercel-labs/skills) which supports 40+ agents. Each agent reads skills from its own directory:

| Agent          | Skills Directory              |
| -------------- | ----------------------------- |
| Claude Code    | `.claude/skills/`             |
| Cursor         | `.agents/skills/`             |
| Codex          | `.agents/skills/`             |
| OpenCode       | `.agents/skills/`             |
| Cline          | `.agents/skills/`             |
| Windsurf       | `.agents/skills/`             |
| GitHub Copilot | `.agents/skills/`             |
| Gemini CLI     | `.agents/skills/`             |
| Roo Code       | `.agents/skills/`             |
| + 30 more      | Auto-detected by `npx skills` |

The `npx skills add` command detects which agents you have installed and places the skill files in the correct paths automatically.

#### Supported Use Cases

| Use Case                   | What's Covered                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Order Execution**        | Equity, F\&O, options-by-offset (ATM/ITM/OTM), multi-leg (iron condor, straddle, diagonal), basket, split, smart-order, GTT (OCO + single-trigger)                          |
| **Custom Execution Algos** | Limit-order chaser (peg the touch, auto-modify, MARKET fallback), TWAP slicer, iceberg slicer, time-based cancel, price-based cancel-and-replace, conditional bracket       |
| **Scanners**               | Top gainers / losers, breakout (with volume confirmation), RSI oversold, volume surge, pre-open gap up / down, F\&O OI delta, built on `multiquotes` + `history` pipelines |
| **Visualization**          | Sector heatmap, YTD / CAGR heatmaps, OI histogram, PCR dashboard, seasonality                                                                                               |
| **Backtesting**            | vectorbt glue with realistic Indian-market fees, NIFTY benchmark, plain-language reports, direct DuckDB Historify access for bulk multi-symbol pulls                        |
| **Charting**               | Candlestick (no weekend gaps), option-chain OI, max-pain, IV smile, depth ladder                                                                                            |
| **Real-Time Streaming**    | LTP / Quote / Depth WebSocket (Mode 1/2/3), depth\_level 5/20/30/50, verbose control, persistent reconnect loop, callback router for per-symbol handlers                    |
| **Alerts**                 | Telegram + WhatsApp send-only endpoints with rich pre-built templates (order placed, fill, SL hit, target hit, position closed, scanner results, daily P\&L, error)         |

#### Capabilities

**How the Skill Triggers**

The bundled skill is named `openalgo`. After installation it auto-loads in your agent when the conversation matches OpenAlgo-related work. Common trigger phrases:

* "Place an order on OpenAlgo"
* "Build a limit-order chaser for SBIN"
* "Scan NIFTY 50 for breakouts / gainers / RSI oversold"
* "Stream NIFTY depth with a 20-level book"
* "Backtest an EMA crossover on Historify data"
* "Render the option chain OI chart"
* "Send a Telegram alert when NIFTY crosses 26000"
* "Place an ATM straddle with auto stoploss on each leg"
* "Fetch Greeks and pick the 25-delta strike"

The agent then reads `SKILL.md` for safety rules and the API surface table, and consults the deep-dive references on demand for parameter-complete API docs.

**Helper Scripts (16 Composable Modules)**

| Script                | Purpose                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `openalgo_client.py`  | `get_client()`: bootstraps from `.env` via `find_dotenv()`; resolves `OPENALGO_API_KEY`, host, ws\_url, Historify DuckDB path      |
| `symbols.py`          | Build / parse equity, futures, options symbols; common index lists; `client.symbol` and `client.search` wrappers                    |
| `lotsize.py`          | F\&O lot validation from bundled `LotSize.csv`; `nearest_lot()` + authoritative live lookup via `client.symbol(...).lotsize`        |
| `orders.py`           | `preview_order`, `place_with_retry`, `modify_with_retry`, `cancel_with_retry`, `poll_until_terminal`, handles rate limits          |
| `execution.py`        | `LimitChaser`, `TWAPSlicer`, `IcebergSlicer`, composable execution-algo primitives                                                 |
| `responses.py`        | **Response navigation helpers**: `extract_orderid`, `avg_fill_price`, `poll_until_filled`, `extract_ltp`, `extract_touch`, etc.    |
| `workflows.py`        | High-level chains: `place_with_sl_target`, `enter_options_atm_with_sl`, `square_off_with_alert`, `place_smart_with_position_check`  |
| `option_analytics.py` | `chain_to_df`, `pcr`, `max_pain`, `iv_skew`, `payoff` (multi-leg P\&L diagram)                                                      |
| `scanner.py`          | `Scanner`: multi-symbol filter pipeline over `multiquotes` + `history`, parallelized with thread pool                              |
| `stream.py`           | `subscribe()` context manager, `run_until_interrupt`, `CallbackRouter`, `reconnect_loop`                                            |
| `plotting.py`         | Candlestick (no weekend gaps), OI histogram, heatmap, depth ladder, payoff chart, all Plotly dark theme                            |
| `duckdb_data.py`      | Direct Historify access for bulk pulls (`load_ohlcv`, `load_multi`, `resample_ist`, `list_symbols`, `date_range`)                   |
| `alerts.py`           | Telegram + WhatsApp dispatcher with rich `fmt_*` templates and one-call `notify(via=...)` and `alert_order_lifecycle`               |
| `fees.py`             | Indian-market cost model (delivery / intraday / F\&O futures / F\&O options / currency / commodity), `fees_pct` + `fixed_fees_inr` |
| `ta_helpers.py`       | Ergonomic wrappers: TA-Lib (EMA, SMA, RSI, MACD, ATR, BBANDS, ADX) + `openalgo.ta` (Supertrend, Donchian, Ichimoku, HMA, KAMA)      |
| `trade_logger.py`     | `CsvJournal` and `SqliteJournal` with identical `.write()` surface, persistent trade journals                                      |

**Knowledge Base (19 Reference Files)**

Every SDK endpoint has a dedicated reference with **Request / Success-Response / Error-Response / Field-extraction / Chains-with** sections. The response shapes are documented inline so the agent knows exactly which fields to read and where the chain goes next.

| Category                    | What's Covered                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Order Management**        | `placeorder`, `placesmartorder`, `optionsorder`, `optionsmultiorder`, `basketorder`, `splitorder`, `modifyorder`, `cancelorder`, `cancelallorder`, `closeposition`, GTT family |
| **Order Information**       | `orderstatus`, `openposition`, the polling pattern and `data.average_price` extraction                                                                                        |
| **Market Data**             | `quotes`, `multiquotes`, `depth`, `history` (REST + Historify DuckDB), `intervals`                                                                                             |
| **Symbol Services**         | `symbol`, `search`, `expiry`, `instruments`, lot sizes, freeze quantities, tick sizes                                                                                         |
| **Options Services**        | `optionsymbol` (ATM / ITMn / OTMn resolution), `optionchain`, `syntheticfuture`, `optiongreeks` (delta / gamma / theta / vega / rho + IV)                                      |
| **Account Services**        | `funds`, `margin` (multi-leg margin calculator), `orderbook`, `tradebook`, `positionbook`, `holdings`                                                                          |
| **Market Calendar**         | `holidays(year)` and `timings(date)`, schedule-aware strategy startup; timing data identifies closed sessions                                                                  |
| **Analyzer (Sandbox) Mode** | `analyzerstatus`, `analyzertoggle(mode=True)`, iterate safely before going live                                                                                               |
| **WebSocket Streaming**     | Modes 1 (LTP) / 2 (Quote) / 3 (Depth with `depth_level` 5/20/30/50), `verbose` 0/1/2, heartbeat, reconnect                                                                     |
| **Alerts**                  | `telegram(username, message)` and full `whatsapp(text, to=..., image=..., document=...)` surface incl. broadcast (≤5) and slash-command receiving                              |
| **Indicators**              | TA-Lib mandatory for standard set; `openalgo.ta` for Supertrend / Donchian / Ichimoku / HMA / KAMA / ALMA / ZLEMA / VWMA + `exrem` / `crossover` / `flip`                      |
| **Execution Algorithms**    | Limit chaser algorithm + TWAP + iceberg primitives, plus patterns for time-cancel, price-replace, conditional bracket                                                          |
| **DuckDB Historify**        | Direct read-only access to `<openalgo>/db/historify.duckdb`; bulk multi-symbol pulls; NSE 09:15 IST-aligned resampling                                                         |
| **Symbol Format**           | Equity (`RELIANCE`), Futures (`NIFTY30JUN26FUT`), Options (`NIFTY30JUN2626500CE`) + full index symbol lists (NSE\_INDEX, BSE\_INDEX, GLOBAL\_INDEX, MCX\_INDEX)                |
| **F\&O Lot Sizes**          | Bundled `LotSize.csv` (Apr / May / Jun 2026 SEBI snapshot); live `client.symbol(...).lotsize` for authoritative value                                                          |
| **Order Constants**         | Exchange / Product / Price-type / Action / Validity / Offset / WS mode / Verbose level, all enums                                                                             |
| **Rate Limits**             | Order APIs 10/sec, smart orders 2/sec, general 50/sec, webhooks 100/min, retry-on-429 helper                                                                                  |
| **Common Workflows**        | 10 end-to-end response-chained recipes covering the canonical patterns                                                                                                         |
| **Error Codes**             | Common SDK errors and step-by-step fixes (invalid key, session expired, lot violation, insufficient margin, etc.)                                                              |

**Examples Catalog (33 Production-Ready Scripts)**

| Folder               | Scripts | Coverage                                                                                                                                                      |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_execution`       | 6       | Equity LIMIT with quote-anchored pricing, ATM straddle with auto-SL, iron condor with margin pre-check, basket rebalance, SL+target workflow, Supertrend live |
| `02_scanners`        | 5       | NIFTY 50 gainers / losers, 20-day breakout (with volume confirmation), RSI oversold, volume surge, pre-open gap                                               |
| `03_visualization`   | 4       | Sector heatmap (treemap), YTD heatmap, OI change histogram, PCR dashboard                                                                                     |
| `04_backtesting`     | 3       | EMA crossover, Supertrend, multi-symbol screener, all with NIFTY benchmark, Indian fees, plain-language reports                                              |
| `05_charting`        | 4       | Candlestick with EMA + Supertrend overlays, option-chain OI, max-pain profile, market-depth ladder                                                            |
| `06_streaming`       | 4       | Basic LTP stream, 20-level depth stream with parquet logging, Telegram alert on price breach, persistent reconnect loop                                       |
| `07_execution_algos` | 7       | Limit chaser, TWAP slicer, iceberg slicer, time-based cancel, price-based cancel-and-replace, conditional bracket, cancel-all-with-alert                      |

#### Prerequisites

**1. AI Coding Agent**

Install any supported AI coding agent. For example:

* [Claude Code](https://docs.anthropic.com/en/docs/claude-code): `npm install -g @anthropic-ai/claude-code`
* [Cursor](https://cursor.com): Desktop IDE with built-in AI
* [Codex](https://github.com/openai/codex): `npm install -g @openai/codex`
* [OpenCode](https://github.com/opencode-ai/opencode): `go install github.com/opencode-ai/opencode@latest`
* [Cline](https://github.com/cline/cline): VS Code extension
* [Windsurf](https://windsurf.com): Desktop IDE with AI
* Or any of the [40+ supported agents](https://github.com/vercel-labs/skills)

Then install the skill:

```bash
npx skills add marketcalls/openalgo-skills
```

**2. OpenAlgo Instance**

Order placement, real-time data, and most other endpoints require a running [OpenAlgo](https://github.com/marketcalls/openalgo) instance:

```bash
git clone https://github.com/marketcalls/openalgo.git
cd openalgo
pip install uv && uv run app.py
```

OpenAlgo runs locally at `http://127.0.0.1:5000` (REST) and `ws://127.0.0.1:8765` (WebSocket). You need a broker account connected via OpenAlgo and an API key from the dashboard. See the [OpenAlgo documentation](https://docs.openalgo.in/) for installation and broker setup.

> **Backtesting-only?** If you intend to use this skill purely for backtesting against Historify market data, you can skip the broker session; just point `HISTORIFY_DUCKDB_PATH` at a populated `historify.duckdb` file.

**3. Python Environment Setup**

```bash
python -m venv venv
source venv/bin/activate           # Linux / Mac
# venv\Scripts\activate             # Windows

# Install TA-Lib C library first (required for the openalgo[indicators] extra)
brew install ta-lib                 # macOS
# sudo apt install libta-lib-dev    # Linux

# Install all Python packages
pip install -r requirements.txt
```

`requirements.txt` ships with:

* `openalgo[indicators]`: SDK + JIT-accelerated `openalgo.ta` indicators
* `python-dotenv`, `pandas`, `numpy`, `duckdb`, `pyarrow`
* `TA-Lib` for standard indicators
* `vectorbt` for backtesting (composes with the [vectorbt-backtesting-skills](https://github.com/marketcalls/vectorbt-backtesting-skills) package)
* `plotly`, `matplotlib`, `seaborn` for charting
* `APScheduler`, `pytz` for scheduled / intraday loops

**4. Configure API Keys**

```bash
cp .env.sample .env
# Edit .env with your OpenAlgo credentials
```

The `.env` file supports:

```
# OpenAlgo REST + WebSocket
OPENALGO_API_KEY=your_openalgo_api_key_here
OPENALGO_HOST=http://127.0.0.1:5000
OPENALGO_WS_URL=ws://127.0.0.1:8765

# Optional: direct Historify DuckDB access (bulk pulls for backtests / heatmaps)
HISTORIFY_DUCKDB_PATH=/srv/openalgo/db/historify.duckdb

# Optional: default strategy tag for order book + analyzer logs
OPENALGO_DEFAULT_STRATEGY=python

# Optional: default alert destinations
ALERT_WHATSAPP_TO=919876543210
ALERT_TELEGRAM_USERNAME=your_openalgo_loginid
```

#### Usage Examples

The skill is single-skill (no slash commands); interact with it through natural language. The agent loads the relevant references and helpers on demand.

**Order Execution**

```
> Place a market buy for 10 RELIANCE on NSE under strategy "python".
> Place an ATM straddle on NIFTY for 30JUN26 expiry with 30% SL on each leg.
> Build an iron condor on NIFTY 30JUN26 with OTM4 short wings and OTM6 long wings.
> Rebalance my portfolio to equal-weight across these 8 symbols.
```

**Custom Execution Algorithms**

```
> Build a limit-order chaser for SBIN: buy 50 shares, peg the bid,
  modify when bid moves up, convert to MARKET after 2 minutes if unfilled.

> Slice 1000 shares of SBIN as a TWAP across 5 children over 5 minutes.

> Run an iceberg buy on HDFCBANK: 200 shares total, show only 25 at a time,
  fixed limit price.

> Place a LIMIT buy at Rs 750 and cancel it if it is not filled in 60 seconds.

> Place a market buy, wait for the LTP to move 0.3% from fill,
  then attach an SL-M at 0.8% below fill.
```

**Scanners**

```
> Show me NIFTY 50 gainers above 1% with volume confirmation.
> Run an RSI oversold scan on NIFTY 100 for RSI(14) <= 30 and downtrending.
> Find symbols with volume >= 3x their 20-day average.
> Show pre-open gap up symbols above 1.5%.
```

**Visualization & Charting**

```
> Render a sector heatmap for NIFTY 50, treemap-style.
> Plot NIFTY's option-chain OI histogram for 30JUN26 expiry, 100-point grid.
> Generate a max-pain chart for BANKNIFTY 30JUN26.
> Show me a candlestick chart for SBIN 5m with EMA 20/50 and Supertrend overlays.
```

**Backtesting (with vectorbt)**

```
> Backtest EMA(10)/EMA(20) crossover on SBIN, daily, 3 years.
> Backtest Supertrend(10, 3) on RELIANCE with realistic delivery fees.
> Run an EMA crossover backtest across NIFTY 50 and rank by Sharpe.
```

**Real-Time Streaming**

```
> Stream LTP for NIFTY, BANKNIFTY, RELIANCE, SBIN.
> Subscribe to 20-level depth for RELIANCE and log every tick to parquet.
> Watch NIFTY and alert via Telegram when it crosses 26000 or 25500.
> Start a persistent quote stream with auto-reconnect.
```

**Alerts**

```
> Send a Telegram alert: "Stoploss hit on BANKNIFTY 58000 PE @ Rs 220".
> Send the daily P&L report to WhatsApp.
> Send the breakout scanner results CSV to my phone.
```

#### Key Features

**Response-Aware Design (The Canonical Chain)**

Every reference doc and example chains endpoints together. The agent knows not just how to _call_ an endpoint, but how to read the response and feed the right field into the next step. The canonical example is automatic SL and target on the actual fill price:

```python
from scripts.workflows import place_with_sl_target

result = place_with_sl_target(
    client,
    strategy="python",
    symbol="RELIANCE", exchange="NSE",
    action="BUY", quantity=10, product="MIS",
    price_type="MARKET",
    sl_pct=1.0,           # 1% below fill
    target_pct=2.0,       # 2% above fill (1:2 R/R)
    alert_via=("telegram", "whatsapp"),
)

print(result.entry_avg_price)   # actual fill, not intended entry
print(result.sl_order_id)        # SL-M placed at fill * 0.99
print(result.target_order_id)    # LIMIT placed at fill * 1.02
```

Under the hood: `placeorder → orderstatus(poll) → data.average_price → compute SL+target → placeorder(SL-M) → placeorder(LIMIT) → alert`. All wrapped in one call. All responses validated.

**Comprehensive Telegram + WhatsApp Alerts**

Pre-built templates for every common event:

| Event              | Template Function             |
| ------------------ | ----------------------------- |
| Order placed       | `fmt_order_placed(...)`       |
| Order filled       | `fmt_order_filled(...)`       |
| Stoploss triggered | `fmt_stoploss_triggered(...)` |
| Target hit         | `fmt_target_hit(...)`         |
| Position closed    | `fmt_position_closed(...)`    |
| Scanner results    | `fmt_scanner_results(...)`    |
| Daily P\&L         | `fmt_daily_pnl(...)`          |
| Error              | `fmt_error(...)`              |

One-call multi-channel dispatch via `notify(client, message, via=("telegram", "whatsapp"))`. WhatsApp supports text, image with caption, and document (PDF / CSV) attachments. Broadcasts up to 5 recipients. All failures degrade gracefully: alert errors never crash the strategy.

**Custom Execution Algorithms: First-Class**

Three reusable execution-algo primitives with full configurability:

```python
# 1. Peg the touch, modify on move, MARKET fallback
from scripts.execution import LimitChaser, ChaserConfig

LimitChaser(client, ChaserConfig(
    symbol="RELIANCE", exchange="NSE", action="BUY",
    quantity=10, product="MIS", strategy="chaser",
    tick_size=0.05, timeout_sec=120, on_timeout="market",
)).run()

# 2. Slice parent into N equal time-spaced children
from scripts.execution import TWAPSlicer, TWAPConfig

TWAPSlicer(client, TWAPConfig(
    symbol="SBIN", exchange="NSE", action="BUY",
    total_quantity=1000, slices=10, duration_sec=600,
    product="MIS", strategy="twap",
)).run()

# 3. Show only display_quantity at a fixed limit
from scripts.execution import IcebergSlicer, IcebergConfig

IcebergSlicer(client, IcebergConfig(
    symbol="HDFCBANK", exchange="NSE", action="BUY",
    total_quantity=5000, display_quantity=500,
    price=1820.00, product="MIS", strategy="iceberg",
)).run()
```

Plus standalone patterns for time-based cancel, price-based cancel-and-replace, and conditional bracket (wait for X% move, then attach SL).

**Direct DuckDB Historify Access**

`client.history(..., source="db")` works via REST, but for bulk multi-symbol pulls or full-lookback backtests, hit the DuckDB file directly:

```python
from scripts.duckdb_data import load_ohlcv, load_multi, resample_ist

# One symbol, full history
df = load_ohlcv("SBIN", "NSE", "2020-01-01", "2026-05-24")

# 50 symbols, one query, wide DataFrame
close = load_multi(NIFTY50, "NSE", "2024-01-01", "2026-05-24", field="close")

# 5-minute bars aligned to NSE 09:15 IST
m5 = resample_ist(df_1min, "5min")
```

Performance: 50 symbols × 1 year of daily completes in \~50ms direct vs \~15s via REST.

**Sandbox / Analyzer Mode**

Iterate without sending real orders to the broker. Toggle at the top of any strategy:

```python
client.analyzertoggle(mode=True)   # simulated
# ... develop / test ...
client.analyzertoggle(mode=False)  # live
```

The SDK returns fake orderids and logs every call to the analyzer log (viewable at `/analyzer`). Sandbox has ₹1 Crore default capital and exchange-aligned auto-square-off.

**Indian-Market Cost Model**

Realistic fees by segment with a Zerodha-style fee table, configurable for any broker:

| Segment           | `fees`             | `fixed_fees` |
| ----------------- | ------------------ | ------------ |
| Equity Delivery   | 0.00111 (0.111%)   | Rs 0/order   |
| Equity Intraday   | 0.000225 (0.0225%) | Rs 20/order  |
| F\&O Futures      | 0.00018 (0.018%)   | Rs 20/order  |
| F\&O Options      | 0.00098 (0.098%)   | Rs 20/order  |
| Currency Futures  | 0.00009 (0.009%)   | Rs 20/order  |
| Currency Options  | 0.00098 (0.098%)   | Rs 20/order  |
| Commodity Futures | 0.00018 (0.018%)   | Rs 20/order  |
| Commodity Options | 0.00098 (0.098%)   | Rs 20/order  |

`scripts/fees.py` exposes `fees_pct(segment)` and `fixed_fees_inr(segment)` for direct use in `vectorbt.Portfolio.from_signals(fees=..., fixed_fees=...)`. `estimate_charges(...)` returns a full breakdown (STT, exchange txn, SEBI, GST, stamp) for live order preview.

**F\&O Lot Sizes (SEBI Snapshot)**

| Index                    | Lot Size (Jun 2026) | Exchange |
| ------------------------ | ------------------- | -------- |
| NIFTY 50                 | 65                  | NFO      |
| Nifty Bank               | 30                  | NFO      |
| Nifty Financial Services | 60                  | NFO      |
| Nifty Midcap Select      | 120                 | NFO      |
| Nifty Next 50            | 25                  | NFO      |

Bundled in `assets/LotSize.csv` (\~200 underlyings, Apr / May / Jun 2026 columns). `client.symbol(symbol, exchange='NFO').data.lotsize` returns the authoritative live value when the snapshot is stale.

**File-Output Convention**

Generated scripts and outputs land in a per-action subfolder, vectorbt-style, created on demand:

```
openalgo_workspace/
├── execution/atm_straddle/         # straddle.py, journal.csv
├── execution_algos/chase_reliance/ # chaser.py, fills.csv
├── scanners/breakout/              # scan.py, results_2026-05-24.csv
├── backtesting/supertrend_sbin/    # backtest.py, equity.html, trades.csv
├── charting/nifty_oi_30jun26/      # chart.py, oi.html
└── streaming/nifty_depth/          # stream.py, ticks.parquet
```

Each subfolder is self-contained, script, generated data, plots, logs. The user can move, share, or `rm -rf` any single experiment without disturbing the rest.

**Rate-Limit Handling**

Order APIs are capped at 10/sec (smart orders 2/sec); general data APIs at 50/sec. The helper layer retries transparently:

```python
from scripts.orders import place_with_retry, modify_with_retry, cancel_with_retry

# 3 retries with widening cooldown (0.5s, 1.5s, 3.5s)
resp = place_with_retry(client, strategy=..., symbol=..., ...)
```

Scanners auto-batch via `multiquotes` (one call for many symbols) rather than looping `quotes`.

#### Project Structure

```
.
├── README.md
├── package.json                       # npm-installable via skills.sh
├── .env.sample                        # API keys + Historify path
├── requirements.txt
└── skills/
    └── openalgo/
        ├── SKILL.md                   # Entry: safety rules, surface table, quick templates
        │
        ├── references/                # 19 parameter-complete deep-dives
        │   ├── order-management.md
        │   ├── order-information.md
        │   ├── market-data.md
        │   ├── symbol-services.md
        │   ├── options-services.md
        │   ├── account-services.md
        │   ├── market-calendar.md
        │   ├── analyzer-services.md
        │   ├── websocket-streaming.md
        │   ├── alerts.md
        │   ├── indicators.md
        │   ├── execution-algos.md
        │   ├── duckdb-historify.md
        │   ├── symbol-format.md
        │   ├── lot-sizes.md
        │   ├── order-constants.md
        │   ├── rate-limits.md
        │   ├── common-workflows.md
        │   └── error-codes.md
        │
        ├── scripts/                   # 16 composable helpers
        │   ├── openalgo_client.py
        │   ├── symbols.py
        │   ├── lotsize.py
        │   ├── orders.py
        │   ├── execution.py           # LimitChaser, TWAPSlicer, IcebergSlicer
        │   ├── responses.py           # Response-navigation extractors
        │   ├── workflows.py           # place_with_sl_target, enter_options_atm_with_sl, ...
        │   ├── option_analytics.py
        │   ├── scanner.py
        │   ├── stream.py
        │   ├── plotting.py
        │   ├── duckdb_data.py
        │   ├── alerts.py
        │   ├── fees.py
        │   ├── ta_helpers.py
        │   └── trade_logger.py
        │
        ├── examples/                  # 33 production-ready scripts
        │   ├── 01_execution/          (6 files)
        │   ├── 02_scanners/           (5 files)
        │   ├── 03_visualization/      (4 files)
        │   ├── 04_backtesting/        (3 files)
        │   ├── 05_charting/           (4 files)
        │   ├── 06_streaming/          (4 files)
        │   └── 07_execution_algos/    (7 files)
        │
        └── assets/
            └── LotSize.csv            # F&O snapshot (Apr/May/Jun 2026)
```

#### Reference Files

| Reference File           | Description                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `order-management.md`    | `placeorder`, smart, options, multi-leg, basket, split, modify, cancel, close, GTT, full request / response          |
| `order-information.md`   | `orderstatus`, `openposition`, polling loop, `data.average_price` extraction                                         |
| `market-data.md`         | `quotes`, `multiquotes`, `depth`, `history`, `intervals`, REST and DuckDB-backed                                     |
| `symbol-services.md`     | `symbol`, `search`, `expiry`, `instruments`, lot sizes, freeze quantities, broker tokens                             |
| `options-services.md`    | `optionsymbol`, `optionchain`, `syntheticfuture`, `optiongreeks`, ATM/ITM/OTM offsets, full Greek chain              |
| `account-services.md`    | `funds`, `margin` (multi-leg), `orderbook`, `tradebook`, `positionbook`, `holdings`                                   |
| `market-calendar.md`     | `holidays(year)` and `timings(date)`, schedule-aware startup                                                         |
| `analyzer-services.md`   | `analyzerstatus`, `analyzertoggle(mode=True)`, sandbox iteration                                                     |
| `websocket-streaming.md` | Modes 1/2/3, depth\_level 5/20/30/50, verbose levels, heartbeat, reconnect                                            |
| `alerts.md`              | `telegram` and `whatsapp` send-only endpoints with full template library and slash-command receiving                  |
| `indicators.md`          | TA-Lib + `openalgo.ta` complete reference with signal-cleaning patterns                                               |
| `execution-algos.md`     | Limit chaser, TWAP, iceberg algorithms, building blocks for custom execution strategies                              |
| `duckdb-historify.md`    | Direct DuckDB schema, single-symbol load, multi-symbol wide load, IST-aligned resampling                              |
| `symbol-format.md`       | Equity / Futures / Options grammar + full index symbol lists (NSE\_INDEX, BSE\_INDEX, GLOBAL\_INDEX, MCX\_INDEX, NCO) |
| `lot-sizes.md`           | F\&O lot-size CSV + live `client.symbol` lookup, validation, sizing patterns                                          |
| `order-constants.md`     | All enum values (exchange, product, price type, action, validity, offset, WS mode, verbose level)                     |
| `rate-limits.md`         | Per-bucket limits, retry-on-429 helper, scanner batching guidance                                                     |
| `common-workflows.md`    | 10 canonical response-chained recipes (order→SL→target, scanner→alert, etc.)                                          |
| `error-codes.md`         | Common SDK errors and step-by-step fixes                                                                              |

####

All three share the same `.env` convention, file-output layout, and Indian-market cost model. You can install them side by side.

***
