# Fyers

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Fyers is a cutting-edge technology-driven brokerage firm that offers a comprehensive trading and investment platform. Renowned for their user-friendly applications and robust trading tools, Fyers aims to provide traders with an efficient and streamlined trading experience. They cater to a wide spectrum of users from casual investors to active day traders with services designed to accommodate various trading styles and strategies.



{% embed url="https://www.youtube.com/watch?v=lintXPX5LzE" %}

For developers and algo traders interested in leveraging the Fyers API, the integration process typically includes the following steps:

<figure><img src="../../.gitbook/assets/Fyers App Details.png" alt=""><figcaption></figcaption></figure>

1. **Navigate to the Fyers MyAPI Dashboard**: Access the [MyAPI Dashboard](https://myapi.fyers.in/dashboard). This dashboard is the central hub for all API-related activities.
2. **Create an Application**: Within the dashboard, there's an option to 'Create App'. This is the initial step in registering a new application that will interact with the Fyers platform through the API.
3. **Fill in Application Details**: You'll be prompted to provide essential details about your application such as the App Name and Redirect URL. The Redirect URL is critical as it's used for securely redirecting users after they have authenticated with Fyers.
4. **Optional App Description and Logo**: Although optional, adding a description and a logo for your app is recommended as it provides users with additional information about your application's purpose and branding.
5. **Save Changes**: Once all the information is provided, save the changes to register the application with Fyers.
6. **Copy the App Credentials**: After saving your app, you'll receive an APP ID (apikey) and a Secret ID (apisecret). These credentials are essential for authenticating API requests and should be stored securely.
7. **Utilize in .env File**: The obtained credentials, along with the Redirect URL, are typically used in a .env file for environment variables which your application can use to interact with the API.

<figure><img src="../../.gitbook/assets/Fyers App Credentials.png" alt=""><figcaption></figcaption></figure>

Here is a sample of how the details would appear in a .env file for reference:

```bash
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/fyers/callback'
```

Integrating with Fyers API marks the beginning of a new realm of possibilities for automated and algorithmic trading strategies, offering traders and developers a sophisticated platform to tap into market opportunities with agility and precision. To maximize the potential of the Fyers API, it's crucial to adhere to best practices for API integration. This includes being vigilant about handling rate limits, ensuring the secure management of API keys, and implementing comprehensive error handling and logging mechanisms. By doing so, one can ensure a reliable and effective trading experience that leverages the full capabilities of Fyers' advanced trading infrastructure.

<br>

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/fyers/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
