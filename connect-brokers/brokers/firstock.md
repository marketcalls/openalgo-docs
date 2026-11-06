# Firstock

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Firstock is an Indian discount brokerage firm. Known for its user-friendly interface, Firstock provides mobile, web, and desktop platforms equipped with essential features like real-time market data, advanced charting tools, and order execution capabilities. Its competitive pricing structure and support for algorithmic trading make it an attractive option for both retail and professional traders.

Through OpenAlgo, the Firstock plugin covers equity and equity derivatives on NSE and BSE. Currency (CDS) and commodity (MCX) segments are not part of this integration, so use a plugin that reports those exchanges if you trade them.

## Getting API Credentials

To integrate Firstock with OpenAlgo, follow these steps to obtain your API key and secret:

1\. Log in to Firstock Connect

• Visit [https://connect.thefirstock.com/login?ref=wikiconnect.thefirstock.com](https://connect.thefirstock.com/login?ref=wikiconnect.thefirstock.com).

• Enter your Firstock login credentials.

2\. Generate API Credentials:

<figure><img src="../../.gitbook/assets/Screenshot 2024-12-24 at 2.49.27 PM.png" alt=""><figcaption></figcaption></figure>

• After logging in, navigate to the API Key section in your profile settings.

• Click on Generate API Key.

• Your Vendor Code and API Key will be displayed.

<figure><img src="../../.gitbook/assets/Screenshot 2024-12-24 at 2.49.44 PM.png" alt=""><figcaption></figcaption></figure>

3\. Configure OpenAlgo:

• In your OpenAlgo .env file, set the following variables:

```bash
BROKER_API_KEY = 'Your Vendor Code'
BROKER_API_SECRET = 'Your API Key'
REDIRECT_URL = 'http://127.0.0.1:5000/firstock/callback'
```

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/firstock/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`
* **Index feeds:** `NSE_INDEX`
