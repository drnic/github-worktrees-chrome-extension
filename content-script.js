// Import utilities from src libraries
import { DebugLogger } from './src/utils/debug-logger.js';
import { Semaphore } from './src/utils/semaphore.js';
import { StorageCache } from './src/utils/storage.js';
import { GitHubAPI } from './src/github/api.js';
import { UIHelpers } from './src/dom/ui-helpers.js';

// Initialize debug logger with tree emoji prefix
const debugLogger = new DebugLogger('🌳');

class GitHubWorktrees {
  constructor() {
    this.observer = null;
    this.processedPRs = new Set();
    this.storageCache = new StorageCache();
    this.githubAPI = new GitHubAPI(debugLogger);
    
    debugLogger.log('GitHub Worktrees: Extension initialized');
    this.init();
  }

  init() {
    debugLogger.log('Checking if on PR list page...');
    debugLogger.log('Current URL:', window.location.href);
    
    if (this.isOnPRListPage()) {
      debugLogger.log('On PR list page - starting injection');
      this.injectBranchNames();
      this.setupObserver();
    } else {
      debugLogger.log('Not on PR list page');
    }
  }

  isOnPRListPage() {
    const isOnPulls = window.location.pathname.includes('/pulls');
    // Use alternative selectors since GitHub changed their structure
    const hasPRElements = document.querySelector('.js-issue-row') || 
                         document.querySelector('[data-hovercard-type="pull_request"]') ||
                         document.querySelector('.Box-row');
    
    debugLogger.log('URL includes /pulls:', isOnPulls);
    debugLogger.log('Found PR elements:', !!hasPRElements);
    
    return isOnPulls && hasPRElements;
  }

  async injectBranchNames() {
    // Try multiple selectors for PR rows
    let prRows = document.querySelectorAll('.js-issue-row');
    if (!prRows.length) {
      prRows = document.querySelectorAll('.Box-row');
    }
    
    debugLogger.log('Found PR rows:', prRows.length);
    
    // Process all PRs in parallel with concurrency limit
    await this.processAllPRsInParallel(Array.from(prRows));
  }

  async processAllPRsInParallel(rows, maxConcurrency = 3) {
    const startTime = performance.now();
    debugLogger.log('Starting parallel processing with max concurrency:', maxConcurrency);
    
    const semaphore = new Semaphore(maxConcurrency);
    const promises = rows.map((row, index) => semaphore.acquire().then(async (release) => {
      try {
        const prStart = performance.now();
        await this.processPRRow(row);
        const prTime = performance.now() - prStart;
        debugLogger.log(`PR ${index + 1} processed in ${prTime.toFixed(0)}ms`);
      } finally {
        release();
      }
    }));
    
    await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    debugLogger.log(`Completed parallel processing of ${rows.length} PRs in ${totalTime.toFixed(0)}ms`);
  }

  async processPRRow(row) {
    const prLink = row.querySelector('a[data-hovercard-type="pull_request"]');
    if (!prLink || this.processedPRs.has(prLink.href)) {
      debugLogger.log('Skipping row - no PR link or already processed');
      return;
    }
    
    debugLogger.log('Processing PR:', prLink.href);
    this.processedPRs.add(prLink.href);
    
    const prNumber = this.githubAPI.extractPRNumber(prLink.href);
    if (!prNumber) {
      debugLogger.log('No PR number found');
      return;
    }

    debugLogger.log('Fetching branch name for PR:', prNumber);
    const branchName = await this.getBranchName(prNumber);
    if (!branchName) {
      debugLogger.log('No branch name returned');
      return;
    }

    debugLogger.log('Adding branch name to row:', branchName);
    this.addBranchNameToRow(row, branchName);
  }

  async getBranchName(prNumber) {
    const repoPath = this.githubAPI.getRepoPath();
    const cacheKey = `branch_${repoPath}#${prNumber}`;
    
    // Check browser storage cache first
    const cached = await this.storageCache.get(cacheKey);
    if (cached) {
      debugLogger.log('Using cached branch name for:', cacheKey, '→', cached);
      return cached;
    }

    // First try to extract from DOM by visiting the PR page briefly
    const branchFromDOM = await this.githubAPI.getBranchNameFromDOM(prNumber);
    if (branchFromDOM) {
      debugLogger.log('Got branch name from DOM:', branchFromDOM);
      await this.storageCache.set(cacheKey, branchFromDOM);
      return branchFromDOM;
    }

    // Fallback to API (may fail for private repos)
    const branchFromAPI = await this.githubAPI.getBranchNameFromAPI(prNumber);
    if (branchFromAPI) {
      await this.storageCache.set(cacheKey, branchFromAPI);
    }
    return branchFromAPI;
  }

  addBranchNameToRow(row, branchName) {
    const metaLine = UIHelpers.findMetadataLine(row);
    
    if (!metaLine) {
      debugLogger.log('No metadata line found in row');
      return;
    }

    // Check if we already added branch info
    if (metaLine.querySelector('.github-worktrees-branch')) {
      debugLogger.log('Branch info already exists');
      return;
    }

    const copyButton = UIHelpers.createCopyButton(branchName, (branchName) => {
      debugLogger.log('Copied branch name:', branchName);
    });
    
    const branchContainer = UIHelpers.createBranchContainer(branchName, copyButton);
    
    metaLine.appendChild(branchContainer);
    debugLogger.log('Successfully added branch name to row');
  }

  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('[data-testid="issue-results"] .Box-row') ||
                node.querySelector('[data-testid="issue-results"] .Box-row')) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        setTimeout(() => this.injectBranchNames(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GitHubWorktrees());
} else {
  new GitHubWorktrees();
}