# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

桐乡研学 (Tongxiang Study Tour) — An educational platform for managing rural study tours with student record-keeping, teacher management, and intangible cultural heritage content.

## Development Commands

```bash
npm install                        # Install Vite (only dev dependency)
npm run dev                        # Dev server at http://localhost:5173/txyx/
npm run build                      # Build to dist/
npm run preview                    # Preview production build

bash server/start.sh start         # Start API server on port 3001
bash server/start.sh stop|restart|status|log
```

Dev requires two terminals: one for the API server, one for Vite.

## Architecture

**Three separate single-page apps** built with vanilla JS + Vite, no framework:
- `index.html` / `src/main.js` — Main marketing site (routes, courses, heritage, tasks)
- `journal.html` / `src/journal.js` — Student study journal (group-based, 3-phase)
- `admin.html` / `admin/admin.js` — Teacher dashboard (group management, content editing, records)

**Backend:** Pure Node.js HTTP server (`server/index.js`, no Express) on port 3001. Data stored as JSON files in `server/data/`. In production, nginx proxies `/txyx/api/*` → `localhost:3001/`.

**Vite base path:** `/txyx/` — all asset URLs must go through the `asset()` utility in `src/utils/asset.js` to prepend the base path correctly.

## Key Data Flow

**Student flow:** URL param `?code=A1` identifies the group → first visit sets a 4-digit password → fill 3 phases (before/during/after) with auto-save every 1.2s → data persists on server + localStorage fallback.

**Admin flow:** Password `tongxiang2026` → manage groups via API → edit static content (routes/courses/inheritors) stored in `src/data/*.json` overridden by localStorage → compare study records across groups.

**Static content** (routes, courses, inheritors, tasks) lives in `src/data/*.json`. Admin edits are cached in localStorage with `tongxiang_` prefix and can be exported as JSON.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/groups` | List all groups |
| GET | `/groups/{code}/status` | Check group existence & password state |
| PUT | `/groups/{code}` | Create empty group (admin) |
| DELETE | `/groups/{code}` | Delete group (admin, only if no data) |
| POST | `/groups/{code}/init` | Set password on first student login |
| GET | `/groups/{code}?pwd=xxxx` | Load group data (student) |
| POST | `/groups/{code}` | Save group data (student) |
| GET | `/groups/{code}/full` | Get full data including password (admin) |

## localStorage Keys

All keys use `tongxiang_` prefix: `tongxiang_routes`, `tongxiang_courses`, `tongxiang_inheritors`, `tongxiang_g_{code}` (group session), `txyx_pwd` (session password).
