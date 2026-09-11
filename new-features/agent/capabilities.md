# What the Agent Can Do

The agent is not a chat window bolted onto OpenAlgo. It reaches the same service layer the rest of the platform uses, through a fixed set of tools that fetch their own data. The model decides which tool to call and what to ask it for; it does not supply prices, strikes, expiries or candles. A contract it cannot resolve against the instrument master is refused rather than guessed.

There are 15 toolkits holding 57 tools. Which of them a turn is offered is decided before the model sees anything, by the surface it runs on and by two switches. A withheld tool is absent from the request entirely, so it cannot be called and cannot be talked into being called.

| Surface | Tools offered |
| --- | --- |
| `/agent`, the full page | 47, with trading and web search on |
| `/trading`, the chart panel | 45 |

The chart panel gains ten chart tools that the page does not have, and loses the twelve the page keeps to itself: seven order tools, the general rendering tool, two strategy-writing tools and two Flow tools.

## Market Data and Instruments

Symbol resolution comes first, because every other tool treats a symbol and exchange pair as an exact contract identity. `search_symbols` turns a name or a fragment into listed OpenAlgo symbols. `get_symbol` confirms one contract and returns the lot size, tick size and freeze quantity. `get_expiry_dates` lists the live expiries for an underlying, and it is the only sanctioned source for the date segment of a derivative symbol. A lookup that finds nothing comes back with near matches rather than "not found", so the model corrects itself instead of telling you your instrument does not exist.

For raw numbers there is `get_quote`, `get_quotes` (up to 50 instruments in one call), `get_depth` and `get_intervals`. An index is quoted on an index exchange, so a request for NIFTY on NSE is checked against the symbol database and moved to `NSE_INDEX` when that is what actually resolves. The correction is data driven and only ever moves towards an index exchange.

The answer to "what is RELIANCE at" is `show_instrument`, which draws a full instrument card: the last traded price and the move against the previous close, the day's open, high, low and volume, an intraday price and volume chart, the 52 week range with how far below the high it sits, the top of the order book on both sides, and your own quantity, average price and unrealised profit or loss when you hold it. Every figure is a service call. The card carries no fundamentals, because OpenAlgo has no source for one: there is no price/earnings ratio, market capitalisation, earnings per share or dividend yield anywhere in the platform, and an absent tile is treated as more honest than a placeholder.

Buy and Sell buttons sit at the foot of the card on the chat page, on a tradable instrument. They write an order request into the message box and place nothing: the card itself says nothing is ordered until you send it and approve it. They are absent on an index card, which is quote only, and absent on the chart panel.

## Charts and History

`get_history` computes its summary over every row the service returned and then returns a bounded tail of at most 200 candles, saying how many older ones it dropped. Handing a month of minute bars to a model would spend the whole context answering a question about the last few.

`plot_price_chart` draws a price chart in the conversation using `openalgo-charts` 1.9.2, the same engine `/trading` renders with. The tool fetches the candles itself, so the chart cannot show a bar the platform did not return, and the series never passes through the model's context: you get the chart and the answer gets one line of summary. Both tools can read the broker (`api`) or the local Historify store (`db`).

## Options Analytics

`get_option_chain` returns a window of five strikes each side of ATM by default, up to 100, and asking for every listed strike has to be spelled out. With Greeks requested it inverts implied volatility and prices delta, gamma, theta and vega in one Black-76 pass off a forward derived from the ATM call and put by put-call parity, not off spot, because Indian index futures carry a premium and pricing a chain off the spot last trade biases every delta. `get_option_symbol`, `get_option_greeks` and `get_synthetic_future` cover single contracts and the synthetic.

Four analytics charts are drawn with Plotly, the same engine behind `/strategybuilder` and the option analytics pages:

