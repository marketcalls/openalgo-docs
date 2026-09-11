# ChatGPT Subscription

A ChatGPT Plus or Pro plan can drive the OpenAlgo agent instead of an OpenAI API key. This is a second billing path, not a second key. The same model name exists on both paths and bills differently:

| Model id you register | How it authenticates | What it spends |
| --- | --- | --- |
| `openai/gpt-5.4` | an API key you paste | your OpenAI API credits |
| `chatgpt/gpt-5.4` | an OAuth sign-in | your ChatGPT Plus or Pro plan |

Of the ten `chatgpt/` models LiteLLM lists, eight share a bare name with an OpenAI API model. Only `gpt-5.3-instant` and `gpt-5.3-codex-spark` exist on the plan path alone. So two rows in your model registry can both read GPT-5.4 and send the bill to two different places, and the only thing separating them is the prefix on the stored model name. Everything described below exists to make that difference visible before you send a question rather than after.

## When to Use Which

Use the plan path for high-volume, routine work: repeated chart reads, option chain questions, indicator tables, anything you run many times a day. Those turns come out of quota you have already paid for.

Use an API key when you need a model the plan does not serve. New frontier models reach the API first, and the plan catalogue lags it. The plan is a way to move volume off metered billing, not a replacement for a key.

A plan turn is never free. It consumes plan quota, which is why OpenAlgo reports it as tokens with no cost rather than as `$0.00`.

## Where the Panel Is

The ChatGPT subscription panel lives on `/agent/config`, the agent configuration page. Reach it from the admin section, where it is the **Agent Config** tile, or from the settings control in the `/agent` chat header.

On that page the panel is the second section, directly under the registered models table and above the trading switch and the provider catalogue. It is titled **ChatGPT subscription**.

## Connecting a Plan, Step by Step

1. Open `/agent/config` and find the **ChatGPT subscription** card. When no plan is connected it says so, and offers one button: **Connect ChatGPT plan**.
2. Press it. OpenAlgo makes a single request to OpenAI's device endpoint and comes straight back with a short code. It does not hold the request open.
3. The panel now shows **Your code** in large type, a **Copy code** button, an **Open the sign-in page** button, and a live countdown reading `Expires in m:ss`.
4. Press **Open the sign-in page**. It opens a new tab on OpenAI's own site, at the Codex device authorisation page. This is the Codex device flow, not the ChatGPT web app sign-in.
5. Sign in there with the account your ChatGPT plan belongs to, and enter the code when it asks for one. **Your ChatGPT password and any second factor go to OpenAI in that tab and never pass through OpenAlgo.** OpenAlgo only ever sends the device identifier and the code back to OpenAI while it polls, and receives the resulting token.
6. Come back to the OpenAlgo tab. The panel polls every couple of seconds and notices on its own, including while the tab is in the background, so you do not have to refresh anything.

A code is accepted for about fifteen minutes and then stops working. If the countdown runs out, the panel says the code was not entered in time and offers **Try connecting again**, which issues a fresh one. **Cancel sign-in** stops a sign-in you no longer want.

One security note the panel makes itself: nobody but you should ever be asked for that code. If anything other than OpenAI's own device page asks you to enter it, cancel instead.

## If the Sign-In Page Asks You to Log In First

If the browser you open the device page in has no ChatGPT session, OpenAI asks you to sign in, or to create an account, before it will show the code prompt. That is the page doing its job, not a broken feature, and it is why step 5 above is a step of its own.

Sign in there with the account the plan belongs to, then use the code that is still on the OpenAlgo panel. It stays valid for the full fifteen minutes, and the panel is still polling for it.

Do not reach for Cancel and Connect as the first move. One sign-in runs at a time, and the device endpoint applies a five-minute cooldown after issuing a code, so pressing Connect again inside that window hands you back the code you already have rather than a new one. Start over only once the countdown has actually expired.

## What Connected Shows

Once the code is approved, the card title gains a **Connected** badge and the panel lists four things:

* **Credential**, a fingerprint, in the same form an API key row shows: the last four characters and a truncated SHA-256. The token itself is never rendered, not masked and not partial. The fingerprint is taken over the durable half of the credential, so it stays the same identifier after a routine token refresh.
* **Account**, the OpenAI account id the plan belongs to, when the record names one.
* **Access token expires**, a local date and time, followed by "It is refreshed on its own." You do not have to do anything when it passes.
* **Stored**, where the credential lives. Normally "Encrypted in this instance database, and cached for LiteLLM in" followed by the cache directory under `db/chatgpt_oauth`. The database copy is the record of truth and the file is a cache rebuilt from it, so a restored database is already authorised.

Two buttons sit below: **Sign in again**, which is how you move this instance to a different ChatGPT account, and **Disconnect**.

## Adding a Plan Model

Connecting the plan does not register a model. Do that from the same page:

