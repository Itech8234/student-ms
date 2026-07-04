import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  credential = admin.credential.cert(serviceAccount);

} else if (
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH &&
  existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
) {
  const serviceAccount = JSON.parse(
    readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
  );

  credential = admin.credential.cert(serviceAccount);

} else {
  credential = admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

db.settings({
  ignoreUndefinedProperties: true
});

export default admin;