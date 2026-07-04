import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";

let credential;
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (saPath && existsSync(saPath)) {
  const sa = JSON.parse(readFileSync(saPath, "utf8"));
  credential = admin.credential.cert(sa);
} else {
  // Fallback: Application Default Credentials (works on GCP / Cloud Run)
  credential = admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

export const db      = admin.firestore();
export const auth    = admin.auth();
export const storage = admin.storage();
export default admin;

// Stable ordering & ignore undefined props
db.settings({ ignoreUndefinedProperties: true });
