/**
 * GitHub API utilities for Chrome extensions
 */
export class GitHubAPI {
  constructor(debugLogger = null) {
    this.debugLogger = debugLogger;
  }

  /**
   * Extract repository path from current URL
   */
  getRepoPath() {
    return window.location.pathname.split('/').slice(1, 3).join('/');
  }

  /**
   * Extract PR number from GitHub PR URL
   */
  extractPRNumber(href) {
    const match = href.match(/\/pull\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Get branch name from GitHub PR page DOM
   */
  async getBranchNameFromDOM(prNumber) {
    try {
      const repoPath = this.getRepoPath();
      const prUrl = `https://github.com/${repoPath}/pull/${prNumber}`;
      
      this.debugLogger?.log('Fetching PR page for DOM extraction:', prUrl);
      
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
            this.debugLogger?.log('Found branch name with selector', selector, ':', branchName);
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
      this.debugLogger?.error('Failed to extract branch from DOM:', error);
      return null;
    }
  }

  /**
   * Get branch name from GitHub API
   */
  async getBranchNameFromAPI(prNumber) {
    const repoPath = this.getRepoPath();
    
    try {
      this.debugLogger?.log('Trying API fallback for PR:', prNumber);
      const response = await fetch(`https://api.github.com/repos/${repoPath}/pulls/${prNumber}`);
      if (!response.ok) throw new Error('API request failed');
      
      const prData = await response.json();
      return prData.head.ref;
    } catch (error) {
      this.debugLogger?.error('Failed to fetch branch name from API:', error);
      return null;
    }
  }
}