1. Scroll to **Providers**. The ChatGPT provider is not one of the pinned cards, so use the provider search box or **Show more providers** to find the card named **ChatGPT**. It carries a `runs on your plan` badge instead of the key badges the other providers show.
2. Open it. A notice at the top reads "These bill to your plan, not to API credits", and repeats that most of these models also exist under OpenAI with the same name and a per-token price.
3. Pick a model and add it. The dialog offers no API key field for a `chatgpt/` model, because there is no key to give: its credential is the sign-in you just made. The model is stored with its `chatgpt/` prefix intact and its provider kind is LiteLLM.
4. The suggested display name is **ChatGPT Plan: GPT-5.4** rather than GPT-5.4. The billing path leads because that is the half you scan for when two rows share a model name, and because the model column is the one most likely to truncate. The name stays editable.
5. Press **Test** on the new row. The test is a real one-token streamed completion against the provider, so it answers the only question that matters: whether your account can actually run that model. A refusal is stored verbatim and shown in the row's detail.

## Telling the Two Paths Apart

Once a plan model is registered, the billing path is labelled everywhere the model is named:

* In the models table, a `ChatGPT plan` badge sits next to the model id, and the Key column reads the plan fingerprint with "your ChatGPT plan sign-in" under it. Before a plan is connected it reads "No plan connected yet" instead.
* In the composer's model button, the word `on plan` appears next to the model name. That button is the last thing you see before sending a question.
* In the model menu, each plan row carries the same `ChatGPT plan` badge.
* Under the answer, the usage line reports tokens as usual and then, in place of a price, the words `included in your ChatGPT plan`. Not `$0.00`, which would claim the turn was free, and not the dash used for a model whose price is unknown. A conversation held entirely on the plan says so instead of showing a running total.

If a plan model is the registry default, it is also what the chart agent panel on [`/trading`](../trading-terminal.md) runs, because that panel always uses the default model and offers no picker of its own.

## Which Models the Plan Serves

LiteLLM lists ten models under the `chatgpt` provider. OpenAlgo registers four more that LiteLLM omits, measured against a real subscription, because a model missing from LiteLLM's registry is routed to the wrong endpoint and comes back as a Cloudflare interstitial rather than an answer. That is fourteen models offered on the ChatGPT provider card.

| Measured against a live plan | Models |
| --- | --- |
| Listed by LiteLLM | `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.3-chat-latest`, `gpt-5.3-instant`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini` |
| Added by OpenAlgo | `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-luna`, `gpt-5.6-terra` |
| Refused by the backend on a plan | `gpt-5.6`, `gpt-5.6-cyber`, `gpt-5.5-pro`, `gpt-5.5-codex`, `gpt-5.6-codex` |

`gpt-5.6` being refused while three of its variants work is how the backend behaves, so the list is enumerated rather than derived from a pattern.

Treat the catalogue as advisory. These are the models the provider serves; which of them a particular plan may use is between you and OpenAI, and a Plus plan need not match a Pro one. The **Test** button on the model row is what answers for your account.

## Signing Out, and a Lapsed Plan

**Disconnect** asks for confirmation first, and the dialog says what it does: the stored credential is deleted and cannot be read back, so reconnecting means signing in again. Any model you registered under `chatgpt/` stays in the registry and stops working until you do, which is why those rows are not removed for you. That is deliberate: the rows are your configuration, and you probably want them back the moment you sign in again.

The same applies when a subscription lapses rather than being disconnected. The model row stays, and the plan behind it does not. A `chatgpt/` model with no usable credential is refused before the first token of the answer, with a message telling you to sign in to ChatGPT from agent settings, rather than being allowed to start and fail halfway. Press **Test** on the row to see the provider's own reason.

## Operational Boundaries

* A plan turn reports tokens and no cost. It is neither free nor unpriced: it consumed quota you pay for monthly, and there is no per-token price to show.
* A plan is not an entitlement. Model availability is decided by OpenAI for your account, and the newest frontier models reach the API before the plan.
* Nothing here is read from `.env`. The credential is encrypted in this instance's own database and cached in `db/chatgpt_oauth`, which Docker mounts as a volume.
* The panel needs a LiteLLM new enough to carry its ChatGPT provider. On an older one the panel says this server cannot answer for a ChatGPT plan yet, and offers **Try again**. Every other model on the page is unaffected.
* One sign-in runs at a time. Pressing Connect while a code is outstanding returns the code already on screen rather than issuing a second one.
* The billing path changes nothing about order safety. Every order tool still pauses for your approval whichever model proposed it. See [Agent](README.md) for that path, and [Analyzer mode](../api-analyzer.md) for where an approved order lands.

## See Also

* [Agent](README.md) for the overview and the three surfaces.
* [Voice Agent](voice.md) for Vega, the microphone on `/agent`.
* [Agent Configuration](configuration.md) for the rest of `/agent/config`: registering a model, storing an API key, the trading switch and web search.
* [What the Agent Can Do](capabilities.md) for the toolkits a plan model is given, which are the same ones any other model gets.
* [Agent by Example](examples.md) for what a plan turn looks like in a conversation.
