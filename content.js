// Content script for SalesNav Lead Saver

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to wait for an element to appear
async function waitForElement(text, minWaitMs = 3000, maxWaitMs = 300000, checkIntervalMs = 500) {
  // Wait minimum time first
  await wait(minWaitMs);
  
  const startTime = Date.now();
  
  // Then poll for the element
  while (Date.now() - startTime < maxWaitMs) {
    const element = findClickableByText(text);
    if (element) {
      return element;
    }
    await wait(checkIntervalMs);
  }
  
  // Return null if not found within max time
  return null;
}

// Helper function to find element by text content
function findElementByText(text, tagName = '*') {
  const xpath = `//${tagName}[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return result.singleNodeValue;
}

// Helper function to find clickable element by text (button, span, or any clickable element)
function findClickableByText(text, useContains = false) {
  // Try different selectors including spans
  const selectors = ['button', 'a', 'span[role="button"]', '[role="button"]', 'span', 'div[role="button"]'];
  
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    const element = elements.find(el => {
      const elementText = el.textContent.trim().toLowerCase();
      const searchText = text.toLowerCase();
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      
      if (useContains) {
        // For list names, use contains to ignore lead counts like "(25)"
        return elementText.includes(searchText) || ariaLabel.includes(searchText);
      } else {
        // For buttons, match more strictly
        return elementText.includes(searchText) || elementText === searchText || ariaLabel.includes(searchText);
      }
    });
    
    if (element) {
      // If we found a span, try to find its clickable parent
      if (element.tagName.toLowerCase() === 'span' && !element.hasAttribute('role')) {
        let parent = element.parentElement;
        let depth = 0;
        // Look up to 5 levels for a clickable parent
        while (parent && depth < 5) {
          if (parent.tagName.toLowerCase() === 'button' || 
              parent.hasAttribute('role') && parent.getAttribute('role') === 'button' ||
              parent.onclick ||
              parent.tagName.toLowerCase() === 'a') {
            return parent;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
      return element;
    }
  }
  
  // Fallback to XPath
  return findElementByText(text);
}

// Helper function to scroll element to bottom
function scrollToBottom(element) {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

// Helper function to scroll element to top
function scrollToTop(element) {
  if (element) {
    element.scrollTop = 0;
  }
}

// Helper function to scroll main page
function scrollMainPageToBottom() {
  window.scrollTo(0, document.body.scrollHeight);
}

// Helper function to find the leads scrollable container
function findLeadsContainer() {
  // Look for common Sales Navigator container classes
  // The leads are usually in a scrollable div with overflow
  const containers = Array.from(document.querySelectorAll('div[class*="scaffold"]'));
  
  for (const container of containers) {
    const style = window.getComputedStyle(container);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      // Check if it contains lead items
      if (container.querySelector('[data-x--lead-list-item]') || 
          container.querySelector('[class*="artdeco-list"]') ||
          container.querySelector('[class*="lead"]')) {
        return container;
      }
    }
  }
  
  // Fallback: find any scrollable div that's tall enough
  const scrollableDivs = Array.from(document.querySelectorAll('div'));
  return scrollableDivs.find(div => {
    const style = window.getComputedStyle(div);
    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && 
           div.scrollHeight > div.clientHeight + 100;
  });
}

// Helper function to click element using coordinates
function clickElementWithCoordinates(element) {
  if (!element) {
    console.error('[SalesNav] clickElementWithCoordinates: element is null');
    return false;
  }
  
  try {
    // Get element position
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    console.log('[SalesNav] Clicking at coordinates:', x, y, 'Element:', element.tagName, element.textContent?.substring(0, 30));
    
    // Create and dispatch mouse events at specific coordinates
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    element.dispatchEvent(mousedownEvent);
    element.dispatchEvent(mouseupEvent);
    element.dispatchEvent(clickEvent);
    
    // Also try regular click as backup
    element.click();
    
    console.log('[SalesNav] Successfully dispatched click events');
    return true;
  } catch (error) {
    console.error('[SalesNav] Error clicking with coordinates:', error);
    return false;
  }
}

// Helper function to click element safely  
function clickElement(element) {
  if (!element) {
    console.error('[SalesNav] clickElement: element is null or undefined');
    return false;
  }
  
  try {
    // Log what we're trying to click
    console.log('[SalesNav] Attempting to click:', element.tagName, element.textContent?.substring(0, 50));
    
    // Check if element is visible
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    
    if (!isVisible) {
      console.warn('[SalesNav] Element is not visible, but attempting click anyway');
    }
    
    // Try to click
    element.click();
    
    console.log('[SalesNav] Successfully clicked element');
    return true;
  } catch (error) {
    console.error('[SalesNav] Error clicking element:', error);
    return false;
  }
}

// Helper function to build the next page URL (handles hash-based pagination)
function buildNextPageUrl() {
  const currentUrl = window.location.href;
  const hash = window.location.hash;

  // LinkedIn Sales Nav uses #page=X format
  const hashPageMatch = hash.match(/page=(\d+)/);
  const currentPage = hashPageMatch ? parseInt(hashPageMatch[1]) : 1;
  const nextPage = currentPage + 1;

  console.log('[SalesNav] Current page:', currentPage, '-> Next page:', nextPage);

  let newUrl;

  if (hashPageMatch) {
    // Replace existing page number in hash
    newUrl = currentUrl.replace(/#page=\d+/, `#page=${nextPage}`);
  } else if (hash) {
    // Hash exists but no page param - add page at start of hash
    const baseUrl = currentUrl.split('#')[0];
    newUrl = baseUrl + '#page=' + nextPage + '&' + hash.substring(1);
  } else {
    // No hash at all - add one
    newUrl = currentUrl + '#page=' + nextPage;
  }

  console.log('[SalesNav] Next page URL:', newUrl);
  return newUrl;
}

