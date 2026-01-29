# SalesNav Lead Saver

A Chrome extension that automates saving LinkedIn Sales Navigator leads to custom lists across multiple pages.

## Features

- **One-click automation** - Save all leads from search results to a list
- **Multi-page support** - Automatically processes all pages of search results
- **Smart navigation** - Handles LinkedIn's SPA routing with page reloads
- **Progress tracking** - Real-time status updates in the popup
- **Stop anytime** - Cancel automation mid-process if needed
- **Debug mode** - Built-in console debugging with `salesNavDebug()`

## Installation

1. **Download/Clone** this repository

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select this folder

3. **Pin the extension** (optional):
   - Click the puzzle icon in Chrome toolbar
   - Pin "SalesNav Lead Saver"

## Usage

1. **Open Sales Navigator** - Navigate to a search results page with leads

2. **Click the extension icon** - Opens the popup

3. **Enter list name** - Type the name of the list to save leads to
   - Existing list: leads will be added to it
   - New name: a new list will be created

4. **Click "Save Leads"** - Automation starts

5. **Watch progress** - Status updates show in the popup:
   - Selecting leads
   - Saving to list
   - Navigating to next page
   - Completion message

6. **Stop anytime** - Click "Stop" to cancel

## How It Works

For each page of results:
1. Clicks "Select all" to select all visible leads
2. Clicks "Save to list" to open the list dropdown
3. Selects your specified list (or creates it)
4. Waits for save to complete
5. Navigates to next page (full reload)
6. Repeats until no more pages

## File Structure

```
SalesNav-SavetoList/
├── manifest.json     # Extension configuration (Manifest V3)
├── content.js        # Main automation logic
├── popup.html        # Extension popup UI
├── popup.js          # Popup interaction logic
├── background.js     # Service worker
├── styles.css        # Popup styling
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Debugging

Open browser console (F12) and run:

```javascript
salesNavDebug()
```

This shows:
- Current page number (from URL hash)
- Detected lead elements
- Available buttons (Select all, Save to list, Next)
- Automation state

## Troubleshooting

### "Could not find Select all button"
- Ensure you're on a Sales Navigator search page with leads
- Wait for the page to fully load
- Check that leads are visible on the page

### Automation stops on page 2+
- The extension auto-resumes after page reload
- Check console for error messages
- Try stopping and restarting the automation

### List not found in dropdown
- Verify the list name spelling
- The extension uses partial matching (e.g., "My List" matches "My List (25)")
- Try creating the list manually first

### Extension not working after Chrome update
- Go to `chrome://extensions/`
- Click the reload icon on the extension

## Permissions

- `activeTab` - Interact with current tab
- `scripting` - Inject automation scripts
- `storage` - Save automation state across page reloads
- `linkedin.com` - Run on LinkedIn pages

## Technical Notes

- **Manifest V3** - Uses latest Chrome extension platform
- **SPA handling** - Forces page reload for reliable navigation
- **Hash-based URLs** - Correctly parses `#page=X` from Sales Navigator URLs
- **State persistence** - Uses `chrome.storage.local` to resume after page reload

## License

MIT License - Use freely for personal or commercial purposes.

## Version

1.1.0
