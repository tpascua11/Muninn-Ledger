# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run frontend only (browser at localhost:1420)
npm run dev

# Run as full Tauri desktop app (requires Rust toolchain)
npm run tauri dev

# Build frontend
npm run build

# Bundle full desktop app
npm run tauri build
```

There are no tests configured in this project.

## Architecture

Muninn's Ledger is a context-aware writing desk that lets users control exactly which "papers" are fed to an AI. It runs as a browser app or a Tauri desktop app. The Tauri Rust backend (`src-tauri/src/lib.rs`) is currently a minimal stub — all meaningful logic lives in the frontend.

### Data Model

The core hierarchy is: **Project → Desk → Folder → Paper**

- A **Project** has `leftDesk`, `rightDesk`, and `mainStack` (open paper tabs on the desk surface), plus `inactiveFolderIds` (a list of folder IDs excluded from AI context) and `aiSettings`.
- Each **Desk** has `folders`, `archive`, and `trash` arrays.
- Each **Folder** has `papers`.
- Each **Paper** has `id`, `subject`, `content`, `inContext` (boolean), and `versions` (array of past content snapshots).

`src/lib/project.js` — generates IDs and constructs the default project shape.

### Persistence

`src/lib/db.js` — Dexie (IndexedDB) wrapper. Projects are stored as serialized JSON blobs (`data: JSON.stringify(project)`). A separate `settings` table stores key/value pairs (used for the API key).

### AI Context & Calls

`src/lib/ai.js` — `buildContextMessages` walks both desks, skips folders in `inactiveFolderIds` and papers where `inContext === false`, and assembles them as `--- Document N: Subject ---` blocks appended to the system prompt. Returns `{ messages, contextPapers }`.

The API call itself is in `App.jsx` (`WritersDesk`). It hits the z.ai OpenAI-compatible endpoint (`https://open.bigmodel.cn/api/paas/v4/chat/completions`) using the model `glm-4-plus`. Three send modes:
- **Send** — writes response to a fresh/empty paper
- **Rewrite** — replaces the current paper's content entirely
- **Chain** — appends new content below a `\n\n---\n\n` divider; `splitOnLastDivider` in `ai.js` extracts everything before the last divider as an assistant seed to preserve existing content

### State & Drag-and-Drop

`App.jsx` is the monolithic state hub (`WritersDesk` component). All project state, drag state, modal state, and AI call state live here. There is no router, no global store — everything is prop-drilled down to `SidebarDesk` and the modals.

Drag-and-drop is entirely custom: mousedown on a drag rail starts a drag, global `mousemove`/`mouseup` handlers (attached via `useEffect`) track position and resolve drop targets. Papers can be dragged between the desk stack and sidebar folders; folders can be reordered within or between sidebars.

### UI

- Tailwind CSS + custom CSS in `App.css` for the desk/wood aesthetic
- `SidebarDesk.jsx` — reusable for both left and right sidebars; receives all handlers as props
- Modals in `src/components/modals/`: `TrashModal`, `ArchiveModal`, `ProjectSwitcher`, `PromptSetup`, `ContextPreview`, `ErrorModal`
- `MailAnimation.jsx` — animated overlay shown while an AI request is in flight
- `DangerHoldButton.jsx` — hold-to-confirm button used for destructive actions

### Key Constraints

- The API key is stored in IndexedDB via `saveSetting` (not just session memory). It is loaded on startup via `loadSetting`.
- Version history is stored directly on each paper object as a `versions` array — there is no separate version table.
- The Vite dev server must run on port 1420 (hardcoded in `vite.config.js` and `tauri.conf.json`).
