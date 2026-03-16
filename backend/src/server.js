require("dotenv").config();
const express = require("express");
const cors = require("cors");
const couchbase = require("couchbase");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Couchbase Setup ───────────────────────────────────────────────────────────
const CB_URL        = process.env.COUCHDB_URL;
const CB_USER       = process.env.CB_USERNAME;
const CB_PASSWORD   = process.env.CB_PASSWORD;
const CB_BUCKET     = process.env.COUCHDB_DB     || "employee-punch-records";
const CB_SCOPE      = process.env.CB_SCOPE       || "_default";
const CB_COLLECTION = process.env.CB_COLLECTION  || "_default";

let cluster, bucket, scope, collection;

async function initCouchbase() {
  try {
    if (!CB_URL || !CB_USER || !CB_PASSWORD) {
      throw new Error(
        "Missing Couchbase credentials. Set COUCHDB_URL, CB_USERNAME, CB_PASSWORD env vars."
      );
    }

    cluster = await couchbase.connect(CB_URL, {
      username: CB_USER,
      password: CB_PASSWORD,
      timeouts: {
        connectTimeout: 10000,
        kvTimeout: 5000,
        queryTimeout: 10000,
      },
    });

    bucket     = cluster.bucket(CB_BUCKET);
    scope      = bucket.scope(CB_SCOPE);
    collection = scope.collection(CB_COLLECTION);

    // Create primary index for N1QL queries
    try {
      await cluster.query(
        `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${CB_BUCKET}\`.\`${CB_SCOPE}\`.\`${CB_COLLECTION}\``
      );
      console.log("✅ Couchbase: Primary index ready");
    } catch (idxErr) {
      console.warn("⚠️  Index note:", idxErr.message);
    }

    console.log(`✅ Couchbase: Connected to bucket '${CB_BUCKET}'`);
  } catch (err) {
    console.error("❌ Couchbase init error:", err.message);
    process.exit(1);
  }
}

// ─── AWS SNS Setup ─────────────────────────────────────────────────────────────
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendSNSNotification(message) {
  if (!process.env.SNS_TOPIC_ARN) {
    console.warn("⚠️  SNS_TOPIC_ARN not set. Skipping notification.");
    return;
  }
  try {
    const command = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject:  "Team Attendance Update",
      Message:  message,
    });
    const result = await snsClient.send(command);
    console.log(`✅ SNS sent. MessageId: ${result.MessageId}`);
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

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/members
app.get("/api/members", (req, res) => {
  const members = TEAM_MEMBERS.length > 0 ? TEAM_MEMBERS : DEFAULT_MEMBERS;
  res.json({ members });
});

// POST /api/punch
app.post("/api/punch", async (req, res) => {
  const { name, action, time, date, entryType } = req.body;

  if (!name || !action || !time || !date) {
    return res.status(400).json({
      error: "Missing required fields: name, action, time, date",
    });
  }

  const validActions = ["punch-in", "break", "punch-out"];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const docId = `punch::${uuidv4()}`;
  const record = {
    type:      "punch_record",
    name,
    action,
    time,
    date,
    entryType: entryType || "auto",
    timestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  try {
    await collection.insert(docId, record);
    record.id = docId;

    const actionLabels = {
      "punch-in":  "Punched In",
      "break":     "Gone on Break",
      "punch-out": "Punched Out",
    };
    const label  = actionLabels[action] || action;
    const snsMsg =
      `📋 Attendance Update\n\n` +
      `Team Member: ${name}\n` +
      `Action: ${label}\n` +
      `Time: ${time}\n` +
      `Date: ${date}\n` +
      `Entry Type: ${entryType === "manual" ? "Manual" : "Auto"}\n\n` +
      `– Punch Tracker System`;

    await sendSNSNotification(snsMsg);
    res.status(201).json({ success: true, record });
  } catch (err) {
    console.error("❌ Couchbase insert error:", err);
    res.status(500).json({ error: "Failed to save record", details: err.message });
  }
});

// GET /api/records
app.get("/api/records", async (req, res) => {
  try {
    const query = `
      SELECT META().id AS id, doc.*
      FROM \`${CB_BUCKET}\`.\`${CB_SCOPE}\`.\`${CB_COLLECTION}\` AS doc
      WHERE doc.type = 'punch_record'
      ORDER BY doc.createdAt DESC
    `;
    const result  = await cluster.query(query);
    const records = result.rows;
    res.json({ records });
  } catch (err) {
    console.error("❌ Couchbase fetch error:", err);
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

// GET /api/records/:name
app.get("/api/records/:name", async (req, res) => {
  try {
    const query = `
      SELECT META().id AS id, doc.*
      FROM \`${CB_BUCKET}\`.\`${CB_SCOPE}\`.\`${CB_COLLECTION}\` AS doc
      WHERE doc.type = 'punch_record'
        AND LOWER(doc.name) = LOWER($1)
      ORDER BY doc.createdAt DESC
    `;
    const result  = await cluster.query(query, { parameters: [req.params.name] });
    const records = result.rows;
    res.json({ records });
  } catch (err) {
    console.error("❌ Couchbase fetch error:", err);
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

// DELETE /api/records/:id
app.delete("/api/records/:id", async (req, res) => {
  try {
    await collection.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Couchbase delete error:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// ─── Serve React Build in Production ──────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/build", "index.html"));
  });
}

// ─── Start Server ──────────────────────────────────────────────────────────────
initCouchbase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});