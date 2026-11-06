# IndiaBulls Securities

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

IndiaBulls Securities provides API access through the XTS (Symphony Fintech) platform, served from `https://xts.ibullssecurities.com`. OpenAlgo registers this integration as the broker `ibulls`, and its plugin talks to two XTS endpoints: the Interactive API for orders, positions and holdings, and the Market Data API for quotes, depth and historical candles.

***

### Step 1: Create API Applications

Log in to the IndiaBulls XTS developer dashboard at [https://xts.ibullssecurities.com](https://xts.ibullssecurities.com) with your IndiaBulls credentials.

Once logged in:

1. Go to `My App` > `Create New Application`
2. Create two separate apps:

* **Interactive Order API**
* **Market Data API**

**Details to Fill:**

* **App Name**: OpenAlgo
* **App Description**: OpenAlgo
* **Redirect URL: (leave it empty)**
* **Company Name**: OpenAlgo (or your own)
* Choose the correct **API Package** depending on the app (Order or Market Data).

Once submitted, wait for approval from the broker. After approval, the status will turn **Active**.

***

### Step 2: Setup Environment Variables

Each app issues its own App Key and Secret Key. The Interactive app's pair goes into the plain variables, the Market Data app's pair into the `_MARKET` variables. Refer to the `.sample.env` file in your OpenAlgo folder and prepare your `.env` as follows:

```
# Broker Configuration
BROKER_API_KEY = 'YOUR_BROKER_ORDER_API_KEY'
BROKER_API_SECRET = 'YOUR_ORDER_API_SECRET'

BROKER_API_KEY_MARKET = 'YOUR_BROKER_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_BROKER_MARKET_API_SECRET'

REDIRECT_URL = 'http://127.0.0.1:5000/ibulls/callback'
```

Replace the values with actual credentials shown on your developer dashboard once approved.

{% hint style="warning" %}
The broker code in the redirect URL is `ibulls`, not `indiabulls`. OpenAlgo reads the active broker out of `REDIRECT_URL`, so a different spelling is rejected as an invalid broker.
{% endhint %}

***

### Step 3: Start OpenAlgo

Once all environment variables are set and both apps are **Active**, start OpenAlgo and click **Connect** on the IndiaBulls Securities broker page. There is no broker login screen to complete: OpenAlgo posts your App Key and Secret Key straight to the XTS session endpoint and receives the interactive token, the market data feed token and your user id in one step.

This completes the integration process for IndiaBulls Securities with OpenAlgo.

Integrating OpenAlgo with the IndiaBulls XTS API lets you automate order execution and consume real-time market data from one place. Always ensure secure handling of API credentials, implement proper error handling, and monitor your integration to maintain reliability and compliance.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/ibulls/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
