# Compositedge

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

## Compositedge (XTS) Broker Integration

Compositedge is a Bangalore-based discount broker that provides API access via the XTS (Symphony Fintech) platform. This guide will help you integrate Compositedge with OpenAlgo.

***

### Step 1: Enable TOTP (Two-Factor Authentication)

1. Login to [Compositedge XTS](https://xts.compositedge.com/#!/app).

<figure><img src="../../.gitbook/assets/image (94).png" alt=""><figcaption></figcaption></figure>

Go to `My Profile` from the top-right menu.

<figure><img src="../../.gitbook/assets/image (95).png" alt=""><figcaption></figcaption></figure>

Scan the **QR Code** shown using Google Authenticator.

<figure><img src="../../.gitbook/assets/image (97).png" alt=""><figcaption></figcaption></figure>

Save the **Secret Key** and enable **TOTP**.

> This is required for secure API login during authentication.



***

### Step 2: Create API Applications

Login to [XTS Developer Portal](https://xts.compositedge.com/dashboard#!/login).

Once logged in:

1. Go to `My App` > `Create New Application`

<figure><img src="../../.gitbook/assets/image (98).png" alt=""><figcaption></figcaption></figure>

1. Create two separate apps:
   * **Interactive Order API**
   * **Market Data API**

<figure><img src="../../.gitbook/assets/image (99).png" alt=""><figcaption></figcaption></figure>

#### Details to Fill:

* **App Name**: OpenAlgo
* **App Description**: OpenAlgo
* **Redirect URL(required only for Interactive Order API)**: `http://127.0.0.1:5000/compositedge/callback`
* **Company Name**: OpenAlgo (or your own)
* Choose the correct **API Package** depending on the app (Order or Market Data).

<figure><img src="../../.gitbook/assets/image (101).png" alt=""><figcaption></figcaption></figure>

Once submitted, wait for approval from the broker. After approval, the status will turn **Active**.

***

### Step 3: Setup Environment Variables

Refer to the `.sample.env` file in your OpenAlgo folder and prepare your `.env` as follows:

```bash
# Broker Configuration
BROKER_API_KEY = 'YOUR_BROKER_ORDER_API_KEY'
BROKER_API_SECRET = 'YOUR_ORDER_API_SECRET'

BROKER_API_KEY_MARKET = 'YOUR_BROKER_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_BROKER_MARKET_API_SECRET'

REDIRECT_URL = 'http://127.0.0.1:5000/compositedge/callback'
```

Replace the values with actual credentials shown on your developer dashboard once approved.

***

### Step 4: Start OpenAlgo

Once all environment variables are set and your apps are **Active**, you can now start OpenAlgo.

> Ensure you have installed dependencies and set up the broker configuration properly. OpenAlgo will now be able to place orders and fetch market data through Compositedge's XTS API.

***



This completes the integration process for Compositedge broker with OpenAlgo.

Integrating OpenAlgo with Compositedge’s XTS API empowers traders and developers to automate and streamline their trading workflows with precision and speed. By leveraging both order execution and market data APIs, users can build robust trading systems capable of reacting to market conditions in real time. Always ensure secure handling of API credentials, implement proper error handling, and monitor your integration to maintain reliability and compliance.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/compositedge/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
