# Data, Security and Backups

## Where your data lives

Everything OpenAlgo Desktop stores is in one folder for your user account:

| System | Folder |
| --- | --- |
| Windows | `%APPDATA%\com.openalgo.desktop` (that is `C:\Users\<you>\AppData\Roaming\com.openalgo.desktop`) |
| macOS | `~/Library/Application Support/com.openalgo.desktop` |
| Linux (x64 or ARM64) | `~/.local/share/com.openalgo.desktop` |

To open it: on Windows, paste `%APPDATA%\com.openalgo.desktop` into the
File Explorer address bar; on macOS, Finder, **Go**, **Go to Folder**, and
paste the path; on Linux, your file manager (show hidden files for
`.local`).

Inside it:

| File | Holds |
| --- | --- |
| `openalgo.db` | Your account, every setting (ports and server settings included), strategies, encrypted broker credentials, and the locked encryption keys |
| `sandbox.db` | Sandbox mode (analyzer mode), kept apart from live trading |
| `logs.db` | Order, API, traffic, latency and health logs |
| `historify.duckdb` | Historify market data (the largest file if you download a lot) |
| OpenScript and indicator files | Your OpenScript studies and custom chart indicators |
| `data-version.json` | The version of OpenAlgo that last opened this folder |

There is no `.env` file and no configuration file to edit: every setting is
changed from inside the app.

## How your secrets are protected

* **Broker credentials, broker tokens, your API key and your two-factor secret are encrypted** (AES-256-GCM).
* **The encryption key is locked with your OpenAlgo password** (Argon2id) and kept in `openalgo.db`.
* **OpenAlgo Desktop does not use your operating system's keychain** on any platform: not the macOS Keychain, not the Windows Credential Manager, not the Linux Secret Service.
* **A copy of the folder is useless to anyone without your password.**
* No screen or API ever shows a saved broker secret, password or API key in full after it is saved.
* Logs never contain API keys, broker tokens, OAuth codes, passwords or TOTP secrets.

What this means day to day:

* **Sign in after OpenAlgo starts.** Until you do, the API, the market data feed, TradingView and Chartink webhooks, MCP clients and your broker connection stay off; programs are told "Sign in to OpenAlgo to use the API". Telegram and WhatsApp bots you had switched on start when you sign in.
* **Logging out or quitting locks everything again** and wipes the unlocked key from memory.
* **By default only this computer can connect.** Access from other devices on your network is an explicit switch in Server Settings.

### Two-factor sign-in

Turn on two-factor sign-in under **Profile**, **TOTP** tab, with any
authenticator app. Recommended if you use a tunnel you run yourself or allow
access from other devices.

### If you forget your password

The password cannot be recovered. On the sign-in page, **Forgot password**
sets a new one: your account, settings, strategies and history stay, but you
enter your broker keys again, copy the new API key into your tools, and set
up two-factor sign-in again. **Reset account** on the same page removes the
account and its keys entirely.

## Backing up

1. Quit OpenAlgo Desktop.
2. Copy the whole data folder somewhere safe.

To restore, quit the app and copy the folder back. A backup opens on any
computer with the password you had when you made it, because the locked keys
travel with it.

After a password reset or an account reset, make a new backup. Backups made
before a reset still open with the password you had then.

## Your data is backed up before every update

The first time a new version opens your data folder, it copies every database
into `backups/` inside the folder before it changes anything. If the new
version then cannot open the data, it puts that copy back, so everything is
exactly as the old version left it, and says so. As soon as the new version
has opened your data, the copy is deleted, so no older copy of your account,
broker keys or API key is kept.

* That first start can take a little longer when Historify holds a lot of data.
* The backup needs about as much free disk space as your data. If the disk is full, OpenAlgo changes nothing and asks you to free some space.
* An older version never opens a folder that a newer version has used: it says so and changes nothing. Install the newer version again.

## Moving to another computer

1. On the old computer, quit OpenAlgo Desktop and copy the data folder.
2. On the new computer, install the same or a newer version of OpenAlgo Desktop, open it once and quit it.
3. Replace the new computer's data folder with your copy.
4. Open OpenAlgo Desktop and sign in with your password.

Broker sessions are tied to the day; log in to your broker again on the new
computer.

## Removing everything

Uninstalling removes the app but keeps the data folder, so a reinstall picks
up where you left off. To remove your account and data too, delete the data
folder after uninstalling (back it up first if you may come back).
