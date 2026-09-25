# Agent Configuration

The agent ships with nothing configured. Before it can answer a question you have to register at least one model, give it a credential, and test that credential. All of that happens on one page, `/agent/config`, and every value it holds lives in your own OpenAlgo database.

## Nothing Belongs in .env

Provider, model, credential and policy settings for the agent are database rows, not environment variables. The settings module never reads the process environment, so there is no agent key, no model name and no trading switch to add to `.env`, and nothing to restart after a change.

API keys are stored encrypted at rest in the same database. A key is write only: it is sent once when you paste it and no endpoint ever returns it again, not even masked. What you see afterwards is a fingerprint, the last four characters plus a truncated SHA-256, which is enough to confirm the key that is stored is the one you pasted and not enough to recover any of it.

This is also why the settings page exists at all. Everything on it could be a row edited by hand; none of it should have to be.

## Reaching the Page

Three routes lead to `/agent/config`:

* **Admin.** The Admin page carries an **Agent Config** card, described as "LLM providers and models, API keys, trading switch, and web search". This is the canonical entry point; the agent's settings sit with the other configuration surfaces rather than in the profile menu.
* **The chat header.** A settings control sits beside the model picker on `/agent`, labelled "Agent settings". It is the shortest route from a conversation back to its own configuration.
* **The setup screen.** An unconfigured instance renders a **Configure the agent** button that lands here.

The profile menu carries **Agent**, which opens `/agent` itself, not the settings.

## Before Anything Is Configured

Open `/agent` on a fresh install and you get a setup screen rather than a composer, headed **Set up your agent**:

> Choose a model provider and add its API key to start using the agent. Keys are stored encrypted in your own database and are never written to a configuration file. A local provider is supported if you would rather nothing left this machine.

The chart agent on `/trading` shows the same gate in a narrower form. Both read one status query, so they always agree.

The gate is not decoration on top of a working chat. "Configured" has an exact meaning: one model that is **enabled**, holds the **default**, and whose **last credential test passed**. Until that is true every chat route on the server answers `409` rather than opening a stream, so the setup screen is describing a refusal that is really there. A status call that cannot be answered at all is read as unconfigured, never as an error.

Two further conditions are checked on the server rather than on this page, and each has its own refusal so you are not left guessing which one bit. The `agno` package has to be installed, which a standard `uv sync` handles. And **your OpenAlgo API key has to exist**: generate one at `/apikey`. That is the platform's own key, nothing to do with a model provider, and it is what the agent's tools resolve your user, broker and auth token through. Without it a chat request comes back with "This deployment has no OpenAlgo API key. Generate one at /apikey so the agent's tools can reach the platform." A model can be registered, tested and default and the agent still answer nothing until that key is there.

## The Page Itself

Six sections, in this order:

1. **Models**, the registry of what you have already added.
2. **ChatGPT subscription**, the OAuth sign-in for a Plus or Pro plan.
3. **Trading**, the order switch.
4. **Voice**, the microphone switch, the OpenAI speech key and Vega's settings. See [Voice Agent](voice.md).
5. **Providers**, the browsable catalogue.
6. **Web search**.

A header button, **Add model**, opens the same dialog the catalogue uses, with nothing prefilled.

<figure><img src="../../.gitbook/assets/openalgo-ui-agent-config.png" alt="Agent configuration page"><figcaption></figcaption></figure>

## Choosing a Provider

The Providers section is read live from LiteLLM's own in-package data every time the page loads. There is no catalogue table in the database and no generated list in the frontend, so upgrading the LiteLLM package is the whole maintenance story: new providers and new models appear on their own.

At the version OpenAlgo currently pins that is **93 chat providers**. Twenty four cards are drawn at a time, with a **Show more providers** button and a search box that filters the whole list; the count line under the grid always names the total. The providers a trader actually reaches for lead the grid, and everything else follows in the server's own order.

Each card tells you four things before you commit to it:

* **How many models it lists.** OpenAI alone lists 112 chat models. Fireworks AI lists 295. LM Studio lists none, because a local server publishes no catalogue.
* **Whether it needs a key.** A card marked **no key needed** either authenticates nothing (a self-hosted server) or authenticates with ambient cloud credentials rather than with a string you can paste.
* **Whether it needs a URL.** Ollama, LM Studio, vLLM, Azure and the OpenAI-compatible kinds all address an endpoint you have to name.
* **What you already have.** A **key stored** badge and an **N added** count, both derived from the registry rather than from a second source of truth.

Open a provider and you get its models, one per row, with the context window, the price per million tokens in and out, and a capability badge. That badge matters more than it looks: this agent is entirely tool driven, so a model marked **cannot call tools, so it cannot drive this agent** is greyed out with the reason rather than quietly listed, and a model nobody has priced reads as "price unknown" rather than claiming to be free. A checkbox, **Only models that can call tools**, filters the list down.

