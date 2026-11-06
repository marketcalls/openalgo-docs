# Flow and the Agent

OpenAlgo Desktop includes Flow and the Agent. Flow arrived in **1.0.5** and
runs natively in the desktop engine; it does not require Python. See the
[official release notes](https://github.com/marketcalls/openalgo-desktop/releases/tag/v1.0.5)
for that version's features and deliberate differences from the web engine.

## Build a workflow

Open **Flow Editor** from the profile menu. Drag nodes onto the canvas,
configure them, connect their handles, save and use **Run Now** to inspect the
execution log. The desktop supports the web's 61 node types, including data,
indicators, conditions, orders, alerts and timing controls.

Triggers include schedules, price alerts, order updates and webhooks. Schedules
use India time even when the computer uses another timezone. They run while
the app is open and you are signed in. A missed run is skipped rather than
replayed. Data and order nodes that need a broker session refuse when it is
unavailable.

Use Analyzer mode for a rehearsal and inspect the resulting orders, positions
and execution log. Run Now executes the saved workflow in the current mode;
it is not a separate backtest.

## Move a workflow from OpenAlgo web

1. Export the workflow from the web editor.
2. Open the desktop's Flow Editor and choose **Import**.
3. Review symbols, exchange, product, quantities and variables before running.
4. Enable the intended trigger after a sandbox rehearsal.
5. Reconfigure webhook senders with the desktop workflow's new URL and secret.

Every webhook needs its secret. The built-in tunnel supplies a public address
when enabled; it must be online for alerts from outside your computer. See
[Webhooks and the Built-in ngrok Tunnel](webhooks-and-ngrok-tunnel.md).

The engines share a JSON format but have documented behavioral differences.
In 1.0.5, for example, the desktop's symbol-specific Close Positions node
closes that position; the corresponding web public API can close all account
positions. Review the release notes before moving an execution workflow.

## Ask the Agent

Open `/agent`, configure a provider and model, test it and choose a default.
The Agent can inspect your account and market data, draw charts, and build
Flow workflows. Saved generated workflows start inactive, so review them
before activating a trigger.

Trading is an explicit capability: order tools require your approval and still
pass through risk checks. The Assistant beside `/trading` is for chart analysis
and drawing, without order tools. AI provider access may use a paid API, a
supported subscription or a local model; test the chosen model in the app.

## Keep the app running

Flow, strategies and stop/target tracking depend on the app remaining open and
the computer staying awake. Closing the app does not cancel orders already
held by your broker. Reconcile orders and positions after an interruption.

The Python Strategy Host and the pandas Portfolio Backtester, SIP Backtester
and Portfolio Analyzer are web-only features. An external Python script can
still use the desktop API through the OpenAlgo Python SDK.
