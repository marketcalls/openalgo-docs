# IndMoney (INDstocks)

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

IndMoney (INDstocks) is a modern trading infrastructure platform offering APIs that allow traders and developers to build, automate, and execute trading strategies.\
Using IndMoney APIs, users can connect their IndMoney trading account with tools like **OpenAlgo** and create their own fully self-hosted, secure algo-trading setup.

### Steps for Integration

IndMoney uses a simple **Bearer Token** authentication model.

To generate a token:

Visit [**https://www.indstocks.com/app/api-trading**](https://www.indstocks.com/app/api-trading)

<figure><img src="../../.gitbook/assets/ind1.PNG" alt=""><figcaption></figcaption></figure>

1. Enter your registered mobile number and login with the help of OTP

<figure><img src="../../.gitbook/assets/ind2.PNG" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/Indstocks_1.PNG" alt=""><figcaption></figcaption></figure>

2. Open the **Algo Trading** above the chart view

<figure><img src="../../.gitbook/assets/Indstocks_2.PNG" alt=""><figcaption></figcaption></figure>

3. Configure Static IP

<figure><img src="../../.gitbook/assets/Indstocks_5.PNG" alt=""><figcaption></figcaption></figure>

4. Setting up TOTP

TOTP setup is a **one-time** step done on the INDstocks website. You need your phone with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 2FAS or Ente Auth).

Step 1: Open the Access Tokens page

Find the **Setup TOTP** card at the bottom of the page and click **Setup Now**.

<figure><img src="../../.gitbook/assets/indmoney_1.PNG" alt=""><figcaption></figcaption></figure>

Step 2: Start the setup

A panel opens explaining the three steps. Click **Setup TOTP** at the bottom.

<figure><img src="../../.gitbook/assets/indmoney_2.PNG" alt=""><figcaption></figcaption></figure>

Step 3: Scan the QR code

Scan the QR code with your authenticator app, or copy the setup code beneath it and enter it manually.

<figure><img src="../../.gitbook/assets/indmoney_3.PNG" alt=""><figcaption></figcaption></figure>

**Save the setup key somewhere safe before continuing.** It is shown only once and cannot be recovered. If you lose it you must disable TOTP and enrol again.

Click **Continue**

Step 4: Confirm with a code

Enter the current 6-digit code from your authenticator app and click **Enable Login**

You have **5 minutes** to complete this step. If it expires, start again from Step 1.

<figure><img src="../../.gitbook/assets/indmoney_4.PNG" alt=""><figcaption></figcaption></figure>

Step 5: Copy your Client ID

TOTP is now enabled. Copy the **Client ID** shown. This is what OpenAlgo needs.

<figure><img src="../../.gitbook/assets/indmoney_5.PNG" alt=""><figcaption></figcaption></figure>

This generated clientId will be used in OpenAlgo API Key for all authenticated API requests.

### Environment Configuration

The generated client ID is used as the API Key and keep as blank for API SECRET. Below is a sample configuration for the `.env` file:

```
# Indmoney Broker Configuration
BROKER_API_KEY = 'generated_client_id_after_TOTP_setup' 
BROKER_API_SECRET = '' #Keep it blank intentionally
REDIRECT_URL = 'http://127.0.0.1:5000/indmoney/callback'
```

Integrating OpenAlgo with Indmoney's API opens up possibilities for automated trading strategies, providing a powerful tool for traders and developers to exploit market opportunities efficiently. It's essential to follow best practices for API integration, including handling rate limits, managing API keys securely, and ensuring robust error handling and logging mechanisms are in place.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/indmoney/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
