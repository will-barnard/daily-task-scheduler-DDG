# Daily Task Scheduler

A task reminder application built with Vue 3 + Node.js/Express. Sends daily email reminders via Resend for tasks scheduled on a given calendar day.

## Quick Start

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start the backend
```bash
cd backend
npm run dev
```
The API server runs on `http://localhost:3001`.

### 3. Start the frontend
```bash
cd frontend
npm run dev
```
The app runs on `http://localhost:5173`.

## Default Super Admin Login

- **Email:** `admin@drugansdrums.com`
- **Password:** `admin123`

## Features

- **Authentication** — JWT-based login with role-based access (super admin / user)
- **Task Reminders** — Create tasks with a title, description, and calendar date
- **Daily Email** — Automated email at a configurable time (via node-cron) to all recipients if tasks exist for that day
- **Recipient Management** — Add/remove email recipients in settings
- **Send Time** — Super admin can change the daily send time
- **Test Email** — Send a test email to verify Resend configuration
- **Invite Users** — Super admin generates signup links; invited users register via the link

## Permissions

| Action | Super Admin | User |
|---|---|---|
| Create/edit/delete tasks | Yes | Yes |
| View/set recipients | Yes | Yes |
| Send test email | Yes | Yes |
| Change daily send time | Yes | No |
| Invite new users | Yes | No |

## Tech Stack

- **Frontend:** Vue 3, Vite, Pinia, Vue Router, Axios
- **Backend:** Node.js, Express, better-sqlite3, bcryptjs, JWT, node-cron
- **Email:** Resend API (from `drugansdrums.com`)
