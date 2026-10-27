# Download and System Requirements

## Which file to download

Download from the [GitHub Releases page](https://github.com/marketcalls/openalgo-desktop/releases/latest)
(or the [OpenAlgo download page](https://www.openalgo.in/download), which links
to the same files). Pick the file for your computer:

| Your computer | File name ends in |
| --- | --- |
| Windows 10 or 11 (64-bit) | `_x64-setup.exe` |
| Mac with Apple Silicon (M1, M2, M3, M4 and later) | `_aarch64.dmg` |
| Mac with an Intel processor | `_x64.dmg` |
| Linux, 64-bit PC (Ubuntu, Debian, Mint) | `_amd64.deb` or `_amd64.AppImage` |
| Linux, 64-bit ARM (ARM64) | `_arm64.deb` or `_aarch64.AppImage` |

**Not sure which Mac you have?** Open the Apple menu, then **About This Mac**.
"Chip: Apple M..." means Apple Silicon; "Processor: Intel" means Intel.

Only download from the official Releases page. Other files on the release
(`.app.tar.gz`, `.sig`, `latest.json`) are used by the in-app updater; you do
not need them.

## Check the download (optional)

Every release has a `SHA256SUMS.txt` file listing a checksum for each
installer. Compute your file's checksum and compare it with its line in that
file. If they match, your file is exactly the one that was published.

| System | Command |
| --- | --- |
| Windows (PowerShell) | `Get-FileHash .\<file> -Algorithm SHA256` |
| macOS (Terminal) | `shasum -a 256 <file>` |
| Linux (terminal) | `sha256sum <file>` |

## Supported systems

OpenAlgo Desktop is a desktop app. It needs a signed-in user with a graphical
desktop, and it trades only while its window is open.

| System | Support | What it needs |
| --- | --- | --- |
| Windows 11, 64-bit | Supported | Nothing extra. WebView2, which draws the app's window, is part of Windows 11. |
| Windows 10, 64-bit | Supported | WebView2. Most Windows 10 PCs already have it; if not, the installer downloads it (needs internet). |
| Windows Server 2022 or 2025 with Desktop Experience | Supported | A user signed in at the desktop or over Remote Desktop. Trading stops when that user signs out. |
| Windows Server 2019 with Desktop Experience | Not tested | May work as on 2022. |
| Windows Server Core, Nano Server | Not supported | No desktop to show the app in. |
| Windows on ARM, 32-bit Windows, Windows 8.1 and older | Not supported | No installer is built for them. |
| macOS 10.15 (Catalina) or later, Apple Silicon or Intel | Supported | Pick the `.dmg` for your chip. |
| Ubuntu 22.04+, Debian 12+, Linux Mint 21+, 64-bit (x64) | Supported | WebKitGTK 4.1 and GTK 3 (the `.deb` installs them). The AppImage also needs FUSE 2. |
| Ubuntu 22.04+, Debian 12+, 64-bit ARM (ARM64) laptops and virtual machines | Supported | As for x64 Linux. |
| Other 64-bit Linux distributions | Not tested | The AppImage may run where WebKitGTK 4.1, GTK 3 and glibc 2.35 or newer are installed. |
| Raspberry Pi (any model) | Not supported | Use [OpenAlgo web on a Raspberry Pi](../installation-guidelines/getting-started/raspberry-pi.md). |
| Headless Linux servers, SSH-only machines, Docker | Not supported | The app opens a window and cannot run without a desktop. Use OpenAlgo web for a server. |
| Running as a background service (Windows service, systemd, launchd) | Not supported | The app runs as the signed-in user, and its keys stay locked until that user signs in to OpenAlgo. |

"Supported" means an installer is built for that system and a problem on it is
a bug to report.

## How each release is tested

Every change is tested automatically on Ubuntu 22.04 (x64 and ARM64), macOS on
Apple Silicon and Windows Server 2025 before it is accepted. The installers of
every change are also installed on fresh machines and started as a trader
would on first use, with the account created and signed in:

* the `.deb` and the AppImage on Ubuntu 22.04 (x64 and ARM64)
* the setup program on Windows Server 2022 and 2025
* the `.dmg` on Apple Silicon macOS

On Ubuntu the installed app is also driven through its window, and a sandbox
order is placed through the app window on Linux and Windows. A release is
built only from a change that passed all of them.

## Disk space

The app itself is small. What grows is your data, in one folder (see
[Data, Security and Backups](data-security-and-backups.md)). Plan for two
things:

* **Historify.** Years of 1-minute data for many symbols take real space. Download what you use.
* **Updates.** The first time a new version opens your data, it copies every database into a backup inside the data folder before it changes anything. That needs about as much free space as your data. If the disk is full, the new version changes nothing and asks you to free some space.

## Staying awake

OpenAlgo Desktop trades only while it is open and the computer is awake.
Closing the window stops the API, the market data feed, strategies, OpenScript
runs and stop and target tracking; orders already at your broker stay there.
Sleep and network loss pause it: when the computer wakes, OpenAlgo reconnects
market data, checks your orders with your broker and catches up. If automation
must run all day, turn off sleep in your power settings for trading hours, or
run OpenAlgo web on a server.

Next: [Install on Windows](install-on-windows.md), [Install on macOS](install-on-macos.md) or [Install on Linux](install-on-linux.md).
