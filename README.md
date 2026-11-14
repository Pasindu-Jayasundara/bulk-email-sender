# Bulk Email Sender

A React and Vite email merge app for preparing personalized messages from recipient data.

## Features

- Import recipients from CSV and Excel files
- Add supplementary data files and match rows using shared fields
- Add email addresses and data manually
- Personalize subjects and message content with imported fields
- Preview messages for individual recipients
- Send through Gmail SMTP using a Google app password
- Export personalized `.eml` drafts in a ZIP file

## Requirements

- Node.js with npm
- A Gmail account and Google app password for direct sending

## Run locally

The React app is in `react/`. From the repository root:

```bash
cd react
npm install
npm run dev
```

Use the local URL printed by Vite. To create and preview a production build:

```bash
npm run build
npm run preview
```

## Gmail configuration

Enter the Gmail address and Google app password in the app's **Email configuration** panel. For local defaults, set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `react/.env.local`, keep that file private, and restart Vite. Values entered in the app take precedence. The Vite mail middleware uses Nodemailer to send through Gmail SMTP. Production hosting must provide a Node runtime for the mail handler or an equivalent server function; a static-only deployment cannot send mail.

## Project

- Frontend source: [`react/`](react/)
- Live app: https://react-sepia-beta.vercel.app/
- Developed by [Kryvazent](https://www.kryvazent.com/)
