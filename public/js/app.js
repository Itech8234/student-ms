// ---------- Global HTMX lifecycle ----------
document.addEventListener("htmx:afterSwap", (e) => {
  initWidgetsIn(e.detail.target);
  // Sidebar active lesson highlight
  if (e.detail.target?.id === "lesson-stage") {
    const url = new URL(location.href);
    const lid = url.searchParams.get("lesson");
    document.querySelectorAll('aside [aria-current="page"]').forEach((el) => el.setAttribute("aria-current", "false"));
    const link = document.querySelector(`aside a[href*="lesson=${lid}"]`);
    if (link) {
      link.setAttribute("aria-current", "page");
      link.classList.add("bg-brand-50", "text-brand-700", "font-medium");
      link.scrollIntoView({ block: "nearest" });
    }
  }
  // 404 fallback
  if (e.detail.xhr?.status === 404 && e.detail.target?.id === "lesson-stage") {
    e.detail.target.innerHTML = `
      <div class="max-w-md mx-auto py-16 text-center">
        <h2 class="text-xl font-semibold text-slate-900">Lesson not found</h2>
        <p class="text-slate-600 mt-2">It may have been removed.</p>
        <a href="/dashboard" class="mt-4 inline-block text-brand-600 hover:underline">Back to dashboard</a>
      </div>`;
  }
  // A11y: focus the swapped heading
  const heading = e.detail.target?.querySelector("h1, h2, [role=heading]");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: false });
  }
});

window.addEventListener("DOMContentLoaded", () => initWidgetsIn(document));

function initWidgetsIn(root) {
  if (!root) return;
  initProgressBars(root);
  initVideoPlayers(root);
  initStatsCounter(root);
  initEnrollButtons(root);
}

// ---------- Progress bars ----------
function initProgressBars(root) {
  root.querySelectorAll("progress[data-progress-bar]").forEach((el) => {
    const value = Number(el.value || 0);
    const label = el.parentElement.querySelector("[data-progress-label]");
    if (label) label.textContent = `${value}%`;
  });
}

// ---------- Video player ----------
function initVideoPlayers(root) {
  root.querySelectorAll("video[data-lesson-video]").forEach((vid) => {
    vid.addEventListener("ended", () => {
      const lessonId = vid.dataset.lessonId;
      const courseId = vid.dataset.courseId;
      const moduleId = vid.dataset.moduleId;
      htmx.ajax("POST", "/progress/complete", {
        target:  "#progress-" + lessonId,
        swap:    "outerHTML",
        values:  { courseId, moduleId, lessonId }
      });
    });

    let lastSave = 0;
    vid.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - lastSave > 10000) {
        lastSave = now;
        localStorage.setItem(`watch:${vid.dataset.lessonId}`, String(vid.currentTime));
      }
      // Refresh signed URL near the end of the video
      if (vid.duration && vid.currentTime / vid.duration > 0.8) {
        maybeRefreshSignedUrl(vid);
      }
    });

    const saved = localStorage.getItem(`watch:${vid.dataset.lessonId}`);
    if (saved) vid.currentTime = Number(saved);
  });
}

async function maybeRefreshSignedUrl(vid) {
  try {
    const res = await fetch(`/lessons/${vid.dataset.courseId}/${vid.dataset.lessonId}/refresh-url`, { method: "POST" });
    if (!res.ok) return;
    const { url } = await res.json();
    if (!url || url === vid.src) return;
    const t = vid.currentTime;
    const wasPaused = vid.paused;
    vid.src = url;
    vid.load();
    vid.addEventListener("loadedmetadata", () => {
      vid.currentTime = t;
      if (!wasPaused) vid.play();
    }, { once: true });
  } catch { /* silent — user will see a player error and can hit reload */ }
}

// ---------- Stats counter on dashboard ----------
function initStatsCounter(root) {
  const enrolledEl    = document.getElementById("stat-enrolled");
  const inProgressEl  = document.getElementById("stat-in-progress");
  const completedEl   = document.getElementById("stat-completed");
  if (!enrolledEl) return;

  const list = root.querySelectorAll("#my-enrollments a");
  let inProgress = 0, completed = 0;
  list.forEach((a) => {
    const pct = Number(a.querySelector("progress")?.value || 0);
    if (pct >= 100) completed++;
    else if (pct > 0) inProgress++;
  });
  enrolledEl.textContent    = list.length;
  inProgressEl.textContent  = inProgress;
  completedEl.textContent   = completed;
}

// ---------- Enroll button ----------
function initEnrollButtons(root) {
  root.querySelectorAll("[data-action=enroll]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const courseId = btn.dataset.courseId;
      btn.classList.add("opacity-50", "pointer-events-none");
      try {
        await htmx.ajax("POST", `/courses/${courseId}/enroll`, { target: "#enroll-zone", swap: "outerHTML" });
        window.showToast("Enrolled! Opening course…", "success");
        setTimeout(() => location.href = `/learn/${courseId}`, 600);
      } catch (err) {
        window.showToast("Could not enroll. Try again.", "error");
        btn.classList.remove("opacity-50", "pointer-events-none");
      }
    });
  });
}

// ---------- Skip link a11y ----------
document.querySelector('a[href="#main"]')?.addEventListener("click", () => {
  const main = document.getElementById("main");
  main?.setAttribute("tabindex", "-1");
  main?.focus({ preventScroll: true });
});