// Helper function to close any open dropdowns/modals
async function closeDropdowns() {
  console.log('[SalesNav] Closing any open dropdowns...');

  // Method 1: Press Escape key
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    which: 27,
    bubbles: true
  }));

  await wait(300);

  // Method 2: Click outside the dropdown (on the page body/backdrop)
  const backdrop = document.querySelector('[class*="artdeco-modal-overlay"]') ||
                   document.querySelector('[class*="dropdown-backdrop"]') ||
                   document.querySelector('[class*="modal-backdrop"]');
  if (backdrop) {
    backdrop.click();
    await wait(300);
  }

  // Method 3: Click on the main content area to dismiss
  const mainContent = document.querySelector('main') ||
                      document.querySelector('[class*="search-results"]') ||
                      document.body;
  if (mainContent) {
    // Click at a safe spot (top left of main content)
    const rect = mainContent.getBoundingClientRect();
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + 10,
      clientY: rect.top + 10
    });
    mainContent.dispatchEvent(clickEvent);
  }

  await wait(300);

  // Method 4: Look for close button in dropdown
  const closeBtn = document.querySelector('[class*="dropdown"] [class*="close"]') ||
                   document.querySelector('[aria-label="Close"]') ||
                   document.querySelector('[aria-label="Dismiss"]');
  if (closeBtn) {
    closeBtn.click();
    await wait(300);
  }

  console.log('[SalesNav] Dropdown close attempts completed');
}

// Helper function to find the Next pagination button
function findNextButton() {
  // Try multiple selectors for the Next button
  const selectors = [
    'button[aria-label="Next"]',
    'button[aria-label="next"]',
    'button[aria-label="Go to next page"]',
    '[data-test-pagination-page-btn="next"]',
    '.artdeco-pagination__button--next',
    'button.artdeco-pagination__button--next',
    'li.artdeco-pagination__indicator--number:last-child button'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      console.log('[SalesNav] Found Next button with selector:', selector);
      return btn;
    }
  }

  // Fallback: find by text content
  const textBtn = findClickableByText('next');
  if (textBtn) {
    console.log('[SalesNav] Found Next button by text');
    return textBtn;
  }

  // Last resort: find pagination buttons and get the last one (usually "Next")
  const paginationBtns = document.querySelectorAll('[class*="pagination"] button');
  if (paginationBtns.length > 0) {
    const lastBtn = paginationBtns[paginationBtns.length - 1];
    console.log('[SalesNav] Using last pagination button as Next');
    return lastBtn;
  }

  console.log('[SalesNav] Could not find Next button');
  return null;
}

