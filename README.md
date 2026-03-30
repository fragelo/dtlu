# 📤 Dynatrace Log Uploader (DTLU)

A custom Dynatrace App that lets you upload any log file — CSV or plain text — directly into **Dynatrace Grail** via the Log Ingestion SDK. No infrastructure, no API tokens, no CLI required.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Dynatrace%20SaaS-darkblue)
![Node](https://img.shields.io/badge/node-24%20LTS-green)

---

## ✨ Features

- 📄 **Generic log files** — any `.log`, `.txt`, `.out` file; each line → one log record
- 📊 **CSV files** — columns auto-mapped as structured Grail attributes
- 🕐 **Timestamp handling** — auto-detected by column name or number; falls back to ingestion time
- 🏷️ **log.type field** — add a custom type to all records (default: `logsample`)
- ➕ **Custom attribute** — add any `key=value` pair to all records
- 📦 **Batched ingestion** — 1000 records per API call, progress bar included
- 📖 **Built-in instructions** — IAM setup guide built into the app
- 📁 **Sample files** — downloadable test files with upload hints

---

## 🚀 Quick Install (No CLI needed)

1. Download **`dtlu.zip`** from [Releases](../../releases)
2. In Dynatrace: **Hub → Manage → Upload app**
3. Upload `dtlu.zip`
4. Open the app → **Instructions** tab → follow the IAM setup (3 steps)

---

## 🔐 IAM Setup (Required — 3 steps)

### 1. Create a Policy
Go to `myaccount.dynatrace.com` → **Identity & access management → Policy management → Create policy**
```
Policy name: log-uploader-write

ALLOW storage:logs:write;
ALLOW storage:buckets:read;
```

### 2. Create a Group and Bind the Policy
- **Group management → Create group** → name: `log-uploader-users`
- Click **+ Permission** → select `log-uploader-write` → scope: your environment
- Save

### 3. Add Your User to the Group
- **User management** → find your user → add to group `log-uploader-users` → Save

---

## 🛠️ Build from Source
```bash
# 1. Bootstrap a new project linked to your DT environment
npx dt-app@latest create --environment-url https://YOUR_ENV_ID.apps.dynatrace.com
# When prompted for name: dtlu

# 2. Enter the generated folder and copy our ui/ files
cd dtlu
cp -r /path/to/dtlu-source/ui/* ./ui/

# 3. Deploy
npx dt-app deploy

# 4. Build the Hub-uploadable zip
npx dt-app deploy --dry-run
# → rename out/artifact.zip to dtlu.zip
```

---

## 📋 CSV Format

| Column | Accepted Names | Notes |
|--------|---------------|-------|
| Timestamp | `timestamp`, `@timestamp`, `date` | ISO-8601, epoch ms/s |
| Severity | `severity`, `loglevel`, `level` | INFO / WARN / ERROR |
| Log body | full CSV row | Always stored as `content` |
| Custom attrs | any other column | Ingested as named attributes |

**Minimum valid CSV:**
```csv
content
User login successful
Database connection timeout
Payment processed
```

**Full example:**
```csv
severity,service.name,host.name,http.status_code,duration_ms,message
INFO,auth-service,web-host-01,200,45,User login successful
ERROR,order-service,db-host-01,503,30012,Database connection timeout
WARN,api-gateway,web-host-02,200,532,Response time exceeded 500ms
```

---

## 🔍 DQL Queries After Upload
```dql
// Filter by service
fetch logs
| filter service.name == "order-service"
| sort timestamp desc

// Filter by severity
fetch logs
| filter severity == "ERROR"
| fields timestamp, severity, service.name, content

// Full text search
fetch logs
| filter contains(content, "timeout")

// Filter by log type
fetch logs
| filter log.type == "logsample"
| summarize count(), by: {severity}
```

---

## 📁 Project Structure
```
dtlu/
├── app.config.json          # App manifest — ID, name, version, IAM scopes
├── package.json             # npm dependencies (name: dtlu)
└── ui/
    ├── main.tsx             # React entrypoint
    ├── assets/icon.svg      # App icon
    └── app/
        ├── App.tsx          # 4-tab navigation shell
        ├── pages/
        │   ├── UploadPage.tsx       # Main upload UI
        │   ├── InstructionsPage.tsx # IAM setup guide
        │   ├── SamplesPage.tsx      # Downloadable test files
        │   └── ConfigPage.tsx       # Optional token config
        └── utils/
            ├── csvParser.ts         # CSV + plain text parser
            └── logIngestionService.ts # logsClient wrapper
```

---

## 👤 Author

**Francesco Gelo** — Lead Solutions Engineer, Dynatrace
Built with [Dynatrace App Toolkit](https://developer.dynatrace.com/quickstart/app-toolkit/)

---

## 📜 License

MIT
