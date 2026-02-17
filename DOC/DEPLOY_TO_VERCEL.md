# 🚀 Deploying PrivacyWriter to Vercel

This guide explains how to host the PrivacyWriter landing page and API on Vercel.

## Prerequisites

1.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2.  **Vercel CLI** (Optional but recommended):
    ```bash
    npm i -g vercel
    ```

## Deployment Steps

### Option A: Using Vercel CLI (Fastest)

1.  Open your terminal in the project root (`PrivacyLens/`).
2.  Run the deploy command:
    ```bash
    vercel
    ```
3.  Follow the prompts:
    *   Set up and deploy? **Yes**
    *   Which scope? **(Select your account)**
    *   Link to existing project? **No**
    *   Project name? **privacy-writer**
    *   In which directory is your code located? **./** (Default)
    *   Want to modify these settings? **No**

4.  Wait for the build to complete. You will get a production URL (e.g., `https://privacy-writer.vercel.app`).

### Option B: Using GitHub Integration

1.  Push your `PrivacyLens` code to a GitHub repository.
2.  Go to the Vercel Dashboard.
3.  Click **"Add New..."** -> **"Project"**.
4.  Import your GitHub repository.
5.  Vercel will automatically detect the `vercel.json` configuration.
6.  Click **Deploy**.

## Verification

Once deployed, verify the endpoints:

1.  **Website**: Visit `https://your-project.vercel.app`. You should see the landing page.
2.  **API**: Test the API endpoint:
    *   URL: `https://your-project.vercel.app/api/v1`
    *   Method: `POST` (GET will return 405 Method Not Allowed, which confirms it's running).