// Helper function to type like a human (character by character with random delays)
async function typeHumanLike(inputElement, text) {
  console.log('[SalesNav] Typing human-like:', text);

  // Focus the input first
  inputElement.focus();
  await wait(100);

  // Clear existing value
  inputElement.value = '';
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(50);

  // Type each character with random delay
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Random delay between 50-150ms per character (human typing speed)
    const delay = Math.floor(Math.random() * 100) + 50;

    // Simulate keydown event
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      charCode: char.charCodeAt(0),
      keyCode: char.charCodeAt(0),
      which: char.charCodeAt(0),
      bubbles: true
    });
    inputElement.dispatchEvent(keydownEvent);

    // Add character to input value
    inputElement.value += char;

    // Simulate input event (this is what React/LinkedIn listens to)
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    // Simulate keyup event
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      charCode: char.charCodeAt(0),
      keyCode: char.charCodeAt(0),
      which: char.charCodeAt(0),
      bubbles: true
    });
    inputElement.dispatchEvent(keyupEvent);

    await wait(delay);
  }

  // Final input event to ensure value is registered
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));

  // Trigger blur and focus to ensure LinkedIn picks up the value
  inputElement.blur();
  await wait(100);
  inputElement.focus();

  console.log('[SalesNav] Finished typing, input value:', inputElement.value);
}

// Send status update to popup
function sendStatus(message, type = 'info') {
  console.log(`[SalesNav] ${type.toUpperCase()}: ${message}`);
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    message: message,
    type: type
  });
}

// Main automation function
async function saveLeadsToList(listName) {
  try {
    // Check if stopped before starting
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    sendStatus('Step 1: Clicking "Select all"...', 'info');
    const selectAllBtn = findClickableByText('select all');
    if (!selectAllBtn) {
      throw new Error('Could not find "Select all" button');
    }
    clickElement(selectAllBtn);
    await wait(1000);

    // Check if stopped
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    sendStatus('Step 2: Clicking "Save to list"...', 'info');
    const saveToListBtn = findClickableByText('save to list');
    if (!saveToListBtn) {
      throw new Error('Could not find "Save to list" button');
    }
    clickElement(saveToListBtn);
    await wait(2000);

    // Check if stopped
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      await closeDropdowns();
      return;
    }

    sendStatus('Step 3: Selecting or creating list...', 'info');

    // Look for the list in dropdown (use contains to match "List Name (25)" format)
    const listElement = findClickableByText(listName, true);

    if (listElement && !listElement.textContent.toLowerCase().includes('create')) {
      // List exists, click it
      sendStatus(`Found existing list "${listName}"`, 'info');
      clickElement(listElement);

      // Wait for loading spinner and save operation to complete (checkmark appears)
      sendStatus('Waiting for leads to save (checkmark to appear)...', 'info');
      await wait(3000); // Wait for spinner and save to complete
    } else {
      // List doesn't exist, need to create it
      sendStatus(`List not found. Creating new list "${listName}"...`, 'info');

      // Look for "+ Create new list" button at the bottom of dropdown
      const createNewBtn = findClickableByText('create new list') ||
                          findClickableByText('+ create') ||
                          findClickableByText('create list') ||
                          findClickableByText('new list') ||
                          findClickableByText('create');

      if (createNewBtn) {
        console.log('[SalesNav] Found Create new list button:', createNewBtn.textContent);
        clickElement(createNewBtn);
        await wait(2000); // Wait for create list modal/form to appear

        // Find the input field for new list name (be specific to avoid search bars)
        // Look for inputs inside modals, forms, or with list-related placeholders
        const input = document.querySelector('[class*="modal"] input[type="text"]') ||
                     document.querySelector('[class*="form"] input[placeholder*="name" i]') ||
                     document.querySelector('[class*="form"] input[placeholder*="list" i]') ||
                     document.querySelector('input[placeholder*="Enter list name" i]') ||
                     document.querySelector('input[placeholder*="List name" i]') ||
                     document.querySelector('input[placeholder*="name" i]:not([placeholder*="keyword" i])') ||
                     document.querySelector('[role="dialog"] input[type="text"]') ||
                     document.querySelector('[class*="create-list"] input') ||
                     document.querySelector('[class*="artdeco-modal"] input[type="text"]');

        console.log('[SalesNav] Found input for list name:', input);

        if (input) {
          sendStatus(`Typing new list name "${listName}"...`, 'info');
          await typeHumanLike(input, listName);
          await wait(1500); // Wait for LinkedIn to validate and enable Create button

          // Click create/save button (look for it again as it may have appeared)
          const confirmBtn = findClickableByText('create') ||
                            findClickableByText('save') ||
                            document.querySelector('button[type="submit"]');
          if (confirmBtn) {
            sendStatus('Clicking Create button...', 'info');
            await wait(500);
            clickElement(confirmBtn);
            await wait(3000); // Wait for list to be created and leads to save
            sendStatus('List created and leads saved!', 'info');
          } else {
            console.log('[SalesNav] Create button not found after typing');
            sendStatus('Warning: Create button not found', 'error');
          }
        } else {
          console.log('[SalesNav] Input field not found for new list name');
          sendStatus('Warning: Could not find input field for list name', 'error');
        }
      } else {
        console.log('[SalesNav] Create new list button not found');
        sendStatus('Warning: Create new list option not found', 'error');
      }
    }
    await wait(1000);

    // Check if stopped before navigating
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      await closeDropdowns();
      return;
    }

    // Close the dropdown before navigating
    sendStatus('Closing dropdown...', 'info');
    await closeDropdowns();
    await wait(500);

    // Check if stopped one more time before navigation
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    sendStatus('Step 4: Navigating to page 2...', 'info');

    // Build the next page URL by modifying the hash
    const nextPageUrl = buildNextPageUrl();

    if (!nextPageUrl) {
      sendStatus('Could not determine next page URL. Completed!', 'success');
      return;
    }

    // Final stop check before navigation
    if (await shouldStopAutomation()) {
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    // Save automation state before navigation (page reload will kill the script)
    sendStatus('Saving state and reloading to page 2...', 'info');
    chrome.storage.local.set({
      automationState: {
        active: true,
        listName: listName,
        step: 'page2',
        timestamp: Date.now()
      }
    }, function() {
      console.log('[SalesNav] State saved, navigating to:', nextPageUrl);
      // Change URL and force reload (hash changes don't auto-reload)
      window.location.href = nextPageUrl;
      window.location.reload();
    });
    
  } catch (error) {
    sendStatus('Error: ' + error.message, 'error');
    console.error('[SalesNav] Error:', error);
  }
}

