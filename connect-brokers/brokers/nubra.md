# Nubra

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Nubra, by Zanskar Securities Private Limited, is a modern trading platform built for algorithmic and institutional traders. It provides REST-like resource-based endpoints with low-latency order execution, comprehensive market data access including quotes, Greeks, and historical candles, and a phone OTP plus MPIN login, making it an excellent choice for automated trading with OpenAlgo.

1. **Navigate** to the Nubra's Dashboard Login [https://nubra.io/](https://nubra.io/) Open Demat

<figure><img src="../../.gitbook/assets/nubra_new1.PNG" alt=""><figcaption></figcaption></figure>

2. OpenAlgo logs in to Nubra with two things you already have, so there is no API key to generate:
   1. Your **registered mobile number**, which receives the login OTP
   2. Your **6-digit MPIN**, which is exchanged for the session token

<figure><img src="../../.gitbook/assets/nubra_new2.PNG" alt=""><figcaption></figcaption></figure>

3. Click on the **Profile** icon located at the top-right corner of the page

<figure><img src="../../.gitbook/assets/nubra_new3.PNG" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/nubra_new5.PNG" alt=""><figcaption></figcaption></figure>

3. To Register the static IP ,scroll down the left panel. Select **Resources-Update Static IP- Update - Validate**.

<figure><img src="../../.gitbook/assets/nubra_new4.PNG" alt=""><figcaption></figcaption></figure>

### **Environment Configuration**

Nubra does not issue an API key and secret pair. OpenAlgo reuses the two `BROKER_API_*` variables to carry your login details instead:

* `BROKER_API_KEY` holds your **registered mobile number**, the one Nubra sends the login OTP to
* `BROKER_API_SECRET` holds your **6-digit MPIN**

```
BROKER_API_KEY = 'your_nubra_registered_mobile_number'
BROKER_API_SECRET = 'your_nubra_mpin'
REDIRECT_URL = 'http://127.0.0.1:5000/nubra/callback'
```

### Connecting from OpenAlgo

When you click Connect on the Nubra broker page, OpenAlgo sends an OTP to the registered mobile number and opens the OTP entry screen. Enter the code you received to finish the login. Reloading that screen does not resend the code: only a fresh Connect from the broker page dispatches a new OTP, and each code can be used once.

If your account has TOTP enrolled, OpenAlgo still forces the SMS path, so an authenticator app is not required.

### Static IP

Nubra exposes a read-only static IP check. OpenAlgo surfaces it, but there is no API to register or change the IPs: that is done through Nubra using the **Resources - Update Static IP** screen shown above. An account with no registered IPs reports that state rather than failing.

Integrating with **Nubra APIs** unlocks the ability to automate strategies, execute trades, and analyze data directly within your own infrastructure. When used with **OpenAlgo**, you can self-host and run your entire algo trading stack, with full control and zero vendor lock-in.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/nubra/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