* `plot_open_interest`, call and put open interest by strike with the put-call ratio. Default 15 strikes each side, maximum 100.
* `plot_gamma_exposure`, net gamma exposure by strike. It prices the Greeks of every listed strike around ATM, so it is slow and is worth asking for only when it is the question.
* `plot_volatility_surface`, a 3D implied volatility surface. At most eight expiries, eight strikes each side by default, 25 at most.
* `plot_combined_premium`, several option legs summed over time.

The combined premium is two different series behind one tool. Name no legs and you get the rolling ATM straddle, where the strike is recomputed from the underlying close on every candle. Name contracts and you get those exact contracts with the strikes held constant, which becomes a directional position as spot moves away. The card says which one it drew. The series is built from closes and drawn as a line on purpose: a combined high is not the sum of the legs' highs, because the legs move against each other and adding them invents a peak that never traded.

`plot_payoff` draws the payoff diagram of an option structure at expiry, from at most eight legs you name, or from your own open positions when called with no arguments at all. It uses the same payoff maths and the same chart as `/strategybuilder`. The card reports maximum profit, maximum loss, the breakevens, and a scenario table at expiry and at T+0. An unbounded loss is rendered as the words "Unlimited loss", because a number there would be a lie about the risk. Cash equity is not on the curve, and the card says so when you hold shares in the same underlying, since a covered call charted without its shares looks like a naked short call.

## Technical Indicators, and the Two Catalogues

This is the part most worth reading twice, because two different indicator libraries are in play and their names only partly overlap.

**The chart draws.** `/trading` renders indicators from `openalgo-charts` 1.9.2, a JavaScript catalogue of **102** indicators: 36 Trend, 29 Momentum, 22 Volatility, 15 Volume.

**The agent computes.** The indicator tools calculate values with `openalgo.ta` from the pinned `openalgo` 2.0.3 SDK, a Rust-backed Python library of **127** indicators: 20 trend, 19 oscillators, 18 TA-Lib extras, 17 volume, 15 volatility, 13 utility, 9 momentum, 9 statistical, 7 hybrid.

**Only 34 ids exist in both.** AlphaTrend and HalfTrend can be drawn on the chart and never tabulated. `adxr`, `crsi` and `beta` can be tabulated and never drawn. A name missing from one list says nothing about the other, and the agent is told to consult the right catalogue before concluding an indicator is unavailable.

The two catalogues also name some shared ideas differently, so the overlap of ids understates the overlap of concepts. Bollinger Bands is `bbands` in the Python library and `bollinger` on the chart, and both exist. If a name is rejected, ask for the other catalogue's spelling before assuming the indicator is missing.

Five tools cover the computing side. `list_indicators` and `describe_indicator` search the catalogue by intent as well as by name, so "bollinger", "trend strength" and "money flow" find `bbands`, `adx` and `mfi`. `compute_indicator` runs one indicator over real candles it fetches itself. `compute_indicators_batch` runs up to eight on one shared candle fetch, so the values line up bar for bar and the broker sees one history request instead of eight. `scan_symbols` screens up to fifteen instruments for a single condition.

Warm-up is padded automatically, which is why asking for the last ten values of `beta` returns numbers rather than ten nulls: it needs 253 bars before its first finite value, `lrslope` needs 101, `crsi` 100 and `adxr` 41. At most 120 values come back per output.

The scan condition grammar is a fixed parser, not an expression evaluator. It accepts a comparison of one output against a number, such as `rsi < 30` or `adx > 25`, or a cross between two outputs of the same indicator, such as `crossover(macd_line, signal_line)`. There is no arithmetic, no `and`, no `or`, and no function other than `crossover`, `crossunder` and `cross`.

## The Chart Surface

Ten tools exist only on the `/trading` panel. The panel reports the chart's symbol, exchange, interval, viewport, indicators and your own drawings with every message, read fresh at send time rather than captured when the panel opened, so no tool here takes a symbol, an exchange, an interval or a date.