// Check if we should resume automation after page navigation
chrome.storage.local.get(['automationState'], async function(result) {
  if (result.automationState && result.automationState.active) {
    console.log('[SalesNav] Resuming automation after navigation:', result.automationState);
    const { listName, step } = result.automationState;

    // DON'T clear the state yet - we need it to check if automation is running
    // It will be cleared when automation completes, errors, or user stops

    // Resume from step 5 (after navigation to page 2)
    if (step === 'page2') {
      sendStatus('Resumed: Waiting for page to load...', 'info');

      // Wait longer for LinkedIn SPA to fully render
      await wait(4000);

      // Force scroll to trigger any lazy loading
      console.log('[SalesNav] Scrolling to trigger lead list render...');
      window.scrollTo(0, 500);
      await wait(1000);
      window.scrollTo(0, 0);
      await wait(1000);

      await continueOnPage2(listName);
    }
  }
});

// Function to check if automation should stop
async function shouldStopAutomation() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['automationState'], function(result) {
      // If state is cleared or not active, stop
      resolve(!result.automationState || !result.automationState.active);
    });
  });
}

// Function to wait for page content to change (new leads to load)
async function waitForPageChange(maxWaitMs = 15000) {
  // Get current page indicator
  const getPageIndicator = () => {
    // LinkedIn Sales Nav uses #page=X in the hash fragment
    const hash = window.location.hash;
    const hashPageMatch = hash.match(/page=(\d+)/);
    const pageFromHash = hashPageMatch ? hashPageMatch[1] : '1';

    // Also check for active pagination button
    const activePageBtn = document.querySelector('[class*="pagination"] [class*="active"]');
    const pageFromBtn = activePageBtn ? activePageBtn.textContent.trim() : null;

    // Get first lead name as content fingerprint
    const firstLead = document.querySelector('[data-anonymize="person-name"]');
    const leadName = firstLead ? firstLead.textContent.trim() : '';

    return `${pageFromHash}-${pageFromBtn}-${leadName}`;
  };

  const initialState = getPageIndicator();
  console.log('[SalesNav] Waiting for page change. Initial state:', initialState);

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await wait(500);
    const currentState = getPageIndicator();
    if (currentState !== initialState) {
      console.log('[SalesNav] Page changed! New state:', currentState);
      return true;
    }
  }

  console.log('[SalesNav] Page change timeout - content may not have changed');
  return false;
}

// Function to wait for leads to be visible on page
async function waitForLeadsToLoad(maxWaitMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Look for lead list items - LinkedIn uses these selectors
    const leadItems = document.querySelectorAll(
      '[data-x--lead-list-item], ' +
      '[class*="artdeco-list__item"], ' +
      'li[class*="list-style-none"], ' +
      '[data-anonymize="person-name"], ' +
      '[class*="lead-result"], ' +
      '[class*="search-results__result-item"]'
    );

    if (leadItems.length > 0) {
      console.log(`[SalesNav] Found ${leadItems.length} lead items on page`);
      return true;
    }

    // Scroll to trigger lazy loading
    window.scrollTo(0, 500);
    await wait(300);
    window.scrollTo(0, 0);

    await wait(500);
  }

  return false;
}

