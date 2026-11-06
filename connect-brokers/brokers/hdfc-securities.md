# HDFC Securities

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

HDFC Securities InvestRight is the full-service broking platform from HDFC Securities, offering equity, F\&O, currency and commodity trading. Its **InvestRight Open API** exposes a REST API for orders, positions, holdings, funds and LTP snapshots, plus a Protobuf WebSocket feed for live market data. The developer portal and documentation are at [https://developer.hdfcsec.com](https://developer.hdfcsec.com).

The integration process involves logging in to the InvestRight developer portal, creating an app to generate the API Key and API Secret, and configuring them in OpenAlgo's environmental variables.

**Prerequisites**

Before proceeding with authentication, please make sure you have:

1. A valid HDFC Securities InvestRight trading account (Client ID / registered Email / Mobile number)
2. Your registered mobile and email available to receive the login OTP
3. Registered your redirect URL in the developer portal (created inside the **My Apps** section)
4. A static IP address ready (mandatory as per the latest SEBI Circular; the app form asks for it)
5. Your application credentials, **API Key** and **API Secret**, handy (generated after you create and activate the app)

**App Registration**

Goto the HDFC Securities InvestRight developer portal at [https://developer.hdfcsec.com](https://developer.hdfcsec.com) and log in with your credentials.

Step 1: On the home page, click the **Login** button in the top-right corner.

Step 2: On the Login screen, enter your **Client ID / Email ID / Mobile No.** and click submit.

Step 3: Enter the **4 digit OTP** sent to your registered mobile number and email ID to complete the login.

Step 4: After login, a **My Apps** menu item appears in the top navigation bar. Click on it.

Step 5: In the **My Apps** section, click the **+ Create** button to open the **New App** form.

Step 6: Fill in the form with required details.

* **App Name**: a name to identify your app, for example `openalgo`
* **Redirect URL**: `https://openalgo.local/hdfcsecurities/callback`
* **Postback URL**: an optional URL for order postback notifications (a dummy URL is acceptable; OpenAlgo does not consume postbacks)
* **Primary Static IP**: your static IP, now mandatory as per the SEBI circular
* **Secondary Static IP**: an optional backup static IP address
* **Description**: a short description of your app, for example `openalgo`
* **APIs in this app**: keep **Trading API** selected (it enables placing orders and reading the order book, positions and holdings)

Step 7: Click **Create**.

{% hint style="warning" %}
Your created app will be deactivated by default. Go to the **My Apps** section and activate it before using the credentials.
{% endhint %}

Step 8: In the **My Apps** list, confirm the app status shows **Active**. Reveal (eye icon) and copy the generated **API Key** and **API Secret**.

Here is a sample of how the details would appear in a .env file:

```
BROKER_API_KEY = 'your_api_key_here'
BROKER_API_SECRET = 'your_api_secret_here'
REDIRECT_URL = 'https://openalgo.local/hdfcsecurities/callback'
```

By integrating HDFC Securities InvestRight with OpenAlgo you can automate order placement, monitor positions and stream live market data across all OpenAlgo surfaces. As a best practice, keep your API Key and API Secret out of version control, restrict them to your registered static IP, and rotate them from the developer portal if you suspect they have been exposed.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/hdfcsecurities/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
