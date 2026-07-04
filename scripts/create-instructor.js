import { auth, db } from "../config/firebase-admin.js";
import { COL } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/create-instructor.js you@example.com");
  process.exit(1);
}

try {
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: "instructor" });
  await db.collection(COL.USERS).doc(user.uid).set(
    { role: "instructor", updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  console.log(`✅ ${email} is now an instructor.`);
} catch (err) {
  console.error("❌", err.message);
  process.exit(1);
}
