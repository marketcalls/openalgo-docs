# Ubuntu (No Custom Domain)

OpenAlgo can be installed on an Ubuntu desktop or laptop by preparing the system, downloading the source code, configuring broker credentials, and launching the application locally.

For traders using an Indian broker, static IP configuration is now mandatory for retail algo trading under SEBI regulations. This must be completed before using transactional broker APIs for live order placement.

{% embed url="https://www.youtube.com/watch?v=gqlAefDwAtw" %}

### System Requirements

Make sure the following are available on your Ubuntu system before you begin.

Python 3.12 or newer (OpenAlgo requires `>=3.12`)

Git

uv package manager

Visual Studio Code or any code editor

Internet connection

Broker API credentials

For Indian brokers, a static IPv4 address

Node.js is not required. The repository ships the pre-built React frontend in `frontend/dist`.

### Step 1 Create a Project Folder

Create a new folder on your Ubuntu desktop or laptop for the OpenAlgo project. The folder name can be anything you prefer.

Open this folder in your code editor.

### Step 2 Check Required Software

Open the terminal inside the project folder and confirm the versions:

```bash
python3 --version    # must report 3.12 or newer
git --version
uv --version
```

If `uv` is missing, install it:

```bash
pip install uv
# or, on PEP 668 systems such as Ubuntu 24.04:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

If `python3` reports anything older than 3.12, install a newer interpreter before continuing. OpenAlgo will not start on 3.11 or below.

### Step 3 Download the OpenAlgo Source Code

Clone the repository into your project folder:

```bash
git clone https://github.com/marketcalls/openalgo.git
cd openalgo
```

### Step 4 Create the Environment File

Copy the sample environment file to `.env`:

```bash
cp .sample.env .env
```

This file holds your broker settings and credentials. Never copy `.sample.env` over an existing `.env` on a working installation: it discards your credentials and replaces `API_KEY_PEPPER` and `FERNET_SALT`, which makes stored passwords and encrypted broker tokens unrecoverable.

### Step 5 Configure Broker Credentials

Open the environment file and update the required values.

You will typically need to enter the following details.

```dotenv
BROKER_API_KEY = 'YOUR_BROKER_API_KEY'
BROKER_API_SECRET = 'YOUR_BROKER_API_SECRET'
REDIRECT_URL = 'http://127.0.0.1:5000/<broker>/callback'
```

Replace `<broker>` with your broker's key, for example `http://127.0.0.1:5000/zerodha/callback`.

Leave `APP_KEY`, `API_KEY_PEPPER` and `FERNET_SALT` at their `OPENALGO_PLACEHOLDER_...` values. OpenAlgo replaces them with fresh random secrets on first start and prints a one-time `[OpenAlgo first-run setup]` message when it does.

The exact values and process depend on the broker you use.

### Step 6 Generate API Credentials from Your Broker

Log in to your broker’s developer portal and create an app for API access.

Depending on the broker, you may need to provide an app name, redirect URL, and other broker specific information.

After the app is created, copy the API key and API secret and paste them into the environment file.

### Step 7 Configure Static IP for Indian Brokers

If you are using an Indian broker, static IP setup is mandatory for retail algo trading under SEBI regulations.

Your broker must whitelist the fixed IP address from which your orders originate. This applies to transactional APIs used for placing, modifying, cancelling, basket, or split orders.

Important points to note

Orders must originate from a whitelisted static IP

This requirement applies from 1 April 2026 for retail algo traders using broker APIs

Most brokers provide primary and secondary IP slots

IP changes are generally allowed only once per week

Home internet connections often use dynamic IPs and are not reliable for this purpose

A static IPv4 address is required because brokers do not generally support IPv6 whitelisting

For desktop users, one option is to request a static IP from the internet service provider. Another option is to use a VPS, which usually includes a static IP by default.

More details are available on the [OpenAlgo static IP page](../static-ip.md).

### Step 8 Save Changes Properly

After updating the environment file, save it carefully.

Whenever you change the API key, API secret, or related broker settings, save the file and restart the application so the changes take effect.

### Step 9 Start OpenAlgo

Launch OpenAlgo from the project directory:

```bash
uv run app.py
```

On the first run, `uv` creates the `.venv` virtual environment and installs every dependency from `pyproject.toml`, so the first launch takes several minutes. Later launches start immediately.

When the server is ready it prints a banner with the live endpoints: the web app on `http://127.0.0.1:5000` and the WebSocket proxy on `ws://127.0.0.1:8765`. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

Press `Ctrl+C` in the terminal to stop OpenAlgo.

### Step 10 Complete First Time Account Setup

When OpenAlgo opens for the first time, you will be taken to the setup screen.

Create your account using the required details.

Username

Email address

Password

Password confirmation

Use a strong password that meets the platform requirements.

### Step 11 Log In to OpenAlgo

After the initial account setup, log in using your OpenAlgo credentials.

This is your application login and is separate from your broker authentication.

### Step 12 Connect Your Broker Account

After logging in, connect your broker account from within OpenAlgo.

Broker login is usually a manual step. In the workflow described, the broker session remains active until the next day at 3:00 AM, after which you must log in again.

### Step 13 Wait for Platform Initialization

After connecting the broker, OpenAlgo opens the main dashboard.

<figure><img src="../.gitbook/assets/openalgo-ui-dashboard.png" alt="OpenAlgo dashboard with account summary cards"><figcaption></figcaption></figure>

At this stage, the platform may begin downloading the master contract. Wait until this process finishes completely.

You should only proceed when the dashboard shows that the system is ready.

Do not start automation until the platform indicates readiness.

### Common Mistakes to Avoid

Do not forget to save the environment file after editing credentials

Do not forget to restart the application after changing broker settings

Do not use a dynamic home IP for Indian broker transactional APIs

Do not begin automation before the dashboard is fully ready

Do not assume the same credential setup process applies to every broker

### Conclusion

Installing OpenAlgo on Ubuntu Desktop involves preparing the system, downloading the project, configuring the environment file, adding broker credentials, setting up static IP when required, launching the application, and completing the first time login flow.

For Indian brokers, static IP compliance is now an essential part of setup and must be completed before live API based trading.
