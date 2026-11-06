# Upstox

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Upstox, a leading online stock trading platform in India, offers a comprehensive suite of services for traders and investors alike. Catering to the evolving needs of the fintech ecosystem, Upstox extends a robust API interface to developers and fintech startups keen on embedding or leveraging algorithmic trading solutions. This API facilitates the automation of trading strategies, grants access to live market data, and supports a myriad of other financial services functions.

{% embed url="https://www.youtube.com/watch?v=dMXAmgJ5nUg" %}

Initiating integration with Upstox's API generally involves several key steps:

### Generating API Key and API Secret

**API Key Registration**: Developers must register for an API key through Upstox Accounts - Developer Apps portal, which serves as the authentication mechanism for API requests.

Goto the [Upstox Accounts -  Developer Apps](https://account.upstox.com/developer/apps) Portal and login with your upstox login credentials.&#x20;

Press Create New App and&#x20;

Enter the App name, Redirect the URL and select I accept the terms and conditions check box, and press the Done button

<figure><img src="../../.gitbook/assets/image (34).png" alt=""><figcaption></figcaption></figure>

API Key and API Secret Key generated for the app OpenAlgo

<figure><img src="../../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

Save the generated apikey and apisecret. Later we will be adding the apikey in the [environmental variable](https://docs.openalgo.in/getting-started/windows-installation/environmental-variables) along with the redirect url

Here is a sample of how the details would appear in a .env file for reference:

```
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/upstox/callback'
```



Integrating OpenAlgo with Upstox'sAPI opens up possibilities for automated trading strategies, providing a powerful tool for traders and developers to exploit market opportunities efficiently. It's essential to follow best practices for API integration, including handling rate limits, managing API keys securely, and ensuring robust error handling and logging mechanisms are in place.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/upstox/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`, `GLOBAL_INDEX`