If the catalogue does not list the model you want, **Model not listed** and **Add a model by hand** open the same dialog with the name blank. The catalogue is advisory; the registry is your intent.

Local providers are first class. Ollama and an OpenAI-compatible endpoint are both supported, and a private or loopback base URL is accepted deliberately, which is what makes a model that never leaves the machine possible.

## Adding a Model

The Add a model dialog asks for at most six things.

* **Provider kind.** A closed list of five: OpenAI, Anthropic, "Ollama, on your own machine", "OpenAI-compatible endpoint", and "Any other provider, through LiteLLM". The catalogue prefills this.
* **Model name.** Exactly as the provider publishes it. For the LiteLLM kind, include the provider prefix, for example `groq/llama-3.3-70b-versatile`; for the others the bare name is right.
* **Display name.** What the chat picker shows. Suggested from the model name, editable, and optional: left blank, the model name is used.
* **Base URL.** Shown only for Ollama and OpenAI-compatible. It must start with `http://` or `https://`, must not carry a username or password, and cannot be a cloud metadata address.
* **API key.** Shown only for the kinds that authenticate with one. Pasted once, stored encrypted, never shown again.
* **Key applies to.** Either **Every model of this provider** or **This model only**. Provider scope is the default and is what lets one pasted OpenAI key serve every GPT model you register: add a second model of the same provider and the key field can be left blank, and the dialog says so. Model scope is the override for a second account with the same provider, and it wins over the shared key.

A model added this way is registered but not yet usable. It is never made the default at creation.

## Testing a Model

The dialog offers **Test now** the moment a model is registered, and the registry table carries a **Test** button on every row. Take the offer: a mistyped key should be found on the screen where it was pasted, not at your first question.

The test is the cheapest real call the provider allows: one streamed completion capped at a single token, with retries off. It streams because streaming is the only way the agent ever runs a model, so a test that passed on a different code path would be worth nothing.

* **A pass** records the time it took and clears any stored error, and the row's Last test column reads **Passed** with a relative timestamp. If no model currently holds the default and this one is enabled, the first passing test promotes it, because a passing test that leaves the platform unconfigured is a dead end with no obvious next click.
* **A failure** stores the provider's own message verbatim, minus the key itself in case the provider quoted the credential it rejected. That is deliberate: "invalid API key" and "model not found" need different fixes, and a generic failure message helps nobody. A failing test also strips the default from a model that held it, because requests must not resolve to credentials that are known not to work.

Anything that only checks configuration, such as an OpenAI-compatible model registered with no endpoint, fails without a network call and says which field is wrong.

## Enabling a Row and Choosing the Default

The registry table gives every model an **Enabled** switch and a **Default** radio.

Enabled decides whether a model is offered anywhere. The chat model picker lists every enabled row; a disabled one appears in neither the picker nor the default column.

Exactly one model carries the default, and the server enforces it in a single transaction so there is never a moment with two. The default is what a request that names no model resolves to. A row that cannot hold it has its radio disabled with the reason in the tooltip, and the server refuses the promotion as well, so the two agree:

* "Enable this model before making it the default"
* "Test this model before making it the default"

The default governs more than the chat picker's initial selection. **The chart agent on `/trading` has no model picker at all and always runs the default.** Changing the default here changes what that panel talks to, with no other setting involved.

Removing a model warns you when it is the only one, in which case `/agent` goes back to the setup screen, and when it is the default, in which case the server hands the default to another enabled model that has passed a test. Removing a model takes its per-model key override with it; a key shared with the rest of the provider stays, because other models still answer to it.

## Trading

The **Trading** panel is one switch, labelled "Allow the agent to place, modify and cancel orders". **It is off by default.** Until it is on, the order tools are never built into the run's schema at all, so the agent declines to trade rather than asking you to approve anything. Placing, modifying and cancelling are opt-in.

What the switch does *not* do is place anything. Every order tool pauses the run and shows you its exact arguments, and a risk guard runs after you approve. [What the Agent Can Do](capabilities.md) covers that path in full, including the shipped limits.

Where an approved order lands is a separate question, decided by the platform's own analyzer toggle rather than by anything on this page. The panel states the consequence rather than leaving it to be inferred:

> This instance is in live mode, so an order you approve is sent to your broker with real money. Switch the platform to analyzer mode first if you want approved orders to reach the sandbox instead.

On an analyzer instance it says the opposite, plainly: an approved order reaches the sandbox rather than your broker.

The risk limits themselves are settings in the same database, and this page has no panel for them yet. The chart agent on `/trading` is offered no order tools under any setting.

## Reasoning Effort

Reasoning effort is chosen per question, in the composer, next to the model. Four options:

| Option | What it means |
| --- | --- |
| Default | the model's own |
| Low | fastest |
| Medium | balanced |
| High | deepest |

**Default** sends no override at all and leaves the model row's own configured effort in place.

