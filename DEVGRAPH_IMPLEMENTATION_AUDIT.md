# DevGraph Implementation Audit (As of 2026-04-08)

## 1. Why You See Inconsistent Behavior
Current behavior is mixed because two flows exist at once:
1. PR list + PR analysis comes from local git history (`list_pull_requests` + `get_analysis`).
2. GitHub URL analysis is a separate one-shot call (`analyze_repository_url`) and is not persisted into PR history/state.

Result:
- Clicking PR items changes graph based on local repo commit-derived items.
- Running GitHub URL analysis shows a result, but does not replace PR history model cleanly.
- This creates the exact confusion you reported.

## 2. What Is Implemented Correctly

### Foundation
- FastAPI app bootstrapped with CORS and global error handlers.
- JWT org-based auth dependency exists.
- Dev token endpoint exists for local workflow.
- Frontend Next.js app scaffolded and integrated with backend API.

### Code Review Core (partial but working)
- `GET /api/v1/review/pull-requests`
- `GET /api/v1/review/analyze/{pr_id}`
- `POST /api/v1/review/analyze-repo` (GitHub URL, non-zip)
- `WS /api/v1/review/ws/analysis/{pr_id}` streaming progress

### Graph + Parsing
- Live parser service scans repo files and builds file/function/import graph.
- Interactive force graph UI exists with search/filter controls.

### Quality/Validation
- Backend tests pass (current suite: 4 tests).
- Frontend lint/build pass.

## 3. What Is Partially Implemented (Needs Rework)

### PR Model and History
- PR list currently derived from local `git log` (not real PR entities).
- GitHub URL analysis result is not persisted as repository session/history item.
- No stable "active repository context" state shared across features.

### Review Analysis Quality
- Security/quality detection is heuristic and shallow (`eval(`, `exec(`, `TODO`, etc.).
- No diff-based PR analyzer yet.
- No architecture/risk engine beyond simple score rules.

### Frontend Information Architecture
- Navigation tabs are present but only Code Review has substantial behavior.
- Environment and Commit Story tabs are mostly placeholders.
- Dashboard structure improved but still not at full GitVizz-like product depth.

## 4. What Is Not Implemented Yet (Major Gaps vs Plan)

### From `DEVGRAPH_BUILDING_PROCESS.md`
- Environment Health MVP (scanner, analyzer, auto-fix dry run): NOT implemented.
- Commit Story MVP (timeline, narrative generation): NOT implemented.
- Neo4j graph layer and graph write/read APIs: NOT implemented.
- CI/CD GitHub Actions workflows: NOT implemented.
- Docker compose full stack (Neo4j/Redis/etc.): NOT implemented.

### From `DEVGRAPH_BUILDING_PROCESS2.md`
- Real graph ingestion/storage model: NOT implemented.
- `/api/v1/patterns/detect` and `/api/v1/autofix/suggest`: NOT implemented.
- Realtime partial results by category: NOT implemented.
- Multi-feature unified dashboard with real backend modules: NOT implemented.

## 5. Root Causes of Current Issues
1. Dual data sources without unified session model.
2. No repository analysis persistence (in-memory one-shot only).
3. PR column semantics do not match URL-analysis semantics.
4. Placeholder tabs shown before backend modules exist.

## 6. Exact Step To Resume From
Resume from: **Phase 1.5 (Normalization Step)** before moving deeper.

Reason:
- Foundation is done.
- Current code-review flow works technically, but state model is inconsistent.
- Must normalize data model and UX flow first, otherwise next features will compound confusion.

## 7. Required Next 6 Steps (Strict Execution Order)

### Step 1: Unify Repository Session Model (Must Do First)
- Create `analysis_sessions` model (in-memory first, DB-ready shape).
- `analyze-repo` creates a session id and stores result metadata.
- PR list panel must show session-scoped items, not local git fallback unless explicitly selected.
- Acceptance: clicking left panel always reflects the selected analyzed repo context.

### Step 2: Split Data Sources in UI Clearly
- Add explicit mode toggle: `Local Workspace` vs `GitHub Repository`.
- Hide unrelated PR/local entries when in GitHub mode.
- Acceptance: no cross-mixing of local and remote analyses.

### Step 3: Implement Environment Feature (Real)
- Backend: `/api/v1/environment/scan`, `/api/v1/environment/health`.
- Frontend: health cards + issue list + fix recommendations.
- Acceptance: Environment tab has live backend data, no placeholder text.

### Step 4: Implement Commit Story Feature (Real)
- Backend: `/api/v1/commit-story/generate` from git history.
- Frontend: timeline cards + narrative panel.
- Acceptance: Commit Story tab returns and displays real output.

### Step 5: Improve Code Review Analyzer Depth
- Add structured detectors by language and confidence scoring.
- Add issue categories and better graph linking.
- Acceptance: review output includes categorized findings with meaningful context.

### Step 6: Hardening + Delivery Infrastructure
- Add GitHub Actions workflows (backend/frontend lint+test+build).
- Add docker-compose baseline with backend + frontend + Neo4j.
- Acceptance: one-command local up and CI green.

## 8. Recommended Copilot Plan Mode Prompt
Use this exact prompt in plan mode:

"Follow DEVGRAPH_IMPLEMENTATION_AUDIT.md and execute Step 1 through Step 6 in order. Do not build new placeholder UI. First normalize repository session model and source-mode separation so PR column and graph context are consistent. After each step: run tests/build, report pass/fail, and stop for approval."

## 9. Immediate Fixes You Requested (Truth Status)
- Mock fallback in frontend API: Removed.
- Generic hidden errors: Replaced with surfaced API error messages.
- Remaining confusion is architectural (session/data-source mixing), not hidden mock fallback now.

## 10. Current Command Baseline
Backend:
- `c:/Users/Manu.S/Desktop/devtools/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000`

Frontend:
- `cd frontend`
- `npm run dev`

If dev server state is stale:
- stop running terminals
- delete `frontend/.next`
- rerun `npm run dev`

---
Status: Audit complete. Recommended resume point is Phase 1.5 normalization (Step 1 above).