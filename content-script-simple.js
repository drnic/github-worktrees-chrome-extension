// Simple test version - just adds "TEST BRANCH" text to verify extension works
console.log('🌳 Simple test version loaded');

function addTestText() {
  const prRows = document.querySelectorAll('a[data-hovercard-type="pull_request"]');
  console.log('🌳 Found PR links:', prRows.length);
  
  prRows.forEach((link, index) => {
    const parent = link.closest('.Box-row') || link.closest('[class*="issue"]');
    if (parent && !parent.querySelector('.test-branch')) {
      const testSpan = document.createElement('span');
      testSpan.className = 'test-branch';
      testSpan.textContent = ` • TEST-BRANCH-${index + 1}`;
      testSpan.style.color = '#666';
      
      const metaLine = parent.querySelector('[class*="opened"]') || parent.querySelector('relative-time');
      if (metaLine) {
        metaLine.appendChild(testSpan);
        console.log('🌳 Added test text to PR', index + 1);
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