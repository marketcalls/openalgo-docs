# Download & Install

Installing the OpenAlgo NinjaScript SDK takes a few minutes: download one zip, copy three folders into your NinjaScript folder, compile, then run the self-test to confirm that NinjaTrader reaches your OpenAlgo server.

### 1. Download the release

Download **[OpenAlgo-NT8-v1.0.0.zip](https://github.com/marketcalls/openalgo-nt8-connector/releases/download/v1.0.0/OpenAlgo-NT8-v1.0.0.zip)**, version 1.0.0 of the SDK.

Newer versions are published on the [releases page](https://github.com/marketcalls/openalgo-nt8-connector/releases). Download the zip attached to the latest release and install it the same way; the release notes and the repository's `CHANGELOG.md` list what changed.

The zip holds plain NinjaScript source files at the paths NinjaTrader uses:

```
Info.xml                         NinjaScript archive marker (read by NinjaTrader's importer)
AddOns/OpenAlgo/Core/            Base.cs, Http.cs, Json.cs: the client core, HTTP transport and OAJson
AddOns/OpenAlgo/*.cs             one file per Python SDK module (Orders.cs, Data.cs, Feed.cs, ...)
AddOns/OpenAlgo/LICENSE.txt      MIT license
Strategies/OpenAlgo/             OpenAlgoSelfTest.cs, OpenAlgoEMACrossover.cs, OpenAlgoOrderExamples.cs
Indicators/OpenAlgo/             OpenAlgoFeedLTP.cs
```

There is no DLL and nothing else to install: NinjaTrader compiles the source together with your own scripts.

### 2. Copy the folders into NinjaTrader (recommended)

1. In NinjaTrader, close any open NinjaScript Editor window.
2. Right-click the zip and choose **Extract All**, for example into your Downloads folder.
3. In Windows Explorer open your NinjaScript folder, `Documents\NinjaTrader 8\bin\Custom`. It already contains `AddOns`, `Strategies`, `Indicators` and other folders.
4. Copy the `AddOns`, `Strategies` and `Indicators` folders from the extracted zip and paste them into `bin\Custom`. Windows merges them with the folders that are already there: only an `OpenAlgo` subfolder is added to each, and your own scripts stay untouched. `Info.xml` is not needed for this route.

Paste into `bin\Custom` itself, not into one of its subfolders, otherwise you end up with `AddOns\AddOns` and the files are compiled from the wrong place.

After the copy, these paths exist:

```
Documents\NinjaTrader 8\bin\Custom\AddOns\OpenAlgo\Core\Base.cs
Documents\NinjaTrader 8\bin\Custom\AddOns\OpenAlgo\Orders.cs
Documents\NinjaTrader 8\bin\Custom\Strategies\OpenAlgo\OpenAlgoSelfTest.cs
Documents\NinjaTrader 8\bin\Custom\Strategies\OpenAlgo\OpenAlgoEMACrossover.cs
Documents\NinjaTrader 8\bin\Custom\Indicators\OpenAlgo\OpenAlgoFeedLTP.cs
```

#### Alternative: NinjaTrader's importer

The zip has the layout of a NinjaTrader 8 NinjaScript export archive (`Info.xml` at the root, the files at their `bin\Custom` paths). In the NinjaTrader Control Center choose **Tools > Import > NinjaScript Add-On...**, pick the downloaded zip (do not extract it) and confirm NinjaTrader's warning about third-party scripts. NinjaTrader copies the files and compiles them. If the import reports an error, use the manual copy above, which needs nothing but a file copy.

### 3. Compile

1. In the NinjaTrader Control Center choose **New > NinjaScript Editor**.
2. Press **F5**. NinjaTrader compiles every script in `bin\Custom` into one assembly, the OpenAlgo files included. Restarting NinjaTrader compiles as well.
3. The compile succeeded when the editor's error list at the bottom stays empty. The samples then appear as **OpenAlgoSelfTest**, **OpenAlgoEMACrossover** and **OpenAlgoOrderExamples** in the strategy list and **OpenAlgoFeedLTP** in the indicator list.

Because NinjaTrader compiles every script together, a compile error in any other script stops the whole compile, the OpenAlgo files included. The error list names the file; fix or remove that script and press F5 again.

### 4. Run the self-test

`OpenAlgoSelfTest` is a strategy that only reads. It checks the SDK version, `ping`, `funds`, `analyzerstatus` and a quote, and never places, modifies or cancels an order.

1. Open a chart of any instrument (**New > Chart** in the Control Center). The chart only hosts the test; its instrument is not used.
2. Right-click the chart and choose **Strategies...**.
3. Select **OpenAlgoSelfTest** in the list of available strategies and click **Add**.
4. In its properties, under **OpenAlgo**, enter your **API key** and the **Host** of your OpenAlgo server. Tick **Enabled** and click **OK**.
5. Open the NinjaScript Output window (**New > NinjaScript Output**).

The strategy runs its checks once, when it reaches real time (after the chart's historical bars are processed). It prints one `PASS` or `FAIL` line per check and a summary:

```
OpenAlgoSelfTest: OpenAlgo NinjaScript SDK 1.0.0 (mirrors the OpenAlgo Python SDK 2.4.1)
OpenAlgoSelfTest: REST http://127.0.0.1:5000/api/v1/, feed ws://127.0.0.1:8765
OpenAlgoSelfTest: PASS ping
OpenAlgoSelfTest:   broker <your broker>, pong
OpenAlgoSelfTest: PASS funds
OpenAlgoSelfTest:   available cash <cash>, used margin <margin>
OpenAlgoSelfTest: PASS analyzerstatus
OpenAlgoSelfTest:   mode analyze (analyzer mode (sandbox): orders are simulated)
OpenAlgoSelfTest: PASS quotes NSE:RELIANCE
OpenAlgoSelfTest:   ltp <ltp>, bid <bid>, ask <ask>, volume <volume>
OpenAlgoSelfTest: 4 passed, 0 failed
```

A `FAIL` line carries OpenAlgo's message and the `error_type` in brackets, for example `http_error` with `Invalid openalgo apikey` for a wrong key. The checks run one after another on the client's background queue, so the chart never waits for the network.

| Input | Default | Meaning |
| --- | --- | --- |
| API key | empty | Your OpenAlgo API key. The test stops with a message when it is empty. |
| Host | `http://127.0.0.1:5000` | Your OpenAlgo URL. |
| Quote symbol | `RELIANCE` | OpenAlgo symbol for the quote check. |
| Quote exchange | `NSE` | Exchange of the quote symbol. |
| Verbose | `0` | SDK logging: `0` silent, `1` basic, `2` every request. The API key is always masked. |

When the self-test passes, the SDK is installed and NinjaTrader reaches your server. [Using the Add-On](using-the-addon.md) shows how to use it from your own scripts.

### If something does not work

| What you see | What to do |
| --- | --- |
| `OpenAlgoSelfTest` is not in the strategy list | The compile did not succeed, or the files are not under `bin\Custom\Strategies\OpenAlgo`. Repeat step 2, press F5 and read the editor's error list. |
| Compile errors in files that are not OpenAlgo's | NinjaTrader compiles every script together. Fix or remove the script the error list names, then press F5. |
| Compile error about a duplicate `OpenAlgo...` type | An older copy of the SDK or the samples is still somewhere in `bin\Custom`. Delete it and press F5. |
| Compile error "The type or namespace name 'api' could not be found" in your own script | Add `using NinjaTrader.NinjaScript.AddOns.OpenAlgo;` at the top of that script. |
| Warning CS0436 "conflicts with the imported type" | Harmless: NinjaTrader's own `NinjaTrader.Vendor.dll` and compiled add-ons carry copies of NinjaScript types, and NinjaTrader's own scripts get the same warning. |
| Nothing appears in the Output window | The strategy is not enabled, or it has not reached real time yet. Check that it is enabled and that NinjaTrader is connected to a data connection, so the chart can finish loading and move to real time. |
| `FAIL` with `connection_error` | OpenAlgo is not running at that URL, or the URL is wrong. Open the Host URL in a browser on the same computer. |
| `FAIL` with `http_error` and `Invalid openalgo apikey` | Copy the API key again from the OpenAlgo dashboard, and check that OpenAlgo is logged in to your broker. |
| `FAIL` with `http_error` and "Request URL is missing an 'http://' or 'https://' protocol" | Write the Host with its scheme, for example `http://127.0.0.1:5000`. |
| `FAIL` with `timeout_error` | OpenAlgo took longer than the timeout (120 seconds by default) to answer. |
| `FAIL` with `historical_blocked` | The strategy runs in the Strategy Analyzer, where the SDK refuses every request on purpose. Run it on a chart. |
| `FAIL` with `playback_blocked` | The Playback connection is connected. Disconnect it from the **Connections** menu; the SDK refuses requests while it is in use. |

### Updating and removing

* **Update:** remove the OpenAlgo samples from your charts and from the Strategies tab, delete the three `OpenAlgo` folders (`bin\Custom\AddOns\OpenAlgo`, `bin\Custom\Strategies\OpenAlgo` and `bin\Custom\Indicators\OpenAlgo`), copy the new ones from the new zip, and press F5 in the NinjaScript Editor.
* **Remove:** delete the same three folders and press F5. Remove any script of your own that uses the SDK first, or it no longer compiles.

Next: [Using the Add-On](using-the-addon.md).