* `read_chart` reports what is on screen, including your drawings with their anchors and the exact indicator settings. It fetches nothing.
* `analyse_chart` reports trend, structure and momentum from one candle fetch: the swing sequence, the slope of the fitted rails, the period range, and RSI, MACD, ADX and ATR from the same bars. 60 to 1500 candles, 300 by default.
* `find_patterns` searches for both kinds and marks every hit on the chart. Candlestick: doji, marubozu, spinning top, hammer, inverted hammer, hanging man, shooting star, bullish and bearish engulfing, harami, tweezer top and bottom, piercing line, dark cloud cover, morning and evening star, three white soldiers, three black crows, inside and outside bars. Chart: double top and bottom, head and shoulders and its inverse, ascending, descending and symmetrical triangles, and ranges.
* `draw_levels`, `draw_trendline` and `draw_zone` put support and resistance, rails and demand, supply or consolidation zones on the canvas.
* `list_chart_indicators`, `add_chart_indicator` and `remove_chart_indicator` manage the chart's own indicators.
* `clear_drawings` removes the agent's markup.

Provenance is stricter here than anywhere else in the product, because a level drawn on a chart reads as a fact about the market. No tool accepts a price. Every number reaching the canvas is computed from candles the server fetched. A caption is the one string the model does put on the canvas, so every digit is stripped out of it, along with every character outside letters, spaces and a little punctuation, and what is left is capped at 48 characters. A label can therefore name a zone and cannot state a level.

Everything drawn goes into one of four named groups: `levels`, `trendline`, `zone` and `patterns`. A draw replaces its group rather than stacking a second set on the first, and a clear removes only shapes under the agent's own id prefix. Your own drawings are never touched.

The panel runs the configured default model and has no model picker of its own, and on a vision-capable model the composer can attach a screenshot of the chart. [Agent by Example](examples.md) covers opening the panel and the starter chips above its composer.

If you have written your own chart indicators, they load in the browser at runtime from `strategies/indicators/` and cannot appear in `list_chart_indicators`. `add_chart_indicator` passes an unrecognised id through anyway and the chart accepts or ignores it, so a name absent from the list is worth trying.

## Live Streaming

`stream_quotes` opens a live card for a list of instruments in `LTP`, `Quote` (the default) or `Depth` mode. At most 12 instruments, or 4 in Depth mode, and anything past the cap is dropped rather than refused. `stream_combo` opens a card showing one derived value recomputed on every tick of its legs: a straddle by default, or a strangle, call or put spread, call or put ratio, the synthetic future, or the basis. Expiry can be `current_week`, `next_week`, `current_month`, `next_month` or an exact date, and the result names the date and strike it actually resolved.

Neither tool streams anything itself. Both resolve the instruments against the instrument master, seed a snapshot so the card renders complete on first paint, and hand the subscription to the market data manager the browser already runs. A symbol that does not resolve is named back and left off the card, because a subscription that never ticks looks exactly like a dead feed. Each row shows where its value came from and how old the last tick is, and the card carries the trading session so it can say the market is closed rather than showing a still price as though it were live.

The legs of a combo are pinned when they are resolved. If spot later moves to a different strike, the card says so rather than quietly relabelling itself as a different straddle while you are watching it.

Every instrument on a card is a live subscription held for as long as the message is on screen, and a conversation accumulates messages. That is what the caps are for.

## Account and Books

Seven read-only tools answer "what do I have and what did I do": funds, positions, holdings, the order book, the trade book, one open position, and one order's status. They are offered on every surface. None of them mutates anything, so none pauses for approval.

Every result carries a mode of `live` or `analyze`, read at call time from the same platform toggle the services themselves consult, so a sandbox balance is never reported as a live one. An empty book is an answer rather than a failure: if you hold nothing, you are told you hold nothing.

## Research on the Web

`web_search` returns titles, URLs and snippets. `web_research` returns a synthesised answer with the citations behind it. They are separate tools so that one third-party summary cannot enter the conversation wearing the authority of primary sources. Which provider answers each of them, the keys they need and the per-turn and daily budgets are set on [Agent Configuration](configuration.md).

