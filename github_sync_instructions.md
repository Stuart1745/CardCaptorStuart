# How to Sync to Your Personal GitHub Account

To ensure this project syncs to your **personal** GitHub account (instead of your organizational one), we'll need to explicitly set the git config and push it to a new repository.

## Step 1: Create a Repo on GitHub
1. Go to [GitHub.com](https://github.com) while logged into your **personal** account.
2. Click the **+** icon in the top right and select **New repository**.
3. Name it `mtg-collection-tracker`.
4. Leave it Public or Private (your choice). **Do not** initialize it with a README, .gitignore, or license (we already have those locally).
5. Click **Create repository**.
6. Copy the repository URL (e.g., `https://github.com/YourPersonalUsername/mtg-collection-tracker.git`).

## Step 2: Push Your Local Code
Open a terminal in the `MTG Collection Tracker` directory and run the following commands.

First, let's make sure the local git user is set to your personal email/name for this specific repository so it doesn't use your global work settings:

```powershell
git config user.name "Your Personal Name"
git config user.email "your.personal@email.com"
```

Then, commit the current work and push:

```powershell
git add .
git commit -m "Initial commit: Next.js setup and requirements"
git branch -M main
git remote add origin https://github.com/YourPersonalUsername/mtg-collection-tracker.git
git push -u origin main
```

*(Note: If you are prompted to authenticate, make sure you log in with your personal GitHub account credentials or Personal Access Token, depending on your setup).*
