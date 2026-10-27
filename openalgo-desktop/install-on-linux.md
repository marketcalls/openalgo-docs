# Install on Linux

For 64-bit Linux with a desktop: Ubuntu 22.04 or later, Debian 12 or later,
Linux Mint 21 or later, on x64 PCs or 64-bit ARM (ARM64) computers. There is
no Raspberry Pi version; on a Pi use
[OpenAlgo web](../installation-guidelines/getting-started/raspberry-pi.md).

## 1. Choose a package

| Your computer | `.deb` (recommended) | AppImage |
| --- | --- | --- |
| 64-bit PC (x64) | `_amd64.deb` | `_amd64.AppImage` |
| 64-bit ARM (ARM64) | `_arm64.deb` | `_aarch64.AppImage` |

Not sure which one you have? Run `uname -m` in a terminal: `x86_64` is x64,
`aarch64` is ARM64.

* **`.deb`** installs like any other Ubuntu or Debian package and brings the libraries it needs with it. Choose it on Ubuntu, Debian and Mint.
* **AppImage** is one file that runs without installing. It needs WebKitGTK 4.1, GTK 3 and FUSE 2 already on the system. Choose it on other distributions, or if you cannot install packages.

## 2a. Install the `.deb`

```bash
cd ~/Downloads
sudo apt install ./OpenAlgo.Desktop_1.0.3_amd64.deb
```

(Use the exact name of the file you downloaded; the `./` matters.) This also
installs WebKitGTK 4.1 and GTK 3 if they are missing.

Start the app from your desktop's app menu, **OpenAlgo Desktop**, or run:

```bash
openalgo-desktop
```

## 2b. Or run the AppImage

```bash
cd ~/Downloads
chmod +x OpenAlgo*.AppImage
./OpenAlgo*.AppImage
```

If it says FUSE is missing, install FUSE 2 and run it again:

| System | Command |
| --- | --- |
| Ubuntu 22.04, Debian 12, Mint 21 | `sudo apt install libfuse2` |
| Ubuntu 24.04 and later | `sudo apt install libfuse2t64` |

Or use the `.deb` instead.

Keep the AppImage in a folder of its own (for example `~/Applications`): the
in-app updater replaces that file when you update.

## 3. Open it

The app opens on the OpenAlgo home page. Linux shows no security warning.
Continue with [First Run and Broker Login](first-run-and-broker-login.md).

## Starting and quitting

| Installed as | Start | Quit |
| --- | --- | --- |
| `.deb` | App menu, **OpenAlgo Desktop**, or `openalgo-desktop` in a terminal | Close the window |
| AppImage | `./OpenAlgo*.AppImage` from its folder | Close the window |

When something is still running (strategies, OpenScript runs, scalping stops,
open orders), quitting asks first.

## What Linux needs

* A graphical desktop session (GNOME, KDE, Cinnamon, XFCE and others). OpenAlgo Desktop cannot run on a headless server, over SSH only, or in Docker; use OpenAlgo web there.
* WebKitGTK 4.1 and GTK 3 (installed with the `.deb`).
* glibc 2.35 or newer (Ubuntu 22.04 and later have it).

## Where your data is

`~/.local/share/com.openalgo.desktop`. OpenAlgo Desktop does not use the
Secret Service or GNOME Keyring: your keys are locked with your OpenAlgo
password inside the data folder. See
[Data, Security and Backups](data-security-and-backups.md).

## Updating and uninstalling

| Installed as | Update | Uninstall |
| --- | --- | --- |
| `.deb` | The app tells you a new version is out and links to the release page; download the new `.deb` and install it over the old one with `sudo apt install ./<new file>.deb` | `sudo apt remove open-algo-desktop` (the package name), or your software manager |
| AppImage | In the app: **Update** replaces the `.AppImage` file | Delete the `.AppImage` file |

Your data is kept either way. See
[Updating and Uninstalling](updating-and-uninstalling.md).

## Problems

| What you see | What to do |
| --- | --- |
| AppImage: "FUSE" or "libfuse.so.2" missing | `sudo apt install libfuse2` (Ubuntu 24.04: `libfuse2t64`), or use the `.deb` |
| `.deb`: "unable to locate" or a dependency error | Run `sudo apt update`, then install again with `./` in front of the file name |
| A blank or white window | Check that WebKitGTK 4.1 is installed: `sudo apt install libwebkit2gtk-4.1-0` |
| "port 5000 is already used by another program" | Close the other program (often OpenAlgo web), or choose another port. See [Ports and Server Settings](ports-and-server-settings.md) |

More in [Troubleshooting and FAQ](troubleshooting-and-faq.md).
