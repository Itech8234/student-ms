# LearnHub — Student LMS

A production-ready Student E-Learning Management System built with **HTMX + Tailwind + Vanilla JS** on the frontend, **Node.js + Express + EJS** on the backend, and **Firebase** (Firestore + Auth + Storage) as the BaaS.

## Tech Stack

- **Frontend:** HTMX 1.9, Tailwind CSS (CDN), vanilla ES6+
- **Backend:** Node.js 20+, Express 4, EJS templates
- **BaaS:** Firebase Auth, Firestore, Cloud Storage
- **Server-side:** Firebase Admin SDK (server brokers all writes)

## Quick Start

```bash
# 1. Install
npm install

# 2. Firebase setup
cp .env.example .env
# → Fill in your Firebase project credentials
# → Place serviceAccount.json at ./secrets/serviceAccount.json

# 3. Deploy security rules + indexes
firebase deploy --only firestore:rules,firestore:indexes,storage

# 4. Run
npm run dev
# → http://localhost:3000

# 5. Bootstrap your instructor account
npm run bootstrap:instructor -- you@example.com
```

## Architecture

```
Browser (Tailwind + HTMX + Vanilla JS)
   ↓ hx-get / hx-post (HTML fragments)
Node.js / Express
   - EJS templates
   - Auth middleware (Firebase ID tokens + session cookies)
   - HTMX fragment routes
   ↓ firebase-admin SDK
Firebase (Auth, Firestore, Storage)
```

## Key Design Decisions

- **No client-side Firestore access.** The browser only talks to Express; the server uses Admin SDK with full privileges. This eliminates the need for complex client-side rules.
- **HTMX returns HTML, not JSON.** Every endpoint either renders a full page (EJS layout) or a partial (with `layout: false`).
- **Denormalized counters** on `courses` (lessonsCount, enrolledCount, etc.) — eliminates N+1 on catalog and dashboard.
- **Snapshot fields** on `enrollments` (courseTitle, courseThumbnail) — survives course rename/delete.
- **Out-of-Band swaps** for compound updates (mark complete updates button + sidebar progress bar in one response).

## Project Structure

```
student-lms/
├── server.js                     # Express entry point
├── config/
│   ├── firebase-admin.js         # Admin SDK init
│   └── firestore.js              # Collection helpers
├── routes/                       # URL → controller mapping
│   ├── auth.js
│   ├── pages.js
│   ├── courses.js
│   ├── lessons.js
│   ├── enrollments.js
│   ├── progress.js
│   └── instructor.js
├── services/                     # All Firebase Admin SDK calls
│   ├── userService.js
│   ├── courseService.js
│   ├── enrollmentService.js
│   └── progressService.js
├── middleware/
│   ├── verifyToken.js            # Firebase ID token verification
│   ├── errorHandler.js
│   ├── rateLimit.js
│   ├── requestLog.js
│   └── cacheControl.js
├── views/
│   ├── layouts/base.ejs
│   ├── partials/                 # HTMX swap targets
│   └── pages/                    # Full SSR pages
├── public/
│   ├── js/                       # Client-side HTMX glue
│   └── css/app.css
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
├── scripts/
│   └── create-instructor.js
├── Dockerfile
├── .env.example
└── package.json
```

## Deployment

See `PHASE_5_DEPLOY.md` (or the Phase 5 chat transcript) for the full Cloud Run + Firebase Hosting playbook.

TL;DR:
```bash
gcloud builds submit --tag gcr.io/$PROJECT/learnhub
gcloud run deploy learnhub --image gcr.io/$PROJECT/learnhub --region europe-west1 --allow-unauthenticated
firebase deploy --only hosting
```

## License

MIT
