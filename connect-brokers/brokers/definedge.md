# Definedge

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

OpenAlgo provides seamless integration with Definedge Securities, enabling you to connect your trading strategies with Definedge’s brokerage services. Follow this guide to set up your Definedge broker account with OpenAlgo.

**Prerequisites**

Before proceeding, ensure you have the following:

* An active Definedge Securities trading account.
* Access to [Definedge Securities Portal](https://myaccount.definedgesecurities.com/).
* OpenAlgo installed and configured on your local machine.

### Steps to Create the Definedge API Secret Key

#### 1. Login to Definedge Securities Portal

* Navigate to [https://myaccount.definedgesecurities.com/](https://myaccount.definedgesecurities.com/).
* Enter your **UCC (Account ID)** and **password**.

<figure><img src="../../.gitbook/assets/one.png" alt=""><figcaption></figcaption></figure>

* Complete with OTP authentication send to your registered mobile and email ID.

<figure><img src="../../.gitbook/assets/two.png" alt=""><figcaption></figcaption></figure>

* This will take you to your dashboard.

#### 2. Access API Key Section

* From the dashboard, go to the **Account** section.
* Click on **Show my API Secret**.
* Here you will find your **API Token** and **API Secret**.

<figure><img src="../../.gitbook/assets/three.png" alt=""><figcaption></figcaption></figure>

**Configuring the .env File**

The Definedge API Token is used as the API key and API Secrets as API Secret itself. Below is a sample configuration for the .env file

\#Definedge Broker Configuration

```
# Definedge Broker Configuration
BROKER_API_KEY = 'your_API_Token_here'
BROKER_API_SECRET = 'your_API_Secret_here' 
REDIRECT_URL = 'http://127.0.0.1:5000/definedge/callback' 
```

**Important Notes**

* Ensure that your **API Secret Key and API Token** are stored securely and is not shared publicly.
* The **REDIRECT\_URL** should match the one registered with your API application.

Follow these steps to integrate Definedge with OpenAlgo successfully. If you encounter any issues, refer to the Definedge API documentation for further assistance.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/definedge/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
