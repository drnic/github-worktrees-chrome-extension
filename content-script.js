class GitHubWorktrees {
  constructor() {
    this.observer = null;
    this.processedPRs = new Set();
    console.log('🌳 GitHub Worktrees: Extension initialized');
    this.init();
  }

  init() {
    console.log('🌳 Checking if on PR list page...');
    console.log('🌳 Current URL:', window.location.href);
    
    if (this.isOnPRListPage()) {
      console.log('🌳 On PR list page - starting injection');
      this.injectBranchNames();
      this.setupObserver();
    } else {
      console.log('🌳 Not on PR list page');
    }
  }

  isOnPRListPage() {
    const isOnPulls = window.location.pathname.includes('/pulls');
    // Use alternative selectors since GitHub changed their structure
    const hasPRElements = document.querySelector('.js-issue-row') || 
                         document.querySelector('[data-hovercard-type="pull_request"]') ||
                         document.querySelector('.Box-row');
    
    console.log('🌳 URL includes /pulls:', isOnPulls);
    console.log('🌳 Found PR elements:', !!hasPRElements);
    
    return isOnPulls && hasPRElements;
  }

  async injectBranchNames() {
    // Try multiple selectors for PR rows
    let prRows = document.querySelectorAll('.js-issue-row');
    if (!prRows.length) {
      prRows = document.querySelectorAll('.Box-row');
    }
    
    console.log('🌳 Found PR rows:', prRows.length);
    
    for (const row of prRows) {
      await this.processPRRow(row);
    }
  }

  async processPRRow(row) {
    const prLink = row.querySelector('a[data-hovercard-type="pull_request"]');
    if (!prLink || this.processedPRs.has(prLink.href)) {
      console.log('🌳 Skipping row - no PR link or already processed');
      return;
    }
    
    console.log('🌳 Processing PR:', prLink.href);
    this.processedPRs.add(prLink.href);
    
    const prNumber = this.extractPRNumber(prLink.href);
    if (!prNumber) {
      console.log('🌳 No PR number found');
      return;
    }

    console.log('🌳 Fetching branch name for PR:', prNumber);
    const branchName = await this.getBranchName(prNumber);
    if (!branchName) {
      console.log('🌳 No branch name returned');
      return;
    }

    console.log('🌳 Adding branch name to row:', branchName);
    this.addBranchNameToRow(row, branchName);
  }

  extractPRNumber(href) {
    const match = href.match(/\/pull\/(\d+)/);
    return match ? match[1] : null;
  }

  async getBranchName(prNumber) {
    // First try to extract from DOM by visiting the PR page briefly
    const branchFromDOM = await this.getBranchNameFromDOM(prNumber);
    if (branchFromDOM) {
      console.log('🌳 Got branch name from DOM:', branchFromDOM);
      return branchFromDOM;
    }

    // Fallback to API (may fail for private repos)
    return await this.getBranchNameFromAPI(prNumber);
  }

  async getBranchNameFromDOM(prNumber) {
    try {
      const repoPath = window.location.pathname.split('/').slice(1, 3).join('/');
      const prUrl = `https://github.com/${repoPath}/pull/${prNumber}`;
      
      console.log('🌳 Fetching PR page for DOM extraction:', prUrl);
      
      const response = await fetch(prUrl);
      if (!response.ok) throw new Error('Failed to fetch PR page');
      
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // Try multiple selectors for branch name
      const branchSelectors = [
        '[data-hovercard-type="commit"] .commit-ref',
        '.head-ref .css-truncate-target',
        '[title*="branch"] .css-truncate-target',
        '.branch-name',
        '.head-ref'
      ];
      
      for (const selector of branchSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const branchName = element.textContent.trim();
          if (branchName && !branchName.includes('/')) {
            console.log('🌳 Found branch name with selector', selector, ':', branchName);
            return branchName;
          }
        }
      }
      
      // Try to find branch name in the page title or meta tags
      const title = doc.querySelector('title')?.textContent || '';
      const branchMatch = title.match(/from ([^·]+)/);
      if (branchMatch) {
        return branchMatch[1].trim();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract branch from DOM:', error);
      return null;
    }
  }

  async getBranchNameFromAPI(prNumber) {
    const repoPath = window.location.pathname.split('/').slice(1, 3).join('/');
    
    try {
      console.log('🌳 Trying API fallback for PR:', prNumber);
      const response = await fetch(`https://api.github.com/repos/${repoPath}/pulls/${prNumber}`);
      if (!response.ok) throw new Error('API request failed');
      
      const prData = await response.json();
      return prData.head.ref;
    } catch (error) {
      console.error('Failed to fetch branch name from API:', error);
      return null;
    }
  }

  addBranchNameToRow(row, branchName) {
    // Try different selectors for the metadata line
    let metaLine = row.querySelector('.opened-by');
    if (!metaLine) {
      metaLine = row.querySelector('relative-time')?.parentElement;
    }
    if (!metaLine) {
      metaLine = row.querySelector('[class*="opened"]');
    }
    
    if (!metaLine) {
      console.log('🌳 No metadata line found in row');
      return;
    }

    // Check if we already added branch info
    if (metaLine.querySelector('.github-worktrees-branch')) {
      console.log('🌳 Branch info already exists');
      return;
    }

    const branchContainer = document.createElement('span');
    branchContainer.className = 'github-worktrees-branch';
    
    const separator = document.createElement('span');
    separator.textContent = ' • ';
    separator.className = 'text-gray';
    
    const branchSpan = document.createElement('span');
    branchSpan.textContent = branchName;
    branchSpan.className = 'text-gray-dark';
    
    const copyButton = this.createCopyButton(branchName);
    
    branchContainer.appendChild(separator);
    branchContainer.appendChild(branchSpan);
    branchContainer.appendChild(copyButton);
    
    metaLine.appendChild(branchContainer);
    console.log('🌳 Successfully added branch name to row');
  }

  createCopyButton(branchName) {
    const button = document.createElement('button');
    button.className = 'github-worktrees-copy-btn btn-link';
    button.setAttribute('aria-label', 'Copy branch name');
    button.title = 'Copy branch name';
    
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="octicon">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
      </svg>
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.copyToClipboard(branchName, button);
    });
    
    return button;
  }

  async copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopyConfirmation(button);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  showCopyConfirmation(button) {
    const originalTitle = button.title;
    button.title = 'Copied!';
    button.style.color = '#22863a';
    
    setTimeout(() => {
      button.title = originalTitle;
      button.style.color = '';
    }, 1500);
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