# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that enhances GitHub PR lists by displaying branch names inline with copy-to-clipboard functionality. The extension injects branch names next to the "opened by..." text on GitHub's `/pulls` pages.

## Architecture

### Core Components
- **content-script.js**: Main functionality that runs on GitHub PR pages (ES modules)
  - Orchestrates PR processing using modular utilities
  - Uses DOM observation and mutation observers for dynamic content
  - Implements parallel processing with semaphore for performance
- **popup.js**: Extension popup for debug toggle functionality
- **popup.html**: Simple popup interface with debug controls
- **styles.css**: Styling to match GitHub's native design
- **manifest.json**: Chrome Extension Manifest V3 configuration with ES modules support

### Modular Library Structure (`src/`)
- **`src/utils/`**: Reusable utility classes
  - `debug-logger.js`: Conditional logging with Chrome storage integration
  - `semaphore.js`: Concurrency control for async operations
  - `storage.js`: Chrome storage utilities with TTL caching
- **`src/github/`**: GitHub-specific functionality
  - `api.js`: GitHub API interactions and DOM extraction
- **`src/dom/`**: DOM manipulation utilities
  - `ui-helpers.js`: UI creation and GitHub styling integration

### Key Classes
- `GitHubWorktrees`: Main extension class orchestrating PR processing
- `DebugLogger`: Conditional logging utility with persistent settings
- `Semaphore`: Concurrency control for API requests
- `StorageCache`: Chrome storage wrapper with TTL support
- `GitHubAPI`: GitHub-specific API and DOM extraction utilities
- `UIHelpers`: Static methods for GitHub UI integration

## Development

### Available Commands
- `npm run dev`: Build and watch for changes (development)
- `npm run build`: Build for production (creates `dist/` folder)
- `npm run build:zip`: Build and create extension zip file for publishing
- `npm run clean`: Remove build artifacts
- `npm run lint`: Run ESLint on source files
- `npm run preview`: Preview built extension

### Setup
1. Install dependencies: `npm install`
2. Build the extension: `npm run build`

### Testing the Extension
1. Run `npm run build` to create the `dist/` folder
2. Load unpacked extension from Chrome extensions page (`chrome://extensions/`)
3. Enable Developer mode and click "Load unpacked"
4. Select the `dist/` folder (not the root directory)
5. Navigate to any GitHub repository's `/pulls` page
6. Branch names should appear inline with copy buttons

### Development Workflow
1. Make changes to source files in `src/` or root `.js` files
2. Run `npm run dev` for automatic rebuilding on changes
3. Reload extension in Chrome (`chrome://extensions/` → reload button)
4. Test changes on GitHub PR pages

### Debugging
- Click extension icon on GitHub pages to toggle debug logging
- Debug messages appear in console with 🌳 prefix when enabled
- Debug setting persists across sessions via Chrome storage

### Performance Considerations
- Extension processes PRs in parallel with max 3 concurrent requests
- Uses 30-day cache for branch name lookups (immutable data)
- Implements DOM observation for dynamic GitHub content loading
- Graceful fallback from DOM extraction to GitHub API

### GitHub DOM Integration
- Targets `.js-issue-row` and `.Box-row` selectors for PR rows
- Injects branch info into `.opened-by` metadata sections
- Uses GitHub's native Octicon SVG for copy button
- Matches GitHub's color scheme and spacing conventions

## File Structure
- `content-script.js`: Main orchestration logic (now ~200 lines, refactored)
- `src/`: Modular library structure
  - `utils/`: Generic utilities (debug-logger, semaphore, storage)
  - `github/`: GitHub-specific functionality (API utilities)
  - `dom/`: DOM manipulation helpers (UI creation)
- `popup.html/js`: Extension popup interface
- `styles.css`: GitHub-compatible styling
- `icons/`: Extension icons in multiple sizes
- `PRD.md`: Product requirements document
- `manifest.json`: Extension configuration with ES modules support