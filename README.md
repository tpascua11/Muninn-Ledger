# Muninn's Ledger


A context-aware writing desk for creative work. Built for people who need to juggle a lot of interconnected material and want an AI that only knows what you decide to show it.



## What it's for

Most AI writing tools give the model everything and hope for the best. Muninn's Ledger is built around two ideas: **everything is a paper**, and **you control the context**.

You write on papers, and papers live in folders. When you're done with something, you grab it and drag it into a folder. When you need the AI to know about something, you drag it into an active folder. That's it. No menus, no tagging, no import flows.

You might be running a DnD campaign with folders for NPCs, factions, session notes, and lore. When you sit down to write a scene, you pull in only the folders that matter : the AI reads those, and nothing else. When you switch to designing a game mechanic, you swap the context out entirely.

Some things people use it for:

- **World-Building** : build out characters, lore, locations, factions, and history as papers. Pull in only what's relevant when you write.
- **DnD / TTRPG DM prep** : organize locations, NPCs, plot threads, and session notes as papers. Let the AI help you improvise or expand lore with full campaign context.
- **Game Design** : keep mechanics docs, reference material, and design notes in folders. Write and iterate with an AI that actually understands your design space.
- **Any creative work** where context management matters.

---

## How it works

### The Desk

The center of the screen is your **desk** : a writing surface where you work on **papers**. Papers stack as tabs. The one on top is the one you're writing on.

### Folders & Sidebars

Papers live in **folders** on the left and right sidebars. Every folder has:

- A **power toggle** : activate or deactivate the whole folder from AI context
- A **checkmark per paper** : include or exclude individual papers from context
- **Drag rails** : reorder folders and papers freely, move them between sidebars

### Context Control

This is the core of the app. Before the AI responds, it builds a context window from only the papers you've marked active. You can see exactly what it will read by clicking the **preview button** in the prompt bar.

### AI Prompt Bar

At the bottom of the desk. Three send modes:

| Button | What it does |
|--------|-------------|
| **Send** (arrow) | Writes fresh to an empty paper |
| **Rewrite** (cycle) | Reads the current paper, replaces it entirely |
| **Chain** (link) | Reads the current paper, appends below a `---` divider |

### Version History

Every AI response and every manual save creates a version. Use the **history dropdown** in the paper header to flip back to any previous state.

---

## Setup

### Requirements

- A [z.ai](https://z.ai) API key (GLM-5)
- Node.js

### Install

```bash
git clone https://github.com/yourname/muninn
cd muninn
npm install
npm run dev
```

### API Key

Enter your z.ai API key in the **gear icon** (Prompt Configuration). It is never saved to disk : it lives only in your session and clears when you close the tab.

---

## Data & Privacy

All your writing is stored **locally** in your browser's IndexedDB via [Dexie.js](https://dexie.org). Nothing is sent to any server except the AI prompt itself (which goes to z.ai). You can export your full workspace as a JSON backup at any time using the export button in the right sidebar.

---

## Project Structure

```
src/
  components/
    SidebarDesk.jsx       # Left/right folder sidebars
    modals/
      TrashModal.jsx
      ArchiveModal.jsx
      ProjectSwitcher.jsx
      PromptSetup.jsx
      ContextPreview.jsx
  lib/
    project.js            # Project/paper data model
    ai.js                 # Context builder + message assembly
    db.js                 # IndexedDB persistence (Dexie)
  App.jsx                 # Main desk, drag & drop, AI calls
  App.css                 # All styles (Tailwind + custom)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save current paper + create version |
| `Enter` | Send prompt |
| `Shift+Enter` | New line in prompt |

---


## License

MIT
