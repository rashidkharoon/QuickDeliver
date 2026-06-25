# 🚀 QuickDeliver Deployment & Setup Guide

This guide details how to configure and deploy **QuickDeliver** (the zero-Google-sign-in Progressive Web App) with Google Sheets as your primary cloud database and Google Drive for automated file storage.

---

## 📅 Architectural Overview

```
[ Customer PWA ] (Static App, runs anywhere, Offline Support)
        │
        ▼ (No login required, safe base64 file payloads)
[ Google Apps Script Web App ] (Executes on your Google Cloud as "Me")
        │
        ├─► [ Google Drive Folder ] (Saves uploaded docs, outputs view link)
        │
        └─► [ Google Sheet Database ] (Appends logs: Customer, Price, Specs, URL)
```

---

## 1. 📊 Google Sheets & Apps Script Setup

To activate cloud storage, follow these step-by-step instructions to create your database:

1. **Create a Google Spreadsheet**:
   - Go to [Google Sheets](https://sheets.google.com).
   - Create a new blank sheet and name it `QuickDeliver Orders`.
   - Rename the active sheet tab in the bottom-left from `Sheet1` to `Orders` (or let the script auto-generate it!).

2. **Open the Apps Script Editor**:
   - In your spreadsheet, click on the **Extensions** menu at the top, then select **Apps Script**.

3. **Paste the Script Code**:
   - Delete any default boilerplate code inside the editor.
   - Open the `/google-apps-script.js` file from your project workspace.
   - Copy the entire file contents and paste it directly into the editor.

4. **Configure Google Drive Folder (Optional)**:
   - If you want all customer uploads (printing PDFs/images) to save into a specific Google Drive folder instead of your general root directory:
     - Open [Google Drive](https://drive.google.com).
     - Create a new folder (e.g., `QuickDeliver Document Uploads`).
     - Copy the folder ID from the URL bar (the string of letters/numbers after `/folders/...`).
     - Paste it into the `DRIVE_FOLDER_ID` constant at the top of your script:
       ```javascript
       const DRIVE_FOLDER_ID = "YOUR_FOLDER_ID_HERE";
       ```

5. **Save the Script**:
   - Click the **Save** icon (floppy disk) in the script editor header.

---

## 2. 🌐 Deploying the Web App (Critical Steps)

You must configure the web app to allow customer submissions without prompting them for a Google Account:

1. Click on the **Deploy** button in the top-right of the Apps Script page, and select **New deployment**.
2. Click the cog wheel icon next to "Select type" and select **Web app**.
3. Configure the settings exactly as follows:
   - **Description**: `QuickDeliver PWA Database Proxy`
   - **Execute as**: **Me (your-email@gmail.com)** *(This guarantees the script writes to Sheets using your authorization!)*
   - **Who has access**: **Anyone** *(This is CRITICAL. It allows students to submit orders directly from the PWA without needing Google log-ins!)*
4. Click **Deploy**.
5. Google will prompt you to **Authorize Access**. Click **Authorize access**, log into your Google Account, and click **Allow**.
6. Once deployed, copy the **Web app URL** from the success screen. It should look like:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## 3. 📱 Connecting your PWA App

1. Open the QuickDeliver Web App.
2. Navigate to the **Admin Control Center** (click "Admin" in the desktop navigation or bottom bar).
3. Paste your copied **Web app URL** into the URL input field.
4. Click **Save URL**.
5. Click **Test Connection**. 
   - A green banner saying **"Google Sheets Connected"** will confirm synchronization is active!
   - The indicator in the top header will shift from `Local Sandbox Mode` to `Google Sheets Connected`.

---

## 🛠️ PWA & Accessibility Compliance Notes

- **Offline Support**: Our custom `sw.js` (Service Worker) caches assets locally. Orders placed while offline are safely queued and synced when the connection is restored.
- **Installability**: On Android (Chrome), tap "Add to Home Screen". On iOS (Safari), tap "Share" and select "Add to Home Screen".
- **WCAG 2.1 AA Compliance**: All text elements, labels, buttons, and custom status badges conform to high-contrast AA requirements (at least 4.5:1 ratio) to ensure eligibility and support students working under low-light study conditions.
- **XSS Protection & Validation**: Input sanitization strips malicious tags, and file payloads are capped at 10MB to maintain low-friction, speedy submissions.
