# OpenScript on the Chart

OpenScript is the study and strategy language available from the charting terminal's **Scripts** panel. Write a study to plot calculations, or a strategy to backtest on history and explicitly deploy as a server process. It is separate from Python `openalgo.ta` and unrestricted JavaScript chart indicators.

## Write and Save

1. Open `/trading`, then **Scripts** on the right rail.
2. Choose **New script**, name it and choose **Study** or **Strategy**.
3. Edit the starter, then save with the save control or `Ctrl+S`/`Cmd+S`.
4. Read the compiler console and marked error line. Source still saves when it does not compile, but that version has no runnable program.

The editor provides syntax colours, line numbers and Tab/Shift+Tab indentation. Drafts are retained per script in the browser when changing scripts or panels. Save to persist the source on the server before running it.

**Add to chart** plots a saved, compiling study on the selected chart. A strategy's **Run on chart** adds its plots and opens its historical backtest; it does not start a live process.

## Backtest

Open **Backtest** and select a saved Strategy. The run uses the selected chart's instrument and interval. Choose From/To dates, set inputs or leave them blank for the script's defaults, then choose **Run backtest** after editing dates/inputs.

Selecting a strategy or changing the chart's instrument/interval can run the test automatically. Inspect summary, equity, drawdown and trades. **Show trades on chart** controls fill markers and **Clear marks** removes them. Removing the strategy from the chart removes its marks too.

A browser backtest sends no broker orders. Test inputs do not change a server deployment's saved inputs, and historical fills do not prove future execution prices.

## Deploy on the Server

1. Open **Strategies** on the right rail and choose **Deploy a strategy**.
2. Choose the saved, compiling Strategy and its instrument, exchange and interval.
3. Set product and input overrides where needed, then choose **Deploy** to save settings.
4. Verify the panel's **Live/Analyzer** badge and the instrument/quantity before choosing **Start live** or **Start in sandbox**.
5. Read the status, Activity books and log after startup.

The same script can have independent deployments on several instruments or intervals. Each deployment has its own process, attributed orders, trades, position and log. Changing an instrument or interval creates another deployment rather than moving a running strategy.

Inputs are read at process start. Pause or stop, save changes and start again to apply them. The current server runner accepts sizing in units or lots using instrument metadata, and sends whole-unit order quantities. Money-based or percent-of-equity sizing is refused. Read any startup refusal in the log.

## Pause Is Different From Stop

| Control | Effect |
|---|---|
| Pause | Ends the process and leaves the position for you to manage |
| Stop | Requests cancellation of the run's outstanding orders, closes its own position, then ends; asks for confirmation |
| Activity | Opens that deployment's orders, trades and positions |
| Remove | Removes stopped deployment settings and its schedule; does not close a broker position |

A failed close may leave the run holding and still running, or a terminated process may leave the close unconfirmed. Read the returned message and check actual orders and positions. A stopped process is not proof that the account is flat.

The authenticated runner routes distinguish `/pause/<deployment>` from `/close/<deployment>`. The compatibility `/stop/<deployment>` route means **pause**; the UI's confirmed Stop uses `/close`.

Server processes outlive the page. Closing the browser or logging out does not close their positions. [Broker switching](../connect-brokers/broker-configuration.md#switching-brokers) is refused while relevant live automation is still active.

## Execution Mode and Storage

Orders use OpenAlgo's normal order path and application key. Live can send broker orders and Analyze uses the sandbox. There is no separate deployment destination or `force_live` setting.

Reconcile positions before changing mode. If a run detects a destination change while holding, it stops and records what needs manual attention; detection can happen after a response from the changed destination. It does not move or close the old position. Check both destinations and the broker terminal. A run that was flat can follow the new destination.

Source and compiled programs live in `strategies/openscript/`. Deployment settings and schedules live beside them under `strategies/`; per-run logs are under `log/strategies/`. Docker's strategies/log volumes preserve these files across rebuilds. Schedule times are IST, the default days are Monday-Friday, and the saved exchange supplies the calendar. A scheduled stop pauses the process; it does not itself close a position.

OpenScript cannot make arbitrary network or filesystem calls, but a deployed strategy can issue trading instructions. Review its logic and size before starting it. JavaScript chart indicators have the browser session's unrestricted reach and require a different level of trust.

For language syntax use the [OpenScript language reference](https://openalgo.in/script). For chart controls see [Chart Trading Terminal](trading-terminal.md).
