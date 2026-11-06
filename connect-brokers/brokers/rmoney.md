# RMoney (XTS)

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

### RMoney - (Raghunandan Capital Pvt Ltd) Broker Integration

RMoney is a Gandhinagar(Gujarat)-based deep discount broker that provides API access via the XTS (Symphony Fintech) platform. This guide will help you integrate RMoney with OpenAlgo.

#### **Step 1: Create API Applications**

&#x20;Login to [https://xts.rmoneyindia.co.in:3000/dashboard#!/login](https://xts.rmoneyindia.co.in:3000/dashboard#!/login)

<figure><img src="../../.gitbook/assets/Rmoney9.png" alt=""><figcaption></figcaption></figure>

Once logged in:

1. Go to `My App` > `Create New Application`
2. Create two separate apps:

* **Interactive Order API**
* **Market Data API**

<figure><img src="../../.gitbook/assets/Rmoney4 (1).png" alt=""><figcaption></figcaption></figure>

**Details to Fill:**

* **App Name**: OpenAlgo
* **App Description**: OpenAlgo
* **Redirect URL: (leave it empty)**
* **Company Name**: OpenAlgo (or your own)
* Choose the correct **API Package** depending on the app (Order or Market Data).

<figure><img src="../../.gitbook/assets/Rmoney7.png" alt=""><figcaption></figcaption></figure>

#### Step 2: Setup Environment Variables

Refer to the `.sample.env` file in your OpenAlgo folder and prepare your `.env` as follows:

```
# Broker Configuration
BROKER_API_KEY = 'YOUR_BROKER_ORDER_API_KEY'
BROKER_API_SECRET = 'YOUR_ORDER_API_SECRET'

BROKER_API_KEY_MARKET = 'YOUR_BROKER_MARKET_API_KEY'
BROKER_API_SECRET_MARKET = 'YOUR_BROKER_MARKET_API_SECRET'

REDIRECT_URL = 'http://127.0.0.1:5000/rmoney/callback'
```

Replace the values with actual credentials shown on your developer dashboard once approved.

#### **Step 3: Start OpenAlgo**

Once all environment variables are set and your apps are Active, you can now start OpenAlgo.

Ensure you have installed dependencies and set up the broker configuration properly. OpenAlgo will now be able to place orders and fetch market data through RMoney's XTS API.

This completes the integration process for RMoney broker with OpenAlgo.

Integrating OpenAlgo with RMoney’s XTS API empowers traders and developers to automate and streamline their trading workflows with precision and speed. Users can build robust trading systems capable of reacting to market conditions in real time. Always ensure secure handling of API credentials, implement proper error handling, and monitor your integration to maintain reliability and compliance.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/rmoney/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
