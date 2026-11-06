# HDFC Sky

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

HDFC Sky (hdfcsky.com (https://www.hdfcsky.com/)) is the discount broking and investment platform from HDFC Securities, offering equity, F\&O, currency and commodity trading with a flat-fee brokerage model. Its Open API (developer.hdfcsky.com (https://developer.hdfcsky.com/)) exposes REST and WebSocket endpoints for order placement, portfolio and funds management, and market data. Regulated by NSE, BSE and MCX, this API, used in the context of OpenAlgo integration, enables automated trading strategies, real-time market data access, order management, and more.

The integration process involves logging in to the HDFC Sky Open API developer portal, creating a Trading API app, capturing the generated API Key and API Secret, and configuring them in OpenAlgo's environmental variables.

#### **Prerequisites**

Before proceeding with authentication, please make sure you have:

1\) A valid HDFC Sky trading account (Client ID / registered Email / Mobile number)

2\) Your registered mobile and email available to receive the login OTP

3\) Registered your redirect URL in the developer portal (created inside the **My Apps** section of [developer.hdfcsky.com](https://developer.hdfcsky.com/))

4\) A static IP address ready (mandatory as per the latest SEBI Circular; the app form provides Primary and Secondary Static IP fields)

5\) Your application credentials, **API Key** and **API Secret**, handy (generated after you click **Create** in the New App form)

#### **App Registration**

Goto the HDFC Sky Open API developer portal at [developer.hdfcsky.com](https://developer.hdfcsky.com/) and log in with your HDFC Sky credentials.

<figure><img src="../../.gitbook/assets/hdfcsky_1.PNG" alt=""><figcaption></figcaption></figure>

Step 1: On the home page, click the **Login** button in the top-right corner.

Step 2: On the Login screen, enter your **Client ID / Email ID / Mobile No.** and click **Proceed to HDFC SKY**. (New users can click **Sign Up**.)

<figure><img src="../../.gitbook/assets/hdfcsky_2.PNG" alt=""><figcaption></figcaption></figure>

Step 3: Enter the **4 digit OTP** sent to your registered mobile number and email ID to complete authentication.

Step 4: After login, a **My Apps** menu item appears in the top navigation bar. Click on **My Apps**.

<figure><img src="../../.gitbook/assets/hdfcsky_3.PNG" alt=""><figcaption></figcaption></figure>

Step 5: In the **My Apps** section, click the **+ Create** button to open the **New App** form.

Step 6: Fill in the form with the required details.

<figure><img src="../../.gitbook/assets/hdfcsky_5.PNG" alt=""><figcaption></figcaption></figure>

* **App Name**: a name to identify your app, for example `openalgo`
* **Redirect URL**: `https://openalgo.local/hdfcsky/callback`
* **Postback URL**: an optional URL for order postback notifications (a dummy URL such as `https://google.com` can be used)
* **Primary Static IP**: your static IP, now mandatory as per the SEBI circular
* **Secondary Static IP**: an optional backup static IP address
* **Description**: a short description of your app, for example `openalgo`
* **APIs in this app**: keep **Trading API** selected (it enables placing orders and managing Stocks, Futures and Options)

Step 7: Click **Create**.

> Note: Your created app will be **deactivated by default**. Go to the **My Apps** section and activate it before using the credentials.

Step 8: In the **My Apps** list, confirm the app status shows **Active**. Reveal (eye icon) and **Copy** the **API Key** and **API Secret**.

<figure><img src="../../.gitbook/assets/hdfcsky_6.PNG" alt=""><figcaption></figcaption></figure>

Here is a sample of how the details would appear in a .env file for reference:

```
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'https://openalgo.local/hdfcsky/callback'
```

Integrating OpenAlgo with HDFC Sky's Open API opens up possibilities for automated trading strategies, providing a powerful tool for traders and developers to act on market opportunities efficiently. It's essential to follow best practices for API integration, including handling rate limits, managing credentials securely, and ensuring robust error handling and logging mechanisms are in place.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/hdfcsky/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