Web search is **on** by default and is switched off per conversation from the plus menu in the composer. Off is not a preference: the two tools are not built into the request at all, and the line under the composer says web search is off for this conversation.

The query the model asked for never reaches a provider. The outgoing query is constructed so that every token in it is provably a substring of your own message for that turn; when nothing survives, your message is sent verbatim; when there is no operator message to build from, the search is refused. Results come back labelled as third-party content, lower trust than platform data, and the answer cites real links.

## Generated Code

The agent writes OpenAlgo Python in the conversation, in a code block you can copy in one press. Two tools put generated work on disk, and both are chat-page only:

* `save_python_strategy` writes into `strategies/scripts/`, the directory `/python` reads. It **writes a file and stops**: it never starts a strategy, never schedules one and never registers one for automatic start, because a hosted strategy runs as a subprocess with your decrypted API key. Starting it stays a separate, explicit action on `/python`. The source is refused, with the problem named so the model can correct itself, if it does not parse, if it hardcodes a credential, or if it does not read `OPENALGO_API_KEY`, `HOST_SERVER` and `WEBSOCKET_URL` from the environment. `list_python_strategies` reports what is already there so a generated file does not collide with one you have.
* `save_flow` validates workflow JSON against the same validator the `/flow` import endpoint uses, and imports a valid one as an **inactive** workflow. An invalid workflow is never saved, and the toolkit can neither activate nor execute one. `validate_flow` checks without saving.

## Orders, and the Approval Pause

Trading is **off by default**. Read this section before switching it on.

Seven order tools exist, all of them on the chat page only: `place_order`, `place_smart_order`, `modify_order`, `cancel_order`, `cancel_all_orders`, `close_position` and `close_all_positions`.

Every one of them is a human-in-the-loop tool. The run **pauses** on the call and shows a panel reading "This turn is waiting for your approval.", naming the tool and listing its exact arguments. Nothing is sent until you press Approve. Reject ends the call. The pause is enforced by construction rather than by prompt wording: the toolkit refuses to build at all if a tool it registers is not on the confirmation list.

Approval is not the last gate. After you approve, a risk guard runs inside the tool body, before the broker is touched. It reads no prompt, so nothing said in the conversation, in a symbol name or in an earlier tool result can change its verdict. Its checks run in a fixed order: the kill switch, whether trading is enabled, analyzer mode if you have required it, the symbol, the exchange, the product, the quantity, the session order cap, a duplicate-order window, the notional and limit-price deviation, and affordability against available funds. A refusal comes back as the tool's result, so the model reports the reason instead of retrying a rejection as though it were a transient fault.

The shipped limits are 20 orders a session, 10,000 units an order, INR 500,000 of notional an order, 5 percent maximum limit-price deviation, a 10 second duplicate window, and 100 percent funds utilisation. Account-wide destructive operations are **off**, which is why `cancel_all_orders` and `close_all_positions` refuse outright until you turn them on: the refusal is the intended answer, and the agent is told to offer to cancel the specific orders instead.

Where an approved order lands is decided by the platform, not by the agent:

* In **live mode** it goes to your real broker with real money. The config page states exactly that, in a red alert, whenever trading is on and the instance is live.
* In **analyzer mode** it goes to the sandbox instead, and the panel says so.

The kill switch at the head of that check order has two forms, and the second one needs no browser. Besides the stored setting, the guard refuses every order while a **kill-switch file** exists, `agent_kill_switch` in the repository root by default. Create it from a shell and the agent stops trading on the next call; delete it and trading resumes. Nothing else is affected, so reading, charting and analysis carry on.

Orders the agent places carry the strategy name `OpenAlgo Agent`, so they are identifiable in the order book alongside anything else you run. Every mutating call writes two rows to an append-only audit table in the instance's own database, one before the service is called and one after, plus a row for each approve or reject. Two rows rather than one, because an attempt with no matching result is how a call that hung becomes visible. Deleting the conversation does not delete them: they are a trade record and they outlive the conversation the trade was typed into.

