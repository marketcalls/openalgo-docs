# Agent

The agent is a large language model wired directly into OpenAlgo's own service layer. It answers questions about instruments you can actually trade, draws charts from your broker's data, computes indicators over real candles, reads and marks up the chart you have open, and, with your explicit approval on every single call, places orders through the same path the rest of the platform uses.

It runs on your server. The models it talks to are the ones you register, the keys are stored encrypted in this instance's own database, and a local model is supported for operators who want nothing to leave the machine.

## Three Surfaces

`/agent` is the full page. A conversation list sits on the left, the thread in the middle, and the composer at the bottom carries the model picker, the reasoning control, attachments and the web search switch. Conversations persist, so a thread can be closed and reopened later.

`/trading` carries the same agent as a docked panel headed **Assistant**. Open it from the right rail of the charting terminal, where it is the third button under Watchlist and Option chain. The same button closes it again, and so does Escape, as long as the cursor is not in a text box and nothing else is open for Escape to dismiss first. The panel is dragged wider or narrower from its inner edge, and both that width and which panel was last open are remembered for your next visit.

The panel reads the symbol, interval and bars of the focused pane at the moment you press send, so a question about "this chart" is a question about what is on screen rather than about whatever was loaded when the panel opened. In a multi-chart layout it follows the focused pane. It can draw levels, trendlines and zones back onto that chart, and it can be handed a screenshot of the chart itself. Four starter chips fill the composer rather than sending: Analyse this chart, Draw demand and supply, Candlestick patterns, and Read my drawings.

The panel is deliberately narrower in what it offers. It runs whichever model you have registered as the default and shows no model picker, and it is given no order tools at all. Its own empty state says as much: it reads the symbol, interval and bars you are looking at, it can mark up the chart, and it places no orders there.

`/agent` also listens. The microphone in the composer opens a spoken session with **Vega**, which hears the question and reads the answer out while the answer itself still arrives on screen as an ordinary message, with its tool timeline and any chart it drew. It is the same agent on the same tools; only the way you reach it changes. Voice ships off and needs an OpenAI key of its own. See [Voice Agent](voice.md).

`/agent/config` is the configuration screen. It is reachable from the Admin page as **Agent Config**, and from the settings control in the chat header.

## First Run

A fresh install answers nothing until four things are true, and the chat page and the chart panel both show a setup screen rather than a composer until they are.

<figure><img src="../../.gitbook/assets/openalgo-ui-agent.png" alt="Agent setup screen"><figcaption></figcaption></figure>

1. **An OpenAlgo API key exists.** Generate one at `/apikey`. This is the platform's own key, not a model provider's: it is what the agent's tools resolve your broker session through, and without it every chat request is refused with "This deployment has no OpenAlgo API key."
2. **A model is registered** on `/agent/config`, with its provider credential pasted in.
3. **Its credential test has passed.** Press Test on the row; a mistyped key is much better found there than at your first question.
4. **It holds the default.** The first passing test promotes a model when nothing else holds it, so in practice steps 3 and 4 are one press.

"Configured" has exactly that meaning on the server too: one model that is enabled, holds the default, and last tested successfully. Until then every chat route answers `409` rather than opening a stream, so the setup screen is describing a real refusal. [Agent Configuration](configuration.md) walks through each step.

## Order Safety

Read this section before enabling anything.

**Trading is off by default.** On a fresh install the agent is offered no order tools at all, so it declines to trade rather than asking you to approve anything. Placing, modifying and cancelling are opt-in. The switch lives on `/agent/config` under **Trading**, labelled "Allow the agent to place, modify and cancel orders".

An existing install that never touched the setting also picks the new value up on upgrade, so an agent that could trade stops being able to until someone switches it on. An operator who set the switch either way keeps what they set.

**Every order tool pauses for your approval.** There are seven: place order, place smart order, modify order, cancel order, cancel all orders, close position and close all positions. All seven are declared as requiring confirmation, so the run stops before the tool body executes. The conversation then shows an amber block reading "This turn is waiting for your approval.", the exact arguments the model proposed rendered as JSON, and Approve and Reject buttons. Nothing reaches a broker until you press Approve.

