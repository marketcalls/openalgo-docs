# Agent by Example

This page is a set of prompts that work, and what each one gives back. Every example here was typed into a running OpenAlgo instance and the description is of what actually came out. Start at the top: the first two sections cover what most people try first.

Type into the box at the bottom of `/agent`, which prompts you to "Ask about your positions, a symbol, a strategy or a workflow". Enter sends and Shift with Enter starts a new line, except while an input method editor is mid-composition, where Enter commits the composition instead. The same box, narrower, sits on the right of `/trading` under the heading "Assistant".

## Quotes and Instruments

```
get the stock price of reliance
```

One tool call, and the answer is a card rather than a sentence: the symbol with its exchange and instrument type, the company name and lot size, the last price with the change and percentage from the previous close, an intraday chart, the day range, the 52 week range and how far price sits below the 52 week high, open, high, low, previous close, volume, bid, ask and spread, and five levels of the order book. Under it are Buy and Sell controls, captioned "Writes the request into the message box. Nothing is ordered until you send it and approve it."

You do not need to name the exchange for a well known equity. Name it when the symbol is ambiguous, as in `get the stock price of infy on NSE`.

A card that is streaming carries a LIVE badge. Reopen the conversation tomorrow and the same card re-reads market data on the spot, so it will read DELAYED with "Not ticking. Last read ...", or CLOSED with "Market closed. Last read ...". It never shows a stale number without saying so.

## Charts and History

```
plot the last 10 days of RELIANCE
```

A candlestick chart drawn with the same charting library as `/trading`, captioned with the bar count and the date range it actually covers. Asking for 10 days across a normal week returns 8 bars, and the answer says so: "covering 26 Aug to 4 Sep 2026 (8 trading sessions)". It does not invent two sessions to match the number you asked for.

Ask for the interval by name, because the default is daily: `plot RELIANCE 15 minute candles for the last 3 sessions`.

## Indicators

```
reliance hourly with supertrend 3,10 and macd in table format
```

A ten row table with Time, Close, Supertrend, Trend, MACD, Signal and Histogram, timestamped in IST, followed by two sentences reading the result. The indicators are computed by `openalgo.ta` over real candles the tool fetched, so the numbers are the platform's own rather than the model's arithmetic.

Two things in that prompt are doing work. "3,10" gives the parameters, so the answer states which it used rather than picking one silently. "in table format" is what turns a paragraph into a table; ask for it whenever you want to read values rather than a conclusion.

## Options and Payoffs

```
show me the NIFTY option chain 3 strikes either side of ATM
```

The chain as a table of Strike, CE LTP, CE OI, PE LTP and PE OI with the ATM row marked, preceded by a line naming the expiry it resolved to, the spot and the lot size. Say "monthly expiry" or name a date if you do not want the nearest one.

```
payoff graph of a NIFTY short straddle
```

A payoff card. The legs are listed first with side, lots, the full contract symbol and the premium each was priced at, then a strip of net credit, both breakevens, maximum profit and maximum loss, then the curve itself with an expiry line and a T+0 line, the spot marked, and a shaded one and two standard deviation band. Under the chart is a scenario table of underlying price against profit at expiry and at T+0. Maximum loss on a short straddle reads "Unlimited loss" rather than a number.

The tool resolves the strikes and prices the legs itself. You can pin them instead: `payoff for NIFTY 08SEP26 23950 CE short and 23950 PE short, 1 lot each`.

## Live Streaming

```
stream me live prices for RELIANCE, INFY and TCS
```

A Live Quote card holding all three, each row with last price, change, open, high, low, previous close, volume, bid and ask. The card subscribes your browser to the feed and updates in place. Each row is labelled with how fresh it is: "TICK 2M AGO" for one that is ticking, or "SNAPSHOT" with a timestamp for one that is not.

The card as a whole carries the state of the feed behind it and says what that state means in a line underneath: LIVE while ticks are arriving, POLLING when the socket is gone and the values are coming from REST polls instead, CLOSED when the session is shut ("Market closed, so these are the ... snapshot values"), and NOT CONNECTED when there is no feed at all. Off screen or past the live-card limit it stops streaming on purpose and offers you the way back. It never shows a still price as though it were a moving one.

## Web Research

```
what did the RBI decide at its latest meeting
```

The answer names the meeting and its dates, lists the decisions, and ends with its sources as real links you can click. It also attributes rather than asserts: "according to the research provider". Web results are treated as lower trust than the platform's own data, and the answer is written that way.

