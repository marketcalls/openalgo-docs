# Download & Install Library

Installing the OpenAlgo MQL5 SDK takes a few minutes: download one zip, copy its `MQL5` folder into MetaTrader, allow the OpenAlgo URL, then run the self-test to confirm everything works.

### 1. Download the release

Download **[OpenAlgo-MQL5-v1.0.0.zip](https://github.com/marketcalls/openalgo-mt5-connector/releases/download/v1.0.0/OpenAlgo-MQL5-v1.0.0.zip)**, version 1.0.0 of the SDK.

Newer versions are published on the [releases page](https://github.com/marketcalls/openalgo-mt5-connector/releases). Download the zip attached to the latest release and install it the same way; `CHANGELOG.md` inside the zip lists what changed.

The zip contains:

```
MQL5/
  Include/OpenAlgo/    the SDK: OpenAlgo.mqh (the file you include), Core/ and one file per module
  Scripts/OpenAlgo/    OpenAlgoQuickstart.mq5, OpenAlgoSelfTest.mq5, OpenAlgoOrderExamples.mq5
  Experts/OpenAlgo/    OpenAlgoEMACrossover.mq5, OpenAlgoFeedLTP.mq5
README.md              full SDK reference
LICENSE                MIT license
CHANGELOG.md           release notes
```

### 2. Extract the zip

Right-click the zip and choose **Extract All**, for example into your Downloads folder. The extracted folder holds the `MQL5` folder and the three text files.

### 3. Open the MetaTrader data folder

In MetaTrader 5 choose **File > Open Data Folder** (Ctrl+Shift+D).

<figure><img src="../../.gitbook/assets/image (31).png" alt="MetaTrader 5 File menu with Open Data Folder highlighted"><figcaption></figcaption></figure>

Windows Explorer opens the terminal's data folder. It already contains an `MQL5` folder.

### 4. Copy the MQL5 folder in and merge it

Copy the `MQL5` folder from the extracted zip and paste it into the data folder you just opened, next to the `MQL5` folder that is already there. Windows merges the two folders: your own indicators, scripts and Expert Advisors stay untouched, and the OpenAlgo files are added. When you upgrade from an earlier version, Windows asks about files with the same name; choose **Replace the files in the destination**.

Paste into the data folder itself, not into the existing `MQL5` folder, otherwise you end up with `MQL5\MQL5` and MetaEditor cannot find the files.

After the copy, these paths exist inside the data folder:

```
MQL5\Include\OpenAlgo\OpenAlgo.mqh
MQL5\Include\OpenAlgo\Core\
MQL5\Scripts\OpenAlgo\OpenAlgoSelfTest.mq5
MQL5\Experts\OpenAlgo\OpenAlgoEMACrossover.mq5
```

`MQL5\Include\OpenAlgo\OpenAlgo.mqh` is the file your own programs include with `#include <OpenAlgo/OpenAlgo.mqh>`.

### 5. Refresh MetaEditor and the Navigator

* In MetaTrader 5, right-click **Expert Advisors** (and **Scripts**) in the Navigator and choose **Refresh**. An `OpenAlgo` folder appears under each.
* Open MetaEditor (F4 in MetaTrader 5). If it was already open, right-click the `MQL5` folder in its Navigator and choose **Refresh**, or close and reopen MetaEditor. `Include\OpenAlgo`, `Scripts\OpenAlgo` and `Experts\OpenAlgo` are now listed.

### 6. Allow the OpenAlgo URL

By default the SDK sends its requests with MetaTrader's `WebRequest()`, and MetaTrader only lets a program reach addresses you have allowed:

1. In MetaTrader 5 choose **Tools > Options** and open the **Expert Advisors** tab.
2. Tick **Allow WebRequest for listed URL**.
3. Add your OpenAlgo URL, for example `http://127.0.0.1:5000` on the same computer, or `https://yourdomain.com` for a server.
4. If you will use the live WebSocket feed, add its address as well, for example `ws://127.0.0.1:8765` on a local install. Sockets use the same list.
5. Click **OK**.

If an address is missing, the call does not fail silently: it returns `error_type` `permission_error`, and the message names the exact address to add.

#### Alternative: the DLL transport

Instead of the WebRequest list you can send requests through Windows' `wininet.dll`. This is also the only way to call OpenAlgo from an indicator, because MetaTrader blocks `WebRequest()` in indicators. Put the define before the include:

```cpp
#define OPENALGO_USE_WININET            // wininet.dll transport (indicators, no URL list)
//#define OPENALGO_WININET_IGNORE_CERT  // only for a self-signed test server
#include <OpenAlgo/OpenAlgo.mqh>
```

Then tick **Allow DLL imports** under **Tools > Options > Expert Advisors**, and again in the properties dialog that opens when you attach the program to a chart. Without that permission every call returns a `permission_error` that says so.

The WebSocket feed always uses MetaTrader's sockets, so in DLL mode the feed address still has to be on the WebRequest list.

### 7. Compile and run the self-test

1. In MetaEditor open `MQL5\Scripts\OpenAlgo\OpenAlgoSelfTest.mq5` and press **F7** (Compile). The Errors tab should end with `0 errors`.
2. Compile the other examples the same way: `OpenAlgoQuickstart.mq5`, `OpenAlgoOrderExamples.mq5`, `OpenAlgoEMACrossover.mq5` and `OpenAlgoFeedLTP.mq5`.
3. In MetaTrader 5 open **Navigator > Scripts > OpenAlgo** and drag **OpenAlgoSelfTest** onto any chart. Click **OK** in the inputs dialog.
4. Open the **Experts** tab of the Toolbox (Ctrl+T). The script prints one `PASS` or `FAIL` line per test and finishes with a total:

```
OpenAlgo MQL5 SDK 1.0.0 self-test (transport: WebRequest, read-only API checks: off)
PASS  ...
TOTAL <n> tests: <n> passed, 0 failed (ALL PASS)
```

The self-test works offline by default, so it proves the SDK is installed and compiles without touching your account. To check the connection to your server as well, run it again with `RunApiChecks = true` and your `ApiKey` and `Host`. It then adds read-only calls (`ping`, `funds`, `quotes`, `intervals`, `analyzerstatus`, `orderbook`). It never places, modifies or cancels an order.

For a first look at real responses, run **OpenAlgoQuickstart** the same way with your API key. It prints `ping`, `funds`, `quotes`, `depth`, `history` and `positionbook` and is read-only as well.

### If something does not work

| What you see | What to do |
| --- | --- |
| A compile error saying the include file `OpenAlgo/OpenAlgo.mqh` cannot be opened | The files are not at `MQL5\Include\OpenAlgo\`. Repeat step 4 and check you did not create `MQL5\MQL5`. |
| `error_type` `permission_error`, "WebRequest is not allowed for ..." | Add the address named in the message under Tools > Options > Expert Advisors (step 6). |
| `error_type` `permission_error`, "DLL imports are not allowed ..." | You use `OPENALGO_USE_WININET`: tick Allow DLL imports, or remove the define. |
| `error_type` `connection_error` | OpenAlgo is not running at that URL, or the URL is wrong. Open it in a browser to check. |
| `"code": 403` with the message "Invalid openalgo apikey" | Copy the API key again from the OpenAlgo dashboard, and check OpenAlgo is logged in to your broker. |
| `error_type` `tester_blocked` | The program runs in the Strategy Tester, where the SDK refuses every request on purpose. |

Next: [Include the Header File](include-the-header-file.md).
