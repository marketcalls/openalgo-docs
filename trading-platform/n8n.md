# N8N

n8n is a **workflow automation tool** that allows users to create automated workflows connecting different apps, APIs, and services without needing extensive coding knowledge. It is an open-source, self-hostable alternative to Zapier, Make, and other automation tools.

With n8n, traders can create workflows that:

* Fetch data from APIs
* Process and transform data
* Automate trading tasks
* Integrate with trading platforms, brokers, databases, and messaging services



{% embed url="https://www.youtube.com/watch?v=BhDMkNEiTl0" %}

### Integrating with n8n for Scheduled Order Placement

\
This section guides you through creating a workflow in n8n, a powerful open-source workflow automation tool, to automatically place orders in OpenAlgo at a scheduled time. We'll use the example of placing a short straddle on NIFTY options at 9:20 AM IST every day.

<br>

<figure><img src="../.gitbook/assets/image (84).png" alt=""><figcaption></figcaption></figure>

**Prerequisites:**

* **OpenAlgo:** You must have OpenAlgo installed and running in http://127.0.0.1:5000/. Ensure your broker is properly configured within OpenAlgo.
* Install NodeJS as n8n backend relies on **Node.js runtime** to execute workflows, handle API calls, and manage automation.
* **n8n:** n8n should be installed and running.&#x20;
* **OpenAlgo API Key:** You'll need the OpenAlgo API key generated on the API Key page of the OpenAlgo dashboard. This is what the workflow sends in the `apikey` field. It is not your broker's API key or API secret.
* **Basic Understanding of Cron Expressions:** [Cron expressions](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/#custom-cron-interval) are used to define schedules. We'll provide the specific expression you need, but it's helpful to have a basic understanding.

#### **How to Start n8n on Windows**

To start n8n on Windows, follow these steps:

***

### **1. Install Node.js**

Since n8n runs on **Node.js**, you need to install it first.

1. **Download Node.js** from [Node.js official website](https://nodejs.org/)
2. **Install the LTS (Long-Term Support) version** (recommended for stability).
3.  **Verify installation** by opening Command Prompt (CMD) and running:

    ```sh
    node -v
    npm -v
    ```

    If installed correctly, you will see the version numbers.

***

### **2. Install n8n**

After Node.js is installed, you can install n8n using **npm**:

1. Open **Command Prompt (CMD)** as Administrator.
2.  Run the following command:

    ```sh
    npm install -g n8n
    ```

    This will install n8n globally on your system.
3.  Check if n8n is installed:

    ```sh
    n8n -v
    ```

    If installed correctly, you will see the version number.

***

### **3. Start n8n**

Once installed, start n8n with:

```sh
n8n
```

This will start the n8n server. You should see logs like:

<figure><img src="../.gitbook/assets/image (85).png" alt=""><figcaption></figcaption></figure>

#### **Access n8n in Browser**

Open your browser and go to:\
**http://localhost:5678/**

Now you can start creating workflows.

**Workflow Setup:**

**1. Create a New Workflow in n8n**

* Open your n8n instance in your browser (typically http://localhost:5678).
* Click the "+" button or "Create Workflow" option to start a new, blank workflow.

<figure><img src="../.gitbook/assets/image (87).png" alt=""><figcaption></figcaption></figure>

**2. Add and Configure the Schedule Trigger**

* This node will be the starting point of our workflow, initiating the order placement at the specified time.
* Click the "+" button to add the first node.
* Search for "Schedule Trigger" and select it.
* Select the "Custom(Cron)" as trigger interval from the options.
* In the **Expression** field, enter the following Cron expression: 0 20 9 \* \* \*
* **Explanation of the Cron Expression:**
  * 0: Seconds (set to 0)
  * 20: Minute (set to 20 for 9:20 AM)
  * 9: Hour (set to 9 for 9:00 AM in 24-hour format)
  * \*: Day of the Month (any day)
  * \*: Month (any month)
  * \*: Day of the Week (any day of the week)

<figure><img src="../.gitbook/assets/image (86).png" alt=""><figcaption></figcaption></figure>

* **Important: Timezone:** By default, n8n uses UTC time. To ensure the trigger fires at 9:20 AM _Indian Standard Time (IST)_, you **must** set the timezone.
  * Click on Settings
  * Click on n8n settings
  * Under general settings.
  * Select Timezone : "Asia/Kolkata"

<figure><img src="../.gitbook/assets/image (88).png" alt=""><figcaption></figcaption></figure>

**3. Add the First HTTP Request Node (SELL NIFTY Call Option)**

* Click the "+" button to the right of the "Schedule Trigger" node to add a new node.
* Search for "HTTP Request" and select it.
* Configure the node as follows:
  * **Method:** POST
  * **URL:** http://127.0.0.1:5000/api/v1/placeorder (This assumes OpenAlgo is running on your local machine. Adjust if you're using a different URL.)
  * **Authentication:** None. OpenAlgo does not use HTTP authentication on `/api/v1/*`. It authenticates the request from the `apikey` field inside the JSON body, so leave n8n's own authentication set to None.
  * **Send Body:** Check this box.
  * **Body Content Type:** JSON
  * **Specify Body:** Choose Using JSON
  * **JSON:** Paste the following, replacing "YOUR\_OPENALGO\_API\_KEY" with your actual API key:

```
{
    "apikey": "YOUR_OPENALGO_API_KEY",
    "strategy": "Test Strategy",
    "symbol": "NIFTY06MAR2522100CE",
    "exchange": "NFO",
    "action": "SELL",
    "pricetype": "MARKET",
    "product": "MIS",
    "quantity": "65"
}
```

<figure><img src="../.gitbook/assets/image (89).png" alt=""><figcaption></figcaption></figure>

* **Important Notes:**
  * YOUR\_OPENALGO\_API\_KEY: Replace this with your OpenAlgo API key.
  * strategy: You can name your strategy anything you like (e.g., "MyStraddleStrategy"). This helps you identify the source of the order within OpenAlgo.
  * symbol: Ensure this is the correct symbol for the NIFTY call option with the desired expiry and strike price. Double-check this!
  * exchange: Use "NFO" for NSE options.
  * action: "SELL" for the short straddle.
  * pricetype: "MARKET" for a market order.
  * product: "MIS" for intraday trading.
  * quantity: Total units, not lots. Set it to a whole multiple of the contract lot size. The example uses "65", one NIFTY lot at the time of writing. Confirm the current lot size before you go live.

**4. Add the Second HTTP Request Node (SELL NIFTY Put Option)**

* Click the "+" button again to add another HTTP Request node. We need a separate request for the put option. Connect the same cron node created to the second HTTP request also.

```
{
    "apikey": "YOUR_OPENALGO_API_KEY",
    "strategy": "Test Strategy",
    "symbol": "NIFTY06MAR2522100PE",
    "exchange": "NFO",
    "action": "SELL",
    "pricetype": "MARKET",
    "product": "MIS",
    "quantity": "65"
}
```

**5. Save and Activate**

* Click "Save" in the top right corner to save your workflow.
* Click the "Active" toggle switch in the top-right corner. It should turn green, indicating that the workflow is now active.

<figure><img src="../.gitbook/assets/image (90).png" alt=""><figcaption></figcaption></figure>

**6. Test (Optional, but Highly Recommended!)**

* **Important:** Before testing with the schedule, use the "Test workflow" button (on schedule trigger node). This will execute the workflow immediately, bypassing the schedule. **Use this only in analyzer mode!** It's crucial to verify that your API calls and order parameters are correct before letting it run automatically.

**7. Monitor Execution**

* Once the workflow is active, it will run automatically at 9:20 AM IST every day.
* You can monitor the executions by clicking on the "Executions" tab in n8n. This will show you a history of when the workflow ran and whether it was successful.
* You should also see the orders appearing in your OpenAlgo order book.

**Troubleshooting**

* **Workflow not triggering:**
  * **Is it active?** Double-check that the "Active" toggle is switched on.
  * **Cron expression:** Verify that your Cron expression is correct. You can use online Cron expression generators to test your expression.
  * **Timezone:** Make absolutely sure the timezone in n8n's settings is set to "Asia/Kolkata" (or your correct local timezone).
  * **n8n errors:** Check the n8n logs (accessible through the settings or the command line if you're running it locally) for any error messages.
* **Orders not placing in OpenAlgo:**
  * **API Key:** Double-check your API key in the HTTP Request nodes.
  * **URL:** Make sure the URL is the correct OpenAlgo endpoint.
  * **JSON Format:** Ensure your JSON body is correctly formatted. Any missing commas, brackets, or incorrect field names will cause errors.
  * **OpenAlgo Logs:** Check the OpenAlgo logs for any error messages.

#### **Why Use n8n for OpenAlgo?**

* **No-code / Low-code Automation:** Simplifies complex trading workflows.
* **Open-source & Self-hosted:** No expensive SaaS fees.
* **Customizable & Scalable:** Adapt workflows based on trading needs.
* **Supports Webhooks & APIs:** Seamless integration with OpenAlgo.

