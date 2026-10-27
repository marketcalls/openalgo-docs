# Install on Windows

For Windows 10 and Windows 11 (64-bit), and Windows Server 2022 or 2025 with
Desktop Experience.

## 1. Download

From the [Releases page](https://github.com/marketcalls/openalgo-desktop/releases/latest),
download the file ending in **`_x64-setup.exe`**, for example
`OpenAlgo.Desktop_1.0.3_x64-setup.exe`.

## 2. Run the setup

1. Double-click the downloaded `_x64-setup.exe`.
2. Windows may show a blue **"Windows protected your PC"** screen (SmartScreen). Choose **More info**, then **Run anyway**. See [why this warning appears](#why-windows-shows-a-warning) below.
3. Follow the setup. It installs for your Windows user only and **does not need administrator rights**.
4. If WebView2 is missing (some Windows 10 PCs), the setup downloads and installs it. This needs an internet connection.

When it finishes, OpenAlgo Desktop is in the **Start** menu, and on the
desktop if you kept the shortcut.

## 3. Open it

Open **Start**, then **OpenAlgo Desktop**. The app opens on the OpenAlgo home
page. Continue with [First Run and Broker Login](first-run-and-broker-login.md).

While the app runs, the same dashboard also opens in any browser on this
computer at `http://127.0.0.1:5000`.

## Why Windows shows a warning

OpenAlgo Desktop's installer is not yet signed with a paid code-signing
certificate, so Windows SmartScreen does not recognise the publisher the first
time. This is expected and does not mean the file is harmful. To be sure the
file is the one that was published, compare its checksum with
`SHA256SUMS.txt` on the release page:

```powershell
Get-FileHash .\OpenAlgo.Desktop_1.0.3_x64-setup.exe -Algorithm SHA256
```

You only see the warning when you run a newly downloaded setup.

## No internet, no WebView2

A computer with no internet connection and no WebView2 (some Windows 10 and
Windows Server installs) cannot install from the setup program alone. Install
Microsoft's **WebView2 "Evergreen Standalone Installer"** first (from
Microsoft's WebView2 download page), then run the OpenAlgo setup.

## Starting and quitting

| Action | How |
| --- | --- |
| Start | **Start** menu, then **OpenAlgo Desktop** (or the desktop shortcut) |
| Quit | Close the window, or right-click its taskbar icon and choose **Close window** |

When something is still running (strategies, OpenScript runs, scalping stops,
open orders), quitting asks first: **Quit** or **Keep OpenAlgo Open**.
Shutting Windows down or a forced quit cannot ask.

## Windows Server

On Windows Server 2022 or 2025 with Desktop Experience, install and run it as
on Windows 11, while signed in at the desktop or over Remote Desktop. Trading
stops when that user signs out; disconnecting a Remote Desktop session without
signing out keeps the app running.

## Where your data is

`%APPDATA%\com.openalgo.desktop`, that is
`C:\Users\<you>\AppData\Roaming\com.openalgo.desktop`. See
[Data, Security and Backups](data-security-and-backups.md).

## Updating and uninstalling

The app tells you when a new version is out and installs it for you when you
choose **Update**. To uninstall: **Settings**, **Apps** (**Installed apps** on
Windows 11, **Apps & features** on Windows 10), **OpenAlgo Desktop**,
**Uninstall**. See [Updating and Uninstalling](updating-and-uninstalling.md).

## Problems

| What you see | What to do |
| --- | --- |
| "Windows protected your PC" | **More info**, then **Run anyway** |
| The setup cannot download WebView2 | Install the WebView2 Evergreen Standalone Installer first |
| "OpenAlgo could not start because port 5000 is already used" | Close the other program (often OpenAlgo web or a second copy of the app), or type another port and choose **Try again**. See [Ports and Server Settings](ports-and-server-settings.md) |
| "MSVCP140.dll was not found" (version 1.0.0 only) | Install the current version; from 1.0.1 the app needs no Visual C++ runtime |

More in [Troubleshooting and FAQ](troubleshooting-and-faq.md).
