// Background service worker for SalesNav Lead Saver

chrome.runtime.onInstalled.addListener(() => {
  console.log('SalesNav Lead Saver extension installed');
});

// Handle messages between popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Forward status updates from content script to popup
  if (request.action === 'updateStatus') {
    // Broadcast to all extension pages (popup)
    chrome.runtime.sendMessage(request).catch(() => {
      // Popup might be closed, ignore error
    });
  }
  return true;
});

// Optional: Add any background logic here if needed
console.log('SalesNav Lead Saver background service worker loaded');

