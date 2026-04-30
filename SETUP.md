# Hair Embers — Booking Backend Setup Guide

When a client books through your website:
- The slot is checked against Google Calendar (no double-bookings)
- A Google Calendar event is created automatically
- A row is added to a Google Sheet ("Bookings" tab)
- WhatsApp opens to notify you instantly

Everything runs on Google's free services — no monthly fees, no server needed.

---

## Before You Start

You need a Google account (Gmail). If your Google Calendar is already on your phone,
use that same account for everything below so bookings appear there automatically.

---

## Step 1 — Open Google Sheets and Create a New Spreadsheet

1. Go to **sheets.google.com** and sign in
2. Click **+ Blank** to create a new spreadsheet
3. Name it **Hair Embers Bookings** (click "Untitled spreadsheet" at the top)
4. Leave it open — you'll need it in Step 3

---

## Step 2 — Open Apps Script FROM Inside Your Sheet

> This is the most important step. Opening Apps Script from inside your Sheet
> automatically links them together.

1. In your new spreadsheet, click the menu: **Extensions → Apps Script**
2. A new browser tab opens with a code editor
3. You'll see a file called `Code.gs` on the left with some default code

---

## Step 3 — Paste the Script

1. Select all the default code in the editor (Ctrl+A / Cmd+A) and delete it
2. Open the `Code.gs` file that came with your website files
3. Copy everything in it
4. Paste it into the Apps Script editor
5. Press **Ctrl+S** (or **Cmd+S**) to save
6. Name the project **Hair Embers Booking** when prompted

---

## Step 4 — Set the Timezone

1. Click the **gear icon** (Project Settings) in the left sidebar
2. Scroll down to **Script time zone**
3. Make sure it says **Africa/Johannesburg (GMT+02:00)**
4. If it doesn't, click it and search for "Johannesburg" to change it

---

## Step 5 — Run the Test to Grant Permissions

1. In the function dropdown at the top of the editor (it may say "myFunction"), 
   click it and select **testBooking**
2. Click the **▶ Run** button
3. A pop-up will say "Authorization required" — click **Review permissions**
4. Select your Google account
5. You may see a warning "Google hasn't verified this app" — click **Advanced**,
   then **Go to Hair Embers Booking (unsafe)**
6. Click **Allow**
7. The script will run. Check the **Execution log** at the bottom — you should see:

   ```
   ✅ Sheet: test row appended to "Bookings" tab
   ✅ Calendar: connected — X event(s) today
   ✅ Date math: ...
   All tests passed!
   ```

8. Switch back to your Google Sheet — a **Bookings** tab should have appeared
   with a pink header row and one test row

---

## Step 6 — Deploy as a Web App

1. Click **Deploy** (top right) → **New deployment**
2. Click the **gear icon** next to "Select type" → choose **Web app**
3. Fill in the settings:
   - **Description:** `v1`
   - **Execute as:** `Me` (your email)
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycby.../exec`

> Save this URL somewhere safe — you will need it every time you re-deploy.

---

## Step 7 — Add the URL to Your Website

1. Open `index.html` in a text editor (Notepad, VS Code, etc.)
2. Use **Ctrl+F** to search for: `PASTE_YOUR_DEPLOYMENT_URL_HERE`
3. Replace that exact text with your URL from Step 6
4. The line should end up looking like:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
5. Save the file

---

## Step 8 — Test the Full Flow End to End

1. Open `index.html` in your browser (double-click it)
2. Click **Book Appointment**
3. Pick any service, pick tomorrow's date, pick a time slot
4. Enter your own name and your WhatsApp number
5. Click **Confirm & Notify via WhatsApp**
6. WhatsApp should open with the booking message — send it to yourself
7. Check your **Google Sheet** — a new row should have appeared in Bookings
8. Check your **Google Calendar** — an event should be there at the time you booked
9. Go back to the website and book the same date and time again
   — that slot should now be **greyed out with a strikethrough** (already booked)

---

## Step 9 — See Bookings on Your Phone

- **Google Calendar app:** Download it, sign in with your Google account.
  All bookings appear automatically with client name and service.
- **Google Sheets app:** Download it to see the full bookings table on the go.

---

## Step 10 — Making Changes to Code.gs Later

If you ever need to update the script, you MUST create a new deployment version —
otherwise the live website still runs the old code.

1. Make your changes in the Apps Script editor
2. Click **Deploy** → **Manage deployments**
3. Click the **pencil (edit) icon** on your existing deployment
4. Change the **Version** dropdown to **New version**
5. Click **Deploy**

> Do NOT use "New deployment" — that creates a brand new URL and breaks your website.
> Always use "Manage deployments" and bump the version.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Booked slots not greying out | Check the URL in `index.html` starts with `https://script.google.com/macros/s/` |
| No rows in the Bookings sheet | Make sure you opened Apps Script via **Extensions → Apps Script** from inside the sheet |
| Calendar events not appearing | Run `testBooking()` again and check the Execution log for errors |
| "Exception: The caller does not have permission" | Re-run `testBooking()` and re-approve all permissions |
| Changes to Code.gs have no effect | You need to create a new deployment version (Step 10) |
| WhatsApp sends but no sheet row appears | The URL in `index.html` may be wrong — paste it again from Manage deployments |

---

## How Bookings Flow (Summary)

```
Client fills in booking form
        ↓
Website sends booking to Google Apps Script (via fetch)
        ↓
Apps Script checks Google Calendar for conflicts
        ↓ (if slot is free)
Creates Google Calendar event + logs row to Google Sheet
        ↓
WhatsApp opens on client's phone → sends message to you
        ↓
You confirm the appointment by replying on WhatsApp
```

When a client selects a date, the website also calls Apps Script to get already-booked
times for that day — those slots show greyed out so clients can only pick free times.
