# React mail merge and sender

The React project reads CSV and Excel files, merges fields in the browser, previews each personalized message, and sends email through a JavaScript mail service loaded by Vite. It does not use the `python` folder.

## Configure Gmail

Enter your Gmail address and Google app password in the **Email configuration** panel in the app. The values stay in page memory and are submitted to the local Vite mail service only when you send. A Google app password is required; your regular Gmail password will not work.

You can also set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env.local` as defaults. Keep `.env.local` private and restart Vite after changing it. Values entered in the UI take precedence.

The Vite Node service uses Nodemailer to deliver through Gmail SMTP. For production hosting, run the app in a Node environment that supports the Vite mail middleware, or move the same mail handler into your host's server function.

You can still export personalized `.eml` drafts in a ZIP instead of sending directly.
