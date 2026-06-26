import express from "express";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Body parser with 50mb limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Detect or create writable uploads folder
let UPLOADS_DIR = path.join(process.cwd(), "public/uploads");
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  // Test write permission
  const testFile = path.join(UPLOADS_DIR, ".write-test");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log(`Local storage directory verified at: ${UPLOADS_DIR}`);
} catch (e) {
  console.warn(`Cannot write to ${UPLOADS_DIR}, falling back to /tmp/uploads:`, e);
  UPLOADS_DIR = "/tmp/uploads";
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Initialize Google Cloud Storage if credentials/bucket are configured
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || process.env.FIREBASE_STORAGE_BUCKET || "";
let storage: Storage | null = null;

try {
  if (GCS_BUCKET_NAME) {
    // If running in Cloud Run, Application Default Credentials will be used automatically
    storage = new Storage();
    console.log(`GCS Storage initialized with bucket: ${GCS_BUCKET_NAME}`);
  }
} catch (e) {
  console.error("Failed to initialize Google Cloud Storage:", e);
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API File Upload Route (base64 JSON body)
app.post("/api/upload", async (req, res) => {
  try {
    const { fileData, fileName, fileType } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, error: "Missing fileData or fileName" });
    }

    // Clean up base64 header (e.g. "data:application/pdf;base64,")
    const commaIndex = fileData.indexOf(",");
    let pureBase64 = fileData;
    if (commaIndex > -1) {
      pureBase64 = fileData.substring(commaIndex + 1);
    }

    const buffer = Buffer.from(pureBase64, "base64");
    const uniqueFileName = `${Date.now()}_${fileName.replace(/\s+/g, "_")}`;

    // A. Attempt Google Cloud Storage / Firebase Storage upload if configured
    if (storage && GCS_BUCKET_NAME) {
      try {
        const cleanBucketName = GCS_BUCKET_NAME.replace(/^gs:\/\//, "").replace(/\/$/, "");
        const bucket = storage.bucket(cleanBucketName);
        const file = bucket.file(`uploads/${uniqueFileName}`);

        await file.save(buffer, {
          metadata: { contentType: fileType || "application/octet-stream" },
          resumable: false,
        });

        // Make file public if desired, or return direct public URL (Firebase Storage style or standard GCS public link)
        await file.makePublic().catch(() => {}); // Optional: make public if permissions allow

        const publicUrl = `https://storage.googleapis.com/${cleanBucketName}/uploads/${uniqueFileName}`;
        console.log(`File uploaded successfully to GCS: ${publicUrl}`);

        return res.json({
          success: true,
          fileName: fileName,
          fileUrl: publicUrl,
          storageType: "gcs",
        });
      } catch (gcsError: any) {
        console.error("GCS Upload failed, falling back to local disk storage:", gcsError);
      }
    }

    // B. Fallback to Local Disk Storage
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    // Build URL relative to host (served on /uploads/uniqueFileName)
    const relativeUrl = `/uploads/${uniqueFileName}`;
    const appUrl = process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}${relativeUrl}` : relativeUrl;

    console.log(`File uploaded successfully to local storage: ${appUrl}`);

    return res.json({
      success: true,
      fileName: fileName,
      fileUrl: appUrl,
      storageType: "local",
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, error: err.toString() });
  }
});

// Settings cloud storage persistence
let SETTINGS_FILE = path.join(process.cwd(), "settings.json");
try {
  // Test write permission on root, fallback to /tmp/settings.json if root is read-only
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2));
  }
} catch (e) {
  SETTINGS_FILE = "/tmp/settings.json";
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (err) {
    console.error("Failed to initialize settings file in /tmp:", err);
  }
}

// Read settings helper
const getSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading settings file:", e);
  }
  return {};
};

// Write settings helper
const saveSettings = (settings: any) => {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error("Error writing settings file:", e);
    return false;
  }
};

// API: Get shared settings
app.get("/api/settings", (req, res) => {
  const settings = getSettings();
  res.json({
    success: true,
    appsScriptUrl: settings.appsScriptUrl || "",
    upiId: settings.upiId || "merchant@upi",
    // We don't send the plain password back, just let them know if a master password has been configured
    hasPassword: !!settings.adminPassword,
  });
});

// API: Save shared settings
app.post("/api/settings", (req, res) => {
  const { appsScriptUrl, upiId, adminPassword } = req.body;
  const updatePayload: any = {};
  
  if (appsScriptUrl !== undefined) updatePayload.appsScriptUrl = appsScriptUrl.trim();
  if (upiId !== undefined) {
    let cleanedUpi = upiId.trim();
    if (cleanedUpi === "quickdeliver@ybl") cleanedUpi = "merchant@upi";
    updatePayload.upiId = cleanedUpi;
  }
  if (adminPassword !== undefined) updatePayload.adminPassword = adminPassword; // Securely saved on server

  const success = saveSettings(updatePayload);
  if (success) {
    res.json({ success: true, message: "Settings saved to cloud!" });
  } else {
    res.status(500).json({ success: false, error: "Failed to write settings to cloud storage" });
  }
});

// API: Verify admin password
app.post("/api/settings/verify", (req, res) => {
  const { password } = req.body;
  const settings = getSettings();
  const configuredPassword = settings.adminPassword || "admin123"; // Default if not configured
  
  if (password === configuredPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Incorrect admin password" });
  }
});

// API: Proxy Google Apps Script requests to bypass CORS and Failed to fetch issues
app.post("/api/proxy-apps-script", async (req, res) => {
  const { appsScriptUrl, method = "POST", payload = {} } = req.body;
  
  // Resolve the URL to use
  let targetUrl = appsScriptUrl || "";
  if (!targetUrl) {
    const settings = getSettings();
    targetUrl = settings.appsScriptUrl || "";
  }
  
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: "Google Apps Script URL is not configured." });
  }
  
  try {
    let response;
    if (method.toUpperCase() === "GET") {
      // Append payload as query string
      const urlObj = new URL(targetUrl);
      Object.keys(payload).forEach(key => {
        urlObj.searchParams.append(key, String(payload[key]));
      });
      console.log(`Proxying GET request to Google Apps Script URL: ${urlObj.toString()}`);
      response = await fetch(urlObj.toString(), {
        method: "GET",
      });
    } else {
      console.log(`Proxying POST request to Google Apps Script URL: ${targetUrl}`);
      response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain", // Avoid pre-flight checks and match Apps Script
        },
        body: JSON.stringify(payload),
      });
    }
    
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.warn("Could not parse Apps Script response as JSON, returning text directly:", text);
      return res.json({ success: true, text });
    }
    
    return res.json(json);
  } catch (err: any) {
    console.error("Error in Google Apps Script proxy:", err);
    return res.status(500).json({ 
      success: false, 
      error: `Failed to sync with Google Sheets (Proxy Error: ${err.message || err.toString()})` 
    });
  }
});

// Mount Vite middleware in development or serve built assets in production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();