Web search is on by default and lives in the "+" menu at the left of the composer. Turn it off there for a conversation that should stay on your own data; the search tools are then not built into the request at all, and the composer says "Web search is off for this conversation."

## Generating a Strategy Script

```
write a python script to fetch SBIN history
```

A Python code block, labelled with its language and carrying a Copy control, with no line numbers and no inner scroll box. It uses the `openalgo` SDK (`from openalgo import api`), reads the API key and host from environment variables rather than hard coding them, and opens with a comment naming a path under `strategies/scripts/`.

Generating a script and installing one are separate steps. The agent can write the file into `strategies/scripts/` only if you approve that call, and it never starts what it writes. See [Python Strategy Hosting](../python-strategy-hosting.md) for what happens to a script once it is there.

## Reading an Answer

A turn is more than the paragraph at the end of it, and three parts of what you see are worth knowing.

**Thinking, then tokens.** While nothing has arrived yet the turn shows a "Thinking" indicator. On a model that emits its reasoning, a collapsed **Reasoning** block appears above the answer; open it to read what the model worked through, or leave it shut, which is the default.

**The tool calls.** Every turn that touched a tool carries a collapsed timeline saying how many calls it made and, while it is running, which one is running now. Open it and you get one named row per call with the time it took, and each row expands to the arguments it was given, as formatted JSON, and the result it returned. Nothing in there is treated as markup: every value is rendered as text, so a tool result carrying HTML or somebody else's instructions is displayed rather than acted on. This is where you check that a number in the answer came from a tool and not from the model.

**Stop.** While a turn runs the send button becomes a stop button, and the line under the composer says "Running. Stop ends the turn on the server, not just here." That distinction matters: a run you merely stopped watching would still be running and still be billed.

## The Chart Agent on /trading

Open it from the right rail of the charting terminal: the third button, under Watchlist and Option chain, labelled **Assistant**. Press it again or press Escape to close it, drag its inner edge to change the width, and both the width and the fact it was open are remembered next time.

The panel reads the chart you are looking at: its symbol, its interval, its bars and your own drawings. It reads them at the moment you press send, so change the symbol first and then ask. In a multi-chart layout it reads the focused pane, so click the pane you mean before asking about it.

Four chips sit above the box: Analyse this chart, Draw demand and supply, Candlestick patterns, Read my drawings. A chip fills the box, it does not send, so you can narrow the question before you commit.

```
Draw the demand and supply zones on this chart.
```

Two boxes appear on the real chart, labelled demand and supply, and the answer names the price band of each and the swing it came from with its IST timestamp: "Demand: 429.65 to 431.40, from the 13:05 IST swing low." The prices come from the candles, not from the model. They are ordinary drawings once placed, and `clear the zones you just drew` takes them off again.

The panel has no model picker; it runs whichever model is your configured default. It also has no order tools at all, which is why its empty state says "It places no orders here." Its thread is not the same thing as a conversation on `/agent`: it starts fresh when you reload the page and does not appear in the `/agent` conversation list.

## Placing an Order

Order tools are only ever offered on `/agent`, never on the chart panel.

```
buy 1 share of RELIANCE on NSE at market, MIS
```

The run stops. In place of an answer you get an amber panel reading "This turn is waiting for your approval.", the name of the tool it wants to call, the exact arguments it wants to call it with, and two buttons:

```
place_order
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "action": "BUY",
  "quantity": 1,
  "product": "MIS",
  "price_type": "MARKET"
}
```

Nothing has been sent. No order exists anywhere. Read the arguments, because they are the order, and the only thing between them and your broker is the button you press next.

Press Reject and the run resumes with "Order not placed. You rejected the approval for this order:" and a summary of what it did not do. Press Approve and the tool runs, the risk limits are checked inside it, and the order goes wherever the platform is pointed.

That last part is the one to be sure of before you approve anything. With the platform in live mode, an approved order is sent to your broker with real money. With the platform in analyzer mode, an approved order reaches the sandbox instead. The `/agent/config` trading panel states whichever of the two applies to your instance. Every order tool behaves this way: placing, modifying, cancelling, cancelling all, closing a position and closing all positions each pause for approval, individually, every time.

## Getting Better Answers

