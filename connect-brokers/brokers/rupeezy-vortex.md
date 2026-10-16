# Rupeezy (Vortex)

Rupeezy is a SEBI-registered stockbroker. Its **Vortex API** gives you REST endpoints for orders, GTT, positions, holdings, funds, quotes and historical data, plus a WebSocket for live market data. Developer portal and documentation: [vortex.rupeezy.in](https://vortex.rupeezy.in/docs/latest).

Before you start, make sure you have:

* An active **Rupeezy trading account**
* Access to the mobile number and email registered with that account, for login verification
* A **Redirect (Callback) URL** for your OpenAlgo instance
* A **static IP address**, which SEBI's retail algo trading framework requires for API order placement
* The **Application ID** and **API Key** from the Vortex developer portal

### Step 1: Sign In to the Vortex Developer Portal

1. Go to [https://vortex.rupeezy.in](https://vortex.rupeezy.in).
2. Sign in with your Rupeezy client credentials and finish OTP verification.

### Step 2: Create an Application

1. Open the applications section of the portal and create a new application.
2. Fill in the application details:

| Field                       | Value                                               |
| --------------------------- | --------------------------------------------------- |
| **App Name**                | Any name, e.g. `OpenAlgo`                           |
| **Callback / Redirect URL** | `http://127.0.0.1:5000/rupeezy/callback`            |
| **Whitelisted User**        | Your Rupeezy client code                            |
| **Static IP**               | The public static IP of the server running OpenAlgo |

> **Note:** Only users who are **whitelisted when the application is created** can log in through it. If your client code isn't whitelisted, the Rupeezy login will fail.

If OpenAlgo runs on a server with a domain, use your domain in the callback URL:

https://yourdomain.com/rupeezy/callback

The callback URL registered in the portal must **exactly match** `REDIRECT_URL` in OpenAlgo's `.env`, including the protocol, host, port and path.

### Step 3: Copy Your Credentials

Once the application is created, the portal shows two values:

* **Application ID** (`application_id`)
* **API Key** (`x-api-key`)

> **Important:** The API Key is a secret. Keep it on the server only. Never put it in client-side code, screenshots or public repositories.

### Step 4: Configure OpenAlgo

Open your `.env` file and set the following:

```ini
BROKER_API_KEY = 'your_vortex_application_id'
BROKER_API_SECRET = 'your_vortex_api_key'

REDIRECT_URL = 'http://127.0.0.1:5000/rupeezy/callback'
```

▎ Common mistake: Do not swap these. BROKER\_API\_KEY holds the Application ID, and BROKER\_API\_SECRET holds the API Key.

Restart OpenAlgo after you save the .env file.
