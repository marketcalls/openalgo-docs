# Paytm

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

**Paytm Money** is a technology-first investment platform backed by one of India’s leading fintech companies. With its secure and scalable API infrastructure, Paytm Money empowers developers and traders to build powerful trading systems that can manage portfolios, place real-time orders, and stream live market data with ease. Whether you're building retail trading applications or complex algorithmic strategies, Paytm Money offers a reliable and developer-friendly gateway to the markets.

***

### Step 1: Create App

1. Go to [Paytm Developer Portal](https://developer.paytmmoney.com/)
2. Click on **Create New App**
3.  Choose the following APIs:

    * **Trading API**
    * **Live Broadcast API** (optional, but recommended for real-time data)

    <figure><img src="../../.gitbook/assets/image (3) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>
4. Click **Proceed**

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

***

### Step 2: Enter App Details

Fill out the app details as shown below:

* **App Name:** `openalgo`
* **Product Type:** `Trading Bridge`
* **Redirect URL:** `http://127.0.0.1:5000/paytm/callback`
* **Postback URL:** _(leave empty)_
* **Description:** `openalgo`
* Upload a logo (optional)

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Click **Create App**

***

### Step 3: Copy API Key and Secret

Once your app is in **Active** status:

1. Go to **My Apps**
2. Locate your app (e.g., `openalgo`)
3. Copy the **API Key** and **API Secret**

<figure><img src="../../.gitbook/assets/image (3) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Use these credentials in your OpenAlgo broker configuration.

***

### Configuration

Once you have the credentials, add them to your OpenAlgo configuration:

```dotenv
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/paytm/callback'
```

Make sure your local server is running and accessible at the callback URL you defined earlier.

***

#### What's Next?

Integrating with the Paytm Money API opens the door to building high-performance, automated trading workflows within the OpenAlgo ecosystem. To ensure seamless integration and performance, it’s essential to follow recommended practices such as securely storing your API credentials, managing session states effectively, and implementing robust logging and error-handling routines. With the right setup, Paytm Money becomes a dependable backbone for executing your trading strategies with precision and confidence.

***

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/paytm/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
