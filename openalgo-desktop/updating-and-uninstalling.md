# Updating and Uninstalling

## How updates reach you

OpenAlgo Desktop checks for a newer version each time it starts. To check at
any time, open the profile menu and choose **Check for Updates**.

When a new version is available, a small notice shows the version and its
release notes. It only tells you: **nothing is downloaded until you choose
Update**.

**Update** downloads the new version, checks its signature against the key
built into the app (an update that does not match is refused), installs it and
restarts. Then you sign in again.

Before it downloads, and again before it restarts, OpenAlgo names anything a
restart would interrupt (running Live strategies, OpenScript runs, scalping
stops, open orders at your broker) and asks you to confirm. Sandbox-only
activity gets a lighter warning. It never restarts on its own. Update outside
market hours, or when no live strategy is running.

| Installed from | How it updates |
| --- | --- |
| Windows setup `.exe` | In the app: runs the new installer for your user, with a progress window |
| macOS `.dmg` | In the app: replaces OpenAlgo Desktop in Applications |
| Linux AppImage (x64 or ARM64) | In the app: replaces the `.AppImage` file |
| Linux `.deb` (x64 or ARM64) | The app tells you and links to the release page; download the new `.deb` and run `sudo apt install ./<new file>.deb` |

You can always install a newer version by hand over the old one from the
[Releases page](https://github.com/marketcalls/openalgo-desktop/releases/latest).
Your account, settings, broker keys, strategies, sandbox data and Historify
data are kept either way.

**On a Mac**, a new `.dmg` downloaded with a browser needs the same one-time
step as the first install on Apple Silicon (see
[Install on macOS](install-on-macos.md#apple-silicon-mac-openalgo-desktop-is-damaged-and-cant-be-opened)).

## Your data during an update

The first time the new version starts, it backs up every database inside the
data folder before it changes anything. If it then cannot open the data, it
puts the backup back and says so; start it again, or install the previous
version, which opens the data as before. The backup is deleted as soon as the
new version has opened your data. Details in
[Data, Security and Backups](data-security-and-backups.md#your-data-is-backed-up-before-every-update).

An older version never opens data that a newer version has used: it says so
and changes nothing.

## What is new in each version

The release notes are on the
[Releases page](https://github.com/marketcalls/openalgo-desktop/releases) and in
the [CHANGELOG](https://github.com/marketcalls/openalgo-desktop/blob/master/CHANGELOG.md).

## Uninstalling

| System | How |
| --- | --- |
| Windows | **Settings**, **Apps** (**Installed apps** on Windows 11, **Apps & features** on Windows 10), **OpenAlgo Desktop**, **Uninstall** |
| macOS | Quit the app, then drag **OpenAlgo Desktop** from **Applications** to the Trash |
| Linux `.deb` | `sudo apt remove open-algo-desktop`, or your software manager |
| Linux AppImage | Delete the `.AppImage` file |

Uninstalling removes the app and keeps your data folder, so a reinstall picks
up where you left off. To remove your account and data as well, delete the
data folder (back it up first if you may come back):

| System | Data folder |
| --- | --- |
| Windows | `%APPDATA%\com.openalgo.desktop` |
| macOS | `~/Library/Application Support/com.openalgo.desktop` |
| Linux | `~/.local/share/com.openalgo.desktop` |
