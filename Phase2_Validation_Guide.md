# Phase 2 Validation: Authentication & CSV Import

This document serves as the validation guide for Phase 2 of the MTG Collection Tracker. It outlines how to test and validate that Google Authentication and Database-persisted CSV Imports are fully functional.

## Step 1: Validating the Login Screen
1. Navigate to `http://localhost:3001` in your browser.
2. If you are not logged in, the Next.js Middleware will automatically intercept the request and redirect you to `http://localhost:3001/login`.
3. You should see the custom MTG Tracker Login Screen with the "Continue with Google" button.

> **[INSERT SCREENSHOT HERE: The Login Page]**

## Step 2: Validating Google OAuth
1. Click the **Continue with Google** button.
2. You will be redirected to the secure Google Sign-in page.
3. Select the Google Account that you added to your "Test users" list in the Google Cloud Console.
4. Google will automatically redirect you back to `http://localhost:3001/auth/callback`, which will securely exchange the authentication code for a Supabase Session.

> **[INSERT SCREENSHOT HERE: Google Account Selection]**

## Step 3: Validating the Dashboard & Protected Route
1. After the callback finishes, you will be redirected to the root dashboard (`http://localhost:3001`). 
2. Because you now have a valid session, the Middleware will allow you through.

> **[INSERT SCREENSHOT HERE: Empty Dashboard]**

## Step 4: Validating CSV Import & Database Persistence
1. Click the **Import CSV** button on the dashboard.
2. Select your test CSV file. You will see a preview of the parsed data.
3. Click the **Import X Cards** button. The button will change to a spinner saying "Importing...".
4. The application will map each card to your `user_id` and insert them into the `collection_items` table in Supabase.
5. Upon success, an alert will pop up saying "Successfully imported!".

> **[INSERT SCREENSHOT HERE: The CSV Preview Modal]**

## Step 5: Validating Real-time Data Fetching
1. Refresh the dashboard (`http://localhost:3001`).
2. The page is a Server Component and will securely fetch your cards from the database using your user session.
3. You should now see:
   - **Total Value:** Calculated dynamically from `purchase_price` * `quantity`.
   - **Cards Owned:** Summing the quantities.
   - **Recent Additions:** Your newly imported cards listed in the table below!

> **[INSERT SCREENSHOT HERE: The Populated Dashboard]**
