# TinyWrite – Agents Instructions

## Commands

```bash
# Web dev (vite + y-websocket collab server)
npm run dev

# Desktop app dev
npm run tauri dev

# Build
npm run build          # web
npm run tauri build    # desktop app

# Lint (Biome)
npm run lint

# Tests (unit + browser)
npm test

# Run a single unit test file
npx vitest test/unit/service/FileService.test.ts

# Run a single browser (Playwright) test file
npx playwright test test/browser/editor.test.ts

# Enable AI mock during dev
VITE_MOCK_AI=true npm run dev
```

## Architecture

TinyWrite is a dual-target app: a **web SPA** and a **Tauri desktop app** sharing the same SolidJS frontend.

### Frontend (`src/`)

- **Framework**: SolidJS with `@solidjs/router`
- **Entry**: `src/index.tsx` → `Init` component → `AppService.fetchData()` → `Main`
- **Routing**: `/editor/:id`, `/canvas/:id`, `/code/:id`, `/assistant/:id`
- **State**: Single SolidJS `createStore` wrapped in `Ctrl` (returned by `createCtrl()` in `src/services/index.ts`). Exposed to the component tree via `StateContext`; consumed with `useState()` from `src/state.ts`.
- **Services**: All business logic lives in class-based services (`src/services/`). They are instantiated once inside `createCtrl()` with explicit constructor injection. No global singletons.
- **Editors**: ProseMirror for rich text (`src/prosemirror/`), CodeMirror for code (`src/codemirror/`).
- **Collaboration**: Yjs CRDT, synced over WebSocket via `y-websocket`. Documents stored as `Uint8Array` in IndexedDB.
- **Persistence**: `src/db.ts` — static `DB` class backed by IndexedDB (via `idb`). Soft-deletes use a `deleted: boolean` flag; items are purged after 14 days by `DB.cleanup()`.
- **Types**: All shared TypeScript types are in `src/types.ts`. Schema validation uses `valibot`.

### Tauri layer

- **Rust backend**: `src-tauri/src/` — modules: `copilot`, `editor`, `fs`, `lsp`, `menu`, `logger`
- **IPC bridge**: `src/remote/` — thin TypeScript wrappers around `invoke()` calls. All Tauri-specific calls go through here; never call `invoke()` directly from components or services.
- **Platform guard**: Use `isTauri()` from `src/env.ts` to branch between web and desktop behaviour.

## Key Conventions

### Code style (enforced by Biome)
- Single quotes, no semicolons, 2-space indent, 100-char line width.
- `biome ci` (`npm run lint`) covers `src/` and `test/`.

### Path alias
- `@/` resolves to `src/`. Use it for all imports within `src/`.

### Adding a new service
1. Create `src/services/MyService.ts` as a class.
2. Instantiate it in `createCtrl()` in `src/services/index.ts`, inject dependencies via constructor.
3. Export it from the returned `Ctrl` object.

### Testing
- **Unit tests** (`test/unit/`): Vitest + happy-dom. Use `mock<ServiceType>()` from `vitest-mock-extended` to mock service dependencies. Use `createIpcMock()` from `test/unit/testutil/util.tsx` to stub Tauri IPC commands. `renderMain()` renders the full SolidJS app in tests.
- **Browser tests** (`test/browser/`): Playwright against a real Vite dev server (`localhost:3000`) + y-websocket on port 1234.
- `test/unit/setup.ts` stubs globals (`__COMMIT_HASH__`, `__VERSION__`, `matchMedia`) needed by the app.

### Soft deletes
Only **virtual files** (files without a filesystem path), canvases, and projects are soft-deleted: set `deleted: true` on the object; `DB.cleanup()` removes items older than 14 days. **Local files** (Tauri files with a `path`) are not soft-deleted — they are simply closed (removed from the tree/state). Deleting a file from the filesystem is not supported.

### Styling
- Uses `solid-styled-components` for component-scoped CSS.
- All design tokens are CSS custom properties injected by `src/components/Variables.tsx`: `--foreground`, `--background`, `--background-{5..95}`, `--primary-background`, `--primary-background-{10..90}`, `--font-family`, `--font-size`, `--border-radius`, `--z-index-*`, etc.
- Always use these CSS vars in styled components; never hardcode colors or sizes.

### Item types
All items in the sidebar / tree share a discriminated `type` field. The six item types are:

- **`file`** — A markdown or code (`code: true`) document, rendered with ProseMirror or CodeMirror respectively. Stored in IndexedDB with a Yjs `ydoc`. If the `path` property is set the file is a **local file** (Tauri only): it is also persisted to DB but may not have all properties populated. The optional `newFile` property holds a filename suggestion — set when opening a new path via `tw path/to/new-file.md` and offered in the Save As dialog.
- **`canvas`** — An infinite-canvas board containing canvas elements (editor, code, link, image, video). Canvas editor/code elements embed their own `file` items with independent Yjs docs.
- **`thread`** — An AI chat thread. Holds a list of `Message` objects and an optional path context mapping.
- **`project`** — Groups other item types together. In Tauri/FS mode it maps to a filesystem directory via `worktreePath`. A project cannot contain sub-projects.
- **`filename`** — An unopened file on the filesystem (Tauri only). When the user opens it, it is converted to a `file` item; the ID is derived from the file path so it remains the same after the conversion.
- **`directory`** — A filesystem directory (Tauri only). Like `filename` but cannot be opened — it can only be expanded or collapsed in the sidebar.

### Type guards
`src/state.ts` exports discriminated-union helpers — use them instead of checking `.type` directly:
- `isFile(it)`, `isCanvas(it)`, `isProject(it)`, `isDirectory(it)`, `isFilename(it)`
- `isEditorElement(el)`, `isCodeElement(el)`, `isLinkElement(el)`, `isImageElement(el)`, `isVideoElement(el)`
- `isLocalFile(it)` — file with a filesystem path (Tauri only)
- `isDirty(file)` — unsaved local file
- `isDeletable(it)`, `isProjectItem(it)`

### Canvas
The canvas page (`/canvas/:id`) is an infinite-canvas board. Elements are typed via `ElementType` enum:
- `ElementType.Editor` / `ElementType.Code` — embedded ProseMirror / CodeMirror editors with their own Yjs docs
- `ElementType.Link` — connector arrow between two elements
- `ElementType.Image` / `ElementType.Video` — media embeds

Canvas elements carry position (`x`, `y`, `width`, `height`) and are managed by `CanvasService`. Collaboration on canvases goes through `CanvasCollabService`.

### Tree / sidebar data structure
`src/tree.ts` provides a generic `Tree<T>` class that stores items in a doubly-linked-list-by-sibling order (`parentId` + `leftId`). `TreeService` owns the singleton instance populated with files, canvases, and projects.

### Test helpers
- `createState(partial?)` and `createConfig(partial?)` in `src/state.ts` — build default-filled state objects for unit tests.
- `renderMain(state)` — renders the full app; returns testing-library queries **and** `ctrl` (the `Ctrl` object).
- In dev builds, `window.__STORE__` exposes the reactive store for debugging in the browser console.

### AI / Copilot integration
- `src/services/CopilotService.ts` handles GitHub Copilot auth and completions.
- `src/services/AiService.ts` + `src/services/ThreadService.ts` handle chat threads.
- Prompts are Markdown templates in `src/prompts/`.
- Set `VITE_MOCK_AI=true` during development to bypass real API calls.
