document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  
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