# Kotak Securities

{% hint style="info" %}
Use [Broker Configuration and Login](../broker-configuration.md) to save these credentials in OpenAlgo and connect the broker. The `.env` examples below remain supported; `.env` keys for the selected broker take precedence over database-saved keys.
{% endhint %}

Kotak Securities is a prominent Indian stock broker offering services on major Indian stock exchanges, including NSE, BSE, and MCX. Known for its comprehensive financial services and advanced trading solutions, Kotak Securities provides a robust platform for traders and investors. By leveraging Kotak's Trading APIs, developers and algo traders can seamlessly integrate their trading strategies with the OpenAlgo platform.

{% embed url="https://www.youtube.com/watch?v=AtCCU4I1xSk" %}

For developers and algo traders looking to use the Kotak API, the integration process generally involves the following steps:

### Step-by-Step Integration

#### Step 1: Prepare Your Trading Credentials

Ensure you have your Kotak Securities Trading User ID and Password ready.

#### Step 2: Register for API Access

1. Navigate to the [Kotak Securities API registration page.](https://neo.kotaksecurities.com/) login with your trading credentials
2. Navigate to: More

<figure><img src="../../.gitbook/assets/kotak_1.PNG" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/kotak_2.PNG" alt=""><figcaption></figcaption></figure>

1. Click "Create Application"
2. Copy the token shown after creation

**Token format example**: ec6a746c-e44b-455e-abf2-c13352b2fc45

#### **Step 3: Register TOTP Authentication**

Register for TOTP from the Menu Section

<figure><img src="../../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

**What is TOTP?** Time-based One-Time Password generates a new 6-digit code every 30 seconds in an authenticator app. This is your dynamic password for API login.

**Steps:**

1. In API Dashboard, click **"TOTP Registration"**
2. Verify with your mobile number and OTP
3. Download **Google Authenticator** or **Microsoft Authenticator** from app store
4. Scan the QR code displayed on screen
5. Enter the 6-digit TOTP code shown in the authenticator app
6. Confirm when you see "TOTP successfully registered"

Example:

1. TOTP Registration screen: on verification of mobile number, otp and client code

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

2. Scan QR from authenticator app, Enter these 6 digits reflecting on authenticator app for Kotak-NEO, and click continue. You will get success toast which means registration of totp is complete.

<figure><img src="../../.gitbook/assets/image (2) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### Step 4: Find Your UCC (Client Code)

1. Go to NEO app/web Profile section
2. Your UCC is displayed as "Client Code"
3. Format: 5 characters (e.g., "AB123")

<figure><img src="../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

#### Step 5 : Your 6-digit MPIN

* This is your trading PIN used to authorize orders in NEO app
* You use the same MPIN for API authentication

**If you don't remember it:**

* NEO app > Profile > Settings > Change MPIN

#### Retrieve API Credentials:

* Copy the Unique Client Code as Format: 5 characters (e.g., "AB123") , which will be your API Key.
* Copy the Token generated from step 2 as Token format example: ec6a746c-e44b-455e-abf2-c13352b2fc45, which will serve as your API Secret

### Configuration:

Set up your environment variables in a `.env` file for Kotak's API:

```
BROKER_API_KEY = 'your_kotak_unique_client_code'
BROKER_API_SECRET = 'your_kotak_token_generated'
REDIRECT_URL = 'http://127.0.0.1:5000/kotak/callback'
```

Integrating with the Kotak API opens up new possibilities for implementing automated and algorithmic trading strategies. It provides developers and traders with a robust platform to access market opportunities efficiently and effectively. To fully leverage the capabilities of the Kotak API, it is essential to follow best practices for API integration. This includes careful management of API rate limits, secure handling of API keys, and thorough error handling and logging. These practices help ensure a dependable and optimal trading experience using Kotak's advanced technological infrastructure.

### Supported Exchanges

OpenAlgo reads this plugin's exchange list from `broker/kotak/plugin.json` and serves it to the app, so symbol search, the Strategy Builder and the tools pages only offer what the plugin actually handles.

* **Tradable:** `NSE`, `BSE`, `NFO`, `BFO`, `CDS`, `MCX`
* **Index feeds:** `NSE_INDEX`, `BSE_INDEX`
