document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const debugToggle = document.getElementById('debugToggle');
  
  // Load current debug setting
  const { debugLogging = false } = await chrome.storage.sync.get('debugLogging');
  if (debugLogging) {
    debugToggle.classList.add('active');
  }
  
  // Handle debug toggle click
  debugToggle.addEventListener('click', async () => {
    const isActive = debugToggle.classList.contains('active');
    const newState = !isActive;
    
    debugToggle.classList.toggle('active', newState);
    await chrome.storage.sync.set({ debugLogging: newState });
    
    // Notify content script of the change
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.url.includes('github.com')) {
        chrome.tabs.sendMessage(tab.id, { type: 'DEBUG_SETTING_CHANGED', enabled: newState });
      }
    } catch (error) {
      // Ignore if content script isn't loaded
    }
  });
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url && tab.url.includes('github.com') && tab.url.includes('/pulls')) {
      statusElement.textContent = 'Active on GitHub PR page';
      statusElement.classList.add('active');
    } else if (tab.url && tab.url.includes('github.com')) {
      statusElement.textContent = 'On GitHub - navigate to PR list to activate';
      statusElement.style.background = '#fff8c5';
      statusElement.style.borderColor = '#d1a922';
      statusElement.style.color = '#8d6e00';
    } else {
      statusElement.textContent = 'Navigate to GitHub PR page to use';
    }
  } catch (error) {
    console.error('Error checking tab status:', error);
  }
});