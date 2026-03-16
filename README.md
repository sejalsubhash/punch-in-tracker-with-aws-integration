<div align="center">

# 🕐 Punch Tracker
### Team Attendance Management System

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Couchbase](https://img.shields.io/badge/Couchbase-Capella-EA2328?style=for-the-badge&logo=couchbase&logoColor=white)](https://cloud.couchbase.com)
[![AWS](https://img.shields.io/badge/AWS-SNS%20%2B%20S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

**A production-ready punch-in/out tracking system for teams with cloud storage, real-time email alerts, and automated daily backups.**

🌐 **[View Live App](https://punch-in-tracker-with-aws-integration.onrender.com)**

---

</div>

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [AWS Setup Guide](#-aws-setup-guide)
  - [Step 1 — IAM User](#step-1--create-iam-user--credentials)
  - [Step 2 — SNS Topic](#step-2--create-sns-topic-for-email-alerts)
  - [Step 3 — S3 Bucket](#step-3--create-s3-bucket-for-daily-backups)
- [Couchbase Setup](#-couchbase-setup)
- [Environment Variables](#-environment-variables)
- [Local Development](#-local-development)
- [Deploy to Render](#-deploy-to-rendercom)
- [API Reference](#-api-reference)
- [S3 Backup Details](#-s3-backup-details)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 👥 Team Member Selection | Coloured avatar grid — click to select member |
| 👋 Welcome Message | Header shows "Welcome, [Name]!" on selection |
| ⏰ Live Clock | Real-time clock displayed in header |
| 🟢 Punch In | Record start of workday with timestamp |
| 🟡 Break | Record break time |
| 🔴 Punch Out | Record end of workday |
| ⚡ Auto Entry | Captures local browser time automatically |
| ✏️ Manual Entry | User enters custom time and date |
| 📊 Stats Bar | Today's totals — check-ins, breaks, check-outs, active members |
| 📋 Records Table | Searchable, filterable, paginated attendance table |
| 🗄️ Couchbase Storage | Persistent cloud database via Couchbase Capella |
| 📧 AWS SNS Alerts | Email notification to team lead on every action |
| 🪣 AWS S3 Backup | Daily CSV backup of all records at midnight UTC |
| 🔔 Toast Notifications | In-app feedback for every punch action |
| 🔄 Auto Refresh | Records table refreshes every 30 seconds |

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                            │
│              React 18  +  Axios  +  CSS                 │
├─────────────────────────────────────────────────────────┤
│                      BACKEND                            │
│             Node.js  +  Express.js                      │
├──────────────┬──────────────┬───────────────────────────┤
│  Couchbase   │   AWS SNS    │        AWS S3             │
│   Capella    │   (Email)    │   (Daily CSV Backup)      │
├──────────────┴──────────────┴───────────────────────────┤
│                     HOSTING                             │
│            Render.com  +  GitHub CI/CD                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
punch-tracker/                          ← Root (monorepo)
│
├── 📁 backend/
│   └── 📁 src/
│       └── 📄 server.js               ← Express API + Couchbase + SNS + S3
│
├── 📁 frontend/
│   ├── 📁 public/
│   │   └── 📄 index.html
│   └── 📁 src/
│       ├── 📁 components/
│       │   ├── Header.js / .css        ← Sticky header with clock & welcome
│       │   ├── MemberSelector.js / .css ← Team member avatar grid
│       │   ├── PunchPanel.js / .css    ← Action buttons + Auto/Manual toggle
│       │   ├── RecordsTable.js / .css  ← Attendance records table
│       │   ├── StatsBar.js / .css      ← Today's summary stats
│       │   └── Toast.js / .css         ← Notification toasts
│       ├── 📁 hooks/
│       │   └── useTime.js              ← Live clock + time entry logic
│       ├── 📁 utils/
│       │   └── api.js                  ← Axios API wrapper
│       ├── App.js / .css               ← Main app layout
│       └── index.js / .css             ← Entry point + global styles
│
├── 📄 package.json                     ← Root dependencies + build scripts
├── 📄 render.yaml                      ← Render.com config
├── 📄 .env.example                     ← Environment variables template
├── 📄 .gitignore
└── 📄 README.md
```

---

## ☁️ AWS Setup Guide

> You need **3 AWS resources**: an IAM user (credentials), an SNS topic (email alerts), and an S3 bucket (daily backups).

---

### Step 1 — Create IAM User & Credentials

> The IAM user gives your app permission to use SNS and S3.

1. Go to **[AWS Console → IAM](https://console.aws.amazon.com/iam)**
2. Click **Users** → **Create user**
3. Enter username: `punch-tracker-bot` → click **Next**
4. Select **"Attach policies directly"**
5. Search and check these 2 policies:
   - ✅ `AmazonSNSFullAccess`
   - ✅ `AmazonS3FullAccess`
6. Click **Next** → **Create user**
7. Open the created user → **Security credentials** tab
8. Click **Create access key**
9. Select **"Application running outside AWS"** → **Next**
10. Click **Create access key**
11. ⚠️ **Copy both values now** — secret key is shown only once:
    - `AWS_ACCESS_KEY_ID` = Access key
    - `AWS_SECRET_ACCESS_KEY` = Secret access key

---

### Step 2 — Create SNS Topic for Email Alerts

> SNS sends an email to your team lead every time someone punches in, takes a break, or punches out.

**Create the Topic:**

1. Go to **[AWS Console → SNS](https://console.aws.amazon.com/sns)**
2. Click **Topics** → **Create topic**
3. Type: **Standard**
4. Name: `TeamAttendanceAlerts`
5. Leave all other settings as default
6. Click **Create topic**
7. ⚠️ **Copy the Topic ARN** — looks like:
   ```
   arn:aws:sns:us-east-1:123456789012:TeamAttendanceAlerts
   ```
   This is your `SNS_TOPIC_ARN`

**Subscribe the Team Lead's Email:**

1. Open your newly created topic
2. Click **Create subscription**
3. Protocol: **Email**
4. Endpoint: `teamlead@yourcompany.com`
5. Click **Create subscription**
6. ✉️ AWS sends a confirmation email to that address
7. Team lead must click **"Confirm subscription"** in the email
8. Status changes from `PendingConfirmation` → `Confirmed`

> ⚠️ Notifications will NOT be delivered until the subscription is confirmed!

**Test the topic (optional):**

1. Open topic → click **Publish message**
2. Subject: `Test`
3. Message: `This is a test notification`
4. Click **Publish** → check the email inbox

---

### Step 3 — Create S3 Bucket for Daily Backups

> S3 stores a CSV file every day at midnight UTC with all that day's punch records.

1. Go to **[AWS Console → S3](https://console.aws.amazon.com/s3)**
2. Click **Create bucket**
3. Fill in:
   - **Bucket name:** `punch-records-backup-XXXXXXXXXXXX`
     *(replace X's with your 12-digit AWS account ID for uniqueness)*
   - **AWS Region:** same as your `AWS_REGION` e.g. `us-east-1`
4. **Block Public Access settings:**
   - ✅ Keep **"Block all public access"** checked (data stays private)
5. **Versioning:** Leave disabled (optional to enable)
6. Leave all other settings as default
7. Click **Create bucket**
8. ⚠️ **Copy the bucket name** — this is your `S3_BUCKET_NAME`

**Verify bucket was created:**

1. Go to S3 → your bucket → **Permissions** tab
2. Confirm "Block all public access" shows **On**

> 💡 After your first backup runs, files appear under:
> `your-bucket/attendance-records/2026-03-16.csv`

---

## 🗄️ Couchbase Setup

> Couchbase Capella is the free cloud database that stores all punch records.

1. Go to **[https://cloud.couchbase.com](https://cloud.couchbase.com)** → Sign up free
2. Create an **Organization** → Create a **Project**
3. Click **Create Cluster** → Select **Free tier**
4. Choose cloud provider & region → Click **Create cluster**
5. Wait ~5 minutes for cluster to be ready

**Create a Bucket:**

1. Click your cluster → **Data Tools → Buckets**
2. Click **Create Bucket**
3. Name: `employee-punch-records`
4. Memory quota: `100MB` (free tier)
5. Click **Create Bucket**

**Create Database Credentials:**

1. Click **Settings → Database Access**
2. Click **Create Database User**
3. Username: `punch-tracker-user`
4. Password: create a strong password
5. Bucket access: select `employee-punch-records` → **Read/Write**
6. Click **Create**
7. Save the username and password — these are `CB_USERNAME` and `CB_PASSWORD`

**Get Connection String:**

1. Click your cluster → **Connect**
2. Copy the **Connection String** — looks like:
   ```
   couchbases://cb.mdkkm6ioipzmcd6z.cloud.couchbase.com
   ```
   This is your `COUCHDB_URL`

**Allow IP Access:**

1. Click **Settings → Allowed IP Addresses**
2. Click **Add Allowed IP**
3. For Render.com hosting: click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **Add**

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# ─── Server ──────────────────────────────────────────────
PORT=5000
NODE_ENV=production

# ─── Couchbase ───────────────────────────────────────────
COUCHDB_URL=couchbases://cb.xxxxxxxx.cloud.couchbase.com
CB_USERNAME=punch-tracker-user
CB_PASSWORD=your_couchbase_password
COUCHDB_DB=employee-punch-records
CB_SCOPE=_default
CB_COLLECTION=_default

# ─── AWS ─────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:TeamAttendanceAlerts
S3_BUCKET_NAME=punch-records-backup-123456789012

# ─── Team Members ────────────────────────────────────────
TEAM_MEMBERS=Sejal Subhash,Rahul Sharma,Priya Patel,Amit Kumar,Neha Joshi,Vikram Singh
```

> ⚠️ Never commit `.env` to GitHub. Use Render's Environment tab for production values.

---

## 💻 Local Development

### Prerequisites

- Node.js >= 20 → [Download](https://nodejs.org)
- Couchbase Capella account (free)
- AWS account (free tier)
- Git

### Step 1 — Clone the repository

```bash
git clone https://github.com/sejalsubhash/punch-tracker-with-aws-integration.git
cd punch-tracker-with-aws-integration
```

### Step 2 — Install all dependencies

```bash
npm run install:all
```

### Step 3 — Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### Step 4 — Run the application

Open **two terminals**:

**Terminal 1 — Backend API:**
```bash
npm run dev:backend
# ✅ Server running at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
# ✅ React app running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## 🌐 Deploy to Render.com

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "feat: punch tracker with Couchbase, SNS and S3"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/punch-tracker.git
git push -u origin main
```

### Step 2 — Create Web Service on Render

1. Go to **[https://render.com](https://render.com)** → Sign in
2. Click **New +** → **Web Service**
3. Connect your **GitHub account** if not already connected
4. Select your repository `punch-tracker`
5. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `punch-tracker` |
| Environment | `Node` |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Plan | Free |

6. Click **Create Web Service**

### Step 3 — Add Environment Variables

Go to your service → **Environment** tab → click **Edit** → add all variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `COUCHDB_URL` | your Couchbase connection string |
| `CB_USERNAME` | your Couchbase username |
| `CB_PASSWORD` | your Couchbase password |
| `COUCHDB_DB` | `employee-punch-records` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | your AWS secret key |
| `SNS_TOPIC_ARN` | your SNS topic ARN |
| `S3_BUCKET_NAME` | your S3 bucket name |
| `TEAM_MEMBERS` | `Alice,Bob,Carol,Dave` |

Click **Save, rebuild and deploy**

### Step 4 — Verify deployment

Once deployed, test these URLs:

```
✅ https://your-app.onrender.com/api/health
✅ https://your-app.onrender.com/api/members
✅ https://your-app.onrender.com/api/backup/status
```

---

## 🔗 API Reference

### Base URL
```
https://punch-in-tracker-with-aws-integration.onrender.com
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/members` | Get all team members |
| `POST` | `/api/punch` | Create punch record + send SNS |
| `GET` | `/api/records` | Get all attendance records |
| `GET` | `/api/records/:name` | Get records for one member |
| `DELETE` | `/api/records/:id` | Delete a record |
| `POST` | `/api/backup` | Manually trigger S3 CSV backup |
| `GET` | `/api/backup/status` | Check S3 backup configuration |

### POST /api/punch

```json
{
  "name": "Sejal Subhash",
  "action": "punch-in",
  "time": "09:32:00",
  "date": "2026-03-16",
  "entryType": "auto"
}
```

`action` accepts: `punch-in` | `break` | `punch-out`

**Response:**
```json
{
  "success": true,
  "record": {
    "id": "punch::uuid-here",
    "name": "Sejal Subhash",
    "action": "punch-in",
    "time": "09:32:00",
    "date": "2026-03-16",
    "entryType": "auto",
    "timestamp": "2026-03-16T09:32:00.000Z"
  }
}
```

### POST /api/backup

```json
{
  "date": "2026-03-16"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup uploaded to S3 for 2026-03-16",
  "key": "attendance-records/2026-03-16.csv",
  "recordCount": 12
}
```

---

## 🗄️ S3 Backup Details

### Schedule
- Runs automatically every day at **midnight UTC** (5:30 AM IST)
- Can also be triggered manually via `POST /api/backup`

### S3 File Structure
```
punch-records-backup-123456789012/
└── attendance-records/
    ├── 2026-03-14.csv
    ├── 2026-03-15.csv
    └── 2026-03-16.csv
```

### CSV Format
```csv
Name,Action,Time,Date,Entry Type,Timestamp
Sejal Subhash,Punch In,09:32:00,2026-03-16,Auto,2026-03-16T09:32:00.000Z
Rahul Sharma,Break,13:00:00,2026-03-16,Auto,2026-03-16T13:00:00.000Z
Priya Patel,Punch Out,18:00:00,2026-03-16,Manual,2026-03-16T18:00:00.000Z
```

### Test Backup Manually (Postman)

1. Open Postman
2. Method: `POST`
3. URL: `https://your-app.onrender.com/api/backup`
4. Body → raw → JSON:
```json
{
  "date": "2026-03-16"
}
```
5. Click **Send**
6. Go to **AWS S3 → your bucket → attendance-records/** to verify the file

---

## 📧 SNS Notification Format

Every punch action sends this email to the team lead:

```
Subject: Team Attendance Update

📋 Attendance Update

Team Member: Sejal Subhash
Action: Punched In
Time: 09:32:00
Date: 2026-03-16
Entry Type: Auto

– Punch Tracker System
```

---

## 🛠 Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Cannot find module 'dotenv'` | Root `npm install` not run | Change build script to `npm install && cd frontend && npm install && npm run build` |
| `url is not valid` | Wrong `COUCHDB_URL` format | Must start with `couchbases://` not `http://` |
| `Missing Couchbase credentials` | `CB_USERNAME` or `CB_PASSWORD` not set | Add both to Render environment variables |
| SNS emails not arriving | Subscription not confirmed | Team lead must click confirmation link in AWS email |
| S3 upload failing | Missing S3 permission | Add `AmazonS3FullAccess` to IAM user |
| `Cannot POST /api/backup/status` | Wrong HTTP method | Use `GET` for status, `POST` for backup |
| Records not showing in table | API error or no data | Click Refresh; check browser console |
| App slow to load | Render free plan sleeps | Normal — first request after 15min inactivity takes ~30s |
| Build fails on Render | Wrong Node version | Set `NODE_VERSION=20.11.0` in Render environment |

---

## 📄 License

MIT © 2026 Sejal Subhash

---

<div align="center">

Built with ❤️ using React, Node.js, Couchbase, and AWS

⭐ Star this repo if it helped you!

</div>
