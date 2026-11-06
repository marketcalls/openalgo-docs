# Zebu

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Zebu, a leading stock trading platform, offers robust API services for traders and developers looking to integrate algorithmic trading solutions into their platforms. The Zebu MYNT API enables access to real-time market data, portfolio management, and trade execution for stocks, commodities, and mutual funds.<br>

To integrate Zebu’s API, follow the steps below:

### API Key Registration



Before using the API, you need to generate an API key and API secret.



1\. Login to Zebu MYNT

Go to the [https://mynt.zebuetrade.com/login](https://mynt.zebuetrade.com/login) and log in with your Zebu credentials.

<figure><img src="../../.gitbook/assets/zebu1.PNG" alt=""><figcaption></figcaption></figure>

2\. Access API Key Generation

Navigate to Profile ,click on the Client Code at the top right corner and select setting.

<figure><img src="../../.gitbook/assets/zebu2 (1).PNG" alt=""><figcaption></figcaption></figure>

click the OAuth Key button and fill in the details and Update.

<figure><img src="../../.gitbook/assets/zebu3.PNG" alt=""><figcaption></figcaption></figure>

Once generated, the client Id and Secret Code will be provided for the app. These keys are essential for authenticating API requests. Here’s how your .env file might look:

```
BROKER_API_KEY = 'your_userid_here:::your_ClientId_here'
BROKER_API_SECRET = 'your_Secretcode_here'
REDIRECT_URL = 'http://127.0.0.1:5000/zebu/callback'
```

`BROKER_API_KEY` is a single quoted value holding your Zebu user id and the OAuth client id joined by `:::` (for example `Z56004:::Z56004_U`). Quote the whole string once, as shown. Quoting the two halves separately breaks the value and the login fails.

Make sure to store your API credentials securely and handle them with care to prevent unauthorized access.

### Zebu API Integration

Integrating OpenAlgo with Zebu’s MYNT API opens opportunities for algorithmic trading and portfolio management. By using the Zebu API, developers can automate trading strategies and enhance trading experiences for users. Be sure to implement best practices for API rate limits, security, and error handling.

<br>

For further assistance or troubleshooting, refer to [Zebu API Documentation](https://zebumyntapi.web.app).

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/zebu/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`
