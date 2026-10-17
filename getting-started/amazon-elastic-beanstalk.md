# Amazon Elastic Beanstalk

## Hosting OpenAlgo in the Cloud using Amazon AWS Elastic Beanstalk

\
[OpenAlgo](https://openalgo.in/) is the open source trading ecosystem for everyone: an all-in-one platform for charting, options analytics, automation and risk management, for both beginners and experienced traders. This tutorial guides you through the process of hosting OpenAlgo in the cloud using Amazon AWS Elastic Beanstalk.



**Prerequisites:**

* An Amazon AWS account
* VS Code (or any code editor with Git installed)
* A hosting account with DNS management and custom domain(Cloudflare is recommended)



{% embed url="https://www.youtube.com/watch?v=MWOuMUzWGgI" %}

**Steps by Step Instruction to host OpenAlgo in Amazon Cloud with custom domain**

**Clone the OpenAlgo Repository:**

* Go to the [OpenAlgo GitHub repository](https://github.com/marketcalls/openalgo).
* Copy the repository link.
* Open your VS Code and navigate to your project folder.
* Open a new terminal in VS Code and type **git clone** [**https://github.com/marketcalls/openalgo**](https://github.com/marketcalls/openalgo) and press enter.
* This will download the OpenAlgo application locally in your VS Code.

**Configure the .env File**

* Copy the `.sample.env` file in the OpenAlgo project to `.env` (`cp .sample.env .env`).
* Update the REDIRECT\_URL to your custom domain.
* For example, if your custom domain for angel trading account is opendash.app, update it to https://opendash.app/angel/callback.
* If you’re not using HTTPS, use http://openalgo.app/angel/callback.
* Make sure to update the HOST\_SERVER to your custom domain as well as shown in the video.
* You might also want to update the BROKER\_API\_KEY and BROKER\_API\_SECRET according to your broker credentials.
*   Generate APP\_KEY, API\_KEY\_PEPPER and FERNET\_SALT **before** you zip the bundle, and put the generated values in `.env`:

    ```bash
    python -c "import secrets; print(secrets.token_hex(32))"
    ```

    Run it three times and paste one value into each key, replacing the `OPENALGO_PLACEHOLDER_...` text. On a normal install OpenAlgo generates these itself on first start, but an Elastic Beanstalk deploy replaces the whole application bundle each time, so a value generated on the instance would be lost on the next deploy. Rotating `API_KEY_PEPPER` or `FERNET_SALT` invalidates every stored password hash and every encrypted broker token, so they must be fixed in the bundle and kept identical across deploys.
* Save the changes.

**Create the Elastic Beanstalk Application**

* Go to the [AWS Management Console](https://aws.amazon.com/) and sign in.
* Select the desired region (e.g., Asia Pacific (Mumbai) ap-south-1).
* Search for “Elastic Beanstalk”.
* Click on “Create application”.
* Provide an application name (e.g., openalgo) and an environment name (e.g., openalgo-env).
* Ensure the domain name is available (e.g., openalgo.ap-south-1.elasticbeanstalk.com).
* Provide a description for your environment (optional).
* Select a Python platform branch that provides Python 3.12 or newer.
* Select “4.1.0 (Recommended)” as the platform version.
* For “Application code”, choose “Upload your code”.
* Give a version label (e.g., 1.0.0.1).
* Choose “Local file” for “Source code origin”.
* Select the zipped OpenAlgo project file you created earlier.
* Choose “Single instance (free tier eligible)” as the configuration preset (or choose “Custom configuration” for more options).
* Click on “Next” to proceed.

<figure><img src="../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

**Configure Service Access:**

* Select the existing service role you created earlier.
* If you don’t have one, click on “Create and use new service role”.
* Select your EC2 key pair (e.g., test).
* If you don’t have an EC2 key pair, click on “Choose an EC2 key pair” and create a new one.
* Select the existing EC2 instance profile (e.g., “aws-elasticbeanstalk-ec2-role-flaskenv”).
* If you don’t have one, click on “View permission details” and create a new instance profile.
* Click on “Next”.

<figure><img src="../.gitbook/assets/image (17).png" alt=""><figcaption></figcaption></figure>

**Configure VPC Settings**

* Select the default VPC. You can create a new VPC, if needed.
* This is the virtual network where your Elastic Beanstalk environment will be deployed.

**Activate Public IP Address and Instance Subnet:**

* Ensure the Public IP address is enabled for your instance. This allows your application to be accessible from the internet.
* Choose an instance subnet from your VPC.

<figure><img src="../.gitbook/assets/image (18).png" alt=""><figcaption></figcaption></figure>

**Configure Security Group:**

* By default, select the default security group.
* This will allow your application to connect to the internet.
* If you want to restrict access, you can create a new security group and add rules to control incoming and outgoing traffic.
* Click on “Next”.

<figure><img src="../.gitbook/assets/image (19).png" alt=""><figcaption></figcaption></figure>

**Configure Instance Type, Load Balancer, and CloudWatch Logs:**

* Choose an instance type (e.g., T3 micro, T3 Small).
* If you are looking for a free tier option, use T3 micro.
* Select “Single instance” if you don’t need a load balancer.
* Choose “Enhanced” for health reporting (optional).
* Choose the default settings for CloudWatch logs (optional).
* Click on “Next”.

<figure><img src="../.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

**Review and Submit:**

* Review all the configuration steps.
* Make sure all the settings are correct.
* Click on “Submit”.
* This will initiate the automated provisioning of the servers in the backend.

<figure><img src="../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

After deploying your OpenAlgo application on Elastic Beanstalk, you need to configure your custom domain to point to the Elastic Beanstalk environment. This involves creating a CNAME record in your DNS settings. Here’s how to do it:

**Access Your DNS Provider:**

* Log in to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap, etc.)
* Find your domain’s DNS management section.

**Create a CNAME Record:**

* Click on “Add record” or similar to create a new record.
* **Name:** Enter the subdomain you want to use (e.g., trade). This will be the part of your custom domain that will point to your Elastic Beanstalk application (e.g., trade.openalgo.app).
* **Type:** Select “CNAME”.
* **Value:** Copy the Elastic Beanstalk domain generated by AWS. It will look something like this: openalgo.ap-south-1.elasticbeanstalk.com.

**Save and Verify:**

* Save the CNAME record you just created.
* Wait for the DNS propagation to complete, which may take some time (usually 24-48 hours).
* Test your custom domain by entering it into your web browser. You should be redirected to your OpenAlgo application on Elastic Beanstalk.

<figure><img src="https://i0.wp.com/www.marketcalls.in/wp-content/uploads/2024/06/image-17-1024x466.png?resize=1024%2C466&#x26;ssl=1" alt="" height="466" width="1024"><figcaption></figcaption></figure>

**Example:**

* Let’s say your custom domain is openalgo.app.
* You want to use the subdomain trade to access your OpenAlgo application.
* In your DNS settings, create a CNAME record with the following:
  * **Name:** trade
  * **Type:** CNAME
  * **Value:** openalgo.ap-south-1.elasticbeanstalk.com (replace with your Elastic Beanstalk domain)

Once the DNS propagation completes, you’ll be able to access your OpenAlgo application at trade.openalgo.app.

**SSL Configuration in Cloudflare**

If you are using Cloudflare for DNS Management ensure to enable the flexible mode to access the openalgo domain with https SSL certificate.

<figure><img src="https://i0.wp.com/www.marketcalls.in/wp-content/uploads/2024/06/image-18-1024x524.png?resize=1024%2C524&#x26;ssl=1" alt="" height="524" width="1024"><figcaption></figcaption></figure>

By following these steps, you can successfully deploy OpenAlgo in the cloud using Amazon AWS Elastic Beanstalk. You can then start configuring your trading strategies and begin your algorithmic trading journey.
