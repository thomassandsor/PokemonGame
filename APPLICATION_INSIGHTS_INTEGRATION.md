# Application Insights Integration - Mobile Authentication Debugging

## Overview

Added comprehensive Application Insights logging to capture mobile authentication issues remotely, especially for cases where browser console access is limited on mobile devices.

## What's Been Added

### 1. Application Insights SDK Integration
- **Package**: `@microsoft/applicationinsights-web`
- **Configuration**: Environment-aware with fallback to console logging
- **Features**: Automatic page tracking, exception tracking, custom events

### 2. AppInsightsLogger Utility (`src/utils/appInsightsLogger.ts`)
- **Singleton pattern** for consistent logging across the app
- **Automatic initialization** with connection string from environment
- **Fallback behavior** when Application Insights is not configured
- **Specialized methods** for authentication and MSAL events

### 3. Comprehensive Event Tracking

#### MSAL Initialization Events
- `MSAL_Initialization_Loop` - When loop is detected (>3 attempts)
- `MSAL_Initialization_Attempt` - Each initialization attempt with timing
- `MSAL_Initialization_Success` - Successful initialization with metrics
- `MSAL_Initialization_Timeout` - When initialization times out

#### Authentication Flow Events
- `Auth_Event` - General authentication events with device context
- `MSAL_Event` - Specific MSAL events (redirect handling, errors)
- `Authentication_Success` - Successful login with user details
- `Redirect_Handled` - Redirect promise completion with timing

#### Error and Exception Tracking
- **All MSAL errors** are captured with full context
- **JavaScript exceptions** during auth flow
- **Initialization failures** with attempt counts
- **Emergency tool usage** tracking

#### Emergency Access Events
- `Emergency_Stop_Triggered` - When user uses emergency stop
- `Clear_All_Auth_Triggered` - When user clears all auth data
- `White_Screen_Issue` - Automatic detection of white screen problems

### 4. Enhanced Emergency Access

#### Immediate Console Commands
Available immediately when page loads, even during login loops:

```javascript
emergencyDebug()    // Shows emergency debug overlay
emergencyStop()     // Stops login loop and clears auth state
clearAllAuth()      // Nuclear option - clears all auth data
```

#### Emergency Debug Overlay
- **Full device information** displayed in overlay
- **Recent logs** from localStorage
- **MSAL state information** 
- **Interactive buttons** for emergency actions
- **Works during login loops** when normal UI is inaccessible

### 5. Device and Context Information

Every log entry includes:
- **Device type** (mobile/desktop, iOS/Android)
- **Browser information** (Safari, Chrome, etc.)
- **URL and timestamp**
- **User agent string**
- **Storage availability** (localStorage, sessionStorage)
- **Private/incognito mode detection**

## Configuration

### Environment Variables

Add to `.env` file:
```bash
REACT_APP_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=https://region.in.applicationinsights.azure.com/
```

### Development vs Production
- **Development**: Logs to console only (unless connection string provided)
- **Production**: Logs to both console and Application Insights
- **Sampling**: 100% sampling for debugging (can be reduced later)

## Benefits for Mobile Debugging

### 1. Remote Visibility
- **Can't access mobile console?** All logs are in Application Insights
- **User reports white screen?** Detailed logs are automatically captured
- **Login loop issues?** Complete timing and attempt information is available

### 2. Comprehensive Context
- **Device-specific information** helps identify mobile vs desktop issues
- **Browser-specific data** helps identify Safari vs Chrome differences
- **Timing information** helps identify performance bottlenecks

### 3. Historical Analysis
- **Trend analysis** of authentication failures
- **Device/browser breakdown** of issues
- **Success rate monitoring** over time

### 4. Emergency Recovery
- **Immediate access** to emergency tools even during failures
- **User self-service** options to recover from auth loops
- **Escalation path** when normal recovery fails

## Usage Examples

### For Developers
```javascript
// Manual event tracking
appInsightsLogger.trackAuthEvent('Custom_Auth_Event', {
  customData: 'additional context'
});

// Exception tracking with context
appInsightsLogger.trackException(error, {
  context: 'where this happened',
  additionalData: 'useful info'
});
```

### For Users (Emergency Recovery)
1. **Open browser developer tools** (F12)
2. **Go to Console tab**
3. **Type emergency command**: `emergencyDebug()`
4. **Use emergency overlay** to diagnose and recover

## Monitoring and Analysis

### Key Metrics to Watch
- **Initialization loop frequency** (MSAL_Initialization_Loop events)
- **White screen occurrences** (White_Screen_Issue events)
- **Emergency tool usage** (Emergency_* events)
- **Authentication success rates** by device type

### Useful Queries (Application Insights)
```kusto
// Authentication failures by device type
customEvents
| where name == "Auth_Event"
| where customDimensions.eventType == "Authentication_Failure"
| summarize count() by tostring(customDimensions.deviceType)

// MSAL initialization loops
customEvents
| where name == "MSAL_Initialization_Loop"
| project timestamp, customDimensions.attempts, customDimensions.url

// Emergency tool usage (indicates user frustration)
customEvents
| where name startswith "Emergency_"
| project timestamp, name, customDimensions.url
```

## Next Steps

1. **Deploy with Application Insights configured**
2. **Monitor for new authentication patterns**
3. **Analyze emergency tool usage** to identify problem areas
4. **Refine initialization loop detection** based on real data
5. **Add more specific event tracking** as needed

This comprehensive logging system provides the visibility needed to debug mobile authentication issues that were previously invisible.