**Approval is not the last gate.** A risk guard runs inside the tool body after you approve, and it can still refuse. It reads no part of the conversation, so no wording in a prompt, a symbol name or an earlier tool result can talk it round. It checks quantity, order value, price deviation from the last traded price, a duplicate-order window, allowed exchanges and products, symbol allow and block lists, funds utilisation, a bulk-destructive switch and a kill switch. [What the Agent Can Do](capabilities.md) lists the checks in the order they run, with the shipped limits.

**Where an approved order lands is decided by the platform, not by the agent.** In live mode it goes to your broker with real money, and the Trading panel states that in a red warning. Switch the platform to [Analyzer mode](../api-analyzer.md) if you want approved orders routed to the sandbox instead.

**The chart panel never asks.** It requests no trading capability, so the backend never builds an order tool into its schema. There is no approval prompt on that panel because there is nothing there to approve.

Every mutating call writes an audit row before it runs and another when it finishes, so a call that hung or a worker that died mid-order is visible as an attempt with no result.

## What It Can Do

The agent is entirely tool-driven. Tools are grouped into toolkits, and which toolkits a run is offered depends on the surface and on the switches above. In summary:

* symbol search, contract lookup and expiry dates;
* quotes, market depth, historical candles and supported intervals;
* an instrument card with the day's move, an intraday chart, the 52 week range, the order book and your own position in the name;
* funds, positions, holdings, order book, trade book and order status, all read-only;
* option chain, strike resolution, Greeks and the synthetic future;
* payoff diagrams and combined option premium charts;
* price charts drawn with the same `openalgo-charts` library the `/trading` terminal uses;
* indicators computed by the Rust-backed `openalgo.ta` library, several in one call, or a list of instruments screened for one condition;
* reading the open chart on `/trading`, analysing trend, structure, momentum and patterns, and drawing levels, trendlines and zones onto it, plus adding and removing chart indicators;
* live streaming quote cards the browser subscribes to, and derived values such as an ATM straddle recomputed on every tick;
* general data cards: bar, line, area and pie charts, tables and metric callouts;
* web search for links, and cited web research;
* generated Python written into `strategies/scripts/` for the [Python Strategy Host](../python-strategy-hosting.md), never started automatically;
* validated [Flow](../flow-visual-strategy-builder.md) workflow JSON, imported as an inactive workflow;
* the seven order tools, on the chat page only, each behind the approval pause above.

Prices in a drawn chart come from the tool that fetched them, not from the model. See [What the Agent Can Do](capabilities.md) for the detail, and [Agent by Example](examples.md) for prompts that produce each of these.

## Models and Providers

Nothing about providers or models is stored in the database as a catalogue. The list is read from the installed LiteLLM package every time the process starts, so upgrading LiteLLM brings new providers and models with it and there is no table to regenerate.

On the pinned build the provider catalogue on `/agent/config` lists **93 providers**, and OpenAI alone lists 112 chat models. Each card shows how many models that provider offers and whether it needs an API key, a base URL, or neither.

`supports_function_calling` is load-bearing rather than decoration. The agent is entirely tool-driven, so a model that cannot call a function cannot drive it at all, and the catalogue surfaces that on every model.

Local providers are first-class. Ollama and a generic OpenAI-compatible endpoint both need a base URL and no key, which covers a model running on the same machine or on your own network.

A **ChatGPT Plus or Pro plan is a second billing path, not a second key**. `openai/gpt-5.4` authenticates with a key you paste and spends OpenAI API credits; `chatgpt/gpt-5.4` authenticates with an OAuth sign-in and spends your plan. The same bare model name reaches two different bills, which is why the UI badges the billing path everywhere a model is named. See [ChatGPT Subscription](chatgpt-subscription.md).

## Composing a Question

Two controls sit in the composer beside the model name, because both belong to the question being asked rather than to a settings page.

**Reasoning effort** offers Default, Low, Medium and High, described in the UI as the model's own, fastest, balanced and deepest. It only appears for models that actually reason.

