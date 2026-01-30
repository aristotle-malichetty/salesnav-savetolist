# SalesNav Lead Saver

![SalesNav Lead Saver](banner.svg)

A Chrome extension that automates saving LinkedIn Sales Navigator leads to custom lists across multiple pages.

## Features

- **One-click automation** - Save all leads from search results to a list
- **Multi-page support** - Automatically processes all pages of search results
- **Create new lists** - Automatically creates lists if they don't exist
- **Human-like typing** - Types list names character by character to bypass bot detection
- **Smart navigation** - Handles LinkedIn's SPA routing with full page reloads
- **Instant stop** - Stop button works immediately, even mid-operation
- **Progress tracking** - Real-time status updates in the popup
- **Connection check** - Warns you if page needs to be reloaded
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

2. **Reload the page** - If you just installed/updated the extension, reload the page (Ctrl+R / Cmd+R)

3. **Click the extension icon** - Opens the popup

4. **Enter list name**:
   - **Existing list**: Leads will be added to it
   - **New list name**: A new list will be created automatically

5. **Click "Save Leads"** - Automation starts

6. **Watch progress** - Status updates show each step:
   - Selecting all leads
   - Opening save dialog
   - Selecting/creating list
   - Navigating to next page
   - Completion message

7. **Stop anytime** - Click "Stop" to cancel immediately

## How It Works

For each page of search results:

1. Clicks "Select all" to select visible leads
2. Clicks "Save to list" to open the dropdown
3. Selects your list OR creates a new one (with human-like typing)
4. Waits for save to complete
5. Navigates to next page (full page reload)
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
├── LICENSE           # MIT License
└── README.md
```

## Debugging

Open browser console (F12) on a Sales Navigator page and run:

```javascript
salesNavDebug()
```

This shows:
- Current page number (from URL hash)
- Detected lead elements
- Available buttons (Select all, Save to list, Next)
- Automation state

## Troubleshooting

### "Reload page first" message
- The extension needs the page to be loaded after installation
- Press **Ctrl+R** (Windows) or **Cmd+R** (Mac) to reload

### "Could not find Select all button"
- Ensure you're on a Sales Navigator **search results** page
- Wait for the page to fully load
- Make sure leads are visible on the page

### List not created
- The extension types the list name like a human
- Wait for LinkedIn to recognize the input
- If it fails, try creating the list manually first

### Automation stops unexpectedly
- Check the browser console (F12) for error messages
- Try reloading the page and starting again

### Extension not working after Chrome update
- Go to `chrome://extensions/`
- Click the reload icon on the extension
- Reload the Sales Navigator page

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Interact with current tab |
| `storage` | Save state across page reloads |
| `linkedin.com` | Run on LinkedIn pages |

## Technical Notes

- **Manifest V3** - Latest Chrome extension platform
- **Hash-based URLs** - Correctly parses `#page=X` from Sales Navigator URLs
- **Human-like typing** - 50-150ms random delay between keystrokes
- **Interruptible waits** - Stop flag checked every 100ms
- **State persistence** - Uses `chrome.storage.local` to resume after page reload

## License

MIT License - Use freely for personal or commercial purposes.

## Version

1.2.0

## Changelog

### 1.2.0
- Human-like typing for creating new lists
- Instant stop functionality
- Connection check on popup open
- Better error messages

### 1.1.0
- Multi-page support with automatic pagination
- Hash-based URL navigation
- Debug mode with `salesNavDebug()`

### 1.0.0
- Initial release
- Basic lead saving functionality
