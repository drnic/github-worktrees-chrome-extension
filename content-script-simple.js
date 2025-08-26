// Import utilities from src libraries  
import { DebugLogger } from './src/utils/debug-logger.js';
import { UIHelpers } from './src/dom/ui-helpers.js';

const debugLogger = new DebugLogger('🌳');

// Simple test version - just adds "TEST BRANCH" text to verify extension works
debugLogger.log('Simple test version loaded');

function addTestText() {
  const prRows = document.querySelectorAll('a[data-hovercard-type="pull_request"]');
  debugLogger.log('Found PR links:', prRows.length);
  
  prRows.forEach((link, index) => {
    const parent = link.closest('.Box-row') || link.closest('[class*="issue"]');
    if (parent && !parent.querySelector('.test-branch')) {
      const testBranchName = `TEST-BRANCH-${index + 1}`;
      
      const testSpan = document.createElement('span');
      testSpan.className = 'test-branch';
      testSpan.textContent = ` • ${testBranchName}`;
      testSpan.style.color = '#666';
      
      const metaLine = UIHelpers.findMetadataLine(parent);
      if (metaLine) {
        metaLine.appendChild(testSpan);
        debugLogger.log('Added test text to PR', index + 1);
      }
    }
  });
}

// Run immediately and on DOM changes
addTestText();
setTimeout(addTestText, 2000);

new MutationObserver(() => {
  setTimeout(addTestText, 500);
}).observe(document.body, { childList: true, subtree: true });