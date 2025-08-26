/**
 * DOM manipulation utilities for GitHub UI integration
 */
export class UIHelpers {
  /**
   * Create a copy-to-clipboard button with GitHub styling
   */
  static createCopyButton(branchName, onCopyCallback = null) {
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
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        await navigator.clipboard.writeText(branchName);
        UIHelpers.showCopyConfirmation(button);
        onCopyCallback?.(branchName);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    });
    
    return button;
  }

  /**
   * Show copy confirmation feedback on button
   */
  static showCopyConfirmation(button) {
    const originalTitle = button.title;
    button.title = 'Copied!';
    button.style.color = '#22863a';
    
    setTimeout(() => {
      button.title = originalTitle;
      button.style.color = '';
    }, 1500);
  }

  /**
   * Find the metadata line in a PR row using multiple selectors
   */
  static findMetadataLine(row) {
    // Try different selectors for the metadata line
    let metaLine = row.querySelector('.opened-by');
    if (!metaLine) {
      metaLine = row.querySelector('relative-time')?.parentElement;
    }
    if (!metaLine) {
      metaLine = row.querySelector('[class*="opened"]');
    }
    
    return metaLine;
  }

  /**
   * Create a branch info container with GitHub styling
   */
  static createBranchContainer(branchName, copyButton) {
    const branchContainer = document.createElement('span');
    branchContainer.className = 'github-worktrees-branch';
    
    const separator = document.createElement('span');
    separator.textContent = ' • ';
    separator.className = 'text-gray';
    
    const branchSpan = document.createElement('span');
    branchSpan.textContent = branchName;
    branchSpan.className = 'text-gray-dark';
    
    branchContainer.appendChild(separator);
    branchContainer.appendChild(branchSpan);
    branchContainer.appendChild(copyButton);
    
    return branchContainer;
  }
}