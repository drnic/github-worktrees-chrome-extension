# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that enhances GitHub PR lists by displaying branch names inline with copy-to-clipboard functionality. The extension injects branch names next to the "opened by..." text on GitHub's `/pulls` pages.

## Architecture

### Core Components
- **content-script.js**: Main functionality that runs on GitHub PR pages
  - Uses DOM observation and mutation observers for dynamic content
  - Implements parallel processing with semaphore for performance
  - Caches branch names in Chrome storage (30-day TTL)
  - Falls back from DOM extraction to GitHub API calls
- **popup.js**: Extension popup for debug toggle functionality
- **popup.html**: Simple popup interface with debug controls
- **styles.css**: Styling to match GitHub's native design
- **manifest.json**: Chrome Extension Manifest V3 configuration

### Key Classes
- `GitHubWorktrees`: Main extension class handling PR processing
- `DebugLogger`: Conditional logging utility based on user preferences
- `Semaphore`: Concurrency control for API requests

## Development

### Testing the Extension
1. Load unpacked extension from Chrome extensions page (`chrome://extensions/`)
2. Enable Developer mode and click "Load unpacked"
3. Navigate to any GitHub repository's `/pulls` page
4. Branch names should appear inline with copy buttons

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
- `content-script.js`: Core extension logic (400+ lines)
- `popup.html/js`: Extension popup interface
- `styles.css`: GitHub-compatible styling
- `icons/`: Extension icons in multiple sizes
- `PRD.md`: Product requirements document
- `manifest.json`: Extension configuration