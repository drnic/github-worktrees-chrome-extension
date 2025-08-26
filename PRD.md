# GitHub Worktrees -- Product Requirements Document (PRD)

## 1. Overview

**Project Name:** GitHub Worktrees\
**Type:** Chrome Extension\
**Goal:** Enhance the GitHub.com Pull Requests (PR) list by injecting
the **branch name** into the PR metadata line (next to the "opened by
..." text), with a convenient "copy to clipboard" icon.

This extension improves developer efficiency by surfacing branch
information directly in the PR list and providing quick copy access for
Git commands or other workflows.

------------------------------------------------------------------------

## 2. Problem Statement

-   On GitHub's PR list view (`/pulls`), branch names are not shown by
    default.\
-   Developers often need the branch name to:
    -   fetch the branch locally (`git fetch origin branch-name`)\
    -   check out the branch (`git checkout branch-name`)\
    -   reference it in tickets, discussions, or chat\
-   Without branch names visible, extra clicks are required. Without a
    copy button, extra text selection steps are needed. Both slow down
    triage and review.

------------------------------------------------------------------------

## 3. Objectives

### **Primary Objective (Phase 1)**

-   **Branch Name Visibility**\
    Display the **branch name** inline on each PR card in the PR list
    view.
    -   Placement: on the same line as the "opened by ..." text,
        separated by a `•` dot.\

    -   Example:

            #123 Add payment API integration
            opened by alice • feature/payments-api
-   **Copy-to-Clipboard Button**\
    A small clipboard icon immediately following the branch name.
    -   Clicking the icon copies the full branch name to the user's
        clipboard.\

    -   Tooltip on hover: `Copy branch name`.\

    -   Example (UI):

            opened by alice • feature/payments-api 📋

------------------------------------------------------------------------

## 4. Functional Requirements

1.  **Content Script Injection**
    -   Runs on GitHub PR list pages (`https://github.com/*/*/pulls*`).
    -   Identifies each PR card row (`.js-issue-row`).
    -   Extracts branch name via GitHub's DOM or API (if not in the DOM,
        call GitHub API `/repos/:owner/:repo/pulls/:number`).
2.  **DOM Update**
    -   Append branch name text + `•` separator to `.opened-by` section.
    -   Insert clipboard icon (`<svg>` inline or icon font).
3.  **Clipboard Functionality**
    -   On icon click:
        -   Copy branch name string.
        -   Show confirmation tooltip or flash message (e.g.,
            `Copied!`).
4.  **Performance**
    -   Must run efficiently without slowing GitHub UI.
    -   Handle pagination and dynamic PR list loading (infinite scroll).

------------------------------------------------------------------------

## 5. Non-Functional Requirements

-   **Browser Support:** Chrome latest, Chromium-based browsers (Edge,
    Brave).\
-   **Code Quality:** Modern ES modules, manifest v3.\
-   **Maintainability:** Modular JS, allow adding more GitHub UI
    enhancements later.\
-   **UX Consistency:** Match GitHub's visual style (spacing, font size,
    icon style).

------------------------------------------------------------------------

## 6. Future Phases (Beyond Phase 1)

-   Phase 2: Display both **source** and **target** branches inline.\
-   Phase 3: Add filters/sorting by branch name.\
-   Phase 4: Integration with `git fetch`/`checkout` command snippet
    generator.

------------------------------------------------------------------------

## 7. Success Criteria

-   **MVP:** When visiting a GitHub PR list, each PR shows its branch
    name and has a working copy-to-clipboard button.\
-   **Adoption:** Developers can avoid clicking into PRs just to find
    branch names.\
-   **Feedback:** Positive validation from 3--5 daily GitHub users that
    this reduces workflow friction.
