# iSPOC - MHA Policy Single Point of Care

iSPOC is a web application that provides a single point of care for MHA policy information. It allows staff to quickly search and reference policies across the organization.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/jasonlryan/iSPOC)

## Features

- Search policies by keyword or category
- View policy details and related information
- Mobile-friendly interface for access on any device
- Feedback system to collect user experience data
- Admin dashboard for data export and analysis

## Deployment

This project is deployed on Vercel and automatically updates when changes are pushed to the GitHub repository.

## Feedback and Logging System

The application includes a feedback and logging system that:

1. Collects user feedback through 6 questions
2. Stores responses locally in browser localStorage
3. Sends data to Vercel serverless functions for processing
4. Can track user queries and system responses

### Serverless Function Setup

The application uses Vercel serverless functions (located in `/api` folder):

- `/api/feedback.js` - Handles feedback submissions
- `/api/log.js` - Logs user queries and system responses

These functions work automatically when deployed to Vercel. They will:

1. Process incoming data
2. Log it to the Vercel logs (viewable in the Vercel dashboard)
3. Format data as CSV for export

### Admin Dashboard

The application includes a password-protected admin dashboard for data management:

- Access it at: `/admin`
- Default password: `mha-admin-password` (change this in production!)

The admin dashboard allows you to:

- View and download feedback data as CSV
- View and download query logs as CSV
- Monitor application usage

#### Environment Variables

For the admin dashboard to work, set the following environment variables:

```
# Client-side admin password
VITE_ADMIN_PASSWORD=your-secure-password

# Server-side admin password (must match client-side)
ADMIN_PASSWORD=your-secure-password
```

### Accessing CSV Data

Since serverless functions can't write directly to files, the CSV data is stored in structured logs. You can access this data in several ways:

#### CSV Headers

**Feedback CSV Headers:**

```
Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments
```

**Query Log CSV Headers:**

```
Timestamp,UserId,SessionId,Query,Response
```

#### Method 1: Admin Dashboard

The simplest way to access the data is through the admin dashboard at `/admin`.

#### Method 2: Vercel Logs

1. Go to the Vercel dashboard for your project
2. Go to "Logs" tab
3. Search for "CSV Headers" and "CSV Row"
4. Export the rows and combine with the headers to create your CSV file

#### Method 3: Using Vercel KV (Recommended)

For more permanent storage, enable Vercel KV and uncomment the KV storage code in the serverless functions:

```js
// In each serverless function
const existingRows = (await kv.get("feedback_csv_rows")) || [];
existingRows.push(csvRow);
await kv.set("feedback_csv_rows", existingRows);
```

Then use the admin dashboard to retrieve and download the data.

### Extending Storage Options

For production use with persistent storage, you have several options:

1. **Vercel KV**: Enable Vercel KV (Redis) through the Vercel dashboard and update the functions to use it

   ```js
   // Example in api/feedback.js
   import { kv } from "@vercel/kv";
   await kv.lpush("feedbacks", JSON.stringify(feedback));
   ```

2. **Database**: Connect to MongoDB, Supabase, or another database

3. **Email**: Send data via email for collection

   ```js
   // Install a package like nodemailer first
   await sendMail({
     to: "your-email@example.com",
     subject: "New Feedback",
     text: JSON.stringify(feedback),
   });
   ```

4. **Logging Service**: Send to a logging service like Logtail, LogDNA, etc.

No separate server process is needed - everything runs directly through Vercel.
