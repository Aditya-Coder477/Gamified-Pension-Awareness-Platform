# 🏦 Gamified Pension Awareness Platform
> A web-based, gamified learning platform that educates young professionals (ages 21–35) about the **National Pension System (NPS)** through interactive lessons, quizzes, a retirement corpus simulator, and achievement-based incentives.
---
## 📋 Table of Contents
- [Project Overview](#project-overview)  
- [Target Users](#target-users)  
- [Core Features](#core-features)  
- [Tech Stack](#tech-stack)  
- [System Architecture](#system-architecture)  
- [Firestore Data Model](#firestore-data-model)  
- [Gamification Design](#gamification-design)  
- [Project Structure](#project-structure)  
- [Getting Started](#getting-started)  
- [Firebase Setup](#firebase-setup)  
- [Seeding Lesson Data](#seeding-lesson-data)  
- [Configuration & Security](#configuration--security)  
- [Pages & Modules](#pages--modules)  
- [UI/UX Principles](#uiux-principles)  
- [Firestore Security Rules](#firestore-security-rules)  
- [Known Limitations](#known-limitations)  
- [Roadmap](#roadmap)
---
## Project Overview
**Problem Statement:**  
Awareness of NPS (National Pension System) among working-age Indians remains low. Most young professionals are unaware of NPS's tax benefits, contribution mechanics, and long-term wealth-building potential — leading to under-enrollment and inadequate retirement planning.
**Solution:**  
A gamified, self-paced web platform where users:
1. Learn NPS concepts through structured modules
2. Test knowledge through quizzes
3. Simulate their retirement corpus interactively
4. Commit to saving goals (Saving Intent)
5. Upload contribution receipts as proof of action
6. Earn points and badges as motivation
**Scope (v1 Prototype):**
- Web-only (no mobile app)
- English only
- No real payment processing — educational and intent-tracking only
- Firebase backend (no custom server)
---
## Target Users
| Persona | Description |
|---|---|
| **Young Professional** | Age 21–35, salaried, aware of tax planning, new to NPS |
| **First-time Investor** | No prior experience with pension products, needs guided learning |
| **Admin** | Platform manager who seeds content and monitors usage |
**User Goals:**
- Understand what NPS is and how to benefit from it
- Calculate retirement corpus for their own scenario
- Commit publicly (within the platform) to a contribution goal
- Track achievements and learning progress
---
## Core Features
### 1. 📖 Learning Modules (`lessons.html`)
- 5 structured NPS lessons loaded from Firestore
- Two-panel layout: lesson list (left) + reading pane (right)
- Progress bar tracking completed vs total lessons
- "Mark as Completed" button awards points and checks for new badges
- Lessons ordered by difficulty (`order` field in Firestore)
### 2. 🧾 Quizzes (`quiz.html`)
- MCQ quiz per lesson (3 questions each)
- Immediate answer feedback (correct/incorrect highlighting)
- Scoring with pass threshold at 60%
- Bonus points: +10 pts for passing, +25 pts for a perfect score
- Badge awarded for first perfect score (Quiz Ace 🏆)
### 3. ⌛ Pension Simulator (`simulator.html`)
- Inputs: Current Age, Retirement Age, Monthly Contribution, Annual Return %
- Compound interest calculation using standard NPS formula
- Outputs: Estimated corpus, total invested, growth, estimated monthly annuity
- Year-by-year projection table
- Option to save simulation result
- Assumes 40% corpus → annuity at 6% rate (NPS standard)
### 4. 🎯 Saving Intent (`intent.html`)
- Form to pledge monthly/quarterly/yearly contribution target
- Optional start date and personal notes
- History of previous intents displayed below form
- Badge awarded on first intent saved (Committed 🎯)
### 5. 👤 Profile (`profile.html`)
- Displays earned points, badge count, lessons completed, streak
- **Badges tab:** Visual grid of all badges (earned vs locked)
- **Receipts tab:** Upload NPS contribution receipts (PDF/JPG, max 5 MB) to Firebase Storage; progress bar during upload; pending/verified status display
- **Simulations tab:** Table of all saved simulation runs
- **Points Log tab:** Chronological history of every points event
### 6. 🏆 Gamification (cross-cutting)
- Points awarded for completing lessons, passing quizzes, first actions
- 7 badges with defined unlock conditions (see Gamification Design)
- Points logged to `pointsLedger` collection in Firestore
- Badges stored in `userBadges` collection with award timestamp
### 7. ⚙️ Admin Panel (`admin.html`)
- Platform-wide stats: total lesson completions, intents, receipts uploaded
- Receipts management table (view uploaded files, see pending/verified status)
- Recent simulations table
- One-click seed tool: adds 5 lessons + 5 quizzes to Firestore
---
## Tech Stack
### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Structure | **HTML5** | Semantic, standards-compliant markup |
| Styling | **Vanilla CSS** (custom design system) | Full control, no framework overhead |
| Logic | **Vanilla JavaScript (ES Modules)** | No build step, native browser support |
| Fonts | **Inter** (Google Fonts) | Clean professional typeface |
| Hosting | Python `http.server` / any static server | Simple local dev; deployable to Netlify, Vercel, Firebase Hosting |
### Backend (Firebase)
| Service | Usage |
|---|---|
| **Firebase Firestore** | All structured data (lessons, quizzes, progress, intents, badges, points) |
| **Firebase Storage** | Receipt file uploads (PDF/JPG) |
| ~~Firebase Auth~~ | *(Removed — public access mode; guest session UID via `sessionStorage`)* |
### No Build Tool
This is a **zero-build project** — files are served directly by any HTTP server. There is no Webpack, Vite, or Babel. Firebase SDK is loaded via CDN (ESM).
---
## System Architecture
```
Browser
  │
  ├── index.html           → Redirects to dashboard.html
  ├── dashboard.html       → js/dashboard.js
  ├── lessons.html         → js/lessons.js
  ├── quiz.html            → js/quiz.js
  ├── simulator.html       → js/simulator.js
  ├── intent.html          → js/intent.js
  ├── profile.html         → js/profile.js
  ├── admin.html           → js/admin.js
  └── seed.html            → Standalone Firestore seeder
  
  JS Modules (ES Modules, loaded natively)
  ├── js/firebase.js       → Initializes app, exports db / storage
  ├── js/firebaseConfig.js → (gitignored) actual API keys
  ├── js/auth.js           → No-op requireAuth() + showToast()
  ├── js/gamification.js   → Badge definitions, awardPoints(), checkLessonBadges()
  └── [page].js            → Page-specific logic
Firebase Cloud (Google)
  ├── Firestore Database   → lessons, quizzes, userProgress, simulations,
  │                          intents, receipts, pointsLedger, userBadges
  └── Firebase Storage     → receipts/{guestUid}/{filename}
```
---
## Firestore Data Model
### `lessons` collection
```json
{
  "title":    "What is NPS?",
  "content":  "Long-form text content…",
  "order":    1,
  "duration": "5 min",
  "points":   10,
  "createdAt": "<timestamp>"
}
```
### `quizzes` collection
```json
{
  "lessonId": "lesson_001",
  "questions": [
    {
      "q":       "What does NPS stand for?",
      "options": ["National Pension System", "New Payment Scheme", "…"],
      "answer":  0
    }
  ],
  "createdAt": "<timestamp>"
}
```
### `userProgress` collection
```json
{
  "uid":         "guest_abc123",
  "lessonId":    "lesson_001",
  "completed":   true,
  "completedAt": "<timestamp>"
}
```
### `simulations` collection
```json
{
  "uid":           "guest_abc123",
  "monthly":       5000,
  "annualReturn":  10,
  "currentAge":    28,
  "retirementAge": 60,
  "corpus":        15482930,
  "totalInvested": 1920000,
  "createdAt":     "<timestamp>"
}
```
### `intents` collection
```json
{
  "uid":       "guest_abc123",
  "amount":    5000,
  "frequency": "monthly",
  "startDate": "2026-03-01",
  "note":      "Linked to salary credit",
  "createdAt": "<timestamp>"
}
```
### `receipts` collection
```json
{
  "uid":        "guest_abc123",
  "fileName":   "nps_march.pdf",
  "fileUrl":    "https://storage.googleapis.com/…",
  "uploadedAt": "<timestamp>",
  "verified":   false
}
```
### `pointsLedger` collection
```json
{
  "uid":       "guest_abc123",
  "points":    10,
  "reason":    "Completed lesson",
  "createdAt": "<timestamp>"
}
```
### `userBadges` collection
```json
{
  "uid":      "guest_abc123",
  "badgeId":  "first_lesson",
  "awardedAt": "<timestamp>"
}
```
---
## Gamification Design
### Point System
| Action | Points |
|---|---|
| Complete a lesson | +10 pts |
| Pass a quiz (≥60%) | +10 pts |
| Perfect quiz score (100%) | +25 pts |
| Run first simulation | +20 pts |
| Set first saving intent | +15 pts |
| Upload first receipt | +10 pts |
### Badges
| ID | Badge | Emoji | Unlock Condition |
|---|---|---|---|
| `first_lesson` | First Step | 📖 | Complete 1st lesson |
| `three_lessons` | On a Roll | 🏃 | Complete 3 lessons |
| `five_lessons` | Knowledge Seeker | 🎓 | Complete 5 lessons |
| `first_simulation` | Future Planner | ⌛ | Run first simulation |
| `first_intent` | Committed | 🎯 | Set first saving intent |
| `quiz_ace` | Quiz Ace | 🏆 | Score 100% on any quiz |
| `receipt_uploader` | Proof Provided | 📎 | Upload first receipt |
### Session Identity
Since authentication was removed, each browser session gets a **guest UID** generated at first page load and stored in `sessionStorage`. This persists across page navigations within the session and allows Firestore to attribute points, progress, and badges to the same virtual user.
---
## Project Structure
```
Solution 2/
├── index.html                  ← Redirects to dashboard
├── dashboard.html              ← Home screen
├── simulator.html              ← Pension corpus calculator
├── lessons.html                ← NPS learning modules
├── quiz.html                   ← MCQ quizzes (linked from lessons)
├── intent.html                 ← Saving pledge form
├── profile.html                ← Badges, receipts, history
├── admin.html                  ← Admin panel + data seeder
├── seed.html                   ← One-time Firestore seeder (open in browser)
├── .gitignore                  ← Excludes firebaseConfig.js
├── css/
│   ├── main.css                ← Design system (variables, layout, components)
│   ├── auth.css                ← (legacy login page styles)
│   └── dashboard.css           ← Page-specific component styles
├── js/
│   ├── firebaseConfig.js       ← 🔒 GITIGNORED — your real API keys
│   ├── firebaseConfig.example.js← Template for new developers
│   ├── firebase.js             ← Firebase init, exports db/storage
│   ├── auth.js                 ← No-op requireAuth + showToast
│   ├── gamification.js         ← Badge definitions + point/badge logic
│   ├── dashboard.js            ← Dashboard stats + activity feed
│   ├── simulator.js            ← Corpus calculator + Firestore save
│   ├── lessons.js              ← Lesson list, detail, completion
│   ├── quiz.js                 ← Quiz loader, scoring, awards
│   ├── intent.js               ← Intent form + history display
│   ├── profile.js              ← Profile tabs: badges, receipts, sims, points
│   └── admin.js                ← Admin stats + seed tool
└── Documentation/
    ├── PRD.docx
    ├── Tech Stack.docx
    ├── Technical Design Document (tdd).docx
    └── architecture_diagram.pdf
```
---
## Getting Started
### Prerequisites
- A modern browser (Chrome, Edge, Firefox)
- Python 3 (for local HTTP server) **or** VS Code with Live Server extension
- A Firebase project (free Spark plan is sufficient)
### 1. Clone / Download the project
```bash
git clone https://github.com/your-username/pension-platform.git
cd "pension-platform"
```
### 2. Set up your Firebase config
```bash
# Copy the template
cp js/firebaseConfig.example.js js/firebaseConfig.js
```
Then open `js/firebaseConfig.js` and fill in your values from **Firebase Console → Project Settings → Your apps → Web app**.
### 3. Run locally
```bash
# Option A — Python
python -m http.server 8081
# Option B — Node.js
npx serve .
# Option C — VS Code Live Server
# Right-click index.html → "Open with Live Server"
```
Open **[http://localhost:8081](http://localhost:8081)** in your browser.

  }
}
```
