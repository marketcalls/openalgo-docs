# Pocketful

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

***

### Pocketful

Pocketful is a SEBI-registered Indian stock broker offering a modern trading platform with support for multiple asset classes and a powerful API suite. With a focus on automation, speed, and flexibility, Pocketful provides developers and trading system builders direct access to its brokerage services through the [developer portal](https://api.pocketful.in/).

For OpenAlgo integration, Pocketful enables algorithmic trading with secure API authentication, real-time data streaming, and efficient order placement across equities and derivatives.

***

#### App Registration and API Credentials

The integration begins with creating an app via the Pocketful Developer Portal. This app generates the required credentials for secure API access.

***

**Step-by-Step Guide to Registering Your App**

**Step 1: Visit the Developer Portal**\
Go to [https://api.pocketful.in](https://api.pocketful.in/) and log in with your registered email ID or client ID.

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Step 2: Navigate to 'Apps' and Create a New App**\
Click on “+ Create App”.

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**Step 3: Fill App Details**

* App Name: `OpenAlgo`
* Redirect URL: `http://127.0.0.1:5000/pocketful/callback`
* Accept the terms and conditions and click **Create App**

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Once created, the following credentials will be generated:

* App ID: use as `API_KEY`
* App Secret: use as `API_SECRET`

<figure><img src="../../.gitbook/assets/image (107).png" alt=""><figcaption></figcaption></figure>

***

#### API Authentication

Pocketful follows OAuth2-based authentication using redirect URI and access tokens. After app creation, OpenAlgo uses the client credentials to initiate authorization and securely fetch access tokens.

Here is a sample of how the details would appear in a `.env` file for reference:

```env
BROKER_API_KEY = 'your_app_id_here'
BROKER_API_SECRET = 'your_app_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/pocketful/callback'
```

***

#### Connecting Pocketful to OpenAlgo

Once your `.env` file is populated with the credentials, restart OpenAlgo, open the broker page and click **Connect**. OpenAlgo builds the authorization URL from your credentials and sends you to `https://trade.pocketful.in/oauth2/auth`.

After you sign in, Pocketful redirects back to `http://127.0.0.1:5000/pocketful/callback` with an authorization code, which OpenAlgo exchanges for an access token and stores locally. That completes the authentication process.

***

Integrating OpenAlgo with Pocketful's API allows traders and developers to leverage a powerful, cost-effective, and scalable infrastructure for building and deploying fully automated trading strategies. To ensure smooth performance, it is advisable to manage API limits, rotate tokens securely, and build retry/error-handling logic in production systems.

***

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/pocketful/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
