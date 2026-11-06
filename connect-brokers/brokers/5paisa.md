# 5Paisa

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

OpenAlgo makes algorithmic trading accessible and straightforward by providing seamless integration with various brokers, including 5Paisa. This documentation will guide you through the process of configuring your 5Paisa account to work with OpenAlgo, ensuring you can automate your trading strategies efficiently. Follow the steps below to generate APIs, and set up your environment for a smooth trading experience.

### **Generate APIs**

**Login to 5Paisa Website:**

* Navigate to the [https://login.5paisa.com/](https://login.5paisa.com/) and log in with your credentials.



<figure><img src="../../.gitbook/assets/five_3.PNG" alt=""><figcaption></figcaption></figure>

**Access API Key Generation:**

<figure><img src="../../.gitbook/assets/five_4 (1).PNG" alt=""><figcaption></figcaption></figure>

* Click on the profile dropdown on the top right next to your name.
* Go to **Xstream API** and click on **Get API Keys**.

<figure><img src="../../.gitbook/assets/five_1.PNG" alt=""><figcaption></figcaption></figure>

Keep this page open and navigate to the Dashboard - Create New App.

<figure><img src="../../.gitbook/assets/five_6.PNG" alt=""><figcaption></figcaption></figure>

### **Save API Details**

Save the generated User Key, User ID. Encryption Key, Later, you will add these details to the environmental variables along with the redirect URL.

<figure><img src="../../.gitbook/assets/five_7.PNG" alt=""><figcaption></figcaption></figure>

click on the profile dropdown on the top right corner to know your client code

<figure><img src="../../.gitbook/assets/five_8.PNG" alt=""><figcaption></figcaption></figure>

Here is a sample of how the details would appear in a .env file for reference:

**Sample .env File:** Here is a sample of how the details should appear in a `.env` file for reference:

```
BROKER_API_KEY = 'API_Key:::User_ID:::client_code'
BROKER_API_SECRET = 'Encryption_Key'
REDIRECT_URL = 'http://127.0.0.1:5000/fivepaisa/callback'
```

#### Conclusion

By following the steps outlined in this guide, you have successfully configured your 5Paisa account for use with OpenAlgo. You can now leverage the power of algorithmic trading to enhance your trading strategies and make data-driven decisions. Should you encounter any issues or need further assistance, please refer to the OpenAlgo community or support resources. Happy trading!

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/fivepaisa/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
