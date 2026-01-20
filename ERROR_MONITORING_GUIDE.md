# Extension Error Monitoring System

Comprehensive error tracking for the JobFiltr Chrome Extension on LinkedIn.

## Overview

The error monitoring system automatically captures all errors, warnings, and debugging information from the extension and sends them to your Convex backend for real-time monitoring.

## Features

✅ **Automatic Error Capture**
- Uncaught JavaScript errors
- Unhandled promise rejections
- Custom logged errors

✅ **Rich Context**
- Error message and stack trace
- Platform (LinkedIn, Indeed, Google)
- Current URL
- Job context (title, company, job ID)
- DOM state snapshot
- Console logs (last 50 messages)
- User agent and extension version

✅ **Real-time Dashboard**
- View all errors in Next.js app at `/extension-errors`
- Filter by platform, resolved status
- Group errors by message
- View detailed error information
- Mark errors as resolved
- Delete errors

✅ **Live Notifications**
- Toast notifications in web app
- Browser notifications (with permission)
- Real-time updates via Convex

## Setup

### 1. Reload the Extension

The error logger is now automatically included in the extension. To update:

1. Navigate to `chrome://extensions/`
2. Find "JobFiltr" extension
3. Click the refresh icon to reload
4. Or run the build script: `chrome-extension\build-extension.bat`

### 2. Access the Dashboard

1. Start your Next.js dev server: `npm run dev`
2. Go to http://localhost:3000/extension-errors
3. You'll see the error monitoring dashboard

### 3. Test Error Logging

#### Method 1: Trigger a Test Error
Open LinkedIn and run this in the browser console:

```javascript
// Manually log a test error
window.errorLogger.log("Test error from console", {
  type: "TestError"
});

// Trigger an actual error
throw new Error("This is a test error!");
```

#### Method 2: Use the Extension
Just use the extension normally on LinkedIn. Any errors that occur will be automatically captured and logged.

## How It Works

### Extension Side

1. **error-logger.js** - Automatically injected into all content scripts
   - Sets up global error handlers
   - Intercepts console methods
   - Captures error context
   - Sends errors to background script

2. **background.js** - Service worker
   - Receives error data from content scripts
   - Sends to Convex via HTTP API

### Backend (Convex)

1. **Schema** - `convex/schema.ts`
   - `extensionErrors` table with all error fields
   - Indexed for fast queries

2. **Functions** - `convex/extensionErrors.ts`
   - `logError` - Mutation to create error records
   - `getErrors` - Query errors with filters
   - `getRecentErrors` - Last 24 hours
   - `getErrorStats` - Statistics
   - `getGroupedErrors` - Group by message
   - `markResolved` - Mark error as fixed
   - `deleteError` - Remove error

### Frontend (Next.js)

1. **Dashboard** - `app/(protected)/extension-errors/page.tsx`
   - Real-time error list
   - Filtering and grouping
   - Detailed error view
   - Resolution tracking

2. **Notifications** - `components/error-notifications.tsx`
   - Monitors for new errors
   - Shows toast notifications
   - Browser notifications

## Usage

### Viewing Errors

Navigate to the dashboard at `/extension-errors`:

- **Stats Cards** - Total errors, last 24h, unresolved, last 7 days
- **Platform Breakdown** - Errors by LinkedIn/Indeed/Google
- **Filter** - By platform or show/hide resolved
- **Tabs**:
  - **Grouped Errors** - Same errors grouped together
  - **Individual Errors** - All errors listed separately

### Error Details

Click "View Details" on any error to see:

- Full stack trace
- Job context (what job the user was viewing)
- DOM snapshot (relevant HTML)
- Console logs (last 50 messages before error)
- URL and timestamp
- User agent and extension version

### Managing Errors

- **Mark as Resolved** - When you've fixed the underlying issue
- **Delete** - Remove error from database
- **Filter** - Focus on specific platforms or unresolved errors

## Debugging Tips

### Common Error Patterns

1. **DOM Selection Errors**
   - Check `domSnapshot` to see page structure
   - LinkedIn often changes class names

2. **Job Age Extraction Issues**
   - Look at `jobContext` for the specific job
   - Check console logs for extraction attempts

3. **Race Conditions**
   - Check timestamps in console logs
   - Look for multiple errors in quick succession

### Using Error Context

The error logger captures rich context:

```javascript
{
  message: "Cannot read property 'textContent' of null",
  errorType: "TypeError",
  platform: "linkedin",
  url: "https://www.linkedin.com/jobs/view/12345",
  jobContext: {
    jobTitle: "Senior Engineer",
    company: "Example Corp",
    jobId: "12345"
  },
  domSnapshot: {
    activeElement: "DIV.job-card",
    detailPanelHTML: "..."
  },
  consoleLogs: [
    { level: "log", message: "Extracting job age...", timestamp: 123 },
    { level: "error", message: "Error!", timestamp: 124 }
  ]
}
```

## API Reference

### Window API (Extension)

Available in content scripts:

```javascript
// Manually log an error
window.errorLogger.log(message, context)

// Wrap a function to catch errors
const safeFunction = window.errorLogger.wrap(myFunction, "functionName")

// Enable/disable logging
window.errorLogger.setEnabled(true/false)
```

### Convex API

Available in Next.js via hooks:

```typescript
// Get all errors
const errors = useQuery(api.extensionErrors.getErrors, {
  platform: "linkedin",
  resolved: false,
  limit: 100
});

// Get statistics
const stats = useQuery(api.extensionErrors.getErrorStats);

// Mark as resolved
const markResolved = useMutation(api.extensionErrors.markResolved);
await markResolved({ id, resolvedBy: "admin", notes: "Fixed" });
```

## Troubleshooting

### Extension not logging errors

1. Check extension is loaded: `chrome://extensions/`
2. Check console for error-logger initialization message
3. Verify `window.errorLogger` exists in console

### Dashboard not showing errors

1. Ensure Convex is running: `npx convex dev`
2. Check browser console for API errors
3. Verify you're authenticated (signed in)

### Notifications not appearing

1. Check browser notification permissions
2. Ensure you're on the error dashboard or another app page
3. Check console for notification errors

## Next Steps

Now that error monitoring is set up, you can:

1. **Monitor Production** - See real errors from real usage
2. **Debug Faster** - Rich context helps identify issues quickly
3. **Track Fixes** - Mark errors as resolved and track progress
4. **Identify Patterns** - Group errors to find common issues

## Support

If you encounter issues with the error monitoring system itself:
1. Check the browser console for errors
2. Verify all files were created correctly
3. Ensure Convex schema was updated successfully
