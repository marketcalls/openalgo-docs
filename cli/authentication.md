---
description: Connect the OpenAlgo CLI to one or more OpenAlgo servers with profiles or environment variables
---

# Authentication and Profiles

OpenAlgo authenticates every request with a single API key issued by your OpenAlgo server. The key is valid only for the server that issued it, so the CLI always stores and resolves the key together with that server's host.

Generate the key on the OpenAlgo server's **API Key** page.

## Profiles

A profile is a named host and API key pair. `openalgo profile login` prompts for the API key without echoing it, checks it against the server, stores the profile, and makes it the active profile.

```bash
openalgo profile login                                   # default profile, http://127.0.0.1:5000
openalgo profile login --host https://algo.example.com   # remote server
openalgo profile login --host http://192.168.1.10:5000 --name office
```

| Command | Purpose |
|---|---|
| `openalgo profile login` | Save a host and API key as a profile |
| `openalgo profile list` | List all profiles |
| `openalgo profile switch <name>` | Switch the active profile |
| `openalgo profile logout [name]` | Remove a profile (the `default` profile when no name is given) |
| `openalgo -p <name> <command>` | Use a profile for one command |

`profile login` flags:

| Flag | Purpose |
|---|---|
| `--host` | OpenAlgo server URL. Default `http://127.0.0.1:5000`. |
| `--key` | API key. Prompted without echo when omitted. |
| `--name` | Profile name. Default `default`. |
| `--no-validate` | Skip the API key check against the server. |
| `--ws-url` | WebSocket URL for `stream` commands. Derived from `--host` by default. See [Streaming](streaming.md). |

Avoid `--key` in shared shells, because the key is then recorded in shell history. Prefer the prompt, or environment variables for automation.

## Environment Variables

For scripts, CI, and agents, environment variables keep the key off disk:

```bash
export OPENALGO_API_KEY=<your_api_key>
export OPENALGO_HOST=http://127.0.0.1:5000   # optional, this is the default
openalgo account funds --quiet
```

## Credential Resolution

The CLI uses the first complete credential bundle and never mixes fields across sources:

1. `OPENALGO_API_KEY`, with `OPENALGO_HOST` (default `http://127.0.0.1:5000`).
2. The selected profile's `api_key`, with the profile's `host` (default `http://127.0.0.1:5000`).

When `OPENALGO_API_KEY` is set, any profile on disk is ignored. `OPENALGO_HOST` on its own is ignored, so a stray host variable can never send a stored profile key to a different server. The same rule applies to `OPENALGO_WS_URL`.

The API key is never printed, including in `--dry-run`, `--verbose`, and `--debug` output.

## Multiple OpenAlgo Instances

OpenAlgo is single-user, but many traders run several instances side by side, one per broker or account. Instance *n* listens on port `5000+n-1`, with its WebSocket server on `8765+n-1`:

| Instance | REST host | WebSocket |
|---|---|---|
| 1 | `http://127.0.0.1:5000` | `ws://127.0.0.1:8765` |
| 2 | `http://127.0.0.1:5001` | `ws://127.0.0.1:8766` |
| 3 | `http://127.0.0.1:5002` | `ws://127.0.0.1:8767` |

Create one profile per instance and select it with `-p` (`--profile`):

```bash
openalgo profile login --name zerodha --host http://127.0.0.1:5000
openalgo profile login --name dhan    --host http://127.0.0.1:5001
openalgo profile login --name angel   --host https://angel.example.com

openalgo -p zerodha position list
openalgo -p dhan account funds
openalgo -p dhan stream ltp --symbols NSE:SBIN    # connects to ws://127.0.0.1:8766
```

Each profile keeps its own host and API key, and a key is only ever sent to the host it belongs to. The WebSocket URL is derived per profile with the same port offset.

## Configuration Files

| Path | Contents |
|---|---|
| `~/.config/openalgo/config.yaml` | Global settings, including the active profile |
| `~/.config/openalgo/profiles/<name>.yaml` | One profile: `host`, `api_key`, and optional `ws_url` |

Files are written with `0600` permissions. Set `OPENALGO_CONFIG_DIR` to use a different directory.

## Environment Variable Reference

| Variable | Description |
|---|---|
| `OPENALGO_API_KEY` | API key. When set, it takes precedence over any profile. |
| `OPENALGO_HOST` | Server address used with `OPENALGO_API_KEY`. Default `http://127.0.0.1:5000`. |
| `OPENALGO_WS_URL` | WebSocket URL for `stream` commands. Used only with `OPENALGO_API_KEY`; profiles use their `ws_url` field. |
| `OPENALGO_PROFILE` | Profile name to use. |
| `OPENALGO_OUTPUT` | Default output format: `json` or `csv`. |
| `OPENALGO_CONFIG_DIR` | Config directory. Default `~/.config/openalgo`. |
| `OPENALGO_QUIET` | Suppress non-data output such as warnings, hints, and color. |
| `OPENALGO_VERBOSE` | Show HTTP request summaries on stderr. |
| `OPENALGO_DEBUG` | Show HTTP request and response headers and bodies on stderr, with the API key redacted. |
| `OPENALGO_TRACE` | Show the HTTP timing breakdown on stderr. |

## Checking the Connection

```bash
openalgo ping      # the API key resolves to an active broker session
openalgo doctor    # config, active profile, key source, connectivity, analyzer mode
openalgo doctor --profile office
```

Exit code `2` means authentication failed. Regenerate the key on the server's API Key page and run `openalgo profile login` again, or fix `OPENALGO_API_KEY`.