* **Name the exchange when the symbol is ambiguous.** "SBIN on NSE" resolves in one step; a bare symbol that exists on two exchanges costs a round trip and may resolve to the one you did not mean.
* **Ask for a table when you want values.** "in table format" is the difference between a paragraph summarising a trend and ten rows you can read down.
* **Give indicator parameters in the prompt.** "supertrend 3,10" is answered with those; "supertrend" is answered with a default the answer then has to tell you about.
* **Turn web search on for anything current**, and off for anything that should come only from your own platform.
* **Raise the reasoning effort for analysis, not for lookup.** The control sits beside the model name in the composer: Default is the model's own, Low is fastest, Medium is balanced, High is deepest. A price lookup gains nothing from High; reading a chart's structure or weighing an options position does. The control appears only on models that take a reasoning effort.
* **Ask two questions rather than one enormous one.** A run stops after 25 tool calls, so a sweep across a long list of instruments is better split than crammed into a single prompt.

## Conversation Mechanics

**The list on the left.** A thread is titled from the first 80 characters of your first message, and the rows are ordered by when each was last used. New chat creates nothing until you send something, so an abandoned thread leaves no empty row. The list collapses out of the way with the control at its top. Opening a thread, deleting one and New chat are all disabled while a turn is running, because switching thread mid-answer would discard the answer.

**Delete.** The bin on a row asks first, and says what it does: the conversation and every message in it go, and it cannot be undone. Audit rows for orders are kept, because they are a trade record and they outlive the conversation the trade was typed into.

**Edit a question in place.** Hover a question you have sent and a pencil appears. The bubble becomes a text box with Cancel and Send, and a note saying "Sending replaces this message and discards the reply below it." That is exactly what happens: change "reliance" to "infy", send, and the RELIANCE answer is gone, replaced by an INFY one. There is no confirmation dialog, because the note is the warning.

**Retry and copy.** Hover an answer for a copy control and, on a turn that failed, a retry control that asks the last question again. Copy takes the raw text of the answer, not the rendered page.

**Attach files.** Use "Attach files" in the "+" menu, drag a file onto the composer, or paste one straight from the clipboard, which is how a screenshot gets in. Up to 4 files per turn, 4 MB each and 8 MB in total, covering PNG, JPEG, GIF and WebP images and plain text, CSV, TSV, Markdown, JSON, Python, XML and HTML. A text file over 20,000 characters is refused with its size named rather than quietly truncated. Attachments are replayed into context on later turns of the same conversation, which is the reason for the caps. On a model that cannot see images, attaching is withheld and the menu says so, naming the model.

**Attach the chart itself.** On `/trading` only, the "+" menu also offers "Attach chart screenshot", which photographs the pane your question is about. The chat page has no chart, so it does not offer this.

**Every turn is costed.** Under each answer is its token usage, and the header carries the running total for the whole conversation. A turn billed to an API key shows a dollar figure. A turn that ran on a ChatGPT Plus or Pro plan reads "included in your ChatGPT plan", because it consumed plan quota rather than being free. A model with no published price shows a dash. None of the three ever renders as `$0.00`.

**Conversations persist.** They reopen with their cards, charts and tables intact. The model is given the last eight turns of the thread as context rather than all of it, so a very long conversation will not remember its own beginning; say the thing again, or start a fresh thread for a fresh subject.

## Operational Boundaries

* Prices, chains, candles and depth come from your broker and your entitlement. Nothing on this page changes what your account is allowed to see.
* An intraday card, a live stream and an option chain are only as current as the feed behind them. The cards say when they are not streaming; believe the label rather than the number.
* An approved order is a real order in live mode. Approval is the only gate, and it cannot be turned off for individual tools.
* The chart panel is offered no order tools, so nothing typed into it can place an order. Order requests belong on `/agent`.
* Web search results are third party text. The agent labels them and cites them so you can check them, which is worth doing before acting on one.
* A generated script or workflow is a draft for you to read. Nothing generated starts itself.
* Answers depend on the model you have configured. A cheaper or older model will call fewer tools and read the results less carefully than the examples above.

## See Also

* [Agent](README.md) for the overview and the three surfaces.
* [Voice Agent](voice.md) for Vega, the microphone on `/agent`.
* [What the Agent Can Do](capabilities.md) for the full tool list and the order path.
* [Agent Configuration](configuration.md) for models, keys, the trading switch and web search.
* [ChatGPT Subscription](chatgpt-subscription.md) for the plan billing path.
* [Chart Trading Terminal](../trading-terminal.md) for the chart the panel sits beside.
