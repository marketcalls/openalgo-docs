# Dhan

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Dhan is a new-generation financial services platform that empowers traders and investors to build, automate, and execute their trading strategies. Through **DhanHQ APIs**, users can connect their Dhan account with tools like **OpenAlgo** and create their own trading automation setup that is fully self-hosted and secure.

{% embed url="https://www.youtube.com/watch?v=Gs657PKGgcE" %}

***

### Overview

Dhan provides two main types of APIs:

| API Type         | Features                                                                                                    | Cost                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Trading APIs** | Order Placement, Position Management, Portfolio & Funds, Order Postbacks, Statement Reports                 | **Free of Cost**                       |
| **Data APIs**    | Real-time Prices, Historical Data (5 years), 20-Level Market Depth, Option Chain APIs, Expired Options Data | ₹499/month or ₹399/month (₹4,788/year) |

***

### Steps for Integration

#### **Step 1: Log in to Dhan Web Portal**

Visit [web.dhan.co](https://web.dhan.co/) and sign in to your Dhan account.

***

#### **Step 2: Access DhanHQ APIs**

Click on your profile icon at the top-right and select **“Access DhanHQ APIs”**.

From this page, you can:

* Generate API Keys
* Enable TOTP
* Setup Static IP
* Manage Trading & Data APIs

<figure><img src="../../.gitbook/assets/image (128).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 3: Switch to API Key Mode**

By default, DhanHQ opens in **Access Token** mode.\
Use the toggle on the top-right to switch to **API Key Mode**.

<figure><img src="../../.gitbook/assets/image (129).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 4: Generate a New API Key**

1. Under **Generate new API Key**, enter:
   * **Application Name**: e.g. `openalgo`
   * **Redirect URL**: `http://127.0.0.1:5000/dhan/callback`
   * (Optional) **Postback URL** if your system supports order postbacks
2. Click **Generate API Key**.
3. Copy your:
   * **API Key**
   * **API Secret**

<figure><img src="../../.gitbook/assets/image (130).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 5: Retrieve Client ID**

1. From the same profile menu, select **“My Profile on Dhan.”**
2. Scroll to **Profile Details** and copy your **Client ID**.\
   This will be used as part of your API credentials.

<figure><img src="../../.gitbook/assets/image (131).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 6: Enable TOTP (Mandatory)**

* Under **Optional Settings - down below the API Key section**, click **Set-up TOTP.**
* Follow the instructions to configure two-factor authentication for API access.
* This is **mandatory** for all Dhan API users.

***

#### **Step 7: Setup Static IP (Optional / Mandatory from Jan 2026)**

* Click **Static IP Setting** under Optional Settings.
* Add up to two IP addresses (e.g., your server or office IP).
* You can update these every 7 days.
* From **January 2026**, setting at least one **Static IP** will become mandatory.

<figure><img src="../../.gitbook/assets/image (132).png" alt=""><figcaption></figcaption></figure>

***

### Environment Configuration

Once your credentials are generated, configure them in your `.env` file:

```env
BROKER_API_KEY = 'your_dhan_clientid:::your_dhan_apikey'
BROKER_API_SECRET = 'your_dhan_apisecret'
REDIRECT_URL = 'http://127.0.0.1:5000/dhan/callback'
```

***

### API Costs Summary

| API Type         | Description                                                       | Cost                                        |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| **Trading APIs** | Order, Position, Portfolio, Funds & Report APIs                   | **Free of Cost**                          |
| **Data APIs**    | Real-time + Historical Data (5 years), Market Depth, Option Chain | ₹499/month (or ₹399/month billed yearly) |

***

### Best Practices

* Keep your **API Key, Secret, and Client ID private**.
* Do not share credentials with third-party applications.
* Always enable **TOTP** for added security.
* Use **Static IPs** when deploying in production environments.
* **Daily login to OpenAlgo Portal is mandatory.**

***

Integrating with **DhanHQ APIs** unlocks the ability to automate strategies, execute trades, and analyze data directly within your own infrastructure.\
When used with **OpenAlgo**, you can self-host and run your entire algo trading stack, with full control and zero vendor lock-in.

***

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/dhan/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `BCD`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
