# Zerodha

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Zerodha is a leading name in the Indian financial services industry, acclaimed for its discount brokerage model and tech-centric approach to trading. Kite by Zerodha is their flagship trading platform, known for its intuitive user interface and powerful performance. Kite API is a set of REST-like APIs that exposes Zerodha's trading functionalities programmatically, allowing developers to harness the capabilities of the Kite platform within their own custom applications.

{% embed url="https://www.youtube.com/watch?v=uZ6PD6UDxrg" %}



The Kite API by Zerodha is particularly popular among algorithmic traders and fintech developers, as it provides real-time data feeds, order placement, portfolio management, and a host of other critical trading operations. The API ensures seamless integration with Zerodha's services, enabling the development of automated trading bots, analytical tools, and other innovative trading solutions.

<figure><img src="../../.gitbook/assets/image (111).png" alt=""><figcaption></figcaption></figure>

#### API Key and API Secret Creation Process

The process to create an API key and API secret for Zerodha's Kite API involves the following steps:

1. **Visit the Zerodha Kite Developer Portal**: Access the developer portal by visiting `https://developers.kite.trade/login`.
2. **Create an Application**: Click on the 'Create App' button to start the process of registering a new application.
3. **Enter Application Details**: You will be asked to provide details such as the App Name, your Zerodha Client ID, and the Redirect URL. The Redirect URL is important for OAuth authentication, as users will be redirected here after successful authentication with Zerodha.
4. **Optional App Logo**: Uploading an app logo is optional, but it can help users recognize your application.
5. **Save Changes**: After filling in all required fields, click on 'Save Changes' to register your application with Zerodha.
6. **Copy API Credentials**: Post-registration, you will be given an API Key and API Secret. These credentials are essential for making API requests and should be stored securely.

<figure><img src="../../.gitbook/assets/Zerodha Kite Connect.png" alt=""><figcaption></figcaption></figure>

Here is how you would typically store these details in a `.env` file:

```
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/zerodha/callback'
```

Utilizing the Kite API from Zerodha presents a wealth of opportunities for developers and traders aiming to create bespoke trading tools and strategies. Leveraging this API effectively calls for a commitment to best practices such as secure storage and management of API keys, mindful adherence to API rate limits, and the implementation of solid error handling and logging mechanisms. When harnessed properly, the Kite API can become a powerful asset in the arsenal of any trader or fintech application developer, enabling them to capitalize on the dynamism of financial markets with precision and efficiency.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/zerodha/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`, `NCO`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`, `MCX_INDEX`, `GLOBAL_INDEX`
