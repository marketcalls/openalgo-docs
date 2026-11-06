# TradeSmart

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

TradeSmart is an Indian discount broker known for its flat-fee brokerage model that keeps trading costs low across equity, derivatives, and commodities. The platform offers fast order execution, real-time data, and a clean web and mobile experience. For automation, TradeSmart exposes a secure REST API built on the Noren v2 stack, letting you integrate it with OpenAlgo using a generated App ID and Secret Key.

### Getting API Credentials

To integrate TradeSmart with OpenAlgo, follow these steps to obtain your App ID and Secret Key:

1. Log in to TradeSmart Web • Open [https://web.tradesmartonline.in/login](https://web.tradesmartonline.in/login) • \
   Enter your TradeSmart login credentials and your OTP/TOTP.
2. From the top right, open your Profile menu, expand **Tools**, and click **API**.

<figure><img src="../../.gitbook/assets/image (162).png" alt=""><figcaption></figcaption></figure>

3. On the API Dashboard, if you have not set up TOTP yet, click **Add/Setup TOTP** at the top and complete the setup first. API access requires TOTP to be enabled.
4.  In the **Generate New API Key** panel, fill out the form: <br>

    • **Name**: a label for the app, for example `Openalgo` \
    • **Primary IP Address**: your static IP (required) \
    • **Secondary IP Address**: optional \
    • **Redirect URL**: `http://127.0.0.1:5000/tradesmart/callback` \
    \
    Tick **I acknowledge the API Terms & Conditions** and click **Generate API Key**.

<figure><img src="../../.gitbook/assets/image (163).png" alt=""><figcaption></figcaption></figure>

5. Your new credential now appears under **Active Credentials**. Toggle **Show Credentials** to reveal the **App ID** and **Secret Key**, then copy both and start building!
6. Configure OpenAlgo: • In your OpenAlgo .env file, set the following variables:

```bash
BROKER_API_KEY = 'client_id:::api_key'
BROKER_API_SECRET = 'secret_key'
REDIRECT_URL = 'http://127.0.0.1:5000/tradesmart/callback'
```

Where: • `client_id` is your TradeSmart login/client id (for example `YTNR739`) • `api_key` is the **App ID** generated on the dashboard • `secret_key` is the **Secret Key** revealed via the eye / Show Credentials toggle

> The Redirect URL in your .env must match the Redirect URL configured on the TradeSmart API Dashboard exactly, and your login IP must match the Primary Static IP you registered.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/tradesmart/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
