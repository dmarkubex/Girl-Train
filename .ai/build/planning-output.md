=== LEAD PLANNING OUTPUT ===

Project Root: /Volumes/Out-Memory/Girl-Train

Scope:
  Target: Full scoliosis exercise tracker PWA (tasks 1.3–10.3, 1.1-1.2 done)
  Non-goals: No backend, no social features, no auth, no multi-device sync
  Constraints: Vanilla TypeScript + Vite, IndexedDB via idb, Chart.js, PWA
  Spec-Critic simplifications:
    - Streak calculated on-demand from sessions (no separate metadata store)
    - Import merge: always overwrite config, sessions dedupe by sessionId
    - Exercise reorder uses up/down arrow buttons (no drag-drop)
  Existing code (DO NOT overwrite unless noted):
    - src/main.ts (entry point, keep)
    - src/router.ts (hash router, keep — already implements tasks 1.3)
    - index.html (keep)
    - package.json / vite.config.ts / tsconfig.json (keep)

DB Schema (IndexedDB via idb):
  Database: exercise-tracker, version 1

  objectStore: config
    keyPath: "id" (always "default")
    fields: { id: "default", exercises: Exercise[], projectRestSeconds: number }
    Exercise = { id: string, name: string, setDurationSeconds: number, restSeconds: number, totalSets: number, order: number }

  objectStore: sessions
    keyPath: "sessionId"
    indexes: [date, status]
    fields: { sessionId: string, date: string (business date YYYY-MM-DD), startTime: number, endTime: number, status: "completed"|"incomplete"|"abandoned", exercises: SessionExercise[], totalDuration: number, completionRate: number, note?: string }
    SessionExercise = { exerciseId: string, exerciseName: string, plannedSets: number, completedSets: number, sets: SessionSet[] }
    SessionSet = { setIndex: number, plannedDuration: number, actualDuration: number, skipped: boolean }

