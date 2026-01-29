document.addEventListener('DOMContentLoaded', function() {
  const listNameInput = document.getElementById('listName');
  const saveBtn = document.getElementById('saveBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  // Load previously used list name
  chrome.storage.local.get(['lastListName'], function(result) {
    if (result.lastListName) {
      listNameInput.value = result.lastListName;
    }
  });

  // Check if automation is running
  checkAutomationStatus();

  saveBtn.addEventListener('click', async function() {
    const listName = listNameInput.value.trim();
    
    if (!listName) {
      updateStatus('Please enter a list name', 'error');
      return;
    }

    // Save the list name for future use
    chrome.storage.local.set({ lastListName: listName });

    // Disable save button, enable stop button
    saveBtn.disabled = true;
    saveBtn.textContent = 'Processing...';
    stopBtn.style.display = 'block';
    updateStatus('Starting automation...', 'info');

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('linkedin.com/sales')) {
        updateStatus('Please open a LinkedIn Sales Navigator page', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Leads';
        stopBtn.style.display = 'none';
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(
        tab.id,
        { action: 'saveLeads', listName: listName },
        function(response) {
          if (chrome.runtime.lastError) {
            updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Leads';
            stopBtn.style.display = 'none';
          }
        }
      );
    } catch (error) {
      updateStatus('Error: ' + error.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Leads';
      stopBtn.style.display = 'none';
    }
  });

  stopBtn.addEventListener('click', async function() {
    updateStatus('Stopping automation...', 'info');
    stopBtn.disabled = true;
    
    // Clear automation state
    chrome.storage.local.remove(['automationState'], function() {
      updateStatus('Automation stopped', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Leads';
      stopBtn.style.display = 'none';
      stopBtn.disabled = false;
    });
    
    // Send stop message to content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'stopAutomation' });
    } catch (error) {
      // Ignore errors if tab is not available
    }
  });

  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
      updateStatus(request.message, request.type || 'info');
      
      if (request.type === 'success' || request.type === 'error') {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Leads';
        stopBtn.style.display = 'none';
        // Clear automation state on completion
        chrome.storage.local.remove(['automationState']);
      }
    }
  });

  function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
  }

  function checkAutomationStatus() {
    chrome.storage.local.get(['automationState'], function(result) {
      if (result.automationState && result.automationState.active) {
        // Automation is running
        saveBtn.disabled = true;
        saveBtn.textContent = 'Running...';
        stopBtn.style.display = 'block';
        updateStatus('Automation in progress...', 'info');
      }
    });
  }
});