**The chart panel offers no order tools at all.** It never asks for trading, so the server never builds one into that run's schema. That is structural, not a matter of wording, and it is why there is no approval prompt on the panel and why the Buy and Sell buttons on an instrument card are withheld there.

## What an Answer Is Allowed to Do

The model is treated as untrusted input, because everything it reads is. Tool output, a symbol name, a broker's rejection text and a web result can all carry somebody else's instructions, and the same conversation that read them writes the answer you are looking at.

So an answer is rendered and never interpreted. Raw HTML in an answer is dropped rather than parsed into elements: a `<script>` or an `<iframe>` the model emits renders as nothing at all, and there is no allowlist to get subtly wrong because nothing is being parsed. Markdown images are blocked outright, not filtered: an image URL is an exfiltration channel, because a model steered by injected content can put a value into a URL and the browser fetches it without anyone clicking anything. Tool arguments and tool results in the turn's timeline are rendered as text for the same reason.

The provenance rules elsewhere on this page belong to the same posture. A chart caption is stripped of every digit, a search query is built only from words in your own message, and no drawing tool accepts a price.

## Operational Boundaries

* Trading is off by default, so a fresh install reaches no order tool at all. Once it is on, what stands between a sentence and a broker is the approval pause, the risk guard and the limits above.
* The agent never decides live versus sandbox. The platform's own analyzer toggle does. Switch to analyzer mode first if you want approved orders to reach the sandbox. See [API Analyzer](../api-analyzer.md).
* OpenAlgo has no fundamentals source, so no tool returns a price/earnings ratio, market capitalisation, earnings per share or dividend yield, and no card shows one.
* Every figure comes from your broker session, so history depth, available intervals, depth levels and entitlements are the broker's, not the agent's. A displayed quote is not a guarantee of execution price.
* Generated work never runs itself. A saved Python strategy is started by you in [Python Strategy Hosting](../python-strategy-hosting.md); an imported workflow arrives inactive and is activated by you in [Flow](../flow-visual-strategy-builder.md).
* The drawing catalogue (102) and the computing catalogue (127) share only 34 ids, and some shared ideas are spelled differently in each. Check the right catalogue, and try the other spelling, before concluding an indicator is missing.
* `vi` and `ulcerindex` return all-NaN on the pinned SDK build and are refused with that reason rather than answering with a column of nulls.
* Caps that shape an answer: 200 history candles returned, 50 instruments a multi-quote, 8 indicators a batch, 15 symbols a scan, 12 live instruments (4 in Depth), 8 payoff legs, 8 surface expiries, 100 option strikes.
* **A single run may make 25 tool calls and then stops.** A question that would need more is answered from what it had rather than looping, so a request that fans out over many instruments is better asked as two questions than as one.
* Web search is the only tool that leaves the machine. Turning it off is the only way to guarantee nothing does. Provider results are third-party content and are labelled as lower trust than platform data.
* The risk limits are agent settings held in the instance's own database. The config page carries the master trading switch, the model registry, the ChatGPT subscription, the provider catalogue and the web search providers; the numeric limits have no panel of their own yet.
* The audit trail is a database table with no screen in the UI. Read it with SQL when you need it.
* An answer is a model's reading of real data. It is not advice, and it is not a substitute for checking the order you are about to approve.

## See Also

* [Agent](README.md) for the overview and the three surfaces.
* [Voice Agent](voice.md) for Vega, the microphone on `/agent`.
* [Agent by Example](examples.md) for prompts that reach the tools above, and what the answers look like.
* [Agent Configuration](configuration.md) for the trading switch, the model registry and the web search providers.
* [Chart Trading Terminal](../trading-terminal.md) for the chart the panel docks to.
* [Analytics and Options Tools](../../analytics-and-options-tools.md) for the standalone versions of the option analytics above.
* [Symbol Format](../../symbol-format.md) for the symbol and exchange vocabulary every tool takes.
