# JobFiltr Chrome Extension

AI-powered scam and ghost job detector for Chrome browser. Instantly analyze job postings on LinkedIn, Indeed, Glassdoor, and other major job boards.

## Features

- **Instant Scanning**: Analyze job postings with a single click
- **AI-Powered Detection**: Advanced algorithms to detect scams and ghost jobs
- **Multi-Platform Support**: Works on LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter, and CareerBuilder
- **Beautiful UI**: Clean, modern interface matching the JobFiltr brand
- **Quick & Deep Scans**: Choose between fast analysis or comprehensive reports
- **Scan History**: Track your previous scans and results
- **Auto-Detection**: Automatically detects when you're on a supported job site

## Installation

### For Developers (Local Installation)

1. **Download the Extension**
   - Clone or download this repository
   - Navigate to the `chrome-extension` folder

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The JobFiltr extension should now appear in your extensions list

5. **Pin the Extension** (Recommended)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "JobFiltr - Scam & Ghost Job Detector"
   - Click the pin icon to keep it visible

### For End Users (Chrome Web Store)

_Coming Soon: The extension will be published to the Chrome Web Store for easy one-click installation._

## Usage

### Quick Start

1. **Navigate to a Job Posting**
   - Visit any supported job board (LinkedIn, Indeed, etc.)
   - Open any job posting

2. **Click the Extension Icon**
   - The JobFiltr icon will show a green checkmark when on a supported page
   - Click the icon to open the popup

3. **Choose Your Scan Type**
   - **Quick Scan**: Fast AI analysis with community reviews
   - **Deep Analysis**: Comprehensive report with detailed insights

4. **View Results**
   - See legitimacy score, red flags, and AI analysis
   - Save results to history for future reference

### Advanced Features

- **Keyboard Shortcut**: Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac) to quick-scan the current page
- **Right-Click Menu**: Right-click on any job page and select "Scan with JobFiltr"
- **Auto-Scan**: Enable in settings to automatically scan job postings as you browse

## Supported Job Boards

- LinkedIn Jobs
- Indeed
- Glassdoor
- Monster
- ZipRecruiter
- CareerBuilder

_More job boards coming soon!_

## Configuration

### Setting up Convex Backend

1. Click the extension icon
2. Click "Settings" in the footer
3. Enter your Convex deployment URL
4. Save settings

The extension requires a connection to the JobFiltr backend to perform AI analysis. Contact your administrator for the Convex URL.

## Privacy & Security

- **No Data Collection**: We don't collect or store your personal browsing data
- **Secure Analysis**: Job data is sent securely to our backend for analysis
- **Local Storage**: Scan history is stored locally on your device
- **No Tracking**: We don't track your job search activities

## Troubleshooting

### Extension Icon Shows No Checkmark

- **Issue**: You're not on a supported job page
- **Solution**: Navigate to a job posting on LinkedIn, Indeed, Glassdoor, or another supported site

### "Could not extract job data" Error

- **Issue**: Page structure not recognized
- **Solution**: Try refreshing the page or manually copying job details to use the web version

### Scan Takes Too Long

- **Issue**: Network connectivity or backend issues
- **Solution**: Check your internet connection and try again. If persists, contact support.

### Extension Not Working After Update

- **Issue**: Chrome needs to reload the extension
- **Solution**: Go to `chrome://extensions/`, find JobFiltr, and click the refresh icon

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-repo/jobfiltr.git

# Navigate to extension directory
cd jobfiltr/chrome-extension

# Install dependencies (if any)
npm install

# Make your changes to the source files

# Reload the extension in Chrome
# Go to chrome://extensions/ and click the refresh icon
```

### Project Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── src/
│   ├── popup.js          # Popup logic
│   ├── content.js        # Content script for page interaction
│   └── background.js     # Background service worker
├── styles/
│   ├── popup.css         # Popup styling
│   └── content.css       # Content script styling
└── icons/                # Extension icons
```

### Technologies Used

- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- CSS3 with Animations
- Chrome Storage API
- Chrome Messaging API

## Changelog

### Version 1.0.0 (Initial Release)
- Multi-platform job board support
- Quick and deep scan modes
- Beautiful, responsive UI
- Scan history tracking
- Auto-detection of job pages
- Keyboard shortcuts
- Context menu integration

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Support

- **Issues**: Report bugs or request features on our [GitHub Issues](https://github.com/your-repo/jobfiltr/issues)
- **Email**: support@jobfiltr.com
- **Discord**: Join our community at [discord.gg/jobfiltr](https://discord.gg/jobfiltr)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ by the JobFiltr team
- Powered by Convex and OpenAI
- Icons and UI inspired by modern design principles

---

**Protect yourself from job scams. Install JobFiltr today!**
