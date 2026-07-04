import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onIdTokenChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ---------- Login ----------
const loginForm = document.getElementById("login-form");
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  try {
    const { user } = await signInWithEmailAndPassword(auth, loginForm.email.value, loginForm.password.value);
    const idToken = await user.getIdToken();
    const r = await fetch("/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    if (!r.ok) throw new Error("Session creation failed");
    window.location.href = "/dashboard";
  } catch (err) {
    errEl.textContent = friendlyError(err);
    errEl.classList.remove("hidden");
  }
});

// ---------- Register ----------
const regForm = document.getElementById("register-form");
regForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { user } = await createUserWithEmailAndPassword(auth, regForm.email.value, regForm.password.value);
  await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: regForm.email.value, displayName: regForm.displayName.value })
  });
  const idToken = await user.getIdToken();
  await fetch("/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  window.location.href = "/dashboard";
});

// ---------- Reset ----------
const resetForm = document.getElementById("reset-form");
resetForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await sendPasswordResetEmail(auth, resetForm.email.value);
  await fetch("/auth/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: resetForm.email.value })
  });
  document.getElementById("reset-success").classList.remove("hidden");
});

// ---------- Logout (delegated) ----------
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-action=logout]")) {
    e.preventDefault();
    await signOut(auth);
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
});

// ---------- Auto-refresh session cookie ----------
onIdTokenChanged(auth, async (user) => {
  if (!user) return;
  try {
    const idToken = await user.getIdToken();
    await fetch("/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
  } catch (e) {
    console.warn("Token refresh failed", e);
  }
});

function friendlyError(err) {
  const map = {
    "auth/invalid-credential":      "Email or password is incorrect.",
    "auth/user-not-found":          "No account found with that email.",
    "auth/too-many-requests":       "Too many attempts. Try again later.",
    "auth/network-request-failed":  "Network error. Check your connection."
  };
  return map[err.code] || err.message;
}
