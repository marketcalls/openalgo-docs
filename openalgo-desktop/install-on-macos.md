# Install on macOS

For macOS 10.15 (Catalina) or later, on Apple Silicon (M1 and later) or Intel
Macs.

## 1. Download the right file

From the [Releases page](https://github.com/marketcalls/openalgo-desktop/releases/latest):

| Your Mac | File name ends in |
| --- | --- |
| Apple Silicon (M1, M2, M3, M4 and later) | `_aarch64.dmg` |
| Intel | `_x64.dmg` |

Not sure? Apple menu, **About This Mac**: "Chip: Apple M..." is Apple
Silicon, "Processor: Intel" is Intel.

## 2. Install

1. Open the downloaded `.dmg` file.
2. Drag **OpenAlgo Desktop** onto the **Applications** folder.
3. Eject the disk image (in Finder's sidebar, or drag it to the Trash).

Always run the app from **Applications**, not from the disk image window. The
in-app updater replaces the app in Applications.

## 3. Open it the first time

Open **Applications**, then **OpenAlgo Desktop**. Because the app is not yet
signed and notarized with an Apple Developer ID, macOS blocks the first
open. What you see depends on your Mac.

### Apple Silicon Mac: "OpenAlgo Desktop is damaged and can't be opened"

On an Apple Silicon Mac, macOS says:

> "OpenAlgo Desktop" is damaged and can't be opened. You should move it to the Trash.

**Do not move it to the Trash.** Choose **Cancel** (or **Done**). The app is
not damaged. This is macOS's download check (Gatekeeper) refusing an app that
Apple has not notarized. Every app on Apple Silicon must carry a code
signature; the Apple Silicon build of OpenAlgo Desktop carries only the
automatic signature that the build tools add, without an Apple Developer ID,
and for an app downloaded from a browser macOS reports that as "damaged".
Right-click, **Open** does not get past this message.

The fix is one command in Terminal. It removes the "downloaded from the
internet" mark (the quarantine flag) from the app, so macOS opens it:

1. Open **Terminal**: press Cmd+Space, type `Terminal`, press Return.
2. Copy this line, paste it into Terminal and press Return:

   ```bash
   xattr -dr com.apple.quarantine "/Applications/OpenAlgo Desktop.app"
   ```

   Nothing is printed when it works.
3. Open **OpenAlgo Desktop** from Applications again. It opens.

You do this once for each copy you download with a browser.

If Terminal says "Permission denied" or "Operation not permitted", run the
same line with `sudo` in front and type your Mac password when asked (nothing
shows while you type):

```bash
sudo xattr -dr com.apple.quarantine "/Applications/OpenAlgo Desktop.app"
```

If you put the app somewhere other than Applications, change the path in the
command to where the app is.

### Intel Mac: "cannot be opened because Apple cannot check it"

On an Intel Mac, macOS says the app "cannot be opened because Apple cannot
check it for malicious software", or that it is from an unidentified
developer. Either:

* In Finder, open **Applications**, right-click (or Control-click) **OpenAlgo Desktop**, choose **Open**, then **Open** again; or
* Try to open the app once, then open **System Settings**, **Privacy & Security**, scroll down to the message about OpenAlgo Desktop, choose **Open Anyway** and confirm with your password or Touch ID. On macOS 15 (Sequoia) and later this is the way that works.

You only do this once. If an Intel Mac also says the app "is damaged", use
the Terminal command above.

### Is it safe to do this?

These steps tell macOS to open an app that Apple has not checked. Do it only
for a file you downloaded from the official
[Releases page](https://github.com/marketcalls/openalgo-desktop/releases/latest).
To confirm your download is exactly the published file, compare its checksum
with the line for it in the release's `SHA256SUMS.txt`:

```bash
shasum -a 256 ~/Downloads/OpenAlgo.Desktop_1.0.3_aarch64.dmg
```

The source code of every release is public on GitHub, and every installer is
built by GitHub's own build machines from that source.

## 4. If port 5000 is in use: AirPlay Receiver

On many Macs, **AirPlay Receiver** holds port 5000, the port OpenAlgo uses.
The app then opens on a page that says "OpenAlgo could not start because port
5000 is already used by another program". Either:

* Open **System Settings**, **General**, **AirDrop & Handoff**, turn off **AirPlay Receiver**, then choose **Try again** in OpenAlgo; or
* Type another port in the **Port** box (for example `5001`) and choose **Try again**. OpenAlgo remembers it. Then use that port in your broker's redirect URL and in your tools. See [Ports and Server Settings](ports-and-server-settings.md).

## Starting and quitting

| Action | How |
| --- | --- |
| Start | **Applications** or **Launchpad**, then **OpenAlgo Desktop** |
| Quit | **OpenAlgo Desktop** menu, then **Quit** (Cmd+Q). Closing the window also quits |

When something is still running (strategies, OpenScript runs, scalping stops,
open orders), quitting asks first. Quitting from the Dock, shutting down or a
forced quit cannot ask.

**Sleep stops trading.** A Mac that goes to sleep pauses OpenAlgo. For
automation during market hours, keep the Mac awake: **System Settings**,
**Battery** (or **Energy**), and prevent automatic sleep while on power, or
keep the lid open on a MacBook.

## Where your data is

`~/Library/Application Support/com.openalgo.desktop` (in Finder: **Go**,
**Go to Folder**, paste the path). OpenAlgo Desktop does not use the macOS
Keychain: your keys are locked with your OpenAlgo password inside the data
folder. See [Data, Security and Backups](data-security-and-backups.md).

## Updating and uninstalling

The app tells you when a new version is out and replaces itself when you
choose **Update**. To uninstall, quit the app and drag **OpenAlgo Desktop**
from **Applications** to the Trash. See
[Updating and Uninstalling](updating-and-uninstalling.md).

## Problems

| What you see | What to do |
| --- | --- |
| "OpenAlgo Desktop is damaged and can't be opened" | Run `xattr -dr com.apple.quarantine "/Applications/OpenAlgo Desktop.app"` in Terminal, then open the app again |
| "cannot be opened because Apple cannot check it" or "unidentified developer" | Right-click, **Open**, or **System Settings**, **Privacy & Security**, **Open Anyway** |
| "port 5000 is already used by another program" | Turn off **AirPlay Receiver**, or choose another port |
| The app opened the Intel version on an Apple Silicon Mac | Download the `_aarch64.dmg` instead; the Intel version runs through Rosetta and is slower |

More in [Troubleshooting and FAQ](troubleshooting-and-faq.md).
