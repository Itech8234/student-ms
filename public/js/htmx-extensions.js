// ---------- Loading indicator ----------
document.body.addEventListener("htmx:beforeSend",   () => document.body.classList.add("htmx-busy"));
document.body.addEventListener("htmx:afterRequest", () => document.body.classList.remove("htmx-busy"));

// ---------- Global response-error handler ----------
document.body.addEventListener("htmx:responseError", (e) => {
  const { status, responseText } = e.detail.xhr;
  let message = "Something went wrong";
  try {
    const json = JSON.parse(responseText);
    message = json.message || message;
  } catch {
    const match = responseText?.match(/message:\s*"([^"]+)"/);
    if (match) message = match[1];
  }
  window.showToast(humanize(status, message), "error");
  if (status === 401) {
    setTimeout(() => location.href = "/login?expired=1", 1200);
  }
});

// ---------- Network status ----------
window.addEventListener("offline", () => window.showToast("You went offline.", "error"));
window.addEventListener("online",  () => window.showToast("Back online.", "success"));

// ---------- Toast helper ----------
window.showToast = function (message, type = "info", durationMs = 4000) {
  const colors = {
    info:    "bg-slate-800 text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
    error:   "bg-rose-600 text-white"
  };
  const region = document.getElementById("toast-region");
  if (!region) return;

  const el = document.createElement("div");
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.setAttribute("aria-live", "polite");
  el.className = `toast-enter ${colors[type]} px-4 py-2.5 rounded-lg shadow-lg text-sm max-w-sm pointer-events-auto`;
  el.textContent = message;
  region.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-enter-active"));

  let timer;
  const startTimer = () => { timer = setTimeout(remove, durationMs); };
  const remove = () => {
    el.style.opacity = "0";
    el.style.transform = "translateX(120%)";
    setTimeout(() => el.remove(), 250);
  };
  el.addEventListener("mouseenter", () => clearTimeout(timer));
  el.addEventListener("mouseleave", startTimer);
  startTimer();
};

function humanize(status, fallback) {
  const map = {
    400: "That request looked off. Check your input.",
    401: "Please sign in to continue.",
    403: "You don't have access to that.",
    404: "We couldn't find that.",
    409: "That conflicts with an existing item.",
    429: "Slow down a moment and try again.",
    500: "Server hiccup. Try again in a moment."
  };
  return map[status] || fallback;
}
