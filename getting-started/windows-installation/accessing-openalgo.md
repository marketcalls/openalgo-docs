# Accessing OpenAlgo

Open `http://127.0.0.1:5000` in your browser, or the Host Server URL configured for your installation. If you use a tunnel, use that configured address consistently for login and broker callbacks.

On first launch, create the administrator account at `/setup`, then sign in. Open **Select Broker**, choose **Configure** for your broker, and save its keys in **Broker Configuration**. Complete **Login with <broker>** from its card and verify the Dashboard loads funds and the master contract is ready.

Follow [Broker Configuration and Login](../../connect-brokers/broker-configuration.md) for saved keys, existing `.env` configurations, callback URLs and broker switching. Generate the OpenAlgo API key at `/apikey` and verify **Analyze** mode before testing an order.

For an existing account, use `/login`; `/setup` is not a way to create additional users. OpenAlgo is a single-user deployment.
