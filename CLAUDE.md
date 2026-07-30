# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses Vite as the build tool and Vitest for testing.

```bash
npm run dev        # Start Vite dev server on port 8080
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
npm test           # Run all tests with Vitest
npm run test:watch # Run tests in watch mode
npm run lint       # Lint source code with ESLint
npm run format     # Format code with Prettier
```

Open the page with a syntactically valid UID parameter:

```text
http://localhost:8080/?uid=ABCDEFGH
```

### Manual verification

Use the Vite-dev-server page to smoke-test the affected flows:

- Open without `uid` and with an invalid UID; controls should stay disabled and a blocking dialog should explain the problem.
- Open with `?uid=ABCDEFGH`; inspect browser Network/Console for the status and config requests and verify the three status chips and configuration checkboxes update.
- Change one or more checkboxes and test the save success and error paths; saving must disable every interactive control while the request is pending.
- Exercise the help, copy-link, diagnostics, and failed-status-chip dialogs. Also check the changed UI in dark mode and narrow or short viewports.

## Architecture

- `index.html` is the sole HTML entry point. It provides the three resource controls, action buttons, and IDs used by the JavaScript modules. It loads MDUI CSS, fonts, and custom styles via a single Vite entry module.
- `src/main.js` is the Vite entry module. It imports MDUI, fonts, CSS, and bootstraps the application by resolving the UID route and calling `init()`.
- `src/lib/uid-routing.js` is an ES module that provides `resolveUidRoute(href)` for UID extraction and URL canonicalization.
- `src/modules/config.js` defines `APP_CONFIG`, `API_ENDPOINTS`, `statusStyles`, and language constants (`LANG_CN`, `LANG_JP`).
- `src/modules/network.js` provides `fetchWithTimeout` and `fetchWithRetry` with configurable timeout and retry policy.
- `src/modules/error-store.js` manages the `errorLogs` object and `storeError()` / `resetErrors()` functions.
- `src/modules/ui-state.js` provides `element()` (getElementById alias), `INTERACTIVE_IDS`, and `toggleInteractiveState()`.
- `src/modules/status-display.js` provides `setStatus()` for updating chip text, icon CSS, and ARIA announcements.
- `src/modules/dialog.js` provides `showTextDialog()`, `showHelp()`, and `showErrorLog()` for MDUI dialog creation.
- `src/modules/clipboard.js` provides `copyText()` with Clipboard API and `execCommand` fallback.
- `src/modules/diagnostics.js` provides `getDiagnosticsLines()` for the diagnostics dialog.
- `src/modules/save-handler.js` provides `setupSaveButton()` and `showSaveErrorDialog()` for the save flow.
- `src/modules/copy-link.js` provides `setupCopyButton()` for the copy-link flow.
- `src/modules/init.js` provides `init(uidRoute)`, the main orchestration function that wires up event handlers and runs initialization.
- `src/css/control-panel.css` defines the base Material 3-inspired glass-panel design, theme tokens, status and action icon masks, dark theme, accessibility utilities, and primary layout. `src/css/control-panel-responsive.css` layers compact/mobile and short-viewport overrides.
- `src/icons/` contains 8 SVG assets used by CSS mask images for status and action icons.
- `public/assets/images/background.png` is the page background, served as a static file.
- MDUI v2.1.5 and @fontsource packages are imported from `node_modules` by Vite — no vendor sync script is needed. Vite bundles CSS and font files during build.

## Backend Contract and Page Flow

The production page is documented as `https://dash.bluearchive.cafe/?uid=<uid>`; generated share links use the `https://dash.bluearchive.cafe/<UID>` path. The frontend calls the production API directly; this repository contains no backend or proxy. Network access and permissive CORS are required.

1. On startup, `main.js` resolves the UID route via `resolveUidRoute(location.href)`. It handles production redirects and history normalization, then calls `init(uidRoute)`.
2. `init()` validates UID against `^[A-Z]{8}$`; missing or invalid values disable interactions and show a blocking dialog.
3. For a valid UID, initialization requests these endpoints in parallel:
   - `GET https://api.bluearchive.cafe/status/list`
   - `GET https://api.bluearchive.cafe/config/get?uid=<uid>`
4. The status response is expected to expose `text`, `voice`, and `media`, each with `official.version` and `localized.version`. Matching versions render as `可用`; mismatches render as `待维护`.
5. A successful config response supplies `{ text, voice, media }`, where each value is `cn` or `jp`, and sets the corresponding MDUI checkbox. A failed config lookup is intentionally non-blocking for new users.
6. Saving sends `GET https://api.bluearchive.cafe/config/set?uid=<uid>&text=<cn|jp>&voice=<cn|jp>&media=<cn|jp>`. While it is pending, all interactive controls are disabled.
7. Requests use the shared timeout-and-retry helpers (10-second timeout, two retries). Status-request failures are recorded so failed status chips can expose diagnostic details.
8. Copy-link behavior builds `https://dash.bluearchive.cafe/<UID>`; diagnostics read the in-memory resource-version and error state.

## Change Constraints

- Maintain the ID and class contracts between `index.html`, the JS modules, and both stylesheets. DOM elements are accessed by ID at load time, so renamed or removed elements require coordinated changes.
- Continue using MDUI custom elements and the current automatic light/dark theme setup. MDUI is an npm dependency bundled by Vite.
- Preserve the existing accessibility behavior when changing UI: checkbox labels/descriptions, the live status announcer, dialog semantics, error-chip interaction, and keyboard accessibility.
- The project uses ES modules (`import`/`export`). All source files are under `src/` with Vite as the bundler.
- Static files served as-is go in `public/`. CSS `url()` references in `src/css/` are resolved relative to that CSS file by Vite during build.