The control only appears for a model that actually reasons. GPT-4 and GPT-4o take no reasoning effort, and the server refuses to send one for them whatever is asked, so offering the menu would be a control that silently did nothing. Select such a model and the menu says so instead: "does not take a reasoning effort. Pick a reasoning model to control how hard it thinks."

Whether a model reasons is resolved against LiteLLM's own capability table, not against a checkbox. The **Supports reasoning** toggle in the edit dialog only fills in for a model LiteLLM has never heard of, such as one served by a local endpoint. That is why the picker and the run never disagree.

In the registry table, the Capabilities column shows **Reasoning** followed by that model's configured default effort for a model that reasons, plus **Vision** and **Tools unreliable** where they apply, and reads **Text and tools** for a model that has none of them.

## Web Search

Web search is **on by default and toggled per conversation**, in the composer's plus menu rather than here. When it is off the composer footer says so, and the turn is given no web search tools at all: the two tool schemas cost input tokens whether or not they are used, so off is also cheaper. What this page owns is which provider answers, the keys, and the budgets.

Three providers are configured on this page, and the routing is the part worth reading, because it is not guessable from a provider list:

* **DuckDuckGo** needs no key, is the default, and answers link searches out of the box. It scrapes rather than calling an API, so it throttles under load.
* **Tavily** needs a key and answers link searches in place of DuckDuckGo once that key is stored. Select it without a key and link searches silently fall back to DuckDuckGo; the panel warns you rather than letting you find out at run time.
* **Perplexity** needs a key and returns a synthesised answer with citations rather than links, so it answers a different tool. Selecting it leaves link searches on DuckDuckGo.

A key is saved, tested and removed per provider, and **Test** works on a key typed but not yet saved. Keys here follow the same rule as model keys: never rendered, blank means keep the stored one.

Two budgets guard the spend. **Searches per turn** accepts 0 to 50 and defaults to 5. **Daily cap** accepts 0 to 10000 and defaults to 200, is counted in the database on the IST date, and resets by the date itself rather than by a scheduled job, because a per-turn budget alone is bypassed by sending another message. A meter shows how many searches are left today. A daily cap of 0 disables web search entirely and says so.

Results returned by a search are treated as lower-trust than the platform's own data, and an answer built on them cites its sources as real links.

## Editing a Registered Model

The edit dialog changes everything about a row except its identity. The provider kind and the model id are fixed: to run a different model, register it instead.

Editable: display name, base URL, API key and its scope, Enabled, Supports reasoning and its default effort, Supports vision, and "Unreliable at tool calling" for a model you have found cannot be trusted with a function call.

Two behaviours are worth knowing before you use it:

* **A blank key field means keep the stored key, never clear it.** The field starts empty even when a key is configured, because a secret is never sent back to the browser, so blank is the state of every edit that was not about the key.
* **Changing a base URL clears the test result and the default status.** The credentials were tested against the old endpoint and say nothing about the new one.

There is no "clear key" action, because there is no route for one. Removing the model removes its per-model override.

## Operational Boundaries

* Provider and model counts, prices, context windows and capability flags all come from LiteLLM's shipped data, not from a live provider API. They move when the package is upgraded, and a model absent from that data can still be registered by hand.
* A passing credential test proves the provider accepted one one-token request. It is not a guarantee of quota, rate limit headroom or of the model's behaviour on a long tool-driven turn.
* A model that cannot call tools cannot drive this agent at all, whatever else it is good at.
* Registered keys cannot be read back from any endpoint or any screen. Losing one means pasting it again from wherever you keep it.
* The voice key is a second, separate credential. It is stored encrypted like every other key here, is never sent back to the browser, and is used only to mint a speech session - the thinking still runs on whichever model you made the default.
* Everything on this page is instance-wide. OpenAlgo is single user per deployment, so there is no per-session or per-surface override of the model, the trading switch or the search budget.
* The agent's own routes are rate limited like the rest of the platform: 30 streamed turns a minute, 12 model tests a minute, and 240 other agent API calls a minute. A throttled request comes back as an error in the page rather than as a redirect.
* With trading on and the platform in live mode, an order you approve reaches your broker with real capital. Test the agent's order path in analyzer mode first.

## See Also

* [Agent](README.md) for the overview and the three surfaces.
* [Voice Agent](voice.md) for Vega, the microphone on `/agent`.
* [ChatGPT Subscription](chatgpt-subscription.md) for the plan billing path, the OAuth sign-in, and which models it covers.
* [What the Agent Can Do](capabilities.md) for the toolkits a registered model is given, and the order path in full.
* [Agent by Example](examples.md) for what these settings look like from inside a conversation.
* [Chart Trading Terminal](../trading-terminal.md) for the chart the docked agent reads and draws on.
* [API Analyzer](../api-analyzer.md) for the platform-wide toggle that decides where an approved order lands.
* [Action Center](../action-center.md) for the platform's other approval queue, which is separate from the agent's own approval pause.
