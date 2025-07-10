# Mobile Authentication Debug Guide

This guide will help you debug mobile authentication issues using the comprehensive debugging tools added to the Pokémon Game.

## Quick Access to Debug Tools

### Method 1: Floating Debug Button (Mobile Only)
- The debug button (🔧) appears automatically on mobile devices
- Located in bottom-right corner of the screen
- Tap to open the mobile debug panel

### Method 2: Admin Portal
1. Navigate to `/admin` after logging in
2. Click "📱 Show Mobile Debug" button
3. View comprehensive debug information

### Method 3: URL Parameter (Any Device)
- Add `?debug=mobile` to any URL to show the floating debug button
- Example: `https://your-app.com/login?debug=mobile`

## Debug Features Available

### Device Information
- Device type detection (iOS, Android, Desktop)
- Browser identification (Safari, Chrome, etc.)
- Screen and viewport dimensions
- Storage availability (localStorage, sessionStorage)
- Cookie support status
- Private/Incognito mode detection

### Authentication Status
- Account count and active account info
- MSAL instance state
- Cache location and contents
- Authentication flow tracking

### Interactive Debug Tools
- **Test Login**: Trigger a manual login attempt
- **Log Auth State**: Capture current authentication state
- **Clear Auth Cache**: Remove all MSAL cache data
- **Refresh Logs**: Update debug log display
- **Clear Logs**: Reset debug log history

### Debug Logs
- Timestamped log entries
- MSAL event tracking
- Authentication flow details
- Error messages and stack traces
- Device-specific information

## Mobile Authentication Troubleshooting Steps

### Step 1: Check Device Compatibility
1. Open debug panel
2. Verify device type is correctly detected
3. Check if private mode is detected
4. Ensure localStorage and sessionStorage are available

### Step 2: Clear Cache and Test
1. Use "Clear Auth Cache" button
2. Refresh the page
3. Attempt login again
4. Monitor debug logs for errors

### Step 3: Monitor Authentication Flow
1. Before login attempt, clear logs
2. Start login process
3. Watch real-time MSAL events in debug panel
4. Look for error patterns or timeouts

### Step 4: Check Environment Variables
1. Review Environment Information section
2. Verify API_BASE_URL is correct
3. Check CLIENT_ID and AUTHORITY values
4. Ensure REDIRECT_URI matches current domain

## Common Mobile Issues and Solutions

### Issue: Blank Screen After Login
**Symptoms**: Page goes blank after successful authentication
**Debug Steps**:
1. Check logs for navigation errors
2. Verify redirect URI matches current URL
3. Look for JavaScript errors in console
4. Check if accounts are being stored properly

### Issue: Login Loop
**Symptoms**: Repeatedly redirected to login page
**Debug Steps**:
1. Check if private mode is interfering
2. Verify cache location (should be localStorage on mobile)
3. Clear auth cache and test
4. Monitor MSAL events for token acquisition failures

### Issue: Authentication Timeout
**Symptoms**: Login process never completes
**Debug Steps**:
1. Check network connectivity
2. Verify timeout values (mobile uses longer timeouts)
3. Look for popup blocking issues
4. Monitor for iframe loading errors

## Testing Different Scenarios

### Test Private/Incognito Mode
1. Open browser in private mode
2. Navigate to app with `?debug=mobile`
3. Monitor private mode detection
4. Test authentication flow

### Test Different Mobile Browsers
1. Safari on iOS
2. Chrome on Android
3. Edge on mobile
4. In-app browsers (Facebook, Instagram, etc.)

### Test Network Conditions
1. Test on cellular data
2. Test on WiFi
3. Test with slow connection
4. Test with intermittent connectivity

## Debug Log Analysis

### Key Log Patterns to Look For
- `MSAL Event:` - MSAL library events
- `Device Info` - Initial device detection
- `Auth State` - Current authentication status
- `Page load` - Navigation and redirect handling
- `Private mode detected` - Incognito mode status

### Error Patterns
- `BrowserAuthError` - Browser-specific auth issues
- `InteractionRequiredAuthError` - User interaction needed
- `ClientAuthError` - Configuration issues
- `ServerError` - Azure AD service issues

## Support Information

If you encounter persistent issues:
1. Export debug logs using browser developer tools
2. Include device information from debug panel
3. Note specific error messages and timestamps
4. Include browser and OS versions

The debug tools provide comprehensive information to diagnose mobile authentication issues effectively.
