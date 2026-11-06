# Wisdom Capital

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Wisdom Capital provides API access through the Symphony Fintech XTS platform. This guide helps you integrate Wisdom Capital with OpenAlgo for both order execution and market data streaming.

***

### Step 1: Create API Applications

Login to the [Wisdom Capital Developer Portal](https://trade.wisdomcapital.in/dashboard#!/login).

After logging in:

1. Go to `My App` > `Create New Application`
2. You need to create two applications:
   * One for **Interactive Order API**
   * One for **Market Data API**

<figure><img src="../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

#### Application Setup:

For each app, fill in the following:

* **App Name**: OpenAlgo
* **App Description**: OpenAlgo
* **Select API Package**: Choose `Interactive Order API` or `Market Data API` depending on the app.



<figure><img src="../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

Repeat the process for both API packages.

Once submitted, wait for the apps to be **approved**. The API status will show as **Active** once approved.

<figure><img src="../../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>

***

### Step 2: Setup Environment Variables

Refer to the `.sample.env` file in OpenAlgo and prepare your `.env` with the following structure:

```env
# Broker Configuration
BROKER_API_KEY = 'YOUR_WISDOM_ORDER_API_KEY'
BROKER_API_SECRET = 'YOUR_ORDER_API_SECRET'

BROKER_API_KEY_MARKET = 'YOUR_WISDOM_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_MARKET_API_SECRET'

REDIRECT_URL = 'http://127.0.0.1:5000/wisdom/callback'
```

Replace placeholder values with actual credentials obtained after app approval.

***

### Step 3: Start OpenAlgo

Ensure `.env` is correctly configured and that both APIs (order and market data) are active. Then, start OpenAlgo.

> You can now place live orders and get real-time market data via Wisdom Capital’s XTS API inside OpenAlgo.

***

### Final Note

Integrating OpenAlgo with Wisdom Capital's XTS API gives you access to real-time market data and order execution in a programmable environment. Follow best practices: keep your API keys secure, implement appropriate error handling, and regularly monitor your API usage to ensure a smooth trading experience.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/wisdom/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