// Function to handle automation on any page (page 2, 3, 4, etc.)
async function continueOnPage2(listName) {
  try {
    // Check if we should stop
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    sendStatus('Waiting for page to fully load...', 'info');

    // First, wait longer for page to settle after navigation
    await wait(3000);

    // Scroll to trigger any lazy loading
    sendStatus('Triggering lead list load...', 'info');
    window.scrollTo(0, 300);
    await wait(500);
    window.scrollTo(0, 0);
    await wait(1000);

    // Wait for leads to actually appear on the page
    const leadsLoaded = await waitForLeadsToLoad(30000);
    if (!leadsLoaded) {
      console.warn('[SalesNav] No leads detected on page, but continuing anyway...');
      sendStatus('Warning: No leads detected, continuing...', 'info');
    }

    const selectAllBtn = await waitForElement('select all', 3000, 300000, 500);
    
    if (!selectAllBtn) {
      throw new Error('Timeout: "Select all" button did not appear after 5 minutes');
    }
    
    // Get current page number from URL (check both hash and query string)
    const currentUrl = window.location.href;
    const hash = window.location.hash;
    // LinkedIn Sales Nav uses #page=2 format (in hash fragment)
    const hashPageMatch = hash.match(/page=(\d+)/);
    const queryPageMatch = currentUrl.match(/\?.*page=(\d+)/);
    const currentPage = hashPageMatch ? parseInt(hashPageMatch[1]) :
                        queryPageMatch ? parseInt(queryPageMatch[1]) : 1;

    console.log('[SalesNav] Current page detected:', currentPage, 'from hash:', hash);
    
    sendStatus(`Page ${currentPage}: Clicking "Select all"...`, 'info');
    console.log('[SalesNav] Found Select all button:', selectAllBtn);
    
    // Check if we should stop before each major action
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      sendStatus('Automation stopped by user', 'error');
      return;
    }
    
    const selectAllClicked = clickElement(selectAllBtn);
    if (!selectAllClicked) {
      throw new Error('Failed to click "Select all" button');
    }
    await wait(2000);

    sendStatus(`Page ${currentPage}: Clicking "Save to list"...`, 'info');
    const saveToListBtn = findClickableByText('save to list');
    
    // Check if Save to list button exists and is enabled
    if (!saveToListBtn || saveToListBtn.disabled || saveToListBtn.getAttribute('aria-disabled') === 'true') {
      sendStatus(`Page ${currentPage}: Leads already saved, skipping to next page...`, 'info');
      console.log('[SalesNav] Save to list button disabled or not found - leads likely already saved');

      // Check if stopped before skipping to next page
      if (await shouldStopAutomation()) {
        chrome.storage.local.remove(['automationState']);
        sendStatus('Automation stopped by user', 'error');
        return;
      }

      // Skip to next page by reloading with new URL
      const nextPageUrl = buildNextPageUrl();
      const nextBtn = findNextButton();
      const isNextDisabled = nextBtn ? (nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true') : true;

      if (nextPageUrl && nextBtn && !isNextDisabled) {
        chrome.storage.local.set({
          automationState: {
            active: true,
            listName: listName,
            step: 'page2',
            timestamp: Date.now()
          }
        }, function() {
          console.log(`[SalesNav] Skipping to next page:`, nextPageUrl);
          window.location.href = nextPageUrl;
          window.location.reload();
        });
        return; // Exit function early
      } else {
        // No more pages
        chrome.storage.local.remove(['automationState']);
        sendStatus(`Completed! Processed up to page ${currentPage}.`, 'success');
        return;
      }
    }
    
    // Check if stopped before clicking Save to list
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    console.log('[SalesNav] Found Save to list button:', saveToListBtn);
    clickElement(saveToListBtn);
    await wait(1500);

    // Check if stopped after opening dropdown
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      await closeDropdowns();
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    sendStatus(`Page ${currentPage}: Selecting list from dropdown...`, 'info');
    const listElement = findClickableByText(listName, true);
    if (!listElement) {
      throw new Error(`Could not find list "${listName}" in dropdown`);
    }
    console.log('[SalesNav] Found list in dropdown:', listElement);
    clickElement(listElement);

    sendStatus(`Page ${currentPage}: Waiting for save to complete...`, 'info');
    await wait(3000);

    // Check if stopped after saving
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      await closeDropdowns();
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    // Close the dropdown before navigating to next page
    sendStatus(`Page ${currentPage}: Closing dropdown...`, 'info');
    await closeDropdowns();
    await wait(500);

    // Final stop check before navigating to next page
    if (await shouldStopAutomation()) {
      chrome.storage.local.remove(['automationState']);
      sendStatus('Automation stopped by user', 'error');
      return;
    }

    // Check if there's a Next button (to determine if we should continue)
    const nextBtn = findNextButton();
    const isNextDisabled = nextBtn ? (nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true') : true;
    const nextPageUrl = buildNextPageUrl();

    if (nextBtn && !isNextDisabled && nextPageUrl) {
      sendStatus(`Page ${currentPage}: Saved! Going to page ${currentPage + 1}...`, 'info');
      console.log('[SalesNav] Next button found and enabled, navigating to next page...');

      // Save state and navigate with page reload
      chrome.storage.local.set({
        automationState: {
          active: true,
          listName: listName,
          step: 'page2',
          timestamp: Date.now()
        }
      }, function() {
        console.log(`[SalesNav] Navigating to:`, nextPageUrl);
        window.location.href = nextPageUrl;
        window.location.reload();
      });
    } else {
      // No more pages - clear state and show success
      chrome.storage.local.remove(['automationState']);
      sendStatus(`All leads saved to "${listName}"! Processed up to page ${currentPage}.`, 'success');
      console.log('[SalesNav] No more pages or Next button disabled. Automation complete!');
    }
    
  } catch (error) {
    // Clear state on error
    chrome.storage.local.remove(['automationState']);
    sendStatus('Error: ' + error.message, 'error');
    console.error('[SalesNav] Error:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'saveLeads') {
    saveLeadsToList(request.listName);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopAutomation') {
    // Clear automation state
    chrome.storage.local.remove(['automationState']);
    console.log('[SalesNav] Stop command received');
    sendResponse({ status: 'stopped' });
  }
  return true;
});

// Debug function - can be called from console: salesNavDebug()
window.salesNavDebug = function() {
  console.log('=== SalesNav Debug Info ===');

  // Check URL - LinkedIn uses #page=X in hash fragment
  const url = window.location.href;
  const hash = window.location.hash;
  const hashPageMatch = hash.match(/page=(\d+)/);
  const queryPageMatch = url.match(/\?.*page=(\d+)/);

  console.log('Current URL:', url);
  console.log('Hash fragment:', hash.substring(0, 100) + '...');
  console.log('Page from hash:', hashPageMatch ? hashPageMatch[1] : 'none');
  console.log('Page from query:', queryPageMatch ? queryPageMatch[1] : 'none');
  console.log('Detected page:', hashPageMatch ? hashPageMatch[1] : (queryPageMatch ? queryPageMatch[1] : '1'));

  // Check for leads
  const leadSelectors = [
    '[data-x--lead-list-item]',
    '[class*="artdeco-list__item"]',
    'li[class*="list-style-none"]',
    '[data-anonymize="person-name"]',
    '[class*="lead-result"]',
    '[class*="search-results__result-item"]'
  ];

  console.log('Lead selectors found:');
  leadSelectors.forEach(sel => {
    const count = document.querySelectorAll(sel).length;
    if (count > 0) console.log(`  ${sel}: ${count}`);
  });

  // Check for buttons
  const selectAllBtn = findClickableByText('select all');
  const saveToListBtn = findClickableByText('save to list');
  const nextBtn = findNextButton();

  console.log('Buttons found:');
  console.log('  Select all:', selectAllBtn ? 'YES' : 'NO');
  console.log('  Save to list:', saveToListBtn ? 'YES' : 'NO');
  console.log('  Next:', nextBtn ? 'YES' : 'NO');

  if (nextBtn) {
    const isDisabled = nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true';
    console.log('  Next button disabled:', isDisabled);
    console.log('  Next button element:', nextBtn.tagName, nextBtn.className?.substring(0, 50));
  }

  // Check automation state
  chrome.storage.local.get(['automationState'], function(result) {
    console.log('Automation state:', result.automationState || 'none');
  });

  console.log('=== End Debug Info ===');
  return 'Debug info logged above';
};

console.log('[SalesNav] Content script loaded');
console.log('[SalesNav] Tip: Run salesNavDebug() in console to check page state');

