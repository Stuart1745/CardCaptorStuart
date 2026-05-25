# Google Cloud OAuth2 & Gmail API Setup Instructions

To allow your MTG Tracker to read receipts from your Gmail, you need to configure a Google Cloud project. Follow these steps:

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name it "MTG Collection Tracker" and click **Create**.

## 2. Enable the Gmail API
1. In the Cloud Console search bar, type **Gmail API** and select it from the Marketplace results.
2. Click the **Enable** button.

## 3. Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen** from the left-hand menu.
2. Select **External** (since it's a personal app, External is fine, but leave it in "Testing" mode so you don't need a formal review). Click **Create**.
3. Fill in the App information (App name: MTG Tracker, User support email: your email).
4. For "Developer contact information", enter your email. Click **Save and Continue**.
5. Click **Add or Remove Scopes**. Search for and add the `https://www.googleapis.com/auth/gmail.readonly` scope. Click **Update**, then **Save and Continue**.
6. Under **Test Users**, click **Add Users** and add your personal Gmail address. This allows your account to log in while the app is in testing mode. Click **Save and Continue**.

## 4. Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. For Application type, select **Web application**.
4. Name it something like "Next.js Web Client".
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - `https://your-production-url.com` (when you deploy it later)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/auth/callback` (or your Supabase Auth callback URL, which we will set up in Supabase soon)
7. Click **Create**.
8. A modal will pop up with your **Client ID** and **Client Secret**. Copy these! We will need to enter them into Supabase so it can handle the Google Login.

---

Once you have your **Client ID** and **Client Secret**, keep them handy. We will put them into the Supabase dashboard under `Authentication > Providers > Google` once we set up Supabase!