Shared File Ownership:
  src/db.ts → Builder-Data owns
  src/state.ts → Builder-Data owns
  src/utils/date.ts → Builder-Data owns
  src/timer/* → Builder-Timer owns
  src/views/* → Builder-UI owns
  src/components/* → Builder-UI owns
  src/styles/* → Builder-UI owns (Builder-Data creates initial variables.css/main.css in task 1.5)
  src/main.ts → Builder-Data modifies (register views, init app)
  src/router.ts → READ-ONLY for all (already complete)

Task Graph:
  1.3: owner=NONE (already implemented in router.ts)
  1.4: owner=Builder-Data  depends_on=[]
  1.5: owner=Builder-Data  depends_on=[]
  1.6: owner=Builder-Data  depends_on=[]
  2.1: owner=Builder-Data  depends_on=[1.6]
  2.1.1: owner=Builder-Data  depends_on=[2.1]
  2.2: owner=Builder-Data  depends_on=[2.1]
  2.3: owner=Builder-Data  depends_on=[2.1]
  2.4: owner=Builder-Data  depends_on=[2.1, 1.6]
  2.5: owner=Builder-Data  depends_on=[2.3]
  2.6: owner=Builder-Data  depends_on=[2.3, 2.4]
  2.6.1: owner=Builder-Data  depends_on=[2.6]
  3.1: owner=Builder-Timer  depends_on=[]
  3.2: owner=Builder-Timer  depends_on=[3.1]
  3.3: owner=Builder-Timer  depends_on=[3.2]
  3.4: owner=Builder-Timer  depends_on=[3.2]
  3.5: owner=Builder-Timer  depends_on=[3.2]
  3.6: owner=Builder-Timer  depends_on=[3.2]
  3.7: owner=Builder-Timer  depends_on=[3.4]
  3.8: owner=Builder-Timer  depends_on=[3.1]
  3.9: owner=Builder-Timer  depends_on=[3.8]
  3.10: owner=Builder-Timer  depends_on=[3.8]
  3.11: owner=Builder-Timer  depends_on=[3.9]
  4.1: owner=Builder-Timer  depends_on=[]
  4.2: owner=Builder-Timer  depends_on=[4.1]
  4.3: owner=Builder-Timer  depends_on=[4.1]
  4.4: owner=Builder-Timer  depends_on=[4.1]
  4.5: owner=Builder-Timer  depends_on=[]
  5.1: owner=Builder-UI  depends_on=[2.4, 2.5] (needs session query + default config)
  5.2: owner=Builder-UI  depends_on=[5.1]
  5.3: owner=Builder-UI  depends_on=[5.1]
  5.4: owner=Builder-UI  depends_on=[5.1]
  6.1: owner=Builder-UI  depends_on=[3.4, 4.1]
  6.2: owner=Builder-UI  depends_on=[6.1]
  6.3: owner=Builder-UI  depends_on=[6.1]
  6.4: owner=Builder-UI  depends_on=[6.1]
  6.5: owner=Builder-UI  depends_on=[6.1]
  7.1: owner=Builder-UI  depends_on=[2.4]
  7.2: owner=Builder-UI  depends_on=[7.1]
  7.3: owner=Builder-UI  depends_on=[7.1]
  7.4: owner=Builder-UI  depends_on=[7.1]
  7.5: owner=Builder-UI  depends_on=[7.1, 2.4]
  7.6: owner=Builder-UI  depends_on=[7.1]
  8.1: owner=Builder-UI  depends_on=[2.4]
  8.2: owner=Builder-UI  depends_on=[8.1]
  8.3: owner=Builder-UI  depends_on=[8.2]
  8.4: owner=Builder-UI  depends_on=[8.1]
  8.5: owner=Builder-UI  depends_on=[8.1]
  8.6: owner=Builder-UI  depends_on=[8.4, 8.5]
  9.1: owner=Builder-UI  depends_on=[2.3, 2.5]
  9.2: owner=Builder-UI  depends_on=[9.1]
  9.3: owner=Builder-UI  depends_on=[9.1]
  9.4: owner=Builder-UI  depends_on=[9.1]
  9.5: owner=Builder-UI  depends_on=[9.1]
  9.6: owner=Builder-UI  depends_on=[9.1]
  9.7: owner=Builder-UI  depends_on=[2.6]
  10.1: owner=Builder-UI  depends_on=[]
  10.2: owner=Builder-UI  depends_on=[10.1]
  10.3: owner=Builder-UI  depends_on=[10.2]

Task Assignments:
  Builder-Data (layer: DATA):
    Tasks: 1.4, 1.5, 1.6, 2.1, 2.1.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.6.1
    Files to create: src/state.ts, src/db.ts, src/utils/date.ts, src/styles/variables.css, src/styles/main.css
    Files to modify: src/main.ts (add app init logic)
    Responsibilities: state management pub/sub, IndexedDB schema + CRUD, business date utility, CSS foundation, default exercise seed data, data export/import

  Builder-Timer (layer: TIMER):
    Tasks: 3.1–3.11, 4.1–4.5
    Files to create: src/timer/engine.ts, src/timer/audio.ts, src/timer/snapshot.ts
    Responsibilities: timer state machine (idle/exercising/resting/project-rest/paused/completed), precise countdown via performance.now()+rAF, actual duration tracking per set, auto-sequence through exercises/sets/rests, pause/resume with visibilitychange calibration, skip/end-early, localStorage crash recovery snapshots, Web Audio API beep sounds, vibration feedback, Wake Lock API

  Builder-UI (layer: UI):
    Tasks: 5.1–5.4, 6.1–6.5, 7.1–7.6, 8.1–8.6, 9.1–9.7, 10.1–10.3
    Files to create: src/views/home.ts, src/views/workout.ts, src/views/complete.ts, src/views/history.ts, src/views/config.ts, src/components/timer-display.ts, src/components/progress-bar.ts, src/components/chart-wrapper.ts
    Responsibilities: all 5 page views, reusable components, integrate Chart.js, calendar widget, trend charts, config CRUD UI, PWA manifest + service worker

Dependency Risks:
  - Builder-UI views depend on Builder-Data exports (db.ts, state.ts, date utils) and Builder-Timer exports (engine, audio)
  - Builder-UI can start early with view shells and mock data, then integrate once Data + Timer layers are ready
  - Timer engine needs Session/SessionSet types from Builder-Data — define shared types in src/types.ts owned by Builder-Data

Execution Strategy:
  - All 3 builders start immediately in parallel
  - Builder-Data: creates types.ts first (shared interface definitions), then state.ts, db.ts, utils
  - Builder-Timer: builds engine independently with placeholder types, integrates types.ts when available
  - Builder-UI: builds view shells with inline mock data, replaces with real imports when Data + Timer layers are ready
  - Layer verification triggers per builder as each signals completion
  - Integration verification runs after all three layers pass

Streak Calculation (simplified, on-demand):
  - Function in src/db.ts: calculateStreak(sessions: Session[]): number
  - Queries all sessions sorted by date desc, counts consecutive business days with at least one session
  - Returns { currentStreak, maxStreak } — no separate metadata store needed
  - Called by views that need streak data (home, history)

Review Gates:
  engineering:  true
  security:     false (no auth/payments/uploads)
  performance:  false (no heavy queries/rendering loops — mobile charts are small dataset)
  product:      true (new user-facing flows)
  qa_browser:   false (no dev server in CI — manual QA)

Estimated diff size: L (500+ lines across ~20 files)

=== END PLANNING OUTPUT ===