**Web search** is on by default and switched off per conversation from the composer's plus menu. Off does not mean "prefer not to search": the search tools are not put in the request at all.

Providers, keys, budgets and the effort a model row defaults to are set on [Agent Configuration](configuration.md).

## Where the Configuration Lives

Every agent setting is a row in this instance's own database. **Nothing about the agent is read from `.env`**, which is why there is a configuration screen for it at all: a provider, a model, a key or a limit can be changed from the UI and takes effect on the next request with no restart.

Six tables carry it: the models you have registered, the encrypted secrets, the settings, the conversations, the messages, and an append-only audit of every mutating tool call.

API keys are encrypted with Fernet using the same cipher the platform already uses for broker tokens, and they are **never shown again after entry**. What the UI shows instead is a fingerprint, which is enough to tell two keys apart and not enough to recover one. See [Agent Configuration](configuration.md) for the walkthrough.

## Working in a Conversation

* Conversations persist and can be reopened from the list. Starting a new chat creates nothing until the first message is sent, so an abandoned thread leaves no empty row behind.
* A question can be edited in place. The edit replaces the answer below it and everything after.
* An answer can be copied, a failed turn can be retried, and a running turn can be stopped.
* Files and images can be attached by clicking, dragging or pasting, on vision-capable models. On the chart panel the same menu also offers Attach chart screenshot.
* The tool calls a turn made are shown as a collapsed timeline you can open to read the arguments and the result of each one.
* Each turn reports its token usage and its cost. A model with no published price renders a dash rather than `$0.00`, because unknown is not zero. A turn that ran on a ChatGPT plan reports tokens and reads "included in your ChatGPT plan", because plan quota was consumed rather than nothing being spent.

[Agent by Example](examples.md) covers all of this with what each control actually does.

## What It Is Not

* It is not a strategy that runs on its own. It answers a question you asked and stops. Scheduled, unattended execution belongs to the [Python Strategy Host](../python-strategy-hosting.md), [Flow](../flow-visual-strategy-builder.md) and the [Strategy RMS Engine](../strategy-rms-engine.md).
* It is not a backtester and it is not the [MCP server](../../mcp/README.md), which exposes OpenAlgo to an external AI client rather than hosting one.
* It is not a second order pipeline. Approved orders go through the platform's normal service layer, subject to the same analyzer routing and the same broker.

## Operational Boundaries

* Until a model is registered, enabled and has passed a credential test, the chat page and the chart panel both render a setup screen instead of a composer. A status call that cannot be answered is read as not configured.
* The `agno` and `litellm` packages are required. They are pinned dependencies, so a standard `uv sync` install has them.
* Model and provider availability, context windows, pricing and vision or reasoning support are whatever the installed LiteLLM build reports. The catalogue is advisory: a model missing from it can still be added by hand, and the model test on the configuration page is what answers for a particular account.
* The agent sees the same market data your broker gives the rest of the platform. Historical range, live fields and depth levels depend on the active broker and account entitlement.
* A quote, an indicator value or a drawn level is analysis, not a guarantee of execution price.
* The chart panel is offered no order tools regardless of the trading switch. An order request belongs on `/agent`.
* Prompts, attachments and tool results are sent to whichever model provider you configured. A local provider is the only configuration in which nothing leaves the machine.
* Voice is off until you enable it and add an OpenAI key, and spoken orders are off separately. A spoken approval is only as private as the room you are in.
* Test with the platform in Analyzer mode before letting the agent approve orders against live capital.

## In This Section

* [What the Agent Can Do](capabilities.md) covers every toolkit in detail: what the agent can read, draw, compute and write, and the order path in full.
* [Agent Configuration](configuration.md) covers `/agent/config`: registering a model, storing a key, the trading switch, reasoning effort and web search.
* [Voice Agent](voice.md) covers Vega: the microphone on `/agent`, what speaks and what thinks, spoken orders and what an open session costs.
* [ChatGPT Subscription](chatgpt-subscription.md) covers running the agent on a ChatGPT Plus or Pro plan instead of an API key.
* [Agent by Example](examples.md) is a set of worked prompts with what each one actually returns.
