# Voice Agent

Vega is the agent with a microphone. You press the mic in the composer on `/agent`, speak, and the answer comes back out loud while it also lands on screen as an ordinary message, with its tool timeline and any chart it drew.

It is not a second agent. It is the same one, on a third surface, answering through the same tools, the same limits and the same audit trail as a typed question.

{% embed url="https://www.youtube.com/watch?v=Q5MA7-P1YdM" %}

## What Actually Speaks, and What Actually Thinks

Two different models, and the split is the point.

**OpenAI's `gpt-live-1` is the ears and the mouth.** It hears you, and it reads the answer out. It decides nothing: it is run in a mode where it has no tools, no data and no access to your platform, and every answer it speaks was handed to it.

**Your own model does the thinking.** Whatever you registered on `/agent/config` and made the default answers the question, through LiteLLM, using the same toolkits a typed question uses. Run your agent on Claude, on Gemini, on a local Ollama model, and it stays that way when you turn the microphone on.

So the voice is one vendor and the intelligence is yours. That is why voice needs its own OpenAI key even on an instance whose agent runs on something else entirely.

**No audio passes through your server.** The browser holds the connection to OpenAI directly. The only thing your machine does is one short request to open the session, using a key that never leaves it.

## Turning It On

Voice ships off. On `/agent/config`, scroll to **Voice**.

1. **Paste an OpenAI API key** into the key field and press **Save key**. It is stored encrypted in this instance's own database, is never sent back to the browser, and is separate from any OpenAI model key you may already have registered above.
2. **Press Test.** It opens a real session and throws it away. A pass reads "gpt-live-1 answered. Your key works."
3. **Switch on "Let the agent listen and speak".** The microphone appears in the composer on `/agent`.

The other fields have working defaults and can be left alone:

| Setting | Default | What it does |
| --- | --- | --- |
| Speech model | `gpt-live-1` | The model that hears and speaks. Free text, so a newer one works the day it ships. |
| Voice | `marin` | Which voice reads the answers. The list is advisory; your account decides what it serves. |
| Name | `Vega` | What you call the agent. It carries no authority. |
| Stop after this much quiet, seconds | 180 | Hangs up a session nobody is using. |
| Approval window, seconds | 30 | How long a spoken confirmation stays open after an order is read back. |
| Let a spoken request reach the order tools | Off | Whether voice may place, modify or cancel anything. |

## Using It

Press the mic, allow the microphone when your browser asks, and talk. There is no push-to-talk and no wake word: while the session is open it is listening, and it works out when you have finished speaking.

Ask the things you would type. "What is Reliance doing?" "Show me the Bank Nifty option chain." "What are my positions?" "Chart my holdings." Drawing works by voice exactly as it does by typing, which is most of why the surface is worth having: the answer is spoken in a sentence while the card, the chain or the chart appears on screen beside it.

Answers are deliberately short. The ear gets the conclusion and the screen keeps the detail, so you hear "Nifty is up about half a percent, twenty-three thousand four hundred" while the exact figure sits in the message.

Contracts are spoken the way a person says them. `NIFTY28MAR2420800CE` is read as "the twenty thousand eight hundred Nifty call expiring on the twenty-eighth of March", never letter by letter.

If you are stuck, say so out loud. "Slower please", "what does that mean", "say that again" all work, because they are just more conversation.

## Everything Said Is Kept

A spoken session becomes a thread you can reopen from the conversation list, alongside your typed ones.

Every finalised line is recorded, including the ones that never reach the agent. A speech model handles a good deal of an exchange itself, and none of that would otherwise appear anywhere. Those lines are written to the audit table rather than to the message list, because they are a different record: what was said aloud in the room, as distinct from what the agent decided. Both are worth having and they are not the same thing.

## Placing Orders By Voice

**Off by default, and subject to the Trading switch above it.** Turning it on while the platform's own trading switch is off changes nothing, so there is still exactly one place to stop all order flow.

With both on, a spoken order follows the same pause a typed one does. The run stops, the confirmation card appears on screen exactly as it always has, and Vega reads the order back in full: action, quantity, the contract as a person says it, the exchange, the product and the order type. You then confirm out loud, or tap the card.

A confirmation is a plain yes. "Yes", "go ahead", "confirm", "yes place it" all approve. Anything carrying other content does not, so "yes but wait" is not an approval and neither is a question.

**The read-back is what protects this.** There is no password. Anyone within earshot who says yes while the window is open approves the staged order, and the agent cannot tell one voice from another. The window is short and single use, the order has just been read back in full, and the confirmation card never goes away, so tapping is always available and is the only route once the window has closed.

A secret word was tried and removed. It made every approval a memory test, the speech model read it aloud until that was fixed, and it was written into the audit trail every time it was spoken. What it bought was narrow, and what it cost was the thing traders actually do, which is answer.

**Approval is still not the last gate.** The risk guard runs inside the tool body after any approval, spoken or tapped, and reads no part of the conversation. Quantity, order value, price deviation, the duplicate-order window, allowed exchanges and products, symbol lists, funds utilisation and the kill switch all apply exactly as they do to a typed order.

If you do not control the room you trade in, leave this off and tap the card.

## What It Costs

**An open microphone is billed for as long as it is open.** Silence is still audio being streamed, so a session left running while you walk away costs money for every minute of it. That is why sessions hang up after three minutes of nobody speaking, and why the timeout is a setting: a trading screen stays open all day, and a microphone left on by accident is a real cost rather than untidiness.

The thread and the transcript survive a hang-up, so starting again is one button press.

Speech is billed by OpenAI separately from whatever your own model costs per token. A spoken turn therefore bills twice, in two places.

## Requirements

**A secure address.** Browsers only allow a microphone on `https`, or on `localhost`. `http://127.0.0.1:5000` is fine. A plain `http://` LAN address such as `http://192.168.1.50:5000` can never use a microphone, whatever the permissions say. Every OpenAlgo installer sets up HTTPS for a domain, so this affects home setups reached by IP.

**A current browser.** Chrome, Edge, Firefox and Safari all work, on Windows, macOS and Ubuntu.

**Microphone permission**, in the browser and in the operating system. Windows and macOS each have a system-level switch for whether a browser may use the microphone at all, and it is easy to have granted one and not the other.

## If Something Is Wrong

The agent tells you what to do rather than showing an error code. A few worth knowing in advance:

* **"Your OpenAI account has run out of credit."** Add credit under billing. This one is worth knowing because the speech endpoint reports an empty balance as an unexplained failure, so it can look like an outage when it is not.
* **"The microphone was blocked."** Allow it for the site in the browser, then check your operating system lets the browser use the microphone at all.
* **"Your browser will not allow the microphone on this address."** You are on a plain `http` address that is not this machine. See Requirements above.
* **"Voice stopped after 3 minutes of quiet."** The idle hang-up. Press the mic again; nothing was lost.

## See Also

* [Agent](README.md) for the overview and the three surfaces.
* [Agent Configuration](configuration.md) for the model registry, the trading switch and the rest of `/agent/config`.
* [What the Agent Can Do](capabilities.md) for every toolkit a spoken question can reach.
* [Agent by Example](examples.md) for prompts that work as well spoken as typed.
