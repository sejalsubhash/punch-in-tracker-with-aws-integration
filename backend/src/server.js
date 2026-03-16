require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nano = require("nano");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── CouchDB Setup ─────────────────────────────────────────────────────────────
const couchUrl =
  process.env.COUCHDB_URL || "http://admin:password@localhost:5984";
const couch = nano(couchUrl);
const DB_NAME = process.env.COUCHDB_DB || "punch_tracker";

async function initDB() {
  try {
    const dbList = await couch.db.list();
    if (!dbList.includes(DB_NAME)) {
      await couch.db.create(DB_NAME);
      console.log(`✅ CouchDB: Database '${DB_NAME}' created`);
    } else {
      console.log(`✅ CouchDB: Connected to '${DB_NAME}'`);
    }
  } catch (err) {
    console.error("❌ CouchDB init error:", err.message);
  }
}

const db = couch.use(DB_NAME);

// ─── AWS SNS Setup ─────────────────────────────────────────────────────────────
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendSNSNotification(message) {
  if (!process.env.SNS_TOPIC_ARN) {
    console.warn("⚠️  SNS_TOPIC_ARN not set. Skipping SNS notification.");
    return;
  }
  try {
    const command = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: "Team Attendance Update",
      Message: message,
    });
    const result = await snsClient.send(command);
    console.log(`✅ SNS Notification sent. MessageId: ${result.MessageId}`);
  } catch (err) {
    console.error("❌ SNS error:", err.message);
  }
}

// ─── Team Members ──────────────────────────────────────────────────────────────
const TEAM_MEMBERS = (process.env.TEAM_MEMBERS || "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const DEFAULT_MEMBERS = [
  "Sejal Subhash",
  "Rahul Sharma",
  "Priya Patel",
  "Amit Kumar",
  "Neha Joshi",
  "Vikram Singh",
];

// ─── API Routes ────────────────────────────────────────────────────────────────

// GET /api/members - list of team members
app.get("/api/members", (req, res) => {
  const members = TEAM_MEMBERS.length > 0 ? TEAM_MEMBERS : DEFAULT_MEMBERS;
  res.json({ members });
});

// POST /api/punch - record a punch event
app.post("/api/punch", async (req, res) => {
  const { name, action, time, date, entryType } = req.body;

  if (!name || !action || !time || !date) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, action, time, date" });
  }

  const validActions = ["punch-in", "break", "punch-out"];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const record = {
    type: "punch_record",
    name,
    action,
    time,
    date,
    entryType: entryType || "auto",
    timestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  try {
    const response = await db.insert(record);
    record._id = response.id;
    record._rev = response.rev;

    // Action label for SNS
    const actionLabels = {
      "punch-in": "Punched In",
      break: "Gone on Break",
      "punch-out": "Punched Out",
    };
    const label = actionLabels[action] || action;
    const snsMsg = `📋 Attendance Update\n\nTeam Member: ${name}\nAction: ${label}\nTime: ${time}\nDate: ${date}\nEntry Type: ${entryType === "manual" ? "Manual" : "Auto"}\n\n– Punch Tracker System`;

    await sendSNSNotification(snsMsg);

    res.status(201).json({ success: true, record });
  } catch (err) {
    console.error("❌ DB insert error:", err);
    res.status(500).json({ error: "Failed to save record", details: err.message });
  }
});

// GET /api/records - fetch all punch records
app.get("/api/records", async (req, res) => {
  try {
    const result = await db.list({ include_docs: true });
    const records = result.rows
      .map((row) => row.doc)
      .filter((doc) => doc.type === "punch_record")
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ records });
  } catch (err) {
    console.error("❌ DB fetch error:", err);
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

// GET /api/records/:name - fetch records for specific member
app.get("/api/records/:name", async (req, res) => {
  try {
    const result = await db.list({ include_docs: true });
    const records = result.rows
      .map((row) => row.doc)
      .filter(
        (doc) =>
          doc.type === "punch_record" &&
          doc.name.toLowerCase() === req.params.name.toLowerCase()
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ records });
  } catch (err) {
    console.error("❌ DB fetch error:", err);
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

// DELETE /api/records/:id - delete a record
app.delete("/api/records/:id", async (req, res) => {
  try {
    const doc = await db.get(req.params.id);
    await db.destroy(doc._id, doc._rev);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DB delete error:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Serve React Build in Production ──────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/build", "index.html"));
  });
}

// ─── Start Server ──────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(
      `🌍 Environment: ${process.env.NODE_ENV || "development"}`
    );
  });
});
