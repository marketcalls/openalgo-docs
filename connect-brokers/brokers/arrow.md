# Arrow

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

## Arrow

Arrow ([arrow.trade](https://app.arrow.trade/)) is an ultra-low latency, speed-first retail brokerage and API platform built by **iRage Broking** (one of India's leading algorithmic and High-Frequency Trading firms). It provides ultra-fast APIs, zero intraday/F\&O brokerage, and institutional-grade tools to retail investors, regulated by NSE, BSE, and MCX. This API, used in the context of OpenAlgo integration, enables automated trading strategies, real-time market data access, order management, and more.

The integration process involves creating an app in the Trading API section, capturing the generated credentials, and configuring them in OpenAlgo's environmental variables.

#### Prerequisites

Before proceeding with authentication, please make sure you have:

1\)Valid Arrow user credentials

2\)Registered your redirect URL in the developer apps section (click on the profile icon and then click on **Trading API's** on the dropdown menu) of the main [Trading App](https://app.arrow.trade/)

<figure><img src="../../.gitbook/assets/image (159).png" alt=""><figcaption></figcaption></figure>

3\)Filled in the form with the required data (static IP is now mandatory as per the latest SEBI Circular)

4\)Your application credentials, `appID` and `appSecret`, handy (click on the **+Create New** button in the Trading API section)

#### App Registration

Goto the main [Trading App](https://app.arrow.trade/) and login with your credentials. Sign up if you are a new user.

Step 1: Click on the profile icon and select **Trading API's** from the dropdown menu.

Step 2: Click the **+Create New** button to open the **Create Trading API** form.

Step 3: Fill in the form with the required details.

<figure><img src="../../.gitbook/assets/image (160).png" alt=""><figcaption></figcaption></figure>



* **App name**: a name to identify your app, for example `openalgo`
* **App Icon**: an optional icon for your app
* **Redirect URL**: `http://127.0.0.1:5000/arrow/callback`
* **Postback URL**: a valid URL for order postback notifications (a dummy url such as `https://google.com` can be used)
* **Description**: a short description of your app, for example `openalgo`
* **Static IP Address**: your static IP, now mandatory as per the SEBI circular, for example `103.227.96.122`

Step 4: Click **Create key**.

Step 5: On the **App Created Successfully!** screen you will see your **App ID** and **App Secret**. Copy both and keep the App Secret secure.



<figure><img src="../../.gitbook/assets/image (161).png" alt=""><figcaption></figcaption></figure>

Save the generated `appID` and `appSecret`. Later we will be adding them in the [environmental variable](https://docs.openalgo.in/getting-started/windows-installation/environmental-variables).

Here is a sample of how the details would appear in a .env file for reference:

```
BROKER_API_KEY = 'your_app_id_here'
BROKER_API_SECRET = 'your_app_secret_here'
REDIRECT_URL = 'http://127.0.0.1:5000/arrow/callback'
```

Integrating OpenAlgo with Arrow's Trading API opens up possibilities for automated trading strategies, providing a powerful tool for traders and developers to act on market opportunities efficiently. It's essential to follow best practices for API integration, including handling rate limits, managing credentials securely, and ensuring robust error handling and logging mechanisms are in place.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/arrow/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
